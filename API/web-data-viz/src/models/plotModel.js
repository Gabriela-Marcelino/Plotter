var database = require("../database/config");

// =====================================================================
// O plot.js trabalha com um objeto assim:
//   { id, nome, historia, medida, total, palavrasCap, rascunho, estrutura,
//     atos: [12, 25, 13],                    -> capítulos em cada ato
//     capitulos: [{ titulo, twist, sinopse,
//                   cenas: [{ titulo, desc, escrita }] }] }
//
// No banco ele fica dividido em 4 tabelas:
//   plots, atos, planejamentoCapitulos e planejamentoCenas.
// Este model grava e remonta esse objeto.
// =====================================================================


// ---------------------------------------------------------------------
// LEITURA
// ---------------------------------------------------------------------

// Busca os plots do usuário nas 4 tabelas e monta o objeto que o plot.js usa
async function listar(idUsuario) {
    var plots = await database.executar(`
        SELECT idPlot, nome, medida, total, palavras_por_cap, rascunho, estrutura, fk_historia
        FROM plots WHERE fk_usuario = ? ORDER BY criadoEm;
    `, [idUsuario]);

    var atos = await database.executar(`
        SELECT a.fk_plot, a.qtdCapitulos
        FROM atos a JOIN plots p ON p.idPlot = a.fk_plot
        WHERE p.fk_usuario = ? ORDER BY a.fk_plot, a.posicao;
    `, [idUsuario]);

    var capitulos = await database.executar(`
        SELECT c.idCapPlan, c.fk_plot, c.titulo, c.sinopse, c.plotTwist
        FROM planejamentoCapitulos c JOIN plots p ON p.idPlot = c.fk_plot
        WHERE p.fk_usuario = ? ORDER BY c.fk_plot, c.numeroCap;
    `, [idUsuario]);

    var cenas = await database.executar(`
        SELECT s.fk_idCapPlan, s.titulo, s.descricao, s.escrito
        FROM planejamentoCenas s
        JOIN planejamentoCapitulos c ON c.idCapPlan = s.fk_idCapPlan
        JOIN plots p ON p.idPlot = c.fk_plot
        WHERE p.fk_usuario = ? ORDER BY s.fk_idCapPlan, s.ordem;
    `, [idUsuario]);

    // monta cada plot no formato do plot.js
    var resultado = [];
    var plotPorId = {};
    for (var i = 0; i < plots.length; i++) {
        var p = plots[i];
        var plot = {
            id: p.idPlot,
            nome: p.nome,
            historia: p.fk_historia == null ? "" : String(p.fk_historia),
            medida: p.medida,
            total: p.total,
            palavrasCap: p.palavras_por_cap,
            rascunho: p.rascunho || "",
            estrutura: p.estrutura,
            atos: [],
            capitulos: []
        };
        plotPorId[p.idPlot] = plot;
        resultado.push(plot);
    }

    for (var a = 0; a < atos.length; a++) {
        plotPorId[atos[a].fk_plot].atos.push(atos[a].qtdCapitulos);
    }

    // guarda cada capítulo pelo id para depois encaixar as cenas nele
    var capituloPorId = {};
    for (var c = 0; c < capitulos.length; c++) {
        var cap = {
            titulo: capitulos[c].titulo,
            twist: capitulos[c].plotTwist == 1,
            sinopse: capitulos[c].sinopse || "",
            cenas: []
        };
        capituloPorId[capitulos[c].idCapPlan] = cap;
        plotPorId[capitulos[c].fk_plot].capitulos.push(cap);
    }

    for (var s = 0; s < cenas.length; s++) {
        capituloPorId[cenas[s].fk_idCapPlan].cenas.push({
            titulo: cenas[s].titulo,
            desc: cenas[s].descricao || "",
            escrita: cenas[s].escrito == 1
        });
    }

    return resultado;
}

// fk_historia atual do plot (null = sem história); devolve undefined se o plot não for do usuário
async function buscarHistoriaDoPlot(idPlot, idUsuario) {
    var resultado = await database.executar(
        `SELECT fk_historia FROM plots WHERE idPlot = ? AND fk_usuario = ?;`,
        [idPlot, idUsuario]
    );
    if (resultado.length == 0) return undefined;
    return resultado[0].fk_historia;
}

// confere se a história é do usuário
async function historiaEhDoUsuario(idHistoria, idUsuario) {
    var resultado = await database.executar(
        `SELECT idHistoria FROM historia WHERE idHistoria = ? AND fk_usuario = ?;`,
        [idHistoria, idUsuario]
    );
    return resultado.length > 0;
}


// ---------------------------------------------------------------------
// GRAVAÇÃO
// ---------------------------------------------------------------------

