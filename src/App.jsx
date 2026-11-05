import { lazy, Suspense, useEffect, useState } from 'react';
import Layout from './components/Layout';

// Cada aba é carregada só quando é aberta (o Chart.js, por exemplo, só vem com o Dashboard)
const PAGINAS = {
  dashboard:   lazy(() => import('./pages/Dashboard')),
  estoque:     lazy(() => import('./pages/Estoque')),
  orders:      lazy(() => import('./pages/Orders')),
  prints:      lazy(() => import('./pages/Prints')),
  filaments:   lazy(() => import('./pages/Filaments')),
  accessories: lazy(() => import('./pages/Accessories')),
  proximas:    lazy(() => import('./pages/ProximasImpressoes')),
  orcamento:   lazy(() => import('./pages/Orcamento')),
  estimativa:  lazy(() => import('./pages/Estimativa')),
  vendas:      lazy(() => import('./pages/Vendas')),
};

// A aba aberta fica no endereço (#estoque, #vendas…): recarregar mantém a aba e o "voltar" funciona
const abaDoEndereco = () => {
  const aba = window.location.hash.replace(/^#\/?/, '');
  return PAGINAS[aba] ? aba : 'dashboard';
};

function App() {
  const [activeTab, setActiveTab] = useState(abaDoEndereco);

  useEffect(() => {
    const aoMudarEndereco = () => setActiveTab(abaDoEndereco());
    window.addEventListener('hashchange', aoMudarEndereco);
    return () => window.removeEventListener('hashchange', aoMudarEndereco);
  }, []);

  const mudarAba = (aba) => {
    if (aba !== activeTab) window.location.hash = aba;
  };

  const Pagina = PAGINAS[activeTab];

  return (
    <Layout activeTab={activeTab} onTabChange={mudarAba}>
      <Suspense fallback={<p style={{ color: 'var(--text-muted)' }}>Carregando…</p>}>
        <Pagina />
      </Suspense>
    </Layout>
  );
}

export default App;
