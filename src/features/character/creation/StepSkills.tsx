import { useEffect, useRef, useState } from 'react';
import { CLASS_SKILLS, ALL_SKILLS } from '../../../domain/rules/classSkills';
import { ALL_LANGUAGES, parseLanguageGrant, mergeLanguageGrants, type LanguageGrant } from '../../../domain/rules/languages';
import { ALL_TOOLS, parseToolGrant, type ToolGrant } from '../../../domain/rules/tools';
import { buildRaceOptions, type RawRace, type RawSubrace } from '../../../domain/reference/races';
import { parseBonusSkillAndFeatGrant } from '../../../domain/rules/raceGrants';
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
  race: Array<{ name: string; source: string; languageProficiencies?: unknown }>;
}

interface FeatEntry {
  name: string;
  source: string;
}

export function StepSkills({ data, patch }: StepSkillsProps) {
  const [bgSkills, setBgSkills] = useState<string[]>([]);
  const [bgLangGrant, setBgLangGrant] = useState<LanguageGrant>({ fixed: [], choiceCount: 0 });
  const [raceLangGrant, setRaceLangGrant] = useState<LanguageGrant>({ fixed: [], choiceCount: 0 });
  const [toolGrant, setToolGrant] = useState<ToolGrant>({ fixed: [], choiceCount: 0 });

  // Race/subrace bonus skill + feat (e.g. Variant Human) — shape-detected, see raceGrants.ts
  const [bonusGrant, setBonusGrant] = useState({ grantsSkill: false, grantsFeat: false });
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
        setBgLangGrant(parseLanguageGrant(bg?.languageProficiencies));
        setToolGrant(parseToolGrant(bg?.toolProficiencies));
      });
  }, [data.backgroundRef?.name]);

  // Fetch race languages once the race is selected
  useEffect(() => {
    if (!data.raceRef) return;
    fetch(`${import.meta.env.BASE_URL}data/races.json`)
      .then(r => r.json())
      .then((json: RaceJson) => {
        const race = json.race.find(r => r.name === data.raceRef!.name && r.source === data.raceRef!.source);
        setRaceLangGrant(parseLanguageGrant(race?.languageProficiencies));
      });
  }, [data.raceRef?.name]);

  // Race/subrace bonus skill + feat (e.g. Variant Human) — detected by trait shape, not name
  useEffect(() => {
    if (!data.raceRef) { setBonusGrant({ grantsSkill: false, grantsFeat: false }); setSubraceLabel(''); return; }
    fetch(`${import.meta.env.BASE_URL}data/races.json`)
      .then(r => r.json())
      .then((json: { race: RawRace[]; subrace: RawSubrace[] }) => {
        const options = buildRaceOptions(json.race, json.subrace);
        const opt = data.subraceRef
          ? options.find(o => o.subraceName === data.subraceRef!.name && o.subraceSource === data.subraceRef!.source)
          : options.find(o => !o.subraceName && o.raceName === data.raceRef!.name && o.raceSource === data.raceRef!.source);
        setSubraceLabel(opt?.name ?? '');
        setBonusGrant(opt ? parseBonusSkillAndFeatGrant(opt.entries) : { grantsSkill: false, grantsFeat: false });
      });
  }, [data.raceRef?.name, data.raceRef?.source, data.subraceRef?.name, data.subraceRef?.source]);

  // Feat catalog for the bonus-feat picker, fetched once
  useEffect(() => {
    if (!bonusGrant.grantsFeat || allFeats.length > 0) return;
    fetch(`${import.meta.env.BASE_URL}data/feats.json`)
      .then(r => r.json())
      .then((json: { feat: FeatEntry[] }) => setAllFeats(json.feat));
  }, [bonusGrant.grantsFeat, allFeats.length]);

  // Debounced feat search
  useEffect(() => {
    if (featTimer.current) clearTimeout(featTimer.current);
    if (!featQuery.trim()) { setFeatResults([]); return; }
    featTimer.current = setTimeout(() => {
      const q = featQuery.toLowerCase();
      setFeatResults(allFeats.filter(f => f.name.toLowerCase().includes(q)).slice(0, 10));
    }, 150);
    return () => { if (featTimer.current) clearTimeout(featTimer.current); };
  }, [featQuery, allFeats]);

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

  const toggleSkill = (skill: string) => {
    if (bgSkills.includes(skill) || skill === data.raceBonusSkill) return; // locked elsewhere
    const already = data.skills.includes(skill);
    if (already) {
      patch({ skills: data.skills.filter(s => s !== skill) });
      return;
    }
    const classCount = classChoice?.count ?? 2;
    const classPicked = data.skills.filter(s => !bgSkills.includes(s) && s !== data.raceBonusSkill);
    if (classPicked.length >= classCount) return; // already at max
    patch({ skills: [...data.skills, skill] });
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
  const classPicked = data.skills.filter(s => !bgSkills.includes(s) && s !== data.raceBonusSkill);
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
            if (isBg || skill === data.raceBonusSkill) return null; // shown above already
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

      {/* Race/subrace bonus skill + feat (e.g. Variant Human) */}
      {(bonusGrant.grantsSkill || bonusGrant.grantsFeat) && (
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

          {bonusGrant.grantsFeat && (
            <div>
              <p className="text-xs text-[var(--color-faint)] mb-1.5 uppercase tracking-wide font-semibold">
                Choose 1 bonus feat
              </p>
              {data.raceBonusFeat ? (
                <div className="flex items-center justify-between bg-[var(--color-card)] rounded-xl px-3 py-2">
                  <span className="text-sm font-medium">{data.raceBonusFeat.name}</span>
                  <button
                    onClick={() => patch({ raceBonusFeat: null })}
                    className="text-xs text-amber-500 font-semibold"
                  >
                    Change
                  </button>
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
                          onClick={() => { patch({ raceBonusFeat: { name: feat.name, source: feat.source } }); setFeatQuery(''); setFeatResults([]); }}
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
    </div>
  );
}
