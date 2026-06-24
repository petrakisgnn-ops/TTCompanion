import { Fragment, type ReactNode } from 'react';
import type { Entry, EntryNode } from '@/domain/reference/types';
import { tokenizeInline } from './parser';
import { renderTagNode } from './TagRegistry';

// Side-effect imports: each file calls registerHandler() for its tag set
import './handlers/formatting';
import './handlers/dice';
import './handlers/links';

// Converts an inline string containing {@tag ...} markup into React nodes.
// Recursively passed into handlers so nested tags like {@b some {@i x} text} work.
export function renderInline(text: string): ReactNode {
  const tokens = tokenizeInline(text);
  if (tokens.length === 0) return null;
  if (tokens.length === 1) {
    const [t] = tokens;
    if (t.kind === 'text') return t.text;
    return renderTagNode(t.tag, t.args, renderInline);
  }
  return (
    <>
      {tokens.map((t, i) =>
        t.kind === 'text' ? (
          <Fragment key={i}>{t.text}</Fragment>
        ) : (
          <Fragment key={i}>{renderTagNode(t.tag, t.args, renderInline)}</Fragment>
        ),
      )}
    </>
  );
}

function renderNode(node: EntryNode, key: string): ReactNode {
  switch (node.type) {
    case 'entries':
    case 'section':
      return (
        <div key={key} className="mb-3">
          {node.name && <h3 className="font-semibold mb-1">{node.name}</h3>}
          {node.entries && renderEntries(node.entries, key)}
        </div>
      );

    case 'list': {
      const src = (node.items ?? node.entries ?? []) as Entry[];
      return (
        <ul key={key} className="list-disc ml-4 space-y-0.5">
          {src.map((item, i) => (
            <li key={i}>
              {typeof item === 'string'
                ? renderInline(item)
                : renderNode(item as EntryNode, `${key}-li${i}`)}
            </li>
          ))}
        </ul>
      );
    }

    case 'table': {
      const labels = (node.colLabels ?? []) as string[];
      const rows = (node.rows ?? []) as Entry[][];
      return (
        <div key={key} className="overflow-x-auto my-2">
          <table className="w-full text-sm border-collapse">
            {labels.length > 0 && (
              <thead>
                <tr>
                  {labels.map((lbl, ci) => (
                    <th key={ci} className="px-2 py-1 text-left font-semibold border-b border-white/20">
                      {renderInline(lbl)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="even:bg-white/5">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-2 py-1 border-b border-white/10">
                      {typeof cell === 'string'
                        ? renderInline(cell)
                        : renderNode(cell as EntryNode, `${key}-r${ri}c${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case 'inset':
    case 'insetReadaloud':
      return (
        <blockquote key={key} className="border-l-2 border-amber-600 pl-3 my-2 italic text-sm opacity-80">
          {node.name && <p className="font-semibold not-italic mb-0.5">{node.name}</p>}
          {node.entries && renderEntries(node.entries, key)}
        </blockquote>
      );

    case 'quote':
      return (
        <blockquote key={key} className="border-l-2 border-sky-600 pl-3 my-2 italic text-sm opacity-80">
          {node.entries && renderEntries(node.entries, key)}
          {node.by != null ? (
            <footer className="text-xs not-italic opacity-70 mt-0.5">— {String(node.by)}</footer>
          ) : null}
        </blockquote>
      );

    case 'abilityDc':
      return (
        <p key={key} className="mb-1">
          Spell save DC = 8 + proficiency bonus + {String((node as EntryNode & { name: string }).name)} modifier
        </p>
      );

    case 'abilityAttackMod':
      return (
        <p key={key} className="mb-1">
          Spell attack modifier = proficiency bonus +{' '}
          {String((node as EntryNode & { name: string }).name)} modifier
        </p>
      );

    default:
      if (node.entries) return <div key={key}>{renderEntries(node.entries, key)}</div>;
      if (node.name) return <p key={key}>{String(node.name)}</p>;
      return null;
  }
}

export function renderEntry(entry: Entry, key: string): ReactNode {
  if (typeof entry === 'string') {
    return (
      <p key={key} className="mb-1 leading-relaxed">
        {renderInline(entry)}
      </p>
    );
  }
  return renderNode(entry, key);
}

export function renderEntries(entries: Entry[], keyPrefix = 'e'): ReactNode {
  return entries.map((entry, i) => renderEntry(entry, `${keyPrefix}-${i}`));
}
