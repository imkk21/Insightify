import { useState } from 'react';
import { CardTitle, Loader, ErrorMsg } from './UI';
import { Trash2, CircleCheck, Circle, CircleDashed, Plus } from 'lucide-react';

const COLUMNS = [
  { id: 'todo',        title: 'To do',       Icon: Circle,       tone: 'text-subtle' },
  { id: 'in-progress', title: 'In progress', Icon: CircleDashed, tone: 'text-warning' },
  { id: 'done',        title: 'Done',        Icon: CircleCheck,  tone: 'text-success' },
];
const NEXT_STATUS = { 'todo': 'in-progress', 'in-progress': 'done', 'done': 'todo' };

export default function TasksPanel({ tasks, loading, error, create, update, remove }) {
  const [title, setTitle] = useState('');

  const add = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    await create(title.trim());
    setTitle('');
  };

  return (
    <div>
      <CardTitle title="Tasks" subtitle="Click a task to move it to the next column." />

      <form onSubmit={add} className="mb-5 flex max-w-xl gap-2">
        <label htmlFor="new-task" className="sr-only">New task</label>
        <input id="new-task" className="input" maxLength={500} placeholder="What needs doing?" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button type="submit" disabled={!title.trim()} className="btn-primary"><Plus size={14} aria-hidden="true" /> Add task</button>
      </form>

      {error && <div className="mb-4"><ErrorMsg message={error} /></div>}

      {loading ? <Loader label="Loading tasks…" /> : (
        <div className="grid items-start gap-3 md:grid-cols-3">
          {COLUMNS.map(({ id, title: colTitle, Icon, tone }) => {
            const colTasks = tasks.filter((t) => t.status === id);
            return (
              <section key={id} className="rounded-xl border border-line bg-surface/60 p-2" aria-label={colTitle}>
                <div className="flex h-9 items-center justify-between px-2">
                  <h3 className="flex items-center gap-2 text-[13px] font-medium text-fg">
                    <Icon size={14} className={tone} aria-hidden="true" /> {colTitle}
                  </h3>
                  <span className="font-mono text-2xs text-subtle">{colTasks.length}</span>
                </div>

                {colTasks.length === 0 ? (
                  <p className="m-1 rounded-md border border-dashed border-line-strong px-3 py-6 text-center text-xs text-subtle">Nothing here</p>
                ) : (
                  <ul className="space-y-1.5 p-1">
                    {colTasks.map((task) => (
                      <li key={task._id}
                        className="group flex items-start rounded-md border border-line bg-raised shadow transition-colors hover:border-line-strong">
                        <button
                          onClick={() => update(task._id, { status: NEXT_STATUS[task.status] })}
                          title={`Move to ${COLUMNS.find((c) => c.id === NEXT_STATUS[task.status]).title}`}
                          className="min-w-0 flex-1 rounded-md px-3 py-2.5 text-left"
                        >
                          <span className={`block text-[13px] leading-snug ${task.status === 'done' ? 'text-subtle line-through' : 'text-fg'}`}>{task.title}</span>
                          <span className="mt-1 block font-mono text-2xs text-subtle">
                            {new Date(task.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        </button>
                        <button
                          onClick={() => remove(task._id)}
                          aria-label={`Delete "${task.title}"`}
                          className="btn-icon btn-ghost btn-sm m-1.5 w-7 hover:text-danger focus:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:opacity-0"
                        >
                          <Trash2 size={13} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
