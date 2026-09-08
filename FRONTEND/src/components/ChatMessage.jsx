import SourceCard from "./SourceCard";

function ChatMessage({
  role = "ai",
  message,
  source,
}) {
  const isAI = role === "ai";

  return (
    <div
      className={`message ${
        isAI ? "ai-message" : "user-message"
      }`}
    >
      {isAI && (
        <span className="message-icon">
          ✦
        </span>
      )}

      <div className="message-content">
        <strong>
          {isAI ? "BISense" : "You"}
        </strong>

        <p>{message}</p>

        {isAI && source && (
          <SourceCard
            standard={source.standard}
            title={source.title}
            sourceName={source.source_name}
            sourceUrl={source.source_url}
          />
        )}
      </div>
    </div>
  );
}

export default ChatMessage;