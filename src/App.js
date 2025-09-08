import React, { useState, useEffect } from 'react';
import './App.css';
import Search from './components/Search';

function App() {
  // Persist theme in localStorage so user preference sticks across reloads
  const stored = (typeof window !== 'undefined' && window.localStorage.getItem('app-theme')) || 'theme-dark';
  const [theme, setTheme] = useState(stored);

  useEffect(() => {
    try { window.localStorage.setItem('app-theme', theme); } catch (e) { /* ignore */ }
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'theme-dark' ? 'theme-light' : 'theme-dark');

  return (
    <div className={`App ${theme}`}>
      <Search theme={theme} onToggleTheme={toggleTheme} />
    </div>
  );
}

export default App;
