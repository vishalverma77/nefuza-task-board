import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { AzureConnectionConfig, WorkItem, OrgType, UncurlConnectionConfig } from '../../types/azureDevOps';

interface ConnectionState {
  config: AzureConnectionConfig | null;
  uncurlConfig: UncurlConnectionConfig | null;
  activeOrg: OrgType;
  isConnected: boolean;
  themeMode: 'light' | 'dark';
  selectedWorkItem: WorkItem | null;
  drawerOpen: boolean;
}

const AZURE_STORAGE_KEY = 'azure_devops_session';
const UNCURL_STORAGE_KEY = 'uncurl_health_session';
const ACTIVE_ORG_KEY = 'active_organization';

const loadSession = (): AzureConnectionConfig | null => {
  try {
    const data = localStorage.getItem(AZURE_STORAGE_KEY) || sessionStorage.getItem(AZURE_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to read session storage', e);
  }
  return null;
};

const loadUncurlSession = (): UncurlConnectionConfig | null => {
  try {
    const data = localStorage.getItem(UNCURL_STORAGE_KEY) || sessionStorage.getItem(UNCURL_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to read uncurl session storage', e);
  }
  return null;
};

const initialSession = loadSession();
const initialUncurlSession = loadUncurlSession();
const initialActiveOrg: OrgType = (localStorage.getItem(ACTIVE_ORG_KEY) as OrgType) || 'safbsdev';

const initialState: ConnectionState = {
  config: initialSession,
  uncurlConfig: initialUncurlSession,
  activeOrg: initialActiveOrg,
  isConnected: !!initialSession || (initialActiveOrg === 'uncurl:health' && !!initialUncurlSession),
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
      state.activeOrg = 'safbsdev';
      state.isConnected = true;
      try {
        localStorage.setItem(AZURE_STORAGE_KEY, JSON.stringify(action.payload));
        sessionStorage.setItem(AZURE_STORAGE_KEY, JSON.stringify(action.payload));
        localStorage.setItem(ACTIVE_ORG_KEY, 'safbsdev');
      } catch (e) {
        console.error('Failed to write session storage', e);
      }
    },
    setUncurlConfig: (state, action: PayloadAction<UncurlConnectionConfig>) => {
      state.uncurlConfig = action.payload;
      state.activeOrg = 'uncurl:health';
      state.isConnected = true;
      try {
        localStorage.setItem(UNCURL_STORAGE_KEY, JSON.stringify(action.payload));
        sessionStorage.setItem(UNCURL_STORAGE_KEY, JSON.stringify(action.payload));
        localStorage.setItem(ACTIVE_ORG_KEY, 'uncurl:health');
      } catch (e) {
        console.error('Failed to write uncurl session storage', e);
      }
    },
    switchOrganization: (state, action: PayloadAction<OrgType>) => {
      state.activeOrg = action.payload;
      state.selectedWorkItem = null;
      state.drawerOpen = false;
      try {
        localStorage.setItem(ACTIVE_ORG_KEY, action.payload);
      } catch (e) {
        console.error('Failed to write active org', e);
      }
    },
    disconnect: (state) => {
      // Disconnect current active session view without deleting saved credentials
      state.isConnected = false;
      state.selectedWorkItem = null;
      state.drawerOpen = false;
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
    updateWorkItemSpentHours: (state, action: PayloadAction<{ cardId: string | number; spentHours: number }>) => {
      const { cardId, spentHours } = action.payload;
      if (state.selectedWorkItem) {
        const curId = String(state.selectedWorkItem.fields['Custom.CardId'] || state.selectedWorkItem.id);
        if (curId === String(cardId)) {
          state.selectedWorkItem.fields['Custom.SpentHours'] = spentHours;
          state.selectedWorkItem.fields['Microsoft.VSTS.Scheduling.CompletedWork'] = spentHours;
        }
      }
    },
    updateWorkItemDescription: (state, action: PayloadAction<{ cardId: string | number; description: string }>) => {
      const { cardId, description } = action.payload;
      if (state.selectedWorkItem) {
        const curId = String(state.selectedWorkItem.fields['Custom.CardId'] || state.selectedWorkItem.id);
        if (curId === String(cardId)) {
          state.selectedWorkItem.fields['System.Description'] = description;
        }
      }
    },
    closeDrawer: (state) => {
      state.drawerOpen = false;
      state.selectedWorkItem = null;
    }
  },
});

export const {
  setConnection,
  setUncurlConfig,
  switchOrganization,
  disconnect,
  toggleThemeMode,
  selectWorkItem,
  updateWorkItemSpentHours,
  updateWorkItemDescription,
  closeDrawer
} = connectionSlice.actions;

export default connectionSlice.reducer;
