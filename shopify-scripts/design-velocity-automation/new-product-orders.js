// This script updates the "ProductOrders2" sheet with new orders for products published in the last 30 days.
// Modify the script if you want to change the time window or add more fields from the order/product.

const SHOP_NAME = PropertiesService.getScriptProperties().getProperty('SHOP_NAME');
const SHOPIFY_ACCESS_TOKEN = PropertiesService.getScriptProperties().getProperty('SHOPIFY_ACCESS_TOKEN');
const API_VERSION = '2025-01'

function updateProductOrders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const productSheet = ss.getSheetByName("Products");
  if (!productSheet) {
    throw new Error("Products sheet not found. Run updateShopifyProducts() first.");
  }

  // Ensure ProductOrders sheet
  let ordersSheet = ss.getSheetByName("ProductOrders2");
  if (!ordersSheet) {
    ordersSheet = ss.insertSheet("ProductOrders2");
    ordersSheet.appendRow([
      "Product_id", "Product_title", "Product_published_date",
      "Order_id", "Order_created_at", "Quantity"
    ]);
  }

  // Ensure Settings sheet
  let settingsSheet = ss.getSheetByName("Settings");
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet("Settings");
    settingsSheet.appendRow(["last_run_date", "last_order_run_date"]);
    const defaultDate = new Date();
    defaultDate.setFullYear(defaultDate.getFullYear() - 1);
    settingsSheet.appendRow([defaultDate.toISOString().split("T")[0], ""]);
  }

  // Read last_order_run_date
  const rawVal = settingsSheet.getRange("B2").getValue();
  const lastOrderRunDate = rawVal ? new Date(rawVal) : null;

  // Yesterday 23:59
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(23, 59, 59, 999);

  const shopName = "ikbpwk-eq";
  const accessToken = "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";
  const apiVersion = "2025-01";

  const options = {
    "method": "get",
    "headers": { "X-Shopify-Access-Token": accessToken }
  };

  // Collect existing pairs (product_id + order_id)
  const existingRows = ordersSheet.getLastRow() > 1
    ? ordersSheet.getRange(2, 1, ordersSheet.getLastRow() - 1, 4).getValues()
    : [];
  const existingPairs = new Set(existingRows.map(r => r[0] + "_" + r[3]));

  const newRows = [];

  // Get product list
  const rows = productSheet.getRange(2, 1, productSheet.getLastRow() - 1, 3).getValues();

  rows.forEach(row => {
    const productId = row[0];
    const productTitle = row[1];
    const publishedDate = new Date(row[2]);
    if (!publishedDate || isNaN(publishedDate.getTime())) return; // skip if no date

    // Product's 30-day window
    const windowEnd = new Date(publishedDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const effectiveEnd = windowEnd < yesterday ? windowEnd : yesterday;
    if (effectiveEnd < publishedDate) return;

    // Start = publishedDate or last checkpoint (+1s to avoid overlap)
    const effectiveStart = lastOrderRunDate
      ? new Date(Math.max(publishedDate.getTime(), lastOrderRunDate.getTime() + 1000))
      : publishedDate;

    if (effectiveStart > effectiveEnd) return; // nothing new

    const windowStartIso = effectiveStart.toISOString();
    const windowEndIso = effectiveEnd.toISOString();

    let url = `https://${shopName}.myshopify.com/admin/api/${apiVersion}/orders.json?status=any&limit=250&created_at_min=${windowStartIso}&created_at_max=${windowEndIso}`;

    while (url) {
      const response = UrlFetchApp.fetch(url, options);
      const data = JSON.parse(response.getContentText());
      const orders = data.orders;

      orders.forEach(order => {
        order.line_items.forEach(item => {
          if (item.product_id && item.product_id.toString() === productId.toString()) {
            const pairKey = productId + "_" + order.id;
            if (!existingPairs.has(pairKey)) {
              newRows.push([
                productId,
                productTitle,
                publishedDate.toISOString().split("T")[0],
                order.id,
                order.created_at,
                item.quantity
              ]);
              existingPairs.add(pairKey);
            }
          }
        });
      });

      // Pagination
      const linkHeader = response.getHeaders()["Link"];
      if (linkHeader && linkHeader.includes('rel="next"')) {
        const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
        url = match ? match[1] : null;
      } else {
        url = null;
      }
    }
  });

  // Append new rows
  if (newRows.length > 0) {
    ordersSheet.getRange(
      ordersSheet.getLastRow() + 1,
      1,
      newRows.length,
      newRows[0].length
    ).setValues(newRows);
  }

  // Sort by Product Published_date, then Order_created_at
  if (ordersSheet.getLastRow() > 1) {
    ordersSheet.getRange(2, 1, ordersSheet.getLastRow() - 1, ordersSheet.getLastColumn())
      .sort([
        { column: 3, ascending: true }, // Product_published_date
        { column: 5, ascending: true }  // Order_created_at
      ]);
  }

  // Save checkpoint as "today 00:00" (clean daily boundary)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastOrderRunCell = settingsSheet.getRange("B2");
  lastOrderRunCell.setNumberFormat("yyyy-MM-dd HH:mm:ss");
  lastOrderRunCell.setValue(today);

  // Log for confirmation
  Logger.log(`✅ Added ${newRows.length} new rows. Next run will start from ${today}`);
}
