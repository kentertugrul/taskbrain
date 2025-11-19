import { Task, TaskDecision, TaskStatus } from "../types";

export const INITIAL_TASKS: Task[] = [
  {
    id: 't-1',
    title: 'Finalize Scentcraft sales script',
    description: 'Needs closing paragraph and team review.',
    status: TaskStatus.BACKLOG,
    decision: TaskDecision.DO,
    priorityScore: 0.9,
    createdAt: new Date().toISOString(),
    estimatedMinutes: 60,
    sourceChannel: 'WHATSAPP',
    subtasks: [
      { id: 'st-1', title: 'Write closing paragraph', status: TaskStatus.BACKLOG },
      { id: 'st-2', title: 'Send to Slack channel', status: TaskStatus.BACKLOG }
    ]
  },
  {
    id: 't-2',
    title: 'Buy milk and coffee beans',
    status: TaskStatus.BACKLOG,
    decision: TaskDecision.DO,
    priorityScore: 0.4,
    createdAt: new Date().toISOString(),
    sourceChannel: 'WHATSAPP',
    subtasks: []
  },
  {
    id: 't-3',
    title: 'Review Q3 Roadmap',
    status: TaskStatus.SCHEDULED,
    decision: TaskDecision.DO,
    priorityScore: 0.85,
    dueAt: '2025-11-30T09:00:00',
    createdAt: new Date().toISOString(),
    estimatedMinutes: 120,
    sourceChannel: 'WEB',
    subtasks: []
  }
];
