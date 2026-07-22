import type { KnownSpellRef, ResourceTrack } from '../character/types';
import { refKey } from '../reference/types';
import type { GrantedSpellOption } from './grantedSpells';

/** A known-spell entry with its resolved spell level attached — see `computeInnateResourceTracks`. */
export type ResolvedKnownSpell = KnownSpellRef & { level: number };

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function makeTrack(grantedBy: string, spellName: string, max: number, resetOn: 'longRest' | 'shortRest'): ResourceTrack {
  return {
    id: `innate-${slug(grantedBy)}-${slug(spellName)}`,
    label: `${spellName} (${grantedBy})`,
    current: max,
    max,
    resetOn,
  };
}

/**
 * Computes the "full" (unspent) resource tracks for every innate spell grant that has a
 * per-rest use limit. Fixed grants always materialize; choice grants (Magic Initiate,
 * Mystic Arcanum, ...) only materialize once the player has actually picked a spell for
 * them — matched by a `knownSpells` entry whose `grantedBy` equals the option's AND
 * whose spell level falls within the option's own query (see the level-matching note
 * below). The caller is responsible for merging this against existing resources to
 * preserve spent amounts (see `resources.ts`'s `recomputeAllResources` for the same
 * split), and for resolving each known spell's level first (`knownSpells` here isn't
 * the raw `Character.knownSpells` — see `ResolvedKnownSpell`).
 */
export function computeInnateResourceTracks(
  options: GrantedSpellOption[],
  knownSpells: ResolvedKnownSpell[],
): ResourceTrack[] {
  // A single grant item can bundle more than one sub-grant under the same grantedBy —
  // a fixed spell alongside a choice slot (Fey Touched: "misty step" fixed + 1 choice),
  // or two *different* choices (Magic Initiate: 2 cantrips + 1 leveled spell, both
  // "Magic Initiate (Bard Spells)"). A known-spell entry must only count toward the one
  // sub-grant it actually fulfills: fixed spells are excluded from choice-matching by
  // key, and choices are matched by the known spell's level falling in the choice's own
  // query levels (Magic Initiate's cantrip and leveled choices use disjoint levels, so
  // this correctly tells them apart; two choices under one grantedBy with *overlapping*
  // level ranges would still conflate — a disclosed simplification, no such case exists
  // in the sampled data).
  const fixedKeysByGrantedBy = new Map<string, Set<string>>();
  for (const o of options) {
    if (o.kind !== 'fixed') continue;
    const set = fixedKeysByGrantedBy.get(o.grantedBy) ?? new Set<string>();
    set.add(refKey(o.spellRef));
    fixedKeysByGrantedBy.set(o.grantedBy, set);
  }

  const tracks: ResourceTrack[] = [];
  for (const option of options) {
    if (!option.dailyUses || !option.resetOn) continue;
    if (option.kind === 'fixed') {
      tracks.push(makeTrack(option.grantedBy, option.spellRef.name, option.dailyUses, option.resetOn));
    } else {
      const excluded = fixedKeysByGrantedBy.get(option.grantedBy) ?? new Set<string>();
      const chosen = knownSpells.filter(s =>
        s.grantedBy === option.grantedBy &&
        !excluded.has(refKey(s)) &&
        option.query.levels.includes(s.level),
      );
      for (const c of chosen) {
        tracks.push(makeTrack(option.grantedBy, c.name, option.dailyUses, option.resetOn));
      }
    }
  }
  return tracks;
}
