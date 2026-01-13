import { Dialog } from "@base-ui/react/dialog";
import { Check, CreditCard, Database, HelpCircle, LayoutTemplate, Mail, Monitor, Settings, User, X } from "lucide-react";
import { useState } from "react";

interface SettingsModalProps {
  onClose: () => void;
}

const SIDEBAR_ITEMS = [
  { id: "account", label: "账户", icon: User },
  { id: "settings", label: "设置", icon: Settings, active: true },
  { id: "usage", label: "使用情况", icon: CreditCard },
  { id: "schedule", label: "定时任务", icon: CalendarIcon }, // Mock icon
  { id: "mail", label: "Mail Manus", icon: Mail },
  { id: "data", label: "数据控制", icon: Database },
  { id: "browser", label: "云浏览器", icon: LayoutTemplate },
  { id: "personalization", label: "个性化", icon: Settings }, // Reusing Settings icon for now
  { id: "connectors", label: "连接器", icon: CableIcon }, // Mock icon
  { id: "integrations", label: "集成", icon: CableIcon }, // Mock icon
];

// Helper icons
function CalendarIcon(props: any) {
  return <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
}
function CableIcon(props: any) {
  return <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a1 1 0 0 1-1-4H5a1 1 0 0 0-1 4v2"/><circle cx="17" cy="3" r="1"/><circle cx="5" cy="3" r="1"/><path d="M17 4v3a1 1 0 0 1-1 4h-2"/><path d="M5 4v3a1 1 0 0 0 1 4h2"/></svg>
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState("settings");
  const [theme, setTheme] = useState("light"); // 'light', 'dark', 'system'
  const [language, setLanguage] = useState("zh-CN");
  const [notifications, setNotifications] = useState({
    exclusive: true,
    email: true,
  });

  return (
    <Dialog.Root open={true} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex h-[85vh] max-h-200 w-[90vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-white shadow-2xl focus:outline-none">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0 border-r border-gray-100 bg-gray-50/50 p-4 flex flex-col">
            <div className="flex items-center gap-2 px-3 py-4 mb-2">
              <div className="h-6 w-6 rounded-full bg-black flex items-center justify-center text-white font-bold text-xs">
                M
              </div>
              <span className="font-semibold text-gray-900">manus</span>
            </div>

            <nav className="space-y-0.5 flex-1 overflow-y-auto min-h-0 pr-2 -mr-2">
              {SIDEBAR_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    activeTab === item.id
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:bg-gray-100/50 hover:text-gray-900"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="pt-4 border-t border-gray-100 mt-4">
              <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100/50 hover:text-gray-900 transition-colors">
                <HelpCircle className="h-4 w-4" />
                获取帮助
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col min-w-0 bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 px-8 py-4">
              <h2 className="text-xl font-semibold text-gray-900">设置</h2>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <div className="space-y-10 max-w-2xl">
                {/* General Section */}
                <section className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-500">通用</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">语言</label>
                      <div className="relative">
                        <select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                        >
                          <option value="zh-CN">简体中文</option>
                          <option value="en-US">English</option>
                        </select>
                        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Appearance Section */}
                <section className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-500">外观</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <button
                      onClick={() => setTheme("light")}
                      className={`group relative rounded-xl border p-1 text-left transition-all ${
                        theme === "light"
                          ? "border-blue-500 ring-1 ring-blue-500"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="mb-2 aspect-[4/3] rounded-lg bg-gray-50 border border-gray-100 p-2">
                        <div className="h-2 w-1/2 rounded bg-white shadow-sm mb-1.5" />
                        <div className="h-2 w-3/4 rounded bg-gray-200/50" />
                      </div>
                      <div className="px-1 pb-1">
                        <span className={`block text-sm font-medium ${theme === 'light' ? 'text-blue-600' : 'text-gray-700'}`}>浅色</span>
                      </div>
                      {theme === "light" && (
                        <div className="absolute right-2 top-2 rounded-full bg-blue-500 p-0.5 text-white">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </button>

                    <button
                      onClick={() => setTheme("dark")}
                      className={`group relative rounded-xl border p-1 text-left transition-all ${
                        theme === "dark"
                          ? "border-blue-500 ring-1 ring-blue-500"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="mb-2 aspect-[4/3] rounded-lg bg-gray-900 border border-gray-800 p-2">
                        <div className="h-2 w-1/2 rounded bg-gray-800 mb-1.5" />
                        <div className="h-2 w-3/4 rounded bg-gray-800/50" />
                      </div>
                      <div className="px-1 pb-1">
                        <span className={`block text-sm font-medium ${theme === 'dark' ? 'text-blue-600' : 'text-gray-700'}`}>深色</span>
                      </div>
                      {theme === "dark" && (
                        <div className="absolute right-2 top-2 rounded-full bg-blue-500 p-0.5 text-white">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </button>

                    <button
                      onClick={() => setTheme("system")}
                      className={`group relative rounded-xl border p-1 text-left transition-all ${
                        theme === "system"
                          ? "border-blue-500 ring-1 ring-blue-500"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="mb-2 aspect-[4/3] rounded-lg bg-gradient-to-br from-gray-50 to-gray-900 border border-gray-200 p-2 flex items-center justify-center">
                        <Monitor className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="px-1 pb-1">
                        <span className={`block text-sm font-medium ${theme === 'system' ? 'text-blue-600' : 'text-gray-700'}`}>跟随系统</span>
                      </div>
                      {theme === "system" && (
                        <div className="absolute right-2 top-2 rounded-full bg-blue-500 p-0.5 text-white">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </button>
                  </div>
                </section>

                {/* Notifications Section */}
                <section className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-500">通讯偏好</h3>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-900">接收独家内容</div>
                        <div className="text-xs text-gray-500 mt-0.5">获取独家优惠、活动更新、优秀案例示例和新功能指南。</div>
                      </div>
                      <button
                        onClick={() => setNotifications(prev => ({ ...prev, exclusive: !prev.exclusive }))}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          notifications.exclusive ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            notifications.exclusive ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-900">正在排队的任务开始时给我发送电子邮件</div>
                        <div className="text-xs text-gray-500 mt-0.5">启用后，一旦您的任务完成排队并开始处理，我们将及时发送电子邮件通知您。</div>
                      </div>
                      <button
                        onClick={() => setNotifications(prev => ({ ...prev, email: !prev.email }))}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          notifications.email ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            notifications.email ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </section>

                {/* Cookies Section */}
                <section className="space-y-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">管理 Cookies</span>
                    <button className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                      管理
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
