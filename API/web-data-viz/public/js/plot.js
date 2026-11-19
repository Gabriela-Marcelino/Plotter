// id do usuário logado (o login.js guardou no sessionStorage)
var idUsuario = sessionStorage.ID_USUARIO;

var CORES = ["#8b5cf6", "#3b82f6", "#eab308", "#22c55e", "#ef4444"];


// subtitulo, imagem (gráfico do card, em Img/Plot) e descricoes são usados na tela do passo 2 e na prévia.
var ESTRUTURAS = {
  "livre": {
    nome: "Estrutura livre", subtitulo: "Sem atos definidos",
    imagem: "sem-estrutura.svg",
    atos: [], porcentagem: [], descricoes: []
  },
  "3": {
    nome: "Estrutura de 3 atos", subtitulo: "Linear tradicional",
    imagem: "linha-grafico-3-atos.svg",
    atos: ["Introdução", "Confronto", "Resolução"], porcentagem: [25, 50, 25],
    descricoes: ["Mundo atual, incidente inicial e aceitação do chamado.", "Obstáculos crescentes, ponto de virada central e crise.", "Clímax final e o novo encerramento."]
  },
  "4": {
    nome: "Kishōtenketsu (4 atos)", subtitulo: "Sem conflito obrigatório",
    imagem: "linha-grafico-4-atos.svg",
    atos: ["Ki · Introdução", "Shō · Desenvolvimento", "Ten · A virada", "Ketsu · Conclusão"], porcentagem: [25, 25, 25, 25],
    descricoes: ["Apresenta personagens e o mundo.", "Aprofunda a situação sem grandes conflitos.", "Uma reviravolta muda a perspectiva.", "Une as partes e conclui a história."]
  },
  "5": {
    nome: "Pirâmide dramática (5 atos)", subtitulo: "Tragédia",
    imagem: "linha-grafico-5-atos.svg",
    atos: ["Introdução", "Ação ascendente", "Clímax", "Ação descendente", "Resolução"], porcentagem: [20, 20, 20, 20, 20],
    descricoes: ["Apresenta personagens e o conflito.", "A tensão cresce com complicações.", "O ponto de maior tensão da história.", "As consequências do clímax se desdobram.", "Desfecho e novo equilíbrio."]
  }
};

// 150000 -> "150.000"
function formatarNumero(numero) {
  return Number(numero).toLocaleString("pt-BR");
}

var historias = []
var plots = []

var plotEmEdicao = null;
var idPlotEditando = null;
var passoAtual = 1;
var atoAbertoAssistente = 0;

var idPlotAberto = null
var capituloAberto = 0;
var atoAbertoSumario = 0;
var cenaAberta = 0;

async function carregarHistorias() {
  try {
    var resposta = await fetch("/historias/listar/" + idUsuario);
    if (resposta.ok == false) {
      return [];
    }
    var lista = await resposta.json();
    // converte para o formato que este arquivo usa: { id, nome, status }
    var historiasConvertidas = [];
    for (var posicao = 0; posicao < lista.length; posicao++) {
      var status = "";
      if (lista[posicao].concluida == 1) {
        status = "concluida";
      }
      historiasConvertidas.push({ id: String(lista[posicao].idHistoria), nome: lista[posicao].nome, status: status });
    }
    return historiasConvertidas;
  } catch (erro) {
    return [];
  }
}

async function carregarPlots() {
  try {
    var resposta = await fetch("/plots/listar/" + idUsuario);
    if (resposta.ok == false) {
      return [];
    }
    return await resposta.json();
  } catch (erro) {
    return [];
  }
}

// Envia o plot inteiro (com atos, capítulos e cenas) para o servidor.
// Novo: POST /plots/cadastrar   ·   Edição: PUT /plots/atualizar/:id
async function salvarPlot(plot, plotNovo) {
  var endereco = "/plots/cadastrar";
  var metodo = "POST";
  if (plotNovo == false) {
    endereco = "/plots/atualizar/" + plot.id;
    metodo = "PUT";
  }
  try {
    var resposta = await fetch(endereco, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idUsuarioServer: idUsuario, plotServer: plot })
    });
    if (resposta.ok == false) {
      // o servidor explica o motivo (ex.: "Informe o nome do plot.")
      var motivo = await resposta.text();
      alert("Não foi possível salvar. " + motivo);
      return false;
    }
    if (plotNovo) {
      var dadosRecebidos = await resposta.json(); // id que o banco criou
      plot.id = dadosRecebidos.id;
    }
    return true;
  } catch (erro) {
    alert("Erro de conexão com o servidor.");
    return false;
  }
}

function protecaoCaractereEspecial(texto) {
  texto = "" + texto; // n tava dando certo porque n tinha transformação de int em string
  var textoProtegido = "";
  for (var posicaoLetra = 0; posicaoLetra < texto.length; posicaoLetra++) {
    var letra = texto[posicaoLetra];
    if (letra == "&") {
      textoProtegido += "&amp;";
    } else if (letra == '"') {
      textoProtegido += "&quot;";
    } else if (letra == "<") {
      textoProtegido += "&lt;";
    } else {
      textoProtegido += letra;
    }
  }
  return textoProtegido;
}

function copiarPlot(plotOriginal) {
  return JSON.parse(JSON.stringify(plotOriginal));
}

function pegarElemento(idElemento) {
  return document.getElementById(idElemento);
}

function buscarHistoriavincula(idHistoria) {
  for (var posicao = 0; posicao < historias.length; posicao++) {
    if (historias[posicao].id == idHistoria) {
      return historias[posicao];
    }
  }
  return null;
}

function acharPlot(idPlot) {
  for (var posicao = 0; posicao < plots.length; posicao++) {
    if (plots[posicao].id == idPlot) {
      return plots[posicao];
    }
  }
  return null;
}

function statusPlot(plot) {
  var historiaVinculada = buscarHistoriavincula(plot.historia);
  if (historiaVinculada == null) {
    return { texto: "Rascunho", classe: "cinza" };
  }
  if (historiaVinculada.status == "concluida") {
    return { texto: "Finalizado", classe: "verde" };
  }
  return { texto: "Em produção", classe: "azul" };
}

function totalCapitulos(plot) {
  var tamanho = Number(plot.total);
  if (plot.medida == "capitulos") {
    return Math.round(tamanho);
  }
  var palavrasPorCapitulo = Number(plot.palavrasCap);
  if (palavrasPorCapitulo == 0) {
    palavrasPorCapitulo = 3000;
  }
  var quantidadeCapitulos = Math.round(tamanho / palavrasPorCapitulo);
  if (quantidadeCapitulos < 1) {
    quantidadeCapitulos = 1;
  }
  return quantidadeCapitulos;
}

function distribuir(quantidadeCapitulos, porcentagens) {
  var capitulosPorAto = [];
  var somaDistribuida = 0;
  for (var indiceAto = 0; indiceAto < porcentagens.length; indiceAto++) {
    if (indiceAto == porcentagens.length - 1) {
      capitulosPorAto.push(quantidadeCapitulos - somaDistribuida);
    } else {
      var capitulosDoAto = Math.round(quantidadeCapitulos * porcentagens[indiceAto] / 100);
      capitulosPorAto.push(capitulosDoAto);
      somaDistribuida += capitulosDoAto;
    }
  }
  return capitulosPorAto;
}

