import React, { useState, useEffect } from 'react';
import { getFilaments, savePrint, getPrints, deletePrint } from '../services/storage';

const Prints = () => {
  const [filaments, setFilaments] = useState([]);
  const [prints, setPrints] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [viewingPrint, setViewingPrint] = useState(null); // Para o Modal de Detalhes
  const [successMessage, setSuccessMessage] = useState(''); // Para mensagem de sucesso

  const initialFormState = {
    date: new Date().toISOString().split('T')[0],
    description: '',
    timeMinutes: '',
    colors: 1,
    weightGrams: '',
    id: null
  };

  const [formData, setFormData] = useState(initialFormState);
  const [usedFilaments, setUsedFilaments] = useState([
    { sku: '', weightGrams: '' }
  ]);

  useEffect(() => {
    setFilaments(getFilaments());
    setPrints(getPrints().reverse());
  }, []);

  useEffect(() => {
    const numCores = parseInt(formData.colors) || 1;
    if (numCores !== usedFilaments.length) {
      const newUsed = [...usedFilaments];
      if (numCores > usedFilaments.length) {
        for (let i = usedFilaments.length; i < numCores; i++) {
          newUsed.push({ sku: '', weightGrams: '' });
        }
      } else {
        newUsed.splice(numCores);
      }
      setUsedFilaments(newUsed);
    }
  }, [formData.colors]);

  const handleFilamentChange = (index, field, value) => {
    const newUsed = [...usedFilaments];
    newUsed[index][field] = value;
    setUsedFilaments(newUsed);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (usedFilaments.some(f => !f.sku || !f.weightGrams)) {
      setSuccessMessage('Preencha o filamento e o peso para todas as cores');
      setTimeout(() => setSuccessMessage(''), 3000);
      return;
    }

    const totalWeight = usedFilaments.reduce((acc, f) => acc + Number(f.weightGrams), 0);

    savePrint({
      id: formData.id,
      date: formData.date,
      description: formData.description,
      timeMinutes: Number(formData.timeMinutes),
      totalWeight: totalWeight,
      colors: Number(formData.colors),
      filamentsUsed: usedFilaments.map(f => ({
        sku: f.sku,
        weightGrams: Number(f.weightGrams)
      }))
    });

    // Mostrar mensagem de sucesso por 1 segundo
    setSuccessMessage(isEditing ? '✓ Impressão atualizada!' : '✓ Impressão registrada!');
    setTimeout(() => setSuccessMessage(''), 1000);

    resetForm();
    loadData();
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setUsedFilaments([{ sku: '', weightGrams: '' }]);
    setIsEditing(false);
  };

  const loadData = () => {
    setPrints(getPrints().reverse());
  };

  const handleEdit = (print) => {
    setIsEditing(true);
    setFormData({
      id: print.id,
      date: print.date,
      description: print.description || '',
      timeMinutes: print.timeMinutes,
      colors: print.colors,
      weightGrams: print.totalWeight
    });
    setUsedFilaments(print.filamentsUsed);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id) => {
    if (confirm('Tem certeza que deseja excluir esta impressão? O estoque será recalculado.')) {
      deletePrint(id);
      loadData();
    }
  };

  // Função para buscar dados completos de um filamento via SKU
  const getFilamentInfo = (sku) => {
    return filaments.find(f => f.sku === sku) || { marca: 'N/A', cor: 'N/A', categoria: 'N/A' };
  };

  return (
    <div className="animate-fade-in">
      {successMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: successMessage.includes('✓') ? 'var(--primary)' : '#EF4444',
          color: 'white',
          padding: '1rem 1.5rem',
          borderRadius: '0.5rem',
          zIndex: 10000,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          animation: 'slideIn 0.3s ease-out',
          fontSize: '0.95rem',
          fontWeight: 600
        }}>
          {successMessage}
        </div>
      )}
      <h1>{isEditing ? 'Editar Impressão' : 'Registro de Impressões'}</h1>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', border: isEditing ? '1px solid var(--primary)' : '1px solid var(--card-border)' }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Nome/Descrição da Impressão</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: Miniatura para RPG, Case de AirPods..."
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid-3" style={{ marginBottom: '2rem' }}>
            <div className="form-group">
              <label className="form-label">Data da Impressão</label>
              <input
                type="date"
                className="form-input"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tempo Gasto (Minutos)</label>
              <input
                type="number"
                className="form-input"
                placeholder="Ex: 120"
                value={formData.timeMinutes}
                onChange={e => setFormData({ ...formData, timeMinutes: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Quantidade de Cores</label>
              <input
                type="number"
                className="form-input"
                value={formData.colors}
                onChange={e => setFormData({ ...formData, colors: e.target.value })}
                min="1"
                max="16"
                required
              />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: 'var(--primary)' }}>
              Detalhamento de Filamentos ({formData.colors} {formData.colors == 1 ? 'cor' : 'cores'})
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {usedFilaments.map((item, index) => (
                <div key={index} className="grid-2" style={{
                  background: 'rgba(255,255,255,0.02)',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--card-border)'
                }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Filamento da Cor {index + 1}</label>
                    <select
                      className="form-select"
                      value={item.sku}
                      onChange={e => handleFilamentChange(index, 'sku', e.target.value)}
                      required
                    >
                      <option value="">Selecione o filamento...</option>
                      {filaments.map(f => (
                        <option key={f.id} value={f.sku}>{f.marca} - {f.cor} ({f.sku})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Peso Gasto (Gramas)</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="Peso nesta cor"
                      value={item.weightGrams}
                      onChange={e => handleFilamentChange(index, 'weightGrams', e.target.value)}
                      required
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            {isEditing && (
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Cancelar Edição
              </button>
            )}
            <button type="submit" className="btn btn-primary" style={{ minWidth: '200px' }}>
              {isEditing ? 'Salvar Alterações' : 'Registrar Impressão'}
            </button>
          </div>
        </form>
      </div>

      <h2>Histórico de Impressões</h2>
      <div className="glass-panel" style={{ marginTop: '1rem' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Descrição</th>
              <th>Cores</th>
              <th>Peso Total</th>
              <th>Tempo</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {prints.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Nenhuma impressão registrada.
                </td>
              </tr>
            ) : (
              prints.map(print => (
                <tr key={print.id}>
                  <td>{(() => {
                    try {
                      const d = print.date.includes('T') ? new Date(print.date) : new Date(print.date + 'T12:00:00');
                      return d.toLocaleDateString();
                    } catch (e) {
                      return 'Data Inválida';
                    }
                  })()}</td>
                  <td style={{ fontWeight: 500, color: print.description ? 'var(--text-main)' : 'var(--text-muted)' }}>
                    {print.description || '-'}
                  </td>
                  <td><span className="badge badge-outline">{print.colors}</span></td>
                  <td style={{ fontWeight: 600 }}>{print.totalWeight}g</td>
                  <td>{print.timeMinutes} min</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'rgba(0, 240, 255, 0.1)', color: 'var(--primary)' }}
                        onClick={() => setViewingPrint(print)}
                      >
                        Ver Detalhes
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                        onClick={() => handleEdit(print)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                        onClick={() => handleDelete(print.id)}
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Detalhes da Impressão */}
      {viewingPrint && (
        <div className="modal-overlay" onClick={() => setViewingPrint(null)}>
          <div className="modal-content glass-panel" style={{ padding: '2.5rem' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ margin: 0 }}>Detalhes da Impressão</h2>
              <button className="btn btn-secondary" onClick={() => setViewingPrint(null)} style={{ padding: '0.5rem' }}>✕</button>
            </div>

            <div className="grid-2" style={{ marginBottom: '2rem' }}>
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Data</p>
                <p style={{ fontWeight: 600 }}>{new Date(viewingPrint.date + 'T12:00:00').toLocaleDateString()}</p>
              </div>
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Tempo Total</p>
                <p style={{ fontWeight: 600 }}>{viewingPrint.timeMinutes} minutos</p>
              </div>
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Cores Usadas</p>
                <p style={{ fontWeight: 600 }}>{viewingPrint.colors}</p>
              </div>
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Peso Total da Peça</p>
                <p style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1.2rem' }}>{viewingPrint.totalWeight}g</p>
              </div>
            </div>

            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderTop: '1px solid var(--card-border)', paddingTop: '1.5rem' }}>
              Filamentos Consumidos
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {viewingPrint.filamentsUsed.map((f, idx) => {
                const info = getFilamentInfo(f.sku);
                return (
                  <div key={idx} style={{
                    background: 'rgba(255,255,255,0.03)',
                    padding: '1rem',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border: '1px solid var(--card-border)'
                  }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{info.marca} - {info.cor}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>SKU: {f.sku} | {info.categoria}</div>
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                      {f.weightGrams}g
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => setViewingPrint(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Prints;
