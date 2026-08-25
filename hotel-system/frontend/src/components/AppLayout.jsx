import { useEffect, useState } from "react";
import {
  NavLink,
  Outlet,
  useLocation
} from "react-router-dom";

import { useAuth } from "../AuthContext";
import { useLanguage } from "../LanguageContext";

import "./AppLayout.css";
import { useSettings } from "../SettingsContext";

const navItems = [
  {
    to: "/",
    labelKey: "dashboard",
    icon: "",
    end: true,
    roles: ["admin", "manager", "reception", "cleaner", "maintenance"]
  },
  {
    to: "/room-board",
    labelKey: "roomBoard",
    icon: "",
    roles: ["admin", "manager", "reception", "cleaner", "maintenance"]
  },
  {
    to: "/rooms",
    labelKey: "rooms",
    icon: "",
    roles: ["admin", "manager", "reception"]
  },
  {
    to: "/reservations",
    labelKey: "reservations",
    icon: "",
    roles: ["admin", "manager", "reception"]
  },
  {
    to: "/vouchers",
    labelKey: "vouchers",
    icon: "",
    roles: ["admin", "manager", "reception"]
  },
  {
    to: "/payments",
    labelKey: "payments",
    icon: "",
    roles: ["admin", "manager", "reception"]
  },
  {
    to: "/housekeeping",
    labelKey: "housekeeping",
    icon: "",
    roles: ["admin", "manager", "reception", "cleaner", "maintenance"]
  },
  {
    to: "/users",
    labelKey: "users",
    icon: "",
    roles: ["admin"]
  },
  {
    to: "/settings",
    labelKey: "settings",
    icon: "",
    roles: ["admin"]
  }
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
  document.title = settings?.hotelName || "Hotel Management";
  }, [settings]);

  const role = user?.role || "reception";

  const visibleNavItems = navItems.filter((item) => {
    if (role === "admin") return true;

    return item.roles.includes(role);
  });

  const getPageTitle = () => {
    if (location.pathname === "/") {
      return t("dashboard");
    }

    if (location.pathname.startsWith("/invoice")) {
      return t("invoice");
    }

    const currentNav = navItems.find(
      (item) => item.to === location.pathname
    );

    return currentNav
      ? t(currentNav.labelKey)
      : t("hotelManagement");
  };

  return (
    <div className="app-shell">
      <aside
        className={`sidebar ${sidebarOpen ? "open" : ""}`}
      >
        <div className="sidebar-brand">
          <span></span>
          <span>{settings?.hotelName || t("hotelManagement")}</span>
        </div>

        <nav className="sidebar-nav">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span>{t(item.labelKey)}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-name">{user?.name || "User"}</div>
            <div className="user-role">{user?.role || "user"}</div>
          </div>

          <button
            className="sidebar-logout"
            onClick={() => {
              setSidebarOpen(false);
              logout();
            }}
          >
            {t("logout")}
          </button>
        </div>
      </aside>

      {sidebarOpen ? (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div className="main-area">
        <header className="topbar">
          <button
            className="menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            ☰
          </button>

          <div className="topbar-title">{getPageTitle()}</div>

          <div className="topbar-right">
            <div className="action-stack">
              <button
                className={
                  language === "en"
                    ? "btn btn-primary"
                    : "btn btn-secondary"
                }
                onClick={() => changeLanguage("en")}
              >
                EN
              </button>

              <button
                className={
                  language === "my"
                    ? "btn btn-primary"
                    : "btn btn-secondary"
                }
                onClick={() => changeLanguage("my")}
              >
                MM
              </button>
            </div>

            <div className="topbar-user">
              <div className="topbar-user-name">
                {user?.name || "User"}
              </div>

              <div className="topbar-user-role">
                {user?.role || "user"}
              </div>
            </div>

            <button className="topbar-logout" onClick={logout}>
              {t("logout")}
            </button>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}