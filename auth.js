// ====================== AUTENTICAÇÃO ======================

let authInitializedUserId = null;

function iniciarAppAutenticado(user) {
    currentUser = user;
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');

    if (authInitializedUserId === user.id) return;

    authInitializedUserId = user.id;
    carregarConfig();
    carregarHistorico();
    carregarMateriais();
    carregarCatalogo();
    carregarConfigFinanceira();
}

function exibirTelaLogin() {
    authInitializedUserId = null;
    currentUser = null;
    document.getElementById('auth-container').classList.remove('hidden');
    document.getElementById('app-container').classList.add('hidden');
}

async function checkUser() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();

    if (error) {
        console.error('Erro ao restaurar sessão:', error);
        exibirTelaLogin();
        return;
    }

    if (session?.user) {
        iniciarAppAutenticado(session.user);
    } else {
        exibirTelaLogin();
    }
}

supabaseClient.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
        iniciarAppAutenticado(session.user);
    } else {
        exibirTelaLogin();
    }
});

async function handleLogin() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const errorContainer = document.getElementById('auth-error');

    if (!email || !password) {
        errorContainer.innerText = 'Informe e-mail e senha.';
        errorContainer.classList.remove('hidden');
        return;
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
        errorContainer.innerText = error.message;
        errorContainer.classList.remove('hidden');
        return;
    }

    errorContainer.classList.add('hidden');
    if (data.session?.user) iniciarAppAutenticado(data.session.user);
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
    exibirTelaLogin();
}

checkUser();
