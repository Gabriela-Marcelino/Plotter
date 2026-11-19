// =====================================================================
// O QUE ESTA TELA ESPERA RECEBER DO BANCO (via API)
// =====================================================================
//
// As rotas abaixo estão em src/routes/dashboard.js
// (routes -> controller -> model -> SELECTs em src/models/dashboardModel.js).
// Os nomes dos campos são sugestões: se no seu banco for outro nome,
// é só trocar aqui no JS também.
//
// 1) GET /dashboard/escrita/:idUsuario
//    quantas palavras foram escritas em cada dia dos últimos ~6 meses:
//    [{ dia: "2026-10-15", palavras: 830 }, ...]
//    IMPORTANTE: devolva o dia como TEXTO "AAAA-MM-DD", usando no SELECT:
//      DATE_FORMAT(dataEscrita, '%Y-%m-%d') AS dia, SUM(palavras) AS palavras
//      ... WHERE dataEscrita >= CURDATE() - INTERVAL 190 DAY GROUP BY dia
//    (se vier como data, o JavaScript pode mudar o dia por causa do fuso horário)
//
// 2) GET /dashboard/meta/:idUsuario
//    [{ metaMensal: 20000 }]
//
// 3) GET /dashboard/ultimo-capitulo/:idUsuario
//    o capítulo editado por último (ORDER BY ultimaEdicao DESC LIMIT 1):
//    [{ idHistoria, idCapitulo, nomeHistoria, capa, cor, numero, palavras }]
//    (vetor vazio se a usuária ainda não escreveu nenhum capítulo)
//
// 4) GET /dashboard/historias/:idUsuario
//    [{ idHistoria, nome, cor, totalCapitulos, capitulosFeitos }, ...]
//      - capitulosFeitos: capítulos com status a_revisar, revisado,
//        concluido ou publicado (a mesma regra da tela da história)
//
// 5) GET /dashboard/ideias
//    [{ texto: "Escreva uma cena em que o personagem perde algo importante." }, ...]
//
// =====================================================================


// =====================================================================
// CONSTANTES E VARIÁVEIS
// =====================================================================

var MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
var MESES_LONGOS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

// cores usadas quando a história não tem cor salva no banco
var CORES_PADRAO = ["#8b5cf6", "#22a35a", "#e9a824", "#3b82f6", "#ef4444", "#ec4899"];

// id do usuário logado (o login.js guardou no sessionStorage)
// FORA DO CONTEÚDO: "sessionStorage" é onde o login guardou os dados do
// usuário (vale enquanto a aba estiver aberta).
var idUsuario = sessionStorage.ID_USUARIO;

// vetor com um objeto para cada dia mostrado no calendário (preenchido em montarDias)
var dias = [];

// meta mensal atual (muda quando a usuária edita no modal)
var metaAtual = 0;

// gráfico de cadência já desenhado (para apagar antes de desenhar de novo)
var graficoCadencia = null;

// ideias que vieram do banco e qual delas está aparecendo agora
var ideias = [];
var indiceIdeia = 0;


// =====================================================================
// FUNÇÕES AUXILIARES
// =====================================================================

// transforma 1 em "01", 12 em "12"
function doisDigitos(numero) {
  if (numero < 10) {
    return "0" + numero;
  } else {
    return "" + numero;
  }
}

// 12480 -> "12.480" (coloca um ponto a cada 3 dígitos, da direita para a esquerda)
function formatarNumero(numero) {
  // número negativo: formata sem o sinal e coloca o "-" na frente depois
  if (numero < 0) {
    return "-" + formatarNumero(numero * -1);
  }

  var texto = "" + numero;
  var resultado = "";
  var contador = 0;

  for (var i = texto.length - 1; i >= 0; i--) {
    if (contador == 3) {
      resultado = "." + resultado;
      contador = 0;
    }
    resultado = texto[i] + resultado;
    contador++;
  }
  return resultado;
}

