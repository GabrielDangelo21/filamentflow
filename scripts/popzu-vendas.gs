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
            cliente: 10, pagamento: 11, entrega: 12, obs: 13, id: 14 };
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
    var col = sh.getRange(2, COL.produto, Math.max(sh.getLastRow(), 2), 1).getValues();
    var row = 2;
    while (row - 2 < col.length && col[row - 2][0] !== '') row++;
    sh.getRange(row, 1, linhas.length, 7).setValues(linhas);
    // Cliente, pagamento, entrega, observações (+ aviso quando ficou sem preço) e ID
    sh.getRange(row, COL.cliente, linhas.length, 5).setValues(linhas.map(function (l) {
      var o = l[6] === '' ? (obs ? obs + ' · ' : '') + AVISO_SEM_PRECO : obs;
      return [g(Q.cliente), g(Q.pagamento), g(Q.entrega), o, Utilities.getUuid()];
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

// Cabeçalho "ID" na coluna N da aba Vendas
function garantirColunaId_(sh) {
  if (sh.getMaxColumns() < COL.id) sh.insertColumnsAfter(sh.getMaxColumns(), COL.id - sh.getMaxColumns());
  var h = sh.getRange(1, COL.id);
  if (h.getValue() !== 'ID') h.setValue('ID').setFontColor('#999999');
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
    var last = sh.getLastRow();
    var tz = ss.getSpreadsheetTimeZone();
    var v = last < 2 ? [] : sh.getRange(2, 1, last - 1, COL.id).getValues();
    var vendas = v.filter(function (r) { return r[COL.produto - 1] !== '' && r[COL.id - 1] !== ''; }).map(function (r) {
      var d = r[COL.data - 1];
      var qtd = num_(r[COL.qtd - 1]) || 1;
      var preco = num_(r[COL.preco - 1]);
      var total = num_(r[COL.total - 1]);
      if (total === '' && preco !== '') total = qtd * preco;
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
        obs:        String(r[COL.obs - 1] || '')
      };
    });
    return json_({ ok: true, geradoEm: new Date().toISOString(), vendas: vendas });
  } finally {
    lock.releaseLock();
  }
}
