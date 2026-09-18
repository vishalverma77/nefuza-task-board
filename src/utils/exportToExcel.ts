import ExcelJS from 'exceljs';
import type { WorkItem, AzureIdentity } from '../types/azureDevOps';

/**
 * Strips HTML tags and decodes common HTML entities into clean plain text.
 */
export const stripHtmlToPlainText = (html?: string): string => {
  if (!html) return '';

  let text = html;

  // Replace block endings with newlines
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<\/h[1-6]>/gi, '\n');
  text = text.replace(/<\/tr>/gi, '\n');
  text = text.replace(/<li[^>]*>/gi, '• ');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<blockquote[^>]*>/gi, '> ');
  text = text.replace(/<\/blockquote>/gi, '\n');

  // Strip all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));

  // Normalize duplicate newlines & spaces
  text = text
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
};

/**
 * Format ISO date string into readable YYYY-MM-DD HH:mm:ss format
 */
export const formatExportDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

export interface ExportColumnOptions {
  id: boolean;
  title: boolean;
  description: boolean;
  spentHours: boolean; // Compulsory field requested by user
  updatedDate: boolean;
  createdDate: boolean;
  state: boolean;
  type: boolean;
  assignedTo: boolean;
  priority: boolean;
  sprint: boolean;
  tags: boolean;
}

export const DEFAULT_EXPORT_COLUMNS: ExportColumnOptions = {
  id: true,
  title: true,
  description: false,
  spentHours: true, // Always compulsory
  updatedDate: true,
  createdDate: true,
  state: false,
  type: false,
  assignedTo: false,
  priority: false,
  sprint: false,
  tags: false,
};
/**
 * Generates timesheet name based on date range (e.g. "September-nefuza-timesheet")
 */
export const getTimesheetNameFromDates = (startDate?: string, endDate?: string): string => {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  let monthPrefix = '';

  if (startDate) {
    const sDate = new Date(startDate);
    if (!isNaN(sDate.getTime())) {
      const sMonth = monthNames[sDate.getMonth()];
      if (endDate) {
        const eDate = new Date(endDate);
        if (!isNaN(eDate.getTime())) {
          const eMonth = monthNames[eDate.getMonth()];
          monthPrefix = sMonth === eMonth ? sMonth : `${sMonth}-${eMonth}`;
        } else {
          monthPrefix = sMonth;
        }
      } else {
        monthPrefix = sMonth;
      }
    }
  } else if (endDate) {
    const eDate = new Date(endDate);
    if (!isNaN(eDate.getTime())) {
      monthPrefix = monthNames[eDate.getMonth()];
    }
  }

  if (!monthPrefix) {
    const now = new Date();
    monthPrefix = monthNames[now.getMonth()];
  }

  return monthPrefix;
};

interface ExportParams {
  workItems: WorkItem[];
  columns?: Partial<ExportColumnOptions>;
  fileName?: string;
  sheetName?: string;
  format?: 'xlsx' | 'csv';
}

/**
 * Convert 1-based column index to Excel column letter (e.g. 1 -> A, 4 -> D)
 */
const getColumnLetter = (colIndex: number): string => {
  let temp = colIndex;
  let letter = '';
  while (temp > 0) {
    const mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - mod) / 26);
  }
  return letter;
};

/**
 * Generates an Excel file with modern professional table UI,
 * compulsory Spent Hours column for manual entry, auto-filter,
 * dynamic sheet and file name based on month, and an automatic SUM formula in the Total row.
 */
