var express = require("express");
var router = express.Router();

var dashboardController = require("../controllers/dashboardController");

router.get("/escrita/:idUsuario", function (req, res) {
    dashboardController.escrita(req, res);
});

router.get("/meta/:idUsuario", function (req, res) {
    dashboardController.meta(req, res);
});

router.get("/ultimo-capitulo/:idUsuario", function (req, res) {
    dashboardController.ultimoCapitulo(req, res);
});

router.get("/historias/:idUsuario", function (req, res) {
    dashboardController.historias(req, res);
});

router.get("/ideias", function (req, res) {
    dashboardController.ideias(req, res);
});

module.exports = router;
