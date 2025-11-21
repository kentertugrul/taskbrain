import { GoogleGenAI } from "@google/genai";
import { AiInterpretation, Task } from "../types";

const SYSTEM_INSTRUCTION = `
You are Task Brain, a task interpreter for a single busy user.
The user sends messages and voice transcripts describing what they did, what they need to do, or asking what they should work on.
You must return a single JSON object with fields 'intent', 'tasks', 'updates', and 'meta'.

Intents: CREATE_TASKS, UPDATE_TASKS, MARK_TASK_DONE, ASK_WHAT_NEXT, LIST_TASKS_SUMMARY, LOG_TIME_SPENT, SMALL_TALK

For CREATE_TASKS, you MUST return at least one task in the 'tasks' array.
For UPDATE_TASKS, you MUST return an 'updates' object with the changes to apply and optional 'taskFilter' to select which tasks.
For ASK_WHAT_NEXT, leave 'tasks' empty and use 'meta' to suggest the next action.

Task Fields (for CREATE_TASKS):
- title: string (required)
- description: string (optional)
- estimatedMinutes: number (optional)
- dueAt: string (ISO-8601, optional)
- decision: DO, DELAY, DELEGATE, DROP (default DO)
- category: WORK, PERSONAL (optional)
- priorityScore: number 0-1 (optional, for urgency)
- status: BACKLOG, SCHEDULED, IN_PROGRESS, DONE, CANCELLED (optional)
- subtasks: array of objects { title: string } 
  **IMPORTANT**: If the user's request implies a project or multi-step process (e.g., "plan", "organize", "build", "prepare"), you MUST break it down into 2-5 logical subtasks.

Update Fields (for UPDATE_TASKS):
- updates: object with any of the task fields above to update
- taskFilter: object to select which tasks to update:
  - matchPhrase: string (match tasks with this phrase in title/description)
  - category: WORK or PERSONAL (match tasks by category)
  - status: task status to match
  - all: boolean (if true, update ALL tasks matching other filters, or all tasks if no other filters)
  
Examples of UPDATE_TASKS:
- "Make all of those tasks work tasks" → { updates: { category: "WORK" }, taskFilter: { all: true } }
- "Make this task urgent" → { updates: { priorityScore: 0.9 }, taskFilter: { matchPhrase: "this" } }
- "Set deadline for the meeting task to tomorrow 2pm" → { updates: { dueAt: "2024-12-25T14:00:00Z" }, taskFilter: { matchPhrase: "meeting" } }
- "Mark all work tasks as in progress" → { updates: { status: "IN_PROGRESS" }, taskFilter: { category: "WORK" } }

Meta Fields:
- natural_language_summary: string (A short, friendly WhatsApp-style reply to the user confirming the action. For UPDATE_TASKS, mention how many tasks were updated.)
- time_spent_minutes: number (if logging time)

Current Date/Time: ${new Date().toISOString()}
`;

export const parseUserMessage = async (
  apiKey: string,
  userMessage: string,
  currentContext: Task[],
  model: string = 'gemini-2.0-flash-exp'
): Promise<AiInterpretation> => {
  if (!apiKey) throw new Error("API Key missing");

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: userMessage,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json"
      },
    });

    const text = response.text || "{}";
    return JSON.parse(text) as AiInterpretation;
  } catch (error) {
    console.error("AI Service Error:", error);
    throw error;
  }
};

export const suggestNextTask = async (apiKey: string, tasks: Task[], model: string = 'gemini-2.0-flash-exp'): Promise<string> => {
  if (!apiKey) return "Please configure API Key.";

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `
    Based on the following list of tasks, recommend the single best task to do right now (Next 60 minutes).
    Consider priority, deadlines, and logical flow.
    Return only a short, motivating sentence starting with "You should...".

    Tasks:
    ${JSON.stringify(tasks.filter(t => t.decision === 'DO' && t.status !== 'DONE').map(t => ({ title: t.title, priority: t.priorityScore, due: t.dueAt })))}
  `;

  const response = await ai.models.generateContent({
    model: model,
    contents: prompt,
  });

  return response.text || "Review your backlog.";
};
