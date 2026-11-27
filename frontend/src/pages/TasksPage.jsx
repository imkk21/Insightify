import { useState } from 'react';
import { PageHeader, ErrorMsg } from '../components/UI';
import { useTasks } from '../hooks/useData';
import { Plus, Trash2, CheckCircle2, Circle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const COLUMNS = [
  { id: 'todo',        title: 'To Do',       icon: <Circle size={14} className="text-rose" /> },
  { id: 'in-progress', title: 'In Progress', icon: <Clock size={14} className="text-amber" /> },
  { id: 'done',        title: 'Completed',   icon: <CheckCircle2 size={14} className="text-teal2" /> },
];
const NEXT_STATUS = { 'todo': 'in-progress', 'in-progress': 'done', 'done': 'todo' };

export default function TasksPage() {
  const { tasks, loading, error, create, update, remove } = useTasks();
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    await create(newTaskTitle);
    setNewTaskTitle('');
    setShowAddForm(false);
  };

  if (loading) return <div className="p-10 text-center animate-pulse text-ink3 font-mono">Loading tasks…</div>;

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-170px)] flex flex-col">
      <PageHeader title="Development Tasks" subtitle="Click a task to move it to the next column.">
        <button onClick={() => setShowAddForm(!showAddForm)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Task
        </button>
      </PageHeader>

      {error && <div className="mb-6"><ErrorMsg message={error} /></div>}

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
                maxLength={500}
                className="input w-full text-lg font-bold"
                placeholder="What exactly needs to be done?"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
              />
              <div className="mt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-5 py-2 font-bold text-ink3 hover:text-ink transition-colors">Cancel</button>
                <button type="submit" className="btn-primary px-8">Add Task</button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 overflow-hidden">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
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
                    <span className="text-[10px] uppercase font-mono tracking-wider">Empty</span>
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <motion.div
                      key={task._id}
                      layoutId={task._id}
                      className="group p-5 bg-card border border-border rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-amber/30 transition-all cursor-pointer relative"
                      onClick={() => update(task._id, { status: NEXT_STATUS[task.status] })}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`mt-0.5 w-5 h-5 rounded-md border-2 border-border flex items-center justify-center flex-shrink-0 transition-colors ${task.status === 'done' ? 'bg-teal2 border-teal2 text-white' : 'group-hover:border-amber/50'}`}>
                          {task.status === 'done' && <CheckCircle2 size={12} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-bold tracking-tight leading-tight transition-all ${task.status === 'done' ? 'line-through opacity-40 text-ink3' : 'text-foreground'}`}>
                            {task.title}
                          </div>
                          <div className="text-[10px] font-mono text-ink3 mt-2 opacity-60">
                            {new Date(task.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); remove(task._id); }}
                          aria-label="Delete task"
                          className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 rounded-lg text-rose hover:bg-rose/10 transition-all ml-2"
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
