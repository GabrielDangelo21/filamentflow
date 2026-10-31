/**
 * Popzu · Formulário de vendas (até 5 produtos por venda) + sincronização com o FilamentFlow
 *
 * Cole este código na planilha "Vendas_Popzu" (Extensões → Apps Script), substituindo o anterior, e salve.
 *
 * Primeira vez (formulário ainda não existe): rode criarFormulario() uma vez. Ela:
 *   - desliga o formulário antigo (se houver) e cria "Popzu · Registrar venda" com até 5 produtos
 *     por envio; cliente, pagamento e entrega são preenchidos uma vez para a venda toda;
 *   - liga o formulário à planilha e instala o gatilho que copia cada produto para uma linha
 *     da aba Vendas (Estoque e loja continuam lendo de Vendas);
 *   - mostra o link do formulário novo para salvar na tela inicial do celular.
 * O formulário atual JÁ existe: não rode criarFormulario() de novo (isso criaria um link novo).
 *
 * Sincronização com o app: menu Popzu → Configurar sincronização com o app (uma vez) e siga os passos.
 * Se mudar a aba Produtos, use o menu Popzu → Atualizar lista do formulário.
 */

var TITULO = 'Popzu · Registrar venda';
var MAX = 5;
var ORIGENS = ['Personagens', 'Site Popzu', 'Natal', 'Outro', 'Cartões Pokémon'];
// Cartões Pokémon (kit cards): 1 por 3 €, 2 por 5 € (preço vazio = preço de pacote calculado na venda toda)
var CARTAO_ORIGEM = 'Cartões Pokémon', CARTAO_SUFIXO = ' (Cartão Pokémon)', CARTAO_UM = 3, CARTAO_DOIS = 5;
var CARTOES = ['Bulbasaur', 'Charmander', 'Charmeleon', 'Charizard', 'Squirtle', 'Caterpie', 'Butterfree', 'Rattata', 'Pikachu', 'Raichu', 'Clefairy', 'Jigglypuff', 'Wigglytuff', 'Oddish', 'Venonat', 'Diglett', 'Meowth', 'Psyduck', 'Mankey', 'Growlithe', 'Poliwrath', 'Abra', 'Tentacool', 'Geodude', 'Slowpoke', 'Gengar', 'Krabby', 'Cubone', 'Horsea', 'Scyther', 'Pinsir', 'Magikarp', 'Lapras', 'Eevee', 'Snorlax', 'Mewtwo', 'Mew', 'Cyndaquil', 'Totodile', 'Hoothoot', 'Pichu', 'Togepi', 'Mareep', 'Ampharos', 'Marill', 'Wooper', 'Espeon', 'Umbreon', 'Scizor', 'Shuckle', 'Heracross', 'Teddiursa', 'Phanpy', 'Elekid', 'Larvitar', 'Lugia', 'Torchic', 'Mudkip', 'Bonsly', 'Lucario', 'Leafeon', 'Sylveon', 'Phantump', 'Scorbunny'];

// Aba Vendas: colunas (1 = A). A coluna N guarda o ID de cada linha, usado pelo app para não duplicar vendas.
var COL = { data: 1, origem: 2, produto: 3, tamanho: 4, pronta: 5, qtd: 6, preco: 7, total: 8, tabela: 9,
            cliente: 10, pagamento: 11, entrega: 12, obs: 13, id: 14, custo: 15 };
// Aba Produtos: custo de produção por peça (normal/pequeno e grande/150%)
var PROD_CUSTO = 5, PROD_CUSTO_GRANDE = 6;
var AVISO_SEM_PRECO = '⚠ SEM PREÇO';

var Q = {
  origem: 'O que você vendeu?',
  personagem: 'Personagem',
  tamPers: 'Tamanho do personagem',
  pronta: 'Era uma peça de pronta entrega?',
  modelo: 'Modelo do site',
  tamModelo: 'Tamanho do modelo',
  natal: 'Peça de Natal',
  cartao: 'Cartão Pokémon',
  outro: 'Produto',
  qtd: 'Quantidade',
  preco: 'Preço por peça (€)',
  mais: 'Adicionar outro produto?',
  cliente: 'Cliente',
  pagamento: 'Pagamento',
  entrega: 'Entrega',
  data: 'Data da venda',
  obs: 'Observações'
};
// Título da pergunta do produto i: "Personagem · 2"
function t_(k, i) { return Q[k] + ' · ' + i; }

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Popzu')
    .addItem('Abrir formulário de venda', 'mostrarLink')
    .addItem('Atualizar lista do formulário', 'atualizarFormulario')
    .addItem('Adicionar Cartões Pokémon', 'adicionarCartoes')
    .addSeparator()
    .addItem('Configurar sincronização com o app', 'configurarSincronizacao')
    .addItem('Gerar nova senha de sincronização', 'novaSenha')
    .addSeparator()
    .addItem('Importar custos dos personagens', 'importarCustos')
    .addItem('Preencher custos nas vendas sem custo', 'preencherCustosVendas')
    .addToUi();
}

function produtos_(origem) {
  var sh = SpreadsheetApp.getActive().getSheetByName('Produtos');
  var v = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues();
  var out = v.filter(function (r) { return r[0] && r[1] === origem; }).map(function (r) { return String(r[0]); });
  return out.sort(function (a, b) { return a.localeCompare(b, 'pt'); });
}

