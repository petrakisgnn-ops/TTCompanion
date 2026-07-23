import type { AbilityScores, ResourceTrack } from '../character/types';
import type { RefId } from '../reference/types';
import type { Edition } from './edition';
import { getClassData, getSubclassCaster, type ClassData } from './classData';
import { computeSpellSlots, computeMulticlassSpellSlots, type EffectiveCasting } from './spellSlots';
import { computeClassResources, CLASS_RESOURCE_IDS } from './classResources';

const SPELL_SLOT_AND_PACT_IDS = [
  'slot-1', 'slot-2', 'slot-3', 'slot-4', 'slot-5', 'slot-6', 'slot-7', 'slot-8', 'slot-9', 'pact',
];

/** A class's effective slot progression, counting a caster subclass (Eldritch Knight etc.) on a non-casting class. */
function effectiveCasting(data: ClassData, subclass?: RefId): EffectiveCasting {
  if (data.spellcasting !== 'none') return data.spellcasting;
  return getSubclassCaster(subclass?.name)?.progression ?? 'none';
}

/**
 * Recomputes every resource this character's classes are entitled to — spell slots,
 * each Warlock's own separate Pact Magic, and each class's own non-spell resource
 * pool (Rage, Ki, ...) — and merges the result against the character's previous
 * resources the same top-up-preserving-spent-amount way a single class's recompute
 * already did.
 *
 * Slot routing: exactly one slot-contributing class → that class's OWN table
 * (half/third casters round more generously there than the multiclass pool does);
 * two or more → the shared PHB multiclass pool. Pact Magic always stays separate.
 */
export function recomputeAllResources(
  classes: { classRef: RefId; level: number; subclass?: RefId }[],
  previousResources: ResourceTrack[],
  abilityScores: AbilityScores,
  edition: Edition = '5e',
): ResourceTrack[] {
  const resolved: { cl: typeof classes[number]; data: ClassData; casting: EffectiveCasting }[] = [];
  for (const cl of classes) {
    const data = getClassData(cl.classRef.name);
    if (data) resolved.push({ cl, data, casting: effectiveCasting(data, cl.subclass) });
  }

  const slotContributors = resolved.filter(r => r.casting !== 'none' && r.casting !== 'pact');
  const managed: ResourceTrack[] =
    slotContributors.length === 1
      ? computeSpellSlots(slotContributors[0].casting, slotContributors[0].cl.level, edition)
      : computeMulticlassSpellSlots(
          slotContributors.map(({ cl, casting }) => ({ classRef: cl.classRef, level: cl.level, spellcasting: casting })),
        );

  const ownedIds = new Set(SPELL_SLOT_AND_PACT_IDS);
  for (const { cl, data } of resolved) {
    if (data.spellcasting === 'pact') {
      managed.push(...computeSpellSlots('pact', cl.level));
    }
    managed.push(...computeClassResources(data.name, cl.level, abilityScores, edition));
    for (const id of CLASS_RESOURCE_IDS[data.name] ?? []) ownedIds.add(id);
  }

  // Resources not owned by any of this character's classes (shouldn't normally happen, but
  // keeps this forward-compatible with any future non-class resource) are left untouched.
  const untouched = previousResources.filter(r => !ownedIds.has(r.id));

  const rebuilt = managed.map(newTrack => {
    const existing = previousResources.find(r => r.id === newTrack.id);
    if (!existing) return newTrack; // newly unlocked: full
    const gained = newTrack.max - existing.max;
    return {
      ...existing,
      max: newTrack.max,
      current: Math.min(newTrack.max, existing.current + Math.max(0, gained)),
    };
  });

  return [...untouched, ...rebuilt];
}
