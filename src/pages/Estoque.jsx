import React, { useState, useEffect, useRef } from 'react';
import { getAllFilamentsWithStock, getCategories, getBrands } from '../services/storage';
import { getColorFromName } from '../utils/colorUtils';

const LOW_STOCK = 250;
const MEDIUM_STOCK = 500;
const FULL_SPOOL = 1000;

const Select = ({ value, onChange, options }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find(o => o.value === value) || options[0];

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', userSelect: 'none' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '8px',
          padding: '0.5rem 0.85rem',
          color: 'var(--text)',
          fontSize: '0.85rem',
          fontFamily: 'var(--font-family)',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {selected.label}
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: '2px' }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          zIndex: 100,
          background: '#1a1f2e',
          border: '1px solid var(--card-border)',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          minWidth: '100%',
        }}>
          {options.map(opt => (
            <div
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{
                padding: '0.55rem 1rem',
                fontSize: '0.85rem',
                color: opt.value === value ? 'var(--primary)' : 'var(--text)',
                background: opt.value === value ? 'rgba(0,240,255,0.08)' : 'transparent',
                cursor: 'pointer',
                transition: 'background 0.15s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { if (opt.value !== value) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={e => { if (opt.value !== value) e.currentTarget.style.background = 'transparent'; }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const getStockStatus = (stock) => {
  if (stock <= 0) return { label: 'Vazio', color: '#374151', textColor: '#6B7280', badge: '#374151' };
  if (stock < LOW_STOCK) return { label: 'Crítico', color: '#DC2626', textColor: '#F87171', badge: '#B91C1C' };
  if (stock < MEDIUM_STOCK) return { label: 'Baixo', color: '#D97706', textColor: '#FCD34D', badge: '#B45309' };
  return { label: 'OK', color: '#059669', textColor: '#34D399', badge: '#047857' };
};

const SpoolCard = ({ filament }) => {
  const color = getColorFromName(filament.cor);
  const status = getStockStatus(filament.currentStock);
  const fillPercent = Math.min(100, Math.max(0, (filament.currentStock / FULL_SPOOL) * 100));
  const isLight = ['#E2E8F0', '#CBD5E1', '#EAB308'].includes(color);

  return (
    <div
      title={`${filament.marca} · ${filament.cor}\nSKU: ${filament.sku}\nCategoria: ${filament.categoria}\nEstoque: ${filament.currentStock}g`}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-6px)';
        e.currentTarget.style.boxShadow = `0 12px 32px ${color}44`;
        e.currentTarget.style.borderColor = color + '88';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = 'var(--card-border)';
      }}
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: '14px',
        overflow: 'hidden',
        width: '130px',
        flexShrink: 0,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        cursor: 'default',
        position: 'relative',
      }}
    >
      {/* Color top */}
      <div style={{
        height: '86px',
        background: `linear-gradient(150deg, ${color}DD 0%, ${color}99 60%, ${color}44 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        {/* Spool outer ring */}
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: color,
          border: `5px solid rgba(${isLight ? '0,0,0' : '255,255,255'},0.15)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 4px 16px ${color}66, inset 0 2px 4px rgba(255,255,255,0.15)`,
        }}>
          {/* Spool hub */}
          <div style={{
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            background: `rgba(${isLight ? '0,0,0' : '255,255,255'},0.2)`,
            border: `3px solid rgba(${isLight ? '0,0,0' : '255,255,255'},0.12)`,
          }} />
        </div>

        {/* Status badge */}
        <div style={{
          position: 'absolute',
          top: '6px',
          right: '6px',
          background: status.badge,
          borderRadius: '5px',
          padding: '2px 7px',
          fontSize: '0.58rem',
          fontWeight: '800',
          color: '#fff',
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
        }}>
          {status.label}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '10px 10px 12px' }}>
        <div style={{
          fontSize: '0.6rem',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
          marginBottom: '3px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}>
          <span>{filament.marca}</span>
          {filament.marca === 'Bambu Lab' && (
            <span style={{ color: 'var(--primary)', fontWeight: '700', opacity: 0.85 }}>
              {filament.sku}
            </span>
          )}
        </div>
        <div style={{
          fontSize: '0.82rem',
          fontWeight: '700',
          color: 'var(--text)',
          marginBottom: '1px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {filament.cor}
        </div>
        <div style={{
          fontSize: '0.72rem',
          fontWeight: '600',
          color: status.textColor,
          marginBottom: '7px',
        }}>
          {filament.currentStock > 0 ? `${filament.currentStock.toFixed(0)}g` : '—'}
        </div>

        {/* Fill bar */}
        <div style={{
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '4px',
          height: '5px',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${fillPercent}%`,
            height: '100%',
            background: `linear-gradient(to right, ${status.textColor}88, ${status.textColor})`,
            borderRadius: '4px',
            transition: 'width 0.6s ease',
          }} />
        </div>
      </div>
    </div>
  );
};

