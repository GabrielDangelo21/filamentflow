import React, { useState } from 'react';

const Layout = ({ children, activeTab, onTabChange }) => {

  const navItems = [
    { id: 'estoque', label: 'Estoque', icon: '🗄️' },
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'filaments', label: 'Filamentos', icon: '🧵' },
    { id: 'orders', label: 'Pedidos (Entrada)', icon: '📦' },
    { id: 'prints', label: 'Impressões (Saída)', icon: '🖨️' },
    { id: 'accessories', label: 'Acessórios', icon: '🔧' }
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        width: '260px',
        height: '100vh',
        background: 'var(--card-bg)',
        backdropFilter: 'blur(16px)',
        borderRight: '1px solid var(--card-border)',
        padding: '2rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflowY: 'auto'
      }}>
        <div style={{ padding: '0 1rem', marginBottom: '3rem' }}>
          <h2 style={{ 
            fontSize: '1.5rem', 
            background: 'linear-gradient(to right, var(--primary), var(--secondary))',
            WebkitBackgroundClip: 'text',
            color: 'transparent'
          }}>
            FilamentFlow
          </h2>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === item.id ? 'rgba(0, 240, 255, 0.1)' : 'transparent',
                color: activeTab === item.id ? 'var(--primary)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'left',
                fontSize: '1rem',
                fontFamily: 'var(--font-family)',
                fontWeight: activeTab === item.id ? '600' : '500',
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        <div className="container animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
