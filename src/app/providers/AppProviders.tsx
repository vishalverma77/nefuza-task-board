import React, { useMemo } from 'react';
import { Provider, useSelector } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import { store } from '../store';
import type { RootState } from '../store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 60000,
    },
  },
});

interface ThemeWrapperProps {
  children: React.ReactNode;
}

const ThemeWrapper: React.FC<ThemeWrapperProps> = ({ children }) => {
  const themeMode = useSelector((state: RootState) => state.connection.themeMode);

  const theme = useMemo(() => {
    const isDark = themeMode === 'dark';
    return createTheme({
      palette: {
        mode: themeMode,
        primary: {
          main: isDark ? '#00c8f5' : '#00b4d8',
          light: '#38bdf8',
          dark: '#0284c7',
          contrastText: '#ffffff',
        },
        secondary: {
          main: '#8b5cf6',
          light: '#a78bfa',
          dark: '#6d28d9',
        },
        background: {
          default: isDark ? '#070b15' : '#f8fafc',
          paper: isDark ? '#0f172a' : '#ffffff',
        },
        text: {
          primary: isDark ? '#f1f5f9' : '#0f172a',
          secondary: isDark ? '#94a3b8' : '#64748b',
        },
        divider: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.07)',
      },
      shape: {
        borderRadius: 14,
      },
      typography: {
        fontFamily: '"Plus Jakarta Sans", "Inter", "Segoe UI", "Roboto", sans-serif',
        h4: {
          fontWeight: 800,
          letterSpacing: '-0.02em',
        },
        h5: {
          fontWeight: 700,
          letterSpacing: '-0.01em',
        },
        h6: {
          fontWeight: 700,
          letterSpacing: '-0.01em',
        },
        subtitle1: {
          fontWeight: 600,
        },
        button: {
          textTransform: 'none',
          fontWeight: 600,
          letterSpacing: '0.01em',
        },
      },
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: 10,
              boxShadow: 'none',
              padding: '8px 20px',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                boxShadow: isDark
                  ? '0 6px 20px rgba(0, 200, 245, 0.3)'
                  : '0 6px 20px rgba(0, 180, 216, 0.25)',
                transform: 'translateY(-1px)',
              },
              '&.MuiButton-containedPrimary': {
                background: isDark
                  ? 'linear-gradient(135deg, #00c8f5 0%, #0284c7 100%)'
                  : 'linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)',
              },
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: 18,
              backgroundImage: 'none',
              backdropFilter: 'blur(12px)',
              boxShadow: isDark
                ? '0 10px 30px rgba(0, 0, 0, 0.5)'
                : '0 10px 30px rgba(0, 0, 0, 0.04)',
              border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'}`,
            },
          },
        },
        MuiOutlinedInput: {
          styleOverrides: {
            root: {
              borderRadius: 10,
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: isDark ? 'rgba(0, 200, 245, 0.5)' : 'rgba(0, 180, 216, 0.5)',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: isDark ? '#00c8f5' : '#00b4d8',
                boxShadow: `0 0 0 3px ${isDark ? 'rgba(0, 200, 245, 0.15)' : 'rgba(0, 180, 216, 0.15)'}`,
              },
            },
          },
        },
        MuiTableCell: {
          styleOverrides: {
            root: {
              borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)'}`,
              padding: '14px 18px',
            },
          },
        },
      },
    });
  }, [themeMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider
        maxSnack={4}
        autoHideDuration={3500}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        style={{
          fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
          fontWeight: 600,
          borderRadius: 12,
        }}
      >
        {children}
      </SnackbarProvider>
    </ThemeProvider>
  );
};

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeWrapper>{children}</ThemeWrapper>
      </QueryClientProvider>
    </Provider>
  );
};
