// 1. CONSTANTES

const CHAVE_HISTORIAS = "plotter_historias";   // todas as histórias
const CHAVE_CAPITULOS = "plotter_capitulos";   // todos os capítulos de todas as histórias
const CHAVE_PERSONAGENS = "plotter_personagens"; // personagens já criados
const CHAVE_MUNDOS = "plotter_mundos";         // mundos já criados
const CHAVE_PLOTS = "plotter_plots";           // plots já criados
const CHAVE_GENEROS = "plotter_generos";       // gêneros que o usuário já digitou um dia
const CHAVE_USUARIO = "plotter_usuario";       // usuário logado

const MAXIMO_GENEROS = 5;      // máximo de gêneros por história
const MAXIMO_MOODBOARD = 5;    // máximo de imagens de moodboard (a capa é +4)
const TAMANHO_MAXIMO_MB = 8;   // tamanho máximo de cada arquivo enviado
const LADO_MAXIMO_PX = 900;    // a imagem é reduzida para caber nesse tamanho antes de salvar
const TIPOS_ACEITOS = ["image/png", "image/jpeg", "image/webp"]; // formatos permitidos


// 2. FUNÇÕES AUXILIARES (leitura/gravação, menu, ids, iniciais)

// lê uma lista do localStorage ([] se não existir)
function lerLista(chave) {
  try {
    const texto = localStorage.getItem(chave);
    return texto ? JSON.parse(texto) : [];
  } catch (erro) {
    return [];
  }
}

// grava uma lista no localStorage; devolve true se deu certo e false se estourou o limite
function salvarLista(chave, lista) {
  try {
    localStorage.setItem(chave, JSON.stringify(lista));
    return true;
  } catch (erro) {
    // acontece quando as imagens ocupam espaço demais no navegador
    return false;
  }
}

// preenche nome/inicial do usuário no menu lateral
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

// cria um id único (data atual + número aleatório)
function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// gera uma cor aleatória em HSL (usada quando a história não tem capa)
function gerarCorAleatoria() {
  const matiz = Math.floor(Math.random() * 360); // 0 a 359
  return "hsl(" + matiz + ", 55%, 45%)";
}

// "Ecos de Cinza" -> "EC"
function gerarIniciais(nome) {
  const ignorar = ["a", "o", "as", "os", "de", "da", "do", "das", "dos", "e", "em", "na", "no"];
  const todas = nome.trim().split(/\s+/);
  const uteis = todas.filter((palavra) => !ignorar.includes(palavra.toLowerCase()));
  const base = uteis.length > 0 ? uteis : todas;
  return base.slice(0, 2).map((palavra) => palavra.charAt(0).toUpperCase()).join("");
}

// escreve uma mensagem (erro ou aviso) dentro de uma div
function mostrarMensagem(elemento, texto, tipo) {
  elemento.textContent = texto;               // escreve o texto
  elemento.dataset.tipo = tipo || "erro";     // "erro" ou "sucesso" (use no CSS se quiser colorir)
}

// limpa a mensagem de uma div
function limparMensagem(elemento) {
  elemento.textContent = "";
  delete elemento.dataset.tipo;
}


// 3. PEGANDO OS ELEMENTOS DO HTML

const form = document.getElementById("form_historia");
const tituloFormulario = document.getElementById("titulo_formulario_historia");
const inputNome = document.getElementById("ipt_nome_historia");
const botaoSalvar = document.getElementById("botao_salvar_historia");
const divMensagemFormulario = document.getElementById("div_mensagem_formulario_historia");

// painel esquerdo (preview de capa e moodboard)
const imgPreviewCapa = document.getElementById("img_preview_capa_historia");
const botaoRemoverCapa = document.getElementById("botao_remover_capa_historia");
const gradeMoodboard = document.getElementById("grade_moodboard_historia");
const mensagemSemMoodboard = document.getElementById("mensagem_sem_moodboard");

