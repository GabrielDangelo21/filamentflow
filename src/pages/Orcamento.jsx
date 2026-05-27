import React, { useState, useEffect, useMemo, useRef } from 'react';

const BUDGET_KEY = 'filamentflow_orcamento';
const PRICE_SETTINGS_KEY = 'filamentflow_calc_settings';

const fmtEur = (v) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v || 0);

const fmtDur = (mins) => {
  if (!mins) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
};

const calcMinutes = (start, end) => {
  if (!start || !end) return '';
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let total = (eh * 60 + em) - (sh * 60 + sm);
  if (total < 0) total += 24 * 60;
  return total;
};

const EMPTY_FORM = {
  description: '',
  project: '',
  startTime: '',
  endTime: '',
  timeMinutes: '',
  totalWeight: '',
  materialCost: '',
};

const inp = {
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.18)',
  borderRadius: '8px',
  padding: '0.6rem 0.9rem',
  color: '#F8FAFC',
  fontFamily: 'var(--font-family)',
  fontSize: '0.92rem',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block',
  fontSize: '0.78rem',
  color: '#94A3B8',
  textTransform: 'uppercase',
  letterSpacing: '0.6px',
  fontWeight: 700,
  marginBottom: '0.45rem',
};

// ── Modal ──────────────────────────────────────────────────────────────────────
const ItemModal = ({ item, onSave, onClose }) => {
  const [form, setForm] = useState(item || EMPTY_FORM);
  const descRef = useRef(null);

  useEffect(() => {
    setTimeout(() => descRef.current?.focus(), 60);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleTime = (field, value) => {
    const updated = { ...form, [field]: value };
    const mins = calcMinutes(
      field === 'startTime' ? value : form.startTime,
      field === 'endTime'   ? value : form.endTime
    );
    if (mins !== '') updated.timeMinutes = mins;
    setForm(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.description.trim()) return;
    onSave({
      ...form,
      timeMinutes:  Number(form.timeMinutes)  || 0,
      totalWeight:  Number(form.totalWeight)   || 0,
      materialCost: Number(form.materialCost)  || 0,
    });
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div style={{
        background: '#151B2D',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: '16px',
        padding: '2rem',
        width: '100%',
        maxWidth: '520px',
        boxShadow: '0 30px 90px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,240,255,0.08)',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#F8FAFC', fontWeight: 700 }}>
            {item ? 'Editar item' : 'Adicionar impressão ao orçamento'}
          </h2>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '6px', color: '#94A3B8',
            fontSize: '1.2rem', cursor: 'pointer', lineHeight: 1,
            padding: '0.2rem 0.55rem', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; e.currentTarget.style.color = '#F8FAFC'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#94A3B8'; }}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Descrição */}
          <div style={{ marginBottom: '1.1rem' }}>
            <label style={labelStyle}>Nome / Descrição *</label>
            <input
              ref={descRef}
              type="text"
              placeholder="Ex: Miniatura RPG, Case AirPods..."
              value={form.description}
              onChange={e => set('description', e.target.value)}
              style={inp}
              required
            />
          </div>

          {/* Projeto */}
          <div style={{ marginBottom: '1.1rem' }}>
            <label style={labelStyle}>
              Projeto{' '}
              <span style={{ fontWeight: 400, textTransform: 'none', fontSize: '0.75rem', color: '#64748B' }}>
                (opcional — agrupa partes)
              </span>
            </label>
            <input
              type="text"
              placeholder="Ex: Hermione Knitted, Gaita Harry Potter..."
              value={form.project}
              onChange={e => set('project', e.target.value)}
              style={inp}
            />
          </div>

          {/* Tempo */}
          <div style={{ marginBottom: '1.1rem' }}>
            <label style={{ ...labelStyle, display: 'flex', justifyContent: 'space-between' }}>
              <span>Hora Inicial</span><span>Hora Final</span>
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input type="time" value={form.startTime} onChange={e => handleTime('startTime', e.target.value)} style={{ ...inp, flex: 1 }} />
              <span style={{ color: 'var(--primary)', fontWeight: 700, flexShrink: 0, fontSize: '1.1rem' }}>→</span>
              <input type="time" value={form.endTime}   onChange={e => handleTime('endTime',   e.target.value)} style={{ ...inp, flex: 1 }} />
            </div>
            {form.timeMinutes !== '' && form.timeMinutes > 0 && (
              <div style={{ marginTop: '0.4rem', background: 'rgba(0,240,255,0.09)', border: '1px solid rgba(0,240,255,0.25)', borderRadius: '6px', padding: '0.35rem 0.75rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{fmtDur(Number(form.timeMinutes))}</span>
                <span style={{ color: '#64748B', fontSize: '0.8rem' }}>({form.timeMinutes} min)</span>
              </div>
            )}
          </div>

          {/* Divisor */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1rem 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ fontSize: '0.72rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
              ou preencha direto
            </span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* Tempo manual */}
          <div style={{ marginBottom: '1.1rem' }}>
            <label style={labelStyle}>Tempo de impressão (min)</label>
            <input
              type="number"
              min="0"
              placeholder="Ex: 180"
              value={form.timeMinutes}
              onChange={e => set('timeMinutes', e.target.value)}
              style={{ ...inp, width: '160px' }}
            />
          </div>

          {/* Peso + Custo material */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={labelStyle}>Peso (g)</label>
              <input type="number" min="0" step="0.1" placeholder="Ex: 45" value={form.totalWeight} onChange={e => set('totalWeight', e.target.value)} style={inp} />
            </div>
            <div>
              <label style={labelStyle}>Custo material (€)</label>
              <input type="number" min="0" step="0.01" placeholder="Ex: 0.85" value={form.materialCost} onChange={e => set('materialCost', e.target.value)} style={inp} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{
              padding: '0.65rem 1.2rem', background: 'transparent',
              border: '1px solid var(--card-border)', borderRadius: '8px',
              color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem',
            }}>Cancelar</button>
            <button type="submit" style={{
              padding: '0.65rem 1.5rem',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              border: 'none', borderRadius: '8px',
              color: '#000', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem',
            }}>
              {item ? 'Guardar' : '+ Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function Orcamento() {
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // null = new, object = editing
  const [showSettings, setShowSettings] = useState(false);

  const [wattage,      setWattage]      = useState(200);
  const [kwh,          setKwh]          = useState(0.145);
  const [laborMinutes, setLaborMinutes] = useState(15);
  const [hourlyRate,   setHourlyRate]   = useState(10);
  const [margin,       setMargin]       = useState(30);

  // Load items + settings
  useEffect(() => {
    try {
      const raw = localStorage.getItem(BUDGET_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch (_) {}

    try {
      const s = JSON.parse(localStorage.getItem(PRICE_SETTINGS_KEY) || '{}');
      if (s.wattage      != null) setWattage(s.wattage);
      if (s.kwh          != null) setKwh(s.kwh);
      if (s.laborMinutes != null) setLaborMinutes(s.laborMinutes);
      if (s.hourlyRate   != null) setHourlyRate(s.hourlyRate);
      if (s.margin       != null) setMargin(s.margin);
    } catch (_) {}
  }, []);

  // Save items
  useEffect(() => {
    localStorage.setItem(BUDGET_KEY, JSON.stringify(items));
  }, [items]);

  // Save settings
  useEffect(() => {
    localStorage.setItem(PRICE_SETTINGS_KEY,
      JSON.stringify({ wattage, kwh, laborMinutes, hourlyRate, margin }));
  }, [wattage, kwh, laborMinutes, hourlyRate, margin]);

  // ── CRUD ──
  const openNew = () => { setEditingItem(null); setShowModal(true); };
  const openEdit = (item) => { setEditingItem(item); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditingItem(null); };

  const handleSave = (form) => {
    if (editingItem) {
      setItems(prev => prev.map(it => it.id === editingItem.id ? { ...editingItem, ...form } : it));
    } else {
      setItems(prev => [...prev, { ...form, id: Date.now().toString() }]);
    }
    closeModal();
  };

  const handleDelete = (id) => {
    setItems(prev => prev.filter(it => it.id !== id));
  };

  const handleClear = () => {
    if (confirm('Limpar todos os itens do orçamento?')) setItems([]);
  };

  // ── Cost helpers ──
  const calcItem = (it) => {
    const material    = Number(it.materialCost) || 0;
    const electricity = (wattage / 1000) * ((Number(it.timeMinutes) || 0) / 60) * kwh;
    const labor       = (laborMinutes / 60) * hourlyRate;
    const totalCost   = material + electricity + labor;
    const sellingPrice = totalCost * (1 + margin / 100);
    return { material, electricity, labor, totalCost, sellingPrice };
  };

  // ── Groups ──
  const groups = useMemo(() => {
    const map = new Map();
    items.forEach(it => {
      const key = it.project?.trim() || '';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(it);
    });
    return [...map.entries()].sort(([a], [b]) => {
      if (!a && b) return 1;
      if (a && !b) return -1;
      return a.localeCompare(b);
    });
  }, [items]);

  // ── Totals ──
  const totalMaterial    = items.reduce((s, it) => s + (Number(it.materialCost) || 0), 0);
  const totalTime        = items.reduce((s, it) => s + (Number(it.timeMinutes) || 0), 0);
  const totalWeight      = items.reduce((s, it) => s + (Number(it.totalWeight) || 0), 0);
  const totalElectricity = (wattage / 1000) * (totalTime / 60) * kwh;
  const totalLabor       = items.length * (laborMinutes / 60) * hourlyRate;
  const totalCost        = totalMaterial + totalElectricity + totalLabor;
  const marginAmt        = totalCost * margin / 100;
  const sellingPrice     = totalCost + marginAmt;

  const settingsFields = [
    { label: 'Potência (W)',                  value: wattage,      setter: setWattage,      step: '10'    },
    { label: '€/kWh',                        value: kwh,          setter: setKwh,          step: '0.001' },
    { label: 'Mão de obra (min/impressão)',   value: laborMinutes, setter: setLaborMinutes, step: '5'     },
    { label: '€/hora',                       value: hourlyRate,   setter: setHourlyRate,   step: '0.5'   },
    { label: 'Margem (%)',                   value: margin,       setter: setMargin,       step: '5'     },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.3rem' }}>
            Orçamento de Venda
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Adicione as impressões do projeto e calcule o preço de venda
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
          {items.length > 0 && (
            <button onClick={handleClear} style={{
              padding: '0.6rem 1rem', background: 'transparent',
              border: '1px solid rgba(248,113,113,0.4)', borderRadius: '8px',
              color: '#F87171', fontSize: '0.85rem', cursor: 'pointer',
              fontFamily: 'inherit', fontWeight: 600, transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              🗑 Limpar
            </button>
          )}
          <button onClick={openNew} style={{
            padding: '0.6rem 1.25rem',
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            border: 'none', borderRadius: '8px',
            color: '#000', fontWeight: 700, fontSize: '0.9rem',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            + Adicionar impressão
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 310px', gap: '1.5rem', alignItems: 'start' }}>

        {/* ── Lista ── */}
        <div>
          {items.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '4rem 2rem',
              background: 'var(--card-bg)', border: '1px dashed var(--card-border)',
              borderRadius: '14px', color: 'var(--text-muted)',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💰</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem' }}>Orçamento vazio</div>
              <div style={{ fontSize: '0.88rem', marginBottom: '1.5rem' }}>
                Adicione as impressões do projeto para calcular o preço de venda
              </div>
              <button onClick={openNew} style={{
                padding: '0.65rem 1.5rem',
                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                border: 'none', borderRadius: '8px',
                color: '#000', fontWeight: 700, fontSize: '0.9rem',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>+ Adicionar impressão</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {groups.map(([groupKey, groupItems]) => {
                const label = groupKey || '(sem projeto)';
                const icon  = groupKey ? '📁' : '📄';
                const gTime = groupItems.reduce((s, it) => s + (Number(it.timeMinutes) || 0), 0);
                const gSell = groupItems.reduce((s, it) => s + calcItem(it).sellingPrice, 0);

                return (
                  <div key={label} style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '12px', overflow: 'hidden',
                  }}>
                    {/* Cabeçalho do grupo */}
                    {(groupKey || groups.length > 1) && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.75rem 1.25rem',
                        background: 'rgba(255,255,255,0.03)',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                      }}>
                        <span style={{ fontSize: '0.92rem', fontWeight: 700, flex: 1, color: 'var(--text-main)' }}>
                          {icon} {label}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '0.15rem 0.55rem', borderRadius: '999px' }}>
                          {groupItems.length} {groupItems.length === 1 ? 'impressão' : 'impressões'}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', minWidth: '50px', textAlign: 'right' }}>
                          {fmtDur(gTime)}
                        </span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: gSell > 0 ? 'var(--primary)' : 'var(--text-muted)', minWidth: '70px', textAlign: 'right' }}>
                          {gSell > 0 ? fmtEur(gSell) : '—'}
                        </span>
                      </div>
                    )}

                    {/* Linhas */}
                    {groupItems.map((it, i) => {
                      const c = calcItem(it);
                      return (
                        <div key={it.id} style={{
                          display: 'flex', alignItems: 'center', gap: '0.75rem',
                          padding: '0.75rem 1.25rem',
                          borderBottom: i < groupItems.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {it.description}
                            </div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'flex', gap: '0.75rem' }}>
                              {it.timeMinutes > 0 && <span>⏱ {fmtDur(Number(it.timeMinutes))}</span>}
                              {it.totalWeight > 0 && <span>⚖ {Number(it.totalWeight).toFixed(0)}g</span>}
                              {it.materialCost > 0 && <span>🧵 {fmtEur(it.materialCost)}</span>}
                            </div>
                          </div>

                          {/* Custo + Venda */}
                          <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '80px' }}>
                            {c.totalCost > 0 && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                custo {fmtEur(c.totalCost)}
                              </div>
                            )}
                            <div style={{ fontWeight: 700, color: c.sellingPrice > 0 ? 'var(--primary)' : 'var(--text-muted)', fontSize: '0.95rem' }}>
                              {c.sellingPrice > 0 ? fmtEur(c.sellingPrice) : '—'}
                            </div>
                          </div>

                          {/* Ações */}
                          <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                            <button onClick={() => openEdit(it)} style={{
                              padding: '0.35rem 0.7rem', background: 'rgba(255,255,255,0.06)',
                              border: '1px solid var(--card-border)', borderRadius: '6px',
                              color: 'var(--text-muted)', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit',
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-main)'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}>
                              ✏️ Editar
                            </button>
                            <button onClick={() => handleDelete(it.id)} style={{
                              padding: '0.35rem 0.7rem', background: 'transparent',
                              border: '1px solid rgba(248,113,113,0.25)', borderRadius: '6px',
                              color: 'rgba(248,113,113,0.6)', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit',
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#F87171'; e.currentTarget.style.background = 'rgba(248,113,113,0.1)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(248,113,113,0.6)'; e.currentTarget.style.background = 'transparent'; }}>
                              ×
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {/* Botão adicionar mais */}
              <button onClick={openNew} style={{
                width: '100%', padding: '0.75rem',
                background: 'transparent', border: '1px dashed rgba(0,240,255,0.25)',
                borderRadius: '10px', color: 'var(--primary)', fontSize: '0.88rem',
                cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,240,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(0,240,255,0.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(0,240,255,0.25)'; }}>
                + Adicionar mais uma impressão
              </button>
            </div>
          )}
        </div>

        {/* ── Resumo (sticky) ── */}
        <div style={{ position: 'sticky', top: '2rem' }}>
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '14px', padding: '1.5rem',
          }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 700, marginBottom: '1.25rem' }}>
              Resumo
            </div>

            {items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Adicione impressões ao orçamento
              </div>
            ) : (
              <>
                {/* Info geral */}
                <div style={{ marginBottom: '1rem', padding: '0.6rem 0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{items.length} impressão{items.length !== 1 ? 'ões' : ''}</span>
                  <span>{totalWeight.toFixed(0)}g · {fmtDur(totalTime)}</span>
                </div>

                {/* Breakdown */}
                {[
                  { label: '🧵 Material',    value: totalMaterial    },
                  { label: '⚡ Eletricidade', value: totalElectricity },
                  { label: '🤝 Mão de obra', value: totalLabor       },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.55rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.87rem' }}>{label}</span>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{fmtEur(value)}</span>
                  </div>
                ))}

                <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '0.55rem', marginTop: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.87rem' }}>Subtotal</span>
                    <span style={{ fontWeight: 700 }}>{fmtEur(totalCost)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ color: '#10B981', fontSize: '0.87rem' }}>📈 Margem ({margin}%)</span>
                    <span style={{ fontWeight: 600, color: '#10B981' }}>+ {fmtEur(marginAmt)}</span>
                  </div>
                </div>

                {/* Preço de venda */}
                <div style={{
                  background: 'rgba(0,240,255,0.07)', border: '1px solid rgba(0,240,255,0.22)',
                  borderRadius: '12px', padding: '1.1rem', textAlign: 'center', marginBottom: '0.75rem',
                }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.35rem' }}>
                    Preço de venda
                  </div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1, letterSpacing: '-0.02em' }}>
                    {fmtEur(sellingPrice)}
                  </div>
                </div>
              </>
            )}

            {/* Configurações */}
            <button
              onClick={() => setShowSettings(p => !p)}
              style={{
                width: '100%', padding: '0.5rem', background: 'transparent',
                border: '1px solid var(--card-border)', borderRadius: '8px',
                color: showSettings ? 'var(--primary)' : 'var(--text-muted)',
                fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit',
                transition: 'color 0.15s',
              }}>
              ⚙️ {showSettings ? 'Fechar configurações' : 'Configurações'}
            </button>

            {showSettings && (
              <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                {settingsFields.map(({ label, value, setter, step }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', flex: 1 }}>{label}</span>
                    <input
                      type="number" min="0" step={step} value={value}
                      onChange={e => setter(parseFloat(e.target.value) || 0)}
                      style={{ width: '70px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', borderRadius: '6px', padding: '0.4rem 0.5rem', color: 'var(--text-main)', fontFamily: 'var(--font-family)', fontSize: '0.85rem', outline: 'none', textAlign: 'center' }}
                    />
                  </div>
                ))}
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem', marginBottom: 0 }}>
                  Partilhado com a aba Impressões.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <ItemModal
          item={editingItem}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