function desligarAntigo_(ss, props) {
  ScriptApp.getProjectTriggers().forEach(function (tr) {
    if (tr.getHandlerFunction() === 'aoEnviar') ScriptApp.deleteTrigger(tr);
  });
  var id = props.getProperty('FORM_ID');
  if (id) {
    try {
      var old = FormApp.openById(id);
      old.setAcceptingResponses(false).setCustomClosedFormMessage('Este formulário foi substituído por um novo.');
      old.removeDestination();
    } catch (err) { /* formulário antigo já apagado */ }
    props.deleteProperty('FORM_ID');
  }
  SpreadsheetApp.flush();
  ss.getSheets().forEach(function (sh) {
    if (sh.getName() === 'Respostas do formulário') sh.setName('Respostas (formulário antigo)');
  });
}

function criarFormulario() {
  var ss = SpreadsheetApp.getActive();
  var props = PropertiesService.getDocumentProperties();
  desligarAntigo_(ss, props);

  var f = FormApp.create(TITULO)
    .setDescription('Uso interno. Cada produto vira uma linha na aba Vendas da planilha.')
    .setCollectEmail(false)
    .setProgressBar(false)
    .setConfirmationMessage('Venda registrada ✓')
    .setShowLinkToRespondAgain(true);

  var itens = [];   // por produto: {inicio, origem, pPers, pSite, pNatal, pOutro, pDet, mais}
  for (var i = 1; i <= MAX; i++) {
    var b = {};
    b.inicio = i === 1 ? null : f.addPageBreakItem().setTitle('Produto ' + i);
    b.origem = f.addMultipleChoiceItem().setTitle(t_('origem', i)).setRequired(true);

    b.pPers = f.addPageBreakItem().setTitle('Personagens · produto ' + i);
    f.addListItem().setTitle(t_('personagem', i)).setChoiceValues(produtos_('Personagens')).setRequired(true);
    f.addMultipleChoiceItem().setTitle(t_('tamPers', i)).setChoiceValues(['Normal', '150%', 'Personalizado']).setRequired(true);
    f.addMultipleChoiceItem().setTitle(t_('pronta', i)).setChoiceValues(['Sim', 'Não']).setRequired(true)
      .setHelpText('Sim = saiu do estoque de prontas (a loja tira 1 da quantidade).');

    b.pSite = f.addPageBreakItem().setTitle('Site Popzu · produto ' + i);
    f.addListItem().setTitle(t_('modelo', i)).setChoiceValues(produtos_('Site Popzu')).setRequired(true);
    f.addMultipleChoiceItem().setTitle(t_('tamModelo', i)).setChoiceValues(['Pequeno', 'Grande', 'Personalizado']).setRequired(true);

    b.pNatal = f.addPageBreakItem().setTitle('Natal · produto ' + i);
    f.addListItem().setTitle(t_('natal', i)).setChoiceValues(produtos_('Natal')).setRequired(true);

    b.pOutro = f.addPageBreakItem().setTitle('Outro · produto ' + i);
    f.addTextItem().setTitle(t_('outro', i)).setRequired(true);

    b.pDet = f.addPageBreakItem().setTitle('Quantidade e preço · produto ' + i);
    f.addTextItem().setTitle(t_('qtd', i)).setRequired(true)
      .setValidation(FormApp.createTextValidation().requireWholeNumber().build());
    f.addTextItem().setTitle(t_('preco', i))
      .setHelpText('Deixe vazio para usar o preço da tabela (obrigatório para tamanho Personalizado). Use vírgula ou ponto: 12,50');
    b.mais = i < MAX ? f.addMultipleChoiceItem().setTitle(t_('mais', i)).setRequired(true) : null;
    itens.push(b);
  }

  var pFinal = f.addPageBreakItem().setTitle('Cliente e pagamento');
  f.addTextItem().setTitle(Q.cliente);
  f.addMultipleChoiceItem().setTitle(Q.pagamento).setChoiceValues(['Dinheiro', 'Payconiq', 'Transferência', 'Wero', 'Outro']);
  f.addMultipleChoiceItem().setTitle(Q.entrega).setChoiceValues(['Retirada Denderleeuw', 'Envio', 'Em mãos']);
  f.addDateItem().setTitle(Q.data).setHelpText('Vazio = hoje.');
  f.addParagraphTextItem().setTitle(Q.obs);

  // Navegação
  itens.forEach(function (b, k) {
    b.origem.setChoices([
      b.origem.createChoice(ORIGENS[0], b.pPers),
      b.origem.createChoice(ORIGENS[1], b.pSite),
      b.origem.createChoice(ORIGENS[2], b.pNatal),
      b.origem.createChoice(ORIGENS[3], b.pOutro)
    ]);
    b.pSite.setGoToPage(b.pDet);    // fim da seção Personagens → quantidade e preço
    b.pNatal.setGoToPage(b.pDet);   // fim da seção Site → quantidade e preço
    b.pOutro.setGoToPage(b.pDet);   // fim da seção Natal → quantidade e preço
    if (b.mais) {
      b.mais.setChoices([
        b.mais.createChoice('Sim', itens[k + 1].inicio),
        b.mais.createChoice('Não', pFinal)
      ]);
    }
  });

  f.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  props.setProperty('FORM_ID', f.getId());
  ScriptApp.newTrigger('aoEnviar').forSpreadsheet(ss).onFormSubmit().create();

  SpreadsheetApp.flush();
  ss.getSheets().forEach(function (sh) {
    var url = sh.getFormUrl();
    if (url && url.indexOf(f.getId()) >= 0) {
      sh.setName('Respostas do formulário');
      ss.setActiveSheet(sh);
      ss.moveActiveSheet(ss.getNumSheets());
    }
  });
  mostrarLink();
}

