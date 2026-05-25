import React, { useState, useEffect } from 'react';
import { getProximas, saveProxima, updateProxima, deleteProxima, reorderProximas } from '../services/storage';

const inputStyle = {
  background: 'var(--card-bg)',
  border: '1px solid var(--card-border)',
  borderRadius: '8px',
  padding: '0.6rem 0.9rem',
  color: 'var(--text)',
  fontSize: '0.9rem',
  fontFamily: 'var(--font-family)',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const timeNumStyle = {
  ...inputStyle,
  width: '58px',
  textAlign: 'center',
  padding: '0.6rem 0.4rem',
};

const fmtTempo = (min) => {
  if (!min) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
};

const totalFromPlacas = (placas) =>
  (placas || []).reduce((s, p) => s + (Number(p.tempoMinutos) || 0), 0);

const emptyPlacas = (n) =>
  Array.from({ length: n }, (_, i) => ({ nome: `Placa ${i + 1}`, h: '', m: '' }));

const syncPlacas = (current, n) => {
  const next = [...current];
  while (next.length < n) next.push({ nome: `Placa ${next.length + 1}`, h: '', m: '' });
  return next.slice(0, n);
};

const labelStyle = { fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' };

/* ── Linha de placa no formulário ── */
const PlacaRow = ({ placa, index, onChange }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    background: 'rgba(255,255,255,0.02)', borderRadius: '8px',
    padding: '0.65rem 1rem', border: '1px solid var(--card-border)',
  }}>
    <span style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700, minWidth: '16px' }}>
      {index + 1}
    </span>
    <input
      style={{ ...inputStyle, flex: 1 }}
      value={placa.nome}
      onChange={e => onChange(index, 'nome', e.target.value)}
      placeholder={`Placa ${index + 1}`}
    />
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
      <input type="number" style={timeNumStyle} min="0" max="99"
        placeholder="0" value={placa.h}
        onChange={e => onChange(index, 'h', e.target.value)} />
      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>h</span>
      <input type="number" style={timeNumStyle} min="0" max="59"
        placeholder="0" value={placa.m}
        onChange={e => onChange(index, 'm', e.target.value)} />
      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>min</span>
    </div>
  </div>
);

/* ── Formulário de add/edit ── */
const FormFields = ({ t, setT, l, setL, np, setNP, ps, onPChange, onSubmit, onCancel, err, isEdit }) => (
  <div>
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '1rem' }}>
      <div style={{ flex: '1 1 180px' }}>
        <label style={labelStyle}>Título *</label>
        <input style={inputStyle} placeholder="Nome do modelo..." value={t} onChange={e => setT(e.target.value)} onKeyDown={e => !isEdit && e.key === 'Enter' && onSubmit()} />
      </div>
      <div style={{ flex: '2 1 220px' }}>
        <label style={labelStyle}>Link</label>
        <input style={inputStyle} placeholder="https://www.thingiverse.com/..." value={l} onChange={e => setL(e.target.value)} />
      </div>
      <div style={{ flexShrink: 0 }}>
        <label style={labelStyle}>Nº de Placas</label>
        <input type="number" min="1" max="20"
          style={{ ...inputStyle, width: '80px', textAlign: 'center' }}
          value={np} onChange={e => setNP(Math.max(1, parseInt(e.target.value) || 1))} />
      </div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
      {ps.map((p, i) => <PlacaRow key={i} placa={p} index={i} onChange={onPChange} />)}
    </div>
    {err && <div style={{ fontSize: '0.8rem', color: '#F87171', marginBottom: '0.75rem' }}>{err}</div>}
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
      {isEdit && (
        <button onClick={onCancel} style={{ padding: '0.6rem 1rem', background: 'transparent', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'var(--font-family)' }}>
          Cancelar
        </button>
      )}
      <button onClick={onSubmit} style={{ padding: '0.65rem 1.5rem', background: 'linear-gradient(to right, var(--primary), var(--secondary))', border: 'none', borderRadius: '8px', color: '#000', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'var(--font-family)' }}>
        {isEdit ? 'Salvar' : '+ Adicionar'}
      </button>
    </div>
  </div>
);

