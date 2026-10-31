import { useState, useMemo } from 'react';
import { getPrints, getPrintCost, setPopzuCusto, getPopzuCustos } from '../services/storage';
import { usePriceSettings, calcularPreco } from '../utils/pricing';
import MaskedNumberInput from './MaskedNumberInput';

const fmtEur = (v) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v || 0);

const fmtDur = (mins) => {
  if (!mins) return '—';
  const h = Math.floor(mins / 60), m = mins % 60;
  return h === 0 ? `${m}min` : m === 0 ? `${h}h` : `${h}h ${m}min`;
};

const fmtDate = (d) => {
  try { return new Date(d.includes('T') ? d : d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }); } catch { return '—'; }
};

const aba = (ativa) => ({
  flex: 1, padding: '0.55rem', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 600,
  background: ativa ? 'rgba(0,240,255,0.12)' : 'rgba(255,255,255,0.04)',
  border: ativa ? '1px solid rgba(0,240,255,0.35)' : '1px solid var(--card-border)',
  color: ativa ? 'var(--primary)' : 'var(--text-muted)',
});

// Define o custo de uma venda Popzu (peças avulsas/personalizadas) no app:
// escolhendo as placas da aba Impressões (custo calculado como no Orçamento) ou digitando o valor.
export default function CustoPopzuModal({ venda, onClose, onSaved }) {
  const [settings] = usePriceSettings();
  const existente = getPopzuCustos()[venda.externalId];
  const [prints] = useState(() => getPrints().reverse());
  const [modo, setModo] = useState(existente?.metodo === 'manual' ? 'manual' : 'impressoes');
  const [selecionadas, setSelecionadas] = useState(() => new Set(existente?.printIds || []));
  const [valor, setValor] = useState(existente?.metodo === 'manual' ? Number(existente.costTotal) || 0 : 0);
  const [busca, setBusca] = useState(() => {
    if (existente?.printIds?.length) return '';
    // sugere a busca pelo nome do produto, sem o tamanho
    return (venda.description || '').split(' · ')[0];
  });

  const grupos = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const map = new Map();
    prints.forEach(p => {
      const key = p.project || p.description || '(sem nome)';
      const texto = `${key} ${p.description || ''}`.toLowerCase();
      if (termo && !texto.includes(termo) && !selecionadas.has(p.id)) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    });
    return [...map.entries()];
  }, [prints, busca, selecionadas]);

  const escolhidas = prints.filter(p => selecionadas.has(p.id));
  const tempo = escolhidas.reduce((s, p) => s + (Number(p.timeMinutes) || 0), 0);
  const peso = escolhidas.reduce((s, p) => s + (Number(p.totalWeight) || 0), 0);
  const calc = calcularPreco({
    materialCost: escolhidas.reduce((s, p) => s + getPrintCost(p), 0),
    totalTime: tempo,
    placas: escolhidas.length,
  }, settings);

  // Custo da venda = tudo menos a mão de obra (a mão de obra fica no lucro)
  const custoImpressoes = calc.totalCost - calc.totalLabor;
  const custo = modo === 'impressoes' ? Math.round(custoImpressoes * 100) / 100 : Number(valor) || 0;
  const podeSalvar = modo === 'impressoes' ? escolhidas.length > 0 : custo > 0;
  const lucro = (Number(venda.finalPrice) || 0) / (1 + (Number(venda.vatPct) || 0) / 100) - custo;

  const alternar = (id) => setSelecionadas(prev => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const alternarGrupo = (lista) => setSelecionadas(prev => {
    const n = new Set(prev);
    const todos = lista.every(p => n.has(p.id));
    lista.forEach(p => { if (todos) n.delete(p.id); else n.add(p.id); });
    return n;
  });

  const salvar = () => {
    setPopzuCusto(venda.externalId, modo === 'impressoes'
      ? { costTotal: custo, printIds: escolhidas.map(p => p.id), metodo: 'impressoes' }
      : { costTotal: custo, printIds: [], metodo: 'manual' });
    onSaved();
  };

  const remover = () => { setPopzuCusto(venda.externalId, null); onSaved(); };

  const linhaResumo = (label, v) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.3rem' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span><span>{fmtEur(v)}</span>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content glass-panel" style={{ padding: '1.75rem', background: '#151B2D', maxWidth: '760px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Custo da venda</h2>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              {venda.description} · {venda.client || 'sem cliente'} · {fmtDate(venda.date)} · vendido por <strong style={{ color: 'var(--text-main)' }}>{fmtEur(venda.finalPrice)}</strong>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button style={aba(modo === 'impressoes')} onClick={() => setModo('impressoes')}>🖨️ Escolher impressões</button>
          <button style={aba(modo === 'manual')} onClick={() => setModo('manual')}>✏️ Digitar valor</button>
        </div>

        {modo === 'impressoes' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 230px', gap: '1rem' }}>
            <div>
              <input className="form-input" placeholder="Buscar impressão por nome ou projeto..." value={busca}
                onChange={e => setBusca(e.target.value)} style={{ marginBottom: '0.6rem' }} />
              <div style={{ maxHeight: '320px', overflowY: 'auto', border: '1px solid var(--card-border)', borderRadius: '10px' }}>
                {grupos.length === 0 ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Nenhuma impressão encontrada{busca ? ` para “${busca}”` : ''}. {busca && <button onClick={() => setBusca('')} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontFamily: 'inherit' }}>Mostrar todas</button>}
                  </div>
                ) : grupos.map(([key, lista]) => {
                  const todos = lista.every(p => selecionadas.has(p.id));
                  return (
                    <div key={key} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 0.75rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem' }}>
                        <input type="checkbox" checked={todos} onChange={() => alternarGrupo(lista)} />
                        {lista[0].project ? '📁' : '📄'} {key}
                        <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>{lista.length} placa{lista.length !== 1 ? 's' : ''}</span>
                      </label>
                      {lista.map(p => (
                        <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.75rem 0.35rem 2rem', cursor: 'pointer', fontSize: '0.8rem', color: selecionadas.has(p.id) ? 'var(--text-main)' : 'var(--text-muted)' }}>
                          <input type="checkbox" checked={selecionadas.has(p.id)} onChange={() => alternar(p.id)} />
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description || '(sem descrição)'}</span>
                          <span>{fmtDate(p.date)}</span>
                          <span style={{ minWidth: '52px', textAlign: 'right' }}>{Number(p.totalWeight || 0).toFixed(0)}g</span>
                          <span style={{ minWidth: '56px', textAlign: 'right' }}>{fmtDur(p.timeMinutes)}</span>
                        </label>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '0.9rem' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '0.6rem' }}>
                {escolhidas.length} PLACA{escolhidas.length !== 1 ? 'S' : ''} · {peso.toFixed(0)}g · {fmtDur(tempo)}
              </div>
              {linhaResumo('Material + falhas', calc.totalMaterial + calc.totalWaste)}
              {linhaResumo('Energia + desgaste', calc.totalElectricity + calc.totalWear)}
              {linhaResumo('Embalagem', calc.totalPackaging)}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--card-border)', paddingTop: '0.5rem', marginTop: '0.4rem', fontWeight: 700 }}>
                <span>Custo</span><span>{fmtEur(custoImpressoes)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                <span>Mão de obra (fica no lucro)</span><span>{fmtEur(calc.totalLabor)}</span>
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.6rem', marginBottom: 0 }}>
                Mesmo cálculo do Orçamento de venda, sem a mão de obra.
              </p>
            </div>
          </div>
        ) : (
          <div className="form-group">
            <label className="form-label">Custo da venda (sem mão de obra)</label>
            <MaskedNumberInput className="form-input" prefix="€" value={valor} onChange={setValor} />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Dica: para uma peça que ainda não imprimiu, use a Estimativa de custo e digite aqui o “Total material” + a “Embalagem”.
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: !podeSalvar ? 'var(--text-muted)' : lucro >= 0 ? '#10B981' : '#F87171' }}>
            {podeSalvar ? `${lucro >= 0 ? 'Lucro' : 'Prejuízo'}: ${fmtEur(Math.abs(lucro))}` : 'Escolha as impressões ou digite o custo'}
          </span>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            {existente && <button className="btn btn-danger" onClick={remover}>Remover custo</button>}
            <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={salvar} disabled={!podeSalvar} style={{ opacity: podeSalvar ? 1 : 0.5 }}>Salvar custo</button>
          </div>
        </div>
      </div>
    </div>
  );
}
