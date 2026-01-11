import type { DatabaseType } from "../database";

export abstract class BaseRepository {
  constructor(protected db: DatabaseType) {}

  protected handleError(error: unknown, operation: string): never {
    console.error(`Repository error in ${operation}:`, error);
    throw new Error(`Database operation failed: ${operation}`);
  }
}