function somaAtos() {
  var soma = 0;
  for (var indiceAto = 0; indiceAto < plotEmEdicao.atos.length; indiceAto++) {
    soma += plotEmEdicao.atos[indiceAto];
  }
  return soma;
}

function capEscrito(capitulo) {
  if (capitulo.cenas.length == 0) {
    return false; // ESCRITO só se tem pelo menos 1 cena e TODAS escritas.
  }
  for (var indiceCena = 0; indiceCena < capitulo.cenas.length; indiceCena++) {
    if (capitulo.cenas[indiceCena].escrita == false) {
      return false;
    }
  }
  return true;
}

function contarCapsEscritos(plot) {
  var capitulosEscritos = 0;
  for (var indiceCapitulo = 0; indiceCapitulo < plot.capitulos.length; indiceCapitulo++) {
    if (capEscrito(plot.capitulos[indiceCapitulo])) {
      capitulosEscritos++;
    }
  }
  return capitulosEscritos;
}

function contarCenas(plot) { // contar cenas todos os caps
  var totalCenas = 0;
  var cenasEscritas = 0;
  for (var indiceCapitulo = 0; indiceCapitulo < plot.capitulos.length; indiceCapitulo++) {
    var capitulo = plot.capitulos[indiceCapitulo];
    for (var indiceCena = 0; indiceCena < capitulo.cenas.length; indiceCena++) {
      totalCenas++;
      if (capitulo.cenas[indiceCena].escrita) {
        cenasEscritas++;
      }
    }
  }
  return { total: totalCenas, escritas: cenasEscritas };
}

// Conta as cenas de UM cap.
function contarEscritasCap(capitulo) {
  var cenasEscritas = 0;
  for (var indiceCena = 0; indiceCena < capitulo.cenas.length; indiceCena++) {
    if (capitulo.cenas[indiceCena].escrita) {
      cenasEscritas++;
    }
  }
  return cenasEscritas;
}

function contarTwists(plot) {
  var quantidadeTwists = 0;
  for (var indiceCapitulo = 0; indiceCapitulo < plot.capitulos.length; indiceCapitulo++) {
    if (plot.capitulos[indiceCapitulo].twist) {
      quantidadeTwists++;
    }
  }
  return quantidadeTwists;
}

function porcentagem(parte, total) {
  if (total == 0) {
    return 0;
  }
  return Math.round(parte * 100 / total);
}


function faixasAtos(plot) {
  var faixas = [];
  var inicioFaixa = 0;
  var nomesAtos = ESTRUTURAS[plot.estrutura].atos;
  // Estrutura livre 
  if (plot.atos.length == 0) {
    faixas.push({ nome: "Capítulos", inicio: 0, fim: plot.capitulos.length, cor: CORES[0] });
    return faixas;
  }
  for (var indiceAto = 0; indiceAto < plot.atos.length; indiceAto++) {
    faixas.push({ nome: nomesAtos[indiceAto], inicio: inicioFaixa, fim: inicioFaixa + plot.atos[indiceAto], cor: CORES[indiceAto] });
    inicioFaixa += plot.atos[indiceAto];
  }
  return faixas;
}

function barraHTML(plot) {
  var faixas = faixasAtos(plot);
  var quantidadeCapitulos = plot.capitulos.length;
  var html = '<div class="barra-wrap">';

  for (var indiceCapitulo = 0; indiceCapitulo < quantidadeCapitulos; indiceCapitulo++) {
    if (plot.capitulos[indiceCapitulo].twist) {
      var posicaoLosango = (indiceCapitulo + 0.5) * 100 / quantidadeCapitulos;
      html += '<span class="twist" style="left:' + posicaoLosango + '%">◆</span>';
    }
  }

  html += '<div class="barra">';
  for (var indiceFaixa = 0; indiceFaixa < faixas.length; indiceFaixa++) {
    var faixa = faixas[indiceFaixa];
    var capitulosDoAto = faixa.fim - faixa.inicio;
    var capitulosEscritos = 0;
    for (var indiceCapituloAto = faixa.inicio; indiceCapituloAto < faixa.fim; indiceCapituloAto++) {
      if (capEscrito(plot.capitulos[indiceCapituloAto])) {
        capitulosEscritos++;
      }
    }
    var porcentagemPintada = 0;
    if (capitulosDoAto > 0) {
      porcentagemPintada = capitulosEscritos * 100 / capitulosDoAto;
    }
    html += '<div class="seg" style="flex:' + capitulosDoAto + '"><div style="width:' + porcentagemPintada + '%;background:' + faixa.cor + '"></div></div>';
  }
  html += '</div></div>';
  return html;
}































// TELA 1 · LISTA DE PLOTS

function mostrarLista() {
  var html = '<div class="topo-pagina"><div><h1>Plots</h1><p class="sub">Estrutura, progresso e status de cada plot.</p></div>';
  html += '<button class="btn" onclick="novoPlot()">+ Novo plot</button></div>';

  if (plots.length == 0) {
    html += '<div class="grade"><div class="card novo" onclick="novoPlot()"><div style="font-size:26px">+</div>Criar novo plot</div></div>';
    pegarElemento("conteudo").innerHTML = html;
    return;
  }

  html += '<div class="grade">';
  for (var indicePlot = 0; indicePlot < plots.length; indicePlot++) {
    var plot = plots[indicePlot];
    var status = statusPlot(plot);
    var historiaVinculada = buscarHistoriavincula(plot.historia);
    var quantidadeCapitulos = plot.capitulos.length;
    var capitulosEscritos = contarCapsEscritos(plot);
    var porcentagemEscrita = porcentagem(capitulosEscritos, quantidadeCapitulos);
    var cenas = contarCenas(plot);
    var quantidadeTwists = contarTwists(plot);

    var textoTwist = "plot twists";
    if (quantidadeTwists == 1) {
      textoTwist = "plot twist";
    }

    html += '<div class="card" onclick="abrirDetalhe(\'' + plot.id + '\')">';
    html += '<div class="topo"><h3>' + protecaoCaractereEspecial(plot.nome) + '</h3><span class="tag ' + status.classe + '">' + status.texto + '</span></div>';
    if (historiaVinculada != null) {
      html += '<div class="hist">▫ ' + protecaoCaractereEspecial(historiaVinculada.nome) + '</div>';
    } else {
      html += '<div class="hist cinza">▫ Sem história vinculada</div>';
    }
    html += '<div class="peq">' + ESTRUTURAS[plot.estrutura].nome + ' · ' + quantidadeCapitulos + ' capítulos</div>';
    html += barraHTML(plot);
    html += '<div class="linha"><b>' + porcentagemEscrita + '% escrito</b><span>' + capitulosEscritos + ' / ' + quantidadeCapitulos + ' capítulos</span></div>';
    html += '<div class="linha"><span>' + cenas.escritas + ' / ' + cenas.total + ' cenas escritas</span>';
    html += '<span>◆ ' + quantidadeTwists + textoTwist + '</span></div></div>';
  }
  html += '<div class="card novo" onclick="novoPlot()"><div style="font-size:26px">+</div>Novo plot</div></div>';
  pegarElemento("conteudo").innerHTML = html;
}


