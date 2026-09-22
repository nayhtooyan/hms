import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { InvoiceSheet } from "../components/InvoiceOverlay";
import { useLanguage } from "../LanguageContext";
import { Printer, ArrowLeft } from "lucide-react";


export default function Invoice() {
  const { reservationId } = useParams();
  const { t } = useLanguage();

  useEffect(() => {
    const original = document.title;
    document.title = `Invoice-${reservationId}`;
    return () => { document.title = original; };
  }, [reservationId]);

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex gap-3 mb-6 no-print">
        <Link to="/payments" className="btn-secondary flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> {t("back")}
        </Link>
        <button onClick={() => window.print()} className="btn-primary flex items-center gap-2">
          <Printer className="w-4 h-4" /> {t("print")}
        </button>
      </div>
      <InvoiceSheet reservationId={reservationId} />
    </div>
  );
}