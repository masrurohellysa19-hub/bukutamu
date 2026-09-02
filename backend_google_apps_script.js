/**
 * BACKEND GOOGLE APPS SCRIPT (GAS) - SISTEM BUKU TAMU DIGITAL & BARCODE PIKET
 * Arsitektur Hybrid: Mendukung REST API HTTP Fetch & Native google.script.run
 */

const CONFIG = {
  FOLDER_NAME: "Shopifi Engine",
  SHEET_NAME: "Shopifi_Visitor_DB",
  PROPERTY_KEY: "SHOPIFI_SHEET_ID"
};

/**
 * Memeriksa dan menginisialisasi Google Spreadsheet otomatis jika belum tersedia
 */
function getOrCreateDatabase() {
  // 1. Prioritaskan jika script terikat langsung pada Google Spreadsheet (Container-bound)
  try {
    const activeSs = SpreadsheetApp.getActiveSpreadsheet();
    if (activeSs) {
      let sheet = activeSs.getSheetByName("Visitors") || activeSs.getSheets()[0];
      initSheetHeaders(sheet);
      return sheet;
    }
  } catch (e) {
    Logger.log("Bukan container-bound script, mencari di Drive / PropertiesService...");
  }

  // 2. Cek apakah ID spreadsheet tersimpan di ScriptProperties
  const scriptProperties = PropertiesService.getScriptProperties();
  let sheetId = scriptProperties.getProperty(CONFIG.PROPERTY_KEY);

  if (sheetId) {
    try {
      const existingSs = SpreadsheetApp.openById(sheetId);
      let sheet = existingSs.getSheetByName("Visitors") || existingSs.getSheets()[0];
      initSheetHeaders(sheet);
      return sheet;
    } catch (e) {
      Logger.log("Database ID lama tidak valid, membangun ulang database...");
    }
  }

  // 3. Buat folder dan spreadsheet baru di Google Drive
  let targetFolder = null;
  try {
    const folders = DriveApp.getFoldersByName(CONFIG.FOLDER_NAME);
    if (folders.hasNext()) {
      targetFolder = folders.next();
    } else {
      targetFolder = DriveApp.createFolder(CONFIG.FOLDER_NAME);
    }
  } catch (errDrive) {
    Logger.log("Akses Drive folder terbatas, membuat di root: " + errDrive);
  }

  const newSs = SpreadsheetApp.create(CONFIG.SHEET_NAME);
  if (targetFolder) {
    try {
      const file = DriveApp.getFileById(newSs.getId());
      targetFolder.addFile(file);
      DriveApp.getRootFolder().removeFile(file);
    } catch (eMove) {}
  }

  const sheet = newSs.getActiveSheet();
  sheet.setName("Visitors");
  initSheetHeaders(sheet);

  // Simpan ID ke PropertiesService
  scriptProperties.setProperty(CONFIG.PROPERTY_KEY, newSs.getId());
  return sheet;
}

/**
 * Inisialisasi Header Kolom Tabel jika kosong
 */
function initSheetHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    const headers = [
      "Visitor_ID",
      "Timestamp_Daftar",
      "Nama_Lengkap",
      "Instansi_Asal",
      "No_HP",
      "Bertemu_Dengan",
      "Keperluan",
      "Jumlah_Orang",
      "Plat_Nomor",
      "Status",
      "Waktu_CheckIn",
      "Waktu_CheckOut"
    ];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight("bold")
      .setBackground("#0f172a")
      .setFontColor("#ffffff");
    sheet.setFrozenRows(1);
  }
}

/**
 * Main Webhook doPost Handler (Menerima Request HTTP POST dari Localhost / External)
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ status: "error", message: "Payload tidak valid atau kosong" }, 400);
    }

    let requestData;
    try {
      requestData = JSON.parse(e.postData.contents);
    } catch (jsonErr) {
      return createJsonResponse({ status: "error", message: "Format JSON payload tidak valid" }, 400);
    }

    const { action, payload } = requestData;
    const sheet = getOrCreateDatabase();

    // Routing Tindakan CRUD
    switch (action) {
      case "create_guest":
        return handleCreateGuest(sheet, payload);

      case "get_by_id_public":
      case "get_by_id":
        return handleGetGuestById(sheet, payload ? payload.visitorId : null);

      case "read_all":
        return handleReadAllGuests(sheet);

      case "update_status":
        return handleUpdateStatus(sheet, payload);

      case "delete":
        return handleDeleteGuest(sheet, payload ? payload.visitorId : null);

      default:
        return createJsonResponse({ status: "error", message: "Aksi tidak dikenali: " + action }, 400);
    }

  } catch (error) {
    return createJsonResponse({ status: "error", message: error.toString() }, 500);
  }
}

/**
 * Mendaftarkan Tamu Baru / Kunjungan Baru
 */
