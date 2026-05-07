// Configuração do Supabase
const SUPABASE_URL = 'https://ifmqqaxherxadjsxljpv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_1acNQnNCChNAow0De54rbQ_R0GAafgK';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Inicialização dos ícones Lucide
lucide.createIcons();

// ==================== ESTADO GLOBAL ====================
let itensOrcamento = [];
let materiaisProducao = [];
let complexidadeAtual = 1.0;
let complexidadeNome = "Padrão";
let currentUser = null;
let statusChart = null;
let materiais = [];

// Configurações Financeiras (Padrão)
let configFinanceira = {
    valorHora: 0,
    custosFixos: 0,
    horasMes: 160,
    custoMinuto: 0
};

// Formatador de Moeda
const formatadorMoeda = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
});

// ====================== ESTOQUE ======================

async function carregarMateriais() {
    if (!currentUser) return;
    
    const { data, error } = await supabaseClient
        .from('materiais')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('nome', { ascending: true });

    if (error) {
        console.error("Erro ao carregar materiais:", error);
        showToast("Erro ao carregar estoque", "error");
        return;
    }

    materiais = data || [];
    renderizarListaEstoque();
}

function renderizarListaEstoque(listaFiltrada = null) {
    const container = document.getElementById('lista-estoque');
    if (!container) return;

    const lista = listaFiltrada || materiais;

    if (lista.length === 0) {
        container.innerHTML = `
            <div class="bg-slate-50 border border-dashed border-slate-200 rounded-3xl py-16 text-center col-span-full">
                <i data-lucide="package" class="w-16 h-16 mx-auto mb-4 text-slate-300"></i>
                <p class="text-slate-500">Nenhum material cadastrado ainda</p>
                <button onclick="abrirModalNovoMaterial()" 
                        class="mt-4 text-indigo-600 font-bold hover:underline">
                    + Cadastrar primeiro material
                </button>
            </div>`;
        lucide.createIcons();
        return;
    }

    let html = '';

    lista.forEach(item => {
        const preco = parseFloat(item.preco_unitario) || 0;
        const qtd = parseFloat(item.quantidade) || 0;
        const valorTotal = (qtd * preco).toFixed(2);
        
        html += `
        <div class="bg-white border border-slate-100 rounded-3xl p-6 hover:shadow-md transition-all">
            <div class="flex justify-between">
                <div class="flex-1">
                    <h4 class="font-bold text-lg text-slate-800">${item.nome}</h4>
                    ${item.descricao ? `<p class="text-sm text-slate-500 mt-1 line-clamp-2">${item.descricao}</p>` : ''}
                </div>
                <div class="text-right">
                    <span class="inline-block px-4 py-2 bg-emerald-100 text-emerald-700 font-bold rounded-2xl text-sm">
                        ${qtd.toFixed(2)} ${item.unidade}
                    </span>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4 mt-6">
                <div>
                    <p class="text-xs text-slate-500">Preço de custo</p>
                    <p class="text-2xl font-bold text-slate-700">R$ ${preco.toFixed(2)}</p>
                </div>
                <div class="text-right">
                    <p class="text-xs text-slate-500">Valor total em estoque</p>
                    <p class="text-2xl font-bold text-emerald-600">R$ ${valorTotal}</p>
                </div>
            </div>

            <div class="flex gap-3 mt-6">
                <button onclick="ajustarEstoque(${item.id})" 
                        class="flex-1 py-4 bg-slate-100 hover:bg-slate-200 font-bold rounded-2xl transition-all text-xs">
                    Qtd
                </button>
                <button onclick="ajustarPreco(${item.id})" 
                        class="flex-1 py-4 bg-slate-100 hover:bg-slate-200 font-bold rounded-2xl transition-all text-xs">
                    Preço
                </button>
                <button onclick="excluirMaterial(${item.id})" 
                        class="px-5 py-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl transition-all">
                    <i data-lucide="trash-2" class="w-5 h-5"></i>
                </button>
            </div>
        </div>`;
    });

    container.innerHTML = html;
    lucide.createIcons();
}

