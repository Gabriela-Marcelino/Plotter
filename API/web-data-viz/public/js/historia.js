// =====================================================================
// O QUE ESTA TELA ESPERA RECEBER DO BANCO (via API)
// =====================================================================
//
// Esta tela pede os dados para o servidor (app.js) usando "fetch".
// As rotas abaixo estão em src/routes/historias.js e src/routes/capitulos.js
// (routes -> controller -> model), igual foi feito para /usuarios.
// Os nomes dos campos são sugestões: se no seu banco o nome for outro,
// é só trocar aqui no JS também.
//
// 1) GET /historias/buscar/:idHistoria
//    devolve um vetor com 1 história (ou vazio, se não existir):
//    [{ idHistoria, nome, classificacao, capa, cor, temPlot, nomeMundo }]
//      - classificacao: "livre", "10", "12", "14", "16" ou "18"
//      - capa: endereço da imagem (ou null)
//      - cor: cor usada quando não tem capa (ex.: "#6b4bc0") (ou null)
//      - temPlot: 1 se a história foi criada a partir de um plot, 0 se não
//      - nomeMundo: nome do mundo (JOIN com a tabela de mundos) (ou null)
//
// 2) GET /historias/generos/:idHistoria
//    [{ nome }, { nome }, ...]
//
// 3) GET /capitulos/listar/:idHistoria
//    vetor JÁ ORDENADO pelo número (ORDER BY numero no SELECT):
//    [{ idCapitulo, numero, titulo, status, qtdCenas }, ...]
//      - qtdCenas: pode vir de um COUNT na tabela de cenas
//
// 4) POST /capitulos/criar
//    recebe: { idHistoriaServer, numeroServer }
//    devolve: { idCapitulo } do capítulo que acabou de ser criado
//
// =====================================================================


// =====================================================================
// CONSTANTES
// =====================================================================

// Vetor de objetos JSON com todos os status de capítulo.
// - valor: o que fica guardado no banco
// - nome: o texto que aparece na tela
// - contaNoProgresso: se esse status entra na conta da barra de progresso
var LISTA_STATUS = [
  { valor: "nao_escrito", nome: "Não escrito", contaNoProgresso: false },
  { valor: "escrevendo", nome: "Escrevendo", contaNoProgresso: false },
  { valor: "a_revisar", nome: "A revisar", contaNoProgresso: true },
  { valor: "revisado", nome: "Revisado", contaNoProgresso: true },
  { valor: "concluido", nome: "Concluído", contaNoProgresso: true },
  { valor: "publicado", nome: "Publicado", contaNoProgresso: true },
];

// quantos cards aparecem antes de clicar em "Ver todos"
var CAPITULOS_POR_PAGINA = 16;

// "estado" da tela (variáveis que mudam quando a usuária clica nos botões)
var filtroStatus = ""; // "" = sem filtro; senão guarda o status filtrado
var mostrarTodos = false; // false = mostra só os 16 primeiros

// capítulos que vieram do banco (guardados aqui para não precisar
// buscar de novo toda vez que a usuária clica em um filtro)
var capitulos = [];


// =====================================================================
// FUNÇÕES AUXILIARES
// =====================================================================

// Verifica se um valor está dentro de um vetor (true ou false).
function estaNaLista(valor, lista) {
  for (var i = 0; i < lista.length; i++) {
    if (lista[i] == valor) {
      return true;
    }
  }
  return false;
}

// Devolve o nome bonito de um status ("a_revisar" -> "A revisar").
function nomeDoStatus(valor) {
  for (var i = 0; i < LISTA_STATUS.length; i++) {
    if (LISTA_STATUS[i].valor == valor) {
      return LISTA_STATUS[i].nome;
    }
  }
  return "";
}

// Diz se um status entra na conta do progresso (true ou false).
function statusContaNoProgresso(valor) {
  for (var i = 0; i < LISTA_STATUS.length; i++) {
    if (LISTA_STATUS[i].valor == valor) {
      return LISTA_STATUS[i].contaNoProgresso;
    }
  }
  return false;
}

