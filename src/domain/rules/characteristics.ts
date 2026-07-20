import type { Entry, EntryNode } from '../reference/types';

export interface CharacteristicTables {
  trait: string[];
  ideal: string[];
  bond: string[];
  flaw: string[];
}

const EMPTY: CharacteristicTables = { trait: [], ideal: [], bond: [], flaw: [] };

function cellText(cell: Entry): string {
  if (typeof cell === 'string') return cell;
  return (cell.entries ?? []).map(cellText).join(' ');
}

function collectTables(entries: Entry[], out: EntryNode[]): void {
  for (const entry of entries) {
    if (typeof entry === 'string') continue;
    const node = entry as EntryNode;
    if (node.type === 'table') out.push(node);
    if (node.entries) collectTables(node.entries, out);
    if (node.items) collectTables(node.items as Entry[], out);
  }
}

/**
 * 2014-edition backgrounds carry a "Suggested Characteristics" block with four roll tables
 * (Personality Trait / Ideal / Bond / Flaw), identified by their second column label — the row
 * count already equals the table's die size, so there's no need to track dice type separately.
 * 2024/XPHB backgrounds dropped these tables entirely; returns all-empty in that case.
 */
export function parseCharacteristicTables(entries: Entry[]): CharacteristicTables {
  const tables: EntryNode[] = [];
  collectTables(entries, tables);
  if (tables.length === 0) return EMPTY;

  const result: CharacteristicTables = { trait: [], ideal: [], bond: [], flaw: [] };
  for (const table of tables) {
    const label = (table.colLabels?.[1] ?? '').toLowerCase();
    const key = label.includes('trait') ? 'trait'
      : label.includes('ideal') ? 'ideal'
      : label.includes('bond') ? 'bond'
      : label.includes('flaw') ? 'flaw'
      : null;
    if (!key || !table.rows) continue;
    result[key] = table.rows.map(row => cellText(row[1])).filter(Boolean);
  }
  return result;
}
