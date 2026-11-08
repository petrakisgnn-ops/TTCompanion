import { useEffect, useState } from 'react';
import type { Character } from '../../../domain/character/types';
import type { RefId } from '../../../domain/reference/types';
import { abilityMod } from '../../../domain/rules';
import { asiLevelsUpTo, getClassData, subclassLevel } from '../../../domain/rules/classData';
import { rollDice } from '../../../domain/rules/dice';
import { hpBonusPerLevel } from '../../../domain/rules/hpBonus';
import { startingHp } from '../../../domain/rules/startingHp';
import { useSettingsStore } from '../../../stores/settingsStore';
import { resolveBackgroundFeats, resolveFinalScores, type WizardData } from './CharacterWizard';

interface Props {
  data: WizardData;
  patch: (p: Partial<WizardData>) => void;
}

type Mode = WizardData['hpMethod']['kind'];

const MODES: { key: Mode; label: string }[] = [
  { key: 'average', label: 'Average' },
  { key: 'rolled', label: 'Roll' },
  { key: 'manual', label: 'Enter' },
];

/**
 * Creation-time max HP: the fixed average, rolled hit dice for levels 2+, or a number the
 * player types in (e.g. HP they already rolled at the table). Level 1 is always the full die.
 */
export function HitPointsPicker({ data, patch }: Props) {
  const edition = useSettingsStore(s => s.edition);
  const cls = data.classRef ? getClassData(data.classRef.name) : null;
  const [bgFeats, setBgFeats] = useState<RefId[]>([]);
  const [manualText, setManualText] = useState(
    data.hpMethod.kind === 'manual' ? String(data.hpMethod.total) : '',
  );

  // Background feats (e.g. a 2024 background granting Tough) count towards the per-level bonus.
  useEffect(() => {
    let cancelled = false;
    if (!data.backgroundRef) { setBgFeats([]); return; }
    void resolveBackgroundFeats(data.backgroundRef).then(f => { if (!cancelled) setBgFeats(f); });
    return () => { cancelled = true; };
  }, [data.backgroundRef]);

  if (!cls || !data.classRef) return null;

  const level = data.level;
  const conMod = abilityMod(resolveFinalScores(data).con);
  const asiFeats = data.asiChoices
    .slice(0, asiLevelsUpTo(data.classRef.name, level).length)
    .filter(c => c.mode === 'feat' && c.feat)
    .map(c => c.feat!);
  const subclass = data.subclassRef && level >= subclassLevel(data.classRef.name, edition) ? data.subclassRef : undefined;
  const bonusPerLevel = hpBonusPerLevel({
    race: data.raceRef ?? { name: '', source: '' },
    subrace: data.subraceRef,
    feats: [...bgFeats, ...(data.raceBonusFeat ? [data.raceBonusFeat] : []), ...asiFeats],
    classes: [{ classRef: data.classRef, level, subclass }],
  } as Character);

  const input = { hitDie: cls.hitDie, level, conMod, bonusPerLevel };
  const average = startingHp(input, { kind: 'average' });
  const total = startingHp(input, data.hpMethod);
  const mode = data.hpMethod.kind;
  const rolls = data.hpMethod.kind === 'rolled' ? data.hpMethod.rolls : [];
  const extraLevels = Math.max(0, level - 1);

  const roll = () => patch({ hpMethod: { kind: 'rolled', rolls: rollDice(extraLevels, cls.hitDie) } });

  const choose = (m: Mode) => {
    if (m === 'average') patch({ hpMethod: { kind: 'average' } });
    if (m === 'rolled') roll();
    if (m === 'manual') {
      setManualText(String(total));
      patch({ hpMethod: { kind: 'manual', total } });
    }
  };

  const conLabel = conMod >= 0 ? `+${conMod}` : String(conMod);

  return (
    <div className="bg-[var(--color-card)] rounded-xl p-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold">Hit Points</h2>
        <span className="text-2xl font-bold text-amber-400">{total}</span>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {MODES.map(m => (
          <button
            key={m.key}
            onClick={() => choose(m.key)}
            disabled={m.key === 'rolled' && extraLevels === 0}
            className={`min-h-[44px] rounded-xl text-sm font-medium disabled:opacity-40 ${
              mode === m.key ? 'bg-amber-500 text-slate-900' : 'bg-[var(--color-raised)] text-[var(--color-text-2)]'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'average' && (
        <p className="text-xs text-[var(--color-faint)] leading-relaxed">
          Level 1: {cls.hitDie} {conLabel} CON. Each later level: {Math.floor(cls.hitDie / 2) + 1} {conLabel} CON.
          {bonusPerLevel > 0 && ` Plus ${bonusPerLevel} per level from traits/feats (e.g. Tough).`}
        </p>
      )}

      {mode === 'rolled' && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            <span className="px-2 py-1 rounded-lg bg-[var(--color-raised)] text-xs">L1: {cls.hitDie}</span>
            {rolls.slice(0, extraLevels).map((r, i) => (
              <span key={i} className="px-2 py-1 rounded-lg bg-[var(--color-raised)] text-xs">L{i + 2}: {r}</span>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-[var(--color-faint)]">
              Each die {conLabel} CON (min 1){bonusPerLevel > 0 ? `, +${bonusPerLevel}/level` : ''}. Average would be {average}.
            </p>
            <button onClick={roll} className="shrink-0 min-h-[44px] px-4 rounded-xl bg-[var(--color-raised)] text-sm font-semibold text-amber-400">
              Reroll
            </button>
          </div>
        </div>
      )}

      {mode === 'manual' && (
        <div className="space-y-1">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={manualText}
            onChange={e => {
              setManualText(e.target.value);
              const n = Number(e.target.value);
              if (e.target.value !== '' && Number.isFinite(n)) patch({ hpMethod: { kind: 'manual', total: n } });
            }}
            aria-label="Maximum hit points"
            className="w-full bg-[var(--color-raised)] rounded-xl px-3 py-2.5 text-lg font-semibold outline-none focus:ring-1 focus:ring-[var(--color-gold-lt)]"
          />
          <p className="text-xs text-[var(--color-faint)]">
            Your total max HP, used as-is (nothing is added). Average would be {average}.
          </p>
        </div>
      )}
    </div>
  );
}
