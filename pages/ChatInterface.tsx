import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../App';
import { Send, Mic, Bot, MicOff, Sparkles, CheckCircle2, Clock, Briefcase, Home, ChevronRight, Settings, X, Circle } from 'lucide-react';
import { parseUserMessage } from '../services/aiService';
import { Task, TaskDecision, TaskStatus, Message, AiInterpretation } from '../types';
import { format } from 'date-fns';
import { VoiceRecorder } from '../services/whisperService';

const ChatInterface = () => {
  const { tasks, addTask, apiKey } = useAppContext();
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: '1', 
      role: 'assistant', 
      content: "👋 Hey! I'm your Task Brain. Just brain dump everything on your mind, and I'll organize it into actionable tasks.\n\n💬 **How to use:**\n• Tell me about ALL your tasks, meetings, and to-dos\n• The more context you give, the better I can organize\n• I'll extract multiple tasks and break them into subtasks\n• Use voice or type paragraphs!\n\n**Example:**\n\"Tomorrow I have a client meeting at 2pm to discuss the Q4 roadmap. I need to prepare slides and send them by EOD today. Also need to buy groceries - milk, eggs, bread. And I should call mom this weekend. Oh, and the team offsite planning - we need venue, catering, and send invites by next week.\"", 
      timestamp: new Date().toISOString() 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [extractedTasks, setExtractedTasks] = useState<Task[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [localApiKey, setLocalApiKey] = useState(apiKey || '');
  const [selectedModel, setSelectedModel] = useState<'gemini-2.0-flash-exp' | 'gemini-1.5-flash' | 'gemini-1.5-pro'>('gemini-2.0-flash-exp');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSendPrompt, setShowSendPrompt] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState(''); // Real-time preview from Web Speech
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const voiceRecorderRef = useRef<VoiceRecorder>(new VoiceRecorder());
  const webSpeechRef = useRef<any>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Use refs to track the actual current values (not stale state)
  const inputRef_value = useRef<string>('');
  const liveTranscriptRef_value = useRef<string>('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // Auto-focus input on mount
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

    if (isListening) {
      // Use refs to get the ACTUAL current values (not stale state)
      const currentInput = inputRef_value.current;
      const currentLiveText = liveTranscriptRef_value.current;
      const combinedText = currentInput + (currentInput && currentLiveText ? ' ' : '') + currentLiveText;
      
      console.log('⏹️ STOPPING - Ref values:', { currentInput, currentLiveText, combinedText });
      
      // Stop Web Speech
      if (webSpeechRef.current) {
        webSpeechRef.current.stop();
      }
      
      // Clear silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      // Update state - React will batch these, but we've already captured the values in refs
      setIsListening(false);
      setIsTranscribing(true);
      setLiveTranscript('');
      setInput(combinedText); // This will persist even if other states clear

      try {
        const audioBlob = await recorder.stopRecording();
        console.log('🎤 Got audio blob, size:', audioBlob.size, 'bytes');

        // Send to Whisper API for final accurate transcript
        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.webm');

        console.log('📡 Sending to Whisper API...');
        const response = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error('Whisper transcription failed');
        }

        const { text } = await response.json();
        console.log('✅ Whisper returned:', text);
        
        // Combine original input with Whisper's accurate transcript
        const finalText = currentInput + (currentInput && text ? ' ' : '') + text;
        console.log('📝 Final combined text:', finalText);
        setInput(finalText);
        setShowSendPrompt(true);

      } catch (error: any) {
        console.error('❌ Whisper error:', error);
        // Input already has the combined text from earlier, so do nothing
        // Just show the prompt
        setShowSendPrompt(true);
        console.log('⚠️ Using live transcript (already in input)');
      } finally {
        setIsTranscribing(false);
      }
      return;
    }

    // Start recording with BOTH Whisper (for quality) and Web Speech (for preview)
    try {
      // Start Whisper recorder
      await recorder.startRecording();
      
      // Start Web Speech for live preview
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          // Clear silence timer
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }

          let currentText = '';
          for (let i = 0; i < event.results.length; i++) {
            currentText += event.results[i][0].transcript;
          }
          
          setLiveTranscript(currentText);

          // Auto-stop after 3 seconds of silence
          silenceTimerRef.current = setTimeout(() => {
            console.log('🤫 Pause detected, stopping...');
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
      setLiveTranscript('');
      console.log('🎤 Recording started (Whisper + live preview)...');
      
    } catch (error: any) {
      console.error('Failed to start recording:', error);
      alert('Failed to access microphone. Please grant permission.');
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    
    // Hide send prompt after sending
    setShowSendPrompt(false);
    
    if (!apiKey && !localApiKey) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'system',
        content: '⚠️ API Key is missing. Please set your GEMINI_API_KEY in the environment variables.',
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
      const interpretation: AiInterpretation = await parseUserMessage(localApiKey || apiKey, userMsg.content, tasks, selectedModel);

      let replyText = "Got it! I've processed that.";

      if (interpretation.meta?.natural_language_summary) {
        replyText = interpretation.meta.natural_language_summary;
      } else if (interpretation.intent === 'CREATE_TASKS' && interpretation.tasks) {
        const taskCount = interpretation.tasks.length;
        const subtaskCount = interpretation.tasks.reduce((acc, t) => acc + (t.subtasks?.length || 0), 0);
        replyText = `✅ Created ${taskCount} task(s)${subtaskCount > 0 ? ` with ${subtaskCount} subtasks` : ''}.`;
      }

      const newTasks: Task[] = [];
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
            sourceChannel: 'WEB',
            subtasks: subtasks,
            category: t.title.toLowerCase().includes('work') || t.title.toLowerCase().includes('meeting') || t.title.toLowerCase().includes('project') ? 'WORK' : 'PERSONAL'
          };
          addTask(newTask);
          newTasks.push(newTask);
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
      
      if (newTasks.length > 0) {
        setExtractedTasks(prev => [...newTasks, ...prev]);
      }

    } catch (error: any) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'system',
        content: `❌ Error: ${error.message}`,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
    <div className="h-[calc(100vh-8rem)] grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Chat Area */}
      <div className="lg:col-span-2 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-lg
                ${msg.role === 'user' ? 'bg-indigo-600' : msg.role === 'assistant' ? 'bg-gradient-to-br from-purple-600 to-indigo-600' : 'bg-slate-700'}`}>
                {msg.role === 'user' ? (
                  <span className="text-white font-bold text-sm">You</span>
                ) : msg.role === 'assistant' ? (
                  <Sparkles size={18} className="text-white" />
                ) : (
                  <Bot size={18} className="text-white" />
                )}
              </div>

              <div className={`max-w-[80%] space-y-2`}>
                <div className={`p-4 rounded-2xl shadow-md text-sm leading-relaxed whitespace-pre-line
                    ${msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : msg.role === 'assistant' 
                      ? 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700' 
                      : 'bg-amber-900/20 text-amber-200 border border-amber-800/50 text-xs font-mono'}`}>
                  {msg.content}
                </div>
                <div className={`text-xs text-slate-500 ${msg.role === 'user' ? 'text-right' : ''}`}>
                  {format(new Date(msg.timestamp), 'p')}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
                <Sparkles size={18} className="text-white animate-pulse" />
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-none p-4 flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-slate-400 text-sm">Thinking...</span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-slate-900 border-t border-slate-800">
          <div className="mb-2 text-xs text-slate-500 flex items-center justify-between">
            <span>{input.length} characters</span>
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              {isExpanded ? 'Collapse' : 'Expand for brain dump'}
            </button>
          </div>
          <form onSubmit={handleSendMessage} className="flex items-start gap-2">
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="p-3 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
                title="Settings"
              >
                <Settings size={20} />
              </button>
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
                  <Circle size={20} className="animate-spin" />
                ) : isListening ? (
                  <MicOff size={20} />
                ) : (
                  <Mic size={20} />
                )}
                {isListening && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                )}
              </button>
            </div>
            <textarea
              ref={inputRef}
              value={
                isListening ? (input + (input && liveTranscript ? ' ' : '') + liveTranscript) :
                isTranscribing ? (input + (liveTranscript ? ` ${liveTranscript}` : '')) :
                input
              }
              onChange={(e) => {
                if (!isListening && !isTranscribing) {
                  setInput(e.target.value);
                }
              }}
              placeholder="Brain dump everything... Tell me about all your tasks, meetings, ideas, to-dos. I'll organize them for you! 🧠"
              rows={isExpanded ? 8 : 2}
              className="flex-1 bg-slate-950 text-white border border-slate-700 rounded-xl py-3 px-4 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-600 resize-none"
              onKeyDown={(e) => {
                // Submit on Cmd/Ctrl + Enter
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-lg shadow-indigo-900/30 disabled:opacity-50 disabled:cursor-not-allowed self-end"
              title="Send (or Cmd/Ctrl + Enter)"
            >
              <Send size={20} />
            </button>
          </form>
          {showSendPrompt && !isListening && input.trim() && (
            <div className="mb-3 p-3 bg-indigo-900/20 border border-indigo-500/30 rounded-xl flex items-center justify-between animate-in slide-in-from-bottom-2 fade-in duration-200">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-indigo-400" />
                <span className="text-sm text-indigo-300 font-medium">Ready to extract tasks from your brain dump?</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={toggleMicrophone}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Mic size={12} /> Continue Speaking
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSendMessage(e)}
                  className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 font-medium"
                >
                  <Send size={12} /> Extract Tasks
                </button>
              </div>
            </div>
          )}
          <p className="text-xs text-slate-600 mt-2 text-center">
            💡 {isTranscribing ? '⏳ Getting perfect transcript from Whisper AI...' : 
                isListening ? '🎤 Speaking... auto-stops after 3sec pause (or click mic)' : 
                'Cmd/Ctrl + Enter to send • 🎤 = Live preview + Whisper accuracy!'}
          </p>
        </div>
      </div>

      {/* Extracted Tasks Sidebar */}
      <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-400" />
              Extracted Tasks
            </h3>
            <p className="text-xs text-slate-500 mt-1">{extractedTasks.length} tasks captured</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {extractedTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <Sparkles size={24} className="text-slate-600" />
              </div>
              <p className="text-slate-500 text-sm">Tasks you create will appear here</p>
            </div>
          ) : (
            extractedTasks.map(task => (
              <div key={task.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3 hover:border-indigo-500/50 transition-all group">
                <div className="flex items-start gap-2 mb-2">
                  {task.category === 'WORK' ? (
                    <Briefcase size={14} className="text-indigo-400 mt-0.5" />
                  ) : (
                    <Home size={14} className="text-pink-400 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-slate-200 truncate">{task.title}</h4>
                    {task.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{task.description}</p>
                    )}
                  </div>
                </div>

                {task.dueAt && (
                  <div className="flex items-center gap-1 text-xs text-amber-400 mb-2">
                    <Clock size={12} />
                    {format(new Date(task.dueAt), 'MMM d, h:mm a')}
                  </div>
                )}

                {task.subtasks.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-800 space-y-1">
                    {task.subtasks.slice(0, 2).map(st => (
                      <div key={st.id} className="flex items-center gap-2 text-xs text-slate-500">
                        <ChevronRight size={10} />
                        <span className="truncate">{st.title}</span>
                      </div>
                    ))}
                    {task.subtasks.length > 2 && (
                      <p className="text-xs text-slate-600 pl-3">+{task.subtasks.length - 2} more</p>
                    )}
                  </div>
                )}

                <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    task.category === 'WORK' 
                      ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-800' 
                      : 'bg-pink-900/50 text-pink-300 border border-pink-800'
                  }`}>
                    {task.category}
                  </span>
                  <span className="text-xs text-slate-600">Just now</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>

    {/* Settings Modal */}
    {isSettingsOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Settings size={20} className="text-indigo-500" />
              Settings
            </h3>
            <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-6">
            {/* API Key */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Google Gemini API Key
              </label>
              <input
                type="password"
                value={localApiKey}
                onChange={(e) => setLocalApiKey(e.target.value)}
                placeholder="Enter your API key..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-700"
              />
              <p className="text-xs text-slate-500 mt-2">
                Get your API key from{' '}
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 underline"
                >
                  Google AI Studio
                </a>
              </p>
            </div>

            {/* Model Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                AI Model
              </label>
              <div className="space-y-2">
                {[
                  { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (Experimental)', desc: 'Fastest, most recent' },
                  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', desc: 'Fast & balanced' },
                  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', desc: 'Most capable' }
                ].map((model) => (
                  <button
                    key={model.value}
                    onClick={() => setSelectedModel(model.value as any)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      selectedModel === model.value
                        ? 'bg-indigo-900/20 border-indigo-500/50 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{model.label}</div>
                        <div className="text-xs text-slate-500">{model.desc}</div>
                      </div>
                      {selectedModel === model.value && (
                        <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-white" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-6 border-t border-slate-800">
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-3 rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default ChatInterface;