function handleCreateGuest(sheet, payload) {
  if (!payload || !payload.nama || !payload.keperluan) {
    return createJsonResponse({ status: "error", message: "Nama dan Keperluan wajib diisi." }, 400);
  }

  const now = new Date();
  const dateStr = Utilities.formatDate(now, "GMT+7", "yyyyMMdd");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const visitorId = (payload.visitorId && String(payload.visitorId).trim()) ? String(payload.visitorId).trim() : ("VIS-" + dateStr + "-" + randomSuffix);
  const timeFormatted = Utilities.formatDate(now, "GMT+7", "yyyy-MM-dd HH:mm:ss");

  const newRow = [
    visitorId,
    timeFormatted,
    payload.nama || "",
    payload.instansi || "-",
    payload.noHp || "-",
    payload.bertemu || "-",
    payload.keperluan || "-",
    payload.jumlahOrang || 1,
    payload.platNomor || "-",
    "TERDAFTAR",
    "",
    ""
  ];

  sheet.appendRow(newRow);

  return createJsonResponse({
    status: "success",
    message: "Kunjungan tamu berhasil dicatat di database.",
    data: {
      visitorId: visitorId,
      timestamp: timeFormatted,
      nama: payload.nama,
      instansi: payload.instansi,
      keperluan: payload.keperluan,
      bertemu: payload.bertemu,
      status: "TERDAFTAR"
    }
  });
}

/**
 * Membaca seluruh rekaman tamu (diurutkan dari yang terbaru)
 */
function handleReadAllGuests(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return createJsonResponse({ status: "success", data: [] });
  }

  const rows = data.slice(1);
  const visitors = rows.map((row) => {
    return {
      visitorId: row[0],
      timestamp: row[1],
      nama: row[2],
      instansi: row[3],
      noHp: row[4],
      bertemu: row[5],
      keperluan: row[6],
      jumlahOrang: row[7],
      platNomor: row[8],
      status: row[9],
      waktuCheckIn: row[10],
      waktuCheckOut: row[11]
    };
  }).reverse();

  return createJsonResponse({ status: "success", data: visitors });
}

/**
 * Mencari tamu berdasarkan Barcode / Visitor ID (mengambil kunjungan terbaru)
 */
function handleGetGuestById(sheet, visitorId) {
  if (!visitorId) {
    return createJsonResponse({ status: "error", message: "Visitor ID diperlukan." }, 400);
  }

  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]).trim().toUpperCase() === String(visitorId).trim().toUpperCase()) {
      return createJsonResponse({
        status: "success",
        data: {
          rowIndex: i + 1,
          visitorId: data[i][0],
          timestamp: data[i][1],
          nama: data[i][2],
          instansi: data[i][3],
          noHp: data[i][4],
          bertemu: data[i][5],
          keperluan: data[i][6],
          jumlahOrang: data[i][7],
          platNomor: data[i][8],
          status: data[i][9],
          waktuCheckIn: data[i][10],
          waktuCheckOut: data[i][11]
        }
      });
    }
  }

  return createJsonResponse({ status: "error", message: "Data tamu tidak ditemukan untuk ID: " + visitorId }, 404);
}

/**
 * Update Status Kunjungan (Check-In / Check-Out) pada baris kunjungan terbaru
 */
