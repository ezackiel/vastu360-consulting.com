import { useState, useEffect, useRef } from "react";
import Chat from "./Chat.jsx";
import DownloadReportButton from "./DownloadReportButton.jsx";
import { BACKEND_URL } from "../config.js";

const MAX_ATTEMPTS = 10;

export default function PaymentReturn({ orderId }) {
  const [status, setStatus] = useState("checking"); // checking | paid | timeout | error
  const attemptRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let timer;

    async function poll() {
      try {
        const response = await fetch(`${BACKEND_URL}/order/${orderId}/status`);
        const result = await response.json();
        if (cancelled) return;

        if (result.status === "paid") {
          if (result.reportStatus === "approved") {
            setStatus("paid");
            return;
          }
          // Paid, but the team is still checking the report — keep polling gently.
          setStatus("review");
          timer = setTimeout(poll, 15000);
          return;
        }

        if (attemptRef.current >= MAX_ATTEMPTS) {
          setStatus("timeout");
          return;
        }

        attemptRef.current += 1;
        timer = setTimeout(poll, 3000);
      } catch (err) {
        console.error("Status check failed:", err);
        if (!cancelled) setStatus("error");
      }
    }

    poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [orderId]);

  const titles = {
    checking: "Confirming your payment…",
    paid: "Your report is ready!",
    review: "Payment received — thank you!",
    timeout: "Still confirming your payment",
    error: "Couldn't check payment status"
  };
  const subtexts = {
    checking: "Hang tight while we check your payment status.",
    paid: "Your Vastu360 report has been checked by our team and is ready to download.",
    review: "Your report is being prepared and checked by our team. This page will update as soon as it's ready — we'll also contact you on the phone/email you provided.",
    timeout: "This is taking longer than expected. If you completed payment, your report will be emailed to you shortly — otherwise please contact us.",
    error: "Please contact us with your order reference and we'll confirm manually."
  };

  return (
    <div className="form-success" style={{ display: "block" }}>
      <h4>{titles[status]}</h4>
      <p>{subtexts[status]}</p>

      {status === "paid" && (
        <>
          <DownloadReportButton orderId={orderId} />
          <Chat orderId={orderId} />
        </>
      )}
    </div>
  );
}
