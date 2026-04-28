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

    // Dados para o gráfico de Rosca (Distribuição de Categorias)
    const catData = {};
    allFilaments.forEach(f => {
      catData[f.categoria] = (catData[f.categoria] || 0) + (f.currentStock || 0);
    });

    setStockDistribution({
      labels: Object.keys(catData),
      datasets: [{
        data: Object.values(catData),
        backgroundColor: ['#00F0FF', '#8B5CF6', '#10B981', '#EF4444', '#F59E0B'],
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
          <p style={{ fontSize: '2rem', fontWeight: 700 }}>{(stats.totalStockGrams/1000).toFixed(2)}kg</p>
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
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Mix de Materiais (g)</h2>
          <div style={{ height: '240px', display: 'flex', justifyContent: 'center' }}>
            {stockDistribution && <Doughnut data={stockDistribution} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#94A3B8', padding: 20 } } } }} />}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
        {/* Inventário Visual */}
        <section>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Estado do Inventário</h2>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            {filaments.map(f => {
              const perc = Math.min((f.currentStock / 1000) * 100, 100);
              const color = perc < 20 ? 'var(--danger)' : perc < 50 ? '#F59E0B' : 'var(--primary)';
              return (
                <div key={f.id} style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ fontSize: '0.9rem' }}>
                      <span style={{ fontWeight: 600 }}>{f.marca}</span>
                      <span style={{ color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 600, marginLeft: '8px' }}>[{f.sku}]</span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        <span style={{ fontWeight: 500, color: 'var(--text-main)', marginRight: '8px' }}>{f.cor}</span>
                        <span className="badge badge-outline" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', marginRight: '5px' }}>{f.tipo}</span>
                        {f.categoria}
                      </div>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: perc < 20 ? 'var(--danger)' : 'var(--text-main)' }}>
                      {f.currentStock}g
                    </span>
                  </div>
                  <div className="progress-container" style={{ height: '6px', marginTop: 0 }}>
                    <div className="progress-bar" style={{ width: `${perc}%`, background: color }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Logs de Atividade */}
        <section>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Log de Atividade</h2>
          <div className="glass-panel" style={{ padding: '0' }}>
            {recentPrints.map((p, i) => (
              <div key={p.id} style={{ 
                padding: '1.2rem', 
                borderBottom: i === recentPrints.length - 1 ? 'none' : '1px solid var(--card-border)',
                display: 'flex', gap: '1rem', alignItems: 'center'
              }}>
                <div style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'var(--secondary)', padding: '0.75rem', borderRadius: '10px', fontSize: '1.2rem' }}>🖨️</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>Impressão de {p.totalWeight}g</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {(() => {
                      const d = p.date.includes('T') ? new Date(p.date) : new Date(p.date + 'T12:00:00');
                      return d.toLocaleDateString();
                    })()} • {p.timeMinutes} min
                  </p>
                </div>
                <div className="badge badge-outline" style={{ fontSize: '0.7rem' }}>{p.colors}C</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