// ============================================================
// 5. TELAS 2 a 5 · ASSISTENTE DE CRIAÇÃO
// ============================================================

// Cria um plot vazio com valores padrão e abre o passo 1.
function novoPlot() {
  plotEmEdicao = {
    id: "", nome: "", historia: "", medida: "capitulos", total: 50, palavrasCap: 3000,
    rascunho: "", estrutura: "", atos: [], capitulos: []
  };
  idPlotEditando = null;
  passoAtual = 1;
  atoAbertoAssistente = 0;
  renderWizard();
}

// Procura o plot clicado, faz uma CÓPIA dele em "plotEmEdicao" e abre o assistente já preenchido.
function editarPlot(idPlot) {
  for (var indicePlot = 0; indicePlot < plots.length; indicePlot++) {
    if (plots[indicePlot].id == idPlot) {
      plotEmEdicao = copiarPlot(plots[indicePlot]);
    }
  }
  idPlotEditando = idPlot;
  passoAtual = 1;
  atoAbertoAssistente = 0;
  renderWizard();
}

// Garante que o vetor de capítulos tem o tamanho certo.
// Se faltam: adiciona "Capítulo N" no fim (push). Se sobram: remove do fim (pop).
// [FORA DAS LISTAS] vetor.pop() remove o ÚLTIMO item do vetor (é o contrário do push).
function ajustarCapitulos() {
  var quantidadeDesejada = totalCapitulos(plotEmEdicao);
  while (plotEmEdicao.capitulos.length < quantidadeDesejada) {
    plotEmEdicao.capitulos.push({ titulo: "Capítulo " + (plotEmEdicao.capitulos.length + 1), twist: false, sinopse: "", cenas: [] });
  }
  while (plotEmEdicao.capitulos.length > quantidadeDesejada) {
    plotEmEdicao.capitulos.pop();
  }
}

// Verifica se um texto tem pelo menos uma letra que não seja espaço.
// Ex.: "   " -> false   " Ana " -> true
function temTexto(texto) {
  for (var posicaoLetra = 0; posicaoLetra < texto.length; posicaoLetra++) {
    if (texto[posicaoLetra] != " ") {
      return true;
    }
  }
  return false;
}

// Troca de passo. Só valida quando está AVANÇANDO; voltar é sempre livre.
// Passo 1 -> 2: exige nome e tamanho, cria os capítulos e refaz a divisão dos atos se precisar.
// Passo 2 -> 3: exige estrutura e que a soma dos atos seja igual ao total de capítulos.
// return interrompe a função e impede de avançar.
function irPasso(proximoPasso) {
  if (proximoPasso > passoAtual) {
    if (passoAtual == 1) {
      if (temTexto(plotEmEdicao.nome) == false) {
        alert("Dê um nome ao plot.");
        return;
      }
      if (totalCapitulos(plotEmEdicao) < 1) {
        alert("Informe um tamanho maior que zero.");
        return;
      }
      ajustarCapitulos();
      if (plotEmEdicao.estrutura != "" && plotEmEdicao.estrutura != "livre" && somaAtos() != plotEmEdicao.capitulos.length) {
        plotEmEdicao.atos = distribuir(plotEmEdicao.capitulos.length, ESTRUTURAS[plotEmEdicao.estrutura].porcentagem);
      }
    }
    if (passoAtual == 2) {
      if (plotEmEdicao.estrutura == "") {
        alert("Escolha uma estrutura.");
        return;
      }
      if (plotEmEdicao.estrutura != "livre" && somaAtos() != plotEmEdicao.capitulos.length) {
        alert("A soma dos atos precisa ser igual a " + plotEmEdicao.capitulos.length + " capítulos.");
        return;
      }
    }
  }
  passoAtual = proximoPasso;
  renderWizard();
}

// Desenha o esqueleto do assistente: prévia à esquerda, indicador de passos e o miolo,
// que é preenchido pela função do passo atual.
function renderWizard() {
  var nomesPassos = ["Básico", "Estrutura", "Detalhar (opcional)", "Revisar"];

  var titulo = "Novo plot";
  if (idPlotEditando != null) {
    titulo = "Editar plot";
  }

  var html = '<span class="link" onclick="mostrarLista()">‹ Plots</span>';
  html += '<h1>' + titulo + '</h1>';
  html += '<p class="sub">Passo ' + passoAtual + ' de 4 · você pode voltar e mudar qualquer coisa antes de criar.</p>';
  html += '<div class="wizard"><div class="painel previa"><b>Prévia da estrutura</b><div id="previa"></div></div>';
  html += '<div class="painel painel-passos"><div class="passos">';

  for (var numeroPasso = 1; numeroPasso <= 4; numeroPasso++) {
    var classeCss = "";
    var marcador = numeroPasso;
    if (numeroPasso == passoAtual) {
      classeCss = "atual";
    } else if (numeroPasso < passoAtual) {
      classeCss = "feito";
      marcador = "✓"; // passo já concluído
    }
    html += '<div class="p ' + classeCss + '"><span class="n">' + marcador + '</span><span class="nome-passo">' + nomesPassos[numeroPasso - 1] + '</span></div>';
  }
  html += '</div><div id="passo"></div></div></div>';
  pegarElemento("conteudo").innerHTML = html;

  if (passoAtual == 1) { passo1(); }
  if (passoAtual == 2) { passo2(); }
  if (passoAtual == 3) { passo3(); }
  if (passoAtual == 4) { passo4(); }
  atualizarPrevia();
}

// Atualiza a COLUNA DA ESQUERDA (prévia) em tempo real.
function atualizarPrevia() {
  var html = "";

  if (plotEmEdicao.estrutura == "livre") {
    html = '<div class="previa-vazia">Estrutura livre<br>(sem atos)</div>';
  } else if (plotEmEdicao.estrutura == "") {
    html = '<div class="previa-vazia">Sem estrutura definida<br>Escolha no passo 2</div>';
  } else {
    var nomesAtos = ESTRUTURAS[plotEmEdicao.estrutura].atos;
    var quantidadeCapitulos = plotEmEdicao.capitulos.length;
    if (quantidadeCapitulos == 0) {
      quantidadeCapitulos = totalCapitulos(plotEmEdicao);
    }

    var descricoesAtos = ESTRUTURAS[plotEmEdicao.estrutura].descricoes;
    html = '<p class="previa-nome">' + ESTRUTURAS[plotEmEdicao.estrutura].nome + '</p><div class="barra">';
    for (var indiceAto = 0; indiceAto < plotEmEdicao.atos.length; indiceAto++) {
      var larguraAto = plotEmEdicao.atos[indiceAto];
      if (larguraAto == 0) {
        larguraAto = 0.01; // ato com 0 capítulos ainda aparece fininho
      }
      html += '<div class="seg" style="flex:' + larguraAto + '"></div>';
    }
    html += '</div>';

    for (var indiceCard = 0; indiceCard < plotEmEdicao.atos.length; indiceCard++) {
      var porcentagemAto = porcentagem(plotEmEdicao.atos[indiceCard], quantidadeCapitulos);
      html += '<div class="ato-card" style="border-color:' + CORES[indiceCard] + '"><b>Ato ' + (indiceCard + 1) + ' · ' + nomesAtos[indiceCard] + '</b>';
      html += '<small>' + plotEmEdicao.atos[indiceCard] + ' capítulos · ' + porcentagemAto + '%</small>';
      html += '<span class="desc">' + descricoesAtos[indiceCard] + '</span></div>';
    }
  }
  html += '<p class="previa-total">' + totalCapitulos(plotEmEdicao) + ' capítulos · ~' + formatarNumero(totalCapitulos(plotEmEdicao) * plotEmEdicao.palavrasCap) + ' palavras</p>';
  pegarElemento("previa").innerHTML = html;
}

