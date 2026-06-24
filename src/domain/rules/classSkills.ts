/** How many skills each class may choose, and from which list. */
export interface ClassSkillChoice {
  count: number;
  from: string[]; // empty = any skill
}

const ANY: string[] = [];

export const CLASS_SKILLS: Record<string, ClassSkillChoice> = {
  Artificer: {
    count: 2,
    from: ['Arcana', 'History', 'Investigation', 'Medicine', 'Nature', 'Perception', 'Sleight of Hand'],
  },
  Barbarian: {
    count: 2,
    from: ['Animal Handling', 'Athletics', 'Intimidation', 'Nature', 'Perception', 'Survival'],
  },
  Bard:    { count: 3, from: ANY },
  Cleric: {
    count: 2,
    from: ['History', 'Insight', 'Medicine', 'Persuasion', 'Religion'],
  },
  Druid: {
    count: 2,
    from: ['Arcana', 'Animal Handling', 'Insight', 'Medicine', 'Nature', 'Perception', 'Religion', 'Survival'],
  },
  Fighter: {
    count: 2,
    from: ['Acrobatics', 'Animal Handling', 'Athletics', 'History', 'Insight', 'Intimidation', 'Perception', 'Survival'],
  },
  Monk: {
    count: 2,
    from: ['Acrobatics', 'Athletics', 'History', 'Insight', 'Religion', 'Stealth'],
  },
  Paladin: {
    count: 2,
    from: ['Athletics', 'Insight', 'Intimidation', 'Medicine', 'Persuasion', 'Religion'],
  },
  Ranger: {
    count: 3,
    from: ['Animal Handling', 'Athletics', 'Insight', 'Investigation', 'Nature', 'Perception', 'Stealth', 'Survival'],
  },
  Rogue: {
    count: 4,
    from: [
      'Acrobatics', 'Athletics', 'Deception', 'Insight', 'Intimidation',
      'Investigation', 'Perception', 'Performance', 'Persuasion', 'Sleight of Hand', 'Stealth',
    ],
  },
  Sorcerer: {
    count: 2,
    from: ['Arcana', 'Deception', 'Insight', 'Intimidation', 'Persuasion', 'Religion'],
  },
  Warlock: {
    count: 2,
    from: ['Arcana', 'Deception', 'History', 'Intimidation', 'Investigation', 'Nature', 'Religion'],
  },
  Wizard: {
    count: 2,
    from: ['Arcana', 'History', 'Insight', 'Investigation', 'Medicine', 'Religion'],
  },
};

export const ALL_SKILLS = [
  'Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception',
  'History', 'Insight', 'Intimidation', 'Investigation', 'Medicine',
  'Nature', 'Perception', 'Performance', 'Persuasion', 'Religion',
  'Sleight of Hand', 'Stealth', 'Survival',
];