// gêneros
const listaGeneros = document.getElementById("lista_generos_formulario_historia");
const botaoNovoGenero = document.getElementById("botao_novo_genero");
const inputNovoGenero = document.getElementById("ipt_novo_genero");

// personagens e mundos
const listaPersonagens = document.getElementById("lista_personagens_formulario_historia");
const mensagemSemPersonagens = document.getElementById("mensagem_sem_personagens_historia");
const listaMundos = document.getElementById("lista_mundos_formulario_historia");
const mensagemSemMundos = document.getElementById("mensagem_sem_mundos_historia");

// plot (card + modal)
const blocoPlotSelecionado = document.getElementById("plot_selecionado_historia");
const textoNomePlot = document.getElementById("nome_plot_historia");
const textoResumoPlot = document.getElementById("resumo_plot_historia");
const botaoTrocarPlot = document.getElementById("botao_trocar_plot_historia");
const botaoEscolherPlot = document.getElementById("botao_escolher_plot_historia");
const modalPlots = document.getElementById("modal_plots_historia");
const listaPlotsModal = document.getElementById("lista_plots_modal");
const mensagemSemPlots = document.getElementById("mensagem_sem_plots_modal");
const botaoCancelarPlots = document.getElementById("botao_cancelar_modal_plots");
const botaoConfirmarPlots = document.getElementById("botao_confirmar_modal_plots");

// modal de imagens (tela 3)
const botaoAdicionarImagem = document.getElementById("botao_adicionar_imagem");
const modalImagens = document.getElementById("modal_imagens_historia");
const botaoFecharModalImagens = document.getElementById("botao_fechar_modal_imagens");
const areaEnvioImagens = document.getElementById("area_envio_imagens");
const inputArquivos = document.getElementById("ipt_arquivos_imagens");
const listaImagensModal = document.getElementById("lista_imagens_modal");
const contadorImagensModal = document.getElementById("contador_imagens_modal");
const contadorBotaoImagens = document.getElementById("contador_botao_imagens");
const divMensagemModalImagens = document.getElementById("div_mensagem_modal_imagens");
const botaoCancelarModalImagens = document.getElementById("botao_cancelar_modal_imagens");
const botaoConfirmarModalImagens = document.getElementById("botao_confirmar_modal_imagens");


// ESTADO DO FORMULÁRIO (tudo que o usuário já escolheu)

const estado = {
  capa: null,                // imagem da capa (texto base64) ou null
  moodboard: [],             // lista de imagens do moodboard (base64)
  generosSelecionados: [],   // nomes dos gêneros marcados (máx. 5)
  personagensSelecionados: [], // ids dos personagens marcados
  mundoSelecionado: "",      // id do mundo ("" = nenhum)
  plotSelecionado: "",       // id do plot ("" = nenhum)
  imagensPendentes: [],      // imagens que estão no modal e ainda não foram confirmadas
};

// lê o ?id=... da URL; se existir, estamos EDITANDO uma história
const idEdicao = new URLSearchParams(window.location.search).get("id");
// guarda a história sendo editada (ou null quando estamos criando)
let historiaEmEdicao = null;


// PAINEL ESQUERDO: PREVIEW DA CAPA E DO MOODBOARD

function renderizarPreviewImagens() {
  // ---- capa ----
  if (estado.capa) {
    imgPreviewCapa.src = estado.capa;        // mostra a capa
    botaoRemoverCapa.hidden = false;         // mostra o X para remover
  } else {
    imgPreviewCapa.removeAttribute("src");   // sem capa: tira a imagem
    botaoRemoverCapa.hidden = true;          // esconde o X
  }

  // ---- moodboard ----
  gradeMoodboard.innerHTML = "";             // limpa a grade antes de redesenhar
  estado.moodboard.forEach((imagem, indice) => {
    // clona o template de cada item do moodboard
    const item = document.getElementById("template_item_moodboard_formulario").content.cloneNode(true);
    item.querySelector(".img_item_moodboard").src = imagem; // coloca a imagem
    // ao clicar no X, remove essa imagem da lista e redesenha
    item.querySelector(".botao_remover_moodboard").addEventListener("click", () => {
      estado.moodboard.splice(indice, 1);
      renderizarPreviewImagens();
    });
    gradeMoodboard.appendChild(item);
  });
  // mostra "Nenhuma imagem de moodboard ainda" só quando a lista está vazia
  mensagemSemMoodboard.hidden = estado.moodboard.length > 0;
}