function atualizarFormulario() {
  var f = FormApp.openById(PropertiesService.getDocumentProperties().getProperty('FORM_ID'));
  var mapa = [[Q.personagem, 'Personagens'], [Q.modelo, 'Site Popzu'], [Q.natal, 'Natal'], [Q.cartao, CARTAO_ORIGEM]];
  f.getItems(FormApp.ItemType.LIST).forEach(function (it) {
    mapa.forEach(function (m) {
      if (it.getTitle().indexOf(m[0] + ' · ') === 0) it.asListItem().setChoiceValues(produtos_(m[1]));
    });
  });
  SpreadsheetApp.getUi().alert('Lista do formulário atualizada.');
}

function mostrarLink() {
  var id = PropertiesService.getDocumentProperties().getProperty('FORM_ID');
  if (!id) { SpreadsheetApp.getUi().alert('Rode criarFormulario() primeiro.'); return; }
  var url = FormApp.openById(id).getPublishedUrl();
  var html = HtmlService.createHtmlOutput(
    '<p style="font-family:sans-serif">Link do formulário (abra no celular e adicione à tela inicial):</p>' +
    '<p style="font-family:sans-serif;word-break:break-all"><a href="' + url + '" target="_blank">' + url + '</a></p>')
    .setWidth(460).setHeight(170);
  SpreadsheetApp.getUi().showModalDialog(html, TITULO);
}

// Converte "12,50", "12.50", "€ 1.234,50" ou "1,234.50" em número; vazio/inválido = ''
function num_(v) {
  if (typeof v === 'number') return v;
  var s = String(v || '').trim().replace(/\s|€/g, '');
  if (s === '') return '';
  if (s.indexOf(',') >= 0 && s.indexOf('.') >= 0) {
    // o separador que aparece por último é o decimal
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else {
    s = s.replace(',', '.');
  }
  return isNaN(Number(s)) ? '' : Number(s);
}

function precoTabela_(produto, tamanho) {
  var sh = SpreadsheetApp.getActive().getSheetByName('Produtos');
  var v = sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues();
  for (var i = 0; i < v.length; i++) {
    if (v[i][0] === produto) return (tamanho === '150%' || tamanho === 'Grande') ? v[i][3] : v[i][2];
  }
  return '';
}

// Gatilho: cada produto da resposta vira uma linha na aba Vendas (a partir da primeira linha vazia)
function aoEnviar(e) {
  // Trava: duas respostas ao mesmo tempo não podem escrever na mesma linha
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var r = e.namedValues, g = function (k) { return (r[k] && r[k][0]) || ''; };
    var data = g(Q.data) ? new Date(g(Q.data).split('/').reverse().join('-') + 'T12:00:00') : new Date();
    if (isNaN(data)) data = new Date();
    var obs = g(Q.obs);

    var linhas = [];
    for (var i = 1; i <= MAX; i++) {
      var origem = g(t_('origem', i));
      if (!origem) break;
      var produto = '', tamanho = '', pronta = 'Não';
      if (origem === 'Personagens') { produto = g(t_('personagem', i)); tamanho = g(t_('tamPers', i)); pronta = g(t_('pronta', i)) || 'Não'; }
      else if (origem === 'Site Popzu') { produto = g(t_('modelo', i)); tamanho = g(t_('tamModelo', i)); }
      else if (origem === 'Natal') { produto = g(t_('natal', i)); tamanho = 'Único'; }
      else if (origem === CARTAO_ORIGEM) { produto = g(t_('cartao', i)); tamanho = 'Único'; }
      else { produto = g(t_('outro', i)); }
      var preco = num_(g(t_('preco', i)));
      var auto = preco === '';
      if (auto && tamanho !== 'Personalizado') preco = precoTabela_(produto, tamanho);
      var l = [data, origem, produto, tamanho, pronta, num_(g(t_('qtd', i))) || 1, preco];
      l.auto = auto;
      linhas.push(l);
    }
    if (!linhas.length) return;

    // Cartões sem preço digitado: preço de pacote na venda toda (2 por 5 €, 1 por 3 €), dividido por cartão
    var semPreco = linhas.filter(function (l) { return l[1] === CARTAO_ORIGEM && l.auto; });
    var n = semPreco.reduce(function (s, l) { return s + l[5]; }, 0);
    if (n) {
      // cada cartão vale metade do pacote (2,50 €); se o total for ímpar, o cartão avulso (3 €) fica numa linha de
      // quantidade ímpar. Preço unitário sem arredondar, para Qtd × Preço dar o total exato (ex.: 3 cartões = 8,00 €).
      var meio = CARTAO_DOIS / 2;
      semPreco.forEach(function (l) { l[6] = meio; });
      if (n % 2) {
        var impar = semPreco.filter(function (l) { return l[5] % 2; }).pop() || semPreco[semPreco.length - 1];
        impar[6] = (meio * impar[5] + (CARTAO_UM - meio)) / impar[5];
      }
    }

    var sh = SpreadsheetApp.getActive().getSheetByName('Vendas');
    garantirColunaId_(sh);
    var custos = carregarCustos_();
    var col = sh.getRange(2, COL.produto, Math.max(sh.getLastRow(), 2), 1).getValues();
    var row = 2;
    while (row - 2 < col.length && col[row - 2][0] !== '') row++;
    sh.getRange(row, 1, linhas.length, 7).setValues(linhas);
    // Cliente, pagamento, entrega, observações (+ aviso quando ficou sem preço) e ID
    sh.getRange(row, COL.cliente, linhas.length, 6).setValues(linhas.map(function (l) {
      var o = l[6] === '' ? (obs ? obs + ' · ' : '') + AVISO_SEM_PRECO : obs;
      return [g(Q.cliente), g(Q.pagamento), g(Q.entrega), o, Utilities.getUuid(), custoDe_(custos, l[2], l[3])];
    }));
    for (var k = 0; k < linhas.length; k++) {   // passou das linhas já preparadas: copia as fórmulas
      if (row + k > 2 && sh.getRange(row + k, COL.total).getFormula() === '') {
        sh.getRange(row + k - 1, COL.total, 1, 2).copyTo(sh.getRange(row + k, COL.total, 1, 2));
      }
    }
  } finally {
    lock.releaseLock();
  }
}

