import { useMemo } from 'react';
import type { ClassLevel } from '../../../domain/character/types';
import { subclassLevel } from '../../../domain/rules/classData';
import { useSettingsStore } from '../../../stores/settingsStore';
import { useFeatureChoices } from '../useCharacterFeatures';
import { FeatureChoiceList } from '../FeatureChoiceList';
import type { WizardData } from './CharacterWizard';

interface Props {
  data: WizardData;
  patch: (p: Partial<WizardData>) => void;
}

/** Creation-time picker for "choose one" class features reached by the starting level (e.g. a 2024 Cleric's Divine Order). */
export function FeatureChoicesPicker({ data, patch }: Props) {
  const edition = useSettingsStore(s => s.edition);
  const { classRef, subclassRef, level } = data;

  // Memoized so the feature hook only re-resolves when the class/subclass/level actually change.
  const classes = useMemo<ClassLevel[]>(() => {
    if (!classRef) return [];
    const subclass = subclassRef && level >= subclassLevel(classRef.name, edition) ? subclassRef : undefined;
    return [{ classRef, level, subclass }];
  }, [classRef, subclassRef, level, edition]);

  const choices = useFeatureChoices(classes, data.featureChoices);
  if (choices.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs text-[var(--color-faint)] uppercase tracking-wide font-semibold">Class feature choices</p>
      <FeatureChoiceList
        choices={choices}
        onChange={(choiceId, ids) => patch({ featureChoices: { ...data.featureChoices, [choiceId]: ids } })}
      />
    </div>
  );
}
