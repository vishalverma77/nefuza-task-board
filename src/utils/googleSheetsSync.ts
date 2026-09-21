import { apiClient } from '../services/apiClient';
import type { WorkItem, AzureIdentity } from '../types/azureDevOps';
import { stripHtmlToPlainText, formatExportDate, type ExportColumnOptions } from './exportToExcel';

export const NEFUZA_GOOGLE_SHEET_ID = '17ZajNMt4Ri4crPXJzhQMmrdJ3NpNxFEdxKttFI1KGRY';
export const NEFUZA_GOOGLE_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/17ZajNMt4Ri4crPXJzhQMmrdJ3NpNxFEdxKttFI1KGRY/edit?gid=1400103783#gid=1400103783';

export const UNCURL_GOOGLE_SHEET_ID = '1M5MrdIIpSVDYe77m9sbxbD1_QXiAw8qLgrpWcsCnjUo';
export const UNCURL_GOOGLE_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1M5MrdIIpSVDYe77m9sbxbD1_QXiAw8qLgrpWcsCnjUo/edit?gid=0#gid=0';

export const TARGET_GOOGLE_SHEET_ID = NEFUZA_GOOGLE_SHEET_ID;

export interface OrgSheetDetails {
  spreadsheetId: string;
  sheetUrl: string;
  orgLabel: string;
  storageKey: string;
}

export const getOrgGoogleSheetDetails = (org?: string): OrgSheetDetails => {
  if (org === 'uncurl:health') {
    return {
      spreadsheetId: UNCURL_GOOGLE_SHEET_ID,
      sheetUrl: UNCURL_GOOGLE_SHEET_URL,
      orgLabel: 'uncurl:health',
      storageKey: 'uncurl_google_sheet_webhook',
    };
  }
  return {
    spreadsheetId: NEFUZA_GOOGLE_SHEET_ID,
    sheetUrl: NEFUZA_GOOGLE_SHEET_URL,
    orgLabel: 'safbsdev (Nefuza)',
    storageKey: 'nefuza_google_sheet_webhook',
  };
};

/**
 * Generates the Google Apps Script template code with the organization's specific target spreadsheet ID.
 * Optimized with batch array operations for sub-second execution!
 */