/**
 * Rode uma vez (menu Popzu → Adicionar Cartões Pokémon). Mantém o mesmo link do formulário:
 * acrescenta os cartões à aba Produtos, a opção "Cartões Pokémon" em Vendas e no Resumo,
 * e uma seção "Cartões Pokémon" em cada produto do formulário.
 */
function adicionarCartoes() {
  var ss = SpreadsheetApp.getActive();

  // Produtos
  var prod = ss.getSheetByName('Produtos');
  var tem = prod.getRange(2, 1, Math.max(prod.getLastRow() - 1, 1), 1).getValues().map(function (r) { return r[0]; });
  var novos = CARTOES.filter(function (c) { return tem.indexOf(c + CARTAO_SUFIXO) < 0; })
    .map(function (c) { return [c + CARTAO_SUFIXO, CARTAO_ORIGEM, CARTAO_UM, '']; });
  if (novos.length) prod.getRange(prod.getLastRow() + 1, 1, novos.length, 4).setValues(novos);
  var nProd = prod.getLastRow();

  // Vendas: lista de origens e de produtos
  var v = ss.getSheetByName('Vendas'), last = v.getMaxRows();
  v.getRange(2, 2, last - 1, 1).setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(['Personagens', 'Site Popzu', 'Natal', CARTAO_ORIGEM, 'Outro'], true).setAllowInvalid(true).build());
  v.getRange(2, 3, last - 1, 1).setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInRange(prod.getRange('A2:A' + nProd), true).setAllowInvalid(true).build());
  // Preço de tabela (coluna I) passa a ver todos os produtos — leitura e escrita em bloco
  var faixa = v.getRange(2, 9, last - 1, 1), fs = faixa.getFormulas();
  var mudou = false;
  fs = fs.map(function (r) {
    var n = r[0].replace(/Produtos!\$A\$2:\$D\$\d+/, function () { return 'Produtos!$A$2:$D$' + nProd; });
    if (n !== r[0]) mudou = true;
    return [n];
  });
  if (mudou) faixa.setFormulas(fs);
  SpreadsheetApp.flush();

  // Resumo: linha dos cartões antes do Total.
  // O nome vai com setValue e as fórmulas com setFormulas (sintaxe com vírgula, igual em qualquer idioma).
  // Com setValues as fórmulas eram lidas no idioma da planilha (separador ;) e davam #ERROR!.
  var res = ss.getSheetByName('Resumo');
  var col = res.getRange(1, 1, res.getLastRow(), 1).getValues().map(function (x) { return x[0]; });
  if (col.indexOf(CARTAO_ORIGEM) < 0) {
    var iTot = col.indexOf('Total') + 1;
    res.insertRowBefore(iTot);
    res.getRange(iTot, 1).setValue(CARTAO_ORIGEM);
    res.getRange(iTot, 2, 1, 2).setFormulas([[
      '=SUMIFS(Vendas!$F:$F,Vendas!$B:$B,A' + iTot + ')', '=SUMIFS(Vendas!$H:$H,Vendas!$B:$B,A' + iTot + ')']]);
    var t = iTot + 1;
    res.getRange(t, 2, 1, 2).setFormulas([['=SUM(B2:B' + (t - 1) + ')', '=SUM(C2:C' + (t - 1) + ')']]);
  }

  // Formulário: seção "Cartões Pokémon" em cada produto, antes de "Quantidade e preço"
  var f = FormApp.openById(PropertiesService.getDocumentProperties().getProperty('FORM_ID'));
  var lista = CARTOES.map(function (c) { return c + CARTAO_SUFIXO; }).sort(function (a, b) { return a.localeCompare(b, 'pt'); });
  for (var i = 1; i <= MAX; i++) {
    if (f.getItems().some(function (it) { return it.getTitle() === t_('cartao', i); })) continue;
    var pDet = f.getItems(FormApp.ItemType.PAGE_BREAK).filter(function (p) {
      return p.getTitle() === 'Quantidade e preço · produto ' + i; })[0].asPageBreakItem();
    var pCart = f.addPageBreakItem().setTitle('Cartões Pokémon · produto ' + i)
      .setHelpText('1 cartão ' + CARTAO_UM + ' € · 2 cartões ' + CARTAO_DOIS + ' €. Deixe o preço vazio que o pacote é calculado sozinho.');
    var item = f.addListItem().setTitle(t_('cartao', i)).setChoiceValues(lista).setRequired(true);
    f.moveItem(pCart.getIndex(), pDet.getIndex());
    f.moveItem(item.getIndex(), pDet.getIndex());
    pCart.setGoToPage(pDet);   // a seção "Outro" (antes desta) continua indo para Quantidade e preço
    var origem = f.getItems().filter(function (it) { return it.getTitle() === t_('origem', i); })[0].asMultipleChoiceItem();
    var ch = origem.getChoices().map(function (c) { return origem.createChoice(c.getValue(), c.getGotoPage()); });
    ch.splice(ch.length - 1, 0, origem.createChoice(CARTAO_ORIGEM, pCart));   // antes de "Outro"
    origem.setChoices(ch);
  }
  // toast em vez de alert: um alert espera o clique na aba da planilha e, rodando pelo editor, a execução fica parada até expirar
  var msg = 'Cartões Pokémon adicionados (' + novos.length + ' produtos novos). O link do formulário continua o mesmo.';
  console.log(msg);
  ss.toast(msg, 'Popzu', 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sincronização com o FilamentFlow
// ─────────────────────────────────────────────────────────────────────────────

// Cabeçalhos "ID" (coluna N) e "Custo unit. (€)" (coluna O) na aba Vendas
function garantirColunaId_(sh) {
  if (sh.getMaxColumns() < COL.custo) sh.insertColumnsAfter(sh.getMaxColumns(), COL.custo - sh.getMaxColumns());
  var h = sh.getRange(1, COL.id);
  if (h.getValue() !== 'ID') h.setValue('ID').setFontColor('#999999');
  var c = sh.getRange(1, COL.custo);
  if (c.getValue() !== 'Custo unit. (€)') c.setValue('Custo unit. (€)').setFontWeight('bold');
}

// ─────────────────────────────────────────────────────────────────────────────
// Custos de produção
// Ficam na aba Produtos (colunas E e F). Cada venda grava o custo do momento na coluna O da aba Vendas,
// então mudar um custo depois não altera vendas antigas.
// ─────────────────────────────────────────────────────────────────────────────

// { produto: [custo normal/pequeno, custo grande/150%] } lido da aba Produtos
function carregarCustos_() {
  var sh = SpreadsheetApp.getActive().getSheetByName('Produtos');
  var mapa = {};
  if (sh.getLastRow() < 2) return mapa;
  if (sh.getMaxColumns() < PROD_CUSTO_GRANDE) return mapa;
  var v = sh.getRange(2, 1, sh.getLastRow() - 1, PROD_CUSTO_GRANDE).getValues();
  v.forEach(function (r) { if (r[0]) mapa[String(r[0])] = [num_(r[PROD_CUSTO - 1]), num_(r[PROD_CUSTO_GRANDE - 1])]; });
  return mapa;
}

// Custo por peça de um produto num tamanho; '' quando não há custo cadastrado (ou é Personalizado)
function custoDe_(mapa, produto, tamanho) {
  var c = mapa[String(produto)];
  if (!c || tamanho === 'Personalizado') return '';
  return (tamanho === '150%' || tamanho === 'Grande') ? c[1] : c[0];
}

// Menu Popzu → Importar custos dos personagens (custos calculados no FilamentFlow a partir do fatiamento)
function importarCustos() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName('Produtos');
  if (sh.getMaxColumns() < PROD_CUSTO_GRANDE) sh.insertColumnsAfter(sh.getMaxColumns(), PROD_CUSTO_GRANDE - sh.getMaxColumns());
  sh.getRange(1, PROD_CUSTO, 1, 2).setValues([['Custo normal / pequeno (€)', 'Custo grande / 150% (€)']]).setFontWeight('bold');
  var nomes = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  var atuais = sh.getRange(2, PROD_CUSTO, nomes.length, 2).getValues();
  var n = 0;
  var novos = nomes.map(function (r, i) {
    var c = CUSTOS_INICIAIS[String(r[0])];
    if (!c) return atuais[i];
    n++;
    return [c[0], c[1] === null ? atuais[i][1] : c[1]];
  });
  sh.getRange(2, PROD_CUSTO, novos.length, 2).setValues(novos).setNumberFormat('0.00');
  var ui = SpreadsheetApp.getUi();
  var resp = ui.alert('Custos importados',
    n + ' produtos receberam custo.\n\nAtualizar também o custo das vendas JÁ registradas (coluna O da aba Vendas) com estes valores?\n' +
    'Sim = substitui o custo de todas as vendas desses produtos.  Não = só preenche as vendas sem custo.',
    ui.ButtonSet.YES_NO);
  var m = preencherCustosVendas_(resp === ui.Button.YES);
  ss.toast(n + ' produtos receberam custo; ' + m + ' venda(s) antiga(s) receberam custo.', 'Popzu', 10);
}

