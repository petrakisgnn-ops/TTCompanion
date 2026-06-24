import { useCharacterStore } from '../stores/characterStore';
import { registerWidget } from './registry';
import type { WidgetProps } from './registry';
import type { ResourceTrack } from '../domain/character/types';

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];

function slotLabel(resource: ResourceTrack): string {
  if (resource.id === 'pact') return resource.label;
  const n = parseInt(resource.id.replace('slot-', ''), 10);
  return ORDINALS[n - 1] ?? resource.label;
}

interface SlotRowProps { resource: ResourceTrack; charId: string }

function SlotRow({ resource, charId }: SlotRowProps) {
  const { spendResource, restoreResource } = useCharacterStore();
  const pips = Array.from({ length: resource.max });

  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="text-xs text-slate-400 w-8 shrink-0">{slotLabel(resource)}</span>
      <div className="flex gap-1 flex-wrap flex-1">
        {pips.map((_, i) => {
          const filled = i < resource.current;
          return (
            <button
              key={i}
              onClick={() =>
                filled
                  ? spendResource(charId, resource.id)
                  : restoreResource(charId, resource.id)
              }
              className={`w-6 h-6 rounded border-2 transition-colors ${
                filled
                  ? 'bg-violet-500 border-violet-500'
                  : 'bg-transparent border-slate-600 hover:border-violet-500'
              }`}
            />
          );
        })}
      </div>
      <span className="text-xs text-slate-500 shrink-0">{resource.current}/{resource.max}</span>
    </div>
  );
}

function SpellSlotsWidget({ character }: WidgetProps) {
  const slots = character.resources.filter(
    r => r.id.startsWith('slot-') || r.id === 'pact',
  );

  if (slots.length === 0) {
    return (
      <div className="p-3 flex items-center justify-center min-h-[3rem]">
        <p className="text-xs text-slate-600 italic">No spell slots.</p>
      </div>
    );
  }

  return (
    <div className="px-3 pt-2 pb-1 divide-y divide-white/5">
      {slots.map(r => (
        <SlotRow key={r.id} resource={r} charId={character.id} />
      ))}
    </div>
  );
}

registerWidget({
  typeId: 'spell-slots',
  label: 'Spell Slots',
  icon: 'magic_button',
  defaultConfig: {},
  defaultSpan: 2,
  component: SpellSlotsWidget,
});
