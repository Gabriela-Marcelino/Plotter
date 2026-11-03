CREATE DATABASE aula1Sprint3;
USE  aula1Sprint3;

CREATE TABLE curso(
idCurso int primary key AUTO_INCREMENT,
nome VARCHAR(45),
tipo VARCHAR(45),
CONSTRAINT chkTipo check(tipo in ('presencial', 'remoto')),
cargaHoraria int
);

insert into curso (nome, tipo) values
('Ingles', 'Presencial'),
('Espanhol', 'presencial');

SELECT * FROM curso;

CREATE TABLE aluno (
idAluno int primary key auto_increment,
nome VARCHAR(45),
email VARCHAR(45)) auto_increment = 1000;

INSERT INTO aluno (nome) values
('Inacio'),
('Idailto'),
('Idalina');

-- relacionamento n:n cria-se a tabela associativa
CREATE TABLE matricula (
idMatricula INT AUTO_INCREMENT,
fkCurso INT, 
CONSTRAINT fkCursoMatricula FOREIGN KEY (fkCurso) 
References curso (idCurso),
fkAluno Int,
Constraint fk0AlunoMatricula foreign key (fkAluno)
references aluno(idAluno),
constraint pkcomposta primary key (idMatricula, fkCurso, fkAluno),
nota decimal (4,2));

insert into matricula VALUES
(default, 1, 1000, 6),
(default, 2, 1001, 5),
(default, 2, 1001, 6);

SELECT aluno.nome as NomeAluno,
curso.nome as nomeCurso,
nota,
CASE
WHEN nota >= 6 THEN 'aprovado'
ELSE 'Reprovado'
END statuss
FROM aluno
JOIN matricula
on fkAluno = idAluno
join curso
on fkCurso = idCurso;

-- funçao matematica
-- max()

SELECT MAX(nota) FROM matricula; -- se espera apenas uma linha

-- MIN()
SELECT MIN(nota) FROM matricula; -- se espera apenas uma linha

-- MAXIMO E MINIMO JUNTOS
SELECT MAX(nota), MIN(nota) FROM matricula; -- se espera apenas uma linha

-- SOMA -> USAMOS O SUM()
SELECT SUM(nota) FROM matricula; -- se espera apenas uma linha

-- MEDIA -> USAMOS O AVG()
SELECT AVG(nota) FROM matricula; -- se espera apenas uma linha

-- COMO FORMATAR AS CASAS DEPOIS DA VIRGULA. TEM SUAS FORMAS
-- 1. ROUND()

SELECT ROUND(AVG(nota), 2) FROM matricula; -- n se usa pra preço

-- 2. TRUNCATE() -> ELE NÃO ARREDONDA, SÓ PAAGA TODAS AS CASAS DECIMAIS QUE EM DEPOIS
SELECT TRUNCATE(AVG(nota), 2) FROM matricula;

-- contabilizador de linhas, vai ver quantas linhas tem um mesmo valor
-- COUNT()

SELECT COUNT(nota) FROM matricula;

-- Se aquela coluna estiver vazia

INSERT INTO matricula VALUES
(default, 1, 1002, null);

SELECT * FROM matricula; -- pra verificar se o aluno foi inserido
-- no count n vai aparecer o null pq ele está vazio e não foi contabilizado. ifnull não vai dar resultado
-- pra contar quantas linhas estão nulas, da um count em uma coluna que nunca ta vazia, e dpois  coloca where (a coluna que ta null) = 0
-- GROUP BY - FUNCAO AGRAGAÇAO
select avg(nota), aluno.nome FROM aluno JOIN matricula
ON idaluno = fkaluno
GROUP BY aluno.nome;


insert into matricula values
(default, 2, 1002, 9);

-- pra mostrar o aluno com a maior nota
SELECT aluno.nome, nota from aluno join matricula
on idaluno = fkAluno
WHERE nota = (select MAX(nota) from matricula);