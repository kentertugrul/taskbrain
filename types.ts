export enum TaskStatus {
  BACKLOG = 'BACKLOG',
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED'
}

export enum TaskDecision {
  DO = 'DO',
  DELAY = 'DELAY',
  DELEGATE = 'DELEGATE',
  DROP = 'DROP'
}

export interface SubTask {
  id: string;
  title: string;
  status: TaskStatus;
}

export interface TaskAttachment {
  id: string;
  name: string;
  type: 'image' | 'video' | 'document' | 'audio' | 'other';
  url: string;
  size: number; // bytes
  uploadedAt: string;
  thumbnail?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  decision: TaskDecision;
  priorityScore: number; // 0-1
  dueAt?: string; // ISO
  createdAt: string;
  estimatedMinutes?: number;
  sourceChannel: 'WHATSAPP' | 'WEB' | 'EMAIL';
  subtasks: SubTask[];
  category?: 'WORK' | 'PERSONAL';
  attachments?: TaskAttachment[];
  emailForwardAddress?: string;
}

export interface CalendarConfig {
  id: string;
  summary: string; // Name of the calendar
  color?: string;
  selected: boolean;
  primary?: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO
  end: string; // ISO
  calendarId: string;
  link?: string;
}

export interface AiSubTaskDTO {
  title: string;
}

export interface AiTaskDTO {
  title: string;
  description?: string;
  estimatedMinutes?: number;
  dueAt?: string;
  decision?: TaskDecision;
  category?: 'WORK' | 'PERSONAL';
  priorityScore?: number;
  status?: TaskStatus;
  subtasks?: AiSubTaskDTO[];
}

export interface AiMeta {
  time_spent_minutes?: number;
  natural_language_summary?: string;
  thought_process?: string;
}

export interface TaskFilter {
  matchPhrase?: string;
  category?: 'WORK' | 'PERSONAL';
  status?: TaskStatus;
  all?: boolean;
}

export interface TaskUpdates {
  title?: string;
  description?: string;
  status?: TaskStatus;
  decision?: TaskDecision;
  priorityScore?: number;
  dueAt?: string;
  estimatedMinutes?: number;
  category?: 'WORK' | 'PERSONAL';
}

export interface AiInterpretation {
  intent: 'CREATE_TASKS' | 'UPDATE_TASKS' | 'MARK_TASK_DONE' | 'ASK_WHAT_NEXT' | 'LIST_TASKS_SUMMARY' | 'LOG_TIME_SPENT' | 'SMALL_TALK';
  tasks?: AiTaskDTO[];
  updates?: TaskUpdates;
  taskFilter?: TaskFilter;
  meta?: AiMeta;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  isAudio?: boolean;
  processingData?: any;
}
