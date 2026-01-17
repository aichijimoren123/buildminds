import {
  Check,
  ChevronLeft,
  ChevronRight,
  Code,
  CreditCard,
  Database,
  FolderGit2,
  HelpCircle,
  LayoutTemplate,
  Loader2,
  LogOut,
  Monitor,
  Settings as SettingsIcon,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useAppStore } from "../store/useAppStore";

// Helper icons
function CalendarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  );
}

function CableIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 21v-2a1 1 0 0 1-1-4H5a1 1 0 0 0-1 4v2" />
      <circle cx="17" cy="3" r="1" />
      <circle cx="5" cy="3" r="1" />
      <path d="M17 4v3a1 1 0 0 1-1 4h-2" />
      <path d="M5 4v3a1 1 0 0 0 1 4h2" />
    </svg>
  );
}

const MENU_ITEMS = [
  { id: "account", label: "账户", icon: User, description: "管理您的账户信息" },
  {
    id: "developer",
    label: "开发设置",
    icon: Code,
    description: "GitHub仓库和工作目录配置",
  },
  {
    id: "settings",
    label: "通用设置",
    icon: SettingsIcon,
    description: "通用设置和偏好",
  },
  {
    id: "usage",
    label: "使用情况",
    icon: CreditCard,
    description: "查看使用量和配额",
  },
  {
    id: "schedule",
    label: "定时任务",
    icon: CalendarIcon,
    description: "管理定时任务",
  },
  {
    id: "data",
    label: "数据控制",
    icon: Database,
    description: "数据隐私和存储",
  },
  {
    id: "browser",
    label: "云浏览器",
    icon: LayoutTemplate,
    description: "浏览器配置",
  },
  {
    id: "personalization",
    label: "个性化",
    icon: SettingsIcon,
    description: "自定义您的体验",
  },
  {
    id: "connectors",
    label: "连接器",
    icon: CableIcon,
    description: "第三方服务连接",
  },
  {
    id: "integrations",
    label: "集成",
    icon: CableIcon,
    description: "应用集成管理",
  },
];