// clicar no X da capa remove a capa
botaoRemoverCapa.addEventListener("click", () => {
  estado.capa = null;
  renderizarPreviewImagens();
});


//  GÊNEROS TEXTUAIS

function renderizarGeneros() {
  // lê a lista de gêneros que o usuário já criou (começa vazia na 1ª vez)
  const generos = lerLista(CHAVE_GENEROS);
  listaGeneros.innerHTML = ""; // limpa a lista

  generos.forEach((genero) => {
    // clona o template da opção de gênero
    const opcao = document.getElementById("template_opcao_genero_historia").content.cloneNode(true);
    const checkbox = opcao.querySelector(".chk_genero_historia");
    // escreve o nome do gênero
    opcao.querySelector(".nome_opcao_genero").textContent = genero;
    // marca a caixinha se o gênero já estava selecionado
    checkbox.checked = estado.generosSelecionados.includes(genero);

    // quando o usuário marca/desmarca...
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        // tentando marcar um 6º gênero: bloqueia
        if (estado.generosSelecionados.length >= MAXIMO_GENEROS) {
          checkbox.checked = false;
          mostrarMensagem(divMensagemFormulario, "Você pode escolher no máximo " + MAXIMO_GENEROS + " gêneros.");
          return;
        }
        estado.generosSelecionados.push(genero); // adiciona à seleção
      } else {
        // desmarcou: tira da seleção
        estado.generosSelecionados = estado.generosSelecionados.filter((g) => g !== genero);
      }
      limparMensagem(divMensagemFormulario);
    });

    listaGeneros.appendChild(opcao);
  });
}

// adiciona um gênero novo digitado pelo usuário
function adicionarNovoGenero() {
  // pega o texto sem espaços sobrando
  const nome = inputNovoGenero.value.trim();
  if (!nome) return; // se estiver vazio, não faz nada

  const generos = lerLista(CHAVE_GENEROS);
  // procura se já existe um gênero igual (ignorando maiúsculas/minúsculas)
  const existente = generos.find((g) => g.toLowerCase() === nome.toLowerCase());
  const nomeFinal = existente || nome;

  // se for novo, guarda na lista para aparecer nas próximas histórias
  if (!existente) {
    generos.push(nome);
    salvarLista(CHAVE_GENEROS, generos);
  }

  // já seleciona o gênero, se ainda houver espaço e ele não estiver marcado
  if (!estado.generosSelecionados.includes(nomeFinal)) {
    if (estado.generosSelecionados.length >= MAXIMO_GENEROS) {
      mostrarMensagem(divMensagemFormulario, "Gênero salvo, mas já são " + MAXIMO_GENEROS + " selecionados. Desmarque um para usar este.");
    } else {
      estado.generosSelecionados.push(nomeFinal);
    }
  }

  inputNovoGenero.value = ""; // limpa o campo
  renderizarGeneros();        // redesenha as tags
}

// botão "+ Novo gênero" só leva o cursor para o campo de texto
botaoNovoGenero.addEventListener("click", () => inputNovoGenero.focus());

// ao apertar Enter no campo, adiciona o gênero (e impede o formulário de ser enviado)
inputNovoGenero.addEventListener("keydown", (evento) => {
  if (evento.key === "Enter") {
    evento.preventDefault();
    adicionarNovoGenero();
  }
});


// PERSONAGENS E MUNDOS

