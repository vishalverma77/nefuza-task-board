import { apiClient } from './apiClient';
import type { WorkItem, UncurlConnectionConfig, WorkItemState } from '../types/azureDevOps';

export const DEFAULT_UNCURL_CONFIG: UncurlConnectionConfig = {
  organization: 'uncurl:health',
  requestUrl:
    'https://qoqnojeyetyicosfifdu.supabase.co/rest/v1/board_cards?select=*&column_id=in.%28e3a68217-c15e-49e1-9b8c-668efc18fb67%2C957e4a08-7041-455d-b2a3-10c2960a7cbe%2C1c81a2cd-27a3-4bd5-9c65-027ee4fae1a2%2C0e349cd3-0fd4-4838-957b-3e971c4405d3%2C7d63900d-ff68-472b-8fb9-ca05d0c0f937%29&order=position.asc',
  apiKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvcW5vamV5ZXR5aWNvc2ZpZmR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0MTI5ODQsImV4cCI6MjA2NTk4ODk4NH0.LVTjWKh7kGLMQhtT2jOSJ9bIPTG5CqPmecdHLWF9n0Q',
  bearerToken: '',
};

export interface CardHourEntry {
  id: string;
  card_id: string;
  hours: number;
  description?: string;
  logged_by_email?: string;
  logged_by_name?: string;
  logged_at?: string;
  created_at?: string;
  is_billed?: boolean;
  billed_in_invoice_id?: string | null;
  billed_at?: string | null;
}

/**
 * Maps known Supabase column UUIDs to human-friendly board states
 */
const COLUMN_STATE_MAP: Record<string, WorkItemState> = {
  'e3a68217-c15e-49e1-9b8c-668efc18fb67': 'To Do',
  '957e4a08-7041-455d-b2a3-10c2960a7cbe': 'In Progress',
  '1c81a2cd-27a3-4bd5-9c65-027ee4fae1a2': 'Active',
  '0e349cd3-0fd4-4838-957b-3e971c4405d3': 'Done',
  '7d63900d-ff68-472b-8fb9-ca05d0c0f937': 'Closed',
};

/**
 * Generates a stable numeric ID from string UUID if card_number is not available
 */
const generateNumericId = (val: unknown, fallbackIndex: number): number => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && String(parsed) === val) return parsed;

    // Deterministic hash of UUID string into a 4-5 digit number
    let hash = 0;
    for (let i = 0; i < val.length; i++) {
      hash = (hash << 5) - hash + val.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash % 9000) + 1000;
  }
  return 1000 + fallbackIndex;
};

/**
 * Recursively extracts plain text from any nested rich text / JSON node
 * (TipTap, ProseMirror, Slate, Lexical, Quill Delta, Editor.js, Draft.js, or arbitrary objects).
 */
