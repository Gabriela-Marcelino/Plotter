// =====================================================================
// Rotas usadas (src/routes/historias.js e src/routes/capitulos.js):
//   GET  /historias/generos-usuario/:idUsuario  gêneros que o usuário já usou
//   GET  /historias/plots/:idUsuario            plots para o modal "Escolher plot"
//   GET  /historias/buscar/:idHistoria          dados da história (modo edição)
//   GET  /historias/generos/:idHistoria         gêneros da história (modo edição)
//   GET  /historias/moodboard/:idHistoria       moodboard da história (modo edição)
//   GET  /capitulos/listar/:idHistoria          para avisar antes de trocar o plot
//   POST /historias/cadastrar                   cria a história
//   PUT  /historias/atualizar/:idHistoria       salva a edição
// =====================================================================

// 1. CONSTANTES

const idUsuario = sessionStorage.ID_USUARIO; // usuário logado (guardado pelo login.js)

const MAXIMO_GENEROS = 5;      // máximo de gêneros por história
const MAXIMO_MOODBOARD = 5;    // máximo de imagens de moodboard (a capa é +4)
const TAMANHO_MAXIMO_MB = 8;   // tamanho máximo de cada arquivo enviado
const LADO_MAXIMO_PX = 900;    // a imagem é reduzida para caber nesse tamanho antes de salvar
const TIPOS_ACEITOS = ["image/png", "image/jpeg", "image/webp"]; // formatos permitidos


// 2. FUNÇÕES AUXILIARES (servidor, menu, ids, iniciais)

// faz um GET e devolve o JSON (dá erro se o servidor responder com falha)
async function buscarJson(endereco) {
  const resposta = await fetch(endereco);
  if (!resposta.ok) throw new Error("Falha ao buscar " + endereco);
  return resposta.json();
}

// preenche nome/inicial do usuário no menu lateral
function preencherMenuUsuario() {
  const nome = sessionStorage.NOME_USUARIO || "Usuário";
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
  plotSelecionado: "",       // id do plot ("" = nenhum)
  imagensPendentes: [],      // imagens que estão no modal e ainda não foram confirmadas
};

