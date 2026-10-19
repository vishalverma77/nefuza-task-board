import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
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
  Divider,
  Paper,
  Stack,
  Tooltip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import HelpOutlinedIcon from '@mui/icons-material/HelpOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import { useSnackbar } from 'notistack';
import { setConnection, switchOrganization } from './connectionSlice';
import { validateAzureConnection } from '../../services/azureDevOpsApi';
import { formatApiError } from '../../utils/errorUtils';
import type { AzureConnectionConfig } from '../../types/azureDevOps';

interface AzureConnectionDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AzureConnectionDialog: React.FC<AzureConnectionDialogProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();

  const [organization, setOrganization] = useState('safbsdev');
  const [project, setProject] = useState('Nefuza');
  const [pat, setPat] = useState('');
  const [showPat, setShowPat] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization.trim() || !project.trim() || !pat.trim()) {
      setError('Please fill in all required fields (Organization, Project, and PAT).');
      return;
    }

    setError(null);
    setLoading(true);

    const config: AzureConnectionConfig = {
      organization: organization.trim(),
      project: project.trim(),
      pat: pat.trim(),
      isDemoMode: false,
    };

    try {
      const result = await validateAzureConnection(config);
      if (result.success) {
        dispatch(setConnection(config));
        dispatch(switchOrganization('safbsdev'));
        enqueueSnackbar('Connected to Azure DevOps successfully!', { variant: 'success' });
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setError(result.message || 'Failed to authenticate with Azure DevOps.');
      }
    } catch (err: unknown) {
      setError(formatApiError(err, 'An unexpected error occurred while validating credentials.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDemoMode = () => {
    const demoConfig: AzureConnectionConfig = {
      organization: 'demo-company',
      project: 'mobile-and-web-app',
      pat: 'demo-token-12345',
      isDemoMode: true,
    };
    dispatch(setConnection(demoConfig));
    dispatch(switchOrganization('safbsdev'));
    enqueueSnackbar('Connected in Demo Sandbox mode!', { variant: 'info' });
    if (onSuccess) onSuccess();
    onClose();
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
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: { xs: 'calc(100% - 16px)', sm: 'calc(100% - 64px)' },
            m: { xs: 1, sm: 2 },
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(0, 180, 216, 0.12)' : 'rgba(0, 180, 216, 0.08)'),
          borderBottom: '1px solid',
          borderColor: 'divider',
          py: 2,
          px: { xs: 2, sm: 3 },
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
          <Box
            sx={{
              p: 0.8,
              borderRadius: 2,
              bgcolor: 'rgba(0, 180, 216, 0.15)',
              color: '#00b4d8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CloudQueueIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              Connect Azure DevOps Workspace
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              Enter PAT to access safbsdev (Nefuza) work items
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <DialogContent sx={{ p: { xs: 2, sm: 3 }, flex: 1, overflowY: 'auto' }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2, py: 0.5, borderRadius: 2, fontSize: '0.82rem' }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Paper
            variant="outlined"
            sx={{
              p: 1.8,
              mb: 2.5,
              borderRadius: 2,
              bgcolor: 'action.hover',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                DESTINATION BOARD:
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#00b4d8' }}>
                safbsdev / Nefuza
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ px: 1, py: 0.3, borderRadius: 1.5, bgcolor: 'rgba(0, 180, 216, 0.12)', color: '#00b4d8', fontWeight: 700 }}>
              Azure DevOps
            </Typography>
          </Paper>

          <Stack spacing={2}>
            <TextField
              label="Organization Name"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              required
              fullWidth
              size="small"
              disabled={loading}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <CheckCircleOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <TextField
              label="Project Name"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              required
              fullWidth
              size="small"
              disabled={loading}
            />

            <TextField
              label="Personal Access Token (PAT)"
              placeholder="Paste your Azure DevOps PAT"
              type={showPat ? 'text' : 'password'}
              value={pat}
              onChange={(e) => setPat(e.target.value)}
              required
              fullWidth
              size="small"
              disabled={loading}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Tokens require Work Items (Read) scope">
                        <HelpOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5, cursor: 'pointer' }} />
                      </Tooltip>
                      <IconButton onClick={() => setShowPat(!showPat)} edge="end" size="small">
                        {showPat ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Stack>

          <Divider sx={{ my: 2 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              OR
            </Typography>
          </Divider>

          <Button
            variant="outlined"
            color="secondary"
            fullWidth
            size="small"
            onClick={handleDemoMode}
            startIcon={<RocketLaunchIcon sx={{ fontSize: 18 }} />}
            sx={{ py: 0.8, borderRadius: 2, fontWeight: 650, fontSize: '0.82rem' }}
          >
            Explore in Demo Sandbox Mode
          </Button>
        </DialogContent>

        <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 1.5, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
          <Button onClick={onClose} color="inherit" disabled={loading} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !pat.trim()}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <LockOutlinedIcon sx={{ fontSize: 18 }} />}
            sx={{
              px: 3,
              borderRadius: 2,
              fontWeight: 700,
              textTransform: 'none',
              bgcolor: '#00b4d8',
              '&:hover': { bgcolor: '#0096c7' },
            }}
          >
            {loading ? 'Validating...' : 'Connect & Switch to Nefuza'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};
