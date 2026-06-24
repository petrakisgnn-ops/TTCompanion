import { registerHandler } from '../TagRegistry';

const ATK_TEXT: Record<string, string> = {
  mw: 'Melee Weapon Attack:',
  rw: 'Ranged Weapon Attack:',
  'mw,rw': 'Melee or Ranged Weapon Attack:',
  'rw,mw': 'Melee or Ranged Weapon Attack:',
  ms: 'Melee Spell Attack:',
  rs: 'Ranged Spell Attack:',
  ma: 'Melee Attack:',
  ra: 'Ranged Attack:',
};

registerHandler('atk', (args) => {
  const label = ATK_TEXT[args[0] ?? ''] ?? `${args[0] ?? ''} Attack:`;
  return <em>{label}</em>;
});

registerHandler('h', () => <strong>Hit: </strong>);

registerHandler('hit', (args) => {
  const n = Number(args[0] ?? '0');
  return `${n >= 0 ? '+' : ''}${n}`;
});

registerHandler('dc', (args) => `DC ${args[0] ?? ''}`);

registerHandler('recharge', (args) => {
  const n = Number(args[0] ?? '6');
  return <span>{n >= 6 ? '(Recharge 6)' : `(Recharge ${n}–6)`}</span>;
});

registerHandler('chance', (args) => `${args[0] ?? ''}%`);

const diceSpan = (expr: string) => (
  <span className="font-mono text-amber-400">{expr}</span>
);

registerHandler('dice', (args) => diceSpan(args[0] ?? ''));
registerHandler('damage', (args) => diceSpan(args[0] ?? ''));
registerHandler('scaledamage', (args) => diceSpan(args[0] ?? ''));
registerHandler('scaledice', (args) => diceSpan(args[0] ?? ''));

registerHandler('d20', (args) => {
  const n = Number(args[0] ?? '0');
  return `${n >= 0 ? '+' : ''}${n}`;
});

registerHandler('coinflip', (args) => args[0] ?? '');
