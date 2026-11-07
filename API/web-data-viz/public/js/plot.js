'use strict';

/* DEMO = true carrega plots de exemplo quando não há nada salvo.
   Os dados passam pela camada API (mais abaixo): hoje usa localStorage;
   para usar o banco, troque só o corpo das funções de API por fetch(). */
var DEMO = true;
var KEY = 'plot.v1';
var app = document.getElementById('app');

var CORES = ['#8b5cf6', '#3b82f6', '#e8a817', '#22a55b', '#e0443e'];
var CLS = ['', 'b', 'g', 'gr', 'r'];

var STORIES = [];
var plots = [];
var W = null;     // estado do assistente (wizard)
var SEL = 0;      // capítulo selecionado na ficha
var ED = null;    // cena em edição
var DEL = null;   // item que está sendo excluído

var STRUCT_KEYS = ['livre', 'tres', 'quatro', 'cinco'];
var STRUCTS = {
  livre: {
    label: 'Estrutura livre',
    sub: 'Sem atos definidos',
    acts: []
  },
  tres: {
    label: 'Estrutura de 3 atos',
    sub: 'Linear tradicional',
    d: 'M10 58 C70 56 90 10 130 22 S170 12 190 8',
    acts: [
      ['Ato 1 · Introdução', 25, 'Mundo atual, incidente inicial e aceitação'],
      ['Ato 2 · Confronto', 50, 'Obstáculos, ponto de virada e desespero'],
      ['Ato 3 · Resolução', 25, 'Preparação, clímax e novo encerramento']
    ]
  },
  quatro: {
    label: 'Kishōtenketsu (4 atos)',
    sub: 'Sem conflito obrigatório',
    d: 'M10 55 H110 V25 H190',
    acts: [
      ['Ki · Introdução', 25, 'Rotina, personagens e situação inicial'],
      ['Shō · Desenvolvimento', 25, 'Aprofundamento sem grandes mudanças'],
      ['Ten · A virada', 25, 'Elemento surpresa e nova perspectiva'],
      ['Ketsu · Conclusão', 25, 'Conexão dos elementos e reinterpretação']
    ]
  },
  cinco: {
    label: 'Pirâmide dramática (5 atos)',
    sub: 'Tragédia',
    d: 'M10 60 L100 10 L190 60',
    acts: [
      ['Ato 1 · Introdução', 20, 'Cenário, personagens e gatilho inicial'],
      ['Ato 2 · Ação ascendente', 20, 'Tensão crescente e obstáculos'],
      ['Ato 3 · Clímax', 20, 'Ponto máximo e virada sem volta'],
      ['Ato 4 · Ação decrescente', 20, 'Consequências e desdobramentos'],
      ['Ato 5 · Resolução', 20, 'Desfecho final']
    ]
  }
};

var ICON_DEL = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" ' +
  'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
  'stroke-linejoin="round">' +
  '<path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 11v5M14 11v5"/></svg>';


/* ---------- funções pequenas de apoio ---------- */

// troca caracteres especiais para o texto não "quebrar" o HTML
function esc(texto) {
  if (texto === null || texto === undefined) {
    texto = '';
  }
  texto = String(texto);
  texto = texto.replaceAll('&', '&amp;');
  texto = texto.replaceAll('<', '&lt;');
  texto = texto.replaceAll('>', '&gt;');
  texto = texto.replaceAll('"', '&quot;');
  return texto;
}

