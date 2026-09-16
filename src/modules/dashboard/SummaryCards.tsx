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

  const calcPercent = (count: number) => {
    if (!metrics.total) return '0%';
    return `${Math.round((count / metrics.total) * 100)}%`;
  };

  const cardItems = [
    {
      title: 'Total Tasks',
      count: metrics.total,
      sub: 'All work items',
      filterKey: 'ALL',
      icon: <AssignmentIcon sx={{ color: '#00b4d8' }} />,
      bgGradient: 'linear-gradient(135deg, rgba(0, 180, 216, 0.12) 0%, rgba(0, 180, 216, 0.02) 100%)',
      borderColor: '#00b4d8'
    },
    {
      title: 'New / To Do',
      count: metrics.newTasks,
      sub: calcPercent(metrics.newTasks),
      filterKey: 'New',
      icon: <FiberNewIcon sx={{ color: '#38bdf8' }} />,
      bgGradient: 'linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(56, 189, 248, 0.02) 100%)',
      borderColor: '#38bdf8'
    },
    {
      title: 'Active',
      count: metrics.activeTasks,
      sub: calcPercent(metrics.activeTasks),
      filterKey: 'Active',
      icon: <PlayCircleOutlinedIcon sx={{ color: '#f59e0b' }} />,
      bgGradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0.02) 100%)',
      borderColor: '#f59e0b'
    },
    {
      title: 'Resolved',
      count: metrics.resolvedTasks,
      sub: calcPercent(metrics.resolvedTasks),
      filterKey: 'Resolved',
      icon: <CheckCircleOutlinedIcon sx={{ color: '#8b5cf6' }} />,
      bgGradient: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(139, 92, 246, 0.02) 100%)',
      borderColor: '#8b5cf6'
    },
    {
      title: 'Closed / Done',
      count: metrics.closedTasks,
      sub: calcPercent(metrics.closedTasks),
      filterKey: 'Closed',
      icon: <TaskAltIcon sx={{ color: '#10b981' }} />,
      bgGradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0.02) 100%)',
      borderColor: '#10b981'
    },
    {
      title: 'Blocked',
      count: metrics.blockedTasks,
      sub: calcPercent(metrics.blockedTasks),
      filterKey: 'Blocked',
      icon: <BlockIcon sx={{ color: '#f43f5e' }} />,
      bgGradient: 'linear-gradient(135deg, rgba(244, 63, 94, 0.12) 0%, rgba(244, 63, 94, 0.02) 100%)',
      borderColor: '#f43f5e'
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
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                background: item.bgGradient,
                borderLeft: `4px solid ${item.borderColor}`,
                boxShadow: isSelected
                  ? `0 0 0 2px ${item.borderColor}, 0 8px 20px rgba(0,0,0,0.12)`
                  : 'none',
                transform: isSelected ? 'translateY(-3px)' : 'none',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: `0 12px 28px rgba(0,0,0,0.15), 0 0 15px ${item.borderColor}33`
                }
              }}
            >
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700, fontSize: '0.82rem' }}>
                    {item.title}
                  </Typography>
                  <Box
                    sx={{
                      p: 0.9,
                      borderRadius: 2.5,
                      bgcolor: 'action.hover',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {item.icon}
                  </Box>
                </Box>
                {isLoading ? (
                  <Skeleton width={60} height={40} />
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: -1 }}>
                      {item.count}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      {item.sub}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
};

