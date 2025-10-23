import { useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark';

// This function runs once to determine the initial theme synchronously.
const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') {
    return 'light';
  }
  // Check for a saved theme in localStorage
  const savedTheme = localStorage.getItem('theme') as Theme | null;
  if (savedTheme && ['light', 'dark'].includes(savedTheme)) {
    return savedTheme;
  }
  // If no saved theme, check the user's OS preference
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  // Default to light theme
  return 'light';
};

export const useTheme = (): [Theme, () => void] => {
  // Initialize state with the theme determined by our synchronous function
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  // This effect runs whenever the theme state changes to update the DOM and localStorage
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  }, []);

  return [theme, toggleTheme];
};
