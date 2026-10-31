import { useState, useEffect } from 'react';
import { getSales, deleteSale, getSaleProfit, temCusto, getPopzuConfig, savePopzuConfig, buscarVendasPopzu } from '../services/storage';
import VendaModal from '../components/VendaModal';
import CustoPopzuModal from '../components/CustoPopzuModal';

const fmtEur = (v) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v || 0);

const fmtDate = (d) => {
  try { return new Date(d.includes('T') ? d : d + 'T12:00:00').toLocaleDateString('pt-BR'); } catch { return '—'; }
};

const fmtDateTime = (iso) => {
  try { return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
};

const card = (label, value, color, sub) => (
  <div key={label} className="glass-panel stat-card" style={{ padding: '1.25rem', borderLeft: `4px solid ${color}` }}>
    <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600 }}>{label}</p>
    <p style={{ fontSize: '1.6rem', fontWeight: 700, color }}>{value}</p>
    {sub && <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '0.2rem' }}>{sub}</p>}
  </div>
);

const badge = (texto, cor) => (
  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: cor, background: `${cor}1A`, border: `1px solid ${cor}55`, padding: '0.1rem 0.5rem', borderRadius: '999px', whiteSpace: 'nowrap' }}>
    {texto}
  </span>
);

const lerVendas = () => getSales().sort((a, b) => (b.date || '').localeCompare(a.date || ''));