// quantos dias tem um mês (mes de 1 a 12)
function diasNoMes(mes, ano) {
  var quantidades = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  // ano bissexto: fevereiro tem 29 dias
  if (mes == 2 && ((ano % 4 == 0 && ano % 100 != 0) || ano % 400 == 0)) {
    return 29;
  }
  return quantidades[mes - 1];
}

// "Ecos de Cinza" -> "EC"
function gerarIniciais(nome) {
  var palavras = nome.split(" ");
  var iniciais = "";
  for (var i = 0; i < palavras.length && iniciais.length < 2; i++) {
    if (palavras[i].length > 2) {
      iniciais = iniciais + palavras[i][0].toUpperCase();
    }
  }
  if (iniciais == "") {
    iniciais = nome[0].toUpperCase();
  }
  return iniciais;
}

// devolve a cor da história, ou uma cor padrão se não tiver
function corDaHistoria(historia, posicao) {
  if (historia.cor) {
    return historia.cor;
  }
  return CORES_PADRAO[posicao % CORES_PADRAO.length];
}

// Monta o vetor "dias": um objeto JSON para cada dia, do mais antigo até hoje.
// O primeiro dia é sempre uma SEGUNDA-FEIRA, 25 semanas antes da semana atual,
// porque o calendário tem 26 colunas (semanas) e começa na segunda.
//
// FORA DO CONTEÚDO: "new Date()" é o jeito do JavaScript de pegar a data de hoje.
//   - hoje.getDate()     -> dia do mês (1 a 31)
//   - hoje.getMonth()    -> mês, mas começando do ZERO (janeiro = 0, dezembro = 11)
//   - hoje.getFullYear() -> ano (ex.: 2026)
//   - hoje.getDay()      -> dia da semana, começando no domingo (domingo = 0, sábado = 6)
//   - new Date(ano, mes, dia) cria uma data. Se o dia for 0 ou negativo, ele
//     volta para o mês anterior sozinho (por isso dá para fazer "dia - 30").
function montarDias() {
  var hoje = new Date();

  // posição de hoje na semana, começando na segunda (seg = 0 ... dom = 6)
  var posicaoNaSemana = hoje.getDay() - 1;
  if (posicaoNaSemana == -1) {
    posicaoNaSemana = 6; // domingo
  }

  var totalDias = 25 * 7 + posicaoNaSemana + 1;

  // vai do dia mais antigo (i grande) até hoje (i = 0)
  for (var i = totalDias - 1; i >= 0; i--) {
    var data = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - i);
    var dia = data.getDate();
    var mes = data.getMonth() + 1; // +1 para janeiro virar 1
    var ano = data.getFullYear();

    dias.push({
      texto: ano + "-" + doisDigitos(mes) + "-" + doisDigitos(dia), // igual ao banco
      dia: dia,
      mes: mes,
      ano: ano,
      palavras: 0, // preenchido depois com o que vier do banco
    });
  }
}


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
// MENU LATERAL E BOAS-VINDAS
// =====================================================================

function preencherUsuario() {
  var nome = sessionStorage.NOME_USUARIO;
  if (nome == undefined || nome == "") {
    nome = "Usuário";
  }

  // só o primeiro nome na saudação ("Gabriela Marcelino" -> "Gabriela")
  var primeiroNome = nome.split(" ")[0];

  nome_usuario_menu.innerHTML = primeiroNome;
  inicial_usuario_menu.innerHTML = nome[0].toUpperCase();
  nome_usuario_dashboard.innerHTML = primeiroNome;
}


// =====================================================================
// ESCRITA DO MÊS (indicadores, gráfico, calendário, sequência)
// =====================================================================

