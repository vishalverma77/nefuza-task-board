import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { Box, Container, Alert, Button } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import type { RootState } from '../../app/store';
import { Header } from '../../components/layout/Header';
import { SummaryCards } from './SummaryCards';
import { TaskListTable } from '../workItems/TaskListTable';
import { TaskDetailDrawer } from '../taskDetails/TaskDetailDrawer';
import { fetchWorkItems } from '../../services/azureDevOpsApi';
import { fetchUncurlWorkItems, syncTasqueeHoursForNefuzaTasks } from '../../services/uncurlApi';

export const DashboardView: React.FC = () => {
  const { config, uncurlConfig, activeOrg } = useSelector((state: RootState) => state.connection);
  const [selectedStateFilter, setSelectedStateFilter] = useState('ALL');

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
      if (!config) return [];
      const azureItems = await fetchWorkItems(config);
      return syncTasqueeHoursForNefuzaTasks(azureItems, uncurlConfig);
    },
    enabled: activeOrg === 'uncurl:health' ? Boolean(uncurlConfig?.bearerToken) : Boolean(config),
  });

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: { xs: 4, sm: 6 } }}>
      {/* Header Bar */}
      <Header onRefresh={() => refetch()} isRefreshing={isLoading || isRefetching} />

      {/* Main Dashboard Area */}
      <Container maxWidth="xl" sx={{ mt: { xs: 2, sm: 3, md: 4 }, px: { xs: 1.5, sm: 2.5, md: 3 } }}>
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
    </Box>
  );
};
