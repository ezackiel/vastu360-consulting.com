import { useState, useEffect } from "react";
import { BACKEND_URL } from "../config.js";
import { useAuth } from "../context/AuthContext.jsx";
import DownloadReportButton from "./DownloadReportButton.jsx";

const DEFAULT_BANK_DETAILS = {
  bank: "RHB Bank Berhad",
  accountNumber: "11413800368700",
  accountName: "Ellaijah A/L Nadrarasan"
};

const ACCEPTED_RECEIPT_TYPES = "image/*,application/pdf";

function ReceiptUploadPanel({ orderId, onConfirmed }) {
  const { token } = useAuth();
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) {
      setError("Please attach a screenshot or PDF of your payment receipt.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("receipt", file);
      const response = await fetch(`${BACKEND_URL}/order/${orderId}/receipt`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not submit your receipt.");
      setSubmitted(true);
      onConfirmed?.();
    } catch (err) {
      setError(err.message || "Could not submit your receipt. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return (
      <div className="payment-panel" style={{ marginTop: 14 }}>
        <p><strong>Thanks — your receipt has been received.</strong></p>
        <p className="form-note">
          Your report is unlocked below. Our team will still check the transfer against order{" "}
          <strong>{orderId}</strong> and will reach out if anything doesn't match.
        </p>
        <DownloadReportButton orderId={orderId} />
      </div>
    );
  }

  return (
    <form className="payment-panel" style={{ marginTop: 14 }} onSubmit={handleSubmit}>
      <label htmlFor="paymentReceipt">Upload your payment receipt</label>
      <input
        id="paymentReceipt"
        type="file"
        accept={ACCEPTED_RECEIPT_TYPES}
        onChange={e => setFile(e.target.files?.[0] || null)}
      />
      <button type="submit" className="form-submit" style={{ marginTop: 14 }} disabled={busy}>
        {busy ? "Submitting…" : "Submit Receipt & Unlock Report"}
      </button>
      {error && <p className="chat-error" style={{ display: "block" }}>{error}</p>}
      <p className="form-note">
        Screenshot (JPG/PNG) or PDF, up to 15MB. Your report unlocks as soon as we receive your
        receipt — please make sure the order reference is visible on it or in the transfer note.
      </p>
    </form>
  );
}

export default function PaymentPage({ orderId, amount, onReceiptConfirmed }) {
  const [details, setDetails] = useState(DEFAULT_BANK_DETAILS);

  useEffect(() => {
    fetch(`${BACKEND_URL}/payment/bank-transfer/details`)
      .then(r => r.json())
      .then(data => { if (data.accountNumber) setDetails(data); })
      .catch(() => {}); // fine to keep the fallback details silently
  }, []);

  return (
    <div className="payment-page" style={{ marginTop: 18 }}>
      <h4>Pay via DuitNow QR or Bank Transfer {amount ? `(RM ${amount})` : ""}</h4>

      <div className="payment-panel" style={{ textAlign: "center" }}>
        <img
          src="/duitnow-qr.jpg"
          alt="RHB DuitNow QR — Malaysia National QR payment code"
          style={{ maxWidth: 260, width: "100%", borderRadius: 12 }}
        />
        <p className="form-note" style={{ marginTop: 10 }}>
          Scan with any bank or e-wallet app that supports DuitNow QR (Touch 'n Go eWallet, GrabPay,
          your banking app, etc.).
        </p>
      </div>

      <p className="form-note" style={{ marginTop: 14 }}>Or transfer manually to:</p>
      <div className="order-summary" style={{ display: "block" }}>
        <div className="order-row"><span>Bank</span><span>{details.bank}</span></div>
        <div className="order-row"><span>Account number</span><span>{details.accountNumber}</span></div>
        <div className="order-row"><span>Account name</span><span>{details.accountName}</span></div>
        <div className="order-row"><span>Reference</span><span>{orderId}</span></div>
      </div>
      <p className="form-note">Please include the order reference above so we can match your payment.</p>

      <ReceiptUploadPanel orderId={orderId} onConfirmed={onReceiptConfirmed} />
    </div>
  );
}
