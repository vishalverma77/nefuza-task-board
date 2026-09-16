import type { WorkItem, WorkItemUpdate } from '../types/azureDevOps';

export const MOCK_WORK_ITEMS: WorkItem[] = [
  {
    id: 101,
    rev: 5,
    url: 'https://dev.azure.com/demo-org/demo-project/_workitems/edit/101',
    fields: {
      'System.Id': 101,
      'System.Title': 'Implement OAuth2 PKCE Authentication Flow for Mobile Client',
      'System.WorkItemType': 'Task',
      'System.State': 'Active',
      'System.Reason': 'Work in progress',
      'System.AssignedTo': {
        displayName: 'Alex Morgan',
        uniqueName: 'alex.morgan@company.com',
        imageUrl: 'https://i.pravatar.cc/150?u=alex'
      },
      'System.CreatedBy': {
        displayName: 'Sarah Jenkins (Tech Lead)',
        uniqueName: 'sarah.jenkins@company.com'
      },
      'System.CreatedDate': '2026-09-01T09:30:00Z',
      'System.ChangedDate': '2026-09-15T14:22:10Z',
      'System.Priority': 1,
      'Microsoft.VSTS.Common.Priority': 1,
      'Microsoft.VSTS.Common.Severity': '2 - High',
      'System.Description': `
        <h3>Security Requirement Overview</h3>
        <p>Integrate the <strong>Proof Key for Code Exchange (PKCE)</strong> standard into our React Native client authentication pipeline to mitigate authorization code interception attacks.</p>
        <h4>Technical Tasks:</h4>
        <ul>
          <li>Generate cryptographically secure <code>code_verifier</code> (43-128 chars).</li>
          <li>Derive <code>code_challenge</code> using <code>SHA256</code> base64url encoding.</li>
          <li>Update token exchange call to send <code>code_verifier</code> to the API gateway.</li>
          <li>Add automated unit tests verifying token lifecycle.</li>
        </ul>
        <blockquote>Note: Direct secret embedding in mobile apps is strictly forbidden by policy.</blockquote>
      `,
      'Microsoft.VSTS.Common.AcceptanceCriteria': `
        <ol>
          <li>Authorization code flow successfully exchanges token using <code>code_verifier</code>.</li>
          <li>Invalid <code>code_verifier</code> returns HTTP 400 with <code>invalid_grant</code>.</li>
          <li>Token storage uses iOS Keychain / Android Keystore.</li>
        </ol>
      `,
      'System.AreaPath': 'Core Platform\\Security',
      'System.IterationPath': 'Sprint 24.3',
      'System.Tags': 'Security; OAuth2; Mobile; High-Priority',
      'System.CommentCount': 3
    }
  },
  {
    id: 102,
    rev: 3,
    url: 'https://dev.azure.com/demo-org/demo-project/_workitems/edit/102',
    fields: {
      'System.Id': 102,
      'System.Title': 'Memory Leak in Real-Time Notification WebSockets Service',
      'System.WorkItemType': 'Bug',
      'System.State': 'Blocked',
      'System.Reason': 'Waiting on Infrastructure Team',
      'System.AssignedTo': {
        displayName: 'David Chen',
        uniqueName: 'david.chen@company.com',
        imageUrl: 'https://i.pravatar.cc/150?u=david'
      },
      'System.CreatedBy': {
        displayName: 'QA Automation Bot',
        uniqueName: 'qa.bot@company.com'
      },
      'System.CreatedDate': '2026-09-05T11:15:00Z',
      'System.ChangedDate': '2026-09-16T08:10:00Z',
      'System.Priority': 1,
      'Microsoft.VSTS.Common.Priority': 1,
      'Microsoft.VSTS.Common.Severity': '1 - Critical',
      'System.Description': `
        <p><span style="color: #d32f2f; font-weight: bold;">CRITICAL:</span> Node.js WebSocket proxy memory continuously grows by ~200MB/hour under 5k concurrent socket connections.</p>
        <h4>Observed Behavior:</h4>
        <p>Heap dumps show uncollected event listener references attached to socket disconnection handlers in <code>NotificationGateway.ts</code>.</p>
      `,
      'Microsoft.VSTS.TCM.ReproSteps': `
        <ol>
          <li>Run load test script: <code>npm run test:load -- --sockets=5000</code></li>
          <li>Observe heap memory via Chrome DevTools or Grafana container dashboard.</li>
          <li>Disconnect 50% of clients and monitor heap release.</li>
        </ol>
      `,
      'Microsoft.VSTS.CMMI.SystemInfo': 'Node v20.11.0, Linux Alpine container in Kubernetes cluster microservices-prod-us',
      'System.AreaPath': 'Core Platform\\RealTime',
      'System.IterationPath': 'Sprint 24.3',
      'System.Tags': 'Bug; WebSocket; Performance; Memory-Leak',
      'System.CommentCount': 7
    }
  },
  {
    id: 103,
    rev: 4,
    url: 'https://dev.azure.com/demo-org/demo-project/_workitems/edit/103',
    fields: {
      'System.Id': 103,
      'System.Title': 'As a Developer, I want Dark Mode support across the Azure Task Dashboard UI',
      'System.WorkItemType': 'User Story',
      'System.State': 'Resolved',
      'System.Reason': 'Code committed & verified',
      'System.AssignedTo': {
        displayName: 'Alex Morgan',
        uniqueName: 'alex.morgan@company.com',
        imageUrl: 'https://i.pravatar.cc/150?u=alex'
      },
      'System.CreatedBy': {
        displayName: 'Elena Rostova (UX Director)',
        uniqueName: 'elena.rostova@company.com'
      },
      'System.CreatedDate': '2026-09-08T16:00:00Z',
      'System.ChangedDate': '2026-09-14T18:45:00Z',
      'System.Priority': 2,
      'Microsoft.VSTS.Common.Priority': 2,
      'Microsoft.VSTS.Common.Severity': '3 - Medium',
      'System.Description': `
        <p>Developers working in low-light environments require a sleek dark theme option with proper contrast (WCAG AA compliant).</p>
        <p>The dashboard should support automatic system preference detection as well as a quick manual theme toggle switch in the header bar.</p>
      `,
      'Microsoft.VSTS.Common.AcceptanceCriteria': `
        <ul>
          <li>MUI dark theme custom palette implemented with soft slate backgrounds (<code>#121827</code>).</li>
          <li>Toggle persists preference in local/session state.</li>
          <li>Contrast ratio >= 4.5:1 on text elements.</li>
        </ul>
      `,
      'System.AreaPath': 'Frontend\\UI Framework',
      'System.IterationPath': 'Sprint 24.2',
      'System.Tags': 'UX; Frontend; MUI; Accessibility',
      'System.CommentCount': 2
    }
  },
  {
    id: 104,
    rev: 2,
    url: 'https://dev.azure.com/demo-org/demo-project/_workitems/edit/104',
    fields: {
      'System.Id': 104,
      'System.Title': 'Upgrade React Query & Axios Data Fetching Pipeline to TanStack Query v5',
      'System.WorkItemType': 'Task',
      'System.State': 'New',
      'System.Reason': 'New work item',
      'System.AssignedTo': {
        displayName: 'Unassigned',
        uniqueName: ''
      },
      'System.CreatedBy': {
        displayName: 'Sarah Jenkins (Tech Lead)',
        uniqueName: 'sarah.jenkins@company.com'
      },
      'System.CreatedDate': '2026-09-12T10:00:00Z',
      'System.ChangedDate': '2026-09-12T10:00:00Z',
      'System.Priority': 3,
      'Microsoft.VSTS.Common.Priority': 3,
      'Microsoft.VSTS.Common.Severity': '4 - Low',
      'System.Description': `
        <p>Upgrade <code>@tanstack/react-query</code> dependencies to latest major release for improved Garbage Collection and mutation hooks performance.</p>
      `,
      'System.AreaPath': 'Frontend\\Infrastructure',
      'System.IterationPath': 'Sprint 24.4',
      'System.Tags': 'Refactoring; Technical-Debt; Dependencies',
      'System.CommentCount': 0
    }
  },
  {
    id: 105,
    rev: 8,
    url: 'https://dev.azure.com/demo-org/demo-project/_workitems/edit/105',
    fields: {
      'System.Id': 105,
      'System.Title': 'Multi-Tenant Azure DevOps Organization Workspace Switcher',
      'System.WorkItemType': 'Feature',
      'System.State': 'Closed',
      'System.Reason': 'Completed & Released',
      'System.AssignedTo': {
        displayName: 'Sarah Jenkins (Tech Lead)',
        uniqueName: 'sarah.jenkins@company.com',
        imageUrl: 'https://i.pravatar.cc/150?u=sarah'
      },
      'System.CreatedBy': {
        displayName: 'Product Management',
        uniqueName: 'pm@company.com'
      },
      'System.CreatedDate': '2026-08-15T08:00:00Z',
      'System.ChangedDate': '2026-09-10T11:20:00Z',
      'System.Priority': 1,
      'Microsoft.VSTS.Common.Priority': 1,
      'System.Description': `
        <p>Allow engineers consulting across multiple Azure DevOps projects or client organizations to switch target connections without re-entering credentials.</p>
      `,
      'System.AreaPath': 'Core Platform\\Auth',
      'System.IterationPath': 'Sprint 24.1',
      'System.Tags': 'Feature; Enterprise; Multi-Tenant',
      'System.CommentCount': 5
    }
  },
  {
    id: 106,
    rev: 1,
    url: 'https://dev.azure.com/demo-org/demo-project/_workitems/edit/106',
    fields: {
      'System.Id': 106,
      'System.Title': 'Sanitize Rich Text Descriptions using DOMPurify before HTML render',
      'System.WorkItemType': 'Task',
      'System.State': 'Active',
      'System.Reason': 'In progress security enhancement',
      'System.AssignedTo': {
        displayName: 'Alex Morgan',
        uniqueName: 'alex.morgan@company.com',
        imageUrl: 'https://i.pravatar.cc/150?u=alex'
      },
      'System.CreatedBy': {
        displayName: 'Security Operations',
        uniqueName: 'secops@company.com'
      },
      'System.CreatedDate': '2026-09-15T09:00:00Z',
      'System.ChangedDate': '2026-09-16T10:30:00Z',
      'System.Priority': 2,
      'Microsoft.VSTS.Common.Priority': 2,
      'System.Description': `
        <p>Prevent potential XSS (Cross-Site Scripting) vectors in user-submitted Azure DevOps task descriptions by sanitizing HTML markup prior to rendering in React components.</p>
      `,
      'System.AreaPath': 'Frontend\\Security',
      'System.IterationPath': 'Sprint 24.3',
      'System.Tags': 'Security; XSS; DOMPurify; Frontend',
      'System.CommentCount': 1
    }
  }
];

