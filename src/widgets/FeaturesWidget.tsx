import { CollapsibleFeature } from '../ui/CollapsibleFeature';
import { useCharacterFeatures } from '../features/character/useCharacterFeatures';
import { registerWidget } from './registry';
import type { WidgetProps } from './registry';

function FeaturesWidget({ character }: WidgetProps) {
  const groups = useCharacterFeatures(character).filter(g => g.features.length > 0);

  if (groups.length === 0) {
    return (
      <div className="p-3">
        <p className="text-xs text-[var(--color-faint)] py-2 text-center">No features yet.</p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      {groups.map(g => (
        <div key={g.title} className="space-y-1.5">
          <p className="text-[10px] font-semibold text-[var(--color-muted)] uppercase tracking-wide">{g.title}</p>
          <div className="space-y-1.5">
            {g.features.map((f, i) => (
              <CollapsibleFeature key={`${f.title}|${i}`} title={f.title} badge={f.badge} entries={f.entries} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

registerWidget({
  typeId: 'features',
  label: 'Features',
  icon: 'auto_stories',
  defaultConfig: {},
  defaultSpan: 2,
  component: FeaturesWidget,
});
