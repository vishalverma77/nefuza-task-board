import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  Box,
  Card,
  Typography,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  Paper,
  Container,
  Stack,
  Tooltip
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import SecurityIcon from '@mui/icons-material/Security';
import SpeedIcon from '@mui/icons-material/Speed';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import HelpOutlinedIcon from '@mui/icons-material/HelpOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import BusinessIcon from '@mui/icons-material/Business';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import { setConnection, setUncurlConfig } from './connectionSlice';
import { validateAzureConnection } from '../../services/azureDevOpsApi';
import { DEFAULT_UNCURL_CONFIG } from '../../services/uncurlApi';
import { formatApiError } from '../../utils/errorUtils';
import type { AzureConnectionConfig, UncurlConnectionConfig } from '../../types/azureDevOps';

export const ConnectionForm: React.FC = () => {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState<'azure' | 'uncurl'>('azure');
  const [organization, setOrganization] = useState('safbsdev');
  const [project, setProject] = useState('Nefuza');
  const [pat, setPat] = useState('');
  const [showPat, setShowPat] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Uncurl (Tasquee Board) direct login state
  const [uncurlToken, setUncurlToken] = useState<string>(() => {
    try {
      const raw = localStorage.getItem('uncurl_health_session') || sessionStorage.getItem('uncurl_health_session');
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed.bearerToken || '';
      }
    } catch {
      // ignore
    }
    return '';
  });
  const [showUncurlToken, setShowUncurlToken] = useState(false);

  const handleUncurlLogin = (tokenOverride?: string) => {
    setError(null);
    const token = tokenOverride !== undefined ? tokenOverride.trim() : uncurlToken.trim();
    const config: UncurlConnectionConfig = {
      organization: 'uncurl:health',
      requestUrl: DEFAULT_UNCURL_CONFIG.requestUrl,
      apiKey: DEFAULT_UNCURL_CONFIG.apiKey,
      bearerToken: token,
    };
    dispatch(setUncurlConfig(config));
  };

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
  };

  return (
    <Box
      sx={{
        height: '100vh',
        width: '100vw',
        maxHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#070b15' : '#f4f6fb'),
        p: { xs: 2, sm: 3 },
      }}
    >
      {/* Background Glow Blobs */}
      <Box
        sx={{
          position: 'absolute',
          top: '-15%',
          left: '-10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,180,216,0.18) 0%, rgba(0,0,0,0) 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '-15%',
          right: '-10%',
          width: '550px',
          height: '550px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, rgba(0,0,0,0) 70%)',
          filter: 'blur(70px)',
          pointerEvents: 'none',
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, my: 'auto' }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1.05fr 0.95fr' },
            gap: { xs: 3, md: 5 },
            alignItems: 'center',
          }}
        >
          {/* Left Column: Brand Showcase & Features */}
          <Box sx={{ pr: { md: 1 } }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.2, mb: 2 }}>
              <Box
                sx={{
                  p: 0.8,
                  px: 1,
                  borderRadius: 2.5,
                  bgcolor: 'rgba(0, 180, 216, 0.1)',
                  border: '1px solid rgba(0, 180, 216, 0.22)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 15px rgba(0, 180, 216, 0.15)',
                }}
              >
                <img
                  src="/logo.png"
                  alt="SG Logo"
                  style={{ height: 26, width: 'auto', display: 'block' }}
                />
              </Box>
              <Chip
                label="Azure DevOps Companion"
                size="small"
                sx={{
                  bgcolor: 'rgba(0, 180, 216, 0.12)',
                  color: '#00b4d8',
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  height: 24,
                  border: '1px solid rgba(0, 180, 216, 0.25)',
                }}
              />
            </Box>

            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                fontSize: { xs: '1.4rem', sm: '1.75rem', md: '1.9rem' },
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
                mb: 1.2,
                background: (theme) =>
                  theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, #ffffff 30%, #cbd5e1 100%)'
                    : 'linear-gradient(135deg, #0f172a 30%, #334155 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Enterprise Work Item Board & Analytics
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 2.5, fontSize: '0.88rem', lineHeight: 1.5, maxWidth: 480 }}
            >
              Accelerate your sprint tracking, WIQL querying, and task detail analysis with our ultra-fast, key-secured Azure DevOps workspace.
            </Typography>

            <Stack spacing={1.2} sx={{ mb: { xs: 2, md: 0 } }}>
              {[
                {
                  icon: <SecurityIcon sx={{ color: '#00b4d8', fontSize: 18 }} />,
                  title: 'Zero Storage PAT Encryption',
                  desc: 'Tokens remain in temporary memory and are never saved to disk or tracking logs.',
                },
                {
                  icon: <SpeedIcon sx={{ color: '#8b5cf6', fontSize: 18 }} />,
                  title: 'Real-Time Sprint Metrics',
                  desc: 'Instant summary indicators for New, Active, Resolved, and Blocked work items.',
                },
                {
                  icon: <AutoAwesomeIcon sx={{ color: '#10b981', fontSize: 18 }} />,
                  title: 'Seamless Interactive Drawer',
                  desc: 'Inspect full acceptance criteria, repro steps, and revision timelines in 1-click.',
                },
              ].map((feat, idx) => (
                <Paper
                  key={idx}
                  elevation={0}
                  sx={{
                    p: 1.2,
                    px: 1.8,
                    borderRadius: 2,
                    bgcolor: (theme) =>
                      theme.palette.mode === 'dark'
                        ? 'rgba(15, 23, 42, 0.6)'
                        : 'rgba(255, 255, 255, 0.7)',
                    border: '1px solid',
                    borderColor: 'divider',
                    backdropFilter: 'blur(10px)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.2,
                  }}
                >
                  <Box sx={{ p: 0.6, borderRadius: 1.5, bgcolor: 'action.hover', display: 'flex' }}>
                    {feat.icon}
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 650, fontSize: '0.82rem', lineHeight: 1.2 }}>
                      {feat.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.1, fontSize: '0.72rem' }}>
                      {feat.desc}
                    </Typography>
                  </Box>
                </Paper>
              ))}
            </Stack>
          </Box>

          {/* Right Column: Connection Form Card */}
          <Card
            elevation={0}
            sx={{
              p: { xs: 2.5, sm: 3 },
              borderRadius: 3.5,
              border: '1px solid',
              borderColor: (theme) =>
                theme.palette.mode === 'dark'
                  ? 'rgba(0, 180, 216, 0.2)'
                  : 'rgba(0, 180, 216, 0.12)',
              bgcolor: (theme) =>
                theme.palette.mode === 'dark'
                  ? 'rgba(15, 23, 42, 0.85)'
                  : 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              boxShadow: (theme) =>
                theme.palette.mode === 'dark'
                  ? '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 180, 216, 0.08)'
                  : '0 15px 35px rgba(0, 0, 0, 0.05), 0 0 25px rgba(0, 180, 216, 0.05)',
            }}
          >
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Box
                sx={{
                  display: 'inline-flex',
                  p: 1,
                  borderRadius: '50%',
                  bgcolor: 'rgba(0, 180, 216, 0.08)',
                  border: '1px solid rgba(0, 180, 216, 0.22)',
                  mb: 1,
                }}
              >
                <img
                  src="/logo.png"
                  alt="SG"
                  style={{ height: 26, width: 'auto' }}
                />
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>
                Connect Workspace
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.2, display: 'block', fontSize: '0.75rem' }}>
                {activeTab === 'azure'
                  ? 'Enter your Azure DevOps details below'
                  : 'Direct access to uncurl:health board (No Azure PAT Required)'}
              </Typography>
            </Box>

            {/* Board Workspace Selector Tabs */}
            <Box
              sx={{
                display: 'flex',
                p: 0.5,
                bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)'),
                borderRadius: 2.5,
                mb: 2.2,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Button
                onClick={() => setActiveTab('azure')}
                size="small"
                fullWidth
                startIcon={<CloudQueueIcon sx={{ fontSize: 17 }} />}
                sx={{
                  borderRadius: 2,
                  py: 0.7,
                  fontSize: '0.78rem',
                  fontWeight: activeTab === 'azure' ? 750 : 550,
                  bgcolor: activeTab === 'azure' ? (theme) => (theme.palette.mode === 'dark' ? 'rgba(0, 180, 216, 0.16)' : '#ffffff') : 'transparent',
                  color: activeTab === 'azure' ? '#00b4d8' : 'text.secondary',
                  border: activeTab === 'azure' ? '1px solid rgba(0, 180, 216, 0.3)' : '1px solid transparent',
                  boxShadow: activeTab === 'azure' ? '0 2px 8px rgba(0, 180, 216, 0.15)' : 'none',
                  textTransform: 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                safbsdev (Nefuza)
              </Button>
              <Button
                onClick={() => setActiveTab('uncurl')}
                size="small"
                fullWidth
                startIcon={<BusinessIcon sx={{ fontSize: 17, color: activeTab === 'uncurl' ? '#356854' : 'inherit' }} />}
                sx={{
                  borderRadius: 2,
                  py: 0.7,
                  fontSize: '0.78rem',
                  fontWeight: activeTab === 'uncurl' ? 750 : 550,
                  bgcolor: activeTab === 'uncurl' ? (theme) => (theme.palette.mode === 'dark' ? 'rgba(53, 104, 84, 0.28)' : '#ffffff') : 'transparent',
                  color: activeTab === 'uncurl' ? '#356854' : 'text.secondary',
                  border: activeTab === 'uncurl' ? '1px solid rgba(53, 104, 84, 0.35)' : '1px solid transparent',
                  boxShadow: activeTab === 'uncurl' ? '0 2px 8px rgba(53, 104, 84, 0.15)' : 'none',
                  textTransform: 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                uncurl:health Board
              </Button>
            </Box>

            {error && (
              <Alert
                severity="error"
                sx={{ mb: 2, py: 0.5, borderRadius: 2, fontSize: '0.8rem' }}
                onClose={() => setError(null)}
              >
                {error}
              </Alert>
            )}

            {activeTab === 'azure' ? (
              <>
                <form onSubmit={handleSubmit}>
                  <Stack spacing={1.8}>
                    <TextField
                      label="Organization Name"
                      placeholder="e.g. my-company"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      required
                      fullWidth
                      size="small"
                      variant="outlined"
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
                      placeholder="e.g. mobile-app"
                      value={project}
                      onChange={(e) => setProject(e.target.value)}
                      required
                      fullWidth
                      size="small"
                      variant="outlined"
                      disabled={loading}
                    />

                    <TextField
                      label="Personal Access Token (PAT)"
                      placeholder="Paste your Azure PAT"
                      type={showPat ? 'text' : 'password'}
                      value={pat}
                      onChange={(e) => setPat(e.target.value)}
                      required
                      fullWidth
                      size="small"
                      variant="outlined"
                      disabled={loading}
                      slotProps={{
                        input: {
                          endAdornment: (
                            <InputAdornment position="end">
                              <Tooltip title="Tokens require Work Items (Read) scope">
                                <HelpOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5, cursor: 'pointer' }} />
                              </Tooltip>
                              <IconButton
                                onClick={() => setShowPat(!showPat)}
                                edge="end"
                                aria-label="toggle PAT visibility"
                                size="small"
                              >
                                {showPat ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        },
                      }}
                    />

                    <Button
                      type="submit"
                      variant="contained"
                      fullWidth
                      size="medium"
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <LockOutlinedIcon sx={{ fontSize: 18 }} />}
                      sx={{ py: 1.1, fontSize: '0.9rem', borderRadius: 2, fontWeight: 650 }}
                    >
                      {loading ? 'Validating Credentials...' : 'Connect to Azure DevOps'}
                    </Button>
                  </Stack>
                </form>

                <Divider sx={{ my: 1.8 }}>
                  <Chip
                    label="OR"
                    size="small"
                    sx={{ fontSize: '0.7rem', fontWeight: 700, height: 20, bgcolor: 'action.hover' }}
                  />
                </Divider>

                <Stack spacing={1.2}>
                  {/* Direct 1-Click Access to uncurl:health without PAT */}
                  <Button
                    variant="contained"
                    fullWidth
                    size="small"
                    onClick={() => handleUncurlLogin()}
                    startIcon={<FlashOnIcon sx={{ color: '#6ee7b7', fontSize: 19 }} />}
                    sx={{
                      py: 1.05,
                      borderRadius: 2,
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      textTransform: 'none',
                      bgcolor: '#356854',
                      color: '#ffffff',
                      boxShadow: '0 4px 14px rgba(53, 104, 84, 0.3)',
                      '&:hover': {
                        bgcolor: '#285040',
                        boxShadow: '0 6px 18px rgba(53, 104, 84, 0.45)',
                      },
                    }}
                  >
                    Direct Login to uncurl:health (No PAT Required)
                  </Button>

                  <Button
                    variant="outlined"
                    color="secondary"
                    fullWidth
                    size="small"
                    onClick={handleDemoMode}
                    startIcon={<RocketLaunchIcon sx={{ fontSize: 18 }} />}
                    sx={{ py: 0.9, borderRadius: 2, fontWeight: 650, fontSize: '0.82rem' }}
                  >
                    Explore Demo Sandbox (Sample Data)
                  </Button>
                </Stack>
              </>
            ) : (
              /* uncurl:health Dedicated Direct View */
              <Stack spacing={1.8}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.6,
                    borderRadius: 2,
                    bgcolor: 'rgba(53, 104, 84, 0.07)',
                    border: '1px solid rgba(53, 104, 84, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.6,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#356854' }}>
                      uncurl:health Board
                    </Typography>
                    <Chip
                      label="No Azure PAT Required"
                      size="small"
                      sx={{ bgcolor: '#356854', color: '#fff', fontWeight: 700, fontSize: '0.68rem', height: 20 }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.74rem', lineHeight: 1.35 }}>
                    Access Tasquee & Supabase board tasks directly. Azure DevOps credentials and PAT are not needed for this board.
                  </Typography>
                </Paper>

                <TextField
                  label="Bearer Authorization Token"
                  placeholder="Paste Bearer token (optional if already saved)"
                  type={showUncurlToken ? 'text' : 'password'}
                  value={uncurlToken}
                  onChange={(e) => setUncurlToken(e.target.value)}
                  fullWidth
                  size="small"
                  variant="outlined"
                  helperText={
                    uncurlToken
                      ? '✓ Bearer token detected for Supabase card authorization'
                      : 'Optional: Enter user token if required by Supabase RLS policies'
                  }
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowUncurlToken(!showUncurlToken)}
                            edge="end"
                            aria-label="toggle token visibility"
                            size="small"
                          >
                            {showUncurlToken ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                <Button
                  variant="contained"
                  fullWidth
                  size="medium"
                  onClick={() => handleUncurlLogin()}
                  startIcon={<FlashOnIcon sx={{ color: '#6ee7b7' }} />}
                  sx={{
                    py: 1.1,
                    fontSize: '0.9rem',
                    borderRadius: 2,
                    fontWeight: 700,
                    textTransform: 'none',
                    bgcolor: '#356854',
                    color: '#ffffff',
                    boxShadow: '0 4px 14px rgba(53, 104, 84, 0.35)',
                    '&:hover': {
                      bgcolor: '#285040',
                      boxShadow: '0 6px 18px rgba(53, 104, 84, 0.45)',
                    },
                  }}
                >
                  Open uncurl:health Board
                </Button>

                <Divider sx={{ my: 1.2 }}>
                  <Chip
                    label="OR"
                    size="small"
                    sx={{ fontSize: '0.7rem', fontWeight: 700, height: 20, bgcolor: 'action.hover' }}
                  />
                </Divider>

                <Stack spacing={1.2}>
                  <Button
                    variant="outlined"
                    fullWidth
                    size="small"
                    onClick={() => setActiveTab('azure')}
                    startIcon={<CloudQueueIcon sx={{ fontSize: 18 }} />}
                    sx={{ py: 0.9, borderRadius: 2, fontWeight: 650, fontSize: '0.82rem', textTransform: 'none' }}
                  >
                    Switch to Azure DevOps (safbsdev)
                  </Button>
                </Stack>
              </Stack>
            )}

            <Box
              sx={{
                mt: 1.8,
                p: 1.2,
                px: 1.5,
                borderRadius: 2,
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                gap: 1.2,
              }}
            >
              <SecurityIcon sx={{ fontSize: 18, color: '#00b4d8', flexShrink: 0 }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem', lineHeight: 1.3 }}>
                PAT tokens are stored in active browser memory and expire upon closing the tab.
              </Typography>
            </Box>
          </Card>
        </Box>
      </Container>
    </Box>
  );
};

