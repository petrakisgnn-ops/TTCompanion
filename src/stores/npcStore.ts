import { create } from 'zustand';
import { dexieDmRepository } from '../data/repositories/DexieDmRepository';
import type { NpcDefinition, EncounterGroup } from '../domain/dm/types';
import { UNASSIGNED_GROUP_ID } from '../domain/dm/types';

type GroupDeleteMode = 'moveToUnassigned' | 'deleteContents';

interface NpcStore {
  npcs: NpcDefinition[];
  groups: EncounterGroup[];
  loaded: boolean;

  load: () => Promise<void>;

  createGroup: (name: string) => Promise<EncounterGroup>;
  renameGroup: (id: string, name: string) => Promise<void>;
  deleteGroup: (id: string, mode: GroupDeleteMode) => Promise<void>;

  createNpc: (npc: NpcDefinition) => Promise<void>;
  updateNpc: (id: string, fn: (n: NpcDefinition) => NpcDefinition) => Promise<void>;
  deleteNpc: (id: string) => Promise<void>;
  moveNpc: (id: string, groupId: string) => Promise<void>;
}

export const useNpcStore = create<NpcStore>()((set, get) => ({
  npcs: [],
  groups: [],
  loaded: false,

  load: async () => {
    const [npcs, groups] = await Promise.all([
      dexieDmRepository.listNpcs(),
      dexieDmRepository.listGroups(),
    ]);
    set({ npcs, groups, loaded: true });
  },

  createGroup: async (name) => {
    const group: EncounterGroup = { id: crypto.randomUUID(), name };
    await dexieDmRepository.saveGroup(group);
    set(s => ({ groups: [...s.groups, group] }));
    return group;
  },

  renameGroup: async (id, name) => {
    const group = get().groups.find(g => g.id === id);
    if (!group) return;
    const updated = { ...group, name };
    await dexieDmRepository.saveGroup(updated);
    set(s => ({ groups: s.groups.map(g => g.id === id ? updated : g) }));
  },

  deleteGroup: async (id, mode) => {
    const affected = get().npcs.filter(n => n.groupId === id);
    if (mode === 'moveToUnassigned') {
      for (const npc of affected) {
        const updated = { ...npc, groupId: UNASSIGNED_GROUP_ID };
        await dexieDmRepository.saveNpc(updated);
      }
    } else {
      for (const npc of affected) await dexieDmRepository.removeNpc(npc.id);
    }
    await dexieDmRepository.removeGroup(id);
    set(s => ({
      groups: s.groups.filter(g => g.id !== id),
      npcs: mode === 'moveToUnassigned'
        ? s.npcs.map(n => n.groupId === id ? { ...n, groupId: UNASSIGNED_GROUP_ID } : n)
        : s.npcs.filter(n => n.groupId !== id),
    }));
  },

  createNpc: async (npc) => {
    await dexieDmRepository.saveNpc(npc);
    set(s => ({ npcs: [...s.npcs, npc] }));
  },

  updateNpc: async (id, fn) => {
    const npc = get().npcs.find(n => n.id === id);
    if (!npc) return;
    const updated = fn(npc);
    await dexieDmRepository.saveNpc(updated);
    set(s => ({ npcs: s.npcs.map(n => n.id === id ? updated : n) }));
  },

  deleteNpc: async (id) => {
    await dexieDmRepository.removeNpc(id);
    set(s => ({ npcs: s.npcs.filter(n => n.id !== id) }));
  },

  moveNpc: async (id, groupId) => {
    await get().updateNpc(id, n => ({ ...n, groupId }));
  },
}));