// Menu Popzu → Preencher custos nas vendas sem custo (só preenche células vazias da coluna O)
function preencherCustosVendas() {
  var m = preencherCustosVendas_();
  SpreadsheetApp.getActive().toast(m + ' venda(s) receberam custo.', 'Popzu', 8);
}

// sobrescrever = true: troca também os custos já gravados (só para produtos com custo cadastrado)
function preencherCustosVendas_(sobrescrever) {
  var sh = SpreadsheetApp.getActive().getSheetByName('Vendas');
  garantirColunaId_(sh);
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var mapa = carregarCustos_();
  var v = sh.getRange(2, 1, last - 1, COL.custo).getValues();
  var col = v.map(function (r) { return [r[COL.custo - 1]]; });
  var n = 0;
  v.forEach(function (r, i) {
    if (r[COL.produto - 1] === '' || (col[i][0] !== '' && !sobrescrever)) return;
    var c = custoDe_(mapa, r[COL.produto - 1], r[COL.tamanho - 1]);
    if (c !== '' && c !== null && col[i][0] !== c) { col[i][0] = c; n++; }
  });
  if (n) sh.getRange(2, COL.custo, col.length, 1).setValues(col);
  return n;
}

// Dá um ID a todas as linhas preenchidas que ainda não têm (inclusive as digitadas à mão)
function preencherIds_(sh) {
  garantirColunaId_(sh);
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var prod = sh.getRange(2, COL.produto, last - 1, 1).getValues();
  var ids = sh.getRange(2, COL.id, last - 1, 1).getValues();
  var n = 0;
  for (var i = 0; i < ids.length; i++) {
    if (prod[i][0] !== '' && ids[i][0] === '') { ids[i][0] = Utilities.getUuid(); n++; }
  }
  if (n) sh.getRange(2, COL.id, ids.length, 1).setValues(ids);
  return n;
}

