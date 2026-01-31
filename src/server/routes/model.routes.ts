import { Hono } from "hono";
import { db } from "../database";
import { ModelRepository } from "../repositories/model.repository";
import {
  insertModelProviderSchema,
  insertModelSchema,
} from "../database/schema";

const modelRoutes = new Hono();
const modelRepo = new ModelRepository(db);

// ============ Provider Routes ============

/**
 * GET /api/models/providers - 获取所有 Provider
 */
modelRoutes.get("/providers", async (c) => {
  try {
    const providers = await modelRepo.getAllProviders();
    // 隐藏 API Key 的完整值
    const safeProviders = providers.map((p) => ({
      ...p,
      apiKey: p.apiKey ? `${p.apiKey.slice(0, 8)}...` : null,
      hasApiKey: !!p.apiKey,
    }));
    return c.json({ providers: safeProviders });
  } catch (err) {
    console.error("Failed to get providers:", err);
    return c.json({ error: "Failed to get providers" }, 500);
  }
});

/**
 * GET /api/models/providers/:id - 获取单个 Provider
 */
modelRoutes.get("/providers/:id", async (c) => {
  const id = c.req.param("id");
  try {
    const provider = await modelRepo.getProviderById(id);
    if (!provider) {
      return c.json({ error: "Provider not found" }, 404);
    }
    return c.json({
      ...provider,
      apiKey: provider.apiKey ? `${provider.apiKey.slice(0, 8)}...` : null,
      hasApiKey: !!provider.apiKey,
    });
  } catch (err) {
    console.error("Failed to get provider:", err);
    return c.json({ error: "Failed to get provider" }, 500);
  }
});

/**
 * POST /api/models/providers - 创建 Provider
 */
modelRoutes.post("/providers", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = insertModelProviderSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: "Invalid data", details: parsed.error.errors }, 400);
    }

    // 检查 slug 是否已存在
    const existing = await modelRepo.getProviderBySlug(parsed.data.slug);
    if (existing) {
      return c.json({ error: "Provider with this slug already exists" }, 409);
    }

    const provider = await modelRepo.createProvider(parsed.data);
    return c.json(provider, 201);
  } catch (err) {
    console.error("Failed to create provider:", err);
    return c.json({ error: "Failed to create provider" }, 500);
  }
});

/**
 * PUT /api/models/providers/:id - 更新 Provider
 */
modelRoutes.put("/providers/:id", async (c) => {
  const id = c.req.param("id");
  try {
    const body = await c.req.json();

    // 如果 apiKey 是 "***" 或以 "..." 结尾，说明是 masked 值，不更新
    if (body.apiKey && (body.apiKey === "***" || body.apiKey.endsWith("..."))) {
      delete body.apiKey;
    }

    const provider = await modelRepo.updateProvider(id, body);
    if (!provider) {
      return c.json({ error: "Provider not found" }, 404);
    }
    return c.json({
      ...provider,
      apiKey: provider.apiKey ? `${provider.apiKey.slice(0, 8)}...` : null,
      hasApiKey: !!provider.apiKey,
    });
  } catch (err) {
    console.error("Failed to update provider:", err);
    return c.json({ error: "Failed to update provider" }, 500);
  }
});

/**
 * DELETE /api/models/providers/:id - 删除 Provider
 */
modelRoutes.delete("/providers/:id", async (c) => {
  const id = c.req.param("id");
  try {
    await modelRepo.deleteProvider(id);
    return c.json({ success: true });
  } catch (err) {
    console.error("Failed to delete provider:", err);
    return c.json({ error: "Failed to delete provider" }, 500);
  }
});

/**
 * POST /api/models/providers/:id/default - 设为默认 Provider
 */
modelRoutes.post("/providers/:id/default", async (c) => {
  const id = c.req.param("id");
  try {
    await modelRepo.setDefaultProvider(id);
    return c.json({ success: true });
  } catch (err) {
    console.error("Failed to set default provider:", err);
    return c.json({ error: "Failed to set default provider" }, 500);
  }
});

// ============ Model Routes ============

/**
 * GET /api/models - 获取所有 Model（带 Provider 信息）
 */
modelRoutes.get("/", async (c) => {
  try {
    const modelsWithProviders = await modelRepo.getModelsWithProviders();
    return c.json({ models: modelsWithProviders });
  } catch (err) {
    console.error("Failed to get models:", err);
    return c.json({ error: "Failed to get models" }, 500);
  }
});

/**
 * GET /api/models/:id - 获取单个 Model
 */
modelRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  // 排除 providers 路由
  if (id === "providers") return c.notFound();

  try {
    const model = await modelRepo.getModelById(id);
    if (!model) {
      return c.json({ error: "Model not found" }, 404);
    }
    return c.json(model);
  } catch (err) {
    console.error("Failed to get model:", err);
    return c.json({ error: "Failed to get model" }, 500);
  }
});

/**
 * POST /api/models - 创建 Model
 */
modelRoutes.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = insertModelSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: "Invalid data", details: parsed.error.errors }, 400);
    }

    // 检查 Provider 是否存在
    const provider = await modelRepo.getProviderById(body.providerId);
    if (!provider) {
      return c.json({ error: "Provider not found" }, 404);
    }

    const model = await modelRepo.createModel({
      ...parsed.data,
      providerId: body.providerId,
    });
    return c.json(model, 201);
  } catch (err) {
    console.error("Failed to create model:", err);
    return c.json({ error: "Failed to create model" }, 500);
  }
});

/**
 * PUT /api/models/:id - 更新 Model
 */
modelRoutes.put("/:id", async (c) => {
  const id = c.req.param("id");
  try {
    const body = await c.req.json();
    const model = await modelRepo.updateModel(id, body);
    if (!model) {
      return c.json({ error: "Model not found" }, 404);
    }
    return c.json(model);
  } catch (err) {
    console.error("Failed to update model:", err);
    return c.json({ error: "Failed to update model" }, 500);
  }
});

/**
 * DELETE /api/models/:id - 删除 Model
 */
modelRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  try {
    await modelRepo.deleteModel(id);
    return c.json({ success: true });
  } catch (err) {
    console.error("Failed to delete model:", err);
    return c.json({ error: "Failed to delete model" }, 500);
  }
});

/**
 * POST /api/models/:id/default - 设为默认 Model
 */
modelRoutes.post("/:id/default", async (c) => {
  const id = c.req.param("id");
  try {
    await modelRepo.setDefaultModel(id);
    return c.json({ success: true });
  } catch (err) {
    console.error("Failed to set default model:", err);
    return c.json({ error: "Failed to set default model" }, 500);
  }
});

export { modelRoutes };
