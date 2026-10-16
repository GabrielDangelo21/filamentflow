import { useState, useEffect } from 'react';

// Configurações de preço partilhadas entre Orçamento de Venda, Estimativa de Custo e Calculadora
export const PRICE_SETTINGS_KEY = 'filamentflow_calc_settings';

const DEFAULT_SETTINGS = {
  wattage: 200,
  kwh: 0.145,
  laborMinutes: 5,
  hourlyRate: 15,
  margin: 30,
  marginMode: 'custo', // 'custo' = acréscimo sobre o custo | 'preco' = margem sobre o preço
  wearPerHour: 0.10,
  packaging: 0.50,
  wastePct: 10,
  vat: 21,
};

const loadSettings = () => {
  try {
    const s = JSON.parse(localStorage.getItem(PRICE_SETTINGS_KEY) || '{}');
    const merged = { ...DEFAULT_SETTINGS };
    Object.keys(DEFAULT_SETTINGS).forEach(k => { if (s[k] != null) merged[k] = s[k]; });
    return merged;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
};

export const usePriceSettings = () => {
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => {
    // Junta com o que já está guardado, para não apagar campos de outras abas
    let prev = {};
    try { prev = JSON.parse(localStorage.getItem(PRICE_SETTINGS_KEY) || '{}'); } catch { /* configuração inválida: ignora */ }
    localStorage.setItem(PRICE_SETTINGS_KEY, JSON.stringify({ ...prev, ...settings }));
  }, [settings]);

  const setSetting = (key, value) => setSettings(s => ({ ...s, [key]: value }));
  return [settings, setSetting];
};

// materialCost em €, totalTime em minutos, placas = nº de placas (mão de obra é por placa)
export const calcularPreco = ({ materialCost, totalTime, placas }, s) => {
  const totalMaterial    = materialCost;
  const totalElectricity = (s.wattage / 1000) * (totalTime / 60) * s.kwh;
  const totalLabor       = placas * (s.laborMinutes / 60) * s.hourlyRate;
  const totalWaste       = totalMaterial * s.wastePct / 100;
  const totalWear        = (totalTime / 60) * s.wearPerHour;
  const totalPackaging   = placas > 0 ? s.packaging : 0; // orçamento de uma peça
  const totalCost        = totalMaterial + totalWaste + totalElectricity + totalWear + totalLabor + totalPackaging;
  // 'custo': preço = custo × (1 + %).  'preco': a % é a parte do preço que fica como lucro.
  const priceExVat       = s.marginMode === 'preco'
    ? (s.margin < 100 ? totalCost / (1 - s.margin / 100) : totalCost)
    : totalCost * (1 + s.margin / 100);
  const marginAmt        = priceExVat - totalCost;
  const markupPct        = totalCost  > 0 ? (marginAmt / totalCost)  * 100 : 0;
  const realMarginPct    = priceExVat > 0 ? (marginAmt / priceExVat) * 100 : 0;
  const vatAmt           = priceExVat * s.vat / 100;
  const sellingPrice     = priceExVat + vatAmt;
  return {
    totalMaterial, totalWaste, totalElectricity, totalWear, totalLabor, totalPackaging,
    totalCost, priceExVat, marginAmt, markupPct, realMarginPct, vatAmt, sellingPrice,
  };
};
