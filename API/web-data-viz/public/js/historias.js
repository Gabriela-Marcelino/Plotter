// =====================================================================
// TELA "HISTÓRIAS" — lista as histórias do usuário (vindas do banco)
// =====================================================================
//
// Rotas usadas (src/routes/historias.js):
//   GET    /historias/listar/:idUsuario
//          [{ idHistoria, nome, classificacao, capa, cor, generos: ["..."] }]
//   DELETE /historias/excluir/:idHistoria   recebe { idUsuarioServer }
// =====================================================================

// id do usuário logado (o login.js guardou no sessionStorage)
var idUsuario = sessionStorage.ID_USUARIO;


// 1. FUNÇÕES AUXILIARES

// preenche o nome e a inicial do usuário no rodapé do menu lateral
function preencherMenuUsuario() {
  var nome = sessionStorage.NOME_USUARIO || "Usuário";
  document.getElementById("nome_usuario_menu").textContent = nome;
  document.getElementById("inicial_usuario_menu").textContent = nome.charAt(0).toUpperCase();
}

// transforma "Ecos de Cinza" em "EC" e "O Último Farol" em "ÚF"
function gerarIniciais(nome) {
  // palavras pequenas que não entram nas iniciais
  var ignorar = ["a", "o", "as", "os", "de", "da", "do", "das", "dos", "e", "em", "na", "no"];
  var todas = nome.trim().split(/\s+/);
  var uteis = todas.filter(function (palavra) { return ignorar.indexOf(palavra.toLowerCase()) == -1; });
  var base = uteis.length > 0 ? uteis : todas;
  return base.slice(0, 2).map(function (palavra) { return palavra.charAt(0).toUpperCase(); }).join("");
}

// mostra uma mensagem no lugar dos cards (erro ao carregar, por exemplo)
function mostrarMensagemLista(texto) {
  var aviso = document.getElementById("mensagem_lista_historias");
  aviso.textContent = texto;
  aviso.hidden = texto == "";
}


// 2. MONTANDO UM CARD DE HISTÓRIA

function criarCardHistoria(historia) {
  // clona o <template> do card que está no HTML
  var fragmento = document.getElementById("template_card_historia").content.cloneNode(true);
  var card = fragmento.querySelector(".card_historia");

  // ---- link do card: abre a tela da história pelo id ----
  card.href = "historia.html?id=" + historia.idHistoria;

  // ---- capa ----
  var blocoCapa = card.querySelector(".capa_card_historia");
  var imgCapa = card.querySelector(".img_capa_card_historia");
  var spanIniciais = card.querySelector(".iniciais_card_historia");

  if (historia.capa) {
    imgCapa.src = historia.capa;
    imgCapa.alt = "Capa de " + historia.nome;
  } else {
    // sem capa: fundo com a cor sorteada na criação + iniciais
    blocoCapa.style.setProperty("--cor-historia", historia.cor || "#6b4bc0");
    spanIniciais.hidden = false;
    spanIniciais.textContent = gerarIniciais(historia.nome);
  }

  // ---- selo de classificação indicativa ----
  var selo = card.querySelector(".selo_classificacao_historia");
  selo.dataset.classificacao = historia.classificacao;
  selo.textContent = historia.classificacao == "livre" ? "L" : historia.classificacao;

  // ---- nome ----
  card.querySelector(".nome_card_historia").textContent = historia.nome;

  // ---- gêneros (tags) ----
  var listaGeneros = card.querySelector(".lista_generos_card_historia");
  historia.generos.forEach(function (genero) {
    var tag = document.getElementById("template_tag_genero_historia").content.cloneNode(true);
    tag.querySelector(".tag_genero_historia").textContent = genero;
    listaGeneros.appendChild(tag);
  });

  // ---- botão excluir ----
  var botaoExcluir = card.querySelector(".botao_excluir_historia");
  botaoExcluir.title = "Excluir " + historia.nome;
  botaoExcluir.addEventListener("click", function (evento) {
    // o botão está dentro do link do card: impede de abrir a história
    evento.preventDefault();
    evento.stopPropagation();
    excluirHistoria(historia, card);
  });

  return card;
}


// 3. EXCLUIR HISTÓRIA

function excluirHistoria(historia, card) {
  var confirmou = confirm(
    'Excluir "' + historia.nome + '"?\n\n' +
    "Os capítulos, gêneros e o moodboard desta história também serão apagados. Essa ação não pode ser desfeita."
  );
  if (!confirmou) return;

  fetch("/historias/excluir/" + historia.idHistoria, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idUsuarioServer: idUsuario }),
  })
    .then(function (resposta) {
      if (resposta.ok) {
        card.remove(); // tira o card da tela sem precisar recarregar
      } else {
        alert("Não foi possível excluir a história.");
      }
    })
    .catch(function (erro) {
      console.log(erro);
      alert("Erro ao conectar com o servidor.");
    });
}


// 4. DESENHANDO A PÁGINA

function carregarHistorias() {
  fetch("/historias/listar/" + idUsuario)
    .then(function (resposta) {
      if (resposta.ok) {
        resposta.json().then(renderizarHistorias);
      } else {
        mostrarMensagemLista("Não foi possível carregar suas histórias.");
      }
    })
    .catch(function (erro) {
      console.log(erro);
      mostrarMensagemLista("Erro ao conectar com o servidor.");
    });
}

function renderizarHistorias(historias) {
  var grade = document.getElementById("grade_historias");
  // o card tracejado "Nova história" fica sempre por último
  var cardNovaHistoria = document.getElementById("card_nova_historia");

  // apaga os cards antigos (mantém só o card "Nova história")
  grade.querySelectorAll(".card_historia").forEach(function (card) { card.remove(); });
  mostrarMensagemLista("");

  historias.forEach(function (historia) {
    grade.insertBefore(criarCardHistoria(historia), cardNovaHistoria);
  });
  // se não houver histórias, só sobra o card tracejado (estado vazio)
}


// 5. INICIALIZAÇÃO

preencherMenuUsuario();
carregarHistorias();
