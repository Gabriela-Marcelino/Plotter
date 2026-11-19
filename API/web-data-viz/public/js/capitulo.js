// =====================================================================
// TELA DO CAPÍTULO (editor de texto)
// =====================================================================
//
// Endereço da página: capitulo.html?historia=7&capitulo=31
//
// Rotas usadas (src/routes/capitulos.js):
//   GET /capitulos/buscar/:idCapitulo
//       [{ idCapitulo, idHistoria, numero, titulo, status, texto, palavras,
//          segundosDesdeSalvo, nomeHistoria, idUsuario, plotTwist }]
//   PUT /capitulos/salvar/:idCapitulo
//       recebe { idUsuarioServer, tituloServer, statusServer, textoServer, palavrasServer }
//
// O texto fica guardado como HTML. Cada cena começa com um marcador
// "CENA 1", "CENA 2"... (o <template id="template_marcador_cena">).
// =====================================================================


// =====================================================================
// CONSTANTES E ESTADO
// =====================================================================

var LISTA_STATUS = [
  { valor: "nao_escrito", nome: "Não escrito" },
  { valor: "escrevendo", nome: "Escrevendo" },
  { valor: "a_revisar", nome: "A revisar" },
  { valor: "revisado", nome: "Revisado" },
  { valor: "concluido", nome: "Concluído" },
  { valor: "publicado", nome: "Publicado" },
];

// tags que podem ficar no texto (o resto é removido ao carregar)
var TAGS_PERMITIDAS = ["P", "DIV", "BR", "B", "STRONG", "I", "EM", "U"];

var SEGUNDOS_AUTOSALVAR = 3; // salva sozinho 3 segundos depois de parar de digitar

var idUsuario = sessionStorage.ID_USUARIO; // usuário logado (guardado pelo login.js)

var parametros = new URLSearchParams(window.location.search);
var idHistoria = parametros.get("historia");
var idCapitulo = parametros.get("capitulo");

var capitulo = null;      // dados que vieram do banco
var statusAtual = "nao_escrito";
var alterado = false;     // tem mudança que ainda não foi salva?
var salvando = false;     // está salvando agora?
var momentoSalvo = null;  // quando foi salvo pela última vez (em milissegundos)
var temporizadorAutosalvar = null;


// =====================================================================
// ELEMENTOS DA TELA
// =====================================================================

var editor = document.getElementById("editor_texto_capitulo");
var inputTitulo = document.getElementById("ipt_titulo_capitulo");
var botaoStatus = document.getElementById("botao_status_capitulo");
var menuStatus = document.getElementById("menu_status_capitulo");
var textoStatus = document.getElementById("texto_status_capitulo");
var statusEditor = document.getElementById("status_editor_capitulo");
var contadorCenas = document.getElementById("contador_cenas_capitulo");


// =====================================================================
// FUNÇÕES AUXILIARES
// =====================================================================

function preencherMenuUsuario() {
  var nome = sessionStorage.NOME_USUARIO || "Usuário";
  document.getElementById("nome_usuario_menu").textContent = nome;
  document.getElementById("inicial_usuario_menu").textContent = nome.charAt(0).toUpperCase();
}

// 1 -> "01", 12 -> "12"
function doisDigitos(numero) {
  return numero < 10 ? "0" + numero : "" + numero;
}

function nomeDoStatus(valor) {
  for (var i = 0; i < LISTA_STATUS.length; i++) {
    if (LISTA_STATUS[i].valor == valor) return LISTA_STATUS[i].nome;
  }
  return "";
}

// 3287 -> "3.287"
function formatarNumero(numero) {
  return Number(numero).toLocaleString("pt-BR");
}

// 45 -> "salvo agora", 130 -> "salvo há 2 min"
function textoTempoSalvo(segundos) {
  if (segundos < 60) return "salvo agora";
  var minutos = Math.floor(segundos / 60);
  if (minutos < 60) return "salvo há " + minutos + " min";
  var horas = Math.floor(minutos / 60);
  if (horas < 24) return "salvo há " + horas + " h";
  var dias = Math.floor(horas / 24);
  return dias == 1 ? "salvo há 1 dia" : "salvo há " + dias + " dias";
}


// =====================================================================
// TEXTO: limpar o HTML salvo e montar os marcadores de cena
// =====================================================================

// cria um marcador "CENA N" a partir do <template>
function criarMarcadorCena() {
  return document.getElementById("template_marcador_cena").content.firstElementChild.cloneNode(true);
}