function filtrarEstoque() {
    const termo = document.getElementById('filtro-estoque').value.toLowerCase().trim();
    if (!termo) {
        renderizarListaEstoque();
        return;
    }

    const filtrados = materiais.filter(m => 
        m.nome.toLowerCase().includes(termo) || 
        (m.descricao && m.descricao.toLowerCase().includes(termo))
    );
    renderizarListaEstoque(filtrados);
}

function abrirModalNovoMaterial() {
    const nome = prompt("Nome do material (ex: Zíper 30cm, Linha de Costura):");
    if (!nome) return;

    const unidade = prompt("Unidade de medida (ex: metros, cm, rolos, unidades):", "metros");
    const quantidade = parseFloat(prompt("Quantidade inicial:", "0")) || 0;
    const preco = parseFloat(prompt("Preço de custo unitário (R$):", "0")) || 0;
    const descricao = prompt("Descrição (opcional):", "");

    salvarNovoMaterial(nome, descricao, quantidade, unidade, preco);
}

async function salvarNovoMaterial(nome, descricao, quantidade, unidade, preco_unitario) {
    if (!currentUser) return showToast("Você precisa estar logado", "error");

    const { error } = await supabaseClient
        .from('materiais')
        .insert([{
            user_id: currentUser.id,
            nome: nome.trim(),
            descricao: descricao || null,
            quantidade: quantidade,
            unidade: unidade,
            preco_unitario: preco_unitario
        }]);

    if (error) {
        console.error(error);
        showToast("Erro ao salvar material", "error");
    } else {
        showToast("Material cadastrado com sucesso!", "success");
        carregarMateriais();
    }
}

async function ajustarEstoque(id) {
    const material = materiais.find(m => m.id === id);
    if (!material) return;

    const novaQtd = prompt(`Quantidade atual: ${material.quantidade} ${material.unidade}\n\nNova quantidade:`, material.quantidade);
    
    if (novaQtd === null) return;
    const quantidade = parseFloat(novaQtd);
    if (isNaN(quantidade)) return alert("Digite um número válido!");

    const { error } = await supabaseClient
        .from('materiais')
        .update({ quantidade: quantidade })
        .eq('id', id);

    if (error) showToast("Erro ao atualizar", "error");
    else {
        showToast("Estoque atualizado!");
        carregarMateriais();
    }
}

async function ajustarPreco(id) {
    const material = materiais.find(m => m.id === id);
    if (!material) return;

    const novoPreco = prompt(`Preço atual: R$ ${parseFloat(material.preco_unitario).toFixed(2)}\n\nNovo preço de custo:`, material.preco_unitario);
    
    if (novoPreco === null) return;
    const preco = parseFloat(novoPreco);
    if (isNaN(preco)) return alert("Digite um número válido!");

    const { error } = await supabaseClient
        .from('materiais')
        .update({ preco_unitario: preco })
        .eq('id', id);

    if (error) showToast("Erro ao atualizar", "error");
    else {
        showToast("Preço atualizado!");
        carregarMateriais();
    }
}

async function excluirMaterial(id) {
    if (!confirm("Tem certeza que deseja excluir este material?")) return;

    const { error } = await supabaseClient
        .from('materiais')
        .delete()
        .eq('id', id);

    if (error) showToast("Erro ao excluir", "error");
    else {
        showToast("Material excluído!");
        carregarMateriais();
    }
}

// --- CONFIGURAÇÕES FINANCEIRAS ---

