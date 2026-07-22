import { useEffect, useState } from 'react';
import { db } from '../../../data/db';
import type { StoredSpell } from '../../../data/db';
import { refKey } from '../../../domain/reference/types';
import type { Character } from '../../../domain/character/types';
import type { GrantedSpellOption } from '../../../domain/rules/grantedSpells';
import { matchesSpellChoiceQuery } from '../../../domain/rules/spellChoiceQuery';
import { resolveClassSpellList, type SpellSourcesJson } from '../../../domain/rules/classSpellList';
import { LEVEL_LABEL } from '../../../domain/rules/spellcasting';
import { useSettingsStore } from '../../../stores/settingsStore';
import { matchesEdition } from '../../../domain/rules/edition';
import { useCharacterStore } from '../../../stores/characterStore';

const SCHOOL_NAMES: Record<string, string> = {
  A: 'Abjuration', C: 'Conjuration', D: 'Divination', E: 'Enchantment',
  V: 'Evocation',  I: 'Illusion',   N: 'Necromancy', T: 'Transmutation',
};

type ChoiceOption = Extract<GrantedSpellOption, { kind: 'choice' }>;

interface GrantedSpellChoicePickerProps {
  character: Character;
  option: ChoiceOption;
  onClose: () => void;
}

export function GrantedSpellChoicePicker({ character, option, onClose }: GrantedSpellChoicePickerProps) {
  const { edition } = useSettingsStore();
  const { addKnownSpell } = useCharacterStore();
  const [pool, setPool] = useState<StoredSpell[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      let candidates: StoredSpell[];
      if (option.query.classFilter) {
        const res = await fetch(`${import.meta.env.BASE_URL}data/spells/sources.json`);
        const sourcesJson: SpellSourcesJson = await res.json();
        // "class=cleric;wizard" means either class's list qualifies — union them, deduping by key.
        const refs = new Map<string, { name: string; source: string }>();
        for (const className of option.query.classFilter) {
          for (const ref of resolveClassSpellList(sourcesJson, className)) refs.set(refKey(ref), ref);
        }
        candidates = (await db.spells.bulkGet([...refs.keys()])).filter((s): s is StoredSpell => s !== undefined);
      } else {
        candidates = await db.spells.toArray();
      }
      const filtered = candidates
        .filter(s => matchesSpellChoiceQuery(s, option.query))
        .filter(s => matchesEdition(s.source, s.reprintedAs, edition))
        .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
      if (!cancelled) setPool(filtered);
    })();

    return () => { cancelled = true; };
  }, [option, edition]);

  // Computed fresh every render from `character` + `pool` (not a frozen prop) so the
  // count keeps up as the player picks within one session — pool membership is what
  // disambiguates which sub-grant a known entry belongs to when one grantedBy offers
  // more than one choice (Magic Initiate: cantrips vs. its leveled spell), since each
  // choice's pool is already scoped to its own query.
  const alreadyKnownKeys = new Set(
    character.knownSpells.filter(s => s.grantedBy === option.grantedBy).map(refKey),
  );
  const chosenCount = pool.filter(p => alreadyKnownKeys.has(p._key)).length;
  const remaining = option.count - chosenCount;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-card)] rounded-t-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-base">{option.grantedBy}</h2>
            <p className="text-xs text-[var(--color-faint)]">Choose {remaining} more</p>
          </div>
          <button onClick={onClose} className="text-[var(--color-muted)] hover:text-[var(--color-text)] text-sm">✕</button>
        </div>

        <div className="bg-[var(--color-raised)] rounded-xl overflow-hidden divide-y divide-[var(--color-border)]">
          {pool.map(spell => {
            const already = alreadyKnownKeys.has(spell._key);
            return (
              <button
                key={spell._key}
                disabled={already || remaining <= 0}
                onClick={() => {
                  addKnownSpell(character.id, { name: spell.name, source: spell.source, grantedBy: option.grantedBy });
                  if (remaining <= 1) onClose();
                }}
                className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-white/5 disabled:opacity-40"
              >
                <span className="text-sm">{spell.name}</span>
                <span className="text-xs text-[var(--color-faint)] ml-2 shrink-0">
                  {already ? 'Chosen' : `${LEVEL_LABEL[spell.level]} · ${SCHOOL_NAMES[spell.school] ?? spell.school}`}
                </span>
              </button>
            );
          })}
          {pool.length === 0 && (
            <p className="text-xs text-[var(--color-disabled)] px-4 py-3 text-center">No matching spells found</p>
          )}
        </div>
      </div>
    </>
  );
}
