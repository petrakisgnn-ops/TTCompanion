import { create } from 'zustand';

export interface Combatant {
  id: string;
  name: string;
  initiative: number;
  hp: { current: number; max: number };
  conditions: string[];
  isPlayer: boolean;
}

interface InitiativeStore {
  combatants: Combatant[];
  currentTurnId: string | null;
  round: number;

  add: (c: Omit<Combatant, 'id'>) => void;
  remove: (id: string) => void;
  updateHp: (id: string, delta: number) => void;
  setHp: (id: string, current: number) => void;
  toggleCondition: (id: string, condition: string) => void;
  nextTurn: () => void;
  reset: () => void;
  setInitiative: (id: string, value: number) => void;
}

const sorted = (cs: Combatant[]) =>
  [...cs].sort((a, b) => b.initiative - a.initiative || a.name.localeCompare(b.name));

export const useInitiativeStore = create<InitiativeStore>()((set, get) => ({
  combatants: [],
  currentTurnId: null,
  round: 1,

  add: (c) => {
    const newC: Combatant = { ...c, id: crypto.randomUUID() };
    set(s => ({
      combatants: sorted([...s.combatants, newC]),
      currentTurnId: s.currentTurnId ?? newC.id,
    }));
  },

  remove: (id) =>
    set(s => {
      const next = s.combatants.filter(c => c.id !== id);
      return {
        combatants: next,
        currentTurnId:
          s.currentTurnId === id ? (next[0]?.id ?? null) : s.currentTurnId,
      };
    }),

  updateHp: (id, delta) =>
    set(s => ({
      combatants: s.combatants.map(c =>
        c.id === id
          ? { ...c, hp: { ...c.hp, current: Math.max(0, c.hp.current + delta) } }
          : c,
      ),
    })),

  setHp: (id, current) =>
    set(s => ({
      combatants: s.combatants.map(c =>
        c.id === id ? { ...c, hp: { ...c.hp, current: Math.max(0, current) } } : c,
      ),
    })),

  toggleCondition: (id, condition) =>
    set(s => ({
      combatants: s.combatants.map(c => {
        if (c.id !== id) return c;
        const has = c.conditions.includes(condition);
        return {
          ...c,
          conditions: has
            ? c.conditions.filter(x => x !== condition)
            : [...c.conditions, condition],
        };
      }),
    })),

  setInitiative: (id, value) =>
    set(s => ({
      combatants: sorted(
        s.combatants.map(c => (c.id === id ? { ...c, initiative: value } : c)),
      ),
    })),

  nextTurn: () => {
    const { combatants, currentTurnId, round } = get();
    if (combatants.length === 0) return;
    const idx = combatants.findIndex(c => c.id === currentTurnId);
    const nextIdx = (idx + 1) % combatants.length;
    set({
      currentTurnId: combatants[nextIdx].id,
      round: nextIdx === 0 ? round + 1 : round,
    });
  },

  reset: () => set({ combatants: [], currentTurnId: null, round: 1 }),
}));
