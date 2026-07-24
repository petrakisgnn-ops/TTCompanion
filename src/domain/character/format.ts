import type { ClassLevel } from './types';

/**
 * Compact class line for a character summary, e.g. "Fighter (Battle Master) 5" or, multiclassed,
 * "Fighter (Battle Master) 5 / Wizard 2". The subclass is shown in parentheses when chosen.
 */
export function classSummary(classes: ClassLevel[]): string {
  return classes
    .map(cl => cl.subclass ? `${cl.classRef.name} (${cl.subclass.name}) ${cl.level}` : `${cl.classRef.name} ${cl.level}`)
    .join(' / ');
}
