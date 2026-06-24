import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { renderEntries } from '../../rendering';
import type { Entry } from '../../domain/reference/types';

export interface RefEntry {
  key: string;
  name: string;
  source: string;
  subtitle?: string;
  tag?: string;
  tagColor?: string;
  entries?: Entry[];
  [k: string]: unknown;
}

interface Props {
  title: string;
  icon: string;
  items: RefEntry[];
  loading: boolean;
  detailPath?: string; // if set, navigate to detailPath/:key; otherwise show inline sheet
}

function DetailSheet({ item, onClose }: { item: RefEntry; onClose: () => void }) {
  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 30 }}
        onClick={onClose}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        background: 'var(--color-card)', border: '1px solid var(--color-border)',
        borderBottom: 'none', borderRadius: '20px 20px 0 0',
        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        animation: 'sheetUp .22s ease',
      }}>
        {/* Header */}
        <div style={{ flexShrink: 0, padding: '15px 16px 12px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-.01em' }}>{item.name}</h2>
            {item.subtitle && <p style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 3 }}>{item.subtitle}</p>}
          </div>
          {item.tag && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 8, background: item.tagColor ?? 'rgba(184,115,51,.2)', color: item.tagColor ? '#fff' : '#d08c4a', flexShrink: 0 }}>
              {item.tag}
            </span>
          )}
          <button
            onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--color-raised)', border: '1px solid var(--color-border)', color: 'var(--color-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <span className="msym" style={{ fontSize: 17 }}>close</span>
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 32px' }}>
          {item.entries && item.entries.length > 0
            ? renderEntries(item.entries)
            : <p style={{ color: 'var(--color-faint)', fontSize: 13 }}>No description available.</p>
          }
        </div>
      </div>
    </>
  );
}

export function ReferenceListPage({ title, icon, items, loading, detailPath }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<RefEntry | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? items.filter(i => i.name.toLowerCase().includes(query.toLowerCase()))
    : items;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header + search */}
      <div style={{ flexShrink: 0, position: 'sticky', top: 0, zIndex: 10, background: 'var(--color-app)', borderBottom: '1px solid var(--color-border)', padding: '10px 14px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
          <button onClick={() => navigate('/compendium')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <span className="msym" style={{ fontSize: 22, color: 'var(--color-muted)' }}>arrow_back</span>
          </button>
          <span className="msym" style={{ fontSize: 22, color: '#d08c4a' }}>{icon}</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-.01em', flex: 1 }}>{title}</span>
          {!loading && <span style={{ fontSize: 12, color: 'var(--color-faint)', fontFamily: "'Spline Sans Mono', monospace" }}>{items.length}</span>}
        </div>
        <div style={{ position: 'relative' }}>
          <span className="msym" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: 'var(--color-faint)', pointerEvents: 'none' }}>search</span>
          <input
            ref={inputRef}
            type="search"
            placeholder={`Search ${title.toLowerCase()}…`}
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              width: '100%', padding: '9px 12px 9px 36px', borderRadius: 12,
              background: 'var(--color-card-inner)', border: '1px solid var(--color-border)',
              color: 'var(--color-text)', fontSize: 14, fontFamily: 'inherit',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
        {loading && <p style={{ padding: '48px 0', textAlign: 'center', color: 'var(--color-faint)', fontSize: 13 }}>Loading…</p>}
        {!loading && filtered.length === 0 && <p style={{ padding: '48px 0', textAlign: 'center', color: 'var(--color-faint)', fontSize: 13 }}>No results.</p>}
        {filtered.map(item => (
          <button
            key={item.key}
            onClick={() => detailPath ? navigate(`${detailPath}/${encodeURIComponent(item.key)}`) : setSelected(item)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px', textAlign: 'left', background: 'none', border: 'none',
              borderBottom: '1px solid var(--color-border)', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
              {item.subtitle && <p style={{ fontSize: 11.5, color: 'var(--color-muted)', marginTop: 2 }}>{item.subtitle}</p>}
            </div>
            {item.tag && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 7, background: item.tagColor ?? 'rgba(184,115,51,.15)', color: item.tagColor ? '#fff' : '#d08c4a', flexShrink: 0 }}>
                {item.tag}
              </span>
            )}
            <span className="msym" style={{ fontSize: 18, color: 'var(--color-disabled)', flexShrink: 0 }}>chevron_right</span>
          </button>
        ))}
      </div>

      {selected && <DetailSheet item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
