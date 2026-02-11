"use client";

import React, { useState, useEffect } from 'react';
import Auth from './Auth';
import Dashboard from './Dashboard';

function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  useEffect(() => {
    const savedUser = localStorage.getItem('nexus_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('nexus_user');
      }
    }
    setInitializing(false);
  }, []);
  const handleLogout = () => {
    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_user');
    setUser(null);
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center font-mono text-[#00ff00]">
        INITIALIZING SYSTEM...
      </div>
    );
  }
  if (!user) {
    return (
      <Auth 
        onAuthSuccess={(userData) => {
          setUser(userData);
        }} 
      />
    );
  }
  return (
    <Dashboard 
      currentUser={user} 
      onLogout={handleLogout} 
    />
  );
}

export default App;