import { useEffect, useState } from 'react';
import { useCharacterStore } from '../stores/characterStore';
import { registerWidget } from './registry';
import type { WidgetProps } from './registry';
import { db } from '../data/db';
import { refKey } from '../domain/reference/types';
import type { StoredSpell } from '../data/db';

function ConcentrationWidget({ character }: WidgetProps) {
  const { setConcentration } = useCharacterStore();
  const [picking, setPicking] = useState(false);
  const [concSpells, setConcSpells] = useState<StoredSpell[]>([]);

  // Resolve known/prepared spells that have concentration
  const refs = character.knownSpells.length > 0 ? character.knownSpells : character.preparedSpells;

  useEffect(() => {
    if (refs.length === 0) { setConcSpells([]); return; }
    const keys = refs.map(refKey);
    db.spells.bulkGet(keys).then(results => {
      const conc = results.filter((s): s is StoredSpell => {
        if (!s) return false;
        // concentration spells: components.c = true
        const c = s as unknown as Record<string, unknown>;
        const comps = c.components as Record<string, unknown> | undefined;
        return !!(comps?.c) || !!(c.meta);
      });
      setConcSpells(conc);
    });
  }, [refs.length]);

  if (character.concentration) {
    return (
      <div style={{ padding: '11px 14px 13px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: '#a78bfa', marginBottom: 3 }}>
            Concentrating
          </p>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {character.concentration.name}
          </p>
        </div>
        <button
          onClick={() => setConcentration(character.id, null)}
          style={{
            flexShrink: 0, padding: '8px 14px', borderRadius: 10,
            background: 'rgba(224,85,107,.12)', border: '1px solid rgba(224,85,107,.3)',
            color: '#e0556b', fontSize: 12.5, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          End
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '11px 14px 13px' }}>
      {!picking ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <p style={{ fontSize: 13, color: 'var(--color-faint)', fontStyle: 'italic' }}>Not concentrating.</p>
          {concSpells.length > 0 && (
            <button
              onClick={() => setPicking(true)}
              style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
                padding: '7px 12px', borderRadius: 10,
                background: 'rgba(167,139,250,.12)', border: '1px solid rgba(167,139,250,.3)',
                color: '#a78bfa', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <span className="msym" style={{ fontSize: 15 }}>lens_blur</span>
              Concentrate
            </button>
          )}
          {concSpells.length === 0 && refs.length === 0 && (
            <span style={{ fontSize: 11, color: 'var(--color-disabled)' }}>No spells known</span>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--color-muted)' }}>
              Choose a spell
            </span>
            <button onClick={() => setPicking(false)} style={{ fontSize: 12, color: 'var(--color-faint)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancel
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 180, overflowY: 'auto' }}>
            {concSpells.map(spell => (
              <button
                key={spell._key}
                onClick={() => {
                  setConcentration(character.id, { name: spell.name, source: spell.source });
                  setPicking(false);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '9px 11px', borderRadius: 10, textAlign: 'left',
                  background: 'var(--color-card-inner)', border: '1px solid var(--color-border)',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <span className="msym" style={{ fontSize: 16, color: '#a78bfa' }}>lens_blur</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-2)', flex: 1 }}>{spell.name}</span>
                <span style={{ fontSize: 11, color: 'var(--color-faint)' }}>
                  {spell.level === 0 ? 'Cantrip' : `Lv ${spell.level}`}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

registerWidget({
  typeId: 'concentration',
  label: 'Concentration',
  icon: 'lens_blur',
  defaultConfig: {},
  defaultSpan: 2,
  component: ConcentrationWidget,
});
