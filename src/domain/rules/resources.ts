import type { AbilityScores, ResourceTrack } from '../character/types';
import type { RefId } from '../reference/types';
import { getClassData, type ClassData } from './classData';
import { computeSpellSlots, computeMulticlassSpellSlots } from './spellSlots';
import { computeClassResources, CLASS_RESOURCE_IDS } from './classResources';

const SPELL_SLOT_AND_PACT_IDS = [
  'slot-1', 'slot-2', 'slot-3', 'slot-4', 'slot-5', 'slot-6', 'slot-7', 'slot-8', 'slot-9', 'pact',
];

/**
 * Recomputes every resource this character's classes are entitled to — combined multiclass
 * spell slots, each Warlock's own separate Pact Magic, and each class's own non-spell resource
 * pool (Rage, Ki, ...) — and merges the result against the character's previous resources the
 * same top-up-preserving-spent-amount way a single class's recompute already did, generalized
 * across every class instead of just the one being leveled. A single-class character is just
 * the one-class case of this and computes identically to before this was generalized.
 */
export function recomputeAllResources(
  classes: { classRef: RefId; level: number; subclass?: RefId }[],
  previousResources: ResourceTrack[],
  abilityScores: AbilityScores,
): ResourceTrack[] {
  const resolved: { cl: typeof classes[number]; data: ClassData }[] = [];
  for (const cl of classes) {
    const data = getClassData(cl.classRef.name);
    if (data) resolved.push({ cl, data });
  }

  const managed: ResourceTrack[] = [
    ...computeMulticlassSpellSlots(resolved.map(({ cl, data }) => ({ classRef: cl.classRef, level: cl.level, spellcasting: data.spellcasting }))),
  ];

  const ownedIds = new Set(SPELL_SLOT_AND_PACT_IDS);
  for (const { cl, data } of resolved) {
    if (data.spellcasting === 'pact') {
      managed.push(...computeSpellSlots('pact', cl.level));
    }
    managed.push(...computeClassResources(data.name, cl.level, abilityScores));
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
