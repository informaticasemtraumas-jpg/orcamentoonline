// Configuração do Supabase
const SUPABASE_URL = 'https://ifmqqaxherxadjsxljpv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_1acNQnNCChNAow0De54rbQ_R0GAafgK';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Inicialização dos ícones Lucide
lucide.createIcons();

// Estado Global
let itensOrcamento = [];
let complexidadeAtual = 1.0;
let complexidadeNome = "Padrão";
let currentUser = null;
let statusChart = null;

// Formatador de Moeda
const formatadorMoeda = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
});

// --- SISTEMA DE AUTENTICAÇÃO ---

async function checkUser() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
        currentUser = user;
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
        carregarConfig();
        carregarHistorico();
    } else {
        document.getElementById('auth-container').classList.remove('hidden');
        document.getElementById('app-container').classList.add('hidden');
    }
}

async function handleLogin() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const errorEl = document.getElementById('auth-error');

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
        errorEl.innerText = "Erro ao entrar: " + error.message;
        errorEl.classList.remove('hidden');
    } else {
        checkUser();
    }
}

async function handleSignUp() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const errorEl = document.getElementById('auth-error');
    
    if (!email || !password) {
        errorEl.innerText = "Preencha e-mail e senha.";
        errorEl.classList.remove('hidden');
        return;
    }

    errorEl.innerText = "Processando cadastro...";
    errorEl.classList.remove('hidden');
    errorEl.classList.replace('text-red-500', 'text-indigo-600');

    const { data, error } = await supabaseClient.auth.signUp({ email, password });

    if (error) {
        errorEl.innerText = "Erro ao cadastrar: " + error.message;
        errorEl.classList.replace('text-indigo-600', 'text-red-500');
        errorEl.classList.remove('hidden');
    } else {
        errorEl.innerText = "Cadastro realizado! Tente fazer login agora.";
        errorEl.classList.replace('text-red-500', 'text-emerald-600');
        alert("Cadastro realizado com sucesso! Se você não desativou a confirmação de e-mail no Supabase, verifique sua caixa de entrada.");
    }
}

async function handleLogout() {
    await supabaseClient.auth.signOut();
    location.reload();
}

// --- GESTÃO DE DADOS (SUPABASE) ---

async function salvarNoBanco(dados) {
    const { error } = await supabaseClient
        .from('orcamentos')
        .insert([{
            cliente: dados.cliente,
            whatsapp: dados.whatsapp,
            itens: dados.itens,
            subtotal: dados.subtotal,
            desconto: dados.desconto,
            total: dados.total,
            status: 'Pendente',
            user_id: currentUser.id
        }]);

    if (error) console.error("Erro ao salvar:", error);
    else carregarHistorico();
}

async function atualizarStatus(id, novoStatus) {
    const { error } = await supabaseClient
        .from('orcamentos')
        .update({ status: novoStatus })
        .eq('id', id);

    if (error) alert("Erro ao atualizar status: " + error.message);
    else carregarHistorico();
}

