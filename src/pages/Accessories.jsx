import React, { useState, useEffect, useRef } from 'react';
import { getAccOrders, saveAccOrder, updateAccOrder, deleteAccOrder, getAccCategories, saveAccCategory, deleteAccCategory, saveAllAccCategories } from '../services/storage';
import MaskedNumberInput from '../components/MaskedNumberInput';

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
            ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>Nenhum item cadastrado.</p>
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

const createEmptyItem = (defaultCategory = '') => ({
  _id: Math.random(),
  name: '',
  category: defaultCategory,
  quantity: 1,
  price: '',
  showNameSuggestions: false,
  nameHighlightedIndex: -1
});

const Accessories = () => {
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [orderStore, setOrderStore] = useState('');
  const [shipping, setShipping] = useState('');
  const [otherCosts, setOtherCosts] = useState('');
  const [items, setItems] = useState([createEmptyItem()]);

  const [showStoreSuggestions, setShowStoreSuggestions] = useState(false);
  const [storeHighlightedIndex, setStoreHighlightedIndex] = useState(-1);

  const itemInputRefs = useRef([]);
  const prevItemsLength = useRef(1);

  useEffect(() => {
    const cats = getAccCategories();
    setCategories(cats);
    setItems([createEmptyItem(cats[0] || '')]);
    loadData();
  }, []);

  useEffect(() => {
    if (items.length > prevItemsLength.current) {
      const lastInput = itemInputRefs.current[items.length - 1];
      if (lastInput) lastInput.focus();
    }
    prevItemsLength.current = items.length;
  }, [items.length]);

  const loadData = () => setOrders(getAccOrders().reverse());

  const updateItem = (index, changes) =>
    setItems(prev => prev.map((item, i) => i === index ? { ...item, ...changes } : item));

  const addItem = () => setItems(prev => [...prev, createEmptyItem(categories[0] || '')]);
  const removeItem = (index) => { if (items.length > 1) setItems(prev => prev.filter((_, i) => i !== index)); };

  const getAllItemNames = () =>
    [...new Set(getAccOrders().flatMap(o => o.items.map(i => i.name)).filter(Boolean))];

  const getAllStores = () =>
    [...new Set(getAccOrders().map(o => o.store).filter(Boolean))];

  const getFilteredNamesForItem = (name) => {
    const typed = (name || '').toLowerCase();
    if (!typed) return [];
    return getAllItemNames().filter(n => n.toLowerCase().includes(typed) && n !== name).slice(0, 8);
  };

  const getFilteredStores = () => {
    const typed = (orderStore || '').toLowerCase();
    if (!typed) return [];
    return getAllStores().filter(s => s.toLowerCase().includes(typed) && s !== orderStore).slice(0, 8);
  };

  const handleItemNameKeyDown = (e, index) => {
    const filtered = getFilteredNamesForItem(items[index].name);
    const item = items[index];
    if (!item.showNameSuggestions || filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(item.nameHighlightedIndex + 1, filtered.length - 1);
      updateItem(index, { nameHighlightedIndex: next });
      setTimeout(() => document.getElementById(`name-sug-${index}-${next}`)?.scrollIntoView({ block: 'nearest' }), 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.max(item.nameHighlightedIndex - 1, 0);
      updateItem(index, { nameHighlightedIndex: next });
      setTimeout(() => document.getElementById(`name-sug-${index}-${next}`)?.scrollIntoView({ block: 'nearest' }), 0);
    } else if (e.key === 'Enter' && item.nameHighlightedIndex >= 0) {
      e.preventDefault();
      updateItem(index, { name: filtered[item.nameHighlightedIndex], showNameSuggestions: false, nameHighlightedIndex: -1 });
    } else if (e.key === 'Escape') {
      updateItem(index, { showNameSuggestions: false, nameHighlightedIndex: -1 });
    }
  };

  const handleStoreKeyDown = (e) => {
    const filtered = getFilteredStores();
    if (!showStoreSuggestions || filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setStoreHighlightedIndex(prev => {
        const next = Math.min(prev + 1, filtered.length - 1);
        setTimeout(() => document.getElementById(`store-sug-${next}`)?.scrollIntoView({ block: 'nearest' }), 0);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setStoreHighlightedIndex(prev => {
        const next = Math.max(prev - 1, 0);
        setTimeout(() => document.getElementById(`store-sug-${next}`)?.scrollIntoView({ block: 'nearest' }), 0);
        return next;
      });
    } else if (e.key === 'Enter' && storeHighlightedIndex >= 0) {
      e.preventDefault();
      setOrderStore(filtered[storeHighlightedIndex]);
      setShowStoreSuggestions(false);
      setStoreHighlightedIndex(-1);
    } else if (e.key === 'Escape') {
      setShowStoreSuggestions(false);
      setStoreHighlightedIndex(-1);
    }
  };

  const handleAddCategory = (name) => {
    saveAccCategory(name);
    setCategories(getAccCategories());
  };

  const handleDeleteCategory = (name) => {
    if (!confirm(`Excluir categoria "${name}"?`)) return;
    deleteAccCategory(name);
    const updated = getAccCategories();
    setCategories(updated);
    setItems(prev => prev.map(item =>
      item.category === name ? { ...item, category: updated[0] || '' } : item
    ));
  };

  const handleReorderCategories = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= categories.length) return;
    const arr = [...categories];
    const [moved] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, moved);
    saveAllAccCategories(arr);
    setCategories(arr);
  };

  const totalExtra = (Number(shipping) || 0) + (Number(otherCosts) || 0);
  const extraPerItem = items.length > 0 ? totalExtra / items.length : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    const validItems = items.filter(item => item.name.trim());
    if (validItems.length === 0) return alert('Adicione pelo menos um item');
    const extra = totalExtra / validItems.length;
    const orderData = {
      date: orderDate,
      store: orderStore,
      shipping: Number(shipping) || 0,
      otherCosts: Number(otherCosts) || 0,
      items: validItems.map(item => ({
        name: item.name,
        category: item.category,
        quantity: Number(item.quantity) || 1,
        price: item.price !== '' ? (Number(item.price) || 0) + extra : (extra > 0 ? extra : null)
      }))
    };
    if (isEditing && editingOrderId) {
      updateAccOrder({ ...orderData, id: editingOrderId });
      setSuccessMessage('✓ Pedido atualizado!');
    } else {
      saveAccOrder(orderData);
      setSuccessMessage('✓ Pedido registado!');
    }
    resetForm();
    loadData();
    setTimeout(() => setSuccessMessage(''), 1000);
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingOrderId(null);
    setOrderDate(new Date().toISOString().split('T')[0]);
    setOrderStore('');
    setShipping('');
    setOtherCosts('');
    setItems([createEmptyItem(categories[0] || '')]);
  };

  const handleEdit = (order) => {
    const extra = ((order.shipping || 0) + (order.otherCosts || 0)) / Math.max(order.items.length, 1);
    setEditingOrderId(order.id);
    setIsEditing(true);
    setOrderDate(order.date?.includes('T') ? order.date.split('T')[0] : order.date || '');
    setOrderStore(order.store || '');
    setShipping(order.shipping ? String(order.shipping) : '');
    setOtherCosts(order.otherCosts ? String(order.otherCosts) : '');
    setItems(order.items.map(i => ({
      _id: Math.random(),
      name: i.name || '',
      category: i.category || categories[0] || '',
      quantity: i.quantity || 1,
      price: i.price != null ? String(Math.round((i.price - extra) * 100) / 100) : '',
      showNameSuggestions: false,
      nameHighlightedIndex: -1
    })));
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id) => {
    if (confirm('Excluir este pedido?')) {
      deleteAccOrder(id);
      loadData();
    }
  };

  const formatCurrency = (v) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v);
  const formatDate = (dateStr) => {
    try {
      const d = dateStr?.includes('T') ? new Date(dateStr) : new Date(dateStr + 'T12:00:00');
      return d.toLocaleDateString();
    } catch { return '-'; }
  };

  const allItemsFlat = orders.flatMap(o => o.items || []);
  const totalItemCount = allItemsFlat.length;
  const totalQty = allItemsFlat.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);
  const totalInvested = allItemsFlat.reduce((acc, i) => acc + (i.price != null ? Number(i.price) : 0), 0);

  const plusBtnStyle = {
    background: 'var(--accent)', color: '#000', border: 'none', borderRadius: '50%',
    width: '18px', height: '18px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
    verticalAlign: 'middle', marginLeft: '0.4rem'
  };

  return (
    <div className="animate-fade-in">
      {successMessage && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 10000,
          background: 'var(--primary)', color: 'white',
          padding: '1rem 1.5rem', borderRadius: '0.5rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          fontSize: '0.95rem', fontWeight: 600
        }}>
          {successMessage}
        </div>
      )}

      <h1>{isEditing ? 'Editar Pedido' : 'Acessórios & Equipamentos'}</h1>

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

      {/* Form */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', border: isEditing ? '1px solid var(--primary)' : undefined }}>
        <form onSubmit={handleSubmit}>

          {/* Date */}
          <div style={{ marginBottom: '1.5rem', maxWidth: '240px' }}>
            <label className="form-label">Data da Compra</label>
            <input type="date" className="form-input" value={orderDate}
              onChange={e => setOrderDate(e.target.value)} required />
          </div>

          {/* Items list */}
          <label className="form-label" style={{ marginBottom: '0.75rem', display: 'block' }}>
            Itens Comprados
          </label>

          {items.map((item, index) => {
            const filtered = getFilteredNamesForItem(item.name);
            return (
              <div key={item._id} style={{
                display: 'grid', gridTemplateColumns: '1fr 170px 80px 140px auto',
                gap: '0.75rem', marginBottom: '0.75rem', alignItems: 'start'
              }}>
                {/* Name */}
                <div style={{ position: 'relative' }}>
                  {index === 0 && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Nome</div>}
                  <input
                    ref={el => itemInputRefs.current[index] = el}
                    type="text" className="form-input"
                    placeholder="Ex: Nozzle, Placa de impressão..."
                    value={item.name}
                    onChange={e => updateItem(index, { name: e.target.value, showNameSuggestions: true, nameHighlightedIndex: -1 })}
                    onFocus={() => updateItem(index, { showNameSuggestions: true })}
                    onBlur={() => setTimeout(() => updateItem(index, { showNameSuggestions: false }), 200)}
                    onKeyDown={e => handleItemNameKeyDown(e, index)}
                    required
                  />
                  {item.showNameSuggestions && item.name && filtered.length > 0 && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
                      background: '#1f2937', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '0.5rem', marginTop: '0.25rem', maxHeight: '220px',
                      overflowY: 'auto', boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                    }}>
                      {filtered.map((name, fi) => (
                        <div key={fi} id={`name-sug-${index}-${fi}`}
                          onMouseDown={() => updateItem(index, { name, showNameSuggestions: false, nameHighlightedIndex: -1 })}
                          style={{
                            padding: '0.7rem 1rem', cursor: 'pointer', fontSize: '0.9rem',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            background: fi === item.nameHighlightedIndex ? 'rgba(59,130,246,0.25)' : 'transparent'
                          }}>
                          {name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Category */}
                <div>
                  {index === 0 && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                      Categoria
                      <button type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); setModalOpen(true); }} style={plusBtnStyle}>+</button>
                    </div>
                  )}
                  <select className="form-select" value={item.category}
                    onChange={e => updateItem(index, { category: e.target.value })}>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  {index === 0 && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Qtd</div>}
                  <input type="number" className="form-input" min="1" value={item.quantity}
                    onChange={e => updateItem(index, { quantity: e.target.value })} />
                </div>

                {/* Base price */}
                <div>
                  {index === 0 && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Preço base (€)</div>}
                  <MaskedNumberInput
                    value={item.price}
                    onChange={v => updateItem(index, { price: v })}
                    prefix="€"
                    className="form-input"
                  />
                </div>

                {/* Remove */}
                <div style={{ paddingTop: index === 0 ? '1.4rem' : '0' }}>
                  <button type="button" onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                    style={{
                      background: items.length === 1 ? 'transparent' : 'rgba(255,75,75,0.15)',
                      color: items.length === 1 ? 'var(--border)' : 'var(--danger)',
                      border: `1px solid ${items.length === 1 ? 'transparent' : 'rgba(255,75,75,0.3)'}`,
                      borderRadius: '0.5rem', padding: '0.55rem 0.75rem',
                      cursor: items.length === 1 ? 'default' : 'pointer', fontSize: '1rem', lineHeight: 1
                    }}>✕</button>
                </div>
              </div>
            );
          })}

          <button type="button" className="btn btn-secondary" onClick={addItem}
            style={{ marginBottom: '1.5rem', fontSize: '0.85rem', padding: '0.5rem 1.25rem' }}>
            + Adicionar Item
          </button>

          {/* Store + extras */}
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', alignItems: 'end' }}>
              <div>
                <label className="form-label">Onde foi Comprado (Opcional)</label>
                <div style={{ position: 'relative' }}>
                  <input type="text" className="form-input"
                    placeholder="Ex: Amazon, Aliexpress..."
                    value={orderStore}
                    onChange={e => { setOrderStore(e.target.value); setShowStoreSuggestions(true); setStoreHighlightedIndex(-1); }}
                    onFocus={() => setShowStoreSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowStoreSuggestions(false), 200)}
                    onKeyDown={handleStoreKeyDown}
                  />
                  {showStoreSuggestions && (() => {
                    const filtered = getFilteredStores();
                    if (!filtered.length) return null;
                    return (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
                        background: '#1f2937', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '0.5rem', marginTop: '0.25rem', maxHeight: '200px',
                        overflowY: 'auto', boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                      }}>
                        {filtered.map((store, i) => (
                          <div key={i} id={`store-sug-${i}`}
                            onMouseDown={() => { setOrderStore(store); setShowStoreSuggestions(false); setStoreHighlightedIndex(-1); }}
                            style={{
                              padding: '0.7rem 1rem', cursor: 'pointer', fontSize: '0.9rem',
                              borderBottom: '1px solid rgba(255,255,255,0.05)',
                              background: i === storeHighlightedIndex ? 'rgba(59,130,246,0.25)' : 'transparent'
                            }}>
                            {store}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
              <div>
                <label className="form-label">Gastos de Envio</label>
                <MaskedNumberInput
                  value={shipping}
                  onChange={v => setShipping(v)}
                  prefix="€"
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Outros Gastos</label>
                <MaskedNumberInput
                  value={otherCosts}
                  onChange={v => setOtherCosts(v)}
                  prefix="€"
                  className="form-input"
                />
              </div>
            </div>

            {totalExtra > 0 && (
              <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{
                  padding: '0.75rem 1rem', background: 'rgba(0,240,255,0.07)',
                  borderRadius: '0.5rem', border: '1px solid rgba(0,240,255,0.2)', flexShrink: 0
                }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Extra por item</div>
                  <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1.05rem' }}>
                    +{formatCurrency(extraPerItem)}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {formatCurrency(totalExtra)} ÷ {items.length} item{items.length !== 1 ? 's' : ''}
                  </div>
                </div>

                {items.some(i => i.name) && (
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Preço final por item:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {items.filter(i => i.name).map((item) => {
                        const base = Number(item.price) || 0;
                        const final = base + extraPerItem;
                        return (
                          <div key={item._id} style={{
                            background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                            borderRadius: '0.5rem', padding: '0.4rem 0.75rem', fontSize: '0.8rem',
                            display: 'flex', alignItems: 'center', gap: '0.4rem'
                          }}>
                            <span style={{ color: 'var(--text-muted)' }}>{item.name}:</span>
                            {base > 0 && extraPerItem > 0 && (
                              <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through', fontSize: '0.75rem' }}>
                                {formatCurrency(base)}
                              </span>
                            )}
                            <span style={{ color: 'var(--success)', fontWeight: 700 }}>{formatCurrency(final)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            {isEditing && (
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Cancelar Edição
              </button>
            )}
            <button type="submit" className="btn btn-primary" style={{ minWidth: '200px' }}>
              {isEditing ? 'Salvar Alterações' : 'Registar Pedido'}
            </button>
          </div>
        </form>
      </div>

      {/* History table */}
      <h2>Histórico de Compras</h2>
      <div className="glass-panel" style={{ marginTop: '1rem' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Nome</th>
              <th>Categoria</th>
              <th>Qtd</th>
              <th>Preço Final</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  Nenhum pedido registado ainda.
                </td>
              </tr>
            ) : (
              orders.map(order => {
                const hasExtras = (order.shipping || 0) > 0 || (order.otherCosts || 0) > 0;
                const itemCount = order.items.length;
                const orderTotal = order.items.reduce((acc, i) => acc + (i.price != null ? Number(i.price) : 0), 0);
                const hasAnyPrice = order.items.some(i => i.price != null);
                return (
                  <React.Fragment key={order.id}>
                    {order.items.map((orderItem, itemIndex) => {
                      const isFirst = itemIndex === 0;
                      const isLast = itemIndex === itemCount - 1;
                      return (
                        <tr key={`${order.id}-${itemIndex}`} style={{
                          borderLeft: itemCount > 1 ? '3px solid rgba(139,92,246,0.35)' : '3px solid transparent',
                          borderBottom: isLast ? 'none' : '1px dashed rgba(255,255,255,0.04)'
                        }}>
                          <td style={{ verticalAlign: 'top', paddingTop: '0.85rem' }}>
                            {isFirst ? (
                              <>
                                <div>{formatDate(order.date)}</div>
                                {order.store && (
                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{order.store}</div>
                                )}
                                {hasExtras && (
                                  <div style={{ marginTop: '0.3rem', fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                    {(order.shipping || 0) > 0 && <div>Envio: {formatCurrency(order.shipping)}</div>}
                                    {(order.otherCosts || 0) > 0 && <div>Outros: {formatCurrency(order.otherCosts)}</div>}
                                  </div>
                                )}
                              </>
                            ) : null}
                          </td>
                          <td style={{ fontWeight: 600 }}>{orderItem.name}</td>
                          <td>
                            <span style={{
                              background: 'rgba(139,92,246,0.15)', color: 'var(--secondary)',
                              border: '1px solid rgba(139,92,246,0.3)', borderRadius: '0.4rem',
                              padding: '0.2rem 0.6rem', fontSize: '0.8rem', fontWeight: 600
                            }}>{orderItem.category}</span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{orderItem.quantity}</td>
                          <td style={{ fontWeight: 600, color: 'var(--success)' }}>
                            {orderItem.price != null
                              ? formatCurrency(orderItem.price)
                              : <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>—</span>}
                          </td>
                          <td>
                            {isFirst ? (
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                                  onClick={() => handleEdit(order)}>Editar</button>
                                <button className="btn btn-danger" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                                  onClick={() => handleDelete(order.id)}>Excluir</button>
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                    <tr style={{
                      borderLeft: itemCount > 1 ? '3px solid rgba(139,92,246,0.35)' : '3px solid transparent',
                      borderBottom: '2px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.03)'
                    }}>
                      <td></td>
                      <td colSpan="3" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'right', paddingRight: '1rem' }}>
                        Total do pedido ({itemCount} {itemCount === 1 ? 'item' : 'itens'})
                      </td>
                      <td style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary)' }}>
                        {hasAnyPrice ? formatCurrency(orderTotal) : <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>—</span>}
                      </td>
                      <td></td>
                    </tr>
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Accessories;
