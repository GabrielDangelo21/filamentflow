const STORAGE_KEYS = {
  FILAMENTS: 'filamentflow_filaments',
  UNIFIED_ORDERS: 'filamentflow_unified_orders',
  PRINTS: 'filamentflow_prints',
  CATEGORIES: 'filamentflow_categories',
  BRANDS: 'filamentflow_brands',
  ACC_CATEGORIES: 'filamentflow_acc_categories',
  PROXIMAS: 'filamentflow_proximas',
  STOCK_ADJUSTMENTS: 'filamentflow_stock_adjustments',
  SALES: 'filamentflow_sales',
  POPZU_SYNC: 'filamentflow_popzu_sync',
  POPZU_CUSTOS: 'filamentflow_popzu_custos',
  PRICE_SETTINGS: 'filamentflow_calc_settings'
};

// --- GENERIC HELPERS ---
const getFromStorage = (key) => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const saveToStorage = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

const generateId = () => crypto.randomUUID();

// --- FILAMENTS ---
export const getFilaments = () => {
  const raw = getFromStorage(STORAGE_KEYS.FILAMENTS).map(f => ({ ...f, sku: String(f.sku) }));
  let migrated = false;
  raw.forEach(f => { if (!f.id) { f.id = generateId(); migrated = true; } });
  const seen = new Set();
  const deduped = raw.filter(f => { if (seen.has(f.sku)) return false; seen.add(f.sku); return true; });
  if (migrated || deduped.length !== raw.length) saveToStorage(STORAGE_KEYS.FILAMENTS, deduped);
  return deduped;
};

export const saveFilament = (filament) => {
  const filaments = getFilaments();

  if (filament.id) {
    const existingIndex = filaments.findIndex(f => f.id === filament.id);
    if (existingIndex >= 0) {
      filaments[existingIndex] = { ...filaments[existingIndex], ...filament };
      saveToStorage(STORAGE_KEYS.FILAMENTS, filaments);
      return;
    }
  }

  const existingIndex = filaments.findIndex(f => f.sku === filament.sku);
  if (existingIndex >= 0) {
    filaments[existingIndex] = { ...filaments[existingIndex], ...filament };
  } else {
    filaments.push({ ...filament, id: generateId(), createdAt: new Date().toISOString() });
  }

  saveToStorage(STORAGE_KEYS.FILAMENTS, filaments);
};

export const deleteFilament = (id) => {
  saveToStorage(STORAGE_KEYS.FILAMENTS, getFilaments().filter(f => f.id !== id));
};

// --- UNIFIED ORDERS ---
// Each order: { id, date, store, shipping, otherCosts, createdAt, items: [...] }
// Each item: { type: 'filament', sku, weightGrams, price }
//         OR { type: 'accessory', name, category, quantity, price }

export const getUnifiedOrders = () => {
  let migrated = false;
  const raw = getFromStorage(STORAGE_KEYS.UNIFIED_ORDERS).map(o => ({
    ...o,
    items: (o.items || []).map(i => {
      if (i.type === 'filament') return { ...i, sku: String(i.sku) };
      if (i.type === 'accessory' && i.category === 'Electrónica') { migrated = true; return { ...i, category: 'Eletrônica' }; }
      if (i.type === 'accessory' && i.category === 'Impressora') {
        if (i.name === 'P2S')      { migrated = true; return { ...i, name: 'P2S-1' }; }
        if (i.name === 'A1 Combo') { migrated = true; return { ...i, category: 'Impressora (devolvida)' }; }
      }
      return i;
    })
  }));
  const seen = new Set();
  const deduped = raw.filter(o => { if (seen.has(o.id)) return false; seen.add(o.id); return true; });
  if (migrated || deduped.length !== raw.length) saveToStorage(STORAGE_KEYS.UNIFIED_ORDERS, deduped);
  return deduped;
};

export const saveUnifiedOrder = (order) => {
  const orders = getUnifiedOrders();
  const newOrder = { ...order, id: generateId(), createdAt: new Date().toISOString() };
  orders.push(newOrder);
  saveToStorage(STORAGE_KEYS.UNIFIED_ORDERS, orders);
  return newOrder;
};

