import React, { useState, useEffect, useMemo } from 'react';
import { getPrints, getPrintCost } from '../services/storage';

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

const fmtDate = (dateStr) => {
  try {
    const d = dateStr.includes('T') ? new Date(dateStr) : new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
  } catch { return '—'; }
};

const inp = {
  background: 'rgba(0,0,0,0.2)',
  border: '1px solid var(--card-border)',
  borderRadius: '8px',
  padding: '0.5rem 0.75rem',
  color: 'var(--text-main)',
  fontFamily: 'var(--font-family)',
  fontSize: '0.9rem',
  outline: 'none',
};

const Checkbox = ({ checked, indeterminate }) => (
  <div style={{
    width: '17px', height: '17px', borderRadius: '4px', flexShrink: 0,
    border: `2px solid ${checked || indeterminate ? 'var(--primary)' : 'rgba(255,255,255,0.2)'}`,
    background: checked ? 'var(--primary)' : indeterminate ? 'rgba(0,240,255,0.25)' : 'transparent',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s',
  }}>
    {checked && <span style={{ color: '#000', fontSize: '0.6rem', fontWeight: 800, lineHeight: 1 }}>✓</span>}
    {!checked && indeterminate && <span style={{ color: 'var(--primary)', fontSize: '0.75rem', lineHeight: 1 }}>—</span>}
  </div>
);

