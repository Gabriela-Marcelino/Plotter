var crypto = require("crypto");
var plotModel = require("../models/plotModel");
var historiaModel = require("../models/historiaModel");

var MEDIDAS = ["capitulos", "palavras"];
var ESTRUTURAS = ["livre", "3", "4", "5"];
var MAXIMO_CAPITULOS = 1000;

function responderErro(res, erro) {
    console.log(erro);
    res.status(500).json(erro.sqlMessage || "Erro no servidor.");
}

function texto(valor) {
    return valor == null ? "" : String(valor);
}

// Confere o plot que veio do plot.js e devolve uma cópia "limpa".
// Se algo estiver errado, devolve { erro: "mensagem" }.
function validarPlot(plot) {
    if (!plot || typeof plot != "object") return { erro: "Plot não enviado." };

    var nome = texto(plot.nome).trim();
    if (nome == "") return { erro: "Informe o nome do plot." };
    if (nome.length > 200) return { erro: "O nome pode ter no máximo 200 caracteres." };
    if (MEDIDAS.indexOf(plot.medida) == -1) return { erro: "Medida inválida." };
    if (ESTRUTURAS.indexOf(String(plot.estrutura)) == -1) return { erro: "Escolha uma estrutura." };

    var total = Math.round(Number(plot.total));
    var palavrasCap = Math.round(Number(plot.palavrasCap));
    if (!(total > 0)) return { erro: "O tamanho precisa ser maior que zero." };
    if (!(palavrasCap > 0)) return { erro: "Palavras por capítulo precisa ser maior que zero." };

    if (!Array.isArray(plot.atos) || !Array.isArray(plot.capitulos)) return { erro: "Plot incompleto." };
    if (plot.capitulos.length > MAXIMO_CAPITULOS) return { erro: "Máximo de " + MAXIMO_CAPITULOS + " capítulos." };

    var atos = [];
    for (var a = 0; a < plot.atos.length; a++) {
        var qtd = Math.round(Number(plot.atos[a]));
        if (!(qtd >= 0)) return { erro: "Divisão dos atos inválida." };
        atos.push(qtd);
    }

    var capitulos = [];
    for (var c = 0; c < plot.capitulos.length; c++) {
        var cap = plot.capitulos[c] || {};
        var cenas = [];
        var cenasRecebidas = Array.isArray(cap.cenas) ? cap.cenas : [];
        for (var s = 0; s < cenasRecebidas.length; s++) {
            var cena = cenasRecebidas[s] || {};
            cenas.push({
                titulo: texto(cena.titulo).slice(0, 200),
                desc: texto(cena.desc),
                escrita: cena.escrita == true
            });
        }
        capitulos.push({
            titulo: texto(cap.titulo).slice(0, 200),
            sinopse: texto(cap.sinopse),
            twist: cap.twist == true,
            cenas: cenas
        });
    }

    return {
        plot: {
            nome: nome,
            historia: texto(plot.historia),
            medida: plot.medida,
            total: total,
            palavrasCap: palavrasCap,
            rascunho: texto(plot.rascunho),
            estrutura: String(plot.estrutura),
            atos: atos,
            capitulos: capitulos
        }
    };
}

// Liga o plot à história escolhida no passo 1 (ou desliga, se ficou vazio).
// Quando a história muda, os capítulos dela são criados a partir do plot
// (mesma regra do formulário de história, em historiaModel.salvarPlot).
async function salvarVinculoHistoria(idPlot, idUsuario, historiaNova, historiaAntiga) {
    var antiga = historiaAntiga == null ? "" : String(historiaAntiga);
    if (historiaNova == antiga) return; // nada mudou

    await plotModel.desvincularHistoria(idPlot);
    if (historiaNova != "") {
        await historiaModel.salvarPlot(historiaNova, idUsuario, idPlot);
    }
}

// GET /plots/listar/:idUsuario
function listar(req, res) {
    plotModel.listar(req.params.idUsuario)
        .then(function (plots) { res.json(plots); })
        .catch(function (erro) { responderErro(res, erro); });
}

// POST /plots/cadastrar   recebe { idUsuarioServer, plotServer }
async function cadastrar(req, res) {
    var idUsuario = req.body.idUsuarioServer;
    if (idUsuario == undefined) return res.status(400).send("Faça login para salvar plots.");

    var validacao = validarPlot(req.body.plotServer);
    if (validacao.erro) return res.status(400).send(validacao.erro);
    var plot = validacao.plot;

    try {
        if (plot.historia != "" && !(await plotModel.historiaEhDoUsuario(plot.historia, idUsuario))) {
            return res.status(400).send("História inválida.");
        }
        var idPlot = crypto.randomUUID(); // a coluna idPlot é CHAR(36): um UUID
        await plotModel.cadastrar(idPlot, idUsuario, plot);
        await plotModel.salvarEstrutura(idPlot, plot);
        await salvarVinculoHistoria(idPlot, idUsuario, plot.historia, null);
        res.json({ id: idPlot });
    } catch (erro) {
        responderErro(res, erro);
    }
}

// PUT /plots/atualizar/:idPlot   recebe { idUsuarioServer, plotServer }
async function atualizar(req, res) {
    var idUsuario = req.body.idUsuarioServer;
    var idPlot = req.params.idPlot;
    if (idUsuario == undefined) return res.status(400).send("Faça login para salvar plots.");

    var validacao = validarPlot(req.body.plotServer);
    if (validacao.erro) return res.status(400).send(validacao.erro);
    var plot = validacao.plot;

    try {
        var historiaAntiga = await plotModel.buscarHistoriaDoPlot(idPlot, idUsuario);
        if (historiaAntiga === undefined) return res.status(404).send("Plot não encontrado.");
        if (plot.historia != "" && !(await plotModel.historiaEhDoUsuario(plot.historia, idUsuario))) {
            return res.status(400).send("História inválida.");
        }
        await plotModel.atualizar(idPlot, idUsuario, plot);
        await plotModel.salvarEstrutura(idPlot, plot);
        await salvarVinculoHistoria(idPlot, idUsuario, plot.historia, historiaAntiga);
        res.json({ id: idPlot });
    } catch (erro) {
        responderErro(res, erro);
    }
}

// DELETE /plots/excluir/:idPlot   recebe { idUsuarioServer }
function excluir(req, res) {
    var idUsuario = req.body.idUsuarioServer;
    if (idUsuario == undefined) return res.status(400).send("Usuário não informado.");

    plotModel.excluir(req.params.idPlot, idUsuario)
        .then(function (resultado) {
            if (resultado.affectedRows == 0) {
                res.status(404).send("Plot não encontrado.");
            } else {
                res.status(204).end();
            }
        })
        .catch(function (erro) { responderErro(res, erro); });
}

module.exports = {
    listar,
    cadastrar,
    atualizar,
    excluir
};
