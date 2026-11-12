import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { BACKEND_URL } from "../config.js";

// Review submission for a completed order. Submissions go to "pending" and
// are moderated by the team before appearing on the public Trust section —
// see server.js /order/:orderId/review and /admin/reviews.
export default function ReviewForm({ orderId, existingReview, onSubmitted }) {
  const { token } = useAuth();
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState(existingReview?.comment || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!rating) return setError("Please select a star rating.");
    if (!comment.trim()) return setError("Please add a few words about your experience.");

    setSubmitting(true);
    try {
      const response = await fetch(`${BACKEND_URL}/order/${orderId}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ rating, comment })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not submit review.");
      setSubmitted(true);
      onSubmitted?.(data.review);
    } catch (err) {
      setError(err.message || "Could not submit review.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted || existingReview?.status === "pending" || existingReview?.status === "approved") {
    const statusNote = existingReview?.status === "approved"
      ? "Thanks — your review is live on our site."
      : "Thanks — your review is submitted and awaiting a quick check before it goes live.";
    return (
      <div className="review-submitted">
        <div className="review-stars-readonly">{"★".repeat(rating)}{"☆".repeat(5 - rating)}</div>
        <p className="account-note" style={{ marginTop: 4 }}>{statusNote}</p>
      </div>
    );
  }

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      <div className="review-stars-input">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            type="button"
            key={n}
            className="review-star-btn"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onMouseEnter={() => setHoverRating(n)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setRating(n)}
          >
            {(hoverRating || rating) >= n ? "★" : "☆"}
          </button>
        ))}
      </div>
      <textarea
        placeholder="How was your experience with the report and service?"
        value={comment}
        onChange={e => setComment(e.target.value)}
        rows={3}
        maxLength={1000}
      />
      {error && <p className="chat-error" style={{ display: "block" }}>{error}</p>}
      <button type="submit" className="btn-secondary" disabled={submitting}>
        {submitting ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}
