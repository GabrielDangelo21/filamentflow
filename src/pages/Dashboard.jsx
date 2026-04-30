import React, { useEffect, useState } from 'react';
import { getAllFilamentsWithStock, getOrders, getPrints } from '../services/storage';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

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
  const [chartData, setChartData] = useState(null);
  const [stockDistribution, setStockDistribution] = useState(null);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [selectedPrint, setSelectedPrint] = useState(null);

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

    // Dados para o gráfico de linha (Consumo por dia nos últimos 7 dias)
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    const consumptionData = last7Days.map(date => {
      const dayPrints = allPrints.filter(p => p.date === date);
      return dayPrints.reduce((acc, p) => acc + p.totalWeight, 0);
    });

    setChartData({
      labels: last7Days.map(d => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' })),
      datasets: [{
        label: 'Consumo (g)',
        data: consumptionData,
        borderColor: '#00F0FF',
        backgroundColor: 'rgba(0, 240, 255, 0.1)',
        fill: true,
        tension: 0.4,
      }]
    });

    // Dados para o gráfico de Rosca (somente categorias com estoque > 0)
    const catData = {};
    allFilaments.forEach(f => {
      if ((f.currentStock || 0) > 0) {
        catData[f.categoria] = (catData[f.categoria] || 0) + f.currentStock;
      }
    });

    setStockDistribution({
      labels: Object.keys(catData),
      datasets: [{
        data: Object.values(catData),
        backgroundColor: ['#00F0FF', '#8B5CF6', '#10B981', '#EF4444', '#F59E0B', '#3B82F6', '#EC4899', '#14B8A6', '#F97316', '#A855F7', '#84CC16', '#06B6D4'],
        borderWidth: 0,
      }]
    });
  }, []);

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
    scales: {
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94A3B8' } },
      x: { grid: { display: false }, ticks: { color: '#94A3B8' } }
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Analytics de Impressão</h1>
        <div style={{ textAlign: 'right' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Investimento Total</p>
          <p style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--success)' }}>
            € {stats.totalCost.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Cards Superiores */}
      <div className="grid-4" style={{ marginBottom: '2rem' }}>
        <div className="glass-panel stat-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--primary)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>ESTOQUE DISPONÍVEL</p>
          <p style={{ fontSize: '2rem', fontWeight: 700 }}>{(stats.totalStockGrams / 1000).toFixed(2)}kg</p>
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

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        {/* Gráfico de Consumo */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Consumo de Material (Últimos 7 dias)</h2>
          <div style={{ height: '300px' }}>
            {chartData && <Line data={chartData} options={lineOptions} />}
          </div>
        </div>

        {/* Distribuição por Categoria */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Mix de Materiais (g)</h2>
          <div style={{ height: '420px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '420px' }}>
            {stockDistribution && <Doughnut data={stockDistribution} options={{ maintainAspectRatio: false, responsive: true, plugins: { legend: { position: 'bottom', labels: { color: '#94A3B8', padding: 12, font: { size: 12 }, boxWidth: 12 }, maxHeight: 120 } } }} />}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
        {/* Inventário Visual */}
        <section>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Estado do Inventário</h2>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            {(() => {
              // Get all SKUs from orders (purchased filaments)
              const allOrders = getOrders();
              const purchasedSKUs = new Set(allOrders.flatMap(o => o.items.map(item => item.sku)));

              // Filter filaments to show only those that were purchased
              const purchasedFilaments = filaments.filter(f => purchasedSKUs.has(f.sku));

              if (purchasedFilaments.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    <p style={{ fontSize: '0.9rem' }}>Nenhum filamento foi comprado ainda</p>
                  </div>
                );
              }

              // Get unique categories and their totals
              const categories = {};
              purchasedFilaments.forEach(f => {
                if (!categories[f.categoria]) {
                  categories[f.categoria] = { count: 0, totalStock: 0, filaments: [] };
                }
                categories[f.categoria].count++;
                categories[f.categoria].totalStock += f.currentStock;
                categories[f.categoria].filaments.push(f);
              });

              // Sort filaments by color within each category
              Object.keys(categories).forEach(cat => {
                categories[cat].filaments.sort((a, b) => a.cor.localeCompare(b.cor));
              });

              return Object.keys(categories).sort().map(categoria => (
                <div key={categoria} style={{ marginBottom: '1rem' }}>
                  {/* Category Header */}
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
                        {categories[categoria].count} filamento{categories[categoria].count !== 1 ? 's' : ''} • {parseFloat(categories[categoria].totalStock).toFixed(2)}g
                      </div>
                    </div>
                    <div style={{ fontSize: '1.2rem', color: 'var(--primary)', transition: 'transform 0.2s', transform: expandedCategory === categoria ? 'rotate(180deg)' : 'rotate(0)' }}>▼</div>
                  </button>

                  {/* Expanded Content */}
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
                              <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)', letterSpacing: '0.3px' }}>{f.cor}</span>
                              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: perc < 20 ? 'var(--danger)' : 'var(--text-main)' }}>
                                {parseFloat(f.currentStock).toFixed(2)}g
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
            {recentPrints.map(print => (
              <div key={print.id} style={{
                background: 'rgba(59, 130, 246, 0.05)',
                padding: '1rem',
                borderRadius: '0.5rem',
                marginBottom: '0.75rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'all 0.2s',
                border: '1px solid rgba(59, 130, 246, 0.2)'
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)'}
              >
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                    {print.description || `Impressão de ${parseFloat(print.totalWeight).toFixed(2)}g`}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {(() => {
                      const d = print.date.includes('T') ? new Date(print.date) : new Date(print.date + 'T12:00:00');
                      return d.toLocaleDateString();
                    })()} • {print.timeMinutes} min
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPrint(selectedPrint?.id === print.id ? null : print)}
                  style={{
                    background: 'none',
                    border: '1px solid var(--primary)',
                    color: 'var(--primary)',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '0.3rem',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {selectedPrint?.id === print.id ? 'Fechar' : 'Ver Detalhes'}
                </button>
              </div>
            ))}
          </div>

          {selectedPrint && (
            <div style={{
              background: 'rgba(59, 130, 246, 0.1)',
              border: '2px solid var(--primary)',
              borderRadius: '0.5rem',
              padding: '1.5rem',
              marginTop: '1rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, color: 'var(--primary)' }}>Detalhes da Impressão</h3>
                <button
                  onClick={() => setSelectedPrint(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}
                >✕</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Data</div>
                  <div style={{ fontWeight: 600 }}>
                    {(() => {
                      const d = selectedPrint.date.includes('T') ? new Date(selectedPrint.date) : new Date(selectedPrint.date + 'T12:00:00');
                      return d.toLocaleDateString();
                    })()}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Descrição</div>
                  <div style={{ fontWeight: 600 }}>{selectedPrint.description || '-'}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Tempo Total</div>
                  <div style={{ fontWeight: 600 }}>{selectedPrint.timeMinutes} minutos</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Cores Usadas</div>
                  <div style={{ fontWeight: 600 }}>{selectedPrint.colors}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Peso Total</div>
                  <div style={{ fontWeight: 600 }}>{parseFloat(selectedPrint.totalWeight).toFixed(2)}g</div>
                </div>
              </div>

              <div>
                <div style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Filamentos Usados</div>
                {selectedPrint.filamentsUsed.map((item, idx) => {
                  const filament = filaments.find(f => f.sku === item.sku);
                  return (
                    <div key={idx} style={{
                      fontSize: '0.85rem',
                      padding: '0.5rem 0',
                      borderBottom: '1px solid rgba(59, 130, 246, 0.1)'
                    }}>
                      <strong>{filament?.marca || 'N/A'}</strong> - {filament?.cor || 'N/A'} ({item.sku})
                      <div style={{ color: 'var(--text-muted)' }}>
                        {filament?.categoria || 'N/A'} • {parseFloat(item.weightGrams).toFixed(2)}g
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
