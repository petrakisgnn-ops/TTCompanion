import { useCharacterStore } from '../stores/characterStore';
import { registerWidget } from './registry';
import type { WidgetProps } from './registry';
import type { Currency } from '../domain/character/types';

interface CoinDef { key: keyof Currency; label: string; color: string }

const COINS: CoinDef[] = [
  { key: 'pp', label: 'PP', color: 'text-slate-300' },
  { key: 'gp', label: 'GP', color: 'text-amber-400' },
  { key: 'ep', label: 'EP', color: 'text-slate-400' },
  { key: 'sp', label: 'SP', color: 'text-slate-300' },
  { key: 'cp', label: 'CP', color: 'text-orange-400' },
];

function CurrencyWidget({ character }: WidgetProps) {
  const { setCurrency } = useCharacterStore();
  const currency = character.currency ?? { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 };

  const adjust = (key: keyof Currency, delta: number) => {
    setCurrency(character.id, { [key]: Math.max(0, (currency[key] ?? 0) + delta) });
  };

  return (
    <div className="grid grid-cols-5 gap-1 p-3">
      {COINS.map(({ key, label, color }) => (
        <div key={key} className="flex flex-col items-center gap-1">
          <span className={`text-[11px] font-semibold ${color}`}>{label}</span>
          <span className="text-base font-bold leading-none">{currency[key] ?? 0}</span>
          <div className="flex gap-0.5 mt-0.5">
            <button
              onClick={() => adjust(key, 1)}
              className="w-6 h-6 rounded bg-slate-700 text-sm font-bold hover:bg-slate-600 active:scale-95 transition-all leading-none"
            >
              +
            </button>
            <button
              onClick={() => adjust(key, -1)}
              className="w-6 h-6 rounded bg-slate-700 text-sm font-bold hover:bg-slate-600 active:scale-95 transition-all leading-none"
            >
              −
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

registerWidget({
  typeId: 'currency',
  label: 'Currency',
  icon: 'toll',
  defaultConfig: {},
  defaultSpan: 2,
  component: CurrencyWidget,
});
