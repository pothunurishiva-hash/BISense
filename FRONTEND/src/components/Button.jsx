function Button({
  children,
  variant = "primary",
  onClick,
  type = "button",
  disabled = false,
}) {
  const className =
    variant === "secondary"
      ? "secondary-btn"
      : variant === "text"
      ? "text-btn"
      : "primary-btn";

  return (
    <button
      type={type}
      className={className}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export default Button;