export function extractTextFromNode(node: unknown): string {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (typeof node === 'boolean') return '';

  if (Array.isArray(node)) {
    return node.map(extractTextFromNode).filter(Boolean).join('\n');
  }

  if (typeof node === 'object') {
    const obj = node as Record<string, unknown>;

    // 1. Direct text / HTML / markdown properties
    if (typeof obj.text === 'string' && obj.text.trim()) return obj.text;
    if (typeof obj.insert === 'string' && obj.insert.trim()) return obj.insert;
    if (typeof obj.html === 'string' && obj.html.trim()) return obj.html;
    if (typeof obj.markdown === 'string' && obj.markdown.trim()) return obj.markdown;
    if (typeof obj.raw === 'string' && obj.raw.trim()) return obj.raw;
    if (typeof obj.value === 'string' && obj.value.trim()) return obj.value;

    // 2. TipTap / ProseMirror content array
    if (Array.isArray(obj.content)) {
      const sep = obj.type === 'doc' || obj.type === 'bulletList' || obj.type === 'orderedList' ? '\n' : ' ';
      const joined = obj.content.map(extractTextFromNode).filter(Boolean).join(sep);
      if (joined.trim()) return joined;
    }

    // 3. Slate.js / Lexical children array
    if (Array.isArray(obj.children)) {
      const joined = obj.children.map(extractTextFromNode).filter(Boolean).join('\n');
      if (joined.trim()) return joined;
    }

    // 4. Editor.js / Draft.js blocks array
    if (Array.isArray(obj.blocks)) {
      const joined = obj.blocks.map(extractTextFromNode).filter(Boolean).join('\n');
      if (joined.trim()) return joined;
    }

    // 5. Quill delta ops
    if (Array.isArray(obj.ops)) {
      const joined = obj.ops.map(extractTextFromNode).filter(Boolean).join('');
      if (joined.trim()) return joined;
    }

    // 6. Lexical root object
    if (obj.root && typeof obj.root === 'object') {
      const rootText = extractTextFromNode(obj.root);
      if (rootText.trim()) return rootText;
    }

    // 7. Editor.js data object
    if (obj.data && typeof obj.data === 'object') {
      const dataText = extractTextFromNode(obj.data);
      if (dataText.trim()) return dataText;
    }

    // 8. Named candidate properties
    for (const key of ['body', 'description', 'desc', 'details', 'content', 'notes', 'summary', 'message']) {
      if (obj[key] !== undefined && obj[key] !== null) {
        const valText = extractTextFromNode(obj[key]);
        if (valText.trim()) return valText;
      }
    }

    // 9. Generic fallback: traverse non-metadata keys
    const textPieces: string[] = [];
    for (const [k, v] of Object.entries(obj)) {
      const lk = k.toLowerCase();
      if (['id', 'type', 'key', 'name', 'color', 'version', 'time', 'attrs', 'marks', 'props'].includes(lk)) {
        continue;
      }
      const t = extractTextFromNode(v);
      if (t.trim()) textPieces.push(t.trim());
    }
    return textPieces.join('\n');
  }

  return '';
}

/**
 * Safely parses any description format (plain text, HTML, TipTap/ProseMirror JSONB object,
 * Quill delta, Slate, or stringified JSON) into clean HTML paragraphs.
 */
export const normalizeDescription = (raw: unknown): string => {
  if (raw === null || raw === undefined) return '';

  // 1. If it's a string, check if it's stringified JSON or encoded HTML
  if (typeof raw === 'string') {
    let trimmed = raw.trim();
    if (!trimmed) return '';

    // Handle encoded HTML tags like &lt;p&gt;
    if (trimmed.includes('&lt;') && trimmed.includes('&gt;')) {
      trimmed = trimmed
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&');
    }

    // Check for stringified JSON
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const parsed = JSON.parse(trimmed);
        return normalizeDescription(parsed);
      } catch {
        // Continue as regular text
      }
    }

    // If it's already HTML (contains HTML tags like <p>, <br>, <div>, <ul>, etc.)
    if (/<[a-z][\s\S]*>/i.test(trimmed)) {
      // Remove empty or break-only wrappers if they don't contain real content
      const plain = trimmed.replace(/<[^>]+>/g, '').trim();
      if (!plain && !trimmed.includes('<img')) {
        return '';
      }
      return trimmed;
    }

    // Convert plain text with newlines into HTML paragraphs
    const paragraphs = trimmed
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => `<p>${line}</p>`)
      .join('');

    return paragraphs || `<p>${trimmed}</p>`;
  }

  // 2. If it's an Array
  if (Array.isArray(raw)) {
    const text = raw.map(extractTextFromNode).filter(Boolean).join('\n');
    return text ? normalizeDescription(text) : '';
  }

  // 3. If it's an Object (e.g. JSONB / rich text AST)
  if (typeof raw === 'object' && raw !== null) {
    const text = extractTextFromNode(raw);
    if (text && text.trim()) {
      return normalizeDescription(text.trim());
    }
    return '';
  }

  return '';
};

/**
 * Normalizes a Supabase Tasquee board_card object into the standard WorkItem format
 */
