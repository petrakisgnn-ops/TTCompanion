import { useEffect, useState } from 'react';
import { renderEntries } from '../../../rendering';
import { useCharacterStore } from '../../../stores/characterStore';
import type { Character } from '../../../domain/character/types';
import { optionalFeatureSlots, type OptionalFeatureSlotGroup } from '../../../domain/rules/optionalFeatures';
import { matchesEdition } from '../../../domain/rules/edition';
import { useSettingsStore } from '../../../stores/settingsStore';
import {
  fetchOptionalFeatureRows, fetchOptionalFeatures, type OptionalFeatureEntry,
} from '../grantSourcesCache';

interface ClassOptionsSectionProps { character: Character }

interface GroupState extends OptionalFeatureSlotGroup {
  className: string;
}

function prereqLabel(prerequisite: unknown[] | undefined): string | null {
  if (!prerequisite || prerequisite.length === 0) return null;
  const parts: string[] = [];
  for (const p of prerequisite as Record<string, unknown>[]) {
    if (p.level != null) {
      const lvl = p.level as { level?: number; subclass?: { name?: string } } | number;
      parts.push(typeof lvl === 'number' ? `Level ${lvl}` : `Level ${lvl.level ?? '?'}`);
    }
    if (p.pact) parts.push(`Pact of the ${String(p.pact)}`);
    if (p.spell) parts.push('Spell requirement');
    if (p.item) parts.push('Item requirement');
    if (p.otherSummary) parts.push(String((p.otherSummary as { entrySummary?: string }).entrySummary ?? ''));
  }
  return parts.filter(Boolean).length > 0 ? parts.filter(Boolean).join(', ') : null;
}

/**
 * "Class Options" — the choose-N class features driven by the class JSONs'
 * optionalfeatureProgression (Fighting Style, Eldritch Invocations, Metamagic,
 * Battle Master maneuvers, ...). Caps are soft (add disabled at max, never blocked
 * retroactively); prerequisites display as advisory text only.
 */
export function ClassOptionsSection({ character }: ClassOptionsSectionProps) {
  const { edition } = useSettingsStore();
  const { addOptionalFeature, removeOptionalFeature } = useCharacterStore();
  const [groups, setGroups] = useState<GroupState[]>([]);
  const [allOptions, setAllOptions] = useState<OptionalFeatureEntry[]>([]);
  const [pickerGroup, setPickerGroup] = useState<GroupState | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const collected: GroupState[] = [];
      for (const cl of character.classes) {
        const { classRows, subclassRows } = await fetchOptionalFeatureRows(cl.classRef.name, cl.subclass);
        for (const g of optionalFeatureSlots(classRows, subclassRows, cl.level)) {
          collected.push({ ...g, className: cl.classRef.name });
        }
      }
      const options = await fetchOptionalFeatures();
      if (!cancelled) { setGroups(collected); setAllOptions(options); }
    })();
    return () => { cancelled = true; };
  }, [character.classes]);

  if (groups.length === 0) return null;

  const resolveChosen = (group: GroupState): OptionalFeatureEntry[] =>
    character.optionalFeatures
      .map(ref => allOptions.find(o => o.name === ref.name && o.source === ref.source))
      .filter((o): o is OptionalFeatureEntry => !!o && (o.featureType ?? []).some(t => group.featureTypes.includes(t)));

  const toggleExpanded = (key: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide">Class Options</h2>
      {groups.map(group => {
        const chosen = resolveChosen(group);
        const atCap = chosen.length >= group.max;
        return (
          <div key={`${group.className}|${group.name}`} className="bg-[var(--color-card)] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5">
              <p className="text-sm font-semibold">
                {group.name}
                <span className="ml-1.5 font-normal text-xs text-[var(--color-faint)]">
                  {group.className} · {chosen.length} / {group.max} known
                </span>
              </p>
              <button
                onClick={() => setPickerGroup(group)}
                disabled={atCap}
                className={`text-xs font-semibold ${atCap ? 'text-[var(--color-disabled)]' : 'text-amber-500 hover:text-amber-400'}`}
              >
                + Add
              </button>
            </div>
            {chosen.length > 0 && (
              <div className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
                {chosen.map(opt => {
                  const key = `${opt.name}|${opt.source}`;
                  const isOpen = expanded.has(key);
                  return (
                    <div key={key}>
                      <div className="flex items-center">
                        <button onClick={() => toggleExpanded(key)} className="flex-1 flex items-center justify-between px-4 py-2.5 text-left">
                          <span className="text-sm">{opt.name}</span>
                          <span className="text-[var(--color-faint)] text-xs ml-2">{isOpen ? '▲' : '▼'}</span>
                        </button>
                        <button
                          onClick={() => removeOptionalFeature(character.id, { name: opt.name, source: opt.source })}
                          className="px-3 py-2.5 text-[var(--color-disabled)] hover:text-red-400 text-sm"
                          aria-label="Remove"
                        >
                          ✕
                        </button>
                      </div>
                      {isOpen && opt.entries && (
                        <div className="px-4 pb-3 text-sm leading-relaxed text-[var(--color-text-2)] space-y-1">
                          {renderEntries(opt.entries)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {pickerGroup && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setPickerGroup(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-card)] rounded-t-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-base">{pickerGroup.name}</h2>
                <p className="text-xs text-[var(--color-faint)]">{pickerGroup.className}</p>
              </div>
              <button onClick={() => setPickerGroup(null)} className="text-[var(--color-muted)] hover:text-[var(--color-text)] text-sm">✕</button>
            </div>
            <div className="bg-[var(--color-raised)] rounded-xl overflow-hidden divide-y divide-[var(--color-border)]">
              {allOptions
                .filter(o =>
                  (o.featureType ?? []).some(t => pickerGroup.featureTypes.includes(t)) &&
                  matchesEdition(o.source, o.reprintedAs, edition) &&
                  !character.optionalFeatures.some(f => f.name === o.name && f.source === o.source),
                )
                .map(opt => {
                  const pre = prereqLabel(opt.prerequisite);
                  return (
                    <button
                      key={`${opt.name}|${opt.source}`}
                      onClick={() => {
                        addOptionalFeature(character.id, { name: opt.name, source: opt.source });
                        const remaining = pickerGroup.max - resolveChosen(pickerGroup).length - 1;
                        if (remaining <= 0) setPickerGroup(null);
                      }}
                      className="w-full flex items-start justify-between px-4 py-2.5 text-left hover:bg-white/5"
                    >
                      <div>
                        <p className="text-sm font-medium">{opt.name}</p>
                        {pre && <p className="text-xs text-[var(--color-faint)] mt-0.5">Req: {pre}</p>}
                      </div>
                      <span className="text-xs text-[var(--color-disabled)] ml-2 shrink-0">{opt.source}</span>
                    </button>
                  );
                })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
