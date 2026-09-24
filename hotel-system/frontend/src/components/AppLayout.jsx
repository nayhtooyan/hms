import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { useLanguage } from "../LanguageContext";
import { useSettings } from "../SettingsContext";
import NotificationBell from "./NotificationBell";
import { assetUrl } from "../utils/assetUrl";
import {
  LayoutDashboard, BedDouble,  Home, CalendarCheck, Ticket, CreditCard,
  Users, Settings, FolderCode, Menu, X, LogOut, ChevronDown,
  BarChart3, HardDrive, Brush , Birdhouse , BuildingComplex
} from "lucide-react";

const navItems = [
  { to: "/", labelKey: "dashboard", icon: LayoutDashboard, end: true, roles: ["admin", "manager", "reception", "cleaner", "maintenance"] },
  { to: "/room-board", labelKey: "roomBoard", icon: BedDouble, roles: ["admin", "manager", "reception"] },
  { to: "/rooms", labelKey: "rooms", icon: Home, roles: ["admin", "manager", "reception"] },
  { to: "/reservations", labelKey: "reservations", icon: CalendarCheck, roles: ["admin", "manager", "reception"] },
  { to: "/vouchers", labelKey: "vouchers", icon: Ticket, roles: ["admin", "manager", "reception"] },
  { to: "/payments", labelKey: "payments", icon: CreditCard, roles: ["admin", "manager", "reception"] },
  { to: "/housekeeping", labelKey: "housekeeping", icon: Birdhouse, roles: ["admin", "manager", "reception", "cleaner", "maintenance"] },
  { to: "/reports", labelKey: "reports", icon: BarChart3, roles: ["admin", "manager"] },
  { to: "/backups", labelKey: "backups", icon: HardDrive, roles: ["admin"] },
  { to: "/audit", labelKey: "auditLogs", icon: FolderCode, roles: ["admin", "manager"] },
  { to: "/users", labelKey: "users", icon: Users, roles: ["admin"] },
  { to: "/settings", labelKey: "settings", icon: Settings, roles: ["admin"] },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { t, language, changeLanguage } = useLanguage();
  const { settings } = useSettings();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (settings?.logoUrl) {
        let link = document.querySelector("link[rel='icon']");
        if (!link) {
          link = document.createElement("link");
          link.rel = "icon";
          document.head.appendChild(link);
        }
        link.href = assetUrl(settings.logoUrl);
      }
    }, [settings?.logoUrl]);

  const role = user?.role || "reception";
  const visibleNavItems = navItems.filter((item) => role === "admin" || item.roles.includes(role));

  const getPageTitle = () => {
    if (location.pathname === "/") return t("dashboard");
    if (location.pathname.startsWith("/invoice")) return t("invoice");
    const currentNav = navItems.find(i => i.to === location.pathname);
    return currentNav ? t(currentNav.labelKey) : t("hotelManagement");
  };

  return (
    <div className="min-h-screen bg-gray-950">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-72 z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Sidebar Background with Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-900 to-purple-950/50" />
        
        <div className="relative flex flex-col h-full">
          {/* Brand */}
          <div className="h-20 flex items-center gap-3 px-6 border-b border-gray-800/50">
            {settings?.logoUrl ? (
              <img
                src={assetUrl(settings.logoUrl)}
                alt="logo"
                className="w-10 h-10 rounded-xl object-contain bg-white/90 p-1 shadow-glow"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-glow">
                <button className="w-6 h-6" />
              </div>
            )}
            <div>
              <span className="text-lg font-bold text-white tracking-tight block">
                {settings?.hotelName || t("hotelManagement")}
              </span>
              <span className="text-xs text-purple-300/70">Hotel Management System</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5">
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? "bg-gradient-to-r from-purple-600/20 to-indigo-600/20 text-white border border-purple-500/30 shadow-glow"
                    : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
                }`}
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={`w-5 h-5 ${isActive ? "text-purple-400" : ""}`} />
                    <span>{t(item.labelKey)}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-gray-800/50">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/30 border border-gray-700/30">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold uppercase text-sm">
                {user?.name?.charAt(0) || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user?.name || "User"}</p>
                <p className="text-xs text-purple-300/70 capitalize">{user?.role || "user"}</p>
              </div>
              <button
                onClick={logout}
                className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title={t("logout")}
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-72 flex flex-col min-h-screen">
        
        {/* Topbar */}
        <header className="sticky top-0 z-30 glass-dark border-b border-gray-800/50 h-20 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-bold text-white hidden sm:block">
              {getPageTitle()}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <div className="flex items-center bg-gray-800/50 rounded-full p-1 border border-gray-700/50">
              <button
                onClick={() => changeLanguage("en")}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  language === "en"
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-glow"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                EN
              </button>
              <button
                onClick={() => changeLanguage("my")}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  language === "my"
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-glow"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                MM
              </button>
            </div>

            <NotificationBell />

            {/* Mobile Logout */}
            <button
              onClick={logout}
              className="lg:hidden p-2 rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}