import React, { useState, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  MessageSquare,
  Settings,
  Command,
  BrainCircuit
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import TaskBrain from './pages/TaskBrain';
import ChatSimulator from './pages/ChatDebug';
import { Task } from './types';
import { INITIAL_TASKS } from './services/mockData';

interface AppState {
  tasks: Task[];
  apiKey: string;
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

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-950 flex font-sans text-slate-200 selection:bg-indigo-500/30">
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col fixed h-full z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <BrainCircuit size={20} className="text-white" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-white">Task Brain</h1>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <SidebarItem to="/" icon={LayoutDashboard} label="Overview" />
          <SidebarItem to="/tasks" icon={CheckSquare} label="Tasks" />
          <SidebarItem to="/simulator" icon={MessageSquare} label="WhatsApp Sim" />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 text-xs text-emerald-400 bg-emerald-950/30 px-3 py-2 rounded-lg border border-emerald-900/50">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            System Online
          </div>
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
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/50 text-indigo-300 flex items-center justify-center text-xs font-bold">
              JD
            </div>
          </div>
        </header>

        <div className="p-8 flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

const App = () => {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const apiKey = process.env.API_KEY || '';

  const addTask = (task: Task) => {
    setTasks(prev => [task, ...prev]);
  };

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
  };

  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  return (
    <AppContext.Provider value={{ tasks, apiKey, addTask, updateTask, deleteTask }}>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tasks" element={<TaskBrain />} />
            <Route path="/simulator" element={<ChatSimulator />} />
          </Routes>
        </Layout>
      </HashRouter>
    </AppContext.Provider>
  );
};

export default App;