function renderizarPersonagens() {
  const personagens = lerLista(CHAVE_PERSONAGENS);
  listaPersonagens.innerHTML = "";
  // se não existe nenhum personagem, mostra o aviso com link para criar
  mensagemSemPersonagens.hidden = personagens.length > 0;

  personagens.forEach((personagem) => {
    const opcao = document.getElementById("template_opcao_personagem_historia").content.cloneNode(true);
    const checkbox = opcao.querySelector(".chk_personagem_historia");
    const img = opcao.querySelector(".img_avatar_opcao_personagem");
    const iniciais = opcao.querySelector(".iniciais_avatar_opcao_personagem");

    opcao.querySelector(".nome_opcao_personagem").textContent = personagem.nome;
    checkbox.checked = estado.personagensSelecionados.includes(personagem.id);

    if (personagem.imagem) {
      img.src = personagem.imagem; // foto do personagem
    } else {
      iniciais.hidden = false;     // sem foto: mostra iniciais
      iniciais.textContent = gerarIniciais(personagem.nome);
    }

    // marcar/desmarcar atualiza a lista de ids
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        estado.personagensSelecionados.push(personagem.id);
      } else {
        estado.personagensSelecionados = estado.personagensSelecionados.filter((id) => id !== personagem.id);
      }
    });

    listaPersonagens.appendChild(opcao);
  });
}

function renderizarMundos() {
  const mundos = lerLista(CHAVE_MUNDOS);
  listaMundos.innerHTML = "";
  mensagemSemMundos.hidden = mundos.length > 0;

  mundos.forEach((mundo) => {
    const opcao = document.getElementById("template_opcao_mundo_historia").content.cloneNode(true);
    const radio = opcao.querySelector(".rdo_mundo_historia");
    const img = opcao.querySelector(".img_miniatura_opcao_mundo");
    const iniciais = opcao.querySelector(".iniciais_miniatura_opcao_mundo");

    opcao.querySelector(".nome_opcao_mundo").textContent = mundo.nome;
    radio.checked = estado.mundoSelecionado === mundo.id;

    if (mundo.imagem) {
      img.src = mundo.imagem;
    } else {
      iniciais.hidden = false;
      iniciais.textContent = gerarIniciais(mundo.nome);
    }

    // radio normalmente não "desmarca"; aqui clicar no mundo já escolhido tira a escolha
    radio.addEventListener("click", () => {
      if (estado.mundoSelecionado === mundo.id) {
        radio.checked = false;       // desmarca visualmente
        estado.mundoSelecionado = ""; // nenhum mundo
      } else {
        estado.mundoSelecionado = mundo.id; // escolhe este mundo
      }
    });

    listaMundos.appendChild(opcao);
  });
}


// 8. PLOT (card + modal "Escolher plot")

// conta quantas cenas tem no total dentro de um plot
function contarCenasDoPlot(plot) {
  return (plot.capitulos || []).reduce((total, cap) => total + (cap.cenas ? cap.cenas.length : 0), 0);
}

// monta o texto "3 atos · 50 capítulos · 200 cenas"
function montarResumoPlot(plot) {
  const partes = [];
  if (plot.atos) partes.push(plot.atos + " atos");                       // estrutura (3, 4 ou 5 atos)
  partes.push((plot.capitulos || []).length + " capítulos");             // quantidade de capítulos
  const cenas = contarCenasDoPlot(plot);
  if (cenas > 0) partes.push(cenas + " cenas");                          // total de cenas (só se tiver)
  return partes.join(" · ");
}

// mostra no card o plot escolhido (ou o botão "Escolher plot")
function renderizarPlotSelecionado() {
  const plot = lerLista(CHAVE_PLOTS).find((p) => p.id === estado.plotSelecionado);
  if (plot) {
    textoNomePlot.textContent = plot.nome;
    textoResumoPlot.textContent = montarResumoPlot(plot);
    blocoPlotSelecionado.hidden = false; // mostra o card do plot
    botaoEscolherPlot.hidden = true;     // esconde "Escolher plot"
  } else {
    estado.plotSelecionado = "";         // plot sumiu ou nunca existiu
    blocoPlotSelecionado.hidden = true;
    botaoEscolherPlot.hidden = false;
  }
}

