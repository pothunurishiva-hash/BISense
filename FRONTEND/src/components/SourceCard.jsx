function SourceCard({
  standard = "",
  title = "",
  sourceName = "",
  sourceUrl = "",
}) {
  const hasSource =
    standard ||
    title ||
    sourceName ||
    sourceUrl;

  if (!hasSource) {
    return null;
  }

  return (
    <div className="source-card">
      <div>
        <span className="source-label">SOURCE</span>

        {standard && (
          <strong>{standard}</strong>
        )}

        {title && (
          <span
            style={{
              display: "block",
              marginTop: "4px",
            }}
          >
            {title}
          </span>
        )}

        {sourceName && (
          <span
            style={{
              display: "block",
              marginTop: "4px",
            }}
          >
            {sourceName}
          </span>
        )}
      </div>

      {sourceUrl && (
        <div className="source-details">
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            View Official Source →
          </a>
        </div>
      )}
    </div>
  );
}

export default SourceCard;