// "Ecos de Cinza" -> "EC"
function gerarIniciais(nome) {
  var ignorar = ["a", "o", "as", "os", "de", "da", "do", "das", "dos", "e", "em", "na", "no"];
  var palavras = nome.split(" "); // separa o nome em um vetor de palavras
  var iniciais = "";

  // 1ª tentativa: pega a 1ª letra das palavras que NÃO estão na lista "ignorar"
  for (var i = 0; i < palavras.length && iniciais.length < 2; i++) {
    var palavra = palavras[i];
    if (palavra != "" && !estaNaLista(palavra.toLowerCase(), ignorar)) {
      iniciais = iniciais + palavra[0].toUpperCase();
    }
  }

  // 2ª tentativa: se o nome só tinha palavras ignoradas (ex.: "O"), usa qualquer palavra
  if (iniciais == "") {
    for (var j = 0; j < palavras.length && iniciais.length < 2; j++) {
      if (palavras[j] != "") {
        iniciais = iniciais + palavras[j][0].toUpperCase();
      }
    }
  }

  return iniciais;
}

// transforma 1 em "01", 12 em "12"
function doisDigitos(numero) {
  if (numero < 10) {
    return "0" + numero;
  } else {
    return "" + numero;
  }
}

// "1 cena" / "4 cenas" / "0 cenas"
function textoCenas(quantidade) {
  if (quantidade == 1) {
    return quantidade + " cena";
  } else {
    return quantidade + " cenas";
  }
}

// Preenche o menu lateral com o nome do usuário logado.
// FORA DO CONTEÚDO: "sessionStorage" é onde o login.js guardou o nome do
// usuário quando ele entrou (vale enquanto a aba estiver aberta).
function preencherMenuUsuario() {
  var nome = sessionStorage.NOME_USUARIO;
  if (nome == undefined || nome == "") {
    nome = "Usuário";
  }
  nome_usuario_menu.innerHTML = nome;
  inicial_usuario_menu.innerHTML = nome[0].toUpperCase();
}

// Descobre o id da história que está no endereço da página.
// Ex.: "historia.html?id=7" -> "7"
// FORA DO CONTEÚDO: "window.location.search" é a parte do endereço da página
// que vem depois do "?" (incluindo o "?"). Ex.: "?id=7".
function lerIdDaUrl() {
  var parametros = window.location.search; // "?id=7"
  var posicao = parametros.indexOf("id="); // onde começa o "id="

  if (posicao == -1) {
    return ""; // não tem id no endereço
  }

  // pega tudo que vem depois do "id=" até o próximo "&" (ou até o final)
  var id = "";
  var i = posicao + 3;
  while (i < parametros.length && parametros[i] != "&") {
    id = id + parametros[i];
    i++;
  }
  return id;
}

var idHistoria = lerIdDaUrl();


// =====================================================================
// SOBRE O "fetch" (FORA DO CONTEÚDO)
// =====================================================================
//
// "fetch(endereco)" pede dados para o servidor. Como o servidor demora um
// pouquinho para responder, o resultado não chega na hora. Por isso usamos:
//
//   fetch(endereco).then(function (resposta) { ... })
//     -> o código dentro do "then" só roda QUANDO a resposta chegar.
//
//   resposta.ok
//     -> true se o servidor respondeu sem erro.
//
//   resposta.json().then(function (dados) { ... })
//     -> transforma a resposta em JSON (vetor/objeto) e entrega em "dados".
//
//   .catch(function (erro) { ... })
//     -> roda se não deu nem para falar com o servidor (ex.: servidor desligado).
//
// É o mesmo formato que você já usa no login.js.
// =====================================================================


// =====================================================================
// CABEÇALHO DA HISTÓRIA (capa, nome, selo, mundo)
// =====================================================================

function carregarHistoria() {
  fetch("/historias/buscar/" + idHistoria)
    .then(function (resposta) {
      if (resposta.ok) {
        resposta.json().then(function (resultado) {
          if (resultado.length == 0) {
            // o id da URL não existe no banco: volta para a lista de histórias
            // FORA DO CONTEÚDO: mudar "window.location.href" abre outra página.
            window.location.href = "historias.html";
          } else {
            renderizarCabecalho(resultado[0]);
          }
        });
      } else {
        titulo_historia.innerHTML = "Não foi possível carregar a história.";
      }
    })
    .catch(function (erro) {
      console.log(erro);
      titulo_historia.innerHTML = "Erro ao conectar com o servidor.";
    });
}

