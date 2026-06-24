import type { RefId } from '../../domain/reference/types';

export interface ReferenceRepository {
  get(kind: string, ref: RefId): Promise<unknown | undefined>;
  search(kind: string, query: string, filters?: Record<string, unknown>): Promise<unknown[]>;
}
