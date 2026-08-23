import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import api from "../api";

import ResponsiveTable from "../components/ResponsiveTable.jsx";

const formatMoney = (value) => {
  return `$${Number(value || 0).toFixed(2)}`;
};

const formatDateTime = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString();
};

export default function Payments() {
  const [reservations, setReservations] = useState([]);
  const [payments, setPayments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [selectedReservation, setSelectedReservation] = useState(null);

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    method: "cash",
    reference: "",
    note: ""
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [reservationResponse, paymentResponse] = await Promise.all([
        api.get("/reservations"),
        api.get("/payments")
      ]);

      setReservations(reservationResponse.data);
      setPayments(paymentResponse.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getPaidAmount = (reservationId) => {
    return payments
      .filter((payment) => {
        const paymentReservationId =
          payment.reservationId?._id || payment.reservationId;

        return (
          payment.status === "completed" &&
          String(paymentReservationId) === String(reservationId)
        );
      })
      .reduce((sum, payment) => {
        return sum + Number(payment.amount || 0);
      }, 0);
  };

  const openPaymentForm = (reservation) => {
    const total = Number(reservation.priceSnapshot?.total || 0);
    const paid = getPaidAmount(reservation._id);
    const balance = total - paid;

    setSelectedReservation(reservation);

    setPaymentForm({
      amount: balance > 0 ? balance : "",
      method: "cash",
      reference: "",
      note: ""
    });

    setMessage("");
    setError("");
  };

  const closePaymentForm = () => {
    setSelectedReservation(null);

    setPaymentForm({
      amount: "",
      method: "cash",
      reference: "",
      note: ""
    });
  };

  const handlePaymentChange = (e) => {
    setPaymentForm({
      ...paymentForm,
      [e.target.name]: e.target.value
    });
  };

  const submitPayment = async (e) => {
    e.preventDefault();

    try {
      setMessage("");
      setError("");

      const payload = {
        reservationId: selectedReservation._id,
        amount: Number(paymentForm.amount),
        method: paymentForm.method,
        reference: paymentForm.reference,
        note: paymentForm.note
      };

      await api.post("/payments", payload);

      setMessage("Payment recorded successfully");

      closePaymentForm();

      loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Payment failed");
    }
  };

  const reservationColumns = [
    {
      key: "bookingNo",
      label: "Booking"
    },
    {
      key: "room",
      label: "Room",
      render: (row) => row.roomId?.roomNumber || "-"
    },
    {
      key: "guest",
      label: "Guest",
      render: (row) => row.guest?.name || "-"
    },
    {
      key: "status",
      label: "Status"
    },
    {
      key: "total",
      label: "Total",
      render: (row) => formatMoney(row.priceSnapshot?.total)
    },
    {
      key: "paid",
      label: "Paid",
      render: (row) => formatMoney(getPaidAmount(row._id))
    },
    {
      key: "balance",
      label: "Balance",
      render: (row) => {
        const total = Number(row.priceSnapshot?.total || 0);
        const paid = getPaidAmount(row._id);
        const balance = total - paid;

        return (
          <span className={balance > 0 ? "ad-negative" : "ad-positive"}>
            {formatMoney(balance)}
          </span>
        );
      }
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => {
        const total = Number(row.priceSnapshot?.total || 0);
        const paid = getPaidAmount(row._id);
        const balance = total - paid;

        return (
          <div className="action-stack">
            {balance > 0 && row.status !== "cancelled" ? (
              <button
                className="btn btn-primary"
                onClick={() => openPaymentForm(row)}
              >
                Pay
              </button>
            ) : null}

            <Link
              className="btn-link"
              to={`/invoice/${row._id}`}
            >
              Invoice
            </Link>
          </div>
        );
      }
    }
  ];

  const paymentColumns = [
    {
      key: "receiptNo",
      label: "Receipt"
    },
    {
      key: "booking",
      label: "Booking",
      render: (row) => row.reservationId?.bookingNo || "-"
    },
    {
      key: "room",
      label: "Room",
      render: (row) => row.reservationId?.roomId?.roomNumber || "-"
    },
    {
      key: "method",
      label: "Method"
    },
    {
      key: "amount",
      label: "Amount",
      render: (row) => formatMoney(row.amount)
    },
    {
      key: "createdAt",
      label: "Date",
      render: (row) => formatDateTime(row.createdAt)
    }
  ];

  return (
    <div className="page">
      <div className="page-card">
        <div className="page-header">
          <div>
            <h2 className="page-title">Payments</h2>

            <div className="page-subtitle">
              Record payments and view balances.
            </div>
          </div>
        </div>

        {loading ? <div>Loading...</div> : null}

        {message ? <div className="alert alert-success">{message}</div> : null}
        {error ? <div className="alert alert-error">{error}</div> : null}
      </div>

      {selectedReservation ? (
        <div className="page-card">
          <div className="page-header">
            <div>
              <h2 className="page-title">Record Payment</h2>

              <div className="page-subtitle">
                Booking: {selectedReservation.bookingNo}
              </div>
            </div>

            <button
              className="btn btn-secondary"
              onClick={closePaymentForm}
            >
              Close
            </button>
          </div>

          <form onSubmit={submitPayment} className="form-grid">
            <div className="form-field">
              <label>Amount</label>

              <input
                type="number"
                name="amount"
                value={paymentForm.amount}
                onChange={handlePaymentChange}
                required
              />
            </div>

            <div className="form-field">
              <label>Method</label>

              <select
                name="method"
                value={paymentForm.method}
                onChange={handlePaymentChange}
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-field">
              <label>Reference</label>

              <input
                name="reference"
                placeholder="Transaction ID / reference"
                value={paymentForm.reference}
                onChange={handlePaymentChange}
              />
            </div>

            <div className="form-field">
              <label>Note</label>

              <input
                name="note"
                placeholder="Payment note"
                value={paymentForm.note}
                onChange={handlePaymentChange}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Save Payment
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="page-card">
        <div className="page-header">
          <div>
            <h2 className="page-title">Reservation Balances</h2>

            <div className="page-subtitle">
              See total, paid and remaining balance.
            </div>
          </div>
        </div>

        <ResponsiveTable
          columns={reservationColumns}
          data={reservations}
          emptyMessage="No reservations found."
        />
      </div>

      <div className="page-card">
        <div className="page-header">
          <div>
            <h2 className="page-title">Recent Payments</h2>

            <div className="page-subtitle">
              Latest recorded payments.
            </div>
          </div>
        </div>

        <ResponsiveTable
          columns={paymentColumns}
          data={payments}
          emptyMessage="No payments found."
        />
      </div>
    </div>
  );
}