import { useAuth } from "../context/AuthContext.jsx";

export default function Nav() {
  const { user } = useAuth();

  return (
    <nav>
      <div className="nav-inner wrap" style={{ paddingLeft: 0, paddingRight: 0 }}>
        <a href="#" className="logo logo-with-mark">
          <img src="/vastu360-logo.png" alt="Vastu360 logo" className="logo-mark" />
          VASTU<span>360</span>
        </a>
        <div className="nav-links">
          <a href="#approach">Approach</a>
          <a href="#process">Process</a>
          <a href="#services">Services</a>
          <a href="#report">The Report</a>
          <a href="#about">About Us</a>
          <a href="#account">{user ? `Hi, ${user.name.split(" ")[0]}` : "Log In"}</a>
          <a href="#booking" className="nav-cta">Book a consultation</a>
        </div>
      </div>
    </nav>
  );
}
