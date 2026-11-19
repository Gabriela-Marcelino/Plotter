
// 1. CONSTANTES (nomes onde cada dado fica guardado)

// todas as histórias
const CHAVE_HISTORIAS = "plotter_historias";
// personagens criados na aba Personagens
const CHAVE_PERSONAGENS = "plotter_personagens";
// mundos criados na aba Mundos
const CHAVE_MUNDOS = "plotter_mundos";
// usuário logado (nome que aparece no menu lateral)
const CHAVE_USUARIO = "plotter_usuario";

// máximo de personagens que aparecem no card (o resto vira "+N")
const MAXIMO_PERSONAGENS_NO_CARD = 3;


// 2. FUNÇÕES AUXILIARES

// lê uma lista guardada no localStorage (devolve [] se não existir nada)
function lerLista(chave) {
  // try/catch evita que a página quebre se o JSON estiver corrompido
  try {
    // pega o texto guardado
    const texto = localStorage.getItem(chave);
    // se tiver texto, converte em lista; se não, devolve lista vazia
    return texto ? JSON.parse(texto) : [];
  } catch (erro) {
    // em caso de erro, devolve lista vazia
    return [];
  }
}

// preenche o nome e a inicial do usuário no rodapé do menu lateral
function preencherMenuUsuario() {
  // começa com um objeto vazio
  let usuario = {};
  // tenta ler o usuário guardado
  try {
    usuario = JSON.parse(localStorage.getItem(CHAVE_USUARIO)) || {};
  } catch (erro) {
    usuario = {};
  }
  // se não tiver nome guardado, usa "Usuário"
  const nome = usuario.nome || "Usuário";
  // escreve o nome no menu
  document.getElementById("nome_usuario_menu").textContent = nome;
  // escreve a primeira letra do nome dentro do círculo do avatar
  document.getElementById("inicial_usuario_menu").textContent = nome.charAt(0).toUpperCase();
}

// transforma "Ecos de Cinza" em "EC" e "O Último Farol" em "ÚF"
function gerarIniciais(nome) {
  // palavras pequenas que não entram nas iniciais
  const ignorar = ["a", "o", "as", "os", "de", "da", "do", "das", "dos", "e", "em", "na", "no"];
  // separa o nome em palavras
  const todas = nome.trim().split(/\s+/);
  // tira as palavras pequenas
  const uteis = todas.filter((palavra) => !ignorar.includes(palavra.toLowerCase()));
  // se sobrou alguma palavra usa ela, senão usa o nome inteiro
  const base = uteis.length > 0 ? uteis : todas;
  // pega a 1ª letra das duas primeiras palavras e junta
  return base.slice(0, 2).map((palavra) => palavra.charAt(0).toUpperCase()).join("");
}


// 3. MONTANDO UM CARD DE HISTÓRIA

