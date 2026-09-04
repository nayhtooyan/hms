import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import { LanguageProvider } from "./LanguageContext";
import { SettingsProvider } from "./SettingsContext";
import { ToastProvider } from "./components/ToastContext"; // Import Toast
import { SocketProvider } from "./SocketContext";

import AppLayout from "./components/AppLayout.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Rooms from "./pages/Rooms.jsx";
import Reservations from "./pages/Reservations.jsx";
import Vouchers from "./pages/Vouchers.jsx";
import Payments from "./pages/Payments.jsx";
import Invoice from "./pages/Invoice.jsx";
import RoomBoard from "./pages/RoomBoard.jsx";
import Housekeeping from "./pages/Housekeeping.jsx";
import Users from "./pages/Users.jsx";
import Settings from "./pages/Settings.jsx";
import Reports from "./pages/Reports.jsx";
import Backups from "./pages/Backups.jsx";
import AuditLogs from "./pages/AuditLogs.jsx";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
}



export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <SettingsProvider>
          <ToastProvider>
            <SocketProvider>
              <BrowserRouter>
                <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  path="/"
                  element={
                    <Protected>
                      <AppLayout />
                    </Protected>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="room-board" element={<RoomBoard />} />
                  <Route path="rooms" element={<Rooms />} />
                  <Route path="reservations" element={<Reservations />} />
                  <Route path="vouchers" element={<Vouchers />} />
                  <Route path="payments" element={<Payments />} />
                  <Route path="invoice/:reservationId" element={<Invoice />} />
                  <Route path="housekeeping" element={<Housekeeping />} />
                  <Route path="users" element={<Users />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="backups" element={<Backups />} />
                  <Route path="audit" element={<AuditLogs />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
              </BrowserRouter>
            </SocketProvider>
          </ToastProvider>
        </SettingsProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}