const Shelf = ({ category, filaments }) => {
  if (filaments.length === 0) return null;

  const totalStock = filaments.reduce((s, f) => s + Math.max(0, f.currentStock), 0);
  const lowCount = filaments.filter(f => f.currentStock > 0 && f.currentStock < LOW_STOCK).length;
  const emptyCount = filaments.filter(f => f.currentStock <= 0).length;

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      {/* Shelf header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1rem',
      }}>
        <div style={{
          fontSize: '1rem',
          fontWeight: '700',
          color: 'var(--text)',
          whiteSpace: 'nowrap',
        }}>
          {category}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
            background: 'rgba(255,255,255,0.06)',
            padding: '2px 8px',
            borderRadius: '20px',
          }}>
            {filaments.length} {filaments.length === 1 ? 'filamento' : 'filamentos'}
          </span>
          <span style={{
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
            background: 'rgba(255,255,255,0.06)',
            padding: '2px 8px',
            borderRadius: '20px',
          }}>
            {totalStock.toFixed(0)}g em estoque
          </span>
          {lowCount > 0 && (
            <span style={{
              fontSize: '0.7rem',
              color: '#FCD34D',
              background: 'rgba(217,119,6,0.15)',
              padding: '2px 8px',
              borderRadius: '20px',
              fontWeight: '600',
            }}>
              {lowCount} baixo
            </span>
          )}
          {emptyCount > 0 && (
            <span style={{
              fontSize: '0.7rem',
              color: '#9CA3AF',
              background: 'rgba(55,65,81,0.4)',
              padding: '2px 8px',
              borderRadius: '20px',
            }}>
              {emptyCount} vazio
            </span>
          )}
        </div>
        <div style={{ flex: 1, height: '1px', background: 'var(--card-border)' }} />
      </div>

      {/* Cards row */}
      <div style={{
        display: 'flex',
        gap: '0.85rem',
        flexWrap: 'wrap',
      }}>
        {filaments.map(f => (
          <SpoolCard key={f.id} filament={f} />
        ))}
      </div>

      {/* Shelf bottom line */}
      <div style={{
        height: '6px',
        background: 'linear-gradient(to right, var(--card-border), transparent)',
        borderRadius: '0 0 4px 4px',
        marginTop: '1.2rem',
        opacity: 0.5,
      }} />
    </div>
  );
};

