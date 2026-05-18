/**
 * Shopify Customers -> Google Sheet via GraphQL Bulk Operations
 * Phase 1 BACKFILL: month-by-month windows using createdAt (reliable for large stores)
 * Phase 2 INCR: updated customers since last checkpoint using updatedAt
 * Upsert behavior: update row if ID exists, else append
 *
 * Run with a time trigger every 5–10 minutes:
 *   bulkSyncCustomers_BackfillThenIncremental()
 */

const SHOPIFY_SHOP_DOMAIN = PropertiesService.getScriptProperties().getProperty('SHOPIFY_SHOP_DOMAIN'); // e.g. "myshop.myshopify.com"
const API_VERSION = "2025-01";
const SHEET_NAME = "customers";

// --- Script Properties ---
const PROP_TOKEN = "SHOPIFY_ACCESS_TOKEN";

const PROP_MODE = "SHOPIFY_SYNC_MODE"; // "BACKFILL" | "INCR"
const PROP_BACKFILL_CURSOR = "SHOPIFY_BACKFILL_MONTH_CURSOR"; // e.g. "2022-01-01"
const PROP_BACKFILL_START = "SHOPIFY_BACKFILL_START_DATE"; // optional override
const PROP_LAST_UPDATED_AT = "SHOPIFY_CUSTOMERS_LAST_UPDATED_AT"; // incremental checkpoint

const PROP_LAST_PROCESSED_BULK_ID = "SHOPIFY_LAST_PROCESSED_BULK_OP_ID";

// --- Sheet headers ---
const HEADERS = [
  "id",                    // legacyResourceId (REST id)
  "admin_graphql_api_id",  // gid
  "created_at",
  "updated_at",
  "first_name",
  "last_name",
  "email",
  "phone",
  "verified_email",
  "state",
  "tags",
  "orders_count",
  "total_spent_amount",
  "total_spent_currency",
  "last_order_id",
  "last_order_name",
  "note",
  "tax_exempt",
  "default_address_city",
  "default_address_province",
  "default_address_country",
  "default_address_zip"
];

