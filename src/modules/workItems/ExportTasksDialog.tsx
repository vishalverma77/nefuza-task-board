import React, { useState, useMemo, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useSnackbar } from 'notistack';
import type { RootState } from '../../app/store';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Chip,
  RadioGroup,
  Radio,
  FormControl,
  FormLabel,
  IconButton,
  Divider,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import TableChartIcon from '@mui/icons-material/TableChart';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DateRangeIcon from '@mui/icons-material/DateRange';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CalculateIcon from '@mui/icons-material/Calculate';
import EditNoteIcon from '@mui/icons-material/EditNote';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CheckIcon from '@mui/icons-material/Check';
import type { WorkItem } from '../../types/azureDevOps';
import {
  exportTasksToFile,
  DEFAULT_EXPORT_COLUMNS,
  stripHtmlToPlainText,
  formatExportDate,
  getTimesheetNameFromDates,
  type ExportColumnOptions
} from '../../utils/exportToExcel';
import {
  syncTasksToGoogleSheet,
  getOrgGoogleSheetDetails,
  getGoogleAppsScriptCode
} from '../../utils/googleSheetsSync';

export interface ExportSuccessNotification {
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
}

interface ExportTasksDialogProps {
  open: boolean;
  onClose: () => void;
  workItems: WorkItem[];
  initialStartDate?: string;
  initialEndDate?: string;
  initialDateType?: 'changedDate' | 'createdDate';
  onSuccess?: (notification: ExportSuccessNotification) => void;
}

