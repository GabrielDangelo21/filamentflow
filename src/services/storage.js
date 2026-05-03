const STORAGE_KEYS = {
  FILAMENTS: 'filamentflow_filaments',
  ORDERS: 'filamentflow_orders',
  PRINTS: 'filamentflow_prints',
  CATEGORIES: 'filamentflow_categories',
  BRANDS: 'filamentflow_brands',
  ACCESSORIES: 'filamentflow_accessories',
  ACC_CATEGORIES: 'filamentflow_acc_categories',
  ACC_ORDERS: 'filamentflow_acc_orders'
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
    filaments.push({
      id: generateId(),
      ...filament,
      createdAt: new Date().toISOString()
    });
  }

  saveToStorage(STORAGE_KEYS.FILAMENTS, filaments);
};

export const deleteFilament = (id) => {
  const filaments = getFilaments().filter(f => f.id !== id);
  saveToStorage(STORAGE_KEYS.FILAMENTS, filaments);
};

// --- ORDERS ---
export const getOrders = () => {
  const orders = getFromStorage(STORAGE_KEYS.ORDERS);
  let migrated = false;
  orders.forEach(o => {
    if (!o.id) { o.id = generateId(); migrated = true; }
  });
  if (migrated) saveToStorage(STORAGE_KEYS.ORDERS, orders);
  return orders;
};

export const saveOrder = (order) => {
  const orders = getOrders();
  const newOrder = {
    ...order,
    id: generateId(),
    date: order.date || new Date().toISOString()
  };
  orders.push(newOrder);
  saveToStorage(STORAGE_KEYS.ORDERS, orders);
  return newOrder;
};

export const deleteOrder = (id) => {
  const orders = getOrders();
  const filtered = orders.filter(order => order.id !== id);
  saveToStorage(STORAGE_KEYS.ORDERS, filtered);
  return filtered;
};

export const updateOrder = (order) => {
  const orders = getOrders();
  const idx = orders.findIndex(o => o.id === order.id);
  if (idx >= 0) {
    orders[idx] = order;
    saveToStorage(STORAGE_KEYS.ORDERS, orders);
  }
};

// --- PRINTS ---
export const getPrints = () => {
  const prints = getFromStorage(STORAGE_KEYS.PRINTS);
  let migrated = false;
  prints.forEach(p => {
    if (!p.id) { p.id = generateId(); migrated = true; }
  });
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

  const newPrint = {
    ...print,
    id: generateId(),
    date: print.date || new Date().toISOString()
  };
  prints.push(newPrint);
  saveToStorage(STORAGE_KEYS.PRINTS, prints);
  return newPrint;
};

export const deletePrint = (id) => {
  const prints = getPrints().filter(p => p.id !== id);
  saveToStorage(STORAGE_KEYS.PRINTS, prints);
};

// --- STOCK CALCULATION ---
export const getFilamentStock = (sku) => {
  const orders = getOrders();
  const prints = getPrints();

  // Sum of all inputs (Orders)
  let totalIn = 0;
  orders.forEach(order => {
    const item = order.items.find(i => i.sku === sku);
    if (item) {
      totalIn += Number(item.weightGrams) || 0;
    }
  });

  // Sum of all outputs (Prints)
  let totalOut = 0;
  prints.forEach(print => {
    const item = print.filamentsUsed.find(f => f.sku === sku);
    if (item) {
      totalOut += Number(item.weightGrams) || 0;
    }
  });

  return totalIn - totalOut;
};

export const getAllFilamentsWithStock = () => {
  const filaments = getFilaments();
  return filaments.map(f => ({
    ...f,
    currentStock: getFilamentStock(f.sku)
  }));
};

// --- CATEGORIES ---
const DEFAULT_CATEGORIES = ['PLA Basic', 'PLA Matte', 'PLA Silk', 'PETG Basic', 'PETG CF', 'ABS', 'TPU', 'PVA'];