export const getGoogleAppsScriptCode = (spreadsheetId: string, orgName: string = 'SG Task Board'): string => `/**
 * ${orgName} - Fast Google Sheet Sync Webhook
 * Optimized with batch array operations for sub-second execution!
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(20000);

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

    var sheetName = (data.sheetName || 'Sep-2026').toString().replace(/[:\\/?*[\\]]/g, '-').substring(0, 31);
    var headers = data.headers || [];
    var rows = data.rows || [];
    var spentHoursCol = data.spentHoursColIndex; // 1-based index
    var targetSpreadsheetId = data.spreadsheetId || '${spreadsheetId}';

    // 1. Open active spreadsheet (instant if container-bound) or fallback to ID
    var ss;
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    } catch (e) {}

    if (!ss && targetSpreadsheetId) {
      try {
        ss = SpreadsheetApp.openById(targetSpreadsheetId);
      } catch (openErr) {
        // ignore
      }
    }

    if (!ss) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Could not open Google Spreadsheet. Please verify permissions.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Insert or clear target sheet tab
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

    // 3. Fast Batch Header Formatting (#356854 forest green, white text)
    var numCols = headers.length;
    var headerRange = sheet.getRange(1, 1, 1, numCols);
    headerRange.setValues([headers]);
    headerRange.setBackground('#356854');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    headerRange.setFontSize(10);
    headerRange.setVerticalAlignment('middle');
    sheet.setRowHeight(1, 32);

    var headerAlignments = [];
    for (var c = 0; c < numCols; c++) {
      var hText = headers[c];
      if (hText === 'Title' || hText === 'Description') {
        headerAlignments.push('left');
      } else if (hText === 'Spent Hours') {
        headerAlignments.push('right');
      } else {
        headerAlignments.push('center');
      }
    }
    headerRange.setHorizontalAlignments([headerAlignments]);

    // 4. Ultra-Fast Batch Data Row Operations (Zero single-cell loops!)
    var numRows = rows.length;
    if (numRows > 0) {
      var dataRange = sheet.getRange(2, 1, numRows, numCols);
      dataRange.setValues(rows);
      dataRange.setVerticalAlignment('middle');
      dataRange.setFontSize(10);
      dataRange.setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
      dataRange.setBorder(true, true, true, true, true, true, '#CBD5E1', SpreadsheetApp.BorderStyle.SOLID);

      // Single call to set row heights for all rows
      sheet.setRowHeights(2, numRows, 21);

      // Build 2D batch style arrays
      var backgrounds = [];
      var fontColors = [];
      var fontWeights = [];
      var alignments = [];
      var formats = [];

      for (var r = 0; r < numRows; r++) {
        var rowBg = (r % 2 === 0) ? '#FFFFFF' : '#F8FAFC';
        var rowBgList = [];
        var rowColorsList = [];
        var rowWeightsList = [];
        var rowAlignList = [];
        var rowFmtList = [];

        for (var c = 0; c < numCols; c++) {
          var colName = headers[c];
          if (colName === 'Task ID') {
            rowBgList.push(rowBg);
            rowColorsList.push('#0077B6');
            rowWeightsList.push('bold');
            rowAlignList.push('center');
            rowFmtList.push('@');
          } else if (colName === 'Spent Hours') {
            rowBgList.push('#FEFCE8');
            rowColorsList.push('#000000');
            rowWeightsList.push('normal');
            rowAlignList.push('right');
            rowFmtList.push('#,##0.00');
          } else if (colName === 'Title' || colName === 'Description') {
            rowBgList.push(rowBg);
            rowColorsList.push('#000000');
            rowWeightsList.push('normal');
            rowAlignList.push('left');
            rowFmtList.push('@');
          } else {
            rowBgList.push(rowBg);
            rowColorsList.push('#000000');
            rowWeightsList.push('normal');
            rowAlignList.push('center');
            rowFmtList.push('@');
          }
        }

        backgrounds.push(rowBgList);
        fontColors.push(rowColorsList);
        fontWeights.push(rowWeightsList);
        alignments.push(rowAlignList);
        formats.push(rowFmtList);
      }

      // Single batch execution calls (takes ~0.1s total!)
      dataRange.setBackgrounds(backgrounds);
      dataRange.setFontColors(fontColors);
      dataRange.setFontWeights(fontWeights);
      dataRange.setHorizontalAlignments(alignments);
      dataRange.setNumberFormats(formats);
    }

    // 5. Total Row at the bottom (#356854 forest green, white text, auto-sum formula)
    var lastDataRow = numRows + 1;
    var totalRowIndex = lastDataRow + 1;
    var totalValues = [];
    for (var c = 0; c < numCols; c++) {
      totalValues.push(c === 0 ? 'Total' : '');
    }

    var totalRange = sheet.getRange(totalRowIndex, 1, 1, numCols);
    totalRange.setValues([totalValues]);
    totalRange.setBackground('#356854');
    totalRange.setFontWeight('bold');
    totalRange.setFontColor('#FFFFFF');
    totalRange.setFontSize(10);
    totalRange.setVerticalAlignment('middle');
    totalRange.setBorder(true, true, true, true, true, true, '#254C3D', SpreadsheetApp.BorderStyle.SOLID);
    sheet.setRowHeight(totalRowIndex, 28);

    if (spentHoursCol && spentHoursCol > 0 && spentHoursCol <= numCols) {
      var colLetter = String.fromCharCode(64 + spentHoursCol);
      var sumCell = sheet.getRange(totalRowIndex, spentHoursCol);
      if (numRows > 0) {
        sumCell.setFormula('=SUM(' + colLetter + '2:' + colLetter + lastDataRow + ')');
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

    // 7. Set clean column widths without slow autoResizeColumn
    var colWidths = {
      'Task ID': 100,
      'Title': 280,
      'Description': 320,
      'Spent Hours': 130,
      'Updated Date': 175,
      'Created Date': 175,
      'State': 120,
      'Type': 120,
      'Assigned To': 160,
      'Priority': 100,
      'Sprint / Iteration': 150,
      'Tags': 160
    };
    for (var col = 1; col <= numCols; col++) {
      var w = colWidths[headers[col - 1]] || 130;
      sheet.setColumnWidth(col, w);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Tab "' + sheetName + '" successfully added to Google Sheet!',
      sheetName: sheetName,
      tasksCount: numRows
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

export const GOOGLE_APPS_SCRIPT_CODE = getGoogleAppsScriptCode(NEFUZA_GOOGLE_SHEET_ID, 'Nefuza Task Board');

interface SyncGoogleSheetParams {
  webhookUrl: string;
  sheetName: string;
  workItems: WorkItem[];
  columns: ExportColumnOptions;
  spreadsheetId?: string;
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
  spreadsheetId,
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

    let descRaw =
      fields['System.Description'] ||
      fields['Microsoft.VSTS.Common.AcceptanceCriteria'] ||
      fields['Microsoft.VSTS.TCM.ReproSteps'] ||
      '';

    if (!descRaw && fields['Custom.RawCard']) {
      const raw = fields['Custom.RawCard'] as Record<string, unknown>;
      descRaw = (raw.description || raw.desc || raw.details || raw.content || raw.notes || raw.summary || '') as string;
    }

    const cleanDescription = stripHtmlToPlainText(descRaw);
    const sprint = fields['System.IterationPath']?.split('\\').pop() || fields['System.IterationPath'] || '';

    if (columns.id) row.push(item.id || fields['System.Id']);
    if (columns.title) row.push(fields['System.Title'] || '');
    if (columns.description) row.push(cleanDescription);

    // Spent Hours (use recorded/synced hours if present, otherwise empty for manual entry)
    const spentHoursVal = fields['Custom.SpentHours'] ?? fields['Microsoft.VSTS.Scheduling.CompletedWork'];
    row.push(spentHoursVal !== undefined && spentHoursVal !== null && spentHoursVal !== '' ? Number(spentHoursVal) : '');

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
    spreadsheetId: spreadsheetId || TARGET_GOOGLE_SHEET_ID,
    sheetName: sheetName.trim() || 'Timesheet',
    headers,
    rows,
    spentHoursColIndex,
  };

  // Dispatch via Backend Proxy (ensures full CORS bypass and automatic Google 302 redirect following)
  try {
    const response = await apiClient.post<SyncGoogleSheetResult>(
      '/sync-google-sheet',
      {
        webhookUrl: cleanWebhook,
        payload,
      },
      {
        timeout: 90000,
      }
    );

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