export default function Estoque() {
  const [filaments, setFilaments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterBrand, setFilterBrand] = useState('all');

  useEffect(() => {
    setFilaments(getAllFilamentsWithStock());
    setCategories(getCategories());
  }, []);

  const brands = [...new Set(filaments.map(f => f.marca))].sort();

  const filtered = filaments.filter(f => {
    if (f.currentStock <= 0) return false;
    const q = search.toLowerCase();
    const matchSearch = !q || f.cor.toLowerCase().includes(q) || f.marca.toLowerCase().includes(q) || f.sku.toLowerCase().includes(q) || f.categoria.toLowerCase().includes(q);
    const matchCat = filterCategory === 'all' || f.categoria === filterCategory;
    const matchBrand = filterBrand === 'all' || f.marca === filterBrand;
    const matchStatus = filterStatus === 'all'
      || (filterStatus === 'ok' && f.currentStock >= MEDIUM_STOCK)
      || (filterStatus === 'low' && f.currentStock < MEDIUM_STOCK);
    return matchSearch && matchCat && matchBrand && matchStatus;
  });

  // Group by category preserving the order from categories list
  const orderedCategories = [...categories, ...filtered.map(f => f.categoria).filter(c => !categories.includes(c))];
  const grouped = orderedCategories
    .map(cat => ({ cat, items: filtered.filter(f => f.categoria === cat) }))
    .filter(g => g.items.length > 0);

  // Summary stats
  const totalFilaments = filaments.length;
  const inStock = filaments.filter(f => f.currentStock > 0).length;
  const lowStock = filaments.filter(f => f.currentStock > 0 && f.currentStock < LOW_STOCK).length;
  const empty = filaments.filter(f => f.currentStock <= 0).length;
  const totalGrams = filaments.reduce((s, f) => s + Math.max(0, f.currentStock), 0);

  const inputStyle = {
    background: 'var(--card-bg)',
    border: '1px solid var(--card-border)',
    borderRadius: '8px',
    padding: '0.5rem 0.85rem',
    color: 'var(--text)',
    fontSize: '0.85rem',
    fontFamily: 'var(--font-family)',
    outline: 'none',
    cursor: 'pointer',
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text)', marginBottom: '0.3rem' }}>
          Estoque
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Visualização do armário de filamentos
        </p>
      </div>

      {/* Stats bar */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '2rem',
        flexWrap: 'wrap',
      }}>
        {[
          { label: 'Total', value: totalFilaments, color: 'var(--primary)' },
          { label: 'Em estoque', value: inStock, color: '#34D399' },
          { label: 'Estoque baixo', value: lowStock, color: '#FCD34D' },
          { label: 'Vazios', value: empty, color: '#6B7280' },
          { label: 'Total em grama', value: `${totalGrams.toFixed(0)}g`, color: 'var(--text-muted)' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '10px',
            padding: '0.75rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}>
            <span style={{ fontSize: '1.3rem', fontWeight: '800', color: stat.color }}>{stat.value}</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        marginBottom: '2.5rem',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <input
          type="text"
          placeholder="Buscar filamento..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, width: '200px', cursor: 'text' }}
        />

        <Select
          value={filterCategory}
          onChange={setFilterCategory}
          options={[{ value: 'all', label: 'Todas as categorias' }, ...categories.map(c => ({ value: c, label: c }))]}
        />

        <Select
          value={filterBrand}
          onChange={setFilterBrand}
          options={[{ value: 'all', label: 'Todas as marcas' }, ...brands.map(b => ({ value: b, label: b }))]}
        />

        <Select
          value={filterStatus}
          onChange={setFilterStatus}
          options={[
            { value: 'all', label: 'Todos os status' },
            { value: 'ok', label: `OK (≥ ${MEDIUM_STOCK}g)` },
            { value: 'low', label: `Baixo (< ${MEDIUM_STOCK}g)` },
          ]}
        />

        {(search || filterStatus !== 'all' || filterCategory !== 'all' || filterBrand !== 'all') && (
          <button
            onClick={() => { setSearch(''); setFilterStatus('all'); setFilterCategory('all'); setFilterBrand('all'); }}
            style={{
              ...inputStyle,
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '0.8rem',
            }}
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Shelves / Cabinet */}
      {filaments.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem',
          color: 'var(--text-muted)',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧵</div>
          <div style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem' }}>Nenhum filamento cadastrado</div>
          <div style={{ fontSize: '0.85rem' }}>Adicione filamentos na aba Filamentos para vê-los aqui.</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem',
          color: 'var(--text-muted)',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔍</div>
          <div style={{ fontSize: '1rem', fontWeight: '600' }}>Nenhum filamento encontrado com os filtros selecionados.</div>
        </div>
      ) : (
        <div>
          {grouped.map(({ cat, items }) => (
            <Shelf key={cat} category={cat} filaments={items} />
          ))}
        </div>
      )}
    </div>
  );
}
