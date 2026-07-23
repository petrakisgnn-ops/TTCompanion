import { useCharacterStore } from '../stores/characterStore';
import { registerWidget } from './registry';
import type { WidgetProps } from './registry';

export interface ResourceTrackerConfig {
  resourceId: string;
}

function ResourceTrackerWidget({ instance, character }: WidgetProps) {
  const { spendResource, restoreResource } = useCharacterStore();
  const config = instance.config as ResourceTrackerConfig;
  const resource = character.resources.find(r => r.id === config.resourceId);

  if (!resource) {
    return (
      <div className="p-3 text-[var(--color-faint)] text-xs text-center">
        Resource not found
      </div>
    );
  }

  // Large point pools (e.g. Paladin's Lay on Hands, up to 100 at level 20) render as a
  // +/- stepper instead of one checkbox per point — a 100-pip grid isn't usable UI.
  const isLargePool = resource.max > 20;

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold leading-tight">{resource.label}</span>
        <span className="text-xs text-[var(--color-muted)]">
          {resource.current}/{resource.max}
        </span>
      </div>
      {isLargePool ? (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => spendResource(character.id, resource.id)}
            disabled={resource.current <= 0}
            className="w-9 h-9 rounded-lg bg-[var(--color-raised)] font-bold text-lg hover:bg-[var(--color-card-inner)] disabled:opacity-30 flex items-center justify-center"
          >
            −
          </button>
          <span className="text-xl font-bold w-16 text-center">{resource.current}</span>
          <button
            onClick={() => restoreResource(character.id, resource.id)}
            disabled={resource.current >= resource.max}
            className="w-9 h-9 rounded-lg bg-[var(--color-raised)] font-bold text-lg hover:bg-[var(--color-card-inner)] disabled:opacity-30 flex items-center justify-center"
          >
            +
          </button>
        </div>
      ) : (
        <div className="flex gap-1.5 flex-wrap">
          {Array.from({ length: resource.max }).map((_, i) => {
            const filled = i < resource.current;
            return (
              <button
                key={i}
                onClick={() =>
                  filled
                    ? spendResource(character.id, resource.id)
                    : restoreResource(character.id, resource.id)
                }
                className={`w-7 h-7 rounded-md border-2 transition-colors ${
                  filled
                    ? 'bg-amber-500 border-amber-500'
                    : 'border-[var(--color-border)] hover:border-amber-600'
                }`}
              />
            );
          })}
        </div>
      )}
      <p className="text-xs text-[var(--color-faint)]">
        Resets on {resource.resetOn === 'shortRest' ? 'short rest' : 'long rest'}
      </p>
    </div>
  );
}

registerWidget({
  typeId: 'resource-tracker',
  label: 'Resource Tracker',
  icon: 'bolt',
  defaultConfig: { resourceId: '' } satisfies ResourceTrackerConfig,
  defaultSpan: 1,
  hasConfig: true,
  component: ResourceTrackerWidget,
});
