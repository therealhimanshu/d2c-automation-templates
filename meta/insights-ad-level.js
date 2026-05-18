/************************************
 * CONFIG
 ************************************/
var ACCESS_TOKEN   = PropertiesService.getScriptProperties().getProperty('META_ACCESS_TOKEN'); // ← paste your token here
var AD_ACCOUNT_ID  = PropertiesService.getScriptProperties().getProperty('META_AD_ACCOUNT_ID'); // ← paste your ad account ID here
var API_VERSION    = 'v21.0';
var BASE_URL       = 'https://graph.facebook.com/' + API_VERSION;
// var ui = SpreadsheetApp.getUi();
// Output sheets
var SHEET_ADS              = 'Ads';
var SHEET_AD_ACTIONS       = 'Ad Actions';
var SHEET_AD_ACTION_VALUES = 'Ad Action Values';
var SHEET_AD_CPA           = 'Ad Cost Per Action';

// function runForRange() {
//   fetchAdLevelInsightsToSheets('2026-01-09', '2026-01-09');
// }

// Fields to match what you showed in JSON
var AD_INSIGHT_FIELDS = [
  'date_start',
  'date_stop',
  'campaign_id',
  'campaign_name',
  'objective',
  'adset_id',
  'adset_name',
  'ad_id',
  'ad_name',
  'impressions',
  'clicks',
  'spend',
  'cpc',
  'cpm',
  'ctr',
  'cpp',
  'frequency',
  'actions',
  'action_values',
  'cost_per_action_type'
];

/************************************
 * MAIN ENTRY
 ************************************/

/**
 * Fetches ad-level insights for a date range (inclusive).
 * Example:
 *   fetchAdLevelInsightsToSheets('2026-02-01', '2026-02-06');
 */
function fetchAdLevelInsightsToSheets(since, until) {
  // ui.alert('Running', 'Fetching last 30 days data...', ui.ButtonSet.OK);
  if (!ACCESS_TOKEN) throw new Error('Missing ACCESS_TOKEN');
  if (!since || !until) {
    // Default: yesterday (like your earlier script)
    var y = getYesterday_();
    since = y;
    until = y;
  }

  // 1) Fetch all ad-level insight rows (handles paging)
  var rows = fetchInsights_({
    level: 'ad',
    since: since,
    until: until,
    fields: AD_INSIGHT_FIELDS
    // Optional: time_increment: 1,  // uncomment if you want daily rows within the range
  });

  if (!rows.length) {
    Logger.log('No data returned for range ' + since + ' to ' + until);
    return;
  }

  // 2) Build output arrays
  var adsOut = [];
  var actionsOut = [];
  var actionValuesOut = [];
  var cpaOut = [];

  rows.forEach(function(r) {
    // --- Ads sheet (one row per insight row) ---
    // ONLY until column Q (frequency). No JSON columns.
    adsOut.push([
      r.date_start || '',      // A
      r.date_stop || '',       // B
      r.campaign_id || '',     // C
      r.campaign_name || '',   // D
      r.objective || '',       // E
      r.adset_id || '',        // F
      r.adset_name || '',      // G
      r.ad_id || '',           // H
      r.ad_name || '',         // I
      n_(r.impressions),       // J
      n_(r.clicks),            // K
      n_(r.spend),             // L
      nOrBlank_(r.cpc),        // M
      nOrBlank_(r.cpm),        // N
      nOrBlank_(r.ctr),        // O
      nOrBlank_(r.cpp),        // P
      nOrBlank_(r.frequency)   // Q
    ]);

    // --- Actions detail sheet (one row per action_type) ---
    if (Array.isArray(r.actions)) {
      r.actions.forEach(function(a) {
        actionsOut.push([
          r.date_start || '',
          r.date_stop || '',
          r.campaign_id || '',
          r.adset_id || '',
          r.ad_id || '',
          a.action_type || '',
          nOrBlank_(a.value)
        ]);
      });
    }

    // --- Action values detail sheet ---
    if (Array.isArray(r.action_values)) {
      r.action_values.forEach(function(a) {
        actionValuesOut.push([
          r.date_start || '',
          r.date_stop || '',
          r.campaign_id || '',
          r.adset_id || '',
          r.ad_id || '',
          a.action_type || '',
          nOrBlank_(a.value)
        ]);
      });
    }

    // --- Cost per action type detail sheet ---
    if (Array.isArray(r.cost_per_action_type)) {
      r.cost_per_action_type.forEach(function(a) {
        cpaOut.push([
          r.date_start || '',
          r.date_stop || '',
          r.campaign_id || '',
          r.adset_id || '',
          r.ad_id || '',
          a.action_type || '',
          nOrBlank_(a.value)
        ]);
      });
    }
  });

  // 3) Write to sheets
  // ONLY headers until Q
  appendRows_(SHEET_ADS, [
    'date_start','date_stop',
    'campaign_id','campaign_name','objective',
    'adset_id','adset_name',
    'ad_id','ad_name',
    'impressions','clicks','spend',
    'cpc','cpm','ctr','cpp','frequency'
  ], adsOut);

  appendRows_(SHEET_AD_ACTIONS, [
    'date_start','date_stop','campaign_id','adset_id','ad_id','action_type','value'
  ], actionsOut);

  appendRows_(SHEET_AD_ACTION_VALUES, [
    'date_start','date_stop','campaign_id','adset_id','ad_id','action_type','value'
  ], actionValuesOut);

  appendRows_(SHEET_AD_CPA, [
    'date_start','date_stop','campaign_id','adset_id','ad_id','action_type','value'
  ], cpaOut);
  // ui.alert('Success', 'Data fetch completed!', ui.ButtonSet.OK);
}

