import { useEffect, useRef, useState } from 'react';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'estoque', label: 'Estoque', icon: '🗄️' },
  { id: 'orders', label: 'Pedidos', icon: '📦' },
  { id: 'prints', label: 'Impressões', icon: '🖨️' },
  { id: 'filaments', label: 'Filamentos', icon: '🧵' },
  { id: 'accessories', label: 'Acessórios', icon: '🔧' },
  { id: 'proximas', label: 'Próximas impressões', icon: '📋' },
  { id: 'orcamento', label: 'Orçamento de venda', icon: '💰' },
  { id: 'estimativa', label: 'Estimativa de custo', icon: '🧮' },
  { id: 'vendas', label: 'Vendas', icon: '🧾' },
];

// No computador o menu fica fixo à esquerda; no celular (até 768px) vira uma barra no topo
// com o botão ☰, que abre o menu por cima do conteúdo.
const Layout = ({ children, activeTab, onTabChange }) => {
  const [menuAberto, setMenuAberto] = useState(false);
  const mainRef = useRef(null);
  const atual = navItems.find(i => i.id === activeTab);

  // Ao trocar de aba: título da janela e volta ao topo da página
  useEffect(() => {
    document.title = atual ? `${atual.label} · FilamentFlow` : 'FilamentFlow';
    mainRef.current?.scrollTo(0, 0);
  }, [atual]);

  useEffect(() => {
    if (!menuAberto) return;
    const aoTeclar = (e) => { if (e.key === 'Escape') setMenuAberto(false); };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [menuAberto]);

  const escolher = (id) => {
    onTabChange(id);
    setMenuAberto(false);
  };

  return (
    <div className="app-layout">
      <header className="app-topbar">
        <button
          className="app-menu-btn"
          onClick={() => setMenuAberto(true)}
          aria-label="Abrir menu"
          aria-expanded={menuAberto}
          aria-controls="app-menu"
        >
          ☰
        </button>
        <span className="app-topbar-titulo">{atual?.icon} {atual?.label}</span>
      </header>

      {menuAberto && <div className="app-menu-fundo" onClick={() => setMenuAberto(false)} aria-hidden="true" />}

      <aside id="app-menu" className={`app-sidebar${menuAberto ? ' aberto' : ''}`}>
        <div className="app-sidebar-topo">
          <h2 className="app-logo">FilamentFlow</h2>
          <button className="app-menu-fechar" onClick={() => setMenuAberto(false)} aria-label="Fechar menu">✕</button>
        </div>

        <nav className="app-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => escolher(item.id)}
              className={`app-nav-item${activeTab === item.id ? ' ativo' : ''}`}
              aria-current={activeTab === item.id ? 'page' : undefined}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="app-main" ref={mainRef}>
        <div className="container animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
