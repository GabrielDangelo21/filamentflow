import React, { useState, useEffect } from 'react';
import { getUnifiedOrders, getAccCategories, saveAccCategory, deleteAccCategory, saveAllAccCategories } from '../services/storage';

const ListManagerModal = ({ title, items, onAdd, onDelete, onReorder, onClose }) => {
  const [newItem, setNewItem] = useState('');
  const handleAdd = () => { if (!newItem.trim()) return; onAdd(newItem.trim()); setNewItem(''); };
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
      overflowY: 'auto', paddingTop: '2rem', paddingBottom: '2rem'
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#111827', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '1rem', padding: '1.5rem', width: '100%', maxWidth: '420px',
        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.7)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input className="form-input" placeholder="Adicionar novo..." value={newItem}
            onChange={e => setNewItem(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()} style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={handleAdd} style={{ padding: '0.5rem 1rem' }}>Adicionar</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {items.length === 0
            ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>Nenhuma categoria cadastrada.</p>
            : items.map((item, index) => (
              <div key={item} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.6rem 0.8rem', borderRadius: '0.5rem',
                background: index % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent', marginBottom: '2px'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <button onClick={() => onReorder(index, index - 1)} disabled={index === 0}
                    style={{ background: 'none', border: 'none', cursor: index === 0 ? 'default' : 'pointer', color: index === 0 ? 'var(--border)' : 'var(--text-muted)', fontSize: '0.7rem', padding: 0, lineHeight: 1 }}>▲</button>
                  <button onClick={() => onReorder(index, index + 1)} disabled={index === items.length - 1}
                    style={{ background: 'none', border: 'none', cursor: index === items.length - 1 ? 'default' : 'pointer', color: index === items.length - 1 ? 'var(--border)' : 'var(--text-muted)', fontSize: '0.7rem', padding: 0, lineHeight: 1 }}>▼</button>
                </div>
                <span style={{ flex: 1, fontSize: '0.95rem' }}>{item}</span>
                <button onClick={() => onDelete(item)} style={{
                  background: 'rgba(255,75,75,0.15)', color: 'var(--danger)',
                  border: '1px solid rgba(255,75,75,0.3)', borderRadius: '0.4rem',
                  padding: '0.25rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer'
                }}>Excluir</button>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
};

const Accessories = () => {
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');

  useEffect(() => {
    setCategories(getAccCategories());
    setOrders(getUnifiedOrders());
  }, []);

  const handleAddCategory = (name) => {
    saveAccCategory(name);
    setCategories(getAccCategories());
  };

  const handleDeleteCategory = (name) => {
    if (!confirm(`Excluir categoria "${name}"?`)) return;
    deleteAccCategory(name);
    setCategories(getAccCategories());
    if (filterCategory === name) setFilterCategory('');
  };

  const handleReorderCategories = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= categories.length) return;
    const arr = [...categories];
    const [moved] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, moved);
    saveAllAccCategories(arr);
    setCategories(arr);
  };

  // Extract all accessory items from unified orders with their order context
  const allAccEntries = orders.flatMap(order =>
    order.items
      .filter(i => i.type === 'accessory')
      .map(i => ({ ...i, orderDate: order.date, orderStore: order.store, orderId: order.id }))
  ).reverse();

  const filteredEntries = filterCategory
    ? allAccEntries.filter(i => i.category === filterCategory)
    : allAccEntries;

  const totalItemCount = allAccEntries.length;
  const totalQty = allAccEntries.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);
  const totalInvested = allAccEntries.reduce((acc, i) => acc + (i.price != null ? Number(i.price) : 0), 0);

  const formatCurrency = (v) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v);
  const formatDate = (dateStr) => {
    try {
      const d = dateStr?.includes('T') ? new Date(dateStr) : new Date(dateStr + 'T12:00:00');
      return d.toLocaleDateString();
    } catch { return '-'; }
  };

  return (
    <div className="animate-fade-in">
      <h1>Acessórios & Equipamentos</h1>

      {modalOpen && (
        <ListManagerModal
          title="Gerenciar Categorias"
          items={categories}
          onAdd={handleAddCategory}
          onDelete={handleDeleteCategory}
          onReorder={handleReorderCategories}
          onClose={() => setModalOpen(false)}
        />
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-panel stat-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--primary)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>ITENS REGISTADOS</p>
          <p style={{ fontSize: '2rem', fontWeight: 700 }}>{totalItemCount}</p>
        </div>
        <div className="glass-panel stat-card" style={{ padding: '1.5rem', borderLeft: '4px solid #10B981' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>QUANTIDADE TOTAL</p>
          <p style={{ fontSize: '2rem', fontWeight: 700 }}>{totalQty}</p>
        </div>
        <div className="glass-panel stat-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--success)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>INVESTIMENTO TOTAL</p>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>
            {formatCurrency(totalInvested)}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Filtrar:</span>
          <button
            onClick={() => setFilterCategory('')}
            style={{
              background: !filterCategory ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
              color: !filterCategory ? '#000' : 'var(--text-muted)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.4rem',
              padding: '0.3rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: !filterCategory ? 700 : 400
            }}>
            Todos
          </button>
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilterCategory(filterCategory === cat ? '' : cat)}
              style={{
                background: filterCategory === cat ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.06)',
                color: filterCategory === cat ? 'var(--secondary)' : 'var(--text-muted)',
                border: `1px solid ${filterCategory === cat ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '0.4rem', padding: '0.3rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer',
                fontWeight: filterCategory === cat ? 700 : 400
              }}>
              {cat}
            </button>
          ))}
        </div>
        <button
          onClick={() => setModalOpen(true)}
          style={{
            background: 'rgba(139,92,246,0.15)', color: 'var(--secondary)',
            border: '1px solid rgba(139,92,246,0.3)', borderRadius: '0.5rem',
            padding: '0.45rem 1rem', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600
          }}>
          Gerir Categorias
        </button>
      </div>

      {/* Info note */}
      <div style={{
        background: 'rgba(0,240,255,0.05)', border: '1px solid rgba(0,240,255,0.15)',
        borderRadius: '0.5rem', padding: '0.65rem 1rem', marginBottom: '1.5rem',
        fontSize: '0.82rem', color: 'var(--text-muted)'
      }}>
        Para registar ou editar compras de acessórios, use a página <strong style={{ color: 'var(--primary)' }}>Pedidos</strong>.
      </div>

      {/* History table */}
      <h2>Histórico de Acessórios</h2>
      <div className="glass-panel" style={{ marginTop: '1rem' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Nome</th>
              <th>Categoria</th>
              <th>Qtd</th>
              <th>Preço</th>
              <th>Loja</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  {allAccEntries.length === 0
                    ? 'Nenhum acessório registado. Crie um pedido na página Pedidos.'
                    : 'Nenhum acessório nesta categoria.'}
                </td>
              </tr>
            ) : (
              filteredEntries.map((item, idx) => (
                <tr key={`${item.orderId}-${idx}`}>
                  <td>{formatDate(item.orderDate)}</td>
                  <td style={{ fontWeight: 600 }}>{item.name}</td>
                  <td>
                    <span style={{
                      background: 'rgba(139,92,246,0.15)', color: 'var(--secondary)',
                      border: '1px solid rgba(139,92,246,0.3)', borderRadius: '0.4rem',
                      padding: '0.2rem 0.6rem', fontSize: '0.8rem', fontWeight: 600
                    }}>{item.category}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{item.quantity}</td>
                  <td style={{ fontWeight: 600, color: 'var(--success)' }}>
                    {item.price != null
                      ? formatCurrency(item.price)
                      : <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>—</span>}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {item.orderStore || '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Accessories;
