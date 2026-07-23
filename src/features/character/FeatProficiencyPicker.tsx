import { ALL_SKILLS } from '../../domain/rules/classSkills';
import { ALL_TOOLS } from '../../domain/rules/tools';
import { ALL_LANGUAGES } from '../../domain/rules/languages';
import {
  pickedForChoice,
  type FeatProfChoice, type FeatProficiencies, type FeatProfSelection,
} from '../../domain/rules/featRewards';

interface Props {
  proficiencies: FeatProficiencies;
  /** Proficient skills the feat's Expertise choice may draw from (Prodigy). */
  proficientSkills: string[];
  value: FeatProfSelection;
  onChange: (v: FeatProfSelection) => void;
}

const SKILL_SET = new Set(ALL_SKILLS);

const CHOICE_LABEL: Record<FeatProfChoice['kind'], string> = {
  skill: 'skill', tool: 'tool proficiency', language: 'language', expertise: 'skill for Expertise', skillOrTool: 'skill or tool',
};

function optionsFor(choice: FeatProfChoice, proficientSkills: string[]): string[] {
  if (choice.from && choice.from.length) return choice.from;
  switch (choice.kind) {
    case 'skill': return ALL_SKILLS;
    case 'tool': return ALL_TOOLS as string[];
    case 'language': return ALL_LANGUAGES as string[];
    case 'expertise': return proficientSkills;
    case 'skillOrTool': return [...ALL_SKILLS, ...(ALL_TOOLS as string[])];
  }
}

function fieldFor(choice: FeatProfChoice, item: string): keyof FeatProfSelection {
  switch (choice.kind) {
    case 'skill': return 'skills';
    case 'tool': return 'tools';
    case 'language': return 'languages';
    case 'expertise': return 'expertise';
    case 'skillOrTool': return SKILL_SET.has(item) ? 'skills' : 'tools';
  }
}

/**
 * Renders the choice pickers a feat requires (Prodigy's skill/tool/language/expertise, Skilled's
 * "3 from skills or tools", …). Fixed grants aren't shown here — the caller applies those. The
 * `value`/`onChange` hold only the player's choices, keyed by target proficiency list.
 */
export function FeatProficiencyPicker({ proficiencies, proficientSkills, value, onChange }: Props) {
  if (proficiencies.choices.length === 0) return null;

  const toggle = (choice: FeatProfChoice, item: string) => {
    const field = fieldFor(choice, item);
    const has = value[field].includes(item);
    if (has) {
      onChange({ ...value, [field]: value[field].filter(x => x !== item) });
      return;
    }
    if (pickedForChoice(choice, value) >= choice.count) return; // this group is full
    onChange({ ...value, [field]: [...value[field], item] });
  };

  return (
    <div className="space-y-3">
      {proficiencies.choices.map(choice => {
        const opts = optionsFor(choice, proficientSkills);
        const picked = pickedForChoice(choice, value);
        const remaining = choice.count - picked;
        const noun = CHOICE_LABEL[choice.kind];
        return (
          <div key={choice.id}>
            <p className="text-xs text-[var(--color-faint)] mb-1.5 uppercase tracking-wide font-semibold">
              Choose {choice.count} {noun}{choice.count !== 1 ? 's' : ''}
              {remaining > 0 ? ` (${remaining} remaining)` : ' — all chosen'}
            </p>
            {opts.length === 0 ? (
              <p className="text-xs text-[var(--color-disabled)]">
                {choice.kind === 'expertise' ? 'Pick your skill proficiencies first.' : 'No options available.'}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {opts.map(item => {
                  const isPicked = value[fieldFor(choice, item)].includes(item);
                  const atMax = !isPicked && remaining <= 0;
                  return (
                    <button
                      key={item}
                      onClick={() => toggle(choice, item)}
                      disabled={atMax}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        isPicked
                          ? 'bg-amber-500 text-slate-900'
                          : atMax
                          ? 'bg-[var(--color-card)] text-[var(--color-disabled)] cursor-not-allowed'
                          : 'bg-[var(--color-card)] text-[var(--color-text-2)] hover:bg-[var(--color-raised)]'
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
