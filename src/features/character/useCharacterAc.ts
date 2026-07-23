import { useEffect, useState } from 'react';
import { db } from '../../data/db';
import { refKey } from '../../domain/reference/types';
import { characterAc } from '../../domain/rules';
import { armorClass, parseItemArmor, type ItemArmor } from '../../domain/rules/ac';
import type { Character } from '../../domain/character/types';

/**
 * A character's armor class with worn armor resolved from the item DB. Starts from the
 * synchronous unarmored/override value (`characterAc`) so there's never a flash of a wrong
 * number, then resolves the equipped armour + shield and recomputes via `armorClass`.
 */
export function useCharacterAc(character: Character | undefined): number {
  const [ac, setAc] = useState(() => (character ? characterAc(character) : 10));

  useEffect(() => {
    if (!character) return;
    let cancelled = false;
    (async () => {
      const equipped = character.inventory.filter(i => i.equipped);
      if (equipped.length === 0) {
        if (!cancelled) setAc(characterAc(character));
        return;
      }
      const items = await db.items.bulkGet(equipped.map(i => refKey(i.itemRef)));
      const armors = items
        .map(item => (item ? parseItemArmor(item) : null))
        .filter((a): a is ItemArmor => a !== null);
      const worn = armors.find(a => a.kind !== 'shield') ?? null;
      const shield = armors.find(a => a.kind === 'shield') ?? null;
      if (!cancelled) setAc(armorClass(character, worn, shield));
    })();
    return () => { cancelled = true; };
  }, [character?.inventory, character?.abilityScores, character?.classes, character?.dashboard.widgets]);

  return ac;
}
