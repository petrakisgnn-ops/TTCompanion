import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../../data/db';
import type { StoredSpell } from '../../../data/db';
import { refKey } from '../../../domain/reference/types';
import { useCharacterStore } from '../../../stores/characterStore';
import type { Character, KnownSpellRef } from '../../../domain/character/types';
import { maxSpellLevelForCharacter, LEVEL_LABEL as SPELL_LEVEL_LABEL } from '../../../domain/rules/spellcasting';
import { resolveGrantedSpells, type GrantSource, type GrantedSpellOption } from '../../../domain/rules/grantedSpells';
import { totalLevel } from '../../../domain/rules';
import { useSettingsStore, type Edition } from '../../../stores/settingsStore';
import { matchesEdition } from '../../../domain/rules/edition';

const CONC_INDICATOR = '(C)';

const SCHOOL_NAMES: Record<string, string> = {
  A: 'Abjuration', C: 'Conjuration', D: 'Divination', E: 'Enchantment',
  V: 'Evocation',  I: 'Illusion',   N: 'Necromancy', T: 'Transmutation',
};
const LEVEL_LABEL = ['Cantrip', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];

interface KnownSpellsTabProps { character: Character }

interface GrantedRow { option: GrantedSpellOption; spell: StoredSpell }
interface KnownEntry { ref: KnownSpellRef; spell: StoredSpell }

/**
 * Resolves a spell by exact "name|source" key first, falling back to a name-only
 * match. The same spell often exists as two records (e.g. a PHB printing and its
 * 2024 XPHB reprint) — when a raw grant omits its source, prefer whichever record
 * matches the active edition setting so it lines up with what manual search shows.
 */
async function resolveSpell(refName: string, refSource: string, edition: Edition): Promise<StoredSpell | undefined> {
  const exact = await db.spells.get(refKey({ name: refName, source: refSource }));
  if (exact) return exact;
  const candidates = await db.spells.where('name').equalsIgnoreCase(refName).toArray();
  if (candidates.length === 0) return undefined;
  return candidates.find(c => matchesEdition(c.source, c.reprintedAs, edition)) ?? candidates[0];
}

/** Same-named spells (e.g. a PHB/XPHB reprint pair) get labeled with their source so they don't look like duplicates. */
function collisionLabel(spell: StoredSpell, list: { name: string }[]): string | undefined {
  const count = list.filter(s => s.name.toLowerCase() === spell.name.toLowerCase()).length;
  return count > 1 ? spell.source : undefined;
}

