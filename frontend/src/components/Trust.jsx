import { useState, useEffect } from "react";
import { BACKEND_URL } from "../config.js";

const PACKAGE_LABELS = { bronze: "Bronze", silver: "Silver", gold: "Gold" };
const PROPERTY_TYPE_LABELS = { residential: "Residential", commercial: "Commercial", industrial: "Industrial" };

const FAQS = [
  {
    q: "How long does it take to receive my report?",
    a: "Reports are generated as soon as payment is confirmed. For Gold packages that include a floor plan review, allow up to 2 business days for a consultant to review the plan before the final report is issued."
  },
  {
    q: "What's the difference between Bronze, Silver, and Gold?",
    a: "Bronze covers your core rooms with a basic score and simple recommendations. Silver adds full room-by-room analysis, colour guidance, and a priority matrix. Gold adds a structural renovation plan, floor plan review, and 30 days of consultant chat access."
  },
  {
    q: "Do I need to upload a floor plan?",
    a: "It's optional but recommended, especially for Gold packages. A floor plan helps our team give more precise, room-specific guidance rather than relying only on your written answers."
  },
  {
    q: "Is this based on traditional Vastu Shastra?",
    a: "Yes. Our recommendations are grounded in classical Vastu principles. We're upfront that results depend on many factors beyond layout, and the report isn't a substitute for professional structural, legal, or safety advice."
  },
  {
    q: "Can I get a refund if I'm not satisfied?",
    a: "Reach out to us directly via WhatsApp or email within 7 days of receiving your report and we'll work with you to address any concerns."
  }
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="faq-item">
      <div className="faq-question" onClick={() => setOpen(o => !o)}>
        <span>{q}</span>
        <span>{open ? "−" : "+"}</span>
      </div>
      {open && <div className="faq-answer">{a}</div>}
    </div>
  );
}

export default function Trust() {
  const [reviews, setReviews] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`${BACKEND_URL}/reviews`)
      .then(r => r.json())
      .then(data => { if (!cancelled) setReviews(data.reviews || []); })
      .catch(() => { if (!cancelled) setError("Could not load reviews right now."); });
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="trust-section" id="trust">
      <div className="wrap">
        <div className="section-head">
          <div className="eyebrow">Trust &amp; Track Record</div>
          <h2>What customers say about their reports.</h2>
        </div>

        {error && <p className="account-note">{error}</p>}
        {reviews && reviews.length === 0 && !error && (
          <p className="account-note">Reviews from our customers will appear here as they come in.</p>
        )}

        {reviews && reviews.length > 0 && (
          <div className="trust-grid">
            {reviews.map((r, i) => (
              <div className="testimonial-card" key={i}>
                <div className="testimonial-stars">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
                <p className="testimonial-quote">&ldquo;{r.comment}&rdquo;</p>
                <div className="testimonial-name">{r.name}</div>
                <div className="testimonial-meta">
                  {PACKAGE_LABELS[r.package] || r.package}{r.propertyType ? ` package · ${PROPERTY_TYPE_LABELS[r.propertyType] || r.propertyType}` : " package"}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="faq-list">
          <h3 style={{ marginBottom: 6 }}>Frequently asked questions</h3>
          {FAQS.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
        </div>
      </div>
    </section>
  );
}
