import {
  createContext,
  useContext,
  useState
} from "react";

const translations = {
  en: {
    dashboard: "Dashboard",
    roomBoard: "Room Board",
    rooms: "Rooms",
    reservations: "Reservations",
    vouchers: "Vouchers",
    payments: "Payments",
    users: "Users",
    settings: "Settings",
    housekeeping: "Housekeeping",
    logout: "Logout",
    invoice: "Invoice",
    hotelManagement: "Hotel Management",
    refresh: "Refresh",
    loading: "Loading",
    reports: "Reports",
  },

  my: {
    dashboard: "ဒက်ရှ်ဘုတ်",
    roomBoard: "အခန်းဘုတ်",
    rooms: "အခန်းများ",
    reservations: "ကြိုတင်ဘွတ်များ",
    vouchers: "ဘောက်ချာများ",
    payments: "ငွေပေးချေမှုများ",
    users: "အသုံးပြုသူများ",
    settings: "ဆက်တင်များ",
    housekeeping: "သန့်ရှင်းရေး",
    logout: "ထွက်ရန်",
    invoice: "ဘောင်ချာ",
    hotelManagement: "ဟိုတယ်စီမံခန့်ခွဲမှု",
    refresh: "အသစ်ပြန်လုပ်ရန်",
    loading: "ဖတ်နေသည်",
    reports: "အစီရင်ခံစာများ",
  }
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(
    localStorage.getItem("app_language") || "en"
  );

  const changeLanguage = (newLanguage) => {
    setLanguage(newLanguage);

    localStorage.setItem("app_language", newLanguage);
  };

  const t = (key) => {
    return (
      translations[language]?.[key] ||
      translations.en[key] ||
      key
    );
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        changeLanguage,
        t
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);