// Toggle Switch Component - 更大的触摸目标
function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 active:scale-95 ${
        checked ? "bg-accent" : "bg-bg-300"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-bg-000 shadow-md ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// Settings Content Component - 移动端优化
function SettingsContent() {
  const themeMode = useAppStore((state) => state.themeMode);
  const setThemeMode = useAppStore((state) => state.setThemeMode);
  const [language, setLanguage] = useState("zh-CN");
  const [notifications, setNotifications] = useState({
    exclusive: true,
    email: true,
  });

  return (
    <div className="space-y-6 pb-safe">
      {/* General Section */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-text-400 uppercase tracking-wider px-1">
          通用
        </h3>
        <div className="bg-bg-000 rounded-2xl border border-border-100/10 overflow-hidden">
          <div className="p-4">
            <label className="block text-[15px] font-medium text-text-100 mb-2">
              语言
            </label>
            <div className="relative">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full appearance-none rounded-xl border border-border-100/10 bg-bg-200 px-4 py-3.5 text-[15px] text-text-100 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
              >
                <option value="zh-CN">简体中文</option>
                <option value="en-US">English</option>
                <option value="ja-JP">日本語</option>
              </select>
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-text-400">
                <ChevronRight className="h-5 w-5 rotate-90" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Appearance Section */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-text-400 uppercase tracking-wider px-1">
          外观
        </h3>
        <div className="bg-bg-000 rounded-2xl border border-border-100/10 p-4">
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setThemeMode("light")}
              className={`group relative rounded-xl border-2 p-2 text-left transition-all active:scale-[0.98] ${
                themeMode === "light"
                  ? "border-accent bg-accent/5"
                  : "border-transparent bg-bg-200"
              }`}
            >
              <div className="mb-2 aspect-[4/3] rounded-lg bg-bg-000 border border-border-100/10 p-1.5 overflow-hidden shadow-sm">
                <div className="h-1.5 w-1/2 rounded-full bg-bg-300 mb-1" />
                <div className="h-1.5 w-3/4 rounded-full bg-border-100/10" />
              </div>
              <div className="flex items-center justify-center gap-1">
                {themeMode === "light" && (
                  <Check className="h-3.5 w-3.5 text-accent" />
                )}
                <span
                  className={`text-xs font-medium ${themeMode === "light" ? "text-accent" : "text-text-300"}`}
                >
                  浅色
                </span>
              </div>
            </button>

            <button
              onClick={() => setThemeMode("dark")}
              className={`group relative rounded-xl border-2 p-2 text-left transition-all active:scale-[0.98] ${
                themeMode === "dark"
                  ? "border-accent bg-accent/5"
                  : "border-transparent bg-bg-200"
              }`}
            >
              <div className="mb-2 aspect-[4/3] rounded-lg bg-bg-400 border border-bg-300 p-1.5 overflow-hidden">
                <div className="h-1.5 w-1/2 rounded-full bg-bg-300 mb-1" />
                <div className="h-1.5 w-3/4 rounded-full bg-bg-200" />
              </div>
              <div className="flex items-center justify-center gap-1">
                {themeMode === "dark" && (
                  <Check className="h-3.5 w-3.5 text-accent" />
                )}
                <span
                  className={`text-xs font-medium ${themeMode === "dark" ? "text-accent" : "text-text-300"}`}
                >
                  深色
                </span>
              </div>
            </button>

            <button
              onClick={() => setThemeMode("system")}
              className={`group relative rounded-xl border-2 p-2 text-left transition-all active:scale-[0.98] ${
                themeMode === "system"
                  ? "border-accent bg-accent/5"
                  : "border-transparent bg-bg-200"
              }`}
            >
              <div className="mb-2 aspect-[4/3] rounded-lg bg-gradient-to-br from-white to-bg-400 border border-border-100/10 flex items-center justify-center overflow-hidden">
                <Monitor className="h-4 w-4 text-text-400" />
              </div>
              <div className="flex items-center justify-center gap-1">
                {themeMode === "system" && (
                  <Check className="h-3.5 w-3.5 text-accent" />
                )}
                <span
                  className={`text-xs font-medium ${themeMode === "system" ? "text-accent" : "text-text-300"}`}
                >
                  自动
                </span>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* Notifications Section */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-text-400 uppercase tracking-wider px-1">
          通知
        </h3>
        <div className="bg-bg-000 rounded-2xl border border-border-100/10 divide-y divide-border-100/10 overflow-hidden">
          <label className="flex items-center justify-between p-4 cursor-pointer active:bg-bg-200 transition-colors">
            <div className="flex-1 pr-4">
              <div className="text-[15px] font-medium text-text-100">
                接收独家内容
              </div>
              <div className="text-[13px] text-text-400 mt-0.5 leading-relaxed">
                获取独家优惠、活动更新和新功能指南
              </div>
            </div>
            <Toggle
              checked={notifications.exclusive}
              onChange={(checked) =>
                setNotifications((prev) => ({ ...prev, exclusive: checked }))
              }
              label="接收独家内容"
            />
          </label>

          <label className="flex items-center justify-between p-4 cursor-pointer active:bg-bg-200 transition-colors">
            <div className="flex-1 pr-4">
              <div className="text-[15px] font-medium text-text-100">
                任务开始通知
              </div>
              <div className="text-[13px] text-text-400 mt-0.5 leading-relaxed">
                任务开始处理时发送邮件通知
              </div>
            </div>
            <Toggle
              checked={notifications.email}
              onChange={(checked) =>
                setNotifications((prev) => ({ ...prev, email: checked }))
              }
              label="任务开始通知"
            />
          </label>
        </div>
      </section>

      {/* Privacy Section */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-text-400 uppercase tracking-wider px-1">
          隐私
        </h3>
        <div className="bg-bg-000 rounded-2xl border border-border-100/10 overflow-hidden">
          <button className="flex w-full items-center justify-between p-4 text-left active:bg-bg-200 transition-colors">
            <span className="text-[15px] font-medium text-text-100">
              管理 Cookies
            </span>
            <ChevronRight className="h-5 w-5 text-text-400" />
          </button>
        </div>
      </section>

      {/* Help & Logout Section */}
      <section className="space-y-3 pt-2">
        <div className="bg-bg-000 rounded-2xl border border-border-100/10 overflow-hidden">
          <button className="flex w-full items-center gap-3 p-4 text-left active:bg-bg-200 transition-colors">
            <HelpCircle className="h-5 w-5 text-text-400" />
            <span className="flex-1 text-[15px] font-medium text-text-100">
              获取帮助
            </span>
            <ChevronRight className="h-5 w-5 text-text-400" />
          </button>
        </div>

        <button className="flex w-full items-center justify-center gap-2 rounded-2xl border border-error/20 bg-error/5 p-4 text-error active:bg-error/10 transition-colors">
          <LogOut className="h-5 w-5" />
          <span className="text-[15px] font-medium">退出登录</span>
        </button>
      </section>
    </div>
  );
}

// Account Content Component
function AccountContent() {
  return (
    <div className="space-y-6 pb-safe">
      {/* Profile Section */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-text-400 uppercase tracking-wider px-1">
          个人资料
        </h3>
        <div className="bg-bg-000 rounded-2xl border border-border-100/10 overflow-hidden">
          {/* Avatar */}
          <div className="flex items-center gap-4 p-4 border-b border-border-100/10">
            <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center text-accent text-2xl font-semibold">
              A
            </div>
            <div className="flex-1">
              <div className="text-[15px] font-medium text-text-100">
                albertm
              </div>
              <div className="text-[13px] text-text-400">Free plan</div>
            </div>
            <button className="px-4 py-2 rounded-xl bg-bg-200 text-[13px] font-medium text-text-200 active:bg-bg-300 transition-colors">
              编辑
            </button>
          </div>

          {/* Email */}
          <button className="flex w-full items-center justify-between p-4 text-left active:bg-bg-200 transition-colors">
            <div>
              <div className="text-[13px] text-text-400">邮箱</div>
              <div className="text-[15px] text-text-100">albert@example.com</div>
            </div>
            <ChevronRight className="h-5 w-5 text-text-400" />
          </button>
        </div>
      </section>

      {/* Plan Section */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-text-400 uppercase tracking-wider px-1">
          订阅
        </h3>
        <div className="bg-bg-000 rounded-2xl border border-border-100/10 overflow-hidden">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[15px] font-medium text-text-100">
                Free plan
              </span>
              <span className="px-2 py-1 rounded-lg bg-bg-200 text-[11px] font-medium text-text-400">
                当前方案
              </span>
            </div>
            <button className="w-full py-3 rounded-xl bg-accent text-white text-[15px] font-medium active:bg-accent-hover transition-colors">
              升级到 Pro
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

// Developer Settings Content
function DeveloperContent() {
  const [githubReposPath, setGithubReposPath] = useState("");
  const [defaultCwd, setDefaultCwd] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/settings");
        if (response.ok) {
          const data = await response.json();
          setGithubReposPath(data.settings?.GITHUB_REPOS_PATH || "");
          setDefaultCwd(data.settings?.DEFAULT_CWD || "");
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            GITHUB_REPOS_PATH: githubReposPath,
            DEFAULT_CWD: defaultCwd,
          },
        }),
      });
      if (response.ok) {
        setMessage({ type: "success", text: "设置已保存" });
      } else {
        throw new Error("Failed to save");
      }
    } catch (error) {
      setMessage({ type: "error", text: "保存失败，请重试" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-safe">
      {/* GitHub Repos Path */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-text-400 uppercase tracking-wider px-1">
          GitHub 仓库设置
        </h3>
        <div className="bg-bg-000 rounded-2xl border border-border-100/10 overflow-hidden">
          <div className="p-4">
            <label className="block text-[15px] font-medium text-text-100 mb-2">
              <div className="flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-text-400" />
                仓库存放目录
              </div>
            </label>
            <input
              type="text"
              value={githubReposPath}
              onChange={(e) => setGithubReposPath(e.target.value)}
              placeholder="/path/to/claude-projects"
              className="w-full rounded-xl border border-border-100/10 bg-bg-200 px-4 py-3.5 text-[15px] text-text-100 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all placeholder:text-text-400"
            />
            <p className="mt-2 text-[13px] text-text-400">
              从 GitHub 克隆的仓库将存放在此目录下。留空使用默认目录。
            </p>
          </div>
        </div>
      </section>

      {/* Default Working Directory */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-text-400 uppercase tracking-wider px-1">
          工作目录设置
        </h3>
        <div className="bg-bg-000 rounded-2xl border border-border-100/10 overflow-hidden">
          <div className="p-4">
            <label className="block text-[15px] font-medium text-text-100 mb-2">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-text-400" />
                默认工作目录 (CWD)
              </div>
            </label>
            <input
              type="text"
              value={defaultCwd}
              onChange={(e) => setDefaultCwd(e.target.value)}
              placeholder="/path/to/your/projects"
              className="w-full rounded-xl border border-border-100/10 bg-bg-200 px-4 py-3.5 text-[15px] text-text-100 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all placeholder:text-text-400"
            />
            <p className="mt-2 text-[13px] text-text-400">
              新建会话时的默认工作目录。可以在手机上设置为服务器上的项目路径。
            </p>
          </div>
        </div>
      </section>

      {/* Save Button */}
      <section className="space-y-3 pt-2">
        {message && (
          <div
            className={`rounded-xl p-3 text-[14px] ${
              message.type === "success"
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 rounded-xl bg-accent text-white text-[15px] font-medium active:bg-accent-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              保存中...
            </>
          ) : (
            "保存设置"
          )}
        </button>
      </section>

      {/* Tips */}
      <section className="space-y-3">
        <div className="bg-accent/5 rounded-2xl border border-accent/10 p-4">
          <h4 className="text-[14px] font-medium text-accent mb-2">
            移动端 Vibe Coding 提示
          </h4>
          <ul className="text-[13px] text-text-300 space-y-1.5 list-disc list-inside">
            <li>在服务器上运行 Claude Code WebUI</li>
            <li>设置仓库存放目录为服务器上的路径</li>
            <li>添加 GitHub 仓库后即可在手机上编程</li>
            <li>所有代码修改都在服务器上执行</li>
          </ul>
        </div>
      </section>
    </div>
  );
}

// Placeholder Content for other sections
function PlaceholderContent({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-6xl mb-4">🚧</div>
      <h3 className="text-lg font-medium text-text-100 mb-2">{title}</h3>
      <p className="text-[15px] text-text-400">此功能正在开发中</p>
    </div>
  );
}

export function Settings() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"in" | "out">("in");
  const containerRef = useRef<HTMLDivElement>(null);

  // 处理返回
  const handleBack = () => {
    if (activeSection) {
      setSlideDirection("out");
      setIsAnimating(true);
      setTimeout(() => {
        setActiveSection(null);
        setIsAnimating(false);
      }, 200);
    } else {
      navigate(-1);
    }
  };

  // 处理菜单点击
  const handleMenuClick = (id: string) => {
    setSlideDirection("in");
    setIsAnimating(true);
    setActiveSection(id);
    setTimeout(() => {
      setIsAnimating(false);
    }, 200);
  };

  const getActiveLabel = () => {
    const item = MENU_ITEMS.find((item) => item.id === activeSection);
    return item?.label || "设置";
  };

  // 渲染内容
  const renderContent = () => {
    switch (activeSection) {
      case "settings":
        return <SettingsContent />;
      case "account":
        return <AccountContent />;
      case "developer":
        return <DeveloperContent />;
      default:
        return <PlaceholderContent title={getActiveLabel()} />;
    }
  };

  // 滑动手势支持
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchEndX.current - touchStartX.current;
    // 从左边缘向右滑动超过 80px 触发返回
    if (diff > 80 && touchStartX.current < 50 && activeSection) {
      handleBack();
    }
  };

  return (
    <div
      className="h-full bg-bg-100 flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Mobile Header - 固定在顶部 */}
      <header className="sticky top-0 z-10 bg-bg-100/95 backdrop-blur-sm border-b border-border-100/10 lg:hidden safe-top">
        <div className="flex items-center gap-2 px-4 py-3">
          <button
            onClick={handleBack}
            className="rounded-full p-2.5 -ml-2 text-text-200 hover:bg-bg-200 active:bg-bg-300 transition-colors"
            aria-label="返回"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-[17px] font-semibold text-text-100 flex-1">
            {activeSection ? getActiveLabel() : "设置"}
          </h1>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        {/* Desktop Layout - 隐藏在移动端 */}
        <div className="hidden lg:flex h-full">
          {/* Desktop Sidebar */}
          <aside className="w-72 shrink-0 border-r border-border-100/10 bg-bg-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => navigate(-1)}
                className="rounded-full p-2 -ml-2 text-text-200 hover:bg-bg-200 transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-semibold text-text-100">设置</h1>
            </div>

            <nav className="space-y-1">
              {MENU_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium cursor-pointer ${
                    activeSection === item.id
                      ? "bg-bg-000 text-text-100 border-border-100/10 border"
                      : "text-text-400 hover:bg-bg-000/50 hover:text-text-300"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="mt-6 pt-6 border-t border-border-100/10">
              <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text-400 hover:bg-bg-000/50 hover:text-text-200 transition-colors">
                <HelpCircle className="h-4 w-4" />
                获取帮助
              </button>
            </div>
          </aside>

          {/* Desktop Content */}
          <main className="flex-1 overflow-y-auto p-8">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-semibold text-text-100 mb-8">
                {activeSection ? getActiveLabel() : "设置"}
              </h2>
              {activeSection ? (
                renderContent()
              ) : (
                <div className="text-center py-16 text-text-400">
                  <p>请从左侧菜单选择一个设置项</p>
                </div>
              )}
            </div>
          </main>
        </div>

        {/* Mobile Layout */}
        <div
          className="lg:hidden relative h-full overflow-y-auto"
          ref={containerRef}
        >
          {/* Menu List */}
          <div
            className={`transition-all duration-200 ease-out ${
              activeSection
                ? "opacity-0 -translate-x-8 pointer-events-none absolute inset-0"
                : "opacity-100 translate-x-0"
            }`}
          >
            <div className="p-4 space-y-2 pb-safe">
              {/* User Profile Card */}
              <button
                onClick={() => handleMenuClick("account")}
                className="flex w-full items-center gap-4 rounded-2xl bg-bg-000 border border-border-100/10 p-4 text-left transition-all active:scale-[0.98] active:bg-bg-200"
              >
                <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center text-accent text-lg font-semibold">
                  A
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold text-text-100">
                    albertm
                  </div>
                  <div className="text-[13px] text-text-400">
                    Free plan · 查看账户
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-text-400 shrink-0" />
              </button>

              {/* Menu Items */}
              <div className="pt-2">
                {MENU_ITEMS.filter((item) => item.id !== "account").map(
                  (item, index) => (
                    <button
                      key={item.id}
                      onClick={() => handleMenuClick(item.id)}
                      className={`flex w-full items-center gap-4 bg-bg-000 p-4 text-left transition-all active:scale-[0.99] active:bg-bg-200 ${
                        index === 0
                          ? "rounded-t-2xl border-t border-x border-border-100/10"
                          : index ===
                              MENU_ITEMS.filter((i) => i.id !== "account")
                                .length -
                                1
                            ? "rounded-b-2xl border-b border-x border-border-100/10"
                            : "border-x border-border-100/10"
                      } border-b border-border-100/10`}
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-bg-200 text-text-300">
                        <item.icon className="h-[18px] w-[18px]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[15px] font-medium text-text-100">
                          {item.label}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-text-400 shrink-0" />
                    </button>
                  ),
                )}
              </div>

              {/* Help & Support */}
              <div className="pt-4">
                <button className="flex w-full items-center gap-4 rounded-2xl bg-bg-000 border border-border-100/10 p-4 text-left transition-all active:scale-[0.99] active:bg-bg-200">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-bg-200 text-text-300">
                    <HelpCircle className="h-[18px] w-[18px]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-medium text-text-100">
                      帮助与支持
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-text-400 shrink-0" />
                </button>
              </div>

              {/* Logout */}
              <div className="pt-4">
                <button className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border-100/10 bg-bg-000 p-4 text-text-300 active:bg-bg-200 transition-all active:scale-[0.99]">
                  <LogOut className="h-5 w-5" />
                  <span className="text-[15px] font-medium">退出登录</span>
                </button>
              </div>

              {/* Version Info */}
              <div className="pt-6 text-center">
                <p className="text-[13px] text-text-400">版本 1.0.0</p>
              </div>
            </div>
          </div>

          {/* Detail View */}
          <div
            className={`transition-all duration-200 ease-out ${
              activeSection
                ? "opacity-100 translate-x-0"
                : "opacity-0 translate-x-8 pointer-events-none absolute inset-0"
            }`}
          >
            <div className="p-4">{activeSection && renderContent()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
