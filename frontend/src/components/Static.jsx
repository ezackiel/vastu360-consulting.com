export function AboutUs() {
  return (
    <section className="about-us" id="about">
      <div className="wrap">
        <div className="section-head">
          <div className="eyebrow">About Us</div>
          <h2>Traditional wisdom, applied with engineering discipline.</h2>
        </div>

        <div className="about-us-grid">
          <div>
            <p style={{ color: "var(--slate)", marginBottom: 16 }}>
              Vastu360 exists to make Vastu Shastra practical again. We believe traditional
              principles and modern professional standards aren't in tension — they belong
              together. Our goal on every project is the same: read a space honestly, explain
              what the principles actually say (and don't say), and hand over recommendations
              you can act on with confidence.
            </p>
            <p style={{ color: "var(--slate)" }}>
              We work with homeowners, businesses, and industrial clients across Malaysia,
              treating every audit as a working document rather than a verdict — grounded in
              tradition, honest about its limits, and built to fit alongside the advice of your
              architect, engineer, or contractor.
            </p>
          </div>

          <div className="consultant-card">
            <img
              src="/elijah-headshot.png"
              alt="Elijah Jazz Kanmani"
              className="consultant-avatar consultant-avatar-photo"
            />
            <div>
              <h4 style={{ margin: 0 }}>Elijah Jazz Kanmani</h4>
              <p className="account-note" style={{ marginTop: 4, marginBottom: 8, fontStyle: "italic" }}>
                Founder &amp; Principal Consultant, Vastu360
              </p>
              <p className="account-note" style={{ marginTop: 6, marginBottom: 0 }}>
                Elijah brings a rare combination to Vastu consulting: a career in senior
                operations and manufacturing management paired with deep grounding in
                traditional Vastu Shastra. As a Certified Lean Six Sigma Practitioner, he
                applies the same structured, evidence-based methodology used to optimise
                factories and supply chains to every property assessment. He holds an MBA and
                is currently a doctoral researcher. <em>Experience. Insight. Harmony.</em>
              </p>
              <div className="consultant-creds">
                <span className="credential-chip">Professional Vastu Consultant</span>
                <span className="credential-chip">Certified Lean Six Sigma Practitioner</span>
                <span className="credential-chip">MBA · Doctoral Researcher</span>
              </div>
            </div>
          </div>
        </div>

        <div className="about-us-contact">
          <a href="mailto:info@vastu360.my" className="about-us-contact-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d3a869" strokeWidth="1.6"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
            info@vastu360.my
          </a>
          <a href="https://wa.me/60127005081" className="about-us-contact-item" target="_blank" rel="noopener noreferrer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d3a869" strokeWidth="1.6"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.362 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg>
            +60 12-700 5081 (WhatsApp)
          </a>
        </div>
      </div>
    </section>
  );
}

export function ReportSection() {
  return (
    <section className="report" id="report">
      <div className="wrap report-grid">
        <div className="report-sheet">
          <div className="rs-label">SAMPLE — REPORT STRUCTURE</div>
          <h4>Residential Vastu Audit</h4>
          <ul className="report-toc">
            <li><span>Property summary</span><span>All tiers</span></li>
            <li><span>Direction analysis</span><span>All tiers</span></li>
            <li><span>Room analysis</span><span>All tiers</span></li>
            <li><span>Brahmasthan analysis</span><span>All tiers</span></li>
            <li><span>Perimeter analysis — Ayadi Shadvarga</span><span>All tiers</span></li>
            <li><span>Dosha analysis</span><span>Silver &amp; Gold</span></li>
            <li><span>Recommendations</span><span>All tiers</span></li>
            <li><span>Priority matrix</span><span>Silver &amp; Gold</span></li>
            <li><span>Estimated improvement score</span><span>Silver &amp; Gold</span></li>
            <li><span>Conclusion</span><span>All tiers</span></li>
          </ul>
        </div>
        <div>
          <div className="eyebrow">The Deliverable</div>
          <h2 style={{ margin: "12px 0 18px", fontSize: "clamp(1.6rem,2.8vw,2.1rem)" }}>Not a verdict — a working document.</h2>
          <p style={{ color: "var(--slate)", marginBottom: 16 }}>Every audit ends with a report you can actually use: an executive summary with an overall rating, direction-by-direction analysis, and a room-by-room review covering everything from the kitchen to the garden.</p>
          <p style={{ color: "var(--slate)" }}>Recommendations are ranked high, medium, and low priority, and mapped onto an action plan — immediate, within 30 days, within 6 months, and future renovation — so nothing gets lost between the consultation and the contractor.</p>

          <div className="report-contents">
            <h4>Full report contents, higher tiers</h4>
            <ul className="report-contents-grid">
              <li>Direction &amp; entrance calculations</li>
              <li>Full directional balance analysis</li>
              <li>Room-by-room direction review</li>
              <li>Issues list with severity ranking</li>
              <li>Recommended &amp; avoided wall colours</li>
              <li>Practical remedies per room</li>
              <li>Interior furniture positions</li>
              <li>Structural renovation plan (Gold)</li>
              <li>Prioritised action plan</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Ethics() {
  return (
    <section className="ethics">
      <div className="wrap">
        <div className="section-head">
          <div className="eyebrow">How We Work</div>
          <h2>Grounded in tradition. Honest about its limits.</h2>
        </div>
        <div className="ethics-grid">
          <div className="ethics-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d3a869" strokeWidth="1.6"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
            <p>Every recommendation is based on traditional Vastu Shastra principles, stated plainly as such.</p>
          </div>
          <div className="ethics-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d3a869" strokeWidth="1.6"><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z" /></svg>
            <p>We never guarantee specific outcomes — wealth, health, or business success — as a result of layout changes.</p>
          </div>
          <div className="ethics-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d3a869" strokeWidth="1.6"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 10h8M8 14h5" /></svg>
            <p>Results depend on many factors beyond building layout, and we say so upfront.</p>
          </div>
          <div className="ethics-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d3a869" strokeWidth="1.6"><path d="M12 21c-4-3-8-6-8-11a8 8 0 0116 0c0 5-4 8-8 11z" /></svg>
            <p>We encourage you to keep working with your architect, engineer, doctor, or financial adviser alongside us.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Contact() {
  return (
    <section className="contact" id="contact">
      <div className="wrap">
        <div className="eyebrow" style={{ textAlign: "center", marginBottom: 14 }}>Get Started</div>
        <h2>Let's read your space, direction by direction.</h2>
        <p>Tell us about your property and we'll scope which package fits, then send a quotation the same day.</p>
        <div className="contact-ctas">
          <a href="#booking" className="btn-primary" style={{ background: "var(--sindoor)", color: "var(--parchment)" }}>Book a consultation</a>
          <a href="#booking" className="btn-secondary" style={{ borderColor: "var(--ink)", color: "var(--ink)" }}>Download the questionnaire</a>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer>
      <div className="wrap" style={{ display: "flex", justifyContent: "space-between", width: "100%", flexWrap: "wrap", gap: 12 }}>
        <div>VASTU<span className="brass">360</span> CONSULTING &nbsp;—&nbsp; MALAYSIA</div>
        <div>RESIDENTIAL &nbsp;·&nbsp; COMMERCIAL &nbsp;·&nbsp; INDUSTRIAL</div>
        <a href="/admin" style={{ opacity: 0.45, fontSize: "0.72rem" }}>Team login</a>
      </div>
    </footer>
  );
}
