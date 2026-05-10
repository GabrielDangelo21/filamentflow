import React, { useState, useEffect } from 'react';
import { getProximas, saveProxima, deleteProxima, reorderProximas } from '../services/storage';

const inputStyle = {
  background: 'var(--card-bg)',
  border: '1px solid var(--card-border)',
  borderRadius: '8px',
  padding: '0.65rem 1rem',
  color: 'var(--text)',
  fontSize: '0.9rem',
  fontFamily: 'var(--font-family)',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

export default function ProximasImpressoes() {
  const [items, setItems] = useState([]);
  const [titulo, setTitulo] = useState('');
  const [link, setLink] = useState('');
  const [error, setError] = useState('');
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  useEffect(() => { setItems(getProximas()); }, []);

  const handleAdd = () => {
    if (!titulo.trim()) { setError('O título é obrigatório.'); return; }
    saveProxima({ titulo: titulo.trim(), link: link.trim() });
    setItems(getProximas());
    setTitulo('');
    setLink('');
    setError('');
  };

  const handleDelete = (id) => {
    deleteProxima(id);
    setItems(getProximas());
  };

  const handleDragStart = (idx) => setDragIdx(idx);
  const handleDragOver = (e, idx) => { e.preventDefault(); setOverIdx(idx); };
  const handleDrop = () => {
    if (dragIdx === null || overIdx === null || dragIdx === overIdx) { setDragIdx(null); setOverIdx(null); return; }
    const reordered = [...items];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(overIdx, 0, moved);
    reorderProximas(reordered);
    setItems(reordered);
    setDragIdx(null);
    setOverIdx(null);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text)', marginBottom: '0.3rem' }}>
          Próximas impressões
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Lista de modelos que pretende imprimir
        </p>
      </div>

      {/* Add form */}
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: '14px',
        padding: '1.5rem',
        marginBottom: '2rem',
      }}>
        <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Adicionar modelo
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 220px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Título *
            </label>
            <input
              style={inputStyle}
              placeholder="Nome do modelo..."
              value={titulo}
              onChange={e => { setTitulo(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <div style={{ flex: '2 1 300px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Link
            </label>
            <input
              style={inputStyle}
              placeholder="https://www.thingiverse.com/..."
              value={link}
              onChange={e => setLink(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <button
            onClick={handleAdd}
            style={{
              padding: '0.65rem 1.5rem',
              background: 'linear-gradient(to right, var(--primary), var(--secondary))',
              border: 'none',
              borderRadius: '8px',
              color: '#000',
              fontWeight: '700',
              fontSize: '0.9rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontFamily: 'var(--font-family)',
              flexShrink: 0,
            }}
          >
            + Adicionar
          </button>
        </div>
        {error && <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#F87171' }}>{error}</div>}
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
          <div style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.4rem' }}>Nenhum modelo na lista</div>
          <div style={{ fontSize: '0.85rem' }}>Adicione modelos que pretende imprimir em breve.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {items.map((item, idx) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={e => handleDragOver(e, idx)}
              onDrop={handleDrop}
              onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                background: 'var(--card-bg)',
                border: `1px solid ${overIdx === idx && dragIdx !== idx ? 'var(--primary)' : 'var(--card-border)'}`,
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                transition: 'border-color 0.15s, opacity 0.15s',
                opacity: dragIdx === idx ? 0.4 : 1,
                cursor: 'grab',
              }}
            >
              {/* Drag handle + number */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '1rem', cursor: 'grab' }}>⠿</span>
                <span style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'rgba(0,240,255,0.1)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  flexShrink: 0,
                }}>
                  {idx + 1}
                </span>
              </div>

              {/* Title + link */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text)', marginBottom: '2px' }}>
                  {item.titulo}
                </div>
                {item.link && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    style={{
                      fontSize: '0.78rem',
                      color: 'var(--primary)',
                      textDecoration: 'none',
                      opacity: 0.8,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'block',
                      maxWidth: '100%',
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '0.8'}
                  >
                    🔗 {item.link}
                  </a>
                )}
              </div>

              {/* Open link button */}
              {item.link && (
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  style={{
                    padding: '0.45rem 1rem',
                    background: 'rgba(0,240,255,0.08)',
                    border: '1px solid rgba(0,240,255,0.2)',
                    borderRadius: '8px',
                    color: 'var(--primary)',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    textDecoration: 'none',
                    flexShrink: 0,
                    fontFamily: 'var(--font-family)',
                    cursor: 'pointer',
                  }}
                >
                  Abrir
                </a>
              )}

              {/* Delete */}
              <button
                onClick={() => handleDelete(item.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  padding: '0.25rem',
                  borderRadius: '6px',
                  flexShrink: 0,
                  lineHeight: 1,
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#F87171'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                title="Remover"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