/************************************
 * META API HELPERS
 ************************************/

function fetchInsights_(opt) {
  var params = {
    access_token: ACCESS_TOKEN,
    level: opt.level,
    fields: (opt.fields || []).join(','),
    time_range: JSON.stringify({ since: opt.since, until: opt.until }),
    limit: 5000
  };

  if (opt.time_increment) {
    params.time_increment = opt.time_increment;
  }

  var url = BASE_URL + '/' + AD_ACCOUNT_ID + '/insights';
  var all = [];
  var options = { method: 'get', muteHttpExceptions: true };

  while (url) {
    var q = buildQuery_(params);
    var fullUrl = url + (q ? ('?' + q) : '');

    var resp = UrlFetchApp.fetch(fullUrl, options);
    var code = resp.getResponseCode();
    var body = resp.getContentText();

    if (code < 200 || code >= 300) {
      throw new Error('Meta API error (' + code + '): ' + body);
    }

    var json = JSON.parse(body);
    if (json.data && json.data.length) all = all.concat(json.data);

    // Pagination
    if (json.paging && json.paging.next) {
      url = json.paging.next; // already has params embedded
      params = {};            // avoid double-appending
    } else {
      url = null;
    }
  }

  return all;
}

function buildQuery_(params) {
  var parts = [];
  for (var k in params) {
    if (!params.hasOwnProperty(k)) continue;
    var v = params[k];
    if (v === undefined || v === null || v === '') continue;
    parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
  }
  return parts.join('&');
}

/************************************
 * SHEET HELPERS
 ************************************/

function appendRows_(sheetName, headers, rows) {
  if (!rows || !rows.length) return;

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);

  // Set headers if new/empty
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  // ✅ Find last real data row based on Column A (ignore ARRAYFORMULA spill in other columns)
  var lastDataRow = getLastNonEmptyRowInColumn_(sh, 1); // 1 = column A
  var startRow = Math.max(2, lastDataRow + 1); // keep row 1 for headers

  sh.getRange(startRow, 1, rows.length, headers.length).setValues(rows);
}
function getLastNonEmptyRowInColumn_(sheet, colIndex) {
  var lastRow = sheet.getMaxRows();
  var values = sheet.getRange(1, colIndex, lastRow, 1).getValues();

  for (var i = values.length - 1; i >= 0; i--) {
    if (values[i][0] !== '' && values[i][0] !== null) {
      return i + 1; // convert 0-based index to row number
    }
  }
  return 1; // only header / empty
}


/************************************
 * SMALL UTILS
 ************************************/

function getYesterday_() {
  var tz = "Asia/Kolkata"; // force IST
  var d = new Date();
  d.setHours(12,0,0,0); // anchor at midday to avoid DST/UTC edge shifts
  d.setDate(d.getDate() - 1);
  return Utilities.formatDate(d, tz, "yyyy-MM-dd");
}

function n_(v) {
  // force number, default 0
  return Number(v || 0);
}

function nOrBlank_(v) {
  // number if present else blank
  return (v === undefined || v === null || v === '') ? '' : Number(v);
}
