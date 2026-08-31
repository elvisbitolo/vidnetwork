import Link from "next/link";

export default function NotFound() {
  return (
    <div style={wrap}>
      <div style={{ textAlign: "center" }}>
        <p style={code}>404</p>
        <h1 style={title}>Page not found</h1>
        <p style={body}>The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 24, flexWrap: "wrap" }}>
          <Link href="/dashboard" style={primary}>
            Back to dashboard
          </Link>
          <Link href="/explore" style={secondary}>
            Explore the community
          </Link>
        </div>
      </div>
    </div>
  );
}

const wrap = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#14141b",
  padding: 24,
};

const code = {
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--secondary-light)",
  margin: "0 0 10px",
};

const title = {
  margin: "0 0 10px",
  fontSize: 26,
  fontWeight: 800,
  color: "#ffffff",
};

const body = {
  margin: 0,
  fontSize: 14,
  lineHeight: 1.6,
  color: "rgba(255,255,255,0.65)",
};

const primary = {
  borderRadius: 999,
  padding: "10px 18px",
  fontWeight: 700,
  fontSize: 13,
  background: "linear-gradient(135deg, var(--primary), var(--secondary))",
  color: "#ffffff",
  textDecoration: "none",
};

const secondary = {
  borderRadius: 999,
  padding: "10px 18px",
  fontWeight: 700,
  fontSize: 13,
  color: "var(--secondary-light)",
  textDecoration: "none",
  border: "1px solid rgba(255,255,255,0.18)",
};