// abre o modal com a lista de plots
function abrirModalPlots() {
  const plots = lerLista(CHAVE_PLOTS);

  // remove os plots antigos da lista (mantém só o 1º item fixo: "Sem plot")
  listaPlotsModal.querySelectorAll("li:not(:first-child)").forEach((li) => li.remove());
  // se não existe nenhum plot, mostra o aviso
  mensagemSemPlots.hidden = plots.length > 0;

  // marca "Sem plot" ou o plot que já estava escolhido
  document.getElementById("ipt_plot_nenhum").checked = estado.plotSelecionado === "";

  plots.forEach((plot) => {
    const item = document.getElementById("template_item_plot_modal").content.cloneNode(true);
    const radio = item.querySelector(".rdo_plot_modal");
    radio.value = plot.id;                                   // o valor do radio é o id do plot
    radio.checked = estado.plotSelecionado === plot.id;      // marca se já estava escolhido
    item.querySelector(".nome_plot_modal").textContent = plot.nome;       // nome do plot
    item.querySelector(".resumo_plot_modal").textContent = montarResumoPlot(plot); // atos · capítulos · cenas
    listaPlotsModal.appendChild(item);
  });

  modalPlots.showModal(); // abre a caixa
}

botaoEscolherPlot.addEventListener("click", abrirModalPlots);
botaoTrocarPlot.addEventListener("click", abrirModalPlots);
botaoCancelarPlots.addEventListener("click", () => modalPlots.close());

// "Aplicar": guarda o plot marcado e atualiza o card
botaoConfirmarPlots.addEventListener("click", () => {
  const marcado = modalPlots.querySelector('input[name="plot"]:checked');
  estado.plotSelecionado = marcado ? marcado.value : "";
  renderizarPlotSelecionado();
  modalPlots.close();
});


// 9. MODAL DE IMAGENS (TELA 3)

// transforma um arquivo em texto base64, já reduzido para economizar espaço
function lerImagemReduzida(arquivo) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();                       // lê o arquivo do computador
    leitor.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    leitor.onload = () => {
      const imagem = new Image();                          // cria uma imagem na memória
      imagem.onerror = () => reject(new Error("Arquivo de imagem inválido."));
      imagem.onload = () => {
        // calcula o quanto precisa reduzir para caber em LADO_MAXIMO_PX
        const escala = Math.min(1, LADO_MAXIMO_PX / Math.max(imagem.width, imagem.height));
        const canvas = document.createElement("canvas");   // "folha de desenho" invisível
        canvas.width = Math.round(imagem.width * escala);
        canvas.height = Math.round(imagem.height * escala);
        canvas.getContext("2d").drawImage(imagem, 0, 0, canvas.width, canvas.height); // desenha reduzida
        resolve(canvas.toDataURL("image/jpeg", 0.8));      // devolve em texto (JPEG 80%)
      };
      imagem.src = leitor.result;                          // carrega a imagem lida
    };
    leitor.readAsDataURL(arquivo);                         // começa a leitura
  });
}

// transforma bytes em "1,8 MB" ou "320 KB"
function formatarTamanho(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1).replace(".", ",") + " MB";
  return Math.round(bytes / 1024) + " KB";
}