/* ---- Passo 1 ---- */

// PASSO 1 · BÁSICO: nome, história vinculada, medir por capítulos/palavras, quantidade e rascunho.
//
// [FORA DAS LISTAS] Eventos dentro do HTML:
//   oninput="..."  -> roda o código A CADA LETRA digitada no campo.
//   onchange="..." -> roda quando o usuário escolhe uma opção (select) ou sai do campo.
//   this.value     -> o que está escrito no próprio campo naquele momento.
// Ex.: oninput="plotEmEdicao.nome=this.value" guarda o que foi digitado direto no plot.
function passo1() {
  var html = '<label>Nome do plot *</label><input type="text" value="' + protecaoCaractereEspecial(plotEmEdicao.nome) + '" oninput="plotEmEdicao.nome=this.value">';

  html += '<div class="fila"><div style="flex:2"><label>História vinculada (opcional)</label><select onchange="plotEmEdicao.historia=this.value">';
  html += '<option value="">Nenhuma história vinculada</option>';
  for (var indiceHistoria = 0; indiceHistoria < historias.length; indiceHistoria++) {
    var historia = historias[indiceHistoria];
    var selecionada = "";
    if (plotEmEdicao.historia == historia.id) {
      selecionada = " selected"; // deixa marcada a história que já estava escolhida
    }
    html += '<option value="' + historia.id + '"' + selecionada + '>' + protecaoCaractereEspecial(historia.nome) + '</option>';
  }
  html += '</select></div>';

  var classeBotaoCapitulos = "";
  var classeBotaoPalavras = "";
  var rotuloTamanho = "Nº de palavras";
  if (plotEmEdicao.medida == "capitulos") {
    classeBotaoCapitulos = "sel";
    rotuloTamanho = "Nº de capítulos";
  } else {
    classeBotaoPalavras = "sel";
  }

  html += '<div style="flex:2"><label>Como medir o tamanho?</label><div class="toggle">';
  html += '<button class="' + classeBotaoCapitulos + '" onclick="setMedida(\'capitulos\')">Capítulos</button>';
  html += '<button class="' + classeBotaoPalavras + '" onclick="setMedida(\'palavras\')">Palavras</button></div></div>';
  html += '<div><label>' + rotuloTamanho + '</label><input type="number" min="1" value="' + plotEmEdicao.total + '" oninput="plotEmEdicao.total=Number(this.value);atualizarCalculo()"></div></div>';
  html += '<div class="fila"><div><label>Palavras por capítulo</label><input type="number" min="1" value="' + plotEmEdicao.palavrasCap + '" oninput="plotEmEdicao.palavrasCap=Number(this.value);atualizarCalculo()"></div>';
  html += '<div style="flex:2"><div class="calc" id="calculo"></div></div></div>';
  html += '<label>Rascunho do plot</label><textarea oninput="plotEmEdicao.rascunho=this.value">' + protecaoCaractereEspecial(plotEmEdicao.rascunho) + '</textarea>';
  html += '<div class="rodape"><span></span><button class="btn" onclick="irPasso(2)">Próximo</button></div>';
  pegarElemento("passo").innerHTML = html;
  atualizarCalculo();
}

// Troca entre capítulos e palavras e coloca um valor padrão (50 capítulos ou 150000 palavras).
function setMedida(tipoMedida) {
  plotEmEdicao.medida = tipoMedida;
  if (tipoMedida == "palavras") {
    plotEmEdicao.total = 150000;
  } else {
    plotEmEdicao.total = 50;
  }
  renderWizard();
}

// Mostra a conta ao lado do campo.
function atualizarCalculo() {
  var textoCalculo;
  if (plotEmEdicao.medida == "capitulos") {
    textoCalculo = "≈ " + (plotEmEdicao.total * plotEmEdicao.palavrasCap) + " palavras no total";
  } else {
    textoCalculo = "≈ " + totalCapitulos(plotEmEdicao) + " capítulos (palavras ÷ média por capítulo)";
  }
  pegarElemento("calculo").innerHTML = textoCalculo;
  atualizarPrevia();
}

/* ---- Passo 2 ---- */

// PASSO 2 · ESTRUTURA: 4 cards para escolher. Com estrutura de atos, mostra uma linha por ato
// com slider (input range) colorido e o % ao lado. O slider do ÚLTIMO ato fica travado (disabled),
// porque ele é sempre o que sobra.
function passo2() {
  var html = '<h3>Como você quer estruturar esta história?</h3>';
  html += '<p class="peq">Cada estrutura distribui seus capítulos em atos. Você ajusta as proporções logo abaixo.</p><div class="estruturas">';
  var chavesEstruturas = ["livre", "3", "4", "5"];

  for (var indiceEstrutura = 0; indiceEstrutura < chavesEstruturas.length; indiceEstrutura++) {
    var chave = chavesEstruturas[indiceEstrutura];
    var estrutura = ESTRUTURAS[chave];
    var classeCss = "";
    if (plotEmEdicao.estrutura == chave) {
      classeCss = "sel";
    }
    html += '<div class="est ' + classeCss + '" onclick="setEstrutura(\'' + chave + '\')"><b>' + estrutura.nome + '</b><small>' + estrutura.subtitulo + '</small>';
    html += '<img class="grafico" src="../Img/Plot/' + estrutura.imagem + '" alt=""><ul>';
    if (estrutura.atos.length == 0) {
      html += '<li>Escreva do seu jeito, sem divisão</li>';
    }
    for (var indiceAto = 0; indiceAto < estrutura.atos.length; indiceAto++) {
      var rotuloAto = 'Ato ' + (indiceAto + 1) + ' · ' + estrutura.atos[indiceAto];
      if (chave == "4") {
        rotuloAto = estrutura.atos[indiceAto]; // Kishōtenketsu já tem o nome do ato (Ki, Shō...)
      }
      html += '<li><span class="bolinha" style="background:' + CORES[indiceAto] + '"></span>' + rotuloAto + '</li>';
    }
    html += '</ul></div>';
  }
  html += '</div>';

  if (plotEmEdicao.estrutura != "" && plotEmEdicao.estrutura != "livre") {
    var quantidadeCapitulos = plotEmEdicao.capitulos.length;
    html += '<div class="distribuicao-topo"><h3>Distribuição dos capítulos</h3><span class="peq">' + quantidadeCapitulos + ' capítulos no total</span></div>';
    for (var indiceLinha = 0; indiceLinha < plotEmEdicao.atos.length; indiceLinha++) {
      var travado = "";
      if (indiceLinha == plotEmEdicao.atos.length - 1) {
        travado = " disabled"; // último ato
      }
      html += '<div class="linha-ato"><span class="nome-ato">Ato ' + (indiceLinha + 1) + ' · ' + ESTRUTURAS[plotEmEdicao.estrutura].atos[indiceLinha] + '</span>';
      html += '<input type="range" id="slider' + indiceLinha + '" style="--cor:' + CORES[indiceLinha] + '" min="0" max="' + quantidadeCapitulos + '" value="' + plotEmEdicao.atos[indiceLinha] + '"' + travado + ' oninput="slider(' + indiceLinha + ',this.value)">';
      html += '<span class="rotulo-ato" id="rotulo' + indiceLinha + '"></span></div>';
    }
    html += '<div id="aviso"></div>';
  }
  html += '<div class="rodape"><button class="btn sec" onclick="irPasso(1)">Voltar</button><button class="btn" onclick="irPasso(3)">Próximo</button></div>';
  pegarElemento("passo").innerHTML = html;
  atualizarAtos();
}

