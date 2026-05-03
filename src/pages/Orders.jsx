import React, { useState, useEffect, useRef } from 'react';
import { getFilaments, saveOrder, updateOrder, getOrders, deleteOrder } from '../services/storage';
import { ColorDot, getColorFromName, getBrandColor } from '../utils/colorUtils';
import MaskedNumberInput from '../components/MaskedNumberInput';

const createEmptyItem = () => ({
  _id: Math.random(),
  searchTerm: '',
  selectedFilament: null,
  sku: '',
  weightGrams: 1000,
  price: '',
  showSuggestions: false,
  highlightedIndex: -1
});

const Orders = () => {
  const [filaments, setFilaments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [shipping, setShipping] = useState('');
  const itemInputRefs = useRef([]);
  const prevItemsLength = useRef(1);
  const [otherCosts, setOtherCosts] = useState('');
  const [items, setItems] = useState([createEmptyItem()]);
  const [successMessage, setSuccessMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);

  useEffect(() => {
    setFilaments(getFilaments());
    setOrders(getOrders().reverse());
  }, []);

  useEffect(() => {
    if (items.length > prevItemsLength.current) {
      const lastInput = itemInputRefs.current[items.length - 1];
      if (lastInput) lastInput.focus();
    }
    prevItemsLength.current = items.length;
  }, [items.length]);

  const updateItem = (index, changes) =>
    setItems(prev => prev.map((item, i) => i === index ? { ...item, ...changes } : item));

  const getFilteredForItem = (item) => {
    if (!item.searchTerm) return [];
    const s = item.searchTerm.toLowerCase();
    return filaments.filter(f =>
      f.sku.toLowerCase().includes(s) ||
      f.marca.toLowerCase().includes(s) ||
      f.cor.toLowerCase().includes(s) ||
      f.categoria.toLowerCase().includes(s)
    );
  };

  const handleSelectFilament = (index, filament) => {
    updateItem(index, {
      selectedFilament: filament,
      searchTerm: `${filament.categoria} - ${filament.cor} (${filament.sku})`,
      sku: filament.sku,
      showSuggestions: false,
      highlightedIndex: -1
    });
  };

  const handleItemKeyDown = (e, index) => {
    const filtered = getFilteredForItem(items[index]);
    const item = items[index];
    if (!item.showSuggestions || filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(item.highlightedIndex + 1, filtered.length - 1);
      updateItem(index, { highlightedIndex: next });
      setTimeout(() => document.getElementById(`sug-${index}-${next}`)?.scrollIntoView({ block: 'nearest' }), 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.max(item.highlightedIndex - 1, 0);
      updateItem(index, { highlightedIndex: next });
      setTimeout(() => document.getElementById(`sug-${index}-${next}`)?.scrollIntoView({ block: 'nearest' }), 0);
    } else if (e.key === 'Enter' && item.highlightedIndex >= 0) {
      e.preventDefault();
      handleSelectFilament(index, filtered[item.highlightedIndex]);
    } else if (e.key === 'Escape') {
      updateItem(index, { showSuggestions: false, highlightedIndex: -1 });
    }
  };

  const addItem = () => setItems(prev => [...prev, createEmptyItem()]);
  const removeItem = (index) => { if (items.length > 1) setItems(prev => prev.filter((_, i) => i !== index)); };

  const handleEdit = (order) => {
    const extraPerItem = ((order.shipping || 0) + (order.otherCosts || 0)) / order.items.length;
    setEditingOrderId(order.id);
    setIsEditing(true);
    setOrderDate(order.date.includes('T') ? order.date.split('T')[0] : order.date);
    setShipping(order.shipping ? String(order.shipping) : '');
    setOtherCosts(order.otherCosts ? String(order.otherCosts) : '');
    setItems(order.items.map(orderItem => {
      const filament = filaments.find(f => f.sku === orderItem.sku);
      return {
        _id: Math.random(),
        searchTerm: filament ? `${filament.categoria} - ${filament.cor} (${orderItem.sku})` : orderItem.sku,
        selectedFilament: filament || null,
        sku: orderItem.sku,
        weightGrams: orderItem.weightGrams,
        price: String(Math.round((orderItem.price - extraPerItem) * 100) / 100 || ''),
        showSuggestions: false,
        highlightedIndex: -1
      };
    }));
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingOrderId(null);
    setItems([createEmptyItem()]);
    setShipping('');
    setOtherCosts('');
    setOrderDate(new Date().toISOString().split('T')[0]);
  };

  const totalExtra = (Number(shipping) || 0) + (Number(otherCosts) || 0);
  const extraPerItem = items.length > 0 ? totalExtra / items.length : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    const validItems = items.filter(item => item.sku);
    if (validItems.length === 0) return alert('Adicione pelo menos um filamento');
    const extra = totalExtra / validItems.length;
    const orderData = {
      date: orderDate,
      shipping: Number(shipping) || 0,
      otherCosts: Number(otherCosts) || 0,
      items: validItems.map(item => ({
        sku: item.sku,
        weightGrams: Number(item.weightGrams) || 1000,
        price: (Number(item.price) || 0) + extra
      }))
    };
    if (isEditing && editingOrderId) {
      updateOrder({ ...orderData, id: editingOrderId });
      setSuccessMessage('✓ Pedido atualizado!');
    } else {
      saveOrder(orderData);
      setSuccessMessage('✓ Pedido registrado!');
    }
    setIsEditing(false);
    setEditingOrderId(null);
    setItems([createEmptyItem()]);
    setShipping('');
    setOtherCosts('');
    setOrders(getOrders().reverse());
    setTimeout(() => setSuccessMessage(''), 1000);
  };

  const handleDeleteOrder = (id) => {
    if (confirm('Excluir este pedido? O estoque será recalculado.')) {
      deleteOrder(id);
      setOrders(getOrders().reverse());
    }
  };

  const formatCurrency = (v) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v);
  const formatDate = (dateStr) => {
    try {
      const d = dateStr.includes('T') ? new Date(dateStr) : new Date(dateStr + 'T12:00:00');
      return d.toLocaleDateString();
    } catch { return '-'; }
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
      <h1>{isEditing ? 'Editar Pedido' : 'Entrada de Estoque (Pedidos)'}</h1>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', border: isEditing ? '1px solid var(--primary)' : undefined }}>
        <form onSubmit={handleSubmit}>

          {/* Date */}
          <div style={{ marginBottom: '1.5rem', maxWidth: '240px' }}>
            <label className="form-label">Data da Compra</label>
            <input type="date" className="form-input" value={orderDate}
              onChange={e => setOrderDate(e.target.value)} required />
          </div>

          {/* Filament items */}
          <label className="form-label" style={{ marginBottom: '0.75rem', display: 'block' }}>
            Filamentos Comprados
          </label>

          {items.map((item, index) => {
            const filtered = getFilteredForItem(item);
            return (
              <div key={item._id} style={{
                display: 'grid', gridTemplateColumns: '1fr 130px 140px auto',
                gap: '0.75rem', marginBottom: '0.75rem', alignItems: 'start'
              }}>
                {/* Search */}
                <div style={{ position: 'relative' }}>
                  {index === 0 && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Filamento</div>}
                  <input
                    ref={el => itemInputRefs.current[index] = el}
                    type="text" className="form-input"
                    placeholder="Digite SKU, marca, cor..."
                    value={item.searchTerm}
                    onChange={e => {
                      const v = e.target.value;
                      updateItem(index, {
                        searchTerm: v, showSuggestions: true, highlightedIndex: -1,
                        sku: v ? item.sku : '', selectedFilament: v ? item.selectedFilament : null
                      });
                    }}
                    onFocus={() => updateItem(index, { showSuggestions: true })}
                    onBlur={() => setTimeout(() => updateItem(index, { showSuggestions: false }), 200)}
                    onKeyDown={e => handleItemKeyDown(e, index)}
                  />
                  {item.showSuggestions && item.searchTerm && filtered.length > 0 && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
                      background: '#1f2937', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '0.5rem', marginTop: '0.25rem', maxHeight: '250px',
                      overflowY: 'auto', boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                    }}>
                      {filtered.map((f, fi) => (
                        <div key={f.id} id={`sug-${index}-${fi}`}
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

                {/* Weight */}
                <div>
                  {index === 0 && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Peso (g)</div>}
                  <MaskedNumberInput
                    value={item.weightGrams}
                    onChange={v => updateItem(index, { weightGrams: v })}
                    className="form-input"
                  />
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
            + Adicionar Filamento
          </button>

          {/* Extras + live preview */}
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', alignItems: 'end' }}>
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
              {totalExtra > 0 && (
                <div style={{
                  padding: '0.75rem 1rem', background: 'rgba(0,240,255,0.07)',
                  borderRadius: '0.5rem', border: '1px solid rgba(0,240,255,0.2)'
                }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Extra por filamento</div>
                  <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1.05rem' }}>
                    +{formatCurrency(extraPerItem)}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {formatCurrency(totalExtra)} ÷ {items.length} item{items.length !== 1 ? 's' : ''}
                  </div>
                </div>
              )}
            </div>

            {/* Per-item final price preview */}
            {items.some(i => i.price || totalExtra > 0) && items.some(i => i.sku) && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Preço final por filamento:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {items.filter(i => i.sku).map((item, i) => {
                    const base = Number(item.price) || 0;
                    const final = base + extraPerItem;
                    return (
                      <div key={item._id} style={{
                        background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                        borderRadius: '0.5rem', padding: '0.4rem 0.75rem', fontSize: '0.8rem',
                        display: 'flex', alignItems: 'center', gap: '0.4rem'
                      }}>
                        {item.selectedFilament?.cor && <ColorDot cor={item.selectedFilament.cor} size={8} />}
                        <span style={{ color: 'var(--text-muted)' }}>
                          {item.selectedFilament?.cor || `Item ${i + 1}`}:
                        </span>
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            {isEditing && (
              <button type="button" className="btn btn-secondary" onClick={handleCancelEdit}>
                Cancelar Edição
              </button>
            )}
            <button type="submit" className="btn btn-primary" style={{ minWidth: '200px' }}>
              {isEditing ? 'Salvar Alterações' : 'Registrar Pedido'}
            </button>
          </div>
        </form>
      </div>

      <h2>Histórico de Compras</h2>
      <div className="glass-panel" style={{ marginTop: '1rem' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>SKU</th>
              <th>Marca / Cor</th>
              <th>Categoria</th>
              <th>Peso</th>
              <th>Preço Final</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Nenhum pedido registrado.
                </td>
              </tr>
            ) : (
              orders.map(order => {
                const hasExtras = (order.shipping || 0) > 0 || (order.otherCosts || 0) > 0;
                const itemCount = order.items.length;
                return (
                  <React.Fragment key={order.id}>
                    {order.items.map((orderItem, itemIndex) => {
                      const filament = filaments.find(f => f.sku === orderItem.sku);
                      const isFirst = itemIndex === 0;
                      const isLast = itemIndex === itemCount - 1;
                      return (
                        <tr key={`${order.id}-${itemIndex}`} style={{
                          borderLeft: itemCount > 1 ? '3px solid rgba(0,240,255,0.25)' : '3px solid transparent',
                          borderBottom: isLast ? 'none' : '1px dashed rgba(255,255,255,0.04)'
                        }}>
                          <td style={{ verticalAlign: 'top', paddingTop: '0.85rem' }}>
                            {isFirst ? (
                              <>
                                <div>{formatDate(order.date)}</div>
                                {hasExtras && (
                                  <div style={{ marginTop: '0.3rem', fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                    {(order.shipping || 0) > 0 && <div>Envio: {formatCurrency(order.shipping)}</div>}
                                    {(order.otherCosts || 0) > 0 && <div>Outros: {formatCurrency(order.otherCosts)}</div>}
                                  </div>
                                )}
                              </>
                            ) : null}
                          </td>
                          <td><span className="badge badge-primary">{orderItem.sku}</span></td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {filament?.cor && <ColorDot cor={filament.cor} size={9} />}
                              <div>
                                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: getBrandColor(filament?.marca) }}>
                                  {filament?.marca || '-'}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: filament?.cor ? getColorFromName(filament.cor) : 'var(--text-muted)' }}>
                                  {filament?.cor || '-'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ fontSize: '0.85rem' }}>{filament?.categoria || '-'}</td>
                          <td style={{ fontWeight: 600 }}>
                            {(parseFloat(orderItem.weightGrams) / 1000).toFixed(2).replace('.', ',')}kg
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--success)' }}>
                            {orderItem.price ? formatCurrency(orderItem.price) : '-'}
                          </td>
                          <td>
                            {isFirst ? (
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                                  onClick={() => handleEdit(order)}>Editar</button>
                                <button className="btn btn-danger" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                                  onClick={() => handleDeleteOrder(order.id)}>Excluir</button>
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                    <tr style={{
                      borderLeft: itemCount > 1 ? '3px solid rgba(0,240,255,0.25)' : '3px solid transparent',
                      borderBottom: '2px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.03)'
                    }}>
                      <td></td>
                      <td colSpan="3" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'right', paddingRight: '1rem' }}>
                        Total do pedido ({itemCount} {itemCount === 1 ? 'item' : 'itens'})
                      </td>
                      <td style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                        {(order.items.reduce((acc, i) => acc + (Number(i.weightGrams) || 0), 0) / 1000).toFixed(2).replace('.', ',')}kg
                      </td>
                      <td style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary)' }}>
                        {formatCurrency(order.items.reduce((acc, i) => acc + (Number(i.price) || 0), 0))}
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