export const updateUnifiedOrder = (order) => {
  const orders = getUnifiedOrders();
  const idx = orders.findIndex(o => o.id === order.id);
  if (idx >= 0) {
    orders[idx] = order;
    saveToStorage(STORAGE_KEYS.UNIFIED_ORDERS, orders);
  }
};

export const deleteUnifiedOrder = (id) => {
  saveToStorage(STORAGE_KEYS.UNIFIED_ORDERS, getUnifiedOrders().filter(o => o.id !== id));
};

// --- PRINTS ---
export const getPrints = () => {
  const prints = getFromStorage(STORAGE_KEYS.PRINTS);
  let migrated = false;
  prints.forEach(p => {
    if (!p.id) { p.id = generateId(); migrated = true; }
    if (!p.printer || p.printer === 'Bambu Lab P2S' || p.printer === 'P2S') { p.printer = 'P2S-1'; migrated = true; }
    if (p.filamentsUsed) {
      p.filamentsUsed = p.filamentsUsed.map(f => {
        const item = { ...f, sku: String(f.sku) };
        // Impressões antigas sem preço gravado: grava o preço médio atual (se houver compra)
        if (!(Number(item.pricePerGram) > 0)) {
          const ppg = getFilamentPricePerGram(item.sku);
          if (ppg > 0) { item.pricePerGram = ppg; migrated = true; }
        }
        return item;
      });
    }
  });
  const seen = new Set();
  const deduped = prints.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });
  if (migrated || deduped.length !== prints.length) saveToStorage(STORAGE_KEYS.PRINTS, deduped);
  return deduped;
};

// Grava o preço por grama de cada filamento no momento do registro, para o custo
// da impressão não mudar quando houver compras novas com outro preço.
// Na edição, mantém o preço já gravado dos filamentos que continuam na impressão.
const comPrecoGravado = (filamentsUsed = [], anteriores = []) =>
  filamentsUsed.map(f => {
    const antigo = anteriores.find(a => a.sku === String(f.sku) && Number(a.pricePerGram) > 0);
    const ppg = antigo ? Number(antigo.pricePerGram) : getFilamentPricePerGram(String(f.sku));
    return ppg > 0 ? { ...f, pricePerGram: ppg } : { ...f };
  });

export const savePrint = (print) => {
  const prints = getPrints();
  if (print.id) {
    const index = prints.findIndex(p => p.id === print.id);
    if (index >= 0) {
      const filamentsUsed = comPrecoGravado(print.filamentsUsed || prints[index].filamentsUsed, prints[index].filamentsUsed);
      prints[index] = { ...prints[index], ...print, filamentsUsed };
      saveToStorage(STORAGE_KEYS.PRINTS, prints);
      return prints[index];
    }
  }
  const newPrint = { ...print, filamentsUsed: comPrecoGravado(print.filamentsUsed), id: generateId(), date: print.date || new Date().toISOString() };
  prints.push(newPrint);
  saveToStorage(STORAGE_KEYS.PRINTS, prints);
  return newPrint;
};

export const deletePrint = (id) => {
  saveToStorage(STORAGE_KEYS.PRINTS, getPrints().filter(p => p.id !== id));
};

// --- STOCK CALCULATION ---
export const getFilamentStock = (sku) => {
  const orders = getUnifiedOrders();
  const prints = getPrints();

  let totalIn = 0;
  orders.forEach(order => {
    order.items.filter(i => i.type === 'filament' && i.sku === sku)
      .forEach(i => { totalIn += Number(i.weightGrams) || 0; });
  });

  let totalOut = 0;
  prints.forEach(print => {
    const item = print.filamentsUsed.find(f => f.sku === sku);
    if (item) totalOut += Number(item.weightGrams) || 0;
  });

  const totalAdjust = getStockAdjustments()
    .filter(a => a.sku === sku)
    .reduce((acc, a) => acc + (Number(a.deltaGrams) || 0), 0);

  return totalIn - totalOut + totalAdjust;
};

// --- STOCK ADJUSTMENTS ---
// Correções manuais do estoque (ex.: pesar o carretel). Guardam só a diferença em gramas,
// por isso não mexem em pedidos, impressões nem no preço por grama.
// Each adjustment: { id, sku, date, deltaGrams, previousGrams, realGrams }
export const getStockAdjustments = () => getFromStorage(STORAGE_KEYS.STOCK_ADJUSTMENTS);

