import { abilityMod } from '../../../domain/rules';
import { getClassData } from '../../../domain/rules/classData';
import { maxHp } from '../../../domain/rules/spellSlots';
import type { WizardData } from './CharacterWizard';

const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
const ABILITY_LABELS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

interface StepFinalizeProps {
  data: WizardData;
  patch: (p: Partial<WizardData>) => void;
}

export function StepFinalize({ data, patch }: StepFinalizeProps) {
  const cls = data.classRef ? getClassData(data.classRef.name) : null;
  const conMod = abilityMod(data.abilityScores.con);
  const hp = cls ? maxHp(cls.hitDie, data.level, conMod) : null;

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
            <span>{data.classRef ? `${data.classRef.name} ${data.level}` : '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--color-muted)]">Background</span>
            <span>{data.backgroundRef?.name ?? '—'}</span>
          </div>
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
        </div>

        {/* Ability scores mini-grid */}
        <div className="border-t border-[var(--color-border)] pt-3 grid grid-cols-6 text-center gap-1">
          {ABILITY_KEYS.map((key, i) => {
            const score = data.abilityScores[key];
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
