import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

import api from "../api";

import { useSettings } from "../SettingsContext";

export default function Invoice() {
  const { reservationId } = useParams();

  const {
    settings,
    formatMoney,
    formatDate,
    formatDateTime
  } = useSettings();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadInvoice = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(
          `/payments/invoice/${reservationId}`
        );

        setData(response.data);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            err.message ||
            "Failed to load invoice"
        );
      } finally {
        setLoading(false);
      }
    };

    loadInvoice();
  }, [reservationId]);

  if (loading) {
    return <div className="card">Loading invoice...</div>;
  }

  if (error) {
    return <div className="card error">{error}</div>;
  }

  if (!data) {
    return <div className="card">Invoice not found</div>;
  }

  const {
    reservation,
    payments,
    total,
    paid,
    balance
  } = data;

  const priceSnapshot = reservation.priceSnapshot || {};

  return (
    <div className="card invoice">
      <div className="no-print">
        <Link className="button-link" to="/payments">
          Back to Payments
        </Link>

        <button onClick={() => window.print()}>
          Print Invoice
        </button>
      </div>

      <h1>{settings?.hotelName || "Hotel Invoice"}</h1>

      {settings?.address ? <p>{settings.address}</p> : null}

      {settings?.contactPhone ? (
        <p>Phone: {settings.contactPhone}</p>
      ) : null}

      {settings?.contactEmail ? (
        <p>Email: {settings.contactEmail}</p>
      ) : null}

      <p>
        <strong>Invoice Date:</strong>{" "}
        {formatDateTime(new Date())}
      </p>

      <p>
        <strong>Booking No:</strong> {reservation.bookingNo}
      </p>

      <p>
        <strong>Reservation Status:</strong> {reservation.status}
      </p>

      <hr />

      <h3>Guest Details</h3>

      <p>
        <strong>Name:</strong> {reservation.guest?.name || "-"}
      </p>

      <p>
        <strong>Phone:</strong> {reservation.guest?.phone || "-"}
      </p>

      <hr />

      <h3>Room Details</h3>

      <p>
        <strong>Room:</strong>{" "}
        {reservation.roomId?.roomNumber || "-"}
      </p>

      <p>
        <strong>Room Type:</strong>{" "}
        {reservation.roomId?.roomType || "-"}
      </p>

      <p>
        <strong>Check-In:</strong>{" "}
        {formatDate(reservation.scheduledCheckIn)}
      </p>

      <p>
        <strong>Check-Out:</strong>{" "}
        {formatDate(reservation.scheduledCheckOut)}
      </p>

      <p>
        <strong>Actual Check-In:</strong>{" "}
        {formatDateTime(reservation.actualCheckIn)}
      </p>

      <p>
        <strong>Actual Check-Out:</strong>{" "}
        {formatDateTime(reservation.actualCheckOut)}
      </p>

      <hr />

      <h3>Charges</h3>

      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Amount</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td>Room Charge</td>
            <td>
              {formatMoney(priceSnapshot.roomCharge || 0)}
            </td>
          </tr>

          <tr>
            <td>Extra Bed Charge</td>
            <td>
              {formatMoney(priceSnapshot.extraBedCharge || 0)}
            </td>
          </tr>

          <tr>
            <td>Overtime Charge</td>
            <td>
              {formatMoney(priceSnapshot.overtimeCharge || 0)}
            </td>
          </tr>

          <tr>
            <td>Voucher Discount</td>
            <td>
              - {formatMoney(priceSnapshot.voucherDiscount || 0)}
            </td>
          </tr>

          <tr>
            <td>
              <strong>Total</strong>
            </td>
            <td>
              <strong>{formatMoney(total)}</strong>
            </td>
          </tr>
        </tbody>
      </table>

      <hr />

      <h3>Payments</h3>

      {payments.length === 0 ? (
        <p>No payments recorded.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Receipt No</th>
              <th>Date</th>
              <th>Method</th>
              <th>Amount</th>
            </tr>
          </thead>

          <tbody>
            {payments.map((payment) => (
              <tr key={payment._id}>
                <td>{payment.receiptNo}</td>
                <td>{formatDateTime(payment.createdAt)}</td>
                <td>{payment.method}</td>
                <td>{formatMoney(payment.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <hr />

      <h3>Summary</h3>

      <p>
        <strong>Total:</strong> {formatMoney(total)}
      </p>

      <p>
        <strong>Paid:</strong> {formatMoney(paid)}
      </p>

      <p>
        <strong>Balance:</strong> {formatMoney(balance)}
      </p>

      {balance === 0 ? (
        <p className="success">PAID IN FULL</p>
      ) : (
        <p className="error">BALANCE DUE</p>
      )}

      {settings?.invoiceFooter ? (
        <p style={{ textAlign: "center", marginTop: "20px" }}>
          {settings.invoiceFooter}
        </p>
      ) : null}
    </div>
  );
}