import { registerHandler } from '../TagRegistry';

// Entity link tags — styled as tappable links; navigation wired in Phase 2.
const entityLink = (args: string[]) => (
  <span className="text-sky-400 cursor-pointer hover:underline">{args[0] ?? ''}</span>
);

const ENTITY_TAGS = [
  'spell', 'creature', 'monster', 'item', 'condition', 'disease',
  'feat', 'class', 'subclass', 'race', 'background', 'deity',
  'object', 'trap', 'hazard', 'vehicle', 'reward', 'psionic',
  'optfeature', 'table', 'variantrule', 'action', 'sense', 'skill',
  'language', 'charoption',
];

for (const tag of ENTITY_TAGS) {
  registerHandler(tag, entityLink);
}

// Navigation/reference tags — display text only, no navigation yet
const plainText = (args: string[]) => args[0] ?? '';
registerHandler('filter', plainText);
registerHandler('quickref', plainText);
registerHandler('book', plainText);
registerHandler('adventure', plainText);
registerHandler('area', plainText);
registerHandler('deck', plainText);
registerHandler('card', plainText);
registerHandler('legroup', plainText);