function criarCardHistoria(historia, personagens, mundos) {
  // pega o <template> do card que está no HTML
  const modelo = document.getElementById("template_card_historia");
  // clona o conteúdo do template (cria uma cópia nova)
  const fragmento = modelo.content.cloneNode(true);
  // pega o <a class="card_historia"> dentro da cópia
  const card = fragmento.querySelector(".card_historia");

  // ---- link do card: abre a tela da história pelo id ----
  card.href = "historia.html?id=" + historia.id;

  // ---- capa ----
  // pega o bloco da capa
  const blocoCapa = card.querySelector(".capa_card_historia");
  // pega a <img> da capa
  const imgCapa = card.querySelector(".img_capa_card_historia");
  // pega o <span> das iniciais (usado quando não tem capa)
  const spanIniciais = card.querySelector(".iniciais_card_historia");

  if (historia.capa) {
    // tem capa: coloca a imagem no card
    imgCapa.src = historia.capa;
    // texto alternativo para acessibilidade
    imgCapa.alt = "Capa de " + historia.nome;
  } else {
    // não tem capa: pinta o fundo com a cor aleatória guardada na criação
    blocoCapa.style.setProperty("--cor-historia", historia.corAleatoria || "#6b4bc0");
    // mostra as iniciais da história no meio do card
    spanIniciais.hidden = false;
    spanIniciais.textContent = gerarIniciais(historia.nome);
  }

  // ---- selo de classificação indicativa (L, 10, 12, 16, 18) ----
  const selo = card.querySelector(".selo_classificacao_historia");
  // o CSS usa esse atributo para escolher a cor do selo
  selo.dataset.classificacao = historia.classificacao;
  // "livre" aparece como "L"; os outros aparecem com o número
  selo.textContent = historia.classificacao === "livre" ? "L" : historia.classificacao;

  // ---- nome da história ----
  card.querySelector(".nome_card_historia").textContent = historia.nome;

  // ---- gêneros (tags) ----
  const listaGeneros = card.querySelector(".lista_generos_card_historia");
  // para cada gênero da história...
  (historia.generos || []).forEach((genero) => {
    // clona o template da tag
    const tag = document.getElementById("template_tag_genero_historia").content.cloneNode(true);
    // escreve o nome do gênero
    tag.querySelector(".tag_genero_historia").textContent = genero;
    // coloca a tag na lista
    listaGeneros.appendChild(tag);
  });

  // ---- personagens principais ----
  // troca os ids guardados na história pelos personagens de verdade
  const personagensDaHistoria = (historia.personagens || [])
    .map((id) => personagens.find((p) => p.id === id))
    // remove os que foram apagados e não existem mais
    .filter(Boolean);

  const grupoPersonagens = card.querySelector(".grupo_personagens_card_historia");

  if (personagensDaHistoria.length === 0) {
    // sem personagens: esconde o bloco inteiro
    grupoPersonagens.hidden = true;
  } else {
    const listaAvatares = card.querySelector(".lista_avatares_card_historia");

    // só os 3 primeiros viram avatar
    personagensDaHistoria.slice(0, MAXIMO_PERSONAGENS_NO_CARD).forEach((personagem) => {
      // clona o template do avatar
      const avatar = document.getElementById("template_avatar_personagem_historia").content.cloneNode(true);
      // pega o <li> do avatar
      const li = avatar.querySelector(".avatar_personagem_historia");
      // pega a imagem e as iniciais dentro do avatar
      const img = avatar.querySelector(".img_avatar_personagem_historia");
      const iniciais = avatar.querySelector(".iniciais_avatar_personagem_historia");

      if (personagem.imagem) {
        // personagem tem foto: usa a foto
        img.src = personagem.imagem;
        img.alt = personagem.nome;
      } else {
        // sem foto: mostra iniciais sobre a cor do personagem
        li.style.setProperty("--cor-personagem", personagem.cor || "#4a2478");
        iniciais.hidden = false;
        iniciais.textContent = gerarIniciais(personagem.nome);
      }
      // coloca o avatar na linha
      listaAvatares.appendChild(avatar);
    });

    // quantos personagens passaram do limite de 3
    const restantes = personagensDaHistoria.length - MAXIMO_PERSONAGENS_NO_CARD;
    if (restantes > 0) {
      // mostra o cardzinho "+1", "+2", "+3"...
      const contador = card.querySelector(".contador_personagens_card_historia");
      contador.hidden = false;
      contador.textContent = "+" + restantes;
    }

    // nomes dos 3 primeiros separados por vírgula ("Sombra, Rennick, Ísis")
    card.querySelector(".nomes_personagens_card_historia").textContent = personagensDaHistoria
      .slice(0, MAXIMO_PERSONAGENS_NO_CARD)
      .map((p) => p.nome)
      .join(", ");
  }

  // ---- mundo onde a história se passa ----
  const mundo = mundos.find((m) => m.id === historia.mundo);
  const grupoMundo = card.querySelector(".grupo_mundo_card_historia");

  if (mundo) {
    // achou o mundo: escreve o nome
    card.querySelector(".nome_mundo_card_historia").textContent = mundo.nome;
  } else {
    // sem mundo: esconde o bloco
    grupoMundo.hidden = true;
  }

  // devolve o card pronto
  return card;
}


// 4. DESENHANDO A PÁGINA

function renderizarHistorias() {
  // lê tudo o que é preciso
  const historias = lerLista(CHAVE_HISTORIAS);
  const personagens = lerLista(CHAVE_PERSONAGENS);
  const mundos = lerLista(CHAVE_MUNDOS);

  // a grade onde os cards entram
  const grade = document.getElementById("grade_historias");
  // o card tracejado "Nova história" (fica sempre por último)
  const cardNovaHistoria = document.getElementById("card_nova_historia");

  // apaga os cards antigos (mantém só o card "Nova história")
  grade.querySelectorAll(".card_historia").forEach((card) => card.remove());

  // para cada história, cria o card e coloca ANTES do card "Nova história"
  historias.forEach((historia) => {
    const card = criarCardHistoria(historia, personagens, mundos);
    grade.insertBefore(card, cardNovaHistoria);
  });
  // obs.: se não houver histórias, só sobra o card tracejado (estado vazio)
}


// 5. INICIALIZAÇÃO (roda quando o arquivo carrega)

// preenche o menu lateral
preencherMenuUsuario();
// desenha os cards
renderizarHistorias();