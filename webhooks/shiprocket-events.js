/************************************
 * SHIPROCKET WEBHOOK → GOOGLE SHEETS
 * - Sheet 1: ShipmentSummary (1 row per AWB)
 * - Sheet 2: ShipmentScans   (1 row per scan event)
 ************************************/

const SUMMARY_SHEET_NAME = 'ShipmentSummary';
const SCANS_SHEET_NAME   = 'ShipmentScans';

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ success: false, message: 'No POST data' });
    }

    const rawBody = e.postData.contents;
    const data = JSON.parse(rawBody);

    // 1) Write main shipment info (1 row) -------------------------
    writeShipmentSummary(data);

    // 2) Write scans table (1 row per scan) -----------------------
    // writeShipmentScans(data);

    return jsonResponse({ success: true });
  } catch (err) {
    Logger.log('doPost error: ' + err);
    return jsonResponse({ success: false, message: 'Error: ' + err });
  }
}

/**
 * Writes a single row to ShipmentSummary sheet
 */
function writeShipmentSummary(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SUMMARY_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SUMMARY_SHEET_NAME);
  }

  // Header row once
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'Logged At',
      'AWB',
      'Courier Name',
      'Current Status',
      'Current Status ID',
      'Shipment Status',
      'Shipment Status ID',
      'Order ID',
      'SR Order ID',
      'Current Timestamp',
      'Payload Date',
      'AWB Assigned Date',
      'Pickup Scheduled Date',
      'ETD',
      'Is Return',
      'Channel ID',
      'POD Status',
      'POD',
      'Delivered Date',
      'Shipping Method',
      // from scans
      'Last Scan Date',
      'Last Scan Status Code',
      'Last Scan SR Status',
      'Last Scan SR Status Label',
      'Last Scan Activity',
      'Last Scan Location',
      'Last Scan Latitude',
      'Last Scan Longitude',
      'Delivery Attempts (Consignee Not Available)',
      // raw JSON if you want to keep it
      'Raw JSON'
    ]);
  }

  // Core fields
  const awb              = payload.awb || '';
  const courierName      = payload.courier_name || '';
  const currentStatus    = payload.current_status || '';
  const currentStatusId  = payload.current_status_id || '';
  const shipmentStatus   = payload.shipment_status || '';
  const shipmentStatusId = payload.shipment_status_id || '';
  const orderId          = payload.order_id || '';
  const srOrderId        = payload.sr_order_id || '';
  const currentTimestamp = payload.current_timestamp || '';
  const payloadDate      = payload.date || '';
  const awbAssignedDate  = payload.awb_assigned_date || '';
  const pickupScheduled  = payload.pickup_scheduled_date || '';
  const etd              = payload.etd || '';
  const isReturn         = payload.is_return || '';
  const channelId        = payload.channel_id || '';
  const podStatus        = payload.pod_status || '';
  const pod              = payload.pod || '';
  const deliveredDate    = payload.delivered_date || '';
  const shippingMethod   = payload.shipping_method || '';

  // Last scan + attempts
  const scans = payload.scans || [];
  let lastScanDate = '';
  let lastScanStatusCode = '';
  let lastScanSrStatus = '';
  let lastScanSrStatusLabel = '';
  let lastScanActivity = '';
  let lastScanLocation = '';
  let lastScanLat = '';
  let lastScanLng = '';
  let attempts = 0;

  if (scans.length > 0) {
    const lastScan = scans[scans.length - 1];
    lastScanDate         = lastScan.date || '';
    lastScanStatusCode   = lastScan.status || '';
    lastScanSrStatus     = lastScan['sr-status'] || '';
    lastScanSrStatusLabel= lastScan['sr-status-label'] || '';
    lastScanActivity     = lastScan.activity || '';
    lastScanLocation     = lastScan.location || '';
    lastScanLat          = lastScan.latitude || '';
    lastScanLng          = lastScan.longitude || '';

    attempts = scans.filter(s =>
      (s.activity || '').indexOf('CONSIGNEE NOT AVAILABLE;CANT DELIVER') !== -1
    ).length;
  }

  sheet.appendRow([
    new Date(),
    awb,
    courierName,
    currentStatus,
    currentStatusId,
    shipmentStatus,
    shipmentStatusId,
    orderId,
    srOrderId,
    currentTimestamp,
    payloadDate,
    awbAssignedDate,
    pickupScheduled,
    etd,
    isReturn,
    channelId,
    podStatus,
    pod,
    deliveredDate,
    shippingMethod,
    lastScanDate,
    lastScanStatusCode,
    lastScanSrStatus,
    lastScanSrStatusLabel,
    lastScanActivity,
    lastScanLocation,
    lastScanLat,
    lastScanLng,
    attempts,
    JSON.stringify(payload)
  ]);
}