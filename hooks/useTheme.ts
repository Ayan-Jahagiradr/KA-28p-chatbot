
import { useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark';

/**
 * Determines the initial theme for the application.
 * It prioritizes the theme saved in localStorage, then checks the user's
 * operating system preference, and finally defaults to 'light'.
 * This function runs synchronously to prevent a flash of the wrong theme.
 * @returns {Theme} The initial theme.
 */
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

/**
 * A custom hook to manage the application's theme (light or dark).
 * It persists the selected theme to localStorage and applies the
 * appropriate class to the root HTML element.
 * @returns {[Theme, () => void]} A tuple containing the current theme and a function to toggle it.
 */
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
