import { useCharacterStore } from '../../../stores/characterStore';
import type { Character } from '../../../domain/character/types';
import { useFeatureChoices } from '../useCharacterFeatures';
import { FeatureChoiceList } from '../FeatureChoiceList';

/** Sheet section for the character's "choose one" class features (Divine Order, Totem Spirit, …). */
export function FeatureChoicesSection({ character }: { character: Character }) {
  const setFeatureChoice = useCharacterStore(s => s.setFeatureChoice);
  const choices = useFeatureChoices(character.classes, character.featureChoices);
  if (choices.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide">Feature Choices</h2>
      <FeatureChoiceList
        choices={choices}
        showClass={character.classes.length > 1}
        onChange={(choiceId, ids) => { void setFeatureChoice(character.id, choiceId, ids); }}
      />
    </div>
  );
}
