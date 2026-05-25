import React, { useState } from 'react';

const fmtTempo = (min) => {
  if (!min || min <= 0) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
};

const toMin = (s) => {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
};

const slotDur = (start, end) => {
  let s = toMin(start), e = toMin(end);
  if (e <= s) e += 1440;
  return e - s;
};

const minToStr = (m) => {
  const h = Math.floor(m / 60) % 24;
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
};

const nowStr = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

function getCombinations(arr, n) {
  if (n === 0) return [[]];
  if (arr.length < n) return [];
  const [first, ...rest] = arr;
  return [
    ...getCombinations(rest, n - 1).map(c => [first, ...c]),
    ...getCombinations(rest, n),
  ];
}

function findBestForSlot(plates, slotMin) {
  if (!plates.length) return null;
  const maxN = Math.min(3, plates.length);
  let bestCover = null, bestCoverOver = Infinity;
  let bestFit = null, bestFitTotal = 0;

  for (let n = 1; n <= maxN; n++) {
    for (const combo of getCombinations(plates, n)) {
      const total = combo.reduce((s, p) => s + p.tempoMinutos, 0);
      if (total >= slotMin) {
        const over = total - slotMin;
        if (over < bestCoverOver) { bestCover = { combo, total }; bestCoverOver = over; }
      } else {
        if (total > bestFitTotal) { bestFit = { combo, total }; bestFitTotal = total; }
      }
    }
  }
  return bestCover || bestFit;
}

