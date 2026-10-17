/**
 * ==============================================================================================
 * HỆ THỐNG QUẢN LÝ VÀ THEO DÕI HẠN KIỂM ĐỊNH THIẾT BỊ ĐO ĐẾM TRẠM 110KV KHÁCH HÀNG
 * Tích hợp: Google Sheets, Google Drive, Zalo Notification (Webhook & ZNS)
 * ==============================================================================================
 */

// CẤU HÌNH MẶC ĐỊNH
const DEFAULT_CONFIG = {
  SPREADSHEET_ID: '1iI3Cl98W-WMg6ioHe8w4CZkb5NopkN8ZwzaUJM5WMDU',
  SHEET_NAME: 'Trang tính1',
  DRIVE_ROOT_FOLDER_ID: '1R_jh4t2wrE0SvmnjFpvKu7UmrHwXi6En',
  HEADER_ROW: 5,        // Dòng tiêu đề kết thúc ở dòng 5
  DATA_START_ROW: 6,    // Dữ liệu bắt đầu từ dòng 6
  DEFAULT_REMINDER_MONTHS: 13 // Ngưỡng cảnh báo mặc định (tháng)
};

/**
 * Xử lý yêu cầu HTTP GET để hiển thị giao diện Web App
 */
function doGet(e) {
  const template = HtmlService.createTemplateFromFile('index');
  return template.evaluate()
    .setTitle('Quản lý Kiểm định Thiết bị Đo đếm 110kV')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Lấy cấu hình hệ thống từ ScriptProperties hoặc giá trị mặc định
 */
function getConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    spreadsheetId: props.getProperty('SPREADSHEET_ID') || DEFAULT_CONFIG.SPREADSHEET_ID,
    sheetName: props.getProperty('SHEET_NAME') || DEFAULT_CONFIG.SHEET_NAME,
    driveFolderId: props.getProperty('DRIVE_ROOT_FOLDER_ID') || DEFAULT_CONFIG.DRIVE_ROOT_FOLDER_ID,
    zaloManagerPhone: props.getProperty('ZALO_MANAGER_PHONE') || '',
    zaloWebhookUrl: props.getProperty('ZALO_WEBHOOK_URL') || '',
    alertThresholdMonths: parseInt(props.getProperty('ALERT_THRESHOLD_MONTHS') || '13', 10),
    enableAutoWeeklyZalo: props.getProperty('ENABLE_WEEKLY_ZALO') === 'true'
  };
}

/**
 * Lưu cấu hình cài đặt từ giao diện
 */
function saveConfig(configData) {
  try {
    const props = PropertiesService.getScriptProperties();
    if (configData.spreadsheetId) props.setProperty('SPREADSHEET_ID', configData.spreadsheetId.trim());
    if (configData.sheetName) props.setProperty('SHEET_NAME', configData.sheetName.trim());
    if (configData.driveFolderId) props.setProperty('DRIVE_ROOT_FOLDER_ID', configData.driveFolderId.trim());
    if (configData.zaloManagerPhone !== undefined) props.setProperty('ZALO_MANAGER_PHONE', configData.zaloManagerPhone.trim());
    if (configData.zaloWebhookUrl !== undefined) props.setProperty('ZALO_WEBHOOK_URL', configData.zaloWebhookUrl.trim());
    if (configData.alertThresholdMonths) props.setProperty('ALERT_THRESHOLD_MONTHS', configData.alertThresholdMonths.toString());
    if (configData.enableAutoWeeklyZalo !== undefined) {
      props.setProperty('ENABLE_WEEKLY_ZALO', configData.enableAutoWeeklyZalo ? 'true' : 'false');
      if (configData.enableAutoWeeklyZalo) {
        setupWeeklyTrigger();
      } else {
        removeWeeklyTrigger();
      }
    }
    return { success: true, message: 'Đã lưu cấu hình thành công!' };
  } catch (err) {
    return { success: false, message: 'Lỗi khi lưu cấu hình: ' + err.toString() };
  }
}

/**
 * Lưu nhanh số điện thoại của người quản lý từ ô nhập trực tiếp trên giao diện
 */
function saveMyPhoneNumber(phone, enableWeekly) {
  try {
    const props = PropertiesService.getScriptProperties();
    const cleanPhone = (phone || '').trim();
    props.setProperty('ZALO_MANAGER_PHONE', cleanPhone);
    if (enableWeekly !== undefined) {
      props.setProperty('ENABLE_WEEKLY_ZALO', enableWeekly ? 'true' : 'false');
      if (enableWeekly) {
        setupWeeklyTrigger();
      } else {
        removeWeeklyTrigger();
      }
    }
    return { success: true, message: 'Đã lưu số điện thoại Zalo của bạn (' + cleanPhone + ') để nhận thông báo làm văn bản!' };
  } catch (err) {
    return { success: false, message: 'Lỗi lưu SĐT: ' + err.toString() };
  }
}

/**
 * Lấy dữ liệu toàn bộ trạm và điểm đo từ Google Sheets kèm xử lý Merged Cells
 */
