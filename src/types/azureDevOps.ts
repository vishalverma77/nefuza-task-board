export interface AzureConnectionConfig {
  organization: string;
  project: string;
  pat: string;
  isDemoMode?: boolean;
}

export type OrgType = 'safbsdev' | 'uncurl:health';

export interface UncurlConnectionConfig {
  organization: string; // 'uncurl:health'
  requestUrl: string;
  apiKey: string;
  bearerToken: string;
}

export type WorkItemState = 'New' | 'Active' | 'Resolved' | 'Closed' | 'Blocked' | 'In Progress' | 'Done' | 'To Do';

export type WorkItemType = 'Task' | 'Bug' | 'User Story' | 'Feature' | 'Epic' | 'Issue';

export interface AzureIdentity {
  displayName: string;
  id?: string;
  uniqueName?: string;
  imageUrl?: string;
  descriptor?: string;
}

export interface WorkItemFields {
  'System.Id': number;
  'System.Title': string;
  'System.WorkItemType': WorkItemType | string;
  'System.State': WorkItemState | string;
  'System.Reason'?: string;
  'System.AssignedTo'?: AzureIdentity | string;
  'System.CreatedBy'?: AzureIdentity | string;
  'System.CreatedDate': string;
  'System.ChangedDate': string;
  'System.Priority'?: number;
  'Microsoft.VSTS.Common.Priority'?: number;
  'Microsoft.VSTS.Common.Severity'?: string;
  'System.Description'?: string;
  'Microsoft.VSTS.Common.AcceptanceCriteria'?: string;
  'Microsoft.VSTS.TCM.ReproSteps'?: string;
  'Microsoft.VSTS.CMMI.SystemInfo'?: string;
  'System.AreaPath'?: string;
  'System.IterationPath'?: string;
  'System.Tags'?: string;
  'System.CommentCount'?: number;
  [key: string]: unknown;
}

export interface WorkItemRelation {
  rel: string;
  url: string;
  attributes?: {
    isLocked?: boolean;
    name?: string;
    comment?: string;
  };
}

export interface WorkItem {
  id: number;
  rev?: number;
  fields: WorkItemFields;
  relations?: WorkItemRelation[];
  url?: string;
}

export interface WorkItemUpdateValue {
  newValue?: unknown;
  oldValue?: unknown;
}

export interface WorkItemUpdate {
  id: number;
  rev: number;
  revisedBy?: AzureIdentity;
  revisedDate: string;
  fields?: Record<string, WorkItemUpdateValue>;
  comment?: string;
}

export interface WiqlQueryResult {
  queryType: string;
  queryResultType: string;
  asOf: string;
  columns: Array<{ referenceName: string; name: string }>;
  workItems: Array<{ id: number; url: string }>;
}

export interface SummaryMetrics {
  total: number;
  newTasks: number;
  activeTasks: number;
  resolvedTasks: number;
  closedTasks: number;
  blockedTasks: number;
}

export interface TaskFilterOptions {
  searchQuery: string;
  state: string;
  workItemType: string;
  priority: string;
  assignedTo: string;
  sortBy: 'changedDate' | 'id' | 'title' | 'priority' | 'state';
  sortOrder: 'asc' | 'desc';
}