function bulkSyncCustomers_BackfillThenIncremental() {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty(PROP_TOKEN);
  if (!token) throw new Error(`Missing ${PROP_TOKEN} in Script Properties.`);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  ensureHeader_(sheet, HEADERS);

  // Default mode is BACKFILL until finished
  const mode = props.getProperty(PROP_MODE) || "BACKFILL";
  props.setProperty(PROP_MODE, mode);

  // 1) Check current bulk operation
  const cur = shopifyGraphql_(token, `
    query {
      currentBulkOperation(type: QUERY) {
        id
        status
        errorCode
        createdAt
        completedAt
        objectCount
        fileSize
        url
        partialDataUrl
      }
    }
  `);

  const op = cur?.data?.currentBulkOperation;

  // 2) If an op exists, handle status
  if (op && op.status) {
    if (op.status === "RUNNING" || op.status === "CREATED" || op.status === "CANCELING") {
      Logger.log(`Bulk op in progress: ${op.status}. Next trigger run will continue.`);
      return;
    }

    if (op.status === "FAILED" || op.status === "CANCELED" || op.status === "EXPIRED") {
      Logger.log(`Bulk op ended with status=${op.status} errorCode=${op.errorCode || ""}`);
      // Start a new job this run
      startNextJob_(props, token);
      return;
    }

    if (op.status === "COMPLETED") {
      const lastProcessedId = props.getProperty(PROP_LAST_PROCESSED_BULK_ID);
      if (lastProcessedId === op.id) {
        Logger.log(`Bulk op ${op.id} already processed. Starting next job if needed.`);
        startNextJob_(props, token);
        return;
      }

      const downloadUrl = op.url || op.partialDataUrl;

      // IMPORTANT FIX: objectCount=0 => url is null => treat as empty and continue
      if (!downloadUrl) {
        Logger.log(`Bulk op ${op.id} completed with no URL. objectCount=${op.objectCount}. Treating as empty result.`);
        props.setProperty(PROP_LAST_PROCESSED_BULK_ID, op.id);
        advanceBackfillCursorIfNeeded_(props); // still advance if backfill job had no results
        startNextJob_(props, token);
        return;
      }

      // Download JSONL and upsert
      const jsonl = UrlFetchApp.fetch(downloadUrl).getContentText();

      const idToRow = buildIdToRowMap_(sheet, HEADERS.indexOf("id") + 1);
      const { updates, appends, maxUpdatedAtSeen } = parseJsonlToUpserts_(jsonl, idToRow);

      if (updates.length) applyBatchedRowUpdates_(sheet, updates, HEADERS.length);
      if (appends.length) {
        const startRow = sheet.getLastRow() + 1;
        sheet.getRange(startRow, 1, appends.length, HEADERS.length).setValues(appends);
      }

      // Update incremental checkpoint (keep highest updatedAt seen)
      if (maxUpdatedAtSeen) {
        const prev = props.getProperty(PROP_LAST_UPDATED_AT);
        if (!prev || new Date(maxUpdatedAtSeen).getTime() > new Date(prev).getTime()) {
          props.setProperty(PROP_LAST_UPDATED_AT, maxUpdatedAtSeen);
        }
      }

      props.setProperty(PROP_LAST_PROCESSED_BULK_ID, op.id);

      Logger.log(`Processed bulk op ${op.id}. Updated=${updates.length}, Appended=${appends.length}, maxUpdatedAtSeen=${maxUpdatedAtSeen}`);

      // If the last job was a backfill month window, advance the month cursor
      advanceBackfillCursorIfNeeded_(props);

      // Start next job
      startNextJob_(props, token);
      return;
    }
  }

  // 3) No op running -> start next job
  startNextJob_(props, token);
}

// -------------------- Job scheduling --------------------

function startNextJob_(props, token) {
  const mode = props.getProperty(PROP_MODE) || "BACKFILL";

  if (mode === "BACKFILL") {
    // Determine start month cursor:
    // - if PROP_BACKFILL_START_DATE exists, use it
    // - else auto-detect oldest customer createdAt month
    let cursor = props.getProperty(PROP_BACKFILL_CURSOR);
    if (!cursor) {
      const startOverride = props.getProperty(PROP_BACKFILL_START);
      if (startOverride) {
        cursor = normalizeToMonthStart_(startOverride);
      } else {
        const oldest = fetchOldestCustomerCreatedAt_(token); // ISO
        cursor = normalizeToMonthStart_(oldest);
      }
      props.setProperty(PROP_BACKFILL_CURSOR, cursor);
    }

    const monthStart = cursor; // "YYYY-MM-01"
    const nextMonthStart = addMonths_(monthStart, 1);

    // If monthStart is after "now", backfill is done
    const now = new Date();
    if (new Date(monthStart + "T00:00:00Z").getTime() > now.getTime()) {
      props.setProperty(PROP_MODE, "INCR");
      Logger.log("Backfill finished (cursor passed current date). Switching to INCR mode.");
      startBulkCustomersByUpdatedAt_(props, token);
      return;
    }

    startBulkCustomersByCreatedAtWindow_(props, token, monthStart, nextMonthStart);
    return;
  }

  // INCR mode
  startBulkCustomersByUpdatedAt_(props, token);
}

/**
 * If we are in BACKFILL mode, advance cursor by 1 month.
 * We call this after a COMPLETED job (even if empty).
 */
function advanceBackfillCursorIfNeeded_(props) {
  const mode = props.getProperty(PROP_MODE) || "BACKFILL";
  if (mode !== "BACKFILL") return;

  const cursor = props.getProperty(PROP_BACKFILL_CURSOR);
  if (!cursor) return;

  const next = addMonths_(cursor, 1);
  props.setProperty(PROP_BACKFILL_CURSOR, next);
  Logger.log(`Advanced backfill cursor to ${next}`);
}

