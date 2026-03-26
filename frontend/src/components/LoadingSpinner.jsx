import { Loader2 } from 'lucide-react';

export default function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary-600" strokeWidth={2} aria-hidden />
      <span className="sr-only">Loading</span>
    </div>
  );
}
