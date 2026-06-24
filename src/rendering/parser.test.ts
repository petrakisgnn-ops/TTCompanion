import { describe, expect, it } from 'vitest';
import { tokenizeInline } from './parser';

describe('tokenizeInline', () => {
  it('returns empty array for empty string', () => {
    expect(tokenizeInline('')).toEqual([]);
  });

  it('returns single text token for plain text', () => {
    expect(tokenizeInline('hello world')).toEqual([
      { kind: 'text', text: 'hello world' },
    ]);
  });

  it('parses a simple formatting tag', () => {
    expect(tokenizeInline('{@b bold text}')).toEqual([
      { kind: 'tag', tag: 'b', args: ['bold text'] },
    ]);
  });

  it('parses a tag with pipe-separated args', () => {
    expect(tokenizeInline('{@spell Magic Missile|PHB}')).toEqual([
      { kind: 'tag', tag: 'spell', args: ['Magic Missile', 'PHB'] },
    ]);
  });

  it('parses a no-arg tag (@h)', () => {
    expect(tokenizeInline('{@h}')).toEqual([
      { kind: 'tag', tag: 'h', args: [] },
    ]);
  });

  it('parses a single-arg tag (@atk mw)', () => {
    expect(tokenizeInline('{@atk mw}')).toEqual([
      { kind: 'tag', tag: 'atk', args: ['mw'] },
    ]);
  });

  it('mixes leading text and a tag', () => {
    expect(tokenizeInline('takes {@damage 8d6} fire damage')).toEqual([
      { kind: 'text', text: 'takes ' },
      { kind: 'tag', tag: 'damage', args: ['8d6'] },
      { kind: 'text', text: ' fire damage' },
    ]);
  });

  it('handles multiple consecutive tags separated by text', () => {
    expect(tokenizeInline('{@atk mw} {@hit 4} to hit')).toEqual([
      { kind: 'tag', tag: 'atk', args: ['mw'] },
      { kind: 'text', text: ' ' },
      { kind: 'tag', tag: 'hit', args: ['4'] },
      { kind: 'text', text: ' to hit' },
    ]);
  });

  it('keeps nested braces as part of the outer arg (not split)', () => {
    // The outer tag gets the full inner string including the nested {@i ...}
    expect(tokenizeInline('{@b some {@i nested} text}')).toEqual([
      { kind: 'tag', tag: 'b', args: ['some {@i nested} text'] },
    ]);
  });

  it('handles three pipe-separated args (@scaledamage)', () => {
    expect(tokenizeInline('{@scaledamage 8d6|3-9|1d6}')).toEqual([
      { kind: 'tag', tag: 'scaledamage', args: ['8d6', '3-9', '1d6'] },
    ]);
  });

  it('treats unmatched {@ as plain text', () => {
    const tokens = tokenizeInline('broken {@ here');
    expect(tokens[0]).toEqual({ kind: 'text', text: 'broken ' });
    expect(tokens[1]).toEqual({ kind: 'text', text: '{@' });
  });

  it('parses a real Fireball entry line', () => {
    const text =
      'A target takes {@damage 8d6} fire damage on a failed save, or half as much damage on a successful one.';
    const tokens = tokenizeInline(text);
    expect(tokens).toHaveLength(3);
    expect(tokens[0]).toEqual({ kind: 'text', text: 'A target takes ' });
    expect(tokens[1]).toEqual({ kind: 'tag', tag: 'damage', args: ['8d6'] });
    expect(tokens[2].kind).toBe('text');
  });

  it('parses a real monster action line', () => {
    const text = '{@atk mw} {@hit 4} to hit, reach 5 ft., one target. {@h}5 ({@damage 1d6 + 2}) slashing damage.';
    const tokens = tokenizeInline(text);
    const tags = tokens.filter(t => t.kind === 'tag');
    expect(tags).toHaveLength(4);
    expect(tags[0]).toEqual({ kind: 'tag', tag: 'atk', args: ['mw'] });
    expect(tags[1]).toEqual({ kind: 'tag', tag: 'hit', args: ['4'] });
    expect(tags[2]).toEqual({ kind: 'tag', tag: 'h', args: [] });
    expect(tags[3]).toEqual({ kind: 'tag', tag: 'damage', args: ['1d6 + 2'] });
  });
});
