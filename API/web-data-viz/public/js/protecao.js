// se não tem usuário na sessão, tenta o "manter conectado"
if (sessionStorage.ID_USUARIO == undefined && localStorage.ID_USUARIO != undefined) {
    sessionStorage.ID_USUARIO = localStorage.ID_USUARIO;
    sessionStorage.NOME_USUARIO = localStorage.NOME_USUARIO;
    sessionStorage.EMAIL_USUARIO = localStorage.EMAIL_USUARIO;
}

// se mesmo assim não tem, volta para o login
if (sessionStorage.ID_USUARIO == undefined) {
    window.location = "login.html";
}