// Primeiro busca a meta, depois os dias de escrita.
// As duas informações são necessárias para calcular os indicadores.
function carregarEscrita() {
  fetch("/dashboard/meta/" + idUsuario)
    .then(function (resposta) {
      if (resposta.ok) {
        resposta.json().then(function (resultadoMeta) {
          var meta = 0;
          if (resultadoMeta.length > 0) {
            meta = resultadoMeta[0].metaMensal;
          }
          carregarDiasDeEscrita(meta);
        });
      } else {
        texto_resumo_meta_dashboard.innerHTML = "Não foi possível carregar sua meta.";
      }
    })
    .catch(function (erro) {
      console.log(erro);
      texto_resumo_meta_dashboard.innerHTML = "Erro ao conectar com o servidor.";
    });
}

function carregarDiasDeEscrita(meta) {
  fetch("/dashboard/escrita/" + idUsuario)
    .then(function (resposta) {
      if (resposta.ok) {
        resposta.json().then(function (registros) {
          // coloca as palavras de cada registro do banco no dia certo do vetor "dias"
          for (var r = 0; r < registros.length; r++) {
            for (var d = 0; d < dias.length; d++) {
              if (dias[d].texto == registros[r].dia) {
                dias[d].palavras = Number(registros[r].palavras);
              }
            }
          }

          renderizarIndicadores(meta);
          renderizarSequencia();
          renderizarCalendario();
          renderizarGraficoCadencia(meta);
        });
      } else {
        texto_resumo_meta_dashboard.innerHTML = "Não foi possível carregar sua escrita.";
      }
    })
    .catch(function (erro) {
      console.log(erro);
      texto_resumo_meta_dashboard.innerHTML = "Erro ao conectar com o servidor.";
    });
}

