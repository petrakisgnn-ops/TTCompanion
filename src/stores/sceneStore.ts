import { create } from 'zustand';
import { dexieDmRepository } from '../data/repositories/DexieDmRepository';
import { abilityMod } from '../domain/rules';
import type { NpcDefinition, DeployedInstance, SceneState } from '../domain/dm/types';
import { emptySceneState } from '../domain/dm/types';

const letterFor = (index: number): string => {
  let n = index;
  let s = '';
  do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; } while (n >= 0);
  return s;
};

interface SceneStore {
  scene: SceneState;
  loaded: boolean;

  load: () => Promise<void>;

  deployNpcDefinitions: (defs: NpcDefinition[]) => Promise<void>;
  removeInstance: (id: string) => Promise<void>;
  clearScene: () => Promise<void>;

  updateInstanceHp: (id: string, delta: number) => Promise<void>;
  setInstanceHp: (id: string, current: number) => Promise<void>;
  toggleInstanceCondition: (id: string, name: string, expiresEndOfRound: number | null) => Promise<void>;

  setPcInitiative: (characterId: string, value: number | null) => Promise<void>;
  setInstanceInitiative: (id: string, value: number | null) => Promise<void>;

  startCombat: (orderedIds: string[]) => Promise<void>;
  endCombat: () => Promise<void>;
  nextTurn: () => Promise<void>;
  reorder: (orderedIds: string[]) => Promise<void>;
}

export const useSceneStore = create<SceneStore>()((set, get) => {
  const persist = async (scene: SceneState) => {
    await dexieDmRepository.saveScene(scene);
    set({ scene });
  };

  return {
    scene: emptySceneState(),
    loaded: false,

    load: async () => {
      const scene = await dexieDmRepository.getScene();
      set({ scene: scene ?? emptySceneState(), loaded: true });
    },

    deployNpcDefinitions: async (defs) => {
      const { scene } = get();
      const deployed = [...scene.deployed];
      const newIds: string[] = [];
      for (const def of defs) {
        const existingCount = deployed.filter(d => d.npcDefId === def.id).length;
        const dexMod = def.statBlock?.abilityScores ? abilityMod(def.statBlock.abilityScores.dex) : 0;
        const ac = def.statBlock?.ac ?? 10;
        const hpMax = def.statBlock?.hp.max ?? 10;
        const count = Math.max(1, def.count);
        for (let i = 0; i < count; i++) {
          const label = letterFor(existingCount + i);
          const soloInstance = count === 1 && existingCount === 0;
          const instance: DeployedInstance = {
            id: crypto.randomUUID(),
            npcDefId: def.id,
            instanceLabel: label,
            name: soloInstance ? def.name : `${def.name} ${label}`,
            disposition: def.disposition,
            hp: { current: hpMax, max: hpMax },
            ac,
            dexMod,
            conditions: [],
            initiative: null,
            source: def.source,
          };
          deployed.push(instance);
          newIds.push(instance.id);
        }
      }
      // New arrivals join the end of an active fight; the DM drags them into position.
      const turnOrder = scene.combatActive ? [...scene.turnOrder, ...newIds] : scene.turnOrder;
      const currentTurnId = scene.currentTurnId ?? turnOrder[0] ?? null;
      await persist({ ...scene, deployed, turnOrder, currentTurnId });
    },

    removeInstance: async (id) => {
      const { scene } = get();
      const deployed = scene.deployed.filter(d => d.id !== id);
      const turnOrder = scene.turnOrder.filter(t => t !== id);
      const currentTurnId = scene.currentTurnId === id ? (turnOrder[0] ?? null) : scene.currentTurnId;
      await persist({ ...scene, deployed, turnOrder, currentTurnId });
    },

    clearScene: async () => {
      const { scene } = get();
      const npcIds = new Set(scene.deployed.map(d => d.id));
      const turnOrder = scene.turnOrder.filter(id => !npcIds.has(id));
      const currentTurnId = scene.currentTurnId && npcIds.has(scene.currentTurnId)
        ? (turnOrder[0] ?? null)
        : scene.currentTurnId;
      await persist({ ...scene, deployed: [], turnOrder, currentTurnId });
    },

    updateInstanceHp: async (id, delta) => {
      const { scene } = get();
      const deployed = scene.deployed.map(d =>
        d.id === id ? { ...d, hp: { ...d.hp, current: Math.max(0, Math.min(d.hp.max, d.hp.current + delta)) } } : d,
      );
      await persist({ ...scene, deployed });
    },

    setInstanceHp: async (id, current) => {
      const { scene } = get();
      const deployed = scene.deployed.map(d =>
        d.id === id ? { ...d, hp: { ...d.hp, current: Math.max(0, current) } } : d,
      );
      await persist({ ...scene, deployed });
    },

    toggleInstanceCondition: async (id, name, expiresEndOfRound) => {
      const { scene } = get();
      const deployed = scene.deployed.map(d => {
        if (d.id !== id) return d;
        const has = d.conditions.some(c => c.name === name);
        return {
          ...d,
          conditions: has
            ? d.conditions.filter(c => c.name !== name)
            : [...d.conditions, { name, expiresEndOfRound }],
        };
      });
      await persist({ ...scene, deployed });
    },

    setPcInitiative: async (characterId, value) => {
      const { scene } = get();
      const pcMeta = { ...scene.pcMeta, [characterId]: { initiative: value } };
      await persist({ ...scene, pcMeta });
    },

    setInstanceInitiative: async (id, value) => {
      const { scene } = get();
      const deployed = scene.deployed.map(d => d.id === id ? { ...d, initiative: value } : d);
      await persist({ ...scene, deployed });
    },

    startCombat: async (orderedIds) => {
      const { scene } = get();
      await persist({
        ...scene,
        combatActive: true,
        round: 1,
        turnOrder: orderedIds,
        currentTurnId: orderedIds[0] ?? null,
      });
    },

    endCombat: async () => {
      const { scene } = get();
      await persist({ ...scene, combatActive: false, round: 1, turnOrder: [], currentTurnId: null });
    },

    nextTurn: async () => {
      const { scene } = get();
      if (scene.turnOrder.length === 0) return;
      const idx = scene.turnOrder.findIndex(id => id === scene.currentTurnId);
      const nextIdx = (idx + 1) % scene.turnOrder.length;
      const wrapped = nextIdx === 0;
      const round = wrapped ? scene.round + 1 : scene.round;
      const deployed = wrapped
        ? scene.deployed.map(d => ({
            ...d,
            conditions: d.conditions.filter(c => c.expiresEndOfRound === null || c.expiresEndOfRound > scene.round),
          }))
        : scene.deployed;
      await persist({ ...scene, deployed, round, currentTurnId: scene.turnOrder[nextIdx] });
    },

    reorder: async (orderedIds) => {
      const { scene } = get();
      await persist({ ...scene, turnOrder: orderedIds });
    },
  };
});
