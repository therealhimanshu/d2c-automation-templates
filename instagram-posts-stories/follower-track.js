// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
const FOLLOWER_CONFIG = {
  ACCESS_TOKEN: PropertiesService.getScriptProperties().getProperty('IG_ACCESS_TOKEN'),
  IG_USER_ID: PropertiesService.getScriptProperties().getProperty('IG_USER_ID'),
  SHEET_NAME: 'IG_Follower_Stats',
};
const FOLLOWER_HEADERS = [
  'date',
  'total_followers',       // from profile field (accurate)
  'followers_gained',      // from follows_and_unfollows metric
  'followers_lost',        // from follows_and_unfollows metric
  'net_change',            // gained - lost
  'last_updated'
];

// ─────────────────────────────────────────────
// MAIN — run this daily via trigger
// ─────────────────────────────────────────────
function runDailyFollowerSync() {
  const sheet = getOrCreateFollowerSheet();
  const yesterdayStr = getYesterdayDateStr();
  const { since, until } = getYesterdayUtcRange();

  if (dateAlreadyExists(sheet, yesterdayStr)) {
    Logger.log(`Row for ${yesterdayStr} already exists. Skipping.`);
    return;
  }

  // 1. Total followers — from profile directly (most accurate)
  const totalFollowers = getTotalFollowers();

  // 2. Gained & Lost — from follows_and_unfollows metric (period=day)
  const { gained, lost } = getFollowsAndUnfollows(since, until);

  const netChange = gained - lost;
  const now = Utilities.formatDate(new Date(), 'UTC', 'yyyy-MM-dd HH:mm:ss');

  sheet.appendRow([
    yesterdayStr,
    totalFollowers,
    gained,
    lost,
    netChange,
    now
  ]);

  Logger.log(`✅ ${yesterdayStr} | Total: ${totalFollowers} | Gained: ${gained} | Lost: ${lost} | Net: ${netChange}`);
}

// ─────────────────────────────────────────────
// API CALLS
// ─────────────────────────────────────────────

// Total followers from profile field — most reliable
function getTotalFollowers() {
  const url =
    `https://graph.facebook.com/v25.0/${FOLLOWER_CONFIG.IG_USER_ID}` +
    `?fields=followers_count` +
    `&access_token=${encodeURIComponent(FOLLOWER_CONFIG.ACCESS_TOKEN)}`;

  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) {
    Logger.log('Failed to fetch total followers: ' + response.getContentText());
    return 0;
  }

  const json = JSON.parse(response.getContentText());
  return json.followers_count || 0;
}

// Gained & Lost from follows_and_unfollows (period=day)
function getFollowsAndUnfollows(since, until) {
  const url =
    `https://graph.facebook.com/v25.0/${FOLLOWER_CONFIG.IG_USER_ID}/insights` +
    `?metric=follows_and_unfollows&period=day&metric_type=total_value&since=${since}&until=${until}` +
    `&access_token=${encodeURIComponent(FOLLOWER_CONFIG.ACCESS_TOKEN)}`;

  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });

  if (response.getResponseCode() !== 200) {
    Logger.log('follows_and_unfollows failed: ' + response.getContentText());
    return { gained: 0, lost: 0 };
  }

  const json = JSON.parse(response.getContentText());
  Logger.log('follows_and_unfollows raw: ' + JSON.stringify(json));

  let gained = 0;
  let lost = 0;

  // With metric_type=total_value, response shape is:
  // data[0].total_value.breakdowns[0].results → array of { dimension_values, value }
  const breakdowns = json.data?.[0]?.total_value?.breakdowns?.[0]?.results || [];

  breakdowns.forEach(entry => {
    const type = entry.dimension_values?.[0];
    if (type === 'FOLLOW') gained += entry.value || 0;
    if (type === 'UNFOLLOW') lost += entry.value || 0;
  });

  // Fallback: if no breakdowns, try total_value.value as net
  if (!breakdowns.length) {
    gained = json.data?.[0]?.total_value?.value || 0;
  }

  return { gained, lost };
}

// ─────────────────────────────────────────────
// DEBUG — run this first to verify raw responses
// ─────────────────────────────────────────────
function debugFollowerInsights() {
  const { since, until } = getYesterdayUtcRange();

  const url =
    `https://graph.facebook.com/v25.0/${FOLLOWER_CONFIG.IG_USER_ID}/insights` +
    `?metric=follows_and_unfollows&period=day&metric_type=total_value&since=${since}&until=${until}` +
    `&access_token=${encodeURIComponent(FOLLOWER_CONFIG.ACCESS_TOKEN)}`;

  Logger.log(UrlFetchApp.fetch(url, { muteHttpExceptions: true }).getContentText());
}
// ─────────────────────────────────────────────
// SHEET HELPERS
// ─────────────────────────────────────────────
function getOrCreateFollowerSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(FOLLOWER_CONFIG.SHEET_NAME)
    || ss.insertSheet(FOLLOWER_CONFIG.SHEET_NAME);
  if (sheet.getLastRow() === 0) sheet.appendRow(FOLLOWER_HEADERS);
  return sheet;
}

function dateAlreadyExists(sheet, dateStr) {
  if (sheet.getLastRow() < 2) return false;
  const dates = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat();
  return dates.includes(dateStr);
}

function getYesterdayDateStr() {
  const now = new Date();
  const yesterday = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 0
  ));
  return Utilities.formatDate(yesterday, 'UTC', 'yyyy-MM-dd');
}

function getYesterdayUtcRange() {
  const now = new Date();
  const todayMidnight = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()
  ));
  const yesterdayMidnight = new Date(todayMidnight.getTime() - 86400000);
  return {
    since: Math.floor(yesterdayMidnight.getTime() / 1000),
    until: Math.floor(todayMidnight.getTime() / 1000)
  };
}