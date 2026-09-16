import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  Paper
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import SecurityIcon from '@mui/icons-material/Security';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import { setConnection } from './connectionSlice';
import { validateAzureConnection } from '../../services/azureDevOpsApi';
import type { AzureConnectionConfig } from '../../types/azureDevOps';

export const ConnectionForm: React.FC = () => {
  const dispatch = useDispatch();
  const [organization, setOrganization] = useState('');
  const [project, setProject] = useState('');
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
      } else {
        setError(result.message || 'Failed to authenticate with Azure DevOps.');
      }
    } catch {
      setError('An unexpected error occurred while validating credentials.');
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
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: (theme) =>
          theme.palette.mode === 'dark'
            ? 'radial-gradient(circle at 50% 0%, #1e293b 0%, #0f172a 100%)'
            : 'radial-gradient(circle at 50% 0%, #eff6ff 0%, #f8fafc 100%)',
        p: 2
      }}
    >
      <Card
        sx={{
          maxWidth: 480,
          width: '100%',
          boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 4,
          overflow: 'hidden'
        }}
      >
        <Box
          sx={{
            p: 3,
            pb: 2,
            background: (theme) =>
              theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)'
                : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            color: 'white',
            textAlign: 'center'
          }}
        >
          <Box sx={{ display: 'inline-flex', p: 1.5, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.2)', mb: 1.5 }}>
            <CloudQueueIcon sx={{ fontSize: 36 }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: -0.5 }}>
            Azure DevOps Task Dashboard
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
            Connect securely with your Personal Access Token (PAT)
          </Typography>
        </Box>

        <CardContent sx={{ p: 3.5 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField
                label="Organization Name"
                placeholder="e.g. my-company"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                required
                fullWidth
                variant="outlined"
                disabled={loading}
              />

              <TextField
                label="Project Name"
                placeholder="e.g. my-project"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                required
                fullWidth
                variant="outlined"
                disabled={loading}
              />

              <TextField
                label="Personal Access Token (PAT)"
                placeholder="Paste your PAT here"
                type={showPat ? 'text' : 'password'}
                value={pat}
                onChange={(e) => setPat(e.target.value)}
                required
                fullWidth
                variant="outlined"
                disabled={loading}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPat(!showPat)}
                          edge="end"
                          aria-label="toggle PAT visibility"
                        >
                          {showPat ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }
                }}
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LockOutlinedIcon />}
                sx={{ py: 1.4, fontSize: '1rem' }}
              >
                {loading ? 'Connecting...' : 'Connect to Azure DevOps'}
              </Button>
            </Box>
          </form>

          <Divider sx={{ my: 3 }}>
            <Chip label="OR" size="small" sx={{ fontSize: '0.75rem', fontWeight: 600 }} />
          </Divider>

          <Button
            variant="outlined"
            color="secondary"
            fullWidth
            size="large"
            onClick={handleDemoMode}
            startIcon={<RocketLaunchIcon />}
            sx={{ py: 1.2 }}
          >
            Explore Demo Mode (Sample Data)
          </Button>

          <Paper
            variant="outlined"
            sx={{
              mt: 3,
              p: 2,
              bgcolor: 'action.hover',
              borderColor: 'divider',
              borderRadius: 2.5
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', mb: 0.5 }}>
              <SecurityIcon sx={{ fontSize: 18 }} />
              <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                Security Notice
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Tokens are never saved in <code>localStorage</code> or logged. Session credentials expire when closing the tab.
            </Typography>
          </Paper>
        </CardContent>
      </Card>
    </Box>
  );
};
