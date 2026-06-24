import type { IngestProgress } from '../data/ingest';

interface Props {
  progress: IngestProgress | null;
  error: string | null;
}

export function LoadingScreen({ progress, error }: Props) {
  const pct =
    progress && progress.total > 0
      ? Math.round((progress.loaded / progress.total) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <h1 className="text-xl font-bold mb-1">D&amp;D Companion</h1>
        <p className="text-slate-400 text-sm">
          {error ? 'Setup failed' : (progress?.label ?? 'Starting up…')}
        </p>
      </div>

      {error ? (
        <p className="text-red-400 text-sm text-center max-w-xs">{error}</p>
      ) : (
        <div className="w-full max-w-xs space-y-2">
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          {progress && (
            <p className="text-slate-500 text-xs text-center">
              {progress.loaded} / {progress.total}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
