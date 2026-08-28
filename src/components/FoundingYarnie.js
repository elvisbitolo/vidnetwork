export default function FoundingYarnie({ show = false }) {
  if (!show) return null;
  return (
    <span className="fyBadge" title="Founding Yarnie · one of the first 100 members">
      🧶
    </span>
  );
}