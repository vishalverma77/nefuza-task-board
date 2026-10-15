import type { WorkItem, WorkItemFields } from '../types/azureDevOps';

export const MANUAL_TASKS_STORAGE_KEY = 'nefuza_manual_work_items';

/**
 * Checks if a given work item was created manually on the board
 */
export const isManualTask = (item: WorkItem | null | undefined): boolean => {
  if (!item) return false;
  return Boolean(item.fields?.['Custom.IsManual']);
};

/**
 * Loads all manual work items from localStorage
 */
export const getManualTasks = (): WorkItem[] => {
  try {
    const raw = localStorage.getItem(MANUAL_TASKS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to load manual tasks from localStorage:', err);
    return [];
  }
};

/**
 * Persists the entire manual tasks list to localStorage
 */
export const saveManualTasksList = (tasks: WorkItem[]): void => {
  try {
    localStorage.setItem(MANUAL_TASKS_STORAGE_KEY, JSON.stringify(tasks));
  } catch (err) {
    console.error('Failed to save manual tasks to localStorage:', err);
  }
};

/**
 * Saves a new manual task or updates an existing one if the ID matches
 */
export const saveManualTask = (task: WorkItem): WorkItem[] => {
  const current = getManualTasks();
  const existingIdx = current.findIndex((t) => t.id === task.id);
  let updated: WorkItem[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = {
      ...task,
      fields: {
        ...task.fields,
        'Custom.IsManual': true,
        'System.ChangedDate': new Date().toISOString(),
      },
    };
  } else {
    const newItem: WorkItem = {
      ...task,
      fields: {
        ...task.fields,
        'Custom.IsManual': true,
        'System.CreatedDate': task.fields['System.CreatedDate'] || new Date().toISOString(),
        'System.ChangedDate': new Date().toISOString(),
      },
    };
    updated = [newItem, ...current];
  }
  saveManualTasksList(updated);
  return updated;
};

/**
 * Updates partial fields of a manual task by ID
 */
export const updateManualTask = (
  id: number,
  partialFields: Partial<WorkItemFields>
): WorkItem[] => {
  const current = getManualTasks();
  const updated = current.map((item) => {
    if (item.id === id) {
      return {
        ...item,
        fields: {
          ...item.fields,
          ...partialFields,
          'Custom.IsManual': true,
          'System.ChangedDate': new Date().toISOString(),
        },
      };
    }
    return item;
  });
  saveManualTasksList(updated);
  return updated;
};

/**
 * Deletes a manual task by ID
 */
export const deleteManualTask = (id: number): WorkItem[] => {
  const current = getManualTasks();
  const updated = current.filter((t) => t.id !== id);
  saveManualTasksList(updated);
  return updated;
};

/**
 * Finds the next available ID for a new manual task.
 * Looks at existing tasks in the board, finds max numeric ID, and returns maxId + 1.
 * Defaults to 178 if board max is 177.
 */
export const getNextManualTaskId = (workItems: WorkItem[]): number => {
  const manual = getManualTasks();
  const all = [...workItems, ...manual];
  let maxId = 177;
  for (const item of all) {
    const num = typeof item.id === 'number' ? item.id : parseInt(String(item.id), 10);
    if (!isNaN(num) && num > maxId) {
      maxId = num;
    }
  }
  return maxId + 1;
};

/**
 * Merges manual tasks with Azure tasks.
 * Manual tasks whose ID is not already returned by Azure DevOps are included.
 */
export const mergeWithManualTasks = (azureTasks: WorkItem[]): WorkItem[] => {
  const manualTasks = getManualTasks();
  if (manualTasks.length === 0) return azureTasks;

  const azureIds = new Set(azureTasks.map((t) => t.id));
  const nonConflictingManual = manualTasks.filter((m) => !azureIds.has(m.id));

  return [...nonConflictingManual, ...azureTasks];
};
