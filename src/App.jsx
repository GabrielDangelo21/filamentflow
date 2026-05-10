import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Estoque from './pages/Estoque';
import Dashboard from './pages/Dashboard';
import Filaments from './pages/Filaments';
import Orders from './pages/Orders';
import Prints from './pages/Prints';
import Accessories from './pages/Accessories';
import ProximasImpressoes from './pages/ProximasImpressoes';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderPage = () => {
    switch (activeTab) {
      case 'estoque': return <Estoque />;
      case 'dashboard': return <Dashboard />;
      case 'filaments': return <Filaments />;
      case 'orders': return <Orders />;
      case 'prints': return <Prints />;
      case 'accessories': return <Accessories />;
      case 'proximas': return <ProximasImpressoes />;
      default: return <Estoque />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderPage()}
    </Layout>
  );
}

export default App;
