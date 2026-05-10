import React, { useState, useEffect, useRef } from 'react';
import { getAllFilamentsWithStock, savePrint, getPrints, deletePrint, getFilaments, getPrintCost, getFilamentPricePerGram, getAccessoriesByCategory } from '../services/storage';
import { ColorDot, getColorFromName, getBrandColor } from '../utils/colorUtils';
import CustomSelect from '../components/CustomSelect';
import MaskedNumberInput from '../components/MaskedNumberInput';

const DEFAULT_PLACA = 'PEI Texturizada Bambu Lab';

const Prints = () => {
  const [filaments, setFilaments] = useState([]);
  const [allFilaments, setAllFilaments] = useState([]);
  const [prints, setPrints] = useState([]);
  const [placas, setPlacas] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [viewingPrintIdx, setViewingPrintIdx] = useState(null);
  const descriptionInputRef = useRef(null);
  const [successMessage, setSuccessMessage] = useState('');

  const initialFormState = {
    date: new Date().toISOString().split('T')[0],
    description: '',
    startTime: '',
    endTime: '',
    timeMinutes: '',
    colors: 1,
    weightGrams: '',
    placa: DEFAULT_PLACA,
    id: null
  };

  const calcMinutes = (start, end) => {
    if (!start || !end) return '';
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let total = (eh * 60 + em) - (sh * 60 + sm);
    if (total < 0) total += 24 * 60;
    return total;
  };

  const formatDuration = (mins) => {
    if (!mins) return '';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
  };

  const [formData, setFormData] = useState(initialFormState);
  const [usedFilaments, setUsedFilaments] = useState([{ sku: '', weightGrams: '' }]);
  const [searchTerms, setSearchTerms] = useState(['']);
  const [showSuggestions, setShowSuggestions] = useState([false]);
  const [highlightedIndexes, setHighlightedIndexes] = useState([-1]);
  const [showDescSuggestions, setShowDescSuggestions] = useState(false);
  const [descHighlightedIndex, setDescHighlightedIndex] = useState(-1);

  useEffect(() => {
    const withStock = getAllFilamentsWithStock().filter(f => (f.currentStock || 0) > 0);
    withStock.sort((a, b) => a.marca.localeCompare(b.marca) || a.cor.localeCompare(b.cor));
    setFilaments(withStock);
    setAllFilaments(getFilaments());
    setPrints(getPrints().reverse());
    const accPlacas = getAccessoriesByCategory('Placas de impressão');
    const allPlacas = [DEFAULT_PLACA, ...accPlacas.filter(p => p !== DEFAULT_PLACA)];
    setPlacas(allPlacas);
  }, []);

  useEffect(() => {
    const numCores = parseInt(formData.colors) || 1;
    if (numCores !== usedFilaments.length) {
      const newUsed = [...usedFilaments];
      const newTerms = [...searchTerms];
      const newShow = [...showSuggestions];
      const newHighlighted = [...highlightedIndexes];
      if (numCores > usedFilaments.length) {
        for (let i = usedFilaments.length; i < numCores; i++) {
          newUsed.push({ sku: '', weightGrams: '' });
          newTerms.push('');
          newShow.push(false);
          newHighlighted.push(-1);
        }
      } else {
        newUsed.splice(numCores);
        newTerms.splice(numCores);
        newShow.splice(numCores);
        newHighlighted.splice(numCores);
      }
      setUsedFilaments(newUsed);
      setSearchTerms(newTerms);
      setShowSuggestions(newShow);
      setHighlightedIndexes(newHighlighted);
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
    const newHighlighted = [...highlightedIndexes];
    newHighlighted[index] = -1;
    setHighlightedIndexes(newHighlighted);
  };

  const handleSearchChangeForSlot = (index, value) => {
    const newTerms = [...searchTerms];
    newTerms[index] = value;
    setSearchTerms(newTerms);
    const newShow = [...showSuggestions];
    newShow[index] = true;
    setShowSuggestions(newShow);
    const newHighlighted = [...highlightedIndexes];
    newHighlighted[index] = -1;
    setHighlightedIndexes(newHighlighted);
    if (!value) {
      const newUsed = [...usedFilaments];
      newUsed[index].sku = '';
      setUsedFilaments(newUsed);
    }
  };

  const getFilteredForSlot = (index) => {
    const search = (searchTerms[index] || '').toLowerCase();
    return filaments.filter(f =>
      f.sku.toLowerCase().includes(search) ||
      f.marca.toLowerCase().includes(search) ||
      f.cor.toLowerCase().includes(search) ||
      f.categoria.toLowerCase().includes(search)
    );
  };

  const handleKeyDownForSlot = (e, index) => {
    const filtered = getFilteredForSlot(index);
    if (!showSuggestions[index] || filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newHighlighted = [...highlightedIndexes];
      const next = Math.min((newHighlighted[index] ?? -1) + 1, filtered.length - 1);
      newHighlighted[index] = next;
      setHighlightedIndexes(newHighlighted);
      setTimeout(() => document.getElementById(`print-sug-${index}-${next}`)?.scrollIntoView({ block: 'nearest' }), 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newHighlighted = [...highlightedIndexes];
      const next = Math.max((newHighlighted[index] ?? 0) - 1, 0);
      newHighlighted[index] = next;
      setHighlightedIndexes(newHighlighted);
      setTimeout(() => document.getElementById(`print-sug-${index}-${next}`)?.scrollIntoView({ block: 'nearest' }), 0);
    } else if (e.key === 'Enter' && (highlightedIndexes[index] ?? -1) >= 0) {
      e.preventDefault();
      handleSelectFilamentForSlot(index, filtered[highlightedIndexes[index]]);
    } else if (e.key === 'Escape') {
      setShowForSlot(index, false);
      const newHighlighted = [...highlightedIndexes];
      newHighlighted[index] = -1;
      setHighlightedIndexes(newHighlighted);
    }
  };

  const getFilteredDescriptions = () => {
    const typed = formData.description.toLowerCase();
    if (!typed) return [];
    return [...new Set(prints.map(p => p.description).filter(Boolean))]
      .filter(d => d.toLowerCase().includes(typed) && d !== formData.description)
      .slice(0, 10);
  };

  const handleDescKeyDown = (e) => {
    const filtered = getFilteredDescriptions();
    if (!showDescSuggestions || filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setDescHighlightedIndex(prev => {
        const next = Math.min(prev + 1, filtered.length - 1);
        setTimeout(() => document.getElementById(`desc-sug-${next}`)?.scrollIntoView({ block: 'nearest' }), 0);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setDescHighlightedIndex(prev => {
        const next = Math.max(prev - 1, 0);
        setTimeout(() => document.getElementById(`desc-sug-${next}`)?.scrollIntoView({ block: 'nearest' }), 0);
        return next;
      });
    } else if (e.key === 'Enter' && descHighlightedIndex >= 0) {
      e.preventDefault();
      setFormData({ ...formData, description: filtered[descHighlightedIndex] });
      setShowDescSuggestions(false);
      setDescHighlightedIndex(-1);
    } else if (e.key === 'Escape') {
      setShowDescSuggestions(false);
      setDescHighlightedIndex(-1);
    }
  };

  const setShowForSlot = (index, value) => {
    const newShow = [...showSuggestions];
    newShow[index] = value;
    setShowSuggestions(newShow);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.timeMinutes) {
      setSuccessMessage('Informe a Hora Inicial e a Hora Final da impressão');
      setTimeout(() => setSuccessMessage(''), 3000);
      return;
    }
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
      placa: formData.placa || DEFAULT_PLACA,
      filamentsUsed: usedFilaments.map(f => ({
        sku: f.sku,
        weightGrams: Number(f.weightGrams)
      }))
    });

    setSuccessMessage(isEditing ? '✓ Impressão atualizada!' : '✓ Impressão registrada!');
    setTimeout(() => setSuccessMessage(''), 1000);

    resetForm();
    loadData();
    setTimeout(() => { if (descriptionInputRef.current) descriptionInputRef.current.focus(); }, 0);
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setUsedFilaments([{ sku: '', weightGrams: '' }]);
    setSearchTerms(['']);
    setShowSuggestions([false]);
    setHighlightedIndexes([-1]);
    setShowDescSuggestions(false);
    setDescHighlightedIndex(-1);
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
      weightGrams: print.totalWeight,
      placa: print.placa || DEFAULT_PLACA,
    });
    setUsedFilaments(print.filamentsUsed);
    const terms = print.filamentsUsed.map(f => {
      const info = allFilaments.find(fil => fil.sku === f.sku) || filaments.find(fil => fil.sku === f.sku);
      return info ? `${info.marca} - ${info.cor} (${f.sku})` : f.sku;
    });
    setSearchTerms(terms);
    setShowSuggestions(print.filamentsUsed.map(() => false));
    setHighlightedIndexes(print.filamentsUsed.map(() => -1));
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
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
            <div style={{ position: 'relative' }}>
              <input
                ref={descriptionInputRef}
                type="text"
                className="form-input"
                placeholder="Ex: Miniatura para RPG, Case de AirPods..."
                value={formData.description}
                onChange={e => {
                  setFormData({ ...formData, description: e.target.value });
                  setShowDescSuggestions(true);
                  setDescHighlightedIndex(-1);
                }}
                onFocus={() => setShowDescSuggestions(true)}
                onBlur={() => setTimeout(() => setShowDescSuggestions(false), 200)}
                onKeyDown={handleDescKeyDown}
              />
              {showDescSuggestions && (() => {
                const filtered = getFilteredDescriptions();
                if (filtered.length === 0) return null;
                return (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
                    background: '#1f2937', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.5rem', marginTop: '0.25rem',
                    maxHeight: '280px', overflowY: 'auto',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                  }}>
                    {filtered.map((desc, listIndex) => (
                      <div
                        key={listIndex}
                        id={`desc-sug-${listIndex}`}
                        onMouseDown={() => {
                          setFormData({ ...formData, description: desc });
                          setShowDescSuggestions(false);
                          setDescHighlightedIndex(-1);
                        }}
                        style={{
                          padding: '0.75rem 1rem',
                          cursor: 'pointer',
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                          transition: 'background 0.15s',
                          background: listIndex === descHighlightedIndex ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                          fontSize: '0.9rem'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)'}
                        onMouseLeave={e => e.currentTarget.style.background = listIndex === descHighlightedIndex ? 'rgba(59, 130, 246, 0.25)' : 'transparent'}
                      >
                        {desc}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1.5fr', gap: '1.5rem', marginBottom: '2rem' }}>
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
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Hora Inicial</span>
                <span>Hora Final</span>
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="time"
                  className="form-input"
                  style={{ flex: 1 }}
                  value={formData.startTime}
                  onChange={e => {
                    const start = e.target.value;
                    const mins = calcMinutes(start, formData.endTime);
                    setFormData({ ...formData, startTime: start, timeMinutes: mins !== '' ? mins : formData.timeMinutes });
                  }}
                />
                <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '1.1rem', flexShrink: 0 }}>→</span>
                <input
                  type="time"
                  className="form-input"
                  style={{ flex: 1 }}
                  value={formData.endTime}
                  onChange={e => {
                    const end = e.target.value;
                    const mins = calcMinutes(formData.startTime, end);
                    setFormData({ ...formData, endTime: end, timeMinutes: mins !== '' ? mins : formData.timeMinutes });
                  }}
                />
              </div>
              {formData.timeMinutes !== '' && (
                <div style={{
                  marginTop: '0.5rem',
                  background: 'rgba(0, 240, 255, 0.08)',
                  border: '1px solid rgba(0, 240, 255, 0.25)',
                  borderRadius: '0.4rem',
                  padding: '0.4rem 0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1.05rem' }}>
                    {formatDuration(Number(formData.timeMinutes))}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    ({formData.timeMinutes} min)
                  </span>
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Qtd. de Cores</label>
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
            <div className="form-group">
              <label className="form-label">Placa de Impressão</label>
              <CustomSelect
                fullWidth
                value={formData.placa}
                onChange={v => setFormData({ ...formData, placa: v })}
                options={placas.map(p => ({ value: p, label: p }))}
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
                        onKeyDown={e => handleKeyDownForSlot(e, index)}
                        required={!item.sku}
                      />
                      <input type="hidden" value={item.sku} required />
                      {showSuggestions[index] && searchTerms[index] && (() => {
                        const filtered = getFilteredForSlot(index);
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
                            {filtered.map((f, listIndex) => (
                              <div
                                key={f.id}
                                id={`print-sug-${index}-${listIndex}`}
                                onMouseDown={() => handleSelectFilamentForSlot(index, f)}
                                style={{
                                  padding: '0.75rem 1rem', cursor: 'pointer',
                                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                                  transition: 'background 0.15s',
                                  background: listIndex === (highlightedIndexes[index] ?? -1) ? 'rgba(59, 130, 246, 0.25)' : 'transparent'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.15)'}
                                onMouseLeave={e => e.currentTarget.style.background = listIndex === (highlightedIndexes[index] ?? -1) ? 'rgba(59, 130, 246, 0.25)' : 'transparent'}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                  <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>{f.sku}</span>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                      <ColorDot cor={f.cor} size={9} />
                                      <span style={{ color: getBrandColor(f.marca) }}>{f.marca}</span>
                                      <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>–</span>
                                      <span style={{ color: getColorFromName(f.cor) }}>{f.cor}</span>
                                    </div>
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
                    <MaskedNumberInput
                      value={item.weightGrams}
                      onChange={v => handleFilamentChange(index, 'weightGrams', v)}
                      className="form-input"
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
              <th>Custo</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {prints.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
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
                    <td style={{ fontWeight: 600, color: 'var(--success)' }}>
                      {(() => {
                        const cost = getPrintCost(print);
                        return cost > 0
                          ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cost)
                          : <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>—</span>;
                      })()}
                    </td>
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
                      <td colSpan="7" style={{ padding: 0, background: 'rgba(59, 130, 246, 0.05)' }}>
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
                              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Placa de Impressão</p>
                              <p style={{ fontWeight: 600 }}>{print.placa || DEFAULT_PLACA}</p>
                            </div>
                            <div>
                              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Peso Total da Peça</p>
                              <p style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1.2rem' }}>{parseFloat(print.totalWeight).toFixed(2).replace('.', ',')}g</p>
                            </div>
                            <div>
                              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Custo Total</p>
                              {(() => {
                                const cost = getPrintCost(print);
                                return cost > 0
                                  ? <p style={{ fontWeight: 700, color: 'var(--success)', fontSize: '1.2rem' }}>{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cost)}</p>
                                  : <p style={{ color: 'var(--text-muted)' }}>Sem preço cadastrado</p>;
                              })()}
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
                                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      <ColorDot cor={info.cor} size={10} />
                                      <span style={{ color: getBrandColor(info.marca) }}>{info.marca}</span>
                                      <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>–</span>
                                      <span style={{ color: getColorFromName(info.cor) }}>{info.cor}</span>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>SKU: {f.sku} | {info.categoria}</div>
                                  </div>
                                  <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                                      {parseFloat(f.weightGrams).toFixed(2).replace('.', ',')}g
                                    </div>
                                    {(() => {
                                      const pricePerGram = getFilamentPricePerGram(f.sku);
                                      const cost = pricePerGram * Number(f.weightGrams);
                                      return pricePerGram > 0
                                        ? <div style={{ fontSize: '0.8rem', color: 'var(--success)', marginTop: '0.2rem' }}>{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cost)}</div>
                                        : null;
                                    })()}
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
