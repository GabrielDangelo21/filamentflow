const STORAGE_KEYS = {
  FILAMENTS: 'filamentflow_filaments',
  UNIFIED_ORDERS: 'filamentflow_unified_orders',
  PRINTS: 'filamentflow_prints',
  CATEGORIES: 'filamentflow_categories',
  BRANDS: 'filamentflow_brands',
  ACC_CATEGORIES: 'filamentflow_acc_categories'
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
export const getFilaments = () => getFromStorage(STORAGE_KEYS.FILAMENTS);

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
    filaments.push({ id: generateId(), ...filament, createdAt: new Date().toISOString() });
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

export const getUnifiedOrders = () => getFromStorage(STORAGE_KEYS.UNIFIED_ORDERS);

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
  prints.forEach(p => { if (!p.id) { p.id = generateId(); migrated = true; } });
  if (migrated) saveToStorage(STORAGE_KEYS.PRINTS, prints);
  return prints;
};

export const savePrint = (print) => {
  const prints = getPrints();
  if (print.id) {
    const index = prints.findIndex(p => p.id === print.id);
    if (index >= 0) {
      prints[index] = { ...prints[index], ...print };
      saveToStorage(STORAGE_KEYS.PRINTS, prints);
      return prints[index];
    }
  }
  const newPrint = { ...print, id: generateId(), date: print.date || new Date().toISOString() };
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

  return totalIn - totalOut;
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
export const getFilamentPricePerGram = (sku) => {
  const orders = getUnifiedOrders();
  let totalCost = 0;
  let totalGrams = 0;
  orders.forEach(order => {
    const item = order.items.filter(i => i.type === 'filament').find(i => i.sku === sku);
    if (item && Number(item.price) > 0) {
      totalCost += Number(item.price);
      totalGrams += Number(item.weightGrams);
    }
  });
  return totalGrams > 0 ? totalCost / totalGrams : 0;
};

export const getPrintCost = (print) => {
  return print.filamentsUsed.reduce((acc, f) => {
    return acc + getFilamentPricePerGram(f.sku) * Number(f.weightGrams);
  }, 0);
};

// --- ACCESSORY CATEGORIES ---
const DEFAULT_ACC_CATEGORIES = ['Ferramentas', 'Consumíveis', 'Adesivos', 'Superfície de Impressão', 'Armazenamento', 'Limpeza', 'Electrónica', 'Outros'];

export const getAccCategories = () => {
  const cats = localStorage.getItem(STORAGE_KEYS.ACC_CATEGORIES);
  if (!cats) { saveToStorage(STORAGE_KEYS.ACC_CATEGORIES, DEFAULT_ACC_CATEGORIES); return DEFAULT_ACC_CATEGORIES; }
  return JSON.parse(cats);
};

export const saveAccCategory = (cat) => {
  const cats = getAccCategories();
  if (!cats.includes(cat)) { cats.push(cat); saveToStorage(STORAGE_KEYS.ACC_CATEGORIES, cats); }
};

export const deleteAccCategory = (cat) => {
  saveToStorage(STORAGE_KEYS.ACC_CATEGORIES, getAccCategories().filter(c => c !== cat));
};

export const saveAllAccCategories = (cats) => saveToStorage(STORAGE_KEYS.ACC_CATEGORIES, cats);

// --- BACKUP ---
export const exportBackup = () => ({
  version: 2,
  exportedAt: new Date().toISOString(),
  filaments: getFilaments(),
  unifiedOrders: getUnifiedOrders(),
  prints: getPrints(),
  categories: getCategories(),
  brands: getBrands(),
  accCategories: getAccCategories()
});

export const importBackup = (backup) => {
  if (!backup || (backup.version !== 1 && backup.version !== 2)) throw new Error('Arquivo de backup inválido.');
  if (backup.filaments) saveToStorage(STORAGE_KEYS.FILAMENTS, backup.filaments);
  if (backup.unifiedOrders) saveToStorage(STORAGE_KEYS.UNIFIED_ORDERS, backup.unifiedOrders);
  if (backup.prints) saveToStorage(STORAGE_KEYS.PRINTS, backup.prints);
  if (backup.categories) saveToStorage(STORAGE_KEYS.CATEGORIES, backup.categories);
  if (backup.brands) saveToStorage(STORAGE_KEYS.BRANDS, backup.brands);
  if (backup.accCategories) saveToStorage(STORAGE_KEYS.ACC_CATEGORIES, backup.accCategories);
};
