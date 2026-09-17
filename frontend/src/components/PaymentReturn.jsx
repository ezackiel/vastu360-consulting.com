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
          setStatus("paid");
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
    paid: "Payment confirmed!",
    timeout: "Still confirming your payment",
    error: "Couldn't check payment status"
  };
  const subtexts = {
    checking: "Hang tight while we check your payment status.",
    paid: "Your Vastu360 report has been generated based on the answers you submitted.",
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
