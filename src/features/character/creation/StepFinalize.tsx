import { useEffect, useState } from 'react';
import { abilityMod } from '../../../domain/rules';
import { getClassData } from '../../../domain/rules/classData';
import { maxHp } from '../../../domain/rules/spellSlots';
import { parseCharacteristicTables, type CharacteristicTables } from '../../../domain/rules/characteristics';
import { rollDice } from '../../../domain/rules/dice';
import type { Entry } from '../../../domain/reference/types';
import type { WizardData } from './CharacterWizard';

const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
const ABILITY_LABELS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

const ALIGNMENTS = ['LG', 'NG', 'CG', 'LN', 'N', 'CN', 'LE', 'NE', 'CE'];
const ALIGNMENT_LABELS: Record<string, string> = {
  LG: 'Lawful Good', NG: 'Neutral Good', CG: 'Chaotic Good',
  LN: 'Lawful Neutral', N: 'True Neutral', CN: 'Chaotic Neutral',
  LE: 'Lawful Evil', NE: 'Neutral Evil', CE: 'Chaotic Evil',
};

const EMPTY_TABLES: CharacteristicTables = { trait: [], ideal: [], bond: [], flaw: [] };

interface StepFinalizeProps {
  data: WizardData;
  patch: (p: Partial<WizardData>) => void;
}

const inputStyle =
  'w-full bg-[var(--color-card)] rounded-lg px-3 py-2 text-sm outline-none placeholder:text-[var(--color-faint)] focus:ring-1 focus:ring-[var(--color-gold-lt)]';

interface CharacteristicRowProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  onRoll: () => void;
}

function CharacteristicRow({ label, value, onChange, options, onRoll }: CharacteristicRowProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-[var(--color-faint)] uppercase tracking-wide font-semibold">{label}</span>
        {options.length > 0 && (
          <button onClick={onRoll} className="text-xs text-amber-500 font-semibold">🎲 Roll</button>
        )}
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={2}
        placeholder={`${label}…`}
        className={`${inputStyle} resize-none`}
      />
    </div>
  );
}