// listas que vêm do banco quando a página abre
let generosDisponiveis = []; // nomes dos gêneros que o usuário já usou
let plotsDisponiveis = [];   // plots do usuário

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
  listaGeneros.innerHTML = ""; // limpa a lista

  // gêneros que o usuário já usou (começa vazia na 1ª vez)
  generosDisponiveis.forEach((genero) => {
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

  // procura se já existe um gênero igual (ignorando maiúsculas/minúsculas)
  const existente = generosDisponiveis.find((g) => g.toLowerCase() === nome.toLowerCase());
  const nomeFinal = existente || nome;

  // se for novo, entra na lista da tela; vai para o banco quando a história for salva
  if (!existente) {
    generosDisponiveis.push(nome);
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


// 8. PLOT (card + modal "Escolher plot")

// monta o texto "3 atos · 50 capítulos · 200 cenas"
// (estrutura, totalCapitulos e totalCenas vêm do banco)
function montarResumoPlot(plot) {
  const partes = [];
  if (plot.estrutura && plot.estrutura !== "livre") partes.push(plot.estrutura + " atos"); // 3, 4 ou 5 atos
  partes.push(plot.totalCapitulos + " capítulos");                                        // quantidade de capítulos
  if (plot.totalCenas > 0) partes.push(plot.totalCenas + " cenas");                       // total de cenas (só se tiver)
  return partes.join(" · ");
}

// mostra no card o plot escolhido (ou o botão "Escolher plot")
function renderizarPlotSelecionado() {
  const plot = plotsDisponiveis.find((p) => p.idPlot === estado.plotSelecionado);
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
  // só aparecem plots livres ou o que já está nesta história
  // (cada plot fica vinculado a uma história só)
  const plots = plotsDisponiveis.filter((p) => !p.idHistoria || String(p.idHistoria) === idEdicao);

  // remove os plots antigos da lista (mantém só o 1º item fixo: "Sem plot")
  listaPlotsModal.querySelectorAll("li:not(:first-child)").forEach((li) => li.remove());
  // se não existe nenhum plot, mostra o aviso
  mensagemSemPlots.hidden = plots.length > 0;

  // marca "Sem plot" ou o plot que já estava escolhido
  document.getElementById("ipt_plot_nenhum").checked = estado.plotSelecionado === "";

  plots.forEach((plot) => {
    const item = document.getElementById("template_item_plot_modal").content.cloneNode(true);
    const radio = item.querySelector(".rdo_plot_modal");
    radio.value = plot.idPlot;                               // o valor do radio é o id do plot
    radio.checked = estado.plotSelecionado === plot.idPlot;  // marca se já estava escolhido
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


// 10. MODO EDIÇÃO: PREENCHER O FORMULÁRIO COM A HISTÓRIA DO BANCO

async function carregarHistoriaParaEdicao() {
  // busca a história, os gêneros e o moodboard ao mesmo tempo
  const [resultado, generos, moodboard] = await Promise.all([
    buscarJson("/historias/buscar/" + idEdicao),
    buscarJson("/historias/generos/" + idEdicao),
    buscarJson("/historias/moodboard/" + idEdicao),
  ]);

  historiaEmEdicao = resultado[0];
  // não existe, ou é de outro usuário: volta para a lista
  if (!historiaEmEdicao || String(historiaEmEdicao.idUsuario) !== String(idUsuario)) {
    window.location.href = "historias.html";
    return;
  }

  tituloFormulario.textContent = "Editar história";   // muda o título da página
  botaoSalvar.textContent = "Salvar alterações";      // muda o texto do botão
  inputNome.value = historiaEmEdicao.nome;            // nome

  // marca a classificação salva
  const radio = form.querySelector('input[name="classificacao"][value="' + historiaEmEdicao.classificacao + '"]');
  if (radio) radio.checked = true;

  // copia o resto para o estado
  estado.capa = historiaEmEdicao.capa || null;
  estado.moodboard = moodboard.map((m) => m.imagem);
  estado.generosSelecionados = generos.map((g) => g.nome);
  estado.plotSelecionado = historiaEmEdicao.idPlot || "";
}


// 11. TROCA DE PLOT: AVISA ANTES DE APAGAR CAPÍTULOS JÁ TRABALHADOS

// devolve true se pode continuar salvando
async function confirmarTrocaDePlot() {
  const plotAntigo = historiaEmEdicao ? historiaEmEdicao.idPlot || "" : "";
  const plotMudou = estado.plotSelecionado !== plotAntigo;

  // só importa na edição, quando um plot NOVO foi escolhido (o servidor recria os capítulos)
  if (!historiaEmEdicao || !plotMudou || !estado.plotSelecionado) return true;

  const capitulos = await buscarJson("/capitulos/listar/" + idEdicao);
  // algum capítulo já foi trabalhado? (status diferente de "não escrito" ou com palavras)
  const temTrabalho = capitulos.some((c) => c.status !== "nao_escrito" || c.palavras > 0);
  if (!temTrabalho) return true;

  return confirm("Esta história já tem capítulos em andamento. Trocar o plot vai APAGAR todos os capítulos atuais. Continuar?");
}


// 12. ENVIO DO FORMULÁRIO (criar ou salvar alterações)

form.addEventListener("submit", async (evento) => {
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

  botaoSalvar.disabled = true; // evita clique duplo (criaria a história duas vezes)
  try {
    if (!(await confirmarTrocaDePlot())) return; // o usuário desistiu

    // ---- dados enviados para o servidor ----
    const dados = {
      idUsuarioServer: idUsuario,
      nomeServer: nome,
      classificacaoServer: classificacaoMarcada.value,
      capaServer: estado.capa,
      // a cor só é usada na criação; na edição o servidor mantém a antiga
      corServer: gerarCorAleatoria(),
      generosServer: estado.generosSelecionados,
      moodboardServer: estado.moodboard,
      idPlotServer: estado.plotSelecionado,
    };

    const endereco = historiaEmEdicao ? "/historias/atualizar/" + idEdicao : "/historias/cadastrar";
    const resposta = await fetch(endereco, {
      method: historiaEmEdicao ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });

    if (!resposta.ok) {
      // 413 = as imagens passaram do limite que o servidor aceita
      const texto = resposta.status === 413
        ? "As imagens ocupam espaço demais. Tente remover algumas."
        : (await resposta.text()) || "Não foi possível salvar a história.";
      mostrarMensagem(divMensagemFormulario, texto);
      return;
    }

    const salva = await resposta.json(); // { idHistoria }
    // vai para a tela da história (tela 4)
    window.location.href = "historia.html?id=" + salva.idHistoria;
  } catch (erro) {
    console.log(erro);
    mostrarMensagem(divMensagemFormulario, "Erro ao conectar com o servidor.");
  } finally {
    botaoSalvar.disabled = false;
  }
});


// ---------------------------------------------------------------------
// 13. INICIALIZAÇÃO
// ---------------------------------------------------------------------

async function iniciar() {
  preencherMenuUsuario(); // menu lateral
  try {
    // gêneros e plots do usuário (opções do formulário)
    const [generos, plots] = await Promise.all([
      buscarJson("/historias/generos-usuario/" + idUsuario),
      buscarJson("/historias/plots/" + idUsuario),
    ]);
    generosDisponiveis = generos.map((g) => g.nome);
    plotsDisponiveis = plots;

    // se tem ?id=, carrega a história para editar
    if (idEdicao) await carregarHistoriaParaEdicao();
  } catch (erro) {
    console.log(erro);
    mostrarMensagem(divMensagemFormulario, "Não foi possível carregar os dados do servidor.");
  }
  renderizarPreviewImagens();  // painel esquerdo
  renderizarGeneros();         // tags de gênero
  renderizarPlotSelecionado(); // card do plot
}

iniciar();