function getDashboardData() {
  try {
    const config = getConfig();
    const ss = SpreadsheetApp.openById(config.spreadsheetId);
    let sheet = ss.getSheetByName(config.sheetName);
    if (!sheet) {
      sheet = ss.getSheets()[0]; // Fallback sheet đầu tiên
    }

    const lastRow = sheet.getLastRow();
    if (lastRow < DEFAULT_CONFIG.DATA_START_ROW) {
      return {
        success: true,
        data: [],
        summary: calculateSummary([]),
        config: config
      };
    }

    const startRow = DEFAULT_CONFIG.DATA_START_ROW;
    const numRows = lastRow - startRow + 1;
    const numCols = 26; // Cột A đến Z

    const range = sheet.getRange(startRow, 1, numRows, numCols);
    const rawValues = range.getValues();
    const rawDisplayValues = range.getDisplayValues();

    // =========================================================================
    // XỬ LÝ Ô MERGED (UNFILL / PROPAGATE MERGED VALUES)
    // Các cột A, C, K-R, W, X, Y, Z thường có ô gộp theo cụm Trạm 110kV
    // =========================================================================
    const mergedRanges = range.getMergedRanges();
    for (let i = 0; i < mergedRanges.length; i++) {
      const mr = mergedRanges[i];
      const mStartRow = mr.getRow() - startRow; // index tương đối trong mảng (0-based)
      const mStartCol = mr.getColumn() - 1;     // index cột 0-based
      const mNumRows = mr.getNumRows();
      const mNumCols = mr.getNumColumns();

      if (mStartRow >= 0 && mStartRow < numRows) {
        const topValue = rawValues[mStartRow][mStartCol];
        const topDisplayValue = rawDisplayValues[mStartRow][mStartCol];

        for (let r = 0; r < mNumRows; r++) {
          const targetRow = mStartRow + r;
          if (targetRow < numRows) {
            for (let c = 0; c < mNumCols; c++) {
              const targetCol = mStartCol + c;
              if (targetCol < numCols) {
                rawValues[targetRow][targetCol] = topValue;
                rawDisplayValues[targetRow][targetCol] = topDisplayValue;
              }
            }
          }
        }
      }
    }

    // Kế thừa giá trị trạm nếu hàng kế tiếp trống Tên TBA do định dạng
    let currentTba = '';
    let currentSttKh = '';
    let currentLienHe = '';
    for (let r = 0; r < numRows; r++) {
      if (rawDisplayValues[r][2] && rawDisplayValues[r][2].toString().trim() !== '') {
        currentTba = rawDisplayValues[r][2].toString().trim();
      } else if (currentTba) {
        rawDisplayValues[r][2] = currentTba;
        rawValues[r][2] = currentTba;
      }

      if (rawDisplayValues[r][0] && rawDisplayValues[r][0].toString().trim() !== '') {
        currentSttKh = rawDisplayValues[r][0].toString().trim();
      } else if (currentSttKh) {
        rawDisplayValues[r][0] = currentSttKh;
        rawValues[r][0] = currentSttKh;
      }

      if (rawDisplayValues[r][23] && rawDisplayValues[r][23].toString().trim() !== '') {
        currentLienHe = rawDisplayValues[r][23].toString().trim();
      } else if (currentLienHe) {
        rawDisplayValues[r][23] = currentLienHe;
        rawValues[r][23] = currentLienHe;
      }
    }

    // Chuyển đổi dữ liệu 2D sang danh sách Đối tượng điểm đo chuẩn hóa
    const pointList = [];
    const now = new Date();

    for (let r = 0; r < numRows; r++) {
      const rowNum = startRow + r;
      const tbaName = String(rawDisplayValues[r][2] || '').trim();
      const diemDo = String(rawDisplayValues[r][3] || '').trim();
      const maDiemDo = String(rawDisplayValues[r][4] || '').trim();

      // Bỏ qua dòng trống hoàn toàn cả Tên TBA và Điểm đo
      if (!tbaName && !diemDo && !maDiemDo) continue;

      // Xử lý hạn kiểm định của từng thiết bị
      const hanCT = parseDateInfo(rawValues[r][8], rawDisplayValues[r][8], rawDisplayValues[r][9]);
      const hanTU = parseDateInfo(rawValues[r][12], rawDisplayValues[r][12], rawDisplayValues[r][13]);
      const hanTI = parseDateInfo(rawValues[r][16], rawDisplayValues[r][16], rawDisplayValues[r][17]);

      // Kiểm tra tình trạng hồ sơ pháp lý
      const hoSoCT = String(rawDisplayValues[r][18] || '').trim();
      const hoSoTU = String(rawDisplayValues[r][19] || '').trim();
      const hoSoTI = String(rawDisplayValues[r][20] || '').trim();
      const tinhTrangChung = String(rawDisplayValues[r][21] || '').trim();

      const isMissingLegalDocs = checkIsMissingLegalDocs(hoSoCT, hoSoTU, hoSoTI, tinhTrangChung);

      // =========================================================================
      // XỬ LÝ CỘT Y THEO THỜI GIAN THỰC TỪ NGÀY HÔM NAY:
      // - Những trạm trước ngày hôm nay (dateColY < today): xem như ĐÃ HOÀN THÀNH GỬI VB
      // - Đã đánh dấu gửi VB (Cột Z ghi 'ĐÃ HOÀN THÀNH' hoặc 'ĐÃ GỬI'): ĐÃ HOÀN THÀNH
      // - Những mục chưa gửi mà có hạn trong vòng ≤ 6 tháng tính từ hôm nay: CẦN GỬI VB NHẮC NHỞ
      // =========================================================================
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const rawValColY = rawValues[r][24];
      const displayValColY = String(rawDisplayValues[r][24] || '').trim();
      let hanColY = parseDateInfo(rawValColY, displayValColY, '');

      // Nếu ô Cột Y chưa có ngày, tự động lấy ngày hết hạn sớm nhất giữa Công tơ, TU và TI
      if (hanColY.monthsLeft === null) {
        const candidateDates = [hanCT, hanTU, hanTI].filter(d => d.monthsLeft !== null);
        if (candidateDates.length > 0) {
          candidateDates.sort((a, b) => a.monthsLeft - b.monthsLeft);
          hanColY = candidateDates[0];
        }
      }

      const existingCanhBao = String(rawDisplayValues[r][25] || '').trim();
      const isExplicitlyCompleted = existingCanhBao.toLowerCase().includes('hoàn thành') || 
                                    existingCanhBao.toLowerCase().includes('đã gửi') || 
                                    existingCanhBao.toLowerCase().includes('da gui') ||
                                    existingCanhBao.toLowerCase().includes('hoan thanh');

      let urgencyStatus = 'safe';
      let isNeedNotice = false;
      let isCompleted = false;
      let statusLabel = 'Chưa đến hạn làm VB (> 6T)';
      let monthsLeftColY = hanColY.monthsLeft;
      let daysLeftColY = null;

      if (hanColY.dateObj) {
        const diffMs = hanColY.dateObj.getTime() - today.getTime();
        daysLeftColY = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        monthsLeftColY = Math.round((daysLeftColY / 30.4375) * 10) / 10;

        // 1. Kiểm tra nếu hạn trước ngày hôm nay (trong quá khứ) -> Xem như đã hoàn thành gửi VB
        if (daysLeftColY < 0) {
          isCompleted = true;
          isNeedNotice = false;
          urgencyStatus = 'completed';
          statusLabel = 'ĐÃ HOÀN THÀNH GỬI VB (Hạn trước hôm nay)';
        }
        // 2. Kiểm tra nếu đã được đánh dấu/upload file hoàn thành gửi VB
        else if (isExplicitlyCompleted) {
          isCompleted = true;
          isNeedNotice = false;
          urgencyStatus = 'completed';
          statusLabel = 'ĐÃ HOÀN THÀNH GỬI VB';
        }
        // 3. Nếu chưa gửi và hạn đến gần trong vòng 6 tháng tính từ hôm nay
        else if (monthsLeftColY <= 6.0) {
          isCompleted = false;
          isNeedNotice = true;
          urgencyStatus = 'urgent';
          statusLabel = 'CẦN GỬI VB NHẮC NHỞ (Còn ' + monthsLeftColY + ' tháng)';
        }
        // 4. Từ 6 đến 13 tháng
        else if (monthsLeftColY <= 13.0) {
          isCompleted = false;
          isNeedNotice = false;
          urgencyStatus = 'warning';
          statusLabel = 'Cần lưu ý (6 - 13T)';
        }
        // 5. Trên 13 tháng
        else {
          isCompleted = false;
          isNeedNotice = false;
          urgencyStatus = 'safe';
          statusLabel = 'Chưa đến hạn làm VB (> 13T)';
        }
      } else if (isExplicitlyCompleted) {
        isCompleted = true;
        urgencyStatus = 'completed';
        statusLabel = 'ĐÃ HOÀN THÀNH GỬI VB';
      }

      // Trích xuất SĐT từ cột X (Thông tin đầu mối)
      const rawContact = String(rawDisplayValues[r][23] || '').trim();
      const extractedPhone = extractPhoneNumber(rawContact);

      pointList.push({
        rowIndex: rowNum,
        sttKh: rawDisplayValues[r][0],
        sttDiemDo: rawDisplayValues[r][1],
        tenTba: tbaName,
        tenDiemDo: diemDo,
        maDiemDo: maDiemDo,
        isBackup: String(rawDisplayValues[r][5] || '').toLowerCase().includes('x'),

        // Công tơ
        congTo: {
          serial: rawDisplayValues[r][6],
          ngayKd: rawDisplayValues[r][7],
          hanKd: rawDisplayValues[r][8],
          conLai: rawDisplayValues[r][9],
          monthsLeft: hanCT.monthsLeft,
          status: hanCT.status
        },

        // TU
        tu: {
          serial: rawDisplayValues[r][10],
          ngayKd: rawDisplayValues[r][11],
          hanKd: rawDisplayValues[r][12],
          conLai: rawDisplayValues[r][13],
          monthsLeft: hanTU.monthsLeft,
          status: hanTU.status
        },

        // TI
        ti: {
          serial: rawDisplayValues[r][14],
          ngayKd: rawDisplayValues[r][15],
          hanKd: rawDisplayValues[r][16],
          conLai: rawDisplayValues[r][17],
          monthsLeft: hanTI.monthsLeft,
          status: hanTI.status
        },

        // Hồ sơ pháp lý
        hoSo: {
          congTo: hoSoCT,
          tu: hoSoTU,
          ti: hoSoTI,
          chung: tinhTrangChung,
          isMissing: isMissingLegalDocs
        },

        ghiChu: rawDisplayValues[r][22],
        lienHe: rawContact,
        phoneContact: extractedPhone,

        // Cột Y và Z chuẩn hóa theo thời gian thực và trạng thái gửi
        ngayCanhBaoGanNhat: displayValColY || (hanColY.dateObj ? Utilities.formatDate(hanColY.dateObj, 'GMT+7', 'dd/MM/yyyy') : ''),
        monthsLeftColY: monthsLeftColY,
        daysLeftColY: daysLeftColY,
        isNeedNotice: isNeedNotice,
        isCompleted: isCompleted,
        statusLabel: statusLabel,
        canhBao: isCompleted 
          ? (existingCanhBao || 'ĐÃ HOÀN THÀNH GỬI VB') 
          : (isNeedNotice ? (existingCanhBao || 'CẦN GỬI VB NHẮC NHỞ') : existingCanhBao),

        // Mức độ ưu tiên
        urgencyStatus: urgencyStatus,
        minMonthsLeft: monthsLeftColY
      });
    }

    const summary = calculateSummary(pointList);

    return {
      success: true,
      data: pointList,
      summary: summary,
      config: config
    };
  } catch (err) {
    return {
      success: false,
      message: 'Lỗi tải dữ liệu: ' + err.toString(),
      data: [],
      summary: calculateSummary([])
    };
  }
}

