import { PageHeader } from '../components/UI';
import TasksPanel from '../components/TasksPanel';
import MusicPanel from '../components/MusicPanel';
import { useTasks } from '../hooks/useData';

export default function FocusPage() {
  const tasks = useTasks();
  return (
    <div>
      <PageHeader title="Focus" subtitle="What you're working on, and something to listen to while you do it." />
      <section className="mb-12"><TasksPanel {...tasks} /></section>
      <section><MusicPanel /></section>
    </div>
  );
}