async function carregarHistorico() {
    const { data, error } = await supabaseClient
        .from('orcamentos')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Erro ao carregar histórico:", error);
        return;
    }

    atualizarDashboard(data);

    const container = document.getElementById('lista-historico');
    if (data.length === 0) {
        container.innerHTML = '<p class="text-center text-slate-400 py-8">Nenhum orçamento encontrado.</p>';
        return;
    }

    container.innerHTML = data.map(orc => {
        const statusColors = {
            'Pendente': 'bg-amber-100 text-amber-700 border-amber-200',
            'Em Produção': 'bg-blue-100 text-blue-700 border-blue-200',
            'Pronto': 'bg-emerald-100 text-emerald-700 border-emerald-200',
            'Entregue': 'bg-slate-100 text-slate-600 border-slate-200'
        };

        return `
            <div class="p-5 bg-white border border-slate-100 rounded-3xl shadow-sm space-y-4">
                <div class="flex justify-between items-start">
                    <div>
                        <p class="font-black text-slate-800 text-lg">${orc.cliente || 'Consumidor'}</p>
                        <p class="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                            ${new Date(orc.created_at).toLocaleDateString('pt-BR')} às ${new Date(orc.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                        </p>
                    </div>
                    <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase border ${statusColors[orc.status] || statusColors['Pendente']}">
                        ${orc.status || 'Pendente'}
                    </span>
                </div>
                
                <div class="flex justify-between items-center pt-2 border-t border-slate-50">
                    <div class="text-indigo-600 font-black text-xl">
                        ${formatadorMoeda.format(orc.total)}
                    </div>
                    <div class="flex gap-1">
                        <select onchange="atualizarStatus(${orc.id}, this.value)" class="text-[10px] font-bold bg-slate-50 border border-slate-200 rounded-lg p-1 outline-none">
                            <option value="" disabled selected>Alterar Status</option>
                            <option value="Pendente">Pendente</option>
                            <option value="Em Produção">Em Produção</option>
                            <option value="Pronto">Pronto</option>
                            <option value="Entregue">Entregue</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// --- DASHBOARD ---

function atualizarDashboard(data) {
    const agora = new Date();
    const mesAtual = agora.getMonth();
    const anoAtual = agora.getFullYear();

    let totalGeral = 0;
    let totalMes = 0;
    let totalReceber = 0;
    
    const statusCounts = {
        'Pendente': 0,
        'Em Produção': 0,
        'Pronto': 0,
        'Entregue': 0
    };

    data.forEach(orc => {
        const dataOrc = new Date(orc.created_at);
        const valor = orc.total || 0;
        const status = orc.status || 'Pendente';

        totalGeral += valor;
        statusCounts[status] = (statusCounts[status] || 0) + 1;

        if (dataOrc.getMonth() === mesAtual && dataOrc.getFullYear() === anoAtual) {
            totalMes += valor;
        }

        if (status === 'Pronto' || status === 'Em Produção' || status === 'Pendente') {
            totalReceber += valor;
        }
    });

    document.getElementById('dash-total').innerText = formatadorMoeda.format(totalGeral);
    document.getElementById('dash-mes').innerText = formatadorMoeda.format(totalMes);
    document.getElementById('dash-receber').innerText = formatadorMoeda.format(totalReceber);

    renderizarGrafico(statusCounts);
}

function renderizarGrafico(counts) {
    const ctx = document.getElementById('statusChart').getContext('2d');
    
    if (statusChart) {
        statusChart.destroy();
    }

    statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(counts),
            datasets: [{
                data: Object.values(counts),
                backgroundColor: [
                    '#f59e0b', // Pendente (Amber)
                    '#3b82f6', // Em Produção (Blue)
                    '#10b981', // Pronto (Emerald)
                    '#94a3b8'  // Entregue (Slate)
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        usePointStyle: true,
                        font: { size: 10, weight: 'bold' }
                    }
                }
            },
            cutout: '70%'
        }
    });
}

// --- LÓGICA DO GERADOR ---

function switchTab(tab) {
    const isGerador = tab === 'gerador';
    document.getElementById('view-gerador').classList.toggle('hidden', !isGerador);
    document.getElementById('view-historico').classList.toggle('hidden', isGerador);
    
    document.getElementById('tab-gerador').className = isGerador 
        ? "flex-1 py-2 px-4 rounded-xl font-bold text-sm transition-all bg-white text-indigo-600 shadow-sm"
        : "flex-1 py-2 px-4 rounded-xl font-bold text-sm transition-all text-slate-500 hover:bg-white/50";
    
    document.getElementById('tab-historico').className = !isGerador 
        ? "flex-1 py-2 px-4 rounded-xl font-bold text-sm transition-all bg-white text-indigo-600 shadow-sm"
        : "flex-1 py-2 px-4 rounded-xl font-bold text-sm transition-all text-slate-500 hover:bg-white/50";

    if (!isGerador) carregarHistorico();
}

function toggleConfig() {
    const content = document.getElementById('config-content');
    const icon = document.getElementById('config-icon');
    content.classList.toggle('config-hidden');
    icon.style.transform = content.classList.contains('config-hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
}

function setComplex(valor, btn) {
    complexidadeAtual = valor;
    complexidadeNome = btn.innerText;
    document.querySelectorAll('.complex-btn').forEach(b => {
        b.classList.remove('border-indigo-600', 'bg-indigo-50', 'text-indigo-700');
        b.classList.add('border-slate-200', 'bg-white', 'text-slate-600');
    });
    btn.classList.remove('border-slate-200', 'bg-white', 'text-slate-600');
    btn.classList.add('border-indigo-600', 'bg-indigo-50', 'text-indigo-700');
}

function adicionarPeca() {
    const select = document.getElementById('servico');
    const option = select.options[select.selectedIndex];
    if (!option.value) return alert("Selecione um serviço.");

    const precoBase = parseFloat(option.dataset.preco);
    const isUrgente = document.getElementById('urgencia').checked;
    let precoFinal = Math.ceil(precoBase * complexidadeAtual * (isUrgente ? 1.3 : 1));

    itensOrcamento.push({
        id: Date.now(),
        nome: option.text.split(' - ')[0],
        complexidadeNome: complexidadeNome,
        precoUnitario: precoFinal
    });

    renderizarLista();
    calcularTotal();
}

function renderizarLista() {
    const container = document.getElementById('lista-pecas');
    container.innerHTML = itensOrcamento.map(item => `
        <div class="flex justify-between items-center p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
            <div>
                <p class="font-bold text-slate-800">${item.nome}</p>
                <p class="text-[10px] text-slate-400 uppercase font-bold">${item.complexidadeNome}</p>
            </div>
            <div class="flex items-center gap-4">
                <span class="font-mono font-bold text-indigo-600">${formatadorMoeda.format(item.precoUnitario)}</span>
                <button onclick="removerPeca(${item.id})" class="text-slate-300 hover:text-red-500">
                    <i data-lucide="trash-2" class="w-5 h-5"></i>
                </button>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

function removerPeca(id) {
    itensOrcamento = itensOrcamento.filter(i => i.id !== id);
    renderizarLista();
    calcularTotal();
}

function calcularTotal() {
    const subtotal = itensOrcamento.reduce((acc, i) => acc + i.precoUnitario, 0);
    const desconto = parseFloat(document.getElementById('desconto').value) || 0;
    const total = Math.max(0, subtotal - desconto);

    document.getElementById('res-subtotal').innerText = formatadorMoeda.format(subtotal);
    document.getElementById('res-desconto').innerText = `- ${formatadorMoeda.format(desconto)}`;
    document.getElementById('res-total').innerText = formatadorMoeda.format(total);

    return { subtotal, desconto, total };
}

// --- SAÍDAS ---

async function gerarPDF() {
    if (itensOrcamento.length === 0) return alert("Adicione itens.");
    
    const totais = calcularTotal();
    const dados = {
        cliente: document.getElementById('cliente').value || "Consumidor",
        whatsapp: document.getElementById('whatsapp').value || "-",
        itens: itensOrcamento,
        subtotal: totais.subtotal,
        desconto: totais.desconto,
        total: totais.total
    };

    // Salva no Supabase
    await salvarNoBanco(dados);

    // Preenche PDF
    document.getElementById('pdf-header-nome').innerText = document.getElementById('atelie-nome').value;
    document.getElementById('pdf-header-contato').innerText = `WhatsApp: ${document.getElementById('atelie-fone').value} | ${document.getElementById('atelie-extra').value}`;
    document.getElementById('pdf-cliente-nome').innerText = dados.cliente;
    document.getElementById('pdf-cliente-fone').innerText = dados.whatsapp;
    document.getElementById('pdf-data').innerText = new Date().toLocaleDateString('pt-BR');
    document.getElementById('pdf-numero').innerText = Date.now().toString().slice(-6);

    document.getElementById('pdf-tabela-corpo').innerHTML = dados.itens.map(i => `
        <tr class="border-b border-slate-100">
            <td class="py-3 px-2">1</td>
            <td class="py-3 px-2">${i.nome}</td>
            <td class="py-3 px-2">${i.complexidadeNome}</td>
            <td class="py-3 px-2 text-right">${formatadorMoeda.format(i.precoUnitario)}</td>
        </tr>
    `).join('');

    document.getElementById('pdf-subtotal').innerText = formatadorMoeda.format(dados.subtotal);
    document.getElementById('pdf-desconto').innerText = `- ${formatadorMoeda.format(dados.desconto)}`;
    document.getElementById('pdf-total').innerText = formatadorMoeda.format(dados.total);

    document.getElementById('modal-pdf').classList.remove('hidden');
}

function enviarWhatsApp() {
    const totais = calcularTotal();
    const cliente = document.getElementById('cliente').value || "Cliente";
    const fone = document.getElementById('whatsapp').value.replace(/\D/g, '');
    
    let msg = `*ORÇAMENTO - ${document.getElementById('atelie-nome').value}*\nOlá, ${cliente}!\n\n`;
    itensOrcamento.forEach((i, idx) => msg += `${idx+1}. ${i.nome} - *${formatadorMoeda.format(i.precoUnitario)}*\n`);
    msg += `\n*TOTAL: ${formatadorMoeda.format(totais.total)}*`;
    
    window.open(`https://api.whatsapp.com/send?phone=55${fone}&text=${encodeURIComponent(msg)}`, '_blank');
}

function fecharModalPDF() { document.getElementById('modal-pdf').classList.add('hidden'); }
function imprimirPDF() { window.print(); }

function carregarConfig() {
    const config = JSON.parse(localStorage.getItem('configAtelieViva'));
    if (config) {
        document.getElementById('atelie-nome').value = config.nome;
        document.getElementById('atelie-fone').value = config.fone;
        document.getElementById('atelie-extra').value = config.extra;
    }
}

// Inicia verificação de usuário
checkUser();
