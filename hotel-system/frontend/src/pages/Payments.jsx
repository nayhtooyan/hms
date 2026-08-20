import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import api from "../api";

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
      setError(err.response?.data?.message || err.message || "Failed to load data");
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
        const paymentReservationId = payment.reservationId?._id || payment.reservationId;

        return (
          payment.status === "completed" &&
          String(paymentReservationId) === String(reservationId)
        );
      })
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
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
    setMessage("");
    setError("");
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

      setSelectedReservation(null);

      setPaymentForm({
        amount: "",
        method: "cash",
        reference: "",
        note: ""
      });

      loadData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Payment failed");
    }
  };

  return (
    <div>
      <div className="card">
        <h2>Payments</h2>

        {loading ? <div>Loading...</div> : null}

        {message ? <div className="success">{message}</div> : null}
        {error ? <div className="error">{error}</div> : null}
      </div>

      {selectedReservation ? (
        <div className="card">
          <h2>Record Payment</h2>

          <p>
            <strong>Booking:</strong> {selectedReservation.bookingNo}
          </p>

          <p>
            <strong>Guest:</strong> {selectedReservation.guest?.name || "-"}
          </p>

          <p>
            <strong>Room:</strong> {selectedReservation.roomId?.roomNumber || "-"}
          </p>

          <p>
            <strong>Total:</strong> ${Number(selectedReservation.priceSnapshot?.total || 0)}
          </p>

          <p>
            <strong>Paid:</strong> ${getPaidAmount(selectedReservation._id)}
          </p>

          <p>
            <strong>Balance:</strong> $
            {Number(selectedReservation.priceSnapshot?.total || 0) -
              getPaidAmount(selectedReservation._id)}
          </p>

          <form onSubmit={submitPayment}>
            <input
              type="number"
              name="amount"
              placeholder="Amount"
              value={paymentForm.amount}
              onChange={handlePaymentChange}
              required
            />

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

            <input
              name="reference"
              placeholder="Reference / Transaction ID"
              value={paymentForm.reference}
              onChange={handlePaymentChange}
            />

            <input
              name="note"
              placeholder="Note"
              value={paymentForm.note}
              onChange={handlePaymentChange}
            />

            <button type="submit">Save Payment</button>
            <button type="button" onClick={closePaymentForm} style={{ background: "#6b7280" }}>
              Cancel
            </button>
          </form>
        </div>
      ) : null}

      <div className="card">
        <h2>Reservation Balances</h2>

        <table>
          <thead>
            <tr>
              <th>Booking No</th>
              <th>Room</th>
              <th>Guest</th>
              <th>Status</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {reservations.map((reservation) => {
              const total = Number(reservation.priceSnapshot?.total || 0);
              const paid = getPaidAmount(reservation._id);
              const balance = total - paid;

              return (
                <tr key={reservation._id}>
                  <td>{reservation.bookingNo}</td>
                  <td>{reservation.roomId?.roomNumber || "-"}</td>
                  <td>{reservation.guest?.name || "-"}</td>
                  <td>{reservation.status}</td>
                  <td>${total}</td>
                  <td>${paid}</td>
                  <td>${balance}</td>
                  <td>
                    {balance > 0 && reservation.status !== "cancelled" ? (
                      <button onClick={() => openPaymentForm(reservation)}>
                        Pay
                      </button>
                    ) : null}

                    <Link className="button-link" to={`/invoice/${reservation._id}`}>
                      Invoice
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Recent Payments</h2>

        <table>
          <thead>
            <tr>
              <th>Receipt No</th>
              <th>Booking</th>
              <th>Room</th>
              <th>Method</th>
              <th>Amount</th>
              <th>Date</th>
            </tr>
          </thead>

          <tbody>
            {payments.map((payment) => (
              <tr key={payment._id}>
                <td>{payment.receiptNo}</td>
                <td>{payment.reservationId?.bookingNo || "-"}</td>
                <td>{payment.reservationId?.roomId?.roomNumber || "-"}</td>
                <td>{payment.method}</td>
                <td>${payment.amount}</td>
                <td>{formatDateTime(payment.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}