function renderizarCabecalho(historia) {
  // FORA DO CONTEÚDO: "document.title" é o texto que aparece na aba do navegador.
  document.title = historia.nome + " · Plotter";

  // ---- capa ----
  if (historia.capa) {
    area_capa_historia.innerHTML =
      "<div class='capa_cabecalho_historia'>" +
      "<img src='" + historia.capa + "' alt='Capa da história'>" +
      "</div>";
  } else {
    // sem capa: cor de fundo + iniciais
    var corCapa = "#6b4bc0";
    if (historia.cor) {
      corCapa = historia.cor;
    }
    // "style='--cor-historia: ...'" passa a cor para o CSS usar no fundo da capa
    area_capa_historia.innerHTML =
      "<div class='capa_cabecalho_historia' style='--cor-historia: " + corCapa + "'>" +
      "<span class='iniciais_cabecalho_historia'>" + gerarIniciais(historia.nome) + "</span>" +
      "</div>";
  }

  // ---- nome ----
  titulo_historia.innerHTML = historia.nome;

  // ---- selo de classificação ----
  var textoSelo = historia.classificacao;
  if (historia.classificacao == "livre") {
    textoSelo = "L";
  }
  // o CSS usa "data-classificacao" para escolher a cor do selo
  area_selo_historia.innerHTML =
    "<span class='selo_classificacao_historia' data-classificacao='" + historia.classificacao + "'>" +
    textoSelo +
    "</span>";

  // ---- mundo (só aparece se a história tiver um mundo) ----
  if (historia.nomeMundo) {
    area_mundo_historia.innerHTML =
      "<div class='mundo_cabecalho_historia'>" +
      "<img src='../Img/Dashboard/icon-mundos.svg' alt=''>" +
      "<p>" + historia.nomeMundo + "</p>" +
      "</div>";
  } else {
    area_mundo_historia.innerHTML = "";
  }

  // ---- botão "Editar história" ----
  // ".href" é o endereço para onde o link leva (igual ao ".type" que você
  // muda no login.js para mostrar a senha)
  botao_editar_historia.href = "historia-formulario.html?id=" + idHistoria;

  // ---- botão "+ Capítulo": só aparece em histórias SEM plot ----
  // (com plot, os capítulos já nasceram automaticamente)
  if (historia.temPlot == 1) {
    area_botao_novo_capitulo.innerHTML = "";
  } else {
    area_botao_novo_capitulo.innerHTML =
      "<button type='button' class='botao_novo_capitulo' onclick='criarNovoCapitulo()'>" +
      "<img src='../Img/Historia/icon-mais.svg' alt=''>" +
      "<span>Capítulo</span>" +
      "</button>";
  }
}


// =====================================================================
// GÊNEROS
// =====================================================================

function carregarGeneros() {
  fetch("/historias/generos/" + idHistoria)
    .then(function (resposta) {
      if (resposta.ok) {
        resposta.json().then(function (generos) {
          var html = "";
          for (var i = 0; i < generos.length; i++) {
            html += "<li class='tag_genero_historia'>" + generos[i].nome + "</li>";
          }
          lista_generos_cabecalho_historia.innerHTML = html;
        });
      }
    })
    .catch(function (erro) {
      console.log(erro);
    });
}


// =====================================================================
// CAPÍTULOS (busca no banco)
// =====================================================================

function carregarCapitulos() {
  fetch("/capitulos/listar/" + idHistoria)
    .then(function (resposta) {
      if (resposta.ok) {
        resposta.json().then(function (resultado) {
          capitulos = resultado; // guarda na variável global
          renderizarCapitulos();
        });
      } else {
        area_mensagem_sem_capitulos.innerHTML =
          "<p class='mensagem_sem_capitulos'>Não foi possível carregar os capítulos.</p>";
      }
    })
    .catch(function (erro) {
      console.log(erro);
      area_mensagem_sem_capitulos.innerHTML =
        "<p class='mensagem_sem_capitulos'>Erro ao conectar com o servidor.</p>";
    });
}


// =====================================================================
// PROGRESSO (lado direito do cabeçalho)
// =====================================================================

