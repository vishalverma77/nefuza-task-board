import React, { useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import {
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  MenuItem,
  Box,
  Typography,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  Skeleton,
  InputAdornment,
  Paper,
  Button,
  Collapse,
  Snackbar,
  Alert,
  AlertTitle,
  CircularProgress
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import VisibilityIcon from '@mui/icons-material/Visibility';
import BugReportIcon from '@mui/icons-material/BugReport';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import StarsIcon from '@mui/icons-material/Stars';
import HelpOutlinedIcon from '@mui/icons-material/HelpOutlined';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DateRangeIcon from '@mui/icons-material/DateRange';
import ClearIcon from '@mui/icons-material/Clear';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import type { WorkItem, WorkItemType, AzureIdentity, UncurlConnectionConfig } from '../../types/azureDevOps';
import type { RootState } from '../../app/store';
import { selectWorkItem, updateWorkItemSpentHours } from '../azureConnection/connectionSlice';
import { ExportTasksDialog, type ExportSuccessNotification } from './ExportTasksDialog';
import { SecretWorkspaceDialog } from '../workspaceAuth/SecretWorkspaceDialog';
import { TasqueeAuthDialog } from '../tasqueeAuth/TasqueeAuthDialog';
import { LogHoursDialog } from '../taskDetails/LogHoursDialog';
import { createTasqueeCard, fetchTasqueeExistingTaskIds, DEFAULT_UNCURL_CONFIG } from '../../services/uncurlApi';

interface TaskListTableProps {
  workItems: WorkItem[];
  isLoading?: boolean;
  selectedStateFilter?: string;
  onSelectStateFilter?: (state: string) => void;
}

export const TaskListTable: React.FC<TaskListTableProps> = ({
  workItems,
  isLoading,
  selectedStateFilter = 'ALL',
  onSelectStateFilter
}) => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [assignedFilter, setAssignedFilter] = useState('ALL');

  // Date Range Filter State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateFilterType, setDateFilterType] = useState<'changedDate' | 'createdDate'>('changedDate');
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);

  // Export Dialog State
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isSecretDialogOpen, setIsSecretDialogOpen] = useState(false);
  const [successNotification, setSuccessNotification] = useState<ExportSuccessNotification | null>(null);

  // View Mode: 'auto' (cards on xs, table on sm+), or forced 'cards'/'table'
  const [viewMode, setViewMode] = useState<'auto' | 'cards' | 'table'>('auto');

  // Connection & Organization Context
  const { activeOrg, uncurlConfig } = useSelector((state: RootState) => state.connection);

  // Tasquee Created Cards Tracking (persisted locally & verified via live Tasquee GET API)
  const [addedTasqueeIds, setAddedTasqueeIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('tasquee_added_task_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [addingTaskId, setAddingTaskId] = useState<number | null>(null);
  const [isTasqueeAuthOpen, setIsTasqueeAuthOpen] = useState(false);
  const [pendingTasqueeItem, setPendingTasqueeItem] = useState<WorkItem | null>(null);
  const [tasqueeAuthError, setTasqueeAuthError] = useState<string | null>(null);
  const [isLogHoursOpen, setIsLogHoursOpen] = useState(false);
  const [logHoursTask, setLogHoursTask] = useState<WorkItem | null>(null);

  // Sync live cards from Tasquee board GET API so deleted cards automatically re-enable the button
  const syncTasqueeCards = React.useCallback(async (tokenOverride?: string) => {
    const token =
      tokenOverride ||
      uncurlConfig?.bearerToken ||
      (() => {
        try {
          const raw = localStorage.getItem('uncurl_health_session');
          return raw ? JSON.parse(raw).bearerToken : '';
        } catch {
          return '';
        }
      })();

    if (!token) return;

    try {
      const liveIds = await fetchTasqueeExistingTaskIds({
        organization: 'uncurl:health',
        requestUrl: DEFAULT_UNCURL_CONFIG.requestUrl,
        apiKey: uncurlConfig?.apiKey || DEFAULT_UNCURL_CONFIG.apiKey,
        bearerToken: token,
      });

      if (Array.isArray(liveIds)) {
        setAddedTasqueeIds(liveIds);
        localStorage.setItem('tasquee_added_task_ids', JSON.stringify(liveIds));
      }
    } catch (e) {
      console.warn('Failed to sync live Tasquee cards:', e);
    }
  }, [uncurlConfig]);

  // Initial and reactive fetch of live Tasquee tasks when table is viewed in Nefuza
  React.useEffect(() => {
    if (activeOrg === 'safbsdev') {
      syncTasqueeCards();
    }
  }, [activeOrg, syncTasqueeCards]);

  // 1-Click Add on Tasquee Handler for Nefuza tasks with ID > 173
  const handleAddToTasquee = async (item: WorkItem, overrideToken?: string) => {
    const token =
      overrideToken ||
      uncurlConfig?.bearerToken ||
      (() => {
        try {
          const raw = localStorage.getItem('uncurl_health_session');
          return raw ? JSON.parse(raw).bearerToken : '';
        } catch {
          return '';
        }
      })();

    if (!token) {
      setPendingTasqueeItem(item);
      setTasqueeAuthError('Tasquee Bearer Token required. Please enter your token to authorize.');
      setIsTasqueeAuthOpen(true);
      return;
    }

    const effectiveConfig: UncurlConnectionConfig = {
      organization: 'uncurl:health',
      requestUrl: uncurlConfig?.requestUrl || DEFAULT_UNCURL_CONFIG.requestUrl,
      apiKey: uncurlConfig?.apiKey || DEFAULT_UNCURL_CONFIG.apiKey,
      bearerToken: token,
    };

    // Format title: "Task 174 - <task title>"
    const rawTitle = (item.fields['System.Title'] || '').trim();
    const prefixRegex = new RegExp(`^task\\s*#?\\s*${item.id}\\s*[-:]?\\s*`, 'i');
    const cleanTitle = rawTitle.replace(prefixRegex, '').trim();
    const formattedTitle = cleanTitle ? `Task ${item.id} - ${cleanTitle}` : `Task ${item.id}`;

    // Clean HTML from description
    const rawDesc = item.fields['System.Description'] || '';
    const cleanDesc = rawDesc
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();

    setAddingTaskId(item.id);
    try {
      await createTasqueeCard(
        {
          column_id: '5466d98a-aebc-4d5d-beb0-f32ad41453db',
          title: formattedTitle,
          position: 1,
          milestone_id: null,
          description: cleanDesc || rawDesc,
        },
        effectiveConfig
      );

      // Re-sync live added IDs from Tasquee GET API immediately
      await syncTasqueeCards(token);
      setAddedTasqueeIds((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]));

      enqueueSnackbar(`"${formattedTitle}" added to Tasquee successfully!`, { variant: 'success' });
      setSuccessNotification({
        title: 'Added on Tasquee!',
        message: `"${formattedTitle}" has been successfully added to Tasquee with full description!`,
        actionLabel: 'Open Tasquee',
        actionUrl: 'https://tasquee.syncglob.com/board/2a709fe2-47f7-4f9a-8d85-1a612711dfde'
      });
    } catch (err: unknown) {
      const errObj = err as { message?: string; response?: { status?: number; data?: unknown } };
      const isUnauthorized =
        errObj.message?.includes('401') ||
        errObj.response?.status === 401 ||
        errObj.message?.toLowerCase().includes('unauthorized') ||
        errObj.message?.toLowerCase().includes('jwt');

      if (isUnauthorized) {
        // Automatically prompt with authorization dialog!
        enqueueSnackbar('Tasquee token expired or invalid (HTTP 401). Please authorize.', { variant: 'warning' });
        setPendingTasqueeItem(item);
        setTasqueeAuthError('Authorization expired or invalid (HTTP 401). Please enter your active Tasquee Bearer Token to authorize and add this task.');
        setIsTasqueeAuthOpen(true);
      } else {
        const errorMsg = errObj.message || 'Error communicating with Tasquee API.';
        enqueueSnackbar(errorMsg, { variant: 'error' });
        setSuccessNotification({
          title: 'Failed to Add to Tasquee',
          message: errorMsg
        });
      }
    } finally {
      setAddingTaskId(null);
    }
  };

  // Sorting State
  const [sortBy, setSortBy] = useState<'changedDate' | 'id' | 'title' | 'priority'>('changedDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Date Presets Handler
  const handleApplyDatePreset = (preset: 'all' | 'today' | '7days' | '30days' | 'thisMonth') => {
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
    setPage(0);
  };

  // Extract unique assigned users for filter dropdown
  const assignedUsers = useMemo(() => {
    const users = new Set<string>();
    workItems.forEach((item) => {
      const assigned = item.fields['System.AssignedTo'];
      if (typeof assigned === 'string' && assigned.trim()) {
        users.add(assigned);
      } else if (typeof assigned === 'object' && assigned !== null) {
        const identity = assigned as AzureIdentity;
        if (identity.displayName) users.add(identity.displayName);
      }
    });
    return Array.from(users);
  }, [workItems]);

  // Filter & Sort Work Items
  const filteredWorkItems = useMemo(() => {
    return workItems.filter((item) => {
      const fields = item.fields;
      const idStr = fields['System.Id'].toString();
      const title = (fields['System.Title'] || '').toLowerCase();
      const state = (fields['System.State'] || '').toString();
      const type = (fields['System.WorkItemType'] || '').toString();
      const priority = (fields['System.Priority'] || fields['Microsoft.VSTS.Common.Priority'] || '').toString();
      
      let assignedName = 'Unassigned';
      const assignedObj = fields['System.AssignedTo'];
      if (typeof assignedObj === 'string') assignedName = assignedObj;
      else if (typeof assignedObj === 'object' && assignedObj !== null) {
        assignedName = (assignedObj as AzureIdentity).displayName || 'Unassigned';
      }

      // Search match
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = !query || idStr.includes(query) || title.includes(query);

      // State match
      let matchesState = true;
      if (selectedStateFilter !== 'ALL') {
        if (selectedStateFilter === 'New') matchesState = ['new', 'to do'].includes(state.toLowerCase());
        else if (selectedStateFilter === 'Active') matchesState = ['active', 'in progress'].includes(state.toLowerCase());
        else if (selectedStateFilter === 'Resolved') matchesState = state.toLowerCase() === 'resolved';
        else if (selectedStateFilter === 'Closed') matchesState = ['closed', 'done'].includes(state.toLowerCase());
        else if (selectedStateFilter === 'Blocked') matchesState = state.toLowerCase() === 'blocked';
        else matchesState = state.toLowerCase() === selectedStateFilter.toLowerCase();
      }

      // Type match
      const matchesType = typeFilter === 'ALL' || type.toLowerCase() === typeFilter.toLowerCase();

      // Priority match
      const matchesPriority = priorityFilter === 'ALL' || priority === priorityFilter;

      // Assigned match
      const matchesAssigned = assignedFilter === 'ALL' || assignedName === assignedFilter;

      // Date range match
      let matchesDate = true;
      const targetDateStr =
        dateFilterType === 'changedDate' ? fields['System.ChangedDate'] : fields['System.CreatedDate'];
      if (targetDateStr && (startDate || endDate)) {
        const itemDate = new Date(targetDateStr);
        if (!isNaN(itemDate.getTime())) {
          if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            if (itemDate < start) matchesDate = false;
          }
          if (endDate && matchesDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (itemDate > end) matchesDate = false;
          }
        }
      }

      return matchesSearch && matchesState && matchesType && matchesPriority && matchesAssigned && matchesDate;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'changedDate') {
        const dateA = new Date(a.fields['System.ChangedDate']).getTime();
        const dateB = new Date(b.fields['System.ChangedDate']).getTime();
        comparison = dateA - dateB;
      } else if (sortBy === 'id') {
        comparison = a.id - b.id;
      } else if (sortBy === 'title') {
        comparison = a.fields['System.Title'].localeCompare(b.fields['System.Title']);
      } else if (sortBy === 'priority') {
        const pA = (a.fields['System.Priority'] || 99) as number;
        const pB = (b.fields['System.Priority'] || 99) as number;
        comparison = pA - pB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [
    workItems,
    searchQuery,
    selectedStateFilter,
    typeFilter,
    priorityFilter,
    assignedFilter,
    startDate,
    endDate,
    dateFilterType,
    sortBy,
    sortOrder
  ]);

  const paginatedItems = useMemo(() => {
    return filteredWorkItems.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filteredWorkItems, page, rowsPerPage]);

  const handleSort = (field: 'changedDate' | 'id' | 'title' | 'priority') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getWorkItemTypeIcon = (type: WorkItemType | string) => {
    switch (type.toLowerCase()) {
      case 'bug':
        return <BugReportIcon sx={{ color: '#f43f5e', fontSize: 18 }} />;
      case 'task':
        return <CheckBoxIcon sx={{ color: '#00b4d8', fontSize: 18 }} />;
      case 'user story':
        return <MenuBookIcon sx={{ color: '#38bdf8', fontSize: 18 }} />;
      case 'feature':
        return <AutoAwesomeIcon sx={{ color: '#8b5cf6', fontSize: 18 }} />;
      case 'epic':
        return <StarsIcon sx={{ color: '#f59e0b', fontSize: 18 }} />;
      default:
        return <HelpOutlinedIcon sx={{ color: '#64748b', fontSize: 18 }} />;
    }
  };

  const getStateChip = (state: string) => {
    const s = state.toLowerCase();
    let dotColor = '#94a3b8';
    let labelColor = 'text.primary';
    let bgColor = 'rgba(148, 163, 184, 0.12)';

    if (s === 'new' || s === 'to do') {
      dotColor = '#38bdf8';
      bgColor = 'rgba(56, 189, 248, 0.12)';
    } else if (s === 'active' || s === 'in progress') {
      dotColor = '#f59e0b';
      bgColor = 'rgba(245, 158, 11, 0.12)';
    } else if (s === 'resolved') {
      dotColor = '#8b5cf6';
      bgColor = 'rgba(139, 92, 246, 0.12)';
    } else if (s === 'closed' || s === 'done') {
      dotColor = '#10b981';
      bgColor = 'rgba(16, 185, 129, 0.12)';
    } else if (s === 'blocked') {
      dotColor = '#f43f5e';
      bgColor = 'rgba(244, 63, 94, 0.12)';
    }

    return (
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          py: 0.4,
          borderRadius: 2,
          bgcolor: bgColor,
        }}
      >
        <Box
          sx={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            bgcolor: dotColor,
            boxShadow: `0 0 6px ${dotColor}`,
          }}
        />
        <Typography variant="caption" sx={{ fontWeight: 700, color: labelColor }}>
          {state}
        </Typography>
      </Box>
    );
  };

  const getPriorityChip = (pVal: string | number) => {
    const str = String(pVal);
    if (str === '1') {
      return (
        <Chip
          icon={<WhatshotIcon sx={{ fontSize: '0.9rem !important', color: '#f43f5e !important' }} />}
          label="P1 High"
          size="small"
          sx={{ fontWeight: 800, bgcolor: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.3)' }}
        />
      );
    }
    if (str === '2') {
      return (
        <Chip
          label="P2 Med"
          size="small"
          sx={{ fontWeight: 700, bgcolor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' }}
        />
      );
    }
    return (
      <Chip
        label={`P${str}`}
        size="small"
        variant="outlined"
        sx={{ fontWeight: 600, height: 22 }}
      />
    );
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const hasActiveDateFilter = !!startDate || !!endDate;

  return (
    <Card sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
      {/* Search & Filter Toolbar */}
      <Box sx={{ p: { xs: 1.5, sm: 2.5 }, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 1.25, sm: 2 }, alignItems: 'center', justifyContent: 'space-between' }}>
          <TextField
            placeholder="Search by Work Item ID or Title..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            size="small"
            sx={{ minWidth: { xs: '100%', sm: 260 }, width: { xs: '100%', md: 'auto' }, flexGrow: 1 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#00b4d8' }} />
                  </InputAdornment>
                ),
              }
            }}
          />

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 1, sm: 1.5 }, alignItems: 'center', width: { xs: '100%', md: 'auto' } }}>
            <FilterListIcon color="action" sx={{ display: { xs: 'none', sm: 'inline-block' } }} />

            {/* State Filter */}
            <TextField
              select
              size="small"
              label="State"
              value={selectedStateFilter}
              onChange={(e) => {
                if (onSelectStateFilter) onSelectStateFilter(e.target.value);
                setPage(0);
              }}
              sx={{ minWidth: { xs: 'calc(50% - 6px)', sm: 120 }, flex: { xs: '1 1 calc(50% - 6px)', sm: 'initial' } }}
            >
              <MenuItem value="ALL">All States</MenuItem>
              <MenuItem value="New">New / To Do</MenuItem>
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Resolved">Resolved</MenuItem>
              <MenuItem value="Closed">Closed</MenuItem>
              <MenuItem value="Blocked">Blocked</MenuItem>
            </TextField>

            {/* Type Filter */}
            <TextField
              select
              size="small"
              label="Type"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(0);
              }}
              sx={{ minWidth: { xs: 'calc(50% - 6px)', sm: 120 }, flex: { xs: '1 1 calc(50% - 6px)', sm: 'initial' } }}
            >
              <MenuItem value="ALL">All Types</MenuItem>
              <MenuItem value="Task">Task</MenuItem>
              <MenuItem value="Bug">Bug</MenuItem>
              <MenuItem value="User Story">User Story</MenuItem>
              <MenuItem value="Feature">Feature</MenuItem>
            </TextField>

            {/* Priority Filter */}
            <TextField
              select
              size="small"
              label="Priority"
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(0);
              }}
              sx={{ minWidth: { xs: 'calc(50% - 6px)', sm: 100 }, flex: { xs: '1 1 calc(50% - 6px)', sm: 'initial' } }}
            >
              <MenuItem value="ALL">All</MenuItem>
              <MenuItem value="1">P1 - High</MenuItem>
              <MenuItem value="2">P2 - Med</MenuItem>
              <MenuItem value="3">P3 - Low</MenuItem>
              <MenuItem value="4">P4 - Low</MenuItem>
            </TextField>

            {/* Assigned Filter */}
            <TextField
              select
              size="small"
              label="Assigned To"
              value={assignedFilter}
              onChange={(e) => {
                setAssignedFilter(e.target.value);
                setPage(0);
              }}
              sx={{ minWidth: { xs: 'calc(50% - 6px)', sm: 140 }, flex: { xs: '1 1 calc(50% - 6px)', sm: 'initial' } }}
            >
              <MenuItem value="ALL">All Users</MenuItem>
              {assignedUsers.map((user) => (
                <MenuItem key={user} value={user}>
                  {user}
                </MenuItem>
              ))}
            </TextField>

            {/* Date Range Toggle Button */}
            <Tooltip title="Filter by date range">
              <Button
                variant={hasActiveDateFilter ? 'contained' : 'outlined'}
                color={hasActiveDateFilter ? 'info' : 'inherit'}
                size="medium"
                onClick={() => setIsDateFilterOpen(!isDateFilterOpen)}
                startIcon={<DateRangeIcon />}
                sx={{
                  height: 40,
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: 2,
                  px: 1.8,
                  minWidth: { xs: 'calc(50% - 6px)', sm: 'auto' },
                  flex: { xs: '1 1 calc(50% - 6px)', sm: 'initial' },
                  borderColor: hasActiveDateFilter ? undefined : 'divider',
                  bgcolor: hasActiveDateFilter ? 'rgba(0, 180, 216, 0.15)' : undefined,
                  color: hasActiveDateFilter ? '#00b4d8' : 'text.primary',
                  '&:hover': {
                    borderColor: '#00b4d8',
                    bgcolor: hasActiveDateFilter ? 'rgba(0, 180, 216, 0.25)' : 'action.hover'
                  }
                }}
              >
                Date Range
                {hasActiveDateFilter && (
                  <Box
                    component="span"
                    sx={{
                      ml: 1,
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      bgcolor: '#00b4d8',
                      display: 'inline-block'
                    }}
                  />
                )}
              </Button>
            </Tooltip>

            {/* Export to Excel Button */}
            <Button
              variant="contained"
              size="medium"
              startIcon={<FileDownloadIcon />}
              onClick={() => setIsExportDialogOpen(true)}
              sx={{
                bgcolor: '#00b4d8',
                '&:hover': { bgcolor: '#0096c7' },
                fontWeight: 800,
                textTransform: 'none',
                height: 40,
                px: 2.2,
                minWidth: { xs: 'calc(50% - 6px)', sm: 'auto' },
                flex: { xs: '1 1 calc(50% - 6px)', sm: 'initial' },
                borderRadius: 2,
                boxShadow: '0 4px 14px rgba(0, 180, 216, 0.25)'
              }}
            >
              Export
            </Button>

            {/* View Mode Toggle: Cards vs Table */}
            <Tooltip title={viewMode === 'cards' ? 'Switch to Table View' : (viewMode === 'table' ? 'Switch to Card View' : 'Toggle Card/Table View')}>
              <IconButton
                size="small"
                onClick={() =>
                  setViewMode((prev) => (prev === 'cards' ? 'table' : prev === 'table' ? 'cards' : 'cards'))
                }
                sx={{
                  bgcolor: 'action.hover',
                  borderRadius: 2,
                  p: 0.8,
                  height: 40,
                  width: 40,
                  border: '1px solid',
                  borderColor: 'divider',
                  color: '#00b4d8'
                }}
              >
                {viewMode === 'cards' ? <ViewListIcon fontSize="small" /> : <ViewModuleIcon fontSize="small" />}
              </IconButton>
            </Tooltip>

            {/* Discreet Info Icon for Secret Workspace Switcher */}
            <Tooltip title="Table Properties">
              <IconButton
                size="small"
                onClick={() => setIsSecretDialogOpen(true)}
                sx={{
                  color: 'text.disabled',
                  opacity: 0.4,
                  p: 0.8,
                  height: 40,
                  width: 40,
                  borderRadius: 2,
                  transition: 'opacity 0.2s',
                  '&:hover': {
                    opacity: 1,
                    color: 'text.secondary',
                    bgcolor: 'action.hover'
                  }
                }}
              >
                <InfoOutlinedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Expandable Date Range Filter Bar */}
        <Collapse in={isDateFilterOpen || hasActiveDateFilter}>
          <Box
            sx={{
              mt: 2,
              pt: 2,
              borderTop: '1px dashed',
              borderColor: 'divider',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1.5,
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', width: { xs: '100%', md: 'auto' } }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Filter By Date:
              </Typography>

              {/* Date target selector */}
              <TextField
                select
                size="small"
                value={dateFilterType}
                onChange={(e) => {
                  setDateFilterType(e.target.value as 'changedDate' | 'createdDate');
                  setPage(0);
                }}
                sx={{ minWidth: { xs: '100%', sm: 150 }, width: { xs: '100%', sm: 'auto' } }}
              >
                <MenuItem value="changedDate">Updated Date</MenuItem>
                <MenuItem value="createdDate">Created Date</MenuItem>
              </TextField>

              {/* Start Date */}
              <TextField
                label="From Date"
                type="date"
                size="small"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(0);
                }}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ width: { xs: 'calc(50% - 6px)', sm: 155 }, flex: { xs: '1 1 calc(50% - 6px)', sm: 'initial' } }}
              />

              {/* End Date */}
              <TextField
                label="To Date"
                type="date"
                size="small"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(0);
                }}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ width: { xs: 'calc(50% - 6px)', sm: 155 }, flex: { xs: '1 1 calc(50% - 6px)', sm: 'initial' } }}
              />

              {/* Clear button */}
              {hasActiveDateFilter && (
                <Tooltip title="Clear Date Filter">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                      setPage(0);
                    }}
                    sx={{ color: '#f43f5e' }}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>

            {/* Quick Presets */}
            <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                Presets:
              </Typography>
              <Chip
                label="All Time"
                size="small"
                onClick={() => handleApplyDatePreset('all')}
                variant={!hasActiveDateFilter ? 'filled' : 'outlined'}
                color={!hasActiveDateFilter ? 'primary' : 'default'}
                sx={{ cursor: 'pointer', height: 24, fontSize: '0.75rem' }}
              />
              <Chip
                label="Today"
                size="small"
                onClick={() => handleApplyDatePreset('today')}
                variant="outlined"
                sx={{ cursor: 'pointer', height: 24, fontSize: '0.75rem' }}
              />
              <Chip
                label="Last 7 Days"
                size="small"
                onClick={() => handleApplyDatePreset('7days')}
                variant="outlined"
                sx={{ cursor: 'pointer', height: 24, fontSize: '0.75rem' }}
              />
              <Chip
                label="Last 30 Days"
                size="small"
                onClick={() => handleApplyDatePreset('30days')}
                variant="outlined"
                sx={{ cursor: 'pointer', height: 24, fontSize: '0.75rem' }}
              />
              <Chip
                label="This Month"
                size="small"
                onClick={() => handleApplyDatePreset('thisMonth')}
                variant="outlined"
                sx={{ cursor: 'pointer', height: 24, fontSize: '0.75rem' }}
              />
            </Box>
          </Box>
        </Collapse>
      </Box>

      {/* Mobile Cards List View (Visible on xs screens by default, or toggled via switcher) */}
      <Box sx={{ display: viewMode === 'table' ? 'none' : (viewMode === 'cards' ? 'block' : { xs: 'block', sm: 'none' }), p: { xs: 1.5, sm: 2 } }}>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <Paper key={idx} variant="outlined" sx={{ p: 2, mb: 1.5, borderRadius: 2.5 }}>
              <Skeleton width="40%" height={24} sx={{ mb: 1 }} />
              <Skeleton width="90%" height={20} sx={{ mb: 1 }} />
              <Skeleton width="60%" height={18} />
            </Paper>
          ))
        ) : paginatedItems.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderStyle: 'dashed', borderRadius: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700 }}>
              No work items found
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Try clearing filters or search query
            </Typography>
          </Paper>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {paginatedItems.map((item) => {
              const fields = item.fields;
              const type = fields['System.WorkItemType'] || 'Task';
              const state = fields['System.State'] || 'New';
              const priority = fields['System.Priority'] || fields['Microsoft.VSTS.Common.Priority'] || '-';
              const sprint = fields['System.IterationPath']?.split('\\').pop() || 'Unassigned';

              let assignedName = 'Unassigned';
              let avatarUrl = '';
              const assignedObj = fields['System.AssignedTo'];
              if (typeof assignedObj === 'string') assignedName = assignedObj;
              else if (typeof assignedObj === 'object' && assignedObj !== null) {
                const identity = assignedObj as AzureIdentity;
                assignedName = identity.displayName || 'Unassigned';
                avatarUrl = identity.imageUrl || '';
              }

              const spentHours = Number(
                fields['Custom.SpentHours'] ??
                fields['Microsoft.VSTS.Scheduling.CompletedWork'] ??
                0
              );

              const isAddedOnTasquee = addedTasqueeIds.includes(item.id) || Boolean(item.fields['Custom.CardId']);

              return (
                <Paper
                  key={item.id}
                  variant="outlined"
                  onClick={() => dispatch(selectWorkItem(item))}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:hover': {
                      borderColor: '#00b4d8',
                      boxShadow: '0 4px 16px rgba(0, 180, 216, 0.12)',
                      transform: 'translateY(-2px)'
                    }
                  }}
                >
                  {/* Top row: ID, Type, State, Priority */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.2, gap: 1, flexWrap: 'wrap' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                      <Chip
                        label={`#${item.id}`}
                        size="small"
                        sx={{ fontWeight: 800, bgcolor: 'rgba(0, 180, 216, 0.12)', color: '#0077b6', borderRadius: 1.5, height: 24, fontSize: '0.75rem' }}
                      />
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 0.8, py: 0.2, borderRadius: 1.5, bgcolor: 'action.hover' }}>
                        {getWorkItemTypeIcon(type)}
                        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>{type}</Typography>
                      </Box>
                      {getStateChip(state)}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {getPriorityChip(priority)}
                    </Box>
                  </Box>

                  {/* Task Title */}
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.35, mb: 1.2, fontSize: '0.88rem' }}>
                    {fields['System.Title']}
                  </Typography>

                  {/* Action Badges Row: Tasquee integration & Hours */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', mb: 1.2, pt: 0.5 }}>
                    {/* Tasquee Add Button */}
                    {activeOrg === 'safbsdev' && item.id > 173 && (
                      isAddedOnTasquee ? (
                        <Chip
                          size="small"
                          icon={<CheckCircleIcon sx={{ fontSize: '13px !important', color: '#15803d !important' }} />}
                          label="Added on Tasquee"
                          sx={{
                            height: 24,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            bgcolor: '#dcfce7',
                            color: '#15803d',
                            border: '1px solid #86efac',
                            borderRadius: 1.5,
                          }}
                        />
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={addingTaskId === item.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToTasquee(item);
                          }}
                          startIcon={
                            addingTaskId === item.id ? (
                              <CircularProgress size={12} color="inherit" />
                            ) : (
                              <AutoAwesomeIcon sx={{ fontSize: '13px !important' }} />
                            )
                          }
                          sx={{
                            height: 26,
                            py: 0,
                            px: 1,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            textTransform: 'none',
                            borderColor: '#00b4d8',
                            color: '#0077b6',
                            borderRadius: 1.5,
                            bgcolor: 'rgba(0, 180, 216, 0.05)',
                          }}
                        >
                          {addingTaskId === item.id ? 'Adding...' : '+ Add on Tasquee'}
                        </Button>
                      )
                    )}

                    {/* Hours badge & + Log button */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, ml: 'auto' }}>
                      {spentHours > 0 && (
                        <Chip
                          icon={<AccessTimeIcon sx={{ fontSize: '0.8rem !important', color: '#854d0e !important' }} />}
                          label={`${spentHours.toFixed(1)}h`}
                          size="small"
                          sx={{
                            fontWeight: 800,
                            fontSize: '0.72rem',
                            bgcolor: '#fef9c3',
                            color: '#854d0e',
                            border: '1px solid #fde047',
                            height: 24,
                            borderRadius: 1.5
                          }}
                        />
                      )}
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLogHoursTask(item);
                          setIsLogHoursOpen(true);
                        }}
                        startIcon={<AccessTimeIcon sx={{ fontSize: '12px !important' }} />}
                        sx={{
                          height: 24,
                          py: 0,
                          px: 0.8,
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          textTransform: 'none',
                          borderRadius: 1.5,
                          borderColor: 'divider',
                          color: 'text.secondary',
                          '&:hover': {
                            borderColor: '#00b4d8',
                            color: '#0077b6',
                            bgcolor: 'rgba(0, 180, 216, 0.08)'
                          }
                        }}
                      >
                        + Log
                      </Button>
                    </Box>
                  </Box>

                  {/* Bottom Meta Bar: Assigned user, Sprint & View */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1, borderTop: '1px solid', borderColor: 'divider', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, minWidth: 0 }}>
                      <Avatar
                        src={avatarUrl}
                        sx={{ width: 22, height: 22, fontSize: '0.7rem', bgcolor: '#00b4d8' }}
                      >
                        {assignedName.charAt(0).toUpperCase()}
                      </Avatar>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 }}>
                        {assignedName}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>
                        {sprint}
                      </Typography>
                      <IconButton size="small" sx={{ p: 0.25, color: '#00b4d8' }}>
                        <VisibilityIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  </Box>
                </Paper>
              );
            })}
          </Box>
        )}
      </Box>

      {/* Desktop/Tablet Table Content */}
      <TableContainer sx={{ display: viewMode === 'cards' ? 'none' : (viewMode === 'table' ? 'block' : { xs: 'none', sm: 'block' }), overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
        <Table sx={{ minWidth: 1050, width: '100%' }}>
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, width: 75 }} onClick={() => handleSort('id')} style={{ cursor: 'pointer' }}>
                ID {sortBy === 'id' && (sortOrder === 'asc' ? <ArrowUpwardIcon fontSize="inherit" /> : <ArrowDownwardIcon fontSize="inherit" />)}
              </TableCell>
              <TableCell sx={{ fontWeight: 800, minWidth: 240 }} onClick={() => handleSort('title')} style={{ cursor: 'pointer' }}>
                Title {sortBy === 'title' && (sortOrder === 'asc' ? <ArrowUpwardIcon fontSize="inherit" /> : <ArrowDownwardIcon fontSize="inherit" />)}
              </TableCell>
              <TableCell sx={{ fontWeight: 800, width: 145 }}>Tasquee</TableCell>
              <TableCell sx={{ fontWeight: 800, width: 100 }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 800, width: 115 }}>State</TableCell>
              <TableCell sx={{ fontWeight: 800, width: 160, textAlign: 'right' }}>Spent Hours</TableCell>
              <TableCell sx={{ fontWeight: 800, width: 140 }}>Assigned To</TableCell>
              <TableCell sx={{ fontWeight: 800, width: 90 }} onClick={() => handleSort('priority')} style={{ cursor: 'pointer' }}>
                Priority {sortBy === 'priority' && (sortOrder === 'asc' ? <ArrowUpwardIcon fontSize="inherit" /> : <ArrowDownwardIcon fontSize="inherit" />)}
              </TableCell>
              <TableCell sx={{ fontWeight: 800, width: 105 }} onClick={() => handleSort('changedDate')} style={{ cursor: 'pointer' }}>
                Updated {sortBy === 'changedDate' && (sortOrder === 'asc' ? <ArrowUpwardIcon fontSize="inherit" /> : <ArrowDownwardIcon fontSize="inherit" />)}
              </TableCell>
              <TableCell sx={{ fontWeight: 800, width: 100 }}>Sprint</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, width: 55 }}>View</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <TableRow key={idx}>
                  <TableCell><Skeleton width={40} /></TableCell>
                  <TableCell><Skeleton width={200} /></TableCell>
                  <TableCell><Skeleton width={110} /></TableCell>
                  <TableCell><Skeleton width={70} /></TableCell>
                  <TableCell><Skeleton width={80} /></TableCell>
                  <TableCell><Skeleton width={100} /></TableCell>
                  <TableCell><Skeleton width={110} /></TableCell>
                  <TableCell><Skeleton width={50} /></TableCell>
                  <TableCell><Skeleton width={80} /></TableCell>
                  <TableCell><Skeleton width={80} /></TableCell>
                  <TableCell><Skeleton width={30} /></TableCell>
                </TableRow>
              ))
            ) : paginatedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} align="center" sx={{ py: 6 }}>
                  <Paper variant="outlined" sx={{ p: 4, display: 'inline-block', borderStyle: 'dashed', borderRadius: 3 }}>
                    <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 700 }}>
                      No work items found
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Try clearing your search query or modifying date/state filters.
                    </Typography>
                    {hasActiveDateFilter && (
                      <Button
                        size="small"
                        onClick={() => {
                          setStartDate('');
                          setEndDate('');
                        }}
                        sx={{ mt: 1.5 }}
                      >
                        Clear Date Range
                      </Button>
                    )}
                  </Paper>
                </TableCell>
              </TableRow>
            ) : (
              paginatedItems.map((item) => {
                const fields = item.fields;
                const type = fields['System.WorkItemType'] || 'Task';
                const state = fields['System.State'] || 'New';
                const priority = fields['System.Priority'] || fields['Microsoft.VSTS.Common.Priority'] || '-';
                const sprint = fields['System.IterationPath']?.split('\\').pop() || 'Unassigned';

                let assignedName = 'Unassigned';
                let avatarUrl = '';
                const assignedObj = fields['System.AssignedTo'];
                if (typeof assignedObj === 'string') assignedName = assignedObj;
                else if (typeof assignedObj === 'object' && assignedObj !== null) {
                  const identity = assignedObj as AzureIdentity;
                  assignedName = identity.displayName || 'Unassigned';
                  avatarUrl = identity.imageUrl || '';
                }

                const isAddedOnTasquee = addedTasqueeIds.includes(item.id) || Boolean(item.fields['Custom.CardId']);

                return (
                  <TableRow
                    key={item.id}
                    hover
                    onClick={() => dispatch(selectWorkItem(item))}
                    sx={{
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease',
                      '&:hover': {
                        bgcolor: (theme) =>
                          theme.palette.mode === 'dark' ? 'rgba(0, 180, 216, 0.06)' : 'rgba(0, 180, 216, 0.04)',
                      }
                    }}
                  >
                    <TableCell sx={{ fontWeight: 800, color: '#00b4d8', whiteSpace: 'nowrap' }}>
                      #{item.id}
                    </TableCell>

                    {/* Title Cell */}
                    <TableCell sx={{ fontWeight: 600 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', lineHeight: 1.35 }}>
                        {fields['System.Title']}
                      </Typography>
                      {fields['System.Tags'] && (
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                          {fields['System.Tags'].split(';').map((tag) => (
                            <Chip key={tag} label={tag.trim()} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 18, borderRadius: 1 }} />
                          ))}
                        </Box>
                      )}
                    </TableCell>

                    {/* Dedicated Tasquee Column */}
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {activeOrg === 'safbsdev' && item.id > 173 ? (
                        isAddedOnTasquee ? (
                          <Chip
                            size="small"
                            icon={<CheckCircleIcon sx={{ fontSize: '13px !important', color: '#15803d !important' }} />}
                            label="Added on Tasquee"
                            sx={{
                              height: 24,
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              bgcolor: '#dcfce7',
                              color: '#15803d',
                              border: '1px solid #86efac',
                              borderRadius: 1.5,
                            }}
                          />
                        ) : (
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={addingTaskId === item.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToTasquee(item);
                            }}
                            startIcon={
                              addingTaskId === item.id ? (
                                <CircularProgress size={12} color="inherit" />
                              ) : (
                                <AutoAwesomeIcon sx={{ fontSize: '13px !important' }} />
                              )
                            }
                            sx={{
                              height: 26,
                              py: 0,
                              px: 1,
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              textTransform: 'none',
                              borderColor: '#00b4d8',
                              color: '#0077b6',
                              borderRadius: 1.5,
                              bgcolor: 'rgba(0, 180, 216, 0.05)',
                              whiteSpace: 'nowrap',
                              '&:hover': {
                                bgcolor: 'rgba(0, 180, 216, 0.15)',
                                borderColor: '#0077b6',
                              }
                            }}
                          >
                            {addingTaskId === item.id ? 'Adding...' : '+ Add on Tasquee'}
                          </Button>
                        )
                      ) : (
                        <Typography variant="caption" color="text.disabled">-</Typography>
                      )}
                    </TableCell>

                    {/* Type Cell */}
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                        {getWorkItemTypeIcon(type)}
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{type}</Typography>
                      </Box>
                    </TableCell>

                    {/* State Cell */}
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {getStateChip(state)}
                    </TableCell>

                    {/* Spent Hours Cell */}
                    <TableCell sx={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.8 }}>
                        {(() => {
                          const spentHours =
                            fields['Custom.SpentHours'] ??
                            fields['Microsoft.VSTS.Scheduling.CompletedWork'];
                          const hasHours =
                            spentHours !== undefined &&
                            spentHours !== null &&
                            spentHours !== '' &&
                            Number(spentHours) > 0;

                          if (hasHours) {
                            return (
                              <Box
                                sx={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 0.5,
                                  px: 1,
                                  py: 0.3,
                                  bgcolor: '#fef9c3',
                                  color: '#854d0e',
                                  borderRadius: 1.5,
                                  border: '1px solid #fde047',
                                  fontWeight: 800,
                                  fontSize: '0.75rem',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                <AccessTimeIcon sx={{ fontSize: 13, color: '#ca8a04' }} />
                                {Number(spentHours).toFixed(2)} hrs
                              </Box>
                            );
                          }
                          return (
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                              -
                            </Typography>
                          );
                        })()}

                        {/* Clean + Log Button */}
                        <Tooltip title="Log hours on this task">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLogHoursTask(item);
                              setIsLogHoursOpen(true);
                            }}
                            startIcon={<AccessTimeIcon sx={{ fontSize: '13px !important' }} />}
                            sx={{
                              height: 26,
                              py: 0,
                              px: 1,
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              textTransform: 'none',
                              borderColor: 'rgba(0, 180, 216, 0.4)',
                              color: '#0077b6',
                              borderRadius: 1.5,
                              bgcolor: 'rgba(0, 180, 216, 0.05)',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                              '&:hover': {
                                bgcolor: 'rgba(0, 180, 216, 0.15)',
                                borderColor: '#0077b6',
                              }
                            }}
                          >
                            + Log
                          </Button>
                        </Tooltip>
                      </Box>
                    </TableCell>

                    {/* Assigned To Cell */}
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                        <Avatar src={avatarUrl} sx={{ width: 24, height: 24, fontSize: '0.72rem', bgcolor: '#00b4d8' }}>
                          {assignedName.charAt(0).toUpperCase()}
                        </Avatar>
                        <Typography variant="body2" noWrap sx={{ fontWeight: 600, fontSize: '0.82rem', maxWidth: 120 }}>
                          {assignedName}
                        </Typography>
                      </Box>
                    </TableCell>

                    {/* Priority Cell */}
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {getPriorityChip(priority)}
                    </TableCell>

                    {/* Updated Date Cell */}
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                        {formatDate(fields['System.ChangedDate'])}
                      </Typography>
                    </TableCell>

                    {/* Sprint Cell */}
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                        {sprint}
                      </Typography>
                    </TableCell>

                    {/* View Action Cell */}
                    <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            dispatch(selectWorkItem(item));
                          }}
                          sx={{ color: '#00b4d8' }}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination Bar */}
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={filteredWorkItems.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          '.MuiTablePagination-toolbar': {
            flexWrap: 'wrap',
            justifyContent: { xs: 'center', sm: 'flex-end' },
            px: { xs: 1, sm: 2 },
            gap: { xs: 1, sm: 0 },
            py: { xs: 1, sm: 0.5 },
          },
          '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
          },
        }}
      />

      {/* Export to Excel / CSV Dialog */}
      <ExportTasksDialog
        open={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        workItems={filteredWorkItems}
        initialStartDate={startDate}
        initialEndDate={endDate}
        initialDateType={dateFilterType}
        onSuccess={(notification) => setSuccessNotification(notification)}
      />

      {/* Secret Authenticated Workspace Management Dialog */}
      <SecretWorkspaceDialog
        open={isSecretDialogOpen}
        onClose={() => setIsSecretDialogOpen(false)}
      />

      {/* Dedicated Tasquee Authorization Dialog */}
      <TasqueeAuthDialog
        open={isTasqueeAuthOpen}
        onClose={() => {
          setIsTasqueeAuthOpen(false);
          setPendingTasqueeItem(null);
          setTasqueeAuthError(null);
        }}
        pendingItem={pendingTasqueeItem}
        errorMessage={tasqueeAuthError}
        onAuthorized={(newToken) => {
          syncTasqueeCards(newToken);
          if (pendingTasqueeItem) {
            handleAddToTasquee(pendingTasqueeItem, newToken);
          }
        }}
      />

      {/* 1-Click Log Hours Dialog in PLP */}
      <LogHoursDialog
        open={isLogHoursOpen}
        onClose={() => {
          setIsLogHoursOpen(false);
          setLogHoursTask(null);
        }}
        workItem={logHoursTask}
        uncurlConfig={uncurlConfig}
        onSuccess={(newEntry, newTotal) => {
          if (logHoursTask) {
            logHoursTask.fields['Custom.SpentHours'] = newTotal;
            logHoursTask.fields['Microsoft.VSTS.Scheduling.CompletedWork'] = newTotal;
            dispatch(updateWorkItemSpentHours({ cardId: logHoursTask.id, spentHours: newTotal }));

            // Update React Query cache so table re-renders with new hours immediately
            queryClient.setQueriesData({ queryKey: ['workItems'] }, (oldData: WorkItem[] | undefined) => {
              if (!oldData || !Array.isArray(oldData)) return oldData;
              return oldData.map((item) => {
                if (item.id === logHoursTask.id) {
                  return {
                    ...item,
                    fields: {
                      ...item.fields,
                      'Custom.SpentHours': newTotal,
                      'Microsoft.VSTS.Scheduling.CompletedWork': newTotal,
                    },
                  };
                }
                return item;
              });
            });

            setSuccessNotification({
              title: 'Hours Logged Successfully!',
              message: `Successfully logged ${newEntry.hours} hrs on Task #${logHoursTask.id} (Total: ${newTotal.toFixed(2)} hrs).`,
              actionLabel: 'Open Tasquee',
              actionUrl: 'https://tasquee.syncglob.com/board/2a709fe2-47f7-4f9a-8d85-1a612711dfde'
            });
          }
        }}
        onNeedAuth={() => {
          setIsLogHoursOpen(false);
          setPendingTasqueeItem(logHoursTask);
          setIsTasqueeAuthOpen(true);
        }}
      />

      {/* Export & Google Sheet Sync Success Confirmation Notification */}
      <Snackbar
        open={Boolean(successNotification)}
        autoHideDuration={9000}
        onClose={() => setSuccessNotification(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ mt: 8 }}
      >
        <Alert
          onClose={() => setSuccessNotification(null)}
          severity="success"
          variant="filled"
          sx={{
            minWidth: 380,
            maxWidth: 640,
            bgcolor: '#356854', // Forest Green theme
            color: '#FFFFFF',
            boxShadow: '0 8px 32px rgba(53, 104, 84, 0.45)',
            borderRadius: 2.5,
            alignItems: 'center',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            '& .MuiAlert-icon': {
              color: '#FFFFFF',
              fontSize: 26,
            },
          }}
          action={
            successNotification?.actionUrl ? (
              <Button
                color="inherit"
                size="small"
                href={successNotification.actionUrl}
                target="_blank"
                rel="noopener noreferrer"
                endIcon={<OpenInNewIcon fontSize="inherit" />}
                sx={{
                  ml: 1.5,
                  fontWeight: 800,
                  textTransform: 'none',
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  color: '#FFFFFF',
                  px: 1.8,
                  py: 0.5,
                  borderRadius: 1.5,
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.35)',
                  },
                }}
              >
                {successNotification.actionLabel || 'Open Google Sheet'}
              </Button>
            ) : undefined
          }
        >
          <AlertTitle sx={{ fontWeight: 800, fontSize: '0.98rem', mb: 0.3, color: '#FFFFFF' }}>
            {successNotification?.title}
          </AlertTitle>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.95)', fontSize: '0.86rem' }}>
            {successNotification?.message}
          </Typography>
        </Alert>
      </Snackbar>
    </Card>
  );
};
