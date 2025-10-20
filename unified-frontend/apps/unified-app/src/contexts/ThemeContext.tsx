import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>('light');

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('ivy-theme') as ThemeMode;
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      setThemeState(savedTheme);
    }
  }, []);

  // Update CSS variables when theme changes
  useEffect(() => {
    const root = document.documentElement;
    
    if (theme === 'dark') {
      // Dark mode CSS variables
      root.style.setProperty('--theme-bg-primary', '#000000');
      root.style.setProperty('--theme-bg-secondary', '#0f0f0f');
      root.style.setProperty('--theme-bg-tertiary', '#1a1a1a');
      root.style.setProperty('--theme-bg-glass', 'rgba(255, 255, 255, 0.05)');
      root.style.setProperty('--theme-bg-glass-hover', 'rgba(255, 255, 255, 0.08)');
      root.style.setProperty('--theme-bg-overlay', 'rgba(0, 0, 0, 0.8)');
      
      root.style.setProperty('--theme-text-primary', '#ffffff');
      root.style.setProperty('--theme-text-secondary', 'rgba(255, 255, 255, 0.8)');
      root.style.setProperty('--theme-text-muted', 'rgba(255, 255, 255, 0.6)');
      root.style.setProperty('--theme-text-disabled', 'rgba(255, 255, 255, 0.3)');
      
      root.style.setProperty('--theme-border-glass', 'rgba(255, 255, 255, 0.1)');
      root.style.setProperty('--theme-border-hover', 'rgba(255, 255, 255, 0.2)');
      
      root.style.setProperty('--theme-shadow-glass', '0 8px 32px rgba(0, 0, 0, 0.3)');
    } else {
      // Light mode CSS variables
      root.style.setProperty('--theme-bg-primary', '#ffffff');
      root.style.setProperty('--theme-bg-secondary', '#f9fafb');
      root.style.setProperty('--theme-bg-tertiary', '#f3f4f6');
      root.style.setProperty('--theme-bg-glass', 'rgba(255, 255, 255, 0.7)');
      root.style.setProperty('--theme-bg-glass-hover', 'rgba(255, 255, 255, 0.85)');
      root.style.setProperty('--theme-bg-overlay', 'rgba(255, 255, 255, 0.9)');
      
      root.style.setProperty('--theme-text-primary', '#111827');
      root.style.setProperty('--theme-text-secondary', '#4b5563');
      root.style.setProperty('--theme-text-muted', '#6b7280');
      root.style.setProperty('--theme-text-disabled', '#9ca3af');
      
      root.style.setProperty('--theme-border-glass', 'rgba(255, 255, 255, 0.2)');
      root.style.setProperty('--theme-border-hover', 'rgba(255, 255, 255, 0.4)');
      
      root.style.setProperty('--theme-shadow-glass', '0 8px 32px rgba(0, 0, 0, 0.1)');
    }
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setThemeState(newTheme);
    localStorage.setItem('ivy-theme', newTheme);
  };

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem('ivy-theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;