// Os 4 cards brancos do topo + o texto de boas-vindas.
function renderizarIndicadores(meta) {
  metaAtual = meta;
  var hoje = dias[dias.length - 1]; // o último dia do vetor é hoje
  var totalDiasMes = diasNoMes(hoje.mes, hoje.ano);

  // mês passado (se hoje é janeiro, o mês passado é dezembro do ano anterior)
  var mesPassado = hoje.mes - 1;
  var anoMesPassado = hoje.ano;
  if (mesPassado == 0) {
    mesPassado = 12;
    anoMesPassado = hoje.ano - 1;
  }

  var palavrasMes = 0;
  var palavrasMesPassado = 0; // só até o mesmo dia de hoje, para a comparação ser justa
  var melhorDia = dias[0];

  for (var i = 0; i < dias.length; i++) {
    var d = dias[i];

    if (d.mes == hoje.mes && d.ano == hoje.ano) {
      palavrasMes += d.palavras;
    }
    if (d.mes == mesPassado && d.ano == anoMesPassado && d.dia <= hoje.dia) {
      palavrasMesPassado += d.palavras;
    }
    if (d.palavras > melhorDia.palavras) {
      melhorDia = d;
    }
  }

  // ---- Palavras no mês ----
  valor_palavras_mes.innerHTML = formatarNumero(palavrasMes);

  if (palavrasMesPassado > 0) {
    var diferenca = palavrasMes - palavrasMesPassado;
    // FORA DO CONTEÚDO: "Math.round" arredonda. Multiplicar por 10 antes e
    // dividir depois deixa 1 casa decimal (12.43 -> 124.3 -> 124 -> 12.4).
    var variacao = Math.round((diferenca / palavrasMesPassado) * 1000) / 10;
    // troca o ponto decimal por vírgula (12.4 -> "12,4")
    var textoVariacao = ("" + variacao).replace(".", ",");

    var sinal = "";
    if (diferenca >= 0) {
      sinal = "+";
    }
    variacao_palavras_mes.innerHTML = sinal + textoVariacao + "%";

    // etiqueta verde quando subiu, vermelha quando caiu
    // FORA DO CONTEÚDO: ".style.algumaCoisa" muda o CSS do elemento pelo JS
    // (backgroundColor = background-color, color = color).
    if (diferenca >= 0) {
      variacao_palavras_mes.style.backgroundColor = "#dcf5e5";
      variacao_palavras_mes.style.color = "#1f9d55";
    } else {
      variacao_palavras_mes.style.backgroundColor = "#fde2e2";
      variacao_palavras_mes.style.color = "#d64545";
    }

    comparativo_palavras_mes.innerHTML =
      "vs. mês passado (" + sinal + formatarNumero(diferenca) + ")";
  } else {
    variacao_palavras_mes.innerHTML = ""; // o CSS esconde a etiqueta vazia
    comparativo_palavras_mes.innerHTML = "sem escrita no mês passado";
  }

  // ---- Melhor dia de escrita ----
  if (melhorDia.palavras > 0) {
    valor_melhor_dia.innerHTML = melhorDia.dia + " " + MESES_CURTOS[melhorDia.mes - 1] + ".";
    detalhe_melhor_dia.innerHTML = formatarNumero(melhorDia.palavras) + " palavras nesse dia";
  } else {
    valor_melhor_dia.innerHTML = "—";
    detalhe_melhor_dia.innerHTML = "nenhuma palavra registrada ainda";
  }

  // ---- Meta mensal ----
  var porcentagemMeta = 0;
  if (meta > 0) {
    porcentagemMeta = Math.round((palavrasMes / meta) * 100);
  }
  // a barra não pode passar de 100% da largura
  var larguraBarra = porcentagemMeta;
  if (larguraBarra > 100) {
    larguraBarra = 100;
  }

  valor_meta_mensal.innerHTML = formatarNumero(meta);
  porcentagem_meta_mensal.innerHTML = porcentagemMeta + "%";
  // ".style.width" muda a largura (width) da barra amarela pelo JS
  preenchimento_progresso_meta.style.width = larguraBarra + "%";

  // ---- Média diária ----
  // palavras do mês divididas pela quantidade de entradas (dias do mês em que
  // houve escrita), e não por todos os dias que já passaram
  var diasComEscrita = 0;
  for (var e = 0; e < dias.length; e++) {
    if (dias[e].mes == hoje.mes && dias[e].ano == hoje.ano && dias[e].palavras > 0) {
      diasComEscrita++;
    }
  }

  var mediaDiaria = 0;
  if (diasComEscrita > 0) {
    mediaDiaria = Math.round(palavrasMes / diasComEscrita);
  }
  valor_media_diaria.innerHTML = formatarNumero(mediaDiaria);

  if (diasComEscrita == 0) {
    detalhe_media_diaria.innerHTML = "nenhuma entrada neste mês";
  } else if (diasComEscrita == 1) {
    detalhe_media_diaria.innerHTML = "em 1 entrada";
  } else {
    detalhe_media_diaria.innerHTML = "em " + diasComEscrita + " entradas";
  }

  var faltaParaMeta = meta - palavrasMes;

  // ---- Texto de boas-vindas ----
  // compara quanto da meta já foi escrito com quanto do mês já passou
  var nomeMes = MESES_LONGOS[hoje.mes - 1];

  if (meta == 0) {
    texto_resumo_meta_dashboard.innerHTML = "Defina uma meta mensal para acompanhar seu ritmo.";
  } else if (faltaParaMeta <= 0) {
    texto_resumo_meta_dashboard.innerHTML = "Você já bateu a meta de " + nomeMes + ". Parabéns!";
  } else {
    var porcentagemDoMesPassada = (hoje.dia / totalDiasMes) * 100;
    var adiantamento = Math.round(porcentagemMeta - porcentagemDoMesPassada);

    if (adiantamento >= 0) {
      texto_resumo_meta_dashboard.innerHTML =
        "Você está " + adiantamento + "% à frente da meta do mês. Falta pouco para fechar " + nomeMes + ".";
    } else {
      texto_resumo_meta_dashboard.innerHTML =
        "Você está " + (adiantamento * -1) + "% atrás da meta do mês. Ainda dá tempo de fechar " + nomeMes + "!";
    }
  }

  nome_mes_cadencia.innerHTML = nomeMes;
}

