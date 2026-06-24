import type { Character } from '../../domain/character/types';

export interface CharacterRepository {
  list(): Promise<Character[]>;
  get(id: string): Promise<Character | undefined>;
  save(c: Character): Promise<void>;
  remove(id: string): Promise<void>;
  export(id: string): Promise<string>;
  import(blob: string): Promise<Character>;
}