// Ao clicar numa estrutura: guarda a escolha e calcula a divisão padrão. Livre = nenhum ato.
function setEstrutura(chaveEstrutura) {
  plotEmEdicao.estrutura = chaveEstrutura;
  ajustarCapitulos();
  if (chaveEstrutura == "livre") {
    plotEmEdicao.atos = [];
  } else {
    plotEmEdicao.atos = distribuir(plotEmEdicao.capitulos.length, ESTRUTURAS[chaveEstrutura].porcentagem);
  }
  renderWizard();
}

// REGRA DOS SLIDERS: mexer no ato "atoMexido" só altera os atos DEPOIS dele. Os anteriores nunca mudam.
// 1) "capitulosAntes" = soma dos atos anteriores. O ato mexido não pode passar do que sobra.
// 2) "capitulosRestantes" = capítulos que sobram para os atos seguintes. Eles são redistribuídos
//    mantendo a proporção que já tinham. Se estavam zerados, o próximo ato recebe tudo.
// 3) O último ato sempre recebe o que sobrou, para a soma continuar igual ao total.
function slider(atoMexido, valorSlider) {
  var quantidadeCapitulos = plotEmEdicao.capitulos.length;
  var atos = plotEmEdicao.atos;
  var indiceAto;
  var novoValor = Number(valorSlider);

  var capitulosAntes = 0;
  for (indiceAto = 0; indiceAto < atoMexido; indiceAto++) {
    capitulosAntes += atos[indiceAto];
  }
  if (novoValor > quantidadeCapitulos - capitulosAntes) {
    novoValor = quantidadeCapitulos - capitulosAntes;
  }

  var capitulosRestantes = quantidadeCapitulos - capitulosAntes - novoValor;
  var restantesAntigos = 0;
  for (indiceAto = atoMexido + 1; indiceAto < atos.length; indiceAto++) {
    restantesAntigos += atos[indiceAto];
  }

  atos[atoMexido] = novoValor;
  var capitulosJaUsados = 0;
  for (indiceAto = atoMexido + 1; indiceAto < atos.length; indiceAto++) {
    if (indiceAto == atos.length - 1) {
      atos[indiceAto] = capitulosRestantes - capitulosJaUsados;
    } else {
      if (restantesAntigos > 0) {
        atos[indiceAto] = Math.round(atos[indiceAto] * capitulosRestantes / restantesAntigos);
      } else if (indiceAto == atoMexido + 1) {
        atos[indiceAto] = capitulosRestantes;
      } else {
        atos[indiceAto] = 0;
      }
      if (atos[indiceAto] > capitulosRestantes - capitulosJaUsados) {
        atos[indiceAto] = capitulosRestantes - capitulosJaUsados;
      }
      capitulosJaUsados += atos[indiceAto];
    }
  }
  atualizarAtos();
}

// Atualiza sliders (posição e parte colorida), % ao lado, aviso e prévia.
// A parte colorida do slider é a variável CSS --preenchido (ver .linha-ato input[type=range] no plot.css).
function atualizarAtos() {
  if (plotEmEdicao.estrutura == "livre" || plotEmEdicao.estrutura == "") {
    atualizarPrevia();
    return;
  }
  var quantidadeCapitulos = plotEmEdicao.capitulos.length;
  for (var indiceAto = 0; indiceAto < plotEmEdicao.atos.length; indiceAto++) {
    var capitulosDoAto = plotEmEdicao.atos[indiceAto];
    var porcentagemAto = porcentagem(capitulosDoAto, quantidadeCapitulos);
    pegarElemento("rotulo" + indiceAto).innerHTML = porcentagemAto + "% · " + capitulosDoAto + " capítulos";
    var campoSlider = pegarElemento("slider" + indiceAto);
    campoSlider.value = capitulosDoAto;
    campoSlider.style.setProperty("--preenchido", porcentagemAto + "%");
  }

  var somaDosAtos = somaAtos();
  var aviso = "";
  if (somaDosAtos > quantidadeCapitulos) {
    aviso = '<div class="aviso">A soma dos atos (' + somaDosAtos + ') passa do total de ' + quantidadeCapitulos + ' capítulos. Aumente o número de capítulos no passo 1 para fazer isso.</div>';
  } else if (somaDosAtos < quantidadeCapitulos) {
    aviso = '<div class="aviso">Ainda faltam ' + (quantidadeCapitulos - somaDosAtos) + ' capítulos para distribuir.</div>';
  }
  pegarElemento("aviso").innerHTML = aviso;
  atualizarPrevia();
}

/* ---- Passo 3 ---- */