export const mapBoardCardToWorkItem = (
  card: Record<string, unknown>,
  index: number,
  spentHours?: number,
  fallbackLogDescs?: string[]
): WorkItem => {
  const numericId = generateNumericId(card.card_number || card.number || card.id, index);
  const cardUuid = String(card.id || '');

  const rawTitle = (card.title || card.name || card.header || 'Untitled Task') as string;

  // Search across all candidate description field names in card (case-insensitive)
  let rawDescCandidate: unknown =
    card.description ??
    card.desc ??
    card.details ??
    card.content ??
    card.notes ??
    card.body ??
    card.text ??
    card.summary ??
    card.card_description ??
    '';

  if (!rawDescCandidate) {
    for (const [k, v] of Object.entries(card)) {
      const lk = k.toLowerCase();
      if (
        (lk.includes('desc') || lk.includes('detail') || lk.includes('content') || lk.includes('note') || lk.includes('summary')) &&
        v !== null &&
        v !== undefined &&
        v !== ''
      ) {
        rawDescCandidate = v;
        break;
      }
    }
  }

  let cleanDescription = normalizeDescription(rawDescCandidate);

  // If card has no description or empty, but has time log descriptions, use them!
  if (!cleanDescription && fallbackLogDescs && fallbackLogDescs.length > 0) {
    const formatted = fallbackLogDescs
      .map((d, i) => `${fallbackLogDescs.length > 1 ? `${i + 1}. ` : ''}${d}`)
      .join('\n');
    cleanDescription = normalizeDescription(formatted);
  }

  const columnId = (card.column_id || card.columnId || '') as string;
  const state: WorkItemState =
    (card.state as WorkItemState) ||
    (card.status as WorkItemState) ||
    COLUMN_STATE_MAP[columnId] ||
    'Active';

  const createdDate = (card.created_at || card.createdAt || new Date().toISOString()) as string;
  const updatedDate = (card.updated_at || card.updatedAt || createdDate) as string;

  let assignedName = 'Unassigned';
  if (typeof card.assigned_to === 'string') assignedName = card.assigned_to;
  else if (typeof card.assignee === 'string') assignedName = card.assignee;
  else if (card.assignee && typeof card.assignee === 'object') {
    const a = card.assignee as Record<string, unknown>;
    assignedName = (a.name || a.displayName || a.email || 'Unassigned') as string;
  }

  const priorityVal = typeof card.priority === 'number' ? card.priority : 2;

  let tagsStr = '';
  if (Array.isArray(card.tags)) tagsStr = card.tags.join('; ');
  else if (typeof card.tags === 'string') tagsStr = card.tags;

  const finalSpentHours = spentHours !== undefined && spentHours > 0 ? spentHours : undefined;

  return {
    id: numericId,
    fields: {
      'System.Id': numericId,
      'System.Title': rawTitle,
      'System.WorkItemType': (card.type as string) || 'Task',
      'System.State': state,
      'System.Description': cleanDescription,
      'System.CreatedDate': createdDate,
      'System.ChangedDate': updatedDate,
      'System.AssignedTo': {
        displayName: assignedName,
      },
      'System.Priority': priorityVal,
      'System.IterationPath': 'uncurl:health',
      'System.Tags': tagsStr,
      'Custom.CardId': cardUuid,
      'Custom.RawCard': card,
      'Custom.SpentHours': finalSpentHours,
      'Microsoft.VSTS.Scheduling.CompletedWork': finalSpentHours,
    },
  };
};

/**
 * Fetches cards and initial hours from Supabase via our backend proxy
 */
