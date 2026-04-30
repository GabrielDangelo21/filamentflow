import React, { useState, useEffect } from 'react';
import { getAllFilamentsWithStock, savePrint, getPrints, deletePrint, getFilaments } from '../services/storage';

const Prints = () => {
  const [filaments, setFilaments] = useState([]);
  const [allFilaments, setAllFilaments] = useState([]);
  const [prints, setPrints] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [viewingPrintIdx, setViewingPrintIdx] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const initialFormState = {
    date: new Date().toISOString().split('T')[0],
    description: '',
    timeMinutes: '',
    colors: 1,
    weightGrams: '',
    id: null
  };

  const [formData, setFormData] = useState(initialFormState);
  const [usedFilaments, setUsedFilaments] = useState([{ sku: '', weightGrams: '' }]);
  const [searchTerms, setSearchTerms] = useState(['']);
  const [showSuggestions, setShowSuggestions] = useState([false]);

  useEffect(() => {
    const withStock = getAllFilamentsWithStock().filter(f => (f.currentStock || 0) > 0);
    withStock.sort((a, b) => a.marca.localeCompare(b.marca) || a.cor.localeCompare(b.cor));
    setFilaments(withStock);
    setAllFilaments(getFilaments());
    setPrints(getPrints().reverse());
  }, []);

  useEffect(() => {
    const numCores = parseInt(formData.colors) || 1;
    if (numCores !== usedFilaments.length) {
      const newUsed = [...usedFilaments];
      const newTerms = [...searchTerms];
      const newShow = [...showSuggestions];
      if (numCores > usedFilaments.length) {
        for (let i = usedFilaments.length; i < numCores; i++) {
          newUsed.push({ sku: '', weightGrams: '' });
          newTerms.push('');
          newShow.push(false);
        }
      } else {
        newUsed.splice(numCores);
        newTerms.splice(numCores);
        newShow.splice(numCores);
      }
      setUsedFilaments(newUsed);
      setSearchTerms(newTerms);
      setShowSuggestions(newShow);
    }
  }, [formData.colors]);

  const handleFilamentChange = (index, field, value) => {
    const newUsed = [...usedFilaments];
    newUsed[index][field] = value;
    setUsedFilaments(newUsed);
  };

  const handleSelectFilamentForSlot = (index, filament) => {
    const newUsed = [...usedFilaments];
    newUsed[index].sku = filament.sku;
    setUsedFilaments(newUsed);
    const newTerms = [...searchTerms];
    newTerms[index] = `${filament.marca} - ${filament.cor} (${filament.sku})`;
    setSearchTerms(newTerms);
    const newShow = [...showSuggestions];
    newShow[index] = false;
    setShowSuggestions(newShow);
  };

  const handleSearchChangeForSlot = (index, value) => {
    const newTerms = [...searchTerms];
    newTerms[index] = value;
    setSearchTerms(newTerms);
    const newShow = [...showSuggestions];
    newShow[index] = true;
    setShowSuggestions(newShow);
    if (!value) {
      const newUsed = [...usedFilaments];
      newUsed[index].sku = '';
      setUsedFilaments(newUsed);
    }
  };

  const setShowForSlot = (index, value) => {
    const newShow = [...showSuggestions];
    newShow[index] = value;
    setShowSuggestions(newShow);
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

    setSuccessMessage(isEditing ? '✓ Impressão atualizada!' : '✓ Impressão registrada!');
    setTimeout(() => setSuccessMessage(''), 1000);

    resetForm();
    loadData();
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setUsedFilaments([{ sku: '', weightGrams: '' }]);
    setSearchTerms(['']);
    setShowSuggestions([false]);
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
    const terms = print.filamentsUsed.map(f => {
      const info = allFilaments.find(fil => fil.sku === f.sku) || filaments.find(fil => fil.sku === f.sku);
      return info ? `${info.marca} - ${info.cor} (${f.sku})` : f.sku;
    });
    setSearchTerms(terms);
    setShowSuggestions(print.filamentsUsed.map(() => false));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id) => {
    if (confirm('Tem certeza que deseja excluir esta impressão? O estoque será recalculado.')) {
      deletePrint(id);
      loadData();
    }
  };

  const getFilamentInfo = (sku) => {
    return allFilaments.find(f => f.sku === sku) || filaments.find(f => f.sku === sku) || { marca: 'N/A', cor: 'N/A', categoria: 'N/A' };
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
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Digite SKU, marca, cor ou categoria..."
                        value={searchTerms[index] || ''}
                        onChange={e => handleSearchChangeForSlot(index, e.target.value)}
                        onFocus={() => setShowForSlot(index, true)}
                        onBlur={() => setTimeout(() => setShowForSlot(index, false), 200)}
                        required={!item.sku}
                      />
                      <input type="hidden" value={item.sku} required />
                      {showSuggestions[index] && searchTerms[index] && (() => {
                        const search = (searchTerms[index] || '').toLowerCase();
                        const filtered = filaments.filter(f =>
                          f.sku.toLowerCase().includes(search) ||
                          f.marca.toLowerCase().includes(search) ||
                          f.cor.toLowerCase().includes(search) ||
                          f.categoria.toLowerCase().includes(search)
                        );
                        if (filtered.length === 0) return (
                          <div style={{
                            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
                            background: '#1f2937', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '0.5rem', marginTop: '0.25rem', padding: '1rem',
                            textAlign: 'center', color: 'var(--text-muted)',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                          }}>Nenhum filamento encontrado</div>
                        );
                        return (
                          <div style={{
                            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
                            background: '#1f2937', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '0.5rem', marginTop: '0.25rem',
                            maxHeight: '250px', overflowY: 'auto',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                          }}>
                            {filtered.map(f => (
                              <div
                                key={f.id}
                                onMouseDown={() => handleSelectFilamentForSlot(index, f)}
                                style={{
                                  padding: '0.75rem 1rem', cursor: 'pointer',
                                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.1)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
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
                        );
                      })()}
                    </div>
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
              prints.map((print, index) => (
                <React.Fragment key={index}>
                  <tr style={{ background: viewingPrintIdx === index ? 'rgba(59, 130, 246, 0.08)' : undefined }}>
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
                    <td style={{ fontWeight: 600 }}>{parseFloat(print.totalWeight).toFixed(2).replace('.', ',')}g</td>
                    <td>{print.timeMinutes} min</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: viewingPrintIdx === index ? 'rgba(0, 240, 255, 0.2)' : 'rgba(0, 240, 255, 0.1)', color: 'var(--primary)' }}
                          onClick={() => setViewingPrintIdx(viewingPrintIdx === index ? null : index)}
                        >
                          {viewingPrintIdx === index ? 'Fechar' : 'Ver Detalhes'}
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
                  {viewingPrintIdx === index && (
                    <tr>
                      <td colSpan="6" style={{ padding: 0, background: 'rgba(59, 130, 246, 0.05)' }}>
                        <div style={{
                          padding: '1.5rem',
                          borderTop: '1px solid rgba(59, 130, 246, 0.3)',
                          borderBottom: '1px solid rgba(59, 130, 246, 0.3)'
                        }}>
                          <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
                            <div>
                              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Data</p>
                              <p style={{ fontWeight: 600 }}>{new Date((print.date.includes('T') ? print.date : print.date + 'T12:00:00')).toLocaleDateString()}</p>
                            </div>
                            <div>
                              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Tempo Total</p>
                              <p style={{ fontWeight: 600 }}>{print.timeMinutes} minutos</p>
                            </div>
                            <div>
                              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Cores Usadas</p>
                              <p style={{ fontWeight: 600 }}>{print.colors}</p>
                            </div>
                            <div>
                              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Peso Total da Peça</p>
                              <p style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1.2rem' }}>{parseFloat(print.totalWeight).toFixed(2).replace('.', ',')}g</p>
                            </div>
                          </div>

                          <h3 style={{ fontSize: '1rem', marginBottom: '1rem', borderTop: '1px solid var(--card-border)', paddingTop: '1.5rem' }}>
                            Filamentos Consumidos
                          </h3>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {print.filamentsUsed.map((f, idx) => {
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
                                    {parseFloat(f.weightGrams).toFixed(2).replace('.', ',')}g
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Prints;