function senha_() {
  var props = PropertiesService.getScriptProperties();
  var s = props.getProperty('SYNC_TOKEN');
  if (!s) { s = Utilities.getUuid().replace(/-/g, ''); props.setProperty('SYNC_TOKEN', s); }
  return s;
}

function novaSenha() {
  PropertiesService.getScriptProperties().deleteProperty('SYNC_TOKEN');
  var s = senha_();
  SpreadsheetApp.getUi().alert('Nova senha de sincronização:\n\n' + s + '\n\nAtualize a senha no app (Vendas → ⚙️ Popzu). A senha antiga deixou de funcionar.');
}

// Menu Popzu → Configurar sincronização com o app
function configurarSincronizacao() {
  var sh = SpreadsheetApp.getActive().getSheetByName('Vendas');
  var n = preencherIds_(sh);
  var s = senha_();
  var html = HtmlService.createHtmlOutput(
    '<div style="font-family:sans-serif;font-size:14px;line-height:1.5">' +
    '<p>Coluna <b>ID</b> pronta na aba Vendas (' + n + ' linha(s) receberam ID agora).</p>' +
    '<p><b>Senha de sincronização</b> (cole no app):</p>' +
    '<p style="font-family:monospace;background:#f1f3f4;padding:8px;border-radius:4px;word-break:break-all;user-select:all">' + s + '</p>' +
    '<p><b>Publicar (só na primeira vez):</b></p>' +
    '<ol style="padding-left:18px;margin:0">' +
    '<li>No editor do Apps Script: <b>Implantar → Nova implantação</b>.</li>' +
    '<li>Em "Selecionar tipo" (engrenagem): <b>App da Web</b>.</li>' +
    '<li>Executar como: <b>Eu</b>. Quem pode acessar: <b>Qualquer pessoa</b>.</li>' +
    '<li>Clique em <b>Implantar</b>, autorize e copie o <b>URL do app da Web</b> (termina em /exec).</li>' +
    '<li>No FilamentFlow: <b>Vendas → ⚙️ Popzu</b>, cole o URL e a senha.</li>' +
    '</ol>' +
    '<p style="color:#666">Sem a senha o endereço não devolve nada. Se mudar este código depois, use ' +
    '<b>Implantar → Gerenciar implantações → editar → Nova versão</b> para manter o mesmo URL.</p></div>')
    .setWidth(520).setHeight(470);
  SpreadsheetApp.getUi().showModalDialog(html, 'Sincronização com o FilamentFlow');
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Endereço usado pelo app: GET <url>/exec?token=SENHA → todas as vendas da aba Vendas
function doGet(e) {
  var token = e && e.parameter && e.parameter.token;
  var certa = PropertiesService.getScriptProperties().getProperty('SYNC_TOKEN');
  if (!certa || token !== certa) return json_({ ok: false, error: 'Senha inválida.' });

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = SpreadsheetApp.getActive();
    var sh = ss.getSheetByName('Vendas');
    preencherIds_(sh);
    preencherCustosVendas_();   // linhas digitadas à mão recebem o custo atual da aba Produtos
    var last = sh.getLastRow();
    var tz = ss.getSpreadsheetTimeZone();
    var v = last < 2 ? [] : sh.getRange(2, 1, last - 1, COL.custo).getValues();
    var vendas = v.filter(function (r) { return r[COL.produto - 1] !== '' && r[COL.id - 1] !== ''; }).map(function (r) {
      var d = r[COL.data - 1];
      var qtd = num_(r[COL.qtd - 1]) || 1;
      var preco = num_(r[COL.preco - 1]);
      var total = num_(r[COL.total - 1]);
      if (total === '' && preco !== '') total = qtd * preco;
      var custo = num_(r[COL.custo - 1]);
      return {
        id:         String(r[COL.id - 1]),
        data:       d instanceof Date ? Utilities.formatDate(d, tz, 'yyyy-MM-dd') : String(d || ''),
        origem:     String(r[COL.origem - 1] || ''),
        produto:    String(r[COL.produto - 1] || ''),
        tamanho:    String(r[COL.tamanho - 1] || ''),
        pronta:     String(r[COL.pronta - 1] || ''),
        qtd:        qtd,
        preco:      preco === '' ? null : preco,
        total:      total === '' ? null : total,
        cliente:    String(r[COL.cliente - 1] || ''),
        pagamento:  String(r[COL.pagamento - 1] || ''),
        entrega:    String(r[COL.entrega - 1] || ''),
        obs:        String(r[COL.obs - 1] || ''),
        custoUnit:  custo === '' ? null : custo
      };
    });
    return json_({ ok: true, geradoEm: new Date().toISOString(), vendas: vendas });
  } finally {
    lock.releaseLock();
  }
}

