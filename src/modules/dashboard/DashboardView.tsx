import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { Box, Container, Alert, Button } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import type { RootState } from '../../app/store';
import { Header } from '../../components/layout/Header';
import { SummaryCards } from './SummaryCards';
import { TaskListTable } from '../workItems/TaskListTable';
import { TaskDetailDrawer } from '../taskDetails/TaskDetailDrawer';
import { fetchWorkItems } from '../../services/azureDevOpsApi';
import { fetchUncurlWorkItems, syncTasqueeHoursForNefuzaTasks } from '../../services/uncurlApi';
import { mergeWithManualTasks, getManualTasks } from '../../services/manualTasksStorage';
import { switchOrganization } from '../azureConnection/connectionSlice';
import { AzureConnectionDialog } from '../azureConnection/AzureConnectionDialog';
import { UncurlConfigDialog } from '../uncurlConnection/UncurlConfigDialog';
import type { WorkItem } from '../../types/azureDevOps';

export const DashboardView: React.FC = () => {
  const dispatch = useDispatch();
  const { config, uncurlConfig, activeOrg } = useSelector((state: RootState) => state.connection);
  const [selectedStateFilter, setSelectedStateFilter] = useState('ALL');
  const [azureDialogOpen, setAzureDialogOpen] = useState(false);
  const [uncurlDialogOpen, setUncurlDialogOpen] = useState(false);

  const {
    data: workItems = [],
    isLoading,
    isRefetching,
    error,
    refetch
  } = useQuery({
    queryKey: [
      'workItems',
      activeOrg,
      activeOrg === 'safbsdev' ? config?.organization : uncurlConfig?.organization,
      activeOrg === 'safbsdev' ? config?.project : uncurlConfig?.requestUrl,
      activeOrg === 'safbsdev' ? config?.isDemoMode : uncurlConfig?.bearerToken
    ],
    queryFn: async () => {
      if (activeOrg === 'uncurl:health') {
        if (!uncurlConfig || !uncurlConfig.bearerToken) return [];
        return fetchUncurlWorkItems(uncurlConfig);
      }
      if (!config) {
        const manual = getManualTasks();
        return syncTasqueeHoursForNefuzaTasks(manual, uncurlConfig);
      }
      let azureItems: WorkItem[] = [];
      try {
        azureItems = await fetchWorkItems(config);
      } catch (err) {
        console.error('Failed to fetch from Azure DevOps:', err);
        const manual = getManualTasks();
        if (manual.length > 0) {
          return syncTasqueeHoursForNefuzaTasks(manual, uncurlConfig);
        }
        throw err;
      }
      const combinedItems = mergeWithManualTasks(azureItems);
      return syncTasqueeHoursForNefuzaTasks(combinedItems, uncurlConfig);
    },
    enabled: activeOrg === 'uncurl:health' ? Boolean(uncurlConfig?.bearerToken) : Boolean(config || getManualTasks().length > 0),
  });

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: { xs: 4, sm: 6 } }}>
      {/* Header Bar */}
      <Header onRefresh={() => refetch()} isRefreshing={isLoading || isRefetching} />

      {/* Main Dashboard Area */}
      <Container maxWidth="xl" sx={{ mt: { xs: 2, sm: 3, md: 4 }, px: { xs: 1.5, sm: 2.5, md: 3 } }}>
        {/* Banner when safbsdev is active but Azure PAT not connected */}
        {activeOrg === 'safbsdev' && !config && (
          <Alert
            severity="info"
            sx={{ mb: 3, borderRadius: 2.5 }}
            action={
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Button
                  color="primary"
                  variant="contained"
                  size="small"
                  onClick={() => setAzureDialogOpen(true)}
                  startIcon={<LockOutlinedIcon sx={{ fontSize: 16 }} />}
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                >
                  Connect Azure PAT
                </Button>
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => dispatch(switchOrganization('uncurl:health'))}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  Switch to uncurl:health
                </Button>
              </Box>
            }
          >
            <strong>Azure DevOps (safbsdev) not connected:</strong> You are currently logged in directly. Connect your Azure PAT to load live sprint tasks, or switch to the uncurl:health board.
          </Alert>
        )}

        {/* Banner when uncurl is active but bearerToken is missing */}
        {activeOrg === 'uncurl:health' && !uncurlConfig?.bearerToken && (
          <Alert
            severity="warning"
            sx={{ mb: 3, borderRadius: 2.5 }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => setUncurlDialogOpen(true)}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                Configure Token
              </Button>
            }
          >
            <strong>Bearer Token Required:</strong> To fetch and view uncurl:health board tasks, please configure your Bearer token.
          </Alert>
        )}

        {error && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => refetch()} startIcon={<RefreshIcon />}>
                Retry
              </Button>
            }
            sx={{ mb: 3, borderRadius: 2 }}
          >
            {activeOrg === 'uncurl:health'
              ? (error as Error)?.message || 'Failed to fetch tasks from Tasquee Board. Check your Bearer token.'
              : 'Failed to fetch work items from Azure DevOps. Check your permissions or network connection.'}
          </Alert>
        )}

        {/* Summary Metrics */}
        <SummaryCards
          workItems={workItems}
          isLoading={isLoading}
          selectedStateFilter={selectedStateFilter}
          onSelectStateFilter={(state) => setSelectedStateFilter(state)}
        />

        {/* Filterable Task List Table */}
        <TaskListTable
          workItems={workItems}
          isLoading={isLoading}
          selectedStateFilter={selectedStateFilter}
          onSelectStateFilter={(state) => setSelectedStateFilter(state)}
        />
      </Container>

      {/* Right-Side Slide Drawer for Task Details */}
      <TaskDetailDrawer />

      {/* Dialogs for in-app connection configuration */}
      <AzureConnectionDialog
        open={azureDialogOpen}
        onClose={() => setAzureDialogOpen(false)}
      />

      <UncurlConfigDialog
        open={uncurlDialogOpen}
        onClose={() => setUncurlDialogOpen(false)}
      />
    </Box>
  );
};
