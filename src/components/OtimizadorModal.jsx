import React, { useState } from 'react';

const fmtTempo = (min) => {
  if (!min) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
};

const calcSlotMin = (start, end) => {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let t = (eh * 60 + em) - (sh * 60 + sm);
  if (t <= 0) t += 24 * 60;
  return t;
};

// Recursive combination generator
function getCombinations(arr, n) {
  if (n === 0) return [[]];
  if (arr.length < n) return [];
  const [first, ...rest] = arr;
  return [
    ...getCombinations(rest, n - 1).map(c => [first, ...c]),
    ...getCombinations(rest, n),
  ];
}

function findBest(plates, slotMin) {
  const results = [];
  // Limit brute force depth to avoid freezing with many plates
  const maxN = Math.min(4, plates.length);

  for (let n = 1; n <= maxN; n++) {
    const combos = getCombinations(plates, n);
    let best = null;
    let bestTotal = 0;

    for (const combo of combos) {
      const total = combo.reduce((s, p) => s + p.tempoMinutos, 0);
      if (total <= slotMin && total > bestTotal) {
        best = combo;
        bestTotal = total;
      }
    }

    if (best) {
      const utilization = Math.round((bestTotal / slotMin) * 100);
      results.push({ n, combo: best, total: bestTotal, utilization });
      if (utilization === 100) break; // perfect fit, no need to try more
    }
  }

  return results;
}

const timeInputStyle = {
  background: 'rgba(0,0,0,0.3)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  padding: '0.55rem 0.85rem',
  color: 'var(--text)',
  fontFamily: 'var(--font-family)',
  fontSize: '1rem',
  outline: 'none',
};

export default function OtimizadorModal({ plates, onClose }) {
  const [startTime, setStartTime] = useState('22:00');
  const [endTime, setEndTime] = useState('06:00');
  const [results, setResults] = useState(null);
  const [calculating, setCalculating] = useState(false);

  const slotMin = calcSlotMin(startTime, endTime);

  const handleCalculate = () => {
    if (plates.length === 0) return;
    setCalculating(true);
    setResults(null);
    setTimeout(() => {
      setResults(findBest(plates, slotMin));
      setCalculating(false);
    }, 30);
  };

  const utilizationColor = (u) =>
    u >= 90 ? 'var(--primary)' : u >= 70 ? '#F59E0B' : 'var(--text-muted)';

  const utilizationBg = (u) =>
    u >= 90 ? 'rgba(0,240,255,0.12)' : u >= 70 ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.06)';

  const utilizationBorder = (u) =>
    u >= 90 ? 'rgba(0,240,255,0.3)' : u >= 70 ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.08)';

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '2rem' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '2rem', width: '100%', maxWidth: '620px', boxShadow: '0 24px 64px rgba(0,0,0,0.8)' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.3rem' }}>⚡ Otimizador de Impressão</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.3rem' }}>
              {plates.length} placa{plates.length !== 1 ? 's' : ''} disponível{plates.length !== 1 ? 'eis' : ''} na fila
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1, padding: '0.25rem' }}>✕</button>
        </div>

        {/* Slot config */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '1rem', fontWeight: 600 }}>
            Quando estarei fora / tempo disponível
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>Saída</label>
              <input type="time" value={startTime}
                onChange={e => { setStartTime(e.target.value); setResults(null); }}
                style={timeInputStyle} />
            </div>
            <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '1.3rem', marginTop: '16px' }}>→</span>
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>Chegada</label>
              <input type="time" value={endTime}
                onChange={e => { setEndTime(e.target.value); setResults(null); }}
                style={timeInputStyle} />
            </div>
            <div style={{ marginTop: '16px', padding: '0.55rem 1rem', background: 'rgba(0,240,255,0.07)', border: '1px solid rgba(0,240,255,0.2)', borderRadius: '8px', color: 'var(--primary)', fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
              🕐 {fmtTempo(slotMin)} disponíveis
            </div>
          </div>

          <button
            onClick={handleCalculate}
            disabled={calculating || plates.length === 0}
            style={{
              width: '100%', padding: '0.75rem',
              background: calculating ? 'rgba(0,240,255,0.25)' : 'linear-gradient(to right, var(--primary), var(--secondary))',
              border: 'none', borderRadius: '8px',
              color: '#000', fontWeight: '700', fontSize: '0.95rem',
              cursor: calculating || plates.length === 0 ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-family)', transition: 'opacity 0.2s',
              opacity: plates.length === 0 ? 0.5 : 1,
            }}
          >
            {calculating ? 'Calculando...' : '⚡ Calcular Melhor Combinação'}
          </button>

          {plates.length === 0 && (
            <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#F87171', textAlign: 'center' }}>
              Adicione impressões com tempo estimado às Próximas Impressões primeiro.
            </p>
          )}
        </div>

        {/* Results */}
        {results !== null && (
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '1rem', fontWeight: 600 }}>
              Melhores combinações
            </div>

            {results.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.75rem' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⚠️</div>
                <p style={{ color: '#F87171', fontWeight: 600, marginBottom: '0.25rem' }}>Nenhuma placa cabe neste slot</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Todas as placas têm tempo superior a {fmtTempo(slotMin)}.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {results.map(({ n, combo, total, utilization }) => (
                  <div key={n} style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: `1px solid ${utilizationBorder(utilization)}`,
                    borderRadius: '0.75rem', overflow: 'hidden',
                  }}>
                    {/* Group header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.1rem', background: utilizationBg(utilization), borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                        {n === 1 ? '1 placa' : `${n} placas em sequência`}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          {fmtTempo(total)} de {fmtTempo(slotMin)}
                        </span>
                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700, background: utilizationBg(utilization), color: utilizationColor(utilization), border: `1px solid ${utilizationBorder(utilization)}` }}>
                          {utilization}%
                        </span>
                      </div>
                    </div>

                    {/* Plates */}
                    <div style={{ padding: '0.85rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {combo.map((p, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: utilizationColor(utilization), flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.titulo}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}> · {p.nomePlaca}</span>
                          </div>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: utilizationColor(utilization), flexShrink: 0 }}>
                            {fmtTempo(p.tempoMinutos)}
                          </span>
                          <div style={{ width: '70px', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', flexShrink: 0 }}>
                            <div style={{ width: `${Math.min(100, (p.tempoMinutos / slotMin) * 100)}%`, height: '100%', background: utilizationColor(utilization), borderRadius: '2px' }} />
                          </div>
                        </div>
                      ))}

                      {/* Remaining time */}
                      {slotMin - total > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '0.1rem' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
                          <span style={{ flex: 1, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Impressora parada</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', flexShrink: 0 }}>{fmtTempo(slotMin - total)}</span>
                          <div style={{ width: '70px', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', flexShrink: 0 }}>
                            <div style={{ width: `${((slotMin - total) / slotMin) * 100}%`, height: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