// redesenha a lista de imagens dentro do modal
function renderizarImagensPendentes() {
  listaImagensModal.innerHTML = "";

  estado.imagensPendentes.forEach((pendente) => {
    const item = document.getElementById("template_item_imagem_modal").content.cloneNode(true);
    item.querySelector(".miniatura_imagem_modal").src = pendente.dataUrl;       // miniatura
    item.querySelector(".nome_arquivo_imagem").textContent = pendente.nome;     // nome do arquivo
    item.querySelector(".tamanho_arquivo_imagem").textContent = formatarTamanho(pendente.tamanho);

    // os dois botões "Capa da história" e "Moodboard"
    item.querySelectorAll(".botao_destino_imagem").forEach((botao) => {
      // aparece "ativo" o botão que corresponde ao destino atual da imagem
      botao.setAttribute("aria-pressed", String(botao.dataset.destino === pendente.destino));

      botao.addEventListener("click", () => {
        if (botao.dataset.destino === "capa") {
          // só pode existir UMA capa: quem era capa vira moodboard
          estado.imagensPendentes.forEach((outra) => {
            if (outra.destino === "capa") outra.destino = "moodboard";
          });
        }
        pendente.destino = botao.dataset.destino; // aplica a escolha
        renderizarImagensPendentes();             // redesenha
      });
    });

    listaImagensModal.appendChild(item);
  });

  // atualiza os números "Imagens adicionadas (3)" e "Adicionar (3)"
  contadorImagensModal.textContent = estado.imagensPendentes.length;
  contadorBotaoImagens.textContent = estado.imagensPendentes.length;
}

// recebe os arquivos (do botão ou do arrastar-e-soltar) e coloca na lista
async function processarArquivos(arquivos) {
  limparMensagem(divMensagemModalImagens);

  for (const arquivo of arquivos) {
    // limite total: 1 capa + 5 moodboard = 6 imagens
    if (estado.imagensPendentes.length >= MAXIMO_MOODBOARD + 1) {
      mostrarMensagem(divMensagemModalImagens, "Limite de " + (MAXIMO_MOODBOARD + 1) + " imagens (1 capa + " + MAXIMO_MOODBOARD + " de moodboard).");
      break;
    }
    // formato inválido
    if (!TIPOS_ACEITOS.includes(arquivo.type)) {
      mostrarMensagem(divMensagemModalImagens, arquivo.name + ": use PNG, JPG ou WebP.");
      continue;
    }
    // arquivo grande demais
    if (arquivo.size > TAMANHO_MAXIMO_MB * 1024 * 1024) {
      mostrarMensagem(divMensagemModalImagens, arquivo.name + " passa de " + TAMANHO_MAXIMO_MB + " MB.");
      continue;
    }
    try {
      const dataUrl = await lerImagemReduzida(arquivo); // lê e reduz
      // se ainda não existe capa (nem salva, nem pendente), a 1ª imagem vira capa; as outras, moodboard
      const jaTemCapa = estado.capa || estado.imagensPendentes.some((p) => p.destino === "capa");
      estado.imagensPendentes.push({
        id: gerarId(),
        nome: arquivo.name,
        tamanho: arquivo.size,
        dataUrl: dataUrl,
        destino: jaTemCapa ? "moodboard" : "capa",
      });
    } catch (erro) {
      mostrarMensagem(divMensagemModalImagens, arquivo.name + ": não foi possível ler essa imagem.");
    }
  }
  renderizarImagensPendentes();
}

// abre o modal (sempre começa vazio)
botaoAdicionarImagem.addEventListener("click", () => {
  estado.imagensPendentes = [];
  limparMensagem(divMensagemModalImagens);
  renderizarImagensPendentes();
  modalImagens.showModal();
});

// fechar/cancelar o modal (X, botão Cancelar ou tecla Esc)
botaoFecharModalImagens.addEventListener("click", () => modalImagens.close());
botaoCancelarModalImagens.addEventListener("click", () => modalImagens.close());
modalImagens.addEventListener("close", () => {
  estado.imagensPendentes = []; // descarta o que não foi confirmado
});

// escolher arquivos pelo botão "Escolher imagens"
inputArquivos.addEventListener("change", () => {
  processarArquivos(Array.from(inputArquivos.files));
  inputArquivos.value = ""; // permite escolher o mesmo arquivo de novo depois
});