function renderizarProgresso() {
  var total = capitulos.length;
  var feitos = 0; // capítulos a revisar, revisados, concluídos ou publicados
  var publicados = 0;

  for (var i = 0; i < capitulos.length; i++) {
    if (statusContaNoProgresso(capitulos[i].status)) {
      feitos++;
    }
    if (capitulos[i].status == "publicado") {
      publicados++;
    }
  }

  // porcentagem (o if evita dividir por zero quando não há capítulos)
  // FORA DO CONTEÚDO: "Math.round(numero)" arredonda para o inteiro mais próximo.
  var porcentagem = 0;
  if (total > 0) {
    porcentagem = Math.round((feitos / total) * 100);
  }

  var textoPublicados = " publicados";
  if (publicados == 1) {
    textoPublicados = " publicado";
  }

  valor_progresso_historia.innerHTML = feitos + " / " + total + " capítulos";
  // a largura da barra roxa vem da variável CSS "--progresso"
  area_barra_progresso_historia.innerHTML =
    "<div class='preenchimento_progresso_historia' style='--progresso: " + porcentagem + "%'></div>";
  detalhe_progresso_historia.innerHTML =
    porcentagem + "% concluído · " + publicados + textoPublicados;
}


// =====================================================================
// FILTROS DE STATUS
// =====================================================================

function renderizarFiltros() {
  // se não há capítulos, não faz sentido mostrar filtros
  if (capitulos.length == 0) {
    filtros_status_capitulos.innerHTML = "";
    return;
  }

  var html = "";

  for (var s = 0; s < LISTA_STATUS.length; s++) {
    var status = LISTA_STATUS[s];

    // conta quantos capítulos têm esse status
    var quantidade = 0;
    for (var c = 0; c < capitulos.length; c++) {
      if (capitulos[c].status == status.valor) {
        quantidade++;
      }
    }

    // "aria-pressed='true'" faz o CSS destacar o filtro que está ativo
    var ativo = "false";
    if (status.valor == filtroStatus) {
      ativo = "true";
    }

    // ao clicar, chama filtrarPorStatus passando o status deste botão
    html +=
      "<button type='button' class='filtro_status_capitulo' data-status='" + status.valor + "' aria-pressed='" + ativo + "'" +
      " onclick=\"filtrarPorStatus('" + status.valor + "')\">" +
      "<span class='bolinha_status'></span>" +
      "<span class='nome_filtro_status'>" + status.nome + "</span>" +
      "<span class='contador_filtro_status'>" + quantidade + "</span>" +
      "</button>";
  }

  filtros_status_capitulos.innerHTML = html;
}

// Clique em um filtro. Clicar de novo no mesmo filtro remove o filtro.
function filtrarPorStatus(status) {
  if (filtroStatus == status) {
    filtroStatus = "";
  } else {
    filtroStatus = status;
  }
  mostrarTodos = false; // volta para a primeira página
  renderizarCapitulos();
}


// =====================================================================
// CARDS DE CAPÍTULOS
// =====================================================================

// Monta o HTML de um card de capítulo.
function criarCardCapitulo(capitulo) {
  var rotuloNumero = "Capítulo " + doisDigitos(capitulo.numero);

  // se o título estiver vazio, usa "Capítulo 01"
  var titulo = rotuloNumero;
  if (capitulo.titulo) {
    titulo = capitulo.titulo;
  }

  // o CSS usa "data-status" para pintar a faixa lateral e a bolinha
  return (
    "<a href='capitulo.html?historia=" + idHistoria + "&capitulo=" + capitulo.idCapitulo + "'" +
    " class='card_capitulo' data-status='" + capitulo.status + "'>" +
    "<div class='cabecalho_card_capitulo'>" +
    "<span class='etiqueta_status_capitulo'>" +
    "<span class='bolinha_status'></span>" +
    "<span class='texto_status_capitulo'>" + nomeDoStatus(capitulo.status) + "</span>" +
    "</span>" +
    "<p class='numero_card_capitulo'>" + rotuloNumero + "</p>" +
    "</div>" +
    "<h3 class='titulo_card_capitulo'>" + titulo + "</h3>" +
    "<div class='rodape_card_capitulo'>" +
    "<img src='../Img/Historia/icon-cenas.svg' alt=''>" +
    "<p class='contagem_cenas_card_capitulo'>" + textoCenas(capitulo.qtdCenas) + "</p>" +
    "</div>" +
    "</a>"
  );
}

