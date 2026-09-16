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

export const DashboardView: React.FC = () => {
  const config = useSelector((state: RootState) => state.connection.config);
  const [selectedStateFilter, setSelectedStateFilter] = useState('ALL');

  const {
    data: workItems = [],
    isLoading,
    isRefetching,
    error,
    refetch
  } = useQuery({
    queryKey: ['workItems', config?.organization, config?.project, config?.isDemoMode],
    queryFn: () => (config ? fetchWorkItems(config) : Promise.resolve([])),
    enabled: !!config,
  });

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 6 }}>
      {/* Header Bar */}
      <Header onRefresh={() => refetch()} isRefreshing={isLoading || isRefetching} />

      {/* Main Dashboard Area */}
      <Container maxWidth="xl" sx={{ mt: 4 }}>
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
            Failed to fetch work items from Azure DevOps. Check your permissions or network connection.
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
