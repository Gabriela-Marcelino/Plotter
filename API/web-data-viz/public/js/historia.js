// CONSTANTES

const CHAVE_HISTORIAS = "plotter_historias";
const CHAVE_CAPITULOS = "plotter_capitulos";
const CHAVE_PERSONAGENS = "plotter_personagens";
const CHAVE_MUNDOS = "plotter_mundos";
const CHAVE_USUARIO = "plotter_usuario";

// nome bonito de cada status (a chave é o valor guardado no capítulo)
const NOMES_STATUS = {
  nao_escrito: "Não escrito",
  escrevendo: "Escrevendo",
  a_revisar: "A revisar",
  revisado: "Revisado",
  concluido: "Concluído",
  publicado: "Publicado",
};

// só esses status contam para o progresso (regra definida no projeto)
const STATUS_QUE_CONTAM_NO_PROGRESSO = ["a_revisar", "revisado", "concluido", "publicado"];

// quantos cards aparecem antes de clicar em "Ver todos"
const CAPITULOS_POR_PAGINA = 16;


// FUNÇÕES AUXILIARES

// lê uma lista do localStorage
function lerLista(chave) {
  try {
    const texto = localStorage.getItem(chave);
    return texto ? JSON.parse(texto) : [];
  } catch (erro) {
    return [];
  }
}

// grava uma lista no localStorage (true = deu certo)
function salvarLista(chave, lista) {
  try {
    localStorage.setItem(chave, JSON.stringify(lista));
    return true;
  } catch (erro) {
    return false;
  }
}

// cria um id único
function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// preenche o menu lateral com o usuário logado
function preencherMenuUsuario() {
  let usuario = {};
  try {
    usuario = JSON.parse(localStorage.getItem(CHAVE_USUARIO)) || {};
  } catch (erro) {
    usuario = {};
  }
  const nome = usuario.nome || "Usuário";
  document.getElementById("nome_usuario_menu").textContent = nome;
  document.getElementById("inicial_usuario_menu").textContent = nome.charAt(0).toUpperCase();
}

// "Ecos de Cinza" -> "EC"
function gerarIniciais(nome) {
  const ignorar = ["a", "o", "as", "os", "de", "da", "do", "das", "dos", "e", "em", "na", "no"];
  const todas = nome.trim().split(/\s+/);
  const uteis = todas.filter((palavra) => !ignorar.includes(palavra.toLowerCase()));
  const base = uteis.length > 0 ? uteis : todas;
  return base.slice(0, 2).map((palavra) => palavra.charAt(0).toUpperCase()).join("");
}

// transforma 1 em "01", 12 em "12"
function doisDigitos(numero) {
  return String(numero).padStart(2, "0");
}

// "1 cena" / "4 cenas" / "0 cenas"
function textoCenas(quantidade) {
  return quantidade + (quantidade === 1 ? " cena" : " cenas");
}


// CARREGANDO A HISTÓRIA DA URL

// lê o ?id=... da URL
const idHistoria = new URLSearchParams(window.location.search).get("id");
// procura a história na lista
const historia = lerLista(CHAVE_HISTORIAS).find((h) => h.id === idHistoria);

// se o id não existe, volta para a lista de histórias e para o script aqui
if (!historia) {
  window.location.href = "historias.html";
  throw new Error("História não encontrada."); // interrompe o resto do arquivo
}

// estado da tela
const estado = {
  filtroStatus: "",   // "" = sem filtro; senão guarda o status filtrado
  mostrarTodos: false, // false = mostra só os 16 primeiros
};

// pega todos os capítulos DESTA história, ordenados pelo número
function obterCapitulos() {
  return lerLista(CHAVE_CAPITULOS)
    .filter((c) => c.historiaId === historia.id)
    .sort((a, b) => a.numero - b.numero);
}


// CABEÇALHO DA HISTÓRIA (capa, nome, selo, gêneros, mundo, personagens)