export const adjustFilamentStock = (sku, realGrams) => {
  const previousGrams = getFilamentStock(sku);
  const deltaGrams = Number(realGrams) - previousGrams;
  if (deltaGrams === 0) return null;
  const adjustment = { id: generateId(), sku, date: new Date().toISOString(), deltaGrams, previousGrams, realGrams: Number(realGrams) };
  saveToStorage(STORAGE_KEYS.STOCK_ADJUSTMENTS, [...getStockAdjustments(), adjustment]);
  return adjustment;
};

export const getAllFilamentsWithStock = () => {
  return getFilaments().map(f => ({ ...f, currentStock: getFilamentStock(f.sku) }));
};

// --- CATEGORIES ---
const DEFAULT_CATEGORIES = ['PLA Basic', 'PLA Matte', 'PLA Silk', 'PETG Basic', 'PETG CF', 'ABS', 'TPU', 'PVA'];

export const getCategories = () => {
  const cats = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
  if (!cats) { saveToStorage(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES); return DEFAULT_CATEGORIES; }
  return JSON.parse(cats);
};

export const saveCategory = (category) => {
  const cats = getCategories();
  if (!cats.includes(category)) { cats.push(category); saveToStorage(STORAGE_KEYS.CATEGORIES, cats); }
};

export const deleteCategory = (category) => {
  saveToStorage(STORAGE_KEYS.CATEGORIES, getCategories().filter(c => c !== category));
};

export const saveAllCategories = (cats) => saveToStorage(STORAGE_KEYS.CATEGORIES, cats);

// --- BRANDS ---
const DEFAULT_BRANDS = ['Sunlu', 'Bambu Lab', 'eSUN', 'Creality', 'Polymaker'];

export const getBrands = () => {
  const brands = localStorage.getItem(STORAGE_KEYS.BRANDS);
  if (!brands) { saveToStorage(STORAGE_KEYS.BRANDS, DEFAULT_BRANDS); return DEFAULT_BRANDS; }
  return JSON.parse(brands);
};

export const saveBrand = (brand) => {
  const brands = getBrands();
  if (!brands.includes(brand)) { brands.push(brand); saveToStorage(STORAGE_KEYS.BRANDS, brands); }
};

export const deleteBrand = (brand) => {
  saveToStorage(STORAGE_KEYS.BRANDS, getBrands().filter(b => b !== brand));
};

export const saveAllBrands = (brands) => saveToStorage(STORAGE_KEYS.BRANDS, brands);

// --- COST CALCULATION ---
// Preço médio por grama de cada SKU, somando TODOS os itens com preço de todos os pedidos
// (inclusive vários carretéis do mesmo SKU no mesmo pedido).
// Fica em cache enquanto os pedidos guardados não mudarem, para não reler tudo a cada cálculo.
let priceCache = { raw: null, map: new Map() };

const getPriceMap = () => {
  const raw = localStorage.getItem(STORAGE_KEYS.UNIFIED_ORDERS);
  if (raw === priceCache.raw) return priceCache.map;
  const totals = new Map();
  getUnifiedOrders().forEach(order => {
    (order.items || [])
      .filter(i => i.type === 'filament' && Number(i.price) > 0)
      .forEach(i => {
        const t = totals.get(i.sku) || { cost: 0, grams: 0 };
        t.cost += Number(i.price);
        t.grams += Number(i.weightGrams) || 0;
        totals.set(i.sku, t);
      });
  });
  const map = new Map();
  totals.forEach((t, sku) => { if (t.grams > 0) map.set(sku, t.cost / t.grams); });
  priceCache = { raw: localStorage.getItem(STORAGE_KEYS.UNIFIED_ORDERS), map };
  return map;
};

export const getFilamentPricePerGram = (sku) => getPriceMap().get(String(sku)) || 0;

// Sem compra registrada nos Pedidos o preço por grama é 0 e o material entra como €0
export const temCompraRegistrada = (sku) => getFilamentPricePerGram(sku) > 0;

