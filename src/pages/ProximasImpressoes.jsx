import React, { useState, useEffect, useRef } from 'react';
import {
  getProximas, saveProxima, updateProxima, deleteProxima, reorderProximas,
  getAllFilamentsWithStock, getFilaments,
} from '../services/storage';
import OtimizadorModal from '../components/OtimizadorModal';
import RegistrarImpressaoModal from '../components/RegistrarImpressaoModal';
import MaskedNumberInput from '../components/MaskedNumberInput';
import { ColorDot, getColorFromName, getBrandColor } from '../utils/colorUtils';

const inputStyle = {
  background: 'var(--card-bg)',
  border: '1px solid var(--card-border)',
  borderRadius: '8px',
  padding: '0.6rem 0.9rem',
  color: 'var(--text)',
  fontSize: '0.9rem',
  fontFamily: 'var(--font-family)',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const timeNumStyle = {
  ...inputStyle,
  width: '58px',
  textAlign: 'center',
  padding: '0.6rem 0.4rem',
};

const labelStyle = {
  fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block',
  marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px',
};

const fmtTempo = (min) => {
  if (!min) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
};

const totalFromPlacas = (placas) =>
  (placas || []).reduce((s, p) => s + (Number(p.tempoMinutos) || 0), 0);

const emptyPlaca = (i) => ({
  nome: `Placa ${i + 1}`, h: '', m: '',
  cores: 1, filamentos: [{ sku: '', weightGrams: '' }],
});

const emptyPlacas = (n) => Array.from({ length: n }, (_, i) => emptyPlaca(i));

const syncPlacas = (current, n) => {
  const next = [...current];
  while (next.length < n) next.push(emptyPlaca(next.length));
  return next.slice(0, n);
};

/* ─── PlacaRow (formulário) ─────────────────────────────────────────────── */
const PlacaRow = ({ placa, index, onChange, onSubmit, filaments, allFilaments }) => {
  const numCores = Math.max(1, parseInt(placa.cores) || 1);

  const mkLabel = (f) => {
    if (!f?.sku) return '';
    const info = allFilaments?.find(x => x.sku === f.sku);
    return info ? `${info.marca} - ${info.cor} (${f.sku})` : f.sku;
  };

  const [searchTerms, setSearchTerms] = useState(() =>
    Array.from({ length: numCores }, (_, i) => mkLabel((placa.filamentos || [])[i]))
  );
  const [showSugs, setShowSugs] = useState(Array(numCores).fill(false));
  const [highlighted, setHighlighted] = useState(Array(numCores).fill(-1));

  useEffect(() => {
    const n = Math.max(1, parseInt(placa.cores) || 1);
    const resize = (arr, empty) => {
      const next = [...arr];
      while (next.length < n) next.push(empty);
      return next.slice(0, n);
    };
    setSearchTerms(prev => resize(prev, ''));
    setShowSugs(prev => resize(prev, false));
    setHighlighted(prev => resize(prev, -1));
  }, [placa.cores]);

  const getFiltered = (i) => {
    const s = (searchTerms[i] || '').toLowerCase();
    if (!s) return [];
    return (filaments || []).filter(f =>
      f.sku.toLowerCase().includes(s) || f.marca.toLowerCase().includes(s) ||
      f.cor.toLowerCase().includes(s) || (f.categoria || '').toLowerCase().includes(s)
    ).slice(0, 8);
  };

  const selectFilament = (i, f) => {
    setSearchTerms(prev => prev.map((t, j) => j === i ? `${f.marca} - ${f.cor} (${f.sku})` : t));
    setShowSugs(prev => prev.map((_, j) => j === i ? false : _));
    setHighlighted(prev => prev.map((_, j) => j === i ? -1 : _));
    const newFils = [...(placa.filamentos || [])];
    while (newFils.length <= i) newFils.push({ sku: '', weightGrams: '' });
    newFils[i] = { ...newFils[i], sku: f.sku };
    onChange(index, 'filamentos', newFils);
  };

  const updateWeight = (i, val) => {
    const newFils = [...(placa.filamentos || [])];
    while (newFils.length <= i) newFils.push({ sku: '', weightGrams: '' });
    newFils[i] = { ...newFils[i], weightGrams: val };
    onChange(index, 'filamentos', newFils);
  };

  const handleSearchChange = (i, val) => {
    setSearchTerms(prev => prev.map((t, j) => j === i ? val : t));
    setShowSugs(prev => prev.map((_, j) => j === i ? !!val : _));
    setHighlighted(prev => prev.map((_, j) => j === i ? -1 : _));
    if (!val) {
      const newFils = [...(placa.filamentos || [])];
      if (newFils[i]) newFils[i] = { ...newFils[i], sku: '' };
      onChange(index, 'filamentos', newFils);
    }
  };

  const handleKeyDown = (e, i) => {
    const filtered = getFiltered(i);
    if (!showSugs[i] || !filtered.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(prev => prev.map((h, j) => j === i ? Math.min(h + 1, filtered.length - 1) : h));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(prev => prev.map((h, j) => j === i ? Math.max(h - 1, 0) : h));
    } else if (e.key === 'Enter' && highlighted[i] >= 0) {
      e.preventDefault();
      selectFilament(i, filtered[highlighted[i]]);
    } else if (e.key === 'Escape') {
      setShowSugs(prev => prev.map((_, j) => j === i ? false : _));
    }
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)', borderRadius: '10px',
      padding: '0.75rem 1rem', border: '1px solid var(--card-border)',
    }}>
      {/* Linha 1: número, nome, tempo, cores */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700, minWidth: '16px' }}>
          {index + 1}
        </span>
        <input
          style={{ ...inputStyle, flex: 1 }}
          value={placa.nome}
          onChange={e => onChange(index, 'nome', e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSubmit?.()}
          placeholder={`Placa ${index + 1}`}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
          <input type="number" style={timeNumStyle} min="0" max="99"
            placeholder="0" value={placa.h}
            onChange={e => onChange(index, 'h', e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSubmit?.()}
          />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>h</span>
          <input type="number" style={timeNumStyle} min="0" max="59"
            placeholder="0" value={placa.m}
            onChange={e => onChange(index, 'm', e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSubmit?.()}
          />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>min</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
          <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)', fontWeight: 600 }}>Cores</span>
          <input type="number" style={{ ...timeNumStyle, width: '50px' }}
            min="1" max="16"
            value={placa.cores || 1}
            onChange={e => onChange(index, 'cores', Math.max(1, parseInt(e.target.value) || 1))}
          />
        </div>
      </div>

      {/* Linhas de filamentos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.5rem', paddingLeft: '1.25rem' }}>
        {Array.from({ length: numCores }, (_, i) => {
          const fil = (placa.filamentos || [])[i] || { sku: '', weightGrams: '' };
          const filtered = getFiltered(i);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--primary)', minWidth: '10px', opacity: 0.5 }}>↳</span>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="text"
                  placeholder="Filamento — marca, cor ou SKU..."
                  value={searchTerms[i] || ''}
                  onChange={e => handleSearchChange(i, e.target.value)}
                  onFocus={() => setShowSugs(prev => prev.map((_, j) => j === i ? !!(searchTerms[i]) : _))}
                  onBlur={() => setTimeout(() => setShowSugs(prev => prev.map((_, j) => j === i ? false : _)), 200)}
                  onKeyDown={e => handleKeyDown(e, i)}
                  style={{ ...inputStyle, fontSize: '0.82rem', padding: '0.45rem 0.75rem' }}
                />
                {showSugs[i] && filtered.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 300, background: '#1a1f2e', border: '1px solid var(--card-border)', borderRadius: '8px', marginTop: '2px', maxHeight: '190px', overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                    {filtered.map((f, li) => (
                      <div key={f.id || f.sku} onMouseDown={() => selectFilament(i, f)}
                        onMouseEnter={() => setHighlighted(prev => prev.map((_, j) => j === i ? li : _))}
                        style={{ padding: '0.5rem 0.8rem', cursor: 'pointer', fontSize: '0.82rem', background: li === highlighted[i] ? 'rgba(0,240,255,0.12)' : 'transparent', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ fontSize: '0.68rem', background: 'rgba(0,240,255,0.1)', color: 'var(--primary)', padding: '0.1rem 0.35rem', borderRadius: '4px', flexShrink: 0 }}>{f.sku}</span>
                        <ColorDot cor={f.cor} size={8} />
                        <span style={{ color: getBrandColor(f.marca) }}>{f.marca}</span>
                        <span style={{ color: 'var(--text-muted)' }}>–</span>
                        <span style={{ color: getColorFromName(f.cor) }}>{f.cor}</span>
                        {f.currentStock != null && (
                          <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: f.currentStock > 0 ? 'var(--text-muted)' : '#F87171', flexShrink: 0 }}>
                            {f.currentStock > 0 ? `${f.currentStock.toFixed(0)}g stock` : 'sem stock'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {showSugs[i] && searchTerms[i] && filtered.length === 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 300, background: '#1a1f2e', border: '1px solid var(--card-border)', borderRadius: '8px', marginTop: '2px', padding: '0.65rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Nenhum filamento encontrado
                  </div>
                )}
              </div>
              <MaskedNumberInput
                value={fil.weightGrams || ''}
                onChange={v => updateWeight(i, v)}
                style={{ ...timeNumStyle, width: '65px' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>g</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─── FormFields ─────────────────────────────────────────────────────────── */
const FormFields = ({ t, setT, l, setL, np, setNP, ps, onPChange, onSubmit, onCancel, err, isEdit, titleRef, filaments, allFilaments }) => (
  <div>
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '1rem' }}>
      <div style={{ flex: '1 1 180px' }}>
        <label style={labelStyle}>Título *</label>
        <input ref={titleRef} style={inputStyle} placeholder="Nome do modelo..." value={t}
          onChange={e => setT(e.target.value)} onKeyDown={e => e.key === 'Enter' && onSubmit()} />
      </div>
      <div style={{ flex: '2 1 220px' }}>
        <label style={labelStyle}>Link</label>
        <input style={inputStyle} placeholder="https://www.thingiverse.com/..." value={l}
          onChange={e => setL(e.target.value)} onKeyDown={e => e.key === 'Enter' && onSubmit()} />
      </div>
      <div style={{ flexShrink: 0 }}>
        <label style={labelStyle}>Nº de Placas</label>
        <input type="number" min="1" max="20"
          style={{ ...inputStyle, width: '80px', textAlign: 'center' }}
          value={np} onChange={e => setNP(Math.max(1, parseInt(e.target.value) || 1))} />
      </div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
      {ps.map((p, i) => (
        <PlacaRow key={i} placa={p} index={i} onChange={onPChange} onSubmit={onSubmit}
          filaments={filaments} allFilaments={allFilaments} />
      ))}
    </div>
    {err && <div style={{ fontSize: '0.8rem', color: '#F87171', marginBottom: '0.75rem' }}>{err}</div>}
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
      {isEdit && (
        <button onClick={onCancel} style={{ padding: '0.6rem 1rem', background: 'transparent', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'var(--font-family)' }}>
          Cancelar
        </button>
      )}
      <button onClick={onSubmit} style={{ padding: '0.65rem 1.5rem', background: 'linear-gradient(to right, var(--primary), var(--secondary))', border: 'none', borderRadius: '8px', color: '#000', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'var(--font-family)' }}>
        {isEdit ? 'Salvar' : '+ Adicionar'}
      </button>
    </div>
  </div>
);

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function ProximasImpressoes() {
  const [items, setItems] = useState([]);
  const [filaments, setFilaments] = useState([]);
  const [allFilaments, setAllFilaments] = useState([]);

  // ── Add form ──
  const addTitleRef = useRef(null);
  const [titulo, setTitulo] = useState('');
  const [link, setLink] = useState('');
  const [numPlacas, setNumPlacas] = useState(1);
  const [placas, setPlacas] = useState(emptyPlacas(1));
  const [error, setError] = useState('');

  // ── Edit state ──
  const [editingId, setEditingId] = useState(null);
  const [editTitulo, setEditTitulo] = useState('');
  const [editLink, setEditLink] = useState('');
  const [editNumPlacas, setEditNumPlacas] = useState(1);
  const [editPlacas, setEditPlacas] = useState(emptyPlacas(1));
  const [editError, setEditError] = useState('');

  // ── Modals ──
  const [showOtimizador, setShowOtimizador] = useState(false);
  const [registrarModal, setRegistrarModal] = useState(null);

  // ── Drag ──
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  useEffect(() => {
    setItems(getProximas());
    const all = getAllFilamentsWithStock();
    all.sort((a, b) => a.marca.localeCompare(b.marca) || a.cor.localeCompare(b.cor));
    setFilaments(all);
    setAllFilaments(getFilaments());
  }, []);

  useEffect(() => { setPlacas(prev => syncPlacas(prev, numPlacas)); }, [numPlacas]);
  useEffect(() => { setEditPlacas(prev => syncPlacas(prev, editNumPlacas)); }, [editNumPlacas]);

  const reload = () => setItems(getProximas());

  const handlePlacaChange = (idx, field, val) => {
    setPlacas(prev => prev.map((p, i) => {
      if (i !== idx) return p;
      const updated = { ...p, [field]: val };
      if (field === 'cores') {
        const n = Math.max(1, parseInt(val) || 1);
        const cur = p.filamentos || [];
        const newFils = [...cur];
        while (newFils.length < n) newFils.push({ sku: '', weightGrams: '' });
        updated.filamentos = newFils.slice(0, n);
      }
      return updated;
    }));
  };

  const handleEditPlacaChange = (idx, field, val) => {
    setEditPlacas(prev => prev.map((p, i) => {
      if (i !== idx) return p;
      const updated = { ...p, [field]: val };
      if (field === 'cores') {
        const n = Math.max(1, parseInt(val) || 1);
        const cur = p.filamentos || [];
        const newFils = [...cur];
        while (newFils.length < n) newFils.push({ sku: '', weightGrams: '' });
        updated.filamentos = newFils.slice(0, n);
      }
      return updated;
    }));
  };

  const buildPlacasSave = (ps) =>
    ps.map(p => ({
      nome: p.nome || 'Placa',
      tempoMinutos: (parseInt(p.h) || 0) * 60 + (parseInt(p.m) || 0),
      cores: Math.max(1, parseInt(p.cores) || 1),
      filamentos: (p.filamentos || []).filter(f => f.sku).map(f => ({ sku: f.sku, weightGrams: Number(f.weightGrams) || 0 })),
    }));

  // ── Add ──
  const handleAdd = () => {
    if (!titulo.trim()) { setError('O título é obrigatório.'); return; }
    const saved = buildPlacasSave(placas);
    if (saved.every(p => p.tempoMinutos === 0)) { setError('Informe o tempo de pelo menos uma placa.'); return; }
    saveProxima({ titulo: titulo.trim(), link: link.trim(), placas: saved });
    setTitulo(''); setLink(''); setNumPlacas(1); setPlacas(emptyPlacas(1)); setError('');
    reload();
    setTimeout(() => addTitleRef.current?.focus(), 0);
  };

  // ── Edit ──
  const handleStartEdit = (item) => {
    setEditingId(item.id);
    setEditTitulo(item.titulo || '');
    setEditLink(item.link || '');
    const ps = item.placas?.length
      ? item.placas.map(p => {
          const numC = p.cores || 1;
          const fils = p.filamentos?.length
            ? p.filamentos
            : Array.from({ length: numC }, () => ({ sku: '', weightGrams: '' }));
          return {
            nome: p.nome || 'Placa',
            h: String(Math.floor((p.tempoMinutos || 0) / 60)),
            m: String((p.tempoMinutos || 0) % 60),
            cores: numC,
            filamentos: fils,
          };
        })
      : [{ nome: 'Placa 1', h: String(Math.floor((item.tempoMinutos || 0) / 60)), m: String((item.tempoMinutos || 0) % 60), cores: 1, filamentos: [{ sku: '', weightGrams: '' }] }];
    setEditNumPlacas(ps.length);
    setEditPlacas(ps);
    setEditError('');
  };

  const handleSaveEdit = () => {
    if (!editTitulo.trim()) { setEditError('O título é obrigatório.'); return; }
    const saved = buildPlacasSave(editPlacas);
    if (saved.every(p => p.tempoMinutos === 0)) { setEditError('Informe o tempo de pelo menos uma placa.'); return; }
    updateProxima({ id: editingId, titulo: editTitulo.trim(), link: editLink.trim(), placas: saved });
    setEditingId(null);
    reload();
  };

  const handleCancelEdit = () => { setEditingId(null); setEditError(''); };

  // ── Delete ──
  const handleDelete = (id) => { deleteProxima(id); reload(); };

  // ── Registrar placa ──
  const handleDeletePlaca = (itemId, placaIndex) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const placa = item.placas?.[placaIndex];
    setRegistrarModal({
      itemId, placaIndex,
      description: item.titulo || '',
      project: '',
      timeMinutes: placa?.tempoMinutos || item.tempoMinutos || '',
      cores: placa?.cores || 1,
      filamentos: placa?.filamentos || [],
    });
  };

  const removePlacaFromQueue = (itemId, placaIndex) => {
    const item = items.find(i => i.id === itemId);
    if (!item) { reload(); return; }
    if (!item.placas?.length) { deleteProxima(itemId); reload(); return; }
    const newPlacas = item.placas.filter((_, i) => i !== placaIndex);
    if (newPlacas.length === 0) deleteProxima(itemId);
    else updateProxima({ ...item, placas: newPlacas });
    reload();
  };

  const handleRegistrarSaved = () => {
    const { itemId, placaIndex } = registrarModal;
    setRegistrarModal(null);
    removePlacaFromQueue(itemId, placaIndex);
  };

  const handleExcluirDaFila = () => {
    const { itemId, placaIndex } = registrarModal;
    setRegistrarModal(null);
    removePlacaFromQueue(itemId, placaIndex);
  };

  // ── Drag ──
  const handleDragStart = (idx) => setDragIdx(idx);
  const handleDragOver = (e, idx) => { e.preventDefault(); setOverIdx(idx); };
  const handleDrop = () => {
    if (dragIdx === null || overIdx === null || dragIdx === overIdx) { setDragIdx(null); setOverIdx(null); return; }
    const reordered = [...items];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(overIdx, 0, moved);
    reorderProximas(reordered);
    setItems(reordered);
    setDragIdx(null); setOverIdx(null);
  };

  const getAllPlates = () =>
    items.flatMap(item => {
      const ps = item.placas?.length
        ? item.placas
        : item.tempoMinutos ? [{ nome: 'Placa 1', tempoMinutos: item.tempoMinutos }] : [];
      return ps.filter(p => p.tempoMinutos > 0).map(p => ({ titulo: item.titulo, nomePlaca: p.nome, tempoMinutos: p.tempoMinutos }));
    });

  // ── Resumo de filamentos ──
  const getFilamentSummary = () => {
    const totals = {};
    items.forEach(item => {
      (item.placas || []).forEach(p => {
        (p.filamentos || []).forEach(f => {
          if (!f.sku || !f.weightGrams) return;
          totals[f.sku] = (totals[f.sku] || 0) + Number(f.weightGrams);
        });
      });
    });
    return Object.entries(totals)
      .map(([sku, totalGrams]) => {
        const info = allFilaments.find(f => f.sku === sku);
        const withStock = filaments.find(f => f.sku === sku);
        return { sku, totalGrams, info: info || withStock };
      })
      .sort((a, b) => (a.info?.marca || '').localeCompare(b.info?.marca || ''));
  };

  const summary = getFilamentSummary();

  return (
    <div>
      {showOtimizador && <OtimizadorModal plates={getAllPlates()} onClose={() => setShowOtimizador(false)} />}

      {registrarModal && (
        <RegistrarImpressaoModal
          initialDescription={registrarModal.description}
          initialProject={registrarModal.project}
          initialTimeMinutes={registrarModal.timeMinutes}
          initialCores={registrarModal.cores}
          initialFilaments={registrarModal.filamentos}
          onClose={() => setRegistrarModal(null)}
          onSaved={handleRegistrarSaved}
          onDelete={handleExcluirDaFila}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text)', marginBottom: '0.3rem' }}>
            Próximas impressões
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Planeie o que vai imprimir e os filamentos necessários
          </p>
        </div>
        <button
          onClick={() => setShowOtimizador(true)}
          style={{ padding: '0.65rem 1.25rem', background: 'linear-gradient(to right, var(--primary), var(--secondary))', border: 'none', borderRadius: '10px', color: '#000', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'var(--font-family)', display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
          ⚡ Otimizador
        </button>
      </div>

      {/* Add form */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '14px', padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Adicionar modelo
        </div>
        <FormFields
          t={titulo} setT={setTitulo}
          l={link} setL={setLink}
          np={numPlacas} setNP={setNumPlacas}
          ps={placas} onPChange={handlePlacaChange}
          onSubmit={handleAdd}
          err={error}
          isEdit={false}
          titleRef={addTitleRef}
          filaments={filaments}
          allFilaments={allFilaments}
        />
      </div>

      {/* Lista */}
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
          <div style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.4rem' }}>Nenhum modelo na lista</div>
          <div style={{ fontSize: '0.85rem' }}>Adicione modelos que pretende imprimir em breve.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {items.map((item, idx) => {
            const itemPlacas = item.placas?.length
              ? item.placas
              : item.tempoMinutos ? [{ nome: 'Placa 1', tempoMinutos: item.tempoMinutos }] : [];
            const totalMin = totalFromPlacas(itemPlacas);
            const isEditing = editingId === item.id;

            return (
              <div
                key={item.id}
                draggable={!isEditing}
                onDragStart={() => handleDragStart(idx)}
                onDragOver={e => handleDragOver(e, idx)}
                onDrop={handleDrop}
                onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
                style={{
                  background: 'var(--card-bg)',
                  border: `1px solid ${isEditing ? 'var(--primary)' : overIdx === idx && dragIdx !== idx ? 'var(--primary)' : 'var(--card-border)'}`,
                  borderRadius: '12px', padding: '1rem 1.25rem',
                  transition: 'border-color 0.15s, opacity 0.15s',
                  opacity: dragIdx === idx ? 0.4 : 1,
                  cursor: isEditing ? 'default' : 'grab',
                }}
              >
                {isEditing ? (
                  <FormFields
                    t={editTitulo} setT={setEditTitulo}
                    l={editLink} setL={setEditLink}
                    np={editNumPlacas} setNP={setEditNumPlacas}
                    ps={editPlacas} onPChange={handleEditPlacaChange}
                    onSubmit={handleSaveEdit}
                    onCancel={handleCancelEdit}
                    err={editError}
                    isEdit={true}
                    filaments={filaments}
                    allFilaments={allFilaments}
                  />
                ) : (
                  <div>
                    {/* Cabeçalho */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: itemPlacas.length > 0 ? '0.75rem' : 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>⠿</span>
                        <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(0,240,255,0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '700', flexShrink: 0 }}>
                          {idx + 1}
                        </span>
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text)', marginBottom: '1px' }}>{item.titulo}</div>
                        {item.link && (
                          <a href={item.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                            style={{ fontSize: '0.78rem', color: 'var(--primary)', textDecoration: 'none', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: '100%' }}
                            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                            onMouseLeave={e => e.currentTarget.style.opacity = '0.8'}>
                            🔗 {item.link}
                          </a>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: '999px' }}>
                          {itemPlacas.length} {itemPlacas.length === 1 ? 'placa' : 'placas'}
                        </span>
                        <span style={{ padding: '0.3rem 0.75rem', background: 'rgba(0,240,255,0.07)', border: '1px solid rgba(0,240,255,0.18)', borderRadius: '8px', color: 'var(--primary)', fontSize: '0.82rem', fontWeight: '700' }}>
                          🕐 {fmtTempo(totalMin)}
                        </span>
                      </div>

                      {item.link && (
                        <a href={item.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                          style={{ padding: '0.4rem 0.9rem', background: 'rgba(0,240,255,0.08)', border: '1px solid rgba(0,240,255,0.2)', borderRadius: '8px', color: 'var(--primary)', fontSize: '0.8rem', fontWeight: '600', textDecoration: 'none', flexShrink: 0, fontFamily: 'var(--font-family)' }}>
                          Abrir
                        </a>
                      )}

                      <button onClick={() => handleStartEdit(item)}
                        style={{ background: 'transparent', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', padding: '0.4rem 0.8rem', flexShrink: 0, fontFamily: 'var(--font-family)', transition: 'color 0.15s, border-color 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--text-muted)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--card-border)'; }}>
                        Editar
                      </button>

                      <button onClick={() => handleDelete(item.id)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem', padding: '0.25rem', borderRadius: '6px', flexShrink: 0, lineHeight: 1, transition: 'color 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#F87171'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                        title="Remover modelo">✕
                      </button>
                    </div>

                    {/* Placas */}
                    {itemPlacas.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingLeft: '3rem' }}>
                        {itemPlacas.map((p, pi) => {
                          const hasFils = (p.filamentos || []).filter(f => f.sku).length > 0;
                          return (
                            <div key={pi} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '0.5rem 0.75rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                              {/* Linha da placa */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem' }}>
                                <span style={{ color: 'var(--primary)', fontWeight: 600, minWidth: '14px' }}>{pi + 1}.</span>
                                <span style={{ color: 'var(--text)', flex: 1 }}>{p.nome || `Placa ${pi + 1}`}</span>
                                {p.cores > 1 && (
                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.45rem', borderRadius: '999px' }}>
                                    {p.cores} cores
                                  </span>
                                )}
                                <span style={{ color: p.tempoMinutos ? 'var(--text)' : 'var(--text-muted)', fontWeight: 600, minWidth: '60px', textAlign: 'right' }}>
                                  {fmtTempo(p.tempoMinutos)}
                                </span>
                                {totalMin > 0 && (
                                  <div style={{ width: '70px', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden', flexShrink: 0 }}>
                                    <div style={{ width: `${((p.tempoMinutos || 0) / totalMin) * 100}%`, height: '100%', background: 'var(--primary)', borderRadius: '2px' }} />
                                  </div>
                                )}
                                <button
                                  onClick={() => handleDeletePlaca(item.id, pi)}
                                  style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '0.85rem', padding: '0 0.1rem', lineHeight: 1, flexShrink: 0, transition: 'color 0.15s' }}
                                  onMouseEnter={e => e.currentTarget.style.color = '#F87171'}
                                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}
                                  title="Registar impressão e remover da fila">✕
                                </button>
                              </div>

                              {/* Filamentos da placa */}
                              {hasFils && (
                                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.4rem', paddingLeft: '1.25rem' }}>
                                  {(p.filamentos || []).filter(f => f.sku).map((f, fi) => {
                                    const info = allFilaments.find(x => x.sku === f.sku);
                                    return (
                                      <span key={fi} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--card-border)', borderRadius: '999px', padding: '0.18rem 0.6rem' }}>
                                        {info && <ColorDot cor={info.cor} size={7} />}
                                        <span style={{ color: info ? getColorFromName(info.cor) : 'var(--text-muted)' }}>
                                          {info ? `${info.marca} ${info.cor}` : f.sku}
                                        </span>
                                        {f.weightGrams > 0 && (
                                          <span style={{ color: 'var(--text-muted)' }}>· {Number(f.weightGrams).toFixed(0)}g</span>
                                        )}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Resumo de filamentos */}
      {summary.length > 0 && (
        <div style={{ marginTop: '2rem', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '14px', padding: '1.5rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            📦 Resumo de Filamentos Necessários
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {summary.map(({ sku, totalGrams, info }) => {
              const withStock = filaments.find(f => f.sku === sku);
              const stock = withStock?.currentStock ?? null;
              const deficit = stock !== null ? stock - totalGrams : null;
              return (
                <div key={sku} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.9rem', background: 'rgba(255,255,255,0.025)', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                  {info && <ColorDot cor={info.cor} size={12} />}
                  <div style={{ flex: 1, fontSize: '0.88rem' }}>
                    {info ? (
                      <>
                        <span style={{ color: getBrandColor(info.marca), fontWeight: 600 }}>{info.marca}</span>
                        <span style={{ color: 'var(--text-muted)', margin: '0 0.3rem' }}>–</span>
                        <span style={{ color: getColorFromName(info.cor) }}>{info.cor}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.73rem', marginLeft: '0.4rem' }}>({sku})</span>
                      </>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>{sku}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                    <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.95rem' }}>
                      {totalGrams.toFixed(0)}g necessário
                    </span>
                    {stock !== null && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        · {stock.toFixed(0)}g stock
                      </span>
                    )}
                    {deficit !== null && (
                      <span style={{
                        fontSize: '0.78rem', fontWeight: 700, padding: '0.15rem 0.55rem', borderRadius: '999px',
                        background: deficit >= 0 ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
                        color: deficit >= 0 ? '#34D399' : '#F87171',
                        border: `1px solid ${deficit >= 0 ? 'rgba(52,211,153,0.25)' : 'rgba(248,113,113,0.25)'}`,
                      }}>
                        {deficit >= 0 ? `✓ sobra ${deficit.toFixed(0)}g` : `⚠ faltam ${Math.abs(deficit).toFixed(0)}g`}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
