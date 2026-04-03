import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { PageHeader, Card, CardHeader, CardBody, EmptyState } from '../components/UI';
import { taskAPI } from '../services/api';
import { Plus, Trash2, GripVertical, CheckCircle2, Circle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const COLUMNS = [
  { id: 'todo', title: 'To Do', icon: <Circle size={14} className="text-rose" /> },
  { id: 'in-progress', title: 'In Progress', icon: <Clock size={14} className="text-amber" /> },
  { id: 'done', title: 'Completed', icon: <CheckCircle2 size={14} className="text-teal2" /> },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data } = await taskAPI.getTasks();
      setTasks(data);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId;
    const taskIndex = tasks.findIndex(t => t._id === draggableId);
    if (taskIndex === -1) return;

    const newTasks = Array.from(tasks);
    const [movedTask] = newTasks.splice(taskIndex, 1);
    movedTask.status = newStatus;
    newTasks.splice(destination.index, 0, movedTask);
    
    setTasks(newTasks);

    try {
      await taskAPI.updateTask(draggableId, { status: newStatus });
    } catch (err) {
      console.error('Failed to update task status:', err);
      fetchTasks();
    }
  };

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      const { data } = await taskAPI.createTask({ title: newTaskTitle });
      setTasks([data, ...tasks]);
      setNewTaskTitle('');
      setShowAddForm(false);
    } catch (err) {
      console.error('Failed to add task:', err);
    }
  };

  const deleteTask = async (id) => {
    try {
      await taskAPI.deleteTask(id);
      setTasks(tasks.filter(t => t._id !== id));
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const toggleTaskStatus = async (task) => {
    const statuses = ['todo', 'in-progress', 'done'];
    const currentIndex = statuses.indexOf(task.status);
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];
    
    setTasks(tasks.map(t => t._id === task._id ? { ...t, status: nextStatus } : t));

    try {
      await taskAPI.updateTask(task._id, { status: nextStatus });
    } catch (err) {
      console.error('Failed to toggle task:', err);
      fetchTasks();
    }
  };

  if (loading) return <div className="p-10 text-center animate-pulse text-ink3 font-mono">Initializing System Ledger...</div>;

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-170px)] flex flex-col">
      <PageHeader title="Development Tasks" subtitle="Active nodes in your execution pipeline.">
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> New Node
        </button>
      </PageHeader>

      <AnimatePresence>
        {showAddForm && (
          <motion.form 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={addTask}
            className="mb-8 overflow-hidden"
          >
            <div className="p-6 rounded-3xl bg-card border-2 border-amber/30 shadow-xl shadow-amber/5">
              <input 
                autoFocus
                className="input w-full text-lg font-bold placeholder:text-ink3"
                placeholder="What exactly needs to be done?"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
              />
              <div className="mt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-5 py-2 font-bold text-ink3 hover:text-ink transition-colors">Cancel</button>
                <button type="submit" className="btn-primary px-8">Initialize Node</button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 overflow-hidden">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter(t => t.status === col.id);
          return (
            <div key={col.id} className="flex flex-col h-full bg-foreground/[0.02] border border-border/50 rounded-3xl p-5">
              <div className="flex items-center justify-between mb-6 px-2">
                <div className="flex items-center gap-2">
                  {col.icon}
                  <h3 className="font-syne font-black text-sm uppercase tracking-widest text-ink2">{col.title}</h3>
                </div>
                <span className="text-[10px] font-mono font-bold bg-background border border-border px-2 py-0.5 rounded-lg text-ink3 shadow-sm">{colTasks.length}</span>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-hide space-y-4">
                {colTasks.length === 0 ? (
                  <div className="h-20 border-2 border-dashed border-border/30 rounded-2xl flex items-center justify-center opacity-40">
                    <span className="text-[10px] uppercase font-mono tracking-wider">Null State</span>
                  </div>
                ) : (
                  colTasks.map((task, index) => (
                    <motion.div 
                      key={task._id} 
                      layoutId={task._id}
                      className="group p-5 bg-card border border-border rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-amber/30 transition-all cursor-pointer relative"
                      onClick={() => toggleTaskStatus(task)}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`mt-0.5 w-5 h-5 rounded-md border-2 border-border flex items-center justify-center flex-shrink-0 transition-colors ${task.status === 'done' ? 'bg-teal2 border-teal2 text-white' : 'group-hover:border-amber/50'}`}>
                          {task.status === 'done' && <CheckCircle2 size={12} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-bold tracking-tight leading-tight transition-all ${task.status === 'done' ? 'line-through opacity-40 text-ink3' : 'text-foreground'}`}>
                            {task.title}
                          </div>
                          <div className="text-[10px] font-mono text-ink3 mt-2 flex items-center gap-2">
                            <span className="opacity-60">{new Date(task.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteTask(task._id); }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-rose hover:bg-rose/10 transition-all ml-2"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
