import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../../data/db';
import type { StoredSpell } from '../../../data/db';
import { refKey } from '../../../domain/reference/types';
import type { RefId } from '../../../domain/reference/types';
import type { Character } from '../../../domain/character/types';
import { maxSpellLevelForCharacter, LEVEL_LABEL } from '../../../domain/rules/spellcasting';
import { resolveClassSpellList, type SpellSourcesJson } from '../../../domain/rules/classSpellList';
import { useSettingsStore } from '../../../stores/settingsStore';
import { matchesEdition } from '../../../domain/rules/edition';

const SCHOOL_NAMES: Record<string, string> = {
  A: 'Abjuration', C: 'Conjuration', D: 'Divination', E: 'Enchantment',
  V: 'Evocation',  I: 'Illusion',   N: 'Necromancy', T: 'Transmutation',
};

export interface SpellActionBlock {
  verb: 'Prepare' | 'Learn';
  cap: number;
  onAdd: (spell: RefId) => void;
  onRemove: (spell: RefId) => void;
}

interface ClassSpellBrowserProps {
  character: Character;
  className: string;
  /** 'class-list' browses the class's entire spell list (sources.json); 'known-spells' browses the character's own spellbook (Wizard's prepare step). */
  poolSource: 'class-list' | 'known-spells';
  /** Action/cap for levels 1–9. */
  leveled: SpellActionBlock;
  /** Action/cap for level 0 (cantrips). Omitted entirely for classes with no cantrips (Paladin, Ranger). */
  cantrips?: SpellActionBlock;
  /** Extra refs unioned into the 'class-list' pool — e.g. a Warlock patron's expanded spell list. */
  extraSpells?: RefId[];
}

/**
 * By-level browser over a class's spell pool, driving either a "Learn" step (known
 * casters' fixed list, or a Wizard's spellbook growth) or a "Prepare" step (whole-list
 * prepared casters, or a Wizard preparing from their own spellbook). Cantrips — never
 * "prepared" even for prepared casters, RAW-wise — always use the `cantrips` block's
 * own verb/cap, independent of `leveled`.
 */
