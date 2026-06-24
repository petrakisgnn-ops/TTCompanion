import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../data/db';
import type { StoredMonster } from '../../data/db';
import {
  monsterTypeStr, crStr, acStr, speedStr, alignmentStr,
} from '../../domain/reference/types';
import { abilityMod } from '../../domain/rules';
import { renderEntries } from '../../rendering';

const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
const ABILITY_LABELS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

function signedMod(score: number): string {
  const m = abilityMod(score);
  return `${m >= 0 ? '+' : ''}${m}`;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="border-t-2 border-amber-700 mt-3 pt-1">
      <h2 className="text-amber-500 font-bold text-sm uppercase tracking-wide">{title}</h2>
    </div>
  );
}

export function MonsterDetailPage() {
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const [monster, setMonster] = useState<StoredMonster | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!key) return;
    db.monsters.get(decodeURIComponent(key)).then(m => {
      if (m) setMonster(m);
      else setNotFound(true);
    });
  }, [key]);

  if (notFound) {
    return (
      <div className="p-4 text-slate-400 text-sm">
        Monster not found.{' '}
        <button onClick={() => navigate(-1)} className="text-amber-400 underline">Go back</button>
      </div>
    );
  }

  if (!monster) {
    return <div className="p-4 text-slate-400 text-sm animate-pulse">Loading…</div>;
  }

  const sizeLabel = monster.size.join('/');
  const typeLabel = monsterTypeStr(monster.type);
  const align = alignmentStr(monster.alignment);

  return (
    <div className="p-4 max-w-xl mx-auto text-sm">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="text-slate-400 text-sm mb-3 flex items-center gap-1 hover:text-slate-200"
      >
        ← Bestiary
      </button>

      {/* Name + meta */}
      <h1 className="text-2xl font-bold tracking-tight">{monster.name}</h1>
      <p className="text-slate-400 italic mb-3">
        {sizeLabel} {typeLabel}{align ? `, ${align}` : ''} · {monster.source}
      </p>

      {/* Core stats */}
      <div className="border-t-2 border-amber-700 pt-1 space-y-0.5">
        <p><span className="text-amber-500 font-semibold">Armor Class</span> {acStr(monster.ac)}</p>
        <p>
          <span className="text-amber-500 font-semibold">Hit Points</span>{' '}
          {monster.hp.average} ({monster.hp.formula})
        </p>
        <p>
          <span className="text-amber-500 font-semibold">Speed</span>{' '}
          {speedStr(monster.speed)}
        </p>
      </div>

      {/* Ability scores */}
      <div className="border-t-2 border-amber-700 mt-2 pt-2">
        <div className="grid grid-cols-6 text-center gap-1">
          {ABILITY_LABELS.map(lbl => (
            <div key={lbl} className="text-amber-500 font-semibold text-xs">{lbl}</div>
          ))}
          {ABILITY_KEYS.map(key => (
            <div key={key} className="text-xs">
              <div className="font-semibold">{monster[key]}</div>
              <div className="text-slate-400">({signedMod(monster[key])})</div>
            </div>
          ))}
        </div>
      </div>

      {/* Secondary stats */}
      <div className="border-t-2 border-amber-700 mt-2 pt-1 space-y-0.5">
        {monster.save && Object.keys(monster.save).length > 0 && (
          <p>
            <span className="text-amber-500 font-semibold">Saving Throws</span>{' '}
            {Object.entries(monster.save)
              .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)} ${v}`)
              .join(', ')}
          </p>
        )}
        {monster.skill && Object.keys(monster.skill).length > 0 && (
          <p>
            <span className="text-amber-500 font-semibold">Skills</span>{' '}
            {Object.entries(monster.skill)
              .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)} ${v}`)
              .join(', ')}
          </p>
        )}
        {monster.immune && monster.immune.length > 0 && (
          <p>
            <span className="text-amber-500 font-semibold">Damage Immunities</span>{' '}
            {(monster.immune as string[]).join(', ')}
          </p>
        )}
        {monster.resist && monster.resist.length > 0 && (
          <p>
            <span className="text-amber-500 font-semibold">Damage Resistances</span>{' '}
            {(monster.resist as string[]).join(', ')}
          </p>
        )}
        {monster.conditionImmune && monster.conditionImmune.length > 0 && (
          <p>
            <span className="text-amber-500 font-semibold">Condition Immunities</span>{' '}
            {(monster.conditionImmune as string[]).join(', ')}
          </p>
        )}
        {monster.senses && monster.senses.length > 0 && (
          <p>
            <span className="text-amber-500 font-semibold">Senses</span>{' '}
            {monster.senses.join(', ')}
            {monster.passive != null ? `, passive Perception ${monster.passive}` : ''}
          </p>
        )}
        {monster.languages && monster.languages.length > 0 && (
          <p>
            <span className="text-amber-500 font-semibold">Languages</span>{' '}
            {monster.languages.join(', ')}
          </p>
        )}
        <p>
          <span className="text-amber-500 font-semibold">Challenge</span>{' '}
          {crStr(monster.cr)}
        </p>
      </div>

      {/* Traits */}
      {monster.trait && monster.trait.length > 0 && (
        <>
          <SectionHeader title="Traits" />
          {monster.trait.map((t, i) => (
            <div key={i} className="mb-2">
              <p className="font-semibold italic">{t.name}.</p>
              {renderEntries(t.entries)}
            </div>
          ))}
        </>
      )}

      {/* Actions */}
      {monster.action && monster.action.length > 0 && (
        <>
          <SectionHeader title="Actions" />
          {monster.action.map((a, i) => (
            <div key={i} className="mb-2">
              <p className="font-semibold italic">{a.name}.</p>
              {renderEntries(a.entries)}
            </div>
          ))}
        </>
      )}

      {/* Reactions */}
      {monster.reaction && monster.reaction.length > 0 && (
        <>
          <SectionHeader title="Reactions" />
          {monster.reaction.map((r, i) => (
            <div key={i} className="mb-2">
              <p className="font-semibold italic">{r.name}.</p>
              {renderEntries(r.entries)}
            </div>
          ))}
        </>
      )}

      {/* Legendary */}
      {monster.legendary && monster.legendary.length > 0 && (
        <>
          <SectionHeader title="Legendary Actions" />
          {monster.legendaryHeader && (
            <div className="mb-2 leading-relaxed">{renderEntries(monster.legendaryHeader)}</div>
          )}
          {monster.legendary.map((l, i) => (
            <div key={i} className="mb-2">
              {l.name && <p className="font-semibold italic">{l.name}.</p>}
              {renderEntries(l.entries)}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