function buildSchedule(plates, currentTimeStr, absences) {
  const baseMin = toMin(currentTimeStr);
  const sorted = absences
    .map(a => {
      let startMin = toMin(a.start);
      if (startMin < baseMin) startMin += 1440;
      return { ...a, startMin, durMin: slotDur(a.start, a.end) };
    })
    .sort((a, b) => a.startMin - b.startMin);

  const periods = [];
  let tMin = baseMin;

  for (const abs of sorted) {
    if (abs.startMin > tMin) {
      periods.push({ type: 'home', startStr: minToStr(tMin), endStr: abs.start, duration: abs.startMin - tMin });
    }
    periods.push({ type: 'away', startStr: abs.start, endStr: abs.end, duration: abs.durMin });
    tMin = abs.startMin + abs.durMin;
  }
  periods.push({ type: 'home', startStr: minToStr(tMin), endStr: null, duration: Infinity });

  const remaining = [...plates];
  const schedule = [];

  for (const period of periods) {
    const assigned = [];
    if (period.type === 'home') {
      let avail = period.duration;
      while (remaining.length > 0 && remaining[0].tempoMinutos <= avail) {
        const p = remaining.shift();
        assigned.push(p);
        avail -= p.tempoMinutos;
      }
    } else {
      const best = findBestForSlot(remaining, period.duration);
      if (best) {
        for (const p of best.combo) {
          const idx = remaining.indexOf(p);
          if (idx >= 0) remaining.splice(idx, 1);
        }
        assigned.push(...best.combo);
      }
    }
    schedule.push({ period, plates: assigned });
  }

  if (remaining.length > 0) {
    schedule[schedule.length - 1].plates.push(...remaining);
  }

  return schedule;
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

const PS = {
  home: { bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.2)', accent: '#10B981', icon: '🏠', label: 'Em casa' },
  away: { bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.22)', accent: '#F59E0B', icon: '🏃', label: 'Ausência' },
};

const DEFAULT_ABSENCE_TIMES = [
  { start: '09:00', end: '13:00' },
  { start: '14:00', end: '18:00' },
  { start: '19:00', end: '22:00' },
];

export default function OtimizadorModal({ plates, onClose }) {
  const [currentTime, setCurrentTime] = useState(nowStr());
  const [numAbsences, setNumAbsences] = useState(1);
  const [absences, setAbsences] = useState([{ ...DEFAULT_ABSENCE_TIMES[0] }]);
  const [results, setResults] = useState(null);
  const [calculating, setCalculating] = useState(false);

  const handleNumAbsences = (n) => {
    setNumAbsences(n);
    setAbsences(prev => {
      const next = [...prev];
      while (next.length < n) next.push({ ...DEFAULT_ABSENCE_TIMES[next.length] });
      return next.slice(0, n);
    });
    setResults(null);
  };

  const setAbsField = (i, field, val) => {
    setAbsences(prev => prev.map((a, idx) => idx === i ? { ...a, [field]: val } : a));
    setResults(null);
  };

  const handleCalculate = () => {
    if (!plates.length) return;
    setCalculating(true);
    setResults(null);
    setTimeout(() => {
      setResults(buildSchedule(plates, currentTime, absences));
      setCalculating(false);
    }, 30);
  };

  const flatList = results ? results.flatMap(s => s.plates) : [];
  const ordinals = ['1ª', '2ª', '3ª'];

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '2rem' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '2rem', width: '100%', maxWidth: '640px', boxShadow: '0 24px 64px rgba(0,0,0,0.8)' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.3rem' }}>⚡ Otimizador de Impressão</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.3rem' }}>
              {plates.length} placa{plates.length !== 1 ? 's' : ''} na fila · organiza seu dia automaticamente
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1, padding: '0.25rem' }}>✕</button>
        </div>

        {/* Config */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1rem' }}>

          {/* Horário atual + quantas saídas */}
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600, marginBottom: '0.5rem' }}>
                Horário atual
              </div>
              <input type="time" value={currentTime}
                onChange={e => { setCurrentTime(e.target.value); setResults(null); }}
                style={timeInputStyle} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600, marginBottom: '0.5rem' }}>
                Quantas saídas?
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {[1, 2, 3].map(n => (
                  <button key={n} onClick={() => handleNumAbsences(n)} style={{
                    width: '44px', height: '40px',
                    background: numAbsences === n
                      ? 'linear-gradient(to right, var(--primary), var(--secondary))'
                      : 'rgba(255,255,255,0.05)',
                    border: numAbsences === n ? 'none' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: numAbsences === n ? '#000' : 'var(--text-muted)',
                    fontWeight: 700, fontSize: '0.95rem',
                    cursor: 'pointer', fontFamily: 'var(--font-family)',
                    transition: 'all 0.15s',
                  }}>{n}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Linhas de ausência */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.25rem' }}>
            {absences.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', color: '#F59E0B', fontWeight: 700, minWidth: '52px' }}>
                  {ordinals[i]} saída
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="time" value={a.start}
                    onChange={e => setAbsField(i, 'start', e.target.value)}
                    style={timeInputStyle} />
                  <span style={{ color: 'var(--primary)', fontWeight: 700 }}>→</span>
                  <input type="time" value={a.end}
                    onChange={e => setAbsField(i, 'end', e.target.value)}
                    style={timeInputStyle} />
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {fmtTempo(slotDur(a.start, a.end))} fora
                </span>
              </div>
            ))}
          </div>

          {/* Botão calcular */}
          <button
            onClick={handleCalculate}
            disabled={calculating || !plates.length}
            style={{
              width: '100%', padding: '0.75rem',
              background: calculating ? 'rgba(0,240,255,0.2)' : 'linear-gradient(to right, var(--primary), var(--secondary))',
              border: 'none', borderRadius: '8px',
              color: '#000', fontWeight: 700, fontSize: '0.95rem',
              cursor: calculating || !plates.length ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-family)',
              opacity: !plates.length ? 0.5 : 1,
            }}>
            {calculating ? 'Calculando...' : '⚡ Otimizar Meu Dia'}
          </button>

          {!plates.length && (
            <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#F87171', textAlign: 'center' }}>
              Adicione impressões com tempo estimado às Próximas Impressões primeiro.
            </p>
          )}
        </div>

        {/* Resultados */}
        {results !== null && (
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600, marginBottom: '1rem' }}>
              Plano do dia
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {results.map((block, bi) => {
                const st = PS[block.period.type];
                const isEmpty = block.plates.length === 0;
                if (isEmpty && block.period.type === 'home') return null;

                const blockTotal = block.plates.reduce((s, p) => s + p.tempoMinutos, 0);
                const idleMin = block.period.duration !== Infinity ? block.period.duration - blockTotal : 0;
                const showIdle = idleMin > 0 && block.period.type === 'home' && block.period.duration !== Infinity;
                const hasContent = !isEmpty || showIdle || (isEmpty && block.period.type === 'away');

                return (
                  <div key={bi} style={{ background: st.bg, border: `1px solid ${st.border}`, borderRadius: '0.75rem', overflow: 'hidden' }}>
                    {/* Cabeçalho do período */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderBottom: hasContent ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>{st.icon}</span>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: st.accent }}>{st.label}</span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {block.period.startStr}
                          {block.period.endStr ? ` → ${block.period.endStr}` : ' em diante'}
                          {block.period.duration !== Infinity ? ` · ${fmtTempo(block.period.duration)}` : ''}
                        </span>
                      </div>
                      {!isEmpty && (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{fmtTempo(blockTotal)}</span>
                      )}
                    </div>

                    {/* Placas */}
                    {!isEmpty && (
                      <div style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {block.plates.map((p, pi) => {
                          const gIdx = flatList.indexOf(p);
                          const showPlate = flatList.filter(q => q.titulo === p.titulo).length > 1;
                          return (
                            <div key={pi} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span style={{
                                width: '22px', height: '22px', borderRadius: '50%',
                                background: `${st.accent}25`, color: st.accent,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.72rem', fontWeight: 700, flexShrink: 0,
                              }}>
                                {gIdx + 1}
                              </span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{p.titulo}</span>
                                {showPlate && (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.83rem' }}> · {p.nomePlaca}</span>
                                )}
                              </div>
                              <span style={{ fontWeight: 700, fontSize: '0.82rem', color: st.accent, flexShrink: 0 }}>
                                {fmtTempo(p.tempoMinutos)}
                              </span>
                            </div>
                          );
                        })}

                        {showIdle && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingTop: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.04)', marginTop: '0.1rem', opacity: 0.55 }}>
                            <span style={{ width: '22px', height: '22px', flexShrink: 0 }} />
                            <span style={{ flex: 1, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Impressora parada</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{fmtTempo(idleMin)}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {isEmpty && block.period.type === 'away' && (
                      <div style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        Nenhuma impressão disponível para este período.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
