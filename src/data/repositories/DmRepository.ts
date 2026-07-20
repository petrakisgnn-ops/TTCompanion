import type { NpcDefinition, EncounterGroup, SessionNote, SceneState } from '../../domain/dm/types';

export interface DmRepository {
  listNpcs(): Promise<NpcDefinition[]>;
  saveNpc(npc: NpcDefinition): Promise<void>;
  removeNpc(id: string): Promise<void>;

  listGroups(): Promise<EncounterGroup[]>;
  saveGroup(group: EncounterGroup): Promise<void>;
  removeGroup(id: string): Promise<void>;

  listNotes(): Promise<SessionNote[]>;
  saveNote(note: SessionNote): Promise<void>;
  removeNote(id: string): Promise<void>;

  getScene(): Promise<SceneState | undefined>;
  saveScene(scene: SceneState): Promise<void>;
}