/**
 * Tính số tháng còn lại và trạng thái từ ngày hết hạn
 */
function parseDateInfo(rawVal, displayVal, conLaiText) {
  let dateObj = null;
  if (rawVal instanceof Date && !isNaN(rawVal.getTime())) {
    dateObj = rawVal;
  } else if (displayVal) {
    const parts = displayVal.toString().trim().split(/[\/\-\.]/);
    if (parts.length === 3) {
      // Giả định định dạng dd/mm/yyyy hoặc mm/dd/yyyy
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      if (year > 1900 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
        dateObj = new Date(year, month, day);
      }
    }
  }

  if (!dateObj) {
    // Thử trích xuất từ cột thời gian còn lại nếu là chuỗi số tháng
    if (conLaiText) {
      const match = conLaiText.match(/(-?\d+(\.\d+)?)/);
      if (match) {
        const num = parseFloat(match[1]);
        return {
          monthsLeft: Math.round(num * 10) / 10,
          status: num < 0 ? 'expired' : num <= 6 ? 'urgent' : num <= 13 ? 'warning' : 'safe'
        };
      }
    }
    return { monthsLeft: null, status: 'unknown' };
  }

  const now = new Date();
  const diffTime = dateObj.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const monthsLeft = Math.round((diffDays / 30.4375) * 10) / 10;

  let status = 'safe';
  if (monthsLeft < 0) {
    status = 'expired';
  } else if (monthsLeft <= 6) {
    status = 'urgent';
  } else if (monthsLeft <= 13) {
    status = 'warning';
  }

  return { monthsLeft: monthsLeft, status: status, dateObj: dateObj };
}

