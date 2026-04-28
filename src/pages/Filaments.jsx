import React, { useState, useEffect } from 'react';
import { getFilaments, saveFilament, deleteFilament, getAllFilamentsWithStock, getCategories, saveCategory, deleteCategory, saveAllCategories, getBrands, saveBrand, deleteBrand, saveAllBrands } from '../services/storage';

/* ── Reusable List Manager Modal ── */
const ListManagerModal = ({ title, items, onAdd, onDelete, onReorder, onClose }) => {
  const [newItem, setNewItem] = useState('');

  const handleAdd = () => {
    if (!newItem.trim()) return;
    onAdd(newItem.trim());
    setNewItem('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)'
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#111827', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '1rem', padding: '1.5rem', width: '100%', maxWidth: '420px',
        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.7)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{title}</h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text-muted)',
            fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1
          }}>✕</button>
        </div>

        {/* Add new */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            className="form-input"
            placeholder="Adicionar novo..."
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" onClick={handleAdd} style={{ padding: '0.5rem 1rem' }}>Adicionar</button>
        </div>

        {/* Items list */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {items.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>Nenhum item cadastrado.</p>
          ) : (
            items.map((item, index) => (
              <div key={item} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.6rem 0.8rem', borderRadius: '0.5rem',
                background: index % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent',
                marginBottom: '2px'
              }}>
                {/* Reorder buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <button
                    onClick={() => onReorder(index, index - 1)}
                    disabled={index === 0}
                    style={{
                      background: 'none', border: 'none', cursor: index === 0 ? 'default' : 'pointer',
                      color: index === 0 ? 'var(--border)' : 'var(--text-muted)',
                      fontSize: '0.7rem', padding: '0', lineHeight: 1
                    }}
                  >▲</button>
                  <button
                    onClick={() => onReorder(index, index + 1)}
                    disabled={index === items.length - 1}
                    style={{
                      background: 'none', border: 'none', cursor: index === items.length - 1 ? 'default' : 'pointer',
                      color: index === items.length - 1 ? 'var(--border)' : 'var(--text-muted)',
                      fontSize: '0.7rem', padding: '0', lineHeight: 1
                    }}
                  >▼</button>
                </div>

                {/* Item name */}
                <span style={{ flex: 1, fontSize: '0.95rem' }}>{item}</span>

                {/* Delete */}
                <button
                  onClick={() => onDelete(item)}
                  style={{
                    background: 'rgba(255,75,75,0.15)', color: 'var(--danger)',
                    border: '1px solid rgba(255,75,75,0.3)', borderRadius: '0.4rem',
                    padding: '0.25rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer'
                  }}
                >Excluir</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Main Component ── */
const Filaments = () => {
  const [filaments, setFilaments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [formData, setFormData] = useState({ marca: '', sku: '', cor: '', categoria: '', tipo: 'Carretel' });
  const [modalOpen, setModalOpen] = useState(null); // 'brands' | 'categories' | null

  useEffect(() => {
    loadFilaments();
    const loadedCats = getCategories();
    const loadedBrands = getBrands();
    setCategories(loadedCats);
    setBrands(loadedBrands);
    setFormData(prev => ({
      ...prev,
      categoria: loadedCats[0] || '',
      marca: loadedBrands[0] || ''
    }));
  }, []);

  const loadFilaments = () => {
    const all = getAllFilamentsWithStock();
    all.sort((a, b) => {
      const numA = Number(a.sku);
      const numB = Number(b.sku);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return (a.sku || '').localeCompare(b.sku || '', undefined, { numeric: true });
    });
    setFilaments(all);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.sku) return alert('O SKU é obrigatório');
    saveFilament({
      ...formData,
      marca: formData.marca || 'NÃO ESPECIFICADO',
      cor: formData.cor || 'NÃO ESPECIFICADO'
    });
    setFormData(prev => ({ ...prev, sku: '', cor: '' }));
    loadFilaments();
  };

  // ── Brand modal handlers ──
  const handleAddBrand = (name) => {
    saveBrand(name);
    const updated = getBrands();
    setBrands(updated);
    setFormData(prev => ({ ...prev, marca: prev.marca || updated[0] || '' }));
  };

  const handleDeleteBrand = (name) => {
    if (!confirm(`Excluir marca "${name}"?`)) return;
    deleteBrand(name);
    const updated = getBrands();
    setBrands(updated);
    if (formData.marca === name) setFormData(prev => ({ ...prev, marca: updated[0] || '' }));
  };

  const handleReorderBrands = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= brands.length) return;
    const arr = [...brands];
    const [moved] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, moved);
    saveAllBrands(arr);
    setBrands(arr);
  };

  // ── Category modal handlers ──
  const handleAddCategory = (name) => {
    saveCategory(name);
    const updated = getCategories();
    setCategories(updated);
    setFormData(prev => ({ ...prev, categoria: prev.categoria || updated[0] || '' }));
  };

  const handleDeleteCategory = (name) => {
    if (!confirm(`Excluir categoria "${name}"?`)) return;
    deleteCategory(name);
    const updated = getCategories();
    setCategories(updated);
    if (formData.categoria === name) setFormData(prev => ({ ...prev, categoria: updated[0] || '' }));
  };

  const handleReorderCategories = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= categories.length) return;
    const arr = [...categories];
    const [moved] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, moved);
    saveAllCategories(arr);
    setCategories(arr);
  };

  // ── Plus button style ──
  const plusBtnStyle = {
    background: 'var(--accent)', color: '#000', border: 'none', borderRadius: '50%',
    width: '22px', height: '22px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1
  };

  return (
    <div className="animate-fade-in">
      <h1>Gestão de Filamentos</h1>

      {/* Modals */}
      {modalOpen === 'brands' && (
        <ListManagerModal
          title="Gerenciar Marcas"
          items={brands}
          onAdd={handleAddBrand}
          onDelete={handleDeleteBrand}
          onReorder={handleReorderBrands}
          onClose={() => setModalOpen(null)}
        />
      )}
      {modalOpen === 'categories' && (
        <ListManagerModal
          title="Gerenciar Categorias"
          items={categories}
          onAdd={handleAddCategory}
          onDelete={handleDeleteCategory}
          onReorder={handleReorderCategories}
          onClose={() => setModalOpen(null)}
        />
      )}

      {/* Filament Form */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <form onSubmit={handleSubmit} className="grid-3">
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Marca
              <button type="button" onClick={() => setModalOpen('brands')} style={plusBtnStyle}>+</button>
            </label>
            <select
              className="form-select"
              value={formData.marca}
              onChange={e => setFormData({ ...formData, marca: e.target.value })}
            >
              {brands.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">SKU (Código Único)</label>
            <input
              className="form-input"
              placeholder="Ex: SL-PLA-BLK-SPOOL"
              value={formData.sku}
              onChange={e => setFormData({ ...formData, sku: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Cor</label>
            <input
              className="form-input"
              placeholder="Ex: Preto, Azul Neon"
              value={formData.cor}
              onChange={e => setFormData({ ...formData, cor: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Categoria
              <button type="button" onClick={() => setModalOpen('categories')} style={plusBtnStyle}>+</button>
            </label>
            <select
              className="form-select"
              value={formData.categoria}
              onChange={e => setFormData({ ...formData, categoria: e.target.value })}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Tipo</label>
            <select
              className="form-select"
              value={formData.tipo}
              onChange={e => setFormData({ ...formData, tipo: e.target.value })}
            >
              <option value="Carretel">Carretel (Spool)</option>
              <option value="Refil">Refil (Sem carretel)</option>
            </select>
          </div>
          <div className="form-group" style={{ justifyContent: 'flex-end', marginBottom: 0 }}>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Cadastrar Filamento</button>
          </div>
        </form>
      </div>

      {/* Filaments Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Marca</th>
              <th>Categoria</th>
              <th>Cor</th>
              <th>Estoque</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filaments.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Nenhum filamento cadastrado ainda.</td>
              </tr>
            ) : (
              filaments.map(f => (
                <tr key={f.id}>
                  <td><span className="badge badge-primary">{f.sku}</span></td>
                  <td style={{ fontWeight: 600 }}>{f.marca}</td>
                  <td>{f.categoria}</td>
                  <td>{f.cor}</td>
                  <td style={{ fontWeight: 600, color: f.currentStock > 0 ? 'var(--success)' : 'var(--danger)' }}>{f.currentStock}g</td>
                  <td>
                    <button
                      className="btn btn-danger"
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                      onClick={() => { if (confirm('Excluir?')) { deleteFilament(f.id); loadFilaments(); } }}
                    >Excluir</button>
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

export default Filaments;
