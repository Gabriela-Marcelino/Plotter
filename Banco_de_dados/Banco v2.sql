USE plotter;

-- TABELA 01 - CADASTRO
CREATE TABLE usuario (
  idUsuario INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL, -- guardar o HASH da senha, nunca a senha pura
  meta_mensal_palavras INT NOT NULL DEFAULT 10000
) AUTO_INCREMENT = 1000;

-- TABELA 01B - HISTÓRIA
CREATE TABLE historia (
  idHistoria INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  fk_usuario INT NOT NULL,
    CONSTRAINT fk_historia_usuario FOREIGN KEY (fk_usuario) REFERENCES usuario(idUsuario) ON DELETE CASCADE,
  nome VARCHAR(200) NOT NULL,
  classificacao ENUM('livre', '10', '12', '14', '16', '18') NOT NULL,
  capa MEDIUMTEXT NULL,        -- imagem em texto (base64) ou NULL
  cor VARCHAR(30) NULL,        -- cor do card quando não tem capa
  concluida BOOLEAN NOT NULL DEFAULT 0,
  criadoEm TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- TABELA 01C - GÊNEROS (cada usuário tem a sua lista)
CREATE TABLE genero (
  idGenero INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  fk_usuario INT NOT NULL,
    CONSTRAINT fk_genero_usuario FOREIGN KEY (fk_usuario) REFERENCES usuario(idUsuario) ON DELETE CASCADE,
  nome VARCHAR(40) NOT NULL,
    UNIQUE KEY uq_genero_usuario_nome (fk_usuario, nome)
);

-- TABELA 01D - GÊNEROS DE CADA HISTÓRIA (N:N)
CREATE TABLE historiaGenero (
  fk_historia INT NOT NULL,
    CONSTRAINT fk_hg_historia FOREIGN KEY (fk_historia) REFERENCES historia(idHistoria) ON DELETE CASCADE,
  fk_genero INT NOT NULL,
    CONSTRAINT fk_hg_genero FOREIGN KEY (fk_genero) REFERENCES genero(idGenero) ON DELETE CASCADE,
  PRIMARY KEY (fk_historia, fk_genero)
);

-- TABELA 01E - MOODBOARD DA HISTÓRIA
CREATE TABLE historiaImagem (
  idImagem INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  fk_historia INT NOT NULL,
    CONSTRAINT fk_himg_historia FOREIGN KEY (fk_historia) REFERENCES historia(idHistoria) ON DELETE CASCADE,
  ordem INT NOT NULL,
  imagem MEDIUMTEXT NOT NULL   -- imagem em texto (base64)
);

-- TABELA 02 - PLOTS
CREATE TABLE plots (
  idPlot CHAR(36) NOT NULL PRIMARY KEY, -- o JS usa o id como texto
  nome VARCHAR(200) NOT NULL,
  medida ENUM('capitulos', 'palavras') NOT NULL DEFAULT 'capitulos',
  total INT NOT NULL, -- nº de capítulos OU de palavras, conforme 'medida'
    CONSTRAINT ck_plots_total CHECK (total > 0),
  palavras_por_cap INT NOT NULL DEFAULT 3000,
    CONSTRAINT ck_plots_palavras_cap CHECK (palavras_por_cap > 0),
  rascunho TEXT NULL,
  estrutura ENUM('livre', '3', '4', '5') NOT NULL DEFAULT 'livre',
  criadoEm TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ultimoUpdate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  fk_historia INT NULL, -- história vinculada 
    CONSTRAINT fk_plots_historia FOREIGN KEY (fk_historia) REFERENCES historia(idHistoria) ON DELETE SET NULL,
  fk_usuario INT NOT NULL,
    CONSTRAINT fk_plots_usuario FOREIGN KEY (fk_usuario) REFERENCES usuario(idUsuario) ON DELETE CASCADE
);

-- TABELA 03 - ATOS
CREATE TABLE atos (
  idAto INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  fk_plot CHAR(36) NOT NULL,
    CONSTRAINT fk_atos_plot FOREIGN KEY (fk_plot) REFERENCES plots(idPlot) ON DELETE CASCADE,
  posicao TINYINT UNSIGNED NOT NULL,            -- 1, 2, 3... (cor do ato = CORES[posicao - 1])
    UNIQUE KEY uq_atos_plot_posicao (fk_plot, posicao),
  nomeAto VARCHAR(100) NOT NULL,
  qtdCapitulos INT NOT NULL,
    CONSTRAINT ck_atos_qtd CHECK (qtdCapitulos >= 0)
);

-- TABELA 04 - CAPÍTULOS PLANEJADOS
CREATE TABLE planejamentoCapitulos (
  idCapPlan INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  fk_plot CHAR(36) NOT NULL,
    CONSTRAINT fk_capplan_plot FOREIGN KEY (fk_plot) REFERENCES plots(idPlot) ON DELETE CASCADE,
  numeroCap INT NOT NULL,
    UNIQUE KEY uq_capplan_plot_num (fk_plot, numeroCap),  -- não existem dois "capítulo 8" no mesmo plot
  titulo VARCHAR(200) NOT NULL,
  sinopse TEXT NULL, 
  plotTwist BOOLEAN NOT NULL DEFAULT 0
);

-- TABELA 05 - CENAS PLANEJADAS
CREATE TABLE planejamentoCenas (
  idCenaPlan INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  fk_idCapPlan INT NOT NULL,
    CONSTRAINT fk_cenaplan_cap FOREIGN KEY (fk_idCapPlan) REFERENCES planejamentoCapitulos(idCapPlan) ON DELETE CASCADE,
  ordem INT NOT NULL,                           -- 1ª, 2ª, 3ª cena do capítulo
    UNIQUE KEY uq_cenaplan_cap_ordem (fk_idCapPlan, ordem),
  titulo VARCHAR(200) NOT NULL,
  descricao TEXT NULL,
  escrito BOOLEAN NOT NULL DEFAULT 0
);

-- TABELA 06 - CAPÍTULOS DA HISTÓRIA (o que é escrito de verdade)
CREATE TABLE capitulo (
  idCapitulo INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  fk_historia INT NOT NULL,
    CONSTRAINT fk_capitulo_historia FOREIGN KEY (fk_historia) REFERENCES historia(idHistoria) ON DELETE CASCADE,
  numero INT NOT NULL,
  titulo VARCHAR(200) NULL,    -- vazio vira "Capítulo 01" na tela
  sinopse TEXT NULL,
  status ENUM('nao_escrito', 'escrevendo', 'a_revisar', 'revisado', 'concluido', 'publicado') NOT NULL DEFAULT 'nao_escrito',
  texto MEDIUMTEXT NULL,
  palavras INT NOT NULL DEFAULT 0,
  atualizadoEm TIMESTAMP NULL,  -- última vez que o texto foi salvo ("salvo há 2 min")
  fk_capPlan INT NULL,         -- capítulo do plot que deu origem a este (se houver)
    CONSTRAINT fk_capitulo_capplan FOREIGN KEY (fk_capPlan) REFERENCES planejamentoCapitulos(idCapPlan) ON DELETE SET NULL
);

-- TABELA 07 - PALAVRAS ESCRITAS POR DIA (dashboard: gráfico, calendário, sequência...)
-- Uma linha por usuário por dia. Cada vez que um capítulo é salvo, a diferença
-- de palavras (novo total - total antigo) é somada no dia de hoje.
CREATE TABLE registroEscrita (
  idRegistro INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  fk_usuario INT NOT NULL,
    CONSTRAINT fk_registro_usuario FOREIGN KEY (fk_usuario) REFERENCES usuario(idUsuario) ON DELETE CASCADE,
  dataEscrita DATE NOT NULL,
  palavras INT NOT NULL DEFAULT 0,
    UNIQUE KEY uq_registro_usuario_dia (fk_usuario, dataEscrita)
);

-- TABELA 08 - IDEIAS PARA HOJE (dashboard)
CREATE TABLE ideia (
  idIdeia INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  texto VARCHAR(300) NOT NULL
);

INSERT INTO ideia (texto) VALUES
  ('Escreva uma cena em que o personagem perde algo importante.'),
  ('Escreva um diálogo em que ninguém diz o que realmente quer.'),
  ('Coloque seu protagonista num lugar onde ele nunca esteve.'),
  ('Escreva uma cena que comece no meio de uma discussão.'),
  ('Mostre um segredo sendo descoberto por acidente.'),
  ('Descreva um lugar usando só sons e cheiros.'),
  ('Escreva a mesma cena do ponto de vista do antagonista.'),
  ('Faça um personagem mentir para proteger alguém.'),
  ('Escreva uma despedida que não parece uma despedida.'),
  ('Termine uma cena com uma pergunta sem resposta.'),
  ('Escreva um momento de calma logo antes de tudo dar errado.'),
  ('Dê ao seu personagem uma escolha em que as duas opções custam caro.');





-- ============ CONSULTA DA TELA 1 (cards): progresso de cada plot ============
-- Troque ? pelo id do usuário logado. Twists e capítulos escritos vêm das duas consultas seguintes.
SELECT p.idPlot, p.nome, p.estrutura,
       COUNT(DISTINCT c.idCapPlan)                                   AS totalCapitulos,
       COUNT(s.idCenaPlan)                                           AS cenasPlanejadas,
       SUM(s.escrito)                                                AS cenasEscritas
FROM plots p
LEFT JOIN planejamentoCapitulos c ON c.fk_plot = p.idPlot
LEFT JOIN planejamentoCenas s ON s.fk_idCapPlan = c.idCapPlan
WHERE p.fk_usuario = ?
GROUP BY p.idPlot;

-- Total de plot twists por plot:
SELECT fk_plot, SUM(plotTwist) AS totalTwists FROM planejamentoCapitulos GROUP BY fk_plot;

-- Capítulos escritos por plot (igual ao capEscrito() do JS: têm cenas e nenhuma pendente):
SELECT c.fk_plot, COUNT(*) AS capitulosEscritos
FROM planejamentoCapitulos c
WHERE EXISTS (SELECT 1 FROM planejamentoCenas s WHERE s.fk_idCapPlan = c.idCapPlan)
  AND NOT EXISTS (SELECT 1 FROM planejamentoCenas s WHERE s.fk_idCapPlan = c.idCapPlan AND s.escrito = 0)
GROUP BY c.fk_plot;