// Custos calculados em 30-31/10/2026 (fatiamento no Bambu Studio + fórmula da Estimativa de custo do FilamentFlow),
// SEM mão de obra: material + falhas + energia + desgaste + embalagem.
// Usados só pelo menu "Importar custos dos personagens"; depois disso a fonte é a aba Produtos.
var CUSTOS_INICIAIS = {
  "Ash Ketchum (Pokémon)": [5.92, null],
  "Bayleef (Pokémon)": [7.92, null],
  "Blastoise (Pokémon)": [15.71, null],
  "Brock (Pokémon)": [5.63, null],
  "Browt (Pokémon)": [12.87, null],
  "Bulbasaur (Pokémon)": [9.72, null],
  "Charizard (Pokémon)": [14.43, null],
  "Charmander (Pokémon)": [8.55, null],
  "Charmeleon (Pokémon)": [8.65, null],
  "Chikorita (Pokémon)": [9.38, null],
  "Croconaw (Pokémon)": [8.49, null],
  "Cubone (Pokémon)": [7.94, null],
  "Cyndaquil (Pokémon)": [8.32, null],
  "Dragonite (Pokémon)": [10.15, null],
  "Eevee (Pokémon)": [10.2, null],
  "Feraligatr (Pokémon)": [9.35, null],
  "Gengar (Pokémon)": [7.29, null],
  "Ivysaur (Pokémon)": [14.83, null],
  "Meganium (Pokémon)": [7.69, null],
  "Mew (Pokémon)": [5.85, null],
  "Misty (Pokémon)": [5.91, null],
  "Pikachu (Pokémon)": [6.79, null],
  "Psyduck (Pokémon)": [11.21, null],
  "Quilava (Pokémon)": [6.74, null],
  "Snorlax (Pokémon)": [8.04, null],
  "Squirtle (Pokémon)": [9.55, null],
  "Totodile (Pokémon)": [9.19, null],
  "Typhlosion (Pokémon)": [9.01, null],
  "Venusaur (Pokémon)": [22.76, null],
  "Wartortle (Pokémon)": [10.74, null],
  "Bowser (Super Mario)": [20.15, null],
  "Donkey Kong (Super Mario)": [7.49, null],
  "Luigi (Super Mario)": [7.92, 19.24],
  "Mario (Super Mario)": [7.48, 17.72],
  "Super Cogumelo (Super Mario)": [2.51, null],
  "Princesa Peach (Super Mario)": [14.45, null],
  "Toad (Super Mario)": [4.98, null],
  "Yoshi (Super Mario)": [9.37, null],
  "Amy Rose (Sonic)": [3.09, null],
  "Dr. Eggman (Sonic)": [5.66, null],
  "Knuckles (Sonic)": [10.46, null],
  "Shadow (Sonic)": [9.81, null],
  "Sonic (Sonic)": [8.01, null],
  "Super Sonic (Sonic)": [6.38, null],
  "Tails (Sonic)": [5.97, null],
  "Albus Dumbledore (Harry Potter)": [9.78, null],
  "Dobby (Harry Potter)": [5.22, null],
  "Draco Malfoy (Harry Potter)": [6.97, null],
  "Hagrid (Harry Potter)": [9.7, null],
  "Harry Potter (Harry Potter)": [7.18, null],
  "Hermione Granger (Harry Potter)": [7.9, null],
  "Ron Weasley (Harry Potter)": [6.56, null],
  "Sirius Black (Harry Potter)": [7.6, null],
  "Severus Snape (Harry Potter)": [12.66, null],
  "Voldemort (Harry Potter)": [7.88, null],
  "Astro Boy (Super-heróis)": [3.84, null],
  "Batman (Super-heróis)": [6.32, null],
  "Deadpool (Super-heróis)": [8.93, null],
  "Hulk (Super-heróis)": [10.86, null],
  "Joker (Super-heróis)": [7.27, null],
  "Mega Man (Super-heróis)": [5.8, null],
  "Spider-Man (Super-heróis)": [5.15, 12.5],
  "Superman (Super-heróis)": [7.54, null],
  "Venom (Super-heróis)": [8.69, null],
  "Wolverine (Super-heróis)": [5.85, null],
  "Cell (Dragon Ball)": [5.25, null],
  "Majin Buu (Dragon Ball)": [8.55, null],
  "Freeza (Dragon Ball)": [5.14, null],
  "Goku (Dragon Ball)": [9.74, null],
  "Golden Freeza (Dragon Ball)": [5.69, null],
  "Kid Buu (Dragon Ball)": [2.23, null],
  "Piccolo (Dragon Ball)": [4.46, null],
  "Vegeta criança (Dragon Ball)": [4.51, null],
  "Brook (One Piece)": [8.36, null],
  "Chopper (One Piece)": [6.52, null],
  "Franky (One Piece)": [10.13, null],
  "Jinbe (One Piece)": [10.29, null],
  "Luffy (sentado) (One Piece)": [7.75, null],
  "Nami (One Piece)": [6.61, null],
  "Nico Robin (One Piece)": [5.85, null],
  "Luffy (em pé) (One Piece)": [6.72, null],
  "Sanji (One Piece)": [7.09, null],
  "Sanji (apaixonado) (One Piece)": [7.12, null],
  "Usopp (One Piece)": [6.88, null],
  "Roronoa Zoro (One Piece)": [6.58, null],
  "Zoro (espada e cicatriz) (One Piece)": [7.73, null],
  "Itachi Uchiha (Naruto)": [8.75, null],
  "Jiraiya (Naruto)": [10.42, null],
  "Kakashi Hatake (Naruto)": [8.44, null],
  "Naruto Uzumaki (Naruto)": [10.08, null],
  "Sakura Haruno (Naruto)": [6.81, null],
  "Sasuke Uchiha (Naruto)": [8.38, null],
  "Akaza (Demon Slayer)": [6.25, null],
  "Inosuke (Demon Slayer)": [5.71, null],
  "Nezuko (Demon Slayer)": [9.49, null],
  "Rengoku (Demon Slayer)": [8.79, null],
  "Shinobu (Demon Slayer)": [6.71, null],
  "Tanjiro (Demon Slayer)": [7.2, null],
  "Zenitsu (Demon Slayer)": [8.6, null],
  "Angel (Lilo & Stitch)": [4.91, null],
  "Angel (sentada) (Lilo & Stitch)": [4.27, null],
  "Leroy (Lilo & Stitch)": [6.29, null],
  "Lilo (Lilo & Stitch)": [8.07, null],
  "Stitch (Lilo & Stitch)": [5.11, null],
  "Stitch (sentado) (Lilo & Stitch)": [4.15, null],
  "Grogu (Baby Yoda) (Star Wars)": [9.02, null],
  "The Mandalorian (Star Wars)": [7.62, null],
  "Stormtrooper (1ª Ordem) (Star Wars)": [8.07, null],
  "Kratos (God of War)": [8.97, null],
  "Eren (Titã) (Attack on Titan)": [7.58, null],
  "Eren Yeager (Attack on Titan)": [6.61, null],
  "Levi Ackerman (Attack on Titan)": [7.04, null],
  "Demogorgon (Stranger Things)": [6.86, null],
  "Mira (KPop Demon Hunters)": [6.95, null],
  "Rumi (KPop Demon Hunters)": [6.79, null],
  "Zoey (KPop Demon Hunters)": [5.68, null],
  "Baymax (Big Hero 6)": [3.32, null],
  "Boo (Monstros S.A.)": [3.18, null],
  "Mike Wazowski (Monstros S.A.)": [4.63, null],
  "Sulley (Monstros S.A.)": [7.46, null],
  "Minion (Minions)": [8.88, null],
  "Minion Chef (Minions)": [11.9, null],
  "Link (The Legend of Zelda)": [8.22, null],
  "Princesa Zelda (The Legend of Zelda)": [7.97, null],
  "Mickey (Mickey & Minnie)": [5.61, null],
  "Minnie (Mickey & Minnie)": [5.21, null],
  "Buzz Lightyear (Toy Story)": [8.82, null],
  "Woody (Toy Story)": [4.82, null],
  "Judy Hopps (Zootopia)": [7.47, null],
  "Nick Wilde (Zootopia)": [8.87, null],
  "Pooh (Ursinho Pooh)": [12.39, null],
  "Tigrão (Ursinho Pooh)": [8.52, null],
  "Fúria da Luz (Como Treinar o Seu Dragão)": [3.03, null],
  "Banguela (Como Treinar o Seu Dragão)": [3.42, null],
  "Grinch (O Grinch)": [7.3, null],
  "Max (O Grinch)": [5.65, null],
  "Hello Kitty (Hello Kitty)": [6.43, null],
  "Kuromi (Hello Kitty)": [7.57, null],
  "Bingo (Bluey)": [5.78, null],
  "Bluey (Bluey)": [6.51, null],
  "Snoopy (Snoopy)": [5.59, null],
  "Smurf (Smurfs)": [5.13, null],
  "Chase (Patrulha Canina)": [9.6, null],
  // Originais do Whale (Site Popzu): [Pequeno = 50%, Grande = 100%]
  "Baby T-Rex": [2.78, 10.77],
  "Baby Triceratops": [3.18, 13.49],
  "Baby Spinosaurus": [3.56, 14.27],
  "Baby Brachiosaurus": [3.15, 12.48],
  "Baby Ankylosaurus": [3.17, 12.84],
  "Baby Carnotaurus": [3.21, 12.83],
  "Cute Corgi": [2.74, 11.32],
  "Cute Husky": [2.71, 15.25],
  "Cute Bulldog": [2.73, 11.57],
  "Dachshund Dog": [1.86, 6.71],
  "Yorkshire Dog": [3.05, 12.69],
  "Rottweiler Dog": [4.21, 18.36],
  "Fat Capybara": [2.66, 10.7],
  "Derp Capybara": [2.66, 11.05],
  "Hamster": [1.44, 4.95],
  "Hamster Flexi": [1.48, 4.99],
  "Derp Monkey": [2.73, 11.01],
  "Snowy Owl": [2.87, 12.89],
  "Mochi Octopus": [4.46, 18.71],
  "Derp Octopus": [4.72, 20.16],
  "Mochi Seal": [2.04, 9.02],
  "Derp Seal": [2.4, 9.65],
  "Cute Dolphin": [2.2, 8.9],
  "Clownfish": [2.98, 12.03],
  "Blue Tang Fish": [4.49, 19.99],
  "Baby Mermaid": [2.81, 11.68],
  "Pumpkin Killer": [3.77, 21.25],
  "Baby Vampire": [4.07, 17.55],
  "Baby Reaper": [3.54, 14.63],
  "Pumpboo": [4.01, 17.41],
  "Pumpkinaut": [3.26, 12.71],
  "Derp Pumpkin": [3.39, 14.7],
  "The Mummy": [2.12, 9.68],
  "Derp Werewolf": [2.45, 9.68],
  "Baby Werewolf": [4.05, 17.3],
  "Alien": [1.31, 5.45],
  "Alien Baby": [2.1, 8.33],
  "Alien Women": [1.51, 5.24],
  "Astronaut Boy": [2.35, 8.86],
  "Super Nova": [2.39, 9.41],
  "Luna": [2.32, 9.0],
  "Derp Dragon": [2.73, 10.87],
  "The Elemental Dragon": [null, 5.25]
};
