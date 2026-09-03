import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext({
  theme: 'night',
  setTheme: () => {},
  switchTheme: () => {}
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem('app_theme');
    return saved || 'night'; // Default is always Night Mode as requested
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  const setTheme = (newTheme) => {
    if (['night', 'light', 'comfort'].includes(newTheme)) {
      setThemeState(newTheme);
    }
  };

  const switchTheme = (targetTheme) => {
    setTheme(targetTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, switchTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