// Copia só o que é permitido (parágrafos, negrito, itálico, sublinhado e
// marcadores de cena). Assim nenhum código estranho entra no editor.
// FORA DO CONTEÚDO: o conteúdo de um <template> não roda scripts nem carrega imagens.
function copiarPermitidos(origem, destino) {
  var filhos = origem.childNodes;
  for (var i = 0; i < filhos.length; i++) {
    var no = filhos[i];
    if (no.nodeType == Node.TEXT_NODE) {
      destino.appendChild(document.createTextNode(no.textContent));
    } else if (no.nodeType == Node.ELEMENT_NODE) {
      if (no.classList.contains("marcador_cena")) {
        destino.appendChild(criarMarcadorCena());
      } else if (TAGS_PERMITIDAS.indexOf(no.tagName) != -1) {
        var copia = document.createElement(no.tagName);
        copiarPermitidos(no, copia);
        destino.appendChild(copia);
      } else {
        // tag não permitida: mantém só o que está dentro dela
        copiarPermitidos(no, destino);
      }
    }
  }
}

function carregarTextoNoEditor(html) {
  var modelo = document.createElement("template");
  modelo.innerHTML = html || "";
  editor.innerHTML = "";
  copiarPermitidos(modelo.content, editor);
}

// numera os marcadores na ordem em que aparecem: Cena 1, Cena 2...
function renumerarCenas() {
  var marcadores = editor.querySelectorAll(".marcador_cena");
  for (var i = 0; i < marcadores.length; i++) {
    marcadores[i].querySelector(".rotulo_marcador_cena").textContent = "Cena " + (i + 1);
  }
  var quantidade = marcadores.length;
  contadorCenas.textContent = quantidade == 1 ? "1 cena" : quantidade + " cenas";
}

// conta as palavras do texto (sem contar os rótulos "CENA 1")
function contarPalavras() {
  var copia = editor.cloneNode(true);
  copia.querySelectorAll(".marcador_cena").forEach(function (m) { m.remove(); });
  // um espaço depois de cada parágrafo/quebra para as palavras não grudarem
  copia.querySelectorAll("p, div, br").forEach(function (bloco) { bloco.after(" "); });
  var texto = copia.textContent.trim();
  if (texto == "") return 0;
  return texto.split(/\s+/).length;
}


// =====================================================================
// RODAPÉ DA BARRA: "3.287 palavras · salvo há 2 min"
// =====================================================================

function atualizarStatusEditor() {
  var palavras = contarPalavras();
  var texto = formatarNumero(palavras) + (palavras == 1 ? " palavra" : " palavras") + " · ";

  if (salvando) {
    texto += "salvando…";
  } else if (alterado) {
    texto += "alterações não salvas";
  } else if (momentoSalvo == null) {
    texto += "ainda não salvo";
  } else {
    texto += textoTempoSalvo(Math.floor((Date.now() - momentoSalvo) / 1000));
  }
  statusEditor.textContent = texto;
}


// =====================================================================
// STATUS DO CAPÍTULO (menu "Escrevendo", "A revisar"...)
// =====================================================================

function aplicarStatus(valor) {
  statusAtual = valor;
  botaoStatus.dataset.status = valor; // o CSS pinta a bolinha pela cor do status
  textoStatus.textContent = nomeDoStatus(valor);
  // marca com o check a opção escolhida
  menuStatus.querySelectorAll(".opcao_status_capitulo").forEach(function (opcao) {
    opcao.setAttribute("aria-current", String(opcao.dataset.status == valor));
  });
}

function abrirMenuStatus(abrir) {
  menuStatus.hidden = !abrir;
  botaoStatus.setAttribute("aria-expanded", String(abrir));
}

botaoStatus.addEventListener("click", function () {
  abrirMenuStatus(menuStatus.hidden);
});

menuStatus.querySelectorAll(".opcao_status_capitulo").forEach(function (opcao) {
  opcao.addEventListener("click", function () {
    aplicarStatus(opcao.dataset.status);
    abrirMenuStatus(false);
    marcarAlterado();
  });
});

// clicar fora do menu ou apertar Esc fecha o menu
document.addEventListener("click", function (evento) {
  if (!menuStatus.hidden && !evento.target.closest(".seletor_status_capitulo")) {
    abrirMenuStatus(false);
  }
});
document.addEventListener("keydown", function (evento) {
  if (evento.key == "Escape") abrirMenuStatus(false);
});


