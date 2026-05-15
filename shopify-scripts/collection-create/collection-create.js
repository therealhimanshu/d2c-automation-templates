
const SHOP_DOMAIN = PropertiesService.getScriptProperties().getProperty('SHOP_NAME');
const ACCESS_TOKEN = PropertiesService.getScriptProperties().getProperty('SHOPIFY_ACCESS_TOKEN');
const API_VERSION = "2025-10"; // Shopify API version
const url = `https://${SHOP_DOMAIN}/admin/api/${API_VERSION}/graphql.json`;

const COLLECTION_DETAILS_ROW = 1; // The row where collection details are stored (Collection name, handle, description)
const SKU_COLUMN = 1; // Column number for SKU (1 = Column A)
const PRODUCT_ID_COLUMN = 2; // Column number for product IDs (2 = Column B)
const MASTER_SKU_DELIMITER = "-"; // Delimiter to separate master SKU from variant SKU
const BATCH_SIZE = 250; // Number of products to push to the collection in one API call

const CREATE_COLLECTION_MUTATION = `
mutation CreateCollectionWithProducts($input: CollectionInput!) {
  collectionCreate(input: $input) {
    collection {
      id
      title
      handle
      products(first: 10) {
        nodes {
          id
          title
        }
      }
    }
    userErrors {
      field
      message
    }
  }
}
`;

const ADD_PRODUCTS_MUTATION = `
mutation AddProductsToCollection($id: ID!, $productIds: [ID!]!) {
  collectionAddProducts(id: $id, productIds: $productIds) {
    collection {
      id
      title
      products(first: 10) {
        nodes { id title }
      }
    }
    userErrors { field message }
  }
}
`;

// Fetch product data and update sheet
function updateProductData() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1'); // Change sheet name if needed
  const skus = sheet.getRange(2, SKU_COLUMN, sheet.getLastRow() - 1, 1).getValues().flat();

  // Fetch product data for all SKUs
  skus.forEach((sku, index) => {
    const masterSku = getMasterSku(sku);
    const productId = getProductIdFromSku(masterSku);
    
    // Update the product ID in the sheet (assuming product ID is in column B)
    if (productId) {
      sheet.getRange(index + 2, PRODUCT_ID_COLUMN).setValue(productId); // Set product ID in the sheet
    }
  });
}

// Get the master SKU from the variant SKU (everything before the delimiter)
function getMasterSku(sku) {
  const parts = sku.split(MASTER_SKU_DELIMITER);
  return parts[0].trim(); // Return the master SKU (before the first delimiter)
}

// Fetch product ID based on SKU
function getProductIdFromSku(sku) {
  const query = `
  {
    products(first: 1, query: "sku:${sku}") {
      edges {
        node {
          id
        }
      }
    }
  }
  `;
  const response = sendGraphQLRequest(query);
  const products = response.data.products.edges;

  if (products.length > 0) {
    return products[0].node.id; // Return the product ID if found
  }
  Logger.log(`No product found for SKU: ${sku}`);
  return null;
}

// Send GraphQL request to Shopify
function sendGraphQLRequest(query, variables = {}) {
  const headers = {
    "Content-Type": "application/json",
    "X-Shopify-Access-Token": ACCESS_TOKEN,
  };

  const payload = JSON.stringify({
    query: query,
    variables: variables
  });

  const options = {
    method: "POST",
    contentType: "application/json",
    headers: headers,
    payload: payload,
  };

  const response = UrlFetchApp.fetch(url, options);
  const jsonResponse = JSON.parse(response.getContentText());
  return jsonResponse;
}

// Create the collection with products based on the details in the first 3 rows and SKU-Product ID mapping
function createCollectionAndAddProducts() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');
  
  // Get collection details (from first row)
  const collectionName = sheet.getRange(COLLECTION_DETAILS_ROW, 1).getValue();
  const collectionHandle = sheet.getRange(COLLECTION_DETAILS_ROW + 1, 1).getValue();
  const collectionDescription = sheet.getRange(COLLECTION_DETAILS_ROW + 2, 1).getValue();
  
  // Prepare the collection input
  const collectionInput = {
    title: collectionName,
    descriptionHtml: collectionDescription,
    handle: collectionHandle,
    products: [] // To hold product IDs
  };

  // Get product IDs based on SKUs in the sheet (starting from row 4)
  const skus = sheet.getRange(4, SKU_COLUMN, sheet.getLastRow() - 3, 1).getValues().flat();
  const productIds = [];
  
  skus.forEach((sku) => {
    const masterSku = getMasterSku(sku);
    const productId = getProductIdFromSku(masterSku);
    
    if (productId) {
      // const formattedProductId = `gid://shopify/Product/${productId}`;
      productIds.push(productId);
    }
  });
  
  collectionInput.products = productIds;

  // Create the collection with the product list
  const response = sendGraphQLRequest(CREATE_COLLECTION_MUTATION, { input: collectionInput });
  const collectionCreate = response.data.collectionCreate;

  if (collectionCreate && !collectionCreate.userErrors.length) {
    const collectionId = collectionCreate.collection.id;
    Logger.log(`✅ Collection created: ${collectionCreate.collection.title} (${collectionId})`);
    
    // Add products in batches of 250 to the collection
    addProductsToCollection(collectionId, productIds);
  } else {
    Logger.log(`Failed to create collection: ${JSON.stringify(collectionCreate.userErrors)}`);
  }
}

// Add products to collection in batches
function addProductsToCollection(collectionId, productIds) {
  const totalBatches = Math.ceil(productIds.length / BATCH_SIZE);
  
  for (let i = 0; i < totalBatches; i++) {
    const batch = productIds.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
    const response = sendGraphQLRequest(ADD_PRODUCTS_MUTATION, { id: collectionId, productIds: batch });
    
    const result = response.data.collectionAddProducts;
    if (result && !result.userErrors.length) {
      Logger.log(`✅ Added ${batch.length} product(s) to collection (${collectionId})`);
    } else {
      Logger.log(`Failed to add products to collection: ${JSON.stringify(result.userErrors)}`);
    }
  }
}

// Trigger this function to run daily (can set time-based triggers in Apps Script)
function triggerDailyUpdate() {
  ScriptApp.newTrigger('updateProductData')
    .timeBased()
    .everyDays(1) // Runs once every day
    .atHour(6) // Set the time to run (e.g., 6 AM)
    .create();
}
