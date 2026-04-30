import React, { useState, useEffect, useRef } from 'react';
import { getFilaments, saveOrder, getOrders, deleteOrder } from '../services/storage';

const Orders = () => {
  const [filaments, setFilaments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedFilament, setSelectedFilament] = useState(null);
  const searchInputRef = useRef(null);

  const initialFormState = {
    date: new Date().toISOString().split('T')[0],
    sku: '',
    weightGrams: 1000,
    price: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    setFilaments(getFilaments());
    setOrders(getOrders().reverse());
  }, []);

  const filteredFilaments = filaments.filter(f => {
    const search = searchTerm.toLowerCase();
    return (
      f.sku.toLowerCase().includes(search) ||
      f.marca.toLowerCase().includes(search) ||
      f.cor.toLowerCase().includes(search) ||
      f.categoria.toLowerCase().includes(search)
    );
  });

  const handleSelectFilament = (filament) => {
    setSelectedFilament(filament);
    setSearchTerm(`${filament.marca} - ${filament.cor} (${filament.sku})`);
    setFormData({ ...formData, sku: filament.sku });
    setShowSuggestions(false);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowSuggestions(true);
    if (!value) {
      setSelectedFilament(null);
      setFormData({ ...formData, sku: '' });
    }
  };

  const handleDeleteOrder = (id) => {
    if (confirm('Excluir este pedido? O estoque será recalculado.')) {
      deleteOrder(id);
      setOrders(getOrders().reverse());
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.sku) return alert('Selecione um filamento');

    saveOrder({
      date: formData.date,
      items: [{
        sku: formData.sku,
        weightGrams: Number(formData.weightGrams),
        price: Number(formData.price)
      }]
    });

    // Keep the date, reset only filament-related fields
    setFormData({
      ...formData,
      sku: '',
      weightGrams: 1000,
      price: ''
    });
    setSearchTerm('');
    setSelectedFilament(null);
    setOrders(getOrders().reverse());
    alert('Pedido registrado com sucesso!');

    // Focus search input after submit
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 0);
  };

  return (
    <div className="animate-fade-in">
      <h1>Entrada de Estoque (Pedidos)</h1>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <form onSubmit={handleSubmit}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Data da Compra</label>
              <input
                type="date"
                className="form-input"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Filamento Comprado</label>
              <div style={{ position: 'relative' }}>
                <input
                  ref={searchInputRef}
                  type="text"
                  className="form-input"
                  placeholder="Digite SKU, marca, cor ou categoria..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  required
                />
                {showSuggestions && searchTerm && filteredFilaments.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                    background: '#1f2937',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.5rem',
                    marginTop: '0.25rem',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                  }}>
                    {filteredFilaments.map(f => (
                      <div
                        key={f.id}
                        onClick={() => handleSelectFilament(f)}
                        style={{
                          padding: '0.75rem 1rem',
                          cursor: 'pointer',
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.background = 'rgba(59, 130, 246, 0.1)'}
                        onMouseLeave={(e) => e.target.style.background = 'transparent'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>{f.sku}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{f.marca} - {f.cor}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{f.categoria}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {showSuggestions && searchTerm && filteredFilaments.length === 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                    background: '#1f2937',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.5rem',
                    marginTop: '0.25rem',
                    padding: '1rem',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                  }}>
                    Nenhum filamento encontrado
                  </div>
                )}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Quantidade (Gramas)</label>
              <input
                type="number"
                className="form-input"
                value={formData.weightGrams}
                onChange={e => setFormData({ ...formData, weightGrams: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Preço Pago (Opcional)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>€</span>
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2rem' }}
                  placeholder="0,00"
                  value={formData.price}
                  onChange={e => {
                    const value = e.target.value.replace(',', '.');
                    if (value === '' || !isNaN(value)) {
                      setFormData({ ...formData, price: value });
                    }
                  }}
                  onKeyDown={e => {
                    // Allow: backspace, delete, tab, escape, enter, decimal point and comma
                    if ([46, 8, 9, 27, 13, 110, 188, 190].indexOf(e.keyCode) !== -1 ||
                      // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
                      (e.keyCode === 65 && e.ctrlKey === true) ||
                      (e.keyCode === 67 && e.ctrlKey === true) ||
                      (e.keyCode === 86 && e.ctrlKey === true) ||
                      (e.keyCode === 88 && e.ctrlKey === true) ||
                      // Allow: home, end, left, right
                      (e.keyCode >= 35 && e.keyCode <= 39)) {
                      return;
                    }
                    // Ensure that it is a number and stop the keypress if not
                    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
                      e.preventDefault();
                    }
                  }}
                />
              </div>
            </div>
          </div>
          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" style={{ minWidth: '200px' }}>
              Registrar Compra
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
              <th>Marca</th>
              <th>Categoria</th>
              <th>Cor</th>
              <th>Qtd Adquirida</th>
              <th>Preço</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Nenhum pedido registrado.
                </td>
              </tr>
            ) : (
              orders.map(order => {
                const filament = filaments.find(f => f.sku === order.items[0].sku);
                return (
                  <tr key={order.id}>
                    <td>{(() => {
                      try {
                        const d = order.date.includes('T') ? new Date(order.date) : new Date(order.date + 'T12:00:00');
                        return d.toLocaleDateString();
                      } catch (e) {
                        return 'Data Inválida';
                      }
                    })()}</td>
                    <td><span className="badge badge-primary">{order.items[0].sku}</span></td>
                    <td style={{ fontWeight: 600 }}>{filament?.marca || '-'}</td>
                    <td>{filament?.categoria || '-'}</td>
                    <td>{filament?.cor || '-'}</td>
                    <td style={{ fontWeight: 600 }}>{(parseFloat(order.items[0].weightGrams) / 1000).toFixed(2).replace('.', ',')}kg</td>
                    <td>{order.items[0].price ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(order.items[0].price) : '-'}</td>
                    <td>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                        onClick={() => handleDeleteOrder(order.id)}
                      >Excluir</button>
                    </td>
                  </tr>
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
