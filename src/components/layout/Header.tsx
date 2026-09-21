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
  useTheme,
  Divider
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
  const { config, activeOrg, themeMode } = useSelector((state: RootState) => state.connection);

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
        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 1.25, sm: 2.5, md: 3 }, minHeight: '56px !important' }}>
          {/* Brand & Organization Switcher */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 }, minWidth: 0 }}>
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
                flexShrink: 0,
              }}
            >
              <img
                src="/logo.png"
                alt="SG Logo"
                style={{ height: 22, width: 'auto', display: 'block' }}
              />
            </Box>

            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.92rem', lineHeight: 1.2, letterSpacing: '-0.01em', color: 'text.primary', whiteSpace: 'nowrap' }}>
                SG Task Board
              </Typography>
            </Box>

            <Divider orientation="vertical" flexItem sx={{ height: 20, my: 'auto', mx: 0.25, display: { xs: 'none', sm: 'block' } }} />

            {/* Clean Static Project Badge (No switcher dropdown, hidden from external view) */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.8,
                px: { xs: 1, sm: 1.5 },
                py: 0.4,
                borderRadius: 2,
                border: '1px solid',
                borderColor:
                  activeOrg === 'uncurl:health'
                    ? 'rgba(53, 104, 84, 0.35)'
                    : 'rgba(0, 180, 216, 0.3)',
                bgcolor:
                  activeOrg === 'uncurl:health'
                    ? 'rgba(53, 104, 84, 0.08)'
                    : 'rgba(0, 180, 216, 0.08)',
                maxWidth: { xs: 140, sm: 220 },
              }}
            >
              <Box
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  bgcolor: activeOrg === 'uncurl:health' ? '#356854' : '#00b4d8',
                  flexShrink: 0,
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '0.75rem', sm: '0.8rem' },
                  color: 'text.primary',
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {activeOrg === 'uncurl:health' ? 'Tasquee Board' : (config?.project || 'Nefuza Sprint')}
              </Typography>
            </Box>
          </Box>

        {/* Right Action Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1 }, flexShrink: 0 }}>
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

          {/* Desktop Disconnect Button */}
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
              display: { xs: 'none', sm: 'inline-flex' },
            }}
          >
            Disconnect
          </Button>

          {/* Mobile Disconnect Icon */}
          <Tooltip title="Disconnect">
            <IconButton
              color="error"
              size="small"
              onClick={() => dispatch(disconnect())}
              sx={{
                display: { xs: 'inline-flex', sm: 'none' },
                bgcolor: 'rgba(239, 68, 68, 0.08)',
                borderRadius: 2,
                p: 0.7,
              }}
            >
              <LogoutIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

