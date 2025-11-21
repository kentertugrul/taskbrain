import React, { useState, useRef, useEffect } from 'react';
import { X, Sparkles, Send, Calendar, Clock, Tag, Briefcase, Home, ListTree, ChevronRight, Loader2, Mic, MicOff, Paperclip, FileText, Image as ImageIcon, Video, File, Download, Trash2, Mail, Copy, Check, Circle, Plus } from 'lucide-react';
import { Task, TaskStatus, TaskDecision, TaskAttachment } from '../types';
import { format } from 'date-fns';
import { GoogleGenAI } from "@google/genai";
import { generateEmailForwardAddress } from '../services/emailService';
import { uploadFile, deleteFile } from '../services/supabaseService';
import { VoiceRecorder } from '../services/whisperService';

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete?: (taskId: string) => void;
  apiKey: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, onClose, onUpdate, onDelete, apiKey }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: `I'm here to help you with "${task.title}". You can ask me to:\n• Change the title, description, or due date\n• Add or modify subtasks\n• Update priority or category\n• Provide context or details\n\nJust tell me what you'd like to change!`,
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [localAttachments, setLocalAttachments] = useState<TaskAttachment[]>(task.attachments || []);
  const [emailCopied, setEmailCopied] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const voiceRecorderRef = useRef<VoiceRecorder>(new VoiceRecorder());
  const webSpeechRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef_value = useRef<string>('');
  const liveTranscriptRef_value = useRef<string>('');
  const isListeningRef = useRef<boolean>(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Keep refs in sync with state
  useEffect(() => {
    inputRef_value.current = input;
  }, [input]);

  useEffect(() => {
    liveTranscriptRef_value.current = liveTranscript;
  }, [liveTranscript]);

  const toggleMicrophone = async () => {
    const recorder = voiceRecorderRef.current;

    if (isListeningRef.current) {
      // Stop recording
      const currentInput = inputRef_value.current;
      const currentLiveText = liveTranscriptRef_value.current;
      const combinedText = currentInput + (currentInput && currentLiveText ? ' ' : '') + currentLiveText;
      
      // Stop Web Speech
      if (webSpeechRef.current) {
        webSpeechRef.current.stop();
      }
      
      // Clear silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      // Update state
      setInput(combinedText);
      inputRef_value.current = combinedText;
      setLiveTranscript('');
      liveTranscriptRef_value.current = '';
      setIsListening(false);
      isListeningRef.current = false;
      setIsTranscribing(true);

      try {
        const audioBlob = await recorder.stopRecording();

        // Send to Whisper API for final accurate transcript
        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.webm');

        const response = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error('Whisper transcription failed');
        }

        const { text } = await response.json();
        
        // Combine original input with Whisper's accurate transcript
        const finalText = currentInput + (currentInput && text ? ' ' : '') + text;
        setInput(finalText);
        inputRef_value.current = finalText;

      } catch (error: any) {
        console.error('❌ Whisper error:', error);
      } finally {
        setIsTranscribing(false);
      }
      return;
    }

    // Start recording
    try {
      await recorder.startRecording();
      
      // Start Web Speech for live preview
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }

          let currentText = '';
          for (let i = 0; i < event.results.length; i++) {
            currentText += event.results[i][0].transcript;
          }
          
          setLiveTranscript(currentText);
          liveTranscriptRef_value.current = currentText;

          // Auto-stop after 3 seconds of silence
          silenceTimerRef.current = setTimeout(() => {
            toggleMicrophone();
          }, 3000);
        };

        recognition.onerror = (event: any) => {
          console.log('Web Speech error (non-critical):', event.error);
        };

        recognition.start();
        webSpeechRef.current = recognition;
      }
      
      setIsListening(true);
      isListeningRef.current = true;
      setLiveTranscript('');
      
    } catch (error: any) {
      console.error('Failed to start recording:', error);
      alert('Failed to access microphone. Please grant permission.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const filesArray = Array.from(files);
    
    for (const file of filesArray) {
      const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setUploadingFiles(prev => new Set(prev).add(fileId));
      
      try {
        const attachment = await uploadFile(file, task.id);
        
        const newAttachments = [...localAttachments, attachment];
        setLocalAttachments(newAttachments);
        onUpdate({ attachments: newAttachments });
      } catch (error: any) {
        console.error('Failed to upload file:', error);
        alert(`Failed to upload ${file.name}: ${error.message || 'Unknown error'}`);
      } finally {
        setUploadingFiles(prev => {
          const next = new Set(prev);
          next.delete(fileId);
          return next;
        });
      }
    }

    e.target.value = '';
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    const attachment = localAttachments.find(a => a.id === attachmentId);
    if (!attachment) return;

    if (!window.confirm(`Delete ${attachment.name}?`)) return;

    try {
      await deleteFile(attachment, task.id);
      const newAttachments = localAttachments.filter(a => a.id !== attachmentId);
      setLocalAttachments(newAttachments);
      onUpdate({ attachments: newAttachments });
    } catch (error: any) {
      console.error('Failed to delete attachment:', error);
      alert(`Failed to delete ${attachment.name}: ${error.message || 'Unknown error'}`);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getAttachmentIcon = (type: string) => {
    switch (type) {
      case 'image': return <ImageIcon size={16} />;
      case 'video': return <Video size={16} />;
      case 'document': return <FileText size={16} />;
      default: return <File size={16} />;
    }
  };

  const copyEmailAddress = () => {
    const email = task.emailForwardAddress || `task-${task.id}@taskbrain.app`;
    navigator.clipboard.writeText(email);
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2000);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !apiKey) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey });
      
      const systemPrompt = `You are a task management assistant. The user is editing this task:

CURRENT TASK:
- Title: "${task.title}"
- Description: "${task.description || 'None'}"
- Status: ${task.status}
- Category: ${task.category || 'None'}
- Priority: ${Math.round(task.priorityScore * 100)}%
- Due Date: ${task.dueAt ? format(new Date(task.dueAt), 'PPp') : 'None'}
- Estimated Time: ${task.estimatedMinutes || 'None'} minutes
- Subtasks (${task.subtasks.length}): ${task.subtasks.map(st => st.title).join(' | ') || 'None'}

When the user asks to change something, respond with JSON:
{
  "reply": "Friendly confirmation message (mention what changed)",
  "action": "update" or "delete",
  "updates": {
    "title": "new title if changed",
    "description": "new description if changed or elaborated",
    "dueAt": "ISO-8601 datetime if changed (e.g., ${new Date().toISOString()})",
    "priorityScore": number 0.0-1.0 if changed,
    "category": "WORK" or "PERSONAL" if changed,
    "estimatedMinutes": number if changed,
    "status": "BACKLOG" | "SCHEDULED" | "IN_PROGRESS" | "DONE" | "CANCELLED" if changed
  },
  "subtasks": {
    "add": [{"title": "subtask 1"}, {"title": "subtask 2"}],
    "remove": ["subtask id to remove"],
    "update": [{"id": "subtask id", "title": "new title", "status": "DONE"}]
  }
}

SUBTASK GENERATION:
- If user describes steps/phases/things to do, AUTOMATICALLY break them into subtasks
- If user says "break this down" or "add subtasks" or similar, generate logical steps
- If user provides a description with multiple steps, extract them as subtasks
- Each subtask should be a clear, actionable item
- Examples of triggers: "First..then..", "Steps:", "I need to:", numbered lists, voice memos describing a process

IMPORTANT:
- If user says "remove", "delete", "cancel" this task, set action to "delete"
- Only include fields in "updates" that should be changed
- For date/time changes, convert natural language to ISO-8601 format
- If user says "high priority" set priorityScore to 0.9, "medium" to 0.5, "low" to 0.2, "urgent" to 1.0
- If user says "mark as done/complete", set status to "DONE"
- If just asking questions or chatting, only include "reply"
- Current date/time: ${new Date().toISOString()}

Examples:
User: "Change due date to next Monday at 2pm"
Response: {"reply": "✅ Updated! Due date is now next Monday at 2pm.", "action": "update", "updates": {"dueAt": "2025-11-25T14:00:00.000Z"}}

User: "Remove this task" or "Delete this"
Response: {"reply": "✅ Task deleted.", "action": "delete"}

User: "For the presentation task, I need to first research competitors, then create slides, then practice, and finally send to team"
Response: {"reply": "✅ I've broken that down into 4 subtasks for you!", "action": "update", "subtasks": {"add": [{"title": "Research competitors"}, {"title": "Create slides"}, {"title": "Practice presentation"}, {"title": "Send to team"}]}}

User: "Add subtasks: call vendor, get quote, schedule meeting"
Response: {"reply": "✅ Added 3 subtasks!", "action": "update", "subtasks": {"add": [{"title": "Call vendor"}, {"title": "Get quote"}, {"title": "Schedule meeting"}]}}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: `${systemPrompt}\n\nUser: ${userMsg.content}`,
        config: {
          responseMimeType: "application/json"
        }
      });

      const aiResponse = JSON.parse(response.text || '{}');
      
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse.reply || "I've processed that!",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botMsg]);

      // Handle delete action
      if (aiResponse.action === 'delete') {
        if (onDelete) {
          setTimeout(() => {
            onDelete(task.id);
            onClose();
          }, 500);
        } else {
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: "I can't delete tasks yet, but I can mark it as cancelled.",
            timestamp: new Date().toISOString()
          }]);
          onUpdate({ status: TaskStatus.CANCELLED });
        }
      }
      // Apply updates if any
      else {
        const updates: any = { ...aiResponse.updates };
        
        // Handle subtask operations
        if (aiResponse.subtasks) {
          let currentSubtasks = [...task.subtasks];
          
          // Add new subtasks
          if (aiResponse.subtasks.add && aiResponse.subtasks.add.length > 0) {
            const newSubtasks = aiResponse.subtasks.add.map((st: any, idx: number) => ({
              id: `st-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
              title: st.title,
              status: TaskStatus.BACKLOG
            }));
            currentSubtasks = [...currentSubtasks, ...newSubtasks];
          }
          
          // Remove subtasks
          if (aiResponse.subtasks.remove && aiResponse.subtasks.remove.length > 0) {
            currentSubtasks = currentSubtasks.filter(st => 
              !aiResponse.subtasks.remove.includes(st.id)
            );
          }
          
          // Update existing subtasks
          if (aiResponse.subtasks.update && aiResponse.subtasks.update.length > 0) {
            aiResponse.subtasks.update.forEach((update: any) => {
              const index = currentSubtasks.findIndex(st => st.id === update.id);
              if (index !== -1) {
                currentSubtasks[index] = { ...currentSubtasks[index], ...update };
              }
            });
          }
          
          updates.subtasks = currentSubtasks;
        }
        
        if (Object.keys(updates).length > 0) {
          onUpdate(updates);
        }
      }

    } catch (error: any) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Error: ${error.message}`,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl h-[85vh] shadow-2xl flex overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Left Side - Task Details */}
        <div className="w-2/5 border-r border-slate-800 flex flex-col">
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Task Details</h2>
              <button 
                onClick={onClose}
                className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Title</label>
              <h3 className="text-2xl font-bold text-white">{task.title}</h3>
            </div>

            {/* Description */}
            {task.description && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description</label>
                <p className="text-slate-300 leading-relaxed">{task.description}</p>
              </div>
            )}

            {/* Meta Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status</label>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                  task.status === TaskStatus.DONE ? 'bg-emerald-900/50 text-emerald-300' :
                  task.status === TaskStatus.IN_PROGRESS ? 'bg-indigo-900/50 text-indigo-300' :
                  'bg-slate-800 text-slate-300'
                }`}>
                  {task.status}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Priority</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all"
                      style={{ width: `${task.priorityScore * 100}%` }}
                    />
                  </div>
                  <span className="text-indigo-400 font-mono text-sm">{Math.round(task.priorityScore * 100)}</span>
                </div>
              </div>
            </div>

            {/* Category & Due Date */}
            <div className="grid grid-cols-2 gap-4">
              {task.category && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Category</label>
                  <div className="flex items-center gap-2">
                    {task.category === 'WORK' ? (
                      <><Briefcase size={16} className="text-indigo-400" /><span className="text-indigo-300">Work</span></>
                    ) : (
                      <><Home size={16} className="text-pink-400" /><span className="text-pink-300">Personal</span></>
                    )}
                  </div>
                </div>
              )}

              {task.dueAt && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Due Date</label>
                  <div className="flex items-center gap-2 text-amber-400">
                    <Calendar size={16} />
                    <span className="text-sm">{format(new Date(task.dueAt), 'PPp')}</span>
                  </div>
                </div>
              )}
            </div>

            {task.estimatedMinutes && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Estimated Time</label>
                <div className="flex items-center gap-2 text-slate-300">
                  <Clock size={16} />
                  <span>{task.estimatedMinutes} minutes</span>
                </div>
              </div>
            )}

            {/* Subtasks */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ListTree size={14} /> Subtasks ({task.subtasks.length})
                </span>
                <button
                  onClick={() => {
                    const title = prompt('Enter subtask title:');
                    if (title && title.trim()) {
                      const newSubtask = {
                        id: `st-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                        title: title.trim(),
                        status: TaskStatus.BACKLOG
                      };
                      onUpdate({ subtasks: [...task.subtasks, newSubtask] });
                    }
                  }}
                  className="text-indigo-400 hover:text-indigo-300 text-xs font-normal normal-case tracking-normal flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border border-slate-700 hover:border-indigo-500 transition-colors"
                >
                  <Plus size={12} /> Add Subtask
                </button>
              </label>
              
              {task.subtasks.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-slate-800 rounded-lg">
                  <ListTree size={24} className="mx-auto text-slate-600 mb-2" />
                  <p className="text-slate-500 text-xs mb-3">No subtasks yet</p>
                  <p className="text-slate-600 text-xs px-4">
                    💡 Tip: Describe the steps in chat and I'll create subtasks automatically!
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {task.subtasks.map(st => (
                    <div key={st.id} className="flex items-center gap-3 p-3 bg-slate-950 rounded-lg border border-slate-800 group hover:border-slate-700">
                      <button
                        onClick={() => {
                          const updated = task.subtasks.map(sub => 
                            sub.id === st.id 
                              ? { ...sub, status: sub.status === TaskStatus.DONE ? TaskStatus.BACKLOG : TaskStatus.DONE }
                              : sub
                          );
                          onUpdate({ subtasks: updated });
                        }}
                        className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-colors ${
                          st.status === TaskStatus.DONE 
                            ? 'bg-emerald-600 border-emerald-600' 
                            : 'border-slate-600 hover:border-slate-400'
                        }`}
                      >
                        {st.status === TaskStatus.DONE && <Check size={12} className="text-white" />}
                      </button>
                      <span className={`text-sm flex-1 ${st.status === TaskStatus.DONE ? 'text-slate-600 line-through' : 'text-slate-300'}`}>
                        {st.title}
                      </span>
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete subtask "${st.title}"?`)) {
                            onUpdate({ subtasks: task.subtasks.filter(sub => sub.id !== st.id) });
                          }
                        }}
                        className="text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Attachments */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Paperclip size={14} /> Attachments ({localAttachments.length})
                </span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-indigo-400 hover:text-indigo-300 text-xs font-normal normal-case tracking-normal flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border border-slate-700 hover:border-indigo-500 transition-colors"
                >
                  <Paperclip size={12} /> Add Files
                </button>
              </label>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                accept="image/*,video/*,.pdf,.doc,.docx,.txt"
              />

              {localAttachments.length === 0 && uploadingFiles.size === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-slate-800 rounded-lg">
                  <Paperclip size={24} className="mx-auto text-slate-600 mb-2" />
                  <p className="text-slate-500 text-xs">No attachments yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {uploadingFiles.size > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-lg border border-slate-800">
                      <Loader2 size={16} className="text-indigo-400 animate-spin" />
                      <div className="text-sm text-slate-400">Uploading {uploadingFiles.size} file{uploadingFiles.size > 1 ? 's' : ''}...</div>
                    </div>
                  )}
                  {localAttachments.map(att => (
                    <div key={att.id} className="flex items-center gap-3 p-3 bg-slate-950 rounded-lg border border-slate-800 group hover:border-slate-700">
                      {att.thumbnail ? (
                        <img src={att.thumbnail} alt={att.name} className="w-10 h-10 rounded object-cover" />
                      ) : (
                        <div className="w-10 h-10 bg-slate-800 rounded flex items-center justify-center text-slate-400">
                          {getAttachmentIcon(att.type)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-300 truncate">{att.name}</div>
                        <div className="text-xs text-slate-500">{formatFileSize(att.size)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={att.url}
                          download={att.name}
                          className="text-slate-500 hover:text-indigo-400 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download size={16} />
                        </a>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteAttachment(att.id); }}
                          className="text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Email Forwarding */}
            <div className="bg-indigo-950/20 border border-indigo-800/30 rounded-xl p-4">
              <label className="block text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Mail size={14} /> Forward Emails to This Task
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-slate-950 text-slate-300 px-3 py-2 rounded-lg text-xs font-mono truncate border border-slate-800">
                  {task.emailForwardAddress || generateEmailForwardAddress(task.id)}
                </code>
                <button
                  onClick={copyEmailAddress}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  {emailCopied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Forward emails to this address and they'll be attached to this task automatically.
              </p>
            </div>

            {/* Metadata */}
            <div className="pt-6 border-t border-slate-800">
              <div className="text-xs text-slate-500 space-y-1">
                <div>Created: {format(new Date(task.createdAt), 'PPp')}</div>
                <div>Source: {task.sourceChannel}</div>
                <div>ID: {task.id}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - AI Chat */}
        <div className="flex-1 flex flex-col bg-slate-950">
          <div className="p-4 border-b border-slate-800 bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
                <Sparkles size={18} className="text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Task Assistant</h3>
                <p className="text-xs text-slate-500">Ask me to modify anything</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === 'user' ? 'bg-indigo-600' : 'bg-gradient-to-br from-purple-600 to-indigo-600'
                }`}>
                  {msg.role === 'user' ? (
                    <span className="text-white font-bold text-xs">You</span>
                  ) : (
                    <Sparkles size={14} className="text-white" />
                  )}
                </div>
                <div className={`max-w-[75%] p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
                  <Sparkles size={14} className="text-white animate-pulse" />
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-none p-3 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-slate-400" />
                  <span className="text-slate-400 text-sm">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-slate-800 bg-slate-900">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMicrophone}
                disabled={isTranscribing}
                className={`p-3 rounded-xl transition-all relative ${
                  isTranscribing 
                    ? 'bg-amber-500/20 text-amber-400' 
                    : isListening 
                    ? 'bg-red-500/20 text-red-400 animate-pulse' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={
                  isTranscribing ? 'Transcribing with Whisper...' :
                  isListening ? 'Stop Recording' : 
                  'Start Recording (Whisper AI)'
                }
              >
                {isTranscribing ? (
                  <Circle size={18} className="animate-spin" />
                ) : isListening ? (
                  <MicOff size={18} />
                ) : (
                  <Mic size={18} />
                )}
                {isListening && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                )}
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-slate-400 hover:text-slate-200 hover:bg-slate-800 p-3 rounded-xl transition-all"
                title="Attach files"
              >
                <Paperclip size={18} />
              </button>
              <input
                ref={inputRef}
                type="text"
                value={
                  isListening ? (input + (input && liveTranscript ? ' ' : '') + liveTranscript) :
                  input
                }
                onChange={(e) => {
                  if (!isListening && !isTranscribing) {
                    const newValue = e.target.value;
                    setInput(newValue);
                    inputRef_value.current = newValue;
                  }
                }}
                placeholder="e.g., Change due date to next Monday..."
                className="flex-1 bg-slate-950 text-white border border-slate-700 rounded-xl py-3 px-4 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-600 text-sm"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-lg shadow-indigo-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailModal;

