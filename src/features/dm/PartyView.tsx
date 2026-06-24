import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCharacterStore } from '../../stores/characterStore';
import { totalLevel } from '../../domain/rules';

export function PartyView() {
  const navigate = useNavigate();
  const { characters, loaded, load } = useCharacterStore();

  useEffect(() => { if (!loaded) load(); }, [loaded, load]);

  if (!loaded) {
    return <div className="p-4 text-slate-400 text-sm animate-pulse">Loading…</div>;
  }

  if (characters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-4">
        <p className="text-slate-500 text-sm">No characters yet.</p>
        <button
          onClick={() => navigate('/characters/new')}
          className="text-amber-400 text-sm underline"
        >
          Create a character
        </button>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">
      {characters.map(c => {
        const pct = c.hp.max > 0
          ? Math.max(0, Math.min(100, (c.hp.current / c.hp.max) * 100))
          : 0;
        const barColor = pct > 60 ? 'bg-emerald-500' : pct > 25 ? 'bg-amber-500' : 'bg-red-500';
        const level = totalLevel(c.classes);

        return (
          <div key={c.id} className="bg-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1.5">
              <div>
                <span className="font-semibold text-sm">{c.name}</span>
                <span className="text-slate-500 text-xs ml-2">
                  Lv {level} {c.classes[0]?.classRef.name ?? ''}
                </span>
              </div>
              <div className="text-right">
                <span className="font-bold">{c.hp.current}</span>
                <span className="text-slate-500 text-sm">/{c.hp.max}</span>
                {c.hp.temp > 0 && (
                  <span className="ml-1 text-sky-400 text-xs">+{c.hp.temp}t</span>
                )}
              </div>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
            {c.hp.current === 0 && (
              <p className="text-xs text-red-400 mt-1">Unconscious / 0 HP</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
