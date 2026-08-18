import { PACKAGE_PRICES, PACKAGE_ORIGINAL_PRICES } from "../data/questionSets.js";

function discountPercent(pkg) {
  const original = PACKAGE_ORIGINAL_PRICES[pkg];
  const promo = PACKAGE_PRICES[pkg];
  if (!original || !promo) return null;
  const num = (s) => Number(s.replace(/[^0-9.]/g, ""));
  const o = num(original), p = num(promo);
  if (!o || !p) return null;
  return Math.round(((o - p) / o) * 100);
}

function PriceBlock({ pkg }) {
  const original = PACKAGE_ORIGINAL_PRICES[pkg];
  const pct = discountPercent(pkg);
  return (
    <div className="tier-price-block">
      {original && <span className="tier-price-original">{original}</span>}
      <span className="tier-price">{PACKAGE_PRICES[pkg]}</span>
      {pct != null && <span className="tier-discount-badge">{pct}% OFF</span>}
    </div>
  );
}

export default function Services() {
  return (
    <section className="services" id="services">
      <div className="wrap">
        <div className="section-head">
          <div className="eyebrow">Services</div>
          <h2>Residential audits, scaled to how deep you want to go.</h2>
          <p>Every package includes a written report and live consultation. Higher tiers add a site visit, deeper room coverage, and extended support.</p>
        </div>

        <div className="tier-grid">
          <div className="tier-card">
            <div className="tier-name">BRONZE</div>
            <h3>Foundation Review</h3>
            <PriceBlock pkg="bronze" />
            <ul>
              <li>Floor plan &amp; direction analysis</li>
              <li>Main entrance assessment</li>
              <li>Kitchen, both bedrooms &amp; washroom (2 extra washrooms optional)</li>
              <li>Living room measurements</li>
              <li>Pooja room &amp; storeroom placement</li>
              <li>Base report</li>
              <li>30-minute online consultation</li>
            </ul>
          </div>
          <div className="tier-card featured">
            <div className="tier-name">SILVER</div>
            <h3>Whole-Home Audit</h3>
            <PriceBlock pkg="silver" />
            <ul>
              <li>Everything in Bronze</li>
              <li>Furniture layout &amp; colour recommendations</li>
              <li>Sleeping directions, children's room, home office</li>
              <li>Pooja room placement</li>
              <li>45-minute consultation</li>
            </ul>
          </div>
          <div className="tier-card">
            <div className="tier-name">GOLD</div>
            <h3>On-Site Audit</h3>
            <div className="tier-price">{PACKAGE_PRICES.gold}</div>
            <ul>
              <li>Everything in Silver</li>
              <li>In-person site visit &amp; compass verification</li>
              <li>Full measurements &amp; renovation planning</li>
              <li>Unlimited questions for 30 days</li>
              <li>Follow-up implementation review</li>
            </ul>
          </div>
        </div>

        <div className="segment-grid">
          <div className="segment-card">
            <span className="tag">COMMERCIAL</span>
            <h3>Shops, Restaurants, Clinics &amp; Offices</h3>
            <p style={{ color: "#a9b0bd", fontSize: "0.92rem" }}>A layout audit built around how customers and cash actually move through the space.</p>
            <div className="segment-tags">
              <span>Customer flow</span><span>Cash counter</span><span>Reception</span>
              <span>Seating</span><span>Owner's office</span><span>Signage &amp; colour</span>
            </div>
          </div>
          <div className="segment-card">
            <span className="tag">FACTORY &amp; INDUSTRIAL</span>
            <h3>Operational Harmony Assessment</h3>
            <p style={{ color: "#a9b0bd", fontSize: "0.92rem" }}>Where an engineering background matters most — production flow read alongside Vastu direction and energy zones.</p>
            <div className="segment-tags">
              <span>Production flow</span><span>Warehouse &amp; dispatch</span><span>Utilities</span>
              <span>Management offices</span><span>Safety &amp; energy flow</span><span>Lean layout fit</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
