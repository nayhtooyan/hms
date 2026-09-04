import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { useLanguage } from "../LanguageContext";
import { useSettings } from "../SettingsContext";

import { 
  LayoutDashboard, BedDouble, Home, CalendarCheck, Ticket, CreditCard, 
  Users, Settings, Sparkles, Menu, X, LogOut, ChevronDown,
  BarChart3, HardDrive, Brush
} from "lucide-react";

const navItems = [
  { to: "/", labelKey: "dashboard", icon: LayoutDashboard, end: true, roles: ["admin", "manager", "reception", "cleaner", "maintenance"] },
  { to: "/room-board", labelKey: "roomBoard", icon: BedDouble, roles: ["admin", "manager", "reception"] },
  { to: "/rooms", labelKey: "rooms", icon: Home, roles: ["admin", "manager", "reception"] },
  { to: "/reservations", labelKey: "reservations", icon: CalendarCheck, roles: ["admin", "manager", "reception"] },
  { to: "/vouchers", labelKey: "vouchers", icon: Ticket, roles: ["admin", "manager", "reception"] },
  { to: "/payments", labelKey: "payments", icon: CreditCard, roles: ["admin", "manager", "reception"] },
  { to: "/housekeeping", labelKey: "housekeeping", icon: Brush, roles: ["admin", "manager", "reception", "cleaner", "maintenance"] },
  { to: "/reports", labelKey: "reports", icon: BarChart3, roles: ["admin", "manager"] },
  { to: "/backups", labelKey: "backups", icon: HardDrive, roles: ["admin"] },
  { to: "/audit", labelKey: "auditLogs", icon: Sparkles, roles: ["admin", "manager"] },
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

  const role = user?.role || "reception";
  const visibleNavItems = navItems.filter((item) => role === "admin" || item.roles.includes(role));

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden animate-fade-in" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-72 bg-slate-900 z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} flex flex-col`}>
        
        {/* Brand */}
        <div className="h-20 flex items-center gap-3 px-6 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <BedDouble className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">
            {settings?.hotelName || t("hotelManagement")}
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50">
            <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold uppercase">
              {user?.name?.charAt(0) || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
            </div>
            <button className="btn sidebar-logout" onClick={() => { setSidebarOpen(false); logout(); }}>
            {t("logout")}
          </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-72 flex flex-col min-h-screen">
        
        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200/50 h-20 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)} 
              className="lg:hidden p-2 rounded-xl hover:bg-gray-100 text-gray-600"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-bold text-gray-800 hidden sm:block">
              {navItems.find(i => i.to === location.pathname)?.labelKey 
                ? t(navItems.find(i => i.to === location.pathname).labelKey) 
                : t("hotelManagement")}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <div className="flex items-center bg-gray-100 rounded-full p-1">
              <button 
                onClick={() => changeLanguage("en")} 
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${language === "en" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                EN
              </button>
              <button 
                onClick={() => changeLanguage("my")} 
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${language === "my" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                MM
              </button>
            </div>

            {/* Mobile Logout */}
            <button 
              onClick={logout} 
              className="lg:hidden p-2 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
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