function fmt(n) {
  return Number(n).toLocaleString('pt-BR');
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function clone(objeto) {
  return JSON.parse(JSON.stringify(objeto));
}

function uuid() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// devolve 's' quando a quantidade é maior que 1
function plural(n) {
  if (n > 1) {
    return 's';
  }
  return '';
}

// flex não pode ser 0, senão o trecho some da barra
function flexDe(n) {
  if (n === 0) {
    return 0.01;
  }
  return n;
}

// procura um item pelo id; devolve a posição (ou -1)
function indexById(lista, id) {
  for (var i = 0; i < lista.length; i++) {
    if (lista[i].id === id) {
      return i;
    }
  }
  return -1;
}

// procura um item pelo id; devolve o item (ou null)
function findById(lista, id) {
  var i = indexById(lista, id);
  if (i < 0) {
    return null;
  }
  return lista[i];
}

function nomeExiste(nome) {
  for (var i = 0; i < plots.length; i++) {
    if (plots[i].name === nome) {
      return true;
    }
  }
  return false;
}

// "Meu plot (3)" vira "Meu plot"
function nomeBase(nome) {
  var pos = nome.lastIndexOf(' (');
  if (pos < 0 || nome.charAt(nome.length - 1) !== ')') {
    return nome;
  }
  var miolo = nome.substring(pos + 2, nome.length - 1);
  if (miolo === '') {
    return nome;
  }
  for (var i = 0; i < miolo.length; i++) {
    var letra = miolo.charAt(i);
    if (letra < '0' || letra > '9') {
      return nome;
    }
  }
  return nome.substring(0, pos);
}

function newScene(capitulo) {
  return {
    id: uuid(),
    title: 'Cena ' + (capitulo.scenes.length + 1),
    desc: '',
    written: false
  };
}

function newChapter(i) {
  return {
    id: uuid(),
    title: 'Capítulo ' + (i + 1),
    twist: false,
    written: false,
    scenes: []
  };
}

function makeChapters(total) {
  var lista = [];
  for (var i = 0; i < total; i++) {
    lista.push(newChapter(i));
  }
  return lista;
}


/* ---------- dados ---------- */

function demo() {
  // plot 1: 50 capítulos, 8 escritos, com cenas
  var a = makeChapters(50);
  for (var i = 0; i < 8; i++) {
    a[i].written = true;
    for (var k = 0; k < 4; k++) {
      a[i].scenes.push({
        id: uuid(),
        title: 'Cena ' + (k + 1),
        desc: '',
        written: (i < 7 || k < 3)
      });
    }
  }
  a[7].title = 'A Cripta Vermelha';
  a[7].twist = true;
  a[19].twist = true;

  // plot 3: 18 capítulos, todos escritos
  var c = makeChapters(18);
  for (var j = 0; j < c.length; j++) {
    c[j].written = true;
  }
  c[8].twist = true;

  return [
    {
      id: 'd1', name: 'Dentro da Muralha', storyId: 's1', measure: 'cap',
      total: 50, wpc: 3000, draft: '', struct: 'tres',
      pcts: [25, 50, 25], chapters: a
    },
    {
      id: 'd2', name: 'Cartas para Ísis', storyId: '', measure: 'cap',
      total: 25, wpc: 3000, draft: '', struct: 'livre',
      pcts: [100], chapters: makeChapters(25)
    },
    {
      id: 'd3', name: 'A Casa do Vento', storyId: 's2', measure: 'cap',
      total: 18, wpc: 3000, draft: '', struct: 'cinco',
      pcts: [20, 20, 20, 20, 20], chapters: c
    }
  ];
}

/* ===== CAMADA DE DADOS (trocar por fetch() quando o banco estiver pronto) ===== */

function readStore() {
  try {
    return JSON.parse(localStorage.getItem(KEY));
  } catch (erro) {
    return null;
  }
}

function allPlots() {
  var salvos = readStore();
  if (salvos) {
    return salvos;
  }
  if (DEMO) {
    return demo();
  }
  return [];
}

var API = {
  async list() {
    /* GET /api/plots */
    return allPlots();
  },

  async stories() {
    /* GET /api/stories */
    return [
      { id: 's1', name: 'Dentro da Muralha', done: false },
      { id: 's2', name: 'A Casa do Vento', done: true },
      { id: 's3', name: 'Sírius', done: false }
    ];
  },

  async save(p) {
    /* POST /api/plots (novo) ou PUT /api/plots/:id */
    var lista = allPlots();
    var i = indexById(lista, p.id);
    if (i < 0) {
      lista.push(p);
    } else {
      lista[i] = p;
    }
    localStorage.setItem(KEY, JSON.stringify(lista));
  },

  async remove(id) {
    /* DELETE /api/plots/:id */
    var lista = allPlots();
    var restantes = [];
    for (var i = 0; i < lista.length; i++) {
      if (lista[i].id !== id) {
        restantes.push(lista[i]);
      }
    }
    localStorage.setItem(KEY, JSON.stringify(restantes));
  }
};

function fail() {
  alert('Não foi possível salvar no servidor. Tente novamente.');
}

function saveP(p) {
  API.save(p).catch(fail);
}

function delP(id) {
  API.remove(id).catch(fail);
}

function blank() {
  return {
    id: uuid(), name: '', storyId: '', measure: 'cap', total: 50,
    wpc: 3000, draft: '', struct: null, pcts: [100], chapters: []
  };
}


/* ---------- cálculos ---------- */

function S(p) {
  return STRUCTS[p.struct || 'livre'];
}

// quantidade de capítulos do plot
function count(p) {
  if (p.measure === 'pal') {
    return Math.max(1, Math.round(p.total / (p.wpc || 1)));
  }
  return p.total;
}

// quantidade de palavras do plot
function words(p) {
  if (p.measure === 'pal') {
    return p.total;
  }
  return p.total * p.wpc;
}

// divide n capítulos entre os atos, de acordo com as porcentagens
function split(n, pcts) {
  var soma = 0;
  for (var i = 0; i < pcts.length; i++) {
    soma += pcts[i];
  }
  if (soma === 0) {
    soma = 1;
  }

  var base = [];
  var sobras = [];
  var usados = 0;
  for (var j = 0; j < pcts.length; j++) {
    var bruto = n * pcts[j] / soma;
    var inteiro = Math.floor(bruto + 1e-9);
    base.push(inteiro);
    sobras.push(bruto - inteiro);
    usados += inteiro;
  }

  // os capítulos que faltam vão para quem tem a maior sobra
  var faltam = n - usados;
  var rodada = 0;
  while (rodada < faltam && rodada < pcts.length) {
    var melhor = 0;
    for (var m = 1; m < sobras.length; m++) {
      if (sobras[m] > sobras[melhor]) {
        melhor = m;
      }
    }
    base[melhor]++;
    sobras[melhor] = -1;
    rodada++;
  }
  return base;
}

// lista de atos com o capítulo inicial e a quantidade de cada um
function ranges(p, n) {
  if (n === undefined) {
    n = p.chapters.length;
  }
  var atos = S(p).acts;
  if (atos.length === 0) {
    atos = [['Capítulos', 100, '']];
  }
  var contagem = split(n, p.pcts);
  var inicio = 0;
  var lista = [];
  for (var i = 0; i < atos.length; i++) {
    lista.push({
      i: i,
      name: atos[i][0],
      desc: atos[i][2],
      from: inicio,
      n: contagem[i],
      col: CORES[i]
    });
    inicio += contagem[i];
  }
  return lista;
}

// ajusta a quantidade de capítulos do plot ao total escolhido
function sync(p) {
  var n = count(p);
  while (p.chapters.length < n) {
    p.chapters.push(newChapter(p.chapters.length));
  }
  p.chapters.length = n;
}

function stats(p) {
  var r = { n: p.chapters.length, w: 0, sp: 0, sw: 0, tw: [] };
  for (var i = 0; i < p.chapters.length; i++) {
    var c = p.chapters[i];
    if (c.written) {
      r.w++;
    }
    if (c.twist) {
      r.tw.push(i);
    }
    for (var k = 0; k < c.scenes.length; k++) {
      r.sp++;
      if (c.scenes[k].written) {
        r.sw++;
      }
    }
  }
  return r;
}

// quantos capítulos escritos existem de "from" até "from + n"
function countWritten(p, from, n) {
  var total = 0;
  for (var i = from; i < from + n && i < p.chapters.length; i++) {
    if (p.chapters[i].written) {
      total++;
    }
  }
  return total;
}

function planStatus(p) {
  var s = findById(STORIES, p.storyId);
  var t = stats(p);
  if (!s) {
    return { t: 'Planejamento', c: 'b-rasc' };
  }
  if (s.done && t.n && t.w === t.n) {
    return { t: 'Concluído', c: 'b-fin' };
  }
  return { t: 'Em produção', c: 'b-prod' };
}

function setStruct(k) {
  var p = W.plot;
  var atos = STRUCTS[k].acts;
  p.struct = k;
  if (atos.length > 0) {
    p.pcts = [];
    for (var i = 0; i < atos.length; i++) {
      p.pcts.push(atos[i][1]);
    }
  } else {
    p.pcts = [100];
  }
  W.open = 0;
}

/* Alterar o ato i só mexe nos atos seguintes.
   Retorna um aviso (texto) se a alteração não for possível. */
function setCount(i, v) {
  var p = W.plot;
  var n = count(p);
  var c = split(n, p.pcts);
  var k = c.length;

  var antes = 0;
  for (var j = 0; j < i; j++) {
    antes += c[j];
  }
  var resta = n - antes;

  if (v > resta) {
    var s = 's';
    if (resta === 1) {
      s = '';
    }
    return 'Restam apenas ' + resta + ' capítulo' + s +
      ' para este ato (os atos anteriores já usam ' + antes + '). ' +
      'Adicione mais capítulos no total, no passo 1, para fazer essa alteração.';
  }

  if (i === k - 1) {
    if (v === resta) {
      return '';
    }
    return 'O último ato recebe os capítulos que sobram (' + resta + '). ' +
      'Para ter menos capítulos nele, aumente os atos anteriores.';
  }

  var depois = [];
  var somaDepois = 0;
  for (var a = i + 1; a < k; a++) {
    depois.push(c[a]);
    somaDepois += c[a];
  }
  if (somaDepois === 0) {
    depois = [];
    for (var b = i + 1; b < k; b++) {
      depois.push(1);
    }
  }

  var novo = [];
  for (var x = 0; x < i; x++) {
    novo.push(c[x]);
  }
  novo.push(v);
  var divisao = split(resta - v, depois);
  for (var y = 0; y < divisao.length; y++) {
    novo.push(divisao[y]);
  }

  p.pcts = [];
  for (var z = 0; z < novo.length; z++) {
    p.pcts.push(novo[z] / n * 100);
  }
  return '';
}

function warn(mensagem) {
  var e = document.getElementById('warn');
  if (e) {
    e.textContent = mensagem;
    e.hidden = (mensagem === '');
  }
}

function lbl(p, i, c) {
  var palavras = Math.round(c[i] * words(p) / count(p));
  return Math.round(p.pcts[i]) + '% · ~' + fmt(palavras) + ' palavras';
}

function refreshDist(force) {
  var p = W.plot;
  var c = split(count(p), p.pcts);
  for (var i = 0; i < p.pcts.length; i++) {
    var r = document.querySelector('[data-i=pct][data-n="' + i + '"]');
    var q = document.querySelector('[data-i=cnt][data-n="' + i + '"]');
    r.value = p.pcts[i];
    r.style.setProperty('--v', p.pcts[i] + '%');
    if (force || q !== document.activeElement) {
      q.value = c[i];
      q.classList.remove('bad');
    }
    document.getElementById('pl' + i).textContent = lbl(p, i, c);
  }
  document.getElementById('pv').innerHTML = pv();
}


/* ---------- componentes ---------- */

var logo = '<div class="logo">Plotter<sup>✦</sup></div>';

function bar(p) {
  var n = p.chapters.length;
  var tw = stats(p).tw;
  var faixas = ranges(p);

  var html = '<div class="bar">';
  for (var i = 0; i < faixas.length; i++) {
    var r = faixas[i];
    var escritos = countWritten(p, r.from, r.n);
    var pc = 0;
    if (r.n > 0) {
      pc = escritos / r.n * 100;
    }
    html += '<span style="flex:' + flexDe(r.n) + ';';
    html += 'background:linear-gradient(90deg,' + r.col + ' ' + pc + '%,';
    html += 'var(--track) ' + pc + '%)"></span>';
  }
  for (var k = 0; k < tw.length; k++) {
    html += '<i style="left:' + ((tw[k] + 0.5) / n * 100) + '%"></i>';
  }
  html += '</div>';
  return html;
}

function twTxt(n) {
  if (n > 0) {
    return '<span class="gd">◆</span> ' + n + ' plot twist' + plural(n);
  }
  return '';
}

function storyLine(p, pre) {
  if (pre === undefined) {
    pre = '';
  }
  var s = findById(STORIES, p.storyId);
  var classe = 'none';
  var icone = 'off';
  var texto = 'Sem história vinculada';
  if (s) {
    classe = '';
    icone = 'on';
    texto = pre + esc(s.name);
  }
  return '<div class="story ' + classe + '"><span class="ico ' + icone +
    '"></span>' + texto + '</div>';
}

function card(p) {
  var s = stats(p);
  var st = planStatus(p);
  var pc = 0;
  if (s.n > 0) {
    pc = Math.round(s.w / s.n * 100);
  }
  var cenas = '';
  if (s.sp > 0) {
    cenas = s.sw + ' / ' + s.sp + ' cenas escritas';
  }

  var html = '<article class="pcard" tabindex="0" data-a="open" data-id="' + p.id + '">';
  html += '<div class="top"><h3>' + esc(p.name) + '</h3><div class="tr">';
  html += '<span class="badge ' + st.c + '">' + st.t + '</span>';
  html += '<button class="del" data-a="askdel" data-kind="plot" data-id="' + p.id + '" ';
  html += 'aria-label="Excluir ' + esc(p.name) + '" title="Excluir plot">';
  html += ICON_DEL + '</button></div></div>';
  html += storyLine(p);
  html += '<div class="meta">' + S(p).label + ' · ' + s.n + ' capítulos</div>';
  html += bar(p);
  html += '<div class="row"><b>' + pc + '% escrito</b>';
  html += '<span>' + s.w + ' / ' + s.n + ' capítulos</span></div>';
  html += '<div class="row"><span>' + cenas + '</span>';
  html += '<span>' + twTxt(s.tw.length) + '</span></div>';
  html += '</article>';
  return html;
}


/* ---------- Tela 1 · lista de plots ---------- */

function list() {
  var subtitulo = 'Todos os plots que você criou e em quais histórias cada um é usado.';
  var textoBotao = 'Criar novo plot';
  if (plots.length > 0) {
    subtitulo = 'Estrutura, progresso e status de cada plot.';
    textoBotao = 'Novo plot';
  }

  var html = logo;
  html += '<div class="head"><div><h1>Plots</h1>';
  html += '<p class="sub">' + subtitulo + '</p></div>';
  html += '<button class="btn btn-p" data-a="new">+ ' + textoBotao + '</button></div>';
  html += '<div class="grid">';
  for (var i = 0; i < plots.length; i++) {
    html += card(plots[i]);
  }
  html += '<button class="new" data-a="new"><div><span>+</span>';
  html += textoBotao + '</div></button></div>';
  return html;
}


/* ---------- Wizard ---------- */

// prévia da estrutura (painel lateral)
function pv() {
  var p = W.plot;
  var n = count(p);

  var tw = 0;
  for (var i = 0; i < p.chapters.length; i++) {
    if (p.chapters[i].twist) {
      tw++;
    }
  }

  var b = '';
  if (!p.struct) {
    b = '<div class="empty-box"><b>Sem estrutura definida</b>Escolha uma no passo 2</div>';
  } else if (S(p).acts.length === 0) {
    b = '<div class="empty-box"><b>Estrutura livre</b>Linha contínua, sem divisão em atos</div>';
  } else {
    var rs = ranges(p, n);
    b = '<div class="tag">' + S(p).label + '</div>';
    b += '<div class="bar" style="margin:0">';
    for (var j = 0; j < rs.length; j++) {
      b += '<span style="flex:' + flexDe(rs[j].n) + ';background:' + rs[j].col + '"></span>';
    }
    b += '</div>';
    for (var k = 0; k < rs.length; k++) {
      var r = rs[k];
      b += '<div class="act ' + CLS[r.i] + '"><b>' + r.name + '</b>';
      b += '<small>' + r.n + ' capítulos · ' + p.pcts[r.i] + '% — ' + r.desc;
      b += '</small></div>';
    }
  }

  var rodape = '';
  if (tw > 0) {
    rodape = '◆ ' + tw + ' plot twist' + plural(tw) + ' marcado' + plural(tw) + '<br>';
  }

  var html = '<h4>Prévia da estrutura</h4>' + b;
  html += '<div class="foot">' + rodape + n + ' capítulos · ~';
  html += fmt(words(p)) + ' palavras</div>';
  return html;
}

function calc(p) {
  if (p.measure === 'cap') {
    return '≈ ' + fmt(words(p)) + ' palavras no total';
  }
  return '≈ ' + count(p) + ' capítulos';
}

function steps() {
  var nomes = ['Básico', 'Estrutura', 'Detalhar (opcional)', 'Revisar'];
  var html = '';
  for (var i = 0; i < nomes.length; i++) {
    var n = i + 1;
    var classe = '';
    var atributos = '';
    var icone = n;
    if (n < W.step) {
      classe = 'done';
      atributos = ' data-a="step" data-n="' + n + '"';
      icone = '✓';
    } else if (n === W.step) {
      classe = 'now';
    }
    html += '<div class="step ' + classe + '"' + atributos + '>';
    html += '<i>' + icone + '</i><span>' + nomes[i] + '</span></div>';
  }
  return html;
}

// passo 1 · básico
function body1() {
  var p = W.plot;
  var cap = (p.measure === 'cap');

  var classeNome = '';
  var msgErro = '';
  if (W.err) {
    classeNome = 'bad';
    msgErro = '<span class="err">Dê um nome ao plot para continuar.</span>';
  }

  var onCap = '';
  var onPal = 'on';
  var unidade = 'palavras';
  if (cap) {
    onCap = 'on';
    onPal = '';
    unidade = 'capítulos';
  }

  var opcoes = '<option value="">Nenhuma história vinculada</option>';
  for (var i = 0; i < STORIES.length; i++) {
    var selecionada = '';
    if (STORIES[i].id === p.storyId) {
      selecionada = 'selected';
    }
    opcoes += '<option value="' + STORIES[i].id + '" ' + selecionada + '>';
    opcoes += esc(STORIES[i].name) + '</option>';
  }

  var html = '';
  html += '<label>Nome do plot *';
  html += '<input class="in ' + classeNome + '" data-i="name" value="' + esc(p.name) + '" ';
  html += 'placeholder="Ex.: Plot de Dentro da Muralha">' + msgErro + '</label>';

  html += '<div class="f2">';
  html += '<label>História vinculada (opcional)';
  html += '<select class="in" data-i="story">' + opcoes + '</select></label>';
  html += '<div><label style="margin-bottom:6px">Como medir o tamanho?</label>';
  html += '<div class="seg">';
  html += '<button type="button" class="' + onCap + '" data-a="measure" data-m="cap">Capítulos</button>';
  html += '<button type="button" class="' + onPal + '" data-a="measure" data-m="pal">Palavras</button>';
  html += '<input class="in" type="number" min="1" data-i="total" ';
  html += 'value="' + p.total + '" aria-label="Tamanho">';
  html += '<span class="hint">' + unidade + '</span></div></div></div>';

  html += '<div class="seg"><label>Palavras por capítulo';
  html += '<input class="in" type="number" min="1" data-i="wpc" value="' + p.wpc + '" ';
  html += 'style="width:150px"></label>';
  html += '<span class="total" id="calc" style="margin-top:20px">' + calc(p) + '</span></div>';

  html += '<label>Rascunho do plot';
  html += '<textarea class="in" data-i="draft" placeholder="Escreva livremente a ideia ';
  html += 'central, os conflitos e os possíveis desfechos…">' + esc(p.draft) + '</textarea>';
  html += '<span class="hint">Você detalha capítulos e cenas nos próximos passos.</span></label>';
  return html;
}

// passo 2 · estrutura
function body2() {
  var p = W.plot;
  var n = count(p);
  var c = split(n, p.pcts);
  var atos = S(p).acts;

  // cartões de escolha da estrutura
  var opts = '';
  for (var i = 0; i < STRUCT_KEYS.length; i++) {
    var k = STRUCT_KEYS[i];
    var s = STRUCTS[k];

    var curva = '';
    if (k === 'livre') {
      curva = '<line x1="10" y1="35" x2="190" y2="35" stroke="#c9c4d8" stroke-dasharray="4 3"/>';
    } else {
      curva = '<path d="' + s.d + '" fill="none" stroke="#8b5cf6" stroke-width="2"/>';
    }

    var lista = '';
    if (s.acts.length > 0) {
      lista = '<ul>';
      for (var j = 0; j < s.acts.length; j++) {
        lista += '<li style="--c:' + CORES[j] + '">' + s.acts[j][0] + '</li>';
      }
      lista += '</ul>';
    } else {
      lista = '<small>Escreva do seu jeito, sem divisão</small>';
    }

    var sel = '';
    if (p.struct === k) {
      sel = 'sel';
    }
    opts += '<div class="opt ' + sel + '" role="button" tabindex="0" ';
    opts += 'data-a="struct" data-k="' + k + '">';
    opts += '<b>' + s.label + '</b><small>' + s.sub + '</small>';
    opts += '<svg viewBox="0 0 200 70">' + curva + '</svg>' + lista + '</div>';
  }

  // barras de distribuição dos capítulos por ato
  var sl = '';
  if (atos.length > 0) {
    sl += '<div class="dist"><div class="row2" style="grid-template-columns:1fr auto"><div>';
    sl += '<h2>Distribuição dos capítulos</h2>';
    sl += '<p class="sub">Arraste a barra ou digite quantos capítulos cada ato terá. ';
    sl += 'Ao alterar um ato, só os atos seguintes se ajustam.</p></div>';
    sl += '<span class="hint">' + n + ' capítulos no total · ~' + fmt(words(p));
    sl += ' palavras</span></div>';
    sl += '<p class="warn" id="warn" role="alert" hidden></p>';
    for (var a = 0; a < atos.length; a++) {
      sl += '<div class="row2"><b>' + atos[a][0] + '</b>';
      sl += '<input class="rng" type="range" min="0" max="100" data-i="pct" ';
      sl += 'data-n="' + a + '" value="' + p.pcts[a] + '" ';
      sl += 'style="--c:' + CORES[a] + ';--v:' + p.pcts[a] + '%" ';
      sl += 'aria-label="' + atos[a][0] + '">';
      sl += '<div class="cnt"><input class="in" type="number" min="0" max="' + n + '" ';
      sl += 'data-i="cnt" data-n="' + a + '" value="' + c[a] + '" ';
      sl += 'aria-label="Capítulos de ' + atos[a][0] + '">';
      sl += '<span class="hint" id="pl' + a + '">' + lbl(p, a, c) + '</span></div></div>';
    }
    sl += '</div>';
  }

  var html = '<div><h2>Como você quer estruturar esta história?</h2>';
  html += '<p class="sub">Cada estrutura distribui seus capítulos em atos. ';
  html += 'Você ajusta as proporções logo abaixo.</p></div>';
  html += '<div class="opts">' + opts + '</div>' + sl;
  return html;
}

// passo 3 · capítulos e cenas
function body3() {
  var p = W.plot;
  var rs = ranges(p);

  var html = '<div class="f2"><div><h2>Detalhe capítulos e cenas</h2>';
  html += '<p class="sub">Dê títulos, defina quantas cenas cada capítulo terá e marque ';
  html += 'os plot twists. Dá para fazer isso depois.</p></div>';
  html += '<div class="batch"><label>Cenas por capítulo (em lote)';
  html += '<input class="in" type="number" min="0" data-i="bn" value="' + W.bn + '" ';
  html += 'style="width:80px;padding:6px 10px"></label>';
  html += '<button class="btn btn-p" data-a="batch">Aplicar a todos</button></div></div>';

  html += '<div class="stack">';
  for (var a = 0; a < rs.length; a++) {
    var r = rs[a];
    var aberto = (W.open === r.i);
    var seta = '›';
    if (aberto) {
      seta = '⌄';
    }
    html += '<div class="group" data-a="act" data-i="' + r.i + '" ';
    html += 'style="border-color:' + r.col + '">';
    html += '<span>' + r.name + ' · ' + r.n + ' capítulos</span>';
    html += '<em style="font-style:normal">' + seta + '</em></div>';

    if (aberto) {
      html += '<div class="stack list">';
      for (var k = 0; k < r.n; k++) {
        var i = r.from + k;
        var c = p.chapters[i];
        var classeTw = '';
        if (c.twist) {
          classeTw = 'on';
        }
        html += '<div class="chap"><span class="n">' + pad(i + 1) + '</span>';
        html += '<input class="in" data-i="ctitle" data-c="' + i + '" ';
        html += 'value="' + esc(c.title) + '" aria-label="Título do capítulo ' + (i + 1) + '">';
        html += '<div class="stp">Cenas ';
        html += '<button data-a="sc" data-c="' + i + '" data-d="-1" aria-label="Menos">−</button>';
        html += '<b>' + c.scenes.length + '</b>';
        html += '<button data-a="sc" data-c="' + i + '" data-d="1" aria-label="Mais">+</button></div>';
        html += '<button class="tw ' + classeTw + '" data-a="twist" data-c="' + i + '">';
        html += '◆ Plot twist</button></div>';
      }
      html += '</div>';
    }
  }
  html += '</div>';
  return html;
}

// passo 4 · revisão
function body4() {
  var p = W.plot;
  var s = stats(p);
  var st = planStatus(p);
  var story = findById(STORIES, p.storyId);
  var c = split(s.n, p.pcts);

  var comCenas = 0;
  for (var i = 0; i < p.chapters.length; i++) {
    if (p.chapters[i].scenes.length > 0) {
      comCenas++;
    }
  }

  var textoHistoria = 'Nenhuma história vinculada';
  if (story) {
    textoHistoria = esc(story.name);
  }

  var textoEstrutura = 'Estrutura livre';
  if (S(p).acts.length > 0) {
    textoEstrutura = S(p).label + ' · ' + c.join(' / ') + ' capítulos';
  }

  var textoCenas = s.n + ' capítulos (sem cenas planejadas)';
  if (s.sp > 0) {
    textoCenas = comCenas + ' capítulos com cenas (' + s.sp + ' cenas)';
  }

  var textoTwists = 'Nenhum';
  if (s.tw.length > 0) {
    var nomes = [];
    for (var k = 0; k < s.tw.length; k++) {
      var pos = s.tw[k];
      nomes.push('Capítulo ' + (pos + 1) + ', ' + esc(p.chapters[pos].title));
    }
    textoTwists = s.tw.length + ' · ' + nomes.join(' · ');
  }

  var linhas = [
    ['Nome', esc(p.name)],
    ['História vinculada', textoHistoria],
    ['Estrutura', textoEstrutura],
    ['Tamanho', s.n + ' capítulos · ~' + fmt(words(p)) + ' palavras'],
    ['Cenas planejadas', textoCenas],
    ['Plot twists', textoTwists],
    ['Status', st.t]
  ];

  var aviso = 'Sem história vinculada: você pode associar uma depois.';
  if (story) {
    aviso = 'Ao salvar, os ' + s.n + ' capítulos viram cards na história “' +
      esc(story.name) + '”.';
  }

  var html = '<h2>Tudo certo? Revise antes de criar.</h2><div class="review">';
  for (var j = 0; j < linhas.length; j++) {
    html += '<div><span>' + linhas[j][0] + '</span><b>' + linhas[j][1] + '</b></div>';
  }
  html += '</div>';
  html += '<div class="note"><i>✦</i><div><b>' + aviso + '</b>';
  html += '<span>Você pode editar o plot depois sem perder nada do que já escreveu.';
  html += '</span></div></div>';
  return html;
}

function wizard() {
  var st = W.step;
  var b = '';
  if (st === 1) {
    b = body1();
  } else if (st === 2) {
    b = body2();
  } else if (st === 3) {
    b = body3();
  } else {
    b = body4();
  }

  var next = '<button class="btn btn-g" data-a="save">Salvar plot</button>';
  if (st < 4) {
    next = '<button class="btn btn-p" data-a="step" data-n="' + (st + 1) + '">Próximo</button>';
  }

  var back = '<button class="btn btn-s" data-a="list">Cancelar</button>';
  if (st > 1) {
    back = '<button class="btn btn-s" data-a="step" data-n="' + (st - 1) + '">Voltar</button>';
  }

  var skip = '';
  if (st === 3) {
    skip = '<button class="link" style="background:none;border:0;cursor:pointer;';
    skip += 'margin-right:20px" data-a="step" data-n="4">Pular esta etapa</button>';
  }

  var titulo = 'Novo plot';
  if (W.editing) {
    titulo = 'Editar plot';
  }

  var html = logo + '<h1>' + titulo + '</h1>';
  html += '<p class="sub">Passo ' + st + ' de 4 · você pode voltar e mudar ';
  html += 'qualquer coisa antes de salvar.</p>';
  html += '<div class="wiz" style="margin-top:16px">';
  html += '<aside class="panel preview" id="pv">' + pv() + '</aside>';
  html += '<div class="panel"><div class="steps">' + steps() + '</div>';
  html += '<div class="body">' + b + '</div>';
  html += '<div class="actions">' + back + '<span>' + skip + next + '</span></div>';
  html += '</div></div>';
  return html;
}


/* ---------- Tela 6 · ficha ---------- */

function ficha(p) {
  var s = stats(p);
  var st = planStatus(p);
  var pc = 0;
  if (s.n > 0) {
    pc = Math.round(s.w / s.n * 100);
  }
  var rs = ranges(p);
  SEL = Math.min(SEL, s.n - 1);
  var atual = p.chapters[SEL];

  // ato do capítulo selecionado
  var ra = null;
  for (var a = 0; a < rs.length; a++) {
    if (SEL >= rs[a].from && SEL < rs[a].from + rs[a].n) {
      ra = rs[a];
    }
  }

  // sumário (lado esquerdo)
  var toc = '';
  for (var b = 0; b < rs.length; b++) {
    var r = rs[b];
    var aberto = '';
    if (r === ra) {
      aberto = 'open';
    }
    toc += '<details ' + aberto + '><summary style="border-color:' + r.col + '">';
    toc += r.name + '<em>Caps. ' + (r.from + 1) + '–' + (r.from + r.n) + ' ⌄</em></summary>';

    for (var k = 0; k < r.n; k++) {
      var i = r.from + k;
      var c = p.chapters[i];
      var classeCap = '';
      if (i === SEL) {
        classeCap = 'cur';
      }
      var marca = '';
      if (c.twist) {
        marca = '<span class="dm">◆</span>';
      }
      toc += '<div class="ch ' + classeCap + '" data-a="selch" data-c="' + i + '">';
      toc += '<small>' + pad(i + 1) + '</small>' + esc(c.title) + marca + '</div>';

      if (i === SEL && c.scenes.length > 0) {
        toc += '<ul class="sc">';
        for (var m = 0; m < c.scenes.length; m++) {
          var classeCena = '';
          if (!c.scenes[m].written) {
            classeCena = 'todo';
          }
          toc += '<li class="' + classeCena + '">' + esc(c.scenes[m].title) + '</li>';
        }
        toc += '</ul>';
      }
    }
    toc += '</details>';
  }

  // cenas do capítulo selecionado
  var escritas = 0;
  for (var q = 0; q < atual.scenes.length; q++) {
    if (atual.scenes[q].written) {
      escritas++;
    }
  }
  var resumoCenas = '';
  if (atual.scenes.length > 0) {
    resumoCenas = escritas + ' de ' + atual.scenes.length + ' escritas';
  }

  var cenas = '';
  if (atual.scenes.length > 0) {
    for (var j = 0; j < atual.scenes.length; j++) {
      var x = atual.scenes[j];
      var classeDot = '';
      var simbolo = j + 1;
      var classeBadge = 'b-rasc';
      var textoBadge = 'Planejada';
      if (x.written) {
        classeDot = 'ok';
        simbolo = '✓';
        classeBadge = 'b-fin';
        textoBadge = 'Escrita';
      }
      var descricao = esc(x.desc);
      if (descricao === '') {
        descricao = 'Sem descrição ainda.';
      }
      cenas += '<button class="scene" data-a="openscene" data-k="' + j + '">';
      cenas += '<span class="dot ' + classeDot + '">' + simbolo + '</span>';
      cenas += '<div><b>' + esc(x.title) + '</b><span>' + descricao + '</span></div>';
      cenas += '<span class="badge ' + classeBadge + '">' + textoBadge + '</span></button>';
    }
  } else {
    cenas = '<div class="empty-line">Nenhuma cena planejada neste capítulo. ';
    cenas += 'Use “Criar cena” para começar.</div>';
  }

  var nomeAto = '';
  if (S(p).acts.length > 0) {
    nomeAto = ' · ' + ra.name;
  }
  var selo = '';
  if (atual.twist) {
    selo = '<span class="badge b-twist">Plot twist</span>';
  }

  var html = logo + '<a class="crumb" href="#/plots">‹ Plots</a>';

  // cabeçalho
  html += '<div class="panel hcard" style="margin-top:8px"><div class="tt"><div>';
  html += '<h1>' + esc(p.name) + '</h1>';
  html += '<span class="badge ' + st.c + '">' + st.t + '</span>';
  html += storyLine(p, 'História: ');
  html += '<span class="sub">' + S(p).label + ' · ' + s.n + ' capítulos</span></div>';
  html += '<div class="btns">';
  html += '<button class="btn btn-o" data-a="edit" data-s="1">Editar plot</button>';
  html += '<button class="btn btn-s" data-a="dup">Duplicar modelo</button></div></div>';
  html += '<div class="prog">' + bar(p) + '<span>' + pc + '% escrito · ';
  html += s.w + ' / ' + s.n + ' capítulos · ' + twTxt(s.tw.length) + '</span></div></div>';

  // sumário + capítulo
  html += '<div class="fich"><nav class="panel toc" aria-label="Sumário">';
  html += '<header><b>Sumário</b><span>' + s.n + ' capítulos</span></header>' + toc + '</nav>';
  html += '<article class="panel read"><div class="top"><div>';
  html += '<span class="sub">Capítulo ' + pad(SEL + 1) + nomeAto + '</span>';
  html += '<h2>' + esc(atual.title) + selo + '</h2></div>';
  html += '<button class="btn btn-o" data-a="edit" data-s="3" data-o="' + ra.i + '">Editar</button></div>';
  html += '<div style="display:flex;justify-content:space-between;align-items:center">';
  html += '<b>Cenas planejadas</b><span class="sub">' + resumoCenas + ' ';
  html += '<button class="btn btn-p" style="margin-left:12px" data-a="newscene">';
  html += '+ Criar cena</button></span></div>';
  html += '<div class="scenes">' + cenas + '</div></article></div>';
  return html;
}


/* ---------- Tela 7 · cena ---------- */

function scene(p, ci, si) {
  var html = logo + '<a class="crumb" href="#/plot/' + p.id + '">‹ ' + esc(p.name) + '</a>';
  html += '<h1>Cena ' + (si + 1) + '</h1>';
  html += '<p class="sub">Capítulo ' + pad(ci + 1) + ' · ' + esc(p.chapters[ci].title) + '</p>';
  html += '<div class="panel editor" style="margin-top:16px"><div class="body">';
  html += '<label>Título da cena<input class="in" data-i="stitle" value="' + esc(ED.title) + '"></label>';
  html += '<label>Descrição<textarea class="in" data-i="sdesc" ';
  html += 'placeholder="O que deve acontecer nesta cena?">' + esc(ED.desc) + '</textarea>';
  html += '<span class="hint">Esta descrição aparece na barra lateral do editor da história.</span></label></div>';
  html += '<div class="actions">';
  html += '<button class="btn btn-r" data-a="askdel" data-kind="scene">Excluir cena</button>';
  html += '<span><a class="btn btn-s" href="#/plot/' + p.id + '" style="margin-right:10px">Voltar</a>';
  html += '<button class="btn btn-p" data-a="savescene">Salvar cena</button></span></div></div>';
  return html;
}


/* ---------- roteador ---------- */

function go(hash) {
  if (location.hash === hash) {
    route();
  } else {
    location.hash = hash;
  }
}

function currentPlot() {
  return findById(plots, location.hash.split('/')[2]);
}

function grow(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 'px';
}

// escreve o HTML na página mantendo a rolagem da lista
function paint(html) {
  var lista = document.querySelector('.list');
  var topo = 0;
  if (lista) {
    topo = lista.scrollTop;
  }
  app.innerHTML = html;

  var nova = document.querySelector('.list');
  if (nova) {
    nova.scrollTop = topo;
  }
  var areas = document.querySelectorAll('textarea');
  for (var i = 0; i < areas.length; i++) {
    grow(areas[i]);
  }
}

function route() {
  var partes = location.hash.split('/');
  var pg = partes[1];
  var id = partes[2];
  var ci = partes[4];
  var si = partes[6];

  if (pg === 'novo' && W) {
    return paint(wizard());
  }

  if (pg === 'plot' && id) {
    var p = findById(plots, id);
    if (!p) {
      return go('#/plots');
    }
    if (ci !== undefined && p.chapters[ci] && p.chapters[ci].scenes[si]) {
      var chave = id + ci + si;
      if (!ED || ED.k !== chave) {
        var x = p.chapters[ci].scenes[si];
        ED = { k: chave, title: x.title, desc: x.desc };
      }
      SEL = Number(ci);
      return paint(scene(p, Number(ci), Number(si)));
    }
    ED = null;
    return paint(ficha(p));
  }

  paint(list());
}

function goStep(n) {
  var p = W.plot;
  if (n > 1 && p.name.trim() === '') {
    W.err = true;
    W.step = 1;
    return route();
  }
  if (n >= 2 && !p.struct) {
    setStruct('tres');
  }
  if (n >= 3) {
    sync(p);
  }
  W.err = false;
  W.step = n;
  route();
  scrollTo(0, 0);
}


/* ---------- confirmação de exclusão ---------- */

function openModal(kind, id) {
  DEL = { kind: kind, id: id };

  var texto = '';
  var tipo = 'cena';
  if (kind === 'plot') {
    var alvo = findById(plots, id);
    var nome = '';
    if (alvo) {
      nome = alvo.name;
    }
    tipo = 'plot';
    texto = 'O plot “' + esc(nome) + '” será apagado junto com todos os ';
    texto += 'capítulos e cenas planejados.';
  } else {
    var partes = location.hash.split('/');
    var cena = currentPlot().chapters[partes[4]].scenes[partes[6]];
    texto = 'A cena “' + esc(cena.title) + '” será removida do capítulo.';
  }

  var m = document.getElementById('modal');
  if (!m) {
    m = document.createElement('div');
    m.id = 'modal';
    document.body.appendChild(m);
  }

  var html = '<div class="ov"><div class="dlg" role="dialog" aria-modal="true" aria-labelledby="dt">';
  html += '<h2 id="dt">Excluir ' + tipo + '?</h2>';
  html += '<p>' + texto + ' Esta ação não pode ser desfeita.</p>';
  html += '<label>Para confirmar, digite <b>Excluir</b>';
  html += '<input class="in" id="cf" data-i="confirm" autocomplete="off" placeholder="Excluir"></label>';
  html += '<div class="actions"><button class="btn btn-s" data-a="canceldel">Cancelar</button>';
  html += '<button class="btn btn-d" id="cfbtn" data-a="confirmdel" disabled>Excluir</button>';
  html += '</div></div></div>';
  m.innerHTML = html;
  document.getElementById('cf').focus();
}

function closeModal() {
  DEL = null;
  var m = document.getElementById('modal');
  if (m) {
    m.innerHTML = '';
  }
}


/* ---------- ações (cada botão com data-a chama uma delas) ---------- */

var A = {
  new: function () {
    W = { step: 1, plot: blank(), open: 0, bn: 4 };
    go('#/novo');
  },

  open: function (d) {
    SEL = 0;
    go('#/plot/' + d.id);
  },

  list: function () {
    W = null;
    go('#/plots');
  },

  measure: function (d) {
    W.plot.measure = d.m;
    route();
  },

  struct: function (d) {
    setStruct(d.k);
    route();
  },

  step: function (d) {
    goStep(Number(d.n));
  },

  act: function (d) {
    W.open = Number(d.i);
    route();
  },

  sc: function (d) {
    var c = W.plot.chapters[Number(d.c)];
    if (Number(d.d) > 0) {
      c.scenes.push(newScene(c));
    } else {
      c.scenes.pop();
    }
    route();
  },

  twist: function (d) {
    var c = W.plot.chapters[Number(d.c)];
    c.twist = !c.twist;
    route();
  },

  batch: function () {
    var chapters = W.plot.chapters;
    for (var i = 0; i < chapters.length; i++) {
      var c = chapters[i];
      while (c.scenes.length < W.bn) {
        c.scenes.push(newScene(c));
      }
      c.scenes.length = W.bn;
    }
    route();
  },

  save: function () {
    var p = W.plot;
    sync(p);
    var i = indexById(plots, p.id);
    if (i < 0) {
      plots.push(p);
    } else {
      plots[i] = p;
    }
    saveP(p);
    W = null;
    go('#/plots');
  },

  edit: function (d) {
    var etapa = Number(d.s);
    if (!etapa) {
      etapa = 1;
    }
    var ato = Number(d.o);
    if (!ato) {
      ato = 0;
    }
    W = { step: etapa, plot: clone(currentPlot()), open: ato, bn: 4, editing: true };
    if (W.step > 1) {
      sync(W.plot);
    }
    go('#/novo');
  },

  dup: function () {
    var p = currentPlot();
    var base = nomeBase(p.name);
    var n = 2;
    while (nomeExiste(base + ' (' + n + ')')) {
      n++;
    }

    var copia = clone(p);
    copia.id = uuid();
    copia.name = base + ' (' + n + ')';
    for (var i = 0; i < copia.chapters.length; i++) {
      copia.chapters[i].id = uuid();
      for (var k = 0; k < copia.chapters[i].scenes.length; k++) {
        copia.chapters[i].scenes[k].id = uuid();
      }
    }
    plots.push(copia);
    saveP(copia);
    go('#/plots');
  },

  selch: function (d) {
    SEL = Number(d.c);
    route();
  },

  newscene: function () {
    var p = currentPlot();
    var c = p.chapters[SEL];
    c.scenes.push(newScene(c));
    saveP(p);
    go('#/plot/' + p.id + '/c/' + SEL + '/s/' + (c.scenes.length - 1));
  },

  openscene: function (d) {
    go('#/plot/' + currentPlot().id + '/c/' + SEL + '/s/' + d.k);
  },

  savescene: function () {
    var partes = location.hash.split('/');
    var id = partes[2];
    var p = currentPlot();
    var x = p.chapters[partes[4]].scenes[partes[6]];

    var novoTitulo = ED.title.trim();
    if (novoTitulo !== '') {
      x.title = novoTitulo;
    }
    x.desc = ED.desc;
    saveP(p);
    ED = null;
    go('#/plot/' + id);
  },

  askdel: function (d) {
    openModal(d.kind, d.id);
  },

  canceldel: function () {
    closeModal();
  },

  confirmdel: function () {
    var campo = document.getElementById('cf');
    if (!DEL || !campo || campo.value !== 'Excluir') {
      return;
    }

    if (DEL.kind === 'plot') {
      var rid = DEL.id;
      var restantes = [];
      for (var i = 0; i < plots.length; i++) {
        if (plots[i].id !== rid) {
          restantes.push(plots[i]);
        }
      }
      plots = restantes;
      delP(rid);
      closeModal();
      W = null;
      go('#/plots');
    } else {
      var partes = location.hash.split('/');
      var id = partes[2];
      var p = currentPlot();
      p.chapters[partes[4]].scenes.splice(partes[6], 1);
      saveP(p);
      ED = null;
      closeModal();
      go('#/plot/' + id);
    }
  }
};


/* ---------- eventos da página ---------- */

document.addEventListener('click', function (e) {
  if (e.target.classList.contains('ov')) {
    return closeModal();
  }
  var botao = e.target.closest('[data-a]');
  if (botao && A[botao.dataset.a]) {
    A[botao.dataset.a](botao.dataset);
  }
});

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && DEL) {
    closeModal();
  } else if (e.key === 'Enter' && e.target.id === 'cf') {
    A.confirmdel();
  } else if (e.key === 'Enter' && e.target.matches('[data-a]:not(button)')) {
    e.target.click();
  }
});

