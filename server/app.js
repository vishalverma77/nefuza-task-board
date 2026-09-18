import express from 'express';
import cors from 'cors';
import axios from 'axios';

export const azureProxyApp = express();

azureProxyApp.use(cors());
azureProxyApp.use(express.json());

// Mask PAT for safe server logging
const maskPat = (pat) => {
  if (!pat) return 'none';
  return pat.length > 4 ? `***${pat.slice(-4)}` : '***';
};

// Health check endpoint
azureProxyApp.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Helper to extract credentials from headers
const getAzureCredentials = (req) => {
  const org = req.headers['x-azure-org'];
  const project = req.headers['x-azure-project'];
  const pat = req.headers['x-azure-pat'];
  return { org, project, pat };
};

// Official Azure DevOps 2-Step Connection & Permission Validation
azureProxyApp.post('/validate', async (req, res) => {
  const { org, project, pat } = req.body;

  if (!org || !project || !pat) {
    return res.status(400).json({
      success: false,
      message: 'Organization, Project, and Personal Access Token (PAT) are required.'
    });
  }

  const cleanOrg = org.trim();
  const cleanProject = project.trim();
  const cleanPat = pat.trim();
  const authHeader = `Basic ${Buffer.from(`:${cleanPat}`).toString('base64')}`;

  console.log(`[Azure Proxy Validate] Checking Org: "${cleanOrg}", Project: "${cleanProject}", PAT: ${maskPat(cleanPat)}`);

  try {
    // Step 1: Validate Organization & PAT authenticity
    const orgUrl = `https://dev.azure.com/${encodeURIComponent(cleanOrg)}/_apis/projects?api-version=7.1`;
    let orgResponse;
    try {
      orgResponse = await axios.get(orgUrl, {
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json'
        },
        timeout: 12000,
        maxRedirects: 0,
        validateStatus: (status) => status < 500
      });
    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        return res.status(504).json({
          success: false,
          message: 'Connection to Azure DevOps timed out. Please check your network or organization name.'
        });
      }
      throw err;
    }

    // Detect Azure DevOps redirect to Sign-In HTML page (indicates invalid PAT)
    const isHtmlResponse = typeof orgResponse.data === 'string' && orgResponse.data.includes('<!DOCTYPE');
    if (orgResponse.status === 302 || isHtmlResponse || orgResponse.status === 401) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Personal Access Token (PAT) or expired session. Please verify your token.'
      });
    }

    if (orgResponse.status === 404) {
      return res.status(404).json({
        success: false,
        message: `Organization "${cleanOrg}" was not found on Azure DevOps. Please verify the organization name.`
      });
    }

    if (orgResponse.status === 403) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden. Your PAT lacks required permissions. Ensure "Project & Team (Read)" and "Work Items (Read)" scopes are granted.'
      });
    }

    if (orgResponse.status === 429) {
      return res.status(429).json({
        success: false,
        message: 'Azure DevOps API rate limit exceeded. Please try again in a few moments.'
      });
    }

    if (orgResponse.status !== 200) {
      return res.status(orgResponse.status).json({
        success: false,
        message: `Azure DevOps API returned status ${orgResponse.status} during organization validation.`
      });
    }

    // Step 2: Validate specific Project existence
    const projectUrl = `https://dev.azure.com/${encodeURIComponent(cleanOrg)}/_apis/projects/${encodeURIComponent(cleanProject)}?api-version=7.1`;
    const projectResponse = await axios.get(projectUrl, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      },
      timeout: 12000,
      maxRedirects: 0,
      validateStatus: (status) => status < 500
    });

    if (projectResponse.status === 404) {
      return res.status(404).json({
        success: false,
        message: `Project "${cleanProject}" was not found in organization "${cleanOrg}". Please verify the project name.`
      });
    }

    if (projectResponse.status !== 200) {
      return res.status(projectResponse.status).json({
        success: false,
        message: `Project validation returned HTTP ${projectResponse.status}.`
      });
    }

    console.log(`[Azure Proxy Validate Success] Verified Org: "${cleanOrg}", Project: "${cleanProject}"`);

    return res.json({
      success: true,
      organization: cleanOrg,
      project: {
        id: projectResponse.data.id,
        name: projectResponse.data.name,
        description: projectResponse.data.description,
        state: projectResponse.data.state,
        visibility: projectResponse.data.visibility
      }
    });

  } catch (error) {
    console.error('[Azure Proxy Validate Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to connect to Azure DevOps API due to a network or backend server issue.'
    });
  }
});

// Sync tasks directly to user's Google Sheet via Apps Script Webhook
azureProxyApp.post('/sync-google-sheet', async (req, res) => {
  let { webhookUrl, payload } = req.body;

  if (!webhookUrl || !payload) {
    return res.status(400).json({
      success: false,
      message: 'Webhook URL and task payload are required.'
    });
  }

  // Ensure webhookUrl ends with /exec
  webhookUrl = String(webhookUrl).trim();
  if (!webhookUrl.endsWith('/exec') && !webhookUrl.includes('/exec?')) {
    webhookUrl = webhookUrl.replace(/\/+$/, '') + '/exec';
  }

  try {
    console.log(`[Google Sheet Sync] Calling Webhook URL: ${webhookUrl} for tab "${payload.sheetName}"`);
    const response = await axios.post(webhookUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      maxRedirects: 10,
      timeout: 45000,
      validateStatus: (status) => status < 500
    });

    console.log('[Google Sheet Sync] Webhook responded status:', response.status);

    let result = response.data;
    if (typeof result === 'string') {
      try {
        result = JSON.parse(result);
      } catch {
        // If Google returned HTML (Login page or authorization screen)
        if (result.includes('accounts.google.com') || result.includes('<!DOCTYPE') || result.includes('<html')) {
          return res.status(403).json({
            success: false,
            message: 'Google Apps Script Access Denied: In Apps Script, click Deploy > Manage deployments > Edit > set "Who has access" to "Anyone", then re-deploy.'
          });
        }
        return res.status(500).json({
          success: false,
          message: `Unexpected response from Google Apps Script: ${result.slice(0, 200)}`
        });
      }
    }

    if (result && typeof result === 'object') {
      if (result.success === false) {
        return res.status(400).json({
          success: false,
          message: result.message || result.error || 'Apps Script returned an error.'
        });
      }
      return res.json(result);
    }

    return res.json({
      success: true,
      message: `Tab "${payload.sheetName}" synced to Google Sheet successfully!`
    });
  } catch (error) {
    console.error('[Google Sheet Sync Error]:', error.message);
    const status = error.response?.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to communicate with Google Sheet Webhook'
    });
  }
});

// Proxy endpoint middleware for Azure DevOps REST APIs
azureProxyApp.use('/proxy', async (req, res) => {
  const { org, pat } = getAzureCredentials(req);

  if (!org || !pat) {
    return res.status(400).json({
      message: 'Missing x-azure-org or x-azure-pat headers.'
    });
  }

  const authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;
  const targetUrl = `https://dev.azure.com${req.url}`;

  try {
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 20000,
      validateStatus: (status) => status < 500
    });

    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error(`[Proxy Error] ${req.method} ${req.url}:`, error.message);
    const status = error.response?.status || 500;
    return res.status(status).json({
      message: error.response?.data?.message || error.message || 'Azure DevOps API call failed'
    });
  }
});
