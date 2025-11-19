import { GoogleGenAI } from "@google/genai";
import { AiInterpretation, Task } from "../types";

const SYSTEM_INSTRUCTION = `
You are Task Brain, a task interpreter for a single busy user.
The user sends messages and voice transcripts describing what they did, what they need to do, or asking what they should work on.
You must return a single JSON object with fields 'intent', 'tasks', and 'meta'.

Intents: CREATE_TASKS, UPDATE_TASK, MARK_TASK_DONE, ASK_WHAT_NEXT, LIST_TASKS_SUMMARY, LOG_TIME_SPENT, SMALL_TALK

For CREATE_TASKS, you MUST return at least one task in the 'tasks' array.
For ASK_WHAT_NEXT, leave 'tasks' empty and use 'meta' to suggest the next action.

Task Fields:
- title: string (required)
- description: string (optional)
- estimatedMinutes: number (optional)
- dueAt: string (ISO-8601, optional)
- decision: DO, DELAY, DELEGATE, DROP (default DO)
- subtasks: array of objects { title: string } 
  **IMPORTANT**: If the user's request implies a project or multi-step process (e.g., "plan", "organize", "build", "prepare"), you MUST break it down into 2-5 logical subtasks.

Meta Fields:
- natural_language_summary: string (A short, friendly WhatsApp-style reply to the user confirming the action. Mention if subtasks were created.)
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
