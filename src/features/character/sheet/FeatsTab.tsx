import { useEffect, useRef, useState } from 'react';
import { renderEntries } from '../../../rendering';
import type { Entry } from '../../../domain/reference/types';
import { useCharacterStore } from '../../../stores/characterStore';
import type { Character, AbilityScores } from '../../../domain/character/types';
import { parseFeatAbility, type FeatAbilityGrant } from '../../../domain/rules/featAbility';

interface FeatEntry {
  name: string;
  source: string;
  prerequisite?: unknown[];
  ability?: unknown;
  entries?: Entry[];
}

interface FeatsTabProps { character: Character }

function prereqLabel(prerequisite: unknown[] | undefined): string | null {
  if (!prerequisite || prerequisite.length === 0) return null;
  const parts: string[] = [];
  for (const p of prerequisite as Record<string, unknown>[]) {
    if (p.level != null) parts.push(`Level ${(p.level as { level?: number }).level ?? p.level}`);
    if (p.race) parts.push(`Race: ${JSON.stringify(p.race)}`);
    if (p.ability) parts.push('Ability score requirement');
    if (p.spellcasting) parts.push('Spellcasting');
    if (p.campaign) parts.push('Campaign specific');
    if (p.other) parts.push(String(p.other));
  }
  return parts.length > 0 ? parts.join(', ') : null;
}

