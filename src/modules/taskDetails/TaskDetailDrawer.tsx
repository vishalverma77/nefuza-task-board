import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
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
  CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LaunchIcon from '@mui/icons-material/Launch';
import HistoryIcon from '@mui/icons-material/History';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import TagIcon from '@mui/icons-material/Tag';
import type { RootState } from '../../app/store';
import { closeDrawer } from '../azureConnection/connectionSlice';
import { fetchWorkItemHistory } from '../../services/azureDevOpsApi';
import { SafeHtmlViewer } from '../../components/common/SafeHtmlViewer';
import type { AzureIdentity } from '../../types/azureDevOps';

export const TaskDetailDrawer: React.FC = () => {
  const dispatch = useDispatch();
  const { selectedWorkItem, drawerOpen, config } = useSelector((state: RootState) => state.connection);
  const [activeTab, setActiveTab] = useState(0);

  const workItemId = selectedWorkItem?.id;

  // Fetch Revision History
  const { data: historyUpdates, isLoading: loadingHistory } = useQuery({
    queryKey: ['workItemHistory', config?.organization, config?.project, workItemId],
    queryFn: () => (config && workItemId ? fetchWorkItemHistory(config, workItemId) : Promise.resolve([])),
    enabled: !!config && !!workItemId && drawerOpen,
  });

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

  // Azure DevOps URL
  const azureDevOpsUrl =
    selectedWorkItem.url ||
    (config ? `https://dev.azure.com/${encodeURIComponent(config.organization)}/${encodeURIComponent(config.project)}/_workitems/edit/${selectedWorkItem.id}` : '#');

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
            flexDirection: 'column'
          }
        }
      }}
    >
      {/* Top Header */}
      <Box sx={{ p: 3, pb: 2, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip label={`#${selectedWorkItem.id}`} color="primary" size="small" sx={{ fontWeight: 700 }} />
            <Chip label={type} variant="outlined" size="small" sx={{ fontWeight: 600 }} />
            <Chip label={state} size="small" color="info" sx={{ fontWeight: 600 }} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant="contained"
              color="primary"
              size="small"
              component="a"
              href={azureDevOpsUrl}
              target="_blank"
              rel="noopener noreferrer"
              startIcon={<LaunchIcon />}
              sx={{ borderRadius: 2 }}
            >
              Open in Azure DevOps
            </Button>
            <IconButton onClick={() => dispatch(closeDrawer())} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        <Typography variant="h6" sx={{ fontWeight: 700, mt: 1, lineHeight: 1.3 }}>
          {title}
        </Typography>

        {/* Tabs navigation */}
        <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)} sx={{ mt: 2, minHeight: 40 }}>
          <Tab icon={<ArticleOutlinedIcon fontSize="small" />} iconPosition="start" label="Overview" />
          <Tab icon={<InfoOutlinedIcon fontSize="small" />} iconPosition="start" label="Details" />
          <Tab icon={<HistoryIcon fontSize="small" />} iconPosition="start" label={`History (${historyUpdates?.length || 0})`} />
        </Tabs>
      </Box>

      {/* Tab Content */}
      <Box sx={{ p: 3, flexGrow: 1, overflowY: 'auto' }}>
        {/* Tab 0: Overview & Description */}
        {activeTab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700, mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Description
              </Typography>
              <SafeHtmlViewer htmlContent={fields['System.Description']} />
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

        {/* Tab 1: Details & Metadata */}
        {activeTab === 1 && (
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

            <Grid size={{ xs: 12 }}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>AREA & ITERATION PATH</Typography>
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
                    {fields['System.Tags'].split(';').map((tag) => (
                      <Chip key={tag} label={tag.trim()} color="primary" variant="outlined" size="small" />
                    ))}
                  </Box>
                </Paper>
              </Grid>
            )}
          </Grid>
        )}

        {/* Tab 2: History & Revision Updates */}
        {activeTab === 2 && (
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
    </Drawer>
  );
};
