// Set-up the required configuration variables in the "Script Properties" (under "Project Settings") for security and ease of maintenance:
// META_ACCESS_TOKEN: Your Meta Graph API access token with permissions to read ad insights.
// META_AD_ACCOUNT_ID: Your Meta Ad Account ID (format: act_123456789).
/************************************
 * RUNNER → LAST 30 DAYS DAILY
 ************************************/
function runAudienceLast30Days() {
  // ui.alert('Running', 'Fetching last 30 days data...', ui.ButtonSet.OK);
  var r = getLastNDaysRange_(30);
  fetchCampaignAudienceSegments_(r.since, r.until);
}

/************************************
 * IST SAFE DATE RANGE
 ************************************/
function getLastNDaysRange_(days) {
  var tz = "Asia/Kolkata";
  var today = new Date();
  today.setHours(12,0,0,0);
  today.setDate(today.getDate() - 1);  // shift to yesterday
  
  var until = Utilities.formatDate(today, tz, "yyyy-MM-dd");

  var sinceDate = new Date(today);
  sinceDate.setDate(sinceDate.getDate() - days + 1);
  var since = Utilities.formatDate(sinceDate, tz, "yyyy-MM-dd");

  return { since: since, until: until };
}

/************************************
 * FETCH + WRITE (DAILY BREAKDOWN)
 ************************************/
function fetchCampaignAudienceSegments_(since, until) {

  var data = fetchInsights_({
    level: 'campaign',
    since: since,
    until: until,
    fields: FIELDS,
    breakdowns: 'user_segment_key',
    time_increment: 1,   // ← daily rows
    limit: 5000
  });

  var headers = [
    'date','campaign_id','campaign_name','objective',
    'spend','impressions','clicks','cpc','cpm','ctr','cpp','frequency',
    'purchase_value','roas','type','user_segment_key'
  ];

  var rows = data.map(function(r) {

    var purchaseValue = getPurchaseValue_(r);
    var spend = Number(r.spend || 0);
    var roas = spend > 0 ? (purchaseValue / spend) : 0;
    var usk = r.user_segment_key || '';
    var type = mapUserSegmentKeyToType_(usk);

    return [
      r.date_start,            // ← now real daily date
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
 * META API HELPER (UPDATED)
 ************************************/
function fetchInsights_(opt) {

  var url = BASE_URL + '/' + AD_ACCOUNT_ID + '/insights';

  var params = {
    access_token: ACCESS_TOKEN,
    level: opt.level,
    time_range: JSON.stringify({ since: opt.since, until: opt.until }),
    fields: (opt.fields || []).join(','),
    breakdowns: opt.breakdowns || '',
    time_increment: opt.time_increment || 1,
    limit: opt.limit || 5000
  };

  var all = [];
  var options = { method: 'get', muteHttpExceptions: true };

  while (url) {
    var fullUrl = url + '?' + buildQuery_(params);
    var resp = UrlFetchApp.fetch(fullUrl, options);
    var json = JSON.parse(resp.getContentText());

    if (json.data) all = all.concat(json.data);

    if (json.paging && json.paging.next) {
      url = json.paging.next;
      params = {};
    } else {
      url = null;
    }
  }

  return all;
}

function buildQuery_(params) {
  var parts = [];
  for (var k in params) {
    if (params[k] !== undefined && params[k] !== null && params[k] !== '')
      parts.push(encodeURIComponent(k)+'='+encodeURIComponent(params[k]));
  }
  return parts.join('&');
}

/************************************
 * PURCHASE VALUE + TYPE MAPPING
 ************************************/
function getPurchaseValue_(row) {
  var av = row.action_values || [];
  return Number(
    getActionValue_(av,'omni_purchase') ||
    getActionValue_(av,'purchase') ||
    getActionValue_(av,'offsite_conversion.fb_pixel_purchase') ||
    getActionValue_(av,'onsite_web_purchase') ||
    getActionValue_(av,'onsite_web_app_purchase') || 0
  );
}

function getActionValue_(arr, type) {
  if (!Array.isArray(arr)) return 0;
  for (var i=0;i<arr.length;i++)
    if (arr[i] && arr[i].action_type===type) return Number(arr[i].value||0);
  return 0;
}

function mapUserSegmentKeyToType_(k) {
  k=(k||'').toLowerCase();
  if (!k) return 'Unknown';
  if (k.includes('existing')||k.includes('customer')||k.includes('purch')) return 'Existing Audience';
  if (k.includes('engag')||k.includes('warm')||k.includes('retarget')) return 'Engaged Audience';
  if (k.includes('new')||k.includes('prospect')||k.includes('cold')) return 'New Audience';
  return 'Unknown';
}

/************************************
 * SHEET WRITER
 ************************************/
function appendRowsAudience_(sheetName, headers, rows) {
  if (!rows.length) return;
  var ss=SpreadsheetApp.getActiveSpreadsheet();
  var sh=ss.getSheetByName(sheetName)||ss.insertSheet(sheetName);
  if (sh.getLastRow()===0) sh.getRange(1,1,1,headers.length).setValues([headers]);
  var lastRow=getLastNonEmptyRowInColumn_(sh,1);
  sh.getRange(lastRow+1,1,rows.length,headers.length).setValues(rows);
}

function getLastNonEmptyRowInColumn_(sheet,col){
  var vals=sheet.getRange(1,col,sheet.getMaxRows(),1).getValues();
  for (var i=vals.length-1;i>=0;i--) if (vals[i][0]!==''&&vals[i][0]!==null) return i+1;
  return 1;
}

function n_(v){return Number(v||0);}
function nOrBlank_(v){return (v===''||v==null)?'':Number(v);}