document.addEventListener('input', function (e) {
  var t = e.target;
  var k = t.dataset.i;
  if (!k) {
    return;
  }
  var p = null;
  if (W) {
    p = W.plot;
  }

  if (k === 'confirm') {
    document.getElementById('cfbtn').disabled = (t.value !== 'Excluir');
  } else if (k === 'name') {
    p.name = t.value;
    t.classList.remove('bad');
  } else if (k === 'story') {
    p.storyId = t.value;
  } else if (k === 'total' || k === 'wpc') {
    p[k] = Math.max(1, parseInt(t.value) || 1);
    document.getElementById('calc').textContent = calc(p);
    document.getElementById('pv').innerHTML = pv();
  } else if (k === 'draft') {
    p.draft = t.value;
    grow(t);
  } else if (k === 'pct' || k === 'cnt') {
    var i = Number(t.dataset.n);
    var n = count(p);
    var v = 0;
    if (k === 'pct') {
      v = Math.round(Number(t.value) / 100 * n);
    } else {
      v = Math.max(0, parseInt(t.value) || 0);
    }
    var aviso = setCount(i, v);
    warn(aviso);
    refreshDist(k === 'pct' && aviso !== '');
    if (k === 'cnt') {
      t.classList.toggle('bad', aviso !== '');
    }
  } else if (k === 'ctitle') {
    p.chapters[Number(t.dataset.c)].title = t.value;
  } else if (k === 'bn') {
    W.bn = Math.max(0, parseInt(t.value) || 0);
  } else if (k === 'stitle') {
    ED.title = t.value;
  } else if (k === 'sdesc') {
    ED.desc = t.value;
    grow(t);
  }
});

document.addEventListener('change', function (e) {
  if (W && e.target.dataset.i === 'cnt') {
    refreshDist(true);
  }
});

window.addEventListener('hashchange', route);


/* ---------- início ---------- */

Promise.all([API.list(), API.stories()])
  .then(function (resultado) {
    plots = resultado[0];
    STORIES = resultado[1];
    route();
  })
  .catch(function () {
    app.innerHTML = '<p class="err">Não foi possível carregar os plots.</p>';
  });