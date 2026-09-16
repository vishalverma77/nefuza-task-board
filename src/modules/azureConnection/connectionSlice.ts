import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { AzureConnectionConfig, WorkItem } from '../../types/azureDevOps';

interface ConnectionState {
  config: AzureConnectionConfig | null;
  isConnected: boolean;
  themeMode: 'light' | 'dark';
  selectedWorkItem: WorkItem | null;
  drawerOpen: boolean;
}

const STORAGE_KEY = 'azure_devops_session';

const loadSession = (): AzureConnectionConfig | null => {
  try {
    const data = sessionStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to read session storage', e);
  }
  return null;
};

const initialSession = loadSession();

const initialState: ConnectionState = {
  config: initialSession,
  isConnected: !!initialSession,
  themeMode: (localStorage.getItem('theme_mode') as 'light' | 'dark') || 'light',
  selectedWorkItem: null,
  drawerOpen: false,
};

export const connectionSlice = createSlice({
  name: 'connection',
  initialState,
  reducers: {
    setConnection: (state, action: PayloadAction<AzureConnectionConfig>) => {
      state.config = action.payload;
      state.isConnected = true;
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(action.payload));
      } catch (e) {
        console.error('Failed to write session storage', e);
      }
    },
    disconnect: (state) => {
      state.config = null;
      state.isConnected = false;
      state.selectedWorkItem = null;
      state.drawerOpen = false;
      sessionStorage.removeItem(STORAGE_KEY);
    },
    toggleThemeMode: (state) => {
      const nextMode = state.themeMode === 'light' ? 'dark' : 'light';
      state.themeMode = nextMode;
      localStorage.setItem('theme_mode', nextMode);
    },
    selectWorkItem: (state, action: PayloadAction<WorkItem | null>) => {
      state.selectedWorkItem = action.payload;
      state.drawerOpen = !!action.payload;
    },
    closeDrawer: (state) => {
      state.drawerOpen = false;
      state.selectedWorkItem = null;
    }
  },
});

export const { setConnection, disconnect, toggleThemeMode, selectWorkItem, closeDrawer } = connectionSlice.actions;

export default connectionSlice.reducer;
