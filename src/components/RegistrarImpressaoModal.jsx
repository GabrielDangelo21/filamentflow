import React, { useState, useEffect, useRef } from 'react';
import {
  getAllFilamentsWithStock, savePrint, getFilaments,
  getAccessoriesByCategory, getPrints,
} from '../services/storage';
import { ColorDot, getColorFromName, getBrandColor } from '../utils/colorUtils';
import CustomSelect from './CustomSelect';
import MaskedNumberInput from './MaskedNumberInput';

const DEFAULT_PLACA = 'PEI Texturizada Bambu Lab';
const DEFAULT_PRINTER = 'Bambu Lab P2S';
const DEFAULT_PRINTERS = ['Bambu Lab P2S', 'Bambu Lab A1'];

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

const inp = {
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: '8px',
  padding: '0.6rem 0.9rem',
  color: '#F8FAFC',
  fontFamily: 'var(--font-family)',
  fontSize: '0.9rem',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const lbl = {
  display: 'block',
  fontSize: '0.75rem',
  color: '#94A3B8',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  fontWeight: 700,
  marginBottom: '0.4rem',
};

export default function RegistrarImpressaoModal({ initialDescription, initialProject, initialTimeMinutes, onClose, onSaved, onDelete }) {
  const [filaments,    setFilaments]    = useState([]);
  const [allFilaments, setAllFilaments] = useState([]);
  const [placas,       setPlacas]       = useState([DEFAULT_PLACA]);
  const [printers,     setPrinters]     = useState(DEFAULT_PRINTERS);
  const [prints,       setPrints]       = useState([]);

  const [formData, setFormData] = useState({
    date:        new Date().toISOString().split('T')[0],
    description: initialDescription || '',
    project:     initialProject     || '',
    startTime:   '',
    endTime:     '',
    timeMinutes: initialTimeMinutes || '',
    colors:      1,
    placa:       DEFAULT_PLACA,
    printer:     DEFAULT_PRINTER,
  });

  const [usedFilaments,     setUsedFilaments]     = useState([{ sku: '', weightGrams: '' }]);
  const [searchTerms,       setSearchTerms]       = useState(['']);
  const [showSuggestions,   setShowSuggestions]   = useState([false]);
  const [highlightedIdxs,   setHighlightedIdxs]   = useState([-1]);

  const [showDescSug,       setShowDescSug]       = useState(false);
  const [descHighlight,     setDescHighlight]     = useState(-1);
  const [showProjSug,       setShowProjSug]       = useState(false);
  const [projHighlight,     setProjHighlight]     = useState(-1);

  const [error,      setError]      = useState('');
  const [saving,     setSaving]     = useState(false);

  const descRef = useRef(null);

  useEffect(() => {
    const withStock = getAllFilamentsWithStock().filter(f => (f.currentStock || 0) > 0);
    withStock.sort((a, b) => a.marca.localeCompare(b.marca) || a.cor.localeCompare(b.cor));
    setFilaments(withStock);
    setAllFilaments(getFilaments());
    setPrints(getPrints());
    const accPlacas = getAccessoriesByCategory('Placas de impressão');
    setPlacas([DEFAULT_PLACA, ...accPlacas.filter(p => p !== DEFAULT_PLACA)]);
    const accPrinters = getAccessoriesByCategory('Impressora');
    const printerList = accPrinters.length ? accPrinters : DEFAULT_PRINTERS;
    setPrinters(printerList);
    const defaultPrinter = printerList.find(p => p.includes('P2S')) || printerList[0];
    setFormData(f => ({ ...f, printer: f.printer || defaultPrinter }));
    setTimeout(() => descRef.current?.focus(), 60);
  }, []);

  // Close on Escape
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  // Sync usedFilaments length to colors
  useEffect(() => {
    const n = parseInt(formData.colors) || 1;
    setUsedFilaments(prev => {
      if (n === prev.length) return prev;
      if (n > prev.length) return [...prev, ...Array(n - prev.length).fill({ sku: '', weightGrams: '' })];
      return prev.slice(0, n);
    });
    setSearchTerms(prev   => { const a = [...prev];   while (a.length < (parseInt(formData.colors)||1)) a.push('');    return a.slice(0, parseInt(formData.colors)||1); });
    setShowSuggestions(prev => { const a=[...prev];   while (a.length < (parseInt(formData.colors)||1)) a.push(false); return a.slice(0, parseInt(formData.colors)||1); });
    setHighlightedIdxs(prev => { const a=[...prev];   while (a.length < (parseInt(formData.colors)||1)) a.push(-1);   return a.slice(0, parseInt(formData.colors)||1); });
  }, [formData.colors]);

  // ── Filament search ─────────────────────────────────────────────────────────
  const getFiltered = (i) => {
    const s = (searchTerms[i] || '').toLowerCase();
    return filaments.filter(f =>
      f.sku.toLowerCase().includes(s) || f.marca.toLowerCase().includes(s) ||
      f.cor.toLowerCase().includes(s) || f.categoria.toLowerCase().includes(s)
    );
  };

  const selectFilament = (i, f) => {
    setUsedFilaments(prev => prev.map((u, j) => j === i ? { ...u, sku: f.sku } : u));
    setSearchTerms(prev   => prev.map((t, j) => j === i ? `${f.marca} - ${f.cor} (${f.sku})` : t));
    setShowSuggestions(prev => prev.map((_, j) => j === i ? false : _));
    setHighlightedIdxs(prev => prev.map((_, j) => j === i ? -1 : _));
  };

  const handleSearchChange = (i, val) => {
    setSearchTerms(prev   => prev.map((t, j) => j === i ? val : t));
    setShowSuggestions(prev => prev.map((_, j) => j === i ? true : _));
    setHighlightedIdxs(prev => prev.map((_, j) => j === i ? -1 : _));
    if (!val) setUsedFilaments(prev => prev.map((u, j) => j === i ? { ...u, sku: '' } : u));
  };

  const handleFilamentKeyDown = (e, i) => {
    const filtered = getFiltered(i);
    if (!showSuggestions[i] || !filtered.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIdxs(prev => prev.map((h, j) => j === i ? Math.min(h + 1, filtered.length - 1) : h));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIdxs(prev => prev.map((h, j) => j === i ? Math.max(h - 1, 0) : h));
    } else if (e.key === 'Enter' && highlightedIdxs[i] >= 0) {
      e.preventDefault();
      selectFilament(i, filtered[highlightedIdxs[i]]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(prev => prev.map((_, j) => j === i ? false : _));
    }
  };

  // ── Description & Project autocomplete ─────────────────────────────────────
  const getDescSuggestions = () => {
    const typed = formData.description.toLowerCase();
    if (!typed) return [];
    return [...new Set(prints.map(p => p.description).filter(Boolean))]
      .filter(d => d.toLowerCase().includes(typed) && d !== formData.description)
      .slice(0, 8);
  };

  const getProjSuggestions = () => {
    const typed = (formData.project || '').toLowerCase();
    const all = [...new Set(prints.map(p => p.project).filter(Boolean))].sort();
    if (!typed) return all.slice(0, 8);
    return all.filter(p => p.toLowerCase().includes(typed) && p !== formData.project).slice(0, 8);
  };

  // ── Time helpers ────────────────────────────────────────────────────────────
  const handleTimeChange = (field, value) => {
    const updated = { ...formData, [field]: value };
    const mins = calcMinutes(
      field === 'startTime' ? value : formData.startTime,
      field === 'endTime'   ? value : formData.endTime,
    );
    if (mins !== '') updated.timeMinutes = mins;
    setFormData(updated);
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.timeMinutes) { setError('Informe a Hora Inicial e a Hora Final (ou o tempo direto).'); return; }
    if (usedFilaments.some(f => !f.sku || !f.weightGrams)) {
      setError('Preencha o filamento e o peso para todas as cores.'); return;
    }
    setSaving(true);
    const totalWeight = usedFilaments.reduce((acc, f) => acc + Number(f.weightGrams), 0);
    savePrint({
      date:         formData.date,
      description:  formData.description,
      project:      formData.project || '',
      timeMinutes:  Number(formData.timeMinutes),
      totalWeight,
      colors:       Number(formData.colors),
      placa:        formData.placa || DEFAULT_PLACA,
      printer:      formData.printer || DEFAULT_PRINTER,
      filamentsUsed: usedFilaments.map(f => ({ sku: f.sku, weightGrams: Number(f.weightGrams) })),
    });
    onSaved();
  };

  const set = (k, v) => setFormData(f => ({ ...f, [k]: v }));

  const descSugs = getDescSuggestions();
  const projSugs = getProjSuggestions();

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '2rem 1rem', overflowY: 'auto',
      }}
    >
      <div style={{
        background: '#151B2D',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '16px',
        padding: '2rem',
        width: '100%',
        maxWidth: '680px',
        boxShadow: '0 30px 90px rgba(0,0,0,0.8)',
        marginBottom: '2rem',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#F8FAFC', fontWeight: 800 }}>
              Registrar Impressão
            </h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#64748B' }}>
              Preencha os dados e a placa será removida da fila
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '6px', color: '#94A3B8', fontSize: '1.2rem',
            cursor: 'pointer', padding: '0.2rem 0.55rem', lineHeight: 1, transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.14)'; e.currentTarget.style.color='#F8FAFC'; }}
          onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.07)'; e.currentTarget.style.color='#94A3B8'; }}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Nome/Descrição */}
          <div style={{ marginBottom: '1.1rem' }}>
            <label style={lbl}>Nome / Descrição da Impressão</label>
            <div style={{ position: 'relative' }}>
              <input
                ref={descRef}
                type="text"
                placeholder="Ex: Miniatura para RPG, Case de AirPods..."
                value={formData.description}
                onChange={e => { set('description', e.target.value); setShowDescSug(true); setDescHighlight(-1); }}
                onFocus={() => setShowDescSug(true)}
                onBlur={() => setTimeout(() => setShowDescSug(false), 200)}
                onKeyDown={e => {
                  if (!showDescSug || !descSugs.length) return;
                  if (e.key === 'ArrowDown') { e.preventDefault(); setDescHighlight(h => Math.min(h+1, descSugs.length-1)); }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); setDescHighlight(h => Math.max(h-1, 0)); }
                  else if (e.key === 'Enter' && descHighlight >= 0) { e.preventDefault(); set('description', descSugs[descHighlight]); setShowDescSug(false); setDescHighlight(-1); }
                  else if (e.key === 'Escape') setShowDescSug(false);
                }}
                style={inp}
              />
              {showDescSug && descSugs.length > 0 && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:100, background:'#1f2937', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'0.5rem', marginTop:'0.25rem', maxHeight:'220px', overflowY:'auto', boxShadow:'0 10px 40px rgba(0,0,0,0.5)' }}>
                  {descSugs.map((d, i) => (
                    <div key={i} onMouseDown={() => { set('description', d); setShowDescSug(false); }}
                      style={{ padding:'0.7rem 1rem', cursor:'pointer', fontSize:'0.88rem', background: i===descHighlight ? 'rgba(59,130,246,0.25)':'transparent', borderBottom:'1px solid rgba(255,255,255,0.04)' }}
                      onMouseEnter={e => e.currentTarget.style.background='rgba(59,130,246,0.15)'}
                      onMouseLeave={e => e.currentTarget.style.background = i===descHighlight ? 'rgba(59,130,246,0.25)':'transparent'}>
                      {d}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Projeto */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={lbl}>
              Projeto{' '}
              <span style={{ fontWeight:400, textTransform:'none', fontSize:'0.75rem', color:'#475569' }}>
                (opcional — agrupa partes do mesmo modelo)
              </span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Ex: Hermione Knitted, Gaita Harry Potter..."
                value={formData.project}
                onChange={e => { set('project', e.target.value); setShowProjSug(true); setProjHighlight(-1); }}
                onFocus={() => setShowProjSug(true)}
                onBlur={() => setTimeout(() => setShowProjSug(false), 200)}
                onKeyDown={e => {
                  if (!showProjSug || !projSugs.length) return;
                  if (e.key === 'ArrowDown') { e.preventDefault(); setProjHighlight(h => Math.min(h+1, projSugs.length-1)); }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); setProjHighlight(h => Math.max(h-1, 0)); }
                  else if (e.key === 'Enter' && projHighlight >= 0) { e.preventDefault(); set('project', projSugs[projHighlight]); setShowProjSug(false); setProjHighlight(-1); }
                  else if (e.key === 'Escape') setShowProjSug(false);
                }}
                style={inp}
              />
              {showProjSug && projSugs.length > 0 && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:100, background:'#1f2937', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'0.5rem', marginTop:'0.25rem', maxHeight:'180px', overflowY:'auto', boxShadow:'0 10px 40px rgba(0,0,0,0.5)' }}>
                  {projSugs.map((p, i) => (
                    <div key={i} onMouseDown={() => { set('project', p); setShowProjSug(false); }}
                      style={{ padding:'0.7rem 1rem', cursor:'pointer', fontSize:'0.88rem', background: i===projHighlight ? 'rgba(59,130,246,0.25)':'transparent', borderBottom:'1px solid rgba(255,255,255,0.04)' }}
                      onMouseEnter={e => e.currentTarget.style.background='rgba(59,130,246,0.15)'}
                      onMouseLeave={e => e.currentTarget.style.background = i===projHighlight ? 'rgba(59,130,246,0.25)':'transparent'}>
                      {p}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Linha 1: Data + Horas */}
          <div style={{ display: 'grid', gridTemplateColumns: '155px 1fr', gap: '0.85rem', marginBottom: '0.85rem' }}>
            <div>
              <label style={lbl}>Data</label>
              <input type="date" value={formData.date} onChange={e => set('date', e.target.value)} style={inp} required />
            </div>

            <div>
              <label style={{ ...lbl, display:'flex', justifyContent:'space-between' }}>
                <span>Hora Inicial</span><span>Hora Final</span>
              </label>
              <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
                <input type="time" value={formData.startTime}
                  onChange={e => handleTimeChange('startTime', e.target.value)}
                  style={{ ...inp, flex:1 }} />
                <span style={{ color:'var(--primary)', fontWeight:700, flexShrink:0 }}>→</span>
                <input type="time" value={formData.endTime}
                  onChange={e => handleTimeChange('endTime', e.target.value)}
                  style={{ ...inp, flex:1 }} />
              </div>
              {formData.timeMinutes !== '' && Number(formData.timeMinutes) > 0 && (
                <div style={{ marginTop:'0.4rem', background:'rgba(0,240,255,0.08)', border:'1px solid rgba(0,240,255,0.2)', borderRadius:'6px', padding:'0.35rem 0.75rem', display:'flex', gap:'0.75rem', alignItems:'center' }}>
                  <span style={{ fontWeight:700, color:'var(--primary)', fontSize:'0.95rem' }}>
                    {formatDuration(Number(formData.timeMinutes))}
                  </span>
                  <span style={{ color:'#64748B', fontSize:'0.78rem' }}>({formData.timeMinutes} min)</span>
                </div>
              )}
            </div>
          </div>

          {/* Linha 2: Cores + Placa + Impressora */}
          <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr', gap: '0.85rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={lbl}>Cores</label>
              <input type="number" min="1" max="16" value={formData.colors}
                onChange={e => set('colors', e.target.value)}
                style={{ ...inp, textAlign:'center' }} />
            </div>
            <div>
              <label style={lbl}>Impressora</label>
              <CustomSelect
                fullWidth
                value={formData.printer}
                onChange={v => set('printer', v)}
                options={printers.map(p => ({ value: p, label: p }))}
              />
            </div>
            <div>
              <label style={lbl}>Placa de Impressão</label>
              <CustomSelect
                fullWidth
                value={formData.placa}
                onChange={v => set('placa', v)}
                options={placas.map(p => ({ value: p, label: p }))}
              />
            </div>
          </div>

          {/* Filamentos */}
          <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)', paddingTop:'1.25rem', marginBottom:'1.25rem' }}>
            <h3 style={{ fontSize:'0.9rem', color:'var(--primary)', marginBottom:'0.85rem', fontWeight:700 }}>
              Detalhamento de Filamentos ({formData.colors} {formData.colors == 1 ? 'cor' : 'cores'})
            </h3>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
              {usedFilaments.map((item, i) => (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem', background:'rgba(255,255,255,0.03)', padding:'0.85rem', borderRadius:'8px', border:'1px solid rgba(255,255,255,0.08)' }}>
                  <div>
                    <label style={lbl}>Filamento da Cor {i + 1}</label>
                    <div style={{ position:'relative' }}>
                      <input
                        type="text"
                        placeholder="Digite SKU, marca, cor ou categoria..."
                        value={searchTerms[i] || ''}
                        onChange={e => handleSearchChange(i, e.target.value)}
                        onFocus={() => setShowSuggestions(prev => prev.map((_, j) => j===i ? true : _))}
                        onBlur={() => setTimeout(() => setShowSuggestions(prev => prev.map((_, j) => j===i ? false : _)), 200)}
                        onKeyDown={e => handleFilamentKeyDown(e, i)}
                        style={inp}
                      />
                      {showSuggestions[i] && searchTerms[i] && (() => {
                        const filtered = getFiltered(i);
                        if (!filtered.length) return (
                          <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:100, background:'#1f2937', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'0.5rem', marginTop:'0.25rem', padding:'0.75rem', textAlign:'center', color:'#64748B', fontSize:'0.85rem' }}>
                            Nenhum filamento encontrado
                          </div>
                        );
                        return (
                          <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:100, background:'#1f2937', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'0.5rem', marginTop:'0.25rem', maxHeight:'220px', overflowY:'auto', boxShadow:'0 10px 40px rgba(0,0,0,0.5)' }}>
                            {filtered.map((f, li) => (
                              <div key={f.id} onMouseDown={() => selectFilament(i, f)}
                                style={{ padding:'0.65rem 0.85rem', cursor:'pointer', borderBottom:'1px solid rgba(255,255,255,0.04)', background: li===highlightedIdxs[i] ? 'rgba(59,130,246,0.25)':'transparent', transition:'background 0.12s' }}
                                onMouseEnter={e => e.currentTarget.style.background='rgba(59,130,246,0.15)'}
                                onMouseLeave={e => e.currentTarget.style.background = li===highlightedIdxs[i] ? 'rgba(59,130,246,0.25)':'transparent'}>
                                <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
                                  <span style={{ fontSize:'0.72rem', background:'rgba(0,240,255,0.1)', color:'var(--primary)', padding:'0.1rem 0.4rem', borderRadius:'4px', flexShrink:0 }}>{f.sku}</span>
                                  <div>
                                    <div style={{ fontWeight:600, fontSize:'0.85rem', display:'flex', alignItems:'center', gap:'0.35rem' }}>
                                      <ColorDot cor={f.cor} size={8} />
                                      <span style={{ color:getBrandColor(f.marca) }}>{f.marca}</span>
                                      <span style={{ color:'#64748B', fontWeight:400 }}>–</span>
                                      <span style={{ color:getColorFromName(f.cor) }}>{f.cor}</span>
                                    </div>
                                    <div style={{ fontSize:'0.72rem', color:'#64748B' }}>{f.categoria}</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>Peso Gasto (Gramas)</label>
                    <MaskedNumberInput
                      value={item.weightGrams}
                      onChange={v => setUsedFilaments(prev => prev.map((u, j) => j===i ? { ...u, weightGrams: v } : u))}
                      style={inp}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ fontSize:'0.83rem', color:'#F87171', marginBottom:'0.75rem', background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.2)', borderRadius:'6px', padding:'0.5rem 0.75rem' }}>
              {error}
            </div>
          )}

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'0.75rem' }}>
            {/* Excluir da fila */}
            <button type="button" onClick={onDelete} style={{
              padding:'0.65rem 1.1rem', background:'transparent',
              border:'1px solid rgba(248,113,113,0.35)', borderRadius:'8px',
              color:'#F87171', cursor:'pointer', fontFamily:'inherit', fontSize:'0.85rem', fontWeight:600,
              transition:'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(248,113,113,0.1)'; e.currentTarget.style.borderColor='rgba(248,113,113,0.6)'; }}
            onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='rgba(248,113,113,0.35)'; }}>
              🗑 Excluir da fila
            </button>

            <div style={{ display:'flex', gap:'0.75rem' }}>
              <button type="button" onClick={onClose} style={{
                padding:'0.65rem 1.2rem', background:'transparent',
                border:'1px solid rgba(255,255,255,0.12)', borderRadius:'8px',
                color:'#94A3B8', cursor:'pointer', fontFamily:'inherit', fontSize:'0.9rem',
              }}>Cancelar</button>
              <button type="submit" disabled={saving} style={{
                padding:'0.65rem 1.75rem',
                background:'linear-gradient(135deg, var(--primary), var(--secondary))',
                border:'none', borderRadius:'8px',
                color:'#000', fontWeight:800, cursor:'pointer', fontFamily:'inherit', fontSize:'0.9rem',
                opacity: saving ? 0.7 : 1,
              }}>
                {saving ? 'A guardar...' : 'Registrar Impressão ✓'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
