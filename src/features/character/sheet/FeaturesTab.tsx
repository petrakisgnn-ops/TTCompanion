import { CollapsibleFeature } from '../../../ui/CollapsibleFeature';
import { useCharacterFeatures, type FeatureRow } from '../useCharacterFeatures';
import type { Character } from '../../../domain/character/types';

interface FeaturesTabProps { character: Character }

function FeatureGroup({ title, features }: { title: string; features: FeatureRow[] }) {
  if (features.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide">{title}</h3>
      <div className="space-y-2">
        {features.map((f, i) => (
          <CollapsibleFeature key={`${f.title}|${i}`} title={f.title} badge={f.badge} entries={f.entries} />
        ))}
      </div>
    </div>
  );
}

export function FeaturesTab({ character }: FeaturesTabProps) {
  const groups = useCharacterFeatures(character);
  const hasAnything = groups.some(g => g.features.length > 0);

  return (
    <div className="space-y-5">
      {groups.map(g => (
        <FeatureGroup key={g.title} title={g.title} features={g.features} />
      ))}
      {!hasAnything && (
        <div className="text-center py-12 text-[var(--color-faint)] text-sm">
          No features to show yet.
        </div>
      )}
    </div>
  );
}
