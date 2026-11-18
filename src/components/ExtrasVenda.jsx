import { useState } from 'react';

const fmtEur = (v) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v || 0);

// Custo de 1 unidade: valores pequenos (argola a € 0,029) precisam de mais casas
const fmtUnit = (v) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: v < 1 ? 4 : 2 }).format(v || 0);

const campo = {
  background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', borderRadius: '6px',
  padding: '0.4rem 0.5rem', color: 'var(--text-main)', fontFamily: 'var(--font-family)',
  fontSize: '0.85rem', outline: 'none',
};

// Peças vendidas + acessórios gastos em cada peça (argola, saquinho...).
// O custo unitário vem dos Pedidos (getCustosAcessorios); o total é calculado em calcularExtras.
export default function ExtrasVenda({ pecas, setPecas, extras, setExtras, custos, calculo }) {
  const disponiveis = custos.filter(c => !extras.some(e => e.name === c.name));
  const [escolhido, setEscolhido] = useState('');

  const adicionar = () => {
    const nome = escolhido || disponiveis[0]?.name;
    if (!nome) return;
    setExtras([...extras, { name: nome, porPeca: 1 }]);
    setEscolhido('');
  };

  const mudarPorPeca = (i, valor) =>
    setExtras(extras.map((e, j) => (j === i ? { ...e, porPeca: valor } : e)));

  const remover = (i) => setExtras(extras.filter((_, j) => j !== i));

  return (
    <div style={{ marginBottom: '1rem', padding: '0.75rem 0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
      <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
        <span>Peças vendidas</span>
        <input
          type="number" min="1" step="1" value={pecas}
          onChange={e => setPecas(e.target.value)}
          aria-label="Número de peças vendidas"
          style={{ ...campo, width: '70px', textAlign: 'center' }}
        />
      </label>

      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, margin: '0.85rem 0 0.4rem' }}>
        Extras por peça
      </div>

      {calculo.itens.length === 0 && (
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 0.5rem' }}>
          Argola, saquinho, etiqueta… O custo de cada um vem dos Pedidos.
        </p>
      )}

      {calculo.itens.map((item, i) => (
        <div key={item.name} style={{ marginBottom: '0.55rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: '0.83rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.name}>
              {item.name}
            </span>
            <input
              type="number" min="0" step="1" value={extras[i].porPeca}
              onChange={e => mudarPorPeca(i, e.target.value)}
              aria-label={`Quantidade de ${item.name} por peça`}
              style={{ ...campo, width: '52px', textAlign: 'center', padding: '0.3rem' }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/peça</span>
            <button
              type="button" onClick={() => remover(i)} aria-label={`Tirar ${item.name}`}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', padding: '0 0.2rem' }}
            >✕</button>
          </div>
          <div style={{ fontSize: '0.74rem', color: item.semPreco ? '#F59E0B' : 'var(--text-muted)', marginTop: '0.15rem' }}>
            {item.semPreco
              ? 'Sem compra com preço nos Pedidos: entra como € 0'
              : `${item.quantidade.toLocaleString('pt-BR')} × ${fmtUnit(item.custoUnit)} = ${fmtEur(item.total)}`}
          </div>
        </div>
      ))}

      {disponiveis.length > 0 ? (
        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
          <select
            value={escolhido || disponiveis[0].name}
            onChange={e => setEscolhido(e.target.value)}
            aria-label="Acessório para acrescentar"
            style={{ ...campo, flex: 1, minWidth: 0 }}
          >
            {disponiveis.map(c => (
              <option key={c.name} value={c.name}>{c.name} ({fmtUnit(c.unitCost)})</option>
            ))}
          </select>
          <button type="button" className="btn btn-secondary" onClick={adicionar} style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
            + Extra
          </button>
        </div>
      ) : custos.length === 0 && (
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
          Nenhum acessório com preço nos Pedidos ainda.
        </p>
      )}
    </div>
  );
}