export const exportTasksToFile = async ({
  workItems,
  columns: customColumns,
  fileName,
  sheetName,
  format = 'xlsx',
}: ExportParams): Promise<void> => {
  const defaultName = getTimesheetNameFromDates();
  const effectiveFileName = fileName?.trim() || defaultName;
  const rawSheetName = sheetName?.trim() || effectiveFileName;
  // Excel sheet names cannot exceed 31 chars and cannot contain :\/?*[]
  const cleanSheetName = rawSheetName.replace(/[:\\/?*[\]]/g, '-').slice(0, 31);

  const cols = { ...DEFAULT_EXPORT_COLUMNS, ...customColumns };
  cols.spentHours = true; // Always compulsory as requested

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Nefuza Task Board';
  workbook.lastModifiedBy = 'Nefuza Task Board';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet(cleanSheetName, {
    views: [{ state: 'frozen', ySplit: 1 }],
    properties: { defaultRowHeight: 24 },
  });

  // Build column metadata
  interface ColumnDef {
    header: string;
    key: string;
    width: number;
    align: 'left' | 'center' | 'right';
  }

  const colDefs: ColumnDef[] = [];

  if (cols.id) {
    colDefs.push({ header: 'Task ID', key: 'id', width: 14, align: 'center' });
  }
  if (cols.title) {
    colDefs.push({ header: 'Title', key: 'title', width: 45, align: 'left' });
  }
  if (cols.description) {
    colDefs.push({ header: 'Description', key: 'description', width: 60, align: 'left' });
  }
  if (cols.spentHours) {
    colDefs.push({ header: 'Spent Hours', key: 'spentHours', width: 16, align: 'right' });
  }
  if (cols.updatedDate) {
    colDefs.push({ header: 'Updated Date', key: 'updatedDate', width: 22, align: 'center' });
  }
  if (cols.createdDate) {
    colDefs.push({ header: 'Created Date', key: 'createdDate', width: 22, align: 'center' });
  }
  if (cols.state) {
    colDefs.push({ header: 'State', key: 'state', width: 16, align: 'center' });
  }
  if (cols.type) {
    colDefs.push({ header: 'Type', key: 'type', width: 16, align: 'center' });
  }
  if (cols.assignedTo) {
    colDefs.push({ header: 'Assigned To', key: 'assignedTo', width: 25, align: 'left' });
  }
  if (cols.priority) {
    colDefs.push({ header: 'Priority', key: 'priority', width: 14, align: 'center' });
  }
  if (cols.sprint) {
    colDefs.push({ header: 'Sprint / Iteration', key: 'sprint', width: 24, align: 'left' });
  }
  if (cols.tags) {
    colDefs.push({ header: 'Tags', key: 'tags', width: 30, align: 'left' });
  }

  worksheet.columns = colDefs.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width,
  }));

  // Style Header Row (Row 1)
  const headerRow = worksheet.getRow(1);
  headerRow.height = 28;

  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF356854' }, // Forest/Sage Green (#356854)
    };
    cell.font = {
      name: 'Segoe UI',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' }, // White
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: false,
    };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF356854' } },
      bottom: { style: 'medium', color: { argb: 'FF254C3D' } },
      left: { style: 'thin', color: { argb: 'FF254C3D' } },
      right: { style: 'thin', color: { argb: 'FF254C3D' } },
    };
  });

  // Border style for data cells
  const cellBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  };

  // Add Data Rows
  workItems.forEach((item, index) => {
    const fields = item.fields;

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

    // Build row data object based on column keys
    const rowData: Record<string, unknown> = {};
    if (cols.id) rowData.id = item.id || fields['System.Id'];
    if (cols.title) rowData.title = fields['System.Title'] || '';
    if (cols.description) rowData.description = cleanDescription;
    if (cols.spentHours) rowData.spentHours = null; // Blank for manual user entry
    if (cols.updatedDate) rowData.updatedDate = formatExportDate(fields['System.ChangedDate']);
    if (cols.createdDate) rowData.createdDate = formatExportDate(fields['System.CreatedDate']);
    if (cols.state) rowData.state = fields['System.State'] || '';
    if (cols.type) rowData.type = fields['System.WorkItemType'] || '';
    if (cols.assignedTo) rowData.assignedTo = assignedName;
    if (cols.priority) rowData.priority = priority;
    if (cols.sprint) rowData.sprint = sprint;
    if (cols.tags) rowData.tags = fields['System.Tags'] || '';

    const row = worksheet.addRow(rowData);
    row.height = 20; // Strictly 1 single line max height for clean UI

    const isEven = index % 2 === 0;
    const rowBgColor = isEven ? 'FFFFFFFF' : 'FFF8FAFC'; // Clean zebra striping

    // Format individual cells in the row
    colDefs.forEach((colDef, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.border = cellBorder;
      cell.font = { name: 'Segoe UI', size: 10 };

      // Highlight Spent Hours column cells slightly so user knows it's an editable entry field
      if (colDef.key === 'spentHours') {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEFCE8' }, // Light amber / yellow highlight for manual input
        };
        cell.alignment = { vertical: 'middle', horizontal: 'right', wrapText: false };
        cell.numFmt = '#,##0.00';
      } else {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: rowBgColor },
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: colDef.align,
          wrapText: false, // 1-line display: clicking cell shows full text in formula bar
        };

        if (colDef.key === 'id') {
          cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0077B6' } };
        }
      }
    });
  });

  const lastDataRowNumber = workItems.length + 1; // Row 1 is header

  // Add "Total" Summary Row with Auto-Sum Formula
  const totalRowData: Record<string, unknown> = {};

  // First available text column gets the "Total" label
  const labelColKey = cols.title ? 'title' : cols.id ? 'id' : colDefs[0]?.key || 'title';
  totalRowData[labelColKey] = 'Total';

  // Find index of spentHours column (1-based)
  const spentHoursColIndex = colDefs.findIndex((c) => c.key === 'spentHours') + 1;
  const spentHoursColLetter = spentHoursColIndex > 0 ? getColumnLetter(spentHoursColIndex) : 'D';

  if (cols.spentHours) {
    if (workItems.length > 0) {
      totalRowData.spentHours = {
        formula: `SUM(${spentHoursColLetter}2:${spentHoursColLetter}${lastDataRowNumber})`,
        result: 0,
      };
    } else {
      totalRowData.spentHours = 0;
    }
  }

  const totalRow = worksheet.addRow(totalRowData);
  totalRow.height = 26;

  // Style the Total row (Matching #356854 green with white bold text)
  colDefs.forEach((colDef, colIdx) => {
    const cell = totalRow.getCell(colIdx + 1);

    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF356854' }, // Forest Green (#356854)
    };

    // Clean white borders for total row
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF254C3D' } },
      bottom: { style: 'double', color: { argb: 'FFFFFFFF' } },
      left: { style: 'thin', color: { argb: 'FF254C3D' } },
      right: { style: 'thin', color: { argb: 'FF254C3D' } },
    };

    cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }; // White

    if (colDef.key === labelColKey) {
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    } else if (colDef.key === 'spentHours') {
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
      cell.numFmt = '#,##0.00';
    } else {
      cell.value = '';
    }
  });

  // Enable AutoFilter on Header Row across all columns
  if (colDefs.length > 0) {
    const lastColLetter = getColumnLetter(colDefs.length);
    worksheet.autoFilter = {
      from: 'A1',
      to: `${lastColLetter}${Math.max(lastDataRowNumber, 1)}`,
    };
  }

  // Trigger file download in browser
  const finalFileName = effectiveFileName.endsWith(`.${format}`) ? effectiveFileName : `${effectiveFileName}.${format}`;

  if (format === 'csv') {
    const buffer = await workbook.csv.writeBuffer();
    const blob = new Blob([buffer], { type: 'text/csv;charset=utf-8;' });
    saveBlobAsFile(blob, finalFileName);
  } else {
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveBlobAsFile(blob, finalFileName);
  }
};

/**
 * Triggers client-side browser file download from Blob
 */
const saveBlobAsFile = (blob: Blob, fileName: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
