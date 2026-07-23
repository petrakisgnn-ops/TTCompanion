import { useEffect, useMemo, useState } from 'react';
import type { WizardData } from './CharacterWizard';
import { resolveFinalScores } from './CharacterWizard';
import type { Character } from '../../../domain/character/types';
import type { RefId } from '../../../domain/reference/types';
import { subclassLevel } from '../../../domain/rules/classData';
import { resolveExpandedSpellRefs } from '../../../domain/rules/grantedSpells';
import { SpellSelection } from '../SpellSelection';
import { fetchSubclassGrantSources } from '../grantSourcesCache';
import { useSettingsStore } from '../../../stores/settingsStore';

interface StepSpellsProps {
  data: WizardData;
  patch: (p: Partial<WizardData>) => void;
}

const sameRef = (a: RefId, b: RefId) => a.name === b.name && a.source === b.source;

export function StepSpells({ data, patch }: StepSpellsProps) {
  const edition = useSettingsStore(s => s.edition);
  // A read-only Character built from the draft, so the shared SpellSelection/ClassSpellBrowser
  // can drive caps, pools and active state exactly as they do on the sheet.
  const character = useMemo<Character | null>(() => {
    if (!data.classRef) return null;
    const subclass = data.subclassRef && data.level >= subclassLevel(data.classRef.name, edition)
      ? data.subclassRef
      : undefined;
    return {
      id: 'draft',
      name: data.name,
      edition,
      classes: [{ classRef: data.classRef, level: data.level, subclass }],
      race: data.raceRef ?? { name: '', source: '' },
      subrace: data.subraceRef,
      background: data.backgroundRef ?? { name: '', source: '' },
      alignment: null,
      personality: { trait: '', ideal: '', bond: '', flaw: '' },
      appearance: { age: '', height: '', weight: '', eyes: '', skin: '', hair: '' },
      abilityScores: resolveFinalScores(data),
      hp: { max: 0, current: 0, temp: 0 },
      hitDiceSpent: 0,
      deathSaves: { successes: 0, failures: 0 },
      concentration: null,
      conditions: [],
      proficiencies: { skills: [], saves: [], weapons: [], armor: [], tools: [], languages: [], expertise: [] },
      knownSpells: data.knownSpells,
      preparedSpells: data.preparedSpells,
      optionalFeatures: [],
      masteredWeapons: [],
      inventory: [],
      feats: [],
      resources: [],
      currency: { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 },
      dashboard: { widgets: [] },
      notes: '',
    };
  }, [data, edition]);

  // Subclass expanded spell lists (Warlock patron, cleric domain, …), unioned into the pool.
  const [expandedByClass, setExpandedByClass] = useState<Record<string, RefId[]>>({});
  useEffect(() => {
    if (!data.classRef) { setExpandedByClass({}); return; }
    const subclass = data.subclassRef && data.level >= subclassLevel(data.classRef.name, edition)
      ? data.subclassRef
      : undefined;
    if (!subclass) { setExpandedByClass({}); return; }
    let cancelled = false;
    (async () => {
      const sources = await fetchSubclassGrantSources([{ classRef: data.classRef!, level: data.level, subclass }]);
      const src = sources.find(s => s.name === subclass.name);
      const refs = src ? resolveExpandedSpellRefs(src) : [];
      if (!cancelled) setExpandedByClass(refs.length ? { [data.classRef!.name]: refs } : {});
    })();
    return () => { cancelled = true; };
  }, [data.classRef?.name, data.subclassRef?.name, data.subclassRef?.source, data.level, edition]);

  if (!character) return null;

  const actions = {
    addKnown: (s: RefId) => patch({ knownSpells: [...data.knownSpells, s] }),
    removeKnown: (s: RefId) => patch({ knownSpells: data.knownSpells.filter(k => !sameRef(k, s)) }),
    addPrepared: (s: RefId) => patch({ preparedSpells: [...data.preparedSpells, s] }),
    removePrepared: (s: RefId) => patch({ preparedSpells: data.preparedSpells.filter(k => !sameRef(k, s)) }),
  };

  return (
    <div className="px-4 pb-6 pt-3 space-y-5">
      <div>
        <h2 className="text-base font-semibold">Choose Spells</h2>
        <p className="text-xs text-[var(--color-faint)] mt-1">
          Pick the cantrips and spells your {data.classRef?.name} knows at level {data.level}. You can
          change these later from the character sheet.
        </p>
      </div>
      <SpellSelection character={character} actions={actions} expandedByClass={expandedByClass} linkToDetail={false} />
    </div>
  );
}
