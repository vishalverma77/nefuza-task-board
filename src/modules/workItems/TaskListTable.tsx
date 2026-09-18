import React, { useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
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
  AlertTitle
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
import type { WorkItem, WorkItemType, AzureIdentity } from '../../types/azureDevOps';
import { selectWorkItem } from '../azureConnection/connectionSlice';
import { ExportTasksDialog, type ExportSuccessNotification } from './ExportTasksDialog';

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
  const [successNotification, setSuccessNotification] = useState<ExportSuccessNotification | null>(null);
  
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
      <Box sx={{ p: 2.5, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between' }}>
          <TextField
            placeholder="Search by Work Item ID or Title..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            size="small"
            sx={{ minWidth: 260, flexGrow: 1 }}
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

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
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
              sx={{ minWidth: 120 }}
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
              sx={{ minWidth: 120 }}
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
              sx={{ minWidth: 100 }}
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
              sx={{ minWidth: 140 }}
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
                borderRadius: 2,
                boxShadow: '0 4px 14px rgba(0, 180, 216, 0.25)'
              }}
            >
              Export to Excel
            </Button>
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
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
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
                sx={{ minWidth: 150 }}
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
                sx={{ width: 155 }}
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
                sx={{ width: 155 }}
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

      {/* Table Content */}
      <TableContainer>
        <Table sx={{ minWidth: 900 }}>
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, width: 90 }} onClick={() => handleSort('id')} style={{ cursor: 'pointer' }}>
                ID {sortBy === 'id' && (sortOrder === 'asc' ? <ArrowUpwardIcon fontSize="inherit" /> : <ArrowDownwardIcon fontSize="inherit" />)}
              </TableCell>
              <TableCell sx={{ fontWeight: 800 }} onClick={() => handleSort('title')} style={{ cursor: 'pointer' }}>
                Title {sortBy === 'title' && (sortOrder === 'asc' ? <ArrowUpwardIcon fontSize="inherit" /> : <ArrowDownwardIcon fontSize="inherit" />)}
              </TableCell>
              <TableCell sx={{ fontWeight: 800, width: 130 }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 800, width: 140 }}>State</TableCell>
              <TableCell sx={{ fontWeight: 800, width: 180 }}>Assigned To</TableCell>
              <TableCell sx={{ fontWeight: 800, width: 110 }} onClick={() => handleSort('priority')} style={{ cursor: 'pointer' }}>
                Priority {sortBy === 'priority' && (sortOrder === 'asc' ? <ArrowUpwardIcon fontSize="inherit" /> : <ArrowDownwardIcon fontSize="inherit" />)}
              </TableCell>
              <TableCell sx={{ fontWeight: 800, width: 130 }} onClick={() => handleSort('changedDate')} style={{ cursor: 'pointer' }}>
                Updated {sortBy === 'changedDate' && (sortOrder === 'asc' ? <ArrowUpwardIcon fontSize="inherit" /> : <ArrowDownwardIcon fontSize="inherit" />)}
              </TableCell>
              <TableCell sx={{ fontWeight: 800, width: 130 }}>Sprint</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, width: 80 }}>View</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <TableRow key={idx}>
                  <TableCell><Skeleton width={40} /></TableCell>
                  <TableCell><Skeleton width={250} /></TableCell>
                  <TableCell><Skeleton width={80} /></TableCell>
                  <TableCell><Skeleton width={70} /></TableCell>
                  <TableCell><Skeleton width={120} /></TableCell>
                  <TableCell><Skeleton width={30} /></TableCell>
                  <TableCell><Skeleton width={80} /></TableCell>
                  <TableCell><Skeleton width={90} /></TableCell>
                  <TableCell><Skeleton width={40} /></TableCell>
                </TableRow>
              ))
            ) : paginatedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
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
                    <TableCell sx={{ fontWeight: 800, color: '#00b4d8' }}>
                      #{item.id}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        {fields['System.Title']}
                      </Typography>
                      {fields['System.Tags'] && (
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.6 }}>
                          {fields['System.Tags'].split(';').map((tag) => (
                            <Chip key={tag} label={tag.trim()} size="small" variant="outlined" sx={{ fontSize: '0.68rem', height: 18, borderRadius: 1 }} />
                          ))}
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getWorkItemTypeIcon(type)}
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{type}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{getStateChip(state)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar src={avatarUrl} sx={{ width: 26, height: 26, fontSize: '0.8rem', bgcolor: '#00b4d8', fontWeight: 700 }}>
                          {assignedName.charAt(0)}
                        </Avatar>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 120, fontWeight: 500 }}>
                          {assignedName}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{getPriorityChip(priority)}</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                      {formatDate(fields['System.ChangedDate'])}
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                      {sprint}
                    </TableCell>
                    <TableCell align="center">
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
