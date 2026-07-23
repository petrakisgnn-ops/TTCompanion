import { useEffect, useRef, useState } from 'react';
import { CLASS_SKILLS, ALL_SKILLS } from '../../../domain/rules/classSkills';
import { ALL_LANGUAGES, parseLanguageGrant, mergeLanguageGrants, type LanguageGrant } from '../../../domain/rules/languages';
import { ALL_TOOLS, parseToolGrant, type ToolGrant } from '../../../domain/rules/tools';
import { parseSkillGrant, type SkillGrant } from '../../../domain/rules/skillGrants';
import { expertiseCount } from '../../../domain/rules/expertise';
import { parseFeatProficiencies, EMPTY_FEAT_PROF_SELECTION } from '../../../domain/rules/featRewards';
import { matchesEdition } from '../../../domain/rules/edition';
import { useSettingsStore } from '../../../stores/settingsStore';
import { buildRaceOptions, type RawRace, type RawSubrace } from '../../../domain/reference/races';
import { parseBonusSkillAndFeatGrant, parseRaceFeatGrant } from '../../../domain/rules/raceGrants';
import { featCategory } from '../../../domain/rules/featCategory';
import { ClassOptionsPicker } from './ClassOptionsPicker';
import { WeaponMasteryPicker } from './WeaponMasteryPicker';
import { FeatProficiencyPicker } from '../FeatProficiencyPicker';
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
    languageProficiencies?: unknown;
    toolProficiencies?: unknown;
  }>;
}

interface RaceJson {
  race: Array<{ name: string; source: string; languageProficiencies?: unknown; skillProficiencies?: unknown }>;
}

const EMPTY_SKILL_GRANT: SkillGrant = { fixed: [], choiceCount: 0, choiceFrom: [] };

interface FeatEntry {
  name: string;
  source: string;
  reprintedAs?: unknown;
  category?: string;
  skillProficiencies?: unknown;
  toolProficiencies?: unknown;
  languageProficiencies?: unknown;
  expertise?: unknown;
  skillToolLanguageProficiencies?: unknown;
}

