import React, { useState, useEffect, useRef } from 'react';
import { getAccessories, saveAccessory, deleteAccessory, getAccCategories, saveAccCategory, deleteAccCategory, saveAllAccCategories } from '../services/storage';
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

const Accessories = () => {
  const [accessories, setAccessories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const nameInputRef = useRef(null);

  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [nameHighlightedIndex, setNameHighlightedIndex] = useState(-1);
  const [showStoreSuggestions, setShowStoreSuggestions] = useState(false);
  const [storeHighlightedIndex, setStoreHighlightedIndex] = useState(-1);

  const initialForm = {
    id: null, name: '', category: '', quantity: 1,
    price: '', date: new Date().toISOString().split('T')[0], store: ''
  };
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    loadData();
    const cats = getAccCategories();
    setCategories(cats);
    setFormData(prev => ({ ...prev, category: cats[0] || '' }));
  }, []);

  const loadData = () => setAccessories(getAccessories().reverse());

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    saveAccessory({
      ...formData,
      quantity: Number(formData.quantity) || 1,
      price: formData.price !== '' ? Number(String(formData.price).replace(',', '.')) : null
    });
    setFormData(prev => ({ ...initialForm, category: prev.category, date: prev.date }));
    setIsEditing(false);
    loadData();
    setTimeout(() => { if (nameInputRef.current) nameInputRef.current.focus(); }, 0);
  };

  const handleEdit = (item) => {
    setFormData({ ...item, price: item.price != null ? item.price : '' });
    setIsEditing(true);
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setFormData(prev => ({ ...initialForm, category: prev.category, date: prev.date }));
    setIsEditing(false);
  };

  const handleAddCategory = (name) => {
    saveAccCategory(name);
    const updated = getAccCategories();
    setCategories(updated);
  };

  const handleDeleteCategory = (name) => {
    if (!confirm(`Excluir categoria "${name}"?`)) return;
    deleteAccCategory(name);
    const updated = getAccCategories();
    setCategories(updated);
    if (formData.category === name) setFormData(prev => ({ ...prev, category: updated[0] || '' }));
  };

  const getFilteredNames = () => {
    const typed = formData.name.toLowerCase();
    if (!typed) return [];
    return [...new Set(accessories.map(a => a.name).filter(Boolean))]
      .filter(n => n.toLowerCase().includes(typed) && n !== formData.name)
      .slice(0, 8);
  };

  const getFilteredStores = () => {
    const typed = formData.store.toLowerCase();
    if (!typed) return [];
    return [...new Set(accessories.map(a => a.store).filter(Boolean))]
      .filter(s => s.toLowerCase().includes(typed) && s !== formData.store)
      .slice(0, 8);
  };

  const handleNameKeyDown = (e) => {
    const filtered = getFilteredNames();
    if (!showNameSuggestions || filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setNameHighlightedIndex(prev => {
        const next = Math.min(prev + 1, filtered.length - 1);
        setTimeout(() => document.getElementById(`name-sug-${next}`)?.scrollIntoView({ block: 'nearest' }), 0);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setNameHighlightedIndex(prev => {
        const next = Math.max(prev - 1, 0);
        setTimeout(() => document.getElementById(`name-sug-${next}`)?.scrollIntoView({ block: 'nearest' }), 0);
        return next;
      });
    } else if (e.key === 'Enter' && nameHighlightedIndex >= 0) {
      e.preventDefault();
      setFormData({ ...formData, name: filtered[nameHighlightedIndex] });
      setShowNameSuggestions(false);
      setNameHighlightedIndex(-1);
    } else if (e.key === 'Escape') {
      setShowNameSuggestions(false);
      setNameHighlightedIndex(-1);
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
      setFormData({ ...formData, store: filtered[storeHighlightedIndex] });
      setShowStoreSuggestions(false);
      setStoreHighlightedIndex(-1);
    } else if (e.key === 'Escape') {
      setShowStoreSuggestions(false);
      setStoreHighlightedIndex(-1);
    }
  };

  const handleReorderCategories = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= categories.length) return;
    const arr = [...categories];
    const [moved] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, moved);
    saveAllAccCategories(arr);
    setCategories(arr);
  };

  const totalItems = accessories.length;
  const totalInvested = accessories.reduce((acc, i) => acc + (i.price != null ? Number(i.price) : 0), 0);
  const totalQty = accessories.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);

  const plusBtnStyle = {
    background: 'var(--accent)', color: '#000', border: 'none', borderRadius: '50%',
    width: '22px', height: '22px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1
  };

  return (
    <div className="animate-fade-in">
      <h1>{isEditing ? 'Editar Acessório' : 'Acessórios & Equipamentos'}</h1>

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
          <p style={{ fontSize: '2rem', fontWeight: 700 }}>{totalItems}</p>
        </div>
        <div className="glass-panel stat-card" style={{ padding: '1.5rem', borderLeft: '4px solid #10B981' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>QUANTIDADE TOTAL</p>
          <p style={{ fontSize: '2rem', fontWeight: 700 }}>{totalQty}</p>
        </div>
        <div className="glass-panel stat-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--success)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>INVESTIMENTO TOTAL</p>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>
            € {totalInvested.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', border: isEditing ? '1px solid var(--primary)' : undefined }}>
        <form onSubmit={handleSubmit}>
          <div className="grid-2" style={{ marginBottom: '1rem' }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Nome do Acessório</label>
              <div style={{ position: 'relative' }}>
                <input
                  ref={nameInputRef}
                  type="text"
                  className="form-input"
                  placeholder="Ex: Placa de impressão, Dissecante, Alicate de bico..."
                  value={formData.name}
                  onChange={e => { setFormData({ ...formData, name: e.target.value }); setShowNameSuggestions(true); setNameHighlightedIndex(-1); }}
                  onFocus={() => setShowNameSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowNameSuggestions(false), 200)}
                  onKeyDown={handleNameKeyDown}
                  required
                />
                {showNameSuggestions && (() => {
                  const filtered = getFilteredNames();
                  if (!filtered.length) return null;
                  return (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
                      background: '#1f2937', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '0.5rem', marginTop: '0.25rem', maxHeight: '220px',
                      overflowY: 'auto', boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                    }}>
                      {filtered.map((name, i) => (
                        <div key={i} id={`name-sug-${i}`}
                          onMouseDown={() => { setFormData({ ...formData, name }); setShowNameSuggestions(false); setNameHighlightedIndex(-1); }}
                          style={{
                            padding: '0.7rem 1rem', cursor: 'pointer', fontSize: '0.9rem',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            background: i === nameHighlightedIndex ? 'rgba(59,130,246,0.25)' : 'transparent'
                          }}>
                          {name}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Categoria
                <button type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); setModalOpen(true); }} style={plusBtnStyle}>+</button>
              </label>
              <select className="form-select" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Data da Compra</label>
              <input type="date" className="form-input" value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Quantidade</label>
              <input type="number" className="form-input" min="1" value={formData.quantity}
                onChange={e => setFormData({ ...formData, quantity: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Preço Pago (Opcional)</label>
              <MaskedNumberInput
                value={formData.price}
                onChange={v => setFormData({ ...formData, price: v })}
                prefix="€"
                className="form-input"
              />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Onde foi Comprado (Opcional)</label>
              <div style={{ position: 'relative' }}>
                <input type="text" className="form-input"
                  placeholder="Ex: Bol, Amazon, Aliexpress, Bambu Lab..."
                  value={formData.store}
                  onChange={e => { setFormData({ ...formData, store: e.target.value }); setShowStoreSuggestions(true); setStoreHighlightedIndex(-1); }}
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
                      borderRadius: '0.5rem', marginTop: '0.25rem', maxHeight: '220px',
                      overflowY: 'auto', boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                    }}>
                      {filtered.map((store, i) => (
                        <div key={i} id={`store-sug-${i}`}
                          onMouseDown={() => { setFormData({ ...formData, store }); setShowStoreSuggestions(false); setStoreHighlightedIndex(-1); }}
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
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
            {isEditing && (
              <button type="button" className="btn btn-secondary" onClick={handleCancelEdit}>
                Cancelar Edição
              </button>
            )}
            <button type="submit" className="btn btn-primary" style={{ minWidth: '200px' }}>
              {isEditing ? 'Salvar Alterações' : 'Registar Acessório'}
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
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
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {accessories.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  Nenhum acessório registado ainda.
                </td>
              </tr>
            ) : (
              accessories.map(item => (
                <tr key={item.id}>
                  <td>{(() => {
                    try {
                      const d = item.date?.includes('T') ? new Date(item.date) : new Date(item.date + 'T12:00:00');
                      return d.toLocaleDateString();
                    } catch { return '-'; }
                  })()}</td>
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
                      ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(item.price)
                      : <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>—</span>}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '200px' }}>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.store || '—'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                        onClick={() => handleEdit(item)}>Editar</button>
                      <button className="btn btn-danger" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                        onClick={() => { if (confirm('Excluir este acessório?')) { deleteAccessory(item.id); loadData(); } }}>Excluir</button>
                    </div>
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
