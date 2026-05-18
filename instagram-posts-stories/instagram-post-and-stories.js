// ─────────────────────────────────────────────
// MAIN ENTRY POINT — run this on a daily trigger
// ─────────────────────────────────────────────
function runDailyInstagramSync() {
  fetchPreviousDayPosts();   // Step 1: Add any new posts from yesterday
  refreshLast7DaysMetrics(); // Step 2: Update metrics for posts ≤ 7 days old
}

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
const CONFIG = {
  ACCESS_TOKEN: PropertiesService.getScriptProperties().getProperty('IG_ACCESS_TOKEN'),
  IG_USER_ID: PropertiesService.getScriptProperties().getProperty('IG_USER_ID'),
  SHEET_NAME: 'IG_Post_Metrics',
  METRICS_TO_REFRESH_DAYS: 7,
};

const HEADERS = [
  'date', 'media_id', 'media_type', 'media_product_type',
  'timestamp', 'permalink', 'caption',
  'like_count', 'comments_count',
  'reach', 'saved', 'shares', 'total_interactions',
  'last_updated'  // tracks when metrics were last refreshed
];

// Column index map (1-based)
const COL = {
  date: 1, media_id: 2, media_type: 3, media_product_type: 4,
  timestamp: 5, permalink: 6, caption: 7,
  like_count: 8, comments_count: 9,
  reach: 10, saved: 11, shares: 12, total_interactions: 13,
  last_updated: 14
};

// ─────────────────────────────────────────────
// STEP 1: Fetch yesterday's new posts
// ─────────────────────────────────────────────
function fetchPreviousDayPosts() {
  const sheet = getOrCreateSheet();
  const { since, until } = getYesterdayUtcRange();
  const mediaList = getMediaInRange(CONFIG.IG_USER_ID, CONFIG.ACCESS_TOKEN, since, until);

  if (!mediaList.length) {
    Logger.log(`No posts found for yesterday. ${since} to ${until}`);
    return;
  }

  const rows = mediaList.map(media => buildRow(media));
  appendNewRowsAvoidDuplicates(sheet, rows);
  Logger.log(`Added ${rows.length} new post(s) from yesterday.`);
}

// ─────────────────────────────────────────────
// STEP 2: Refresh metrics for posts ≤ 7 days old
// ─────────────────────────────────────────────
function refreshLast7DaysMetrics() {
  const sheet = getOrCreateSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    Logger.log('No data rows to refresh.');
    return;
  }

  const cutoffDate = new Date();
  cutoffDate.setUTCDate(cutoffDate.getUTCDate() - CONFIG.METRICS_TO_REFRESH_DAYS);
  cutoffDate.setUTCHours(0, 0, 0, 0);

  // Read all data rows at once (avoid repeated getRange calls)
  const dataRange = sheet.getRange(2, 1, lastRow - 1, HEADERS.length);
  const data = dataRange.getValues();

  let refreshCount = 0;

  data.forEach((row, i) => {
    const postDate = new Date(row[COL.timestamp - 1]);
    if (isNaN(postDate.getTime())) return;
    if (postDate < cutoffDate) return; // older than 7 days, skip

    const mediaId = String(row[COL.media_id - 1]);
    if (!mediaId) return;

    // Fetch fresh basic fields via media endpoint
    const freshMedia = getMediaById(mediaId, CONFIG.ACCESS_TOKEN);
    const insights = getMediaInsights(mediaId, CONFIG.ACCESS_TOKEN);

    if (!freshMedia) return;

    // Update only metric columns in-place
    const sheetRow = i + 2; // +2 because data starts at row 2
    sheet.getRange(sheetRow, COL.like_count).setValue(freshMedia.like_count || 0);
    sheet.getRange(sheetRow, COL.comments_count).setValue(freshMedia.comments_count || 0);
    sheet.getRange(sheetRow, COL.reach).setValue(insights.reach || 0);
    sheet.getRange(sheetRow, COL.saved).setValue(insights.saved || 0);
    sheet.getRange(sheetRow, COL.shares).setValue(insights.shares || 0);
    sheet.getRange(sheetRow, COL.total_interactions).setValue(
      insights.total_interactions || (
        (freshMedia.like_count || 0) +
        (freshMedia.comments_count || 0) +
        (insights.saved || 0) +
        (insights.shares || 0)
      )
    );
    sheet.getRange(sheetRow, COL.last_updated).setValue(
      Utilities.formatDate(new Date(), 'UTC', 'yyyy-MM-dd HH:mm:ss')
    );

    refreshCount++;
    Utilities.sleep(200); // avoid rate limits
  });

  Logger.log(`Refreshed metrics for ${refreshCount} post(s) within last 7 days.`);
}

