/***** CONFIG *****/
const SHOP = PropertiesService.getScriptProperties().getProperty('SHOPIFY_SHOP_DOMAIN'); // your actual shop subdomain
const API_VERSION = '2025-07';
const TOKEN = PropertiesService.getScriptProperties().getProperty('SHOPIFY_ACCESS_TOKEN');

/***** MAIN *****/
function fetchShopifyOrdersToSheet_Test() {
  // 🟡 Dynamically compute "yesterday" in UTC
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayUTC = yesterday.toISOString().split('T')[0];
  // const yesterdayUTC = "2026-02-27";
  const startUTC = `${yesterdayUTC}T00:00:00Z`;
  const endUTC = `${yesterdayUTC}T23:59:59Z`;

  const DATE_FILTER = `created_at:>=${startUTC} AND created_at:<=${endUTC}`;
  Logger.log(DATE_FILTER);

  const SALE_SHEET_NAME = 'Sale Orders';
  const sheet = getOrCreateSheet_(SALE_SHEET_NAME);
  const headers = [
    'Order ID (gid)',
    'Order Name',
    'Created At',
    'Customer First Name',
    'Customer Last Name',
    'Customer Order Index',
    'Publication Name',
    'Payment Mode',
    'Subtotal (current)',
    'Shipping (current)',
    'Tax Amount',
    'Discount',
    'Tax Currency',
    'Product ID (gid)',
    'Product Handle',
    'Product Title',
    'Custom Product Type',
    'Variant SKU',
    'Variant Price',
    'Variant Compare at Price',
    'Quantity',
    'Unit Cost',
    'Fulfillment Location City',
    'Fulfillment Location Province',
    'Fulfillment Location Zip'
  ];
  writeHeadersIfEmpty_(sheet, headers);

  const rows = [];
  let after = null;

  do {
    const data = queryOrdersPage_(DATE_FILTER, after);
    const connection = data.orders;
    if (!connection) throw new Error('No orders connection in response');

    connection.edges.forEach(edge => {
      const order = edge.node;
      const allLineItems = [];
      let li = order.lineItems;

      li.edges.forEach(e => allLineItems.push(e.node));

      while (li.pageInfo && li.pageInfo.hasNextPage) {
        li = fetchMoreLineItems_(order.id, li.pageInfo.endCursor);
        li.edges.forEach(e => allLineItems.push(e.node));
      }

      if (allLineItems.length === 0) {
        rows.push(flattenRow_(order, null));
      } else {
        allLineItems.forEach(liNode => {
          rows.push(flattenRow_(order, liNode));
        });
      }
    });

    after = connection.pageInfo && connection.pageInfo.hasNextPage
      ? connection.pageInfo.endCursor
      : null;

  } while (after);

  if (rows.length) {
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
    Logger.log(`Appended ${rows.length} rows starting at row ${startRow}`);
  }  

  SpreadsheetApp.flush();
  Logger.log(`Wrote ${rows.length} rows to sheet "${SALE_SHEET_NAME}".`);
}
function callShopifyGraphQL_(query, variables) {
  const url = `https://${SHOP}.myshopify.com/admin/api/${API_VERSION}/graphql.json`;

  const payload = JSON.stringify({ query: query.trim(), variables: variables || {} });
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'X-Shopify-Access-Token': TOKEN },
    payload,
    muteHttpExceptions: true
  };

  const resp = UrlFetchApp.fetch(url, options);
  const code = resp.getResponseCode();
  const text = resp.getContentText();

  if (code !== 200) throw new Error(`GraphQL HTTP ${code}: ${text}`);

  const json = JSON.parse(text);
  if (json.errors) throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);

  return json;
}
/***** HELPERS *****/
function queryOrdersPage_(dateFilter, afterCursor) {
  const hasAfter = !!afterCursor;
  const variableDecl = hasAfter ? "($after: String)" : "";
  const afterArg = hasAfter ? "after: $after," : "";

  const query = `
    query Orders ${variableDecl} {
      orders(
        first: 50,
        ${afterArg}
        sortKey: CREATED_AT,
        reverse: true,
        query: "${dateFilter}"
      ) {
        edges {
          node {
            id
            name
            createdAt
            paymentGatewayNames
            customer {
              firstName
              lastName
            }
            customerJourneySummary {
              customerOrderIndex
            }
            publication {
              name
            }
            currentSubtotalPriceSet {
              shopMoney { amount }
            }
            totalTaxSet {
              shopMoney { amount currencyCode }
            }
            totalDiscountsSet {
              shopMoney { amount currencyCode }
            }
            currentShippingPriceSet {
              shopMoney { amount }
            }
            billingAddress{
              city
              province
              zip
            }
            customAttributes {
              key
              value
            }
            lineItems(first: 50) {
              edges {
                node {
                  quantity
                  product {
                    id
                    title
                    handle
                    customProductType
                  }
                  variant {
                    sku
                    inventoryItem {
                      unitCost {
                        amount
                      }
                    }
                  }
                }
              }
              pageInfo { hasNextPage endCursor }
            }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  `;

  const variables = hasAfter ? { after: afterCursor } : {};
  const res = callShopifyGraphQL_(query, variables);
  return res.data;
}

