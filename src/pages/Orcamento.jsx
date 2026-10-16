import React, { useState, useEffect, useMemo } from 'react';
import { getPrints, getPrintCost, temCompraRegistada } from '../services/storage';
import { usePriceSettings, calcularPreco } from '../utils/pricing';
import ResumoPreco from '../components/ResumoPreco';

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

// ── Checkbox visual ──────────────────────────────────────────────────────────
const Checkbox = ({ checked, indeterminate, onChange }) => (
  <div
    onClick={onChange}
    style={{
      width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0, cursor: 'pointer',
      border: `2px solid ${checked || indeterminate ? 'var(--primary)' : 'rgba(255,255,255,0.25)'}`,
      background: checked ? 'var(--primary)' : indeterminate ? 'rgba(0,240,255,0.2)' : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.15s',
    }}
  >
    {checked && <span style={{ color: '#000', fontSize: '0.65rem', fontWeight: 900, lineHeight: 1 }}>✓</span>}
    {!checked && indeterminate && <span style={{ color: 'var(--primary)', fontSize: '0.75rem', lineHeight: 1, fontWeight: 700 }}>—</span>}
  </div>
);

// ── Main Page ────────────────────────────────────────────────────────────────
export default function Orcamento() {
  const [prints, setPrints]           = useState([]);
  const [selected, setSelected]       = useState(new Set());
  const [expanded, setExpanded]       = useState(new Set());
  const [settings, setSetting] = usePriceSettings();

  useEffect(() => {
    setPrints(getPrints().reverse());
  }, []);

  // ── Groups ──────────────────────────────────────────────────────────────────
  const groups = useMemo(() => {
    const map = new Map();
    prints.forEach(p => {
      const key = p.project || p.description || '(sem nome)';
      if (!map.has(key)) map.set(key, { prints: [], latestDate: null });
      const g = map.get(key);
      g.prints.push(p);
      const d = new Date(p.date.includes('T') ? p.date : p.date + 'T12:00:00');
      if (!g.latestDate || d > g.latestDate) g.latestDate = d;
    });
    return [...map.entries()]
      .sort(([, a], [, b]) => b.latestDate - a.latestDate)
      .map(([key, val]) => ({ key, ...val }));
  }, [prints]);

  // ── Selection helpers ────────────────────────────────────────────────────────
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

  const toggleExpand = (key) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // ── Totals ──────────────────────────────────────────────────────────────────
  const selectedPrints   = prints.filter(p => selected.has(p.id));
  const totalTime        = selectedPrints.reduce((s, p) => s + (Number(p.timeMinutes) || 0), 0);
  const totalWeight      = selectedPrints.reduce((s, p) => s + (Number(p.totalWeight) || 0), 0);
  const placasSemPreco   = selectedPrints.filter(p => p.filamentsUsed.some(f => !temCompraRegistada(f.sku))).length;
  const calc = calcularPreco({
    materialCost: selectedPrints.reduce((s, p) => s + getPrintCost(p), 0),
    totalTime,
    placas: selectedPrints.length,
  }, settings);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.3rem' }}>
            Orçamento de Venda
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Selecione as placas de um projeto para calcular o preço de venda
          </p>
        </div>
        {selected.size > 0 && (
          <button onClick={() => setSelected(new Set())} style={{
            padding: '0.5rem 1rem', background: 'transparent',
            border: '1px solid rgba(248,113,113,0.4)', borderRadius: '8px',
            color: '#F87171', fontSize: '0.83rem', cursor: 'pointer',
            fontFamily: 'inherit', fontWeight: 600,
          }}>
            Limpar seleção
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 310px', gap: '1.5rem', alignItems: 'start' }}>

        {/* ── Lista de projetos ── */}
        <div>
          {prints.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '4rem 2rem',
              background: 'var(--card-bg)', border: '1px dashed var(--card-border)',
              borderRadius: '14px', color: 'var(--text-muted)',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🖨️</div>
              <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.4rem' }}>Nenhuma impressão registrada</div>
              <div style={{ fontSize: '0.85rem' }}>
                Registe impressões na aba <strong>Impressões</strong> para poder criar orçamentos.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {groups.map(({ key, prints: gPrints }) => {
                const isOpen   = expanded.has(key);
                const allSel   = gPrints.every(p => selected.has(p.id));
                const someSel  = gPrints.some(p => selected.has(p.id));
                const gWeight  = gPrints.reduce((s, p) => s + (Number(p.totalWeight) || 0), 0);
                const gTime    = gPrints.reduce((s, p) => s + (Number(p.timeMinutes) || 0), 0);
                const gCost    = gPrints.reduce((s, p) => s + getPrintCost(p), 0);
                const hasProject = gPrints[0]?.project;
                const icon     = hasProject ? '📁' : '📄';

                return (
                  <div key={key} style={{
                    background: 'var(--card-bg)',
                    border: `1px solid ${someSel ? 'rgba(0,240,255,0.3)' : 'var(--card-border)'}`,
                    borderRadius: '12px',
                    overflow: 'hidden',
                    transition: 'border-color 0.2s',
                  }}>
                    {/* Cabeçalho do projeto */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.9rem 1.25rem',
                      background: someSel ? 'rgba(0,240,255,0.04)' : 'transparent',
                    }}>
                      {/* Checkbox do grupo */}
                      <Checkbox
                        checked={allSel}
                        indeterminate={!allSel && someSel}
                        onChange={() => {
                          toggleGroup(gPrints);
                          if (!isOpen) setExpanded(prev => { const n = new Set(prev); n.add(key); return n; });
                        }}
                      />

                      {/* Nome + meta — clica para expandir */}
                      <button
                        onClick={() => toggleExpand(key)}
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', gap: '0.6rem',
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          textAlign: 'left', color: 'inherit', fontFamily: 'inherit',
                          padding: 0, minWidth: 0,
                        }}
                      >
                        <span style={{
                          fontSize: '0.75rem', color: 'var(--primary)',
                          transition: 'transform 0.2s', display: 'inline-block',
                          transform: isOpen ? 'rotate(90deg)' : 'rotate(0)',
                          flexShrink: 0,
                        }}>▶</span>

                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {icon} {key}
                        </span>

                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', padding: '0.15rem 0.55rem', borderRadius: '999px', flexShrink: 0 }}>
                          {gPrints.length} {gPrints.length === 1 ? 'placa' : 'placas'}
                        </span>

                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', flexShrink: 0, minWidth: '38px', textAlign: 'right' }}>
                          {gWeight.toFixed(2).replace('.', ',')}g
                        </span>

                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', flexShrink: 0, minWidth: '50px', textAlign: 'right' }}>
                          {fmtDur(gTime)}
                        </span>

                        {gCost > 0 && (
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', flexShrink: 0, minWidth: '55px', textAlign: 'right' }}>
                            {fmtEur(gCost)}
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Placas expandidas */}
                    {isOpen && (
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                        {gPrints.map((p, i) => {
                          const isSel = selected.has(p.id);
                          const cost  = getPrintCost(p);
                          return (
                            <div
                              key={p.id}
                              onClick={() => togglePrint(p.id)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                padding: '0.65rem 1.25rem 0.65rem 1.6rem',
                                borderBottom: i < gPrints.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                                background: isSel ? 'rgba(0,240,255,0.05)' : 'transparent',
                                cursor: 'pointer', transition: 'background 0.12s',
                              }}
                              onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
                              onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
                            >
                              <Checkbox checked={isSel} indeterminate={false} onChange={() => {}} />

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <span style={{
                                  display: 'block', fontSize: '0.88rem',
                                  fontWeight: isSel ? 600 : 400,
                                  color: isSel ? 'var(--text-main)' : 'var(--text-muted)',
                                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                }}>
                                  {p.description || '(sem descrição)'}
                                </span>
                                {p.project && p.description !== key && (
                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{fmtDate(p.date)}</span>
                                )}
                              </div>

                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                                {fmtDate(p.date)}
                              </span>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', flexShrink: 0, minWidth: '36px', textAlign: 'right' }}>
                                {Number(p.totalWeight || 0).toFixed(2).replace('.', ',')}g
                              </span>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', flexShrink: 0, minWidth: '48px', textAlign: 'right' }}>
                                {fmtDur(p.timeMinutes)}
                              </span>
                              <span style={{ fontSize: '0.8rem', fontWeight: cost > 0 ? 600 : 400, color: cost > 0 ? 'var(--success)' : 'var(--text-muted)', flexShrink: 0, minWidth: '54px', textAlign: 'right' }}>
                                {cost > 0 ? fmtEur(cost) : '—'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Resumo (sticky) ── */}
        <ResumoPreco
          calc={calc}
          settings={settings}
          setSetting={setSetting}
          vazio={selected.size === 0}
          emptyContent={
            <div style={{ textAlign: 'center', padding: '1.75rem 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>☑️</div>
              <div style={{ fontSize: '0.83rem' }}>Selecione placas à esquerda</div>
            </div>
          }
          info={<>
            <span>{selected.size} placa{selected.size !== 1 ? 's' : ''}</span>
            <span>{totalWeight.toFixed(2).replace('.', ',')}g · {fmtDur(totalTime)}</span>
          </>}
          aviso={placasSemPreco > 0 &&
            `⚠️ ${placasSemPreco} placa${placasSemPreco !== 1 ? 's' : ''} com material sem compra registada nos Pedidos — o custo desse material entra como €0.`}
        />

      </div>
    </div>
  );
}
