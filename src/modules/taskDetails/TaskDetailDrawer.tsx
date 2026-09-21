import React, { useState, useMemo, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Button,
  Chip,
  Tabs,
  Tab,
  Grid,
  Avatar,
  Paper,
  CircularProgress,
  Tooltip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LaunchIcon from '@mui/icons-material/Launch';
import HistoryIcon from '@mui/icons-material/History';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import TagIcon from '@mui/icons-material/Tag';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { RootState } from '../../app/store';
import { closeDrawer, updateWorkItemSpentHours, updateWorkItemDescription } from '../azureConnection/connectionSlice';
import { fetchWorkItemHistory } from '../../services/azureDevOpsApi';
import { fetchUncurlCardHours, normalizeDescription, findTasqueeCardForTask, DEFAULT_UNCURL_CONFIG } from '../../services/uncurlApi';
import { SafeHtmlViewer } from '../../components/common/SafeHtmlViewer';
import { LogHoursDialog } from './LogHoursDialog';
import { TasqueeAuthDialog } from '../tasqueeAuth/TasqueeAuthDialog';
import type { AzureIdentity, WorkItem } from '../../types/azureDevOps';

export const TaskDetailDrawer: React.FC = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { selectedWorkItem, drawerOpen, config, uncurlConfig, activeOrg } = useSelector(
    (state: RootState) => state.connection
  );
  const [activeTab, setActiveTab] = useState(0);
  const [isLogHoursOpen, setIsLogHoursOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [resolvedTasqueeUuid, setResolvedTasqueeUuid] = useState<string>('');

  const workItemId = selectedWorkItem?.id;
  const cardUuid = (selectedWorkItem?.fields['Custom.CardId'] as string) || (selectedWorkItem ? String(selectedWorkItem.id) : '');

  // Look up Tasquee card UUID when task is opened in Nefuza
  useEffect(() => {
    if (!selectedWorkItem) {
      setResolvedTasqueeUuid('');
      return;
    }
    const direct = (selectedWorkItem.fields['Custom.CardId'] as string) || '';
    if (direct && direct.includes('-')) {
      setResolvedTasqueeUuid(direct);
      return;
    }

    const effToken =
      uncurlConfig?.bearerToken ||
      (() => {
        try {
          const raw = localStorage.getItem('uncurl_health_session');
          return raw ? JSON.parse(raw).bearerToken : '';
        } catch {
          return '';
        }
      })();

    if (effToken) {
      findTasqueeCardForTask(selectedWorkItem.id, {
        organization: 'uncurl:health',
        requestUrl: DEFAULT_UNCURL_CONFIG.requestUrl,
        apiKey: uncurlConfig?.apiKey || DEFAULT_UNCURL_CONFIG.apiKey,
        bearerToken: effToken,
      }).then((res) => {
        if (res?.id) setResolvedTasqueeUuid(res.id);
      });
    }
  }, [selectedWorkItem, uncurlConfig]);

  const effectiveCardUuid = resolvedTasqueeUuid || (activeOrg === 'uncurl:health' ? cardUuid : '');

  // Fetch Revision History for Azure DevOps
  const { data: historyUpdates, isLoading: loadingHistory } = useQuery({
    queryKey: ['workItemHistory', config?.organization, config?.project, workItemId],
    queryFn: () => (config && workItemId ? fetchWorkItemHistory(config, workItemId) : Promise.resolve([])),
    enabled: !!config && !!workItemId && drawerOpen && activeOrg === 'safbsdev',
  });

  // Fetch Card Hours / Time Tracking Logs from Supabase card_hours (works for both Nefuza and Uncurl)
  const {
    data: cardHours = [],
    isLoading: loadingHours,
    isRefetching: refetchingHours,
    refetch: refetchHours,
  } = useQuery({
    queryKey: ['uncurlCardHours', effectiveCardUuid],
    queryFn: () => {
      const effToken =
        uncurlConfig?.bearerToken ||
        (() => {
          try {
            const raw = localStorage.getItem('uncurl_health_session');
            return raw ? JSON.parse(raw).bearerToken : '';
          } catch {
            return '';
          }
        })();

      if (!effToken || !effectiveCardUuid) return Promise.resolve([]);
      return fetchUncurlCardHours(effectiveCardUuid, {
        organization: 'uncurl:health',
        requestUrl: DEFAULT_UNCURL_CONFIG.requestUrl,
        apiKey: uncurlConfig?.apiKey || DEFAULT_UNCURL_CONFIG.apiKey,
        bearerToken: effToken,
      });
    },
    enabled: !!effectiveCardUuid && drawerOpen,
  });

  // Calculate total spent hours
  const totalSpentHours = useMemo(() => {
    if (cardHours && cardHours.length > 0) {
      return cardHours.reduce((sum, item) => sum + (Number(item.hours) || 0), 0);
    }
    const existing =
      selectedWorkItem?.fields['Custom.SpentHours'] ??
      selectedWorkItem?.fields['Microsoft.VSTS.Scheduling.CompletedWork'];
    return typeof existing === 'number' ? existing : Number(existing) || 0;
  }, [cardHours, selectedWorkItem]);

  // Effective description calculation: checks direct desc, Custom.RawCard, and cardHours time logs
  const effectiveDescription = useMemo(() => {
    // 1. Direct System.Description
    const directDesc = selectedWorkItem?.fields['System.Description'];
    if (directDesc) {
      const norm = normalizeDescription(directDesc);
      if (norm && norm.trim() && norm !== '<p><br></p>' && norm !== '<p></p>') {
        return norm;
      }
    }

    // 2. Custom.RawCard (original Supabase board_card record)
    const rawCard = selectedWorkItem?.fields['Custom.RawCard'] as Record<string, unknown> | undefined;
    if (rawCard) {
      for (const [k, v] of Object.entries(rawCard)) {
        const lk = k.toLowerCase();
        if (
          (lk.includes('desc') || lk.includes('detail') || lk.includes('content') || lk.includes('note') || lk.includes('summary') || lk.includes('body')) &&
          v !== null &&
          v !== undefined &&
          v !== ''
        ) {
          const fromRaw = normalizeDescription(v);
          if (fromRaw && fromRaw.trim() && fromRaw !== '<p><br></p>' && fromRaw !== '<p></p>') {
            return fromRaw;
          }
        }
      }
    }

    // 3. Fallback from cardHours time tracking descriptions
    if (cardHours && cardHours.length > 0) {
      const descs = cardHours
        .map((c) => c.description?.trim())
        .filter(Boolean);
      if (descs.length > 0) {
        const formatted = descs.map((d, i) => `${descs.length > 1 ? `${i + 1}. ` : ''}${d}`).join('\n');
        return normalizeDescription(formatted);
      }
    }

    return '';
  }, [selectedWorkItem, cardHours]);

  // Sync calculated total spent hours and fallback description for uncurl:health into Redux & cache
  useEffect(() => {
    if (!cardUuid || activeOrg !== 'uncurl:health') return;

    // 1. Sync spent hours if changed
    if (cardHours && cardHours.length > 0) {
      const sum = cardHours.reduce((acc, it) => acc + (Number(it.hours) || 0), 0);
      const currentHours = selectedWorkItem?.fields['Custom.SpentHours'];
      if (currentHours !== sum) {
        dispatch(updateWorkItemSpentHours({ cardId: cardUuid, spentHours: sum }));
      }
    }

    // 2. Sync description only if currently empty and effectiveDescription exists
    const currentDesc = selectedWorkItem?.fields['System.Description'];
    if (effectiveDescription && (!currentDesc || currentDesc.trim() === '' || currentDesc === '<p><br></p>')) {
      dispatch(updateWorkItemDescription({ cardId: cardUuid, description: effectiveDescription }));

      queryClient.setQueriesData({ queryKey: ['workItems'] }, (oldData: WorkItem[] | undefined) => {
        if (!oldData || !Array.isArray(oldData)) return oldData;
        return oldData.map((item) => {
          const itemCardId = String(item.fields['Custom.CardId'] || item.id);
          if (itemCardId === cardUuid) {
            return {
              ...item,
              fields: {
                ...item.fields,
                'System.Description': effectiveDescription,
              },
            };
          }
          return item;
        });
      });
    }
  }, [cardUuid, activeOrg, cardHours, effectiveDescription, dispatch, queryClient]);

  if (!selectedWorkItem) return null;

  const fields = selectedWorkItem.fields;
  const title = fields['System.Title'] || 'Untitled Work Item';
  const type = fields['System.WorkItemType'] || 'Task';
  const state = fields['System.State'] || 'New';
  const priority = fields['System.Priority'] || fields['Microsoft.VSTS.Common.Priority'] || 'Unassigned';
  const severity = fields['Microsoft.VSTS.Common.Severity'] || 'N/A';
  const areaPath = fields['System.AreaPath'] || 'Root';
  const iterationPath = fields['System.IterationPath'] || 'Unassigned';
  const createdDate = fields['System.CreatedDate'] ? new Date(fields['System.CreatedDate']).toLocaleString() : 'N/A';
  const changedDate = fields['System.ChangedDate'] ? new Date(fields['System.ChangedDate']).toLocaleString() : 'N/A';

  // Identity resolution
  const resolveIdentity = (identityObj?: unknown): { name: string; avatar: string } => {
    if (typeof identityObj === 'string') return { name: identityObj, avatar: '' };
    if (typeof identityObj === 'object' && identityObj !== null) {
      const id = identityObj as AzureIdentity;
      return { name: id.displayName || 'Unassigned', avatar: id.imageUrl || '' };
    }
    return { name: 'Unassigned', avatar: '' };
  };

  const assignedTo = resolveIdentity(fields['System.AssignedTo']);
  const createdBy = resolveIdentity(fields['System.CreatedBy']);

  // External Link URL (Azure DevOps or Tasquee)
  const externalUrl =
    activeOrg === 'uncurl:health'
      ? `https://tasquee.syncglob.com/board/2a709fe2-47f7-4f9a-8d85-1a612711dfde?card=${encodeURIComponent(cardUuid)}`
      : selectedWorkItem.url ||
        (config
          ? `https://dev.azure.com/${encodeURIComponent(config.organization)}/${encodeURIComponent(config.project)}/_workitems/edit/${selectedWorkItem.id}`
          : '#');

  const externalLabel = activeOrg === 'uncurl:health' ? 'Open in Tasquee' : 'Open in Azure DevOps';

  return (
    <Drawer
      anchor="right"
      open={drawerOpen}
      onClose={() => dispatch(closeDrawer())}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100%', sm: 580, md: 680 },
            p: 0,
            display: 'flex',
            flexDirection: 'column',
            backgroundImage: 'none',
          }
        }
      }}
    >
      {/* Top Header */}
      <Box
        sx={{
          p: { xs: 2, sm: 3 },
          pb: { xs: 1.5, sm: 2 },
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', flexShrink: 1 }}>
            <Chip
              label={`#${selectedWorkItem.id}`}
              sx={{ fontWeight: 800, bgcolor: '#00b4d8', color: '#fff', borderRadius: 2 }}
              size="small"
            />
            <Chip label={type} variant="outlined" size="small" sx={{ fontWeight: 700, borderRadius: 2 }} />
            <Chip label={state} size="small" color="info" sx={{ fontWeight: 700, borderRadius: 2 }} />
            {totalSpentHours > 0 && (
              <Chip
                icon={<AccessTimeIcon sx={{ fontSize: '0.85rem !important', color: '#854d0e !important' }} />}
                label={`${totalSpentHours.toFixed(2)}h spent`}
                size="small"
                sx={{
                  fontWeight: 800,
                  bgcolor: '#fef9c3',
                  color: '#854d0e',
                  border: '1px solid #fde047',
                  borderRadius: 2
                }}
              />
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
            <Button
              variant="contained"
              size="small"
              component="a"
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              startIcon={<LaunchIcon sx={{ fontSize: '0.9rem !important' }} />}
              sx={{
                borderRadius: 2,
                fontWeight: 700,
                textTransform: 'none',
                fontSize: { xs: '0.72rem', sm: '0.8rem' },
                px: { xs: 1, sm: 1.5 },
                bgcolor: activeOrg === 'uncurl:health' ? '#356854' : undefined,
                '&:hover': activeOrg === 'uncurl:health' ? { bgcolor: '#285040' } : undefined
              }}
            >
              {externalLabel}
            </Button>
            <IconButton onClick={() => dispatch(closeDrawer())} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        <Typography variant="h6" sx={{ fontWeight: 800, mt: 1, lineHeight: 1.3, fontSize: { xs: '1.05rem', sm: '1.25rem' } }}>
          {title}
        </Typography>

        {/* Tabs navigation */}
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            mt: 2,
            minHeight: 40,
            '& .MuiTab-root': { fontWeight: 700, borderRadius: 2, px: { xs: 1.5, sm: 2 }, minHeight: 38, textTransform: 'none', fontSize: { xs: '0.8rem', sm: '0.875rem' } },
            '& .Mui-selected': { color: activeOrg === 'uncurl:health' ? '#356854' : '#00b4d8' },
            '& .MuiTabs-indicator': {
              bgcolor: activeOrg === 'uncurl:health' ? '#356854' : '#00b4d8',
              height: 3,
              borderRadius: 3
            },
          }}
        >
          <Tab icon={<ArticleOutlinedIcon fontSize="small" />} iconPosition="start" label="Overview" />
          <Tab
            icon={<AccessTimeIcon fontSize="small" />}
            iconPosition="start"
            label={
              totalSpentHours > 0
                ? `Time (${totalSpentHours.toFixed(1)}h)`
                : 'Time Tracking'
            }
          />
          <Tab icon={<InfoOutlinedIcon fontSize="small" />} iconPosition="start" label="Details" />
          {activeOrg === 'safbsdev' && (
            <Tab icon={<HistoryIcon fontSize="small" />} iconPosition="start" label={`History (${historyUpdates?.length || 0})`} />
          )}
        </Tabs>
      </Box>

      {/* Tab Content */}
      <Box sx={{ p: { xs: 2, sm: 3 }, flexGrow: 1, overflowY: 'auto' }}>
        {/* Tab 0: Overview & Description */}
        {activeTab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Quick Time Tracking Banner */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2.5,
                bgcolor: 'rgba(53, 104, 84, 0.06)',
                border: '1px solid rgba(53, 104, 84, 0.25)',
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'flex-start', sm: 'center' },
                justifyContent: 'space-between',
                gap: { xs: 1.5, sm: 2 },
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                '&:hover': { bgcolor: 'rgba(53, 104, 84, 0.12)' }
              }}
              onClick={() => setActiveTab(1)}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    bgcolor: '#356854',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <AccessTimeIcon fontSize="small" />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                    Spent Hours: {totalSpentHours.toFixed(2)} hours
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {cardHours.length > 0
                      ? `${cardHours.length} time log entries recorded • Click to view breakdown`
                      : totalSpentHours > 0
                        ? 'Hours recorded on this task • Click to view details'
                        : 'No hours recorded yet • Click to view tracking'}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<AccessTimeIcon fontSize="small" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLogHoursOpen(true);
                  }}
                  sx={{
                    fontWeight: 800,
                    textTransform: 'none',
                    borderRadius: 2,
                    bgcolor: activeOrg === 'uncurl:health' ? '#356854' : '#00b4d8',
                    '&:hover': {
                      bgcolor: activeOrg === 'uncurl:health' ? '#285040' : '#0096c7',
                    }
                  }}
                >
                  + Log Hours
                </Button>
                <Button size="small" sx={{ fontWeight: 700, color: activeOrg === 'uncurl:health' ? '#356854' : '#00b4d8', textTransform: 'none' }}>
                  View Logs →
                </Button>
              </Box>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700, mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Description
              </Typography>
              <SafeHtmlViewer htmlContent={effectiveDescription} />
            </Paper>

            {fields['Microsoft.VSTS.Common.AcceptanceCriteria'] && (
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 700, mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Acceptance Criteria
                </Typography>
                <SafeHtmlViewer htmlContent={fields['Microsoft.VSTS.Common.AcceptanceCriteria']} />
              </Paper>
            )}

            {fields['Microsoft.VSTS.TCM.ReproSteps'] && (
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                <Typography variant="subtitle2" color="error" sx={{ fontWeight: 700, mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Repro Steps
                </Typography>
                <SafeHtmlViewer htmlContent={fields['Microsoft.VSTS.TCM.ReproSteps']} />
              </Paper>
            )}

            {fields['Microsoft.VSTS.CMMI.SystemInfo'] && (
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700, mb: 1, textTransform: 'uppercase' }}>
                  System Information
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', bgcolor: 'action.hover', p: 1.5, borderRadius: 1.5 }}>
                  {fields['Microsoft.VSTS.CMMI.SystemInfo']}
                </Typography>
              </Paper>
            )}
          </Box>
        )}

        {/* Tab 1: Time Tracking & Hours Log Breakdown */}
        {activeTab === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Total Summary Header */}
            <Paper
              variant="outlined"
              sx={{
                p: 2.5,
                borderRadius: 3,
                bgcolor: 'rgba(53, 104, 84, 0.08)',
                border: '1px solid rgba(53, 104, 84, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 2
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.8 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2.5,
                    bgcolor: '#356854',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(53, 104, 84, 0.3)'
                  }}
                >
                  <AccessTimeIcon fontSize="medium" />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase' }}>
                    Total Spent Hours
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: '#356854', lineHeight: 1.1, mt: 0.2 }}>
                    {totalSpentHours.toFixed(2)}{' '}
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: 'text.secondary' }}>hours</span>
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' } }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AccessTimeIcon />}
                  onClick={() => setIsLogHoursOpen(true)}
                  sx={{
                    bgcolor: activeOrg === 'uncurl:health' ? '#356854' : '#00b4d8',
                    '&:hover': {
                      bgcolor: activeOrg === 'uncurl:health' ? '#285040' : '#0096c7',
                    },
                    fontWeight: 800,
                    textTransform: 'none',
                    borderRadius: 2,
                    boxShadow: '0 4px 12px rgba(0, 180, 216, 0.3)'
                  }}
                >
                  + Log Hours
                </Button>
                <Chip
                  icon={<CheckCircleIcon sx={{ fontSize: '0.95rem !important' }} />}
                  label="Auto-filled in Table"
                  size="small"
                  color="success"
                  variant="outlined"
                  sx={{ fontWeight: 700, display: { xs: 'none', sm: 'inline-flex' } }}
                />
                <Tooltip title="Refresh card hours from Supabase">
                  <IconButton
                    size="small"
                    onClick={() => refetchHours()}
                    disabled={loadingHours || refetchingHours}
                    sx={{ color: activeOrg === 'uncurl:health' ? '#356854' : '#00b4d8' }}
                  >
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Paper>

            {/* List of Time Entries */}
            {loadingHours ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4, gap: 1.5 }}>
                <CircularProgress size={32} sx={{ color: '#356854' }} />
                <Typography variant="caption" color="text.secondary">
                  Loading time tracking records from Supabase...
                </Typography>
              </Box>
            ) : cardHours.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 3, borderStyle: 'dashed' }}>
                <AccessTimeIcon sx={{ fontSize: 42, color: 'text.secondary', opacity: 0.4, mb: 1 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  No individual time logs found
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 380, mx: 'auto' }}>
                  {totalSpentHours > 0
                    ? `This task has ${totalSpentHours.toFixed(2)} recorded hours in the board data.`
                    : 'Time entries logged for this task in Tasquee will automatically appear and sum up here.'}
                </Typography>
              </Paper>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Logged Time Entries ({cardHours.length})
                </Typography>

                {cardHours.map((entry) => {
                  const authorName = entry.logged_by_name || entry.logged_by_email || 'Team Member';
                  const initials = authorName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2) || 'TM';
                  const logDateStr = entry.logged_at || entry.created_at;
                  const formattedDate = logDateStr
                    ? new Date(logDateStr).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })
                    : '';

                  return (
                    <Paper
                      key={entry.id}
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 2.5,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          borderColor: '#356854',
                          boxShadow: '0 4px 14px rgba(53, 104, 84, 0.08)'
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                          <Avatar sx={{ width: 34, height: 34, fontSize: '0.82rem', bgcolor: '#356854', fontWeight: 700 }}>
                            {initials}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                              {authorName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                              {formattedDate}
                            </Typography>
                          </Box>
                        </Box>

                        <Chip
                          label={`${Number(entry.hours).toFixed(2)} hrs`}
                          size="small"
                          sx={{
                            fontWeight: 900,
                            bgcolor: '#fef9c3',
                            color: '#854d0e',
                            border: '1px solid #fde047',
                            fontSize: '0.8rem',
                            px: 0.5
                          }}
                        />
                      </Box>

                      {entry.description && (
                        <Typography
                          variant="body2"
                          sx={{
                            mt: 1.5,
                            p: 1.5,
                            bgcolor: 'action.hover',
                            borderRadius: 2,
                            fontSize: '0.86rem',
                            lineHeight: 1.6,
                            color: 'text.primary',
                            whiteSpace: 'pre-wrap'
                          }}
                        >
                          {entry.description}
                        </Typography>
                      )}

                      {entry.is_billed !== undefined && (
                        <Box sx={{ mt: 1.2, display: 'flex', justifyContent: 'flex-end' }}>
                          <Chip
                            label={entry.is_billed ? 'Billed' : 'Unbilled'}
                            size="small"
                            variant="outlined"
                            color={entry.is_billed ? 'success' : 'default'}
                            sx={{ height: 18, fontSize: '0.65rem', fontWeight: 600 }}
                          />
                        </Box>
                      )}
                    </Paper>
                  );
                })}
              </Box>
            )}
          </Box>
        )}

        {/* Tab 2: Details & Metadata */}
        {activeTab === 2 && (
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>ASSIGNED TO</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
                  <Avatar src={assignedTo.avatar} sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                    <PersonOutlinedIcon />
                  </Avatar>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{assignedTo.name}</Typography>
                </Box>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>CREATED BY</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
                  <Avatar src={createdBy.avatar} sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
                    <PersonOutlinedIcon />
                  </Avatar>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{createdBy.name}</Typography>
                </Box>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>TOTAL SPENT HOURS</Typography>
                <Typography variant="body1" sx={{ fontWeight: 800, mt: 0.5, color: '#356854' }}>
                  {totalSpentHours.toFixed(2)} hours
                </Typography>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>PRIORITY & SEVERITY</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                  Priority: P{priority} | Severity: {severity}
                </Typography>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>TIMESTAMPS</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  Created: {createdDate}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Updated: {changedDate}
                </Typography>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>AREA & ITERATION</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                  Area: {areaPath}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                  Iteration: {iterationPath}
                </Typography>
              </Paper>
            </Grid>

            {fields['System.Tags'] && (
              <Grid size={{ xs: 12 }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <TagIcon fontSize="small" color="action" />
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>TAGS</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {fields['System.Tags'].split(';').map((tag: string) => (
                      <Chip key={tag} label={tag.trim()} color="primary" variant="outlined" size="small" />
                    ))}
                  </Box>
                </Paper>
              </Grid>
            )}
          </Grid>
        )}

        {/* Tab 3: History & Revision Updates (Azure) */}
        {activeTab === 3 && activeOrg === 'safbsdev' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {loadingHistory ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : !historyUpdates || historyUpdates.length === 0 ? (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                No history revisions found for this work item.
              </Typography>
            ) : (
              historyUpdates.map((update) => {
                const revisedBy = resolveIdentity(update.revisedBy);
                const revDate = update.revisedDate ? new Date(update.revisedDate).toLocaleString() : '';

                return (
                  <Paper key={update.id} variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem', bgcolor: 'primary.main' }}>
                          {revisedBy.name.charAt(0)}
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {revisedBy.name}
                        </Typography>
                        <Chip label={`Rev #${update.rev}`} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {revDate}
                      </Typography>
                    </Box>

                    {update.comment && (
                      <Typography variant="body2" sx={{ fontStyle: 'italic', bgcolor: 'action.hover', p: 1.5, borderRadius: 1.5, my: 1 }}>
                        "{update.comment}"
                      </Typography>
                    )}

                    {update.fields && Object.keys(update.fields).length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                          Changed Fields:
                        </Typography>
                        {Object.entries(update.fields).map(([fieldName, val]) => (
                          <Box key={fieldName} sx={{ fontSize: '0.8rem', color: 'text.secondary', ml: 1 }}>
                            <strong>{fieldName.split('.').pop()}:</strong>{' '}
                            <span style={{ textDecoration: 'line-through' }}>{String(val.oldValue ?? 'None')}</span> → <strong>{String(val.newValue ?? 'None')}</strong>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Paper>
                );
              })
            )}
          </Box>
        )}
      </Box>

      {/* Log Hours Dialog */}
      <LogHoursDialog
        open={isLogHoursOpen}
        onClose={() => setIsLogHoursOpen(false)}
        workItem={selectedWorkItem}
        uncurlConfig={uncurlConfig}
        onSuccess={(_newEntry, newTotal) => {
          refetchHours();
          if (selectedWorkItem) {
            dispatch(updateWorkItemSpentHours({ cardId: selectedWorkItem.id, spentHours: newTotal }));
            queryClient.setQueriesData({ queryKey: ['workItems'] }, (oldData: WorkItem[] | undefined) => {
              if (!oldData || !Array.isArray(oldData)) return oldData;
              return oldData.map((item) => {
                if (item.id === selectedWorkItem.id) {
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
          }
        }}
        onNeedAuth={() => setIsAuthOpen(true)}
      />

      {/* Tasquee Auth Dialog if token needed */}
      <TasqueeAuthDialog
        open={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        pendingItem={selectedWorkItem}
        onAuthorized={() => {
          setIsAuthOpen(false);
          setIsLogHoursOpen(true);
        }}
      />
    </Drawer>
  );
};
