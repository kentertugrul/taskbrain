import { TaskAttachment } from "../types";

export const generateEmailForwardAddress = (taskId: string): string => {
  // In production, this would be a real email address that your backend handles
  // Format: task-{short-id}@taskbrain.yourdomain.com
  const shortId = taskId.substring(0, 12);
  return `task-${shortId}@taskbrain.app`;
};

export const handleEmailWebhook = async (emailData: any): Promise<TaskAttachment[]> => {
  // This would be called by your backend when an email is received
  // Parse email attachments and return them
  
  const attachments: TaskAttachment[] = [];
  
  if (emailData.attachments) {
    emailData.attachments.forEach((att: any) => {
      attachments.push({
        id: `email-att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: att.filename,
        type: att.contentType.startsWith('image/') ? 'image' : 
              att.contentType.startsWith('video/') ? 'video' : 'document',
        url: att.url,
        size: att.size,
        uploadedAt: new Date().toISOString()
      });
    });
  }

  return attachments;
};

// Example backend endpoint structure (for reference)
export const EMAIL_WEBHOOK_EXAMPLE = `
Backend Endpoint: POST /api/webhooks/email

Expected payload from email service (e.g., SendGrid, Mailgun):
{
  "to": "task-abc123@taskbrain.app",
  "from": "user@example.com",
  "subject": "RE: Task subject",
  "body": "Email content...",
  "attachments": [
    {
      "filename": "document.pdf",
      "contentType": "application/pdf",
      "size": 12345,
      "url": "https://storage.../document.pdf"
    }
  ]
}

Backend should:
1. Parse the 'to' address to extract task ID
2. Convert attachments to TaskAttachment format
3. Update task.attachments in database
4. Optionally: Add email content to task description or as a note
`;

