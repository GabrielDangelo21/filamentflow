import React, { useState, useEffect, useRef } from 'react';
import { getAllFilamentsWithStock, savePrint, getPrints, deletePrint, getFilaments, getPrintCost, getFilamentPricePerGram, getAccessoriesByCategory } from '../services/storage';
import { ColorDot, getColorFromName, getBrandColor } from '../utils/colorUtils';
import CustomSelect from '../components/CustomSelect';
import MaskedNumberInput from '../components/MaskedNumberInput';

const DEFAULT_PLACA = 'PEI Texturizada Bambu Lab';
const DEFAULT_PRINTER = 'P2S';
const DEFAULT_PRINTERS = ['P2S', 'A1 Combo'];
const PRICE_SETTINGS_KEY = 'filamentflow_calc_settings';

const Prints = () => {
  const [filaments, setFilaments] = useState([]);
  const [allFilaments, setAllFilaments] = useState([]);
  const [prints, setPrints] = useState([]);
  const [placas, setPlacas] = useState([]);
  const [printers, setPrinters] = useState(DEFAULT_PRINTERS);
  const [isEditing, setIsEditing] = useState(false);
  const [viewingPrintIdx, setViewingPrintIdx] = useState(null);
  const descriptionInputRef = useRef(null);
  const [successMessage, setSuccessMessage] = useState('');

  const initialFormState = {
    date: new Date().toISOString().split('T')[0],
    description: '',
    project: '',
    startTime: '',
    endTime: '',
    timeMinutes: '',
    colors: 1,
    weightGrams: '',
    placa: DEFAULT_PLACA,
    printer: DEFAULT_PRINTER,
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
  const [showProjectSuggestions, setShowProjectSuggestions] = useState(false);
  const [projectHighlightedIndex, setProjectHighlightedIndex] = useState(-1);
  const [viewMode, setViewMode] = useState('individual');
  const [expandedProjects, setExpandedProjects] = useState(new Set());
  const [printerFilter, setPrinterFilter] = useState(null);

  // Configurações de preço de venda
  const [wattage, setWattage] = useState(200);
  const [kwh, setKwh] = useState(0.145);
  const [laborMinutes, setLaborMinutes] = useState(5);
  const [hourlyRate, setHourlyRate] = useState(15);
  const [pricingMargin, setPricingMargin] = useState(30);
  const [showPriceSettings, setShowPriceSettings] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(PRICE_SETTINGS_KEY);
    if (saved) {
      try {
        const s = JSON.parse(saved);
        if (s.wattage != null) setWattage(s.wattage);
        if (s.kwh != null) setKwh(s.kwh);
        if (s.laborMinutes != null) setLaborMinutes(s.laborMinutes);
        if (s.hourlyRate != null) setHourlyRate(s.hourlyRate);
        if (s.margin != null) setPricingMargin(s.margin);
      } catch (_) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(PRICE_SETTINGS_KEY, JSON.stringify({ wattage, kwh, laborMinutes, hourlyRate, margin: pricingMargin }));
  }, [wattage, kwh, laborMinutes, hourlyRate, pricingMargin]);

  useEffect(() => {
    const withStock = getAllFilamentsWithStock().filter(f => (f.currentStock || 0) > 0);
    withStock.sort((a, b) => a.marca.localeCompare(b.marca) || a.cor.localeCompare(b.cor));
    setFilaments(withStock);
    setAllFilaments(getFilaments());
    setPrints(getPrints().reverse());
    const accPlacas = getAccessoriesByCategory('Placas de impressão');
    const allPlacas = [DEFAULT_PLACA, ...accPlacas.filter(p => p !== DEFAULT_PLACA)];
    setPlacas(allPlacas);
    const accPrinters = getAccessoriesByCategory('Impressora');
    const printerList = accPrinters.length ? accPrinters : DEFAULT_PRINTERS;
    setPrinters(printerList);
    const defaultPrinter = printerList.find(p => p.includes('P2S')) || printerList[0];
    setFormData(f => ({ ...f, printer: printerList.includes(f.printer) ? f.printer : defaultPrinter }));
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

  const getExistingProjects = () => {
    const s = new Set();
    prints.forEach(p => { if (p.project) s.add(p.project); });
    return [...s].sort();
  };

  const getFilteredProjects = () => {
    const typed = (formData.project || '').toLowerCase();
    const all = getExistingProjects();
    if (!typed) return all.slice(0, 10);
    return all.filter(p => p.toLowerCase().includes(typed) && p !== formData.project).slice(0, 10);
  };

  const handleProjectKeyDown = (e) => {
    const filtered = getFilteredProjects();
    if (!showProjectSuggestions || filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setProjectHighlightedIndex(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setProjectHighlightedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && projectHighlightedIndex >= 0) {
      e.preventDefault();
      setFormData({ ...formData, project: filtered[projectHighlightedIndex] });
      setShowProjectSuggestions(false);
      setProjectHighlightedIndex(-1);
    } else if (e.key === 'Escape') {
      setShowProjectSuggestions(false);
      setProjectHighlightedIndex(-1);
    }
  };

  const filteredPrints = printerFilter
    ? prints.filter(p => (p.printer || DEFAULT_PRINTER) === printerFilter)
    : prints;

  const getGroupedPrints = () => {
    const groups = {};
    filteredPrints.forEach(print => {
      const key = print.project || print.description || '(sem nome)';
      if (!groups[key]) groups[key] = { name: key, prints: [], totalWeight: 0, totalTime: 0, totalCost: 0, latestDate: null };
      groups[key].prints.push(print);
      groups[key].totalWeight += Number(print.totalWeight) || 0;
      groups[key].totalTime += Number(print.timeMinutes) || 0;
      groups[key].totalCost += getPrintCost(print);
      const d = new Date(print.date.includes('T') ? print.date : print.date + 'T12:00:00');
      if (!groups[key].latestDate || d > groups[key].latestDate) groups[key].latestDate = d;
    });
    return Object.values(groups).sort((a, b) => b.latestDate - a.latestDate);
  };

  const toggleProject = (name) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
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
      project: formData.project || '',
      timeMinutes: Number(formData.timeMinutes),
      totalWeight: totalWeight,
      colors: Number(formData.colors),
      placa: formData.placa || DEFAULT_PLACA,
      printer: formData.printer || DEFAULT_PRINTER,
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
      project: print.project || '',
      timeMinutes: print.timeMinutes,
      colors: print.colors,
      weightGrams: print.totalWeight,
      placa: print.placa || DEFAULT_PLACA,
      printer: print.printer || DEFAULT_PRINTER,
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

  const fmtEur = (v) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v || 0);

  const calcSellingPrice = (print) => {
    const material = getPrintCost(print);
    const electricity = (wattage / 1000) * ((Number(print.timeMinutes) || 0) / 60) * kwh;
    const labor = (laborMinutes / 60) * hourlyRate;
    const totalCost = material + electricity + labor;
    const sellingPrice = totalCost * (1 + pricingMargin / 100);
    return { material, electricity, labor, totalCost, sellingPrice };
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

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">
              Projeto <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.85rem' }}>(opcional — agrupa partes do mesmo modelo)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Hermione Knitted, Gaita Harry Potter..."
                value={formData.project}
                onChange={e => { setFormData({ ...formData, project: e.target.value }); setShowProjectSuggestions(true); setProjectHighlightedIndex(-1); }}
                onFocus={() => setShowProjectSuggestions(true)}
                onBlur={() => setTimeout(() => setShowProjectSuggestions(false), 200)}
                onKeyDown={handleProjectKeyDown}
              />
              {showProjectSuggestions && (() => {
                const filtered = getFilteredProjects();
                if (filtered.length === 0) return null;
                return (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
                    background: '#1f2937', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.5rem', marginTop: '0.25rem',
                    maxHeight: '200px', overflowY: 'auto',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                  }}>
                    {filtered.map((proj, i) => (
                      <div key={i}
                        onMouseDown={() => { setFormData({ ...formData, project: proj }); setShowProjectSuggestions(false); setProjectHighlightedIndex(-1); }}
                        style={{
                          padding: '0.75rem 1rem', cursor: 'pointer',
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                          background: i === projectHighlightedIndex ? 'rgba(59,130,246,0.25)' : 'transparent',
                          fontSize: '0.9rem'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.15)'}
                        onMouseLeave={e => e.currentTarget.style.background = i === projectHighlightedIndex ? 'rgba(59,130,246,0.25)' : 'transparent'}
                      >{proj}</div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1.5fr 1.5fr', gap: '1.5rem', marginBottom: '2rem' }}>
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
              <label className="form-label">Impressora</label>
              <CustomSelect
                fullWidth
                value={formData.printer}
                onChange={v => setFormData({ ...formData, printer: v })}
                options={printers.map(p => ({ value: p, label: p }))}
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', marginBottom: showPriceSettings ? '0.5rem' : '1rem' }}>
        <h2 style={{ margin: 0 }}>Histórico de Impressões</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => setShowPriceSettings(p => !p)}
            style={{
              padding: '0.5rem 0.9rem', border: '1px solid var(--card-border)', borderRadius: '0.5rem',
              background: showPriceSettings ? 'rgba(0,240,255,0.1)' : 'transparent',
              color: showPriceSettings ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: '0.4rem', transition: 'all 0.15s',
            }}>
            ⚙️ Preço de venda
          </button>
          <div style={{ display: 'flex', gap: '0', border: '1px solid var(--card-border)', borderRadius: '0.5rem', overflow: 'hidden' }}>
            {[{ id: 'individual', label: '▦ Individual' }, { id: 'projeto', label: '⊞ Por Projeto' }].map(m => (
              <button key={m.id} onClick={() => setViewMode(m.id)} style={{
                padding: '0.5rem 1.1rem', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                background: viewMode === m.id ? 'var(--primary)' : 'transparent',
                color: viewMode === m.id ? '#000' : 'var(--text-muted)',
                transition: 'all 0.15s'
              }}>{m.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Filtro por impressora */}
      {printers.length > 1 && (() => {
        const usedPrinters = [...new Set(prints.map(p => p.printer || DEFAULT_PRINTER))].sort();
        if (usedPrinters.length <= 1) return null;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginRight: '0.25rem' }}>🖨️ Impressora:</span>
            {[{ label: 'Todas', value: null }, ...usedPrinters.map(p => ({ label: p, value: p }))].map(({ label, value }) => (
              <button key={label} onClick={() => setPrinterFilter(value)} style={{
                padding: '0.3rem 0.85rem',
                border: `1px solid ${printerFilter === value ? 'var(--primary)' : 'var(--card-border)'}`,
                borderRadius: '999px',
                background: printerFilter === value ? 'rgba(0,240,255,0.12)' : 'transparent',
                color: printerFilter === value ? 'var(--primary)' : 'var(--text-muted)',
                fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit', transition: 'all 0.15s',
              }}>{label}</button>
            ))}
          </div>
        );
      })()}

      {showPriceSettings && (
        <div style={{ marginBottom: '1rem', background: 'rgba(0,240,255,0.04)', border: '1px solid rgba(0,240,255,0.15)', borderRadius: '12px', padding: '1rem 1.5rem' }}>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {[
              { label: 'Potência (W)', value: wattage, setter: setWattage, step: '10' },
              { label: '€/kWh', value: kwh, setter: setKwh, step: '0.001' },
              { label: 'Mão de obra (min/impressão)', value: laborMinutes, setter: setLaborMinutes, step: '5' },
              { label: '€/hora', value: hourlyRate, setter: setHourlyRate, step: '0.5' },
              { label: 'Margem (%)', value: pricingMargin, setter: setPricingMargin, step: '5' },
            ].map(({ label, value, setter, step }) => (
              <div key={label}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px', fontWeight: 600 }}>{label}</div>
                <input
                  type="number" min="0" step={step} value={value}
                  onChange={e => setter(parseFloat(e.target.value) || 0)}
                  style={{
                    width: '80px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)',
                    borderRadius: '8px', padding: '0.5rem 0.6rem', color: 'var(--text-main)',
                    fontFamily: 'var(--font-family)', fontSize: '0.9rem', outline: 'none', textAlign: 'center',
                  }}
                />
              </div>
            ))}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem', marginBottom: 0 }}>
            Configurações guardadas automaticamente.
          </p>
        </div>
      )}

      {/* ── Vista Individual ── */}
      {viewMode === 'individual' && (
        <div className="glass-panel" style={{ marginTop: '0' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Cores</th>
                <th>Peso Total</th>
                <th>Tempo</th>
                <th>Custo / Venda</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredPrints.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>{printerFilter ? `Nenhuma impressão com a impressora "${printerFilter}".` : 'Nenhuma impressão registrada.'}</td></tr>
              ) : (
                filteredPrints.map((print, index) => (
                  <React.Fragment key={index}>
                    <tr style={{ background: viewingPrintIdx === index ? 'rgba(59,130,246,0.08)' : undefined }}>
                      <td>{(() => { try { const d = print.date.includes('T') ? new Date(print.date) : new Date(print.date + 'T12:00:00'); return d.toLocaleDateString(); } catch { return 'Inválida'; } })()}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{print.description || '-'}</div>
                        {print.project && <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '0.15rem' }}>📁 {print.project}</div>}
                      </td>
                      <td><span className="badge badge-outline">{print.colors}</span></td>
                      <td style={{ fontWeight: 600 }}>{parseFloat(print.totalWeight).toFixed(2).replace('.', ',')}g</td>
                      <td>{print.timeMinutes} min</td>
                      <td>
                        {(() => {
                          const p = calcSellingPrice(print);
                          return (
                            <div>
                              {p.material > 0 && (
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                  Matl: {fmtEur(p.material)}
                                </div>
                              )}
                              <div style={{ fontWeight: 700, color: p.totalCost > 0 ? 'var(--primary)' : 'var(--text-muted)', fontSize: '0.9rem' }}>
                                {p.totalCost > 0 ? fmtEur(p.sellingPrice) : '—'}
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: viewingPrintIdx === index ? 'rgba(0,240,255,0.2)' : 'rgba(0,240,255,0.1)', color: 'var(--primary)' }} onClick={() => setViewingPrintIdx(viewingPrintIdx === index ? null : index)}>{viewingPrintIdx === index ? 'Fechar' : 'Ver Detalhes'}</button>
                          <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleEdit(print)}>Editar</button>
                          <button className="btn btn-danger" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleDelete(print.id)}>Excluir</button>
                        </div>
                      </td>
                    </tr>
                    {viewingPrintIdx === index && (
                      <tr>
                        <td colSpan="7" style={{ padding: 0, background: 'rgba(59,130,246,0.05)' }}>
                          <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(59,130,246,0.3)', borderBottom: '1px solid rgba(59,130,246,0.3)' }}>
                            <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
                              <div><p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Data</p><p style={{ fontWeight: 600 }}>{new Date((print.date.includes('T') ? print.date : print.date + 'T12:00:00')).toLocaleDateString()}</p></div>
                              <div><p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Tempo Total</p><p style={{ fontWeight: 600 }}>{print.timeMinutes} minutos</p></div>
                              <div><p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Cores Usadas</p><p style={{ fontWeight: 600 }}>{print.colors}</p></div>
                              <div><p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Impressora</p><p style={{ fontWeight: 600 }}>{print.printer || DEFAULT_PRINTER}</p></div>
                              <div><p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Placa de Impressão</p><p style={{ fontWeight: 600 }}>{print.placa || DEFAULT_PLACA}</p></div>
                              <div><p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Peso Total da Peça</p><p style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1.2rem' }}>{parseFloat(print.totalWeight).toFixed(2).replace('.', ',')}g</p></div>
                              <div><p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Custo Material</p>{(() => { const c = getPrintCost(print); return c > 0 ? <p style={{ fontWeight: 700, color: 'var(--success)', fontSize: '1.2rem' }}>{fmtEur(c)}</p> : <p style={{ color: 'var(--text-muted)' }}>Sem preço cadastrado</p>; })()}</div>
                            </div>

                            {/* Preço de venda */}
                            {(() => {
                              const p = calcSellingPrice(print);
                              if (p.totalCost <= 0) return null;
                              return (
                                <div style={{ marginBottom: '1.5rem', background: 'rgba(0,240,255,0.04)', border: '1px solid rgba(0,240,255,0.15)', borderRadius: '12px', padding: '1rem 1.5rem' }}>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, marginBottom: '0.85rem' }}>
                                    Preço de Venda
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                                    {[
                                      { label: '🧵 Material', value: p.material },
                                      { label: '⚡ Eletricidade', value: p.electricity },
                                      { label: '🤝 Mão de obra', value: p.labor },
                                    ].map(({ label, value }) => (
                                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.87rem' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                                        <span style={{ fontWeight: 600 }}>{fmtEur(value)}</span>
                                      </div>
                                    ))}
                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.45rem', marginTop: '0.1rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.87rem' }}>
                                      <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
                                      <span style={{ fontWeight: 600 }}>{fmtEur(p.totalCost)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.87rem' }}>
                                      <span style={{ color: '#10B981' }}>📈 Margem ({pricingMargin}%)</span>
                                      <span style={{ fontWeight: 600, color: '#10B981' }}>+ {fmtEur(p.sellingPrice - p.totalCost)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.45rem', borderTop: '1px solid rgba(0,240,255,0.2)', marginTop: '0.1rem' }}>
                                      <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.95rem' }}>Preço de venda</span>
                                      <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem' }}>{fmtEur(p.sellingPrice)}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}

                            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', borderTop: '1px solid var(--card-border)', paddingTop: '1.5rem' }}>Filamentos Consumidos</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                              {print.filamentsUsed.map((f, idx) => {
                                const info = getFilamentInfo(f.sku);
                                return (
                                  <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--card-border)' }}>
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
                                      <div style={{ fontWeight: 700 }}>{parseFloat(f.weightGrams).toFixed(2).replace('.', ',')}g</div>
                                      {(() => { const ppg = getFilamentPricePerGram(f.sku); const c = ppg * Number(f.weightGrams); return ppg > 0 ? <div style={{ fontSize: '0.8rem', color: 'var(--success)', marginTop: '0.2rem' }}>{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(c)}</div> : null; })()}
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
      )}

      {/* ── Vista Por Projeto ── */}
      {viewMode === 'projeto' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredPrints.length === 0 ? (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>{printerFilter ? `Nenhuma impressão com a impressora "${printerFilter}".` : 'Nenhuma impressão registrada.'}</div>
          ) : (
            getGroupedPrints().map(group => {
              const isOpen = expandedProjects.has(group.name);
              return (
                <div key={group.name} className="glass-panel" style={{ overflow: 'hidden', padding: 0 }}>
                  {/* Header do grupo */}
                  <button onClick={() => toggleProject(group.name)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '1rem 1.5rem', background: 'transparent', border: 'none',
                    cursor: 'pointer', textAlign: 'left', color: 'inherit', fontFamily: 'inherit'
                  }}>
                    <span style={{ fontSize: '1rem', color: 'var(--primary)', transition: 'transform 0.2s', display: 'inline-block', transform: isOpen ? 'rotate(90deg)' : 'rotate(0)' }}>▶</span>
                    <span style={{ fontWeight: 700, fontSize: '1rem', flex: 1 }}>{group.name}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', padding: '0.2rem 0.6rem', borderRadius: '999px' }}>
                      {group.prints.length} {group.prints.length === 1 ? 'parte' : 'partes'}
                    </span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)', minWidth: '80px', textAlign: 'right' }}>
                      {parseFloat(group.totalWeight).toFixed(2).replace('.', ',')}g
                    </span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', minWidth: '70px', textAlign: 'right' }}>
                      {formatDuration(group.totalTime)}
                    </span>
                    {(() => {
                      const elec = (wattage / 1000) * (group.totalTime / 60) * kwh;
                      const lab = group.prints.length * (laborMinutes / 60) * hourlyRate;
                      const sp = (group.totalCost + elec + lab) * (1 + pricingMargin / 100);
                      return (
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: group.totalCost > 0 ? 'var(--primary)' : 'var(--text-muted)', minWidth: '80px', textAlign: 'right' }}>
                          {group.totalCost > 0 ? fmtEur(sp) : '—'}
                        </span>
                      );
                    })()}
                  </button>

                  {/* Partes expandidas */}
                  {isOpen && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                      {group.prints.map((print, idx) => {
                        const cost = getPrintCost(print);
                        const dateStr = (() => { try { const d = print.date.includes('T') ? new Date(print.date) : new Date(print.date + 'T12:00:00'); return d.toLocaleDateString(); } catch { return '?'; } })();
                        return (
                          <div key={print.id} style={{
                            display: 'flex', alignItems: 'center', gap: '1rem',
                            padding: '0.85rem 1.5rem 0.85rem 3rem',
                            borderBottom: idx < group.prints.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                            background: 'rgba(255,255,255,0.015)'
                          }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', minWidth: '80px' }}>{dateStr}</span>
                            <span style={{ flex: 1, fontSize: '0.9rem', color: 'var(--text-muted)' }}>{print.description || '—'}</span>
                            <span className="badge badge-outline" style={{ fontSize: '0.75rem' }}>{print.colors} cor{print.colors !== 1 ? 'es' : ''}</span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, minWidth: '70px', textAlign: 'right' }}>{parseFloat(print.totalWeight).toFixed(2).replace('.', ',')}g</span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', minWidth: '60px', textAlign: 'right' }}>{print.timeMinutes} min</span>
                            {(() => {
                              const p = calcSellingPrice(print);
                              return (
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: p.totalCost > 0 ? 'var(--primary)' : 'var(--text-muted)', minWidth: '70px', textAlign: 'right' }}>
                                  {p.totalCost > 0 ? fmtEur(p.sellingPrice) : '—'}
                                </span>
                              );
                            })()}
                            <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                              <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => handleEdit(print)}>Editar</button>
                              <button className="btn btn-danger" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => handleDelete(print.id)}>Excluir</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default Prints;
