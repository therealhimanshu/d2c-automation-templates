function updateShopifyProducts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // --- Ensure Products sheet exists ---
  let sheet = ss.getSheetByName("Products");
  if (!sheet) {
    sheet = ss.insertSheet("Products");
    sheet.appendRow(["Product_id", "Title", "Published_date", "First_added_date", "Last_updated", "UnitPrice"]);
  }

  // --- Ensure Settings sheet exists ---
  let settingsSheet = ss.getSheetByName("Settings");
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet("Settings");
    settingsSheet.appendRow(["last_run_date"]);
    const defaultDate = new Date();
    defaultDate.setFullYear(defaultDate.getFullYear() - 1);
    settingsSheet.appendRow([defaultDate.toISOString().split("T")[0]]);
  }

  // --- Ensure Products headers exist ---
  const requiredHeaders = ["Product_id", "Title", "Published_date", "First_added_date", "Last_updated", "UnitPrice"];
  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    sheet.appendRow(requiredHeaders);
  } else {
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (headers.join("") !== requiredHeaders.join("")) {
      sheet.clear();
      sheet.appendRow(requiredHeaders);
    }
  }

  // --- Shopify credentials ---
  const shopName = PropertiesService.getScriptProperties().getProperty('SHOP_NAME'); 
  const accessToken = PropertiesService.getScriptProperties().getProperty('SHOPIFY_ACCESS_TOKEN'); 
  const apiVersion = "2025-01";
  let url = `https://${shopName}.myshopify.com/admin/api/${apiVersion}/products.json?published_status=published&limit=250`;
  
  const options = {
    "method": "get",
    "headers": { "X-Shopify-Access-Token": accessToken }
  };
  
  // --- Build lookup map (Product_id -> row index) ---
  const lastRow = sheet.getLastRow();
  const idToRowIndex = {};
  if (lastRow > 1) {
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
    ids.forEach((id, i) => {
      if (id) idToRowIndex[id.toString()] = i + 2; // row number
    });
  }

  // --- Get last run date ---
  const lastRunDate = new Date(settingsSheet.getRange("A2").getValue());
  let newLastRunDate = lastRunDate;

  // --- Fetch all pages ---
  while (url) {
    const response = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(response.getContentText());
    const products = data.products;

    products.forEach(p => {
      const productId = p.id.toString();
      const publishedDate = new Date(p.published_at);
      const price = p.variants[0].price;
      const now = new Date();

      if (publishedDate >= lastRunDate) {
        const row = [
          productId,
          p.title,
          publishedDate.toISOString().split("T")[0],
          now,
          now,
          price
        ];

        if (idToRowIndex[productId]) {
          // Update existing row
          const rowIndex = idToRowIndex[productId];
          const existingFirstAdded = sheet.getRange(rowIndex, 4).getValue();
          row[3] = existingFirstAdded || now; // keep original "First_added_date"
          sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
        } else {
          // Insert new row
          sheet.appendRow(row);
          idToRowIndex[productId] = sheet.getLastRow(); // update map
        }

        if (publishedDate > newLastRunDate) {
          newLastRunDate = publishedDate;
        }
      }
    });

    // --- Handle pagination ---
    const linkHeader = response.getHeaders()["Link"];
    if (linkHeader && linkHeader.includes('rel="next"')) {
      const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      url = match ? match[1] : null;
    } else {
      url = null;
    }
  }

  // --- Update Settings with new last run date ---
  if (newLastRunDate > lastRunDate) {
    settingsSheet.getRange("A2").setValue(newLastRunDate.toISOString().split("T")[0]);
  }

  // --- Sort chronologically by Published_date ---
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn())
         .sort([{ column: 3, ascending: true }]); // Published_date
  }
}
