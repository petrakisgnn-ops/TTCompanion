import { useCharacterStore } from '../../../stores/characterStore';
import type { Character, ResourceTrack } from '../../../domain/character/types';

interface ResourceSectionProps {
  character: Character;
}

function ResourceRow({ resource, charId }: { resource: ResourceTrack; charId: string }) {
  const { spendResource, restoreResource } = useCharacterStore();
  // Large point pools (e.g. Paladin's Lay on Hands, up to 100 at level 20) render as a
  // +/- stepper instead of one checkbox per point — a 100-pip grid isn't usable UI.
  const isLargePool = resource.max > 20;

  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium">{resource.label}</span>
        <span className="text-xs text-[var(--color-faint)]">
          {resource.current}/{resource.max} · resets on {resource.resetOn === 'shortRest' ? 'short rest' : 'long rest'}
        </span>
      </div>
      {isLargePool ? (
        <div className="flex items-center gap-3">
          <button
            onClick={() => spendResource(charId, resource.id)}
            disabled={resource.current <= 0}
            className="w-9 h-9 rounded-lg bg-[var(--color-raised)] font-bold text-lg hover:bg-[var(--color-card-inner)] disabled:opacity-30 flex items-center justify-center"
          >
            −
          </button>
          <span className="text-lg font-bold w-14 text-center">{resource.current}</span>
          <button
            onClick={() => restoreResource(charId, resource.id)}
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
                    ? spendResource(charId, resource.id)
                    : restoreResource(charId, resource.id)
                }
                className={`w-7 h-7 rounded-md border-2 transition-colors ${
                  filled
                    ? 'bg-amber-500 border-amber-500'
                    : 'bg-transparent border-slate-600 hover:border-amber-600'
                }`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ResourceSection({ character }: ResourceSectionProps) {
  if (character.resources.length === 0) return null;

  // Group: spell slots vs other
  const spellSlots = character.resources.filter(
    r => r.id.startsWith('slot-') || r.id === 'pact',
  );
  const other = character.resources.filter(
    r => !r.id.startsWith('slot-') && r.id !== 'pact',
  );

  return (
    <div className="space-y-4">
      {spellSlots.length > 0 && (
        <div className="bg-[var(--color-card)] rounded-xl px-4 divide-y divide-[var(--color-border)]">
          <h3 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide py-2">
            Spell Slots
          </h3>
          {spellSlots.map(r => (
            <ResourceRow key={r.id} resource={r} charId={character.id} />
          ))}
        </div>
      )}

      {other.length > 0 && (
        <div className="bg-[var(--color-card)] rounded-xl px-4 divide-y divide-[var(--color-border)]">
          <h3 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide py-2">
            Other Resources
          </h3>
          {other.map(r => (
            <ResourceRow key={r.id} resource={r} charId={character.id} />
          ))}
        </div>
      )}
    </div>
  );
}