// -------------------- Bulk job starters --------------------

function startBulkCustomersByCreatedAtWindow_(props, token, monthStartYmd, nextMonthStartYmd) {
  // Use search query on created_at (Shopify customer search syntax)
  // We use >= monthStart and < nextMonthStart
  const queryString = `created_at:>='${monthStartYmd}T00:00:00Z' AND created_at:<'${nextMonthStartYmd}T00:00:00Z'`;

  const bulkQuery = makeCustomersBulkQuery_(queryString, "CREATED_AT");

  const res = shopifyGraphql_(token, `
    mutation {
      bulkOperationRunQuery(query: """
${bulkQuery}
""") {
        bulkOperation { id status }
        userErrors { field message }
      }
    }
  `);

  const errs = res?.data?.bulkOperationRunQuery?.userErrors || [];
  if (errs.length) throw new Error("bulkOperationRunQuery userErrors: " + JSON.stringify(errs));

  Logger.log(`Started BACKFILL bulk job for createdAt window [${monthStartYmd}, ${nextMonthStartYmd})`);
}

function startBulkCustomersByUpdatedAt_(props, token) {
  const DEFAULT_START = "2000-01-01T00:00:00Z";
  const lastUpdatedAt = props.getProperty(PROP_LAST_UPDATED_AT) || DEFAULT_START;

  const queryString = `updated_at:>='${lastUpdatedAt}'`;

  const bulkQuery = makeCustomersBulkQuery_(queryString, "UPDATED_AT");

  const res = shopifyGraphql_(token, `
    mutation {
      bulkOperationRunQuery(query: """
${bulkQuery}
""") {
        bulkOperation { id status }
        userErrors { field message }
      }
    }
  `);

  const errs = res?.data?.bulkOperationRunQuery?.userErrors || [];
  if (errs.length) throw new Error("bulkOperationRunQuery userErrors: " + JSON.stringify(errs));

  Logger.log(`Started INCR bulk job for updated_at >= ${lastUpdatedAt}`);
}

/**
 * Generates a minimal bulk query.
 * NOTE: keep fields minimal to reduce JSONL size.
 */
function makeCustomersBulkQuery_(queryString, sortKey /* "CREATED_AT" or "UPDATED_AT" */) {
  return `
  {
    customers(query: "${escapeForGraphqlString_(queryString)}", sortKey: ${sortKey}) {
      edges {
        node {
          id
          legacyResourceId
          createdAt
          updatedAt
          firstName
          lastName
          email
          phone
          verifiedEmail
          state
          tags
          note
          taxExempt
          numberOfOrders
          amountSpent { amount currencyCode }
          lastOrder { legacyResourceId name }
          defaultAddress { city province country zip }
        }
      }
    }
  }`;
}

// -------------------- JSONL -> Sheet upsert --------------------

function parseJsonlToUpserts_(jsonlText, idToRow) {
  const updates = []; // {row, values}
  const appends = [];
  let maxUpdatedAtSeen = null;

  const lines = jsonlText.split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    const c = JSON.parse(line);

    const legacyId = c.legacyResourceId;
    if (!legacyId) continue;

    if (c.updatedAt) {
      if (!maxUpdatedAtSeen || new Date(c.updatedAt).getTime() > new Date(maxUpdatedAtSeen).getTime()) {
        maxUpdatedAtSeen = c.updatedAt;
      }
    }

    const rowValues = customerNodeToRow_(c);
    const existingRow = idToRow.get(String(legacyId));
    if (existingRow) updates.push({ row: existingRow, values: rowValues });
    else appends.push(rowValues);
  }

  return { updates, appends, maxUpdatedAtSeen };
}

