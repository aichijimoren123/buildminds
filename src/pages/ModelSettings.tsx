import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Star,
  Server,
  Key,
  Link,
  ChevronDown,
  ChevronRight,
  Loader2,
  Bot,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";

// Types
interface ModelProvider {
  id: string;
  name: string;
  slug: string;
  baseUrl: string;
  apiKey?: string;
  hasApiKey?: boolean;
  isEnabled: boolean;
  isDefault: boolean;
}

interface Model {
  id: string;
  providerId: string;
  name: string;
  modelId: string;
  description?: string;
  maxTokens?: number;
  isEnabled: boolean;
  isDefault: boolean;
  provider?: ModelProvider;
}

// Provider 编辑表单
interface ProviderFormProps {
  provider?: ModelProvider;
  onSave: (data: Partial<ModelProvider>) => Promise<void>;
  onCancel: () => void;
}

function ProviderForm({ provider, onSave, onCancel }: ProviderFormProps) {
  const [name, setName] = useState(provider?.name ?? "");
  const [slug, setSlug] = useState(provider?.slug ?? "");
  const [baseUrl, setBaseUrl] = useState(provider?.baseUrl ?? "");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        name,
        slug,
        baseUrl,
        ...(apiKey ? { apiKey } : {}),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-bg-100 rounded-lg border border-border-100/10">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-text-400 mb-1">名称</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="如：OpenAI"
            className="w-full px-3 py-2 bg-bg-000 border border-border-100/20 rounded-lg text-sm text-text-100 focus:outline-none focus:border-accent-main-100"
            required
          />
        </div>
        <div>
          <label className="block text-xs text-text-400 mb-1">标识 (slug)</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
            placeholder="如：openai"
            className="w-full px-3 py-2 bg-bg-000 border border-border-100/20 rounded-lg text-sm text-text-100 focus:outline-none focus:border-accent-main-100"
            required
            disabled={!!provider} // 编辑时不能改 slug
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-text-400 mb-1">Base URL</label>
        <input
          type="url"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://api.openai.com/v1"
          className="w-full px-3 py-2 bg-bg-000 border border-border-100/20 rounded-lg text-sm text-text-100 focus:outline-none focus:border-accent-main-100"
          required
        />
      </div>

      <div>
        <label className="block text-xs text-text-400 mb-1">
          API Key {provider?.hasApiKey && <span className="text-green-500">(已配置)</span>}
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={provider?.hasApiKey ? "留空保持不变" : "sk-..."}
          className="w-full px-3 py-2 bg-bg-000 border border-border-100/20 rounded-lg text-sm text-text-100 focus:outline-none focus:border-accent-main-100"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-text-300 hover:text-text-100 transition-colors"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 text-sm bg-accent-main-100 text-white rounded-lg hover:bg-accent-main-200 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          保存
        </button>
      </div>
    </form>
  );
}

// Model 编辑表单
interface ModelFormProps {
  model?: Model;
  providers: ModelProvider[];
  defaultProviderId?: string;
  onSave: (data: Partial<Model>) => Promise<void>;
  onCancel: () => void;
}

function ModelForm({ model, providers, defaultProviderId, onSave, onCancel }: ModelFormProps) {
  const [name, setName] = useState(model?.name ?? "");
  const [modelId, setModelId] = useState(model?.modelId ?? "");
  const [providerId, setProviderId] = useState(model?.providerId ?? defaultProviderId ?? "");
  const [description, setDescription] = useState(model?.description ?? "");
  const [maxTokens, setMaxTokens] = useState(model?.maxTokens?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        name,
        modelId,
        providerId,
        description: description || undefined,
        maxTokens: maxTokens ? parseInt(maxTokens, 10) : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-bg-100 rounded-lg border border-border-100/10">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-text-400 mb-1">显示名称</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="如：GPT-4o"
            className="w-full px-3 py-2 bg-bg-000 border border-border-100/20 rounded-lg text-sm text-text-100 focus:outline-none focus:border-accent-main-100"
            required
          />
        </div>
        <div>
          <label className="block text-xs text-text-400 mb-1">Model ID (API 请求用)</label>
          <input
            type="text"
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            placeholder="如：gpt-4o"
            className="w-full px-3 py-2 bg-bg-000 border border-border-100/20 rounded-lg text-sm text-text-100 focus:outline-none focus:border-accent-main-100"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-text-400 mb-1">Provider</label>
          <select
            value={providerId}
            onChange={(e) => setProviderId(e.target.value)}
            className="w-full px-3 py-2 bg-bg-000 border border-border-100/20 rounded-lg text-sm text-text-100 focus:outline-none focus:border-accent-main-100"
            required
          >
            <option value="">选择 Provider</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-text-400 mb-1">最大 Tokens (可选)</label>
          <input
            type="number"
            value={maxTokens}
            onChange={(e) => setMaxTokens(e.target.value)}
            placeholder="如：128000"
            className="w-full px-3 py-2 bg-bg-000 border border-border-100/20 rounded-lg text-sm text-text-100 focus:outline-none focus:border-accent-main-100"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-text-400 mb-1">描述 (可选)</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="模型简介..."
          className="w-full px-3 py-2 bg-bg-000 border border-border-100/20 rounded-lg text-sm text-text-100 focus:outline-none focus:border-accent-main-100"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-text-300 hover:text-text-100 transition-colors"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={saving || !providerId}
          className="px-4 py-2 text-sm bg-accent-main-100 text-white rounded-lg hover:bg-accent-main-200 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          保存
        </button>
      </div>
    </form>
  );
}

