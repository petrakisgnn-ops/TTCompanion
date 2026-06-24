export const CONDITIONS = [
  'Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened', 'Grappled',
  'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone',
  'Restrained', 'Stunned', 'Unconscious',
] as const;

export type Condition = (typeof CONDITIONS)[number];

export const CONDITION_COLOR: Record<string, string> = {
  Blinded:       'bg-slate-600 text-slate-200',
  Charmed:       'bg-pink-700/60 text-pink-200',
  Deafened:      'bg-slate-600 text-slate-200',
  Exhaustion:    'bg-red-800/60 text-red-200',
  Frightened:    'bg-purple-700/60 text-purple-200',
  Grappled:      'bg-orange-700/60 text-orange-200',
  Incapacitated: 'bg-red-700/60 text-red-200',
  Invisible:     'bg-sky-700/60 text-sky-200',
  Paralyzed:     'bg-red-800/60 text-red-200',
  Petrified:     'bg-stone-600/60 text-stone-200',
  Poisoned:      'bg-emerald-700/60 text-emerald-200',
  Prone:         'bg-amber-700/60 text-amber-200',
  Restrained:    'bg-orange-700/60 text-orange-200',
  Stunned:       'bg-violet-700/60 text-violet-200',
  Unconscious:   'bg-slate-700/60 text-slate-400',
};