export const fetchUncurlWorkItems = async (config: UncurlConnectionConfig): Promise<WorkItem[]> => {
  if (!config.requestUrl || !config.apiKey || !config.bearerToken) {
    throw new Error('Tasquee Board credentials are incomplete. Please provide your Bearer token.');
  }

  const cleanToken = config.bearerToken.trim().startsWith('Bearer ')
    ? config.bearerToken.trim()
    : `Bearer ${config.bearerToken.trim()}`;

  // Helper for resilient board cards fetch
  const getCardsData = async (): Promise<Record<string, unknown>[]> => {
    try {
      const res = await apiClient.post<{ success: boolean; data: Record<string, unknown>[]; message?: string }>(
        '/board-tasks',
        {
          requestUrl: config.requestUrl,
          apiKey: config.apiKey,
          bearerToken: config.bearerToken,
        }
      );
      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        return res.data.data;
      }
    } catch {
      // Fallback: Direct call to Supabase REST API
    }
    const resp = await fetch(config.requestUrl.trim(), {
      headers: {
        apikey: config.apiKey.trim(),
        Authorization: cleanToken,
        Accept: 'application/json',
      },
    });
    if (!resp.ok) {
      throw new Error(`Failed to fetch tasks from Tasquee Board (HTTP ${resp.status})`);
    }
    return (await resp.json()) as Record<string, unknown>[];
  };

  // Helper for resilient hours fetch
  const getHoursData = async (): Promise<CardHourEntry[]> => {
    try {
      const res = await apiClient.post<{ success: boolean; data: CardHourEntry[]; message?: string }>(
        '/board-card-hours',
        {
          cardId: 'ALL',
          apiKey: config.apiKey,
          bearerToken: config.bearerToken,
        }
      );
      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        return res.data.data;
      }
    } catch {
      // Fallback: Direct call to Supabase REST API
    }
    try {
      const targetUrl = 'https://qoqnojeyetyicosfifdu.supabase.co/rest/v1/card_hours?select=*&order=logged_at.desc';
      const resp = await fetch(targetUrl, {
        headers: {
          apikey: config.apiKey.trim(),
          Authorization: cleanToken,
          Accept: 'application/json',
        },
      });
      if (resp.ok) {
        return (await resp.json()) as CardHourEntry[];
      }
    } catch {
      // Ignore fallback failure for hours
    }
    return [];
  };

  // Fetch cards and all card hours in parallel with full fallbacks
  const [rawCards, hoursData] = await Promise.all([getCardsData(), getHoursData()]);

  if (!Array.isArray(rawCards)) {
    return [];
  }

  // Calculate sum of hours per card AND aggregate time log descriptions
  const hoursMap: Record<string, number> = {};
  const logDescMap: Record<string, string[]> = {};

  if (Array.isArray(hoursData)) {
    for (const entry of hoursData) {
      if (entry.card_id) {
        hoursMap[entry.card_id] = (hoursMap[entry.card_id] || 0) + (Number(entry.hours) || 0);
        if (entry.description && typeof entry.description === 'string' && entry.description.trim()) {
          if (!logDescMap[entry.card_id]) logDescMap[entry.card_id] = [];
          logDescMap[entry.card_id].push(entry.description.trim());
        }
      }
    }
  }

  return rawCards.map((card, idx) => {
    const cardUuid = String(card.id || '');
    const cardHours = hoursMap[cardUuid];
    const fallbackDescs = logDescMap[cardUuid];
    return mapBoardCardToWorkItem(card, idx, cardHours, fallbackDescs);
  });
};

/**
 * Fetches time tracking / hours logged for a specific card from Supabase
 */
export const fetchUncurlCardHours = async (
  cardId: string,
  config: UncurlConnectionConfig
): Promise<CardHourEntry[]> => {
  if (!cardId || !config.apiKey || !config.bearerToken) {
    return [];
  }

  try {
    const response = await apiClient.post<{ success: boolean; data: CardHourEntry[]; message?: string }>(
      '/board-card-hours',
      {
        cardId,
        apiKey: config.apiKey,
        bearerToken: config.bearerToken,
      }
    );
    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      return response.data.data;
    }
  } catch {
    // Direct Supabase REST fallback
  }

  const cleanToken = config.bearerToken.trim().startsWith('Bearer ')
    ? config.bearerToken.trim()
    : `Bearer ${config.bearerToken.trim()}`;

  let targetUrl = 'https://qoqnojeyetyicosfifdu.supabase.co/rest/v1/card_hours?select=*&order=logged_at.desc';
  if (cardId && cardId !== 'ALL') {
    targetUrl = `https://qoqnojeyetyicosfifdu.supabase.co/rest/v1/card_hours?select=*&card_id=eq.${encodeURIComponent(cardId)}&order=logged_at.desc`;
  }

  const resp = await fetch(targetUrl, {
    headers: {
      apikey: config.apiKey.trim(),
      Authorization: cleanToken,
      Accept: 'application/json',
    },
  });

  if (!resp.ok) {
    throw new Error('Failed to fetch card hours');
  }

  const data = (await resp.json()) as CardHourEntry[];
  return Array.isArray(data) ? data : [];
};

