import { Logo } from './Brand';

export default function LoadingScreen() {
  return (
    <div role="status" aria-label="Loading" className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-white">
      <Logo />
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-sand border-t-plum" />
    </div>
  );
}
