import { LogoMark } from './Brand';

export default function LoadingScreen() {
  return (
    <div role="status" aria-label="Loading" className="app-backdrop fixed inset-0 z-50 flex items-center justify-center bg-bg">
      <LogoMark className="h-10 w-10 animate-pulse" />
    </div>
  );
}