function renderizarCabecalho() {
  // título da aba do navegador
  document.title = historia.nome + " · Plotter";

  // ---- capa ----
  const imgCapa = document.getElementById("img_capa_cabecalho_historia");
  const iniciais = document.getElementById("iniciais_cabecalho_historia");
  if (historia.capa) {
    imgCapa.src = historia.capa; // mostra a capa
  } else {
    // sem capa: cor aleatória + iniciais
    imgCapa.parentElement.style.setProperty("--cor-historia", historia.corAleatoria || "#6b4bc0");
    iniciais.hidden = false;
    iniciais.textContent = gerarIniciais(historia.nome);
  }

  // ---- nome ----
  document.getElementById("titulo_historia").textContent = historia.nome;

  // ---- selo de classificação ----
  const selo = document.getElementById("selo_classificacao_historia");
  selo.dataset.classificacao = historia.classificacao;
  selo.textContent = historia.classificacao === "livre" ? "L" : historia.classificacao;

  // ---- gêneros (se não tiver, a lista fica vazia) ----
  const listaGeneros = document.getElementById("lista_generos_cabecalho_historia");
  (historia.generos || []).forEach((genero) => {
    const tag = document.getElementById("template_tag_genero_historia").content.cloneNode(true);
    tag.querySelector(".tag_genero_historia").textContent = genero;
    listaGeneros.appendChild(tag);
  });

  // ---- mundo (some se não houver) ----
  const mundo = lerLista(CHAVE_MUNDOS).find((m) => m.id === historia.mundo);
  if (mundo) {
    document.getElementById("nome_mundo_historia").textContent = mundo.nome;
    document.getElementById("mundo_cabecalho_historia").hidden = false;
  }

  // ---- personagens principais (some se não houver) ----
  const todosPersonagens = lerLista(CHAVE_PERSONAGENS);
  const personagens = (historia.personagens || [])
    .map((id) => todosPersonagens.find((p) => p.id === id))
    .filter(Boolean);

  if (personagens.length > 0) {
    const listaAvatares = document.getElementById("lista_avatares_cabecalho_historia");
    personagens.forEach((personagem) => {
      const avatar = document.getElementById("template_avatar_personagem_historia").content.cloneNode(true);
      const li = avatar.querySelector(".avatar_personagem_historia");
      const img = avatar.querySelector(".img_avatar_personagem_historia");
      const spanIniciais = avatar.querySelector(".iniciais_avatar_personagem_historia");
      li.title = personagem.nome; // mostra o nome ao passar o mouse
      if (personagem.imagem) {
        img.src = personagem.imagem;
        img.alt = personagem.nome;
      } else {
        li.style.setProperty("--cor-personagem", personagem.cor || "#4a2478");
        spanIniciais.hidden = false;
        spanIniciais.textContent = gerarIniciais(personagem.nome);
      }
      listaAvatares.appendChild(avatar);
    });
    document.getElementById("grupo_personagens_cabecalho_historia").hidden = false;
  }

  // ---- botão "Editar história" leva ao formulário em modo edição ----
  document.getElementById("botao_editar_historia").href = "historia-formulario.html?id=" + historia.id;
}


// PROGRESSO (lado direito do cabeçalho)

function renderizarProgresso(capitulos) {
  const total = capitulos.length;
  // capítulos que já passaram da fase de escrita (a revisar, revisado, concluído, publicado)
  const feitos = capitulos.filter((c) => STATUS_QUE_CONTAM_NO_PROGRESSO.includes(c.status)).length;
  // capítulos publicados
  const publicados = capitulos.filter((c) => c.status === "publicado").length;
  // porcentagem (evita dividir por zero quando não há capítulos)
  const porcentagem = total > 0 ? Math.round((feitos / total) * 100) : 0;

  // "8 / 50 capítulos"
  document.getElementById("valor_progresso_historia").textContent = feitos + " / " + total + " capítulos";
  // "16% concluído · 3 publicados"
  document.getElementById("detalhe_progresso_historia").textContent =
    porcentagem + "% concluído · " + publicados + (publicados === 1 ? " publicado" : " publicados");
  // a largura da barra roxa vem dessa variável CSS
  document.getElementById("preenchimento_progresso_historia").style.setProperty("--progresso", porcentagem + "%");
}


// FILTROS DE STATUS

function renderizarFiltros(capitulos) {
  // se não há capítulos, não faz sentido mostrar filtros
  document.getElementById("filtros_status_capitulos").hidden = capitulos.length === 0;

  // para cada status, conta quantos capítulos têm esse status
  Object.keys(NOMES_STATUS).forEach((status) => {
    const quantidade = capitulos.filter((c) => c.status === status).length;
    // o id do contador segue o padrão contador_status_<status>
    document.getElementById("contador_status_" + status).textContent = quantidade;
  });

  // marca visualmente o filtro ativo
  document.querySelectorAll(".filtro_status_capitulo").forEach((botao) => {
    botao.setAttribute("aria-pressed", String(botao.dataset.status === estado.filtroStatus));
  });
}

// clique nos filtros: clicar de novo no mesmo filtro remove o filtro
document.querySelectorAll(".filtro_status_capitulo").forEach((botao) => {
  botao.addEventListener("click", () => {
    estado.filtroStatus = estado.filtroStatus === botao.dataset.status ? "" : botao.dataset.status;
    estado.mostrarTodos = false; // volta para a primeira página
    renderizarCapitulos();
  });
});