// Quantos dias seguidos a usuária escreveu (contando de hoje para trás).
// Se hoje ainda não escreveu, começa a contar de ontem (a sequência não quebrou ainda).
function renderizarSequencia() {
  var posicao = dias.length - 1; // hoje
  if (dias[posicao].palavras == 0) {
    posicao--; // ontem
  }

  var sequencia = 0;
  while (posicao >= 0 && dias[posicao].palavras > 0) {
    sequencia++;
    posicao--;
  }

  if (sequencia == 1) {
    valor_sequencia_dias.innerHTML = "1 dia";
  } else {
    valor_sequencia_dias.innerHTML = sequencia + " dias";
  }
}

// Calendário de 26 semanas: cada quadradinho é um dia.
// Quanto mais palavras, mais escuro (o CSS pinta pelo "data-nivel").
function renderizarCalendario() {
  var htmlDias = "";

  for (var i = 0; i < dias.length; i++) {
    var palavras = dias[i].palavras;
    var nivel = 0;

    if (palavras >= 1000) {
      nivel = 4;
    } else if (palavras >= 500) {
      nivel = 3;
    } else if (palavras >= 250) {
      nivel = 2;
    } else if (palavras > 0) {
      nivel = 1;
    }

    // "title" mostra a data e as palavras ao passar o mouse
    htmlDias +=
      "<span class='dia_calendario' data-nivel='" + nivel + "'" +
      " title='" + dias[i].dia + " " + MESES_CURTOS[dias[i].mes - 1] + ": " + formatarNumero(palavras) + " palavras'></span>";
  }
  grade_calendario_escrita.innerHTML = htmlDias;

  // nome do mês em cima da coluna (semana) em que o mês começa
  var htmlMeses = "";
  for (var semana = 0; semana < 26; semana++) {
    var mesDaSemana = dias[semana * 7].mes; // a segunda-feira daquela semana
    var mostrar = false;

    if (semana == 0) {
      // 1ª coluna: só mostra se a próxima semana ainda for do mesmo mês
      // (senão os dois nomes ficariam grudados)
      mostrar = dias[7].mes == mesDaSemana;
    } else if (mesDaSemana != dias[(semana - 1) * 7].mes) {
      mostrar = true; // o mês mudou nesta semana
    }

    if (mostrar) {
      htmlMeses += "<p>" + MESES_CURTOS[mesDaSemana - 1] + "</p>";
    } else {
      htmlMeses += "<p></p>";
    }
  }
  meses_calendario.innerHTML = htmlMeses;
}

