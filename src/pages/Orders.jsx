import React, { useState, useEffect, useRef } from 'react';
import { getFilaments, getUnifiedOrders, saveUnifiedOrder, updateUnifiedOrder, deleteUnifiedOrder, getAccCategories } from '../services/storage';
import { ColorDot, getColorFromName, getBrandColor } from '../utils/colorUtils';
import MaskedNumberInput from '../components/MaskedNumberInput';

const createEmptyFilamentItem = () => ({
  _id: Math.random(),
  searchTerm: '',
  selectedFilament: null,
  sku: '',
  weightGrams: 1000,
  price: '',
  showSuggestions: false,
  highlightedIndex: -1
});

const createEmptyAccessoryItem = (defaultCategory = '') => ({
  _id: Math.random(),
  name: '',
  category: defaultCategory,
  quantity: 1,
  price: '',
  showNameSuggestions: false,
  nameHighlightedIndex: -1
});

const Orders = () => {
  const [filaments, setFilaments] = useState([]);
  const [accCategories, setAccCategories] = useState([]);
  const [orders, setOrders] = useState([]);

  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [orderStore, setOrderStore] = useState('');
  const [shipping, setShipping] = useState('');
  const [otherCosts, setOtherCosts] = useState('');
  const [filamentItems, setFilamentItems] = useState([createEmptyFilamentItem()]);
  const [accessoryItems, setAccessoryItems] = useState([]);

  const [showStoreSuggestions, setShowStoreSuggestions] = useState(false);
  const [storeHighlightedIndex, setStoreHighlightedIndex] = useState(-1);

  const [successMessage, setSuccessMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);

  const filamentInputRefs = useRef([]);
  const accessoryInputRefs = useRef([]);
  const prevFilamentLength = useRef(1);
  const prevAccessoryLength = useRef(0);

  useEffect(() => {
    setFilaments(getFilaments());
    const cats = getAccCategories();
    setAccCategories(cats);
    loadData();
  }, []);

  useEffect(() => {
    if (filamentItems.length > prevFilamentLength.current) {
      filamentInputRefs.current[filamentItems.length - 1]?.focus();
    }
    prevFilamentLength.current = filamentItems.length;
  }, [filamentItems.length]);

  useEffect(() => {
    if (accessoryItems.length > prevAccessoryLength.current) {
      accessoryInputRefs.current[accessoryItems.length - 1]?.focus();
    }
    prevAccessoryLength.current = accessoryItems.length;
  }, [accessoryItems.length]);

  const loadData = () => setOrders(
    getUnifiedOrders().sort((a, b) => {
      const da = a.date?.includes('T') ? new Date(a.date) : new Date(a.date + 'T12:00:00');
      const db = b.date?.includes('T') ? new Date(b.date) : new Date(b.date + 'T12:00:00');
      return db - da;
    })
  );

  // --- Filament item helpers ---
  const updateFilamentItem = (index, changes) =>
    setFilamentItems(prev => prev.map((item, i) => i === index ? { ...item, ...changes } : item));

  const getFilteredFilaments = (item) => {
    if (!item.searchTerm) return [];
    const s = item.searchTerm.toLowerCase();
    return filaments.filter(f =>
      f.sku.toLowerCase().includes(s) || f.marca.toLowerCase().includes(s) ||
      f.cor.toLowerCase().includes(s) || f.categoria.toLowerCase().includes(s)
    );
  };

  const handleSelectFilament = (index, filament) => {
    updateFilamentItem(index, {
      selectedFilament: filament,
      searchTerm: `${filament.categoria} - ${filament.cor} (${filament.sku})`,
      sku: filament.sku,
      showSuggestions: false,
      highlightedIndex: -1
    });
  };

  const handleFilamentKeyDown = (e, index) => {
    const filtered = getFilteredFilaments(filamentItems[index]);
    const item = filamentItems[index];
    if (!item.showSuggestions || filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(item.highlightedIndex + 1, filtered.length - 1);
      updateFilamentItem(index, { highlightedIndex: next });
      setTimeout(() => document.getElementById(`fsug-${index}-${next}`)?.scrollIntoView({ block: 'nearest' }), 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.max(item.highlightedIndex - 1, 0);
      updateFilamentItem(index, { highlightedIndex: next });
      setTimeout(() => document.getElementById(`fsug-${index}-${next}`)?.scrollIntoView({ block: 'nearest' }), 0);
    } else if (e.key === 'Enter' && item.highlightedIndex >= 0) {
      e.preventDefault();
      handleSelectFilament(index, filtered[item.highlightedIndex]);
    } else if (e.key === 'Escape') {
      updateFilamentItem(index, { showSuggestions: false, highlightedIndex: -1 });
    }
  };

  const addFilamentItem = () => setFilamentItems(prev => [...prev, createEmptyFilamentItem()]);
  const removeFilamentItem = (index) => {
    if (filamentItems.length > 1 || accessoryItems.length > 0)
      setFilamentItems(prev => prev.filter((_, i) => i !== index));
  };

  // --- Accessory item helpers ---
  const updateAccessoryItem = (index, changes) =>
    setAccessoryItems(prev => prev.map((item, i) => i === index ? { ...item, ...changes } : item));

  const getAllAccessoryNames = () =>
    [...new Set(getUnifiedOrders()
      .flatMap(o => o.items.filter(i => i.type === 'accessory').map(i => i.name))
      .filter(Boolean))];

  const getFilteredAccNames = (name) => {
    const typed = (name || '').toLowerCase();
    if (!typed) return [];
    return getAllAccessoryNames().filter(n => n.toLowerCase().includes(typed) && n !== name).slice(0, 8);
  };

  const handleAccNameKeyDown = (e, index) => {
    const filtered = getFilteredAccNames(accessoryItems[index].name);
    const item = accessoryItems[index];
    if (!item.showNameSuggestions || filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(item.nameHighlightedIndex + 1, filtered.length - 1);
      updateAccessoryItem(index, { nameHighlightedIndex: next });
      setTimeout(() => document.getElementById(`asug-${index}-${next}`)?.scrollIntoView({ block: 'nearest' }), 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.max(item.nameHighlightedIndex - 1, 0);
      updateAccessoryItem(index, { nameHighlightedIndex: next });
      setTimeout(() => document.getElementById(`asug-${index}-${next}`)?.scrollIntoView({ block: 'nearest' }), 0);
    } else if (e.key === 'Enter' && item.nameHighlightedIndex >= 0) {
      e.preventDefault();
      updateAccessoryItem(index, { name: filtered[item.nameHighlightedIndex], showNameSuggestions: false, nameHighlightedIndex: -1 });
    } else if (e.key === 'Escape') {
      updateAccessoryItem(index, { showNameSuggestions: false, nameHighlightedIndex: -1 });
    }
  };

  const addAccessoryItem = () =>
    setAccessoryItems(prev => [...prev, createEmptyAccessoryItem(accCategories[0] || '')]);
  const removeAccessoryItem = (index) => {
    if (accessoryItems.length > 1 || filamentItems.some(i => i.sku))
      setAccessoryItems(prev => prev.filter((_, i) => i !== index));
    else if (accessoryItems.length === 1)
      setAccessoryItems([]);
  };

  // --- Store autocomplete ---
  const getAllStores = () =>
    [...new Set(getUnifiedOrders().map(o => o.store).filter(Boolean))];

  const getFilteredStores = () => {
    const typed = (orderStore || '').toLowerCase();
    if (!typed) return [];
    return getAllStores().filter(s => s.toLowerCase().includes(typed) && s !== orderStore).slice(0, 8);
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

  // --- Totals ---
  const totalExtra = (Number(shipping) || 0) + (Number(otherCosts) || 0);
  const totalItemCount = filamentItems.length + accessoryItems.length;
  const extraPerItem = totalItemCount > 0 ? totalExtra / totalItemCount : 0;

  // --- Submit ---
  const handleSubmit = (e) => {
    e.preventDefault();
    const validFilaments = filamentItems.filter(i => i.sku);
    const validAccessories = accessoryItems.filter(i => i.name.trim());
    if (validFilaments.length + validAccessories.length === 0)
      return alert('Adicione pelo menos um filamento ou acessório');
    if (!orderStore.trim())
      return alert('O local onde foi comprado é obrigatório.');

    const validTotal = validFilaments.length + validAccessories.length;
    const extra = totalExtra / validTotal;

    const orderData = {
      date: orderDate,
      store: orderStore,
      shipping: Number(shipping) || 0,
      otherCosts: Number(otherCosts) || 0,
      items: [
        ...validFilaments.map(item => ({
          type: 'filament',
          sku: item.sku,
          weightGrams: Number(item.weightGrams) || 1000,
          price: (Number(item.price) || 0) + extra
        })),
        ...validAccessories.map(item => ({
          type: 'accessory',
          name: item.name,
          category: item.category,
          quantity: Number(item.quantity) || 1,
          price: item.price !== '' ? (Number(item.price) || 0) + extra : (extra > 0 ? extra : null)
        }))
      ]
    };

    if (isEditing && editingOrderId) {
      updateUnifiedOrder({ ...orderData, id: editingOrderId });
      setSuccessMessage('✓ Pedido atualizado!');
    } else {
      saveUnifiedOrder(orderData);
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
    setFilamentItems([createEmptyFilamentItem()]);
    setAccessoryItems([]);
  };

  const handleEdit = (order) => {
    const extra = ((order.shipping || 0) + (order.otherCosts || 0)) / Math.max(order.items.length, 1);
    const fItems = order.items.filter(i => i.type === 'filament');
    const aItems = order.items.filter(i => i.type === 'accessory');

    setEditingOrderId(order.id);
    setIsEditing(true);
    setOrderDate(order.date?.includes('T') ? order.date.split('T')[0] : order.date || '');
    setOrderStore(order.store || '');
    setShipping(order.shipping ? String(order.shipping) : '');
    setOtherCosts(order.otherCosts ? String(order.otherCosts) : '');

    setFilamentItems(fItems.length > 0 ? fItems.map(item => {
      const filament = filaments.find(f => f.sku === item.sku);
      return {
        _id: Math.random(),
        searchTerm: filament ? `${filament.categoria} - ${filament.cor} (${item.sku})` : item.sku,
        selectedFilament: filament || null,
        sku: item.sku,
        weightGrams: item.weightGrams,
        price: String(Math.round((item.price - extra) * 100) / 100 || ''),
        showSuggestions: false,
        highlightedIndex: -1
      };
    }) : [createEmptyFilamentItem()]);

    setAccessoryItems(aItems.map(item => ({
      _id: Math.random(),
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      price: item.price != null ? String(Math.round((item.price - extra) * 100) / 100) : '',
      showNameSuggestions: false,
      nameHighlightedIndex: -1
    })));

    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id) => {
    if (confirm('Excluir este pedido? O estoque de filamentos será recalculado.')) {
      deleteUnifiedOrder(id);
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

  // All valid items with a name/sku for the price preview
  const previewItems = [
    ...filamentItems.filter(i => i.sku).map(i => ({
      _id: i._id,
      label: i.selectedFilament?.cor || i.sku,
      price: i.price,
      isFilament: true,
      cor: i.selectedFilament?.cor
    })),
    ...accessoryItems.filter(i => i.name).map(i => ({
      _id: i._id,
      label: i.name,
      price: i.price,
      isFilament: false
    }))
  ];

  return (
    <div className="animate-fade-in">
      {successMessage && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 10000,
          background: 'var(--primary)', color: 'white',
          padding: '1rem 1.5rem', borderRadius: '0.5rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)', fontSize: '0.95rem', fontWeight: 600
        }}>
          {successMessage}
        </div>
      )}

      <h1>{isEditing ? 'Editar Pedido' : 'Entrada de Estoque (Pedidos)'}</h1>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', border: isEditing ? '1px solid var(--primary)' : undefined }}>
        <form onSubmit={handleSubmit}>

          {/* Date */}
          <div style={{ marginBottom: '1.5rem', maxWidth: '240px' }}>
            <label className="form-label">Data da Compra</label>
            <input type="date" className="form-input" value={orderDate}
              onChange={e => setOrderDate(e.target.value)} required />
          </div>

          {/* ── FILAMENTOS ── */}
          <div style={{
            background: 'rgba(0,240,255,0.03)', border: '1px solid rgba(0,240,255,0.12)',
            borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1rem'
          }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
              FILAMENTOS
            </div>

            {filamentItems.map((item, index) => {
              const filtered = getFilteredFilaments(item);
              return (
                <div key={item._id} style={{
                  display: 'grid', gridTemplateColumns: '1fr 130px 140px auto',
                  gap: '0.75rem', marginBottom: '0.75rem', alignItems: 'start'
                }}>
                  <div style={{ position: 'relative' }}>
                    {index === 0 && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Filamento</div>}
                    <input
                      ref={el => filamentInputRefs.current[index] = el}
                      type="text" className="form-input"
                      placeholder="Digite SKU, marca, cor..."
                      value={item.searchTerm}
                      onChange={e => {
                        const v = e.target.value;
                        updateFilamentItem(index, {
                          searchTerm: v, showSuggestions: true, highlightedIndex: -1,
                          sku: v ? item.sku : '', selectedFilament: v ? item.selectedFilament : null
                        });
                      }}
                      onFocus={() => updateFilamentItem(index, { showSuggestions: true })}
                      onBlur={() => setTimeout(() => updateFilamentItem(index, { showSuggestions: false }), 200)}
                      onKeyDown={e => handleFilamentKeyDown(e, index)}
                    />
                    {item.showSuggestions && item.searchTerm && filtered.length > 0 && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
                        background: '#1f2937', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '0.5rem', marginTop: '0.25rem', maxHeight: '250px',
                        overflowY: 'auto', boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                      }}>
                        {filtered.map((f, fi) => (
                          <div key={f.sku} id={`fsug-${index}-${fi}`}
                            onMouseDown={() => handleSelectFilament(index, f)}
                            style={{
                              padding: '0.65rem 1rem', cursor: 'pointer',
                              borderBottom: '1px solid rgba(255,255,255,0.05)',
                              background: fi === item.highlightedIndex ? 'rgba(59,130,246,0.25)' : 'transparent'
                            }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>{f.sku}</span>
                              <ColorDot cor={f.cor} size={8} />
                              <span style={{ fontWeight: 600, fontSize: '0.85rem', color: getBrandColor(f.marca) }}>{f.marca}</span>
                              <span style={{ fontSize: '0.85rem', color: getColorFromName(f.cor) }}>{f.cor}</span>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{f.categoria}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {item.showSuggestions && item.searchTerm && filtered.length === 0 && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
                        background: '#1f2937', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '0.5rem', marginTop: '0.25rem', padding: '0.75rem',
                        textAlign: 'center', color: 'var(--text-muted)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                      }}>Nenhum filamento encontrado</div>
                    )}
                  </div>

                  <div>
                    {index === 0 && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Peso (g)</div>}
                    <input type="number" className="form-input" min="1" value={item.weightGrams}
                      onChange={e => updateFilamentItem(index, { weightGrams: e.target.value })} />
                  </div>

                  <div>
                    {index === 0 && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Preço base (€)</div>}
                    <MaskedNumberInput value={item.price} onChange={v => updateFilamentItem(index, { price: v })}
                      prefix="€" className="form-input" />
                  </div>

                  <div style={{ paddingTop: index === 0 ? '1.4rem' : '0' }}>
                    <button type="button" onClick={() => removeFilamentItem(index)}
                      disabled={filamentItems.length === 1 && accessoryItems.length === 0}
                      style={{
                        background: (filamentItems.length === 1 && accessoryItems.length === 0) ? 'transparent' : 'rgba(255,75,75,0.15)',
                        color: (filamentItems.length === 1 && accessoryItems.length === 0) ? 'var(--border)' : 'var(--danger)',
                        border: `1px solid ${(filamentItems.length === 1 && accessoryItems.length === 0) ? 'transparent' : 'rgba(255,75,75,0.3)'}`,
                        borderRadius: '0.5rem', padding: '0.55rem 0.75rem',
                        cursor: (filamentItems.length === 1 && accessoryItems.length === 0) ? 'default' : 'pointer',
                        fontSize: '1rem', lineHeight: 1
                      }}>✕</button>
                  </div>
                </div>
              );
            })}

            <button type="button" className="btn btn-secondary" onClick={addFilamentItem}
              style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem' }}>
              + Adicionar Filamento
            </button>
          </div>

          {/* ── ACESSÓRIOS ── */}
          <div style={{
            background: 'rgba(139,92,246,0.03)', border: '1px solid rgba(139,92,246,0.15)',
            borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem'
          }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--secondary)', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
              ACESSÓRIOS
            </div>

            {accessoryItems.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 0.75rem' }}>
                Sem acessórios neste pedido.
              </p>
            ) : (
              accessoryItems.map((item, index) => {
                const filtered = getFilteredAccNames(item.name);
                return (
                  <div key={item._id} style={{
                    display: 'grid', gridTemplateColumns: '1fr 170px 80px 140px auto',
                    gap: '0.75rem', marginBottom: '0.75rem', alignItems: 'start'
                  }}>
                    <div style={{ position: 'relative' }}>
                      {index === 0 && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Nome</div>}
                      <input
                        ref={el => accessoryInputRefs.current[index] = el}
                        type="text" className="form-input"
                        placeholder="Ex: Nozzle, Placa de impressão..."
                        value={item.name}
                        onChange={e => updateAccessoryItem(index, { name: e.target.value, showNameSuggestions: true, nameHighlightedIndex: -1 })}
                        onFocus={() => updateAccessoryItem(index, { showNameSuggestions: true })}
                        onBlur={() => setTimeout(() => updateAccessoryItem(index, { showNameSuggestions: false }), 200)}
                        onKeyDown={e => handleAccNameKeyDown(e, index)}
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
                            <div key={fi} id={`asug-${index}-${fi}`}
                              onMouseDown={() => updateAccessoryItem(index, { name, showNameSuggestions: false, nameHighlightedIndex: -1 })}
                              style={{
                                padding: '0.7rem 1rem', cursor: 'pointer', fontSize: '0.9rem',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                background: fi === item.nameHighlightedIndex ? 'rgba(59,130,246,0.25)' : 'transparent'
                              }}>{name}</div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      {index === 0 && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Categoria</div>}
                      <select className="form-select" value={item.category}
                        onChange={e => updateAccessoryItem(index, { category: e.target.value })}>
                        {accCategories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div>
                      {index === 0 && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Qtd</div>}
                      <input type="number" className="form-input" min="1" value={item.quantity}
                        onChange={e => updateAccessoryItem(index, { quantity: e.target.value })} />
                    </div>

                    <div>
                      {index === 0 && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Preço base (€)</div>}
                      <MaskedNumberInput value={item.price} onChange={v => updateAccessoryItem(index, { price: v })}
                        prefix="€" className="form-input" />
                    </div>

                    <div style={{ paddingTop: index === 0 ? '1.4rem' : '0' }}>
                      <button type="button" onClick={() => removeAccessoryItem(index)}
                        style={{
                          background: 'rgba(255,75,75,0.15)', color: 'var(--danger)',
                          border: '1px solid rgba(255,75,75,0.3)', borderRadius: '0.5rem',
                          padding: '0.55rem 0.75rem', cursor: 'pointer', fontSize: '1rem', lineHeight: 1
                        }}>✕</button>
                    </div>
                  </div>
                );
              })
            )}

            <button type="button" className="btn btn-secondary" onClick={addAccessoryItem}
              style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem', borderColor: 'rgba(139,92,246,0.3)' }}>
              + Adicionar Acessório
            </button>
          </div>

          {/* ── EXTRAS ── */}
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', alignItems: 'end' }}>
              <div>
                <label className="form-label">Onde foi Comprado *</label>
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
                            }}>{store}</div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
              <div>
                <label className="form-label">Gastos de Envio</label>
                <MaskedNumberInput value={shipping} onChange={v => setShipping(v)} prefix="€" className="form-input" />
              </div>
              <div>
                <label className="form-label">Outros Gastos</label>
                <MaskedNumberInput value={otherCosts} onChange={v => setOtherCosts(v)} prefix="€" className="form-input" />
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
                    {formatCurrency(totalExtra)} ÷ {totalItemCount} item{totalItemCount !== 1 ? 's' : ''}
                  </div>
                </div>

                {previewItems.length > 0 && (
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Preço final por item:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {previewItems.map(item => {
                        const base = Number(item.price) || 0;
                        const final = base + extraPerItem;
                        return (
                          <div key={item._id} style={{
                            background: item.isFilament ? 'rgba(0,240,255,0.06)' : 'rgba(139,92,246,0.08)',
                            border: `1px solid ${item.isFilament ? 'rgba(0,240,255,0.2)' : 'rgba(139,92,246,0.2)'}`,
                            borderRadius: '0.5rem', padding: '0.4rem 0.75rem', fontSize: '0.8rem',
                            display: 'flex', alignItems: 'center', gap: '0.4rem'
                          }}>
                            {item.cor && <ColorDot cor={item.cor} size={8} />}
                            <span style={{ color: 'var(--text-muted)' }}>{item.label}:</span>
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

      {/* History */}
      <h2>Histórico de Compras</h2>
      <div className="glass-panel" style={{ marginTop: '1rem' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Item</th>
              <th>Detalhes</th>
              <th>Preço Final</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Nenhum pedido registado.
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
                    {order.items.map((item, itemIndex) => {
                      const isFirst = itemIndex === 0;
                      const isLast = itemIndex === itemCount - 1;
                      const filament = item.type === 'filament' ? filaments.find(f => f.sku === item.sku) : null;
                      return (
                        <tr key={`${order.id}-${itemIndex}`} style={{
                          borderLeft: itemCount > 1 ? '3px solid rgba(255,255,255,0.1)' : '3px solid transparent',
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
                          <td>
                            {item.type === 'filament' ? (
                              <span className="badge badge-primary" style={{ fontSize: '0.7rem', whiteSpace: 'nowrap' }}>Filamento</span>
                            ) : (
                              <span style={{
                                background: 'rgba(139,92,246,0.15)', color: 'var(--secondary)',
                                border: '1px solid rgba(139,92,246,0.3)', borderRadius: '0.4rem',
                                padding: '0.2rem 0.6rem', fontSize: '0.7rem', fontWeight: 600, whiteSpace: 'nowrap'
                              }}>Acessório</span>
                            )}
                          </td>
                          <td>
                            {item.type === 'filament' ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {filament?.cor && <ColorDot cor={filament.cor} size={9} />}
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: getBrandColor(filament?.marca) }}>
                                      {filament?.marca || '-'}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: filament?.cor ? getColorFromName(filament.cor) : 'var(--text-muted)' }}>
                                      {filament?.cor || '-'}
                                    </span>
                                    <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>{item.sku}</span>
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{filament?.categoria || '-'}</div>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.name}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.category}</div>
                              </div>
                            )}
                          </td>
                          <td style={{ fontWeight: 600 }}>
                            {item.type === 'filament'
                              ? `${(parseFloat(item.weightGrams) / 1000).toFixed(2).replace('.', ',')}kg`
                              : `${item.quantity} un`}
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--success)' }}>
                            {item.price != null
                              ? formatCurrency(item.price)
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
                      borderLeft: itemCount > 1 ? '3px solid rgba(255,255,255,0.1)' : '3px solid transparent',
                      borderBottom: '2px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.03)'
                    }}>
                      <td></td>
                      <td></td>
                      <td colSpan="2" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'right', paddingRight: '1rem' }}>
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

export default Orders;
