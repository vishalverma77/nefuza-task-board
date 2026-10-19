import React, { useState } from 'react';
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
  Divider,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import LogoutIcon from '@mui/icons-material/Logout';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import BusinessIcon from '@mui/icons-material/Business';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CheckIcon from '@mui/icons-material/Check';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import TuneIcon from '@mui/icons-material/Tune';
import { useSnackbar } from 'notistack';
import type { RootState } from '../../app/store';
import { disconnect, toggleThemeMode, switchOrganization } from '../../modules/azureConnection/connectionSlice';
import { AzureConnectionDialog } from '../../modules/azureConnection/AzureConnectionDialog';
import { UncurlConfigDialog } from '../../modules/uncurlConnection/UncurlConfigDialog';

interface HeaderProps {
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onRefresh, isRefreshing }) => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const { config, uncurlConfig, activeOrg, themeMode } = useSelector((state: RootState) => state.connection);

  const [boardMenuAnchor, setBoardMenuAnchor] = useState<null | HTMLElement>(null);
  const [azureDialogOpen, setAzureDialogOpen] = useState(false);
  const [uncurlDialogOpen, setUncurlDialogOpen] = useState(false);

  const handleOpenBoardMenu = (event: React.MouseEvent<HTMLElement>) => {
    setBoardMenuAnchor(event.currentTarget);
  };

  const handleCloseBoardMenu = () => {
    setBoardMenuAnchor(null);
  };

  const handleSwitchToAzure = () => {
    handleCloseBoardMenu();
    if (config) {
      dispatch(switchOrganization('safbsdev'));
      enqueueSnackbar('Switched to safbsdev (Nefuza) Board', { variant: 'info' });
    } else {
      // Prompt user to enter Azure PAT / connect
      setAzureDialogOpen(true);
    }
  };

  const handleSwitchToUncurl = () => {
    handleCloseBoardMenu();
    dispatch(switchOrganization('uncurl:health'));
    enqueueSnackbar('Switched to uncurl:health (Tasquee Board)', { variant: 'success' });
  };

  return (
    <>
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
          {/* Brand & Interactive Board Switcher */}
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

            {/* Interactive Board Switcher Dropdown Button */}
            <Tooltip title="Click to switch workspace boards">
              <Box
                onClick={handleOpenBoardMenu}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.8,
                  px: { xs: 1, sm: 1.5 },
                  py: 0.45,
                  borderRadius: 2,
                  cursor: 'pointer',
                  userSelect: 'none',
                  border: '1px solid',
                  borderColor:
                    activeOrg === 'uncurl:health'
                      ? 'rgba(53, 104, 84, 0.4)'
                      : 'rgba(0, 180, 216, 0.4)',
                  bgcolor:
                    activeOrg === 'uncurl:health'
                      ? 'rgba(53, 104, 84, 0.1)'
                      : 'rgba(0, 180, 216, 0.1)',
                  maxWidth: { xs: 180, sm: 260 },
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: activeOrg === 'uncurl:health' ? '#356854' : '#00b4d8',
                    bgcolor:
                      activeOrg === 'uncurl:health'
                        ? 'rgba(53, 104, 84, 0.18)'
                        : 'rgba(0, 180, 216, 0.18)',
                  },
                }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: activeOrg === 'uncurl:health' ? '#356854' : '#00b4d8',
                    boxShadow:
                      activeOrg === 'uncurl:health'
                        ? '0 0 6px #356854'
                        : '0 0 6px #00b4d8',
                    flexShrink: 0,
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 750,
                    fontSize: { xs: '0.75rem', sm: '0.82rem' },
                    color: activeOrg === 'uncurl:health' ? '#356854' : '#00b4d8',
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {activeOrg === 'uncurl:health'
                    ? 'uncurl:health (Tasquee)'
                    : (config?.project ? `safbsdev (${config.project})` : 'safbsdev (Nefuza)')}
                </Typography>
                <KeyboardArrowDownIcon
                  sx={{
                    fontSize: 16,
                    color: 'text.secondary',
                    flexShrink: 0,
                    transition: 'transform 0.2s',
                    transform: boardMenuAnchor ? 'rotate(180deg)' : 'none',
                  }}
                />
              </Box>
            </Tooltip>

            {/* Dropdown Menu for Board Switching */}
            <Menu
              anchorEl={boardMenuAnchor}
              open={Boolean(boardMenuAnchor)}
              onClose={handleCloseBoardMenu}
              slotProps={{
                paper: {
                  sx: {
                    borderRadius: 2.5,
                    minWidth: 260,
                    mt: 1,
                    boxShadow: '0 10px 28px rgba(0,0,0,0.2)',
                    border: '1px solid',
                    borderColor: 'divider',
                  },
                },
              }}
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Switch Workspace Board
                </Typography>
              </Box>
              <Divider sx={{ my: 0.5 }} />

              {/* Board 1: safbsdev (Nefuza) */}
              <MenuItem
                onClick={handleSwitchToAzure}
                selected={activeOrg === 'safbsdev'}
                sx={{ py: 1.2, px: 2, gap: 1.5 }}
              >
                <ListItemIcon sx={{ minWidth: 28, color: '#00b4d8' }}>
                  <CloudQueueIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        safbsdev (Nefuza)
                      </Typography>
                      {activeOrg === 'safbsdev' && (
                        <Chip label="Active" size="small" color="info" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 800 }} />
                      )}
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {config ? 'Azure DevOps Sprint Board' : 'Requires Azure PAT to connect'}
                    </Typography>
                  }
                />
                {activeOrg === 'safbsdev' ? (
                  <CheckIcon sx={{ fontSize: 18, color: '#00b4d8', ml: 1 }} />
                ) : !config ? (
                  <Chip label="Connect" size="small" variant="outlined" color="primary" sx={{ height: 20, fontSize: '0.65rem' }} />
                ) : null}
              </MenuItem>

              {/* Board 2: uncurl:health (Tasquee Board) */}
              <MenuItem
                onClick={handleSwitchToUncurl}
                selected={activeOrg === 'uncurl:health'}
                sx={{ py: 1.2, px: 2, gap: 1.5 }}
              >
                <ListItemIcon sx={{ minWidth: 28, color: '#356854' }}>
                  <BusinessIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        uncurl:health
                      </Typography>
                      {activeOrg === 'uncurl:health' && (
                        <Chip
                          label="Active"
                          size="small"
                          sx={{ height: 18, fontSize: '0.62rem', fontWeight: 800, bgcolor: '#356854', color: '#fff' }}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {uncurlConfig?.bearerToken ? 'Tasquee Board • Token Configured' : 'Tasquee Board • Direct Access (No PAT)'}
                    </Typography>
                  }
                />
                {activeOrg === 'uncurl:health' ? (
                  <CheckIcon sx={{ fontSize: 18, color: '#356854', ml: 1 }} />
                ) : (
                  <Chip
                    label="Direct Access"
                    size="small"
                    sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: 'rgba(53, 104, 84, 0.12)', color: '#356854' }}
                  />
                )}
              </MenuItem>

              <Divider sx={{ my: 0.5 }} />

              {/* Additional Board Tools */}
              <MenuItem
                onClick={() => {
                  handleCloseBoardMenu();
                  setUncurlDialogOpen(true);
                }}
                sx={{ py: 1, px: 2 }}
              >
                <ListItemIcon sx={{ minWidth: 28, color: 'text.secondary' }}>
                  <TuneIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="caption" sx={{ fontWeight: 650 }}>
                      Configure Tasquee Credentials
                    </Typography>
                  }
                />
              </MenuItem>

              {!config && (
                <MenuItem
                  onClick={() => {
                    handleCloseBoardMenu();
                    setAzureDialogOpen(true);
                  }}
                  sx={{ py: 1, px: 2 }}
                >
                  <ListItemIcon sx={{ minWidth: 28, color: '#00b4d8' }}>
                    <KeyOutlinedIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="caption" sx={{ fontWeight: 650, color: '#00b4d8' }}>
                        Connect Azure DevOps PAT
                      </Typography>
                    }
                  />
                </MenuItem>
              )}
            </Menu>
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

    <AzureConnectionDialog
      open={azureDialogOpen}
      onClose={() => setAzureDialogOpen(false)}
    />

    <UncurlConfigDialog
      open={uncurlDialogOpen}
      onClose={() => setUncurlDialogOpen(false)}
    />
  </>
  );
};


