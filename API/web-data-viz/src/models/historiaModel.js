var database = require("../database/config");

// Todas as histórias do usuário, com os gêneros juntos em um texto "Fantasia|Drama"
function listar(idUsuario) {
    var instrucaoSql = `
        SELECT h.idHistoria, h.nome, h.classificacao, h.capa, h.cor, h.concluida,
               GROUP_CONCAT(g.nome ORDER BY g.nome SEPARATOR '|') AS generos
        FROM historia h
        LEFT JOIN historiaGenero hg ON hg.fk_historia = h.idHistoria
        LEFT JOIN genero g ON g.idGenero = hg.fk_genero
        WHERE h.fk_usuario = ?
        GROUP BY h.idHistoria
        ORDER BY h.criadoEm;
    `;
    return database.executar(instrucaoSql, [idUsuario]);
}

// Uma história (tela da história e formulário de edição)
function buscar(idHistoria) {
    var instrucaoSql = `
        SELECT h.idHistoria, h.fk_usuario AS idUsuario, h.nome, h.classificacao, h.capa, h.cor,
               p.idPlot,
               IF(p.idPlot IS NULL, 0, 1) AS temPlot,
               NULL AS nomeMundo
        FROM historia h
        LEFT JOIN plots p ON p.fk_historia = h.idHistoria
        WHERE h.idHistoria = ?
        LIMIT 1;
    `;
    return database.executar(instrucaoSql, [idHistoria]);
}

// Gêneros de uma história
function listarGeneros(idHistoria) {
    var instrucaoSql = `
        SELECT g.nome
        FROM historiaGenero hg
        JOIN genero g ON g.idGenero = hg.fk_genero
        WHERE hg.fk_historia = ?
        ORDER BY g.nome;
    `;
    return database.executar(instrucaoSql, [idHistoria]);
}

// Todos os gêneros que o usuário já usou (aparecem como opção no formulário)
function listarGenerosDoUsuario(idUsuario) {
    var instrucaoSql = `SELECT nome FROM genero WHERE fk_usuario = ? ORDER BY nome;`;
    return database.executar(instrucaoSql, [idUsuario]);
}

// Imagens do moodboard de uma história
function listarMoodboard(idHistoria) {
    var instrucaoSql = `SELECT imagem FROM historiaImagem WHERE fk_historia = ? ORDER BY ordem;`;
    return database.executar(instrucaoSql, [idHistoria]);
}

// Plots do usuário, com quantos capítulos e cenas cada um tem (para o modal "Escolher plot")
function listarPlotsDoUsuario(idUsuario) {
    var instrucaoSql = `
        SELECT p.idPlot, p.nome, p.estrutura, p.fk_historia AS idHistoria,
               COUNT(DISTINCT c.idCapPlan) AS totalCapitulos,
               COUNT(s.idCenaPlan) AS totalCenas
        FROM plots p
        LEFT JOIN planejamentoCapitulos c ON c.fk_plot = p.idPlot
        LEFT JOIN planejamentoCenas s ON s.fk_idCapPlan = c.idCapPlan
        WHERE p.fk_usuario = ?
        GROUP BY p.idPlot
        ORDER BY p.nome;
    `;
    return database.executar(instrucaoSql, [idUsuario]);
}

function cadastrar(idUsuario, nome, classificacao, capa, cor) {
    var instrucaoSql = `
        INSERT INTO historia (fk_usuario, nome, classificacao, capa, cor) VALUES (?, ?, ?, ?, ?);
    `;
    return database.executar(instrucaoSql, [idUsuario, nome, classificacao, capa, cor]);
}

// só atualiza se a história for do usuário (affectedRows = 0 quando não for)
function atualizar(idHistoria, idUsuario, nome, classificacao, capa) {
    var instrucaoSql = `
        UPDATE historia SET nome = ?, classificacao = ?, capa = ?
        WHERE idHistoria = ? AND fk_usuario = ?;
    `;
    return database.executar(instrucaoSql, [nome, classificacao, capa, idHistoria, idUsuario]);
}

// Apaga a história. Gêneros, moodboard e capítulos dela somem junto (ON DELETE CASCADE)
// e o plot vinculado fica sem história (ON DELETE SET NULL).
function excluir(idHistoria, idUsuario) {
    var instrucaoSql = `DELETE FROM historia WHERE idHistoria = ? AND fk_usuario = ?;`;
    return database.executar(instrucaoSql, [idHistoria, idUsuario]);
}

// Troca os gêneros da história pelos da lista (cria no banco os gêneros novos)
async function salvarGeneros(idHistoria, idUsuario, generos) {
    await database.executar(`DELETE FROM historiaGenero WHERE fk_historia = ?;`, [idHistoria]);

    for (var i = 0; i < generos.length; i++) {
        // INSERT IGNORE: se o gênero já existe para esse usuário, não faz nada
        await database.executar(
            `INSERT IGNORE INTO genero (fk_usuario, nome) VALUES (?, ?);`,
            [idUsuario, generos[i]]
        );
        await database.executar(
            `INSERT IGNORE INTO historiaGenero (fk_historia, fk_genero)
             SELECT ?, idGenero FROM genero WHERE fk_usuario = ? AND nome = ?;`,
            [idHistoria, idUsuario, generos[i]]
        );
    }
}

// Troca as imagens do moodboard pelas da lista
async function salvarMoodboard(idHistoria, imagens) {
    await database.executar(`DELETE FROM historiaImagem WHERE fk_historia = ?;`, [idHistoria]);

    for (var i = 0; i < imagens.length; i++) {
        await database.executar(
            `INSERT INTO historiaImagem (fk_historia, ordem, imagem) VALUES (?, ?, ?);`,
            [idHistoria, i + 1, imagens[i]]
        );
    }
}

// Vincula o plot escolhido à história (idPlot vazio = sem plot).
// Se o plot mudou, os capítulos da história são recriados a partir dele.
async function salvarPlot(idHistoria, idUsuario, idPlot) {
    var atual = await database.executar(`SELECT idPlot FROM plots WHERE fk_historia = ?;`, [idHistoria]);
    var idPlotAtual = atual.length > 0 ? atual[0].idPlot : "";

    if (idPlotAtual == idPlot) {
        return; // nada mudou
    }

    // solta o plot antigo
    await database.executar(`UPDATE plots SET fk_historia = NULL WHERE fk_historia = ?;`, [idHistoria]);

    if (idPlot) {
        // prende o plot novo (só se for do mesmo usuário)
        await database.executar(
            `UPDATE plots SET fk_historia = ? WHERE idPlot = ? AND fk_usuario = ?;`,
            [idHistoria, idPlot, idUsuario]
        );

        // cada capítulo planejado no plot vira um capítulo da história ("não escrito")
        await database.executar(`DELETE FROM capitulo WHERE fk_historia = ?;`, [idHistoria]);
        await database.executar(
            `INSERT INTO capitulo (fk_historia, numero, titulo, sinopse, fk_capPlan)
             SELECT ?, numeroCap, titulo, sinopse, idCapPlan
             FROM planejamentoCapitulos WHERE fk_plot = ?
             ORDER BY numeroCap;`,
            [idHistoria, idPlot]
        );
    }
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
    excluir,
    salvarGeneros,
    salvarMoodboard,
    salvarPlot
};