export default function ProximasImpressoes() {
  const [items, setItems] = useState([]);

  // ── Add form ──
  const [titulo, setTitulo] = useState('');
  const [link, setLink] = useState('');
  const [numPlacas, setNumPlacas] = useState(1);
  const [placas, setPlacas] = useState(emptyPlacas(1));
  const [error, setError] = useState('');

  // ── Edit state ──
  const [editingId, setEditingId] = useState(null);
  const [editTitulo, setEditTitulo] = useState('');
  const [editLink, setEditLink] = useState('');
  const [editNumPlacas, setEditNumPlacas] = useState(1);
  const [editPlacas, setEditPlacas] = useState(emptyPlacas(1));
  const [editError, setEditError] = useState('');

  // ── Drag ──
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  useEffect(() => { setItems(getProximas()); }, []);

  // Sync add placas when numPlacas changes
  useEffect(() => {
    setPlacas(prev => syncPlacas(prev, numPlacas));
  }, [numPlacas]);

  // Sync edit placas when editNumPlacas changes
  useEffect(() => {
    setEditPlacas(prev => syncPlacas(prev, editNumPlacas));
  }, [editNumPlacas]);

  const reload = () => setItems(getProximas());

  const handlePlacaChange = (idx, field, val) => {
    setPlacas(prev => prev.map((p, i) => i === idx ? { ...p, [field]: val } : p));
  };

  const handleEditPlacaChange = (idx, field, val) => {
    setEditPlacas(prev => prev.map((p, i) => i === idx ? { ...p, [field]: val } : p));
  };

  const buildPlacasSave = (ps) =>
    ps.map(p => ({ nome: p.nome || `Placa`, tempoMinutos: (parseInt(p.h) || 0) * 60 + (parseInt(p.m) || 0) }));

  // ── Add ──
  const handleAdd = () => {
    if (!titulo.trim()) { setError('O título é obrigatório.'); return; }
    const saved = buildPlacasSave(placas);
    if (saved.every(p => p.tempoMinutos === 0)) { setError('Informe o tempo de pelo menos uma placa.'); return; }
    saveProxima({ titulo: titulo.trim(), link: link.trim(), placas: saved });
    setTitulo(''); setLink(''); setNumPlacas(1); setPlacas(emptyPlacas(1)); setError('');
    reload();
  };

  // ── Edit ──
  const handleStartEdit = (item) => {
    setEditingId(item.id);
    setEditTitulo(item.titulo || '');
    setEditLink(item.link || '');
    // Support old items with single tempoMinutos
    const ps = item.placas?.length
      ? item.placas.map(p => ({ nome: p.nome || 'Placa', h: String(Math.floor((p.tempoMinutos || 0) / 60)), m: String((p.tempoMinutos || 0) % 60) }))
      : [{ nome: 'Placa 1', h: String(Math.floor((item.tempoMinutos || 0) / 60)), m: String((item.tempoMinutos || 0) % 60) }];
    setEditNumPlacas(ps.length);
    setEditPlacas(ps);
    setEditError('');
  };

  const handleSaveEdit = () => {
    if (!editTitulo.trim()) { setEditError('O título é obrigatório.'); return; }
    const saved = buildPlacasSave(editPlacas);
    if (saved.every(p => p.tempoMinutos === 0)) { setEditError('Informe o tempo de pelo menos uma placa.'); return; }
    updateProxima({ id: editingId, titulo: editTitulo.trim(), link: editLink.trim(), placas: saved });
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
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '14px', padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Adicionar modelo
        </div>
        <FormFields
          t={titulo} setT={setTitulo}
          l={link} setL={setLink}
          np={numPlacas} setNP={setNumPlacas}
          ps={placas} onPChange={handlePlacaChange}
          onSubmit={handleAdd}
          err={error}
          isEdit={false}
        />
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
          {items.map((item, idx) => {
            const itemPlacas = item.placas?.length
              ? item.placas
              : item.tempoMinutos
                ? [{ nome: 'Placa 1', tempoMinutos: item.tempoMinutos }]
                : [];
            const totalMin = totalFromPlacas(itemPlacas);
            const isEditing = editingId === item.id;

            return (
              <div
                key={item.id}
                draggable={!isEditing}
                onDragStart={() => handleDragStart(idx)}
                onDragOver={e => handleDragOver(e, idx)}
                onDrop={handleDrop}
                onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
                style={{
                  background: 'var(--card-bg)',
                  border: `1px solid ${isEditing ? 'var(--primary)' : overIdx === idx && dragIdx !== idx ? 'var(--primary)' : 'var(--card-border)'}`,
                  borderRadius: '12px',
                  padding: '1rem 1.25rem',
                  transition: 'border-color 0.15s, opacity 0.15s',
                  opacity: dragIdx === idx ? 0.4 : 1,
                  cursor: isEditing ? 'default' : 'grab',
                }}
              >
                {isEditing ? (
                  /* ── Inline Edit ── */
                  <FormFields
                    t={editTitulo} setT={setEditTitulo}
                    l={editLink} setL={setEditLink}
                    np={editNumPlacas} setNP={setEditNumPlacas}
                    ps={editPlacas} onPChange={handleEditPlacaChange}
                    onSubmit={handleSaveEdit}
                    onCancel={handleCancelEdit}
                    err={editError}
                    isEdit={true}
                  />
                ) : (
                  /* ── Normal display ── */
                  <div>
                    {/* Header row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: itemPlacas.length > 0 ? '0.75rem' : 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>⠿</span>
                        <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(0,240,255,0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '700', flexShrink: 0 }}>
                          {idx + 1}
                        </span>
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text)', marginBottom: '1px' }}>{item.titulo}</div>
                        {item.link && (
                          <a href={item.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                            style={{ fontSize: '0.78rem', color: 'var(--primary)', textDecoration: 'none', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: '100%' }}
                            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                            onMouseLeave={e => e.currentTarget.style.opacity = '0.8'}
                          >🔗 {item.link}</a>
                        )}
                      </div>

                      {/* Badges */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: '999px' }}>
                          {itemPlacas.length} {itemPlacas.length === 1 ? 'placa' : 'placas'}
                        </span>
                        <span style={{ padding: '0.3rem 0.75rem', background: 'rgba(0,240,255,0.07)', border: '1px solid rgba(0,240,255,0.18)', borderRadius: '8px', color: 'var(--primary)', fontSize: '0.82rem', fontWeight: '700' }}>
                          🕐 {fmtTempo(totalMin)}
                        </span>
                      </div>

                      {item.link && (
                        <a href={item.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                          style={{ padding: '0.4rem 0.9rem', background: 'rgba(0,240,255,0.08)', border: '1px solid rgba(0,240,255,0.2)', borderRadius: '8px', color: 'var(--primary)', fontSize: '0.8rem', fontWeight: '600', textDecoration: 'none', flexShrink: 0, fontFamily: 'var(--font-family)' }}>
                          Abrir
                        </a>
                      )}

                      <button onClick={() => handleStartEdit(item)}
                        style={{ background: 'transparent', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', padding: '0.4rem 0.8rem', flexShrink: 0, fontFamily: 'var(--font-family)', transition: 'color 0.15s, border-color 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--text-muted)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--card-border)'; }}>
                        Editar
                      </button>

                      <button onClick={() => handleDelete(item.id)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem', padding: '0.25rem', borderRadius: '6px', flexShrink: 0, lineHeight: 1, transition: 'color 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#F87171'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                        title="Remover">✕
                      </button>
                    </div>

                    {/* Placas list */}
                    {itemPlacas.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', paddingLeft: '3rem' }}>
                        {itemPlacas.map((p, pi) => (
                          <div key={pi} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.82rem' }}>
                            <span style={{ color: 'var(--primary)', fontWeight: 600, minWidth: '14px' }}>{pi + 1}.</span>
                            <span style={{ color: 'var(--text-muted)', flex: 1 }}>{p.nome || `Placa ${pi + 1}`}</span>
                            <span style={{ color: p.tempoMinutos ? 'var(--text)' : 'var(--text-muted)', fontWeight: 600, minWidth: '60px', textAlign: 'right' }}>
                              {fmtTempo(p.tempoMinutos)}
                            </span>
                            {/* Mini bar */}
                            {totalMin > 0 && (
                              <div style={{ width: '80px', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden', flexShrink: 0 }}>
                                <div style={{ width: `${((p.tempoMinutos || 0) / totalMin) * 100}%`, height: '100%', background: 'var(--primary)', borderRadius: '2px' }} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
