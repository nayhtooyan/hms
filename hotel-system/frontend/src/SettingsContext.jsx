import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback
} from "react";

import api from "./api";

import { useAuth } from "./AuthContext";

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const { user } = useAuth();

  const [settings, setSettings] = useState(null);

  const loadSettings = useCallback(async () => {
    if (!user) {
      setSettings(null);
      return;
    }

    try {
      const response = await api.get("/settings");

      setSettings(response.data);

      localStorage.setItem(
        "hotel_settings",
        JSON.stringify(response.data)
      );
    } catch (error) {
      console.error("Failed to load settings", error);
    }
  }, [user]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const getTimeZone = () => {
    if (!settings?.timezone || settings.timezone === "Auto") {
      return undefined;
    }

    return settings.timezone;
  };

  const formatDate = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    try {
      return date.toLocaleDateString(undefined, {
        timeZone: getTimeZone()
      });
    } catch (error) {
      return date.toLocaleDateString();
    }
  };

  const formatDateTime = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    try {
      return date.toLocaleString(undefined, {
        timeZone: getTimeZone()
      });
    } catch (error) {
      return date.toLocaleString();
    }
  };

  const formatMoney = (amount) => {
    const symbol = settings?.currencySymbol || "$";
    const currency = settings?.currency || "USD";

    const decimalDigits = currency === "MMK" ? 0 : 2;

    const numberValue = Number(amount || 0).toLocaleString(undefined, {
      minimumFractionDigits: decimalDigits,
      maximumFractionDigits: decimalDigits
    });

    return `${symbol}${numberValue}`;
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        refreshSettings: loadSettings,
        formatDate,
        formatDateTime,
        formatMoney
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);