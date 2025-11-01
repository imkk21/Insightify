import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav
      style={{
        padding: "15px",
        background: "#007bff",
        color: "#fff",
        display: "flex",
        justifyContent: "space-around",
      }}
    >
      <Link to="/" style={{ color: "#fff", textDecoration: "none" }}>
        Home
      </Link>
      <Link to="/login" style={{ color: "#fff", textDecoration: "none" }}>
        Login
      </Link>
      <Link to="/register" style={{ color: "#fff", textDecoration: "none" }}>
        Register
      </Link>
      <Link to="/dashboard" style={{ color: "#fff", textDecoration: "none" }}>
        Dashboard
      </Link>
    </nav>
  );
}
