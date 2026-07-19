import { useState } from 'react';
import { ALL_LANGUAGES } from '../../../domain/rules/languages';
import { useCharacterStore } from '../../../stores/characterStore';
import type { Character } from '../../../domain/character/types';

interface LanguagesSectionProps { character: Character }

export function LanguagesSection({ character }: LanguagesSectionProps) {
  const { addLanguage, removeLanguage } = useCharacterStore();
  const [showPicker, setShowPicker] = useState(false);
  const languages = character.proficiencies.languages ?? [];

  return (
    <div className="space-y-2">
      {/* Known languages */}
      {languages.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {languages.map(lang => (
            <button
              key={lang}
              onClick={() => removeLanguage(character.id, lang)}
              className="text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 bg-[var(--color-card-inner)] text-[var(--color-text)] transition-opacity hover:opacity-80"
            >
              {lang}
              <span className="opacity-60 text-[10px]">✕</span>
            </button>
          ))}
        </div>
      )}

      {languages.length === 0 && !showPicker && (
        <p className="text-xs text-[var(--color-disabled)] italic">No known languages.</p>
      )}

      {/* Picker */}
      {showPicker ? (
        <div className="bg-[var(--color-raised)]/50 rounded-xl p-3 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {ALL_LANGUAGES.filter(l => !languages.includes(l)).map(lang => (
              <button
                key={lang}
                onClick={() => addLanguage(character.id, lang)}
                className="text-xs font-medium px-2.5 py-1 rounded-full bg-[var(--color-card-inner)] text-[var(--color-text)] transition-opacity hover:opacity-80"
              >
                {lang}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowPicker(false)}
            className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] w-full text-center pt-1"
          >
            Done
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowPicker(true)}
          className="text-xs text-amber-500 hover:text-amber-400 font-semibold"
        >
          + Add Language
        </button>
      )}
    </div>
  );
}
