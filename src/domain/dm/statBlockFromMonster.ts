import type { Monster, MonsterBlock } from '../reference/types';
import { acStr, crStr, speedStr } from '../reference/types';
import type { Entry } from '../reference/types';
import type { NpcStatBlock } from './types';

const SKILL_ABBR: Record<string, string> = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution',
  int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma',
};

const blocksToEntries = (blocks?: MonsterBlock[]): Entry[] | undefined =>
  blocks?.map((b): Entry => ({ type: 'entries', name: b.name, entries: b.entries }));

/** Snapshots a compendium monster into an NPC's own editable stat block (spec 3.1 A). */
export function npcStatBlockFromMonster(monster: Monster): NpcStatBlock {
  const acNum = Number(acStr(monster.ac).match(/\d+/)?.[0] ?? 10);
  const hp = monster.hp?.average ?? 10;

  return {
    ac: acNum,
    hp: { current: hp, max: hp },
    speed: speedStr(monster.speed),
    abilityScores: {
      str: monster.str, dex: monster.dex, con: monster.con,
      int: monster.int, wis: monster.wis, cha: monster.cha,
    },
    saves: monster.save ? Object.keys(monster.save).map(k => SKILL_ABBR[k] ?? k) : undefined,
    skills: monster.skill ? Object.keys(monster.skill) : undefined,
    senses: monster.senses?.join(', '),
    languages: monster.languages?.join(', '),
    cr: crStr(monster.cr),
    traits: blocksToEntries(monster.trait),
    actions: blocksToEntries(monster.action),
    reactions: blocksToEntries(monster.reaction),
  };
}