// PASSO 3 · DETALHAR: um cabeçalho por ato. Clicar abre ele (só o "atoAbertoAssistente" mostra os capítulos).
// Cada capítulo tem título editável, contador de cenas (− e +) e botão de plot twist.
function passo3() {
  var faixas = faixasAtos(plotEmEdicao);
  var html = '<div class="fila"><div><b>Detalhe capítulos e cenas</b><p class="peq">Dê títulos, defina as cenas e marque os plot twists. Dá para fazer depois.</p></div>';
  html += '<div style="flex:0 0 230px"><label style="margin:0">Cenas por capítulo (em lote)</label><div class="fila"><input type="number" id="cenasEmLote" min="0" value="4" style="width:70px"><button class="btn" onclick="aplicarTodos()">Aplicar a todos</button></div></div></div>';

  for (var indiceFaixa = 0; indiceFaixa < faixas.length; indiceFaixa++) {
    var faixa = faixas[indiceFaixa];
    var prefixoAto = "";
    if (plotEmEdicao.atos.length > 0) {
      prefixoAto = 'Ato ' + (indiceFaixa + 1) + ' · ';
    }
    html += '<div class="ato-cab" style="border-color:' + faixa.cor + '" onclick="atoAbertoAssistente=' + indiceFaixa + ';renderWizard()">' + prefixoAto + faixa.nome + ' · ' + (faixa.fim - faixa.inicio) + ' capítulos</div>';

    if (indiceFaixa == atoAbertoAssistente) {
      for (var indiceCapitulo = faixa.inicio; indiceCapitulo < faixa.fim; indiceCapitulo++) {
        var capitulo = plotEmEdicao.capitulos[indiceCapitulo];
        var classeTwist = "tw";
        if (capitulo.twist) {
          classeTwist = "tw on";
        }
        html += '<div class="cap-linha"><span>' + (indiceCapitulo + 1) + '</span>';
        html += '<input type="text" value="' + protecaoCaractereEspecial(capitulo.titulo) + '" oninput="plotEmEdicao.capitulos[' + indiceCapitulo + '].titulo=this.value">';
        html += '<span class="cenas-ctl">Cenas <button onclick="mudarCenas(' + indiceCapitulo + ',-1)">−</button> <b id="qtdCenas' + indiceCapitulo + '">' + capitulo.cenas.length + '</b> <button onclick="mudarCenas(' + indiceCapitulo + ',1)">+</button></span>';
        html += '<button class="' + classeTwist + '" onclick="toggleTwist(' + indiceCapitulo + ',this)">◆ Plot twist</button></div>';
      }
    }
  }
  html += '<div class="rodape"><button class="btn sec" onclick="irPasso(2)">Voltar</button><span><span class="link" onclick="irPasso(4)">Pular esta etapa</span> &nbsp; <button class="btn" onclick="irPasso(4)">Próximo</button></span></div>';
  pegarElemento("passo").innerHTML = html;
}

// Botões − e +: adiciona (push) ou remove (pop) uma cena no fim do capítulo.
// direcao = 1 (botão +) ou -1 (botão −)
function mudarCenas(indiceCapitulo, direcao) {
  var cenas = plotEmEdicao.capitulos[indiceCapitulo].cenas;
  if (direcao > 0) {
    cenas.push({ titulo: "Cena " + (cenas.length + 1), desc: "", escrita: false });
  } else if (cenas.length > 0) {
    cenas.pop();
  }
  pegarElemento("qtdCenas" + indiceCapitulo).innerHTML = cenas.length;
}

// Liga/desliga o plot twist do capítulo.
// "botaoClicado" é o próprio botão (o "this" no onclick).
// [FORA DAS LISTAS] botaoClicado.className = troca a classe CSS do botão (muda a cor dele).
function toggleTwist(indiceCapitulo, botaoClicado) {
  var capitulo = plotEmEdicao.capitulos[indiceCapitulo];
  if (capitulo.twist) {
    capitulo.twist = false;
    botaoClicado.className = "tw";
  } else {
    capitulo.twist = true;
    botaoClicado.className = "tw on";
  }
}

// "Aplicar a todos": deixa TODOS os capítulos com exatamente a quantidade de cenas digitada.
function aplicarTodos() {
  var cenasPorCapitulo = Number(pegarElemento("cenasEmLote").value);
  for (var indiceCapitulo = 0; indiceCapitulo < plotEmEdicao.capitulos.length; indiceCapitulo++) {
    var cenas = plotEmEdicao.capitulos[indiceCapitulo].cenas;
    while (cenas.length < cenasPorCapitulo) {
      cenas.push({ titulo: "Cena " + (cenas.length + 1), desc: "", escrita: false });
    }
    while (cenas.length > cenasPorCapitulo) {
      cenas.pop();
    }
  }
  renderWizard();
}

/* ---- Passo 4 ---- */

// PASSO 4 · REVISÃO: dois vetores do mesmo tamanho, um com os rótulos e outro com os valores.
// O for desenha uma linha para cada posição: rotulos[0] com valores[0], rotulos[1] com valores[1]...
function passo4() {
  var html = '<b>Tudo certo? Revise antes de criar.</b>';

  var historiaVinculada = buscarHistoriavincula(plotEmEdicao.historia);
  var textoHistoria = "Nenhuma história vinculada";
  if (historiaVinculada != null) {
    textoHistoria = protecaoCaractereEspecial(historiaVinculada.nome);
  }

  var textoTamanho = totalCapitulos(plotEmEdicao) + " capítulos · ~" + (totalCapitulos(plotEmEdicao) * plotEmEdicao.palavrasCap) + " palavras";

  // Monta "13 / 25 / 12 capítulos" juntando os números dos atos com " / " entre eles.
  var textoEstrutura = ESTRUTURAS[plotEmEdicao.estrutura].nome;
  if (plotEmEdicao.atos.length > 0) {
    var divisaoAtos = "";
    for (var indiceAto = 0; indiceAto < plotEmEdicao.atos.length; indiceAto++) {
      if (indiceAto > 0) {
        divisaoAtos += " / ";
      }
      divisaoAtos += plotEmEdicao.atos[indiceAto];
    }
    textoEstrutura += " · " + divisaoAtos + " capítulos";
  }

  var cenas = contarCenas(plotEmEdicao);
  var textoCenas;
  if (cenas.total == 0) {
    textoCenas = "Sem cenas planejadas · " + plotEmEdicao.capitulos.length + " capítulos";
  } else {
    textoCenas = cenas.total + " cenas planejadas";
  }

  // Lista dos plot twists: "Cap. 8, Título; Cap. 20, Título"
  var listaTwists = "";
  var quantidadeTwists = 0;
  for (var indiceCapitulo = 0; indiceCapitulo < plotEmEdicao.capitulos.length; indiceCapitulo++) {
    var capitulo = plotEmEdicao.capitulos[indiceCapitulo];
    if (capitulo.twist) {
      quantidadeTwists++;
      if (listaTwists != "") {
        listaTwists += "; ";
      }
      listaTwists += "Cap. " + (indiceCapitulo + 1) + ", " + protecaoCaractereEspecial(capitulo.titulo);
    }
  }
  var textoTwists = "Nenhum";
  if (quantidadeTwists > 0) {
    textoTwists = quantidadeTwists + " · " + listaTwists;
  }

  var rotulos = ["Nome", "História vinculada", "Estrutura", "Tamanho", "Cenas planejadas", "Plot twists", "Status inicial"];
  var valores = [protecaoCaractereEspecial(plotEmEdicao.nome), textoHistoria, textoEstrutura, textoTamanho, textoCenas, textoTwists, statusPlot(plotEmEdicao).texto];

  for (var indiceLinha = 0; indiceLinha < rotulos.length; indiceLinha++) {
    html += '<div class="resumo"><span>' + rotulos[indiceLinha] + '</span><b>' + valores[indiceLinha] + '</b></div>';
  }
  html += '<div class="rodape"><button class="btn sec" onclick="irPasso(3)">Voltar</button><button class="btn amarelo" onclick="criarPlot()">Criar plot</button></div>';
  pegarElemento("passo").innerHTML = html;
}