// Gráfico "Cadência do mês": palavras acumuladas dia a dia + linha da meta.
//
// FORA DO CONTEÚDO: o gráfico é desenhado pela biblioteca Chart.js
// (carregada no HTML). "new Chart(canvas, configuracao)" desenha o gráfico.
// A configuração é um objeto JSON que diz:
//   - type: o tipo de gráfico ("line" = linha)
//   - data.labels: os textos do eixo de baixo (1 out, 2 out...)
//   - data.datasets: as linhas do gráfico (cada uma com seus valores e cores)
//   - options: detalhes de aparência
function renderizarGraficoCadencia(meta) {
  var hoje = dias[dias.length - 1];
  var totalDiasMes = diasNoMes(hoje.mes, hoje.ano);
  var mesCurto = MESES_CURTOS[hoje.mes - 1];

  // palavras de cada dia deste mês (posição 0 = dia 1)
  var palavrasPorDia = [];
  for (var p = 0; p < totalDiasMes; p++) {
    palavrasPorDia.push(0);
  }
  for (var i = 0; i < dias.length; i++) {
    if (dias[i].mes == hoje.mes && dias[i].ano == hoje.ano) {
      palavrasPorDia[dias[i].dia - 1] = dias[i].palavras;
    }
  }

  var rotulos = []; // "1 out", "2 out"...
  var escrito = []; // soma acumulada até cada dia
  var linhaMeta = []; // quanto deveria ter sido escrito até cada dia
  var tamanhoPontos = []; // só o ponto de hoje aparece
  var acumulado = 0;

  for (var dia = 1; dia <= totalDiasMes; dia++) {
    rotulos.push(dia + " " + mesCurto);
    linhaMeta.push(Math.round((meta / totalDiasMes) * dia));

    if (dia <= hoje.dia) {
      acumulado += palavrasPorDia[dia - 1];
      escrito.push(acumulado);
    } else {
      escrito.push(null); // dias que ainda não chegaram ficam sem valor
    }

    if (dia == hoje.dia) {
      tamanhoPontos.push(5);
    } else {
      tamanhoPontos.push(0);
    }
  }

  // se já existe um gráfico (a meta mudou), apaga antes de desenhar de novo
  if (graficoCadencia != null) {
    graficoCadencia.destroy();
  }

  graficoCadencia = new Chart(grafico_cadencia_mes, {
    type: "line",
    data: {
      labels: rotulos,
      datasets: [
        {
          label: "Escrito",
          data: escrito,
          borderColor: "#22a35a",
          backgroundColor: "rgba(34, 163, 90, 0.12)",
          fill: true, // pinta a área embaixo da linha
          pointRadius: tamanhoPontos,
          pointBackgroundColor: "#22a35a",
          tension: 0.3, // deixa a linha levemente curva
        },
        {
          label: "Meta do mês",
          data: linhaMeta,
          borderColor: "#4a4559",
          borderDash: [5, 5], // linha tracejada
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, // usa a altura definida no CSS
      plugins: {
        legend: { display: false }, // a legenda já está no HTML
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { maxTicksLimit: 5, color: "#5b5670", font: { size: 10 } },
        },
        y: {
          beginAtZero: true,
          ticks: {
            maxTicksLimit: 5,
            color: "#5b5670",
            font: { size: 10 },
            // FORA DO CONTEÚDO: "callback" é uma função que o Chart.js chama
            // para escrever cada número do eixo. Aqui 15000 vira "15k".
            callback: function (valor) {
              return valor / 1000 + "k";
            },
          },
        },
      },
    },
  });
}


// =====================================================================
// CONTINUE DE ONDE PAROU
// =====================================================================

function carregarUltimoCapitulo() {
  fetch("/dashboard/ultimo-capitulo/" + idUsuario)
    .then(function (resposta) {
      if (resposta.ok) {
        resposta.json().then(function (resultado) {
          renderizarUltimoCapitulo(resultado);
        });
      } else {
        titulo_continuar_escrita.innerHTML = "Não foi possível carregar.";
      }
    })
    .catch(function (erro) {
      console.log(erro);
      titulo_continuar_escrita.innerHTML = "Erro ao conectar com o servidor.";
    });
}

function renderizarUltimoCapitulo(resultado) {
  if (resultado.length == 0) {
    titulo_continuar_escrita.innerHTML = "Nenhum capítulo ainda";
    detalhe_continuar_escrita.innerHTML = "Crie uma história para começar a escrever.";
    botao_abrir_capitulo.innerHTML = ""; // o CSS esconde o botão vazio
    return;
  }

  var capitulo = resultado[0];
  var numero = doisDigitos(capitulo.numero);

  // capa da história (ou a cor + iniciais, se não tiver capa)
  if (capitulo.capa) {
    capa_continuar_escrita.innerHTML = "<img src='" + capitulo.capa + "' alt='Capa da história'>";
  } else {
    var cor = "#8b5cf6";
    if (capitulo.cor) {
      cor = capitulo.cor;
    }
    capa_continuar_escrita.innerHTML =
      "<div class='capa_sem_imagem_continuar' style='--cor-historia: " + cor + "'>" +
      gerarIniciais(capitulo.nomeHistoria) +
      "</div>";
  }

  titulo_continuar_escrita.innerHTML = capitulo.nomeHistoria;
  detalhe_continuar_escrita.innerHTML =
    "Capítulo " + numero + " · " + formatarNumero(capitulo.palavras) + " palavras";

  botao_abrir_capitulo.innerHTML = "Abrir capítulo " + numero;
  // ".href" é o endereço para onde o link leva
  botao_abrir_capitulo.href =
    "capitulo.html?historia=" + capitulo.idHistoria + "&capitulo=" + capitulo.idCapitulo;
}


// =====================================================================
// HISTÓRIAS (progresso em cada história + projetos ativos)
// =====================================================================

function carregarHistorias() {
  fetch("/dashboard/historias/" + idUsuario)
    .then(function (resposta) {
      if (resposta.ok) {
        resposta.json().then(function (historias) {
          renderizarProgressoHistorias(historias);
          renderizarProjetosAtivos(historias);
        });
      } else {
        valor_projetos_ativos.innerHTML = "—";
      }
    })
    .catch(function (erro) {
      console.log(erro);
      valor_projetos_ativos.innerHTML = "—";
    });
}

function renderizarProgressoHistorias(historias) {
  if (historias.length == 0) {
    lista_progresso_historias.innerHTML = "<li class='item_projeto_ativo'>Nenhuma história ainda.</li>";
    return;
  }

  var html = "";

  // mostra no máximo 4 (o link "Ver todas" leva para a lista completa)
  for (var i = 0; i < historias.length && i < 4; i++) {
    var historia = historias[i];
    var cor = corDaHistoria(historia, i);

    var porcentagem = 0;
    if (historia.totalCapitulos > 0) {
      porcentagem = Math.round((historia.capitulosFeitos / historia.totalCapitulos) * 100);
    }

    // "--cor-historia" pinta a bolinha e a barra; "--progresso" é a largura da barra
    html +=
      "<li class='item_progresso_historia' style='--cor-historia: " + cor + "'>" +
      "<div class='cabecalho_item_progresso_historia'>" +
      "<div class='nome_item_progresso_historia'>" +
      "<span class='bolinha_historia'></span>" +
      "<p>" + historia.nome + "</p>" +
      "</div>" +
      "<p>" + historia.capitulosFeitos + " / " + historia.totalCapitulos + " capítulos</p>" +
      "</div>" +
      "<div class='barra_progresso_historia'>" +
      "<div class='preenchimento_progresso_historia' style='--progresso: " + porcentagem + "%'></div>" +
      "</div>" +
      "</li>";
  }

  lista_progresso_historias.innerHTML = html;
}

function renderizarProjetosAtivos(historias) {
  if (historias.length == 1) {
    valor_projetos_ativos.innerHTML = "1 história";
  } else {
    valor_projetos_ativos.innerHTML = historias.length + " histórias";
  }

  var html = "";
  for (var i = 0; i < historias.length; i++) {
    html +=
      "<li class='item_projeto_ativo' style='--cor-historia: " + corDaHistoria(historias[i], i) + "'>" +
      "<span class='bolinha_historia'></span>" +
      "<p>" + historias[i].nome + "</p>" +
      "</li>";
  }
  lista_projetos_ativos.innerHTML = html;
}


// =====================================================================
// IDEIA PARA HOJE
// =====================================================================

function carregarIdeias() {
  fetch("/dashboard/ideias")
    .then(function (resposta) {
      if (resposta.ok) {
        resposta.json().then(function (resultado) {
          ideias = resultado;
          if (ideias.length == 0) {
            texto_ideia_do_dia.innerHTML = "Nenhuma ideia cadastrada ainda.";
            return;
          }
          // a ideia inicial muda conforme o dia do mês (cada dia começa com uma diferente)
          var hoje = dias[dias.length - 1];
          indiceIdeia = hoje.dia % ideias.length;
          texto_ideia_do_dia.innerHTML = ideias[indiceIdeia].texto;
        });
      } else {
        texto_ideia_do_dia.innerHTML = "Não foi possível carregar as ideias.";
      }
    })
    .catch(function (erro) {
      console.log(erro);
      texto_ideia_do_dia.innerHTML = "Erro ao conectar com o servidor.";
    });
}

// botão "Gerar outra ideia": passa para a próxima da lista (e volta ao início no fim)
function mostrarProximaIdeia() {
  if (ideias.length == 0) {
    return;
  }
  indiceIdeia++;
  if (indiceIdeia >= ideias.length) {
    indiceIdeia = 0;
  }
  texto_ideia_do_dia.innerHTML = ideias[indiceIdeia].texto;
}


// =====================================================================
// MODAL "META MENSAL" (clicar no card da meta)
// =====================================================================
//
// FORA DO CONTEÚDO: <dialog> é uma caixa (modal) do próprio HTML.
//   - modal.showModal() abre a caixa e escurece o fundo
//   - modal.close() fecha
//   - a tecla Esc também fecha sozinha

function abrirModalMeta() {
  ipt_meta_mensal.value = metaAtual; // começa com a meta atual
  mensagem_modal_meta.innerHTML = "";
  modal_meta_mensal.showModal();
  ipt_meta_mensal.select(); // já deixa o número selecionado para digitar por cima
}

function salvarMeta(evento) {
  evento.preventDefault(); // não deixa o formulário recarregar a página

  var novaMeta = Number(ipt_meta_mensal.value);
  if (!(novaMeta >= 1 && novaMeta <= 1000000) || novaMeta != Math.round(novaMeta)) {
    mensagem_modal_meta.innerHTML = "Digite um número inteiro entre 1 e 1.000.000.";
    return;
  }
  if (idUsuario == undefined) {
    mensagem_modal_meta.innerHTML = "Entre na sua conta para salvar a meta.";
    return;
  }

  botao_salvar_modal_meta.disabled = true; // evita clique duplo

  fetch("/dashboard/meta/" + idUsuario, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ metaServer: novaMeta }),
  })
    .then(function (resposta) {
      botao_salvar_modal_meta.disabled = false;
      if (resposta.ok) {
        modal_meta_mensal.close();
        // redesenha os cards, a frase de boas-vindas e o gráfico com a meta nova
        renderizarIndicadores(novaMeta);
        renderizarGraficoCadencia(novaMeta);
      } else {
        resposta.text().then(function (motivo) {
          mensagem_modal_meta.innerHTML = motivo || "Não foi possível salvar a meta.";
        });
      }
    })
    .catch(function (erro) {
      console.log(erro);
      botao_salvar_modal_meta.disabled = false;
      mensagem_modal_meta.innerHTML = "Erro ao conectar com o servidor.";
    });
}

card_meta_mensal.addEventListener("click", abrirModalMeta);
// o card também abre pelo teclado (Enter ou espaço), já que funciona como botão
card_meta_mensal.addEventListener("keydown", function (evento) {
  if (evento.key == "Enter" || evento.key == " ") {
    evento.preventDefault();
    abrirModalMeta();
  }
});
form_modal_meta.addEventListener("submit", salvarMeta);
botao_cancelar_modal_meta.addEventListener("click", function () {
  modal_meta_mensal.close();
});
// clicar no fundo escuro (fora da caixa) também fecha
modal_meta_mensal.addEventListener("click", function (evento) {
  if (evento.target == modal_meta_mensal) {
    modal_meta_mensal.close();
  }
});


// =====================================================================
// INICIALIZAÇÃO
// =====================================================================

montarDias(); // precisa vir antes de tudo: os outros usam o vetor "dias"
preencherUsuario();
carregarEscrita(); // indicadores, sequência, calendário e gráfico
carregarUltimoCapitulo(); // card roxo "Continue de onde parou"
carregarHistorias(); // progresso em cada história + projetos ativos
carregarIdeias(); // ideia para hoje
