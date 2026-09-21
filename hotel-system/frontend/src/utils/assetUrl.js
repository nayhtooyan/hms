import api from "../api";

export const getBackendOrigin = () => {
  const base = api.defaults?.baseURL || "/api";
  if (/^https?:\/\//i.test(base)) {
    try {
      return new URL(base).origin;
    } catch (e) {
      /* fall through */
    }
  }
  return "";
};

export const assetUrl = (p) => {
  if (!p) return "";
  const path = p.startsWith("/") ? p : `/${p}`;

  const base = api.defaults?.baseURL || "/api";

  if (/^https?:\/\//i.test(base)) {
    try {
      return `${new URL(base).origin}${path}`;
    } catch (e) {
      /* fall through */
    }
  }

  return path;
};