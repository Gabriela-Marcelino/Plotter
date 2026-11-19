var dashboardModel = require("../models/dashboardModel");

// todas as rotas do dashboard só buscam e devolvem o resultado,
// então esta função monta a resposta para qualquer uma delas
function responder(res, promessa) {
    promessa
        .then(function (resultado) { res.json(resultado); })
        .catch(function (erro) {
            console.log(erro);
            res.status(500).json(erro.sqlMessage || "Erro no servidor.");
        });
}

// GET /dashboard/escrita/:idUsuario
function escrita(req, res) {
    responder(res, dashboardModel.escritaPorDia(req.params.idUsuario));
}

// GET /dashboard/meta/:idUsuario
function meta(req, res) {
    responder(res, dashboardModel.meta(req.params.idUsuario));
}

// PUT /dashboard/meta/:idUsuario   recebe { metaServer }
function atualizarMeta(req, res) {
    var metaMensal = Math.round(Number(req.body.metaServer));
    if (!(metaMensal >= 1 && metaMensal <= 1000000)) {
        return res.status(400).send("A meta precisa ser um número entre 1 e 1.000.000.");
    }
    dashboardModel.atualizarMeta(req.params.idUsuario, metaMensal)
        .then(function (resultado) {
            if (resultado.affectedRows == 0) {
                res.status(404).send("Usuário não encontrado.");
            } else {
                res.json({ metaMensal: metaMensal });
            }
        })
        .catch(function (erro) {
            console.log(erro);
            res.status(500).json(erro.sqlMessage || "Erro no servidor.");
        });
}

// GET /dashboard/ultimo-capitulo/:idUsuario
function ultimoCapitulo(req, res) {
    responder(res, dashboardModel.ultimoCapitulo(req.params.idUsuario));
}

// GET /dashboard/historias/:idUsuario
function historias(req, res) {
    responder(res, dashboardModel.historias(req.params.idUsuario));
}

// GET /dashboard/ideias
function ideias(req, res) {
    responder(res, dashboardModel.ideias());
}

module.exports = {
    escrita,
    meta,
    atualizarMeta,
    ultimoCapitulo,
    historias,
    ideias
};
