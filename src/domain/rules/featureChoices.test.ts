import { describe, expect, it } from 'vitest';
import { bonusCantrips, featureChoiceTotals, grantForOption, reconcileGrantedProficiencies } from './featureChoices';

describe('feature choice grants', () => {
  it('Protector grants martial weapons + heavy armor', () => {
    expect(grantForOption('protector|cleric|xphb|1|xphb')).toEqual({ weapons: ['Martial weapons'], armor: ['Heavy armor'] });
  });
  it('Thaumaturge grants a cantrip to the Cleric', () => {
    const choices = { 'divine order|cleric|xphb|1|xphb': ['thaumaturge|cleric|xphb|1|xphb'] };
    expect(bonusCantrips(choices, 'Cleric')).toBe(1);
    expect(bonusCantrips(choices, 'Druid')).toBe(0);
  });
  it('unknown options grant nothing', () => {
    expect(featureChoiceTotals({ x: ['bear|barbarian|phb|totem warrior|phb|3|phb'] }))
      .toEqual({ weapons: [], armor: [], cantripsByClass: {} });
  });
});

describe('reconcileGrantedProficiencies', () => {
  it('swaps a removed grant for an added one', () => {
    expect(reconcileGrantedProficiencies(['Simple weapons', 'Martial weapons'], ['Martial weapons'], [], ['Simple weapons']))
      .toEqual(['Simple weapons']);
  });
  it('keeps a proficiency another source still grants', () => {
    expect(reconcileGrantedProficiencies(['Medium armor'], ['Medium armor'], [], ['Medium armor'])).toEqual(['Medium armor']);
  });
  it('adds without duplicating', () => {
    expect(reconcileGrantedProficiencies(['Heavy armor'], [], ['heavy armor', 'Martial weapons'], []))
      .toEqual(['Heavy armor', 'Martial weapons']);
  });
});
