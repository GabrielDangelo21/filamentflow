import React, { useState, useEffect } from 'react';
import { getAllFilamentsWithStock, getFilamentPricePerGram } from '../services/storage';

const SETTINGS_KEY = 'filamentflow_calc_settings';

const inp = {
  background: 'rgba(0,0,0,0.2)',
  border: '1px solid var(--card-border)',
  borderRadius: '8px',
  padding: '0.65rem 0.9rem',
  color: 'var(--text-main)',
  fontFamily: 'var(--font-family)',
  fontSize: '0.95rem',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const lbl = {
  fontSize: '0.72rem',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  fontWeight: 600,
  display: 'block',
  marginBottom: '6px',
};

const card = {
  background: 'var(--card-bg)',
  border: '1px solid var(--card-border)',
  borderRadius: '14px',
  padding: '1.5rem',
  marginBottom: '1rem',
};

const sectionTitle = {
  fontSize: '0.72rem',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.6px',
  fontWeight: 700,
  marginBottom: '1.25rem',
};

const fmtEur = (v) => `€ ${(v || 0).toFixed(2).replace('.', ',')}`;

const miniCostBadge = (value) => (
  <div style={{
    padding: '0.65rem 1rem',
    background: 'rgba(0,240,255,0.07)',
    border: '1px solid rgba(0,240,255,0.18)',
    borderRadius: '8px',
    color: 'var(--primary)',
    fontSize: '0.9rem',
    fontWeight: 700,
    whiteSpace: 'nowrap',
    alignSelf: 'flex-end',
    flexShrink: 0,
  }}>
    {fmtEur(value)}
  </div>
);

export default function Calculadora() {
  const [filaments, setFilaments] = useState([]);

  // Material
  const [selectedSku, setSelectedSku] = useState('');
  const [manualPpg, setManualPpg] = useState('');
  const [weight, setWeight] = useState('');

  // Eletricidade (salvo)
  const [wattage, setWattage] = useState(200);
  const [kwh, setKwh] = useState(0.18);
  const [printH, setPrintH] = useState('');
  const [printM, setPrintM] = useState('');

  // Mão de obra (salvo)
  const [hourlyRate, setHourlyRate] = useState(10);
  const [laborH, setLaborH] = useState('');
  const [laborM, setLaborM] = useState('');

  // Margem
  const [margin, setMargin] = useState('30');

  useEffect(() => {
    setFilaments(getAllFilamentsWithStock());
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      try {
        const s = JSON.parse(saved);
        if (s.wattage != null) setWattage(s.wattage);
        if (s.kwh != null) setKwh(s.kwh);
        if (s.hourlyRate != null) setHourlyRate(s.hourlyRate);
      } catch (_) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ wattage, kwh, hourlyRate }));
  }, [wattage, kwh, hourlyRate]);

  const storagePpg = selectedSku ? getFilamentPricePerGram(selectedSku) : 0;
  const ppg = storagePpg > 0
    ? storagePpg
    : (parseFloat(String(manualPpg).replace(',', '.')) || 0);
  const showManualPpg = !selectedSku || storagePpg === 0;

  const materialCost = (parseFloat(weight) || 0) * ppg;
  const printMin = (parseInt(printH) || 0) * 60 + (parseInt(printM) || 0);
  const electricityCost = (wattage / 1000) * (printMin / 60) * (parseFloat(kwh) || 0);
  const laborMin = (parseInt(laborH) || 0) * 60 + (parseInt(laborM) || 0);
  const laborCost = (laborMin / 60) * (parseFloat(String(hourlyRate).replace(',', '.')) || 0);

  const subtotal = materialCost + electricityCost + laborCost;
  const marginAmt = subtotal * (parseFloat(margin) || 0) / 100;
  const sellingPrice = subtotal + marginAmt;

  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard?.writeText(sellingPrice.toFixed(2).replace('.', ','));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.3rem' }}>
          Calculadora de Venda
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Calcule o preço de venda com base em material, eletricidade, mão de obra e margem de lucro
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' }}>

        {/* ── Inputs ── */}
        <div>

          {/* 1. Material */}
          <div style={card}>
            <div style={sectionTitle}>🧵 Material</div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={lbl}>Filamento</label>
              <select
                value={selectedSku}
                onChange={e => { setSelectedSku(e.target.value); setManualPpg(''); }}
                style={{ ...inp, cursor: 'pointer' }}
                className="form-select"
              >
                <option value="">— Inserir preço manualmente —</option>
                {filaments.map(f => {
                  const p = getFilamentPricePerGram(f.sku);
                  const ps = p > 0 ? ` · €${p.toFixed(4).replace('.', ',')}/g` : ' · sem preço';
                  return (
                    <option key={f.sku} value={f.sku}>
                      {[f.brand, f.color, f.type].filter(Boolean).join(' ')}{ps}
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedSku && storagePpg === 0 && (
              <div style={{ marginBottom: '1rem', padding: '0.6rem 0.9rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', fontSize: '0.82rem', color: '#F59E0B' }}>
                ⚠️ Filamento sem preço registado nos pedidos. Insira manualmente:
              </div>
            )}

            {showManualPpg && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={lbl}>Preço por grama (€/g)</label>
                <input
                  type="number" min="0" step="0.0001" placeholder="0.0000"
                  value={manualPpg}
                  onChange={e => setManualPpg(e.target.value)}
                  style={{ ...inp, maxWidth: '200px' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={lbl}>Peso utilizado (g)</label>
                <input
                  type="number" min="0" step="0.1" placeholder="0"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  style={inp}
                />
              </div>
              {miniCostBadge(materialCost)}
            </div>
          </div>

          {/* 2. Eletricidade */}
          <div style={card}>
            <div style={sectionTitle}>⚡ Eletricidade</div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label style={lbl}>Tempo de impressão</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <input type="number" min="0" placeholder="0" value={printH}
                    onChange={e => setPrintH(e.target.value)}
                    style={{ ...inp, width: '72px', textAlign: 'center' }} />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>h</span>
                  <input type="number" min="0" max="59" placeholder="0" value={printM}
                    onChange={e => setPrintM(e.target.value)}
                    style={{ ...inp, width: '72px', textAlign: 'center' }} />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>min</span>
                </div>
              </div>
              {miniCostBadge(electricityCost)}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={lbl}>Potência da impressora (W)</label>
                <input type="number" min="0" step="10" placeholder="200" value={wattage}
                  onChange={e => setWattage(parseFloat(e.target.value) || 0)}
                  style={inp} />
              </div>
              <div>
                <label style={lbl}>Preço da eletricidade (€/kWh)</label>
                <input type="number" min="0" step="0.01" placeholder="0.18" value={kwh}
                  onChange={e => setKwh(parseFloat(e.target.value) || 0)}
                  style={inp} />
              </div>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.6rem' }}>
              Potência e preço do kWh são guardados automaticamente.
            </p>
          </div>

          {/* 3. Mão de obra */}
          <div style={card}>
            <div style={sectionTitle}>🤝 Mão de Obra</div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label style={lbl}>Tempo de trabalho (preparação + pós)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <input type="number" min="0" placeholder="0" value={laborH}
                    onChange={e => setLaborH(e.target.value)}
                    style={{ ...inp, width: '72px', textAlign: 'center' }} />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>h</span>
                  <input type="number" min="0" max="59" placeholder="0" value={laborM}
                    onChange={e => setLaborM(e.target.value)}
                    style={{ ...inp, width: '72px', textAlign: 'center' }} />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>min</span>
                </div>
              </div>
              {miniCostBadge(laborCost)}
            </div>

            <div>
              <label style={lbl}>Valor por hora (€/h)</label>
              <input type="number" min="0" step="0.5" placeholder="10" value={hourlyRate}
                onChange={e => setHourlyRate(parseFloat(e.target.value) || 0)}
                style={{ ...inp, maxWidth: '200px' }} />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.6rem' }}>
                Guardado automaticamente.
              </p>
            </div>
          </div>

          {/* 4. Margem */}
          <div style={card}>
            <div style={sectionTitle}>📈 Margem de Lucro</div>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <label style={lbl}>Margem (%)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="number" min="0" max="10000" step="5" value={margin}
                    onChange={e => setMargin(e.target.value)}
                    style={{ ...inp, width: '100px', textAlign: 'center' }} />
                  <span style={{ color: 'var(--text-muted)' }}>%</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '2px' }}>
                {[20, 30, 50, 100].map(m => (
                  <button key={m} onClick={() => setMargin(String(m))} style={{
                    padding: '0.45rem 0.8rem',
                    background: margin === String(m) ? 'rgba(0,240,255,0.12)' : 'rgba(255,255,255,0.04)',
                    border: margin === String(m) ? '1px solid rgba(0,240,255,0.3)' : '1px solid var(--card-border)',
                    borderRadius: '8px',
                    color: margin === String(m) ? 'var(--primary)' : 'var(--text-muted)',
                    fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'var(--font-family)', transition: 'all 0.15s',
                  }}>{m}%</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Resultado (sticky) ── */}
        <div style={{ position: 'sticky', top: '2rem' }}>
          <div style={{ ...card, marginBottom: 0 }}>
            <div style={sectionTitle}>Resumo</div>

            {[
              { label: 'Material', icon: '🧵', value: materialCost },
              { label: 'Eletricidade', icon: '⚡', value: electricityCost },
              { label: 'Mão de obra', icon: '🤝', value: laborCost },
            ].map(({ label: l, icon, value }) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.7rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.87rem' }}>{icon} {l}</span>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>{fmtEur(value)}</span>
              </div>
            ))}

            <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '0.75rem', marginTop: '0.25rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.87rem' }}>Subtotal</span>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{fmtEur(subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#10B981', fontSize: '0.87rem' }}>📈 Margem ({margin || 0}%)</span>
                <span style={{ fontWeight: 600, color: '#10B981' }}>+ {fmtEur(marginAmt)}</span>
              </div>
            </div>

            {/* Preço de venda */}
            <div style={{
              background: 'rgba(0,240,255,0.07)',
              border: '1px solid rgba(0,240,255,0.22)',
              borderRadius: '12px',
              padding: '1.25rem',
              textAlign: 'center',
              marginBottom: '0.75rem',
            }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Preço de venda
              </div>
              <div style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1, letterSpacing: '-0.02em' }}>
                {fmtEur(sellingPrice)}
              </div>
            </div>

            <button
              onClick={handleCopy}
              style={{
                width: '100%',
                padding: '0.6rem',
                background: copied ? 'rgba(16,185,129,0.1)' : 'transparent',
                border: copied ? '1px solid rgba(16,185,129,0.3)' : '1px solid var(--card-border)',
                borderRadius: '8px',
                color: copied ? '#10B981' : 'var(--text-muted)',
                fontSize: '0.85rem',
                cursor: 'pointer',
                fontFamily: 'var(--font-family)',
                transition: 'all 0.2s',
              }}>
              {copied ? '✓ Copiado!' : '📋 Copiar preço'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