// arrastar e soltar: precisa cancelar o comportamento padrão do navegador
areaEnvioImagens.addEventListener("dragover", (evento) => {
  evento.preventDefault();
  areaEnvioImagens.classList.add("arrastando"); // classe opcional para estilizar no CSS
});
areaEnvioImagens.addEventListener("dragleave", () => areaEnvioImagens.classList.remove("arrastando"));
areaEnvioImagens.addEventListener("drop", (evento) => {
  evento.preventDefault();
  areaEnvioImagens.classList.remove("arrastando");
  processarArquivos(Array.from(evento.dataTransfer.files));
});

// botão "Adicionar (n)": passa as imagens do modal para o formulário
botaoConfirmarModalImagens.addEventListener("click", () => {
  const novasMoodboard = estado.imagensPendentes.filter((p) => p.destino === "moodboard");
  const novaCapa = estado.imagensPendentes.find((p) => p.destino === "capa");

  // não deixa passar de 5 imagens de moodboard no total
  if (estado.moodboard.length + novasMoodboard.length > MAXIMO_MOODBOARD) {
    mostrarMensagem(divMensagemModalImagens, "O moodboard aceita no máximo " + MAXIMO_MOODBOARD + " imagens (você já tem " + estado.moodboard.length + ").");
    return;
  }

  if (novaCapa) estado.capa = novaCapa.dataUrl;                                    // define a capa
  novasMoodboard.forEach((p) => estado.moodboard.push(p.dataUrl));                 // soma ao moodboard

  renderizarPreviewImagens(); // atualiza o painel esquerdo
  modalImagens.close();       // fecha o modal
});


// 10. CRIAR OS CAPÍTULOS A PARTIR DO PLOT

// cada capítulo do plot vira um capítulo da história, com status "não escrito"
function criarCapitulosDoPlot(historiaId, plot) {
  return (plot.capitulos || []).map((capPlot, indice) => ({
    id: gerarId(),                    // id do capítulo
    historiaId: historiaId,           // a qual história pertence
    numero: indice + 1,               // número do capítulo (1, 2, 3...)
    titulo: capPlot.titulo || "",     // título vindo do plot (vazio vira "Capítulo 01" na tela)
    sinopse: capPlot.sinopse || "",   // sinopse vinda do plot
    ato: capPlot.ato || "",           // em qual ato do plot o capítulo está
    plotTwist: Boolean(capPlot.plotTwist), // se foi marcado como plot twist
    status: "nao_escrito",            // todo capítulo começa como "não escrito"
    texto: "",                        // texto escrito (HTML) — preenchido na tela do capítulo
    cenas: (capPlot.cenas || []).map((cena) => ({
      titulo: cena.titulo || "",
      descricao: cena.descricao || "",
      concluida: false,               // o "check" da cena na aba Plot
    })),
  }));
}


// 11. MODO EDIÇÃO: PREENCHER O FORMULÁRIO COM A HISTÓRIA EXISTENTE

function carregarHistoriaParaEdicao() {
  // procura a história pelo id da URL
  historiaEmEdicao = lerLista(CHAVE_HISTORIAS).find((h) => h.id === idEdicao);
  // se não achou, volta para a lista
  if (!historiaEmEdicao) {
    window.location.href = "historias.html";
    return;
  }
  tituloFormulario.textContent = "Editar história";   // muda o título da página
  botaoSalvar.textContent = "Salvar alterações";      // muda o texto do botão
  inputNome.value = historiaEmEdicao.nome;            // nome

  // marca a classificação salva
  const radio = form.querySelector('input[name="classificacao"][value="' + historiaEmEdicao.classificacao + '"]');
  if (radio) radio.checked = true;

  // copia o resto para o estado (usa || para evitar valores indefinidos)
  estado.capa = historiaEmEdicao.capa || null;
  estado.moodboard = [...(historiaEmEdicao.moodboard || [])];
  estado.generosSelecionados = [...(historiaEmEdicao.generos || [])];
  estado.personagensSelecionados = [...(historiaEmEdicao.personagens || [])];
  estado.mundoSelecionado = historiaEmEdicao.mundo || "";
  estado.plotSelecionado = historiaEmEdicao.plot || "";
}


// 12. ENVIO DO FORMULÁRIO (criar ou salvar alterações)

