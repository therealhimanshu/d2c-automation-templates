function fetchShopifyAWB_GraphQL() {
  const SHOPIFY_STORE = PropertiesService.getScriptProperties().getProperty('SHOPIFY_STORE'); // 🔹 Your Shopify store
  const ACCESS_TOKEN = PropertiesService.getScriptProperties().getProperty('ACCESS_TOKEN'); // 🔹 Your Admin API token
  const SHEET_NAME = 'Orders';                       // 🔹 Sheet name with order names in column A

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    Logger.log(`❌ Sheet "${SHEET_NAME}" not found.`);
    return;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    Logger.log('⚠️ No order names found.');
    return;
  }

  const orderNames = sheet.getRange('A2:A' + lastRow).getValues().flat();

  // Add AWB header if missing
  if (sheet.getRange(1, 2).getValue() !== 'AWB Number') {
    sheet.getRange(1, 2).setValue('AWB Number');
  }

  // Shopify GraphQL endpoint
  const endpoint = `https://${SHOPIFY_STORE}/admin/api/2025-01/graphql.json`;

  Logger.log(`🚀 Starting AWB fetch via GraphQL for ${orderNames.length} orders...`);

  orderNames.forEach((name, i) => {
    const row = i + 2;
    if (!name) return;

    const cleanName = name.toString().replace('#', '').trim();
    const orderName = `#${cleanName}`;

    Logger.log(`🔎 Fetching order: ${orderName}`);

    // GraphQL query
    const query = `
      query {
        orders(first: 1, query: "name:${orderName}") {
          edges {
            node {
              id
              name
              fulfillments(first: 5) {
                trackingInfo(first: 5) {
                  number
                  company
                }
              }
            }
          }
        }
      }
    `;

    try {
      const response = UrlFetchApp.fetch(endpoint, {
        method: 'post',
        headers: {
          'X-Shopify-Access-Token': ACCESS_TOKEN,
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify({ query }),
        muteHttpExceptions: true
      });

      const code = response.getResponseCode();
      const text = response.getContentText();

      Logger.log(`📦 Response (${code}) for ${orderName}: ${text.substring(0, 300)}...`);

      if (code !== 200) {
        Logger.log(`❌ Error HTTP ${code} for ${orderName}`);
        sheet.getRange(row, 2).setValue('HTTP Error');
        return;
      }

      const json = JSON.parse(text);

      if (json.errors) {
        Logger.log(`⚠️ GraphQL errors for ${orderName}: ${JSON.stringify(json.errors)}`);
        sheet.getRange(row, 2).setValue('GraphQL Error');
        return;
      }

      const orders = json.data?.orders?.edges || [];
      if (orders.length === 0) {
        Logger.log(`❌ No order found for ${orderName}`);
        sheet.getRange(row, 2).setValue('Not Found');
        return;
      }

      const order = orders[0].node;
      const fulfillments = order.fulfillments || [];
      let awbNumbers = [];

      fulfillments.forEach(f => {
        const trackingList = f.trackingInfo || [];
        trackingList.forEach(t => {
          if (t.number) awbNumbers.push(t.number);
        });
      });

      const awb = awbNumbers.join('; ') || 'N/A';
      sheet.getRange(row, 2).setValue(awb);

      Logger.log(`✅ Order ${orderName} — AWB: ${awb}`);

    } catch (err) {
      Logger.log(`💥 Exception fetching ${orderName}: ${err}`);
      sheet.getRange(row, 2).setValue('Error');
    }
  });

  Logger.log('🏁 Finished fetching AWB numbers (GraphQL).');
}
