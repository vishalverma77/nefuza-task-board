import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  InputAdornment,
  Alert,
  CircularProgress,
  Paper,
  Chip,
  Collapse
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import TuneIcon from '@mui/icons-material/Tune';
import { useSnackbar } from 'notistack';
import type { RootState } from '../../app/store';
import { setUncurlConfig } from '../azureConnection/connectionSlice';
import { DEFAULT_UNCURL_CONFIG } from '../../services/uncurlApi';
import type { UncurlConnectionConfig, WorkItem } from '../../types/azureDevOps';

const UNCURL_STORAGE_KEY = 'uncurl_health_session';

interface TasqueeAuthDialogProps {
  open: boolean;
  onClose: () => void;
  pendingItem?: WorkItem | null;
  onAuthorized?: (token: string) => void;
  errorMessage?: string | null;
}

export const TasqueeAuthDialog: React.FC<TasqueeAuthDialogProps> = ({
  open,
  onClose,
  pendingItem,
  onAuthorized,
  errorMessage
}) => {
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const { uncurlConfig } = useSelector((state: RootState) => state.connection);

  const [bearerToken, setBearerToken] = useState<string>('');
  const [showToken, setShowToken] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>(DEFAULT_UNCURL_CONFIG.apiKey);
  const [requestUrl, setRequestUrl] = useState<string>(DEFAULT_UNCURL_CONFIG.requestUrl);
  const [localError, setLocalError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

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
      } catch {
        // Ignore parse error
      }
      setLocalError(null);
    }
  }, [open, uncurlConfig]);

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        let clean = text.trim();
        if (clean.toLowerCase().startsWith('bearer ')) {
          clean = clean.substring(7).trim();
        }
        setBearerToken(clean);
      }
    } catch {
      // Clipboard access denied
    }
  };

  const handleSaveAndAuthorize = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = bearerToken.trim().replace(/^Bearer\s+/i, '');

    if (!cleanToken) {
      setLocalError('Please paste or enter your Tasquee Bearer Token.');
      return;
    }

    setLoading(true);
    setLocalError(null);

    try {
      const newConfig: UncurlConnectionConfig = {
        organization: 'uncurl:health',
        requestUrl: requestUrl.trim() || DEFAULT_UNCURL_CONFIG.requestUrl,
        apiKey: apiKey.trim() || DEFAULT_UNCURL_CONFIG.apiKey,
        bearerToken: cleanToken,
      };

      // Save permanently
      localStorage.setItem(UNCURL_STORAGE_KEY, JSON.stringify(newConfig));
      sessionStorage.setItem(UNCURL_STORAGE_KEY, JSON.stringify(newConfig));
      dispatch(setUncurlConfig(newConfig));

      if (onAuthorized) {
        onAuthorized(cleanToken);
      }
      enqueueSnackbar('Tasquee token authorized successfully!', { variant: 'success' });
      onClose();
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      const msg = errObj.message || 'Failed to save authorization.';
      setLocalError(msg);
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setLoading(false);
    }
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
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.25)',
            maxHeight: { xs: 'calc(100% - 16px)', sm: 'calc(100% - 64px)' },
            m: { xs: 1, sm: 2 },
            display: 'flex',
            flexDirection: 'column',
          }
        }
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #1e3a2f 0%, #356854 100%)',
          color: '#FFFFFF',
          py: 2,
          px: { xs: 2, sm: 3 },
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.15)',
              borderRadius: 2,
              p: 0.8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <VpnKeyIcon sx={{ color: '#FFFFFF', fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              Authorize Tasquee Integration
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.85)', fontWeight: 500 }}>
              {pendingItem ? `Authorizing for Task #${pendingItem.id}` : 'Connect your Tasquee bearer token'}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: '#FFFFFF' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box component="form" onSubmit={handleSaveAndAuthorize} sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <DialogContent sx={{ p: { xs: 2, sm: 3 }, flex: 1, overflowY: 'auto' }}>
          {/* Status / Error Banner */}
          {(errorMessage || localError) && (
            <Alert
              severity="error"
              sx={{
                mb: 2.5,
                borderRadius: 2,
                fontWeight: 600,
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
              onClose={() => setLocalError(null)}
            >
              {localError || errorMessage}
            </Alert>
          )}

          {/* Context Info Box */}
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              mb: 2.5,
              borderRadius: 2,
              bgcolor: 'rgba(53, 104, 84, 0.06)',
              border: '1px solid rgba(53, 104, 84, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase' }}>
                TARGET INTEGRATION
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#356854' }}>
                Tasquee Board & Supabase API
              </Typography>
            </Box>
            <Chip
              label="REST API v1"
              size="small"
              sx={{ bgcolor: '#356854', color: '#FFFFFF', fontWeight: 800, fontSize: '0.72rem' }}
            />
          </Paper>

          {/* Pending Task Preview (if triggered from Add on Tasquee button) */}
          {pendingItem && (
            <Box
              sx={{
                p: 1.8,
                mb: 2.5,
                borderRadius: 2,
                bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(0, 180, 216, 0.08)' : '#f0f9ff'),
                border: '1px solid #bae6fd',
              }}
            >
              <Typography variant="caption" sx={{ color: '#0369a1', fontWeight: 800, textTransform: 'uppercase' }}>
                Ready to Add:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', mt: 0.3 }}>
                #{pendingItem.id}: {pendingItem.fields['System.Title']}
              </Typography>
            </Box>
          )}

          {/* Bearer Token Input Field */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.8 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                Tasquee Bearer Token / JWT Token <span style={{ color: '#ef4444' }}>*</span>
              </Typography>
              <Button
                size="small"
                variant="text"
                startIcon={<ContentPasteIcon sx={{ fontSize: 14 }} />}
                onClick={handlePasteFromClipboard}
                sx={{ fontSize: '0.75rem', textTransform: 'none', py: 0.2, px: 1 }}
              >
                Paste from Clipboard
              </Button>
            </Box>

            <TextField
              fullWidth
              size="small"
              required
              multiline
              rows={3}
              type={showToken ? 'text' : 'password'}
              value={bearerToken}
              onChange={(e) => setBearerToken(e.target.value)}
              placeholder="Paste your active Bearer token (JWT) here..."
              disabled={loading}
              sx={{
                '& .MuiInputBase-root': {
                  fontFamily: 'monospace',
                  fontSize: '0.84rem',
                }
              }}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() => setShowToken(!showToken)}
                        edge="end"
                      >
                        {showToken ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }
              }}
            />
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.6 }}>
              Inspect your browser Network tab in Tasquee &rarr; copy the value of the <code>Authorization: Bearer &lt;token&gt;</code> header.
            </Typography>
          </Box>

          {/* Toggle Advanced Configuration */}
          <Box sx={{ mt: 1 }}>
            <Button
              size="small"
              color="inherit"
              startIcon={<TuneIcon sx={{ fontSize: 14 }} />}
              onClick={() => setShowAdvanced(!showAdvanced)}
              sx={{ textTransform: 'none', fontSize: '0.78rem', color: 'text.secondary' }}
            >
              {showAdvanced ? 'Hide Advanced Settings' : 'Show Advanced API Settings'}
            </Button>

            <Collapse in={showAdvanced}>
              <Box sx={{ mt: 1.5, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                <TextField
                  label="Supabase API Key (apikey)"
                  fullWidth
                  size="small"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 1.5 }}
                />
                <TextField
                  label="Supabase Cards URL"
                  fullWidth
                  size="small"
                  value={requestUrl}
                  onChange={(e) => setRequestUrl(e.target.value)}
                  disabled={loading}
                />
              </Box>
            </Collapse>
          </Box>
        </DialogContent>

        <DialogActions sx={{ flexShrink: 0, px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 2 }, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
          <Button onClick={onClose} color="inherit" disabled={loading} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !bearerToken.trim()}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : pendingItem ? <AutoAwesomeIcon /> : <CheckCircleIcon />}
            sx={{
              bgcolor: '#356854',
              '&:hover': { bgcolor: '#24483a' },
              textTransform: 'none',
              fontWeight: 800,
              px: 3,
              py: 1,
              borderRadius: 2,
              boxShadow: '0 4px 14px rgba(53, 104, 84, 0.35)',
            }}
          >
            {loading ? 'Authorizing...' : pendingItem ? 'Authorize & Add Task' : 'Authorize Tasquee'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};
