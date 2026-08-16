import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../AuthContext.jsx";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();

    try {
      setError("");

      await login(username, password);

      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div style={{ maxWidth: 350, margin: "100px auto" }}>
      <div className="card">
        <h2>Hotel Login</h2>

        {error ? <div className="error">{error}</div> : null}

        <form onSubmit={submit}>
          <div>
            <input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit">Login</button>
        </form>

        <p>
          Default admin after seed:
          <br />
          admin / admin123
        </p>
      </div>
    </div>
  );
}