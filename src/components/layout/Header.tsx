import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  Chip,
  Tooltip,
  useTheme
} from '@mui/material';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import RefreshIcon from '@mui/icons-material/Refresh';
import LogoutIcon from '@mui/icons-material/Logout';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { RootState } from '../../app/store';
import { disconnect, toggleThemeMode } from '../../modules/azureConnection/connectionSlice';

interface HeaderProps {
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onRefresh, isRefreshing }) => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const { config, themeMode } = useSelector((state: RootState) => state.connection);

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid',
        borderColor: 'divider',
        color: 'text.primary'
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 4 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 1,
              borderRadius: 2,
              bgcolor: 'primary.main',
              color: 'white'
            }}
          >
            <CloudQueueIcon />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, letterSpacing: -0.3 }}>
              Azure Task Dashboard
            </Typography>
            {config && (
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                {config.organization} / {config.project}
              </Typography>
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {config?.isDemoMode ? (
            <Chip
              icon={<RocketLaunchIcon />}
              label="Demo Mode"
              color="secondary"
              size="small"
              sx={{ fontWeight: 600, display: { xs: 'none', sm: 'inline-flex' } }}
            />
          ) : (
            <Chip
              icon={<CheckCircleIcon />}
              label="Connected Live"
              color="success"
              size="small"
              sx={{ fontWeight: 600, display: { xs: 'none', sm: 'inline-flex' } }}
            />
          )}

          <Tooltip title="Refresh Tasks">
            <IconButton
              onClick={onRefresh}
              disabled={isRefreshing}
              color="inherit"
              sx={{
                animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
                '@keyframes spin': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' },
                },
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title={`Switch to ${themeMode === 'light' ? 'Dark' : 'Light'} Mode`}>
            <IconButton onClick={() => dispatch(toggleThemeMode())} color="inherit">
              {themeMode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
          </Tooltip>

          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={() => dispatch(disconnect())}
            startIcon={<LogoutIcon />}
            sx={{ borderRadius: 2 }}
          >
            Disconnect
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};