export const getCategories = () => {
  const cats = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
  if (!cats) {
    saveToStorage(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
    return DEFAULT_CATEGORIES;
  }
  return JSON.parse(cats);
};

export const saveCategory = (category) => {
  const cats = getCategories();
  if (!cats.includes(category)) {
    cats.push(category);
    saveToStorage(STORAGE_KEYS.CATEGORIES, cats);
  }
};

export const deleteCategory = (category) => {
  const cats = getCategories().filter(c => c !== category);
  saveToStorage(STORAGE_KEYS.CATEGORIES, cats);
};

export const saveAllCategories = (cats) => {
  saveToStorage(STORAGE_KEYS.CATEGORIES, cats);
};

// --- BRANDS ---
const DEFAULT_BRANDS = ['Sunlu', 'Bambu Lab', 'eSUN', 'Creality', 'Polymaker'];

export const getBrands = () => {
  const brands = localStorage.getItem(STORAGE_KEYS.BRANDS);
  if (!brands) {
    saveToStorage(STORAGE_KEYS.BRANDS, DEFAULT_BRANDS);
    return DEFAULT_BRANDS;
  }
  return JSON.parse(brands);
};

export const saveBrand = (brand) => {
  const brands = getBrands();
  if (!brands.includes(brand)) {
    brands.push(brand);
    saveToStorage(STORAGE_KEYS.BRANDS, brands);
  }
};

export const deleteBrand = (brand) => {
  const brands = getBrands().filter(b => b !== brand);
  saveToStorage(STORAGE_KEYS.BRANDS, brands);
};

export const saveAllBrands = (brands) => {
  saveToStorage(STORAGE_KEYS.BRANDS, brands);
};

// --- COST CALCULATION ---
export const getFilamentPricePerGram = (sku) => {
  const orders = getOrders();
  let totalCost = 0;
  let totalGrams = 0;
  orders.forEach(order => {
    const item = order.items.find(i => i.sku === sku);
    if (item && Number(item.price) > 0) {
      totalCost += Number(item.price);
      totalGrams += Number(item.weightGrams);
    }
  });
  return totalGrams > 0 ? totalCost / totalGrams : 0;
};

export const getPrintCost = (print) => {
  return print.filamentsUsed.reduce((acc, f) => {
    const pricePerGram = getFilamentPricePerGram(f.sku);
    return acc + pricePerGram * Number(f.weightGrams);
  }, 0);
};

// --- ACCESSORIES (legacy individual items) ---
const DEFAULT_ACC_CATEGORIES = ['Ferramentas', 'Consumíveis', 'Adesivos', 'Superfície de Impressão', 'Armazenamento', 'Limpeza', 'Electrónica', 'Outros'];

export const getAccessories = () => getFromStorage(STORAGE_KEYS.ACCESSORIES);

// --- ACCESSORY ORDERS (new order-based format) ---
export const getAccOrders = () => {
  const stored = localStorage.getItem(STORAGE_KEYS.ACC_ORDERS);
  if (stored !== null) return JSON.parse(stored);

  // One-time migration from old individual-item format
  const oldItems = getFromStorage(STORAGE_KEYS.ACCESSORIES);
  const migrated = oldItems.map(item => ({
    id: item.id || generateId(),
    date: item.date || new Date().toISOString().split('T')[0],
    store: item.store || '',
    shipping: 0,
    otherCosts: 0,
    createdAt: item.createdAt || new Date().toISOString(),
    items: [{
      name: item.name || '',
      category: item.category || '',
      quantity: Number(item.quantity) || 1,
      price: item.price != null ? Number(item.price) : null
    }]
  }));
  saveToStorage(STORAGE_KEYS.ACC_ORDERS, migrated);
  return migrated;
};

export const saveAccOrder = (order) => {
  const orders = getAccOrders();
  const newOrder = { ...order, id: generateId(), createdAt: new Date().toISOString() };
  orders.push(newOrder);
  saveToStorage(STORAGE_KEYS.ACC_ORDERS, orders);
  return newOrder;
};

export const updateAccOrder = (order) => {
  const orders = getAccOrders();
  const idx = orders.findIndex(o => o.id === order.id);
  if (idx >= 0) {
    orders[idx] = order;
    saveToStorage(STORAGE_KEYS.ACC_ORDERS, orders);
  }
};

export const deleteAccOrder = (id) => {
  saveToStorage(STORAGE_KEYS.ACC_ORDERS, getAccOrders().filter(o => o.id !== id));
};

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
  version: 1,
  exportedAt: new Date().toISOString(),
  filaments: getFilaments(),
  orders: getOrders(),
  prints: getPrints(),
  categories: getCategories(),
  brands: getBrands(),
  accessories: getAccessories(),
  accOrders: getAccOrders(),
  accCategories: getAccCategories()
});

export const importBackup = (backup) => {
  if (!backup || backup.version !== 1) throw new Error('Arquivo de backup inválido.');
  if (backup.filaments) saveToStorage(STORAGE_KEYS.FILAMENTS, backup.filaments);
  if (backup.orders) saveToStorage(STORAGE_KEYS.ORDERS, backup.orders);
  if (backup.prints) saveToStorage(STORAGE_KEYS.PRINTS, backup.prints);
  if (backup.categories) saveToStorage(STORAGE_KEYS.CATEGORIES, backup.categories);
  if (backup.brands) saveToStorage(STORAGE_KEYS.BRANDS, backup.brands);
  if (backup.accessories) saveToStorage(STORAGE_KEYS.ACCESSORIES, backup.accessories);
  if (backup.accOrders) saveToStorage(STORAGE_KEYS.ACC_ORDERS, backup.accOrders);
  if (backup.accCategories) saveToStorage(STORAGE_KEYS.ACC_CATEGORIES, backup.accCategories);
};
