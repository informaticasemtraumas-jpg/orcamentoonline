// ====================== AUTENTICAÇÃO ======================

async function checkUser() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
        currentUser = user;
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
        carregarConfig();
        carregarHistorico();
        carregarMateriais();
        carregarCatalogo();
        carregarConfigFinanceira();
    } else {
        currentUser = null;
        document.getElementById('auth-container').classList.remove('hidden');
        document.getElementById('app-container').classList.add('hidden');
    }
}

async function handleLogin() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const errorContainer = document.getElementById('auth-error');

    if (!email || !password) {
        errorContainer.innerText = 'Informe e-mail e senha.';
        errorContainer.classList.remove('hidden');
        return;
    }

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
        errorContainer.innerText = error.message;
        errorContainer.classList.remove('hidden');
        return;
    }

    errorContainer.classList.add('hidden');
    checkUser();
}

async function handleSignUp() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;

    if (!email || !password) {
        showAlert('Informe e-mail e senha para cadastrar.', 'error');
        return;
    }

    const { error } = await supabaseClient.auth.signUp({ email, password });
    if (error) {
        showAlert(error.message, 'error');
        return;
    }

    showAlert('Cadastro realizado! Tente logar.');
}

async function handleLogout() {
    await supabaseClient.auth.signOut();
    currentUser = null;
    location.reload();
}

checkUser();
