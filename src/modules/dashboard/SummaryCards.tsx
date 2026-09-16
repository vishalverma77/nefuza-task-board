import React from 'react';
import { Grid, Card, CardContent, Typography, Box, Skeleton } from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import FiberNewIcon from '@mui/icons-material/FiberNew';
import PlayCircleOutlinedIcon from '@mui/icons-material/PlayCircleOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import BlockIcon from '@mui/icons-material/Block';
import type { WorkItem, SummaryMetrics } from '../../types/azureDevOps';

interface SummaryCardsProps {
  workItems: WorkItem[];
  isLoading?: boolean;
  selectedStateFilter?: string;
  onSelectStateFilter?: (state: string) => void;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  workItems,
  isLoading,
  selectedStateFilter = 'ALL',
  onSelectStateFilter
}) => {
  const metrics = React.useMemo<SummaryMetrics>(() => {
    let total = 0;
    let newTasks = 0;
    let activeTasks = 0;
    let resolvedTasks = 0;
    let closedTasks = 0;
    let blockedTasks = 0;

    workItems.forEach((item) => {
      total += 1;
      const state = (item.fields['System.State'] || '').toString().toLowerCase();

      if (state === 'new' || state === 'to do') newTasks += 1;
      else if (state === 'active' || state === 'in progress') activeTasks += 1;
      else if (state === 'resolved') resolvedTasks += 1;
      else if (state === 'closed' || state === 'done') closedTasks += 1;
      else if (state === 'blocked') blockedTasks += 1;
    });

    return { total, newTasks, activeTasks, resolvedTasks, closedTasks, blockedTasks };
  }, [workItems]);

  const cardItems = [
    {
      title: 'Total Tasks',
      count: metrics.total,
      filterKey: 'ALL',
      icon: <AssignmentIcon sx={{ color: '#3b82f6' }} />,
      bgGradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.02) 100%)',
      borderColor: '#3b82f6'
    },
    {
      title: 'New / To Do',
      count: metrics.newTasks,
      filterKey: 'New',
      icon: <FiberNewIcon sx={{ color: '#06b6d4' }} />,
      bgGradient: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(6, 182, 212, 0.02) 100%)',
      borderColor: '#06b6d4'
    },
    {
      title: 'Active',
      count: metrics.activeTasks,
      filterKey: 'Active',
      icon: <PlayCircleOutlinedIcon sx={{ color: '#eab308' }} />,
      bgGradient: 'linear-gradient(135deg, rgba(234, 179, 8, 0.1) 0%, rgba(234, 179, 8, 0.02) 100%)',
      borderColor: '#eab308'
    },
    {
      title: 'Resolved',
      count: metrics.resolvedTasks,
      filterKey: 'Resolved',
      icon: <CheckCircleOutlinedIcon sx={{ color: '#8b5cf6' }} />,
      bgGradient: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(139, 92, 246, 0.02) 100%)',
      borderColor: '#8b5cf6'
    },
    {
      title: 'Closed / Done',
      count: metrics.closedTasks,
      filterKey: 'Closed',
      icon: <TaskAltIcon sx={{ color: '#22c55e' }} />,
      bgGradient: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.02) 100%)',
      borderColor: '#22c55e'
    },
    {
      title: 'Blocked',
      count: metrics.blockedTasks,
      filterKey: 'Blocked',
      icon: <BlockIcon sx={{ color: '#ef4444' }} />,
      bgGradient: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.02) 100%)',
      borderColor: '#ef4444'
    }
  ];

  return (
    <Grid container spacing={2.5} sx={{ mb: 4 }}>
      {cardItems.map((item) => {
        const isSelected = selectedStateFilter === item.filterKey;
        return (
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }} key={item.title}>
            <Card
              onClick={() => onSelectStateFilter && onSelectStateFilter(item.filterKey)}
              sx={{
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                background: item.bgGradient,
                borderLeft: `4px solid ${item.borderColor}`,
                boxShadow: isSelected ? `0 0 0 2px ${item.borderColor}` : undefined,
                transform: isSelected ? 'translateY(-2px)' : 'none',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
                }
              }}
            >
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                    {item.title}
                  </Typography>
                  <Box sx={{ p: 0.8, borderRadius: 2, bgcolor: 'action.hover', display: 'flex' }}>
                    {item.icon}
                  </Box>
                </Box>
                {isLoading ? (
                  <Skeleton width={60} height={40} />
                ) : (
                  <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: -1 }}>
                    {item.count}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
};