export function KnownSpellsTab({ character }: KnownSpellsTabProps) {
  const navigate = useNavigate();
  const { edition } = useSettingsStore();
  const { addKnownSpell, removeKnownSpell, setConcentration } = useCharacterStore();
  const [resolved, setResolved] = useState<KnownEntry[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StoredSpell[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showGranted, setShowGranted] = useState(false);
  const [granted, setGranted] = useState<GrantedRow[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const maxLevel = maxSpellLevelForCharacter(character);

  // Resolve known spell refs → full spell objects. A spell can appear as both a
  // granted entry and a normal entry (different grantedBy), so we zip by index
  // rather than deduping by key — bulkGet preserves order/duplicates 1:1.
  useEffect(() => {
    if (character.knownSpells.length === 0) { setResolved([]); return; }
    const keys = character.knownSpells.map(refKey);
    db.spells.bulkGet(keys).then(spells => {
      const entries: KnownEntry[] = [];
      character.knownSpells.forEach((ref, i) => {
        const spell = spells[i];
        if (spell) entries.push({ ref, spell });
      });
      setResolved(entries);
    });
  }, [character.knownSpells]);

  // Race/subrace/background/feats can grant fixed cantrips or spells (e.g. Strixhaven
  // college backgrounds) independent of class spellcasting — surface them here so they
  // stay reachable even for non-casters or characters with no spell slots yet.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [racesRes, bgRes, featRes] = await Promise.all([
        fetch(`${import.meta.env.BASE_URL}data/races.json`),
        fetch(`${import.meta.env.BASE_URL}data/backgrounds.json`),
        fetch(`${import.meta.env.BASE_URL}data/feats.json`),
      ]);
      const racesJson: { race: GrantSource[]; subrace: GrantSource[] } = await racesRes.json();
      const bgJson: { background: GrantSource[] } = await bgRes.json();
      const featJson: { feat: GrantSource[] } = await featRes.json();

      const race = racesJson.race.find(
        r => r.name === character.race.name && r.source === character.race.source,
      );
      const subrace = character.subrace
        ? racesJson.subrace.find(
            s => s.name === character.subrace!.name && s.source === character.subrace!.source,
          )
        : null;
      const background = bgJson.background.find(
        b => b.name === character.background.name && b.source === character.background.source,
      );
      const feats = character.feats
        .map(f => featJson.feat.find(ft => ft.name === f.name && ft.source === f.source))
        .filter((f): f is GrantSource => f !== undefined);

      const options = resolveGrantedSpells({ race, subrace, background, feats }, totalLevel(character.classes));
      // Only a matching *granted* entry (same spell + same grantedBy) should hide an
      // option — a normal copy of the same spell doesn't, since they're distinct.
      const grantedKnownKeys = new Set(
        character.knownSpells.filter(s => s.grantedBy).map(s => `${refKey(s)}|${s.grantedBy}`),
      );

      const rows: GrantedRow[] = [];
      for (const option of options) {
        const spell = await resolveSpell(option.spellRef.name, option.spellRef.source, edition);
        if (!spell) continue;
        // Innate grants (race traits, feats) bypass class spell-slot gating; "expanded
        // spell list" grants (e.g. a Strixhaven background) still require the character
        // to actually be able to learn/prepare a spell of that level through their class.
        if (!option.innate && spell.level > 0 && spell.level > maxLevel) continue;
        const compositeKey = `${spell._key}|${option.grantedBy}`;
        if (!grantedKnownKeys.has(compositeKey)) rows.push({ option, spell });
      }
      if (!cancelled) setGranted(rows);
    })();

    return () => { cancelled = true; };
  }, [character.race, character.subrace, character.background, character.feats, character.knownSpells, character.classes, maxLevel, edition]);

  // Debounced search
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!query.trim()) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      const q = query.toLowerCase();
      const all = await db.spells.orderBy('name').toArray();
      // Only a "normal" (non-granted) copy already known should hide a spell from
      // search — a granted copy doesn't, since adding one here is a distinct entry.
      const normalKnownKeys = new Set(
        character.knownSpells.filter(s => !s.grantedBy).map(refKey),
      );
      setResults(
        all.filter(s =>
          s.name.toLowerCase().includes(q) &&
          !normalKnownKeys.has(s._key) &&
          // Hides the "other edition" printing of a reprinted spell so PHB/XPHB
          // pairs don't show up as two near-identical rows.
          matchesEdition(s.source, s.reprintedAs, edition) &&
          // cantrips (level 0) always available; levelled spells gated by class progression
          (s.level === 0 || (maxLevel > 0 && s.level <= maxLevel)),
        ).slice(0, 10),
      );
    }, 200);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query, character.knownSpells, edition, maxLevel]);

  const sorted = [...resolved].sort((a, b) => a.spell.level - b.spell.level || a.spell.name.localeCompare(b.spell.name));
  const sortedSpells = sorted.map(e => e.spell);

  // Group by level
  const byLevel = sorted.reduce<Record<number, KnownEntry[]>>((acc, e) => {
    (acc[e.spell.level] ??= []).push(e);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Granted from race/background/feats — bypasses the class spell-slot gate below */}
      {granted.length > 0 && (
        <div>
          <button
            onClick={() => setShowGranted(v => !v)}
            className="w-full flex items-center justify-between mb-1.5"
          >
            <h3 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide">
              Granted from Race/Background
              <span className="ml-1 font-normal text-[var(--color-disabled)] normal-case">({granted.length})</span>
            </h3>
            <span className="text-[var(--color-faint)] text-xs">{showGranted ? '▲' : '▼'}</span>
          </button>
          {showGranted && (
            <div className="bg-[var(--color-card)] rounded-xl overflow-hidden divide-y divide-[var(--color-border)]">
              {granted.map(({ option, spell }) => (
                <button
                  key={`${spell._key}|${option.grantedBy}`}
                  onClick={() => addKnownSpell(character.id, { name: spell.name, source: spell.source, grantedBy: option.grantedBy })}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-white/5"
                >
                  <div>
                    <p className="text-sm">{spell.name}</p>
                    <p className="text-xs text-[var(--color-faint)]">{option.grantedBy}</p>
                  </div>
                  <span className="text-xs text-amber-500 font-semibold ml-2 shrink-0">
                    {LEVEL_LABEL[spell.level]} · Add
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add spell control */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--color-faint)]">{sorted.length} spell{sorted.length !== 1 ? 's' : ''} known</span>
        <button
          onClick={() => { setShowSearch(v => !v); setQuery(''); setResults([]); }}
          className="text-xs text-amber-500 hover:text-amber-400 font-semibold"
        >
          {showSearch ? 'Done' : '+ Add Spell'}
        </button>
      </div>

      {showSearch && (
        <div>
          {maxLevel > 0 && (
            <p className="text-xs text-[var(--color-faint)] mb-1.5">
              Showing up to <span className="text-amber-500 font-semibold">{SPELL_LEVEL_LABEL[maxLevel]}</span>-level spells based on your class &amp; level
            </p>
          )}
          {maxLevel === 0 && (
            <p className="text-xs text-[var(--color-faint)] mb-1.5">Your class does not have spell slots yet (cantrips only)</p>
          )}
          <input
            type="search"
            autoFocus
            placeholder="Search spells…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-[var(--color-card)] rounded-xl px-4 py-2.5 text-sm outline-none outline-none focus:ring-1 focus:ring-[var(--color-gold-lt)] placeholder:text-[var(--color-faint)]"
          />
          {results.length > 0 && (
            <div className="mt-1 bg-[var(--color-card)] rounded-xl overflow-hidden divide-y divide-[var(--color-border)]">
              {results.map(spell => (
                <button
                  key={spell._key}
                  onClick={() => {
                    addKnownSpell(character.id, { name: spell.name, source: spell.source });
                    setQuery('');
                    setResults([]);
                  }}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-white/5"
                >
                  <span className="text-sm">
                    {spell.name}
                    {collisionLabel(spell, results) && (
                      <span className="text-[var(--color-faint)]"> ({collisionLabel(spell, results)})</span>
                    )}
                  </span>
                  <span className="text-xs text-[var(--color-faint)] ml-2 shrink-0">
                    {LEVEL_LABEL[spell.level]} · {SCHOOL_NAMES[spell.school] ?? spell.school}
                  </span>
                </button>
              ))}
            </div>
          )}
          {query.trim() && results.length === 0 && (
            <p className="text-xs text-[var(--color-disabled)] mt-2 text-center">No results</p>
          )}
        </div>
      )}

      {sorted.length === 0 && !showSearch && (
        <div className="text-center py-12 text-[var(--color-faint)] text-sm">
          No known spells yet.
        </div>
      )}

      {/* Grouped by level */}
      {Object.entries(byLevel)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([lvl, entries]) => (
          <div key={lvl}>
            <h3 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-1.5">
              {LEVEL_LABEL[Number(lvl)]}
              <span className="ml-1 font-normal text-[var(--color-disabled)]">({entries.length})</span>
            </h3>
            <div className="bg-[var(--color-card)] rounded-xl overflow-hidden divide-y divide-[var(--color-border)]">
              {entries.map(({ ref, spell }) => {
                const isConcentrating =
                  character.concentration?.name === spell.name &&
                  character.concentration?.source === spell.source;
                // concentration spells have components.c = true
                const isConc = (spell as unknown as Record<string, unknown>).meta === true ||
                  JSON.stringify((spell as unknown as Record<string, unknown>).components ?? {}).includes('"c":true');
                const label = ref.grantedBy ?? collisionLabel(spell, sortedSpells);

                return (
                  <div key={`${spell._key}|${ref.grantedBy ?? 'normal'}`} className="flex items-center group">
                    <button
                      onClick={() => navigate(`/spells/${encodeURIComponent(spell._key)}`)}
                      className="flex-1 flex items-center gap-2 px-4 py-3 text-left hover:bg-white/5"
                    >
                      <span className="text-sm font-medium">
                        {spell.name}
                        {label && (
                          <span className="text-[var(--color-faint)] font-normal"> ({label})</span>
                        )}
                      </span>
                      {isConcentrating && (
                        <span className="text-xs text-violet-400 font-semibold">{CONC_INDICATOR}</span>
                      )}
                      <span className="ml-auto text-xs text-[var(--color-faint)] shrink-0">
                        {SCHOOL_NAMES[spell.school] ?? spell.school}
                      </span>
                    </button>
                    {/* Concentrate button — only for non-cantrips */}
                    {spell.level > 0 && (
                      <button
                        onClick={() =>
                          setConcentration(
                            character.id,
                            isConcentrating ? null : { name: spell.name, source: spell.source },
                          )
                        }
                        className={`px-2 py-3 text-xs transition-colors shrink-0 ${
                          isConcentrating
                            ? 'text-violet-400 hover:text-violet-300'
                            : 'text-[var(--color-disabled)] hover:text-violet-400 opacity-0 group-hover:opacity-100'
                        }`}
                        aria-label={isConcentrating ? 'End concentration' : 'Concentrate'}
                        title={isConcentrating ? 'End concentration' : 'Concentrate on this spell'}
                      >
                        {isConc ? 'C' : '◎'}
                      </button>
                    )}
                    <button
                      onClick={() => removeKnownSpell(character.id, ref)}
                      className="px-3 py-3 text-[var(--color-disabled)] hover:text-red-400 transition-colors text-sm"
                      aria-label="Remove"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
    </div>
  );
}
