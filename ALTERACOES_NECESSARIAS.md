# Alterações Necessárias no FilamentFlow

## 1. FORMATAR NÚMEROS COM 2 CASAS DECIMAIS

### Dashboard.jsx
Procure por todas as exibições de peso/grama e adicione `.toFixed(2)`:

```javascript
// Antes:
<span>{f.currentStock}g</span>

// Depois:
<span>{parseFloat(f.currentStock).toFixed(2)}g</span>
```

Locais a alterar:
- Estado do Inventário (cards expandidos) - linha ~165
- Log de Atividade - linha ~280

### Filaments.jsx
```javascript
// Antes:
<td>{f.currentStock}g</td>

// Depois:
<td>{parseFloat(f.currentStock).toFixed(2)}g</td>
```

### Orders.jsx
```javascript
// Antes:
<td style={{ fontWeight: 600 }}>{order.items[0].weightGrams}g</td>
<td>{order.items[0].price ? ... : '-'}</td>

// Depois:
<td style={{ fontWeight: 600 }}>{parseFloat(order.items[0].weightGrams).toFixed(2)}g</td>
<td>{order.items[0].price ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(order.items[0].price) : '-'}</td>
```

### Prints.jsx
```javascript
// Antes:
<td style={{ fontWeight: 600 }}>{print.totalWeight}g</td>

// Depois:
<td style={{ fontWeight: 600 }}>{parseFloat(print.totalWeight).toFixed(2)}g</td>
```

---

## 2. ADICIONAR BUSCADOR DE FILAMENTO NA ABA SAÍDAS (Orders.jsx)

A aba Entradas já tem o autocomplete. Copie a mesma lógica que está em Orders.jsx (linhas 90-160) para o campo de filamento.

Estrutura do autocomplete:
```javascript
const [searchTerm, setSearchTerm] = useState('');
const [showSuggestions, setShowSuggestions] = useState(false);

const filteredFilaments = filaments.filter(f => {
  const search = searchTerm.toLowerCase();
  return (
    f.sku.toLowerCase().includes(search) ||
    f.marca.toLowerCase().includes(search) ||
    f.cor.toLowerCase().includes(search) ||
    f.categoria.toLowerCase().includes(search)
  );
});

const handleSelectFilament = (filament) => {
  setSelectedFilament(filament);
  setSearchTerm(`${filament.marca} - ${filament.cor} (${filament.sku})`);
  setFormData({ ...formData, sku: filament.sku });
  setShowSuggestions(false);
};
```

---

## 3. LOG DE ATIVIDADES COM NOME DA IMPRESSÃO E VER DETALHES

### Dashboard.jsx - Log de Atividade (por volta da linha 275)

```javascript
{recentPrints.map(print => (
  <div key={print.id} style={{
    background: 'rgba(59, 130, 246, 0.05)',
    padding: '1rem',
    borderRadius: '0.5rem',
    marginBottom: '0.75rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
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
        {new Date(print.date).toLocaleDateString()} • {print.timeMinutes} min
      </div>
    </div>
    <button 
      onClick={() => setSelectedPrint(print)}
      style={{
        background: 'none',
        border: '1px solid var(--primary)',
        color: 'var(--primary)',
        padding: '0.4rem 0.8rem',
        borderRadius: '0.3rem',
        cursor: 'pointer',
        fontSize: '0.8rem',
        fontWeight: 600
      }}
    >
      Ver Detalhes
    </button>
  </div>
))}
```

Adicione estado: `const [selectedPrint, setSelectedPrint] = useState(null);`

---

## 4. VER DETALHES EXPANSÍVEL (Dashboard e Prints)

### Dashboard.jsx - Adicione após o Log de Atividade

```javascript
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
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          fontSize: '1.5rem',
          cursor: 'pointer'
        }}
      >
        ✕
      </button>
    </div>
    
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: '1fr 1fr', 
      gap: '1rem',
      marginBottom: '1rem',
      fontSize: '0.9rem'
    }}>
      <div>
        <div style={{ color: 'var(--text-muted)' }}>Data</div>
        <div style={{ fontWeight: 600 }}>
          {new Date(selectedPrint.date).toLocaleDateString()}
        </div>
      </div>
      <div>
        <div style={{ color: 'var(--text-muted)' }}>Descrição</div>
        <div style={{ fontWeight: 600 }}>
          {selectedPrint.description || '-'}
        </div>
      </div>
      <div>
        <div style={{ color: 'var(--text-muted)' }}>Tempo Total</div>
        <div style={{ fontWeight: 600 }}>
          {selectedPrint.timeMinutes} minutos
        </div>
      </div>
      <div>
        <div style={{ color: 'var(--text-muted)' }}>Cores Usadas</div>
        <div style={{ fontWeight: 600 }}>
          {selectedPrint.colors}
        </div>
      </div>
      <div>
        <div style={{ color: 'var(--text-muted)' }}>Peso Total</div>
        <div style={{ fontWeight: 600 }}>
          {parseFloat(selectedPrint.totalWeight).toFixed(2)}g
        </div>
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
```

---

## 5. PROBLEMA DO DELETE NA ABA SAÍDAS

### Arquivo: src/services/storage.js

Procure pela função `deleteOrder` e verifique se está assim:

```javascript
export const deleteOrder = (id) => {
  const orders = getOrders();
  const filtered = orders.filter(order => order.id !== id);
  localStorage.setItem('orders', JSON.stringify(filtered));
  return filtered;
};
```

**IMPORTANTE**: Deve ter `order.id !== id` (NÃO `!==`) para deletar APENAS o item específico.

Se estiver com `!== id` trocado, está deletando todos EXCETO esse, por isso deleta tudo!

---

## 6. EXPANDÍVEL NO PRINTS.jsx

Procure no arquivo Prints.jsx pelo modal de detalhes e mude de:

```javascript
// Antes: Modal fixo com position fixed
{viewingPrint && (
  <div style={{ position: 'fixed', ... }}>
```

Para:

```javascript
// Depois: Expansível como o Dashboard
{viewingPrint && (
  <div style={{
    background: 'rgba(59, 130, 246, 0.1)',
    border: '2px solid var(--primary)',
    borderRadius: '0.5rem',
    padding: '1.5rem',
    marginTop: '1rem'
  }}>
    {/* mesmo conteúdo anterior */}
  </div>
)}
```

---

## RESUMO DE PRIORIDADES

1. ✅ Corrigir `deleteOrder` em storage.js (CRÍTICO - deleta tudo)
2. ✅ Formatar números com .toFixed(2) em todas as abas
3. ✅ Adicionar buscador na aba Saídas (copiar de Entradas)
4. ✅ Log de Atividades com nome + Ver Detalhes
5. ✅ Detalhes expansível em Dashboard e Prints

**Dica**: Use Ctrl+F para "toFixed" e substitua rapidamente em cada arquivo!
