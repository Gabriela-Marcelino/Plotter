var express = require("express");
var router = express.Router();

var plotController = require("../controllers/plotController");

router.get("/listar/:idUsuario", function (req, res) {
    plotController.listar(req, res);
});

router.post("/cadastrar", function (req, res) {
    plotController.cadastrar(req, res);
});

router.put("/atualizar/:idPlot", function (req, res) {
    plotController.atualizar(req, res);
});

router.delete("/excluir/:idPlot", function (req, res) {
    plotController.excluir(req, res);
});

module.exports = router;
