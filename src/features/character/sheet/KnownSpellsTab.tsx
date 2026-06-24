import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../../data/db';
import type { StoredSpell } from '../../../data/db';
import { refKey } from '../../../domain/reference/types';
import { useCharacterStore } from '../../../stores/characterStore';
import type { Character } from '../../../domain/character/types';
import { maxSpellLevelForCharacter, LEVEL_LABEL as SPELL_LEVEL_LABEL } from '../../../domain/rules/spellcasting';

const CONC_INDICATOR = '(C)';

const SCHOOL_NAMES: Record<string, string> = {
  A: 'Abjuration', C: 'Conjuration', D: 'Divination', E: 'Enchantment',
  V: 'Evocation',  I: 'Illusion',   N: 'Necromancy', T: 'Transmutation',
};
const LEVEL_LABEL = ['Cantrip', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];

interface KnownSpellsTabProps { character: Character }

export function KnownSpellsTab({ character }: KnownSpellsTabProps) {
  const navigate = useNavigate();
  const { addKnownSpell, removeKnownSpell, setConcentration } = useCharacterStore();
  const [resolved, setResolved] = useState<StoredSpell[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StoredSpell[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const maxLevel = maxSpellLevelForCharacter(character);

  // Resolve known spell refs → full spell objects
  useEffect(() => {
    if (character.knownSpells.length === 0) { setResolved([]); return; }
    const keys = character.knownSpells.map(refKey);
    db.spells.bulkGet(keys).then(spells =>
      setResolved(spells.filter((s): s is StoredSpell => s !== undefined)),
    );
  }, [character.knownSpells]);

  // Debounced search
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!query.trim()) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      const q = query.toLowerCase();
      const all = await db.spells.orderBy('name').toArray();
      const knownKeys = new Set(character.knownSpells.map(refKey));
      setResults(
        all.filter(s =>
          s.name.toLowerCase().includes(q) &&
          !knownKeys.has(s._key) &&
          // cantrips (level 0) always available; levelled spells gated by class progression
          (s.level === 0 || (maxLevel > 0 && s.level <= maxLevel)),
        ).slice(0, 10),
      );
    }, 200);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query, character.knownSpells]);

  const sorted = [...resolved].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

  // Group by level
  const byLevel = sorted.reduce<Record<number, StoredSpell[]>>((acc, s) => {
    (acc[s.level] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
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
                  <span className="text-sm">{spell.name}</span>
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
        .map(([lvl, spells]) => (
          <div key={lvl}>
            <h3 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-1.5">
              {LEVEL_LABEL[Number(lvl)]}
              <span className="ml-1 font-normal text-[var(--color-disabled)]">({spells.length})</span>
            </h3>
            <div className="bg-[var(--color-card)] rounded-xl overflow-hidden divide-y divide-[var(--color-border)]">
              {spells.map(spell => {
                const isConcentrating =
                  character.concentration?.name === spell.name &&
                  character.concentration?.source === spell.source;
                // concentration spells have components.c = true
                const isConc = (spell as unknown as Record<string, unknown>).meta === true ||
                  JSON.stringify((spell as unknown as Record<string, unknown>).components ?? {}).includes('"c":true');

                return (
                  <div key={spell._key} className="flex items-center group">
                    <button
                      onClick={() => navigate(`/spells/${encodeURIComponent(spell._key)}`)}
                      className="flex-1 flex items-center gap-2 px-4 py-3 text-left hover:bg-white/5"
                    >
                      <span className="text-sm font-medium">{spell.name}</span>
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
                      onClick={() => removeKnownSpell(character.id, { name: spell.name, source: spell.source })}
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
