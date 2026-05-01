import React, { useEffect, useRef, useState } from 'react';
import { getAllFilamentsWithStock, getOrders, getPrints, exportBackup, importBackup } from '../services/storage';
import { getColorFromName, ColorDot } from '../utils/colorUtils';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalFilaments: 0,
    totalStockGrams: 0,
    totalOrders: 0,
    totalPrints: 0,
    totalCost: 0
  });

  const [filaments, setFilaments] = useState([]);
  const [recentPrints, setRecentPrints] = useState([]);
  const [topFilaments, setTopFilaments] = useState([]);
  const [lowStockFilaments, setLowStockFilaments] = useState([]);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [selectedPrintIdx, setSelectedPrintIdx] = useState(null);
  const [backupMsg, setBackupMsg] = useState('');
  const importInputRef = useRef(null);

  const handleExport = () => {
    const data = exportBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `filamentflow_backup_${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupMsg('✓ Backup exportado!');
    setTimeout(() => setBackupMsg(''), 3000);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const backup = JSON.parse(ev.target.result);
        importBackup(backup);
        setBackupMsg('✓ Backup importado! Recarregando...');
        setTimeout(() => window.location.reload(), 1000);
      } catch (err) {
        setBackupMsg('✗ Erro ao importar: ' + err.message);
        setTimeout(() => setBackupMsg(''), 4000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  useEffect(() => {
    const allFilaments = getAllFilamentsWithStock();
    const allOrders = getOrders();
    const allPrints = getPrints();

    const totalStock = allFilaments.reduce((acc, f) => acc + (f.currentStock || 0), 0);
    const totalCost = allOrders.reduce((acc, o) => acc + (o.items[0].price || 0), 0);

    setStats({
      totalFilaments: allFilaments.length,
      totalStockGrams: totalStock,
      totalOrders: allOrders.length,
      totalPrints: allPrints.length,
      totalCost: totalCost
    });

    setFilaments(allFilaments.sort((a, b) => {
      if (a.marca.toLowerCase() < b.marca.toLowerCase()) return -1;
      if (a.marca.toLowerCase() > b.marca.toLowerCase()) return 1;
      return a.sku.toLowerCase().localeCompare(b.sku.toLowerCase());
    }));
    setRecentPrints(allPrints.slice(-4).reverse());

    const filamentConsumption = {};
    allPrints.forEach(print => {
      (print.filamentsUsed || []).forEach(f => {
        filamentConsumption[f.sku] = (filamentConsumption[f.sku] || 0) + Number(f.weightGrams || 0);
      });
    });
    const topList = Object.entries(filamentConsumption)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([sku, grams]) => {
        const fil = allFilaments.find(f => f.sku === sku) || {};
        return { sku, grams, marca: fil.marca || 'N/A', cor: fil.cor || 'N/A', categoria: fil.categoria || 'N/A' };
      });
    setTopFilaments(topList);

    const purchasedSKUs = new Set(allOrders.flatMap(o => o.items.map(i => i.sku)));
    const lowStock = allFilaments
      .filter(f => purchasedSKUs.has(f.sku) && (f.currentStock || 0) < 250)
      .sort((a, b) => (a.currentStock || 0) - (b.currentStock || 0));
    setLowStockFilaments(lowStock);
  }, []);

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      {backupMsg && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 10000,
          background: backupMsg.startsWith('✓') ? 'var(--primary)' : '#EF4444',
          color: backupMsg.startsWith('✓') ? '#000' : '#fff',
          padding: '1rem 1.5rem', borderRadius: '0.5rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          fontWeight: 600, fontSize: '0.95rem'
        }}>
          {backupMsg}
        </div>
      )}
      <input ref={importInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Analytics de Impressão</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleExport}
              style={{
                background: 'rgba(16, 185, 129, 0.15)', color: '#10B981',
                border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '0.5rem',
                padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600
              }}
            >
              ↓ Exportar Backup
            </button>
            <button
              onClick={() => importInputRef.current.click()}
              style={{
                background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B',
                border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: '0.5rem',
                padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600
              }}
            >
              ↑ Importar Backup
            </button>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Investimento Total</p>
            <p style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--success)' }}>
              € {stats.totalCost.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Cards Superiores */}
      <div className="grid-4" style={{ marginBottom: '2rem' }}>
        <div className="glass-panel stat-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--primary)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>ESTOQUE DISPONÍVEL</p>
          <p style={{ fontSize: '2rem', fontWeight: 700 }}>{(stats.totalStockGrams / 1000).toFixed(2).replace('.', ',')}kg</p>
        </div>
        <div className="glass-panel stat-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--secondary)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>IMPRESSÕES TOTAIS</p>
          <p style={{ fontSize: '2rem', fontWeight: 700 }}>{stats.totalPrints}</p>
        </div>
        <div className="glass-panel stat-card" style={{ padding: '1.5rem', borderLeft: '4px solid #10B981' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>VARIAÇÕES DE FILAMENTO</p>
          <p style={{ fontSize: '2rem', fontWeight: 700 }}>{stats.totalFilaments}</p>
        </div>
        <div className="glass-panel stat-card" style={{ padding: '1.5rem', borderLeft: '4px solid #F59E0B' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>PEDIDOS DE COMPRA</p>
          <p style={{ fontSize: '2rem', fontWeight: 700 }}>{stats.totalOrders}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        {/* Ranking */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Top Filamentos Mais Usados</h2>
          {topFilaments.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Nenhuma impressão registrada ainda</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {topFilaments.map((f, idx) => {
                const barColor = getColorFromName(f.cor);
                const perc = (f.grams / topFilaments[0].grams) * 100;
                return (
                  <div key={f.sku}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', minWidth: '1.2rem', fontWeight: 700 }}>#{idx + 1}</span>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: barColor, flexShrink: 0, border: '1px solid rgba(255,255,255,0.2)' }} />
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.marca} - {f.cor}</span>
                      </div>
                      <span style={{ fontWeight: 700, color: barColor, fontSize: '0.85rem', flexShrink: 0, marginLeft: '0.5rem' }}>
                        {f.grams >= 1000 ? (f.grams / 1000).toFixed(2).replace('.', ',') + 'kg' : f.grams.toFixed(0) + 'g'}
                      </span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                      <div style={{ width: `${perc}%`, height: '100%', background: barColor, borderRadius: '4px' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Alertas de estoque baixo */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Alerta de Estoque Baixo
            {lowStockFilaments.length > 0 && (
              <span style={{
                background: 'var(--danger)', color: '#fff', borderRadius: '999px',
                padding: '0.1rem 0.55rem', fontSize: '0.75rem', fontWeight: 700
              }}>{lowStockFilaments.length}</span>
            )}
          </h2>
          {lowStockFilaments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--success)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✓</div>
              <p style={{ fontWeight: 600 }}>Todos os estoques estão OK</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '320px', overflowY: 'auto' }}>
              {lowStockFilaments.map(f => {
                const isEmpty = (f.currentStock || 0) <= 0;
                return (
                  <div key={f.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.75rem 1rem', borderRadius: '0.5rem',
                    background: isEmpty ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                    border: `1px solid ${isEmpty ? 'rgba(239,68,68,0.35)' : 'rgba(245,158,11,0.35)'}`,
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{f.marca} - {f.cor}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{f.categoria} · SKU {f.sku}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: isEmpty ? 'var(--danger)' : '#F59E0B', fontSize: '0.9rem' }}>
                        {isEmpty ? 'ESGOTADO' : (f.currentStock / 1000).toFixed(2).replace('.', ',') + 'kg'}
                      </div>
                      {!isEmpty && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>&lt; 250g restantes</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
        {/* Inventário Visual */}
        <section>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Estado do Inventário</h2>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            {(() => {
              const allOrders = getOrders();
              const purchasedSKUs = new Set(allOrders.flatMap(o => o.items.map(item => item.sku)));
              const purchasedFilaments = filaments.filter(f => purchasedSKUs.has(f.sku));

              if (purchasedFilaments.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    <p style={{ fontSize: '0.9rem' }}>Nenhum filamento foi comprado ainda</p>
                  </div>
                );
              }

              const categories = {};
              purchasedFilaments.forEach(f => {
                if (!categories[f.categoria]) {
                  categories[f.categoria] = { count: 0, totalStock: 0, filaments: [] };
                }
                categories[f.categoria].count++;
                categories[f.categoria].totalStock += f.currentStock;
                categories[f.categoria].filaments.push(f);
              });

              Object.keys(categories).forEach(cat => {
                categories[cat].filaments.sort((a, b) => a.cor.localeCompare(b.cor));
              });

              return Object.keys(categories).sort().map(categoria => (
                <div key={categoria} style={{ marginBottom: '1rem' }}>
                  <button
                    onClick={() => setExpandedCategory(expandedCategory === categoria ? null : categoria)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      width: '100%',
                      padding: '1rem',
                      marginBottom: expandedCategory === categoria ? '0.5rem' : 0,
                      background: expandedCategory === categoria ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                      border: '2px solid var(--primary)',
                      borderRadius: expandedCategory === categoria ? '0.5rem 0.5rem 0 0' : '0.5rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      color: 'inherit',
                      fontSize: 'inherit',
                      fontFamily: 'inherit'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = expandedCategory === categoria ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)';
                    }}
                  >
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary)' }}>
                        {categoria}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {categories[categoria].count} filamento{categories[categoria].count !== 1 ? 's' : ''} • {(parseFloat(categories[categoria].totalStock) / 1000).toFixed(2).replace('.', ',')}kg
                      </div>
                    </div>
                    <div style={{ fontSize: '1.2rem', color: 'var(--primary)', transition: 'transform 0.2s', transform: expandedCategory === categoria ? 'rotate(180deg)' : 'rotate(0)' }}>▼</div>
                  </button>

                  {expandedCategory === categoria && (
                    <div style={{
                      background: 'rgba(59, 130, 246, 0.05)',
                      border: '2px solid var(--primary)',
                      borderTop: 'none',
                      borderRadius: '0 0 0.5rem 0.5rem',
                      padding: '1.5rem',
                      paddingTop: '0.5rem'
                    }}>
                      {categories[categoria].filaments.map(f => {
                        const perc = Math.min((f.currentStock / 1000) * 100, 100);
                        const barColor = perc < 20 ? 'var(--danger)' : perc < 50 ? '#F59E0B' : 'var(--primary)';
                        return (
                          <div key={f.id} style={{ marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <ColorDot cor={f.cor} size={12} />
                                <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)', letterSpacing: '0.3px' }}>{f.cor}</span>
                              </div>
                              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: perc < 20 ? 'var(--danger)' : 'var(--text-main)' }}>
                                {(parseFloat(f.currentStock) / 1000).toFixed(2).replace('.', ',')}kg
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{f.marca}</span>
                              <span style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 600 }}>[{f.sku}]</span>
                            </div>
                            <div className="progress-container" style={{ height: '6px' }}>
                              <div className="progress-bar" style={{ width: `${perc}%`, background: barColor }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ));
            })()}
          </div>
        </section>

        {/* Logs de Atividade */}
        <section>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Log de Atividade</h2>
          <div className="glass-panel" style={{ padding: '1rem' }}>
            {recentPrints.map((print, index) => (
              <div key={index} style={{ marginBottom: '1rem' }}>
                <button
                  onClick={() => setSelectedPrintIdx(selectedPrintIdx === index ? null : index)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                    padding: '1rem',
                    background: selectedPrintIdx === index ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                    border: '2px solid var(--primary)',
                    borderRadius: selectedPrintIdx === index ? '0.5rem 0.5rem 0 0' : '0.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    color: 'inherit',
                    fontSize: 'inherit',
                    fontFamily: 'inherit'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = selectedPrintIdx === index ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)'; }}
                >
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary)' }}>
                      {print.description || `Impressão de ${parseFloat(print.totalWeight).toFixed(2).replace('.', ',')}g`}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {(() => {
                        const d = print.date.includes('T') ? new Date(print.date) : new Date(print.date + 'T12:00:00');
                        return d.toLocaleDateString();
                      })()} • {print.timeMinutes} min
                    </div>
                  </div>
                  <div style={{ fontSize: '1.2rem', color: 'var(--primary)', transition: 'transform 0.2s', transform: selectedPrintIdx === index ? 'rotate(180deg)' : 'rotate(0)' }}>▼</div>
                </button>

                {selectedPrintIdx === index && (
                  <div style={{
                    background: 'rgba(59, 130, 246, 0.05)',
                    border: '2px solid var(--primary)',
                    borderTop: 'none',
                    borderRadius: '0 0 0.5rem 0.5rem',
                    padding: '1.5rem',
                    paddingTop: '1rem'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Data</div>
                        <div style={{ fontWeight: 600 }}>
                          {(() => {
                            const d = print.date.includes('T') ? new Date(print.date) : new Date(print.date + 'T12:00:00');
                            return d.toLocaleDateString();
                          })()}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Descrição</div>
                        <div style={{ fontWeight: 600 }}>{print.description || '-'}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Tempo Total</div>
                        <div style={{ fontWeight: 600 }}>{print.timeMinutes} minutos</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Cores Usadas</div>
                        <div style={{ fontWeight: 600 }}>{print.colors}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Peso Total</div>
                        <div style={{ fontWeight: 600 }}>{parseFloat(print.totalWeight).toFixed(2).replace('.', ',')}g</div>
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.75rem', textTransform: 'uppercase' }}>Filamentos Usados</div>
                      {print.filamentsUsed.map((item, idx) => {
                        const filament = filaments.find(f => f.sku === item.sku);
                        return (
                          <div key={idx} style={{
                            fontSize: '0.85rem',
                            padding: '0.5rem 0',
                            borderBottom: '1px solid rgba(59, 130, 246, 0.1)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <ColorDot cor={filament?.cor} size={9} />
                              <strong>{filament?.marca || 'N/A'}</strong> - {filament?.cor || 'N/A'} ({item.sku})
                            </div>
                            <div style={{ color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                              {filament?.categoria || 'N/A'} • {parseFloat(item.weightGrams).toFixed(2).replace('.', ',')}g
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
