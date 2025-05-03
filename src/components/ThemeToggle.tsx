import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle = (): JSX.Element => {
  const { theme, setTheme } = useTheme();
  
  const toggle = () => setTheme(theme === 'light' ? 'dark' : 'light');

  return (
    <button
      className="theme-toggle-button"
      onClick={toggle}
      title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
};

export default ThemeToggle;