// Configuração da sincronização com a planilha Vendas_Popzu
function PopzuConfigModal({ onClose, onSaved }) {
  const atual = getPopzuConfig();
  const [url, setUrl] = useState(atual.url);
  const [token, setToken] = useState(atual.token);
  const [erro, setErro] = useState('');

  const salvar = (e) => {
    e.preventDefault();
    const u = url.trim();
    if (!/^https:\/\/script\.google\.com\/.+\/exec$/.test(u)) {
      setErro('O endereço deve começar com https://script.google.com/ e terminar em /exec.');
      return;
    }
    if (!token.trim()) { setErro('Cole a senha mostrada na planilha.'); return; }
    savePopzuConfig({ url: u, token: token.trim() });
    onSaved();
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content glass-panel" style={{ padding: '2rem', background: '#151B2D' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.3rem' }}>Sincronização Popzu</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          Na planilha Vendas_Popzu, use o menu <strong>Popzu → Configurar sincronização com o app</strong> e siga os passos.
          Depois cole aqui o URL do app da Web e a senha.
        </p>
        <form onSubmit={salvar}>
          <div className="form-group">
            <label className="form-label">URL do app da Web</label>
            <input className="form-input" value={url} placeholder="https://script.google.com/macros/s/.../exec" onChange={e => setUrl(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Senha de sincronização</label>
            <input className="form-input" type="password" value={token} onChange={e => setToken(e.target.value)} />
          </div>
          {erro && <div style={{ color: '#F87171', fontSize: '0.85rem', marginBottom: '1rem' }}>{erro}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Salvar e sincronizar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Vendas() {
  const [vendas, setVendas] = useState(lerVendas);
  const [editando, setEditando] = useState(null); // null = fechado; {} = nova venda manual
  const [mes, setMes] = useState('');             // '' = todos; 'AAAA-MM'
  const [fonte, setFonte] = useState('');         // '' = todas; 'app'; 'popzu'
  const [config, setConfig] = useState(getPopzuConfig);
  const [mostrarConfig, setMostrarConfig] = useState(false);
  const [custoDe, setCustoDe] = useState(null);   // venda Popzu cujo custo está sendo definido
  const [sincronizando, setSincronizando] = useState(false);
  const [aviso, setAviso] = useState(null);       // { tipo: 'ok' | 'erro', texto }

  const carregar = () => setVendas(lerVendas());
  const configurado = Boolean(config.url && config.token);

  const sincronizar = async () => {
    setSincronizando(true);
    setAviso(null);
    try {
      const r = await buscarVendasPopzu();
      const partes = [`${r.total} venda${r.total !== 1 ? 's' : ''} Popzu`];
      if (r.adicionadas) partes.push(`${r.adicionadas} nova${r.adicionadas !== 1 ? 's' : ''}`);
      if (r.alteradas) partes.push(`${r.alteradas} alterada${r.alteradas !== 1 ? 's' : ''}`);
      if (r.removidas) partes.push(`${r.removidas} removida${r.removidas !== 1 ? 's' : ''}`);
      setAviso({ tipo: 'ok', texto: `✓ Sincronizado: ${partes.join(' · ')}` });
      carregar();
    } catch (err) {
      setAviso({ tipo: 'erro', texto: `✗ ${err.message}` });
    } finally {
      setConfig(getPopzuConfig());
      setSincronizando(false);
    }
  };

  // Sincroniza sozinho ao abrir a aba, se estiver configurado
  useEffect(() => {
    const { url, token } = getPopzuConfig();
    if (!url || !token) return;
    let ativo = true;
    Promise.resolve().then(() => { if (ativo) sincronizar(); });
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const meses = [...new Set(vendas.map(v => (v.date || '').slice(0, 7)).filter(Boolean))].sort().reverse();
  const lista = vendas
    .filter(v => !mes || (v.date || '').startsWith(mes))
    .filter(v => !fonte || (fonte === 'popzu' ? v.source === 'popzu' : v.source !== 'popzu'));

  const comCusto = lista.filter(temCusto);
  const faturado = lista.reduce((s, v) => s + (Number(v.finalPrice) || 0), 0);
  const custo    = comCusto.reduce((s, v) => s + (Number(v.costTotal) || 0), 0);
  const lucro    = comCusto.reduce((s, v) => s + getSaleProfit(v), 0);
  const semIva   = comCusto.reduce((s, v) => s + (Number(v.finalPrice) || 0) / (1 + (Number(v.vatPct) || 0) / 100), 0);
  const margem   = semIva > 0 ? (lucro / semIva) * 100 : 0;
  const pecas    = lista.reduce((s, v) => s + (v.source === 'popzu' ? (Number(v.quantity) || 1) : 1), 0);

  const excluir = (v) => {
    if (!confirm(`Excluir a venda "${v.description}"? As impressões não são alteradas.`)) return;
    deleteSale(v.id);
    carregar();
  };

  const nomeMes = (m) => {
    const [y, mo] = m.split('-');
    return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const btnPeq = { padding: '0.35rem 0.75rem', fontSize: '0.8rem' };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ marginBottom: '0.3rem' }}>Vendas</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Vendas do Orçamento de venda, manuais e as da planilha Popzu · custo = material, falhas, energia, desgaste e embalagem (a mão de obra fica no lucro)
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="form-select" value={fonte} onChange={e => setFonte(e.target.value)} style={{ width: 'auto' }}>
            <option value="">Todas as origens</option>
            <option value="app">App</option>
            <option value="popzu">Popzu (planilha)</option>
          </select>
          <select className="form-select" value={mes} onChange={e => setMes(e.target.value)} style={{ width: 'auto' }}>
            <option value="">Todos os meses</option>
            {meses.map(m => <option key={m} value={m}>{nomeMes(m)}</option>)}
          </select>
          {configurado && (
            <button className="btn btn-secondary" onClick={sincronizar} disabled={sincronizando}>
              {sincronizando ? 'Sincronizando…' : '🔄 Sincronizar Popzu'}
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => setMostrarConfig(true)} title="Configurar sincronização com a planilha">
            ⚙️ Popzu
          </button>
          <button className="btn btn-primary" onClick={() => setEditando({})}>+ Nova venda</button>
        </div>
      </div>

      <div style={{ minHeight: '1.6rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
        {aviso ? (
          <span style={{ color: aviso.tipo === 'ok' ? '#10B981' : '#F87171' }}>{aviso.texto}</span>
        ) : configurado ? (
          <span style={{ color: 'var(--text-muted)' }}>
            {config.lastSync ? `Última sincronização com a planilha: ${fmtDateTime(config.lastSync)}` : 'Planilha Popzu configurada.'}
          </span>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>
            Para trazer as vendas do formulário Popzu, clique em ⚙️ Popzu.
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {card('VENDAS', lista.length, '#3B82F6', `${pecas} peça${pecas !== 1 ? 's' : ''}`)}
        {card('FATURADO', fmtEur(faturado), '#00F0FF')}
        {card('CUSTO', fmtEur(custo), '#EF4444', `${comCusto.length} venda${comCusto.length !== 1 ? 's' : ''} com custo`)}
        {card(`LUCRO · ${margem.toFixed(1).replace('.', ',')}%`, fmtEur(lucro), lucro >= 0 ? '#10B981' : '#F87171', 'só vendas com custo')}
      </div>

      <div className="glass-panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Origem</th>
              <th>Descrição</th>
              <th>Cliente</th>
              <th>Qtd</th>
              <th>Custo</th>
              <th>Preço final</th>
              <th>Lucro</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Nenhuma venda registrada. Selecione placas no Orçamento de venda e clique em “Registrar venda”, ou sincronize a planilha Popzu.
                </td>
              </tr>
            ) : lista.map(v => {
              const l = getSaleProfit(v);
              const popzu = v.source === 'popzu';
              return (
                <tr key={v.id}>
                  <td>{fmtDate(v.date)}</td>
                  <td>{popzu ? badge(`Popzu · ${v.origem || '—'}`, '#EC4899') : badge('App', '#00F0FF')}</td>
                  <td style={{ fontWeight: 600 }}>
                    {v.description}
                    {v.notes && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>{v.notes}</div>}
                  </td>
                  <td>{v.client || '—'}</td>
                  <td>{popzu ? v.quantity : ((v.printIds || []).length ? `${v.printIds.length} placa${v.printIds.length !== 1 ? 's' : ''}` : '—')}</td>
                  <td>
                    {temCusto(v) ? fmtEur(v.costTotal) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    {popzu && v.costSource && (
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        {{ planilha: 'da planilha', impressoes: 'das impressões', manual: 'digitado' }[v.costSource]}
                      </div>
                    )}
                  </td>
                  <td style={{ fontWeight: 700 }}>
                    {v.semPreco ? <span style={{ color: '#F59E0B' }}>sem preço</span> : fmtEur(v.finalPrice)}
                  </td>
                  <td style={{ fontWeight: 700, color: l === null ? 'var(--text-muted)' : l >= 0 ? '#10B981' : '#F87171' }}>
                    {l === null ? '—' : fmtEur(l)}
                  </td>
                  <td>
                    {popzu ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button className="btn btn-secondary" style={btnPeq} onClick={() => setCustoDe(v)}
                          title="Definir o custo escolhendo impressões ou digitando o valor">
                          {temCusto(v) ? 'Custo' : '+ Custo'}
                        </button>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }} title="Data, produto, preço e cliente vêm da planilha: edite lá e sincronize">
                          resto na planilha
                        </span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-secondary" style={btnPeq} onClick={() => setEditando(v)}>Editar</button>
                        <button className="btn btn-danger" style={btnPeq} onClick={() => excluir(v)}>Excluir</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editando && (
        <VendaModal
          venda={editando}
          onClose={() => setEditando(null)}
          onSaved={() => { setEditando(null); carregar(); }}
        />
      )}

      {custoDe && (
        <CustoPopzuModal
          venda={custoDe}
          onClose={() => setCustoDe(null)}
          onSaved={() => { setCustoDe(null); carregar(); }}
        />
      )}

      {mostrarConfig && (
        <PopzuConfigModal
          onClose={() => setMostrarConfig(false)}
          onSaved={() => { setMostrarConfig(false); setConfig(getPopzuConfig()); sincronizar(); }}
        />
      )}
    </div>
  );
}
