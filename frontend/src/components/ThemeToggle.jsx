import { useEffect, useState } from 'react';

const ThemeToggle = () => {
  // Determine initial theme: saved preference or system preference
  const getInitialTheme = () => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const [theme, setTheme] = useState(getInitialTheme());

  // Apply theme to document root and persist
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle-btn glassmorphism text-gradient"
      aria-label="Toggle dark / light mode"
    >
      {theme === 'dark' ? '🌙 Light Mode' : '☀️ Dark Mode'}
    </button>
  );
};

export default ThemeToggle;
