import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../App';
import { Send, Mic, Bot, User, Terminal, Loader2, MicOff } from 'lucide-react';
import { parseUserMessage } from '../services/aiService';
import { Task, TaskDecision, TaskStatus, Message, AiInterpretation } from '../types';

const ChatSimulator = () => {
  const { tasks, addTask, apiKey } = useAppContext();
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'system', content: 'Task Brain Simulator connected. Waiting for input...', timestamp: new Date().toISOString() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const toggleMicrophone = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support Speech Recognition.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + (prev ? ' ' : '') + transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    if (!apiKey) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'system',
        content: 'ERROR: API Key is missing from environment variables (process.env.API_KEY).',
        timestamp: new Date().toISOString()
      }]);
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const interpretation: AiInterpretation = await parseUserMessage(apiKey, userMsg.content, tasks);

      let replyText = "I've processed that.";

      if (interpretation.meta?.natural_language_summary) {
        replyText = interpretation.meta.natural_language_summary;
      } else if (interpretation.intent === 'CREATE_TASKS' && interpretation.tasks) {
        const taskCount = interpretation.tasks.length;
        const subtaskCount = interpretation.tasks.reduce((acc, t) => acc + (t.subtasks?.length || 0), 0);
        replyText = `Captured ${taskCount} task(s)${subtaskCount > 0 ? ` and ${subtaskCount} subtasks` : ''}.`;
      }

      if (interpretation.tasks) {
        interpretation.tasks.forEach(t => {
          const taskId = `t-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          const subtasks = (t.subtasks || []).map((st, idx) => ({
            id: `st-${taskId}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
            title: st.title,
            status: TaskStatus.BACKLOG
          }));

          const newTask: Task = {
            id: taskId,
            title: t.title,
            description: t.description,
            status: TaskStatus.BACKLOG,
            decision: t.decision || TaskDecision.DO,
            priorityScore: 0.5,
            createdAt: new Date().toISOString(),
            estimatedMinutes: t.estimatedMinutes,
            dueAt: t.dueAt,
            sourceChannel: 'WHATSAPP',
            subtasks: subtasks
          };
          addTask(newTask);
        });
      }

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: replyText,
        timestamp: new Date().toISOString(),
        processingData: interpretation
      };
      setMessages(prev => [...prev, botMsg]);

    } catch (error: any) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'system',
        content: `Error processing message: ${error.message}`,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 
                ${msg.role === 'user' ? 'bg-indigo-600' : msg.role === 'assistant' ? 'bg-emerald-600' : 'bg-slate-700'}`}>
                {msg.role === 'user' ? <User size={16} /> : msg.role === 'assistant' ? <Bot size={16} /> : <Terminal size={16} />}
              </div>

              <div className={`max-w-[80%] space-y-2`}>
                <div className={`p-4 rounded-2xl shadow-md text-sm leading-relaxed
                    ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' :
                    msg.role === 'assistant' ? 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700' : 'bg-slate-900 text-mono text-xs border border-slate-800'}`}>
                  {msg.content}
                </div>
                {msg.processingData && (
                  <div className="bg-slate-950 rounded-lg p-3 border border-slate-800 text-xs font-mono overflow-x-auto">
                    <div className="text-slate-500 mb-1 flex items-center gap-2"><Terminal size={10} /> Backend JSON Output</div>
                    <pre className="text-emerald-400">{JSON.stringify(msg.processingData, null, 2)}</pre>
                  </div>
                )}
                <div className={`text-xs text-slate-500 ${msg.role === 'user' ? 'text-right' : ''}`}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-slate-900 border-t border-slate-800">
          <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMicrophone}
              className={`p-3 rounded-full transition-colors ${isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
              title={isListening ? "Stop Listening" : "Start Microphone"}
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message to the brain..."
              className="flex-1 bg-slate-950 text-white border border-slate-700 rounded-xl py-3 px-4 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-lg shadow-indigo-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </form>
          <p className="text-center text-xs text-slate-600 mt-2">
            Simulates WhatsApp Webhook &rarr; Java Backend &rarr; Gemini &rarr; Response
          </p>
        </div>
      </div>

      <div className="hidden lg:flex flex-col bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
          <Terminal size={18} /> Live Logic Stream
        </h3>
        <div className="flex-1 bg-slate-950 rounded-xl p-4 font-mono text-xs text-slate-400 overflow-y-auto space-y-2 border border-slate-800/50 shadow-inner">
          <p><span className="text-indigo-400">[SYSTEM]</span> WhatsApp Webhook Listener Active</p>
          <p><span className="text-indigo-400">[SYSTEM]</span> Loaded {tasks.length} tasks into context</p>
          <p><span className="text-amber-400">[WARN]</span> Google Calendar Token expired</p>
          {messages.filter(m => m.role !== 'system').map(m => (
            <div key={m.id} className="border-l-2 border-slate-700 pl-2 py-1">
              <span className={m.role === 'user' ? 'text-indigo-300' : 'text-emerald-300'}>
                [{m.role.toUpperCase()}]
              </span> {m.role === 'assistant' ? 'Generated Reply' : 'Received Payload'}
            </div>
          ))}
        </div>
        <div className="mt-6 p-4 bg-indigo-900/20 border border-indigo-500/20 rounded-xl">
          <h4 className="font-bold text-indigo-300 text-sm mb-2">Try saying...</h4>
          <ul className="text-sm text-slate-400 space-y-2 list-disc list-inside">
            <li>"Plan the offsite event, it needs venue booking, catering, and invites"</li>
            <li>"I spent 2 hours on the quarterly report"</li>
            <li>"What should I do next?"</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ChatSimulator;