form.addEventListener("submit", (evento) => {
  evento.preventDefault();               // impede a página de recarregar
  limparMensagem(divMensagemFormulario); // apaga erro antigo

  // ---- validações obrigatórias: nome e classificação ----
  const nome = inputNome.value.trim();
  if (!nome) {
    mostrarMensagem(divMensagemFormulario, "Informe o nome da história.");
    inputNome.focus();
    return;
  }
  const classificacaoMarcada = form.querySelector('input[name="classificacao"]:checked');
  if (!classificacaoMarcada) {
    mostrarMensagem(divMensagemFormulario, "Escolha a classificação indicativa.");
    return;
  }

  // ---- monta o objeto da história ----
  const historias = lerLista(CHAVE_HISTORIAS);
  const id = historiaEmEdicao ? historiaEmEdicao.id : gerarId(); // reaproveita o id na edição

  const historia = {
    id: id,
    nome: nome,
    classificacao: classificacaoMarcada.value,
    generos: estado.generosSelecionados,
    personagens: estado.personagensSelecionados,
    mundo: estado.mundoSelecionado,
    plot: estado.plotSelecionado,
    capa: estado.capa,
    moodboard: estado.moodboard,
    // mantém a cor antiga na edição; na criação sorteia uma nova
    corAleatoria: historiaEmEdicao ? historiaEmEdicao.corAleatoria : gerarCorAleatoria(),
    criadoEm: historiaEmEdicao ? historiaEmEdicao.criadoEm : new Date().toISOString(),
  };

  // ---- capítulos: criados automaticamente quando há um plot ----
  let capitulos = lerLista(CHAVE_CAPITULOS);
  const plot = lerLista(CHAVE_PLOTS).find((p) => p.id === historia.plot);
  const plotMudou = !historiaEmEdicao || historiaEmEdicao.plot !== historia.plot;

  if (plot && plotMudou) {
    // capítulos que essa história já tem
    const existentes = capitulos.filter((c) => c.historiaId === id);
    // algum deles já foi trabalhado? (status diferente de "não escrito" ou texto preenchido)
    const temTrabalho = existentes.some((c) => c.status !== "nao_escrito" || c.texto);

    if (temTrabalho) {
      // não apaga capítulos já escritos sem avisar
      const confirmou = confirm("Esta história já tem capítulos em andamento. Trocar o plot vai APAGAR todos os capítulos atuais. Continuar?");
      if (!confirmou) return; // o usuário desistiu
    }
    // remove os capítulos antigos dessa história e cria os novos a partir do plot
    capitulos = capitulos.filter((c) => c.historiaId !== id);
    capitulos = capitulos.concat(criarCapitulosDoPlot(id, plot));
  }

  // ---- grava no localStorage ----
  if (historiaEmEdicao) {
    // edição: troca a história antiga pela nova
    const indice = historias.findIndex((h) => h.id === id);
    historias[indice] = historia;
  } else {
    // criação: adiciona no final da lista
    historias.push(historia);
  }

  const salvou = salvarLista(CHAVE_HISTORIAS, historias) && salvarLista(CHAVE_CAPITULOS, capitulos);
  if (!salvou) {
    mostrarMensagem(divMensagemFormulario, "Não foi possível salvar: as imagens ocupam espaço demais. Tente remover algumas.");
    return;
  }

  // vai para a tela da história (tela 4)
  window.location.href = "historia.html?id=" + id;
});


// ---------------------------------------------------------------------
// 13. INICIALIZAÇÃO
// ---------------------------------------------------------------------

preencherMenuUsuario();                    // menu lateral
if (idEdicao) carregarHistoriaParaEdicao(); // se tem ?id=, carrega a história para editar
renderizarPreviewImagens();                // painel esquerdo
renderizarGeneros();                       // tags de gênero
renderizarPersonagens();                   // lista de personagens
renderizarMundos();                        // lista de mundos
renderizarPlotSelecionado();               // card do plot