export interface TextToken {
  kind: 'text';
  text: string;
}

export interface TagToken {
  kind: 'tag';
  tag: string;
  args: string[];
}

export type Token = TextToken | TagToken;

// Parses inline {@tag arg|arg|...} markup interleaved with plain text.
// Handles balanced braces so nested tags like {@b some {@i nested} text} tokenize correctly.
// Unmatched {@ is treated as plain text — never throws.
export function tokenizeInline(text: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < text.length) {
    const tagStart = text.indexOf('{@', i);
    if (tagStart === -1) {
      if (i < text.length) tokens.push({ kind: 'text', text: text.slice(i) });
      break;
    }
    if (tagStart > i) tokens.push({ kind: 'text', text: text.slice(i, tagStart) });

    // Walk forward tracking brace depth to find the matching '}'
    let depth = 1;
    let j = tagStart + 2;
    while (j < text.length && depth > 0) {
      if (text[j] === '{') depth++;
      else if (text[j] === '}') depth--;
      j++;
    }

    if (depth !== 0) {
      tokens.push({ kind: 'text', text: '{@' });
      i = tagStart + 2;
      continue;
    }

    const inner = text.slice(tagStart + 2, j - 1);
    const spaceIdx = inner.indexOf(' ');
    const tag = spaceIdx === -1 ? inner : inner.slice(0, spaceIdx);
    const rest = spaceIdx === -1 ? '' : inner.slice(spaceIdx + 1);
    tokens.push({ kind: 'tag', tag, args: rest.length > 0 ? rest.split('|') : [] });
    i = j;
  }

  return tokens;
}
