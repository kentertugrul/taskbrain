import React, { useEffect, useState } from 'react';
import { useAppContext } from '../App';
import { Clock, Calendar, CheckCircle2, AlertCircle, ArrowRight, X, Check } from 'lucide-react';
import { suggestNextTask } from '../services/aiService';
import { listCalendars, listEvents, getGoogleAccessToken, initializeGoogleAuth } from '../services/calendarService';
import { TaskStatus, TaskDecision, CalendarConfig } from '../types';

const StatCard = ({ label, value, icon: Icon, color }: any) => (
  <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-start justify-between hover:border-slate-700 transition-all group">
    <div>
      <p className="text-slate-400 text-sm font-medium mb-1">{label}</p>
      <h3 className="text-3xl font-bold text-white">{value}</h3>
    </div>
    <div className={`p-3 rounded-xl ${color} bg-opacity-10 group-hover:bg-opacity-20 transition-all`}>
      <Icon size={24} className={color.replace('bg-', 'text-')} />
    </div>
  </div>
);

const Dashboard = () => {
  const { tasks, apiKey, connectedCalendars, setConnectedCalendars, setCalendarToken } = useAppContext();
  const [nextTaskSuggestion, setNextTaskSuggestion] = useState<string>("Analyzing priority matrix...");
  
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [availableCalendars, setAvailableCalendars] = useState<CalendarConfig[]>([]);
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);

  const stats = {
    backlog: tasks.filter(t => t.status === TaskStatus.BACKLOG).length,
    scheduled: tasks.filter(t => t.status === TaskStatus.SCHEDULED).length,
    done: tasks.filter(t => t.status === TaskStatus.DONE).length,
    highPriority: tasks.filter(t => t.priorityScore > 0.7 && t.status !== TaskStatus.DONE).length
  };

  useEffect(() => {
    const fetchSuggestion = async () => {
        if (!apiKey) {
            setNextTaskSuggestion("Configure API Key in Simulator tab to get AI suggestions.");
            return;
        }
        try {
            const suggestion = await suggestNextTask(apiKey, tasks);
            setNextTaskSuggestion(suggestion);
        } catch (e) {
            setNextTaskSuggestion("Could not generate suggestion.");
        }
    };
    fetchSuggestion();
  }, [tasks, apiKey]);

  const handleConnectCalendar = async () => {
    console.log("🔵 Connect Calendar clicked");
    setIsLoadingCalendars(true);
    
    try {
        // Get Google OAuth Client ID from environment
        const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        
        if (!googleClientId) {
            alert('Google Client ID not configured. Please add VITE_GOOGLE_CLIENT_ID to your .env file.');
            setIsLoadingCalendars(false);
            return;
        }

        // Initialize Google Auth
        await initializeGoogleAuth(googleClientId);
        
        // Get access token
        console.log("🔵 Requesting Google Calendar access...");
        console.log("🔵 Client ID:", googleClientId);
        
        const accessToken = await getGoogleAccessToken(googleClientId);
        console.log("✅ Access token received:", accessToken ? accessToken.substring(0, 20) + '...' : 'null');
        
        if (!accessToken) {
            throw new Error('Failed to get access token');
        }
        
        // Store token
        setCalendarToken(accessToken);
        
        // Fetch calendars
        console.log("🔵 Fetching calendars with token...");
        const cals = await listCalendars(accessToken);
        console.log("✅ Calendars fetched:", cals);
        console.log("✅ Number of calendars:", cals.length);
        
        if (cals.length === 0) {
            alert('No calendars found. Make sure you have calendars in your Google account.');
        }
        
        // Open modal with calendars
        setAvailableCalendars(cals);
        setIsCalendarModalOpen(true);
    } catch (error: any) {
        console.error("❌ Failed to connect calendar", error);
        alert(`Failed to connect Google Calendar: ${error.message || 'Unknown error'}`);
    } finally {
        setIsLoadingCalendars(false);
        console.log("🔵 Loading complete");
    }
  };

  const toggleCalendarSelection = (id: string) => {
    setAvailableCalendars(prev => prev.map(c => 
        c.id === id ? { ...c, selected: !c.selected } : c
    ));
  };

  const saveCalendarSelection = () => {
    const selected = availableCalendars.filter(c => c.selected);
    setConnectedCalendars(selected);
    setIsCalendarModalOpen(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 relative">
      
      <div className="flex justify-between items-end">
        <div>
            <h2 className="text-3xl font-bold text-white mb-2">Good Morning, User</h2>
            <p className="text-slate-400">Here is your brain dump status for today.</p>
        </div>
        <button 
            onClick={handleConnectCalendar}
            disabled={isLoadingCalendars}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-lg shadow-indigo-900/20 disabled:opacity-50"
        >
            <Calendar size={18} /> 
            {connectedCalendars.length > 0 ? 'Manage Calendars' : 'Connect Google Calendar'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Backlog" value={stats.backlog} icon={Clock} color="bg-amber-500 text-amber-500" />
        <StatCard label="Scheduled" value={stats.scheduled} icon={Calendar} color="bg-blue-500 text-blue-500" />
        <StatCard label="Completed" value={stats.done} icon={CheckCircle2} color="bg-emerald-500 text-emerald-500" />
        <StatCard label="High Priority" value={stats.highPriority} icon={AlertCircle} color="bg-rose-500 text-rose-500" />
      </div>

      <div className="bg-gradient-to-br from-indigo-900/50 to-slate-900 border border-indigo-500/30 rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-32 bg-indigo-600/20 blur-[100px] rounded-full pointer-events-none"></div>
        
        <div className="relative z-10">
            <div className="flex items-center gap-2 text-indigo-400 font-medium mb-4">
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                WHAT SHOULD I DO NOW?
            </div>
            
            <h3 className="text-2xl md:text-4xl font-bold text-white leading-tight max-w-3xl mb-6">
                "{nextTaskSuggestion}"
            </h3>

            <div className="flex gap-4">
                <button className="bg-white text-indigo-950 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors flex items-center gap-2">
                    Start Focus Session <ArrowRight size={18} />
                </button>
                <button className="bg-slate-800 text-white px-6 py-3 rounded-xl font-semibold hover:bg-slate-700 border border-slate-700 transition-colors">
                    Delay 1 Hour
                </button>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h4 className="text-lg font-bold text-white mb-4">Recent Tasks</h4>
            <div className="space-y-3">
                {tasks.slice(0, 3).map(task => (
                    <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-950/50 border border-slate-800/50">
                        <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${task.decision === TaskDecision.DO ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                            <span className="text-slate-200">{task.title}</span>
                        </div>
                        <span className="text-xs font-mono text-slate-500">{task.status}</span>
                    </div>
                ))}
            </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h4 className="text-lg font-bold text-white mb-4">System Health</h4>
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <span className="text-slate-400">WhatsApp Webhook</span>
                    <span className="text-emerald-400 text-sm font-medium bg-emerald-950/50 px-2 py-1 rounded">Active</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-slate-400">Google Calendar API</span>
                    {connectedCalendars.length > 0 ? (
                         <span className="text-emerald-400 text-sm font-medium bg-emerald-950/50 px-2 py-1 rounded flex items-center gap-1">
                            <Check size={12} /> {connectedCalendars.length} Cal(s)
                         </span>
                    ) : (
                        <span className="text-amber-400 text-sm font-medium bg-amber-950/50 px-2 py-1 rounded">Pending Auth</span>
                    )}
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-slate-400">Priority Engine</span>
                    <span className="text-emerald-400 text-sm font-medium bg-emerald-950/50 px-2 py-1 rounded">Online (v1.0)</span>
                </div>
            </div>
        </div>
      </div>

      {isCalendarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-white">Select Calendars</h3>
                        <p className="text-xs text-slate-400 mt-1">Found {availableCalendars.length} calendar{availableCalendars.length !== 1 ? 's' : ''}</p>
                    </div>
                    <button onClick={() => setIsCalendarModalOpen(false)} className="text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>
                
                {isLoadingCalendars ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-slate-400 text-sm">Loading calendars...</p>
                    </div>
                ) : availableCalendars.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <p className="text-slate-400 text-sm">No calendars found</p>
                    </div>
                ) : (
                    <div className="space-y-3 mb-6">
                        {availableCalendars.map(cal => (
                        <div 
                            key={cal.id} 
                            onClick={() => toggleCalendarSelection(cal.id)}
                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all
                                ${cal.selected 
                                    ? 'bg-indigo-900/20 border-indigo-500/50' 
                                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}
                        >
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors
                                ${cal.selected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-600'}`}>
                                {cal.selected && <Check size={12} className="text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-slate-200 truncate">{cal.summary}</div>
                                {cal.primary && (
                                    <div className="text-xs text-emerald-400 mt-0.5">Primary calendar</div>
                                )}
                            </div>
                            <div className="ml-auto w-2 h-2 rounded-full" style={{ backgroundColor: cal.color }} />
                        </div>
                        ))}
                    </div>
                )}

                {!isLoadingCalendars && availableCalendars.length > 0 && (
                    <div className="flex gap-3">
                    <button 
                        onClick={() => setIsCalendarModalOpen(false)}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2.5 rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={saveCalendarSelection}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl transition-colors shadow-lg shadow-indigo-900/20"
                    >
                        Sync Selected
                    </button>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
