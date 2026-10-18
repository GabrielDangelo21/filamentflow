import React, { useState, useMemo } from 'react';
import { getCategories, getAveragePricePerGram } from '../services/storage';
import { usePriceSettings, calcularPreco } from '../utils/pricing';
import ResumoPreco from '../components/ResumoPreco';
import CustomSelect from '../components/CustomSelect';
import MaskedNumberInput from '../components/MaskedNumberInput';

const TIPO_PADRAO = 'PLA Basic';

const fmtPpk = (ppg) => `${(ppg * 1000).toFixed(2).replace('.', ',')} €/kg`;

const fmtDur = (mins) => {
  if (!mins) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
};

const toNum = (v) => parseFloat(String(v).replace(',', '.')) || 0;

const card = {
  background: 'var(--card-bg)',
  border: '1px solid var(--card-border)',
  borderRadius: '14px',
  padding: '1.5rem',
};

const hint = { fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' };

// Estimativa de custo de uma impressão ainda não feita: só placas, tempo e gramas
export default function Estimativa() {
  const [settings, setSetting] = usePriceSettings();

  const [placas,    setPlacas]    = useState('');   // vazio = 1 placa
  const [dias,      setDias]      = useState('');
  const [horas,     setHoras]     = useState('');
  const [minutos,   setMinutos]   = useState('');
  const [gramas,    setGramas]    = useState(0);
  const [precoKg,   setPrecoKg]   = useState('');   // vazio = usar o preço dos Pedidos

  // Preço médio por grama dos Pedidos: geral e por categoria (só categorias com compras)
  const precos = useMemo(() => {
    const porCategoria = getCategories()
      .map(c => ({ categoria: c, ppg: getAveragePricePerGram(c) }))
      .filter(c => c.ppg > 0);
    return { geral: getAveragePricePerGram(), porCategoria };
  }, []);

  // PLA Basic vem escolhido por defeito; '' = média de todas as compras
  const tipoInicial = precos.porCategoria.some(c => c.categoria === TIPO_PADRAO) ? TIPO_PADRAO : '';
  const [tipo, setTipo] = useState(tipoInicial);

  const limpar = () => {
    setPlacas('');
    setDias('');
    setHoras('');
    setMinutos('');
    setGramas(0);
    setTipo(tipoInicial);
    setPrecoKg('');
  };

  const ppgPedidos = tipo
    ? (precos.porCategoria.find(c => c.categoria === tipo)?.ppg || 0)
    : precos.geral;
  const ppg = precoKg !== '' ? toNum(precoKg) / 1000 : ppgPedidos;

  const numPlacas = placas === '' ? 1 : Math.max(0, Math.floor(toNum(placas)));
  const totalTime = Math.floor(toNum(dias)) * 24 * 60 + Math.floor(toNum(horas)) * 60 + Math.floor(toNum(minutos));
  const totalWeight = toNum(gramas);

  const calc = calcularPreco({ materialCost: totalWeight * ppg, totalTime, placas: numPlacas }, settings);

  const tipoOptions = [
    { value: '', label: `Média de todas as compras${precos.geral > 0 ? ` — ${fmtPpk(precos.geral)}` : ''}` },
    ...precos.porCategoria.map(c => ({ value: c.categoria, label: `${c.categoria} — ${fmtPpk(c.ppg)}` })),
  ];

  const vazio = numPlacas === 0 || (totalTime === 0 && totalWeight === 0);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.3rem' }}>
            Estimativa de Custo
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Calcule o preço de uma impressão que ainda não fez — só placas, tempo e filamento
          </p>
        </div>
        <button onClick={limpar} style={{
          padding: '0.5rem 1rem', background: 'transparent',
          border: '1px solid rgba(248,113,113,0.4)', borderRadius: '8px',
          color: '#F87171', fontSize: '0.83rem', cursor: 'pointer',
          fontFamily: 'inherit', fontWeight: 600,
        }}>
          Limpar campos
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 310px', gap: '1.5rem', alignItems: 'start' }}>

        {/* ── Dados da impressão ── */}
        <div style={card}>
          <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Nº de placas</label>
              <input type="number" min="1" step="1" className="form-input" placeholder="1"
                value={placas} onChange={e => setPlacas(e.target.value)} />
              <div style={hint}>A mão de obra é contada por placa.</div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Tempo total de impressão</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="number" min="0" step="1" className="form-input" placeholder="0"
                  value={dias} onChange={e => setDias(e.target.value)} />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>d</span>
                <input type="number" min="0" step="1" className="form-input" placeholder="0"
                  value={horas} onChange={e => setHoras(e.target.value)} />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>h</span>
                <input type="number" min="0" max="59" step="1" className="form-input" placeholder="0"
                  value={minutos} onChange={e => setMinutos(e.target.value)} />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>min</span>
              </div>
              <div style={hint}>Soma de todas as placas. 1 dia = 24 h.</div>
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Filamento total (gramas)</label>
              <MaskedNumberInput className="form-input" value={gramas} onChange={setGramas} />
              <div style={hint}>Soma de todas as cores e placas.</div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Preço do filamento</label>
              <CustomSelect fullWidth value={tipo} onChange={v => { setTipo(v); setPrecoKg(''); }} options={tipoOptions} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input type="number" min="0" step="0.01" className="form-input"
                  placeholder={ppgPedidos > 0 ? (ppgPedidos * 1000).toFixed(2) : 'Preço manual'}
                  value={precoKg} onChange={e => setPrecoKg(e.target.value)} />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>€/kg</span>
              </div>
              <div style={hint}>Vem dos Pedidos. Escreva um valor para usar outro preço.</div>
            </div>
          </div>

          {ppg === 0 && totalWeight > 0 && (
            <div style={{ marginTop: '1.25rem', padding: '0.6rem 0.9rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', fontSize: '0.82rem', color: '#F59E0B' }}>
              ⚠️ Não há compras de filamento registadas nos Pedidos para este tipo. Insira o preço por kg manualmente, senão o material entra como €0.
            </div>
          )}
        </div>

        {/* ── Resumo ── */}
        <ResumoPreco
          calc={calc}
          settings={settings}
          setSetting={setSetting}
          vazio={vazio}
          subtotalMaterial
          emptyContent={
            <div style={{ textAlign: 'center', padding: '1.75rem 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🧮</div>
              <div style={{ fontSize: '0.83rem' }}>Preencha placas, tempo e filamento</div>
            </div>
          }
          info={<>
            <span>{numPlacas} placa{numPlacas !== 1 ? 's' : ''}</span>
            <span>{totalWeight.toFixed(2).replace('.', ',')}g · {fmtDur(totalTime)}</span>
          </>}
        />
      </div>
    </div>
  );
}
