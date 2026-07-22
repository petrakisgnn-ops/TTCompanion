import { describe, expect, it } from 'vitest';
import { resolveWalkSpeed } from './speed';

describe('resolveWalkSpeed', () => {
  it('reads a plain-number race speed (Dwarf 25)', () => {
    expect(resolveWalkSpeed(25)).toBe(25);
  });

  it('reads an object-shaped race speed', () => {
    expect(resolveWalkSpeed({ walk: 30, fly: 30 })).toBe(30);
  });

  it('lets a subrace speed override the base race (Wood Elf 35)', () => {
    expect(resolveWalkSpeed(30, 35)).toBe(35);
  });

  it('defaults to 30 when nothing usable is present', () => {
    expect(resolveWalkSpeed(undefined)).toBe(30);
    expect(resolveWalkSpeed(null, { swim: 40 })).toBe(30);
  });
});