export function StepSkills({ data, patch }: StepSkillsProps) {
  const edition = useSettingsStore(s => s.edition);
  const [bgSkills, setBgSkills] = useState<string[]>([]);
  const [bgSkillGrant, setBgSkillGrant] = useState<SkillGrant>(EMPTY_SKILL_GRANT);
  const [bgLangGrant, setBgLangGrant] = useState<LanguageGrant>({ fixed: [], choiceCount: 0 });
  const [raceLangGrant, setRaceLangGrant] = useState<LanguageGrant>({ fixed: [], choiceCount: 0 });
  const [raceSkillGrant, setRaceSkillGrant] = useState<SkillGrant>(EMPTY_SKILL_GRANT);
  const [toolGrant, setToolGrant] = useState<ToolGrant>({ fixed: [], choiceCount: 0 });

  // Race/subrace bonus skill + feat (e.g. Variant Human) — shape-detected, see raceGrants.ts
  const [bonusGrant, setBonusGrant] = useState({ grantsSkill: false, grantsFeat: false });
  // A 2024 species Origin-feat grant restricts the bonus feat to a category (e.g. Human → "O").
  const [raceFeatCategory, setRaceFeatCategory] = useState<string | null>(null);
  const [subraceLabel, setSubraceLabel] = useState('');
  const [allFeats, setAllFeats] = useState<FeatEntry[]>([]);
  const [featQuery, setFeatQuery] = useState('');
  const [featResults, setFeatResults] = useState<FeatEntry[]>([]);
  const featTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const classChoice = data.classRef
    ? CLASS_SKILLS[data.classRef.name] ?? { count: 2, from: ALL_SKILLS }
    : null;

  const available = classChoice
    ? (classChoice.from.length > 0 ? classChoice.from : ALL_SKILLS)
    : ALL_SKILLS;

  // Fetch background skills + languages once the background is selected
  useEffect(() => {
    if (!data.backgroundRef) return;
    fetch(`${import.meta.env.BASE_URL}data/backgrounds.json`)
      .then(r => r.json())
      .then((json: BgJson) => {
        const bg = json.background.find(
          b => b.name === data.backgroundRef!.name && b.source === data.backgroundRef!.source,
        );
        // Parse the full skill grant — fixed proficiencies AND any "choose N" (e.g. Cloistered
        // Scholar grants History + one of Arcana/Nature/Religion). parseSkillGrant also maps
        // multi-word keys to proper display names ("animal handling" → "Animal Handling").
        const skillGrant = parseSkillGrant(bg?.skillProficiencies);
        setBgSkills(skillGrant.fixed);
        setBgSkillGrant(skillGrant);
        // Seed the fixed background skills if the player hasn't started picking yet.
        if (data.skills.length === 0 && skillGrant.fixed.length > 0) {
          patch({ skills: skillGrant.fixed });
        }
        setBgLangGrant(parseLanguageGrant(bg?.languageProficiencies));
        setToolGrant(parseToolGrant(bg?.toolProficiencies));
      });
  }, [data.backgroundRef?.name]);

  // Fetch race languages + skill proficiencies once the race is selected
  useEffect(() => {
    if (!data.raceRef) { setRaceLangGrant({ fixed: [], choiceCount: 0 }); setRaceSkillGrant(EMPTY_SKILL_GRANT); return; }
    fetch(`${import.meta.env.BASE_URL}data/races.json`)
      .then(r => r.json())
      .then((json: RaceJson) => {
        const race = json.race.find(r => r.name === data.raceRef!.name && r.source === data.raceRef!.source);
        setRaceLangGrant(parseLanguageGrant(race?.languageProficiencies));
        setRaceSkillGrant(parseSkillGrant(race?.skillProficiencies));
      });
  }, [data.raceRef?.name, data.raceRef?.source]);

  // Race/subrace bonus skill + feat (e.g. Variant Human) — detected by trait shape, not name
  useEffect(() => {
    if (!data.raceRef) { setBonusGrant({ grantsSkill: false, grantsFeat: false }); setRaceFeatCategory(null); setSubraceLabel(''); return; }
    fetch(`${import.meta.env.BASE_URL}data/races.json`)
      .then(r => r.json())
      .then((json: { race: RawRace[]; subrace: RawSubrace[] }) => {
        const options = buildRaceOptions(json.race, json.subrace);
        const opt = data.subraceRef
          ? options.find(o => o.subraceName === data.subraceRef!.name && o.subraceSource === data.subraceRef!.source)
          : options.find(o => !o.subraceName && o.raceName === data.raceRef!.name && o.raceSource === data.raceRef!.source);
        setSubraceLabel(opt?.name ?? '');
        setBonusGrant(opt ? parseBonusSkillAndFeatGrant(opt.entries) : { grantsSkill: false, grantsFeat: false });
        setRaceFeatCategory(opt ? parseRaceFeatGrant(opt.feats)?.category ?? null : null);
      });
  }, [data.raceRef?.name, data.raceRef?.source, data.subraceRef?.name, data.subraceRef?.source]);

  // Feat catalog for the bonus-feat picker (2014 Variant Human "any feat" or a 2024 species Origin feat), fetched once
  const needsFeatCatalog = bonusGrant.grantsFeat || raceFeatCategory !== null;
  useEffect(() => {
    if (!needsFeatCatalog || allFeats.length > 0) return;
    fetch(`${import.meta.env.BASE_URL}data/feats.json`)
      .then(r => r.json())
      .then((json: { feat: FeatEntry[] }) => setAllFeats(json.feat));
  }, [needsFeatCatalog, allFeats.length]);

  // Debounced feat search
  useEffect(() => {
    if (featTimer.current) clearTimeout(featTimer.current);
    if (!featQuery.trim()) { setFeatResults([]); return; }
    featTimer.current = setTimeout(() => {
      const q = featQuery.toLowerCase();
      setFeatResults(allFeats.filter(f =>
        f.name.toLowerCase().includes(q) &&
        matchesEdition(f.source, f.reprintedAs, edition) &&
        // A 2024 species Origin-feat grant restricts the pick to that category.
        (!raceFeatCategory || featCategory(f.category) === featCategory(raceFeatCategory)),
      ).slice(0, 10));
    }, 150);
    return () => { if (featTimer.current) clearTimeout(featTimer.current); };
  }, [featQuery, allFeats, edition, raceFeatCategory]);

  const langGrant = mergeLanguageGrants(raceLangGrant, bgLangGrant);

  // Seed fixed languages once known (race + background may resolve at different times)
  useEffect(() => {
    if (langGrant.fixed.length === 0) return;
    const missing = langGrant.fixed.filter(l => !data.languages.includes(l));
    if (missing.length > 0) patch({ languages: [...data.languages, ...missing] });
  }, [langGrant.fixed.join('|')]);

  // Seed fixed tool proficiencies once the background resolves
  useEffect(() => {
    if (toolGrant.fixed.length === 0) return;
    const missing = toolGrant.fixed.filter(t => !data.tools.includes(t));
    if (missing.length > 0) patch({ tools: [...data.tools, ...missing] });
  }, [toolGrant.fixed.join('|')]);

  // Seed fixed race skill proficiencies (e.g. Elf → Perception) once the race resolves
  useEffect(() => {
    if (raceSkillGrant.fixed.length === 0) return;
    const missing = raceSkillGrant.fixed.filter(s => !data.skills.includes(s));
    if (missing.length > 0) patch({ skills: [...data.skills, ...missing] });
  }, [raceSkillGrant.fixed.join('|')]);

  // Drop any Expertise pick whose underlying skill proficiency was later removed.
  useEffect(() => {
    const valid = data.expertise.filter(s => data.skills.includes(s));
    if (valid.length !== data.expertise.length) patch({ expertise: valid });
  }, [data.skills.join('|')]);

  // Skills granted outside the class pick (background, race fixed/choice, race bonus) — locked
  // in the class list and excluded from the class-skill count so they never consume a class slot.
  const grantedElsewhere = (skill: string): boolean =>
    bgSkills.includes(skill) ||
    data.bgSkillChoices.includes(skill) ||
    raceSkillGrant.fixed.includes(skill) ||
    data.raceSkillChoices.includes(skill) ||
    skill === data.raceBonusSkill;

  const toggleSkill = (skill: string) => {
    if (grantedElsewhere(skill)) return; // locked elsewhere
    const already = data.skills.includes(skill);
    if (already) {
      patch({ skills: data.skills.filter(s => s !== skill) });
      return;
    }
    const classCount = classChoice?.count ?? 2;
    const classPicked = data.skills.filter(s => !grantedElsewhere(s));
    if (classPicked.length >= classCount) return; // already at max
    patch({ skills: [...data.skills, skill] });
  };

  const bgChoiceFrom = bgSkillGrant.choiceFrom.length > 0 ? bgSkillGrant.choiceFrom : ALL_SKILLS;
  const bgSkillsRemaining = bgSkillGrant.choiceCount - data.bgSkillChoices.length;

  const toggleBgSkill = (skill: string) => {
    const already = data.bgSkillChoices.includes(skill);
    if (already) {
      patch({
        bgSkillChoices: data.bgSkillChoices.filter(s => s !== skill),
        skills: data.skills.filter(s => s !== skill),
      });
      return;
    }
    // Can't pick a skill already granted elsewhere or already taken as a class skill.
    if (bgSkills.includes(skill) || raceSkillGrant.fixed.includes(skill) ||
        data.raceSkillChoices.includes(skill) || skill === data.raceBonusSkill ||
        data.skills.includes(skill)) return;
    if (bgSkillsRemaining <= 0) return;
    patch({ bgSkillChoices: [...data.bgSkillChoices, skill], skills: [...data.skills, skill] });
  };

  const raceChoiceFrom = raceSkillGrant.choiceFrom.length > 0 ? raceSkillGrant.choiceFrom : ALL_SKILLS;
  const raceSkillsRemaining = raceSkillGrant.choiceCount - data.raceSkillChoices.length;

  const toggleRaceSkill = (skill: string) => {
    const already = data.raceSkillChoices.includes(skill);
    if (already) {
      patch({
        raceSkillChoices: data.raceSkillChoices.filter(s => s !== skill),
        skills: data.skills.filter(s => s !== skill),
      });
      return;
    }
    // Can't pick a skill already granted by the background/race or already taken as a class skill.
    if (bgSkills.includes(skill) || raceSkillGrant.fixed.includes(skill) ||
        skill === data.raceBonusSkill || data.skills.includes(skill)) return;
    if (raceSkillsRemaining <= 0) return;
    patch({ raceSkillChoices: [...data.raceSkillChoices, skill], skills: [...data.skills, skill] });
  };

  const toggleRaceBonusSkill = (skill: string) => {
    if (bgSkills.includes(skill) || (data.skills.includes(skill) && skill !== data.raceBonusSkill)) return; // already granted elsewhere
    if (data.raceBonusSkill === skill) {
      patch({ raceBonusSkill: null, skills: data.skills.filter(s => s !== skill) });
      return;
    }
    const withoutOld = data.raceBonusSkill ? data.skills.filter(s => s !== data.raceBonusSkill) : data.skills;
    patch({ raceBonusSkill: skill, skills: [...withoutOld, skill] });
  };

  const chosenLanguages = data.languages.filter(l => !langGrant.fixed.includes(l));
  const languagesRemaining = langGrant.choiceCount - chosenLanguages.length;

  const toggleLanguage = (lang: string) => {
    if (langGrant.fixed.includes(lang)) return; // granted automatically, not a choice
    const already = data.languages.includes(lang);
    if (already) {
      patch({ languages: data.languages.filter(l => l !== lang) });
      return;
    }
    if (languagesRemaining <= 0) return;
    patch({ languages: [...data.languages, lang] });
  };

  const chosenTools = data.tools.filter(t => !toolGrant.fixed.includes(t));
  const toolsRemaining = toolGrant.choiceCount - chosenTools.length;

  const toggleTool = (tool: string) => {
    if (toolGrant.fixed.includes(tool)) return; // granted automatically, not a choice
    const already = data.tools.includes(tool);
    if (already) {
      patch({ tools: data.tools.filter(t => t !== tool) });
      return;
    }
    if (toolsRemaining <= 0) return;
    patch({ tools: [...data.tools, tool] });
  };

  const classCount = classChoice?.count ?? 2;
  const classPicked = data.skills.filter(s => !grantedElsewhere(s));
  const remaining = classCount - classPicked.length;

  // Proficiency/expertise choices from the race variant's bonus feat (if it grants any).
  const raceBonusFeatEntry = data.raceBonusFeat
    ? allFeats.find(f => f.name === data.raceBonusFeat!.name && f.source === data.raceBonusFeat!.source)
    : undefined;
  const raceBonusFeatProf = raceBonusFeatEntry ? parseFeatProficiencies(raceBonusFeatEntry) : null;

  // Expertise (Rogue L1/L6, Bard L3/L10) — chosen from the character's proficient skills.
  const expertiseMax = data.classRef ? expertiseCount(data.classRef.name, data.level) : 0;
  const expertiseRemaining = expertiseMax - data.expertise.length;
  const toggleExpertise = (skill: string) => {
    if (data.expertise.includes(skill)) {
      patch({ expertise: data.expertise.filter(s => s !== skill) });
      return;
    }
    if (expertiseRemaining <= 0 || !data.skills.includes(skill)) return;
    patch({ expertise: [...data.expertise, skill] });
  };

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

      {/* Background skills — fixed (locked) + any choose-a-skill grant */}
      {(bgSkills.length > 0 || bgSkillGrant.choiceCount > 0) && (
        <div className="space-y-3">
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

          {bgSkillGrant.choiceCount > 0 && (
            <div>
              <p className="text-xs text-[var(--color-faint)] mb-1.5 uppercase tracking-wide font-semibold">
                From background — choose {bgSkillGrant.choiceCount}
                {bgSkillsRemaining > 0 ? ` (${bgSkillsRemaining} remaining)` : ' — all chosen'}
              </p>
              <div className="flex flex-wrap gap-2">
                {bgChoiceFrom.map(skill => {
                  const picked = data.bgSkillChoices.includes(skill);
                  const locked = !picked && (
                    bgSkills.includes(skill) || raceSkillGrant.fixed.includes(skill) ||
                    data.raceSkillChoices.includes(skill) || skill === data.raceBonusSkill ||
                    data.skills.includes(skill) || bgSkillsRemaining <= 0
                  );
                  return (
                    <button
                      key={skill}
                      onClick={() => toggleBgSkill(skill)}
                      disabled={locked}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        picked
                          ? 'bg-amber-500 text-slate-900'
                          : locked
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
          )}
        </div>
      )}

      {/* Class skills — selectable */}
      <div>
        <p className="text-xs text-[var(--color-faint)] mb-1.5 uppercase tracking-wide font-semibold">
          From class
        </p>
        <div className="flex flex-wrap gap-2">
          {available.map(skill => {
            if (grantedElsewhere(skill)) return null; // granted elsewhere (bg/race) — shown in its own section
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

      {/* Race skill proficiencies (fixed + choice, from the race's skillProficiencies block) */}
      {(raceSkillGrant.fixed.length > 0 || raceSkillGrant.choiceCount > 0) && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold">From race</h2>

          {raceSkillGrant.fixed.length > 0 && (
            <div>
              <p className="text-xs text-[var(--color-faint)] mb-1.5 uppercase tracking-wide font-semibold">
                Automatic
              </p>
              <div className="flex flex-wrap gap-2">
                {raceSkillGrant.fixed.map(s => (
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

          {raceSkillGrant.choiceCount > 0 && (
            <div>
              <p className="text-xs text-[var(--color-faint)] mb-1.5 uppercase tracking-wide font-semibold">
                Choose {raceSkillGrant.choiceCount}
                {raceSkillsRemaining > 0 ? ` (${raceSkillsRemaining} remaining)` : ' — all chosen'}
              </p>
              <div className="flex flex-wrap gap-2">
                {raceChoiceFrom.map(skill => {
                  const picked = data.raceSkillChoices.includes(skill);
                  const locked = !picked && (
                    bgSkills.includes(skill) || raceSkillGrant.fixed.includes(skill) ||
                    skill === data.raceBonusSkill || data.skills.includes(skill) ||
                    raceSkillsRemaining <= 0
                  );
                  return (
                    <button
                      key={skill}
                      onClick={() => toggleRaceSkill(skill)}
                      disabled={locked}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        picked
                          ? 'bg-amber-500 text-slate-900'
                          : locked
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
          )}
        </div>
      )}

      {/* Race/subrace bonus skill + feat (2014 Variant Human "any feat", or a 2024 species Origin feat) */}
      {(bonusGrant.grantsSkill || bonusGrant.grantsFeat || raceFeatCategory) && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold">From {subraceLabel}</h2>

          {bonusGrant.grantsSkill && (
            <div>
              <p className="text-xs text-[var(--color-faint)] mb-1.5 uppercase tracking-wide font-semibold">
                Choose 1 bonus skill {data.raceBonusSkill ? '— chosen' : ''}
              </p>
              <div className="flex flex-wrap gap-2">
                {ALL_SKILLS.map(skill => {
                  const picked = data.raceBonusSkill === skill;
                  const locked = !picked && (bgSkills.includes(skill) || data.skills.includes(skill));
                  return (
                    <button
                      key={skill}
                      onClick={() => toggleRaceBonusSkill(skill)}
                      disabled={locked}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        picked
                          ? 'bg-amber-500 text-slate-900'
                          : locked
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
          )}

          {(bonusGrant.grantsFeat || raceFeatCategory) && (
            <div>
              <p className="text-xs text-[var(--color-faint)] mb-1.5 uppercase tracking-wide font-semibold">
                {featCategory(raceFeatCategory ?? undefined) === 'origin' ? 'Choose 1 Origin feat' : 'Choose 1 bonus feat'}
              </p>
              {data.raceBonusFeat ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-[var(--color-card)] rounded-xl px-3 py-2">
                    <span className="text-sm font-medium">{data.raceBonusFeat.name}</span>
                    <button
                      onClick={() => patch({ raceBonusFeat: null, raceBonusFeatProfSel: EMPTY_FEAT_PROF_SELECTION })}
                      className="text-xs text-amber-500 font-semibold"
                    >
                      Change
                    </button>
                  </div>
                  {raceBonusFeatProf && raceBonusFeatProf.choices.length > 0 && (
                    <FeatProficiencyPicker
                      proficiencies={raceBonusFeatProf}
                      proficientSkills={data.skills}
                      value={data.raceBonusFeatProfSel}
                      onChange={sel => patch({ raceBonusFeatProfSel: sel })}
                    />
                  )}
                </div>
              ) : (
                <div>
                  <input
                    type="search"
                    placeholder="Search feats…"
                    value={featQuery}
                    onChange={e => setFeatQuery(e.target.value)}
                    className="w-full bg-[var(--color-card)] rounded-lg px-3 py-2 text-sm outline-none placeholder:text-[var(--color-faint)] focus:ring-1 focus:ring-[var(--color-gold-lt)]"
                  />
                  {featResults.length > 0 && (
                    <div className="mt-1 bg-[var(--color-card)] rounded-xl overflow-hidden divide-y divide-[var(--color-border)]">
                      {featResults.map(feat => (
                        <button
                          key={`${feat.name}|${feat.source}`}
                          onClick={() => { patch({ raceBonusFeat: { name: feat.name, source: feat.source }, raceBonusFeatProfSel: EMPTY_FEAT_PROF_SELECTION }); setFeatQuery(''); setFeatResults([]); }}
                          className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-white/5"
                        >
                          <span className="text-sm font-medium">{feat.name}</span>
                          <span className="text-xs text-[var(--color-disabled)] ml-2 shrink-0">{feat.source}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Languages */}
      {(langGrant.fixed.length > 0 || langGrant.choiceCount > 0) && (
        <div>
          <h2 className="text-base font-semibold mb-1">Languages</h2>

          {langGrant.fixed.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-[var(--color-faint)] mb-1.5 uppercase tracking-wide font-semibold">
                From race &amp; background (automatic)
              </p>
              <div className="flex flex-wrap gap-2">
                {langGrant.fixed.map(l => (
                  <span
                    key={l}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  >
                    {l}
                  </span>
                ))}
              </div>
            </div>
          )}

          {langGrant.choiceCount > 0 && (
            <div>
              <p className="text-xs text-[var(--color-faint)] mb-1.5 uppercase tracking-wide font-semibold">
                Choose {langGrant.choiceCount} more
                {languagesRemaining > 0 ? ` (${languagesRemaining} remaining)` : ' — all chosen'}
              </p>
              <div className="flex flex-wrap gap-2">
                {ALL_LANGUAGES.filter(l => !langGrant.fixed.includes(l)).map(lang => {
                  const picked = chosenLanguages.includes(lang);
                  const atMax = !picked && languagesRemaining <= 0;
                  return (
                    <button
                      key={lang}
                      onClick={() => toggleLanguage(lang)}
                      disabled={atMax}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        picked
                          ? 'bg-amber-500 text-slate-900'
                          : atMax
                          ? 'bg-[var(--color-card)] text-[var(--color-disabled)] cursor-not-allowed'
                          : 'bg-[var(--color-card)] text-[var(--color-text-2)] hover:bg-[var(--color-raised)]'
                      }`}
                    >
                      {lang}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tools */}
      {(toolGrant.fixed.length > 0 || toolGrant.choiceCount > 0) && (
        <div>
          <h2 className="text-base font-semibold mb-1">Tool Proficiencies</h2>

          {toolGrant.fixed.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-[var(--color-faint)] mb-1.5 uppercase tracking-wide font-semibold">
                From background (automatic)
              </p>
              <div className="flex flex-wrap gap-2">
                {toolGrant.fixed.map(t => (
                  <span
                    key={t}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {toolGrant.choiceCount > 0 && (
            <div>
              <p className="text-xs text-[var(--color-faint)] mb-1.5 uppercase tracking-wide font-semibold">
                Choose {toolGrant.choiceCount} more
                {toolsRemaining > 0 ? ` (${toolsRemaining} remaining)` : ' — all chosen'}
              </p>
              <div className="flex flex-wrap gap-2">
                {ALL_TOOLS.filter(t => !toolGrant.fixed.includes(t)).map(tool => {
                  const picked = chosenTools.includes(tool);
                  const atMax = !picked && toolsRemaining <= 0;
                  return (
                    <button
                      key={tool}
                      onClick={() => toggleTool(tool)}
                      disabled={atMax}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        picked
                          ? 'bg-amber-500 text-slate-900'
                          : atMax
                          ? 'bg-[var(--color-card)] text-[var(--color-disabled)] cursor-not-allowed'
                          : 'bg-[var(--color-card)] text-[var(--color-text-2)] hover:bg-[var(--color-raised)]'
                      }`}
                    >
                      {tool}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expertise (Rogue/Bard) — double proficiency bonus on chosen proficient skills */}
      {expertiseMax > 0 && (
        <div>
          <h2 className="text-base font-semibold">Expertise</h2>
          <p className="text-xs text-[var(--color-faint)] mt-1 mb-2">
            Choose {expertiseMax} of your proficient skills to gain Expertise (doubles the
            proficiency bonus).{' '}
            {expertiseRemaining > 0 ? `(${expertiseRemaining} remaining)` : '— all chosen'}
          </p>
          {data.skills.length === 0 ? (
            <p className="text-xs text-[var(--color-disabled)]">Choose your skill proficiencies above first.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.skills.map(skill => {
                const picked = data.expertise.includes(skill);
                const atMax = !picked && expertiseRemaining <= 0;
                return (
                  <button
                    key={skill}
                    onClick={() => toggleExpertise(skill)}
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
          )}
        </div>
      )}

      {/* Class/subclass option-choices (Fighting Style, Invocations, Elemental Disciplines, …) */}
      <ClassOptionsPicker data={data} patch={patch} />

      {/* 2024 Weapon Mastery — choose N weapons (martials only) */}
      <WeaponMasteryPicker data={data} patch={patch} />
    </div>
  );
}