export function ClassSpellBrowser({ character, className, poolSource, leveled, cantrips, extraSpells }: ClassSpellBrowserProps) {
  const navigate = useNavigate();
  const { edition } = useSettingsStore();
  const [pool, setPool] = useState<StoredSpell[]>([]);
  const [openLevels, setOpenLevels] = useState<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (poolSource === 'known-spells') {
        const refs = character.knownSpells.filter(s => !s.grantedBy);
        if (refs.length === 0) { if (!cancelled) setPool([]); return; }
        const spells = await db.spells.bulkGet(refs.map(refKey));
        if (!cancelled) setPool(spells.filter((s): s is StoredSpell => s !== undefined));
        return;
      }

      const res = await fetch(`${import.meta.env.BASE_URL}data/spells/sources.json`);
      const sourcesJson: SpellSourcesJson = await res.json();
      // Union the class list with any subclass-expanded refs (patron spells), deduped by key.
      const refMap = new Map<string, RefId>();
      for (const ref of resolveClassSpellList(sourcesJson, className)) refMap.set(refKey(ref), ref);
      for (const ref of extraSpells ?? []) refMap.set(refKey(ref), ref);
      const spells = await db.spells.bulkGet([...refMap.keys()]);
      const resolved = spells.filter((s): s is StoredSpell => s !== undefined)
        .filter(s => matchesEdition(s.source, s.reprintedAs, edition));
      if (!cancelled) setPool(resolved);
    })();

    return () => { cancelled = true; };
  }, [poolSource, className, character.knownSpells, edition, extraSpells]);

  const maxLevel = maxSpellLevelForCharacter(character);

  const activeKeysFor = (block: SpellActionBlock): Set<string> => {
    const refs = block.verb === 'Prepare' ? character.preparedSpells : character.knownSpells.filter(s => !s.grantedBy);
    return new Set(refs.map(refKey));
  };
  const leveledActive = activeKeysFor(leveled);
  const cantripsActive = cantrips ? activeKeysFor(cantrips) : new Set<string>();

  const leveledPool = poolFilteredByLevel(pool, l => l > 0);
  const cantripPool = cantrips ? poolFilteredByLevel(pool, l => l === 0) : [];
  const leveledCount = leveledPool.filter(s => leveledActive.has(s._key)).length;
  const cantripCount = cantripPool.filter(s => cantripsActive.has(s._key)).length;

  const byLevel = [...leveledPool, ...cantripPool]
    .reduce<Record<number, StoredSpell[]>>((acc, s) => {
      (acc[s.level] ??= []).push(s);
      return acc;
    }, {});

  const toggleLevel = (lvl: number) =>
    setOpenLevels(prev => {
      const next = new Set(prev);
      if (next.has(lvl)) next.delete(lvl); else next.add(lvl);
      return next;
    });

  if (pool.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <h3 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide">
          {leveled.verb} Spells
        </h3>
        <span className={`text-xs font-semibold ${leveledCount >= leveled.cap ? 'text-amber-500' : 'text-[var(--color-faint)]'}`}>
          {leveledCount} / {leveled.cap} {leveled.verb === 'Prepare' ? 'prepared' : 'known'}
        </span>
      </div>

      <div className="space-y-1.5">
        {Object.entries(byLevel)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([lvlStr, spells]) => {
            const lvl = Number(lvlStr);
            const isCantripGroup = lvl === 0;
            const block = isCantripGroup ? cantrips! : leveled;
            const active = isCantripGroup ? cantripsActive : leveledActive;
            const count = isCantripGroup ? cantripCount : leveledCount;
            const locked = !isCantripGroup && lvl > maxLevel;
            const open = openLevels.has(lvl);
            const sorted = [...spells].sort((a, b) => a.name.localeCompare(b.name));

            return (
              <div key={lvl} className="bg-[var(--color-card)] rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleLevel(lvl)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-left"
                >
                  <span className={`text-sm font-medium ${locked ? 'text-[var(--color-disabled)]' : ''}`}>
                    {locked && <span className="mr-1">🔒</span>}
                    {isCantripGroup ? 'Cantrips' : `${LEVEL_LABEL[lvl]} Level`}
                    <span className="ml-1.5 font-normal text-[var(--color-faint)]">({sorted.length})</span>
                    {isCantripGroup && (
                      <span className="ml-1.5 font-normal text-[var(--color-faint)]">— {count} / {block.cap} known</span>
                    )}
                  </span>
                  <span className="text-[var(--color-faint)] text-xs">{open ? '▲' : '▼'}</span>
                </button>

                {open && (
                  <div className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
                    {sorted.map(spell => {
                      const isActive = active.has(spell._key);
                      const atCap = !isActive && count >= block.cap;

                      return (
                        <div key={spell._key} className="flex items-center">
                          <button
                            onClick={() => navigate(`/spells/${encodeURIComponent(spell._key)}`)}
                            className={`flex-1 flex items-center gap-2 px-4 py-2.5 text-left hover:bg-white/5 ${locked ? 'opacity-50' : ''}`}
                          >
                            <span className="text-sm">{spell.name}</span>
                            <span className="ml-auto text-xs text-[var(--color-faint)] shrink-0">
                              {SCHOOL_NAMES[spell.school] ?? spell.school}
                            </span>
                          </button>
                          {!locked && (
                            <button
                              disabled={atCap}
                              onClick={() =>
                                isActive
                                  ? block.onRemove({ name: spell.name, source: spell.source })
                                  : block.onAdd({ name: spell.name, source: spell.source })
                              }
                              className={`px-3 py-2.5 text-xs font-semibold shrink-0 transition-colors ${
                                isActive
                                  ? 'text-amber-500 hover:text-amber-400'
                                  : atCap
                                    ? 'text-[var(--color-disabled)] cursor-not-allowed'
                                    : 'text-[var(--color-faint)] hover:text-amber-400'
                              }`}
                            >
                              {isActive ? (block.verb === 'Prepare' ? 'Prepared' : 'Learned') : block.verb}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}

function poolFilteredByLevel(pool: StoredSpell[], predicate: (level: number) => boolean): StoredSpell[] {
  return pool.filter(s => predicate(s.level));
}
