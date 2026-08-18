export default function Hero() {
  return (
    <header className="hero">
      <div className="wrap hero-grid">
        <div>
          <div className="eyebrow">Vastu Shastra × Engineering Rigor · Malaysia</div>
          <h1>Direction is data.<br />We audit it <em>like engineers.</em></h1>
          <p className="lede">Vastu360 reads a building the way traditional Vastu Shastra intends — and the way a plant manager reads a layout: orientation, flow, load, and function, documented and prioritised, not left to guesswork.</p>
          <div className="hero-ctas">
            <a href="#booking" className="btn-primary">Book a consultation</a>
            <a href="#services" className="btn-secondary">See packages</a>
          </div>
        </div>
        <div className="compass-wrap">
          <svg className="compass" viewBox="0 0 420 420">
            <g className="compass-rotating">
              <circle className="compass-ring" cx="210" cy="210" r="188" />
              <circle className="compass-ring" cx="210" cy="210" r="140" />
              <circle className="compass-ring" cx="210" cy="210" r="92" />
              <g strokeLinecap="round">
                <line className="compass-tick" x1="210" y1="18" x2="210" y2="42" />
                <line className="compass-tick" x1="210" y1="378" x2="210" y2="402" />
                <line className="compass-tick" x1="18" y1="210" x2="42" y2="210" />
                <line className="compass-tick" x1="378" y1="210" x2="402" y2="210" />
                <line className="compass-tick" x1="76" y1="76" x2="94" y2="94" />
                <line className="compass-tick" x1="326" y1="326" x2="344" y2="344" />
                <line className="compass-tick" x1="326" y1="94" x2="344" y2="76" />
                <line className="compass-tick" x1="76" y1="344" x2="94" y2="326" />
              </g>
              <g className="compass-tick-minor">
                <line x1="210" y1="18" x2="210" y2="30" transform="rotate(22.5 210 210)" />
                <line x1="210" y1="18" x2="210" y2="30" transform="rotate(67.5 210 210)" />
                <line x1="210" y1="18" x2="210" y2="30" transform="rotate(112.5 210 210)" />
                <line x1="210" y1="18" x2="210" y2="30" transform="rotate(157.5 210 210)" />
                <line x1="210" y1="18" x2="210" y2="30" transform="rotate(202.5 210 210)" />
                <line x1="210" y1="18" x2="210" y2="30" transform="rotate(247.5 210 210)" />
                <line x1="210" y1="18" x2="210" y2="30" transform="rotate(292.5 210 210)" />
                <line x1="210" y1="18" x2="210" y2="30" transform="rotate(337.5 210 210)" />
              </g>
              <text className="compass-label primary" x="210" y="32" textAnchor="middle">N</text>
              <text className="compass-label primary" x="210" y="398" textAnchor="middle">S</text>
              <text className="compass-label primary" x="393" y="215" textAnchor="middle">E</text>
              <text className="compass-label primary" x="27" y="215" textAnchor="middle">W</text>
              <text className="compass-label" x="352" y="66" textAnchor="middle">NE</text>
              <text className="compass-label" x="68" y="66" textAnchor="middle">NW</text>
              <text className="compass-label" x="352" y="360" textAnchor="middle">SE</text>
              <text className="compass-label" x="68" y="360" textAnchor="middle">SW</text>
            </g>
            <line className="compass-needle" x1="210" y1="210" x2="210" y2="60" />
            <line className="compass-needle" x1="210" y1="210" x2="210" y2="360" stroke="#4a5468" />
            <circle className="compass-center" cx="210" cy="210" r="5" />
          </svg>
        </div>
      </div>
    </header>
  );
}
