import React, { useState, useEffect } from 'react';
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
  Stack
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useSnackbar } from 'notistack';
import type { WorkItem, UncurlConnectionConfig } from '../../types/azureDevOps';
import { logCardHours, findTasqueeCardForTask, cacheNefuzaTaskHours, DEFAULT_UNCURL_CONFIG, type CardHourEntry } from '../../services/uncurlApi';

const HARDCODED_NAME = 'Vishal Verma';
const HARDCODED_EMAIL = 'vishalverma@syncglob.com';

interface LogHoursDialogProps {
  open: boolean;
  onClose: () => void;
  workItem: WorkItem | null;
  uncurlConfig: UncurlConnectionConfig | null;
  onSuccess: (newEntry: CardHourEntry, newTotal: number) => void;
  onNeedAuth?: () => void;
}

export const LogHoursDialog: React.FC<LogHoursDialogProps> = ({
  open,
  onClose,
  workItem,
  uncurlConfig,
  onSuccess,
  onNeedAuth
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const [hours, setHours] = useState<number | string>(8);
  const [description, setDescription] = useState<string>('');
  const [loggedByName, setLoggedByName] = useState<string>(HARDCODED_NAME);
  const [loggedByEmail, setLoggedByEmail] = useState<string>(HARDCODED_EMAIL);
  const [resolvedCardId, setResolvedCardId] = useState<string>('');
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Get effective uncurl config (from props or local storage)
  const getEffectiveConfig = (): UncurlConnectionConfig | null => {
    if (uncurlConfig?.bearerToken) return uncurlConfig;
    try {
      const raw = localStorage.getItem('uncurl_health_session');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.bearerToken) {
          return {
            organization: 'uncurl:health',
            requestUrl: parsed.requestUrl || DEFAULT_UNCURL_CONFIG.requestUrl,
            apiKey: parsed.apiKey || DEFAULT_UNCURL_CONFIG.apiKey,
            bearerToken: parsed.bearerToken,
          };
        }
      }
    } catch {
      return null;
    }
    return null;
  };

  useEffect(() => {
    if (!open || !workItem) return;
    setError(null);
    setHours('8');
    setDescription('');
    setLoggedByName(HARDCODED_NAME);
    setLoggedByEmail(HARDCODED_EMAIL);

    const directCardId = (workItem.fields['Custom.CardId'] as string) || '';
    if (directCardId && directCardId.includes('-')) {
      setResolvedCardId(directCardId);
      return;
    }

    const effConfig = getEffectiveConfig();

    if (!effConfig?.bearerToken) {
      setResolvedCardId('');
      return;
    }

    setIsResolving(true);
    findTasqueeCardForTask(workItem.id, {
      organization: 'uncurl:health',
      requestUrl: DEFAULT_UNCURL_CONFIG.requestUrl,
      apiKey: effConfig.apiKey || DEFAULT_UNCURL_CONFIG.apiKey,
      bearerToken: effConfig.bearerToken,
    })
      .then((card) => {
        if (card && card.id) {
          setResolvedCardId(card.id);
        }
      })
      .catch(() => {})
      .finally(() => setIsResolving(false));
  }, [open, workItem, uncurlConfig]);

  if (!workItem) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numHours = parseFloat(hours as string);
    if (isNaN(numHours) || numHours <= 0) {
      setError('Please enter a valid number of hours (e.g. 1, 4.5, 8).');
      return;
    }

    const targetCardId = resolvedCardId || (workItem.fields['Custom.CardId'] as string) || '';
    if (!targetCardId) {
      setError('Tasquee Card ID is missing for this task. Please click "Add on Tasquee" first.');
      return;
    }

    const config: UncurlConnectionConfig | null = getEffectiveConfig();

    if (!config?.bearerToken) {
      setError('Tasquee authorization token is missing. Please authorize first.');
      if (onNeedAuth) onNeedAuth();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await logCardHours(
        {
          card_id: targetCardId,
          hours: numHours,
          description: description.trim() || null,
          logged_by_name: loggedByName.trim() || HARDCODED_NAME,
          logged_by_email: loggedByEmail.trim() || HARDCODED_EMAIL,
        },
        config
      );

      const prevHours = Number(workItem.fields['Custom.SpentHours'] ?? workItem.fields['Microsoft.VSTS.Scheduling.CompletedWork'] ?? 0);
      const newTotal = prevHours + numHours;

      cacheNefuzaTaskHours(workItem.id, newTotal, targetCardId);
      enqueueSnackbar(`Successfully logged ${numHours}h on Task #${workItem.id}!`, { variant: 'success' });
      onSuccess(result, newTotal);
      onClose();
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      const is401 = errObj.message?.includes('401') || errObj.message?.toLowerCase().includes('unauthorized');
      if (is401 && onNeedAuth) {
        onNeedAuth();
      }
      const msg = errObj.message || 'Failed to log hours on Tasquee';
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
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.25)',
            maxHeight: { xs: 'calc(100% - 16px)', sm: 'calc(100% - 64px)' },
            m: { xs: 1, sm: 2 },
            display: 'flex',
            flexDirection: 'column',
          }
        }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0d5c75 0%, #00b4d8 100%)',
          color: '#FFFFFF',
          py: 2,
          px: { xs: 2, sm: 3 },
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: 2,
              p: 0.8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AccessTimeIcon sx={{ color: '#FFFFFF', fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              Log Work Hours
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 500 }}>
              Task #{workItem.id} • Tasquee card_hours API
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: '#FFFFFF' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <DialogContent sx={{ p: { xs: 2, sm: 3 }, flex: 1, overflowY: 'auto' }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2, fontWeight: 600 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Task Info Pill */}
          <Paper
            variant="outlined"
            sx={{
              p: 1.8,
              mb: 2.5,
              borderRadius: 2,
              bgcolor: 'rgba(0, 180, 216, 0.05)',
              border: '1px solid rgba(0, 180, 216, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" sx={{ color: '#0077b6', fontWeight: 800, textTransform: 'uppercase' }}>
                TASK WORK ITEM
              </Typography>
              <Typography variant="subtitle2" noWrap sx={{ fontWeight: 800, color: 'text.primary' }}>
                #{workItem.id} - {workItem.fields['System.Title']}
              </Typography>
            </Box>
            {isResolving ? (
              <Chip icon={<CircularProgress size={12} color="inherit" />} label="Checking Card..." size="small" />
            ) : resolvedCardId ? (
              <Chip
                icon={<CheckCircleIcon sx={{ fontSize: '13px !important' }} />}
                label="Tasquee Card Linked"
                size="small"
                color="success"
                sx={{ fontWeight: 700 }}
              />
            ) : (
              <Chip label="Unlinked Card" size="small" color="warning" sx={{ fontWeight: 700 }} />
            )}
          </Paper>

          {/* Hours Input with Quick Preset Chips */}
          <Box sx={{ mb: 2.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
              Hours to Log <span style={{ color: '#ef4444' }}>*</span>
            </Typography>
            <TextField
              fullWidth
              size="small"
              type="number"
              required
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              slotProps={{
                htmlInput: { min: 0.25, step: 0.25, max: 24 },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <AccessTimeIcon fontSize="small" sx={{ color: '#00b4d8' }} />
                    </InputAdornment>
                  ),
                  endAdornment: <InputAdornment position="end">hours</InputAdornment>
                }
              }}
            />

            {/* Quick preset buttons */}
            <Stack direction="row" spacing={1} sx={{ mt: 1.2 }}>
              {[1, 2, 4, 8].map((h) => (
                <Chip
                  key={h}
                  label={`${h} hrs`}
                  size="small"
                  clickable
                  onClick={() => setHours(h)}
                  color={Number(hours) === h ? 'primary' : 'default'}
                  variant={Number(hours) === h ? 'filled' : 'outlined'}
                  sx={{ fontWeight: 700, borderRadius: 1.5 }}
                />
              ))}
            </Stack>
          </Box>

          {/* Optional Work Description / Notes */}
          <Box sx={{ mb: 2.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.8, color: 'text.primary' }}>
              Work Done Description (Optional)
            </Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              rows={3}
              placeholder="e.g. Developed and integrated user questionnaire wizard..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Box>

          {/* User Identity Preview */}
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', mb: 1, display: 'block' }}>
              Logged By Information
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
              <TextField
                label="Logged By Name"
                size="small"
                value={loggedByName}
                onChange={(e) => setLoggedByName(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutlinedIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }
                }}
              />
              <TextField
                label="Logged By Email"
                size="small"
                value={loggedByEmail}
                onChange={(e) => setLoggedByEmail(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailOutlinedIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }
                }}
              />
            </Box>
          </Paper>
        </DialogContent>

        <DialogActions sx={{ flexShrink: 0, px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 2 }, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
          <Button onClick={onClose} color="inherit" disabled={loading} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || isResolving}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
            sx={{
              bgcolor: '#00b4d8',
              '&:hover': { bgcolor: '#0096c7' },
              textTransform: 'none',
              fontWeight: 800,
              px: 3,
              py: 1,
              borderRadius: 2,
              boxShadow: '0 4px 14px rgba(0, 180, 216, 0.35)',
            }}
          >
            {loading ? 'Logging Hours...' : 'Submit Hours'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};
