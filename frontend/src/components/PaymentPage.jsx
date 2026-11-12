import { useState, useEffect } from "react";
import { BACKEND_URL } from "../config.js";
import { useAuth } from "../context/AuthContext.jsx";
import DownloadReportButton from "./DownloadReportButton.jsx";

const DEFAULT_BANK_DETAILS = {
  bank: "RHB Bank Berhad",
  accountNumber: "11413800368700",
  accountName: "Ellaijah A/L Nadrarasan"
};

// One DuitNow QR per package (each QR is issued for that package's exact amount).
// Gold is blank for now — drop the file in /public and set the path here.
const PACKAGE_QR = {
  bronze: "/duitnow-qr-bronze.jpg", // RM 250
  silver: "/duitnow-qr-silver.jpg", // RM 500
  gold: null                        // RM 1,500+ — QR to be added later
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
          Our team is preparing and checking your report now. We'll contact you as soon as it's ready
          (you can also find it under your account). We'll also verify the transfer against order{" "}
          <strong>{orderId}</strong> and reach out if anything doesn't match.
        </p>
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
        {busy ? "Submitting…" : "Submit Receipt"}
      </button>
      {error && <p className="chat-error" style={{ display: "block" }}>{error}</p>}
      <p className="form-note">
        Screenshot (JPG/PNG) or PDF, up to 15MB. Your report is prepared and sent to you after our team checks it. Please include your
        receipt — please make sure the order reference is visible on it or in the transfer note.
      </p>
    </form>
  );
}

export default function PaymentPage({ orderId, amount, packageId, onReceiptConfirmed }) {
  const qrSrc = PACKAGE_QR[packageId] || null;
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

      {qrSrc && (
        <div className="payment-panel" style={{ textAlign: "center" }}>
          <img
            src={qrSrc}
            alt={`DuitNow QR for RM ${amount} - Malaysia National QR payment code`}
            style={{ maxWidth: 280, width: "100%", borderRadius: 12 }}
          />
          <p className="form-note" style={{ marginTop: 10 }}>
            Scan with any bank or e-wallet app that supports DuitNow QR (Touch 'n Go eWallet, GrabPay,
            your banking app, etc.).
          </p>
        </div>
      )}

      <p className="form-note" style={{ marginTop: 14 }}>{qrSrc ? "Or transfer manually to:" : "Please transfer to:"}</p>
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
