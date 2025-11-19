import React, { useState, useRef } from 'react';
import { useAppContext } from '../App';
import { Task, TaskStatus, TaskDecision } from '../types';
import { Filter, Search, MoreVertical, Clock, ArrowUpCircle, Check, ChevronDown, ChevronRight, ListTree, Plus, X, Calendar, AlertCircle, Trash2, Mic, MicOff } from 'lucide-react';
import { format } from 'date-fns';
import TaskDetailModal from './TaskDetailModal';

const StatusBadge = ({ status }: { status: TaskStatus }) => {
  const styles = {
    [TaskStatus.BACKLOG]: 'bg-slate-800 text-slate-300',
    [TaskStatus.SCHEDULED]: 'bg-blue-900/50 text-blue-300 border-blue-800',
    [TaskStatus.IN_PROGRESS]: 'bg-indigo-900/50 text-indigo-300 border-indigo-800',
    [TaskStatus.DONE]: 'bg-emerald-900/50 text-emerald-300 border-emerald-800',
    [TaskStatus.CANCELLED]: 'bg-red-900/50 text-red-300 border-red-800',
  };
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border border-transparent ${styles[status]}`}>
      {status}
    </span>
  );
};

const DecisionBadge = ({ decision }: { decision: TaskDecision }) => {
  const colors = {
    [TaskDecision.DO]: 'text-emerald-400',
    [TaskDecision.DELAY]: 'text-amber-400',
    [TaskDecision.DELEGATE]: 'text-indigo-400',
    [TaskDecision.DROP]: 'text-red-400',
  };
  return <span className={`text-xs font-mono uppercase tracking-wider ${colors[decision]}`}>{decision}</span>;
};

const TaskItem: React.FC<{ 
  task: Task; 
  onToggle: (id: string) => void; 
  onDelete: (id: string) => void; 
  onStatusChange: (id: string, status: TaskStatus) => void; 
  onOpen: (task: Task) => void;
  isSelected: boolean;
  onToggleSelect: (id: string, e: React.MouseEvent) => void;
}> = ({ task, onToggle, onDelete, onStatusChange, onOpen, isSelected, onToggleSelect }) => {
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;

  return (
    <div 
      onClick={(e) => {
        // Don't open if clicking on interactive elements
        if ((e.target as HTMLElement).closest('button, select, input, .checkbox-select')) return;
        onOpen(task);
      }}
      className={`group bg-slate-900 border rounded-xl p-4 transition-all duration-200 cursor-pointer ${
        isSelected 
          ? 'border-indigo-500 bg-indigo-950/20' 
          : 'border-slate-800 hover:border-indigo-500/50'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-4">
          {/* Selection Checkbox */}
          <div 
            onClick={(e) => onToggleSelect(task.id, e)}
            className={`checkbox-select mt-1 w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer transition-colors
            ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-600 hover:border-indigo-500'}`}>
            {isSelected && <Check size={10} className="text-white" />}
          </div>
          
          {/* Completion Checkbox */}
          <div 
            onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
            className={`mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors
            ${task.status === TaskStatus.DONE ? 'bg-emerald-600 border-emerald-600' : 'border-slate-600 hover:border-emerald-500'}`}>
            {task.status === TaskStatus.DONE && <Check size={10} className="text-white" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h4 className={`font-medium text-base ${task.status === TaskStatus.DONE ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                {task.title}
              </h4>
              {hasSubtasks && (
                <button
                  onClick={() => setShowSubtasks(!showSubtasks)}
                  className="text-slate-500 hover:text-indigo-400 flex items-center gap-1 text-xs bg-slate-950 px-1.5 py-0.5 rounded transition-colors"
                >
                  <ListTree size={12} />
                  {task.subtasks.length}
                  {showSubtasks ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
              )}
            </div>
            {task.description && <p className="text-slate-400 text-sm mt-1">{task.description}</p>}

            <div className="flex items-center gap-4 mt-3">
              <DecisionBadge decision={task.decision} />
              {task.dueAt && (
                <div className="flex items-center gap-1 text-xs text-amber-400/80">
                  <Clock size={12} />
                  {format(new Date(task.dueAt), 'MMM d, HH:mm')}
                </div>
              )}
              {task.estimatedMinutes && (
                <span className="text-xs text-slate-500">{task.estimatedMinutes}m est.</span>
              )}
              <span className="text-xs text-slate-600 bg-slate-950 px-2 py-0.5 rounded">
                via {task.sourceChannel}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
              <div className="text-xs text-slate-500 mb-1">Priority</div>
              <div className="flex items-center gap-1 text-indigo-400 font-mono text-sm">
                  <ArrowUpCircle size={14} />
                  {Math.round(task.priorityScore * 100)}
              </div>
          </div>
          
          {/* Status Dropdown */}
          <div className="relative">
            <select
              value={task.status}
              onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
              className="bg-slate-800 border border-slate-700 text-xs font-bold px-2.5 py-1 rounded-full cursor-pointer hover:bg-slate-700 transition-colors appearance-none pr-6"
            >
              {Object.values(TaskStatus).map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          
          {/* Delete Button */}
          <button 
            onClick={() => onDelete(task.id)}
            className="text-slate-600 hover:text-red-400 p-2 transition-colors"
            title="Delete task"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {hasSubtasks && showSubtasks && (
        <div className="mt-4 ml-8 pl-4 border-l border-slate-700 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Subtasks</p>
          {task.subtasks.map(st => (
            <div key={st.id} className="flex items-center gap-3 py-1">
              <div className={`w-3 h-3 rounded border flex items-center justify-center cursor-pointer
                        ${st.status === TaskStatus.DONE ? 'bg-slate-600 border-slate-600' : 'border-slate-600 hover:border-slate-400'}`}>
                {st.status === TaskStatus.DONE && <div className="w-1.5 h-1.5 bg-white rounded-sm" />}
              </div>
              <span className={`text-sm ${st.status === TaskStatus.DONE ? 'text-slate-600 line-through' : 'text-slate-400'}`}>
                {st.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const TaskBrain = () => {
  const { tasks, addTask, updateTask, deleteTask, apiKey } = useAppContext();
  const [filter, setFilter] = useState<'ALL' | TaskStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('0.5');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newSubtasks, setNewSubtasks] = useState<string[]>([]);
  const [subtaskInput, setSubtaskInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const handleToggleTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      updateTask(taskId, { 
        status: task.status === TaskStatus.DONE ? TaskStatus.BACKLOG : TaskStatus.DONE 
      });
    }
  };

  const handleDeleteTask = (taskId: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      deleteTask(taskId);
    }
  };

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    updateTask(taskId, { status: newStatus });
  };

  const handleOpenTask = (task: Task) => {
    setSelectedTask(task);
  };

  const handleUpdateTask = (updates: Partial<Task>) => {
    if (selectedTask) {
      updateTask(selectedTask.id, updates);
      // Update local state to reflect changes immediately
      setSelectedTask({ ...selectedTask, ...updates });
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedTaskIds.size === filteredTasks.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(filteredTasks.map(t => t.id)));
    }
  };

  const handleToggleSelect = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedTaskIds);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTaskIds(newSelected);
  };

  const handleBulkDelete = () => {
    if (selectedTaskIds.size === 0) return;
    if (window.confirm(`Delete ${selectedTaskIds.size} selected task(s)?`)) {
      selectedTaskIds.forEach(id => deleteTask(id));
      setSelectedTaskIds(new Set());
    }
  };

  const handleBulkStatusChange = (newStatus: TaskStatus) => {
    if (selectedTaskIds.size === 0) return;
    selectedTaskIds.forEach(id => updateTask(id, { status: newStatus }));
    setSelectedTaskIds(new Set());
  };

  const filteredTasks = tasks
    .filter(t => filter === 'ALL' ? true : t.status === filter)
    .filter(t => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return t.title.toLowerCase().includes(query) || 
             t.description?.toLowerCase().includes(query);
    });

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
      setNewTaskTitle(prev => prev + (prev ? ' ' : '') + transcript);
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

  const stopMicrophone = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleCloseModal = () => {
    stopMicrophone();
    setIsCreateModalOpen(false);
  };

  const handleAddSubtask = (e: React.MouseEvent) => {
    e.preventDefault();
    if (subtaskInput.trim()) {
      setNewSubtasks([...newSubtasks, subtaskInput.trim()]);
      setSubtaskInput('');
    }
  };

  const removeSubtask = (index: number) => {
    setNewSubtasks(newSubtasks.filter((_, i) => i !== index));
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const taskId = `manual-${Date.now()}`;

    const subtaskEntities = newSubtasks.map((stTitle, idx) => ({
      id: `st-${taskId}-${idx}`,
      title: stTitle,
      status: TaskStatus.BACKLOG
    }));

    addTask({
      id: taskId,
      title: newTaskTitle,
      description: newTaskDesc,
      status: TaskStatus.BACKLOG,
      decision: TaskDecision.DO,
      priorityScore: parseFloat(newTaskPriority),
      dueAt: newTaskDueDate || undefined,
      createdAt: new Date().toISOString(),
      sourceChannel: 'WEB',
      subtasks: subtaskEntities
    });

    setNewTaskTitle('');
    setNewTaskDesc('');
    setNewTaskPriority('0.5');
    setNewTaskDueDate('');
    setNewSubtasks([]);
    setSubtaskInput('');
    handleCloseModal();
  };

  return (
    <div className="max-w-5xl mx-auto relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Task Brain</h2>
          <p className="text-slate-400 text-sm">
            {selectedTaskIds.size > 0 ? (
              <span className="text-indigo-400 font-medium">{selectedTaskIds.size} task(s) selected</span>
            ) : (
              'Manage extracted tasks and decisions.'
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {selectedTaskIds.size > 0 && (
            <>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkStatusChange(e.target.value as TaskStatus);
                    e.target.value = '';
                  }
                }}
                className="bg-slate-800 border border-slate-700 text-slate-300 px-4 py-2 rounded-lg text-sm hover:bg-slate-700 transition-colors cursor-pointer"
                defaultValue=""
              >
                <option value="" disabled>Change Status...</option>
                {Object.values(TaskStatus).map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <button
                onClick={handleBulkDelete}
                className="bg-red-900/50 hover:bg-red-900 text-red-300 px-4 py-2 rounded-lg border border-red-800 font-medium flex items-center gap-2 transition-colors text-sm"
              >
                <Trash2 size={16} /> Delete Selected
              </button>
            </>
          )}
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..." 
              className="bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 w-64 transition-colors"
            />
          </div>
          <button className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-lg border border-slate-700">
            <Filter size={18} />
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-lg shadow-indigo-900/20"
          >
            <Plus size={18} /> New Task
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {['ALL', TaskStatus.BACKLOG, TaskStatus.SCHEDULED, TaskStatus.DONE].map((status) => (
            <button 
              key={status}
              onClick={() => setFilter(status as any)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors
                ${filter === status 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30' 
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'}`}
            >
              {status}
            </button>
          ))}
        </div>

        {filteredTasks.length > 0 && (
          <button
            onClick={handleToggleSelectAll}
            className="text-sm text-slate-400 hover:text-indigo-400 transition-colors flex items-center gap-2"
          >
            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
              selectedTaskIds.size === filteredTasks.length 
                ? 'bg-indigo-600 border-indigo-600' 
                : 'border-slate-600'
            }`}>
              {selectedTaskIds.size === filteredTasks.length && <Check size={10} className="text-white" />}
            </div>
            Select All
          </button>
        )}
      </div>

      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/50">
            <p className="text-slate-500">
              {searchQuery ? `No tasks matching "${searchQuery}"` : 'No tasks found in this view.'}
            </p>
          </div>
        ) : (
          filteredTasks.map(task => (
            <TaskItem 
              key={task.id} 
              task={task}
              onToggle={handleToggleTask}
              onDelete={handleDeleteTask}
              onStatusChange={handleStatusChange}
              onOpen={handleOpenTask}
              isSelected={selectedTaskIds.has(task.id)}
              onToggleSelect={handleToggleSelect}
            />
          ))
        )}
      </div>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleUpdateTask}
          apiKey={apiKey}
        />
      )}

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Plus className="text-indigo-500" size={24} /> New Task
              </h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Title</label>
                  <div className="relative">
                    <input
                      autoFocus
                      type="text"
                      value={newTaskTitle}
                      onChange={e => setNewTaskTitle(e.target.value)}
                      placeholder="e.g. Prepare Q3 Report"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-4 pr-12 py-3 text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-700"
                    />
                    <button
                      type="button"
                      onClick={toggleMicrophone}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                    >
                      {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Description</label>
                  <textarea
                    value={newTaskDesc}
                    onChange={e => setNewTaskDesc(e.target.value)}
                    rows={2}
                    placeholder="Additional context..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 resize-none placeholder:text-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Priority</label>
                  <div className="relative">
                    <select
                      value={newTaskPriority}
                      onChange={e => setNewTaskPriority(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 appearance-none"
                    >
                      <option value="0.2">Low (Nice to have)</option>
                      <option value="0.5">Medium (Standard)</option>
                      <option value="0.8">High (Important)</option>
                      <option value="1.0">Urgent (Critical)</option>
                    </select>
                    <ArrowUpCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Due Date</label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      value={newTaskDueDate}
                      onChange={e => setNewTaskDueDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 [color-scheme:dark]"
                    />
                    {!newTaskDueDate && <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />}
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <ListTree size={14} /> Subtasks
                </label>

                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={subtaskInput}
                    onChange={e => setSubtaskInput(e.target.value)}
                    placeholder="Add a subtask..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    onKeyDown={e => e.key === 'Enter' && handleAddSubtask(e as any)}
                  />
                  <button
                    type="button"
                    onClick={handleAddSubtask}
                    className="bg-slate-800 hover:bg-slate-700 text-indigo-400 p-2 rounded-lg border border-slate-700 transition-colors"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                  {newSubtasks.length === 0 && (
                    <p className="text-slate-600 text-xs italic text-center py-2">No subtasks added yet.</p>
                  )}
                  {newSubtasks.map((st, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-900 px-3 py-2 rounded border border-slate-800/50">
                      <span className="text-sm text-slate-300 truncate">{st}</span>
                      <button
                        type="button"
                        onClick={() => removeSubtask(idx)}
                        className="text-slate-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-3 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2"
                >
                  <Check size={18} /> Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskBrain;