export interface CreateTasqueeCardPayload {
  column_id?: string;
  title: string;
  position?: number;
  milestone_id?: string | null;
  description?: string;
}

/**
 * Exact Supabase GET endpoint to fetch live cards across board columns
 */
export const TASQUEE_BOARD_GET_URL =
  'https://qoqnojeyetyicosfifdu.supabase.co/rest/v1/board_cards?select=*&column_id=in.%28048e712d-e7f9-4de8-8f1f-cda88f43f0b7%2Cd5740a9b-fe80-4617-b78d-f92fc353071d%2C5003b864-0c8c-4278-a538-2a06689a55a3%2C5466d98a-aebc-4d5d-beb0-f32ad41453db%2C255a75cc-91f0-4ba6-bfcd-742c9ed4d24b%29&order=position.asc';

export const ALL_TASQUEE_BOARD_CARDS_URL =
  'https://qoqnojeyetyicosfifdu.supabase.co/rest/v1/board_cards?select=*&order=created_at.desc';

/**
 * Creates a new task card on Tasquee / Supabase with title and description
 */
export const createTasqueeCard = async (
  cardData: CreateTasqueeCardPayload,
  config: UncurlConnectionConfig
): Promise<Record<string, unknown>> => {
  if (!config.apiKey || !config.bearerToken) {
    throw new Error('Tasquee Bearer Token is required. Please authorize your token first.');
  }

  const payloadCard = {
    column_id: cardData.column_id || '5466d98a-aebc-4d5d-beb0-f32ad41453db',
    title: cardData.title,
    position: cardData.position ?? 1,
    milestone_id: cardData.milestone_id ?? null,
    description: cardData.description || '',
  };

  try {
    const response = await apiClient.post<{ success: boolean; data: Record<string, unknown>; message?: string }>(
      '/create-tasquee-card',
      {
        apiKey: config.apiKey,
        bearerToken: config.bearerToken,
        cardData: payloadCard,
      }
    );
    if (response.data && response.data.success && response.data.data) {
      return response.data.data;
    }
  } catch {
    // Direct Supabase REST fallback
  }

  const cleanToken = config.bearerToken.trim().startsWith('Bearer ')
    ? config.bearerToken.trim()
    : `Bearer ${config.bearerToken.trim()}`;

  const targetUrl = 'https://qoqnojeyetyicosfifdu.supabase.co/rest/v1/board_cards?select=*';
  const resp = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      apikey: config.apiKey.trim(),
      Authorization: cleanToken,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.pgrst.object+json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payloadCard),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Failed to create task on Tasquee: ${errText || resp.statusText}`);
  }

  const rawJson = (await resp.json()) as unknown;
  const createdCard = (Array.isArray(rawJson) ? rawJson[0] : rawJson) as Record<string, unknown>;

  if (payloadCard.description && createdCard && createdCard.id) {
    const cardId = createdCard.id;
    try {
      const patchUrl = `https://qoqnojeyetyicosfifdu.supabase.co/rest/v1/board_cards?id=eq.${encodeURIComponent(String(cardId))}`;
      await fetch(patchUrl, {
        method: 'PATCH',
        headers: {
          apikey: config.apiKey.trim(),
          Authorization: cleanToken,
          'Content-Type': 'application/json',
          Accept: '*/*',
        },
        body: JSON.stringify({ description: payloadCard.description }),
      });
    } catch {
      // Ignore patch error
    }
  }

  return createdCard;
};

