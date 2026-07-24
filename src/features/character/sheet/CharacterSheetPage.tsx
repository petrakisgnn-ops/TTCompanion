import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCharacterStore } from '../../../stores/characterStore';
import { abilityMod, proficiencyBonus, spellSaveDc, passiveScore, totalLevel as calcTotalLevel } from '../../../domain/rules';
import { classSummary } from '../../../domain/character/format';
import { useCharacterAc } from '../useCharacterAc';
import { getClassData, getSubclassCaster } from '../../../domain/rules/classData';
import { HpTracker } from './HpTracker';
import { AbilityGrid } from './AbilityGrid';
import { SkillsSection } from './SkillsSection';
import { ResourceSection } from './ResourceSection';
import { KnownSpellsTab } from './KnownSpellsTab';
import { SpellSelection } from '../SpellSelection';
import { FeatsTab } from './FeatsTab';
import { FeaturesTab } from './FeaturesTab';
import { LanguagesSection } from './LanguagesSection';
import { CurrencySection } from './CurrencySection';
import { ConditionsSection } from './ConditionsSection';
import { InventoryTab } from './InventoryTab';
import { LevelUpSheet } from './LevelUpSheet';
import { AddClassSheet } from './AddClassSheet';
import { IdentitySection } from './IdentitySection';
import { CLASSES } from '../../../domain/rules/classData';
import { useGrantedSpellSync } from '../useGrantedSpellSync';
import { fetchGrantSources, fetchSubclassGrantSources } from '../grantSourcesCache';
import { resolveExpandedSpellRefs } from '../../../domain/rules/grantedSpells';
import { resolveWalkSpeed } from '../../../domain/rules/speed';
import type { RefId } from '../../../domain/reference/types';

type Tab = 'stats' | 'features' | 'resources' | 'spells' | 'feats' | 'inventory' | 'notes';

