import { useEffect } from 'react';
import { db } from '../../data/db';
import { refKey } from '../../domain/reference/types';
import type { Character } from '../../domain/character/types';
import { resolveGrantedSpells, type GrantedSpellOption } from '../../domain/rules/grantedSpells';
import { mysticArcanumOptions } from '../../domain/rules/mysticArcanum';
import { computeInnateResourceTracks, type ResolvedKnownSpell } from '../../domain/rules/innateResources';
import { totalLevel } from '../../domain/rules';
import { useCharacterStore } from '../../stores/characterStore';
import { fetchGrantSources, fetchSubclassGrantSources } from './grantSourcesCache';

/**
 * Keeps a character's auto-granted innate spells and their per-rest resource trackers
 * in sync with their race/subrace/background/feats/classes — mirrors how class
 * resources (Rage, Ki, ...) already auto-populate via `recomputeAllResources` in
 * `domain/rules/resources.ts`, just for race/feat-granted spells instead of class
 * features. Only *fixed, truly-innate* grants are auto-added (see the comment above the
 * auto-add loop for why "expanded spell list" grants are excluded); choice-driven
 * grants (Magic Initiate, Mystic Arcanum, ...) still need the player to pick via
 * `GrantedSpellChoicePicker` before their resource track can appear (see
 * `computeInnateResourceTracks`).
 */
export function useGrantedSpellSync(character: Character | undefined): void {
  const { addKnownSpell, mutate } = useCharacterStore();

  useEffect(() => {
    if (!character) return;
    let cancelled = false;

    (async () => {
      const { races, subraces, backgrounds, feats } = await fetchGrantSources();
      if (cancelled) return;

      const race = races.find(r => r.name === character.race.name && r.source === character.race.source);
      const subrace = character.subrace
        ? subraces.find(s => s.name === character.subrace!.name && s.source === character.subrace!.source)
        : null;
      const background = backgrounds.find(b => b.name === character.background.name && b.source === character.background.source);
      const featSources = character.feats
        .map(f => feats.find(ft => ft.name === f.name && ft.source === f.source))
        .filter((f): f is NonNullable<typeof f> => f !== undefined);

      const subclasses = await fetchSubclassGrantSources(character.classes);
      if (cancelled) return;

      const options: GrantedSpellOption[] = resolveGrantedSpells(
        { race, subrace, background, feats: featSources, subclasses },
        totalLevel(character.classes),
      );
      const warlock = character.classes.find(cl => cl.classRef.name === 'Warlock');
      if (warlock) options.push(...mysticArcanumOptions(warlock.level));

      // Auto-add fixed grants the character doesn't already have — but only truly
      // *innate* ones (race traits, feat abilities that bypass class spellcasting
      // entirely). "Expanded spell list" grants (e.g. a Strixhaven background) are not
      // free — they just add spells to what the character is *allowed* to learn/prepare
      // through their own class, still gated by their current max spell level, so they
      // must stay manual (the tap-to-add fallback in KnownSpellsTab already respects
      // that gate; auto-adding here would bypass it and hand a level-1 character a
      // spell they can't cast for years). Also skip `ambiguousVariant` grants (Strixhaven
      // Initiate's "Lorehold 1/2/3" cantrip pairs) — auto-adding every fixed spell across
      // those would grant all 3 cantrips instead of the intended 2; the player must pick.
      for (const option of options) {
        if (option.kind !== 'fixed' || !option.innate || option.ambiguousVariant) continue;
        const already = character.knownSpells.some(
          s => s.name === option.spellRef.name && s.source === option.spellRef.source && s.grantedBy === option.grantedBy,
        );
        if (!already) await addKnownSpell(character.id, { ...option.spellRef, grantedBy: option.grantedBy });
      }
      if (cancelled) return;

      // Reconcile innate resource trackers (ids prefixed "innate-") against the desired set.
      // Raw grant text is often lowercase ("faerie fire") — resolve each involved spell's
      // canonical display name (and level, needed to tell apart two different choices
      // sharing one grantedBy — see computeInnateResourceTracks) from the same lookup.
      const refsToResolve = [
        ...options.filter((o): o is GrantedSpellOption & { kind: 'fixed' } => o.kind === 'fixed').map(o => o.spellRef),
        ...character.knownSpells.filter(s => s.grantedBy),
      ];
      const resolvedSpells = await db.spells.bulkGet(refsToResolve.map(refKey));
      const canonicalNames = new Map<string, string>();
      const levels = new Map<string, number>();
      refsToResolve.forEach((ref, i) => {
        const spell = resolvedSpells[i];
        if (spell) { canonicalNames.set(refKey(ref), spell.name); levels.set(refKey(ref), spell.level); }
      });
      const canonicalOptions: GrantedSpellOption[] = options.map(o =>
        o.kind === 'fixed'
          ? { ...o, spellRef: { ...o.spellRef, name: canonicalNames.get(refKey(o.spellRef)) ?? o.spellRef.name } }
          : o,
      );
      const canonicalKnownSpells: ResolvedKnownSpell[] = character.knownSpells.map(s => ({
        ...s, name: canonicalNames.get(refKey(s)) ?? s.name, level: levels.get(refKey(s)) ?? -1,
      }));

      const desired = computeInnateResourceTracks(canonicalOptions, canonicalKnownSpells);
      const current = character.resources.filter(r => r.id.startsWith('innate-'));
      const inSync = desired.length === current.length && desired.every(d => {
        const existing = current.find(r => r.id === d.id);
        return existing && existing.max === d.max && existing.resetOn === d.resetOn;
      });
      if (inSync) return;

      mutate(character.id, c => {
        const untouched = c.resources.filter(r => !r.id.startsWith('innate-'));
        const rebuilt = desired.map(newTrack => {
          const existing = c.resources.find(r => r.id === newTrack.id);
          if (!existing) return newTrack; // newly unlocked: full
          const gained = newTrack.max - existing.max;
          return { ...existing, max: newTrack.max, current: Math.min(newTrack.max, existing.current + Math.max(0, gained)) };
        });
        return { ...c, resources: [...untouched, ...rebuilt] };
      });
    })();

    return () => { cancelled = true; };
  }, [
    character?.id, character?.race, character?.subrace, character?.background,
    character?.feats, character?.classes, character?.knownSpells, character?.resources,
    addKnownSpell, mutate,
  ]);
}