function cadastrar(idPlot, idUsuario, plot) {
    return database.executar(`
        INSERT INTO plots (idPlot, nome, medida, total, palavras_por_cap, rascunho, estrutura, fk_usuario)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `, [idPlot, plot.nome, plot.medida, plot.total, plot.palavrasCap, plot.rascunho, plot.estrutura, idUsuario]);
}

function atualizar(idPlot, idUsuario, plot) {
    return database.executar(`
        UPDATE plots SET nome = ?, medida = ?, total = ?, palavras_por_cap = ?, rascunho = ?, estrutura = ?
        WHERE idPlot = ? AND fk_usuario = ?;
    `, [plot.nome, plot.medida, plot.total, plot.palavrasCap, plot.rascunho, plot.estrutura, idPlot, idUsuario]);
}

// Grava atos, capítulos e cenas do plot (usado no cadastro e na edição).
async function salvarEstrutura(idPlot, plot) {
    // ---- atos: apaga e insere de novo ----
    await database.executar(`DELETE FROM atos WHERE fk_plot = ?;`, [idPlot]);
    if (plot.atos.length > 0) {
        var linhasAtos = [];
        for (var a = 0; a < plot.atos.length; a++) {
            linhasAtos.push([idPlot, a + 1, "Ato " + (a + 1), plot.atos[a]]);
        }
        // "VALUES ?" com uma lista de listas insere várias linhas de uma vez
        await database.executar(
            `INSERT INTO atos (fk_plot, posicao, nomeAto, qtdCapitulos) VALUES ?;`,
            [linhasAtos]
        );
    }

    // ---- capítulos ----
    // Os capítulos são atualizados no lugar (pelo número) em vez de apagados,
    // porque os capítulos da história apontam para eles (capitulo.fk_capPlan).
    await database.executar(
        `DELETE FROM planejamentoCapitulos WHERE fk_plot = ? AND numeroCap > ?;`,
        [idPlot, plot.capitulos.length]
    );
    if (plot.capitulos.length == 0) return;

    var linhasCapitulos = [];
    for (var c = 0; c < plot.capitulos.length; c++) {
        var cap = plot.capitulos[c];
        linhasCapitulos.push([idPlot, c + 1, cap.titulo, cap.sinopse, cap.twist ? 1 : 0]);
    }
    // se o capítulo com esse número já existe (UNIQUE fk_plot + numeroCap), só atualiza
    await database.executar(`
        INSERT INTO planejamentoCapitulos (fk_plot, numeroCap, titulo, sinopse, plotTwist) VALUES ?
        ON DUPLICATE KEY UPDATE titulo = VALUES(titulo), sinopse = VALUES(sinopse), plotTwist = VALUES(plotTwist);
    `, [linhasCapitulos]);

    // descobre o id de cada capítulo pelo número
    var ids = await database.executar(
        `SELECT idCapPlan, numeroCap FROM planejamentoCapitulos WHERE fk_plot = ?;`,
        [idPlot]
    );
    var idPorNumero = {};
    for (var i = 0; i < ids.length; i++) {
        idPorNumero[ids[i].numeroCap] = ids[i].idCapPlan;
    }

    // ---- cenas: apaga as do plot e insere de novo ----
    await database.executar(`
        DELETE s FROM planejamentoCenas s
        JOIN planejamentoCapitulos c ON c.idCapPlan = s.fk_idCapPlan
        WHERE c.fk_plot = ?;
    `, [idPlot]);

    var linhasCenas = [];
    for (var n = 0; n < plot.capitulos.length; n++) {
        var cenas = plot.capitulos[n].cenas;
        for (var s = 0; s < cenas.length; s++) {
            linhasCenas.push([idPorNumero[n + 1], s + 1, cenas[s].titulo, cenas[s].desc, cenas[s].escrita ? 1 : 0]);
        }
    }
    if (linhasCenas.length > 0) {
        await database.executar(
            `INSERT INTO planejamentoCenas (fk_idCapPlan, ordem, titulo, descricao, escrito) VALUES ?;`,
            [linhasCenas]
        );
    }
}

function desvincularHistoria(idPlot) {
    return database.executar(`UPDATE plots SET fk_historia = NULL WHERE idPlot = ?;`, [idPlot]);
}

// Apaga o plot. Atos, capítulos e cenas somem junto (ON DELETE CASCADE).
function excluir(idPlot, idUsuario) {
    return database.executar(`DELETE FROM plots WHERE idPlot = ? AND fk_usuario = ?;`, [idPlot, idUsuario]);
}

module.exports = {
    listar,
    buscarHistoriaDoPlot,
    historiaEhDoUsuario,
    cadastrar,
    atualizar,
    salvarEstrutura,
    desvincularHistoria,
    excluir
};