// =====================================================================
// BARRA DE FERRAMENTAS (B, I, U)
// =====================================================================

// FORA DO CONTEÚDO: document.execCommand aplica negrito/itálico/sublinhado
// no texto selecionado de um elemento "contenteditable".
document.querySelectorAll(".botao_formatacao_editor").forEach(function (botao) {
  // mousedown + preventDefault: clicar no botão não tira a seleção do texto
  botao.addEventListener("mousedown", function (evento) { evento.preventDefault(); });
  botao.addEventListener("click", function () {
    editor.focus();
    document.execCommand(botao.dataset.comando);
    atualizarBotoesFormatacao();
    marcarAlterado();
  });
});

// deixa o botão "apertado" quando o cursor está num texto em negrito, por exemplo
function atualizarBotoesFormatacao() {
  document.querySelectorAll(".botao_formatacao_editor").forEach(function (botao) {
    var ativo = editor.contains(document.getSelection().anchorNode) && document.queryCommandState(botao.dataset.comando);
    botao.setAttribute("aria-pressed", String(ativo));
  });
}
document.addEventListener("selectionchange", atualizarBotoesFormatacao);


// =====================================================================
// NOVA CENA
// =====================================================================

// bloco do editor (filho direto) onde o cursor está, ou null
function blocoDoCursor() {
  var selecao = document.getSelection();
  if (selecao.rangeCount == 0 || !editor.contains(selecao.anchorNode)) return null;
  var no = selecao.anchorNode;
  while (no && no.parentNode != editor) {
    no = no.parentNode;
  }
  return no;
}

// coloca o cursor dentro de um elemento
function colocarCursorEm(elemento) {
  var intervalo = document.createRange();
  intervalo.selectNodeContents(elemento);
  intervalo.collapse(true);
  var selecao = document.getSelection();
  selecao.removeAllRanges();
  selecao.addRange(intervalo);
}

// "+ Cena": coloca um marcador depois do parágrafo onde está o cursor
// (ou no final do texto) e um parágrafo vazio para começar a escrever
function inserirCena() {
  var marcador = criarMarcadorCena();
  var paragrafo = document.createElement("p");
  paragrafo.appendChild(document.createElement("br"));

  var bloco = blocoDoCursor();
  if (bloco) {
    bloco.after(marcador, paragrafo);
  } else {
    editor.append(marcador, paragrafo);
  }

  renumerarCenas();
  editor.focus();
  colocarCursorEm(paragrafo);
  paragrafo.scrollIntoView({ block: "nearest" });
  marcarAlterado();
}

document.getElementById("botao_nova_cena").addEventListener("click", inserirCena);


// =====================================================================
// DIGITAÇÃO
// =====================================================================

// Enter cria <p> (e não <div>)
document.execCommand("defaultParagraphSeparator", false, "p");

editor.addEventListener("input", function () {
  renumerarCenas(); // um marcador pode ter sido apagado
  // começou a escrever um capítulo "não escrito": vira "escrevendo"
  if (statusAtual == "nao_escrito" && contarPalavras() > 0) {
    aplicarStatus("escrevendo");
  }
  marcarAlterado();
});

// colar: entra só o texto puro (sem cores, fontes e tamanhos de outros sites)
editor.addEventListener("paste", function (evento) {
  evento.preventDefault();
  var texto = evento.clipboardData.getData("text/plain");
  document.execCommand("insertText", false, texto);
});

inputTitulo.addEventListener("input", marcarAlterado);
inputTitulo.addEventListener("keydown", function (evento) {
  if (evento.key == "Enter") {
    evento.preventDefault();
    editor.focus(); // Enter no título leva para o texto
  }
});


// =====================================================================
// SALVAR
// =====================================================================

// guarda que tem mudança e agenda o salvamento automático
function marcarAlterado() {
  alterado = true;
  atualizarStatusEditor();
  clearTimeout(temporizadorAutosalvar);
  if (idUsuario != undefined) {
    temporizadorAutosalvar = setTimeout(function () { salvar(false); }, SEGUNDOS_AUTOSALVAR * 1000);
  }
}

