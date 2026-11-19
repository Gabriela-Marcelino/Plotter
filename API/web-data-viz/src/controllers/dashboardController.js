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
    ultimoCapitulo,
    historias,
    ideias
};
