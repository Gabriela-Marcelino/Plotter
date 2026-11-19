var historiaModel = require("../models/historiaModel");

var CLASSIFICACOES = ["livre", "10", "12", "14", "16", "18"];

// responde com erro 500 mostrando o motivo no terminal
function responderErro(res, erro) {
    console.log(erro);
    res.status(500).json(erro.sqlMessage || "Erro no servidor.");
}

// GET /historias/listar/:idUsuario
function listar(req, res) {
    historiaModel.listar(req.params.idUsuario)
        .then(function (resultado) {
            // "Fantasia|Drama" -> ["Fantasia", "Drama"]
            for (var i = 0; i < resultado.length; i++) {
                resultado[i].generos = resultado[i].generos ? resultado[i].generos.split("|") : [];
            }
            res.json(resultado);
        })
        .catch(function (erro) { responderErro(res, erro); });
}

// GET /historias/buscar/:idHistoria
function buscar(req, res) {
    historiaModel.buscar(req.params.idHistoria)
        .then(function (resultado) { res.json(resultado); })
        .catch(function (erro) { responderErro(res, erro); });
}

// GET /historias/generos/:idHistoria
function listarGeneros(req, res) {
    historiaModel.listarGeneros(req.params.idHistoria)
        .then(function (resultado) { res.json(resultado); })
        .catch(function (erro) { responderErro(res, erro); });
}

// GET /historias/generos-usuario/:idUsuario
function listarGenerosDoUsuario(req, res) {
    historiaModel.listarGenerosDoUsuario(req.params.idUsuario)
        .then(function (resultado) { res.json(resultado); })
        .catch(function (erro) { responderErro(res, erro); });
}

// GET /historias/moodboard/:idHistoria
function listarMoodboard(req, res) {
    historiaModel.listarMoodboard(req.params.idHistoria)
        .then(function (resultado) { res.json(resultado); })
        .catch(function (erro) { responderErro(res, erro); });
}

// GET /historias/plots/:idUsuario
function listarPlotsDoUsuario(req, res) {
    historiaModel.listarPlotsDoUsuario(req.params.idUsuario)
        .then(function (resultado) { res.json(resultado); })
        .catch(function (erro) { responderErro(res, erro); });
}

// confere os dados que vêm do formulário; devolve o texto do erro ou "" se estiver tudo certo
function validar(body) {
    if (body.idUsuarioServer == undefined) return "Usuário não informado.";
    if (!body.nomeServer || body.nomeServer.trim() == "") return "Informe o nome da história.";
    if (body.nomeServer.length > 200) return "O nome pode ter no máximo 200 caracteres.";
    if (CLASSIFICACOES.indexOf(body.classificacaoServer) == -1) return "Classificação inválida.";
    if (!Array.isArray(body.generosServer) || body.generosServer.length > 5) return "Escolha no máximo 5 gêneros.";
    if (!Array.isArray(body.moodboardServer) || body.moodboardServer.length > 5) return "O moodboard aceita no máximo 5 imagens.";
    return "";
}

// grava gêneros, moodboard e plot (usado no cadastro e na edição)
async function salvarDetalhes(idHistoria, body) {
    await historiaModel.salvarGeneros(idHistoria, body.idUsuarioServer, body.generosServer);
    await historiaModel.salvarMoodboard(idHistoria, body.moodboardServer);
    await historiaModel.salvarPlot(idHistoria, body.idUsuarioServer, body.idPlotServer || "");
}

// POST /historias/cadastrar
async function cadastrar(req, res) {
    var erroValidacao = validar(req.body);
    if (erroValidacao) {
        return res.status(400).send(erroValidacao);
    }
    try {
        var resultado = await historiaModel.cadastrar(
            req.body.idUsuarioServer,
            req.body.nomeServer.trim(),
            req.body.classificacaoServer,
            req.body.capaServer || null,
            req.body.corServer || null
        );
        var idHistoria = resultado.insertId; // id que o banco acabou de criar
        await salvarDetalhes(idHistoria, req.body);
        res.json({ idHistoria: idHistoria });
    } catch (erro) {
        responderErro(res, erro);
    }
}

// PUT /historias/atualizar/:idHistoria
async function atualizar(req, res) {
    var erroValidacao = validar(req.body);
    if (erroValidacao) {
        return res.status(400).send(erroValidacao);
    }
    var idHistoria = req.params.idHistoria;
    try {
        var resultado = await historiaModel.atualizar(
            idHistoria,
            req.body.idUsuarioServer,
            req.body.nomeServer.trim(),
            req.body.classificacaoServer,
            req.body.capaServer || null
        );
        if (resultado.affectedRows == 0) {
            return res.status(404).send("História não encontrada.");
        }
        await salvarDetalhes(idHistoria, req.body);
        res.json({ idHistoria: Number(idHistoria) });
    } catch (erro) {
        responderErro(res, erro);
    }
}

// DELETE /historias/excluir/:idHistoria
function excluir(req, res) {
    var idUsuario = req.body.idUsuarioServer;
    if (idUsuario == undefined) {
        return res.status(400).send("Usuário não informado.");
    }
    historiaModel.excluir(req.params.idHistoria, idUsuario)
        .then(function (resultado) {
            if (resultado.affectedRows == 0) {
                res.status(404).send("História não encontrada.");
            } else {
                res.status(204).end(); // apagou, nada para devolver
            }
        })
        .catch(function (erro) { responderErro(res, erro); });
}

module.exports = {
    listar,
    buscar,
    listarGeneros,
    listarGenerosDoUsuario,
    listarMoodboard,
    listarPlotsDoUsuario,
    cadastrar,
    atualizar,
    excluir
};
