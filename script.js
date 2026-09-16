function mostrarSenha() {
    const senha = document.getElementById("senha");
    const eye = document.getElementById("eyeIcon");

    if (senha.type === "password") {
        senha.type = "text";
        eye.classList.remove("fa-eye");
        eye.classList.add("fa-eye-slash");
    } else {
        senha.type = "password";
        eye.classList.remove("fa-eye-slash");
        eye.classList.add("fa-eye");
    }
}

function mostrarSenhaCadastro() {
    const senha = document.getElementById("senhaCadastro");
    const eye = document.getElementById("eyeCadastro");

    if (senha.type === "password") {
        senha.type = "text";
        eye.classList.remove("fa-eye");
        eye.classList.add("fa-eye-slash");
    } else {
        senha.type = "password";
        eye.classList.remove("fa-eye-slash");
        eye.classList.add("fa-eye");
    }
}

function mostrarConfirmacao() {
    const senha = document.getElementById("confirmarSenha");
    const eye = document.getElementById("eyeConfirmacao");

    if (senha.type === "password") {
        senha.type = "text";
        eye.classList.remove("fa-eye");
        eye.classList.add("fa-eye-slash");
    } else {
        senha.type = "password";
        eye.classList.remove("fa-eye-slash");
        eye.classList.add("fa-eye");
    }
}

function entrar() {
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value.trim();

    if (email === "" || senha === "") {
        alert("Preencha o e-mail e a senha.");
        return;
    }

    alert("Login realizado com sucesso!");
}

function cadastrar() {
    const nome = document.getElementById("nome").value.trim();
    const email = document.getElementById("emailCadastro").value.trim();
    const senha = document.getElementById("senhaCadastro").value;
    const confirmar = document.getElementById("confirmarSenha").value;
    const termos = document.getElementById("termos").checked;

    if (nome === "" || email === "" || senha === "" || confirmar === "") {
        alert("Preencha todos os campos.");
        return;
    }

    if (senha !== confirmar) {
        alert("As senhas não são iguais.");
        return;
    }

    if (!termos) {
        alert("Aceite os termos de uso para continuar.");
        return;
    }

    alert("Conta criada com sucesso!");

    window.location.href = "index.html";
}

function esqueciSenha() {
    alert("Em breve você poderá recuperar sua senha por e-mail.");
}

function loginGoogle() {
    alert("Login com Google será configurado posteriormente.");
}