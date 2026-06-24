import { useEffect, useState } from 'react';
import { CLASS_SKILLS, ALL_SKILLS } from '../../../domain/rules/classSkills';
import type { WizardData } from './CharacterWizard';

interface StepSkillsProps {
  data: WizardData;
  patch: (p: Partial<WizardData>) => void;
}

interface BgJson {
  background: Array<{
    name: string;
    source: string;
    skillProficiencies?: Record<string, boolean>[];
  }>;
}

export function StepSkills({ data, patch }: StepSkillsProps) {
  const [bgSkills, setBgSkills] = useState<string[]>([]);

  const classChoice = data.classRef
    ? CLASS_SKILLS[data.classRef.name] ?? { count: 2, from: ALL_SKILLS }
    : null;

  const available = classChoice
    ? (classChoice.from.length > 0 ? classChoice.from : ALL_SKILLS)
    : ALL_SKILLS;

  // Fetch background skills once the background is selected
  useEffect(() => {
    if (!data.backgroundRef) return;
    fetch('/data/backgrounds.json')
      .then(r => r.json())
      .then((json: BgJson) => {
        const bg = json.background.find(
          b => b.name === data.backgroundRef!.name && b.source === data.backgroundRef!.source,
        );
        if (bg?.skillProficiencies?.[0]) {
          const skills = Object.entries(bg.skillProficiencies[0])
            .filter(([, v]) => v === true)
            .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1));
          setBgSkills(skills);
          // Seed already-picked if none chosen yet
          if (data.skills.length === 0) {
            patch({ skills: skills });
          }
        }
      });
  }, [data.backgroundRef?.name]);

  const toggleSkill = (skill: string) => {
    if (bgSkills.includes(skill)) return; // background skills are locked
    const already = data.skills.includes(skill);
    if (already) {
      patch({ skills: data.skills.filter(s => s !== skill) });
      return;
    }
    const classCount = classChoice?.count ?? 2;
    const classPicked = data.skills.filter(s => !bgSkills.includes(s));
    if (classPicked.length >= classCount) return; // already at max
    patch({ skills: [...data.skills, skill] });
  };

  const classCount = classChoice?.count ?? 2;
  const classPicked = data.skills.filter(s => !bgSkills.includes(s));
  const remaining = classCount - classPicked.length;

  return (
    <div className="px-4 pb-6 pt-3 space-y-4">
      <div>
        <h2 className="text-base font-semibold">Choose Skill Proficiencies</h2>
        <p className="text-xs text-[var(--color-faint)] mt-1">
          {data.classRef?.name ?? 'Your class'}: choose {classCount} skill{classCount !== 1 ? 's' : ''}.
          {remaining > 0
            ? ` (${remaining} remaining)`
            : ' All chosen.'}
        </p>
      </div>

      {/* Background skills — locked */}
      {bgSkills.length > 0 && (
        <div>
          <p className="text-xs text-[var(--color-faint)] mb-1.5 uppercase tracking-wide font-semibold">
            From background (automatic)
          </p>
          <div className="flex flex-wrap gap-2">
            {bgSkills.map(s => (
              <span
                key={s}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Class skills — selectable */}
      <div>
        <p className="text-xs text-[var(--color-faint)] mb-1.5 uppercase tracking-wide font-semibold">
          From class
        </p>
        <div className="flex flex-wrap gap-2">
          {available.map(skill => {
            const isBg = bgSkills.includes(skill);
            if (isBg) return null; // shown above already
            const picked = classPicked.includes(skill);
            const atMax = !picked && remaining <= 0;
            return (
              <button
                key={skill}
                onClick={() => toggleSkill(skill)}
                disabled={atMax}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  picked
                    ? 'bg-amber-500 text-slate-900'
                    : atMax
                    ? 'bg-[var(--color-card)] text-[var(--color-disabled)] cursor-not-allowed'
                    : 'bg-[var(--color-card)] text-[var(--color-text-2)] hover:bg-[var(--color-raised)]'
                }`}
              >
                {skill}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
