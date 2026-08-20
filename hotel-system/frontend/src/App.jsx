import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
  Outlet
} from "react-router-dom";

import { AuthProvider, useAuth } from "./AuthContext";

import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Rooms from "./pages/Rooms.jsx";
import Reservations from "./pages/Reservations.jsx";
import Vouchers from "./pages/Vouchers.jsx";
import Payments from "./pages/Payments.jsx";
import Invoice from "./pages/Invoice.jsx";
import RoomBoard from "./pages/RoomBoard.jsx";
import Housekeeping from "./pages/Housekeeping.jsx";

function Protected({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
}

function Layout() {
  const { user, logout } = useAuth();

  return (
    <div>
      <header>
        <strong>Hotel System</strong>

        <Link to="/">Dashboard</Link>
        <Link to="/room-board">Room Board</Link>
        <Link to="/rooms">Rooms</Link>
        <Link to="/reservations">Reservations</Link>
        <Link to="/vouchers">Vouchers</Link>
        <Link to="/payments">Payments</Link>
        <Link to="/housekeeping">Housekeeping</Link>

        <div style={{ marginLeft: "auto" }}>
          {user?.name} - {user?.role}
          <button onClick={logout}>Logout</button>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <Protected>
                <Layout />
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
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}