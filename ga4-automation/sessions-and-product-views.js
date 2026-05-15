// Run this code to fill any gaps in the data for sessions and product page views in the "GA_DAILY_REPORT" sheet. Adjust the date range in runBackfill() as needed.
function runBackfill() {
  runGA4ForDateRange("20260508", "20260510");
}
// Main Code
function runGA4EventsAndProductLanding(customDate = null) {
  Logger.log("▶️ Starting runGA4EventsAndProductLanding");

  const fileId = PropertiesService.getScriptProperties().getProperty('GA4_SERVICE_ACCOUNT_KEY_FILE_ID');
  const propertyId = PropertiesService.getScriptProperties().getProperty('GA4_PROPERTY_ID');
  const sheetName = "GA_DAILY_REPORT";

  const key = JSON.parse(DriveApp.getFileById(fileId).getBlob().getDataAsString());
  const token = getAccessToken(key);
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

  // ✅ Date handling
  const dateToUse = customDate 
    ? formatDateYYYYMMDDtoISO(customDate) 
    : "yesterday";

  const date = customDate || getYesterdayYYYYMMDD_();

  // --- 1. EVENT COUNTS (session_start + add_to_cart) ---
  const eventsPayload = {
    dimensions: [{ name: "eventName" }],
    metrics: [{ name: "eventCount" }],
    dateRanges: [{ startDate: dateToUse, endDate: dateToUse }],
    dimensionFilter: {
      filter: {
        fieldName: "eventName",
        stringFilter: {
          matchType: "FULL_REGEXP",
          value: "session_start|add_to_cart"
        }
      }
    }
  };

  // --- 2. PRODUCT PAGE SESSIONS (OPEN FUNNEL) ---
  const sessionsPayload = {
    metrics: [{ name: "sessions" }],
    dateRanges: [{ startDate: dateToUse, endDate: dateToUse }],
    dimensionFilter: {
      andGroup: {
        expressions: [
          {
            filter: {
              fieldName: "eventName",
              stringFilter: {
                matchType: "EXACT",
                value: "page_view"
              }
            }
          },
          {
            filter: {
              fieldName: "pagePath",
              stringFilter: {
                matchType: "CONTAINS",
                value: "/products/",
                caseSensitive: false
              }
            }
          }
        ]
      }
    }
  };

  // --- API CALLS ---
  const eventsRes = callGa4Api_(url, token, eventsPayload);
  const sessionsRes = callGa4Api_(url, token, sessionsPayload);

  let sessionStartCount = 0;
  let addToCartCount = 0;

  if (eventsRes.rows) {
    eventsRes.rows.forEach(row => {
      const eventName = row.dimensionValues[0].value;
      const count = Number(row.metricValues[0].value);

      if (eventName === "session_start") sessionStartCount = count;
      if (eventName === "add_to_cart") addToCartCount = count;
    });
  }

  const productSessions =
    (sessionsRes.rows && sessionsRes.rows.length > 0)
      ? Number(sessionsRes.rows[0].metricValues[0].value)
      : 0;

  Logger.log(
    `SUMMARY -> session_start: ${sessionStartCount} | add_to_cart: ${addToCartCount} | product sessions: ${productSessions}`
  );

  upsertEventSheet_(
    sheetName,
    date,
    sessionStartCount,
    addToCartCount,
    productSessions
  );
}
function runGA4ForDateRange(startDate, endDate) {
  Logger.log(`▶️ Running from ${startDate} to ${endDate}`);

  let current = new Date(
    startDate.slice(0, 4),
    startDate.slice(4, 6) - 1,
    startDate.slice(6, 8)
  );

  const end = new Date(
    endDate.slice(0, 4),
    endDate.slice(4, 6) - 1,
    endDate.slice(6, 8)
  );

  while (current <= end) {
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, "0");
    const dd = String(current.getDate()).padStart(2, "0");

    const formatted = `${yyyy}${mm}${dd}`;

    Logger.log(`Running for ${formatted}`);

    runGA4EventsAndProductLanding(formatted);

    current.setDate(current.getDate() + 1);
  }

  Logger.log("✅ Completed date range run");
}
function formatDateYYYYMMDDtoISO(dateStr) {
  if (dateStr instanceof Date) {
    return Utilities.formatDate(dateStr, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return dateStr.slice(0, 4) + "-" + dateStr.slice(4, 6) + "-" + dateStr.slice(6, 8);
}

function getYesterdayYYYYMMDD_() {
  const tz = Session.getScriptTimeZone();
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return Utilities.formatDate(d, tz, "yyyyMMdd");
}

function getLastDataRowCustom(sheet, columnNumber) {
  const lastRow = sheet.getMaxRows();
  const values = sheet.getRange(1, columnNumber, lastRow).getValues();
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i][0] !== "" && values[i][0] !== null) {
      return i + 1;
    }
  }
  return 0;
}
function callGa4Api_(url, token, payload) {
  const res = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: `Bearer ${token}` },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  return JSON.parse(res.getContentText());
}

function getAccessToken(key) {
  const privateKey = key.private_key.replace(/\\n/g, "\n");
  const jwtHeader = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);

  const jwtClaimSet = {
    iss: key.client_email,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: key.token_uri,
    exp: now + 3600,
    iat: now
  };

  const jwt =
    Utilities.base64EncodeWebSafe(JSON.stringify(jwtHeader)) + "." +
    Utilities.base64EncodeWebSafe(JSON.stringify(jwtClaimSet));

  const signature = Utilities.computeRsaSha256Signature(jwt, privateKey);
  const signedJwt = jwt + "." + Utilities.base64EncodeWebSafe(signature);

  const tokenResponse = UrlFetchApp.fetch(key.token_uri, {
    method: "post",
    contentType: "application/x-www-form-urlencoded",
    payload: {
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: signedJwt
    }
  });

  return JSON.parse(tokenResponse.getContentText()).access_token;
}
function upsertEventSheet_(sheetName, date, sessionStart, addToCart, productSessions) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);

  if (getLastDataRowCustom(sheet, 1) === 0) {
    sheet.appendRow([
      "Date",
      "Session Start Count",
      "Add To Cart Count",
      "Product Sessions (Viewed)",
      "Add To Cart Rate"
    ]);
  }

  const rate = productSessions > 0 ? (addToCart / productSessions) : 0;

  const lastRow = getLastDataRowCustom(sheet, 1);
  const dates = (lastRow > 1)
    ? sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat()
    : [];

  const idx = dates.indexOf(date);

  if (idx !== -1) {
    sheet.getRange(idx + 2, 2, 1, 4)
      .setValues([[sessionStart, addToCart, productSessions, rate]]);
  } else {
    sheet.getRange(lastRow + 1, 1, 1, 5)
      .setValues([[date, sessionStart, addToCart, productSessions, rate]]);
  }

  sheet.getRange(sheet.getLastRow(), 5).setNumberFormat("0.00%");
}