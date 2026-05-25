import React, { useState, useEffect } from 'react';
import { getProximas, saveProxima, updateProxima, deleteProxima, reorderProximas } from '../services/storage';

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

const timeInputStyle = {
  ...inputStyle,
  width: '64px',
  textAlign: 'center',
  padding: '0.65rem 0.5rem',
};

const fmtTempo = (min) => {
  if (!min && min !== 0) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
};

const TimeInputs = ({ h, setH, m, setM }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
    <input
      type="number"
      style={timeInputStyle}
      placeholder="0"
      value={h}
      onChange={e => setH(e.target.value)}
      min="0"
      max="99"
    />
    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', flexShrink: 0 }}>h</span>
    <input
      type="number"
      style={timeInputStyle}
      placeholder="0"
      value={m}
      onChange={e => setM(e.target.value)}
      min="0"
      max="59"
    />
    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', flexShrink: 0 }}>min</span>
  </div>
);

export default function ProximasImpressoes() {
  const [items, setItems] = useState([]);

  // Add form state
  const [titulo, setTitulo] = useState('');
  const [link, setLink] = useState('');
  const [addH, setAddH] = useState('');
  const [addM, setAddM] = useState('');
  const [error, setError] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editTitulo, setEditTitulo] = useState('');
  const [editLink, setEditLink] = useState('');
  const [editH, setEditH] = useState('');
  const [editM, setEditM] = useState('');
  const [editError, setEditError] = useState('');

  // Drag state
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  useEffect(() => { setItems(getProximas()); }, []);

  const reload = () => setItems(getProximas());

  // ── Add ──
  const handleAdd = () => {
    if (!titulo.trim()) { setError('O título é obrigatório.'); return; }
    const h = parseInt(addH) || 0;
    const m = parseInt(addM) || 0;
    if (h === 0 && m === 0) { setError('Informe o tempo estimado de impressão.'); return; }
    saveProxima({ titulo: titulo.trim(), link: link.trim(), tempoMinutos: h * 60 + m });
    setTitulo(''); setLink(''); setAddH(''); setAddM(''); setError('');
    reload();
  };

  // ── Edit ──
  const handleStartEdit = (item) => {
    setEditingId(item.id);
    setEditTitulo(item.titulo || '');
    setEditLink(item.link || '');
    setEditH(item.tempoMinutos ? String(Math.floor(item.tempoMinutos / 60)) : '');
    setEditM(item.tempoMinutos ? String(item.tempoMinutos % 60) : '');
    setEditError('');
  };

  const handleSaveEdit = () => {
    if (!editTitulo.trim()) { setEditError('O título é obrigatório.'); return; }
    const h = parseInt(editH) || 0;
    const m = parseInt(editM) || 0;
    if (h === 0 && m === 0) { setEditError('Informe o tempo estimado.'); return; }
    updateProxima({ id: editingId, titulo: editTitulo.trim(), link: editLink.trim(), tempoMinutos: h * 60 + m });
    setEditingId(null);
    reload();
  };

  const handleCancelEdit = () => { setEditingId(null); setEditError(''); };

  // ── Delete ──
  const handleDelete = (id) => { deleteProxima(id); reload(); };

  // ── Drag ──
  const handleDragStart = (idx) => setDragIdx(idx);
  const handleDragOver = (e, idx) => { e.preventDefault(); setOverIdx(idx); };
  const handleDrop = () => {
    if (dragIdx === null || overIdx === null || dragIdx === overIdx) { setDragIdx(null); setOverIdx(null); return; }
    const reordered = [...items];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(overIdx, 0, moved);
    reorderProximas(reordered);
    setItems(reordered);
    setDragIdx(null); setOverIdx(null);
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
          <div style={{ flex: '1 1 200px' }}>
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
          <div style={{ flex: '2 1 260px' }}>
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
          <div style={{ flexShrink: 0 }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Tempo estimado *
            </label>
            <TimeInputs h={addH} setH={setAddH} m={addM} setM={setAddM} />
          </div>
          <button
            onClick={handleAdd}
            style={{
              padding: '0.65rem 1.5rem',
              background: 'linear-gradient(to right, var(--primary), var(--secondary))',
              border: 'none', borderRadius: '8px',
              color: '#000', fontWeight: '700', fontSize: '0.9rem',
              cursor: 'pointer', whiteSpace: 'nowrap',
              fontFamily: 'var(--font-family)', flexShrink: 0,
            }}
          >
            + Adicionar
          </button>
        </div>
        {error && <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#F87171' }}>{error}</div>}
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
              draggable={editingId !== item.id}
              onDragStart={() => handleDragStart(idx)}
              onDragOver={e => handleDragOver(e, idx)}
              onDrop={handleDrop}
              onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
              style={{
                background: 'var(--card-bg)',
                border: `1px solid ${editingId === item.id ? 'var(--primary)' : overIdx === idx && dragIdx !== idx ? 'var(--primary)' : 'var(--card-border)'}`,
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                transition: 'border-color 0.15s, opacity 0.15s',
                opacity: dragIdx === idx ? 0.4 : 1,
                cursor: editingId === item.id ? 'default' : 'grab',
              }}
            >
              {editingId === item.id ? (
                /* ── Inline Edit Form ── */
                <div>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ flex: '1 1 180px' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Título *</label>
                      <input style={inputStyle} value={editTitulo} onChange={e => { setEditTitulo(e.target.value); setEditError(''); }} />
                    </div>
                    <div style={{ flex: '2 1 220px' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Link</label>
                      <input style={inputStyle} value={editLink} onChange={e => setEditLink(e.target.value)} placeholder="https://..." />
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tempo estimado *</label>
                      <TimeInputs h={editH} setH={setEditH} m={editM} setM={setEditM} />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      <button
                        onClick={handleSaveEdit}
                        style={{ padding: '0.6rem 1.2rem', background: 'var(--primary)', border: 'none', borderRadius: '8px', color: '#000', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'var(--font-family)' }}
                      >Salvar</button>
                      <button
                        onClick={handleCancelEdit}
                        style={{ padding: '0.6rem 1rem', background: 'transparent', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'var(--font-family)' }}
                      >Cancelar</button>
                    </div>
                  </div>
                  {editError && <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#F87171' }}>{editError}</div>}
                </div>
              ) : (
                /* ── Normal Row ── */
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {/* Drag handle + number */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>⠿</span>
                    <span style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      background: 'rgba(0,240,255,0.1)', color: 'var(--primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: '700', flexShrink: 0,
                    }}>{idx + 1}</span>
                  </div>

                  {/* Title + link */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text)', marginBottom: '2px' }}>
                      {item.titulo}
                    </div>
                    {item.link && (
                      <a href={item.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                        style={{ fontSize: '0.78rem', color: 'var(--primary)', textDecoration: 'none', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: '100%' }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '0.8'}
                      >🔗 {item.link}</a>
                    )}
                  </div>

                  {/* Estimated time badge */}
                  <div style={{
                    flexShrink: 0, padding: '0.3rem 0.75rem',
                    background: 'rgba(0,240,255,0.07)', border: '1px solid rgba(0,240,255,0.18)',
                    borderRadius: '8px', color: 'var(--primary)', fontSize: '0.82rem', fontWeight: '700',
                  }}>
                    🕐 {fmtTempo(item.tempoMinutos)}
                  </div>

                  {/* Open link */}
                  {item.link && (
                    <a href={item.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                      style={{ padding: '0.45rem 1rem', background: 'rgba(0,240,255,0.08)', border: '1px solid rgba(0,240,255,0.2)', borderRadius: '8px', color: 'var(--primary)', fontSize: '0.8rem', fontWeight: '600', textDecoration: 'none', flexShrink: 0, fontFamily: 'var(--font-family)' }}
                    >Abrir</a>
                  )}

                  {/* Edit */}
                  <button
                    onClick={() => handleStartEdit(item)}
                    style={{ background: 'transparent', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', padding: '0.4rem 0.8rem', flexShrink: 0, fontFamily: 'var(--font-family)', transition: 'color 0.15s, border-color 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--text-muted)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--card-border)'; }}
                  >Editar</button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(item.id)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem', padding: '0.25rem', borderRadius: '6px', flexShrink: 0, lineHeight: 1, transition: 'color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#F87171'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                    title="Remover"
                  >✕</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
