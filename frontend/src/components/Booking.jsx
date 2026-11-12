import BookingForm from "./BookingForm.jsx";
import PaymentReturn from "./PaymentReturn.jsx";

export default function Booking({ returnOrderId }) {
  return (
    <section className="booking" id="booking">
      <div className="wrap booking-grid">
        <div className="booking-side">
          <div className="eyebrow">Start Your Audit</div>
          <h2 style={{ margin: "12px 0 0", fontSize: "clamp(1.6rem,2.8vw,2.1rem)" }}>Tell us about your space.</h2>
          <p>Pick a package below and the form adjusts to ask exactly what that tier needs, nothing more.</p>
          <ul className="booking-steps">
            <li><span>1</span> Share your details and property type</li>
            <li><span>2</span> Choose a package, Bronze, Silver, or Gold</li>
            <li><span>3</span> Answer a short set of direction questions</li>
            <li><span>4</span> We follow up within one business day</li>
          </ul>
        </div>

        <div className="booking-form">
          {returnOrderId ? <PaymentReturn orderId={returnOrderId} /> : <BookingForm />}
        </div>
      </div>
    </section>
  );
}
