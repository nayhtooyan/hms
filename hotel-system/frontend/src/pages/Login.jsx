import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { useLanguage } from "../LanguageContext";
import api from "../api";
import { assetUrl } from "../utils/assetUrl";
import { BedDouble, Eye, EyeOff, Loader2 } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const { t, language, changeLanguage } = useLanguage();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [localSettings, setLocalSettings] = useState(null);

  // Fetch public settings (logo + hotel name) without auth
  useEffect(() => {
    api
      .get("/settings")
      .then((res) => setLocalSettings(res.data))
      .catch(() => setLocalSettings({}));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      await login(username, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || t("invalidCredentials"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      {/* Language Switcher */}
      <div className="absolute top-6 right-6 z-10 flex items-center bg-gray-800/50 rounded-full p-1 border border-gray-700/50">
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

      <div className="relative w-full max-w-md animate-slide-up">
        {/* Logo / Fallback Icon */}
        <div className="text-center mb-8">
          {localSettings?.logoUrl ? (
            <img
              src={assetUrl(localSettings.logoUrl)}
              alt="logo"
              className="inline-block w-20 h-20 rounded-2xl object-contain bg-white/90 p-2 shadow-glow-lg mb-4"
            />
          ) : (
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-glow-lg mb-4">
              <BedDouble className="w-8 h-8 text-white" />
            </div>
          )}
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            {localSettings?.hotelName || t("loginTitle")}
          </h1>
          <p className="text-gray-500 mt-2">{t("loginSubtitle")}</p>
        </div>

        {/* Login Card */}
        <div className="card-dark p-8 backdrop-blur-xl">
          {error && <div className="alert-dark-error mb-6">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="label-dark">{t("username")}</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-dark"
                placeholder={t("username")}
                required
              />
            </div>

            <div>
              <label className="label-dark">{t("password")}</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-dark pr-12"
                  placeholder={t("password")}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-purple-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full btn-primary py-4 text-base">
              {loading && <Loader2 className="w-5 h-5 animate-spin mr-2 inline" />}
              {loading ? t("signingIn") : t("signIn")}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-sm mt-6">{t("loginFooter")}</p>
      </div>
    </div>
  );
}