/************************************
 * CONFIG
 ************************************/
// Make sure to set these in Script Properties (under "Project Settings") for security and ease of maintenance:
var ACCESS_TOKEN   = PropertiesService.getScriptProperties().getProperty('META_ACCESS_TOKEN'); // ← paste your token here
var AD_ACCOUNT_ID  = PropertiesService.getScriptProperties().getProperty('META_AD_ACCOUNT_ID'); // ← paste your ad account ID here
var API_VERSION    = 'v21.0';
var BASE_URL       = 'https://graph.facebook.com/' + API_VERSION;
// Output sheets
var SHEET_AUDIENCE = 'Audience';

var FIELDS = [
  'campaign_id',
  'campaign_name',
  'objective',
  'impressions',
  'clicks',
  'spend',
  'cpc',
  'cpm',
  'ctr',
  'cpp',
  'frequency',
  'actions',
  'action_values'
];

/************************************
 * MAIN (Yesterday)
 ************************************/
function fetchAudienceYesterday() {
  var y = getYesterday_();
  fetchCampaignAudienceSegments_(y, y);
}

/************************************
 * FETCH + WRITE
 ************************************/
function fetchCampaignAudienceSegments_(since, until) {
  if (!ACCESS_TOKEN) throw new Error('Missing META_ACCESS_TOKEN in Script Properties.');

  var data = fetchInsights_({
    level: 'campaign',
    since: since,
    until: until,
    fields: FIELDS,
    breakdowns: 'user_segment_key',
    limit: 5000
  });

  var headers = [
    'date',
    'campaign_id',
    'campaign_name',
    'objective',
    'spend',
    'impressions',
    'clicks',
    'cpc',
    'cpm',
    'ctr',
    'cpp',
    'frequency',
    'purchase_value',
    'roas',
    'type',              // ✅ single type (New/Engaged/Existing)
    'user_segment_key'   // kept for debugging/validation
  ];

  var rows = data.map(function(r) {
    var purchaseValue = getPurchaseValue_(r);
    var spend = Number(r.spend || 0);
    var roas = spend > 0 ? (purchaseValue / spend) : 0;

    var usk = r.user_segment_key || '';
    var type = mapUserSegmentKeyToType_(usk);

    return [
      since,
      r.campaign_id || '',
      r.campaign_name || '',
      r.objective || '',
      spend,
      n_(r.impressions),
      n_(r.clicks),
      nOrBlank_(r.cpc),
      nOrBlank_(r.cpm),
      nOrBlank_(r.ctr),
      nOrBlank_(r.cpp),
      nOrBlank_(r.frequency),
      purchaseValue,
      roas,
      type,
      usk
    ];
  });

  appendRowsAudience_(SHEET_AUDIENCE, headers, rows);
  // ui.alert('Success', 'Data fetch completed!', ui.ButtonSet.OK);
}

/************************************
 * Meta API Helper
 ************************************/
function fetchInsights_(opt) {
  var url = BASE_URL + '/' + AD_ACCOUNT_ID + '/insights';
  var params = {
    access_token: ACCESS_TOKEN,
    level: opt.level,
    time_range: JSON.stringify({ since: opt.since, until: opt.until }),
    fields: (opt.fields || []).join(','),
    breakdowns: opt.breakdowns || '',
    limit: opt.limit || 5000
  };

  var all = [];
  var options = { method: 'get', muteHttpExceptions: true };

  while (url) {
    var fullUrl = url + '?' + buildQuery_(params);
    var resp = UrlFetchApp.fetch(fullUrl, options);
    var code = resp.getResponseCode();
    var body = resp.getContentText();

    if (code < 200 || code >= 300) throw new Error('Meta API error (' + code + '): ' + body);

    var json = JSON.parse(body);
    if (json.data && json.data.length) all = all.concat(json.data);

    if (json.paging && json.paging.next) {
      url = json.paging.next;
      params = {}; // next already includes params
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
 * Purchase Value + Type Mapping
 ************************************/
function getPurchaseValue_(row) {
  var av = row.action_values || [];

  // prefer omni, then purchase, then pixel purchase
  return Number(
    getActionValue_(av, 'omni_purchase') ||
    getActionValue_(av, 'purchase') ||
    getActionValue_(av, 'offsite_conversion.fb_pixel_purchase') ||
    getActionValue_(av, 'onsite_web_purchase') ||
    getActionValue_(av, 'onsite_web_app_purchase') ||
    0
  );
}

function getActionValue_(arr, actionType) {
  if (!Array.isArray(arr)) return 0;
  for (var i = 0; i < arr.length; i++) {
    var a = arr[i];
    if (a && a.action_type === actionType) return Number(a.value || 0);
  }
  return 0;
}

/**
 * ✅ Map Meta's user_segment_key -> one single label
 * You MUST adjust this once you see your actual keys.
 * (I left safe defaults + common patterns.)
 */
function mapUserSegmentKeyToType_(userSegmentKey) {
  var k = (userSegmentKey || '').toLowerCase();

  if (!k) return 'Unknown';

  // common-ish patterns (edit once you see real keys)
  if (k.indexOf('existing') !== -1 || k.indexOf('customer') !== -1 || k.indexOf('purch') !== -1) return 'Existing Audience';
  if (k.indexOf('engag') !== -1 || k.indexOf('warm') !== -1 || k.indexOf('retarget') !== -1) return 'Engaged Audience';
  if (k.indexOf('new') !== -1 || k.indexOf('prospect') !== -1 || k.indexOf('cold') !== -1) return 'New Audience';

  // fallback: keep unknown but visible
  return 'Unknown';
}

/************************************
 * Sheet Writer (replace content)
 ************************************/
function appendRowsAudience_(sheetName, headers, rows) {
  if (!rows || !rows.length) return;

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);

  // If sheet is empty, write headers once
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  // ✅ Find last real data row based on column A (date), ignoring ARRAYFORMULA spill in other columns
  var lastDataRow = getLastNonEmptyRowInColumn_(sh, 1); // col A
  var startRow = Math.max(2, lastDataRow + 1);

  sh.getRange(startRow, 1, rows.length, headers.length).setValues(rows);
}

function getLastNonEmptyRowInColumn_(sheet, colIndex) {
  var lastRow = sheet.getMaxRows();
  var values = sheet.getRange(1, colIndex, lastRow, 1).getValues();

  for (var i = values.length - 1; i >= 0; i--) {
    if (values[i][0] !== '' && values[i][0] !== null) {
      return i + 1;
    }
  }
  return 1;
}


/************************************
 * Small Utils
 ************************************/
function getYesterday_() {
  var d = new Date();
  d.setDate(d.getDate() - 1);
  var y = d.getFullYear();
  var m = ('0' + (d.getMonth() + 1)).slice(-2);
  var day = ('0' + d.getDate()).slice(-2);
  return y + '-' + m + '-' + day;
}

function n_(v) { return Number(v || 0); }
function nOrBlank_(v) { return (v === undefined || v === null || v === '') ? '' : Number(v); }