/**
 * Kiểm tra xem điểm đo có bị thiếu hồ sơ pháp lý không
 */
function checkIsMissingLegalDocs(hoSoCT, hoSoTU, hoSoTI, tinhTrangChung) {
  const combined = (hoSoCT + ' ' + hoSoTU + ' ' + hoSoTI + ' ' + tinhTrangChung).toLowerCase();
  if (combined.includes('chưa có') || combined.includes('thiếu') || combined.includes('chua co')) {
    return true;
  }
  // Nếu cả 4 ô đều rỗng cũng xem như chưa cập nhật hồ sơ
  if (!hoSoCT && !hoSoTU && !hoSoTI && !tinhTrangChung) {
    return true;
  }
  return false;
}

/**
 * Trích xuất số điện thoại Việt Nam từ chuỗi liên hệ
 */
function extractPhoneNumber(text) {
  if (!text) return '';
  const match = text.match(/(0\d{9,10}|\+84\d{9,10})/);
  if (match) {
    let phone = match[0].replace('+84', '0').replace(/[\s\.-]/g, '');
    return phone;
  }
  return '';
}

/**
 * Tính toán số liệu thống kê tổng hợp (Summary Cards)
 */
function calculateSummary(points) {
  const tbaSet = new Set();
  let totalDiemDo = points.length;
  let expiredCount = 0;
  let urgentCount = 0;       // Đến hạn trong vòng ≤ 6 tháng tính từ hôm nay và CHƯA gửi VB
  let warningCount = 0;      // 6 - 13 tháng
  let safeCount = 0;         // > 13 tháng
  let completedCount = 0;    // Đã hoàn thành gửi VB (trước hôm nay hoặc đã đánh dấu gửi)
  let missingLegalCount = 0;
  let needNoticeCount = 0;   // Bằng urgentCount

  points.forEach(p => {
    if (p.tenTba && p.tenTba.trim()) {
      tbaSet.add(p.tenTba.trim().toUpperCase());
    }

    if (p.isCompleted || p.urgencyStatus === 'completed') {
      completedCount++;
    } else if (p.isNeedNotice || p.urgencyStatus === 'urgent') {
      urgentCount++;
      needNoticeCount++;
    } else if (p.urgencyStatus === 'warning') {
      warningCount++;
    } else {
      safeCount++;
    }

    if (p.hoSo && p.hoSo.isMissing) {
      missingLegalCount++;
    }
  });

  return {
    totalTba: tbaSet.size || 8,
    totalDiemDo: totalDiemDo || 16,
    urgentCount: urgentCount,
    needNoticeCount: needNoticeCount,
    completedCount: completedCount,
    warningCount: warningCount,
    safeCount: safeCount,
    missingLegalCount: missingLegalCount
  };
}

