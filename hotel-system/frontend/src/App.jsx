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
        <Link to="/rooms">Rooms</Link>
        <Link to="/reservations">Reservations</Link>

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
            <Route path="rooms" element={<Rooms />} />
            <Route path="reservations" element={<Reservations />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}