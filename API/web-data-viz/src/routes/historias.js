var express = require("express");
var router = express.Router();

var historiaController = require("../controllers/historiaController");

router.get("/listar/:idUsuario", function (req, res) {
    historiaController.listar(req, res);
});

router.get("/buscar/:idHistoria", function (req, res) {
    historiaController.buscar(req, res);
});

router.get("/generos/:idHistoria", function (req, res) {
    historiaController.listarGeneros(req, res);
});

router.get("/generos-usuario/:idUsuario", function (req, res) {
    historiaController.listarGenerosDoUsuario(req, res);
});

router.get("/moodboard/:idHistoria", function (req, res) {
    historiaController.listarMoodboard(req, res);
});

router.get("/plots/:idUsuario", function (req, res) {
    historiaController.listarPlotsDoUsuario(req, res);
});

router.post("/cadastrar", function (req, res) {
    historiaController.cadastrar(req, res);
});

router.put("/atualizar/:idHistoria", function (req, res) {
    historiaController.atualizar(req, res);
});

router.delete("/excluir/:idHistoria", function (req, res) {
    historiaController.excluir(req, res);
});

module.exports = router;
