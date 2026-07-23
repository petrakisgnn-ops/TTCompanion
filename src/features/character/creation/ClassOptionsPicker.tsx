import { useEffect, useState } from 'react';
import { optionalFeatureSlots, type OptionalFeatureSlotGroup } from '../../../domain/rules/optionalFeatures';
import { matchesEdition } from '../../../domain/rules/edition';
import { useSettingsStore } from '../../../stores/settingsStore';
import {
  fetchOptionalFeatureRows, fetchOptionalFeatures, type OptionalFeatureEntry,
} from '../grantSourcesCache';
import type { WizardData } from './CharacterWizard';

interface Props {
  data: WizardData;
  patch: (p: Partial<WizardData>) => void;
}

function prereqLabel(prerequisite: unknown[] | undefined): string | null {
  if (!prerequisite || prerequisite.length === 0) return null;
  const parts: string[] = [];
  for (const p of prerequisite as Record<string, unknown>[]) {
    if (p.level != null) {
      const lvl = p.level as { level?: number } | number;
      parts.push(typeof lvl === 'number' ? `Level ${lvl}` : `Level ${lvl.level ?? '?'}`);
    }
    if (typeof p.pact === 'string') parts.push(`Pact of the ${p.pact}`);
    if (p.spell) parts.push('Spell requirement');
  }
  return parts.filter(Boolean).length > 0 ? parts.filter(Boolean).join(', ') : null;
}

/**
 * Creation-time "Class Options" — the choose-N features a class/subclass grants through
 * its optionalfeatureProgression (Fighting Style, Eldritch Invocations, Metamagic, Battle
 * Master maneuvers, a Four Elements monk's Elemental Disciplines, …). Mirrors the sheet's
 * ClassOptionsSection but writes into the wizard draft. Caps are soft; prerequisites are advisory.
 */
export function ClassOptionsPicker({ data, patch }: Props) {
  const { edition } = useSettingsStore();
  const [groups, setGroups] = useState<OptionalFeatureSlotGroup[]>([]);
  const [allOptions, setAllOptions] = useState<OptionalFeatureEntry[]>([]);
  const [pickerGroup, setPickerGroup] = useState<OptionalFeatureSlotGroup | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!data.classRef) { setGroups([]); return; }
      const { classRows, subclassRows } = await fetchOptionalFeatureRows(
        data.classRef.name, data.subclassRef ?? undefined,
      );
      const g = optionalFeatureSlots(classRows, subclassRows, data.level);
      const options = await fetchOptionalFeatures();
      if (!cancelled) { setGroups(g); setAllOptions(options); }
    })();
    return () => { cancelled = true; };
  }, [data.classRef?.name, data.subclassRef?.name, data.subclassRef?.source, data.level]);

  if (!data.classRef || groups.length === 0) return null;

  const chosenFor = (group: OptionalFeatureSlotGroup): OptionalFeatureEntry[] =>
    data.optionalFeatures
      .map(ref => allOptions.find(o => o.name === ref.name && o.source === ref.source))
      .filter((o): o is OptionalFeatureEntry => !!o && (o.featureType ?? []).some(t => group.featureTypes.includes(t)));

  const add = (opt: OptionalFeatureEntry) =>
    patch({ optionalFeatures: [...data.optionalFeatures, { name: opt.name, source: opt.source }] });
  const remove = (opt: OptionalFeatureEntry) =>
    patch({ optionalFeatures: data.optionalFeatures.filter(f => !(f.name === opt.name && f.source === opt.source)) });

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold">Class Options</h2>
      {groups.map(group => {
        const chosen = chosenFor(group);
        const remaining = group.max - chosen.length;
        const atCap = remaining <= 0;
        return (
          <div key={group.name} className="bg-[var(--color-card)] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5">
              <p className="text-sm font-semibold">
                {group.name}
                <span className="ml-1.5 font-normal text-xs text-[var(--color-faint)]">
                  {chosen.length} / {group.max} chosen
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
                {chosen.map(opt => (
                  <div key={`${opt.name}|${opt.source}`} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm">{opt.name}</span>
                    <button
                      onClick={() => remove(opt)}
                      className="px-2 text-[var(--color-disabled)] hover:text-red-400 text-sm"
                      aria-label="Remove"
                    >
                      ✕
                    </button>
                  </div>
                ))}
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
              <h2 className="font-semibold text-base">{pickerGroup.name}</h2>
              <button onClick={() => setPickerGroup(null)} className="text-[var(--color-muted)] hover:text-[var(--color-text)] text-sm">✕</button>
            </div>
            <div className="bg-[var(--color-raised)] rounded-xl overflow-hidden divide-y divide-[var(--color-border)]">
              {allOptions
                .filter(o =>
                  (o.featureType ?? []).some(t => pickerGroup.featureTypes.includes(t)) &&
                  matchesEdition(o.source, o.reprintedAs, edition) &&
                  !data.optionalFeatures.some(f => f.name === o.name && f.source === o.source),
                )
                .map(opt => {
                  const pre = prereqLabel(opt.prerequisite);
                  return (
                    <button
                      key={`${opt.name}|${opt.source}`}
                      onClick={() => {
                        add(opt);
                        if (pickerGroup.max - chosenFor(pickerGroup).length - 1 <= 0) setPickerGroup(null);
                      }}
                      className="w-full flex items-start justify-between px-4 py-2.5 text-left hover:bg-white/5"
                    >
                      <div>
                        <p className="text-sm font-medium">{opt.name}</p>
                        {pre && <p className="text-xs text-[var(--color-disabled)] mt-0.5">Req: {pre}</p>}
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
