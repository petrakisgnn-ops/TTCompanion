import { registerHandler } from '../TagRegistry';

registerHandler('b', (args, ri) => <strong>{ri(args[0] ?? '')}</strong>);
registerHandler('bold', (args, ri) => <strong>{ri(args[0] ?? '')}</strong>);

registerHandler('i', (args, ri) => <em>{ri(args[0] ?? '')}</em>);
registerHandler('italic', (args, ri) => <em>{ri(args[0] ?? '')}</em>);

registerHandler('s', (args, ri) => <s>{ri(args[0] ?? '')}</s>);
registerHandler('strike', (args, ri) => <s>{ri(args[0] ?? '')}</s>);

registerHandler('u', (args, ri) => <u>{ri(args[0] ?? '')}</u>);

registerHandler('sup', (args) => <sup>{args[0] ?? ''}</sup>);
registerHandler('sub', (args) => <sub>{args[0] ?? ''}</sub>);

registerHandler('note', (args, ri) => (
  <em className="text-xs opacity-70">{ri(args[0] ?? '')}</em>
));

registerHandler('code', (args) => (
  <code className="font-mono text-sm bg-white/10 px-1 rounded">{args[0] ?? ''}</code>
));

registerHandler('kbd', (args) => (
  <kbd className="font-mono text-xs border border-white/20 rounded px-1">{args[0] ?? ''}</kbd>
));