function handleUpdateStatus(sheet, payload) {
  if (!payload || !payload.visitorId || !payload.newStatus) {
    return createJsonResponse({ status: "error", message: "Visitor ID dan status baru diperlukan." }, 400);
  }

  const data = sheet.getDataRange().getValues();
  const now = new Date();
  const timeFormatted = Utilities.formatDate(now, "GMT+7", "yyyy-MM-dd HH:mm:ss");

  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]).trim().toUpperCase() === String(payload.visitorId).trim().toUpperCase()) {
      const rowIndex = i + 1;
      const status = payload.newStatus.toUpperCase();
      
      sheet.getRange(rowIndex, 10).setValue(status);

      if (status === "CHECK-IN") {
        sheet.getRange(rowIndex, 11).setValue(timeFormatted);
      } else if (status === "CHECK-OUT") {
        sheet.getRange(rowIndex, 12).setValue(timeFormatted);
      }

      return createJsonResponse({
        status: "success",
        message: "Status tamu " + payload.visitorId + " berhasil diperbarui menjadi " + status,
        updatedTime: timeFormatted
      });
    }
  }

  return createJsonResponse({ status: "error", message: "Data tamu tidak ditemukan." }, 404);
}

/**
 * Menghapus rekaman tamu berdasarkan Visitor ID (menghapus kunjungan terbaru)
 */
function handleDeleteGuest(sheet, visitorId) {
  if (!visitorId) {
    return createJsonResponse({ status: "error", message: "Visitor ID diperlukan." }, 400);
  }

  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]).trim().toUpperCase() === String(visitorId).trim().toUpperCase()) {
      sheet.deleteRow(i + 1);
      return createJsonResponse({ status: "success", message: "Data tamu berhasil dihapus." });
    }
  }

  return createJsonResponse({ status: "error", message: "Data tamu tidak ditemukan." }, 404);
}

/**
 * ==================== NATIVE RPC FUNCTIONS UNTUK GOOGLE APPS SCRIPT ====================
 * Dipanggil langsung oleh frontend HTML saat di-host di Apps Script via google.script.run
 */
function apiCreateGuest(payload) {
  const sheet = getOrCreateDatabase();
  const resp = handleCreateGuest(sheet, payload);
  return JSON.parse(resp.getContent());
}

function apiReadAllGuests() {
  const sheet = getOrCreateDatabase();
  const resp = handleReadAllGuests(sheet);
  return JSON.parse(resp.getContent());
}

function apiGetGuestById(visitorId) {
  const sheet = getOrCreateDatabase();
  const resp = handleGetGuestById(sheet, visitorId);
  return JSON.parse(resp.getContent());
}

function apiUpdateStatus(payload) {
  const sheet = getOrCreateDatabase();
  const resp = handleUpdateStatus(sheet, payload);
  return JSON.parse(resp.getContent());
}

function apiDeleteGuest(visitorId) {
  const sheet = getOrCreateDatabase();
  const resp = handleDeleteGuest(sheet, visitorId);
  return JSON.parse(resp.getContent());
}

/**
 * Helper JSON Response
 */
function createJsonResponse(dataObject, httpCode) {
  return ContentService.createTextOutput(JSON.stringify(dataObject))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Endpoint GET & Router Web App HTML
 * - Buka URL biasa -> Menampilkan Portal Tamu (index.html)
 * - Buka URL + ?page=admin -> Menampilkan Portal Admin (admin.html)
 * - Buka URL + ?format=json -> Mengembalikan status JSON API
 */
function doGet(e) {
  if (e && e.parameter && e.parameter.format === "json") {
    return ContentService.createTextOutput(JSON.stringify({
      status: "online",
      engine: "Shopifi GAS Buku Tamu Engine v2.2",
      timestamp: Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd HH:mm:ss"),
      message: "Endpoint Google Apps Script siap menerima request."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  const page = (e && e.parameter && e.parameter.page) ? String(e.parameter.page).toLowerCase() : "tamu";

  try {
    const templateName = (page === "admin") ? "admin" : "index";
    const template = HtmlService.createTemplateFromFile(templateName);

    try {
      template.SERVICE_URL = ScriptApp.getService().getUrl();
    } catch (urlErr) {
      template.SERVICE_URL = "";
    }

    const title = (page === "admin") ? "Portal Admin Piket - Buku Tamu Digital" : "Buku Tamu Digital - Portal Tamu";

    return template.evaluate()
      .setTitle(title)
      .addMetaTag("viewport", "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "online",
      message: "Backend Apps Script aktif.",
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}