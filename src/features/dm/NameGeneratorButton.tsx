import { generateName } from '../../domain/dm/nameGenerator';

interface Props {
  race: string;
  onGenerate: (name: string) => void;
}

/** Inline "generate" button embedded next to a name field — also used standalone in Tools. */
export function NameGeneratorButton({ race, onGenerate }: Props) {
  return (
    <button
      type="button"
      onClick={() => onGenerate(generateName(race || 'generic'))}
      title="Generate a name"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: 'var(--color-raised)', border: '1px solid var(--color-border)',
        color: '#d08c4a', cursor: 'pointer',
      }}
    >
      <span className="msym" style={{ fontSize: 19 }}>casino</span>
    </button>
  );
}
