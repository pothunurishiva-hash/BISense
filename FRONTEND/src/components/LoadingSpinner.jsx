function LoadingSpinner({ text = "Loading..." }) {
  return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <span>{text}</span>
    </div>
  );
}

export default LoadingSpinner;