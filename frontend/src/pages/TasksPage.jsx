import { useState } from 'react';
import { PageHeader, Loader, ErrorMsg } from '../components/UI';
import { useTasks } from '../hooks/useData';
import { Trash2, CircleCheck, Circle, Clock } from 'lucide-react';

const COLUMNS = [
  { id: 'todo',        title: 'To do',       Icon: Circle },
  { id: 'in-progress', title: 'In progress', Icon: Clock },
  { id: 'done',        title: 'Done',        Icon: CircleCheck },
];
const NEXT_STATUS = { 'todo': 'in-progress', 'in-progress': 'done', 'done': 'todo' };

export default function TasksPage() {
  const { tasks, loading, error, create, update, remove } = useTasks();
  const [title, setTitle] = useState('');

  const add = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    await create(title.trim());
    setTitle('');
  };

  return (
    <div>
      <PageHeader title="Tasks" subtitle="Click a task to move it to the next column." />

      <form onSubmit={add} className="mb-8 flex max-w-2xl gap-2">
        <label htmlFor="new-task" className="sr-only">New task</label>
        <input id="new-task" className="input" maxLength={500} placeholder="What needs doing?" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button type="submit" disabled={!title.trim()} className="btn-primary">Add task</button>
      </form>

      {error && <div className="mb-6"><ErrorMsg message={error} /></div>}

      {loading ? <Loader label="Loading tasks…" /> : (
        <div className="grid items-start gap-4 md:grid-cols-3">
          {COLUMNS.map(({ id, title: colTitle, Icon }) => {
            const colTasks = tasks.filter((t) => t.status === id);
            return (
              <section key={id} className="rounded-xl bg-fog p-4" aria-label={colTitle}>
                <div className="mb-3 flex items-center justify-between px-1">
                  <h2 className="flex items-center gap-2 font-bold"><Icon size={16} aria-hidden="true" /> {colTitle}</h2>
                  <span className="badge">{colTasks.length}</span>
                </div>

                {colTasks.length === 0 ? (
                  <p className="rounded-sm border-2 border-dashed border-sand px-3 py-6 text-center text-sm text-silver">Nothing here</p>
                ) : (
                  <ul className="space-y-2">
                    {colTasks.map((task) => (
                      <li key={task._id} className="group flex items-start gap-1 rounded-sm bg-white p-1 transition-colors hover:bg-sand/60">
                        <button
                          onClick={() => update(task._id, { status: NEXT_STATUS[task.status] })}
                          title={`Move to ${COLUMNS.find((c) => c.id === NEXT_STATUS[task.status]).title}`}
                          className="min-w-0 flex-1 rounded-sm p-2.5 text-left"
                        >
                          <span className={`block font-semibold leading-snug ${task.status === 'done' ? 'text-silver line-through' : ''}`}>{task.title}</span>
                          <span className="mt-1 block text-xs text-olive">{new Date(task.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        </button>
                        <button
                          onClick={() => remove(task._id)}
                          aria-label={`Delete "${task.title}"`}
                          className="m-1.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-olive transition hover:bg-warm hover:text-error focus:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:opacity-0"
                        >
                          <Trash2 size={15} />
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
