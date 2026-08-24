import { useEffect, useState } from "react";

import api from "../api";

import { useAuth } from "../AuthContext";

import ResponsiveTable from "../components/ResponsiveTable.jsx";

const roles = [
  "admin",
  "manager",
  "reception",
  "cleaner",
  "maintenance"
];

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString();
};

export default function Users() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [editingUser, setEditingUser] = useState(null);

  const [form, setForm] = useState({
    name: "",
    username: "",
    password: "",
    role: "reception"
  });

  const [passwordUser, setPasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/users?includeInactive=true");

      setUsers(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const resetForm = () => {
    setEditingUser(null);

    setForm({
      name: "",
      username: "",
      password: "",
      role: "reception"
    });
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const openCreateForm = () => {
    resetForm();
    setPasswordUser(null);
    setMessage("");
    setError("");
  };

  const openEditForm = (user) => {
    setEditingUser(user);
    setPasswordUser(null);
    setMessage("");
    setError("");

    setForm({
      name: user.name,
      username: user.username,
      password: "",
      role: user.role
    });
  };

  const submitUser = async (e) => {
    e.preventDefault();

    try {
      setMessage("");
      setError("");

      if (editingUser) {
        const payload = {
          name: form.name,
          username: form.username,
          role: form.role
        };

        await api.patch(`/users/${editingUser._id}`, payload);

        setMessage("User updated successfully");
      } else {
        if (!form.password) {
          setError("Password is required");
          return;
        }

        await api.post("/users", form);

        setMessage("User created successfully");
      }

      resetForm();

      loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save user");
    }
  };

  const openPasswordForm = (user) => {
    setPasswordUser(user);
    setEditingUser(null);
    setNewPassword("");
    setConfirmPassword("");
    setMessage("");
    setError("");
  };

  const submitPassword = async (e) => {
    e.preventDefault();

    try {
      setMessage("");
      setError("");

      if (newPassword.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }

      if (newPassword !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      await api.patch(`/users/${passwordUser._id}/password`, {
        password: newPassword
      });

      setMessage("Password updated successfully");

      setPasswordUser(null);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update password");
    }
  };

  const toggleActive = async (user) => {
    try {
      setMessage("");
      setError("");

      await api.patch(`/users/${user._id}/active`, {
        active: !user.active
      });

      setMessage(
        user.active ? "User disabled successfully" : "User enabled successfully"
      );

      loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update user status");
    }
  };

  const columns = [
    {
      key: "name",
      label: "Name"
    },
    {
      key: "username",
      label: "Username"
    },
    {
      key: "role",
      label: "Role"
    },
    {
      key: "active",
      label: "Status",
      render: (row) => (
        <span className={row.active ? "ad-positive" : "ad-negative"}>
          {row.active ? "Active" : "Disabled"}
        </span>
      )
    },
    {
      key: "createdAt",
      label: "Created",
      render: (row) => formatDate(row.createdAt)
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => {
        const isCurrentUser =
          String(currentUser?.id) === String(row._id);

        return (
          <div className="action-stack">
            <button
              className="btn btn-secondary"
              onClick={() => openEditForm(row)}
            >
              Edit
            </button>

            <button
              className="btn btn-primary"
              onClick={() => openPasswordForm(row)}
            >
              Reset Password
            </button>

            {isCurrentUser ? null : row.active ? (
              <button
                className="btn btn-danger"
                onClick={() => toggleActive(row)}
              >
                Disable
              </button>
            ) : (
              <button
                className="btn btn-success"
                onClick={() => toggleActive(row)}
              >
                Enable
              </button>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="page">
      <div className="page-card">
        <div className="page-header">
          <div>
            <h2 className="page-title">
              {editingUser ? "Edit User" : "Create User"}
            </h2>

            <div className="page-subtitle">
              Manage system users and roles.
            </div>
          </div>

          {!editingUser ? (
            <button className="btn btn-primary" onClick={openCreateForm}>
              New User
            </button>
          ) : null}
        </div>

        {message ? <div className="alert alert-success">{message}</div> : null}
        {error ? <div className="alert alert-error">{error}</div> : null}

        <form onSubmit={submitUser} className="form-grid">
          <div className="form-field">
            <label>Name</label>

            <input
              name="name"
              placeholder="Full name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-field">
            <label>Username</label>

            <input
              name="username"
              placeholder="Username"
              value={form.username}
              onChange={handleChange}
              required
            />
          </div>

          {!editingUser ? (
            <div className="form-field">
              <label>Password</label>

              <input
                type="password"
                name="password"
                placeholder="Minimum 6 characters"
                value={form.password}
                onChange={handleChange}
              />
            </div>
          ) : null}

          <div className="form-field">
            <label>Role</label>

            <select
              name="role"
              value={form.role}
              onChange={handleChange}
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              {editingUser ? "Update User" : "Create User"}
            </button>

            {editingUser ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={resetForm}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </div>

      {passwordUser ? (
        <div className="page-card">
          <div className="page-header">
            <div>
              <h2 className="page-title">Reset Password</h2>

              <div className="page-subtitle">
                User: {passwordUser.name}
              </div>
            </div>

            <button
              className="btn btn-secondary"
              onClick={() => setPasswordUser(null)}
            >
              Close
            </button>
          </div>

          <form onSubmit={submitPassword} className="form-grid">
            <div className="form-field">
              <label>New Password</label>

              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <label>Confirm Password</label>

              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Update Password
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="page-card">
        <div className="page-header">
          <div>
            <h2 className="page-title">Users</h2>

            <div className="page-subtitle">
              Active and disabled users.
            </div>
          </div>
        </div>

        {loading ? <div>Loading users...</div> : null}

        {!loading ? (
          <ResponsiveTable
            columns={columns}
            data={users}
            keyField="id"
            emptyMessage="No users found."
          />
        ) : null}
      </div>
    </div>
  );
}