/**
 * Fetches live cards from Tasquee to determine which tasks are currently added on Tasquee.
 * If a card is deleted in Tasquee, it will no longer be returned here.
 */
export const fetchTasqueeExistingTaskIds = async (
  config: UncurlConnectionConfig
): Promise<number[]> => {
  if (!config.apiKey || !config.bearerToken) {
    return [];
  }

  const cleanToken = config.bearerToken.trim().startsWith('Bearer ')
    ? config.bearerToken.trim()
    : `Bearer ${config.bearerToken.trim()}`;

  const parseTaskIds = (cardsList: Array<{ id: string; title?: string }>): number[] => {
    const ids: number[] = [];
    for (const card of cardsList) {
      if (typeof card.title === 'string') {
        const match = card.title.match(/(?:task\s*#?|#|^)\s*(\d+)/i);
        if (match && match[1]) {
          const parsedId = parseInt(match[1], 10);
          if (!isNaN(parsedId) && !ids.includes(parsedId)) {
            ids.push(parsedId);
          }
        }
      }
    }
    return ids;
  };

  try {
    const response = await apiClient.post<{ success: boolean; data: Array<{ id: string; title?: string }> }>(
      '/board-tasks',
      {
        requestUrl: ALL_TASQUEE_BOARD_CARDS_URL,
        apiKey: config.apiKey,
        bearerToken: config.bearerToken,
      }
    );

    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      return parseTaskIds(response.data.data);
    }
  } catch {
    // Direct Supabase REST fallback
  }

  try {
    const resp = await fetch(ALL_TASQUEE_BOARD_CARDS_URL, {
      headers: {
        apikey: config.apiKey.trim(),
        Authorization: cleanToken,
        Accept: 'application/json',
      },
    });
    if (resp.ok) {
      const data = (await resp.json()) as Array<{ id: string; title?: string }>;
      if (Array.isArray(data)) {
        return parseTaskIds(data);
      }
    }
  } catch (err) {
    console.warn('[Tasquee Sync] Could not fetch existing cards to check added status:', err);
  }

  return [];
};

export interface LogCardHoursPayload {
  card_id: string;
  hours: number;
  description?: string | null;
  logged_by_email?: string;
  logged_by_name?: string;
}

/**
 * Logs hours on a Tasquee card via POST https://qoqnojeyetyicosfifdu.supabase.co/rest/v1/card_hours
 */
export const logCardHours = async (
  payload: LogCardHoursPayload,
  config: UncurlConnectionConfig
): Promise<CardHourEntry> => {
  if (!config.apiKey || !config.bearerToken) {
    throw new Error('Tasquee Bearer Token is required to log hours. Please authorize your session first.');
  }

  const hoursData = {
    card_id: payload.card_id,
    hours: Number(payload.hours),
    description: payload.description || null,
    logged_by_email: payload.logged_by_email || 'vishalverma@syncglob.com',
    logged_by_name: payload.logged_by_name || 'Vishal Verma',
  };

  try {
    const response = await apiClient.post<{ success: boolean; data: CardHourEntry; message?: string }>(
      '/create-card-hours',
      {
        apiKey: config.apiKey,
        bearerToken: config.bearerToken,
        hoursData,
      }
    );

    if (response.data && response.data.success && response.data.data) {
      return response.data.data;
    }
  } catch {
    // Direct Supabase REST fallback
  }

  const cleanToken = config.bearerToken.trim().startsWith('Bearer ')
    ? config.bearerToken.trim()
    : `Bearer ${config.bearerToken.trim()}`;

  const targetUrl = 'https://qoqnojeyetyicosfifdu.supabase.co/rest/v1/card_hours?select=*';
  const resp = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      apikey: config.apiKey.trim(),
      Authorization: cleanToken,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.pgrst.object+json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(hoursData),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Failed to log hours on Tasquee: ${errText || resp.statusText}`);
  }

  return (await resp.json()) as CardHourEntry;
};

/**
 * Finds the live Tasquee card UUID matching a task ID
 */
export const findTasqueeCardForTask = async (
  taskId: number | string,
  config: UncurlConnectionConfig
): Promise<{ id: string; title: string } | null> => {
  if (!config.apiKey || !config.bearerToken) return null;

  const cleanToken = config.bearerToken.trim().startsWith('Bearer ')
    ? config.bearerToken.trim()
    : `Bearer ${config.bearerToken.trim()}`;

  const findMatch = (cardsList: Array<{ id: string; title?: string }>) => {
    const match = cardsList.find((c) => {
      if (!c.title) return false;
      const re = new RegExp(`(?:task\\s*#?|#|^)\\s*${taskId}(\\s+|-|:|$|\\b)`, 'i');
      return re.test(c.title);
    });
    return match ? { id: match.id, title: match.title || '' } : null;
  };

  try {
    const response = await apiClient.post<{ success: boolean; data: Array<{ id: string; title?: string }> }>(
      '/board-tasks',
      {
        requestUrl: ALL_TASQUEE_BOARD_CARDS_URL,
        apiKey: config.apiKey,
        bearerToken: config.bearerToken,
      }
    );

    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      const match = findMatch(response.data.data);
      if (match) return match;
    }
  } catch {
    // Direct Supabase REST fallback
  }

  try {
    const resp = await fetch(ALL_TASQUEE_BOARD_CARDS_URL, {
      headers: {
        apikey: config.apiKey.trim(),
        Authorization: cleanToken,
        Accept: 'application/json',
      },
    });
    if (resp.ok) {
      const data = (await resp.json()) as Array<{ id: string; title?: string }>;
      if (Array.isArray(data)) {
        return findMatch(data);
      }
    }
  } catch (e) {
    console.warn('Could not match Tasquee card for task', e);
  }

  return null;
};