// Desenha progresso, filtros, cards e rodapé usando a variável "capitulos".
function renderizarCapitulos() {
  renderizarProgresso();
  renderizarFiltros();

  // aplica o filtro de status, se houver
  var filtrados = [];
  for (var i = 0; i < capitulos.length; i++) {
    if (filtroStatus == "" || capitulos[i].status == filtroStatus) {
      filtrados.push(capitulos[i]);
    }
  }

  // decide quantos cards mostrar: todos, ou só os 16 primeiros
  var quantidadeVisivel = filtrados.length;
  if (!mostrarTodos && filtrados.length > CAPITULOS_POR_PAGINA) {
    quantidadeVisivel = CAPITULOS_POR_PAGINA;
  }

  // redesenha a grade
  var htmlGrade = "";
  for (var j = 0; j < quantidadeVisivel; j++) {
    htmlGrade += criarCardCapitulo(filtrados[j]);
  }
  grade_capitulos.innerHTML = htmlGrade;

  // mensagem de "nenhum capítulo" (só quando a história realmente não tem nenhum)
  if (capitulos.length == 0) {
    area_mensagem_sem_capitulos.innerHTML =
      "<p class='mensagem_sem_capitulos'>Esta história ainda não tem capítulos. Escolha um plot ou crie o primeiro capítulo.</p>";
  } else {
    area_mensagem_sem_capitulos.innerHTML = "";
  }

  // rodapé "Mostrando 16 de 50 capítulos · Ver todos"
  if (filtrados.length == 0) {
    rodape_capitulos.innerHTML = "";
  } else {
    var htmlRodape = "<p>Mostrando " + quantidadeVisivel + " de " + filtrados.length + " capítulos ·</p>";

    // o botão só aparece se tiver mais capítulos do que cabe numa página
    if (filtrados.length > CAPITULOS_POR_PAGINA) {
      var textoBotao = "Ver todos";
      if (mostrarTodos) {
        textoBotao = "Ver menos";
      }
      htmlRodape +=
        "<button type='button' class='botao_ver_todos_capitulos' onclick='alternarVerTodos()'>" +
        textoBotao +
        "</button>";
    }

    rodape_capitulos.innerHTML = htmlRodape;
  }
}

// alterna entre "Ver todos" e "Ver menos"
function alternarVerTodos() {
  mostrarTodos = !mostrarTodos;
  renderizarCapitulos();
}


// =====================================================================
// BOTÃO "+ CAPÍTULO" (só para histórias SEM plot)
// =====================================================================

function criarNovoCapitulo() {
  // descobre o maior número de capítulo já usado nesta história
  var maiorNumero = 0;
  for (var i = 0; i < capitulos.length; i++) {
    if (capitulos[i].numero > maiorNumero) {
      maiorNumero = capitulos[i].numero;
    }
  }

  // pede para o servidor criar o capítulo (o status "nao_escrito"
  // pode ser o valor DEFAULT da coluna no banco)
  // FORA DO CONTEÚDO: aqui o fetch usa "POST" para ENVIAR dados ao servidor,
  // igual ao login.js. "JSON.stringify" transforma o objeto em texto.
  fetch("/capitulos/criar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      idHistoriaServer: idHistoria,
      numeroServer: maiorNumero + 1,
    }),
  })
    .then(function (resposta) {
      if (resposta.ok) {
        resposta.json().then(function (novo) {
          // vai direto para o editor do capítulo (tela 5)
          window.location.href = "capitulo.html?historia=" + idHistoria + "&capitulo=" + novo.idCapitulo;
        });
      } else {
        alert("Não foi possível criar o capítulo.");
      }
    })
    .catch(function (erro) {
      console.log(erro);
      alert("Erro ao conectar com o servidor.");
    });
}


// =====================================================================
// INICIALIZAÇÃO
// =====================================================================

if (idHistoria == "") {
  // não veio id no endereço: volta para a lista de histórias
  window.location.href = "historias.html";
} else {
  preencherMenuUsuario(); // menu lateral
  carregarHistoria(); // capa, nome, selo, mundo, botões
  carregarGeneros(); // tags de gênero
  carregarCapitulos(); // progresso + filtros + cards
}
