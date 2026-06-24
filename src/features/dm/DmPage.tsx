import { useState } from 'react';
import { InitiativeTracker } from './InitiativeTracker';
import { EncounterBuilder } from './EncounterBuilder';
import { PartyView } from './PartyView';

type DmTab = 'initiative' | 'encounter' | 'party';

const TABS: { key: DmTab; label: string }[] = [
  { key: 'initiative', label: 'Initiative' },
  { key: 'encounter',  label: 'Encounter' },
  { key: 'party',      label: 'Party' },
];

export function DmPage() {
  const [tab, setTab] = useState<DmTab>('initiative');

  return (
    <div className="flex flex-col">
      {/* DM header */}
      <div className="sticky top-0 z-10 bg-slate-900 border-b border-white/10">
        <div className="px-4 pt-4 pb-0 flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-amber-500">DM Mode</span>
        </div>
        <div className="flex">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'text-amber-400 border-b-2 border-amber-500'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1">
        {tab === 'initiative' && <InitiativeTracker />}
        {tab === 'encounter'  && <EncounterBuilder />}
        {tab === 'party'      && <PartyView />}
      </div>
    </div>
  );
}
