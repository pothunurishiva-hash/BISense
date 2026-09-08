import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="footer">
      <div>
        <Link to="/" className="logo">
          BIS<span>ense</span>
        </Link>

        <p>AI-powered assistance for Indian Standards.</p>
      </div>

      <div className="footer-links">
        <Link to="/search">Standards</Link>
        <Link to="/ai">AI Assistant</Link>
        <Link to="/awareness">Awareness</Link>
        <Link to="/dashboard">Dashboard</Link>
      </div>

      <p className="copyright">
        © 2026 BISense. SIH project prototype.
      </p>
    </footer>
  );
}

export default Footer;