import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCharacterStore } from '../../stores/characterStore';
import type { Character } from '../../domain/character/types';
import { abilityMod, totalLevel } from '../../domain/rules';
import { classSummary } from '../../domain/character/format';
import { useCharacterAc } from './useCharacterAc';

function classLabel(c: Character): string {
  return classSummary(c.classes);
}

function hpPct(c: Character): number {
  return c.hp.max === 0 ? 0 : Math.round((c.hp.current / c.hp.max) * 100);
}

function hpColor(pct: number): string {
  if (pct > 60) return '#5ec27a';
  if (pct > 25) return '#e0c34a';
  return '#e0556b';
}

interface CharacterCardProps {
  character: Character;
  onOpen: () => void;
  onDelete: () => void;
}

function CharacterCard({ character: c, onOpen, onDelete }: CharacterCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const pct = hpPct(c);
  const conMod = abilityMod(c.abilityScores.con);
  // Armor class: resolved worn armor + shield, else override, else unarmored (incl. Barb/Monk).
  const ac = useCharacterAc(c);
  const initial = c.name[0]?.toUpperCase() ?? '?';

  return (
    <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 18, overflow: 'hidden' }}>
      {/* Clickable content area */}
      <div
        onClick={onOpen}
        style={{ padding: '14px 15px', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          {/* Avatar */}
          <div style={{
            width: 44, height: 44, borderRadius: 13, flexShrink: 0,
            background: 'linear-gradient(135deg,#b87333,#6b3a1f)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 18, color: '#fff',
          }}>
            {initial}
          </div>

          {/* Name + subtitle */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-.01em', lineHeight: 1.2 }}>{c.name}</h2>
            <p style={{ fontSize: 11.5, color: 'var(--color-muted)', marginTop: 2, fontWeight: 500 }}>
              {c.race.name} · {classLabel(c)} · Lv {totalLevel(c.classes)}
            </p>
          </div>

          {/* HP */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <span style={{ fontFamily: "'Spline Sans Mono', monospace", fontSize: 20, fontWeight: 700, color: hpColor(pct) }}>{c.hp.current}</span>
            <span style={{ fontSize: 13, color: 'var(--color-faint)' }}>/{c.hp.max}</span>
            <p style={{ fontSize: 10, color: 'var(--color-faint)', marginTop: 1 }}>HP</p>
          </div>
        </div>

        {/* HP bar */}
        <div style={{ marginTop: 12, height: 4, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: hpColor(pct), borderRadius: 3, transition: 'width .3s' }} />
        </div>

        {/* Quick stats */}
        <div style={{ marginTop: 9, display: 'flex', gap: 12 }}>
          {[
            { label: 'AC', val: String(ac) },
            { label: 'CON', val: `${conMod >= 0 ? '+' : ''}${conMod}` },
            ...(c.resources.length > 0 ? [{ label: 'Resources', val: String(c.resources.length) }] : []),
            ...(c.knownSpells.length > 0 || c.preparedSpells.length > 0
              ? [{ label: 'Spells', val: String(c.knownSpells.length || c.preparedSpells.length) }]
              : []),
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <span style={{ fontFamily: "'Spline Sans Mono', monospace", fontSize: 14, fontWeight: 600, color: 'var(--color-text-2)' }}>{s.val}</span>
              <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--color-faint)' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Delete row */}
      <div
        style={{ borderTop: '1px solid var(--color-border)', padding: '8px 15px', display: 'flex', justifyContent: 'flex-end' }}
        onClick={e => e.stopPropagation()}
      >
        {confirmDelete ? (
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', fontSize: 12.5 }}>
            <span style={{ color: 'var(--color-muted)' }}>Delete {c.name}?</span>
            <button onClick={onDelete} style={{ color: '#e0556b', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5 }}>Yes</button>
            <button onClick={() => setConfirmDelete(false)} style={{ color: 'var(--color-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5 }}>No</button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--color-disabled)', background: 'none', border: 'none', cursor: 'pointer', padding: '3px 0', fontFamily: 'inherit' }}
          >
            <span className="msym" style={{ fontSize: 16 }}>delete</span>
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

export function CharacterListPage() {
  const navigate = useNavigate();
  const { characters, loaded, load, remove, exportAll, importAll } = useCharacterStore();
  const importRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => { if (!loaded) load(); }, [loaded, load]);

  const handleExport = () => {
    const json = exportAll();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dnd-characters-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      await importAll(text);
      setImportError(null);
    } catch {
      setImportError('Invalid file — could not import characters.');
    }
    e.target.value = '';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'var(--color-app)', borderBottom: '1px solid var(--color-border)',
        padding: '10px 14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="msym" style={{ fontSize: 22, color: '#d08c4a' }}>groups</span>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-.01em', flex: 1 }}>Party</h1>
          <button
            onClick={() => navigate('/characters/new')}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: '#b87333', color: '#1a1206',
              fontWeight: 700, fontSize: 13, padding: '9px 16px',
              borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <span className="msym" style={{ fontSize: 17 }}>add</span>
            New
          </button>
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
          <button
            onClick={handleExport}
            disabled={characters.length === 0}
            style={{ fontSize: 12, color: 'var(--color-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: characters.length === 0 ? 0.3 : 1 }}
          >
            Export JSON
          </button>
          <button
            onClick={() => importRef.current?.click()}
            style={{ fontSize: 12, color: '#d08c4a', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Import JSON
          </button>
          <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
        </div>
        {importError && <p style={{ fontSize: 12, color: '#e0556b', marginTop: 6 }}>{importError}</p>}
      </div>

      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 11 }}>
        {!loaded && (
          <p style={{ textAlign: 'center', color: 'var(--color-faint)', fontSize: 13, padding: '48px 0' }}>Loading…</p>
        )}

        {loaded && characters.length === 0 && (
          <div style={{ textAlign: 'center', padding: '56px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <span className="msym" style={{ fontSize: 48, color: 'var(--color-disabled)' }}>person_off</span>
            <p style={{ color: 'var(--color-muted)', fontSize: 14 }}>No characters yet.</p>
            <button
              onClick={() => navigate('/characters/new')}
              style={{ color: '#d08c4a', fontSize: 13, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Create your first character
            </button>
          </div>
        )}

        {characters.map(c => (
          <CharacterCard
            key={c.id}
            character={c}
            onOpen={() => navigate(`/characters/${c.id}`)}
            onDelete={() => remove(c.id)}
          />
        ))}
      </div>
    </div>
  );
}
