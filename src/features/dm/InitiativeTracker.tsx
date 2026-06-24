import { useState } from 'react';
import { useInitiativeStore } from '../../stores/initiativeStore';
import type { Combatant } from '../../stores/initiativeStore';

import { CONDITIONS } from '../../domain/rules/conditions';

interface AddFormState {
  name: string;
  initiative: string;
  maxHp: string;
  isPlayer: boolean;
}

const BLANK_FORM: AddFormState = { name: '', initiative: '', maxHp: '', isPlayer: false };

function CombatantRow({ c, isCurrent }: { c: Combatant; isCurrent: boolean }) {
  const { remove, updateHp, toggleCondition, setInitiative } = useInitiativeStore();
  const [showConds, setShowConds] = useState(false);
  const pct = c.hp.max > 0 ? Math.max(0, Math.min(100, (c.hp.current / c.hp.max) * 100)) : 0;
  const barColor = pct > 60 ? 'bg-emerald-500' : pct > 25 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div
      className={`rounded-xl overflow-hidden transition-all ${
        isCurrent ? 'ring-2 ring-amber-500 bg-amber-500/5' : 'bg-slate-800'
      }`}
    >
      <div className="px-3 pt-3 pb-2">
        {/* Row 1: initiative badge + name + HP */}
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={c.initiative}
            onChange={e => setInitiative(c.id, parseInt(e.target.value, 10) || 0)}
            className="w-10 bg-slate-700 rounded text-center text-sm font-bold py-0.5 outline-none focus:ring-1 focus:ring-amber-500"
          />
          <div className="flex-1 min-w-0">
            <span className={`font-semibold text-sm truncate block ${isCurrent ? 'text-amber-400' : ''}`}>
              {c.name}
              {c.isPlayer && <span className="ml-1.5 text-xs text-slate-500">(PC)</span>}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => updateHp(c.id, -1)}
              className="w-7 h-7 rounded bg-slate-700 font-bold text-red-400 hover:bg-slate-600 text-lg flex items-center justify-center"
            >
              −
            </button>
            <span className="text-sm font-bold w-8 text-center">
              {c.hp.current}
            </span>
            <button
              onClick={() => updateHp(c.id, 1)}
              className="w-7 h-7 rounded bg-slate-700 font-bold text-emerald-400 hover:bg-slate-600 text-lg flex items-center justify-center"
            >
              +
            </button>
            <span className="text-slate-500 text-xs">/{c.hp.max}</span>
          </div>
        </div>

        {/* HP bar */}
        <div className="mt-1.5 h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
        </div>

        {/* Conditions + controls */}
        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
          {c.conditions.map(cond => (
            <button
              key={cond}
              onClick={() => toggleCondition(c.id, cond)}
              className="text-xs bg-purple-500/20 text-purple-300 rounded px-1.5 py-0.5 hover:bg-purple-500/40"
            >
              {cond} ✕
            </button>
          ))}
          <button
            onClick={() => setShowConds(v => !v)}
            className="text-xs text-slate-500 hover:text-slate-300 px-1.5 py-0.5 rounded bg-slate-700/50"
          >
            + Condition
          </button>
          <button
            onClick={() => remove(c.id)}
            className="ml-auto text-xs text-slate-600 hover:text-red-400 transition-colors"
          >
            Remove
          </button>
        </div>
      </div>

      {/* Condition picker */}
      {showConds && (
        <div className="border-t border-white/5 px-3 py-2 flex flex-wrap gap-1.5">
          {CONDITIONS.filter(cond => !c.conditions.includes(cond)).map(cond => (
            <button
              key={cond}
              onClick={() => { toggleCondition(c.id, cond); setShowConds(false); }}
              className="text-xs bg-slate-700 hover:bg-slate-600 rounded px-2 py-1"
            >
              {cond}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function InitiativeTracker() {
  const { combatants, currentTurnId, round, add, nextTurn, reset } = useInitiativeStore();
  const [form, setForm] = useState<AddFormState>(BLANK_FORM);
  const [showForm, setShowForm] = useState(false);

  const submit = () => {
    const initiative = parseInt(form.initiative, 10);
    const maxHp = parseInt(form.maxHp, 10);
    if (!form.name.trim() || isNaN(initiative)) return;
    add({
      name: form.name.trim(),
      initiative,
      hp: { current: isNaN(maxHp) ? 10 : maxHp, max: isNaN(maxHp) ? 10 : maxHp },
      conditions: [],
      isPlayer: form.isPlayer,
    });
    setForm(BLANK_FORM);
    setShowForm(false);
  };

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Controls */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          {combatants.length > 0 && (
            <span className="text-xs text-slate-500">Round {round}</span>
          )}
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="text-sm bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-700"
        >
          + Add
        </button>
        {combatants.length > 0 && (
          <>
            <button
              onClick={nextTurn}
              className="text-sm bg-amber-500 text-slate-900 font-semibold px-3 py-1.5 rounded-lg hover:bg-amber-400"
            >
              Next Turn →
            </button>
            <button
              onClick={reset}
              className="text-xs text-slate-600 hover:text-red-400 px-2 py-1.5"
            >
              End
            </button>
          </>
        )}
      </div>

      {/* Add combatant form */}
      {showForm && (
        <div className="bg-slate-800 rounded-xl p-3 space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Add Combatant</p>
          <div className="flex gap-2">
            <input
              placeholder="Name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="flex-1 bg-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-slate-500"
            />
            <input
              placeholder="Init"
              type="number"
              value={form.initiative}
              onChange={e => setForm(f => ({ ...f, initiative: e.target.value }))}
              className="w-16 bg-slate-700 rounded-lg px-2 py-2 text-sm text-center outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-slate-500"
            />
            <input
              placeholder="HP"
              type="number"
              value={form.maxHp}
              onChange={e => setForm(f => ({ ...f, maxHp: e.target.value }))}
              className="w-16 bg-slate-700 rounded-lg px-2 py-2 text-sm text-center outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-slate-500"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isPlayer}
                onChange={e => setForm(f => ({ ...f, isPlayer: e.target.checked }))}
                className="accent-amber-500"
              />
              Player character
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="text-xs text-slate-500 px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                className="text-xs bg-amber-500 text-slate-900 font-semibold px-3 py-1.5 rounded-lg hover:bg-amber-400"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Combatant list */}
      {combatants.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">
          No combatants. Add players and monsters to start tracking.
        </div>
      ) : (
        combatants.map(c => (
          <CombatantRow key={c.id} c={c} isCurrent={c.id === currentTurnId} />
        ))
      )}
    </div>
  );
}