export const ExportTasksDialog: React.FC<ExportTasksDialogProps> = ({
  open,
  onClose,
  workItems,
  initialStartDate = '',
  initialEndDate = '',
  initialDateType = 'changedDate',
  onSuccess
}) => {
  const { enqueueSnackbar } = useSnackbar();

  // Tab state: 0 = Excel Download, 1 = Add Tab to Google Sheet, 2 = Table Preview
  const [activeTab, setActiveTab] = useState<number>(0);

  // Date filter controls
  const [dateField, setDateField] = useState<'changedDate' | 'createdDate'>(initialDateType);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);

  // File format and naming (e.g. September-nefuza-timesheet)
  const [fileFormat, setFileFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [userFileName, setUserFileName] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Organization context & Sheet details
  const activeOrg = useSelector((state: RootState) => state.connection.activeOrg);
  const orgSheet = useMemo(() => getOrgGoogleSheetDetails(activeOrg), [activeOrg]);

  // Google Sheets Cloud Sync state (separated per organization)
  const [webhookUrl, setWebhookUrl] = useState(() => {
    return localStorage.getItem(orgSheet.storageKey) || '';
  });

  // Re-sync webhook URL if active organization changes
  useEffect(() => {
    setWebhookUrl(localStorage.getItem(orgSheet.storageKey) || '');
  }, [orgSheet.storageKey]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);

  // Derived automatic sheet & file name based on selected date range month
  const autoTimesheetName = useMemo(() => {
    return getTimesheetNameFromDates(startDate, endDate);
  }, [startDate, endDate]);

  const effectiveFileName = userFileName !== null ? userFileName : autoTimesheetName;

  // Selected cell detail for interactive click-to-view popup
  const [selectedCellDetail, setSelectedCellDetail] = useState<{
    title: string;
    value: string;
    taskId?: number;
  } | null>(null);

  // Column choices
  const [columns, setColumns] = useState<ExportColumnOptions>({
    ...DEFAULT_EXPORT_COLUMNS,
    spentHours: true // Always compulsory
  });

  // Quick preset helper
  const handleApplyPreset = (preset: 'all' | 'today' | '7days' | '30days' | 'thisMonth') => {
    const now = new Date();
    const toYMD = (d: Date) => d.toISOString().split('T')[0];

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      const today = toYMD(now);
      setStartDate(today);
      setEndDate(today);
    } else if (preset === '7days') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setStartDate(toYMD(d));
      setEndDate(toYMD(now));
    } else if (preset === '30days') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setStartDate(toYMD(d));
      setEndDate(toYMD(now));
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(toYMD(firstDay));
      setEndDate(toYMD(now));
    }
  };

  // Filter tasks based on dialog date settings
  const filteredTasksForExport = useMemo(() => {
    return workItems.filter((item) => {
      const dateStr =
        dateField === 'changedDate'
          ? item.fields['System.ChangedDate']
          : item.fields['System.CreatedDate'];

      if (!dateStr) return true;
      const itemDate = new Date(dateStr);
      if (isNaN(itemDate.getTime())) return true;

      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (itemDate < start) return false;
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (itemDate > end) return false;
      }

      return true;
    });
  }, [workItems, dateField, startDate, endDate]);

  // Calculate sum of known spent hours across filtered tasks
  const totalKnownSpentHours = useMemo(() => {
    return filteredTasksForExport.reduce((acc, item) => {
      const v = item.fields['Custom.SpentHours'] ?? item.fields['Microsoft.VSTS.Scheduling.CompletedWork'];
      return acc + (typeof v === 'number' ? v : Number(v) || 0);
    }, 0);
  }, [filteredTasksForExport]);

  const handleToggleColumn = (key: keyof ExportColumnOptions) => {
    if (key === 'spentHours') return; // Cannot uncheck compulsory column
    setColumns((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSelectAllColumns = (select: boolean) => {
    setColumns({
      id: select,
      title: select,
      description: select,
      spentHours: true, // Always compulsory
      updatedDate: select,
      createdDate: select,
      state: select,
      type: select,
      assignedTo: select,
      priority: select,
      sprint: select,
      tags: select,
    });
  };

  const handleExport = async () => {
    setIsExporting(true);
    const finalExportName = effectiveFileName.trim() || autoTimesheetName;
    try {
      await exportTasksToFile({
        workItems: filteredTasksForExport,
        columns: {
          ...columns,
          spentHours: true
        },
        fileName: finalExportName,
        sheetName: finalExportName,
        format: fileFormat
      });
      enqueueSnackbar(`Successfully downloaded "${finalExportName}.${fileFormat}" (${filteredTasksForExport.length} tasks)!`, { variant: 'success' });
      onClose();
      onSuccess?.({
        title: 'Excel Export Completed!',
        message: `Successfully generated and downloaded "${finalExportName}.${fileFormat}" with ${filteredTasksForExport.length} tasks.`
      });
    } catch (err) {
      console.error('Failed to export tasks:', err);
      enqueueSnackbar('Failed to export tasks: ' + ((err as Error)?.message || 'Unknown error'), { variant: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSyncToGoogleSheet = async () => {
    if (!webhookUrl.trim()) {
      enqueueSnackbar('Please enter your Google Apps Script Webhook URL below.', { variant: 'warning' });
      setSyncStatus({
        type: 'error',
        message: 'Please enter your Google Apps Script Webhook URL below.'
      });
      return;
    }

    setIsSyncing(true);
    setSyncStatus(null);
    localStorage.setItem(orgSheet.storageKey, webhookUrl.trim());

    try {
      const finalSheetName = effectiveFileName.trim() || autoTimesheetName;
      const res = await syncTasksToGoogleSheet({
        webhookUrl: webhookUrl.trim(),
        sheetName: finalSheetName,
        workItems: filteredTasksForExport,
        columns: {
          ...columns,
          spentHours: true
        },
        spreadsheetId: orgSheet.spreadsheetId
      });

      if (res.success) {
        enqueueSnackbar(`"${finalSheetName}" tab added to Google Sheet successfully!`, { variant: 'success' });
        onClose(); // Automatically closes modal on success
        onSuccess?.({
          title: `${orgSheet.orgLabel} Sheet Synced Successfully!`,
          message: `New sheet tab "${finalSheetName}" with ${filteredTasksForExport.length} tasks has been successfully added into your ${orgSheet.orgLabel} Google Sheet!`,
          actionUrl: orgSheet.sheetUrl,
          actionLabel: `Open ${orgSheet.orgLabel} Sheet`
        });
      } else {
        enqueueSnackbar(res.message || 'Failed to add tab to Google Sheet.', { variant: 'error' });
        setSyncStatus({
          type: 'error',
          message: res.message || 'Failed to add tab to Google Sheet.'
        });
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      const msg = errObj.message || 'Error communicating with Google Sheet Webhook.';
      enqueueSnackbar(msg, { variant: 'error' });
      setSyncStatus({
        type: 'error',
        message: msg
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopyScript = () => {
    const script = getGoogleAppsScriptCode(orgSheet.spreadsheetId, orgSheet.orgLabel);
    navigator.clipboard.writeText(script);
    setCopiedScript(true);
    enqueueSnackbar('Google Apps Script code copied to clipboard!', { variant: 'info' });
    setTimeout(() => setCopiedScript(false), 2500);
  };

  // Preview sample of first 4 tasks
  const previewTasks = useMemo(() => {
    return filteredTasksForExport.slice(0, 4);
  }, [filteredTasksForExport]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: { xs: 2, sm: 3.5 },
            backgroundImage: 'none',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: { xs: 'calc(100% - 16px)', sm: 'calc(100% - 48px)' },
            m: { xs: 1, sm: 2 },
            overflow: 'hidden'
          }
        }
      }}
    >
      {/* Dialog Header */}
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: { xs: 1.5, sm: 3 },
          py: { xs: 1.5, sm: 2 },
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'action.hover',
          flexShrink: 0
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, minWidth: 0, pr: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: { xs: 36, sm: 44 },
              height: { xs: 36, sm: 44 },
              borderRadius: 2,
              bgcolor: 'rgba(0, 180, 216, 0.15)',
              color: '#00b4d8',
              flexShrink: 0
            }}
          >
            <TableChartIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2, fontSize: { xs: '0.95rem', sm: '1.25rem' } }} noWrap>
              Timesheet & Task Export
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
              Export to Excel File or <strong>Add New Month Tab directly into your Google Sheet</strong>
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary', flexShrink: 0 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      {/* Tabs Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: { xs: 1, sm: 3 }, bgcolor: 'background.paper', flexShrink: 0 }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          textColor="inherit"
          indicatorColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            minHeight: { xs: 40, sm: 48 },
            '& .MuiTabs-indicator': { bgcolor: '#00b4d8', height: 3 }
          }}
        >
          <Tab
            icon={<FileDownloadIcon fontSize="small" />}
            iconPosition="start"
            label="Download Excel"
            sx={{
              fontWeight: 800,
              textTransform: 'none',
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              minHeight: { xs: 40, sm: 48 },
              px: { xs: 1.2, sm: 2 },
              color: '#00b4d8',
              '&.Mui-selected': { color: '#00b4d8' }
            }}
          />
          <Tab
            icon={<CloudSyncIcon fontSize="small" />}
            iconPosition="start"
            label="Google Sheet"
            sx={{
              fontWeight: 800,
              textTransform: 'none',
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              minHeight: { xs: 40, sm: 48 },
              px: { xs: 1.2, sm: 2 },
              color: '#00b4d8',
              '&.Mui-selected': { color: '#00b4d8' }
            }}
          />
          <Tab
            icon={<CalculateIcon fontSize="small" />}
            iconPosition="start"
            label={`Preview (${filteredTasksForExport.length})`}
            sx={{
              fontWeight: 700,
              textTransform: 'none',
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              minHeight: { xs: 40, sm: 48 },
              px: { xs: 1.2, sm: 2 }
            }}
          />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: { xs: 1.5, sm: 3 }, flex: 1, overflowY: 'auto' }}>
        {/* Live Match Counter Banner */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            gap: 1.2,
            p: { xs: 1.2, sm: 1.8 },
            mb: 2,
            borderRadius: 2.5,
            bgcolor: 'rgba(0, 180, 216, 0.08)',
            border: '1px solid rgba(0, 180, 216, 0.25)'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircleIcon sx={{ color: '#00b4d8', fontSize: 20 }} />
            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
              <Box component="span" sx={{ color: '#00b4d8', fontSize: { xs: '0.95rem', sm: '1.1rem' }, fontWeight: 800 }}>
                {filteredTasksForExport.length}
              </Box>{' '}
              items ready for <strong>{effectiveFileName}</strong>
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 0.8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip
              icon={<CalculateIcon sx={{ fontSize: '0.85rem !important' }} />}
              label="Auto-SUM (=SUM)"
              size="small"
              color="success"
              variant="outlined"
              sx={{ fontWeight: 700, fontSize: '0.7rem' }}
            />
            <Chip
              icon={<EditNoteIcon sx={{ fontSize: '0.85rem !important' }} />}
              label="Spent Hours"
              size="small"
              color="info"
              sx={{ fontWeight: 700, fontSize: '0.7rem' }}
            />
          </Box>
        </Box>

        {activeTab === 0 && (
          /* TAB 0: EXCEL / CSV DOWNLOAD */
          <>
            {/* Section 1: Date Range Filter */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DateRangeIcon sx={{ color: '#00b4d8', fontSize: 20 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    Date Range Filter
                  </Typography>
                </Box>

                {/* Quick Presets */}
                <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
                  <Chip
                    label="All Time"
                    size="small"
                    onClick={() => handleApplyPreset('all')}
                    variant={!startDate && !endDate ? 'filled' : 'outlined'}
                    color={!startDate && !endDate ? 'primary' : 'default'}
                    sx={{ cursor: 'pointer', fontWeight: 600 }}
                  />
                  <Chip
                    label="Today"
                    size="small"
                    onClick={() => handleApplyPreset('today')}
                    variant="outlined"
                    sx={{ cursor: 'pointer', fontWeight: 600 }}
                  />
                  <Chip
                    label="Last 7 Days"
                    size="small"
                    onClick={() => handleApplyPreset('7days')}
                    variant="outlined"
                    sx={{ cursor: 'pointer', fontWeight: 600 }}
                  />
                  <Chip
                    label="Last 30 Days"
                    size="small"
                    onClick={() => handleApplyPreset('30days')}
                    variant="outlined"
                    sx={{ cursor: 'pointer', fontWeight: 600 }}
                  />
                  <Chip
                    label="This Month"
                    size="small"
                    onClick={() => handleApplyPreset('thisMonth')}
                    variant="outlined"
                    sx={{ cursor: 'pointer', fontWeight: 600 }}
                  />
                </Box>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1.2fr 1fr 1fr' },
                  gap: 2,
                  p: 2,
                  borderRadius: 2.5,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                {/* Choose Date Target */}
                <TextField
                  select
                  size="small"
                  label="Filter By Date Field"
                  value={dateField}
                  onChange={(e) => setDateField(e.target.value as 'changedDate' | 'createdDate')}
                >
                  <MenuItem value="changedDate">Updated Date (Changed Date)</MenuItem>
                  <MenuItem value="createdDate">Created Date (Added Date)</MenuItem>
                </TextField>

                {/* Start Date */}
                <TextField
                  label="From Date"
                  type="date"
                  size="small"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />

                {/* End Date */}
                <TextField
                  label="To Date"
                  type="date"
                  size="small"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Box>
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* Section 2: Choose Columns */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Export Columns Configuration
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size="small" onClick={() => handleSelectAllColumns(true)} sx={{ fontSize: '0.75rem' }}>
                    Select All
                  </Button>
                  <Button
                    size="small"
                    onClick={() => setColumns({ ...DEFAULT_EXPORT_COLUMNS, spentHours: true })}
                    startIcon={<RestartAltIcon fontSize="inherit" />}
                    sx={{ fontSize: '0.75rem' }}
                  >
                    Reset Default
                  </Button>
                </Box>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr', md: '1fr 1fr 1fr 1fr' },
                  gap: 1.5,
                  p: 2,
                  borderRadius: 2.5,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <FormControlLabel
                  control={<Checkbox checked={columns.id} onChange={() => handleToggleColumn('id')} size="small" />}
                  label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Task ID *</Typography>}
                />
                <FormControlLabel
                  control={<Checkbox checked={columns.title} onChange={() => handleToggleColumn('title')} size="small" />}
                  label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Title *</Typography>}
                />
                <FormControlLabel
                  control={<Checkbox checked={columns.description} onChange={() => handleToggleColumn('description')} size="small" />}
                  label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Description (Clean) *</Typography>}
                />

                {/* Spent Hours - COMPULSORY FIELD */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    p: 0.5,
                    bgcolor: 'rgba(234, 179, 8, 0.12)',
                    borderRadius: 1.5,
                    border: '1px dashed #eab308'
                  }}
                >
                  <Checkbox checked={true} disabled size="small" sx={{ color: '#eab308' }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: '#ca8a04', lineHeight: 1.1 }}>
                      Spent Hours *
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
                      Compulsory (Manual Entry)
                    </Typography>
                  </Box>
                </Box>

                <FormControlLabel
                  control={<Checkbox checked={columns.updatedDate} onChange={() => handleToggleColumn('updatedDate')} size="small" />}
                  label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Updated Date *</Typography>}
                />
                <FormControlLabel
                  control={<Checkbox checked={columns.createdDate} onChange={() => handleToggleColumn('createdDate')} size="small" />}
                  label={<Typography variant="body2">Created Date</Typography>}
                />
                <FormControlLabel
                  control={<Checkbox checked={columns.state} onChange={() => handleToggleColumn('state')} size="small" />}
                  label={<Typography variant="body2">State</Typography>}
                />
                <FormControlLabel
                  control={<Checkbox checked={columns.type} onChange={() => handleToggleColumn('type')} size="small" />}
                  label={<Typography variant="body2">Work Item Type</Typography>}
                />
                <FormControlLabel
                  control={<Checkbox checked={columns.assignedTo} onChange={() => handleToggleColumn('assignedTo')} size="small" />}
                  label={<Typography variant="body2">Assigned To</Typography>}
                />
                <FormControlLabel
                  control={<Checkbox checked={columns.priority} onChange={() => handleToggleColumn('priority')} size="small" />}
                  label={<Typography variant="body2">Priority</Typography>}
                />
                <FormControlLabel
                  control={<Checkbox checked={columns.sprint} onChange={() => handleToggleColumn('sprint')} size="small" />}
                  label={<Typography variant="body2">Sprint / Iteration</Typography>}
                />
                <FormControlLabel
                  control={<Checkbox checked={columns.tags} onChange={() => handleToggleColumn('tags')} size="small" />}
                  label={<Typography variant="body2">Tags</Typography>}
                />
              </Box>
            </Box>

            {/* Section 3: File Format & Name */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
                alignItems: 'center'
              }}
            >
              <TextField
                label="File & Sheet Name"
                size="small"
                value={effectiveFileName}
                onChange={(e) => setUserFileName(e.target.value)}
                helperText={`Saved as: ${effectiveFileName.trim() || autoTimesheetName}.${fileFormat} (Excel Sheet Tab Name: ${effectiveFileName.trim() || autoTimesheetName})`}
              />

              <FormControl component="fieldset">
                <FormLabel component="legend" sx={{ fontSize: '0.8rem', fontWeight: 700 }}>
                  Format
                </FormLabel>
                <RadioGroup
                  row
                  value={fileFormat}
                  onChange={(e) => setFileFormat(e.target.value as 'xlsx' | 'csv')}
                >
                  <FormControlLabel
                    value="xlsx"
                    control={<Radio size="small" />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          Excel Table (.xlsx)
                        </Typography>
                        <Chip label="Styles + Formula" size="small" color="primary" sx={{ height: 18, fontSize: '0.65rem' }} />
                      </Box>
                    }
                  />
                  <FormControlLabel
                    value="csv"
                    control={<Radio size="small" />}
                    label={<Typography variant="body2">CSV (.csv)</Typography>}
                  />
                </RadioGroup>
              </FormControl>
            </Box>
          </>
        )}

        {activeTab === 1 && (
          /* TAB 1: ADD TAB DIRECTLY TO GOOGLE SHEET */
          <Box>
            {/* Status Alert */}
            {syncStatus && (
              <Alert
                severity={syncStatus.type}
                onClose={() => setSyncStatus(null)}
                sx={{ mb: 2.5, borderRadius: 2 }}
                action={
                  syncStatus.type === 'success' ? (
                    <Button
                      color="inherit"
                      size="small"
                      href={orgSheet.sheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      endIcon={<OpenInNewIcon fontSize="inherit" />}
                    >
                      Open Sheet
                    </Button>
                  ) : undefined
                }
              >
                {syncStatus.message}
              </Alert>
            )}

            {/* Target Tab Info Banner */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                mb: 3,
                borderRadius: 2.5,
                bgcolor: 'rgba(53, 104, 84, 0.08)',
                border: '1px solid rgba(53, 104, 84, 0.3)'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase' }}>
                    New Tab for {orgSheet.orgLabel} in Google Sheet:
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#356854', mt: 0.2 }}>
                    📄 {effectiveFileName}
                  </Typography>
                </Box>

                <Button
                  size="small"
                  variant="outlined"
                  href={orgSheet.sheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  endIcon={<OpenInNewIcon fontSize="small" />}
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                  Open {orgSheet.orgLabel} Sheet
                </Button>
              </Box>
            </Paper>

            {/* Webhook URL Input */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                {orgSheet.orgLabel} Apps Script Webhook URL
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="https://script.google.com/macros/s/.../exec"
                value={webhookUrl}
                onChange={(e) => {
                  setWebhookUrl(e.target.value);
                  localStorage.setItem(orgSheet.storageKey, e.target.value.trim());
                }}
                helperText={`Paste your deployed Google Apps Script Web App URL for ${orgSheet.orgLabel}. It is saved automatically in your browser.`}
              />
            </Box>

            {/* Step-by-Step Setup Guide */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, bgcolor: 'background.paper' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  ⚡ 1-Minute Setup Guide for {orgSheet.orgLabel}:
                </Typography>
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleCopyScript}
                  startIcon={copiedScript ? <CheckIcon /> : <ContentCopyIcon />}
                  color={copiedScript ? 'success' : 'primary'}
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                  {copiedScript ? 'Code Copied!' : 'Copy Apps Script Code'}
                </Button>
              </Box>

              <Typography variant="body2" component="div" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                <ol style={{ paddingLeft: '1.2rem', margin: 0 }}>
                  <li>
                    Open your {orgSheet.orgLabel}{' '}
                    <a
                      href={orgSheet.sheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#00b4d8', fontWeight: 700 }}
                    >
                      Google Sheet
                    </a>
                    .
                  </li>
                  <li>
                    In top menu, click <strong>Extensions → Apps Script</strong>.
                  </li>
                  <li>
                    Click the <strong>Copy Apps Script Code</strong> button above, delete any code in the editor, and paste this script.
                  </li>
                  <li>
                    Click <strong>Deploy → New deployment</strong>.
                  </li>
                  <li>
                    Select Type: <strong>Web app</strong> (click gear icon next to Select type).
                  </li>
                  <li>
                    Set <strong>Execute as: Me</strong> and <strong>Who has access: Anyone</strong>, then click <strong>Deploy</strong>.
                  </li>
                  <li>
                    Copy the generated <strong>Web app URL</strong> and paste it in the box above!
                  </li>
                </ol>
              </Typography>
            </Paper>
          </Box>
        )}

        {activeTab === 2 && (
          /* TAB 2: LIVE EXCEL TABLE VISUAL PREVIEW */
          <Box>
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  Excel & Google Sheet Table Preview
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Showing how the formatted table, Spent Hours column, and Total Auto-Sum row will appear in your sheet
                </Typography>
              </Box>
              <Chip
                label="Header Dropdown Filters Active"
                size="small"
                color="info"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            </Box>

            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflow: 'auto', maxHeight: 380 }}>
              <Table size="small" sx={{ minWidth: 700 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#356854' }}>
                    {columns.id && <TableCell sx={{ color: '#FFFFFF', fontWeight: 800, bgcolor: '#356854', py: 1 }}>Task ID ▼</TableCell>}
                    {columns.title && <TableCell sx={{ color: '#FFFFFF', fontWeight: 800, bgcolor: '#356854', py: 1 }}>Title ▼</TableCell>}
                    {columns.description && <TableCell sx={{ color: '#FFFFFF', fontWeight: 800, bgcolor: '#356854', py: 1 }}>Description ▼</TableCell>}
                    <TableCell sx={{ color: '#FFFFFF', fontWeight: 800, bgcolor: '#356854', py: 1, textAlign: 'right' }}>
                      Spent Hours ▼
                    </TableCell>
                    {columns.updatedDate && <TableCell sx={{ color: '#FFFFFF', fontWeight: 800, bgcolor: '#356854', py: 1 }}>Updated Date ▼</TableCell>}
                    {columns.createdDate && <TableCell sx={{ color: '#FFFFFF', fontWeight: 800, bgcolor: '#356854', py: 1 }}>Created Date ▼</TableCell>}
                    {columns.state && <TableCell sx={{ color: '#FFFFFF', fontWeight: 800, bgcolor: '#356854', py: 1 }}>State ▼</TableCell>}
                    {columns.sprint && <TableCell sx={{ color: '#FFFFFF', fontWeight: 800, bgcolor: '#356854', py: 1 }}>Sprint ▼</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previewTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                        No tasks match the active date filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    previewTasks.map((item, idx) => {
                      const fields = item.fields;
                      const isEven = idx % 2 === 0;
                      const taskId = item.id;
                      const taskTitle = fields['System.Title'] || '';
                      const taskDesc = stripHtmlToPlainText(fields['System.Description']) || '-';
                      const updatedDate = formatExportDate(fields['System.ChangedDate']);
                      const createdDate = formatExportDate(fields['System.CreatedDate']);
                      const state = fields['System.State'] || '';
                      const sprint = fields['System.IterationPath']?.split('\\').pop() || 'Nefuza';

                      const cellStyle = {
                        py: 0.6,
                        px: 1.5,
                        height: 34,
                        maxHeight: 34,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: 'rgba(53, 104, 84, 0.12)',
                        }
                      };

                      return (
                        <TableRow
                          key={item.id}
                          sx={{
                            bgcolor: isEven ? '#FFFFFF' : '#F8FAFC',
                            height: 34,
                            maxHeight: 34,
                          }}
                        >
                          {columns.id && (
                            <TableCell
                              sx={{ ...cellStyle, fontWeight: 700, color: '#0077b6' }}
                              title="Click to view details"
                              onClick={() => setSelectedCellDetail({ title: 'Task ID', value: `#${taskId}`, taskId })}
                            >
                              #{taskId}
                            </TableCell>
                          )}
                          {columns.title && (
                            <TableCell
                              sx={{ ...cellStyle, maxWidth: 220 }}
                              title="Click to view full title"
                              onClick={() => setSelectedCellDetail({ title: 'Task Title', value: taskTitle, taskId })}
                            >
                              {taskTitle}
                            </TableCell>
                          )}
                          {columns.description && (
                            <TableCell
                              sx={{ ...cellStyle, maxWidth: 260, color: 'text.secondary' }}
                              title="Click to view full description"
                              onClick={() => setSelectedCellDetail({ title: 'Task Description', value: taskDesc, taskId })}
                            >
                              {taskDesc}
                            </TableCell>
                          )}
                          {/* Spent Hours cell (auto-filled if tracked, or manual entry) */}
                          {(() => {
                            const spentVal = fields['Custom.SpentHours'] ?? fields['Microsoft.VSTS.Scheduling.CompletedWork'];
                            const hasHours = spentVal !== undefined && spentVal !== null && spentVal !== '' && Number(spentVal) > 0;
                            return (
                              <TableCell
                                sx={{
                                  ...cellStyle,
                                  bgcolor: 'rgba(254, 240, 138, 0.4)',
                                  textAlign: 'right',
                                  '&:hover': { bgcolor: 'rgba(254, 240, 138, 0.7)' }
                                }}
                                title={hasHours ? `Auto-filled: ${Number(spentVal).toFixed(2)} hours` : 'Blank cell for manual entry'}
                                onClick={() => setSelectedCellDetail({
                                  title: hasHours ? 'Spent Hours (Auto-calculated)' : 'Spent Hours (Manual Entry)',
                                  value: hasHours
                                    ? `This card has ${Number(spentVal).toFixed(2)} hours logged. It will be prefilled automatically in your sheet.`
                                    : 'This cell is left blank in the exported sheet so you can enter spent hours manually. The Total row below will auto-sum your entries.',
                                  taskId
                                })}
                              >
                                {hasHours ? (
                                  <Typography variant="body2" sx={{ color: '#854d0e', fontWeight: 800, fontSize: '0.85rem' }}>
                                    {Number(spentVal).toFixed(2)}
                                  </Typography>
                                ) : (
                                  <Typography variant="caption" sx={{ color: '#854d0e', fontStyle: 'italic', fontWeight: 600 }}>
                                    [ Manual Entry ]
                                  </Typography>
                                )}
                              </TableCell>
                            );
                          })()}
                          {columns.updatedDate && (
                            <TableCell
                              sx={{ ...cellStyle, fontSize: '0.8rem', color: 'text.secondary' }}
                              title="Click to view updated date"
                              onClick={() => setSelectedCellDetail({ title: 'Updated Date', value: updatedDate, taskId })}
                            >
                              {updatedDate}
                            </TableCell>
                          )}
                          {columns.createdDate && (
                            <TableCell
                              sx={{ ...cellStyle, fontSize: '0.8rem', color: 'text.secondary' }}
                              title="Click to view created date"
                              onClick={() => setSelectedCellDetail({ title: 'Created Date', value: createdDate, taskId })}
                            >
                              {createdDate}
                            </TableCell>
                          )}
                          {columns.state && (
                            <TableCell
                              sx={{ ...cellStyle, fontWeight: 600 }}
                              title="Click to view state"
                              onClick={() => setSelectedCellDetail({ title: 'State', value: state, taskId })}
                            >
                              {state}
                            </TableCell>
                          )}
                          {columns.sprint && (
                            <TableCell
                              sx={{ ...cellStyle, color: 'text.secondary' }}
                              title="Click to view sprint"
                              onClick={() => setSelectedCellDetail({ title: 'Sprint', value: sprint, taskId })}
                            >
                              {sprint}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  )}

                  {/* TOTAL SUMMARY ROW (#356854 Background, White Text) */}
                  <TableRow
                    sx={{
                      bgcolor: '#356854',
                      borderTop: '2px solid #254C3D',
                      borderBottom: '3px double #FFFFFF',
                      height: 38,
                      '& .MuiTableCell-root': {
                        bgcolor: '#356854',
                        color: '#FFFFFF',
                        py: 0.75
                      }
                    }}
                  >
                    {columns.id && (
                      <TableCell sx={{ fontWeight: 900, color: '#FFFFFF', fontSize: '0.9rem', bgcolor: '#356854' }}>
                        Total
                      </TableCell>
                    )}
                    {columns.title && (
                      <TableCell sx={{ fontWeight: 800, color: '#FFFFFF', bgcolor: '#356854' }}>
                        {columns.id ? '' : 'Total'}
                      </TableCell>
                    )}
                    {columns.description && <TableCell sx={{ bgcolor: '#356854' }} />}

                    {/* Auto-Sum Formula Cell (#356854 bg with white text) */}
                    <TableCell sx={{ textAlign: 'right', bgcolor: '#356854' }}>
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6, bgcolor: '#285040', px: 1.2, py: 0.4, borderRadius: 1, border: '1px solid rgba(255, 255, 255, 0.4)' }}>
                        <CalculateIcon sx={{ fontSize: 14, color: '#FFFFFF' }} />
                        <Typography variant="caption" sx={{ fontWeight: 800, color: '#FFFFFF' }}>
                          {totalKnownSpentHours > 0 ? `=SUM (${totalKnownSpentHours.toFixed(2)} hrs)` : '=SUM(Spent Hours)'}
                        </Typography>
                      </Box>
                    </TableCell>

                    {columns.updatedDate && <TableCell sx={{ bgcolor: '#356854' }} />}
                    {columns.createdDate && <TableCell sx={{ bgcolor: '#356854' }} />}
                    {columns.state && <TableCell sx={{ bgcolor: '#356854' }} />}
                    {columns.sprint && <TableCell sx={{ bgcolor: '#356854' }} />}
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            {/* Explanatory notice */}
            <Box
              sx={{
                mt: 2,
                p: 1.5,
                bgcolor: 'rgba(53, 104, 84, 0.08)',
                borderRadius: 2,
                border: '1px solid rgba(53, 104, 84, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <CheckCircleIcon sx={{ color: '#356854', fontSize: 20 }} />
              <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 600 }}>
                <strong>Auto-Calculate & 1-Line Row View:</strong> Rows stay strictly 1 single line for clean visual layout. <strong>Click any cell</strong> to inspect its full text. In Excel & Google Sheets, the <strong>Total</strong> row dynamically calculates <code>=SUM(...)</code> as you enter hours.
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>

      {/* Dialog Footer Actions */}
      <DialogActions
        sx={{
          px: { xs: 1.5, sm: 3 },
          py: { xs: 1.25, sm: 2 },
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'action.hover',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
          flexShrink: 0,
          gap: 1
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1.2,
            alignItems: 'stretch',
            width: { xs: '100%', sm: 'auto' },
            order: { xs: 1, sm: 2 }
          }}
        >
          {activeTab !== 1 ? (
            <>
              <Button
                variant="contained"
                onClick={handleExport}
                disabled={filteredTasksForExport.length === 0 || isExporting}
                startIcon={isExporting ? <CircularProgress size={16} color="inherit" /> : <FileDownloadIcon />}
                sx={{
                  bgcolor: '#00b4d8',
                  '&:hover': { bgcolor: '#0096c7' },
                  fontWeight: 800,
                  fontSize: { xs: '0.8rem', sm: '0.875rem' },
                  py: { xs: 0.9, sm: 1 },
                  px: 2.5,
                  borderRadius: 2,
                  boxShadow: '0 4px 14px rgba(0, 180, 216, 0.3)',
                  width: { xs: '100%', sm: 'auto' }
                }}
              >
                {isExporting
                  ? 'Generating Spreadsheet...'
                  : `Download Excel (${filteredTasksForExport.length} Tasks)`}
              </Button>

              <Button
                variant="outlined"
                onClick={() => setActiveTab(1)}
                startIcon={<CloudSyncIcon />}
                sx={{
                  textTransform: 'none',
                  fontWeight: 800,
                  fontSize: { xs: '0.8rem', sm: '0.875rem' },
                  borderColor: '#00b4d8',
                  color: '#00b4d8',
                  py: { xs: 0.8, sm: 1 },
                  width: { xs: '100%', sm: 'auto' }
                }}
              >
                Add Tab to Google Sheet
              </Button>
            </>
          ) : (
            <Button
              variant="contained"
              onClick={handleSyncToGoogleSheet}
              disabled={filteredTasksForExport.length === 0 || isSyncing}
              startIcon={isSyncing ? <CircularProgress size={16} color="inherit" /> : <CloudSyncIcon />}
              sx={{
                bgcolor: '#00b4d8',
                '&:hover': { bgcolor: '#0096c7' },
                fontWeight: 800,
                fontSize: { xs: '0.8rem', sm: '0.875rem' },
                py: { xs: 0.9, sm: 1.1 },
                px: 3,
                borderRadius: 2,
                boxShadow: '0 4px 14px rgba(0, 180, 216, 0.3)',
                width: { xs: '100%', sm: 'auto' }
              }}
            >
              {isSyncing
                ? 'Adding Tab to Google Sheet...'
                : `Add "${effectiveFileName}" Tab to Google Sheet`}
            </Button>
          )}
        </Box>

        <Button
          onClick={onClose}
          color="inherit"
          disabled={isExporting || isSyncing}
          sx={{
            width: { xs: '100%', sm: 'auto' },
            order: { xs: 2, sm: 1 },
            py: { xs: 0.6, sm: 1 },
            fontSize: { xs: '0.8rem', sm: '0.875rem' }
          }}
        >
          Close
        </Button>
      </DialogActions>

      {/* Interactive Cell Detail Dialog (Shows full details on cell click) */}
      {selectedCellDetail && (
        <Dialog
          open={Boolean(selectedCellDetail)}
          onClose={() => setSelectedCellDetail(null)}
          maxWidth="sm"
          fullWidth
          slotProps={{
            paper: {
              sx: {
                borderRadius: { xs: 2, sm: 2.5 },
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: { xs: 'calc(100% - 32px)', sm: 'calc(100% - 64px)' },
                m: { xs: 1, sm: 2 }
              }
            }
          }}
        >
          <DialogTitle
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 1.5,
              px: { xs: 2, sm: 2.5 },
              bgcolor: '#356854',
              color: '#FFFFFF',
              flexShrink: 0
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#FFFFFF' }}>
                {selectedCellDetail.title}
              </Typography>
              {selectedCellDetail.taskId && (
                <Chip
                  label={`Task #${selectedCellDetail.taskId}`}
                  size="small"
                  sx={{ bgcolor: '#24483a', color: '#FFFFFF', fontWeight: 700, fontSize: '0.75rem' }}
                />
              )}
            </Box>
            <IconButton size="small" onClick={() => setSelectedCellDetail(null)} sx={{ color: '#FFFFFF' }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: { xs: 2, sm: 3 }, flex: 1, overflowY: 'auto' }}>
            <Typography
              variant="body2"
              sx={{
                whiteSpace: 'pre-wrap',
                lineHeight: 1.7,
                color: 'text.primary',
                wordBreak: 'break-word',
                fontFamily: 'inherit',
                fontSize: '0.92rem'
              }}
            >
              {selectedCellDetail.value || '(Empty)'}
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: { xs: 2, sm: 2.5 }, py: 1.5, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'action.hover', flexShrink: 0 }}>
            <Button
              size="small"
              startIcon={<ContentCopyIcon />}
              onClick={() => {
                navigator.clipboard.writeText(selectedCellDetail.value);
                enqueueSnackbar('Copied to clipboard!', { variant: 'info' });
              }}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              Copy Text
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={() => setSelectedCellDetail(null)}
              sx={{
                bgcolor: '#356854',
                '&:hover': { bgcolor: '#24483a' },
                textTransform: 'none',
                fontWeight: 700,
                px: 2.5
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Dialog>
  );
};