// Provider 卡片
interface ProviderCardProps {
  provider: ModelProvider;
  models: Model[];
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  onAddModel: () => void;
  onEditModel: (model: Model) => void;
  onDeleteModel: (modelId: string) => void;
  onSetDefaultModel: (modelId: string) => void;
}

function ProviderCard({
  provider,
  models,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onSetDefault,
  onAddModel,
  onEditModel,
  onDeleteModel,
  onSetDefaultModel,
}: ProviderCardProps) {
  return (
    <div className="bg-bg-000 rounded-xl border border-border-100/10 overflow-hidden">
      {/* Provider Header */}
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-bg-100/50 transition-colors">
        <button onClick={onToggle} className="p-1 hover:bg-bg-200 rounded">
          {isExpanded ? (
            <ChevronDown size={16} className="text-text-400" />
          ) : (
            <ChevronRight size={16} className="text-text-400" />
          )}
        </button>

        <Server size={18} className="text-accent-main-100 shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-text-100">{provider.name}</span>
            {provider.isDefault && (
              <span className="px-2 py-0.5 text-[10px] bg-accent-main-100/20 text-accent-main-100 rounded">
                默认
              </span>
            )}
            {provider.hasApiKey && (
              <Key size={12} className="text-green-500" title="已配置 API Key" />
            )}
          </div>
          <div className="text-xs text-text-400 truncate flex items-center gap-1">
            <Link size={10} />
            {provider.baseUrl}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {!provider.isDefault && (
            <button
              onClick={onSetDefault}
              className="p-2 text-text-400 hover:text-yellow-500 hover:bg-bg-200 rounded transition-colors"
              title="设为默认"
            >
              <Star size={14} />
            </button>
          )}
          <button
            onClick={onEdit}
            className="p-2 text-text-400 hover:text-text-100 hover:bg-bg-200 rounded transition-colors"
            title="编辑"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-text-400 hover:text-red-500 hover:bg-bg-200 rounded transition-colors"
            title="删除"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Models List */}
      {isExpanded && (
        <div className="border-t border-border-100/10 bg-bg-100/30">
          <div className="px-4 py-2 flex items-center justify-between">
            <span className="text-xs text-text-400">模型 ({models.length})</span>
            <button
              onClick={onAddModel}
              className="flex items-center gap-1 text-xs text-accent-main-100 hover:text-accent-main-200 transition-colors"
            >
              <Plus size={12} />
              添加模型
            </button>
          </div>

          {models.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-text-400">
              暂无模型，点击上方添加
            </div>
          ) : (
            <div className="divide-y divide-border-100/5">
              {models.map((model) => (
                <div
                  key={model.id}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-bg-100/50 transition-colors"
                >
                  <Bot size={14} className="text-text-400 shrink-0 ml-6" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-text-200">{model.name}</span>
                      {model.isDefault && (
                        <span className="px-1.5 py-0.5 text-[9px] bg-accent-main-100/20 text-accent-main-100 rounded">
                          默认
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-text-400 font-mono">{model.modelId}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!model.isDefault && (
                      <button
                        onClick={() => onSetDefaultModel(model.id)}
                        className="p-1.5 text-text-400 hover:text-yellow-500 hover:bg-bg-200 rounded transition-colors"
                        title="设为默认"
                      >
                        <Star size={12} />
                      </button>
                    )}
                    <button
                      onClick={() => onEditModel(model)}
                      className="p-1.5 text-text-400 hover:text-text-100 hover:bg-bg-200 rounded transition-colors"
                      title="编辑"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => onDeleteModel(model.id)}
                      className="p-1.5 text-text-400 hover:text-red-500 hover:bg-bg-200 rounded transition-colors"
                      title="删除"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 主页面组件
export function ModelSettings() {
  const [providers, setProviders] = useState<ModelProvider[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());
  const [editingProvider, setEditingProvider] = useState<ModelProvider | null>(null);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [addingProvider, setAddingProvider] = useState(false);
  const [addingModelForProvider, setAddingModelForProvider] = useState<string | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [providersRes, modelsRes] = await Promise.all([
        fetch("/api/models/providers"),
        fetch("/api/models"),
      ]);

      if (!providersRes.ok || !modelsRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const providersData = await providersRes.json();
      const modelsData = await modelsRes.json();

      setProviders(providersData.providers || []);
      setModels(modelsData.models || []);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Provider actions
  const handleSaveProvider = async (data: Partial<ModelProvider>) => {
    const url = editingProvider
      ? `/api/models/providers/${editingProvider.id}`
      : "/api/models/providers";
    const method = editingProvider ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to save provider");
    }

    setEditingProvider(null);
    setAddingProvider(false);
    fetchData();
  };

  const handleDeleteProvider = async (id: string) => {
    if (!confirm("确定删除此 Provider？关联的模型也会被删除。")) return;

    await fetch(`/api/models/providers/${id}`, { method: "DELETE" });
    fetchData();
  };

  const handleSetDefaultProvider = async (id: string) => {
    await fetch(`/api/models/providers/${id}/default`, { method: "POST" });
    fetchData();
  };

  // Model actions
  const handleSaveModel = async (data: Partial<Model>) => {
    const url = editingModel ? `/api/models/${editingModel.id}` : "/api/models";
    const method = editingModel ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to save model");
    }

    setEditingModel(null);
    setAddingModelForProvider(null);
    fetchData();
  };

  const handleDeleteModel = async (id: string) => {
    if (!confirm("确定删除此模型？")) return;

    await fetch(`/api/models/${id}`, { method: "DELETE" });
    fetchData();
  };

  const handleSetDefaultModel = async (id: string) => {
    await fetch(`/api/models/${id}/default`, { method: "POST" });
    fetchData();
  };

  // Toggle provider expansion
  const toggleProvider = (id: string) => {
    setExpandedProviders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-text-400" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-100">模型配置</h1>
          <p className="text-sm text-text-400 mt-1">
            管理 API Provider 和模型设置
          </p>
        </div>
        <button
          onClick={() => setAddingProvider(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent-main-100 text-white rounded-lg hover:bg-accent-main-200 transition-colors text-sm"
        >
          <Plus size={16} />
          添加 Provider
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Add Provider Form */}
      {addingProvider && (
        <ProviderForm
          onSave={handleSaveProvider}
          onCancel={() => setAddingProvider(false)}
        />
      )}

      {/* Edit Provider Form */}
      {editingProvider && (
        <ProviderForm
          provider={editingProvider}
          onSave={handleSaveProvider}
          onCancel={() => setEditingProvider(null)}
        />
      )}

      {/* Add Model Form */}
      {addingModelForProvider && (
        <ModelForm
          providers={providers}
          defaultProviderId={addingModelForProvider}
          onSave={handleSaveModel}
          onCancel={() => setAddingModelForProvider(null)}
        />
      )}

      {/* Edit Model Form */}
      {editingModel && (
        <ModelForm
          model={editingModel}
          providers={providers}
          onSave={handleSaveModel}
          onCancel={() => setEditingModel(null)}
        />
      )}

      {/* Providers List */}
      <div className="space-y-3">
        {providers.length === 0 ? (
          <div className="text-center py-12 text-text-400">
            <Server size={48} className="mx-auto mb-4 opacity-30" />
            <p>暂无 Provider</p>
            <p className="text-sm mt-1">点击上方按钮添加第一个</p>
          </div>
        ) : (
          providers.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              models={models.filter((m) => m.providerId === provider.id)}
              isExpanded={expandedProviders.has(provider.id)}
              onToggle={() => toggleProvider(provider.id)}
              onEdit={() => setEditingProvider(provider)}
              onDelete={() => handleDeleteProvider(provider.id)}
              onSetDefault={() => handleSetDefaultProvider(provider.id)}
              onAddModel={() => {
                setAddingModelForProvider(provider.id);
                setExpandedProviders((prev) => new Set(prev).add(provider.id));
              }}
              onEditModel={setEditingModel}
              onDeleteModel={handleDeleteModel}
              onSetDefaultModel={handleSetDefaultModel}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default ModelSettings;
