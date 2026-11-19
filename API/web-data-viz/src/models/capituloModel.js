var database = require("../database/config");

// Capítulos de uma história, já ordenados pelo número.
// qtdCenas = cenas escritas no texto (cada uma tem um marcador "marcador_cena");
// se o texto ainda não tem nenhuma, usa as cenas planejadas no plot.
function listar(idHistoria) {
    var instrucaoSql = `
        SELECT c.idCapitulo, c.numero, c.titulo, c.status, c.palavras,
               CAST(IF(c.texto LIKE '%marcador_cena%',
                  (LENGTH(c.texto) - LENGTH(REPLACE(c.texto, 'class="marcador_cena"', ''))) / LENGTH('class="marcador_cena"'),
                  COUNT(s.idCenaPlan)) AS UNSIGNED) AS qtdCenas
        FROM capitulo c
        LEFT JOIN planejamentoCenas s ON s.fk_idCapPlan = c.fk_capPlan
        WHERE c.fk_historia = ?
        GROUP BY c.idCapitulo
        ORDER BY c.numero;
    `;
    return database.executar(instrucaoSql, [idHistoria]);
}

// novo capítulo vazio (status "nao_escrito" é o DEFAULT da coluna)
function criar(idHistoria, numero) {
    var instrucaoSql = `INSERT INTO capitulo (fk_historia, numero) VALUES (?, ?);`;
    return database.executar(instrucaoSql, [idHistoria, numero]);
}

// Um capítulo com o nome da história (tela de edição do capítulo).
// segundosDesdeSalvo: usado no "salvo há 2 min" (NULL se nunca foi salvo)
function buscar(idCapitulo) {
    var instrucaoSql = `
        SELECT c.idCapitulo, c.fk_historia AS idHistoria, c.numero, c.titulo, c.status,
               c.texto, c.palavras,
               TIMESTAMPDIFF(SECOND, c.atualizadoEm, NOW()) AS segundosDesdeSalvo,
               h.nome AS nomeHistoria, h.fk_usuario AS idUsuario,
               IFNULL(pc.plotTwist, 0) AS plotTwist
        FROM capitulo c
        JOIN historia h ON h.idHistoria = c.fk_historia
        LEFT JOIN planejamentoCapitulos pc ON pc.idCapPlan = c.fk_capPlan
        WHERE c.idCapitulo = ?;
    `;
    return database.executar(instrucaoSql, [idCapitulo]);
}

// Salva o capítulo (só se a história for do usuário: affectedRows = 0 quando não for)
function salvar(idCapitulo, idUsuario, titulo, status, texto, palavras) {
    var instrucaoSql = `
        UPDATE capitulo c
        JOIN historia h ON h.idHistoria = c.fk_historia
        SET c.titulo = ?, c.status = ?, c.texto = ?, c.palavras = ?, c.atualizadoEm = NOW()
        WHERE c.idCapitulo = ? AND h.fk_usuario = ?;
    `;
    return database.executar(instrucaoSql, [titulo, status, texto, palavras, idCapitulo, idUsuario]);
}

// Soma no dia de hoje as palavras escritas (diferença entre o total novo e o antigo).
// Apagar texto diminui o dia, mas nunca abaixo de zero.
function registrarEscrita(idUsuario, diferenca) {
    var instrucaoSql = `
        INSERT INTO registroEscrita (fk_usuario, dataEscrita, palavras)
        VALUES (?, CURDATE(), GREATEST(0, ?))
        ON DUPLICATE KEY UPDATE palavras = GREATEST(0, palavras + ?);
    `;
    return database.executar(instrucaoSql, [idUsuario, diferenca, diferenca]);
}

module.exports = {
    listar,
    criar,
    buscar,
    salvar,
    registrarEscrita
};
