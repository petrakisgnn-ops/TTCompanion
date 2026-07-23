import { type ReactNode } from 'react';
import type { Character } from '../../domain/character/types';
import type { RefId } from '../../domain/reference/types';
import { allAbilityMods } from '../../domain/rules';
import { getClassData, getSubclassCaster } from '../../domain/rules/classData';
import {
  isPreparedCaster, isKnownCaster, maxPreparedSpells, maxKnownSpells, maxKnownCantrips,
} from '../../domain/rules/spellcasting';
import { ClassSpellBrowser, type SpellActionBlock } from './sheet/ClassSpellBrowser';

export interface SpellSelectionActions {
  addKnown: (s: RefId) => void;
  removeKnown: (s: RefId) => void;
  addPrepared: (s: RefId) => void;
  removePrepared: (s: RefId) => void;
}

interface SpellSelectionProps {
  character: Character;
  actions: SpellSelectionActions;
  /** Subclass expanded-list refs per class (Warlock patron spells, cleric domain spells, …). */
  expandedByClass?: Record<string, RefId[]>;
  /** Passed through to the browsers — false during creation so tapping a spell doesn't navigate. */
  linkToDetail?: boolean;
}

/**
 * One Learn/Prepare browser stack per casting class (labeled when multiclass) — caps use each
 * class's own level and casting ability, including caster subclasses (Eldritch Knight / Arcane
 * Trickster). Shared by the character sheet's Spells tab and the creation wizard's Spells step,
 * so both surface identical choices; the only difference is where `actions` write to.
 */
export function SpellSelection({ character, actions, expandedByClass = {}, linkToDetail = true }: SpellSelectionProps) {
  const mods = allAbilityMods(character.abilityScores);
  const sections: ReactNode[] = [];
  const multiclass = character.classes.length > 1;

  for (const cl of character.classes) {
    const cdata = getClassData(cl.classRef.name);
    if (!cdata) continue;
    const cname = cdata.name;
    const subclassName = cl.subclass?.name;
    const subCaster = getSubclassCaster(subclassName);
    const classLevel = cl.level;
    const abilityKey = (cdata.spellcastingAbility ?? subCaster?.ability) as keyof typeof mods | undefined;
    const classSpellMod = abilityKey ? mods[abilityKey] : 0;

    const cantripCap = maxKnownCantrips(cname, classLevel, subclassName);
    const cantrips: SpellActionBlock | undefined = cantripCap > 0
      ? { verb: 'Learn', cap: cantripCap, onAdd: actions.addKnown, onRemove: actions.removeKnown }
      : undefined;

    const classBrowsers: ReactNode[] = [];
    if (isPreparedCaster(cname)) {
      const prepare: SpellActionBlock = {
        verb: 'Prepare', cap: maxPreparedSpells(cname, classLevel, classSpellMod),
        onAdd: actions.addPrepared, onRemove: actions.removePrepared,
      };
      if (cname.toLowerCase() === 'wizard') {
        // Wizard prepares from their own spellbook, so they get a Learn step (spellbook growth)
        // sourced from the class list, then a Prepare step sourced from what they've learned.
        const learn: SpellActionBlock = {
          verb: 'Learn', cap: maxKnownSpells(cname, classLevel),
          onAdd: actions.addKnown, onRemove: actions.removeKnown,
        };
        classBrowsers.push(
          <ClassSpellBrowser key={`${cname}-learn`} character={character} className={cname} poolSource="class-list" leveled={learn} cantrips={cantrips} extraSpells={expandedByClass[cname]} linkToDetail={linkToDetail} />,
          <ClassSpellBrowser key={`${cname}-prepare`} character={character} className={cname} poolSource="known-spells" leveled={prepare} linkToDetail={linkToDetail} />,
        );
      } else {
        classBrowsers.push(
          <ClassSpellBrowser key={`${cname}-prepare`} character={character} className={cname} poolSource="class-list" leveled={prepare} cantrips={cantrips} extraSpells={expandedByClass[cname]} linkToDetail={linkToDetail} />,
        );
      }
    } else if (isKnownCaster(cname, subclassName)) {
      // Subclass casters (Eldritch Knight / Arcane Trickster) learn from the Wizard list.
      const pool = subCaster?.spellList ?? cname;
      const learn: SpellActionBlock = {
        verb: 'Learn', cap: maxKnownSpells(cname, classLevel, subclassName),
        onAdd: actions.addKnown, onRemove: actions.removeKnown,
      };
      classBrowsers.push(
        <ClassSpellBrowser key={`${cname}-learn`} character={character} className={pool} poolSource="class-list" leveled={learn} cantrips={cantrips} extraSpells={expandedByClass[cname]} linkToDetail={linkToDetail} />,
      );
    }

    if (classBrowsers.length > 0) {
      sections.push(
        <div key={cname} className="space-y-4">
          {multiclass && (
            <h3 className="text-sm font-bold text-amber-400">{cname}{subCaster ? ` (${subclassName})` : ''}</h3>
          )}
          {classBrowsers}
        </div>,
      );
    }
  }

  return <>{sections}</>;
}
