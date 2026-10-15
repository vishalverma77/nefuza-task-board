import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  Typography,
  IconButton,
  Alert,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  Grid,
  Chip,
  InputAdornment,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PostAddIcon from '@mui/icons-material/PostAdd';
import EditNoteIcon from '@mui/icons-material/EditNote';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useSnackbar } from 'notistack';
import type { WorkItem, WorkItemType, WorkItemState, UncurlConnectionConfig, AzureIdentity } from '../../types/azureDevOps';
import {
  saveManualTask,
  updateManualTask,
  getNextManualTaskId,
} from '../../services/manualTasksStorage';
import {
  createTasqueeCard,
  logCardHours,
  cacheNefuzaTaskHours,
  DEFAULT_UNCURL_CONFIG,
} from '../../services/uncurlApi';

interface AddManualTaskDialogProps {
  open: boolean;
  onClose: () => void;
  existingWorkItems: WorkItem[];
  taskToEdit?: WorkItem | null;
  onTaskSaved: (savedItem: WorkItem, isNew: boolean) => void;
  uncurlConfig: UncurlConnectionConfig | null;
  onNeedTasqueeAuth?: () => void;
}

const WORK_ITEM_TYPES: WorkItemType[] = ['Task', 'Bug', 'User Story', 'Feature', 'Epic', 'Issue'];

const WORK_ITEM_STATES: WorkItemState[] = [
  'To Do',
  'New',
  'In Progress',
  'Active',
  'Resolved',
  'Closed',
  'Blocked',
];