export default function Orcamento() {
  const [prints, setPrints] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const [wattage, setWattage] = useState(200);
  const [kwh, setKwh] = useState(0.145);
  const [laborMinutes, setLaborMinutes] = useState(15);
  const [hourlyRate, setHourlyRate] = useState(10);
  const [margin, setMargin] = useState(30);

  useEffect(() => {
    setPrints(getPrints().reverse());
    const saved = localStorage.getItem(PRICE_SETTINGS_KEY);
    if (saved) {
      try {
        const s = JSON.parse(saved);
        if (s.wattage != null) setWattage(s.wattage);
        if (s.kwh != null) setKwh(s.kwh);
        if (s.laborMinutes != null) setLaborMinutes(s.laborMinutes);
        if (s.hourlyRate != null) setHourlyRate(s.hourlyRate);
        if (s.margin != null) setMargin(s.margin);
      } catch (_) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(PRICE_SETTINGS_KEY,
      JSON.stringify({ wattage, kwh, laborMinutes, hourlyRate, margin }));
  }, [wattage, kwh, laborMinutes, hourlyRate, margin]);

  // Grupos por projeto
  const groups = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = prints.filter(p =>
      !q ||
      (p.description || '').toLowerCase().includes(q) ||
      (p.project || '').toLowerCase().includes(q)
    );
    const map = new Map();
    filtered.forEach(p => {
      const key = p.project || '';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    });
    return [...map.entries()].sort(([a], [b]) => {
      if (!a) return 1;
      if (!b) return -1;
      return a.localeCompare(b);
    });
  }, [prints, search]);

  const togglePrint = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleGroup = (groupPrints) => {
    const ids = groupPrints.map(p => p.id);
    const allSel = ids.every(id => selected.has(id));
    setSelected(prev => {
      const next = new Set(prev);
      allSel ? ids.forEach(id => next.delete(id)) : ids.forEach(id => next.add(id));
      return next;
    });
  };

  const selectedPrints = prints.filter(p => selected.has(p.id));
  const totalMaterial   = selectedPrints.reduce((s, p) => s + getPrintCost(p), 0);
  const totalTime       = selectedPrints.reduce((s, p) => s + (Number(p.timeMinutes) || 0), 0);
  const totalWeight     = selectedPrints.reduce((s, p) => s + (Number(p.totalWeight) || 0), 0);
  const totalElectricity = (wattage / 1000) * (totalTime / 60) * kwh;
  const totalLabor      = selectedPrints.length * (laborMinutes / 60) * hourlyRate;
  const totalCost       = totalMaterial + totalElectricity + totalLabor;
  const marginAmt       = totalCost * margin / 100;
  const sellingPrice    = totalCost + marginAmt;

  const settingsFields = [
    { label: 'Potência (W)',             value: wattage,      setter: setWattage,      step: '10'    },
    { label: '€/kWh',                   value: kwh,          setter: setKwh,          step: '0.001' },
    { label: 'Mão de obra (min/impressão)', value: laborMinutes, setter: setLaborMinutes, step: '5' },
    { label: '€/hora',                  value: hourlyRate,   setter: setHourlyRate,   step: '0.5'   },
    { label: 'Margem (%)',              value: margin,       setter: setMargin,       step: '5'     },
  ];

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.3rem' }}>
          Orçamento de Venda
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Selecione as impressões de um projeto para calcular o custo total e o preço de venda
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 310px', gap: '1.5rem', alignItems: 'start' }}>

        {/* ── Lista de impressões ── */}
        <div>
          <input
            type="text"
            placeholder="🔍 Filtrar por descrição ou projeto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inp, width: '100%', padding: '0.75rem 1rem', fontSize: '0.95rem', marginBottom: '1rem' }}
          />

          {groups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🖨️</div>
              <div>Nenhuma impressão encontrada.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {groups.map(([groupKey, groupPrints]) => {
                const allSel  = groupPrints.every(p => selected.has(p.id));
                const someSel = groupPrints.some(p => selected.has(p.id));
                const gCost   = groupPrints.reduce((s, p) => s + getPrintCost(p), 0);
                const gTime   = groupPrints.reduce((s, p) => s + (Number(p.timeMinutes) || 0), 0);
                const label   = groupKey || '(sem projeto)';
                const icon    = groupKey ? '📁' : '📄';

                return (
                  <div key={label} style={{
                    background: 'var(--card-bg)',
                    border: `1px solid ${someSel ? 'rgba(0,240,255,0.3)' : 'var(--card-border)'}`,
                    borderRadius: '12px', overflow: 'hidden',
                    transition: 'border-color 0.15s',
                  }}>
                    {/* Cabeçalho do grupo */}
                    <div
                      onClick={() => toggleGroup(groupPrints)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.85rem 1.25rem',
                        background: someSel ? 'rgba(0,240,255,0.05)' : 'transparent',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        cursor: 'pointer',
                      }}
                    >
                      <Checkbox checked={allSel} indeterminate={!allSel && someSel} />
                      <span style={{ fontSize: '0.92rem', fontWeight: 700, flex: 1 }}>
                        {icon} {label}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '0.15rem 0.55rem', borderRadius: '999px' }}>
                        {groupPrints.length} {groupPrints.length === 1 ? 'impressão' : 'impressões'}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', minWidth: '50px', textAlign: 'right' }}>
                        {fmtDur(gTime)}
                      </span>
                      {gCost > 0 && (
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', minWidth: '58px', textAlign: 'right' }}>
                          {fmtEur(gCost)}
                        </span>
                      )}
                    </div>

                    {/* Linhas individuais */}
                    {groupPrints.map((p, i) => {
                      const isSel = selected.has(p.id);
                      const cost  = getPrintCost(p);
                      return (
                        <div
                          key={p.id}
                          onClick={() => togglePrint(p.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            padding: '0.6rem 1.25rem 0.6rem 1.5rem',
                            borderBottom: i < groupPrints.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                            background: isSel ? 'rgba(0,240,255,0.04)' : 'transparent',
                            cursor: 'pointer', transition: 'background 0.12s',
                          }}
                          onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                          onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
                        >
                          <Checkbox checked={isSel} indeterminate={false} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{
                              fontSize: '0.87rem',
                              fontWeight: isSel ? 600 : 400,
                              color: isSel ? 'var(--text-main)' : 'var(--text-muted)',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block',
                            }}>
                              {p.description || '(sem descrição)'}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                            {fmtDate(p.date)}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0, minWidth: '40px', textAlign: 'right' }}>
                            {parseFloat(p.totalWeight || 0).toFixed(0)}g
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0, minWidth: '48px', textAlign: 'right' }}>
                            {fmtDur(p.timeMinutes)}
                          </span>
                          <span style={{ fontSize: '0.78rem', fontWeight: cost > 0 ? 600 : 400, color: cost > 0 ? 'var(--success)' : 'var(--text-muted)', flexShrink: 0, minWidth: '54px', textAlign: 'right' }}>
                            {cost > 0 ? fmtEur(cost) : '—'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Resumo (sticky) ── */}
        <div style={{ position: 'sticky', top: '2rem' }}>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '14px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 700 }}>
                Resumo
              </div>
              {selected.size > 0 && (
                <button onClick={() => setSelected(new Set())} style={{
                  background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem',
                  cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', padding: 0,
                }}>Limpar</button>
              )}
            </div>

            {selected.size === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>☑️</div>
                <div style={{ fontSize: '0.85rem' }}>Selecione impressões à esquerda</div>
              </div>
            ) : (
              <>
                {/* Info geral */}
                <div style={{ marginBottom: '1rem', padding: '0.6rem 0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{selected.size} impressão{selected.size !== 1 ? 'ões' : ''}</span>
                  <span>{totalWeight.toFixed(0)}g · {fmtDur(totalTime)}</span>
                </div>

                {/* Breakdown */}
                {[
                  { label: '🧵 Material',     value: totalMaterial    },
                  { label: '⚡ Eletricidade',  value: totalElectricity },
                  { label: '🤝 Mão de obra',  value: totalLabor       },
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
                <div style={{ background: 'rgba(0,240,255,0.07)', border: '1px solid rgba(0,240,255,0.22)', borderRadius: '12px', padding: '1.1rem', textAlign: 'center', marginBottom: '0.75rem' }}>
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
                  Guardado automaticamente e partilhado com a aba Impressões.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