export function StepFinalize({ data, patch }: StepFinalizeProps) {
  const cls = data.classRef ? getClassData(data.classRef.name) : null;
  const finalCon = data.abilityScores.con + (data.abilityBonus.con ?? 0);
  const conMod = abilityMod(finalCon);
  const hp = cls ? maxHp(cls.hitDie, data.level, conMod) : null;

  const [tables, setTables] = useState<CharacteristicTables>(EMPTY_TABLES);

  useEffect(() => {
    if (!data.backgroundRef) { setTables(EMPTY_TABLES); return; }
    fetch(`${import.meta.env.BASE_URL}data/backgrounds.json`)
      .then(r => r.json())
      .then((json: { background: { name: string; source: string; entries?: Entry[] }[] }) => {
        const bg = json.background.find(
          b => b.name === data.backgroundRef!.name && b.source === data.backgroundRef!.source,
        );
        setTables(parseCharacteristicTables(bg?.entries ?? []));
      });
  }, [data.backgroundRef?.name, data.backgroundRef?.source]);

  const rollField = (options: string[], patchKey: keyof WizardData) => {
    if (options.length === 0) return;
    const idx = rollDice(1, options.length)[0] - 1;
    patch({ [patchKey]: options[idx] } as Partial<WizardData>);
  };

  return (
    <div className="px-4 pb-6 space-y-5 pt-3">
      <div>
        <h2 className="text-base font-semibold mb-3">Name Your Character</h2>
        <input
          type="text"
          placeholder="Character name…"
          value={data.name}
          onChange={e => patch({ name: e.target.value })}
          autoFocus
          className="w-full bg-[var(--color-card)] rounded-xl px-4 py-3 text-base outline-none placeholder:text-[var(--color-faint)] outline-none focus:ring-1 focus:ring-[var(--color-gold-lt)]"
        />
      </div>

      {/* Alignment */}
      <div>
        <h2 className="text-base font-semibold mb-2">Alignment</h2>
        <div className="grid grid-cols-3 gap-2">
          {ALIGNMENTS.map(a => (
            <button
              key={a}
              onClick={() => patch({ alignment: data.alignment === a ? null : a })}
              className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
                data.alignment === a
                  ? 'bg-amber-500 text-slate-900'
                  : 'bg-[var(--color-card)] text-[var(--color-text-2)] hover:bg-[var(--color-raised)]'
              }`}
            >
              {ALIGNMENT_LABELS[a]}
            </button>
          ))}
        </div>
      </div>

      {/* Personality */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Personality</h2>
        <CharacteristicRow
          label="Personality Trait"
          value={data.personalityTrait}
          onChange={v => patch({ personalityTrait: v })}
          options={tables.trait}
          onRoll={() => rollField(tables.trait, 'personalityTrait')}
        />
        <CharacteristicRow
          label="Ideal"
          value={data.personalityIdeal}
          onChange={v => patch({ personalityIdeal: v })}
          options={tables.ideal}
          onRoll={() => rollField(tables.ideal, 'personalityIdeal')}
        />
        <CharacteristicRow
          label="Bond"
          value={data.personalityBond}
          onChange={v => patch({ personalityBond: v })}
          options={tables.bond}
          onRoll={() => rollField(tables.bond, 'personalityBond')}
        />
        <CharacteristicRow
          label="Flaw"
          value={data.personalityFlaw}
          onChange={v => patch({ personalityFlaw: v })}
          options={tables.flaw}
          onRoll={() => rollField(tables.flaw, 'personalityFlaw')}
        />
      </div>

      {/* Physical description */}
      <div>
        <h2 className="text-base font-semibold mb-2">Appearance</h2>
        <div className="grid grid-cols-2 gap-2">
          {([
            ['age', 'Age'], ['height', 'Height'], ['weight', 'Weight'],
            ['eyes', 'Eyes'], ['skin', 'Skin'], ['hair', 'Hair'],
          ] as const).map(([key, label]) => (
            <input
              key={key}
              placeholder={label}
              value={data[key]}
              onChange={e => patch({ [key]: e.target.value } as Partial<WizardData>)}
              className={inputStyle}
            />
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-[var(--color-card)] rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-[var(--color-muted)] uppercase tracking-wide">Summary</h3>

        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--color-muted)]">Race</span>
            <span>{data.raceRef?.name ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--color-muted)]">Class</span>
            <span>
              {data.classRef ? `${data.classRef.name} ${data.level}` : '—'}
              {data.subclassRef ? ` (${data.subclassRef.name})` : ''}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--color-muted)]">Background</span>
            <span>{data.backgroundRef?.name ?? '—'}</span>
          </div>
          {data.alignment && (
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">Alignment</span>
              <span>{ALIGNMENT_LABELS[data.alignment]}</span>
            </div>
          )}
          {hp !== null && (
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">Hit Points</span>
              <span>{hp}</span>
            </div>
          )}
          {cls && (
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">Hit Die</span>
              <span>d{cls.hitDie}</span>
            </div>
          )}
          {data.languages.length > 0 && (
            <div className="flex justify-between gap-3">
              <span className="text-[var(--color-muted)] shrink-0">Languages</span>
              <span className="text-right">{data.languages.join(', ')}</span>
            </div>
          )}
          {data.tools.length > 0 && (
            <div className="flex justify-between gap-3">
              <span className="text-[var(--color-muted)] shrink-0">Tools</span>
              <span className="text-right">{data.tools.join(', ')}</span>
            </div>
          )}
          {data.raceBonusFeat && (
            <div className="flex justify-between gap-3">
              <span className="text-[var(--color-muted)] shrink-0">Bonus Feat</span>
              <span className="text-right">{data.raceBonusFeat.name}</span>
            </div>
          )}
          {data.resolvedInventory.length > 0 && (
            <div className="flex justify-between gap-3">
              <span className="text-[var(--color-muted)] shrink-0">Equipment</span>
              <span className="text-right">
                {data.resolvedInventory.map(i => `${i.itemRef.name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`).join(', ')}
              </span>
            </div>
          )}
          {data.equipmentNotes && (
            <div className="flex justify-between gap-3">
              <span className="text-[var(--color-muted)] shrink-0">Also</span>
              <span className="text-right">{data.equipmentNotes.split('\n').join(', ')}</span>
            </div>
          )}
          {(data.resolvedCurrency.gp > 0 || data.resolvedCurrency.cp > 0) && (
            <div className="flex justify-between gap-3">
              <span className="text-[var(--color-muted)] shrink-0">Starting Gold</span>
              <span className="text-right text-amber-500 font-semibold">
                {data.resolvedCurrency.gp} gp{data.resolvedCurrency.cp > 0 ? ` ${data.resolvedCurrency.cp} cp` : ''}
              </span>
            </div>
          )}
        </div>

        {/* Ability scores mini-grid */}
        <div className="border-t border-[var(--color-border)] pt-3 grid grid-cols-6 text-center gap-1">
          {ABILITY_KEYS.map((key, i) => {
            const score = data.abilityScores[key] + (data.abilityBonus[key] ?? 0);
            const mod = abilityMod(score);
            return (
              <div key={key}>
                <div className="text-amber-500 font-semibold text-xs">{ABILITY_LABELS[i]}</div>
                <div className="font-bold text-sm">{score}</div>
                <div className="text-[var(--color-muted)] text-xs">
                  {mod >= 0 ? '+' : ''}{mod}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
