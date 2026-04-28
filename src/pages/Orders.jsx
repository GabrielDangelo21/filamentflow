import React, { useState, useEffect } from 'react';
import { getFilaments, saveOrder, getOrders } from '../services/storage';

const Orders = () => {
  const [filaments, setFilaments] = useState([]);
  const [orders, setOrders] = useState([]);
  
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
    
    setFormData(initialFormState);
    setOrders(getOrders().reverse());
    alert('Pedido registrado com sucesso!');
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
                onChange={e => setFormData({...formData, date: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Filamento Comprado</label>
              <select 
                className="form-select"
                value={formData.sku}
                onChange={e => setFormData({...formData, sku: e.target.value})}
                required
              >
                <option value="">Selecione um filamento...</option>
                {filaments.map(f => (
                  <option key={f.id} value={f.sku}>{f.marca} - {f.cor} ({f.sku})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Quantidade (Gramas)</label>
              <input 
                type="number"
                className="form-input" 
                value={formData.weightGrams}
                onChange={e => setFormData({...formData, weightGrams: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Preço Pago (Opcional)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>€</span>
                <input 
                  type="number"
                  className="form-input" 
                  style={{ paddingLeft: '2rem' }}
                  placeholder="0,00"
                  value={formData.price}
                  onChange={e => setFormData({...formData, price: e.target.value})}
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
              <th>Filamento</th>
              <th>Qtd Adquirida</th>
              <th>Preço</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Nenhum pedido registrado.
                </td>
              </tr>
            ) : (
              orders.map(order => (
                <tr key={order.id}>
                  <td>{(() => {
                    try {
                      const d = order.date.includes('T') ? new Date(order.date) : new Date(order.date + 'T12:00:00');
                      return d.toLocaleDateString();
                    } catch (e) {
                      return 'Data Inválida';
                    }
                  })()}</td>
                  <td><span className="badge badge-outline">{order.items[0].sku}</span></td>
                  <td style={{ fontWeight: 600 }}>{order.items[0].weightGrams}g</td>
                  <td>{order.items[0].price ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(order.items[0].price) : '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Orders;
