import React, { useState } from 'react';
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
  Chip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import LinkIcon from '@mui/icons-material/Link';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useSnackbar } from 'notistack';
import type { RootState } from '../../app/store';
import { setUncurlConfig } from '../azureConnection/connectionSlice';
import { fetchUncurlWorkItems, DEFAULT_UNCURL_CONFIG } from '../../services/uncurlApi';
import type { UncurlConnectionConfig } from '../../types/azureDevOps';

interface UncurlConfigDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const UncurlConfigDialog: React.FC<UncurlConfigDialogProps> = ({
  open,
  onClose,
  onSuccess
}) => {
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const existingConfig = useSelector((state: RootState) => state.connection.uncurlConfig);

  const [requestUrl, setRequestUrl] = useState(
    () => existingConfig?.requestUrl || DEFAULT_UNCURL_CONFIG.requestUrl
  );
  const [apiKey, setApiKey] = useState(
    () => existingConfig?.apiKey || DEFAULT_UNCURL_CONFIG.apiKey
  );
  const [bearerToken, setBearerToken] = useState(
    () => existingConfig?.bearerToken || ''
  );
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestUrl.trim() || !apiKey.trim() || !bearerToken.trim()) {
      setError('Please provide the Request URL, API Key, and Bearer Token.');
      return;
    }

    setLoading(true);
    setError(null);

    const config: UncurlConnectionConfig = {
      organization: 'uncurl:health',
      requestUrl: requestUrl.trim(),
      apiKey: apiKey.trim(),
      bearerToken: bearerToken.trim(),
    };

    try {
      // Test the credentials by fetching cards
      await fetchUncurlWorkItems(config);
      dispatch(setUncurlConfig(config));
      enqueueSnackbar('Connected to Tasquee Board successfully!', { variant: 'success' });
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      const msg = errObj.message || 'Failed to authenticate and fetch tasks from Tasquee Board.';
      setError(msg);
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
            display: 'flex',
            flexDirection: 'column',
            maxHeight: { xs: 'calc(100% - 16px)', sm: 'calc(100% - 64px)' },
            m: { xs: 1, sm: 2 },
          }
        }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: '#356854',
          color: '#FFFFFF',
          py: 2,
          px: { xs: 2, sm: 3 },
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <VpnKeyIcon sx={{ color: '#FFFFFF', fontSize: 24 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              Connect Tasquee Board
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.85)', fontWeight: 500 }}>
              Tasquee / Supabase Board Integration
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: '#FFFFFF' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box component="form" onSubmit={handleConnect} sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <DialogContent sx={{ p: { xs: 2, sm: 3 }, flex: 1, overflowY: 'auto' }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Paper
            variant="outlined"
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 2,
              bgcolor: 'rgba(53, 104, 84, 0.06)',
              border: '1px solid rgba(53, 104, 84, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                ORGANIZATION:
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#356854' }}>
                Tasquee Board
              </Typography>
            </Box>
            <Chip label="Supabase REST API" size="small" sx={{ bgcolor: '#356854', color: '#FFFFFF', fontWeight: 700 }} />
          </Paper>

          {/* Request URL */}
          <TextField
            label="Request URL (Supabase board_cards endpoint)"
            fullWidth
            size="small"
            value={requestUrl}
            onChange={(e) => setRequestUrl(e.target.value)}
            disabled={loading}
            sx={{ mb: 2.5 }}
            helperText="Pre-configured Supabase query with all card columns"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <LinkIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              },
            }}
          />

          {/* API Key */}
          <TextField
            label="Supabase API Key (apikey)"
            fullWidth
            size="small"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={loading}
            sx={{ mb: 2.5 }}
            helperText="Anon public API Key for Tasquee Board"
          />

          {/* Bearer Token */}
          <TextField
            label="Authorization Bearer Token *"
            fullWidth
            size="small"
            required
            type={showToken ? 'text' : 'password'}
            value={bearerToken}
            onChange={(e) => setBearerToken(e.target.value)}
            disabled={loading}
            placeholder="Paste your Bearer token or JWT here"
            helperText="Enter your user authorization token (without or with 'Bearer ' prefix)"
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setShowToken(!showToken)}
                      edge="end"
                    >
                      {showToken ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
        </DialogContent>

        <DialogActions sx={{ flexShrink: 0, px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 2 }, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
          <Button onClick={onClose} color="inherit" disabled={loading} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !bearerToken.trim()}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <CheckCircleIcon />}
            sx={{
              bgcolor: '#356854',
              '&:hover': { bgcolor: '#24483a' },
              textTransform: 'none',
              fontWeight: 800,
              px: 3,
              py: 1,
              borderRadius: 2
            }}
          >
            {loading ? 'Validating & Fetching...' : 'Connect & Switch to Tasquee Board'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};