/**
 * ==============================================================================================
 * GOOGLE DRIVE: UPLOAD VÀ TỔ CHỨC THƯ MỤC LƯU TRỮ HỒ SƠ PHÁP LÝ & VĂN BẢN
 * Cấu trúc: [Thư mục gốc] / [Tên TBA] / [Mã Điểm Đo]
 * ==============================================================================================
 */

/**
 * Tìm hoặc tạo thư mục con theo tên trong thư mục cha
 */
function getOrCreateSubFolder(parentFolder, folderName) {
  const cleanName = folderName.replace(/[\/\\:*?"<>|]/g, '_').trim();
  const folders = parentFolder.getFoldersByName(cleanName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parentFolder.createFolder(cleanName);
}

/**
 * Upload danh sách file lên Google Drive và ghi link ngược lại vào Google Sheet
 */
function uploadDocumentsToDrive(uploadPayload) {
  try {
    const config = getConfig();
    const rootFolder = DriveApp.getFolderById(config.driveFolderId);
    if (!rootFolder) {
      return { success: false, message: 'Không tìm thấy thư mục Google Drive gốc!' };
    }

    // 1. Tạo thư mục cấp 1: [Tên TBA]
    const tbaFolderName = uploadPayload.tbaName || 'TBA_CHUA_DAT_TEN';
    const tbaFolder = getOrCreateSubFolder(rootFolder, tbaFolderName);

    // 2. Tạo thư mục cấp 2: [Mã Điểm Đo] hoặc [Tên Điểm Đo]
    const pointFolderName = uploadPayload.maDiemDo || uploadPayload.tenDiemDo || 'DIEM_DO_CHINH';
    const pointFolder = getOrCreateSubFolder(tbaFolder, pointFolderName);

    // 3. Lưu file vào pointFolder
    const uploadedResults = [];
    const files = uploadPayload.files || [];

    for (let i = 0; i < files.length; i++) {
      const fileData = files[i];
      const decodedBytes = Utilities.base64Decode(fileData.base64Content);
      const blob = Utilities.newBlob(decodedBytes, fileData.mimeType, fileData.fileName);
      const driveFile = pointFolder.createFile(blob);
      
      // Đặt quyền xem cho ai có link
      driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      uploadedResults.push({
        id: driveFile.getId(),
        name: driveFile.getName(),
        url: driveFile.getUrl(),
        viewUrl: driveFile.getDownloadUrl()
      });
    }

    // 4. Cập nhật vào Google Sheet vào đúng ô của dòng tương ứng
    if (uploadPayload.rowIndex && uploadedResults.length > 0) {
      const ss = SpreadsheetApp.openById(config.spreadsheetId);
      let sheet = ss.getSheetByName(config.sheetName) || ss.getSheets()[0];
      const r = uploadPayload.rowIndex;
      const todayStr = Utilities.formatDate(new Date(), 'GMT+7', 'dd/MM/yyyy');
      const firstFile = uploadedResults[0];
      const fileCountStr = uploadedResults.length > 1 ? ` (+${uploadedResults.length - 1} files)` : '';

      // Trường hợp 1: Upload Văn bản đã gửi (Cột Z - Cột 26) -> Chuyển trạng thái HOÀN THÀNH
      if (uploadPayload.docType === 'van_ban') {
        const cellFormula = `=HYPERLINK("${firstFile.url}", "ĐÃ HOÀN THÀNH GỬI VB (${todayStr}): ${firstFile.name}${fileCountStr}")`;
        sheet.getRange(r, 26).setFormula(cellFormula);
      } else {
        // Xác định cột tương ứng: S (19) = Công tơ, T (20) = TU, U (21) = TI, V (22) = Chung
        let targetCol = 22; // Mặc định cột V
        if (uploadPayload.docType === 'cong_to') targetCol = 19;
        else if (uploadPayload.docType === 'tu') targetCol = 20;
        else if (uploadPayload.docType === 'ti') targetCol = 21;
        else if (uploadPayload.docType === 'chung') targetCol = 22;

        const cellFormula = `=HYPERLINK("${firstFile.url}", "Đã có HS: ${firstFile.name}${fileCountStr}")`;
        sheet.getRange(r, targetCol).setFormula(cellFormula);

        // Nếu người dùng tích chọn "Đánh dấu đã hoàn thành gửi văn bản kèm theo"
        if (uploadPayload.markCompleted) {
          const sentFormula = `=HYPERLINK("${firstFile.url}", "ĐÃ HOÀN THÀNH GỬI VB (${todayStr})")`;
          sheet.getRange(r, 26).setFormula(sentFormula);
        }
      }
    }

    return {
      success: true,
      message: `Đã upload thành công ${uploadedResults.length} file vào Google Drive và cập nhật trạng thái Sheet!`,
      folderUrl: pointFolder.getUrl(),
      files: uploadedResults
    };
  } catch (err) {
    return { success: false, message: 'Lỗi khi upload file: ' + err.toString() };
  }
}

/**
 * Đánh dấu 1-Click: Đã hoàn thành gửi văn bản nhắc nhở cho Điểm đo
 */
function markNoticeAsCompleted(rowIndex, note) {
  try {
    const config = getConfig();
    const ss = SpreadsheetApp.openById(config.spreadsheetId);
    let sheet = ss.getSheetByName(config.sheetName) || ss.getSheets()[0];

    const r = parseInt(rowIndex, 10);
    if (!r || r < DEFAULT_CONFIG.DATA_START_ROW) {
      return { success: false, message: 'Chỉ số dòng không hợp lệ!' };
    }

    const todayStr = Utilities.formatDate(new Date(), 'GMT+7', 'dd/MM/yyyy');
    const statusText = `ĐÃ HOÀN THÀNH GỬI VB (${todayStr})${note ? ' - ' + note : ''}`;
    
    // Ghi vào Cột Z (Cột 26)
    sheet.getRange(r, 26).setValue(statusText);

    return { 
      success: true, 
      message: `Đã chuyển điểm đo sang trạng thái: ĐÃ HOÀN THÀNH GỬI VB (ngày ${todayStr})!` 
    };
  } catch (err) {
    return { success: false, message: 'Lỗi cập nhật trạng thái: ' + err.toString() };
  }
}

/**
 * Trả lại trạng thái: Chuyển từ "Đã hoàn thành" về lại "Chưa hoàn thành"
 * Xóa/Cập nhật lại trạng thái Cột Z (Cột 26) trên Google Sheet
 */
function revertCompletedStatus(rowIndex) {
  try {
    const config = getConfig();
    const ss = SpreadsheetApp.openById(config.spreadsheetId);
    let sheet = ss.getSheetByName(config.sheetName) || ss.getSheets()[0];

    const r = parseInt(rowIndex, 10);
    if (!r || r < DEFAULT_CONFIG.DATA_START_ROW) {
      return { success: false, message: 'Chỉ số dòng không hợp lệ!' };
    }

    // Đọc Cột Y (Cột 25) để xác định xem có phải cần cảnh báo không
    const colYCell = sheet.getRange(r, 25);
    const dateInfo = parseDateInfo(colYCell.getValue(), colYCell.getDisplayValue(), '');
    
    let newStatus = '';
    if (dateInfo && dateInfo.monthsLeft !== null && dateInfo.monthsLeft <= 6.0) {
      newStatus = 'CẦN GỬI VB NHẮC NHỞ';
    }

    // Ghi vào Cột Z (Cột 26)
    sheet.getRange(r, 26).setValue(newStatus);

    return { 
      success: true, 
      message: `Đã hoàn tác! Điểm đo đã được trả về trạng thái: ${newStatus || 'Chưa hoàn thành (Chưa gửi văn bản)'}.`,
      newStatus: newStatus
    };
  } catch (err) {
    return { success: false, message: 'Lỗi hoàn tác trạng thái: ' + err.toString() };
  }
}

/**
 * ==============================================================================================
 * CẬP NHẬT THÔNG TIN KIỂM ĐỊNH & LIÊN HỆ NGAY TRÊN WEB APP
 * ==============================================================================================
 */
function updatePointData(payload) {
  try {
    const config = getConfig();
    const ss = SpreadsheetApp.openById(config.spreadsheetId);
    let sheet = ss.getSheetByName(config.sheetName) || ss.getSheets()[0];

    const r = payload.rowIndex;
    if (!r || r < DEFAULT_CONFIG.DATA_START_ROW) {
      return { success: false, message: 'Chỉ số dòng không hợp lệ!' };
    }

    // Cập nhật Công tơ (G: Số CT, H: Ngày KD, I: Hạn KD)
    if (payload.congTo) {
      if (payload.congTo.serial !== undefined) sheet.getRange(r, 7).setValue(payload.congTo.serial);
      if (payload.congTo.ngayKd !== undefined) sheet.getRange(r, 8).setValue(payload.congTo.ngayKd);
      if (payload.congTo.hanKd !== undefined) sheet.getRange(r, 9).setValue(payload.congTo.hanKd);
    }

    // Cập nhật TU (K: Số TU, L: Ngày KD, M: Hạn KD)
    if (payload.tu) {
      if (payload.tu.serial !== undefined) sheet.getRange(r, 11).setValue(payload.tu.serial);
      if (payload.tu.ngayKd !== undefined) sheet.getRange(r, 12).setValue(payload.tu.ngayKd);
      if (payload.tu.hanKd !== undefined) sheet.getRange(r, 13).setValue(payload.tu.hanKd);
    }

    // Cập nhật TI (O: Số TI, P: Ngày KD, Q: Hạn KD)
    if (payload.ti) {
      if (payload.ti.serial !== undefined) sheet.getRange(r, 15).setValue(payload.ti.serial);
      if (payload.ti.ngayKd !== undefined) sheet.getRange(r, 16).setValue(payload.ti.ngayKd);
      if (payload.ti.hanKd !== undefined) sheet.getRange(r, 17).setValue(payload.ti.hanKd);
    }

    // Cập nhật Hồ sơ chung (Cột V)
    if (payload.tinhTrangChung !== undefined) {
      sheet.getRange(r, 22).setValue(payload.tinhTrangChung);
    }

    // Ghi chú (Cột W)
    if (payload.ghiChu !== undefined) {
      sheet.getRange(r, 23).setValue(payload.ghiChu);
    }

    // Thông tin liên hệ (Cột X)
    if (payload.lienHe !== undefined) {
      sheet.getRange(r, 24).setValue(payload.lienHe);
    }

    // Cảnh báo (Cột Z)
    if (payload.canhBao !== undefined) {
      sheet.getRange(r, 26).setValue(payload.canhBao);
    }

    return { success: true, message: 'Đã cập nhật dữ liệu vào Google Sheet thành công!' };
  } catch (err) {
    return { success: false, message: 'Lỗi cập nhật: ' + err.toString() };
  }
}

/**
 * ==============================================================================================
 * ZALO NOTIFICATION: GỬI QUA WEBHOOK API / ZNS HOẶC SOẠN SẴN NỘI DUNG 1-CLICK
 * ==============================================================================================
 */

/**
 * Tạo nội dung mẫu tin nhắn cảnh báo kiểm định chuẩn hóa ngành điện
 * Nhắc nhở người quản lý làm văn bản gửi các đơn vị (ngưỡng 6 tháng theo Cột Y)
 */
function buildZaloMessageContent(point) {
  let msg = `🔔 [NHẮC VIỆC: LÀM VĂN BẢN NHẮC NHỞ KIỂM ĐỊNH THIẾT BỊ 110kV]\n`;
  msg += `🏢 Đơn vị/Trạm: ${point.tenTba}\n`;
  msg += `📍 Điểm đo: ${point.tenDiemDo} (Mã: ${point.maDiemDo || 'Chính'})\n`;
  msg += `------------------------------------\n`;
  msg += `⚠️ HẠN CẢNH BÁO GẦN NHẤT (CỘT Y): ${point.ngayCanhBaoGanNhat || '---'}\n`;
  if (point.monthsLeftColY !== null) {
    if (point.monthsLeftColY < 0) {
      msg += `🚨 TÌNH TRẠNG: ĐÃ QUÁ HẠN KIỂM ĐỊNH (${Math.abs(point.monthsLeftColY)} tháng) - CẦN LÀM VB KHẨN!\n`;
    } else if (point.monthsLeftColY <= 6.0) {
      msg += `🚨 TÌNH TRẠNG: CHỈ CÒN ${point.monthsLeftColY} THÁNG (≤ 6 tháng) - ĐẾN HẠN PHẢI GỬI VB NHẮC NHỞ!\n`;
    } else {
      msg += `ℹ️ Thời gian còn lại: ${point.monthsLeftColY} tháng\n`;
    }
  }
  msg += `------------------------------------\n`;
  msg += `⚡ CHI TIẾT THIẾT BỊ ĐO ĐẾM:\n`;
  msg += `• Công tơ: SN ${point.congTo.serial || '---'} | Hạn KĐ: ${point.congTo.hanKd || '---'} (${point.congTo.conLai || ''})\n`;
  msg += `• TU: SN ${point.tu.serial || '---'} | Hạn KĐ: ${point.tu.hanKd || '---'} (${point.tu.conLai || ''})\n`;
  msg += `• TI: SN ${point.ti.serial || '---'} | Hạn KĐ: ${point.ti.hanKd || '---'} (${point.ti.conLai || ''})\n`;
  
  if (point.hoSo.isMissing) {
    msg += `📄 Hồ sơ pháp lý: CHƯA ĐẦY ĐỦ (${point.hoSo.chung || 'Thiếu CO, CQ, QĐ phê duyệt mẫu'})\n`;
  } else {
    msg += `📄 Hồ sơ pháp lý: Đã có đầy đủ\n`;
  }

  if (point.lienHe) {
    msg += `👤 Đầu mối liên hệ khách hàng: ${point.lienHe}\n`;
  }

  msg += `\n👉 Đề nghị đồng chí chuyên viên quản lý khẩn trương soạn thảo Văn bản/Công văn đôn đốc gửi cho đơn vị khách hàng theo đúng quy định TT 42/2015/TT-BCT và TT 39/2022/TT-BCT!`;

  return msg;
}

/**
 * Gửi tin nhắn qua Webhook Zalo đã cấu hình
 */
function sendZaloWebhook(phoneNumber, messageContent) {
  const config = getConfig();
  if (!config.zaloWebhookUrl) {
    return { success: false, message: 'Chưa cấu hình URL Webhook Zalo trong phần Cài đặt!' };
  }

  try {
    const payload = {
      phone: phoneNumber || config.zaloManagerPhone,
      message: messageContent,
      timestamp: new Date().toISOString()
    };

    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(config.zaloWebhookUrl, options);
    const respCode = response.getResponseCode();
    const respBody = response.getContentText();

    if (respCode >= 200 && respCode < 300) {
      return { success: true, message: 'Đã gửi cảnh báo qua Zalo thành công!' };
    } else {
      return { success: false, message: `Webhook trả về mã lỗi: ${respCode} - ${respBody}` };
    }
  } catch (err) {
    return { success: false, message: 'Lỗi gửi Webhook: ' + err.toString() };
  }
}

/**
 * ==============================================================================================
 * TIME-DRIVEN TRIGGER: TỰ ĐỘNG CHẠY THỨ 2 HÀNG TUẦN LÚC 08:00
 * ==============================================================================================
 */

/**
 * Cài đặt Trigger tự động quét và gửi cảnh báo vào 8h00 sáng Thứ Hai hàng tuần
 */
function setupWeeklyTrigger() {
  removeWeeklyTrigger(); // Xóa trigger cũ nếu có để tránh trùng lặp
  ScriptApp.newTrigger('checkAndSendWeeklyZaloReminders')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(8)
    .create();
}

/**
 * Xóa Trigger tự động
 */
function removeWeeklyTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'checkAndSendWeeklyZaloReminders') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}

/**
 * Hàm chạy nền tự động thứ 2 hàng tuần quét danh sách và gửi tin báo cáo tổng hợp
 * Nhắc chuyên viên quản lý làm văn bản gửi các đơn vị có thiết bị hết hạn <= 6 tháng theo Cột Y
 */
function checkAndSendWeeklyZaloReminders() {
  const config = getConfig();
  const result = getDashboardData();
  if (!result.success || !result.data) return;

  const points = result.data;
  // Lọc các điểm đo cần làm VB nhắc nhở (thời hạn Cột Y <= 6 tháng hoặc đã quá hạn, hoặc thiếu hồ sơ)
  const alertPoints = points.filter(p => p.isNeedNotice || (p.monthsLeftColY !== null && p.monthsLeftColY <= 6.0));

  if (alertPoints.length === 0) return;

  let report = `🔔 [LỊCH BÁO ĐẦU TUẦN] CÁC TRẠM 110kV CẦN LÀM VĂN BẢN NHẮC NHỞ\n`;
  report += `📅 Thời gian quét: Thứ Hai, ${Utilities.formatDate(new Date(), 'GMT+7', 'dd/MM/yyyy HH:mm')}\n`;
  report += `Tổng số điểm đo đến hạn làm VB (≤ 6 tháng theo Cột Y): ${alertPoints.length} điểm đo\n`;
  report += `------------------------------------\n`;

  const maxItemsToShow = 8;
  const itemsToShow = alertPoints.slice(0, maxItemsToShow);

  itemsToShow.forEach((p, idx) => {
    report += `${idx + 1}. ${p.tenTba} - ${p.tenDiemDo}\n`;
    if (p.monthsLeftColY !== null) {
      if (p.monthsLeftColY < 0) {
        report += `   🚨 ĐÃ QUÁ HẠN KĐ! (Hạn Cột Y: ${p.ngayCanhBaoGanNhat})\n`;
      } else {
        report += `   ⚠️ Hạn Cột Y: ${p.ngayCanhBaoGanNhat} (Còn ${p.monthsLeftColY} tháng ≤ 6T)\n`;
      }
    }
    if (p.hoSo.isMissing) {
      report += `   📄 Thiếu hồ sơ pháp lý CO, CQ\n`;
    }
  });

  if (alertPoints.length > maxItemsToShow) {
    report += `\n... và còn ${alertPoints.length - maxItemsToShow} điểm đo khác.\n`;
  }

  report += `\n👉 Đồng chí chuyên viên vui lòng truy cập Web App để xuất danh sách và ban hành Văn bản nhắc nhở gửi các đơn vị!`;

  // Gửi cho số điện thoại người quản lý
  if (config.zaloManagerPhone) {
    if (config.zaloWebhookUrl) {
      sendZaloWebhook(config.zaloManagerPhone, report);
    }
  }
}
