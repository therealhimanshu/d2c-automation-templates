//The awb-to-sheet.js script should be run first to populate the AWB numbers in column B, which this script will then read to fetch the current status, ETD, and track URL from Shiprocket and populate columns C, D, and E respectively.
// This script should run on open sheet basis or you can set a time-driven trigger to run it daily/weekly as needed. It reads AWB numbers from column B, calls the Shiprocket API to get the current status, ETD, and track URL, and then writes those back to columns C, D, and E in the same row. Make sure to set your Shiprocket credentials in the Script Properties for security.
function fetchShiprocketCurrentStatus() {
  const SHEET_NAME = 'Orders';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) { Logger.log(`❌ Sheet "${SHEET_NAME}" not found.`); return; }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) { Logger.log('⚠️ No AWB numbers found.'); return; }

  const awbNumbers = sheet.getRange('B2:B' + lastRow).getValues().flat();

  // Headers
  if (sheet.getRange(1, 3).getValue() !== 'Current Status') sheet.getRange(1, 3).setValue('Current Status');
  if (sheet.getRange(1, 4).getValue() !== 'ETD') sheet.getRange(1, 4).setValue('ETD');
  if (sheet.getRange(1, 5).getValue() !== 'Track URL') sheet.getRange(1, 5).setValue('Track URL');

  // 🔐 Shiprocket credentials (consider Script Properties for security)
  const SHIPROCKET_EMAIL = PropertiesService.getScriptProperties().getProperty('SHIPROCKET_EMAIL'); // e.g. "
  const SHIPROCKET_PASSWORD = PropertiesService.getScriptProperties().getProperty('SHIPROCKET_PASSWORD'); // e.g. "

  // 1) Authenticate
  let token;
  try {
    const loginResponse = UrlFetchApp.fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ email: SHIPROCKET_EMAIL, password: SHIPROCKET_PASSWORD }),
      muteHttpExceptions: true
    });

    if (loginResponse.getResponseCode() !== 200) { Logger.log('❌ Failed to authenticate with Shiprocket.'); return; }
    const loginData = JSON.parse(loginResponse.getContentText());
    token = loginData.token;
    if (!token) { Logger.log('❌ No token received from Shiprocket.'); return; }
  } catch (err) {
    Logger.log(`💥 Error authenticating: ${err}`); return;
  }

  // 2) Fetch for each AWB
  awbNumbers.forEach((awb, i) => {
    const row = i + 2;
    if (!awb) { sheet.getRange(row, 3).setValue('No AWB'); return; }

    const url = `https://apiv2.shiprocket.in/v1/external/courier/track/awb/${awb}`;
    try {
      const response = UrlFetchApp.fetch(url, {
        method: 'get',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        muteHttpExceptions: true
      });

      if (response.getResponseCode() !== 200) {
        sheet.getRange(row, 3).setValue('HTTP Error');
        sheet.getRange(row, 4).setValue('');
        sheet.getRange(row, 5).setValue('');
        return;
      }

      const data = JSON.parse(response.getContentText());

      // Current status
      const status = data?.tracking_data?.shipment_track?.[0]?.current_status || 'Unknown';
      sheet.getRange(row, 3).setValue(status);

      // ETD and Track URL (from your sample JSON)
      const etd = data?.tracking_data?.etd || data?.tracking_data?.edd || ''; // fallback to edd if needed
      const trackUrl = data?.tracking_data?.track_url || '';

      const etdDate = etd ? new Date(etd.replace(' ', 'T')) : '';
      sheet.getRange(row, 4).setValue(etdDate);

       // or parse to Date if you prefer
      sheet.getRange(row, 5).setValue(trackUrl);     // you can also use HYPERLINK:
      // sheet.getRange(row, 5).setFormula(trackUrl ? `=HYPERLINK("${trackUrl}","Track")` : "");

    } catch (err) {
      Logger.log(`💥 Error for AWB ${awb}: ${err}`);
      sheet.getRange(row, 3).setValue('Error');
      sheet.getRange(row, 4).setValue('');
      sheet.getRange(row, 5).setValue('');
    }
  });

  Logger.log('🏁 Finished fetching statuses, ETD, and track URLs.');
}