// Preço médio por grama de todas as compras de filamento (opcionalmente só de uma categoria)
export const getAveragePricePerGram = (categoria = null) => {
  const categoriaPorSku = new Map(getFilaments().map(f => [f.sku, f.categoria]));
  let totalCost = 0;
  let totalGrams = 0;
  getUnifiedOrders().forEach(order => {
    order.items
      .filter(i => i.type === 'filament' && Number(i.price) > 0)
      .filter(i => !categoria || categoriaPorSku.get(i.sku) === categoria)
      .forEach(i => {
        totalCost += Number(i.price);
        totalGrams += Number(i.weightGrams);
      });
  });
  return totalGrams > 0 ? totalCost / totalGrams : 0;
};

// Usa o preço gravado no registro da impressão; sem preço gravado, usa a média atual dos Pedidos
export const getPrintCost = (print) => {
  return (print.filamentsUsed || []).reduce((acc, f) => {
    const ppg = Number(f.pricePerGram) > 0 ? Number(f.pricePerGram) : getFilamentPricePerGram(f.sku);
    return acc + ppg * (Number(f.weightGrams) || 0);
  }, 0);
};

// --- ACCESSORIES HELPERS ---
export const getAccessoriesByCategory = (category) => {
  const orders = getUnifiedOrders();
  const names = new Set();
  orders.forEach(order => {
    order.items
      .filter(i => i.type === 'accessory' && i.category === category)
      .forEach(i => names.add(i.name));
  });
  return [...names].sort();
};

// --- ACCESSORY CATEGORIES ---
const DEFAULT_ACC_CATEGORIES = ['Ferramentas', 'Consumíveis', 'Adesivos', 'Superfície de Impressão', 'Armazenamento', 'Limpeza', 'Eletrônica', 'Outros'];

export const getAccCategories = () => {
  const cats = localStorage.getItem(STORAGE_KEYS.ACC_CATEGORIES);
  if (!cats) { saveToStorage(STORAGE_KEYS.ACC_CATEGORIES, DEFAULT_ACC_CATEGORIES); return DEFAULT_ACC_CATEGORIES; }
  const parsed = JSON.parse(cats);
  // Migração para português do Brasil
  if (parsed.includes('Electrónica')) {
    const fixed = [...new Set(parsed.map(c => (c === 'Electrónica' ? 'Eletrônica' : c)))];
    saveToStorage(STORAGE_KEYS.ACC_CATEGORIES, fixed);
    return fixed;
  }
  return parsed;
};

export const saveAccCategory = (cat) => {
  const cats = getAccCategories();
  if (!cats.includes(cat)) { cats.push(cat); saveToStorage(STORAGE_KEYS.ACC_CATEGORIES, cats); }
};

export const deleteAccCategory = (cat) => {
  saveToStorage(STORAGE_KEYS.ACC_CATEGORIES, getAccCategories().filter(c => c !== cat));
};

export const saveAllAccCategories = (cats) => saveToStorage(STORAGE_KEYS.ACC_CATEGORIES, cats);

// --- PRÓXIMAS IMPRESSÕES ---
export const getProximas = () => getFromStorage(STORAGE_KEYS.PROXIMAS);

export const saveProxima = (item) => {
  const list = getProximas();
  list.push({ id: generateId(), ...item, createdAt: new Date().toISOString() });
  saveToStorage(STORAGE_KEYS.PROXIMAS, list);
};

export const updateProxima = (item) => {
  const list = getProximas();
  const idx = list.findIndex(p => p.id === item.id);
  if (idx >= 0) { list[idx] = { ...list[idx], ...item }; saveToStorage(STORAGE_KEYS.PROXIMAS, list); }
};

export const deleteProxima = (id) => {
  saveToStorage(STORAGE_KEYS.PROXIMAS, getProximas().filter(p => p.id !== id));
};

export const reorderProximas = (list) => saveToStorage(STORAGE_KEYS.PROXIMAS, list);

// --- VENDAS ---
// Each sale: { id, date, client, description, printIds, materialCost, costTotal,
//              suggestedPrice, finalPrice (com IVA), vatPct, notes, createdAt }
export const getSales = () => getFromStorage(STORAGE_KEYS.SALES);

export const saveSale = (sale) => {
  const list = getSales();
  const idx = sale.id ? list.findIndex(s => s.id === sale.id) : -1;
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...sale };
  } else {
    list.push({ ...sale, id: generateId(), createdAt: new Date().toISOString() });
  }
  saveToStorage(STORAGE_KEYS.SALES, list);
};

export const deleteSale = (id) => {
  saveToStorage(STORAGE_KEYS.SALES, getSales().filter(s => s.id !== id));
};

