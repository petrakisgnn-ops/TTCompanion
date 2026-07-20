import { useEffect, useState } from 'react';
import { useNotesStore } from '../../stores/notesStore';
import { Sheet } from '../../ui/Sheet';

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--color-card-inner)', border: '1px solid var(--color-border)',
  borderRadius: 10, padding: '9px 12px', fontSize: 14, color: 'var(--color-text)',
  outline: 'none', fontFamily: 'inherit',
};

interface SessionNotesPanelProps {
  onClose: () => void;
}

export function SessionNotesPanel({ onClose }: SessionNotesPanelProps) {
  const { notes, loaded, load, createNote, updateNote, removeNote } = useNotesStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => { if (!loaded) load(); }, [loaded, load]);

  const active = notes.find(n => n.id === activeId) ?? null;

  useEffect(() => {
    if (active) { setTitle(active.title); setBody(active.body); }
  }, [active?.id]);

  useEffect(() => {
    if (!active || (title === active.title && body === active.body)) return;
    const t = setTimeout(() => updateNote(active.id, { title, body }), 500);
    return () => clearTimeout(t);
  }, [title, body, active, updateNote]);

  const newSession = async () => {
    const nextNum = notes.filter(n => /^Session \d+$/.test(n.title)).length + 1;
    const note = await createNote(`Session ${nextNum}`);
    setActiveId(note.id);
  };

  if (active) {
    return (
      <Sheet icon="edit_note" title="Session Notes" onClose={onClose}>
        <button
          onClick={() => setActiveId(null)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: 'var(--color-muted)', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10 }}
        >
          <span className="msym" style={{ fontSize: 17 }}>arrow_back</span> All sessions
        </button>
        <input value={title} onChange={e => setTitle(e.target.value)} style={{ ...inputStyle, fontSize: 15, fontWeight: 700, marginBottom: 10 }} />
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="What happened this session…"
          rows={14}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
        />
        <button
          onClick={async () => { if (window.confirm('Delete this session note?')) { await removeNote(active.id); setActiveId(null); } }}
          style={{ marginTop: 10, fontSize: 12, color: '#e0556b', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Delete session
        </button>
      </Sheet>
    );
  }

  const filtered = notes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) || n.body.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Sheet icon="edit_note" title="Session Notes" onClose={onClose}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input placeholder="Search notes…" value={search} onChange={e => setSearch(e.target.value)} style={inputStyle} />
        <button
          onClick={newSession}
          style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: '0 14px', borderRadius: 10, background: '#b87333', color: '#1a1206', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <span className="msym" style={{ fontSize: 17 }}>add</span> New
        </button>
      </div>

      {!loaded ? (
        <p style={{ fontSize: 12.5, color: 'var(--color-muted)' }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <p style={{ fontSize: 12.5, color: 'var(--color-faint)', textAlign: 'center', padding: '24px 0' }}>No session notes yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(n => (
            <button
              key={n.id}
              onClick={() => setActiveId(n.id)}
              style={{ textAlign: 'left', background: 'var(--color-card-inner)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '10px 12px', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--color-text)' }}>{n.title || 'Untitled'}</p>
              <p style={{ fontSize: 11.5, color: 'var(--color-faint)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {n.body || 'No content yet'} · {new Date(n.updatedAt).toLocaleDateString()}
              </p>
            </button>
          ))}
        </div>
      )}
    </Sheet>
  );
}
