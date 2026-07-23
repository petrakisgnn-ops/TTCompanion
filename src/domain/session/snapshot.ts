import type { Character } from '../character/types';
import { characterAc, totalLevel } from '../rules';
import type { PlayerSnapshot } from './types';

/** Project a full Character down to the small snapshot the DM sees in the lobby. Pure. */
export function snapshotOf(c: Character): PlayerSnapshot {
  return {
    name: c.name,
    race: c.subrace ? `${c.subrace.name} (${c.race.name})` : c.race.name,
    classes: c.classes.map(cl => `${cl.classRef.name} ${cl.level}`).join(' / '),
    level: totalLevel(c.classes),
    hp: { current: c.hp.current, max: c.hp.max },
    ac: characterAc(c),
  };
}
