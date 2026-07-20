import { db } from '../db';
import type { SceneState } from '../../domain/dm/types';
import type { DmRepository } from './DmRepository';

const SCENE_KEY = 'dm-scene';

export const dexieDmRepository: DmRepository = {
  listNpcs: () => db.npcs.toArray(),
  saveNpc: (npc) => db.npcs.put(npc).then(() => undefined),
  removeNpc: (id) => db.npcs.delete(id),

  listGroups: () => db.encounterGroups.toArray(),
  saveGroup: (group) => db.encounterGroups.put(group).then(() => undefined),
  removeGroup: (id) => db.encounterGroups.delete(id),

  listNotes: () => db.sessionNotes.toArray(),
  saveNote: (note) => db.sessionNotes.put(note).then(() => undefined),
  removeNote: (id) => db.sessionNotes.delete(id),

  getScene: async () => {
    const row = await db.meta.get(SCENE_KEY);
    return row?.value as SceneState | undefined;
  },
  saveScene: (scene) => db.meta.put({ key: SCENE_KEY, value: scene }).then(() => undefined),
};
