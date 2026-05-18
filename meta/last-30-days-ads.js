// Set-up the required configuration variables in the "Script Properties" (under "Project Settings") for security and ease of maintenance:
// META_ACCESS_TOKEN: Your Meta Graph API access token with permissions to read ad insights.
// META_AD_ACCOUNT_ID: Your Meta Ad Account ID (format: act_123456789).
/************************************
 * MAIN RUNNER → LAST 30 DAYS DAILY
 ************************************/
function runLast30Days() {
  // ui.alert('Running', 'Fetching last 30 days data...', ui.ButtonSet.OK);
  var r = getLastNDaysRange_(30);
  fetchAdLevelInsightsToSheetsLast30days(r.since, r.until);
}

/************************************
 * DATE RANGE (IST SAFE)
 ************************************/
function getLastNDaysRange_(days) {
  var tz = "Asia/Kolkata";
  var today = new Date();
  today.setHours(12,0,0,0);

  var until = Utilities.formatDate(today, tz, "yyyy-MM-dd");

  var sinceDate = new Date(today);
  sinceDate.setDate(sinceDate.getDate() - days + 1);
  var since = Utilities.formatDate(sinceDate, tz, "yyyy-MM-dd");

  return { since: since, until: until };
}

/************************************
 * MAIN FETCH
 ************************************/
function fetchAdLevelInsightsToSheetsLast30days(since, until) {

  var rows = fetchInsights_({
    level: 'ad',
    since: since,
    until: until,
    fields: AD_INSIGHT_FIELDS,
    time_increment: 1 // daily breakdown
  });

  if (!rows.length) return;

  var adsOut = [];
  var actionsOut = [];
  var actionValuesOut = [];
  var cpaOut = [];

  rows.forEach(function(r) {

    adsOut.push([
      r.date_start || '',
      r.date_stop || '',
      r.campaign_id || '',
      r.campaign_name || '',
      r.objective || '',
      r.adset_id || '',
      r.adset_name || '',
      r.ad_id || '',
      r.ad_name || '',
      n_(r.impressions),
      n_(r.clicks),
      n_(r.spend),
      nOrBlank_(r.cpc),
      nOrBlank_(r.cpm),
      nOrBlank_(r.ctr),
      nOrBlank_(r.cpp),
      nOrBlank_(r.frequency)
    ]);

    if (Array.isArray(r.actions)) {
      r.actions.forEach(function(a) {
        actionsOut.push([
          r.date_start,r.date_stop,r.campaign_id,r.adset_id,r.ad_id,
          a.action_type,nOrBlank_(a.value)
        ]);
      });
    }

    if (Array.isArray(r.action_values)) {
      r.action_values.forEach(function(a) {
        actionValuesOut.push([
          r.date_start,r.date_stop,r.campaign_id,r.adset_id,r.ad_id,
          a.action_type,nOrBlank_(a.value)
        ]);
      });
    }

    if (Array.isArray(r.cost_per_action_type)) {
      r.cost_per_action_type.forEach(function(a) {
        cpaOut.push([
          r.date_start,r.date_stop,r.campaign_id,r.adset_id,r.ad_id,
          a.action_type,nOrBlank_(a.value)
        ]);
      });
    }
  });

  appendRows_(SHEET_ADS, [
    'date_start','date_stop','campaign_id','campaign_name','objective',
    'adset_id','adset_name','ad_id','ad_name',
    'impressions','clicks','spend','cpc','cpm','ctr','cpp','frequency'
  ], adsOut);

  appendRows_(SHEET_AD_ACTIONS,
    ['date_start','date_stop','campaign_id','adset_id','ad_id','action_type','value'],
    actionsOut
  );

  appendRows_(SHEET_AD_ACTION_VALUES,
    ['date_start','date_stop','campaign_id','adset_id','ad_id','action_type','value'],
    actionValuesOut
  );

  appendRows_(SHEET_AD_CPA,
    ['date_start','date_stop','campaign_id','adset_id','ad_id','action_type','value'],
    cpaOut
  );
  // ui.alert('Success', 'Data fetch completed!', ui.ButtonSet.OK);
}

/************************************
 * META API
 ************************************/
function fetchInsights_(opt) {

  var params = {
    access_token: ACCESS_TOKEN,
    level: opt.level,
    fields: opt.fields.join(','),
    time_range: JSON.stringify({ since: opt.since, until: opt.until }),
    time_increment: opt.time_increment,
    limit: 5000
  };

  var url = BASE_URL + '/' + AD_ACCOUNT_ID + '/insights';
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
    if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
      parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
    }
  }
  return parts.join('&');
}

/************************************
 * SHEET HELPERS
 ************************************/
function appendRows_(sheetName, headers, rows) {
  if (!rows.length) return;

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);

  if (sh.getLastRow() === 0)
    sh.getRange(1,1,1,headers.length).setValues([headers]);

  var lastRow = getLastNonEmptyRowInColumn_(sh,1);
  sh.getRange(lastRow+1,1,rows.length,headers.length).setValues(rows);
}

function getLastNonEmptyRowInColumn_(sheet,col) {
  var vals = sheet.getRange(1,col,sheet.getMaxRows(),1).getValues();
  for (var i=vals.length-1;i>=0;i--) {
    if (vals[i][0] !== '' && vals[i][0] !== null) return i+1;
  }
  return 1;
}

/************************************
 * UTILS
 ************************************/
function n_(v){ return Number(v || 0); }
function nOrBlank_(v){ return (v===''||v==null)?'':Number(v); }
