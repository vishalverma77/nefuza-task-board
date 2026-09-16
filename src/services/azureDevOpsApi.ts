import axios from 'axios';
import { apiClient } from './apiClient';
import type { AzureConnectionConfig, WorkItem, WorkItemUpdate, WiqlQueryResult } from '../types/azureDevOps';
import { MOCK_WORK_ITEMS, MOCK_WORK_ITEM_UPDATES } from '../utils/mockData';

let isDirectClientMode = false;

const getHeaders = (config: AzureConnectionConfig) => ({
  'x-azure-org': config.organization,
  'x-azure-project': config.project,
  'x-azure-pat': config.pat
});

const getDirectAuthHeader = (pat: string) => `Basic ${btoa(`:${pat}`)}`;

export const validateAzureConnection = async (config: AzureConnectionConfig): Promise<{ success: boolean; message?: string }> => {
  if (config.isDemoMode) {
    return { success: true, message: 'Connected to Demo Mode successfully!' };
  }

  const cleanOrg = config.organization.trim();
  const cleanProject = config.project.trim();
  const cleanPat = config.pat.trim();

  // 1. Try Backend Proxy first
  try {
    const response = await apiClient.post('/validate', {
      org: cleanOrg,
      project: cleanProject,
      pat: cleanPat
    });

    if (response.data?.success) {
      isDirectClientMode = false;
      return { success: true };
    }
  } catch (error: unknown) {
    // If proxy endpoint is 404 (FE-only deployment), switch to Direct Browser Mode!
    const errObj = error as { response?: { status?: number; data?: { message?: string } } };
    if (errObj.response?.status === 404 || !errObj.response) {
      console.log('[Azure Connection] Proxy endpoint unavailable. Falling back to Direct Browser Mode for FE-only deployment.');
      isDirectClientMode = true;
    } else {
      return {
        success: false,
        message: errObj.response?.data?.message || 'Validation failed. Please check organization, project, and PAT.'
      };
    }
  }

  // 2. Direct Browser Fallback for FE-only static deployments
  try {
    const authHeader = getDirectAuthHeader(cleanPat);
    
    // Step 1: Org Check
    const orgUrl = `https://dev.azure.com/${encodeURIComponent(cleanOrg)}/_apis/projects?api-version=7.1`;
    const orgRes = await axios.get(orgUrl, {
      headers: { 'Authorization': authHeader, 'Accept': 'application/json' }
    });

    if (orgRes.status === 401) {
      return { success: false, message: 'Invalid Personal Access Token (PAT) or expired session.' };
    }

    // Step 2: Project Check
    const projectUrl = `https://dev.azure.com/${encodeURIComponent(cleanOrg)}/_apis/projects/${encodeURIComponent(cleanProject)}?api-version=7.1`;
    const projectRes = await axios.get(projectUrl, {
      headers: { 'Authorization': authHeader, 'Accept': 'application/json' }
    });

    if (projectRes.status === 404) {
      return { success: false, message: `Project "${cleanProject}" not found in organization "${cleanOrg}".` };
    }

    isDirectClientMode = true;
    return { success: true };
  } catch (directErr: unknown) {
    const errObj = directErr as { response?: { status?: number } };
    if (errObj.response?.status === 401) {
      return { success: false, message: 'Invalid Personal Access Token (PAT) or expired session.' };
    } else if (errObj.response?.status === 404) {
      return { success: false, message: `Organization "${cleanOrg}" or project "${cleanProject}" not found.` };
    } else if (errObj.response?.status === 403) {
      return { success: false, message: 'Access forbidden. Your PAT lacks required permissions.' };
    }
    return { success: false, message: 'Failed to connect to Azure DevOps REST API directly from browser.' };
  }
};

export const fetchWorkItems = async (config: AzureConnectionConfig): Promise<WorkItem[]> => {
  if (config.isDemoMode) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return MOCK_WORK_ITEMS;
  }

  const { organization, project, pat } = config;

  const wiqlQuery = {
    query: `
      SELECT
        [System.Id],
        [System.Title],
        [System.State],
        [System.WorkItemType],
        [System.ChangedDate]
      FROM WorkItems
      WHERE [System.TeamProject] = @project
      ORDER BY [System.ChangedDate] DESC
    `
  };

  let workItemRefs: Array<{ id: number }> = [];

  if (!isDirectClientMode) {
    try {
      const wiqlRes = await apiClient.post<WiqlQueryResult>(
        `/proxy/${encodeURIComponent(organization)}/${encodeURIComponent(project)}/_apis/wit/wiql?api-version=7.1`,
        wiqlQuery,
        { headers: getHeaders(config) }
      );
      workItemRefs = wiqlRes.data.workItems || [];
    } catch {
      isDirectClientMode = true;
    }
  }

  if (isDirectClientMode) {
    const wiqlUrl = `https://dev.azure.com/${encodeURIComponent(organization)}/${encodeURIComponent(project)}/_apis/wit/wiql?api-version=7.1`;
    const wiqlRes = await axios.post<WiqlQueryResult>(wiqlUrl, wiqlQuery, {
      headers: {
        'Authorization': getDirectAuthHeader(pat),
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    workItemRefs = wiqlRes.data.workItems || [];
  }

  if (workItemRefs.length === 0) {
    return [];
  }

  const ids = workItemRefs.slice(0, 200).map((wi) => wi.id);
  const idsParam = ids.join(',');

  if (!isDirectClientMode) {
    const detailsRes = await apiClient.get<{ value: WorkItem[] }>(
      `/proxy/${encodeURIComponent(organization)}/${encodeURIComponent(project)}/_apis/wit/workitems`,
      {
        params: { ids: idsParam, '$expand': 'all', 'api-version': '7.1' },
        headers: getHeaders(config)
      }
    );
    return detailsRes.data.value || [];
  } else {
    const detailsUrl = `https://dev.azure.com/${encodeURIComponent(organization)}/${encodeURIComponent(project)}/_apis/wit/workitems`;
    const detailsRes = await axios.get<{ value: WorkItem[] }>(detailsUrl, {
      params: { ids: idsParam, '$expand': 'all', 'api-version': '7.1' },
      headers: {
        'Authorization': getDirectAuthHeader(pat),
        'Accept': 'application/json'
      }
    });
    return detailsRes.data.value || [];
  }
};

export const fetchWorkItemHistory = async (config: AzureConnectionConfig, workItemId: number): Promise<WorkItemUpdate[]> => {
  if (config.isDemoMode) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return MOCK_WORK_ITEM_UPDATES[workItemId] || [];
  }

  const { organization, project, pat } = config;

  if (!isDirectClientMode) {
    try {
      const historyRes = await apiClient.get<{ value: WorkItemUpdate[] }>(
        `/proxy/${encodeURIComponent(organization)}/${encodeURIComponent(project)}/_apis/wit/workitems/${workItemId}/updates`,
        {
          params: { 'api-version': '7.1' },
          headers: getHeaders(config)
        }
      );
      return historyRes.data.value || [];
    } catch {
      isDirectClientMode = true;
    }
  }

  const historyUrl = `https://dev.azure.com/${encodeURIComponent(organization)}/${encodeURIComponent(project)}/_apis/wit/workitems/${workItemId}/updates`;
  const historyRes = await axios.get<{ value: WorkItemUpdate[] }>(historyUrl, {
    params: { 'api-version': '7.1' },
    headers: {
      'Authorization': getDirectAuthHeader(pat),
      'Accept': 'application/json'
    }
  });

  return historyRes.data.value || [];
};
