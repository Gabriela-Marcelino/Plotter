// VERIFICAÇÃO DA SENHA 
function contarRequisitos(senha) {
    var numeros = "0123456789";
    var especiais = "!@#$%^&*()_+-=[]{};':\"\\|,.<>/?~`";

    var temMaiuscula = false;
    var temMinuscula = false;
    var temNumero = false;
    var temEspecial = false;

    for (var i = 0; i < senha.length; i++) {
        var caractere = senha[i];

        if (numeros.includes(caractere)) {
            temNumero = true;
        } else if (especiais.includes(caractere)) {
            temEspecial = true;
        } else if (caractere == caractere.toUpperCase() && caractere != caractere.toLowerCase()) {
            temMaiuscula = true;
        } else if (caractere == caractere.toLowerCase() && caractere != caractere.toUpperCase()) {
            temMinuscula = true;
        }
    }

    var pontos = 0;

    if (senha.length >= 8) {pontos++}
    if (temMaiuscula) {pontos++}
    if (temMinuscula) {pontos++}
    if (temNumero) {pontos++}
    if (temEspecial) {pontos++}

    return pontos;
}

// Retorna "fraca", "média" ou "forte"
function classificarSenha(senha) {
    var pontos = contarRequisitos(senha);

    if (pontos == 5) {
        return "forte";
    } else if (pontos == 4) {
        return "média";
    } else {
        return "fraca";
    }
}

// BARRAS DE FORÇA
function verificarForca() {
    var senha = input_senha_cadastro.value;
    var barras = document.getElementsByClassName("barra");
    var nivel = classificarSenha(senha);
    var quantidadeAtiva = 0;

    if (nivel == "fraca") {
        quantidadeAtiva = 1;
    } else if (nivel == "média") {
        quantidadeAtiva = 2;
    } else {
        quantidadeAtiva = 4;
    }

    if (senha.length == 0) {
        quantidadeAtiva = 0;
    }

    for (var i = 0; i < barras.length; i++) {
        if (i < quantidadeAtiva) {
            barras[i].classList.add("ativa");
        } else {
            barras[i].classList.remove("ativa");
        }
    }

    nivel_forca.innerHTML = nivel;
}

// MOSTRAR SENHA
function mostrarSenha() {
    if (input_senha_cadastro.type == "password") {
        input_senha_cadastro.type = "text";
    } else {
        input_senha_cadastro.type = "password";
    }
}

function mostrarConfirmacao() {
    if (input_senha_cadastro_confirmacao.type == "password") {
        input_senha_cadastro_confirmacao.type = "text";
    } else {
        input_senha_cadastro_confirmacao.type = "password";
    }
}

// LIGANDO AS FUNÇÕES AOS ELEMENTOS 

window.onload = function () {
    input_senha_cadastro.oninput = verificarForca;

    var botaoSenha = document.getElementsByClassName("botao_mostrar_senha");
    botaoSenha[0].onclick = mostrarSenha;

    var botaoConfirmacao = document.getElementsByClassName("botao_confirmar_senha");
    botaoConfirmacao[0].onclick = mostrarConfirmacao;
};

// ---------- CRIAR CONTA ----------
function CriarConta() {
    var nome = input_nome_cadastro.value.trim();
    var email = input_email_cadastro.value.trim();
    var senha = input_senha_cadastro.value;
    var confirmacao = input_senha_cadastro_confirmacao.value;


    var divTermos = document.getElementsByClassName("checkbox_criar_conta");
    var checkboxTermos = divTermos[0].getElementsByTagName("input");
    var aceitouTermos = checkboxTermos[0].checked;

    // nome
    if (nome.length < 2) {
        alert("Digite seu nome.");
        return;
    }

    var posicaoArroba = email.indexOf("@");
    var posicaoPonto = email.lastIndexOf(".");

    if (email.length == 0 || posicaoArroba < 1 || posicaoPonto < posicaoArroba + 2
        || posicaoPonto == email.length - 1 || email.includes(" ")) {
        alert("Digite um e-mail válido.");
        return;
    }

    // senha
    if (senha.length == 0) {
        alert("Digite uma senha.");
        return;
    }

    if (classificarSenha(senha) == "fraca") {
        alert("Senha fraca! Use 8 ou mais caracteres, com maiúscula, minúscula, número e caractere especial.");
        return;
    }

    // confirmação
    if (senha != confirmacao) {
        alert("As senhas não coincidem.");
        return;
    }

    // termos
    if (!aceitouTermos) {
        alert("Você precisa aceitar os Termos de uso e a Política de privacidade.");
        return;
    }

    // PARTE DA API

    fetch("/usuarios/cadastrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            nomeServer: nome,
            emailServer: email,
            senhaServer: senha
        })
   }).then(function (resposta) {
        if (resposta.ok) {
            alert("Conta criada com sucesso!");
            window.location = "login.html";
        } else if (resposta.status == 409) {
            alert("Este e-mail já está cadastrado.");
        } else {
            alert("Não foi possível criar a conta. Tente novamente.");
        }
    }).catch(function (erro) {
        console.log(erro);
        alert("Erro ao conectar com o servidor.");
    });
}