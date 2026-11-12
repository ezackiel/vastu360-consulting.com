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
            <defs>
              <radialGradient id="compassDisc" cx="50%" cy="42%" r="65%">
                <stop offset="0%" stopColor="#1c3a2e" />
                <stop offset="100%" stopColor="#0e2019" />
              </radialGradient>
              <linearGradient id="spikeLight" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f0d9a6" />
                <stop offset="100%" stopColor="#d3a869" />
              </linearGradient>
              <linearGradient id="spikeDark" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#b6863f" />
                <stop offset="100%" stopColor="#8a6528" />
              </linearGradient>
            </defs>

            <circle className="compass-disc" cx="210" cy="210" r="196" fill="url(#compassDisc)" />
            <circle className="compass-ring" cx="210" cy="210" r="196" />
            <circle className="compass-ring compass-ring-inner" cx="210" cy="210" r="130" />

            <g className="compass-tick-minor">
              <line x1="210" y1="14" x2="210" y2="26" transform="rotate(22.5 210 210)" />
              <line x1="210" y1="14" x2="210" y2="26" transform="rotate(67.5 210 210)" />
              <line x1="210" y1="14" x2="210" y2="26" transform="rotate(112.5 210 210)" />
              <line x1="210" y1="14" x2="210" y2="26" transform="rotate(157.5 210 210)" />
              <line x1="210" y1="14" x2="210" y2="26" transform="rotate(202.5 210 210)" />
              <line x1="210" y1="14" x2="210" y2="26" transform="rotate(247.5 210 210)" />
              <line x1="210" y1="14" x2="210" y2="26" transform="rotate(292.5 210 210)" />
              <line x1="210" y1="14" x2="210" y2="26" transform="rotate(337.5 210 210)" />
            </g>

            <g className="compass-rotating">
              {/* Cardinal spikes — N, E, S, W (long) */}
              <polygon className="compass-spike spike-light" points="210,25 203.5,176.6 216.5,176.6" />
              <polygon className="compass-spike spike-light" points="395,210 243.4,203.5 243.4,216.5" />
              <polygon className="compass-spike spike-light" points="210,395 216.5,243.4 203.5,243.4" />
              <polygon className="compass-spike spike-light" points="25,210 176.6,216.5 176.6,203.5" />
              {/* Intercardinal spikes — NE, SE, SW, NW (short) */}
              <polygon className="compass-spike spike-dark" points="301.9,118.1 229,181.8 238.2,191" />
              <polygon className="compass-spike spike-dark" points="301.9,301.9 238.2,229 229,238.2" />
              <polygon className="compass-spike spike-dark" points="118.1,301.9 191,238.2 181.8,229" />
              <polygon className="compass-spike spike-dark" points="118.1,118.1 181.8,191 191,181.8" />

              <text className="compass-label primary" x="210" y="52" textAnchor="middle">N</text>
              <text className="compass-label primary" x="210" y="378" textAnchor="middle">S</text>
              <text className="compass-label primary" x="368" y="216" textAnchor="middle">E</text>
              <text className="compass-label primary" x="52" y="216" textAnchor="middle">W</text>
              <text className="compass-label" x="322" y="128" textAnchor="middle">NE</text>
              <text className="compass-label" x="322" y="300" textAnchor="middle">SE</text>
              <text className="compass-label" x="98" y="300" textAnchor="middle">SW</text>
              <text className="compass-label" x="98" y="128" textAnchor="middle">NW</text>
            </g>

            <circle className="compass-center-ring" cx="210" cy="210" r="12" />
            <circle className="compass-center" cx="210" cy="210" r="5" />
          </svg>
        </div>
      </div>
    </header>
  );
}