// CARDS DE CAPÍTULOS

function criarCardCapitulo(capitulo) {
  const fragmento = document.getElementById("template_card_capitulo").content.cloneNode(true);
  const card = fragmento.querySelector(".card_capitulo");

  // link para a tela do capítulo (tela 5)
  card.href = "capitulo.html?historia=" + historia.id + "&capitulo=" + capitulo.id;
  // o CSS usa data-status para pintar a faixa lateral e a bolinha
  card.dataset.status = capitulo.status;

  // texto do status ("Publicado", "Escrevendo"...)
  card.querySelector(".texto_status_capitulo").textContent = NOMES_STATUS[capitulo.status];
  // "Capítulo 01"
  const rotuloNumero = "Capítulo " + doisDigitos(capitulo.numero);
  card.querySelector(".numero_card_capitulo").textContent = rotuloNumero;
  // título; se estiver vazio usa "Capítulo 01"
  card.querySelector(".titulo_card_capitulo").textContent = capitulo.titulo || rotuloNumero;
  // quantidade de cenas
  card.querySelector(".contagem_cenas_card_capitulo").textContent = textoCenas((capitulo.cenas || []).length);

  return card;
}

function renderizarCapitulos() {
  const todos = obterCapitulos();

  // atualiza progresso e filtros (sempre com a lista completa)
  renderizarProgresso(todos);
  renderizarFiltros(todos);

  // aplica o filtro de status, se houver
  const filtrados = estado.filtroStatus
    ? todos.filter((c) => c.status === estado.filtroStatus)
    : todos;

  // corta em 16 se o usuário ainda não clicou em "Ver todos"
  const visiveis = estado.mostrarTodos ? filtrados : filtrados.slice(0, CAPITULOS_POR_PAGINA);

  // redesenha a grade
  const grade = document.getElementById("grade_capitulos");
  grade.innerHTML = "";
  visiveis.forEach((capitulo) => grade.appendChild(criarCardCapitulo(capitulo)));

  // mensagem de "nenhum capítulo" (só quando a história realmente não tem nenhum)
  document.getElementById("mensagem_sem_capitulos").hidden = todos.length > 0;

  // rodapé "Mostrando 16 de 50 capítulos · Ver todos"
  const rodape = document.getElementById("rodape_capitulos");
  rodape.hidden = filtrados.length === 0;
  document.getElementById("texto_mostrando_capitulos").textContent =
    "Mostrando " + visiveis.length + " de " + filtrados.length + " capítulos ·";

  // o botão só existe se tiver mais capítulos do que cabe numa página
  const botaoVerTodos = document.getElementById("botao_ver_todos_capitulos");
  botaoVerTodos.hidden = filtrados.length <= CAPITULOS_POR_PAGINA;
  botaoVerTodos.textContent = estado.mostrarTodos ? "Ver menos" : "Ver todos";
}

// alterna entre "Ver todos" e "Ver menos"
document.getElementById("botao_ver_todos_capitulos").addEventListener("click", () => {
  estado.mostrarTodos = !estado.mostrarTodos;
  renderizarCapitulos();
});


//  BOTÃO "+ CAPÍTULO" (só para histórias SEM plot)

const botaoNovoCapitulo = document.getElementById("botao_novo_capitulo");

// com plot, os capítulos já nasceram automaticamente: esconde o botão
botaoNovoCapitulo.hidden = Boolean(historia.plot);

botaoNovoCapitulo.addEventListener("click", () => {
  const capitulos = lerLista(CHAVE_CAPITULOS);
  // descobre o maior número de capítulo já usado nesta história
  const maiorNumero = obterCapitulos().reduce((maior, c) => Math.max(maior, c.numero), 0);

  // cria o capítulo novo com status "não escrito"
  const novo = {
    id: gerarId(),
    historiaId: historia.id,
    numero: maiorNumero + 1,
    titulo: "",
    sinopse: "",
    ato: "",
    plotTwist: false,
    status: "nao_escrito",
    texto: "",
    cenas: [],
  };
  capitulos.push(novo);

  if (!salvarLista(CHAVE_CAPITULOS, capitulos)) {
    alert("Não foi possível criar o capítulo (armazenamento cheio).");
    return;
  }
  // vai direto para o editor do capítulo (tela 5)
  window.location.href = "capitulo.html?historia=" + historia.id + "&capitulo=" + novo.id;
});


//INICIALIZAÇÃO

preencherMenuUsuario();   // menu lateral
renderizarCabecalho();    // capa, nome, selo, gêneros, mundo, personagens
renderizarCapitulos();    // progresso + filtros + cards