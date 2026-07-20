/** Curated syllable pools per race, used to build quick, plausible NPC names. */
export interface NameSyllables {
  starts: string[];
  middles: string[];
  ends: string[];
}

export const RACE_NAME_LISTS: Record<string, NameSyllables> = {
  human: {
    starts: ['Ar', 'Bel', 'Cor', 'Dar', 'Ed', 'Fen', 'Gar', 'Hal', 'Jor', 'Mar', 'Ol', 'Ren', 'Syl', 'Tor', 'Wil'],
    middles: ['an', 'en', 'in', 'or', 'ar', 'el', 'ic'],
    ends: ['a', 'wick', 'ric', 'ton', 'wyn', 'ley', 'mond', 'ric', 'da', 'lyn'],
  },
  elf: {
    starts: ['Ael', 'Cael', 'Eli', 'Fael', 'Ilar', 'Ly', 'Quel', 'Syl', 'Thal', 'Vael'],
    middles: ['a', 'ie', 'wen', 'or', 'ith'],
    ends: ['wyn', 'ath', 'iel', 'wen', 'or', 'ith', 'ana', 'las'],
  },
  dwarf: {
    starts: ['Bal', 'Dor', 'Grum', 'Kaz', 'Mor', 'Or', 'Thar', 'Thrum', 'Ung', 'Vor'],
    middles: ['in', 'ar', 'un', 'or', 'ok'],
    ends: ['grim', 'ric', 'dun', 'gar', 'thur', 'ok', 'in', 'dorf'],
  },
  halfling: {
    starts: ['Bil', 'Cob', 'Fen', 'Lob', 'Mer', 'Pip', 'Rol', 'Tob', 'Wil', 'Yon'],
    middles: ['o', 'e', 'i', 'a'],
    ends: ['bo', 'kin', 'ly', 'well', 'foot', 'berry', 'pin', 'sy'],
  },
  gnome: {
    starts: ['Bix', 'Fiz', 'Glim', 'Nix', 'Pip', 'Quix', 'Snib', 'Wiz', 'Zib', 'Zook'],
    middles: ['i', 'o', 'e'],
    ends: ['bit', 'nix', 'ble', 'zle', 'kle', 'pop', 'wick'],
  },
  'half-orc': {
    starts: ['Gash', 'Grol', 'Krug', 'Mog', 'Rok', 'Thok', 'Ugra', 'Vok', 'Yara', 'Zug'],
    middles: ['a', 'u', 'o'],
    ends: ['nak', 'gar', 'ash', 'ug', 'ok', 'ra', 'zug'],
  },
  orc: {
    starts: ['Gash', 'Grol', 'Krug', 'Mog', 'Rok', 'Thok', 'Ugra', 'Vok', 'Yara', 'Zug'],
    middles: ['a', 'u', 'o'],
    ends: ['nak', 'gar', 'ash', 'ug', 'ok', 'ra', 'zug'],
  },
  tiefling: {
    starts: ['Az', 'Cres', 'Ish', 'Mor', 'Nem', 'Ph', 'Ra', 'Vex', 'Xar', 'Zar'],
    middles: ['a', 'i', 'e'],
    ends: ['iel', 'oth', 'ash', 'ix', 'una', 'vex', 'ara'],
  },
  dragonborn: {
    starts: ['Ar', 'Bal', 'Don', 'Har', 'Kri', 'Med', 'Nad', 'Rhog', 'Tar', 'Vor'],
    middles: ['a', 'u', 'i'],
    ends: ['ash', 'gar', 'ric', 'nax', 'thar', 'jin', 'dax'],
  },
  goblin: {
    starts: ['Grix', 'Nib', 'Rok', 'Snig', 'Wort', 'Zik', 'Grub', 'Miz', 'Pock', 'Skab'],
    middles: ['i', 'o', 'u'],
    ends: ['nix', 'bit', 'gut', 'snap', 'nak', 'lop', 'zik'],
  },
  generic: {
    starts: ['Al', 'Bren', 'Cass', 'Dray', 'Elm', 'Fris', 'Grev', 'Ho', 'Ith', 'Jesk'],
    middles: ['a', 'e', 'i', 'o'],
    ends: ['on', 'ar', 'en', 'is', 'ora', 'eth', 'wyn'],
  },
};

export const KNOWN_NAME_RACES = Object.keys(RACE_NAME_LISTS).filter(k => k !== 'generic');
