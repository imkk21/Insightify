import { PageHeader, Card } from '../components/UI';
import TasksPanel from '../components/TasksPanel';
import MusicPanel from '../components/MusicPanel';
import { useTasks } from '../hooks/useData';

export default function FocusPage() {
  const tasks = useTasks();
  return (
    <div>
      <PageHeader eyebrow="Workspace" title="Focus" subtitle="What you're working on, and something to listen to while you do it." />
      <Card className="mb-4"><TasksPanel {...tasks} /></Card>
      <Card><MusicPanel /></Card>
    </div>
  );
}
