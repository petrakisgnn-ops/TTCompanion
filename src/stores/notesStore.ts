import { create } from 'zustand';
import { dexieDmRepository } from '../data/repositories/DexieDmRepository';
import type { SessionNote } from '../domain/dm/types';

interface NotesStore {
  notes: SessionNote[];
  loaded: boolean;

  load: () => Promise<void>;
  createNote: (title: string) => Promise<SessionNote>;
  updateNote: (id: string, patch: Partial<Pick<SessionNote, 'title' | 'body'>>) => Promise<void>;
  removeNote: (id: string) => Promise<void>;
}

export const useNotesStore = create<NotesStore>()((set, get) => ({
  notes: [],
  loaded: false,

  load: async () => {
    const notes = await dexieDmRepository.listNotes();
    set({ notes: notes.sort((a, b) => b.updatedAt - a.updatedAt), loaded: true });
  },

  createNote: async (title) => {
    const now = Date.now();
    const note: SessionNote = { id: crypto.randomUUID(), title, body: '', createdAt: now, updatedAt: now };
    await dexieDmRepository.saveNote(note);
    set(s => ({ notes: [note, ...s.notes] }));
    return note;
  },

  updateNote: async (id, patch) => {
    const note = get().notes.find(n => n.id === id);
    if (!note) return;
    const updated: SessionNote = { ...note, ...patch, updatedAt: Date.now() };
    await dexieDmRepository.saveNote(updated);
    set(s => ({
      notes: s.notes.map(n => n.id === id ? updated : n).sort((a, b) => b.updatedAt - a.updatedAt),
    }));
  },

  removeNote: async (id) => {
    await dexieDmRepository.removeNote(id);
    set(s => ({ notes: s.notes.filter(n => n.id !== id) }));
  },
}));
