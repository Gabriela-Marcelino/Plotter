var express = require("express");
var router = express.Router();

var capituloController = require("../controllers/capituloController");

router.get("/listar/:idHistoria", function (req, res) {
    capituloController.listar(req, res);
});

router.post("/criar", function (req, res) {
    capituloController.criar(req, res);
});

router.get("/buscar/:idCapitulo", function (req, res) {
    capituloController.buscar(req, res);
});

router.put("/salvar/:idCapitulo", function (req, res) {
    capituloController.salvar(req, res);
});

module.exports = router;