// Lucro de uma venda: preço final sem IVA menos o custo total gravado na venda.
// Vendas sem custo (ex.: importadas da Popzu) devolvem null e ficam fora do lucro.
export const temCusto = (sale) => sale.costTotal !== null && sale.costTotal !== undefined;

export const getSaleProfit = (sale) => {
  if (!temCusto(sale)) return null;
  const semIva = (Number(sale.finalPrice) || 0) / (1 + (Number(sale.vatPct) || 0) / 100);
  return semIva - (Number(sale.costTotal) || 0);
};

// --- SINCRONIZAÇÃO POPZU (planilha Vendas_Popzu via Apps Script) ---
export const getPopzuConfig = () => {
  try { return { url: '', token: '', lastSync: null, ...JSON.parse(localStorage.getItem(STORAGE_KEYS.POPZU_SYNC) || '{}') }; }
  catch { return { url: '', token: '', lastSync: null }; }
};

export const savePopzuConfig = (cfg) => {
  localStorage.setItem(STORAGE_KEYS.POPZU_SYNC, JSON.stringify({ ...getPopzuConfig(), ...cfg }));
};

const TAMANHOS_OCULTOS = ['', 'Normal', 'Único'];

// Linha da aba Vendas da planilha → venda do app
const temNumero = (v) => v !== null && v !== undefined && v !== '' && !isNaN(Number(v));

const popzuParaVenda = (r) => ({
  id:          `popzu-${r.id}`,
  source:      'popzu',
  externalId:  r.id,
  date:        r.data || '',
  origem:      r.origem || '',
  description: r.produto + (TAMANHOS_OCULTOS.includes(r.tamanho || '') ? '' : ` · ${r.tamanho}`),
  quantity:    Number(r.qtd) || 1,
  unitPrice:   r.preco,
  finalPrice:  Number(r.total) || 0,
  semPreco:    r.total === null || r.total === undefined,
  vatPct:      0,
  // Custo por peça gravado na planilha (coluna O da aba Vendas); sem custo = fora do lucro
  unitCost:    temNumero(r.custoUnit) ? Number(r.custoUnit) : null,
  costTotal:   temNumero(r.custoUnit) ? Math.round(Number(r.custoUnit) * (Number(r.qtd) || 1) * 100) / 100 : null,
  client:      r.cliente || '',
  notes:       [r.pagamento, r.entrega, r.obs].filter(Boolean).join(' · '),
  pronta:      r.pronta || '',
  printIds:    [],
});

// A planilha é a fonte das vendas Popzu: substitui todas as vendas Popzu do app pelas da planilha
// Custos definidos no app para vendas Popzu (peças avulsas/personalizadas).
// { [externalId]: { costTotal, printIds, metodo: 'impressoes' | 'manual', updatedAt } }
// Têm prioridade sobre o custo da planilha e sobrevivem às sincronizações.
export const getPopzuCustos = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.POPZU_CUSTOS) || '{}'); } catch { return {}; }
};

const comCustoDoApp = (venda, custos) => {
  const c = custos[venda.externalId];
  if (!c) return { ...venda, costSource: temNumero(venda.costTotal) ? 'planilha' : null };
  return { ...venda, costTotal: Number(c.costTotal) || 0, printIds: c.printIds || [], costSource: c.metodo === 'impressoes' ? 'impressoes' : 'manual' };
};

// custo = null remove o custo do app (volta a usar o da planilha, se houver)
export const setPopzuCusto = (externalId, custo) => {
  const custos = getPopzuCustos();
  if (custo === null) delete custos[externalId];
  else custos[externalId] = { ...custo, updatedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEYS.POPZU_CUSTOS, JSON.stringify(custos));
  // Atualiza já a venda guardada, sem esperar a próxima sincronização
  const vendas = getSales().map(v => {
    if (v.source !== 'popzu' || v.externalId !== externalId) return v;
    const base = { ...v, costTotal: temNumero(v.unitCost) ? Math.round(v.unitCost * (Number(v.quantity) || 1) * 100) / 100 : null, printIds: [] };
    return comCustoDoApp(base, custos);
  });
  saveToStorage(STORAGE_KEYS.SALES, vendas);
};