export function FeatsTab({ character }: FeatsTabProps) {
  const { addFeat, removeFeat } = useCharacterStore();
  const [allFeats, setAllFeats] = useState<FeatEntry[]>([]);
  const [resolvedFeats, setResolvedFeats] = useState<FeatEntry[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FeatEntry[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showSearch, setShowSearch] = useState(false);
  // A half-feat with a *choice* increase (e.g. Resilient) parks here until the
  // player picks which ability; fixed-only half-feats apply immediately on add.
  const [pendingChoice, setPendingChoice] = useState<{ feat: FeatEntry; grant: FeatAbilityGrant } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finishAdd = (feat: FeatEntry, boosts?: Partial<AbilityScores>) => {
    addFeat(character.id, { name: feat.name, source: feat.source }, boosts);
    setPendingChoice(null);
    setQuery('');
    setResults([]);
  };

  const handlePick = (feat: FeatEntry) => {
    const grant = parseFeatAbility(feat.ability);
    if (grant?.choice) { setPendingChoice({ feat, grant }); return; }
    finishAdd(feat, grant?.fixed);
  };

  // Fetch feats.json once
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/feats.json`)
      .then(r => r.json())
      .then((json: { feat: FeatEntry[] }) => setAllFeats(json.feat));
  }, []);

  // Resolve character feats refs → full feat data
  useEffect(() => {
    if (allFeats.length === 0) return;
    const resolved = character.feats
      .map(ref => allFeats.find(f => f.name === ref.name && f.source === ref.source))
      .filter((f): f is FeatEntry => f !== undefined);
    setResolvedFeats(resolved);
  }, [character.feats, allFeats]);

  // Debounced search
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!query.trim()) { setResults([]); return; }
    timer.current = setTimeout(() => {
      const q = query.toLowerCase();
      const knownKeys = new Set(character.feats.map(f => `${f.name}|${f.source}`));
      setResults(
        allFeats
          .filter(f => f.name.toLowerCase().includes(q) && !knownKeys.has(`${f.name}|${f.source}`))
          .slice(0, 10),
      );
    }, 150);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query, allFeats, character.feats]);

  const toggleExpanded = (key: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--color-faint)]">{character.feats.length} feat{character.feats.length !== 1 ? 's' : ''}</span>
        <button
          onClick={() => { setShowSearch(v => !v); setQuery(''); setResults([]); }}
          className="text-xs text-amber-500 hover:text-amber-400 font-semibold"
        >
          {showSearch ? 'Done' : '+ Add Feat'}
        </button>
      </div>

      {showSearch && (
        <div>
          <input
            type="search"
            autoFocus
            placeholder="Search feats…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-[var(--color-card)] rounded-xl px-4 py-2.5 text-sm outline-none outline-none focus:ring-1 focus:ring-[var(--color-gold-lt)] placeholder:text-[var(--color-faint)]"
          />
          {results.length > 0 && (
            <div className="mt-1 bg-[var(--color-card)] rounded-xl overflow-hidden divide-y divide-[var(--color-border)]">
              {results.map(feat => {
                const pre = prereqLabel(feat.prerequisite);
                return (
                  <button
                    key={`${feat.name}|${feat.source}`}
                    onClick={() => handlePick(feat)}
                    className="w-full flex items-start justify-between px-4 py-2.5 text-left hover:bg-white/5"
                  >
                    <div>
                      <p className="text-sm font-medium">{feat.name}</p>
                      {pre && <p className="text-xs text-[var(--color-faint)] mt-0.5">Req: {pre}</p>}
                    </div>
                    <span className="text-xs text-[var(--color-disabled)] ml-2 shrink-0">{feat.source}</span>
                  </button>
                );
              })}
            </div>
          )}
          {query.trim() && results.length === 0 && (
            <p className="text-xs text-[var(--color-disabled)] mt-2 text-center">No feats found</p>
          )}
        </div>
      )}

      {/* Half-feat ability choice (Resilient, Fey Touched, ...) */}
      {pendingChoice && (
        <div className="bg-[var(--color-card)] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{pendingChoice.feat.name}</p>
            <button onClick={() => setPendingChoice(null)} className="text-xs text-[var(--color-faint)] hover:text-[var(--color-text)]">Cancel</button>
          </div>
          <p className="text-xs text-[var(--color-faint)]">
            Choose an ability to increase by {pendingChoice.grant.choice!.amount}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {pendingChoice.grant.choice!.from.map(key => {
              const current = character.abilityScores[key];
              const capped = current >= 20;
              return (
                <button
                  key={key}
                  disabled={capped}
                  onClick={() => {
                    const { fixed, choice } = pendingChoice.grant;
                    finishAdd(pendingChoice.feat, { ...fixed, [key]: (fixed[key] ?? 0) + choice!.amount });
                  }}
                  className={`py-2.5 rounded-xl text-sm transition-colors ${
                    capped
                      ? 'bg-[var(--color-raised)]/30 text-[var(--color-disabled)]'
                      : 'bg-[var(--color-raised)] hover:bg-[var(--color-card-inner)]'
                  }`}
                >
                  {key.toUpperCase()}
                  <span className="block text-xs opacity-70">{current} → {Math.min(20, current + pendingChoice.grant.choice!.amount)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {resolvedFeats.length === 0 && !showSearch && (
        <div className="text-center py-12 text-[var(--color-faint)] text-sm">
          No feats yet.
        </div>
      )}

      {/* Feat cards */}
      <div className="space-y-2">
        {resolvedFeats.map(feat => {
          const key = `${feat.name}|${feat.source}`;
          const isOpen = expanded.has(key);
          const pre = prereqLabel(feat.prerequisite);
          return (
            <div key={key} className="bg-[var(--color-card)] rounded-xl overflow-hidden">
              {/* Header row */}
              <div className="flex items-center">
                <button
                  onClick={() => toggleExpanded(key)}
                  className="flex-1 flex items-center justify-between px-4 py-3 text-left"
                >
                  <div>
                    <p className="font-semibold text-sm">{feat.name}</p>
                    {pre && <p className="text-xs text-[var(--color-faint)] mt-0.5">Req: {pre}</p>}
                  </div>
                  <span className="text-[var(--color-faint)] ml-2 text-xs">{isOpen ? '▲' : '▼'}</span>
                </button>
                <button
                  onClick={() => removeFeat(character.id, { name: feat.name, source: feat.source })}
                  className="px-3 py-3 text-[var(--color-disabled)] hover:text-red-400 transition-colors text-sm"
                  aria-label="Remove feat"
                >
                  ✕
                </button>
              </div>

              {/* Expanded description */}
              {isOpen && feat.entries && (
                <div className="px-4 pb-4 text-sm leading-relaxed text-[var(--color-text-2)] border-t border-[var(--color-border)] pt-3 space-y-1">
                  {renderEntries(feat.entries)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
