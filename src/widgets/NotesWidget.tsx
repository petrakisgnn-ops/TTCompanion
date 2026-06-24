import { useState } from 'react';
import { useCharacterStore } from '../stores/characterStore';
import { registerWidget } from './registry';
import type { WidgetProps } from './registry';

function NotesWidget({ character }: WidgetProps) {
  const { mutate } = useCharacterStore();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(character.notes);

  const save = () => {
    mutate(character.id, c => ({ ...c, notes: val }));
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="p-3 space-y-2">
        <textarea
          value={val}
          onChange={e => setVal(e.target.value)}
          rows={5}
          autoFocus
          className="w-full bg-slate-700 rounded-lg p-2 text-sm resize-none outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-slate-600"
          placeholder="Notes…"
        />
        <div className="flex gap-2">
          <button onClick={save} className="flex-1 py-1.5 bg-amber-500 text-slate-900 font-semibold rounded-lg text-xs">Save</button>
          <button onClick={() => { setVal(character.notes); setEditing(false); }} className="px-3 py-1.5 bg-slate-700 rounded-lg text-xs text-slate-300">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="p-3 min-h-[5rem] cursor-pointer"
      onClick={() => setEditing(true)}
    >
      {character.notes ? (
        <p className="text-sm text-slate-300 whitespace-pre-wrap line-clamp-6">{character.notes}</p>
      ) : (
        <p className="text-sm text-slate-600">Tap to add notes…</p>
      )}
    </div>
  );
}

registerWidget({
  typeId: 'notes',
  label: 'Notes',
  icon: 'edit_note',
  defaultConfig: {},
  defaultSpan: 2,
  component: NotesWidget,
});
