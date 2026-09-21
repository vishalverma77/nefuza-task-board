import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Alert,
  IconButton,
  InputAdornment,
  Paper,
  Chip,
  Collapse
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import BusinessIcon from '@mui/icons-material/Business';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import SecurityIcon from '@mui/icons-material/Security';
import { useSnackbar } from 'notistack';
import type { RootState } from '../../app/store';
import { switchOrganization, setUncurlConfig } from '../azureConnection/connectionSlice';
import type { OrgType, UncurlConnectionConfig } from '../../types/azureDevOps';
import { DEFAULT_UNCURL_CONFIG } from '../../services/uncurlApi';

const AUTH_STORAGE_KEY = 'sg_workspace_auth_unlocked';
const UNCURL_STORAGE_KEY = 'uncurl_health_session';
const HARDCODED_EMAIL = 'vishalverma@syncglob.com';
const HARDCODED_PASS = 'asdf;lkjqwerpoiu';

interface SecretWorkspaceDialogProps {
  open: boolean;
  onClose: () => void;
}

export const SecretWorkspaceDialog: React.FC<SecretWorkspaceDialogProps> = ({ open, onClose }) => {
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const { activeOrg, config, uncurlConfig } = useSelector((state: RootState) => state.connection);

  // Authentication State
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem(AUTH_STORAGE_KEY) === 'true';
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Uncurl Token Configuration Sub-Form
  const [showTokenConfig, setShowTokenConfig] = useState(false);
  const [requestUrl, setRequestUrl] = useState(
    uncurlConfig?.requestUrl || DEFAULT_UNCURL_CONFIG.requestUrl
  );
  const [apiKey, setApiKey] = useState(
    uncurlConfig?.apiKey || DEFAULT_UNCURL_CONFIG.apiKey
  );
  const [bearerToken, setBearerToken] = useState(
    uncurlConfig?.bearerToken || ''
  );
  const [configSuccess, setConfigSuccess] = useState<string | null>(null);

  // Pre-fill fields from storage or redux
  useEffect(() => {
    if (open) {
      try {
        const raw = localStorage.getItem(UNCURL_STORAGE_KEY) || sessionStorage.getItem(UNCURL_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.bearerToken) setBearerToken(parsed.bearerToken);
          if (parsed.apiKey) setApiKey(parsed.apiKey);
          if (parsed.requestUrl) setRequestUrl(parsed.requestUrl);
        } else if (uncurlConfig?.bearerToken) {
          setBearerToken(uncurlConfig.bearerToken);
        }
      } catch (e) {
        console.error('Failed to parse saved uncurl credentials', e);
      }
    }
  }, [open, uncurlConfig]);

  // Live Auto-Save handler
  const handleBearerTokenChange = (val: string) => {
    setBearerToken(val);
    try {
      const existingRaw = localStorage.getItem(UNCURL_STORAGE_KEY);
      const base = existingRaw ? JSON.parse(existingRaw) : DEFAULT_UNCURL_CONFIG;
      const updated: UncurlConnectionConfig = {
        ...base,
        organization: 'uncurl:health',
        requestUrl: requestUrl.trim() || DEFAULT_UNCURL_CONFIG.requestUrl,
        apiKey: apiKey.trim() || DEFAULT_UNCURL_CONFIG.apiKey,
        bearerToken: val.trim()
      };
      localStorage.setItem(UNCURL_STORAGE_KEY, JSON.stringify(updated));
      sessionStorage.setItem(UNCURL_STORAGE_KEY, JSON.stringify(updated));
      dispatch(setUncurlConfig(updated));
    } catch (e) {
      console.error('Failed to auto-save bearer token', e);
    }
  };

  const handleAuthenticate = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    if (cleanEmail === HARDCODED_EMAIL.toLowerCase() && cleanPass === HARDCODED_PASS) {
      setIsUnlocked(true);
      sessionStorage.setItem(AUTH_STORAGE_KEY, 'true');
      setPassword('');
      setAuthError(null);
      enqueueSnackbar('Access granted! Administrator session unlocked.', { variant: 'success' });
    } else {
      const msg = 'Access Denied: Invalid administrator email or password.';
      setAuthError(msg);
      enqueueSnackbar(msg, { variant: 'error' });
    }
  };

  const handleLockOut = () => {
    setIsUnlocked(false);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    setPassword('');
    setAuthError(null);
    setShowTokenConfig(false);
  };

  const handleSelectOrganization = (org: OrgType) => {
    if (org === 'uncurl:health') {
      const newConfig: UncurlConnectionConfig = {
        organization: 'uncurl:health',
        requestUrl: requestUrl.trim(),
        apiKey: apiKey.trim(),
        bearerToken: bearerToken.trim(),
      };
      dispatch(switchOrganization('uncurl:health'));
      dispatch(setUncurlConfig(newConfig));
    } else {
      dispatch(switchOrganization(org));
    }
    onClose();
  };

  const handleSaveUncurlConfig = () => {
    const newConfig: UncurlConnectionConfig = {
      organization: 'uncurl:health',
      requestUrl: requestUrl.trim(),
      apiKey: apiKey.trim(),
      bearerToken: bearerToken.trim(),
    };
    dispatch(setUncurlConfig(newConfig));
    setConfigSuccess('Credentials saved permanently! Token will not be requested again.');
    enqueueSnackbar('Tasquee Board credentials saved permanently!', { variant: 'success' });
    setTimeout(() => setConfigSuccess(null), 3500);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3.5,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: { xs: 'calc(100% - 16px)', sm: 'calc(100% - 64px)' },
            m: { xs: 1, sm: 2 },
          }
        }
      }}
    >
      {/* Dialog Header */}
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: { xs: 2, sm: 3 },
          py: 2,
          flexShrink: 0,
          bgcolor: isUnlocked ? 'rgba(53, 104, 84, 0.08)' : 'action.hover',
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2,
              bgcolor: isUnlocked ? '#356854' : '#1e293b',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isUnlocked ? <LockOpenOutlinedIcon fontSize="small" /> : <LockOutlinedIcon fontSize="small" />}
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              {isUnlocked ? 'Workspace Management' : 'System Administration'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              {isUnlocked ? 'Authorized Administrator Session' : 'Restricted Configuration Access'}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 2, sm: 3 }, flex: 1, overflowY: 'auto' }}>
        {!isUnlocked ? (
          /* STEP 1: AUTHENTICATION FORM */
          <Box component="form" onSubmit={handleAuthenticate} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: 'action.hover',
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5
              }}
            >
              <SecurityIcon sx={{ color: 'text.secondary', fontSize: 24 }} />
              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                Please enter your administrator credentials to manage workspace environments and organization connections.
              </Typography>
            </Box>

            {authError && (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                {authError}
              </Alert>
            )}

            <TextField
              label="Admin Email"
              type="email"
              fullWidth
              size="small"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />

            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              size="small"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              autoComplete="current-password"
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  )
                }
              }}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{
                py: 1.2,
                borderRadius: 2,
                fontWeight: 700,
                textTransform: 'none',
                bgcolor: '#1e293b',
                '&:hover': { bgcolor: '#0f172a' }
              }}
            >
              Verify & Unlock Workspaces
            </Button>
          </Box>
        ) : (
          /* STEP 2: AUTHORIZED WORKSPACE SWITCHER */
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label="Vishal Verma (Admin)"
                  size="small"
                  color="success"
                  sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Select destination workspace
                </Typography>
              </Box>
              <Button
                size="small"
                color="error"
                onClick={handleLockOut}
                startIcon={<LockOutlinedIcon fontSize="small" />}
                sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.78rem' }}
              >
                Lock Session
              </Button>
            </Box>

            {/* Organization 1: safbsdev */}
            <Paper
              variant="outlined"
              onClick={() => handleSelectOrganization('safbsdev')}
              sx={{
                p: 2.2,
                borderRadius: 2.5,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s',
                borderColor: activeOrg === 'safbsdev' ? '#00b4d8' : 'divider',
                bgcolor: activeOrg === 'safbsdev' ? 'rgba(0, 180, 216, 0.08)' : 'background.paper',
                boxShadow: activeOrg === 'safbsdev' ? '0 4px 14px rgba(0, 180, 216, 0.15)' : 'none',
                '&:hover': {
                  borderColor: '#00b4d8',
                  bgcolor: 'rgba(0, 180, 216, 0.05)'
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    bgcolor: '#00b4d8',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <CloudQueueIcon />
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      safbsdev
                    </Typography>
                    <Chip label="Azure DevOps" size="small" sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    Project: {config?.project || 'nefuza-sprint'} • Default board
                  </Typography>
                </Box>
              </Box>
              {activeOrg === 'safbsdev' && (
                <Chip
                  icon={<CheckCircleIcon sx={{ fontSize: '1rem !important' }} />}
                  label="Active"
                  size="small"
                  color="info"
                  sx={{ fontWeight: 800 }}
                />
              )}
            </Paper>

            {/* Organization 2: uncurl:health */}
            <Paper
              variant="outlined"
              onClick={() => handleSelectOrganization('uncurl:health')}
              sx={{
                p: 2.2,
                borderRadius: 2.5,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s',
                borderColor: activeOrg === 'uncurl:health' ? '#356854' : 'divider',
                bgcolor: activeOrg === 'uncurl:health' ? 'rgba(53, 104, 84, 0.08)' : 'background.paper',
                boxShadow: activeOrg === 'uncurl:health' ? '0 4px 14px rgba(53, 104, 84, 0.15)' : 'none',
                '&:hover': {
                  borderColor: '#356854',
                  bgcolor: 'rgba(53, 104, 84, 0.05)'
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    bgcolor: '#356854',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <BusinessIcon />
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      Tasquee Board
                    </Typography>
                    <Chip label="Supabase REST" size="small" sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700, bgcolor: '#356854', color: '#fff' }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    {uncurlConfig?.bearerToken ? 'Bearer Token Configured' : 'Token required'} • Dedicated Sheet
                  </Typography>
                </Box>
              </Box>
              {activeOrg === 'uncurl:health' && (
                <Chip
                  icon={<CheckCircleIcon sx={{ fontSize: '1rem !important' }} />}
                  label="Active"
                  size="small"
                  sx={{ fontWeight: 800, bgcolor: '#356854', color: '#fff' }}
                />
              )}
            </Paper>

            {/* Toggle Token / API Configuration */}
            <Box sx={{ pt: 1 }}>
              <Button
                variant="outlined"
                size="small"
                fullWidth
                onClick={() => setShowTokenConfig(!showTokenConfig)}
                startIcon={<SettingsOutlinedIcon />}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: 2,
                  borderColor: 'divider',
                  color: 'text.secondary'
                }}
              >
                {showTokenConfig ? 'Hide Tasquee Board Credentials' : 'Configure Tasquee Board API / Bearer Token'}
              </Button>
            </Box>

            <Collapse in={showTokenConfig}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2.5,
                  borderRadius: 2.5,
                  bgcolor: 'action.hover',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <KeyOutlinedIcon fontSize="small" sx={{ color: '#356854' }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Tasquee Board Supabase Credentials
                  </Typography>
                </Box>

                {configSuccess && (
                  <Alert severity="success" sx={{ py: 0.5, borderRadius: 1.5 }}>
                    {configSuccess}
                  </Alert>
                )}

                <TextField
                  label="Bearer Authorization Token"
                  type="password"
                  placeholder="Paste Bearer token without 'Bearer ' prefix..."
                  size="small"
                  fullWidth
                  multiline
                  rows={2}
                  value={bearerToken}
                  onChange={(e) => handleBearerTokenChange(e.target.value)}
                  helperText={bearerToken ? "Token is saved permanently in your browser (Never lost on reload)" : "Paste Bearer token without 'Bearer ' prefix..."}
                />

                <TextField
                  label="Request URL"
                  size="small"
                  fullWidth
                  value={requestUrl}
                  onChange={(e) => setRequestUrl(e.target.value)}
                />

                <TextField
                  label="API Key"
                  size="small"
                  fullWidth
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />

                <Button
                  variant="contained"
                  size="small"
                  onClick={handleSaveUncurlConfig}
                  sx={{
                    borderRadius: 2,
                    fontWeight: 700,
                    textTransform: 'none',
                    bgcolor: '#356854',
                    '&:hover': { bgcolor: '#285040' },
                    alignSelf: 'flex-end'
                  }}
                >
                  Save Credentials
                </Button>
              </Paper>
            </Collapse>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ flexShrink: 0, px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 2 }, borderTop: '1px solid', borderColor: 'divider', justifyContent: 'space-between' }}>
        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.72rem' }}>
          Confidential • Syncglob Internal Board
        </Typography>
        <Button onClick={onClose} sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 2 }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
