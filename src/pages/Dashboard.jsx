import React, { useEffect, useRef, useState } from 'react';
import { getAllFilamentsWithStock, getUnifiedOrders, getPrints, exportBackup, importBackup, getPrintCost } from '../services/storage';
import { getColorFromName, ColorDot, getBrandColor } from '../utils/colorUtils';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, BarController,
  LineElement, LineController, PointElement, ArcElement, DoughnutController, Tooltip, Legend,
} from 'chart.js';
import { Chart, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, BarController,
  LineElement, LineController, PointElement, ArcElement, DoughnutController, Tooltip, Legend
);

const PALETTE = ['#00F0FF', '#8B5CF6', '#EAB308', '#F97316', '#10B981', '#EF4444', '#3B82F6', '#EC4899'];

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalFilaments: 0,
    totalStockGrams: 0,
    totalOrders: 0,
    totalPrints: 0,
    totalCost: 0,
    totalPrintCost: 0,
    totalPurchasedGrams: 0,
    totalUsedGrams: 0,
    totalTimeMinutes: 0,
  });

  const [topFilaments, setTopFilaments] = useState([]);
  const [lowStockFilaments, setLowStockFilaments] = useState([]);
  const [monthlyPrints, setMonthlyPrints] = useState([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);
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
    const allOrders = getUnifiedOrders();
    const allPrints = getPrints();

    const totalStock = allFilaments.reduce((acc, f) => acc + (f.currentStock || 0), 0);
    const totalCost = allOrders.reduce((acc, o) =>
      acc + o.items.reduce((s, i) => s + (i.price != null ? Number(i.price) : 0), 0), 0);
    const totalPrintCost = allPrints.reduce((acc, p) => acc + getPrintCost(p), 0);
    const totalPurchasedGrams = allOrders.reduce((acc, o) =>
      acc + o.items.filter(i => i.type === 'filament').reduce((s, i) => s + Number(i.weightGrams || 0), 0), 0);
    const totalUsedGrams = allPrints.reduce((acc, p) => acc + (p.totalWeight || 0), 0);
    const totalTimeMinutes = allPrints.reduce((acc, p) => acc + (Number(p.timeMinutes) || 0), 0);

    setStats({
      totalFilaments: allFilaments.length,
      totalStockGrams: totalStock,
      totalOrders: allOrders.length,
      totalPrints: allPrints.length,
      totalCost: totalCost,
      totalPrintCost: totalPrintCost,
      totalPurchasedGrams: totalPurchasedGrams,
      totalUsedGrams: totalUsedGrams,
      totalTimeMinutes: totalTimeMinutes,
    });

    // Impressões por mês (últimos 6 meses com dados)
    const monthMap = {};
    allPrints.forEach(print => {
      const d = print.date.includes('T') ? new Date(print.date) : new Date(print.date + 'T12:00:00');
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap[key]) monthMap[key] = { grams: 0, count: 0 };
      monthMap[key].grams += Number(print.totalWeight) || 0;
      monthMap[key].count += 1;
    });
    const monthlyChart = Object.keys(monthMap).sort().slice(-6).map(key => {
      const [y, mo] = key.split('-');
      const label = new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString('pt-PT', { month: 'short', year: '2-digit' });
      return { label, kg: monthMap[key].grams / 1000, count: monthMap[key].count };
    });
    setMonthlyPrints(monthlyChart);

    // Consumo de filamento por categoria
    const catMap = {};
    allPrints.forEach(print => {
      (print.filamentsUsed || []).forEach(f => {
        const fil = allFilaments.find(x => x.sku === f.sku);
        const cat = fil?.categoria || 'Outro';
        catMap[cat] = (catMap[cat] || 0) + Number(f.weightGrams || 0);
      });
    });
    setCategoryBreakdown(
      Object.entries(catMap).sort((a, b) => b[1] - a[1]).map(([categoria, grams]) => ({ categoria, grams }))
    );

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

    const purchasedSKUs = new Set(allOrders.flatMap(o => o.items.filter(i => i.type === 'filament').map(i => i.sku)));
    const lowStock = allFilaments
      .filter(f => purchasedSKUs.has(f.sku) && (f.currentStock || 0) < 500)
      .sort((a, b) => (a.currentStock || 0) - (b.currentStock || 0));
    setLowStockFilaments(lowStock);
  }, []);

  const monthlyChartData = {
    labels: monthlyPrints.map(m => m.label),
    datasets: [
      {
        type: 'bar',
        label: 'Peso impresso (kg)',
        data: monthlyPrints.map(m => Number(m.kg.toFixed(2))),
        backgroundColor: 'rgba(0,240,255,0.55)',
        hoverBackgroundColor: 'rgba(0,240,255,0.8)',
        borderRadius: 6,
        yAxisID: 'y',
        order: 2,
      },
      {
        type: 'line',
        label: 'Nº de impressões',
        data: monthlyPrints.map(m => m.count),
        borderColor: '#8B5CF6',
        backgroundColor: '#8B5CF6',
        pointBackgroundColor: '#8B5CF6',
        pointRadius: 4,
        tension: 0.35,
        yAxisID: 'y1',
        order: 1,
      },
    ],
  };

  const monthlyChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: '#94A3B8', font: { size: 11 } } },
      tooltip: { backgroundColor: '#1f2937', titleColor: '#F8FAFC', bodyColor: '#F8FAFC', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 },
    },
    scales: {
      x: { ticks: { color: '#94A3B8' }, grid: { color: 'rgba(255,255,255,0.04)' } },
      y: { position: 'left', ticks: { color: '#94A3B8' }, grid: { color: 'rgba(255,255,255,0.04)' }, title: { display: true, text: 'kg', color: '#94A3B8' } },
      y1: { position: 'right', ticks: { color: '#94A3B8', precision: 0 }, grid: { display: false }, title: { display: true, text: 'impressões', color: '#94A3B8' } },
    },
  };

  const categoryChartData = {
    labels: categoryBreakdown.map(c => c.categoria),
    datasets: [{
      data: categoryBreakdown.map(c => c.grams),
      backgroundColor: categoryBreakdown.map((_, i) => PALETTE[i % PALETTE.length]),
      borderColor: '#0B0F1A',
      borderWidth: 2,
    }],
  };

  const categoryChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: {
        position: 'right',
        labels: { color: '#94A3B8', boxWidth: 12, font: { size: 11 } },
        onHover: (evt, legendItem, legend) => {
          const chart = legend.chart;
          chart.tooltip.setActiveElements([{ datasetIndex: 0, index: legendItem.index }], { x: evt.x, y: evt.y });
          chart.update();
        },
        onLeave: (evt, legendItem, legend) => {
          const chart = legend.chart;
          chart.tooltip.setActiveElements([], { x: 0, y: 0 });
          chart.update();
        },
      },
      tooltip: {
        backgroundColor: '#1f2937', titleColor: '#F8FAFC', bodyColor: '#F8FAFC',
        callbacks: { label: (ctx) => ` ${ctx.label}: ${(ctx.parsed / 1000).toFixed(2).replace('.', ',')}kg` },
      },
    },
  };

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
        </div>
      </div>

      {/* Cards Superiores */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <div className="glass-panel stat-card" style={{ padding: '1.25rem', borderLeft: '4px solid #EF4444' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600 }}>INVESTIMENTO TOTAL</p>
          <p style={{ fontSize: '1.6rem', fontWeight: 700, color: '#EF4444' }}>€ {stats.totalCost.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="glass-panel stat-card" style={{ padding: '1.25rem', borderLeft: '4px solid #EAB308' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600 }}>TOTAL COMPRADO</p>
          <p style={{ fontSize: '1.6rem', fontWeight: 700, color: '#EAB308' }}>{(stats.totalPurchasedGrams / 1000).toFixed(2).replace('.', ',')}kg</p>
        </div>
        <div className="glass-panel stat-card" style={{ padding: '1.25rem', borderLeft: '4px solid #3B82F6' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600 }}>IMPRESSÕES REALIZADAS</p>
          <p style={{ fontSize: '1.6rem', fontWeight: 700, color: '#3B82F6' }}>{stats.totalPrints}</p>
        </div>
        <div className="glass-panel stat-card" style={{ padding: '1.25rem', borderLeft: '4px solid #EF4444' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600 }}>CUSTO EM IMPRESSÕES</p>
          <p style={{ fontSize: '1.6rem', fontWeight: 700, color: '#EF4444' }}>€ {stats.totalPrintCost.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="glass-panel stat-card" style={{ padding: '1.25rem', borderLeft: '4px solid #EAB308' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600 }}>TOTAL USADO</p>
          <p style={{ fontSize: '1.6rem', fontWeight: 700, color: '#EAB308' }}>{(stats.totalUsedGrams / 1000).toFixed(2).replace('.', ',')}kg</p>
        </div>
        <div className="glass-panel stat-card" style={{ padding: '1.25rem', borderLeft: '4px solid #F97316' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600 }}>TEMPO TOTAL</p>
          <p style={{ fontSize: '1.6rem', fontWeight: 700, color: '#F97316' }}>
            {Math.floor((stats.totalTimeMinutes || 0) / 60)}h {(stats.totalTimeMinutes || 0) % 60}min
          </p>
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
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <span style={{ color: getBrandColor(f.marca) }}>{f.marca}</span>
                          <span style={{ color: 'var(--text-muted)' }}> – </span>
                          <span style={{ color: getColorFromName(f.cor) }}>{f.cor}</span>
                        </span>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '320px', overflowY: 'auto', paddingRight: '6px' }}>
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
                      {!isEmpty && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>&lt; 500g restantes</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
        {/* Impressões por mês */}
        <section>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Impressões por Mês</h2>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            {monthlyPrints.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '0.9rem' }}>Nenhuma impressão registada ainda</p>
              </div>
            ) : (
              <div style={{ height: '320px' }}>
                <Chart type="bar" data={monthlyChartData} options={monthlyChartOptions} />
              </div>
            )}
          </div>
        </section>

        {/* Consumo por categoria */}
        <section>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Consumo por Categoria</h2>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            {categoryBreakdown.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '0.9rem' }}>Nenhum filamento usado ainda</p>
              </div>
            ) : (
              <div style={{ height: '320px' }}>
                <Doughnut data={categoryChartData} options={categoryChartOptions} />
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