export const MOCK_WORK_ITEM_UPDATES: Record<number, WorkItemUpdate[]> = {
  101: [
    {
      id: 1,
      rev: 1,
      revisedBy: { displayName: 'Sarah Jenkins (Tech Lead)', uniqueName: 'sarah.jenkins@company.com' },
      revisedDate: '2026-09-01T09:30:00Z',
      fields: {
        'System.State': { newValue: 'New' },
        'System.Title': { newValue: 'Implement OAuth2 PKCE Authentication Flow' }
      },
      comment: 'Created initial task definition.'
    },
    {
      id: 2,
      rev: 2,
      revisedBy: { displayName: 'Alex Morgan', uniqueName: 'alex.morgan@company.com' },
      revisedDate: '2026-09-05T14:10:00Z',
      fields: {
        'System.State': { oldValue: 'New', newValue: 'Active' },
        'System.AssignedTo': { oldValue: 'Unassigned', newValue: 'Alex Morgan' }
      },
      comment: 'Started working on PKCE verifier generator module.'
    },
    {
      id: 3,
      rev: 3,
      revisedBy: { displayName: 'Alex Morgan', uniqueName: 'alex.morgan@company.com' },
      revisedDate: '2026-09-15T14:22:10Z',
      fields: {
        'Microsoft.VSTS.Common.Priority': { oldValue: 2, newValue: 1 }
      },
      comment: 'Escalated priority due to upcoming security compliance audit deadline.'
    }
  ],
  102: [
    {
      id: 1,
      rev: 1,
      revisedBy: { displayName: 'QA Automation Bot', uniqueName: 'qa.bot@company.com' },
      revisedDate: '2026-09-05T11:15:00Z',
      fields: {
        'System.State': { newValue: 'New' }
      },
      comment: 'Automated memory telemetry alert triggered in staging.'
    },
    {
      id: 2,
      rev: 2,
      revisedBy: { displayName: 'David Chen', uniqueName: 'david.chen@company.com' },
      revisedDate: '2026-09-16T08:10:00Z',
      fields: {
        'System.State': { oldValue: 'Active', newValue: 'Blocked' },
        'System.Reason': { newValue: 'Waiting on Infrastructure Team for heap snapshot access' }
      },
      comment: 'Need DevOps permissions to capture production V8 heap dump.'
    }
  ]
};
