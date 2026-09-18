import { apiClient } from '../services/apiClient';
import type { WorkItem, AzureIdentity } from '../types/azureDevOps';
import { stripHtmlToPlainText, formatExportDate, type ExportColumnOptions } from './exportToExcel';

export const TARGET_GOOGLE_SHEET_ID = '17ZajNMt4Ri4crPXJzhQMmrdJ3NpNxFEdxKttFI1KGRY';

/**
 * The Google Apps Script template code to paste into Google Sheet (Extensions > Apps Script).
 */
export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * Nefuza Task Board - Google Sheet Sync Webhook
 * Automatically creates or updates a month tab (e.g. September)
 * with formatted headers (#356854), Spent Hours column, 1-line row heights, and =SUM() formula.
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);

  try {
    var data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    var sheetName = (data.sheetName || 'September').toString().replace(/[:\\/?*[\\]]/g, '-').substring(0, 31);
    var headers = data.headers || [];
    var rows = data.rows || [];
    var spentHoursCol = data.spentHoursColIndex; // 1-based index
    var targetSpreadsheetId = data.spreadsheetId || '${TARGET_GOOGLE_SHEET_ID}';

    // 1. Open the target spreadsheet by ID
    var ss;
    if (targetSpreadsheetId) {
      try {
        ss = SpreadsheetApp.openById(targetSpreadsheetId);
      } catch (openErr) {
        // Fallback to active spreadsheet if bound
        ss = SpreadsheetApp.getActiveSpreadsheet();
      }
    } else {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    }

    if (!ss) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Could not open Google Spreadsheet. Please verify spreadsheet permissions.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Insert or reset sheet tab
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    } else {
      sheet.clear();
    }

    if (headers.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'No columns or headers provided.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. Write Header Row (#356854 forest green background, white bold text)
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setBackground('#356854');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    headerRange.setFontSize(10);
    headerRange.setVerticalAlignment('middle');
    sheet.setRowHeight(1, 32);

    for (var c = 1; c <= headers.length; c++) {
      var hText = headers[c - 1];
      var hCell = sheet.getRange(1, c);
      if (hText === 'Title' || hText === 'Description') {
        hCell.setHorizontalAlignment('left');
      } else if (hText === 'Spent Hours') {
        hCell.setHorizontalAlignment('right');
      } else {
        hCell.setHorizontalAlignment('center');
      }
    }

    // 4. Write Data Rows (Strictly 1 single line max height, clip wrap)
    if (rows.length > 0) {
      var dataRange = sheet.getRange(2, 1, rows.length, headers.length);
      dataRange.setValues(rows);
      dataRange.setVerticalAlignment('middle');
      dataRange.setFontSize(10);
      dataRange.setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);

      // Zebra striping & 1-line height (21pt)
      for (var r = 0; r < rows.length; r++) {
        var rowBg = (r % 2 === 0) ? '#FFFFFF' : '#F8FAFC';
        sheet.getRange(r + 2, 1, 1, headers.length).setBackground(rowBg);
        sheet.setRowHeight(r + 2, 21);
      }

      // Border around cells
      dataRange.setBorder(true, true, true, true, true, true, '#CBD5E1', SpreadsheetApp.BorderStyle.SOLID);

      // Column-specific alignments & styling (Task ID in blue, dates centered, Spent Hours in yellow)
      for (var colIdx = 1; colIdx <= headers.length; colIdx++) {
        var colName = headers[colIdx - 1];
        var colDataRange = sheet.getRange(2, colIdx, rows.length, 1);

        if (colName === 'Task ID') {
          colDataRange.setHorizontalAlignment('center');
          colDataRange.setFontColor('#0077B6');
          colDataRange.setFontWeight('bold');
        } else if (colName === 'Title' || colName === 'Description') {
          colDataRange.setHorizontalAlignment('left');
        } else if (colName === 'Spent Hours') {
          colDataRange.setHorizontalAlignment('right');
          colDataRange.setBackground('#FEFCE8');
          colDataRange.setNumberFormat('#,##0.00');
        } else if (colName.indexOf('Date') !== -1) {
          colDataRange.setHorizontalAlignment('center');
        } else {
          colDataRange.setHorizontalAlignment('center');
        }
      }
    }

    // 5. Add Total Row at the bottom with Auto-Sum (#356854 background, white text)
    var lastDataRow = rows.length + 1;
    var totalRowIndex = lastDataRow + 1;
    var totalValues = [];
    for (var c = 0; c < headers.length; c++) {
      totalValues.push(c === 0 ? 'Total' : '');
    }

    var totalRange = sheet.getRange(totalRowIndex, 1, 1, headers.length);
    totalRange.setValues([totalValues]);
    totalRange.setBackground('#356854');
    totalRange.setFontWeight('bold');
    totalRange.setFontColor('#FFFFFF');
    totalRange.setFontSize(10);
    totalRange.setVerticalAlignment('middle');
    totalRange.setBorder(true, true, true, true, true, true, '#254C3D', SpreadsheetApp.BorderStyle.SOLID);
    sheet.setRowHeight(totalRowIndex, 28);

    // Set Auto-Sum Formula for Spent Hours (also #356854 background, white text)
    if (spentHoursCol && spentHoursCol > 0 && spentHoursCol <= headers.length) {
      var colLetter = String.fromCharCode(64 + spentHoursCol);
      var sumCell = sheet.getRange(totalRowIndex, spentHoursCol);
      if (rows.length > 0) {
        var sumFormula = '=SUM(' + colLetter + '2:' + colLetter + lastDataRow + ')';
        sumCell.setFormula(sumFormula);
      } else {
        sumCell.setValue(0);
      }
      sumCell.setBackground('#356854');
      sumCell.setFontColor('#FFFFFF');
      sumCell.setFontWeight('bold');
      sumCell.setHorizontalAlignment('right');
      sumCell.setNumberFormat('#,##0.00');
    }

    // 6. Freeze top header row
    sheet.setFrozenRows(1);

    // 7. Auto-fit columns with sensible minimum padding
    for (var col = 1; col <= headers.length; col++) {
      sheet.autoResizeColumn(col);
      var currentWidth = sheet.getColumnWidth(col);
      var colHeader = headers[col - 1];
      if (colHeader === 'Task ID' && currentWidth < 95) sheet.setColumnWidth(col, 100);
      else if (colHeader === 'Title' && currentWidth < 260) sheet.setColumnWidth(col, 280);
      else if (colHeader === 'Description' && currentWidth < 300) sheet.setColumnWidth(col, 320);
      else if (colHeader === 'Spent Hours' && currentWidth < 120) sheet.setColumnWidth(col, 130);
      else if (colHeader.indexOf('Date') !== -1 && currentWidth < 160) sheet.setColumnWidth(col, 175);
      else if (currentWidth < 110) sheet.setColumnWidth(col, 120);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Tab "' + sheetName + '" successfully added to Google Sheet!',
      sheetName: sheetName,
      tasksCount: rows.length
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Apps Script Error: ' + err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
`;

interface SyncGoogleSheetParams {
  webhookUrl: string;
  sheetName: string;
  workItems: WorkItem[];
  columns: ExportColumnOptions;
}

export interface SyncGoogleSheetResult {
  success: boolean;
  message: string;
  tasksCount?: number;
}

/**
 * Prepares and sends task data to the Google Apps Script Webhook.
 */
export const syncTasksToGoogleSheet = async ({
  webhookUrl,
  sheetName,
  workItems,
  columns,
}: SyncGoogleSheetParams): Promise<SyncGoogleSheetResult> => {
  const cleanWebhook = webhookUrl.trim();
  if (!cleanWebhook) {
    throw new Error('Please provide your Google Apps Script Webhook URL.');
  }

  // 1. Build Header row & identify Spent Hours column index (1-based)
  const headers: string[] = [];
  let spentHoursColIndex = 0;

  if (columns.id) headers.push('Task ID');
  if (columns.title) headers.push('Title');
  if (columns.description) headers.push('Description');

  // Spent Hours is compulsory
  headers.push('Spent Hours');
  spentHoursColIndex = headers.length;

  if (columns.updatedDate) headers.push('Updated Date');
  if (columns.createdDate) headers.push('Created Date');
  if (columns.state) headers.push('State');
  if (columns.type) headers.push('Type');
  if (columns.assignedTo) headers.push('Assigned To');
  if (columns.priority) headers.push('Priority');
  if (columns.sprint) headers.push('Sprint / Iteration');
  if (columns.tags) headers.push('Tags');

  // 2. Build Rows
  const rows: Array<Array<string | number>> = workItems.map((item) => {
    const fields = item.fields;
    const row: Array<string | number> = [];

    let assignedName = 'Unassigned';
    const assignedObj = fields['System.AssignedTo'];
    if (typeof assignedObj === 'string') assignedName = assignedObj;
    else if (typeof assignedObj === 'object' && assignedObj !== null) {
      assignedName = (assignedObj as AzureIdentity).displayName || 'Unassigned';
    }

    const priorityVal = fields['System.Priority'] || fields['Microsoft.VSTS.Common.Priority'];
    const priority = priorityVal !== undefined && priorityVal !== null ? `P${priorityVal}` : '-';

    const descRaw =
      fields['System.Description'] ||
      fields['Microsoft.VSTS.Common.AcceptanceCriteria'] ||
      fields['Microsoft.VSTS.TCM.ReproSteps'] ||
      '';
    const cleanDescription = stripHtmlToPlainText(descRaw);
    const sprint = fields['System.IterationPath']?.split('\\').pop() || fields['System.IterationPath'] || '';

    if (columns.id) row.push(item.id || fields['System.Id']);
    if (columns.title) row.push(fields['System.Title'] || '');
    if (columns.description) row.push(cleanDescription);

    // Empty Spent Hours for manual entry
    row.push('');

    if (columns.updatedDate) row.push(formatExportDate(fields['System.ChangedDate']));
    if (columns.createdDate) row.push(formatExportDate(fields['System.CreatedDate']));
    if (columns.state) row.push(fields['System.State'] || '');
    if (columns.type) row.push(fields['System.WorkItemType'] || '');
    if (columns.assignedTo) row.push(assignedName);
    if (columns.priority) row.push(priority);
    if (columns.sprint) row.push(sprint);
    if (columns.tags) row.push(fields['System.Tags'] || '');

    return row;
  });

  const payload = {
    spreadsheetId: TARGET_GOOGLE_SHEET_ID,
    sheetName: sheetName.trim() || 'Timesheet',
    headers,
    rows,
    spentHoursColIndex,
  };

  // Dispatch via Backend Proxy (ensures full CORS bypass and automatic Google 302 redirect following)
  try {
    const response = await apiClient.post<SyncGoogleSheetResult>('/sync-google-sheet', {
      webhookUrl: cleanWebhook,
      payload,
    });

    if (response.data) {
      if (response.data.success === false) {
        throw new Error(response.data.message || 'Google Sheet sync returned an error.');
      }
      return response.data;
    }
    throw new Error('No response received from Google Sheet proxy.');
  } catch (error: unknown) {
    const errObj = error as {
      response?: { data?: { message?: string } };
      message?: string;
    };
    const errMsg = errObj.response?.data?.message || errObj.message;
    throw new Error(errMsg || 'Failed to sync with Google Sheet Webhook.');
  }
};
