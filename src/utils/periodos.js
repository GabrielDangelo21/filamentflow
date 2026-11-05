// Períodos dos cartões do Dashboard e a comparação com o período anterior de mesmo tamanho

export const PERIODOS = [
  { id: 'mes', rotulo: 'Este mês' },
  { id: '3meses', rotulo: '3 meses' },
  { id: 'tudo', rotulo: 'Tudo' },
];

// Datas do app vêm como "AAAA-MM-DD" (meio-dia, para não trocar de dia pelo fuso) ou ISO completo
export const paraData = (d) => {
  if (!d) return null;
  const s = String(d);
  const x = s.includes('T') ? new Date(s) : new Date(`${s}T12:00:00`);
  return isNaN(x) ? null : x;
};

const inicioDoDia = (a, m, d) => new Date(a, m, d, 0, 0, 0, 0);
const fimDoDia = (a, m, d) => new Date(a, m, d, 23, 59, 59, 999);
const MESES = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];

// Intervalos (com início e fim incluídos) do período e do período anterior usado na comparação.
// - Este mês: do dia 1 até hoje, comparado com os mesmos dias do mês anterior (1 a 5 de out. se hoje é 5 de nov.).
// - 3 meses: os últimos 90 dias, comparados com os 90 dias antes deles.
// - Tudo: sem filtro e sem comparação.
export const intervalos = (periodo, agora = new Date()) => {
  const a = agora.getFullYear(), m = agora.getMonth(), d = agora.getDate();
  if (periodo === 'mes') {
    const diasMesAnterior = new Date(a, m, 0).getDate();
    const ultimoDiaAnt = Math.min(d, diasMesAnterior);
    const mesAnt = new Date(a, m - 1, 1);
    return {
      atual: { inicio: inicioDoDia(a, m, 1), fim: fimDoDia(a, m, d) },
      anterior: { inicio: inicioDoDia(a, m - 1, 1), fim: fimDoDia(a, m - 1, ultimoDiaAnt) },
      descricaoAnterior: ultimoDiaAnt === 1
        ? `1º de ${MESES[mesAnt.getMonth()]}`
        : `1–${ultimoDiaAnt} de ${MESES[mesAnt.getMonth()]}`,
    };
  }
  if (periodo === '3meses') {
    return {
      atual: { inicio: inicioDoDia(a, m, d - 89), fim: fimDoDia(a, m, d) },
      anterior: { inicio: inicioDoDia(a, m, d - 179), fim: fimDoDia(a, m, d - 90) },
      descricaoAnterior: 'os 90 dias anteriores',
    };
  }
  return { atual: { inicio: null, fim: null }, anterior: null, descricaoAnterior: null };
};

// Sem início = sem filtro (inclui até registros sem data); com período, registros sem data ficam de fora
const noIntervalo = (data, iv) => {
  if (!iv.inicio) return true;
  const x = paraData(data);
  return x !== null && x >= iv.inicio && x <= iv.fim;
};

// Números dos cartões dentro de um intervalo.
// lucroVenda(sale) vem do storage (getSaleProfit): null = venda sem custo.
export const calcularKpis = ({ sales, prints }, iv, { lucroVenda }) => {
  const vendas = sales.filter(s => noIntervalo(s.date, iv));
  const impressoes = prints.filter(p => noIntervalo(p.date, iv));
  return {
    totalSales: vendas.length,
    totalRevenue: vendas.reduce((acc, s) => acc + (Number(s.finalPrice) || 0), 0),
    totalProfit: vendas.reduce((acc, s) => acc + (lucroVenda(s) ?? 0), 0),
    // Base da margem (mesma conta da aba Vendas): faturado sem IVA só das vendas que têm custo
    receitaComCustoSemIva: vendas
      .filter(s => lucroVenda(s) !== null)
      .reduce((acc, s) => acc + (Number(s.finalPrice) || 0) / (1 + (Number(s.vatPct) || 0) / 100), 0),
    totalPrints: impressoes.length,
    totalUsedGrams: impressoes.reduce((acc, p) => acc + (Number(p.totalWeight) || 0), 0),
    totalTimeMinutes: impressoes.reduce((acc, p) => acc + (Number(p.timeMinutes) || 0), 0),
  };
};

// Tempo de impressão em dias e horas ("10 dias 5 horas"); abaixo de 1 hora, em minutos
export const formatarDuracao = (minutos) => {
  const total = Math.round(Number(minutos) || 0);
  if (total < 60) return `${total} min`;
  const dias = Math.floor(total / 1440);
  const horas = Math.floor((total % 1440) / 60);
  const partes = [];
  if (dias) partes.push(`${dias} ${dias === 1 ? 'dia' : 'dias'}`);
  if (horas || !dias) partes.push(`${horas} ${horas === 1 ? 'hora' : 'horas'}`);
  return partes.join(' ');
};

// Variação percentual entre o período e o anterior.
// null = nada nos dois períodos; 'novo' = havia zero antes (percentual não faz sentido).
export const variacao = (atual, anterior) => {
  if (!anterior) return atual ? 'novo' : null;
  return ((atual - anterior) / Math.abs(anterior)) * 100;
};
