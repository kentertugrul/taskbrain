import React, { useState, createContext, useContext, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  MessageSquare,
  Settings,
  Command,
  BrainCircuit,
  Network,
  LogOut,
  User
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import TaskBrain from './pages/TaskBrain';
import ChatInterface from './pages/ChatInterface';
import MindMap from './pages/MindMap';
import Auth from './pages/Auth';
import { Task, CalendarConfig } from './types';
import { INITIAL_TASKS } from './services/mockData';
import * as SupabaseService from './services/supabaseService';
import { supabase } from './services/supabaseService';

interface AppState {
  tasks: Task[];
  apiKey: string;
  calendarToken: string | null;
  connectedCalendars: CalendarConfig[];
  user: any;
  setCalendarToken: (token: string | null) => void;
  setConnectedCalendars: (calendars: CalendarConfig[]) => void;
  addTask: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
};

const SidebarItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
        ${isActive
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
          : 'text-slate-400 hover:bg-slate-800 hover:text-indigo-300'
        }`}
    >
      <Icon size={20} className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400'} />
      <span className="font-medium text-sm">{label}</span>
    </Link>
  );
};

const Layout: React.FC<{ 
  children: React.ReactNode; 
  isLoading: boolean; 
  useSupabase: boolean;
  user: any;
  onLogout: () => void;
}> = ({ children, isLoading, useSupabase, user, onLogout }) => {
  const getUserInitials = () => {
    if (user?.user_metadata?.name) {
      return user.user_metadata.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  return (
    <div className="min-h-screen bg-slate-950 flex font-sans text-slate-200 selection:bg-indigo-500/30">
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col fixed h-full z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <BrainCircuit size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white leading-none">Task Brain</h1>
            <span className="text-xs text-slate-500 font-mono">v0.1.1</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <SidebarItem to="/" icon={MessageSquare} label="Chat" />
          <SidebarItem to="/tasks" icon={CheckSquare} label="Tasks" />
          <SidebarItem to="/mindmap" icon={Network} label="Mind Map" />
          <SidebarItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className={`flex items-center gap-3 text-xs px-3 py-2 rounded-lg border ${
            useSupabase 
              ? 'text-emerald-400 bg-emerald-950/30 border-emerald-900/50' 
              : 'text-amber-400 bg-amber-950/30 border-amber-900/50'
          }`}>
            <div className={`w-2 h-2 rounded-full ${useSupabase ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
            {useSupabase ? 'Supabase Connected' : 'Mock Data Mode'}
          </div>
          
          {user && (
            <div className="flex items-center gap-3 px-3 py-2 bg-slate-800 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/50 text-indigo-300 flex items-center justify-center text-xs font-bold">
                {getUserInitials()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white truncate">
                  {user.user_metadata?.name || user.email?.split('@')[0]}
                </div>
                <div className="text-xs text-slate-400 truncate">
                  {user.email}
                </div>
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-red-400 transition-colors rounded hover:bg-slate-700"
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 ml-64 min-h-screen flex flex-col">
        <header className="h-16 border-b border-slate-800 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-10 px-8 flex items-center justify-between">
          <div className="flex items-center gap-4 text-slate-500 text-sm">
            <Command size={14} /> <span>CMD+K to search (mock)</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors">
              <Settings size={16} className="text-slate-400" />
            </button>
          </div>
        </header>

        <div className="p-8 flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-400">Loading tasks...</p>
              </div>
            </div>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  );
};

const App = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [calendarToken, setCalendarToken] = useState<string | null>(null);
  const [connectedCalendars, setConnectedCalendars] = useState<CalendarConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const apiKey = process.env.API_KEY || '';
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const useSupabase = !!(supabaseUrl && import.meta.env.VITE_SUPABASE_ANON_KEY);

  // Check auth state
  useEffect(() => {
    if (!useSupabase) {
      setAuthLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session) {
        // Reload tasks when user logs in
        loadTasks();
      } else {
        // Clear tasks when user logs out
        setTasks([]);
      }
    });

    return () => subscription.unsubscribe();
  }, [useSupabase]);

  const loadTasks = async () => {
    if (useSupabase && user) {
      try {
        console.log('📡 Loading tasks from Supabase...');
        const fetchedTasks = await SupabaseService.fetchTasks();
        setTasks(fetchedTasks);
        console.log(`✅ Loaded ${fetchedTasks.length} tasks from Supabase`);
      } catch (error) {
        console.error('❌ Supabase error, using mock data:', error);
        setTasks(INITIAL_TASKS);
      }
    } else if (!useSupabase) {
      console.log('📦 Using mock data (Supabase not configured)');
      setTasks(INITIAL_TASKS);
    }
    setIsLoading(false);
  };

  // Load tasks when user is authenticated
  useEffect(() => {
    if (!authLoading) {
      loadTasks();
    }
  }, [useSupabase, user, authLoading]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!useSupabase) return;
    
    const subscription = SupabaseService.subscribeToTasks(async () => {
      console.log('🔄 Tasks updated, reloading...');
      const fetchedTasks = await SupabaseService.fetchTasks();
      setTasks(fetchedTasks);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [useSupabase]);

  const addTask = async (task: Task) => {
    if (useSupabase) {
      try {
        const newTask = await SupabaseService.createTask(task);
        setTasks(prev => [newTask, ...prev]);
        console.log('✅ Task saved to Supabase:', newTask.id);
      } catch (error) {
        console.error('❌ Failed to save task:', error);
        alert('Failed to save task to database');
      }
    } else {
      setTasks(prev => [task, ...prev]);
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    if (useSupabase) {
      try {
        await SupabaseService.updateTask(taskId, updates);
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
        console.log('✅ Task updated in Supabase:', taskId);
      } catch (error) {
        console.error('❌ Failed to update task:', error);
        alert('Failed to update task in database');
      }
    } else {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
    }
  };

  const deleteTask = async (taskId: string) => {
    if (useSupabase) {
      try {
        await SupabaseService.deleteTask(taskId);
        setTasks(prev => prev.filter(t => t.id !== taskId));
        console.log('✅ Task deleted from Supabase:', taskId);
      } catch (error) {
        console.error('❌ Failed to delete task:', error);
        alert('Failed to delete task from database');
      }
    } else {
      setTasks(prev => prev.filter(t => t.id !== taskId));
    }
  };

  const handleLogout = async () => {
    if (useSupabase) {
      await supabase.auth.signOut();
    }
  };

  // Show auth screen if using Supabase and not authenticated
  if (useSupabase && authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (useSupabase && !user) {
    return <Auth />;
  }

  return (
    <AppContext.Provider value={{ 
      tasks, 
      apiKey, 
      calendarToken, 
      connectedCalendars, 
      user,
      setCalendarToken, 
      setConnectedCalendars, 
      addTask, 
      updateTask, 
      deleteTask 
    }}>
      <HashRouter>
        <Layout isLoading={isLoading} useSupabase={useSupabase} user={user} onLogout={handleLogout}>
          <Routes>
            <Route path="/" element={<ChatInterface />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/tasks" element={<TaskBrain />} />
            <Route path="/mindmap" element={<MindMap />} />
          </Routes>
        </Layout>
      </HashRouter>
    </AppContext.Provider>
  );
};

export default App;