function salvarConfigFinanceira() {
    const valorHora = parseFloat(document.getElementById('cfg-valor-hora').value) || 0;
    const custosFixos = parseFloat(document.getElementById('cfg-custos-fixos').value) || 0;
    const horasMes = parseFloat(document.getElementById('cfg-horas-mes').value) || 160;

    // Cálculo do custo por minuto: (Custos Fixos / (Horas Mes * 60)) + (Valor Hora / 60)
    const custoMinuto = (custosFixos / (horasMes * 60)) + (valorHora / 60);

    configFinanceira = { valorHora, custosFixos, horasMes, custoMinuto };
    localStorage.setItem('configFinanceiraAtelie', JSON.stringify(configFinanceira));

    document.getElementById('cfg-custo-minuto').innerText = formatadorMoeda.format(custoMinuto);
    showToast("Configurações salvas com sucesso!");
    
    // Atualiza calculadora se houver tempo preenchido
    calcularCustoProducao();
}

function carregarConfigFinanceira() {
    const salva = localStorage.getItem('configFinanceiraAtelie');
    if (salva) {
        configFinanceira = JSON.parse(salva);
        document.getElementById('cfg-valor-hora').value = configFinanceira.valorHora;
        document.getElementById('cfg-custos-fixos').value = configFinanceira.custosFixos;
        document.getElementById('cfg-horas-mes').value = configFinanceira.horasMes;
        document.getElementById('cfg-custo-minuto').innerText = formatadorMoeda.format(configFinanceira.custoMinuto || 0);
    }
}

// --- SISTEMA DE AUTENTICAÇÃO ---