// Ao clicar em "Criar plot": envia ao banco (POST se for novo, PUT se for edição).
// Só atualiza a lista e volta à tela 1 se o banco confirmou.
// (async/await: ver explicação na seção 2)
async function criarPlot() {
  var plotNovo = false;
  if (idPlotEditando == null) {
    plotNovo = true;
  }
  var salvouComSucesso = await salvarPlot(plotEmEdicao, plotNovo);
  if (salvouComSucesso == false) {
    return;
  }
  // busca de novo no banco: ao vincular uma história, outro plot que estava
  // ligado a ela fica sem história, e a lista precisa mostrar isso
  plots = await carregarPlots();
  mostrarLista();
}


// ============================================================
// 6. TELA 6 · DETALHE DO PLOT
// ============================================================

// Abre a tela de detalhe começando no capítulo 1 do ato 1.
function abrirDetalhe(idPlot) {
  idPlotAberto = idPlot;
  capituloAberto = 0;
  atoAbertoSumario = 0;
  mostrarDetalhe();
}

// Cabeçalho (nome, status, barra, botões), sumário à esquerda e capítulo escolhido à direita.
function mostrarDetalhe() {
  var plot = acharPlot(idPlotAberto);
  var status = statusPlot(plot);
  var historiaVinculada = buscarHistoriavincula(plot.historia);
  var quantidadeCapitulos = plot.capitulos.length;
  var capitulosEscritos = contarCapsEscritos(plot);
  var quantidadeTwists = contarTwists(plot);

  var nomeHistoria = "Sem história vinculada";
  if (historiaVinculada != null) {
    nomeHistoria = protecaoCaractereEspecial(historiaVinculada.nome);
  }

  var html = '<span class="link" onclick="mostrarLista()">‹ Plots</span><div class="cabecalho"><div class="topo-pagina"><div>';
  html += '<h1 style="display:inline">' + protecaoCaractereEspecial(plot.nome) + '</h1> <span class="tag ' + status.classe + '">' + status.texto + '</span>';
  html += '<p class="peq" style="margin-top:6px">▫ ' + nomeHistoria + ' · ' + ESTRUTURAS[plot.estrutura].nome + ' · ' + quantidadeCapitulos + ' capítulos</p></div>';
  html += '<div><button class="btn borda" onclick="editarPlot(\'' + plot.id + '\')">Editar plot</button> <button class="btn sec" onclick="duplicar(\'' + plot.id + '\')">Duplicar modelo</button></div></div>';
  html += barraHTML(plot) + '<div class="linha"><span>' + porcentagem(capitulosEscritos, quantidadeCapitulos) + '% escrito · ' + capitulosEscritos + ' / ' + quantidadeCapitulos + ' capítulos</span><span>◆ ' + quantidadeTwists + ' plot twists</span></div></div>';

  // ---- sumário (esquerda) ----
  var faixas = faixasAtos(plot);
  html += '<div class="detalhe"><div class="painel"><b>Sumário</b> <span class="peq" style="float:right">' + quantidadeCapitulos + ' capítulos</span>';
  for (var indiceFaixa = 0; indiceFaixa < faixas.length; indiceFaixa++) {
    var faixa = faixas[indiceFaixa];
    var prefixoAto = "";
    if (plot.atos.length > 0) {
      prefixoAto = 'Ato ' + (indiceFaixa + 1) + ' · ';
    }
    html += '<div class="ato-cab" style="border-color:' + faixa.cor + '" onclick="atoAbertoSumario=' + indiceFaixa + ';mostrarDetalhe()">' + prefixoAto + faixa.nome + ' <span class="peq" style="float:right">Caps. ' + (faixa.inicio + 1) + '–' + faixa.fim + '</span></div>';

    if (indiceFaixa == atoAbertoSumario) {
      for (var indiceCapitulo = faixa.inicio; indiceCapitulo < faixa.fim; indiceCapitulo++) {
        var classeSelecionado = "";
        if (indiceCapitulo == capituloAberto) {
          classeSelecionado = "sel";
        }
        // Número com 2 dígitos: 1 -> "01", 12 -> "12"
        var numeroCapitulo = "" + (indiceCapitulo + 1);
        if (indiceCapitulo + 1 < 10) {
          numeroCapitulo = "0" + numeroCapitulo;
        }
        var losango = "";
        if (plot.capitulos[indiceCapitulo].twist) {
          losango = '<span style="color:#eab308">◆</span>';
        }
        html += '<div class="item-cap ' + classeSelecionado + '" onclick="capituloAberto=' + indiceCapitulo + ';mostrarDetalhe()"><span>' + numeroCapitulo + '</span><span style="flex:1">' + protecaoCaractereEspecial(plot.capitulos[indiceCapitulo].titulo) + '</span>' + losango + '</div>';
      }
    }
  }
  html += '</div>';

  // ---- capítulo (direita) ----
  var capitulo = plot.capitulos[capituloAberto];
  var etiquetaTwist = "";
  if (capitulo.twist) {
    etiquetaTwist = ' <span class="tag dourado">◆ Plot twist</span>';
  }
  html += '<div class="painel"><p class="peq">Capítulo ' + (capituloAberto + 1) + '</p><h1>' + protecaoCaractereEspecial(capitulo.titulo) + etiquetaTwist + '</h1>';
  html += '<label>Sinopse</label><textarea style="min-height:90px" onchange="salvarSinopse(this.value)">' + protecaoCaractereEspecial(capitulo.sinopse) + '</textarea>';
  html += '<div class="topo-pagina" style="margin-top:18px"><b>Cenas planejadas</b><span><span class="peq">' + contarEscritasCap(capitulo) + ' de ' + capitulo.cenas.length + ' escritas</span> <button class="btn" onclick="novaCena()">+ Nova cena</button></span></div>';

  if (capitulo.cenas.length == 0) {
    html += '<p class="peq" style="margin-top:12px">Nenhuma cena ainda. Clique em “Nova cena”.</p>';
  }
  for (var indiceCena = 0; indiceCena < capitulo.cenas.length; indiceCena++) {
    var cena = capitulo.cenas[indiceCena];

    // Mostra só os 90 primeiros caracteres da descrição.
    // substring(0, 90) = pedaço do texto da posição 0 até a 90 (Lista 06 · strings).
    var descricao = "Sem descrição";
    if (cena.desc != null && cena.desc != "") {
      descricao = protecaoCaractereEspecial(cena.desc.substring(0, 90));
    }

    var classeEtiqueta = "cinza";
    var textoEtiqueta = "Planejada";
    if (cena.escrita) {
      classeEtiqueta = "verde";
      textoEtiqueta = "Escrita";
    }
    html += '<div class="cena" onclick="abrirCena(' + indiceCena + ')"><div><b>' + protecaoCaractereEspecial(cena.titulo) + '</b><small>' + descricao + '</small></div><span class="tag ' + classeEtiqueta + '">' + textoEtiqueta + '</span></div>';
  }
  html += '</div></div>';
  pegarElemento("conteudo").innerHTML = html;
}

// Guarda a sinopse do capítulo e envia ao banco (chamada ao sair do campo).
function salvarSinopse(textoSinopse) {
  var plot = acharPlot(idPlotAberto);
  plot.capitulos[capituloAberto].sinopse = textoSinopse;
  salvarPlot(plot, false);
}

