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
      <div className="p-3 text-slate-600 text-xs text-center">
        Resource not found
      </div>
    );
  }

  const pips = Array.from({ length: resource.max });

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold leading-tight">{resource.label}</span>
        <span className="text-xs text-slate-500">
          {resource.current}/{resource.max}
        </span>
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {pips.map((_, i) => {
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
                  : 'border-slate-600 hover:border-amber-600'
              }`}
            />
          );
        })}
      </div>
      <p className="text-xs text-slate-600">
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
