import { createClient } from '@supabase/supabase-js';
import { Task, SubTask, TaskAttachment, CalendarConfig, TaskStatus } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

console.log('🔧 Supabase Config:', { 
  url: supabaseUrl, 
  hasKey: !!supabaseAnonKey,
  keyPrefix: supabaseAnonKey.substring(0, 20) 
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Task Operations
export const fetchTasks = async (): Promise<Task[]> => {
  console.log('📡 Fetching tasks from Supabase...');
  
  const { data: { user } } = await supabase.auth.getUser();
  
  const query = supabase
    .from('tasks')
    .select(`
      *,
      subtasks (*),
      attachments (*)
    `)
    .order('created_at', { ascending: false });

  // If user is authenticated, filter by user_id
  if (user) {
    query.eq('user_id', user.id);
  }

  const { data: tasks, error } = await query;

  if (error) {
    console.error('❌ Supabase fetch error:', error);
    throw error;
  }

  console.log('✅ Fetched tasks:', tasks);

  if (!tasks) return [];

  return tasks.map(t => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status as TaskStatus,
    decision: t.decision,
    priorityScore: parseFloat(t.priority_score),
    dueAt: t.due_at,
    createdAt: t.created_at,
    estimatedMinutes: t.estimated_minutes,
    sourceChannel: t.source_channel,
    category: t.category,
    emailForwardAddress: t.email_forward_address,
    subtasks: t.subtasks || [],
    attachments: t.attachments || []
  }));
};

export const createTask = async (task: Omit<Task, 'id' | 'createdAt'>): Promise<Task> => {
  console.log('📝 Creating task in Supabase:', task);
  
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('tasks')
    .insert([{
      title: task.title,
      description: task.description,
      status: task.status,
      decision: task.decision,
      priority_score: task.priorityScore,
      due_at: task.dueAt,
      estimated_minutes: task.estimatedMinutes,
      source_channel: task.sourceChannel,
      category: task.category,
      user_id: user?.id || null
    }])
    .select()
    .single();

  if (error) {
    console.error('❌ Supabase create error:', error);
    throw error;
  }

  console.log('✅ Task created:', data);

  // Insert subtasks if any
  if (task.subtasks && task.subtasks.length > 0) {
    const { error: subtaskError } = await supabase.from('subtasks').insert(
      task.subtasks.map((st, idx) => ({
        task_id: data.id,
        title: st.title,
        status: st.status,
        position: idx
      }))
    );
    
    if (subtaskError) {
      console.error('⚠️ Subtask creation error:', subtaskError);
    }
  }

  return fetchTaskById(data.id);
};

export const updateTask = async (taskId: string, updates: Partial<Task>): Promise<void> => {
  console.log('📝 Updating task:', taskId, updates);
  
  const dbUpdates: any = {};
  
  if (updates.title) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.status) dbUpdates.status = updates.status;
  if (updates.decision) dbUpdates.decision = updates.decision;
  if (updates.priorityScore !== undefined) dbUpdates.priority_score = updates.priorityScore;
  if (updates.dueAt !== undefined) dbUpdates.due_at = updates.dueAt;
  if (updates.estimatedMinutes !== undefined) dbUpdates.estimated_minutes = updates.estimatedMinutes;
  if (updates.category !== undefined) dbUpdates.category = updates.category;

  const { error } = await supabase
    .from('tasks')
    .update(dbUpdates)
    .eq('id', taskId);

  if (error) {
    console.error('❌ Update error:', error);
    throw error;
  }

  // Handle attachments separately if provided
  if (updates.attachments) {
    // Delete existing attachments
    await supabase.from('attachments').delete().eq('task_id', taskId);
    
    // Insert new attachments
    if (updates.attachments.length > 0) {
      await supabase.from('attachments').insert(
        updates.attachments.map(att => ({
          id: att.id,
          task_id: taskId,
          name: att.name,
          type: att.type,
          url: att.url,
          size: att.size,
          uploaded_at: att.uploadedAt,
          thumbnail: att.thumbnail
        }))
      );
    }
  }
  
  console.log('✅ Task updated successfully');
};

export const deleteTask = async (taskId: string): Promise<void> => {
  console.log('🗑️ Deleting task:', taskId);
  
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);

  if (error) {
    console.error('❌ Delete error:', error);
    throw error;
  }
  
  console.log('✅ Task deleted successfully');
};

export const fetchTaskById = async (taskId: string): Promise<Task> => {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      subtasks (*),
      attachments (*)
    `)
    .eq('id', taskId)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    status: data.status,
    decision: data.decision,
    priorityScore: parseFloat(data.priority_score),
    dueAt: data.due_at,
    createdAt: data.created_at,
    estimatedMinutes: data.estimated_minutes,
    sourceChannel: data.source_channel,
    category: data.category,
    emailForwardAddress: data.email_forward_address,
    subtasks: data.subtasks || [],
    attachments: data.attachments || []
  };
};

// Upload file to Supabase Storage
export const uploadFile = async (file: File, taskId: string): Promise<TaskAttachment> => {
  const { data: { user } } = await supabase.auth.getUser();
  const fileExt = file.name.split('.').pop();
  // Include user ID in path for better organization
  const userPrefix = user?.id ? `${user.id}/` : '';
  const fileName = `${userPrefix}${taskId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from('task-attachments')
    .upload(fileName, file);

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('task-attachments')
    .getPublicUrl(fileName);

  const attachment: TaskAttachment = {
    id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: file.name,
    type: file.type.startsWith('image/') ? 'image' :
          file.type.startsWith('video/') ? 'video' :
          file.type.startsWith('audio/') ? 'audio' :
          file.type.includes('pdf') || file.type.includes('document') ? 'document' : 'other',
    url: publicUrl,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    thumbnail: file.type.startsWith('image/') ? publicUrl : undefined
  };

  // Insert attachment record
  await supabase.from('attachments').insert([{
    id: attachment.id,
    task_id: taskId,
    name: attachment.name,
    type: attachment.type,
    url: attachment.url,
    size: attachment.size,
    uploaded_at: attachment.uploadedAt,
    thumbnail: attachment.thumbnail
  }]);

  return attachment;
};

// Delete file from Supabase Storage
export const deleteFile = async (attachment: TaskAttachment, taskId: string): Promise<void> => {
  // Extract file path from URL
  // URL format: https://{project}.supabase.co/storage/v1/object/public/task-attachments/{path}
  const urlParts = attachment.url.split('/task-attachments/');
  if (urlParts.length > 1) {
    const filePath = urlParts[1];
    const { error } = await supabase.storage
      .from('task-attachments')
      .remove([filePath]);
    
    if (error) {
      console.error('Failed to delete file from storage:', error);
      // Don't throw - we still want to delete the DB record
    }
  }
  
  // Delete attachment record from database
  const { error } = await supabase
    .from('attachments')
    .delete()
    .eq('id', attachment.id);
  
  if (error) {
    console.error('Failed to delete attachment record:', error);
    throw error;
  }
};

// Real-time subscriptions
export const subscribeToTasks = (callback: (payload: any) => void) => {
  return supabase
    .channel('tasks-changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'tasks' }, 
      callback
    )
    .subscribe();
};
