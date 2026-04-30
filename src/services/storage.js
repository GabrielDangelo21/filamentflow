const STORAGE_KEYS = {
  FILAMENTS: 'filamentflow_filaments',
  ORDERS: 'filamentflow_orders',
  PRINTS: 'filamentflow_prints',
  CATEGORIES: 'filamentflow_categories',
  BRANDS: 'filamentflow_brands'
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
export const getOrders = () => getFromStorage(STORAGE_KEYS.ORDERS);

export const saveOrder = (order) => {
  const orders = getOrders();
  const newOrder = {
    id: generateId(),
    ...order,
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

// --- PRINTS ---
export const getPrints = () => getFromStorage(STORAGE_KEYS.PRINTS);

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
