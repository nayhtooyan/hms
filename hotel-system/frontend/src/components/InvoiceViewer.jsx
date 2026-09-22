import { useEffect } from "react";
import InvoiceDocument from "./InvoiceDocument";
import { useLanguage } from "../LanguageContext";
import { ArrowLeft, Printer, X } from "lucide-react";

export default function InvoiceViewer({ reservationId, onClose }) {
  const { t } = useLanguage();

  // Close with Escape key
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="invoice-viewer-overlay fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm overflow-y-auto">
      {/* Toolbar  */}
      <div className="invoice-viewer-toolbar no-print sticky top-0 z-10 bg-gray-900/95 backdrop-blur border-b border-gray-700 px-4 py-3 flex items-center justify-between gap-3">
        <button onClick={onClose} className="btn-secondary flex items-center gap-2 text-sm">
          <ArrowLeft className="w-4 h-4" /> {t("back")}
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="btn-primary flex items-center gap-2 text-sm">
            <Printer className="w-4 h-4" /> {t("print")}
          </button>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Invoice sheet */}
      <div className="invoice-viewer-scroll py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <InvoiceDocument reservationId={reservationId} />
        </div>
      </div>
    </div>
  );
}