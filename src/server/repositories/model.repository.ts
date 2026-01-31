import { eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import {
  modelProviders,
  models,
  type InsertModelProvider,
  type InsertModel,
  type ModelProvider,
  type Model,
} from "../database/schema";

export class ModelRepository {
  constructor(private db: BetterSQLite3Database) {}

  // ============ Model Provider Methods ============

  async getAllProviders(): Promise<ModelProvider[]> {
    return this.db.select().from(modelProviders).all();
  }

  async getProviderById(id: string): Promise<ModelProvider | undefined> {
    const results = await this.db
      .select()
      .from(modelProviders)
      .where(eq(modelProviders.id, id))
      .limit(1);
    return results[0];
  }

  async getProviderBySlug(slug: string): Promise<ModelProvider | undefined> {
    const results = await this.db
      .select()
      .from(modelProviders)
      .where(eq(modelProviders.slug, slug))
      .limit(1);
    return results[0];
  }

  async getDefaultProvider(): Promise<ModelProvider | undefined> {
    const results = await this.db
      .select()
      .from(modelProviders)
      .where(eq(modelProviders.isDefault, true))
      .limit(1);
    return results[0];
  }

  async createProvider(data: InsertModelProvider): Promise<ModelProvider> {
    const results = await this.db
      .insert(modelProviders)
      .values(data)
      .returning();
    return results[0];
  }

  async updateProvider(
    id: string,
    data: Partial<InsertModelProvider>
  ): Promise<ModelProvider | undefined> {
    const results = await this.db
      .update(modelProviders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(modelProviders.id, id))
      .returning();
    return results[0];
  }

  async deleteProvider(id: string): Promise<boolean> {
    const result = await this.db
      .delete(modelProviders)
      .where(eq(modelProviders.id, id));
    return true;
  }

  async setDefaultProvider(id: string): Promise<void> {
    // 先清除所有默认
    await this.db
      .update(modelProviders)
      .set({ isDefault: false });
    // 设置新默认
    await this.db
      .update(modelProviders)
      .set({ isDefault: true })
      .where(eq(modelProviders.id, id));
  }

  // ============ Model Methods ============

  async getAllModels(): Promise<Model[]> {
    return this.db.select().from(models).all();
  }

  async getModelsByProvider(providerId: string): Promise<Model[]> {
    return this.db
      .select()
      .from(models)
      .where(eq(models.providerId, providerId))
      .all();
  }

  async getModelById(id: string): Promise<Model | undefined> {
    const results = await this.db
      .select()
      .from(models)
      .where(eq(models.id, id))
      .limit(1);
    return results[0];
  }

  async getDefaultModel(): Promise<Model | undefined> {
    const results = await this.db
      .select()
      .from(models)
      .where(eq(models.isDefault, true))
      .limit(1);
    return results[0];
  }

  async createModel(data: InsertModel): Promise<Model> {
    const results = await this.db.insert(models).values(data).returning();
    return results[0];
  }

  async updateModel(
    id: string,
    data: Partial<InsertModel>
  ): Promise<Model | undefined> {
    const results = await this.db
      .update(models)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(models.id, id))
      .returning();
    return results[0];
  }

  async deleteModel(id: string): Promise<boolean> {
    await this.db.delete(models).where(eq(models.id, id));
    return true;
  }

  async setDefaultModel(id: string): Promise<void> {
    // 先清除所有默认
    await this.db.update(models).set({ isDefault: false });
    // 设置新默认
    await this.db
      .update(models)
      .set({ isDefault: true })
      .where(eq(models.id, id));
  }

  // ============ Combined Methods ============

  async getModelsWithProviders(): Promise<
    (Model & { provider: ModelProvider })[]
  > {
    const allModels = await this.getAllModels();
    const allProviders = await this.getAllProviders();
    const providerMap = new Map(allProviders.map((p) => [p.id, p]));

    return allModels
      .filter((m) => providerMap.has(m.providerId))
      .map((m) => ({
        ...m,
        provider: providerMap.get(m.providerId)!,
      }));
  }
}
