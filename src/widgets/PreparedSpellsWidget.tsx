import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../data/db';
import type { StoredSpell } from '../data/db';
import { refKey } from '../domain/reference/types';
import { useCharacterStore } from '../stores/characterStore';
import { registerWidget } from './registry';
import type { WidgetProps } from './registry';

const SCHOOL_SHORT: Record<string, string> = {
  A: 'Abj', C: 'Con', D: 'Div', E: 'Enc',
  V: 'Evo', I: 'Ill', N: 'Nec', T: 'Tra',
};

const LEVEL_LABEL = ['Cantrip', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];

function PreparedSpellsWidget({ character }: WidgetProps) {
  const navigate = useNavigate();
  const { addPreparedSpell, removePreparedSpell } = useCharacterStore();
  const [resolvedSpells, setResolvedSpells] = useState<StoredSpell[]>([]);
  const [knownSpells, setKnownSpells] = useState<StoredSpell[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Resolve prepared spell RefIds → full spell data
  useEffect(() => {
    if (character.preparedSpells.length === 0) { setResolvedSpells([]); return; }
    const keys = character.preparedSpells.map(refKey);
    db.spells.bulkGet(keys).then(spells =>
      setResolvedSpells(spells.filter((s): s is StoredSpell => s !== undefined)),
    );
  }, [character.preparedSpells]);

  // Resolve known spell RefIds → available pool for preparation. Granted spells
  // (e.g. an innate feat cantrip) aren't "prepared" in the traditional sense — they're
  // castable on their own regardless of prep — so only normally-learned ones apply here.
  useEffect(() => {
    const normalRefs = character.knownSpells.filter(s => !s.grantedBy);
    if (normalRefs.length === 0) { setKnownSpells([]); return; }
    const keys = normalRefs.map(refKey);
    db.spells.bulkGet(keys).then(spells =>
      setKnownSpells(spells.filter((s): s is StoredSpell => s !== undefined)),
    );
  }, [character.knownSpells]);

  // Filter known spells: not yet prepared, matching query
  const preparedKeys = new Set(character.preparedSpells.map(refKey));
  const searchResults = knownSpells.filter(s =>
    !preparedKeys.has(s._key) &&
    (searchQuery.trim() === '' || s.name.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  // Sort prepared spells: cantrips first, then ascending level
  const sorted = [...resolvedSpells].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

  return (
    <div className="p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
          Prepared Spells
          {sorted.length > 0 && (
            <span className="ml-1.5 text-slate-600 normal-case font-normal">
              ({sorted.length})
            </span>
          )}
        </p>
        {knownSpells.length > 0 && (
          <button
            onClick={() => { setShowSearch(v => !v); setSearchQuery(''); }}
            className="text-xs text-amber-500 hover:text-amber-400 font-semibold"
          >
            {showSearch ? 'Done' : '+ Add'}
          </button>
        )}
      </div>

      {/* Inline spell search */}
      {showSearch && (
        <div>
          <input
            type="search"
            autoFocus
            placeholder="Search spells…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-700 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-slate-500"
          />
          {searchResults.length > 0 && (
            <div className="mt-1 bg-slate-700 rounded-xl overflow-hidden divide-y divide-white/5">
              {searchResults.map(spell => (
                <button
                  key={spell._key}
                  onClick={() => {
                    addPreparedSpell(character.id, { name: spell.name, source: spell.source });
                    setSearchQuery('');
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-white/5"
                >
                  <span className="text-sm">{spell.name}</span>
                  <span className="text-xs text-slate-500 ml-2 shrink-0">
                    {LEVEL_LABEL[spell.level]} · {SCHOOL_SHORT[spell.school] ?? spell.school}
                  </span>
                </button>
              ))}
            </div>
          )}
          {searchQuery.trim() && searchResults.length === 0 && (
            <p className="text-xs text-slate-600 mt-1 text-center">No spells found</p>
          )}
        </div>
      )}

      {/* Prepared list */}
      {sorted.length === 0 && !showSearch && (
        <p className="text-xs text-slate-600 py-2 text-center">
          {knownSpells.length === 0
            ? 'Add spells to your Known Spells list first.'
            : 'No spells prepared. Tap + Add to start.'}
        </p>
      )}

      <div className="space-y-0.5">
        {sorted.map(spell => (
          <div key={spell._key} className="flex items-center gap-2 group">
            {/* Level badge */}
            <span className="text-xs font-bold text-amber-500 w-5 text-center shrink-0">
              {spell.level === 0 ? 'C' : spell.level}
            </span>

            {/* Tap name → detail page */}
            <button
              onClick={() => navigate(`/spells/${encodeURIComponent(spell._key)}`)}
              className="flex-1 text-left text-sm text-slate-200 hover:text-amber-300 transition-colors min-w-0 truncate"
            >
              {spell.name}
            </button>

            {/* School */}
            <span className="text-xs text-slate-600 shrink-0">
              {SCHOOL_SHORT[spell.school] ?? spell.school}
            </span>

            {/* Remove */}
            <button
              onClick={() => removePreparedSpell(character.id, { name: spell.name, source: spell.source })}
              className="text-slate-700 hover:text-red-400 transition-colors text-xs shrink-0 opacity-0 group-hover:opacity-100"
              aria-label="Remove"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

registerWidget({
  typeId: 'prepared-spells',
  label: 'Prepared Spells',
  icon: 'menu_book',
  defaultConfig: {},
  defaultSpan: 2,
  component: PreparedSpellsWidget,
});
