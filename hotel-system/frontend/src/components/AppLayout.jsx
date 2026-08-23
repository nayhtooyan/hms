import { useEffect, useState } from "react";
import {
  NavLink,
  Outlet,
  useLocation
} from "react-router-dom";

import { useAuth } from "../AuthContext";

import "./AppLayout.css";

const navItems = [
  {
    to: "/",
    label: "Dashboard",
    icon: "",
    end: true,
    roles: ["admin", "manager", "reception", "cleaner", "maintenance"]
  },
  {
    to: "/room-board",
    label: "Room Board",
    icon: "",
    roles: ["admin", "manager", "reception", "cleaner", "maintenance"]
  },
  {
    to: "/rooms",
    label: "Rooms",
    icon: "",
    roles: ["admin", "manager", "reception"]
  },
  {
    to: "/reservations",
    label: "Reservations",
    icon: "",
    roles: ["admin", "manager", "reception"]
  },
  {
    to: "/vouchers",
    label: "Vouchers",
    icon: "",
    roles: ["admin", "manager", "reception"]
  },
  {
    to: "/payments",
    label: "Payments",
    icon: "",
    roles: ["admin", "manager", "reception"]
  },
  {
    to: "/housekeeping",
    label: "Housekeeping",
    icon: "",
    roles: ["admin", "manager", "reception", "cleaner", "maintenance"]
  }
];

export default function AppLayout() {
  const { user, logout } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const role = user?.role || "reception";

  const visibleNavItems = navItems.filter((item) => {
    if (role === "admin") return true;

    return item.roles.includes(role);
  });

  const getPageTitle = () => {
    if (location.pathname === "/") {
      return "Dashboard";
    }

    if (location.pathname.startsWith("/invoice")) {
      return "Invoice";
    }

    const currentNav = navItems.find(
      (item) => item.to === location.pathname
    );

    return currentNav?.label || "Hotel Management";
  };

  return (
    <div className="app-shell">
      <aside
        className={`sidebar ${sidebarOpen ? "open" : ""}`}
      >
        <div className="sidebar-brand">
          <span></span>
          <span>Hotel PMS</span>
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
              <span>{item.label}</span>
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
            Logout
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
            <div className="topbar-user">
              <div className="topbar-user-name">
                {user?.name || "User"}
              </div>

              <div className="topbar-user-role">
                {user?.role || "user"}
              </div>
            </div>

            <button className="topbar-logout" onClick={logout}>
              Logout
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