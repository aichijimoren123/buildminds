import { useEffect, useState } from "react";

interface SettingsModalProps {
  onClose: () => void;
}

const SETTINGS_FIELDS = [
  { key: "ANTHROPIC_AUTH_TOKEN", label: "API Key", type: "password" as const, placeholder: "sk-ant-..." },
  { key: "ANTHROPIC_BASE_URL", label: "Base URL", type: "text" as const, placeholder: "https://api.anthropic.com" },
  { key: "ANTHROPIC_MODEL", label: "Default Model", type: "text" as const, placeholder: "claude-sonnet-4-5-20250929" },
  { key: "ANTHROPIC_DEFAULT_SONNET_MODEL", label: "Sonnet Model", type: "text" as const, placeholder: "claude-sonnet-4-5-20250929" },
  { key: "ANTHROPIC_DEFAULT_OPUS_MODEL", label: "Opus Model", type: "text" as const, placeholder: "claude-opus-4-5-20251101" },
  { key: "ANTHROPIC_DEFAULT_HAIKU_MODEL", label: "Haiku Model", type: "text" as const, placeholder: "claude-3-5-haiku-20241022" },
  { key: "API_TIMEOUT_MS", label: "API Timeout (ms)", type: "text" as const, placeholder: "600000" },
  { key: "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC", label: "Disable Non-Essential Traffic", type: "text" as const, placeholder: "false" }
];

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setSettings(data.settings || {});
        setLoading(false);
      })
      .catch((err) => {
        setError(`Failed to load settings: ${String(err)}`);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ settings })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save settings");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/20 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-ink-900/5 bg-surface shadow-elevated max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-ink-900/10">
          <div>
            <div className="text-base font-semibold text-ink-800">Settings</div>
            <p className="mt-1 text-sm text-muted">
              Configure Claude Agent SDK environment variables
            </p>
          </div>
          <button
            className="rounded-full p-1.5 text-muted hover:bg-surface-tertiary hover:text-ink-700 transition-colors"
            onClick={onClose}
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-xl border border-error/20 bg-error-light px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        {success && (
          <div className="mx-6 mt-4 rounded-xl border border-green-500/20 bg-green-50 px-4 py-3 text-sm text-green-700">
            Settings saved successfully!
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-sm text-muted">Loading settings...</div>
            </div>
          ) : (
            <div className="grid gap-4">
              {SETTINGS_FIELDS.map((field) => (
                <label key={field.key} className="grid gap-1.5">
                  <span className="text-xs font-medium text-muted">
                    {field.label}
                  </span>
                  <input
                    type={field.type}
                    className="rounded-xl border border-ink-900/10 bg-surface-secondary px-4 py-2.5 text-sm text-ink-800 placeholder:text-muted-light focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20 transition-colors"
                    placeholder={field.placeholder}
                    value={settings[field.key] || ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                  />
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-ink-900/10 p-6">
          <div className="text-xs text-muted">
            Values saved here override <code className="rounded bg-ink-900/5 px-1.5 py-0.5">~/.claude/settings.json</code>
          </div>
          <div className="flex gap-3">
            <button
              className="rounded-xl border border-ink-900/10 bg-white px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-surface-tertiary transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="rounded-xl border border-accent/60 bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSave}
              disabled={saving || loading}
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
