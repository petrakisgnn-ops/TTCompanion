import { CollapsibleFeature } from '../../../ui/CollapsibleFeature';
import { useCharacterFeatures, featureKey, type FeatureRow } from '../useCharacterFeatures';
import { ClassOptionsSection } from './ClassOptionsSection';
import { WeaponMasterySection } from './WeaponMasterySection';
import { useCharacterStore } from '../../../stores/characterStore';
import type { Character } from '../../../domain/character/types';

interface FeaturesTabProps { character: Character }

function FeatureGroup({
  title, features, hidden, onToggle,
}: {
  title: string;
  features: FeatureRow[];
  hidden: Set<string>;
  onToggle: (key: string) => void;
}) {
  if (features.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide">{title}</h3>
      <div className="space-y-2">
        {features.map((f, i) => {
          const key = featureKey(title, f);
          const shown = !hidden.has(key);
          return (
            <div key={`${f.title}|${i}`} className="flex items-start gap-2.5">
              <input
                type="checkbox"
                checked={shown}
                onChange={() => onToggle(key)}
                aria-label={shown ? `Hide ${f.title} from home` : `Show ${f.title} on home`}
                className="mt-3.5 w-4 h-4 shrink-0 accent-amber-500 cursor-pointer"
              />
              <div className={`flex-1 min-w-0 transition-opacity ${shown ? '' : 'opacity-45'}`}>
                <CollapsibleFeature title={f.title} badge={f.badge} entries={f.entries} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function FeaturesTab({ character }: FeaturesTabProps) {
  const groups = useCharacterFeatures(character);
  const { toggleHiddenFeature } = useCharacterStore();
  const hidden = new Set(character.hiddenFeatures ?? []);
  const hasAnything = groups.some(g => g.features.length > 0);

  return (
    <div className="space-y-5">
      <ClassOptionsSection character={character} />
      <WeaponMasterySection character={character} />
      {hasAnything && (
        <p className="text-[11px] text-[var(--color-faint)] leading-relaxed">
          Ticked features appear on your home <span className="text-[var(--color-muted)]">Features</span> widget.
          Untick the ones you don't need there to keep it uncluttered.
        </p>
      )}
      {groups.map(g => (
        <FeatureGroup
          key={g.title}
          title={g.title}
          features={g.features}
          hidden={hidden}
          onToggle={key => toggleHiddenFeature(character.id, key)}
        />
      ))}
      {!hasAnything && (
        <div className="text-center py-12 text-[var(--color-faint)] text-sm">
          No features to show yet.
        </div>
      )}
    </div>
  );
}