// finalizar = true: muda o status para "Concluído" e volta para a história
function salvar(finalizar) {
  clearTimeout(temporizadorAutosalvar);

  if (idUsuario == undefined) {
    alert("Entre na sua conta para salvar o capítulo.");
    return;
  }
  if (salvando) return; // já está salvando

  if (finalizar) aplicarStatus("concluido");

  salvando = true;
  alterado = false; // se mudar algo enquanto salva, volta a ser true
  atualizarStatusEditor();

  fetch("/capitulos/salvar/" + idCapitulo, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      idUsuarioServer: idUsuario,
      tituloServer: inputTitulo.value,
      statusServer: statusAtual,
      textoServer: editor.innerHTML,
      palavrasServer: contarPalavras(),
    }),
  })
    .then(function (resposta) {
      salvando = false;
      if (resposta.ok) {
        momentoSalvo = Date.now();
        atualizarStatusEditor();
        if (finalizar) {
          window.location.href = "historia.html?id=" + capitulo.idHistoria;
        } else if (alterado) {
          marcarAlterado(); // mudou algo enquanto salvava: agenda de novo
        }
      } else {
        alterado = true;
        atualizarStatusEditor();
        resposta.text().then(function (motivo) {
          alert("Não foi possível salvar o capítulo. " + motivo);
        });
      }
    })
    .catch(function (erro) {
      console.log(erro);
      salvando = false;
      alterado = true;
      atualizarStatusEditor();
      alert("Erro ao conectar com o servidor. Seu texto continua aqui; tente salvar de novo.");
    });
}

document.getElementById("botao_salvar_capitulo").addEventListener("click", function () { salvar(false); });
document.getElementById("botao_finalizar_capitulo").addEventListener("click", function () { salvar(true); });

// Ctrl+S (ou Cmd+S no Mac) salva
document.addEventListener("keydown", function (evento) {
  if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() == "s") {
    evento.preventDefault();
    salvar(false);
  }
});

// avisa antes de fechar a aba com alterações não salvas
window.addEventListener("beforeunload", function (evento) {
  if (alterado || salvando) {
    evento.preventDefault();
    evento.returnValue = "";
  }
});

// atualiza o "salvo há X min" a cada 30 segundos
setInterval(atualizarStatusEditor, 30000);


// =====================================================================
// CARREGAR O CAPÍTULO
// =====================================================================

function renderizarCapitulo() {
  var rotuloNumero = "Capítulo " + doisDigitos(capitulo.numero);
  document.title = rotuloNumero + " · " + capitulo.nomeHistoria + " · Plotter";

  // link "‹ Nome da história"
  document.getElementById("link_voltar_historia").href = "historia.html?id=" + capitulo.idHistoria;
  document.getElementById("nome_historia_voltar").textContent = capitulo.nomeHistoria;

  // "Capítulo 08" em cima do título
  document.getElementById("numero_capitulo").textContent = rotuloNumero;
  inputTitulo.value = capitulo.titulo || "";
  inputTitulo.placeholder = rotuloNumero; // título vazio mostra "Capítulo 08"

  // etiqueta de plot twist (capítulo marcado no plot)
  if (capitulo.plotTwist == 1) {
    document.getElementById("texto_etiqueta_plot_capitulo").textContent = "Plot twist";
    document.getElementById("etiqueta_plot_capitulo").hidden = false;
  }

  aplicarStatus(capitulo.status);
  carregarTextoNoEditor(capitulo.texto);
  renumerarCenas();

  if (capitulo.segundosDesdeSalvo != null) {
    momentoSalvo = Date.now() - capitulo.segundosDesdeSalvo * 1000;
  }
  atualizarStatusEditor();
}

function carregarCapitulo() {
  fetch("/capitulos/buscar/" + idCapitulo)
    .then(function (resposta) {
      if (!resposta.ok) {
        statusEditor.textContent = "Não foi possível carregar o capítulo.";
        return;
      }
      resposta.json().then(function (resultado) {
        capitulo = resultado[0];
        // não existe, ou é de outro usuário: volta para a lista de histórias
        if (!capitulo || (idUsuario != undefined && String(capitulo.idUsuario) != String(idUsuario))) {
          window.location.href = "historias.html";
          return;
        }
        renderizarCapitulo();
      });
    })
    .catch(function (erro) {
      console.log(erro);
      statusEditor.textContent = "Erro ao conectar com o servidor.";
    });
}


// =====================================================================
// INICIALIZAÇÃO
// =====================================================================

preencherMenuUsuario();
if (!idCapitulo) {
  // sem capítulo no endereço: volta para a história (ou para a lista)
  window.location.href = idHistoria ? "historia.html?id=" + idHistoria : "historias.html";
} else {
  carregarCapitulo();
}