// ─────────────────────────────────────────────
// API HELPERS
// ─────────────────────────────────────────────
function getMediaInRange(igUserId, accessToken, since, until) {
  let url =
    `https://graph.facebook.com/v25.0/${igUserId}/media` +
    `?fields=id,caption,timestamp,media_type,media_product_type,permalink,like_count,comments_count` +
    `&since=${since}&until=${until}&limit=100` +
    `&access_token=${encodeURIComponent(accessToken)}`;

  const allMedia = [];

  while (url) {
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (response.getResponseCode() !== 200) {
      throw new Error('Media fetch failed: ' + response.getContentText());
    }
    const json = JSON.parse(response.getContentText());

    (json.data || []).forEach(item => {
      if (item.timestamp) {
        const ts = new Date(item.timestamp).getTime() / 1000;
        if (ts >= since && ts < until) allMedia.push(item);
      }
    });

    url = json.paging?.next || null;
  }

  return allMedia;
}

function getMediaById(mediaId, accessToken) {
  const url =
    `https://graph.facebook.com/v25.0/${mediaId}` +
    `?fields=id,like_count,comments_count,timestamp` +
    `&access_token=${encodeURIComponent(accessToken)}`;

  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) {
    Logger.log('Media fetch failed for ' + mediaId + ': ' + response.getContentText());
    return null;
  }
  return JSON.parse(response.getContentText());
}

function getMediaInsights(mediaId, accessToken) {
  const metrics = 'reach,saved,shares,total_interactions';
  const url =
    `https://graph.facebook.com/v25.0/${mediaId}/insights` +
    `?metric=${metrics}&access_token=${encodeURIComponent(accessToken)}`;

  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) {
    Logger.log('Insights failed for ' + mediaId + ': ' + response.getContentText());
    return {};
  }

  const json = JSON.parse(response.getContentText());
  const output = {};
  (json.data || []).forEach(metric => {
    output[metric.name] = metric.values?.[0]?.value ?? 0;
  });
  return output;
}

// ─────────────────────────────────────────────
// SHEET HELPERS
// ─────────────────────────────────────────────
function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.insertSheet(CONFIG.SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  }

  return sheet;
}

function buildRow(media, insights = null) {
  if (!insights) insights = getMediaInsights(media.id, CONFIG.ACCESS_TOKEN);
  const now = Utilities.formatDate(new Date(), 'UTC', 'yyyy-MM-dd HH:mm:ss');
  return [
    formatDateOnly(media.timestamp),
    media.id || '',
    media.media_type || '',
    media.media_product_type || '',
    media.timestamp || '',
    media.permalink || '',
    media.caption || '',
    media.like_count || 0,
    media.comments_count || 0,
    insights.reach || 0,
    insights.saved || 0,
    insights.shares || 0,
    insights.total_interactions || (
      (media.like_count || 0) + (media.comments_count || 0) +
      (insights.saved || 0) + (insights.shares || 0)
    ),
    now
  ];
}

function appendNewRowsAvoidDuplicates(sheet, rows) {
  const existingIds = new Set();
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, COL.media_id, sheet.getLastRow() - 1, 1)
      .getValues()
      .forEach(r => existingIds.add(String(r[0])));
  }

  const newRows = rows.filter(r => !existingIds.has(String(r[COL.media_id - 1])));
  if (newRows.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
  }
}

function getYesterdayUtcRange() {
  const now = new Date();
  const todayUtcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const yesterdayUtcMidnight = new Date(todayUtcMidnight.getTime() - 2*86400000);
  return {
    since: Math.floor(yesterdayUtcMidnight.getTime() / 1000),
    until: Math.floor(todayUtcMidnight.getTime() / 1000)
  };
}

function formatDateOnly(timestamp) {
  if (!timestamp) return '';
  return Utilities.formatDate(new Date(timestamp), 'UTC', 'yyyy-MM-dd');
}