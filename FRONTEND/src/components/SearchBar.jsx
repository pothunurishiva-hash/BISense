function SearchBar({
  value,
  onChange,
  onSearch,
  placeholder = "Search BIS Standards...",
}) {
  const handleKeyDown = (event) => {
    if (event.key === "Enter" && onSearch) {
      onSearch();
    }
  };

  return (
    <div className="big-search">
      <span>⌕</span>

      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label="Search BIS Standards"
      />

      <button onClick={onSearch}>Search</button>
    </div>
  );
}

export default SearchBar;