export const AddManualTaskDialog: React.FC<AddManualTaskDialogProps> = ({
  open,
  onClose,
  existingWorkItems,
  taskToEdit,
  onTaskSaved,
  uncurlConfig,
  onNeedTasqueeAuth,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const isEditing = Boolean(taskToEdit);

  // Form Fields
  const [taskId, setTaskId] = useState<number>(178);
  const [title, setTitle] = useState('');
  const [workItemType, setWorkItemType] = useState<WorkItemType>('Task');
  const [state, setState] = useState<WorkItemState>('To Do');
  const [priority, setPriority] = useState<number>(2);
  const [assignedTo, setAssignedTo] = useState('Unassigned');
  const [sprint, setSprint] = useState('Sprint 1');
  const [spentHours, setSpentHours] = useState<string>('0');
  const [tags, setTags] = useState('Manual');
  const [description, setDescription] = useState('');
  const [addToTasquee, setAddToTasquee] = useState(false);

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Populate form on open or when taskToEdit changes
  useEffect(() => {
    if (!open) return;
    setFormError(null);

    if (taskToEdit) {
      setTaskId(taskToEdit.id);
      setTitle(taskToEdit.fields['System.Title'] || '');
      setWorkItemType((taskToEdit.fields['System.WorkItemType'] as WorkItemType) || 'Task');
      setState((taskToEdit.fields['System.State'] as WorkItemState) || 'To Do');
      setPriority(Number(taskToEdit.fields['System.Priority'] || taskToEdit.fields['Microsoft.VSTS.Common.Priority'] || 2));

      const assigned = taskToEdit.fields['System.AssignedTo'];
      if (typeof assigned === 'string') {
        setAssignedTo(assigned);
      } else if (typeof assigned === 'object' && assigned !== null) {
        setAssignedTo((assigned as AzureIdentity).displayName || 'Unassigned');
      } else {
        setAssignedTo('Unassigned');
      }

      setSprint(taskToEdit.fields['System.IterationPath'] || 'Sprint 1');
      const hours =
        taskToEdit.fields['Custom.SpentHours'] ??
        taskToEdit.fields['Microsoft.VSTS.Scheduling.CompletedWork'] ??
        0;
      setSpentHours(String(hours));
      setTags(taskToEdit.fields['System.Tags'] || 'Manual');
      setDescription(taskToEdit.fields['System.Description'] || '');
      setAddToTasquee(false);
    } else {
      const nextId = getNextManualTaskId(existingWorkItems);
      setTaskId(nextId);
      setTitle('');
      setWorkItemType('Task');
      setState('To Do');
      setPriority(2);
      setAssignedTo('Unassigned');
      setSprint('Sprint 1');
      setSpentHours('0');
      setTags('Manual');
      setDescription('');
      setAddToTasquee(false);
    }
  }, [open, taskToEdit, existingWorkItems]);

  const getEffectiveToken = (): string => {
    if (uncurlConfig?.bearerToken) return uncurlConfig.bearerToken;
    try {
      const raw = localStorage.getItem('uncurl_health_session');
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed.bearerToken || '';
      }
    } catch {
      return '';
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setFormError('Please enter a task title.');
      return;
    }

    const numericId = Number(taskId);
    if (isNaN(numericId) || numericId <= 0) {
      setFormError('Please enter a valid positive task ID number.');
      return;
    }

    // Check for ID conflicts only when creating a new task
    if (!isEditing) {
      const conflict = existingWorkItems.some((it) => it.id === numericId);
      if (conflict) {
        setFormError(`Task ID #${numericId} already exists on the board. Please use a unique ID.`);
        return;
      }
    }

    setLoading(true);

    try {
      let tasqueeCardId = taskToEdit?.fields?.['Custom.CardId'] as string | undefined;
      let addedToTasquee = taskToEdit?.fields?.['Custom.AddedToTasquee'] || false;

      // Handle Immediate Tasquee Card Creation if requested
      if (addToTasquee && !addedToTasquee) {
        const token = getEffectiveToken();
        if (!token) {
          setLoading(false);
          setFormError('Tasquee Bearer Token required to add to Tasquee. Please authorize first.');
          if (onNeedTasqueeAuth) onNeedTasqueeAuth();
          return;
        }

        const effectiveConfig: UncurlConnectionConfig = {
          organization: 'uncurl:health',
          requestUrl: uncurlConfig?.requestUrl || DEFAULT_UNCURL_CONFIG.requestUrl,
          apiKey: uncurlConfig?.apiKey || DEFAULT_UNCURL_CONFIG.apiKey,
          bearerToken: token,
        };

        const prefixRegex = new RegExp(`^task\\s*#?\\s*${numericId}\\s*[-:]?\\s*`, 'i');
        const cleanTitle = trimmedTitle.replace(prefixRegex, '').trim();
        const formattedTitle = cleanTitle ? `Task ${numericId} - ${cleanTitle}` : `Task ${numericId}`;

        const createdCard = await createTasqueeCard(
          {
            column_id: '5466d98a-aebc-4d5d-beb0-f32ad41453db',
            title: formattedTitle,
            position: 1,
            milestone_id: null,
            description: description.trim(),
          },
          effectiveConfig
        );

        if (createdCard && createdCard.id) {
          tasqueeCardId = String(createdCard.id);
          addedToTasquee = true;

          // Track in localStorage added IDs list
          try {
            const raw = localStorage.getItem('tasquee_added_task_ids');
            const ids: number[] = raw ? JSON.parse(raw) : [];
            if (!ids.includes(numericId)) {
              localStorage.setItem('tasquee_added_task_ids', JSON.stringify([...ids, numericId]));
            }
          } catch {
            // ignore
          }

          // If initial hours > 0, log initial hours to Tasquee
          const parsedHours = parseFloat(spentHours);
          if (!isNaN(parsedHours) && parsedHours > 0) {
            try {
              await logCardHours(
                {
                  card_id: String(createdCard.id),
                  hours: parsedHours,
                  description: 'Initial manual task hours logged',
                  logged_by_email: 'vishalverma@syncglob.com',
                  logged_by_name: 'Vishal Verma',
                },
                effectiveConfig
              );
              cacheNefuzaTaskHours(numericId, parsedHours, String(createdCard.id));
            } catch (err) {
              console.warn('Could not log initial hours to Tasquee:', err);
            }
          }
        }
      }

      const parsedSpentHours = parseFloat(spentHours) || 0;

      const manualWorkItem: WorkItem = {
        id: numericId,
        rev: (taskToEdit?.rev || 0) + 1,
        fields: {
          'System.Id': numericId,
          'System.Title': trimmedTitle,
          'System.WorkItemType': workItemType,
          'System.State': state,
          'System.Reason': 'Manual entry',
          'System.AssignedTo':
            assignedTo === 'Unassigned'
              ? 'Unassigned'
              : { displayName: assignedTo, uniqueName: `${assignedTo.toLowerCase().replace(/\s+/g, '.')}@syncglob.com` },
          'System.CreatedBy': taskToEdit?.fields?.['System.CreatedBy'] || { displayName: 'Vishal Verma' },
          'System.CreatedDate': taskToEdit?.fields?.['System.CreatedDate'] || new Date().toISOString(),
          'System.ChangedDate': new Date().toISOString(),
          'System.Priority': priority,
          'Microsoft.VSTS.Common.Priority': priority,
          'System.Description': description.trim(),
          'System.AreaPath': 'Nefuza',
          'System.IterationPath': sprint.trim() || 'Sprint 1',
          'System.Tags': tags.trim() || 'Manual',
          'Custom.IsManual': true,
          'Custom.SpentHours': parsedSpentHours,
          'Microsoft.VSTS.Scheduling.CompletedWork': parsedSpentHours,
          ...(tasqueeCardId ? { 'Custom.CardId': tasqueeCardId } : {}),
          ...(addedToTasquee ? { 'Custom.AddedToTasquee': true } : {}),
        },
      };

      if (isEditing) {
        updateManualTask(numericId, manualWorkItem.fields);
        enqueueSnackbar(`Task #${numericId} updated successfully!`, { variant: 'success' });
      } else {
        saveManualTask(manualWorkItem);
        if (parsedSpentHours > 0) {
          cacheNefuzaTaskHours(numericId, parsedSpentHours, tasqueeCardId);
        }
        enqueueSnackbar(
          addedToTasquee
            ? `Task #${numericId} created and synced to Tasquee!`
            : `Manual Task #${numericId} added to Nefuza board!`,
          { variant: 'success' }
        );
      }

      onTaskSaved(manualWorkItem, !isEditing);
      onClose();
    } catch (err: unknown) {
      console.error('Error saving manual task:', err);
      const msg = err instanceof Error ? err.message : 'Failed to save manual task.';
      setFormError(msg);
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3.5,
            p: { xs: 1, sm: 2 },
            bgcolor: 'background.paper',
            backgroundImage: 'none',
          },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              bgcolor: 'rgba(0, 180, 216, 0.12)',
              color: '#00b4d8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isEditing ? <EditNoteIcon /> : <PostAddIcon />}
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              {isEditing ? `Edit Manual Task #${taskId}` : 'Add Manual Task / Card'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {isEditing
                ? 'Update task details on your Nefuza board'
                : 'Create a task on Nefuza board when it is not present in Azure DevOps'}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} disabled={loading} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent dividers sx={{ pt: 2, pb: 2 }}>
          {formError && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
              {formError}
            </Alert>
          )}

          <Grid container spacing={2}>
            {/* Task ID & Work Item Type */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Task ID"
                type="number"
                size="small"
                fullWidth
                disabled={isEditing}
                value={taskId}
                onChange={(e) => setTaskId(parseInt(e.target.value, 10) || 0)}
                helperText={isEditing ? 'ID cannot be modified' : 'Auto-suggested next ID'}
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">#</InputAdornment>,
                  },
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                select
                label="Type"
                size="small"
                fullWidth
                value={workItemType}
                onChange={(e) => setWorkItemType(e.target.value as WorkItemType)}
              >
                {WORK_ITEM_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                select
                label="State"
                size="small"
                fullWidth
                value={state}
                onChange={(e) => setState(e.target.value as WorkItemState)}
              >
                {WORK_ITEM_STATES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Title (Full Width) */}
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Task Title *"
                placeholder="e.g. INTC CARD click on transaction history row to open details..."
                size="small"
                fullWidth
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </Grid>

            {/* Priority, Assigned To, Spent Hours */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                select
                label="Priority"
                size="small"
                fullWidth
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
              >
                <MenuItem value={1}>P1 - High</MenuItem>
                <MenuItem value={2}>P2 - Medium</MenuItem>
                <MenuItem value={3}>P3 - Low</MenuItem>
                <MenuItem value={4}>P4 - Minor</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Assigned To"
                size="small"
                fullWidth
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                helperText="Name of assigned developer"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Initial Spent Hours"
                type="number"
                size="small"
                fullWidth
                value={spentHours}
                onChange={(e) => setSpentHours(e.target.value)}
                slotProps={{
                  input: {
                    endAdornment: <InputAdornment position="end">hrs</InputAdornment>,
                  },
                }}
                helperText="Logged or completed hours"
              />
            </Grid>

            {/* Sprint & Tags */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Sprint / Iteration"
                size="small"
                fullWidth
                value={sprint}
                onChange={(e) => setSprint(e.target.value)}
                placeholder="e.g. Sprint 1 or Nefuza\Sprint 1"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Tags"
                size="small"
                fullWidth
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. Manual; Frontend; Feature"
              />
            </Grid>

            {/* Description */}
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Description & Details"
                placeholder="Provide task details, specifications, reproduction steps, or instructions..."
                multiline
                rows={4}
                fullWidth
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Grid>

            {/* Direct Tasquee Integration Option */}
            {!isEditing && (
              <Grid size={{ xs: 12 }}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2.5,
                    bgcolor: 'rgba(0, 180, 216, 0.06)',
                    border: '1px solid rgba(0, 180, 216, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={addToTasquee}
                        onChange={(e) => setAddToTasquee(e.target.checked)}
                        color="info"
                      />
                    }
                    label={
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                          <AutoAwesomeIcon sx={{ fontSize: 16, color: '#00b4d8' }} />
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            Add on Tasquee immediately
                          </Typography>
                          <Chip
                            label="1-Click Tasquee Sync"
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.68rem',
                              bgcolor: '#dcfce7',
                              color: '#15803d',
                              fontWeight: 700,
                            }}
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          Creates card `Task #{taskId} - {title || '<Title>'}` on Tasquee Board automatically
                        </Typography>
                      </Box>
                    }
                    sx={{ m: 0 }}
                  />
                </Box>
              </Grid>
            )}
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
          <Button onClick={onClose} disabled={loading} color="inherit" sx={{ fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : isEditing ? <EditNoteIcon /> : <PostAddIcon />}
            sx={{
              bgcolor: '#00b4d8',
              '&:hover': { bgcolor: '#0096c7' },
              fontWeight: 800,
              px: 3,
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: '0 4px 14px rgba(0, 180, 216, 0.25)',
            }}
          >
            {loading ? 'Saving...' : isEditing ? 'Save Changes' : addToTasquee ? 'Create & Add to Tasquee' : 'Create Task'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
