import { useState } from 'react';
import { getSales, deleteSale, getSaleProfit } from '../services/storage';
import VendaModal from '../components/VendaModal';

const fmtEur = (v) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v || 0);

const fmtDate = (d) => {
  try { return new Date(d.includes('T') ? d : d + 'T12:00:00').toLocaleDateString('pt-BR'); } catch { return '—'; }
};

const card = (label, value, color) => (
  <div key={label} className="glass-panel stat-card" style={{ padding: '1.25rem', borderLeft: `4px solid ${color}` }}>
    <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600 }}>{label}</p>
    <p style={{ fontSize: '1.6rem', fontWeight: 700, color }}>{value}</p>
  </div>
);

export default function Vendas() {
  const lerVendas = () => getSales().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const [vendas, setVendas] = useState(lerVendas);
  const [editando, setEditando] = useState(null); // null = fechado; {} = nova venda manual
  const [mes, setMes] = useState(''); // '' = todos; 'AAAA-MM'

  const carregar = () => setVendas(lerVendas());

  const meses = [...new Set(vendas.map(v => (v.date || '').slice(0, 7)).filter(Boolean))].sort().reverse();
  const lista = mes ? vendas.filter(v => (v.date || '').startsWith(mes)) : vendas;

  const faturado = lista.reduce((s, v) => s + (Number(v.finalPrice) || 0), 0);
  const custo    = lista.reduce((s, v) => s + (Number(v.costTotal) || 0), 0);
  const lucro    = lista.reduce((s, v) => s + getSaleProfit(v), 0);
  const semIva   = lista.reduce((s, v) => s + (Number(v.finalPrice) || 0) / (1 + (Number(v.vatPct) || 0) / 100), 0);
  const margem   = semIva > 0 ? (lucro / semIva) * 100 : 0;

  const excluir = (v) => {
    if (!confirm(`Excluir a venda "${v.description}"? As impressões não são alteradas.`)) return;
    deleteSale(v.id);
    carregar();
  };

  const nomeMes = (m) => {
    const [y, mo] = m.split('-');
    return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.3rem' }}>Vendas</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Registre vendas pelo Orçamento de venda ou manualmente aqui
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <select className="form-select" value={mes} onChange={e => setMes(e.target.value)} style={{ width: 'auto' }}>
            <option value="">Todos os meses</option>
            {meses.map(m => <option key={m} value={m}>{nomeMes(m)}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => setEditando({})}>+ Nova venda</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {card('VENDAS', lista.length, '#3B82F6')}
        {card('FATURADO (COM IVA)', fmtEur(faturado), '#00F0FF')}
        {card('CUSTO', fmtEur(custo), '#EF4444')}
        {card(`LUCRO · ${margem.toFixed(1).replace('.', ',')}%`, fmtEur(lucro), lucro >= 0 ? '#10B981' : '#F87171')}
      </div>

      <div className="glass-panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Descrição</th>
              <th>Cliente</th>
              <th>Placas</th>
              <th>Custo</th>
              <th>Preço final</th>
              <th>Lucro</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Nenhuma venda registrada. Selecione placas no Orçamento de venda e clique em “Registrar venda”.
                </td>
              </tr>
            ) : lista.map(v => {
              const l = getSaleProfit(v);
              return (
                <tr key={v.id}>
                  <td>{fmtDate(v.date)}</td>
                  <td style={{ fontWeight: 600 }}>
                    {v.description}
                    {v.notes && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>{v.notes}</div>}
                  </td>
                  <td>{v.client || '—'}</td>
                  <td>{(v.printIds || []).length || '—'}</td>
                  <td>{fmtEur(v.costTotal)}</td>
                  <td style={{ fontWeight: 700 }}>{fmtEur(v.finalPrice)}</td>
                  <td style={{ fontWeight: 700, color: l >= 0 ? '#10B981' : '#F87171' }}>{fmtEur(l)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={() => setEditando(v)}>Editar</button>
                      <button className="btn btn-danger" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={() => excluir(v)}>Excluir</button>
                    </div>
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
    </div>
  );
}