export const aplicarVendasPopzu = (linhas) => {
  const atuais = getSales();
  const antigas = new Map(atuais.filter(s => s.source === 'popzu').map(s => [s.externalId, s]));
  const custos = getPopzuCustos();
  const novas = linhas.map(popzuParaVenda).map(v => comCustoDoApp(v, custos));
  let adicionadas = 0, alteradas = 0;
  novas.forEach(n => {
    const a = antigas.get(n.externalId);
    if (!a) { adicionadas++; return; }
    n.createdAt = a.createdAt;
    const semData = (o) => JSON.stringify({ ...o, createdAt: null });
    if (semData(a) !== semData(n)) alteradas++;
  });
  const idsNovos = new Set(novas.map(n => n.externalId));
  const removidas = [...antigas.keys()].filter(id => !idsNovos.has(id)).length;
  const agora = new Date().toISOString();
  saveToStorage(STORAGE_KEYS.SALES, [
    ...atuais.filter(s => s.source !== 'popzu'),
    ...novas.map(n => ({ ...n, createdAt: n.createdAt || agora })),
  ]);
  savePopzuConfig({ lastSync: agora });
  return { total: novas.length, adicionadas, alteradas, removidas };
};

// Busca as vendas na planilha (URL do app da Web do Apps Script + senha)
export const buscarVendasPopzu = async () => {
  const { url, token } = getPopzuConfig();
  if (!url || !token) throw new Error('Configure o endereço e a senha da planilha (⚙️ Popzu).');
  let resp;
  try {
    resp = await fetch(`${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`);
  } catch {
    throw new Error('Não foi possível acessar a planilha. Verifique a internet e o endereço.');
  }
  let dados;
  try { dados = await resp.json(); } catch {
    throw new Error('A planilha não respondeu como esperado. Confira se o endereço termina em /exec e se o acesso está como "Qualquer pessoa".');
  }
  if (!dados.ok) throw new Error(dados.error || 'Erro na planilha.');
  return aplicarVendasPopzu(dados.vendas || []);
};

// --- BACKUP ---
const getPriceSettingsRaw = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.PRICE_SETTINGS) || 'null'); } catch { return null; }
};

export const exportBackup = () => ({
  version: 3,
  exportedAt: new Date().toISOString(),
  filaments: getFilaments(),
  unifiedOrders: getUnifiedOrders(),
  prints: getPrints(),
  categories: getCategories(),
  brands: getBrands(),
  accCategories: getAccCategories(),
  stockAdjustments: getStockAdjustments(),
  proximas: getProximas(),
  sales: getSales(),
  priceSettings: getPriceSettingsRaw(),
  popzuSync: getPopzuConfig(),
  popzuCustos: getPopzuCustos()
});

export const importBackup = (backup) => {
  if (!backup || ![1, 2, 3].includes(backup.version)) throw new Error('Arquivo de backup inválido.');
  if (backup.filaments) saveToStorage(STORAGE_KEYS.FILAMENTS, backup.filaments);
  if (backup.unifiedOrders) saveToStorage(STORAGE_KEYS.UNIFIED_ORDERS, backup.unifiedOrders);
  if (backup.prints) saveToStorage(STORAGE_KEYS.PRINTS, backup.prints);
  if (backup.categories) saveToStorage(STORAGE_KEYS.CATEGORIES, backup.categories);
  if (backup.brands) saveToStorage(STORAGE_KEYS.BRANDS, backup.brands);
  if (backup.accCategories) saveToStorage(STORAGE_KEYS.ACC_CATEGORIES, backup.accCategories);
  if (backup.stockAdjustments) saveToStorage(STORAGE_KEYS.STOCK_ADJUSTMENTS, backup.stockAdjustments);
  if (backup.proximas) saveToStorage(STORAGE_KEYS.PROXIMAS, backup.proximas);
  if (backup.sales) saveToStorage(STORAGE_KEYS.SALES, backup.sales);
  if (backup.popzuCustos) localStorage.setItem(STORAGE_KEYS.POPZU_CUSTOS, JSON.stringify(backup.popzuCustos));
  if (backup.popzuSync) localStorage.setItem(STORAGE_KEYS.POPZU_SYNC, JSON.stringify(backup.popzuSync));
  if (backup.priceSettings) localStorage.setItem(STORAGE_KEYS.PRICE_SETTINGS, JSON.stringify(backup.priceSettings));
};
