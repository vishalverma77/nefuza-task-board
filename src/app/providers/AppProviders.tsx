import React, { useMemo } from 'react';
import { Provider, useSelector } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';
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
          main: isDark ? '#3b82f6' : '#2563eb',
          light: '#60a5fa',
          dark: '#1d4ed8',
        },
        secondary: {
          main: '#8b5cf6',
        },
        background: {
          default: isDark ? '#0f172a' : '#f8fafc',
          paper: isDark ? '#1e293b' : '#ffffff',
        },
        text: {
          primary: isDark ? '#f8fafc' : '#0f172a',
          secondary: isDark ? '#94a3b8' : '#64748b',
        },
        divider: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
      },
      shape: {
        borderRadius: 12,
      },
      typography: {
        fontFamily: '"Inter", "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
        h5: {
          fontWeight: 700,
        },
        h6: {
          fontWeight: 600,
        },
        subtitle1: {
          fontWeight: 600,
        },
        button: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: 8,
              boxShadow: 'none',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
              },
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: 16,
              backgroundImage: 'none',
              boxShadow: isDark
                ? '0 4px 20px rgba(0, 0, 0, 0.4)'
                : '0 4px 20px rgba(0, 0, 0, 0.05)',
              border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'}`,
            },
          },
        },
        MuiTableCell: {
          styleOverrides: {
            root: {
              borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'}`,
              padding: '14px 16px',
            },
          },
        },
      },
    });
  }, [themeMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
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