export const NEFUZA_HOURS_CACHE_KEY = 'nefuza_tasquee_spent_hours_map';

/**
 * Caches task spent hours in localStorage so reload never wipes them out
 */
export const cacheNefuzaTaskHours = (taskId: number | string, hours: number, cardId?: string) => {
  try {
    const raw = localStorage.getItem(NEFUZA_HOURS_CACHE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[taskId] = { hours, cardId: cardId || map[taskId]?.cardId };
    localStorage.setItem(NEFUZA_HOURS_CACHE_KEY, JSON.stringify(map));
  } catch (e) {
    console.error('Failed to cache task hours', e);
  }
};

/**
 * Automatically attaches Tasquee logged hours (from Supabase card_hours) to Nefuza work items
 * so that spent hours persist across reloads, in PLP table, and in Excel export.
 */
export const syncTasqueeHoursForNefuzaTasks = async (
  workItems: WorkItem[],
  customConfig?: UncurlConnectionConfig | null
): Promise<WorkItem[]> => {
  if (!workItems || workItems.length === 0) return workItems;

  // 1. Immediately apply cached hours from localStorage so UI is instantly populated upon reload
  let cachedMap: Record<string, { hours: number; cardId?: string }> = {};
  try {
    const raw = localStorage.getItem(NEFUZA_HOURS_CACHE_KEY);
    if (raw) {
      cachedMap = JSON.parse(raw);
      for (const item of workItems) {
        const cached = cachedMap[String(item.id)];
        if (cached && cached.hours > 0) {
          item.fields['Custom.SpentHours'] = cached.hours;
          item.fields['Microsoft.VSTS.Scheduling.CompletedWork'] = cached.hours;
          if (cached.cardId) item.fields['Custom.CardId'] = cached.cardId;
        }
      }
    }
  } catch {
    // Ignore cache parse error
  }

  // 2. Determine effective Tasquee Bearer Token
  const effectiveConfig: UncurlConnectionConfig | null =
    customConfig?.bearerToken
      ? customConfig
      : (() => {
          try {
            const raw = localStorage.getItem('uncurl_health_session');
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed.bearerToken) {
                return {
                  organization: 'uncurl:health',
                  requestUrl: parsed.requestUrl || DEFAULT_UNCURL_CONFIG.requestUrl,
                  apiKey: parsed.apiKey || DEFAULT_UNCURL_CONFIG.apiKey,
                  bearerToken: parsed.bearerToken,
                };
              }
            }
          } catch {
            return null;
          }
          return null;
        })();

  if (!effectiveConfig?.bearerToken) {
    return workItems;
  }

  const cleanToken = effectiveConfig.bearerToken.trim().startsWith('Bearer ')
    ? effectiveConfig.bearerToken.trim()
    : `Bearer ${effectiveConfig.bearerToken.trim()}`;

  // 3. Fetch live Tasquee cards and card hours in parallel with direct fallbacks
  try {
    const fetchCards = async (): Promise<Array<{ id: string; title?: string }>> => {
      try {
        const res = await apiClient.post<{ success: boolean; data: Array<{ id: string; title?: string }> }>('/board-tasks', {
          requestUrl: ALL_TASQUEE_BOARD_CARDS_URL,
          apiKey: effectiveConfig.apiKey,
          bearerToken: effectiveConfig.bearerToken,
        });
        if (res.data?.success && Array.isArray(res.data.data)) return res.data.data;
      } catch {
        // Fallback
      }
      const r = await fetch(ALL_TASQUEE_BOARD_CARDS_URL, {
        headers: { apikey: effectiveConfig.apiKey.trim(), Authorization: cleanToken, Accept: 'application/json' },
      });
      return r.ok ? ((await r.json()) as Array<{ id: string; title?: string }>) : [];
    };

    const fetchHours = async (): Promise<CardHourEntry[]> => {
      try {
        const res = await apiClient.post<{ success: boolean; data: CardHourEntry[] }>('/board-card-hours', {
          cardId: 'ALL',
          apiKey: effectiveConfig.apiKey,
          bearerToken: effectiveConfig.bearerToken,
        });
        if (res.data?.success && Array.isArray(res.data.data)) return res.data.data;
      } catch {
        // Fallback
      }
      const r = await fetch('https://qoqnojeyetyicosfifdu.supabase.co/rest/v1/card_hours?select=*&order=logged_at.desc', {
        headers: { apikey: effectiveConfig.apiKey.trim(), Authorization: cleanToken, Accept: 'application/json' },
      });
      return r.ok ? ((await r.json()) as CardHourEntry[]) : [];
    };

    const [cards, hours] = await Promise.all([fetchCards(), fetchHours()]);

    // Sum hours by card_id
    const sumByCardId: Record<string, number> = {};
    for (const h of hours) {
      if (h.card_id) {
        sumByCardId[h.card_id] = (sumByCardId[h.card_id] || 0) + (Number(h.hours) || 0);
      }
    }

    // Match each Nefuza workItem to its Tasquee card
    for (const item of workItems) {
      const match = cards.find((c) => {
        if (!c.title) return false;
        const re = new RegExp(`(?:task\\s*#?|#|^)\\s*${item.id}(\\s+|-|:|$|\\b)`, 'i');
        return re.test(c.title);
      });

      if (match) {
        item.fields['Custom.CardId'] = match.id;
        const spent = sumByCardId[match.id] || 0;
        if (spent > 0) {
          item.fields['Custom.SpentHours'] = spent;
          item.fields['Microsoft.VSTS.Scheduling.CompletedWork'] = spent;
          cachedMap[String(item.id)] = { hours: spent, cardId: match.id };
        }
      }
    }

    // Persist updated map to localStorage cache
    localStorage.setItem(NEFUZA_HOURS_CACHE_KEY, JSON.stringify(cachedMap));
  } catch (err) {
    console.warn('[Tasquee Live Sync] Could not sync live hours for Nefuza tasks:', err);
  }

  return workItems;
};