function customerNodeToRow_(c) {
  return [
    c.legacyResourceId ?? "",
    c.id ?? "",
    c.createdAt ?? "",
    c.updatedAt ?? "",
    c.firstName ?? "",
    c.lastName ?? "",
    c.email ?? "",
    c.phone ?? "",
    c.verifiedEmail ?? "",
    c.state ?? "",
    Array.isArray(c.tags) ? c.tags.join(",") : (c.tags ?? ""),
    c.numberOfOrders ?? "",
    c.amountSpent?.amount ?? "",
    c.amountSpent?.currencyCode ?? "",
    c.lastOrder?.legacyResourceId ?? "",
    c.lastOrder?.name ?? "",
    c.note ?? "",
    c.taxExempt ?? "",
    c.defaultAddress?.city ?? "",
    c.defaultAddress?.province ?? "",
    c.defaultAddress?.country ?? "",
    c.defaultAddress?.zip ?? ""
  ];
}

// -------------------- Shopify GraphQL + helpers --------------------

function shopifyGraphql_(token, query) {
  const url = `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${API_VERSION}/graphql.json`;

  const resp = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    muteHttpExceptions: true,
    headers: { "X-Shopify-Access-Token": token },
    payload: JSON.stringify({ query })
  });

  const code = resp.getResponseCode();
  const text = resp.getContentText();

  if (code < 200 || code >= 300) throw new Error(`Shopify GraphQL error ${code}: ${text}`);

  const json = JSON.parse(text);
  if (json.errors && json.errors.length) throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  return json;
}

function fetchOldestCustomerCreatedAt_(token) {
  const res = shopifyGraphql_(token, `
    query {
      customers(first: 1, sortKey: CREATED_AT, reverse: false) {
        edges { node { createdAt } }
      }
    }
  `);
  const v = res?.data?.customers?.edges?.[0]?.node?.createdAt;
  if (!v) throw new Error("Could not determine oldest customer createdAt.");
  return v; // ISO string
}

function ensureHeader_(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
    sheet.autoResizeColumns(1, headers.length);
    return;
  }
  const existing = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  if (existing.join("||") !== headers.join("||")) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
  }
}

function buildIdToRowMap_(sheet, idCol) {
  const map = new Map();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return map;

  const ids = sheet.getRange(2, idCol, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    const v = ids[i][0];
    if (v !== "" && v !== null && v !== undefined) map.set(String(v), i + 2);
  }
  return map;
}

function applyBatchedRowUpdates_(sheet, updates, width) {
  if (!updates.length) return;
  updates.sort((a, b) => a.row - b.row);

  let runStart = updates[0].row;
  let runValues = [updates[0].values];

  for (let i = 1; i < updates.length; i++) {
    const prev = updates[i - 1].row;
    const cur = updates[i].row;
    if (cur === prev + 1) {
      runValues.push(updates[i].values);
    } else {
      sheet.getRange(runStart, 1, runValues.length, width).setValues(runValues);
      runStart = cur;
      runValues = [updates[i].values];
    }
  }
  sheet.getRange(runStart, 1, runValues.length, width).setValues(runValues);
}

function escapeForGraphqlString_(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

// ---- Date helpers (month cursor) ----

function normalizeToMonthStart_(isoOrYmd) {
  // Accept "YYYY-MM-DD" or ISO; returns "YYYY-MM-01"
  const d = new Date(isoOrYmd);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  return `${y}-${pad2_(m)}-01`;
}

function addMonths_(ymdMonthStart, monthsToAdd) {
  // ymdMonthStart must be "YYYY-MM-01"
  const parts = ymdMonthStart.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]) - 1; // 0-based
  const dt = new Date(Date.UTC(y, m, 1));
  dt.setUTCMonth(dt.getUTCMonth() + monthsToAdd);
  return `${dt.getUTCFullYear()}-${pad2_(dt.getUTCMonth() + 1)}-01`;
}

function pad2_(n) {
  return (n < 10 ? "0" : "") + n;
}