function flattenRow_(order, liNode) {
  const tax = order.totalTaxSet?.shopMoney || {};
  const subtotal = order.currentSubtotalPriceSet?.shopMoney || {};
  const shipping = order.currentShippingPriceSet?.shopMoney || {};
  const discounts = order.totalDiscountsSet?.shopMoney || {};
  const product = liNode?.product || {};
  const variant = liNode?.variant || {};
  const fulfillment = order.billingAddress || {};
  const fullUrl = (order.customAttributes || []).find(attr => attr.key === 'full_url')?.value || '';
  // Fetch product pricing details
  const pricing = product.id
    ? getProductPricing_(product.id)
    : { price: '', compare: '' };

  return [
    order.id || '',
    order.name || '',
    order.createdAt || '',
    order.customer?.firstName || '',
    order.customer?.lastName || '',
    order.customerJourneySummary?.customerOrderIndex || '',
    order.publication?.name || '',
    order.paymentGatewayNames || '',
    toNumberSafe_(subtotal.amount),
    toNumberSafe_(shipping.amount),
    toNumberSafe_(tax.amount),
    toNumberSafe_(discounts.amount),
    tax.currencyCode || '',
    product.id || '',
    product.handle || '',
    product.title || '',
    product.customProductType || '',
    variant.sku || '',
    pricing.price,
    pricing.compare,
    liNode ? (liNode.quantity || 0) : 0,
    variant.inventoryItem && variant.inventoryItem.unitCost ? toNumberSafe_(variant.inventoryItem.unitCost.amount) : '',
    fulfillment.city || '',
    fulfillment.province || '',
    fulfillment.zip || '',
    fullUrl
  ];
}


function getProductPricing_(productGid) {
  if (!productGid) return { price: '', compare: '' };

  const productId = productGid.split('/').pop();
  const url = `https://${SHOP}.myshopify.com/admin/api/2024-07/products/${productId}.json`;

  const options = {
    method: 'get',
    headers: {
      'X-Shopify-Access-Token': TOKEN,
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  };

  const resp = UrlFetchApp.fetch(url, options);
  if (resp.getResponseCode() !== 200) return { price: '', compare: '' };

  const product = JSON.parse(resp.getContentText()).product;
  const variant = product.variants && product.variants.length ? product.variants[0] : null;

  return {
    price: variant ? variant.price : '',
    compare: variant ? variant.compare_at_price : ''
  };
}

/***** UTILS *****/
function toNumberSafe_(val) {
  if (val === null || val === undefined || val === '') return '';
  const n = Number(val);
  return isNaN(n) ? '' : n;
}

function getOrCreateSheet_(name) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  return sh;
}

function getLastDataRow_(sheet, col) {
  const values = sheet.getRange(1, col, sheet.getLastRow(), 1).getValues();
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i][0] && values[i][0].toString().trim() !== '') {
      return i + 1; // row index of last non-empty cell in that column
    }
  }
  return 0;
}

function writeHeadersIfEmpty_(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}