// Cria uma cena nova no capítulo aberto, salva no banco e abre a tela 7 para editá-la.
function novaCena() {
  var plot = acharPlot(idPlotAberto);
  var cenas = plot.capitulos[capituloAberto].cenas;
  cenas.push({ titulo: "Cena " + (cenas.length + 1), desc: "", escrita: false });
  salvarPlot(plot, false);
  abrirCena(cenas.length - 1);
}

// Tira o " (2)", " (3)"... do fim do nome, se tiver.  "Meu plot (2)" -> "Meu plot"
// Anda de trás para frente (while) conferindo: termina com ")", antes vêm números, antes "(" e um espaço.
function tirarNumeroDoFim(nome) {
  var ultimaPosicao = nome.length - 1;
  if (ultimaPosicao < 0 || nome[ultimaPosicao] != ")") {
    return nome; // não termina com ")": nome fica igual
  }
  var posicaoLetra = ultimaPosicao - 1;
  var quantidadeDigitos = 0;
  while (posicaoLetra >= 0 && nome[posicaoLetra] >= "0" && nome[posicaoLetra] <= "9") {
    posicaoLetra--;
    quantidadeDigitos++;
  }
  if (quantidadeDigitos > 0 && posicaoLetra >= 1 && nome[posicaoLetra] == "(" && nome[posicaoLetra - 1] == " ") {
    return nome.substring(0, posicaoLetra - 1); // corta tudo a partir do espaço
  }
  return nome;
}

// DUPLICAR: copia o plot e acha um nome livre testando (2), (3), (4)... até achar um que não existe.
// A cópia é enviada ao banco como plot NOVO e só então aparece na tela 1.
async function duplicar(idPlot) {
  var plotOriginal = acharPlot(idPlot);
  var plotCopia = copiarPlot(plotOriginal);
  var nomeBase = tirarNumeroDoFim(plotOriginal.nome);
  var numeroCopia = 2;
  var nomeJaExiste = true;

  while (nomeJaExiste) {
    nomeJaExiste = false;
    for (var indicePlot = 0; indicePlot < plots.length; indicePlot++) {
      if (plots[indicePlot].nome == nomeBase + " (" + numeroCopia + ")") {
        nomeJaExiste = true;
      }
    }
    if (nomeJaExiste) {
      numeroCopia++;
    }
  }

  plotCopia.nome = nomeBase + " (" + numeroCopia + ")";
  // a cópia é um modelo: não leva a história (cada história tem um plot só)
  plotCopia.historia = "";
  var salvouComSucesso = await salvarPlot(plotCopia, true);
  if (salvouComSucesso) {
    plots.push(plotCopia);
    mostrarLista();
  }
}


// ============================================================
// 7. TELA 7 · EDIÇÃO DE CENA
// ============================================================

// Guarda qual cena foi clicada e desenha a tela.
function abrirCena(indiceCena) {
  cenaAberta = indiceCena;
  mostrarCena();
}

// Mostra título, descrição e a caixinha "escrita".
function mostrarCena() {
  var plot = acharPlot(idPlotAberto);
  var capitulo = plot.capitulos[capituloAberto];
  var cena = capitulo.cenas[cenaAberta];

  var marcada = "";
  if (cena.escrita) {
    marcada = " checked"; // caixinha já vem marcada
  }

  var html = '<span class="link" onclick="mostrarDetalhe()">‹ ' + protecaoCaractereEspecial(plot.nome) + '</span>';
  html += '<h1>' + protecaoCaractereEspecial(cena.titulo) + '</h1><p class="sub">Capítulo ' + (capituloAberto + 1) + ' · ' + protecaoCaractereEspecial(capitulo.titulo) + '</p><div class="painel">';
  html += '<label>Título da cena</label><input type="text" id="campoTituloCena" value="' + protecaoCaractereEspecial(cena.titulo) + '">';
  html += '<label>Descrição da cena</label><textarea id="campoDescricaoCena">' + protecaoCaractereEspecial(cena.desc) + '</textarea>';
  html += '<label><input type="checkbox" id="caixaCenaEscrita"' + marcada + '> Marcar como escrita</label>';
  html += '<div class="rodape"><button class="btn sec" onclick="mostrarDetalhe()">Cancelar</button><span><button class="btn borda" onclick="excluirCena()">Excluir cena</button> <button class="btn" onclick="salvarCena()">Salvar</button></span></div></div>';
  pegarElemento("conteudo").innerHTML = html;
}

// Lê os campos, guarda na cena, salva no banco e volta ao capítulo.
// [FORA DAS LISTAS] .checked = true se a caixinha (checkbox) está marcada, false se não.
function salvarCena() {
  var plot = acharPlot(idPlotAberto);
  var cena = plot.capitulos[capituloAberto].cenas[cenaAberta];
  var tituloDigitado = pegarElemento("campoTituloCena").value;
  if (tituloDigitado != "") {
    cena.titulo = tituloDigitado; // título vazio não é aceito: mantém o antigo
  }
  cena.desc = pegarElemento("campoDescricaoCena").value;
  cena.escrita = pegarElemento("caixaCenaEscrita").checked;
  salvarPlot(plot, false);
  mostrarDetalhe();
}

// Exclui a cena aberta.
// [FORA DAS LISTAS] confirm("...") abre uma janelinha com OK e Cancelar: devolve true (OK) ou false.
// Para remover, monta um vetor NOVO com todas as cenas, menos a da posição cenaAberta.
function excluirCena() {
  if (confirm("Excluir esta cena?")) {
    var plot = acharPlot(idPlotAberto);
    var cenasAntigas = plot.capitulos[capituloAberto].cenas;
    var cenasNovas = [];
    for (var indiceCena = 0; indiceCena < cenasAntigas.length; indiceCena++) {
      if (indiceCena != cenaAberta) {
        cenasNovas.push(cenasAntigas[indiceCena]);
      }
    }
    plot.capitulos[capituloAberto].cenas = cenasNovas;
    salvarPlot(plot, false);
    mostrarDetalhe();
  }
}


// ============================================================
// 8. INÍCIO
// Fica por último de propósito: quando roda, todas as funções acima já existem.
// ============================================================

// PRIMEIRA COISA QUE RODA quando a página abre: busca histórias e plots no banco
// (await = espera chegar) e só depois desenha a tela 1.
// nome e inicial do usuário logado no rodapé do menu lateral (o login.js guardou no sessionStorage)
function preencherMenuUsuario() {
  var nome = sessionStorage.NOME_USUARIO || "Usuário";
  pegarElemento("nome_usuario_menu").textContent = nome;
  pegarElemento("inicial_usuario_menu").textContent = nome.charAt(0).toUpperCase();
}

async function iniciar() {
  preencherMenuUsuario();
  // sem usuário logado não dá para saber de quem são os plots
  if (idUsuario == undefined) {
    pegarElemento("conteudo").innerHTML =
      '<h1>Plots</h1><p class="sub">Você precisa entrar na sua conta para ver e criar plots. <a class="link" href="login.html">Entrar</a></p>';
    return;
  }
  historias = await carregarHistorias();
  plots = await carregarPlots();
  mostrarLista();
}
iniciar();
