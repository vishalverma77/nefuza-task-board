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
import RefreshIcon from '@mui/icons-material/Refresh';
import LogoutIcon from '@mui/icons-material/Logout';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
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
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(7, 11, 21, 0.85)' : 'rgba(255, 255, 255, 0.88)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid',
        borderColor: theme.palette.mode === 'dark' ? 'rgba(0, 180, 216, 0.2)' : 'rgba(0, 180, 216, 0.12)',
        color: 'text.primary',
        transition: 'all 0.3s ease',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 3 }, minHeight: '56px !important' }}>
        {/* Brand & Connection Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              px: 1,
              py: 0.5,
              borderRadius: 2,
              bgcolor: 'rgba(0, 180, 216, 0.08)',
              border: '1px solid rgba(0, 180, 216, 0.2)',
              boxShadow: '0 0 12px rgba(0, 180, 216, 0.12)',
            }}
          >
            <img
              src="/logo.png"
              alt="SG Logo"
              style={{ height: 24, width: 'auto', display: 'block' }}
            />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 650, fontSize: '0.92rem', lineHeight: 1.2, letterSpacing: '-0.01em', color: 'text.primary' }}>
              SG Task Board
            </Typography>
            {config && (
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.7rem', display: 'block', mt: 0.1 }}>
                {config.organization} <span style={{ color: '#00b4d8', opacity: 0.7 }}>/</span> {config.project}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Right Action Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {config?.isDemoMode ? (
            <Chip
              icon={<RocketLaunchIcon sx={{ fontSize: '0.85rem !important' }} />}
              label="Demo Mode"
              color="secondary"
              size="small"
              sx={{ fontWeight: 600, fontSize: '0.72rem', height: 26, display: { xs: 'none', sm: 'inline-flex' }, borderRadius: 1.5 }}
            />
          ) : (
            <Chip
              icon={
                <Box
                  component="span"
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: '#10b981',
                    boxShadow: '0 0 6px #10b981',
                    display: 'inline-block',
                    mr: 0.5,
                  }}
                />
              }
              label="Connected Live"
              variant="outlined"
              size="small"
              sx={{
                fontWeight: 600,
                fontSize: '0.72rem',
                height: 26,
                borderColor: 'rgba(16, 185, 129, 0.3)',
                color: '#10b981',
                bgcolor: 'rgba(16, 185, 129, 0.06)',
                display: { xs: 'none', sm: 'inline-flex' },
                borderRadius: 1.5,
              }}
            />
          )}

          <Tooltip title="Refresh Tasks">
            <IconButton
              onClick={onRefresh}
              disabled={isRefreshing}
              color="inherit"
              size="small"
              sx={{
                bgcolor: 'action.hover',
                borderRadius: 2,
                p: 0.7,
                animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
                '@keyframes spin': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' },
                },
              }}
            >
              <RefreshIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title={`Switch to ${themeMode === 'light' ? 'Dark' : 'Light'} Mode`}>
            <IconButton
              onClick={() => dispatch(toggleThemeMode())}
              color="inherit"
              size="small"
              sx={{
                bgcolor: 'action.hover',
                borderRadius: 2,
                p: 0.7,
                transition: 'transform 0.3s ease',
                '&:hover': { transform: 'rotate(15deg)' },
              }}
            >
              {themeMode === 'light' ? <DarkModeIcon sx={{ fontSize: 18 }} /> : <LightModeIcon sx={{ fontSize: 18 }} />}
            </IconButton>
          </Tooltip>

          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={() => dispatch(disconnect())}
            startIcon={<LogoutIcon sx={{ fontSize: '0.9rem !important' }} />}
            sx={{
              borderRadius: 2,
              fontWeight: 600,
              fontSize: '0.75rem',
              height: 30,
              px: 1.5,
            }}
          >
            Disconnect
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