export function CharacterSheetPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    characters, loaded, load, mutate,
    addPreparedSpell, removePreparedSpell, addKnownSpell, removeKnownSpell, toggleExpertise,
  } = useCharacterStore();
  const [tab, setTab] = useState<Tab>('stats');
  const [editNotes, setEditNotes] = useState(false);
  const [notesVal, setNotesVal] = useState('');
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showAddClass, setShowAddClass] = useState(false);

  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  const character = characters.find(c => c.id === id);

  useGrantedSpellSync(character);
  const resolvedAc = useCharacterAc(character);

  // Subclass "expanded spell list" refs (a Warlock patron's spells, ...) per class —
  // unioned into that class's Learn/Prepare browser pool below.
  const [expandedByClass, setExpandedByClass] = useState<Record<string, RefId[]>>({});
  useEffect(() => {
    if (!character) return;
    let cancelled = false;
    (async () => {
      const sources = await fetchSubclassGrantSources(character.classes);
      const map: Record<string, RefId[]> = {};
      for (const cl of character.classes) {
        if (!cl.subclass) continue;
        const src = sources.find(s => s.name === cl.subclass!.name);
        if (!src) continue;
        const refs = resolveExpandedSpellRefs(src);
        if (refs.length > 0) map[cl.classRef.name] = refs;
      }
      if (!cancelled) setExpandedByClass(map);
    })();
    return () => { cancelled = true; };
  }, [character?.classes]);

  // Walk speed from race/subrace data (Dwarf 25, Wood Elf 35, ...) — was hardcoded 30.
  const [walkSpeed, setWalkSpeed] = useState(30);
  useEffect(() => {
    if (!character) return;
    let cancelled = false;
    (async () => {
      const { races, subraces } = await fetchGrantSources();
      const race = races.find(r => r.name === character.race.name && r.source === character.race.source);
      const subrace = character.subrace
        ? subraces.find(s => s.name === character.subrace!.name && s.source === character.subrace!.source)
        : undefined;
      if (!cancelled) setWalkSpeed(resolveWalkSpeed(race?.speed, subrace?.speed));
    })();
    return () => { cancelled = true; };
  }, [character?.race, character?.subrace]);

  useEffect(() => {
    if (character) setNotesVal(character.notes);
  }, [character?.id]);

  if (!loaded) {
    return <div className="p-4 text-[var(--color-muted)] text-sm animate-pulse">Loading…</div>;
  }

  if (!character) {
    return (
      <div className="p-4 text-[var(--color-muted)] text-sm">
        Character not found.{' '}
        <button onClick={() => navigate('/characters')} className="text-amber-400 underline">
          Back to list
        </button>
      </div>
    );
  }

  const level = calcTotalLevel(character.classes);
  const pb = proficiencyBonus(level);
  const mods = {
    str: abilityMod(character.abilityScores.str),
    dex: abilityMod(character.abilityScores.dex),
    con: abilityMod(character.abilityScores.con),
    int: abilityMod(character.abilityScores.int),
    wis: abilityMod(character.abilityScores.wis),
    cha: abilityMod(character.abilityScores.cha),
  };

  // Spell DC / attack come from the first class that actually casts — including via a
  // caster subclass (an Eldritch Knight Fighter casts with INT even though Fighter
  // itself doesn't cast).
  const firstCaster = character.classes
    .map(cl => {
      const data = getClassData(cl.classRef.name);
      const ability = data?.spellcastingAbility ?? getSubclassCaster(cl.subclass?.name)?.ability;
      return ability ? { cl, ability } : null;
    })
    .find(x => x !== null) ?? null;
  const spellMod = firstCaster ? mods[firstCaster.ability as keyof typeof mods] : null;
  const saveDc = spellMod !== null ? spellSaveDc(spellMod, pb) : null;
  const attackBonus = spellMod !== null ? spellMod + pb : null;

  const classLabel = classSummary(character.classes);

  // The Learn/Prepare browser stack — shared with the creation wizard's Spells step so both
  // surface identical per-class choices; here the actions write through the character store.
  const spellBrowsers = (
    <SpellSelection
      character={character}
      expandedByClass={expandedByClass}
      actions={{
        addKnown: s => addKnownSpell(character.id, s),
        removeKnown: s => removeKnownSpell(character.id, s),
        addPrepared: s => addPreparedSpell(character.id, s),
        removePrepared: s => removePreparedSpell(character.id, s),
      }}
    />
  );

  const handleSaveNotes = () => {
    mutate(character.id, c => ({ ...c, notes: notesVal }));
    setEditNotes(false);
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'stats',     label: 'Stats'      },
    { key: 'features',  label: 'Features'   },
    { key: 'resources', label: 'Resources'  },
    { key: 'spells',    label: 'Spells'     },
    { key: 'feats',     label: 'Feats'      },
    { key: 'inventory', label: 'Inventory'  },
    { key: 'notes',     label: 'Details'    },
  ];

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--color-app)] border-b border-[var(--color-border)]">
        <div className="px-4 pt-4 pb-2">
          <button
            onClick={() => navigate('/characters')}
            className="text-[var(--color-muted)] text-sm mb-1 hover:text-[var(--color-text)]"
          >
            ← Characters
          </button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold leading-tight">{character.name}</h1>
              <p className="text-sm text-[var(--color-muted)]">
                {character.subrace ? `${character.subrace.name} (${character.race.name})` : character.race.name}
                {' · '}{classLabel} · Level {level}
              </p>
            </div>
            {level < 20 && (
              <div className="shrink-0 flex flex-col gap-1.5 items-end">
                <button
                  onClick={() => setShowLevelUp(true)}
                  className="text-xs font-semibold bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30 px-3 py-1.5 rounded-xl transition-colors"
                >
                  Level Up
                </button>
                {character.classes.length < CLASSES.length && (
                  <button
                    onClick={() => setShowAddClass(true)}
                    className="text-xs font-semibold bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 border border-violet-500/30 px-3 py-1.5 rounded-xl transition-colors"
                  >
                    + Multiclass
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        {/* Tabs — horizontally scrollable to fit all 5 on narrow screens */}
        <div className="flex overflow-x-auto border-t border-[var(--color-border)] scrollbar-none">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                tab === t.key
                  ? 'text-amber-400 border-b-2 border-amber-500'
                  : 'text-[var(--color-faint)] hover:text-[var(--color-text-2)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Concentration banner */}
      {character.concentration && (
        <div className="mx-4 mt-3 flex items-center justify-between bg-violet-900/40 border border-violet-500/30 rounded-xl px-4 py-2.5">
          <div>
            <p className="text-xs text-violet-400 font-semibold uppercase tracking-wide">Concentrating</p>
            <p className="text-sm font-medium">{character.concentration.name}</p>
          </div>
          <button
            onClick={() => mutate(character.id, c => ({ ...c, concentration: null }))}
            className="text-violet-400 hover:text-red-400 transition-colors text-sm ml-3"
            aria-label="End concentration"
          >
            End
          </button>
        </div>
      )}

      <div className="p-4 space-y-4 pb-8">
        {/* ── Stats tab ── */}
        {tab === 'stats' && (
          <>
            {/* Combat quick-stats */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'AC', value: String(resolvedAc) },
                { label: 'Proficiency', value: `+${pb}` },
                { label: 'Initiative', value: `${mods.dex >= 0 ? '+' : ''}${mods.dex}` },
                { label: 'Speed', value: `${walkSpeed} ft` },
                ...(saveDc !== null ? [{ label: 'Spell DC', value: String(saveDc) }] : []),
                ...(attackBonus !== null ? [{ label: 'Spell Atk', value: `+${attackBonus}` }] : []),
              ].map(stat => (
                <div key={stat.label} className="bg-[var(--color-card)] rounded-xl p-2.5 text-center">
                  <div className="text-lg font-bold">{stat.value}</div>
                  <div className="text-xs text-[var(--color-faint)] mt-0.5 leading-tight">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* HP Tracker */}
            <HpTracker character={character} />

            {/* Conditions */}
            <div className="bg-[var(--color-card)] rounded-xl px-4 py-3 space-y-2">
              <h2 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide">Conditions</h2>
              <ConditionsSection character={character} />
            </div>

            {/* Ability Scores */}
            <div>
              <h2 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-2">Ability Scores</h2>
              <AbilityGrid scores={character.abilityScores} />
            </div>

            {/* Passive Perception — doubles the bonus when Perception has Expertise */}
            <div className="bg-[var(--color-card)] rounded-xl px-4 py-2.5 flex items-center justify-between">
              <span className="text-sm text-[var(--color-text-2)]">Passive Perception</span>
              <span className="font-bold">
                {passiveScore(
                  mods.wis, pb,
                  character.proficiencies.skills.includes('Perception'),
                  character.proficiencies.expertise.includes('Perception'),
                )}
              </span>
            </div>

            {/* Skills & Saves */}
            <SkillsSection
              scores={character.abilityScores}
              profSkills={character.proficiencies.skills}
              profSaves={character.proficiencies.saves}
              totalLevel={level}
              expertise={character.proficiencies.expertise}
              onToggleExpertise={skill => toggleExpertise(character.id, skill)}
            />

            {/* Languages */}
            <div className="bg-[var(--color-card)] rounded-xl px-4 py-3 space-y-2">
              <h2 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide">Languages</h2>
              <LanguagesSection character={character} />
            </div>
          </>
        )}

        {/* ── Features tab ── */}
        {tab === 'features' && <FeaturesTab character={character} />}

        {/* ── Resources tab ── */}
        {tab === 'resources' && (
          <>
            <ResourceSection character={character} />
            {character.resources.length === 0 && (
              <p className="text-center text-[var(--color-faint)] text-sm py-6">
                No spell slots or class resources.
              </p>
            )}
            <CurrencySection character={character} />
          </>
        )}

        {/* ── Spells tab ── */}
        {tab === 'spells' && (
          <div className="space-y-4">
            {spellBrowsers}
            <KnownSpellsTab character={character} />
          </div>
        )}

        {/* ── Feats tab ── */}
        {tab === 'feats' && <FeatsTab character={character} />}

        {/* ── Inventory tab ── */}
        {tab === 'inventory' && <InventoryTab character={character} />}

        {/* ── Details tab ── */}
        {tab === 'notes' && (
          <div className="space-y-3">
            <IdentitySection character={character} />
            {editNotes ? (
              <>
                <textarea
                  value={notesVal}
                  onChange={e => setNotesVal(e.target.value)}
                  rows={12}
                  autoFocus
                  className="w-full bg-[var(--color-card)] rounded-xl p-3 text-sm outline-none resize-none outline-none focus:ring-1 focus:ring-[var(--color-gold-lt)] placeholder:text-[var(--color-disabled)]"
                  placeholder="Character notes, backstory, equipment…"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveNotes}
                    className="flex-1 py-2.5 bg-amber-500 text-slate-900 font-semibold rounded-xl text-sm"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { setNotesVal(character.notes); setEditNotes(false); }}
                    className="px-4 py-2.5 bg-[var(--color-card)] text-[var(--color-text-2)] rounded-xl text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div
                  className="min-h-[8rem] bg-[var(--color-card)] rounded-xl p-3 text-sm whitespace-pre-wrap text-[var(--color-text-2)] cursor-pointer"
                  onClick={() => setEditNotes(true)}
                >
                  {character.notes || <span className="text-[var(--color-disabled)]">Tap to add notes…</span>}
                </div>
                <button
                  onClick={() => setEditNotes(true)}
                  className="text-xs text-[var(--color-faint)] underline"
                >
                  Edit notes
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {showLevelUp && (
        <LevelUpSheet character={character} onClose={() => setShowLevelUp(false)} />
      )}
      {showAddClass && (
        <AddClassSheet character={character} onClose={() => setShowAddClass(false)} />
      )}
    </div>
  );
}
