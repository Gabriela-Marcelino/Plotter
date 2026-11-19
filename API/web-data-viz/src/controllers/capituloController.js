var capituloModel = require("../models/capituloModel");

// GET /capitulos/listar/:idHistoria
function listar(req, res) {
    capituloModel.listar(req.params.idHistoria)
        .then(function (resultado) { res.json(resultado); })
        .catch(function (erro) {
            console.log(erro);
            res.status(500).json(erro.sqlMessage);
        });
}

// POST /capitulos/criar
function criar(req, res) {
    var idHistoria = req.body.idHistoriaServer;
    var numero = req.body.numeroServer;

    if (idHistoria == undefined) {
        res.status(400).send("História não informada.");
    } else if (numero == undefined) {
        res.status(400).send("Número do capítulo não informado.");
    } else {
        capituloModel.criar(idHistoria, numero)
            .then(function (resultado) {
                res.json({ idCapitulo: resultado.insertId });
            })
            .catch(function (erro) {
                console.log(erro);
                res.status(500).json(erro.sqlMessage);
            });
    }
}

var STATUS = ["nao_escrito", "escrevendo", "a_revisar", "revisado", "concluido", "publicado"];

// GET /capitulos/buscar/:idCapitulo
function buscar(req, res) {
    capituloModel.buscar(req.params.idCapitulo)
        .then(function (resultado) { res.json(resultado); })
        .catch(function (erro) {
            console.log(erro);
            res.status(500).json(erro.sqlMessage);
        });
}

// PUT /capitulos/salvar/:idCapitulo
// recebe { idUsuarioServer, tituloServer, statusServer, textoServer, palavrasServer }
function salvar(req, res) {
    var idUsuario = req.body.idUsuarioServer;
    var titulo = req.body.tituloServer == null ? "" : String(req.body.tituloServer).trim();
    var status = req.body.statusServer;
    var texto = req.body.textoServer == null ? "" : String(req.body.textoServer);
    var palavras = Math.max(0, Math.round(Number(req.body.palavrasServer) || 0));

    if (idUsuario == undefined) {
        res.status(400).send("Faça login para salvar.");
    } else if (STATUS.indexOf(status) == -1) {
        res.status(400).send("Status inválido.");
    } else if (titulo.length > 200) {
        res.status(400).send("O título pode ter no máximo 200 caracteres.");
    } else {
        salvarERegistrar(req.params.idCapitulo, idUsuario, titulo, status, texto, palavras)
            .then(function (salvou) {
                if (salvou) {
                    res.json({ ok: true });
                } else {
                    res.status(404).send("Capítulo não encontrado.");
                }
            })
            .catch(function (erro) {
                console.log(erro);
                res.status(500).json(erro.sqlMessage);
            });
    }
}

// Salva o capítulo e soma no dia de hoje as palavras novas (para o dashboard).
// Devolve false se o capítulo não existe ou não é do usuário.
async function salvarERegistrar(idCapitulo, idUsuario, titulo, status, texto, palavras) {
    var antes = await capituloModel.buscar(idCapitulo);
    if (antes.length == 0 || String(antes[0].idUsuario) != String(idUsuario)) {
        return false;
    }

    // título vazio vira NULL (a tela mostra "Capítulo 01" no lugar)
    var resultado = await capituloModel.salvar(idCapitulo, idUsuario, titulo || null, status, texto, palavras);
    if (resultado.affectedRows == 0) {
        return false;
    }

    var diferenca = palavras - antes[0].palavras;
    if (diferenca != 0) {
        await capituloModel.registrarEscrita(idUsuario, diferenca);
    }
    return true;
}

module.exports = {
    listar,
    criar,
    buscar,
    salvar
};
