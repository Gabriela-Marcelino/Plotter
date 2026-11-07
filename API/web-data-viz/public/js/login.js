// MOSTRAR / ESCONDER SENHA
function mostrarSenha() {
    if (ipt_senha_login.type == "password") {
        ipt_senha_login.type = "text";
    } else {
        ipt_senha_login.type = "password";
    }
}

btn_mostrar_senha_login.onclick = mostrarSenha;

// LOGIN
function login() {
    var email = ipt_email_login.value.trim();
    var senha = ipt_senha_login.value;

    if (email.length == 0 || senha.length == 0) {
        div_mensagem_login.innerHTML = "Preencha o e-mail e a senha.";
        return;
    }

    div_mensagem_login.innerHTML = "";

    fetch("/usuarios/autenticar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            emailServer: email,
            senhaServer: senha
        })
    }).then(function (resposta) {
        if (resposta.ok) {
            resposta.json().then(function (json) {
                // sessionStorage: vale enquanto a aba estiver aberta
                sessionStorage.ID_USUARIO = json.idUsuario;
                sessionStorage.NOME_USUARIO = json.nome;
                sessionStorage.EMAIL_USUARIO = json.email;

                // "Manter conectado": localStorage fica salvo mesmo fechando o navegador
                if (ManterConectado.checked) {
                    localStorage.ID_USUARIO = json.idUsuario;
                    localStorage.NOME_USUARIO = json.nome;
                    localStorage.EMAIL_USUARIO = json.email;
                }

                window.location = "dashboard.html";
            });
        } else if (resposta.status == 403) {
            div_mensagem_login.innerHTML = "E-mail e/ou senha inválido(s).";
        } else {
            div_mensagem_login.innerHTML = "Não foi possível entrar. Tente novamente.";
        }
    }).catch(function (erro) {
        console.log(erro);
        div_mensagem_login.innerHTML = "Erro ao conectar com o servidor.";
    });
}