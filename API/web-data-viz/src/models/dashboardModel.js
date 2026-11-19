var database = require("../database/config");

// Palavras escritas em cada dia dos últimos ~6 meses (calendário de 26 semanas + gráfico).
// O dia vai como TEXTO "AAAA-MM-DD" para o JavaScript não mudar a data por causa do fuso.
function escritaPorDia(idUsuario) {
    var instrucaoSql = `
        SELECT DATE_FORMAT(dataEscrita, '%Y-%m-%d') AS dia, SUM(palavras) AS palavras
        FROM registroEscrita
        WHERE fk_usuario = ? AND dataEscrita >= CURDATE() - INTERVAL 190 DAY
        GROUP BY dia
        ORDER BY dia;
    `;
    return database.executar(instrucaoSql, [idUsuario]);
}

// Meta mensal de palavras (coluna do usuário)
function meta(idUsuario) {
    var instrucaoSql = `SELECT meta_mensal_palavras AS metaMensal FROM usuario WHERE idUsuario = ?;`;
    return database.executar(instrucaoSql, [idUsuario]);
}

// Capítulo salvo por último (card roxo "Continue de onde parou")
function ultimoCapitulo(idUsuario) {
    var instrucaoSql = `
        SELECT h.idHistoria, c.idCapitulo, h.nome AS nomeHistoria, h.capa, h.cor,
               c.numero, c.palavras
        FROM capitulo c
        JOIN historia h ON h.idHistoria = c.fk_historia
        WHERE h.fk_usuario = ? AND c.atualizadoEm IS NOT NULL
        ORDER BY c.atualizadoEm DESC, c.idCapitulo DESC
        LIMIT 1;
    `;
    return database.executar(instrucaoSql, [idUsuario]);
}

// Histórias com total de capítulos e quantos já passaram da escrita
// (a_revisar, revisado, concluido ou publicado: mesma regra da tela da história).
// As mais recentemente trabalhadas aparecem primeiro.
function historias(idUsuario) {
    var instrucaoSql = `
        SELECT h.idHistoria, h.nome, h.cor,
               COUNT(c.idCapitulo) AS totalCapitulos,
               CAST(IFNULL(SUM(c.status IN ('a_revisar', 'revisado', 'concluido', 'publicado')), 0) AS UNSIGNED) AS capitulosFeitos
        FROM historia h
        LEFT JOIN capitulo c ON c.fk_historia = h.idHistoria
        WHERE h.fk_usuario = ? AND h.concluida = 0
        GROUP BY h.idHistoria
        ORDER BY MAX(c.atualizadoEm) DESC, h.criadoEm DESC;
    `;
    return database.executar(instrucaoSql, [idUsuario]);
}

// Frases da "Ideia para hoje"
function ideias() {
    return database.executar(`SELECT texto FROM ideia ORDER BY idIdeia;`);
}

module.exports = {
    escritaPorDia,
    meta,
    ultimoCapitulo,
    historias,
    ideias
};