async function checkUser() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
        currentUser = user;
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
        carregarConfig();
        carregarHistorico();
        carregarMateriais();
        carregarConfigFinanceira();
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

    const { error } = await supabaseClient.auth.signUp({ email, password });

    if (error) {
        errorEl.innerText = "Erro ao cadastrar: " + error.message;
        errorEl.classList.replace('text-indigo-600', 'text-red-500');
        errorEl.classList.remove('hidden');
    } else {
        errorEl.innerText = "Cadastro realizado! Tente fazer login agora.";
        errorEl.classList.replace('text-red-500', 'text-emerald-600');
        alert("Cadastro realizado com sucesso!");
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
            status: 'Aguardando Aprovação',
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

async function excluirOrcamento(id) {
    if (!confirm("Tem certeza que deseja excluir este orçamento permanentemente?")) return;

    const { error } = await supabaseClient
        .from('orcamentos')
        .delete()
        .eq('id', id);

    if (error) alert("Erro ao excluir: " + error.message);
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
    if (!container) return;

    if (data.length === 0) {
        container.innerHTML = '<p class="text-center text-slate-400 py-8">Nenhum orçamento encontrado.</p>';
        return;
    }

    container.innerHTML = data.map(orc => {
        const statusColors = {
            'Aguardando Aprovação': 'bg-slate-100 text-slate-500 border-slate-200',
            'Pendente': 'bg-amber-100 text-amber-700 border-amber-200',
            'Em Produção': 'bg-blue-100 text-blue-700 border-blue-200',
            'Pronto': 'bg-emerald-100 text-emerald-700 border-emerald-200',
            'Entregue': 'bg-indigo-100 text-indigo-700 border-indigo-200'
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
                    <div class="flex items-center gap-2">
                        <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase border ${statusColors[orc.status] || statusColors['Pendente']}">
                            ${orc.status || 'Pendente'}
                        </span>
                        <button onclick="excluirOrcamento(${orc.id})" class="p-2 text-slate-300 hover:text-red-500 transition-all">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
                
                <div class="flex justify-between items-center pt-2 border-t border-slate-50">
                    <div class="text-indigo-600 font-black text-xl">
                        ${formatadorMoeda.format(orc.total)}
                    </div>
                    <div class="flex gap-1">
                        <select onchange="atualizarStatus(${orc.id}, this.value)" class="text-[10px] font-bold bg-slate-50 border border-slate-200 rounded-lg p-1 outline-none">
                            <option value="" disabled selected>Alterar Status</option>
                            <option value="Aguardando Aprovação">Aguardando Aprovação</option>
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
    lucide.createIcons();
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
        'Aguardando Aprovação': 0,
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

        if (dataOrc.getMonth() === mesAtual && dataOrc.getFullYear() === anoAtual && status !== 'Aguardando Aprovação') {
            totalMes += valor;
        }

        if (status === 'Pronto' || status === 'Em Produção' || status === 'Pendente') {
            totalReceber += valor;
        }
    });

    const dashTotal = document.getElementById('dash-total');
    const dashMes = document.getElementById('dash-mes');
    const dashReceber = document.getElementById('dash-receber');

    if (dashTotal) dashTotal.innerText = formatadorMoeda.format(totalGeral);
    if (dashMes) dashMes.innerText = formatadorMoeda.format(totalMes);
    if (dashReceber) dashReceber.innerText = formatadorMoeda.format(totalReceber);

    renderizarGrafico(statusCounts);
}

function renderizarGrafico(counts) {
    const canvas = document.getElementById('statusChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
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
                    '#94a3b8', // Aguardando Aprovação (Slate)
                    '#f59e0b', // Pendente (Amber)
                    '#3b82f6', // Em Produção (Blue)
                    '#10b981', // Pronto (Emerald)
                    '#4f46e5'  // Entregue (Indigo)
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

// --- CALCULADORA DE PRODUÇÃO ---

function converterMedida() {
    const largura = parseFloat(document.getElementById('calc-largura').value) || 0;
    const comprimento = parseFloat(document.getElementById('calc-comprimento').value) || 0;
    const area = (largura * comprimento) / 10000; // cm2 para m2
    const resEl = document.getElementById('calc-area-res');
    if (resEl) resEl.innerText = area.toFixed(4) + " m²";
    return area;
}

function adicionarMaterial() {
    const nome = document.getElementById('mat-nome').value;
    const unidade = document.getElementById('mat-unidade').value;
    const qtd = parseFloat(document.getElementById('mat-qtd').value) || 0;
    const preco = parseFloat(document.getElementById('mat-preco').value) || 0;

    if (!nome || qtd <= 0 || preco <= 0) return alert("Preencha todos os campos do material.");

    materiaisProducao.push({
        id: Date.now(),
        nome,
        unidade,
        qtd,
        preco,
        custoTotal: qtd * preco
    });

    renderizarMateriais();
    calcularCustoProducao();
    
    // Limpa campos
    document.getElementById('mat-nome').value = '';
    document.getElementById('mat-qtd').value = '';
    document.getElementById('mat-preco').value = '';
}

function renderizarMateriais() {
    const container = document.getElementById('lista-materiais');
    if (!container) return;

    container.innerHTML = materiaisProducao.map(m => `
        <div class="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div>
                <p class="text-xs font-bold text-slate-800">${m.nome}</p>
                <p class="text-[10px] text-slate-400 uppercase font-bold">${m.qtd} ${m.unidade} x ${formatadorMoeda.format(m.preco)}</p>
            </div>
            <div class="flex items-center gap-3">
                <span class="text-xs font-black text-indigo-600">${formatadorMoeda.format(m.custoTotal)}</span>
                <button onclick="removerMaterial(${m.id})" class="text-slate-300 hover:text-red-500">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

function removerMaterial(id) {
    materiaisProducao = materiaisProducao.filter(m => m.id !== id);
    renderizarMateriais();
    calcularCustoProducao();
}

function calcularCustoProducao() {
    const custoMateriais = materiaisProducao.reduce((acc, m) => acc + m.custoTotal, 0);
    const tempo = parseFloat(document.getElementById('tempo-producao').value) || 0;
    
    // Custo Operacional = Tempo (min) * Custo por Minuto (das Configurações)
    const custoOperacional = tempo * (configFinanceira.custoMinuto || 0);
    
    const custoTotal = custoMateriais + custoOperacional;
    const margem = parseFloat(document.getElementById('margem-lucro').value) || 0;
    const precoSugerido = custoTotal * (1 + (margem / 100));

    const custoMatEl = document.getElementById('custo-total-mat');
    const custoOpEl = document.getElementById('custo-operacional-res');
    const precoEl = document.getElementById('preco-sugerido');

    if (custoMatEl) custoMatEl.innerText = formatadorMoeda.format(custoMateriais);
    if (custoOpEl) custoOpEl.innerText = formatadorMoeda.format(custoOperacional);
    if (precoEl) precoEl.innerText = formatadorMoeda.format(precoSugerido);
}

function calcularPrecoVenda() {
    calcularCustoProducao();
}

function limparCalculadora() {
    if (!confirm("Deseja limpar todos os materiais da calculadora?")) return;
    materiaisProducao = [];
    document.getElementById('calc-largura').value = '';
    document.getElementById('calc-comprimento').value = '';
    const resEl = document.getElementById('calc-area-res');
    if (resEl) resEl.innerText = "0,0000 m²";
    renderizarMateriais();
    calcularCustoProducao();
}

// --- LÓGICA DE NAVEGAÇÃO ---

function switchTab(tab) {
    const views = ['view-gerador', 'view-producao', 'view-estoque', 'view-historico', 'view-config'];
    const tabs = ['tab-gerador', 'tab-producao', 'tab-estoque', 'tab-historico', 'tab-config'];
    
    views.forEach(v => {
        const el = document.getElementById(v);
        if (el) el.classList.add('hidden');
    });

    tabs.forEach(t => {
        const el = document.getElementById(t);
        if (el) {
            el.classList.remove('bg-white', 'text-indigo-600', 'shadow-sm');
            el.classList.add('text-slate-500', 'hover:bg-white/50');
        }
    });

    const targetView = document.getElementById(`view-${tab}`);
    if (targetView) targetView.classList.remove('hidden');

    const activeTab = document.getElementById(`tab-${tab}`);
    if (activeTab) {
        activeTab.classList.remove('text-slate-500', 'hover:bg-white/50');
        activeTab.classList.add('bg-white', 'text-indigo-600', 'shadow-sm');
    }

    if (tab === 'historico') carregarHistorico();
    if (tab === 'estoque') carregarMateriais();
    if (tab === 'config') carregarConfigFinanceira();
}

function toggleConfig() {
    const content = document.getElementById('config-content');
    const icon = document.getElementById('config-icon');
    if (content) content.classList.toggle('config-hidden');
    if (icon) icon.style.transform = content.classList.contains('config-hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
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
    if (!container) return;

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
    const descontoInput = document.getElementById('desconto');
    const desconto = descontoInput ? (parseFloat(descontoInput.value) || 0) : 0;
    const total = Math.max(0, subtotal - desconto);

    const subEl = document.getElementById('res-subtotal');
    const descEl = document.getElementById('res-desconto');
    const totalEl = document.getElementById('res-total');

    if (subEl) subEl.innerText = formatadorMoeda.format(subtotal);
    if (descEl) descEl.innerText = `- ${formatadorMoeda.format(desconto)}`;
    if (totalEl) totalEl.innerText = formatadorMoeda.format(total);

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
    const atelieNome = document.getElementById('atelie-nome').value;
    const atelieFone = document.getElementById('atelie-fone').value;
    const atelieExtra = document.getElementById('atelie-extra').value;

    document.getElementById('pdf-header-nome').innerText = atelieNome;
    document.getElementById('pdf-header-contato').innerText = `WhatsApp: ${atelieFone} | ${atelieExtra}`;
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
    const foneInput = document.getElementById('whatsapp');
    const fone = foneInput ? foneInput.value.replace(/\D/g, '') : '';
    
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
        const nomeEl = document.getElementById('atelie-nome');
        const foneEl = document.getElementById('atelie-fone');
        const extraEl = document.getElementById('atelie-extra');
        if (nomeEl) nomeEl.value = config.nome;
        if (foneEl) foneEl.value = config.fone;
        if (extraEl) extraEl.value = config.extra;
    }
}

function showToast(msg, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`;
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Inicia verificação de usuário
checkUser();
