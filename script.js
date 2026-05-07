// Configuração do Supabase
const SUPABASE_URL = 'https://ifmqqaxherxadjsxljpv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_1acNQnNCChNAow0De54rbQ_R0GAafgK';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Inicialização dos ícones Lucide
lucide.createIcons();

// ==================== ESTADO GLOBAL ====================
let itensOrcamento = [];
let pecasCatalogo = [];
let composicaoAtual = [];
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
        return;
    }

    materiais = data || [];
    renderizarListaEstoque();
    atualizarSelectMateriais();
}

function atualizarSelectMateriais() {
    const select = document.getElementById('peca-material-select');
    if (!select) return;

    select.innerHTML = '<option value="" disabled selected>Selecione um material...</option>' + 
        materiais.map(m => `<option value="${m.id}">${m.nome} (${m.unidade}) - R$ ${parseFloat(m.preco_unitario).toFixed(2)}</option>`).join('');
}

function renderizarListaEstoque(listaFiltrada = null) {
    const container = document.getElementById('lista-estoque');
    if (!container) return;

    const lista = listaFiltrada || materiais;

    if (lista.length === 0) {
        container.innerHTML = `
            <div class="bg-slate-50 border border-dashed border-slate-200 rounded-3xl py-16 text-center col-span-full">
                <i data-lucide="package" class="w-16 h-16 mx-auto mb-4 text-slate-300"></i>
                <p class="text-slate-500 font-bold">Nenhum material cadastrado ainda</p>
                <p class="text-slate-400 text-sm mt-1">Clique em "Novo Material" para começar</p>
            </div>`;
        lucide.createIcons();
        return;
    }

    container.innerHTML = lista.map(item => {
        const preco = parseFloat(item.preco_unitario) || 0;
        const qtd = parseFloat(item.quantidade) || 0;
        return `
        <div class="bg-white border border-slate-100 rounded-3xl p-6 hover:shadow-md transition-all">
            <div class="flex justify-between">
                <div class="flex-1">
                    <h4 class="font-bold text-lg text-slate-800">${item.nome}</h4>
                    ${item.descricao ? `<p class="text-sm text-slate-500 mt-1 line-clamp-2">${item.descricao}</p>` : ''}
                </div>
                <div class="text-right">
                    <span class="inline-block px-4 py-2 bg-emerald-100 text-emerald-700 font-bold rounded-2xl text-sm">
                        ${parseFloat(qtd.toFixed(4))} ${item.unidade}
                    </span>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4 mt-6">
                <div>
                    <p class="text-xs text-slate-500">Preço unitário</p>
                    <p class="text-2xl font-bold text-slate-700">R$ ${preco.toFixed(2)}</p>
                </div>
                <div class="text-right">
                    <p class="text-xs text-slate-500">Valor total em estoque</p>
                    <p class="text-2xl font-bold text-emerald-600">R$ ${(qtd * preco).toFixed(2)}</p>
                </div>
            </div>
            <div class="flex gap-3 mt-6">
                <button onclick="abrirModalEditarMaterial(${item.id})" class="flex-1 py-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-2xl transition-all text-xs flex items-center justify-center gap-1">
                    <i data-lucide="pencil" class="w-4 h-4"></i> Editar
                </button>
                <button onclick="excluirMaterial(${item.id})" class="px-5 py-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl transition-all">
                    <i data-lucide="trash-2" class="w-5 h-5"></i>
                </button>
            </div>
        </div>`;
    }).join('');
    lucide.createIcons();
}

function filtrarEstoque() {
    const termo = document.getElementById('filtro-estoque').value.toLowerCase().trim();
    renderizarListaEstoque(termo ? materiais.filter(m => m.nome.toLowerCase().includes(termo)) : null);
}

// ---- Modal de Material ----

function abrirModalNovoMaterial() {
    document.getElementById('modal-material-titulo').innerText = 'Novo Material';
    document.getElementById('material-edit-id').value = '';
    document.getElementById('material-nome').value = '';
    document.getElementById('material-unidade').value = 'unidades';
    document.getElementById('material-quantidade').value = '';
    document.getElementById('material-preco-total').value = '';
    document.getElementById('material-preco-unitario').value = '';
    document.getElementById('material-descricao').value = '';
    document.getElementById('material-calculo-resultado').classList.add('hidden');
    document.getElementById('modal-material').classList.remove('hidden');
}

function abrirModalEditarMaterial(id) {
    const m = materiais.find(m => m.id === id);
    if (!m) return;

    document.getElementById('modal-material-titulo').innerText = 'Editar Material';
    document.getElementById('material-edit-id').value = m.id;
    document.getElementById('material-nome').value = m.nome;
    document.getElementById('material-unidade').value = m.unidade;
    document.getElementById('material-quantidade').value = m.quantidade;
    document.getElementById('material-preco-total').value = '';
    document.getElementById('material-preco-unitario').value = parseFloat(m.preco_unitario).toFixed(2);
    document.getElementById('material-descricao').value = m.descricao || '';
    document.getElementById('material-calculo-resultado').classList.add('hidden');
    document.getElementById('modal-material').classList.remove('hidden');
}

function fecharModalMaterial() {
    document.getElementById('modal-material').classList.add('hidden');
}

function calcularPrecoUnitarioMaterial() {
    const precoTotal = parseFloat(document.getElementById('material-preco-total').value) || 0;
    const quantidade = parseFloat(document.getElementById('material-quantidade').value) || 0;

    if (precoTotal > 0 && quantidade > 0) {
        const unitario = precoTotal / quantidade;
        document.getElementById('material-preco-unitario').value = unitario.toFixed(4);
        document.getElementById('material-calculo-resultado').classList.remove('hidden');
        document.getElementById('material-calculo-texto').innerText =
            `R$ ${precoTotal.toFixed(2)} ÷ ${quantidade} = R$ ${unitario.toFixed(4)} por unidade`;
    } else {
        document.getElementById('material-calculo-resultado').classList.add('hidden');
    }
}

function limparPrecoTotal() {
    // Se o usuário digitar o preço unitário diretamente, limpa o campo de preço total
    document.getElementById('material-preco-total').value = '';
    document.getElementById('material-calculo-resultado').classList.add('hidden');
}

async function salvarMaterialModal() {
    const editId = document.getElementById('material-edit-id').value;
    const nome = document.getElementById('material-nome').value.trim();
    const unidade = document.getElementById('material-unidade').value;
    const quantidade = parseFloat(document.getElementById('material-quantidade').value) || 0;
    const preco_unitario = parseFloat(document.getElementById('material-preco-unitario').value) || 0;
    const descricao = document.getElementById('material-descricao').value.trim();

    if (!nome) return showToast("Informe o nome do material.", "error");
    if (preco_unitario <= 0) return showToast("Informe o preço unitário.", "error");

    if (editId) {
        // Editar existente
        const { error } = await supabaseClient
            .from('materiais')
            .update({ nome, unidade, quantidade, preco_unitario, descricao })
            .eq('id', editId);
        if (error) showToast("Erro ao atualizar material.", "error");
        else { showToast("Material atualizado!"); fecharModalMaterial(); carregarMateriais(); }
    } else {
        // Criar novo
        const { error } = await supabaseClient
            .from('materiais')
            .insert([{ user_id: currentUser.id, nome, descricao, quantidade, unidade, preco_unitario }]);
        if (error) showToast("Erro ao salvar material.", "error");
        else { showToast("Material cadastrado!"); fecharModalMaterial(); carregarMateriais(); }
    }
}

async function excluirMaterial(id) {
    if (!confirm("Tem certeza que deseja excluir este material?")) return;
    const { error } = await supabaseClient.from('materiais').delete().eq('id', id);
    if (error) showToast("Erro ao excluir", "error"); else { showToast("Material excluído."); carregarMateriais(); }
}

// ====================== CATÁLOGO DE PEÇAS ======================

async function carregarCatalogo() {
    if (!currentUser) return;
    const { data, error } = await supabaseClient.from('pecas').select('*').eq('user_id', currentUser.id).order('nome', { ascending: true });
    if (error) console.error(error);
    else { pecasCatalogo = data || []; renderizarCatalogo(); }
}

function renderizarCatalogo() {
    const container = document.getElementById('lista-catalogo');
    if (!container) return;
    if (pecasCatalogo.length === 0) {
        container.innerHTML = `<div class="bg-slate-50 border border-dashed border-slate-200 rounded-3xl py-16 text-center col-span-full"><p class="text-slate-500 font-bold">Nenhuma peça no catálogo</p></div>`;
        return;
    }
    container.innerHTML = pecasCatalogo.map(p => `
        <div class="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
            <h4 class="font-black text-xl text-slate-800">${p.nome}</h4>
            <div class="flex justify-between mt-4 text-sm font-bold">
                <span class="text-slate-400 uppercase">Tempo: ${p.tempo_producao} min</span>
                <span class="text-indigo-600">Venda: ${formatadorMoeda.format(p.preco_venda)}</span>
            </div>
            <div class="flex gap-2 mt-6">
                <button onclick="produzirPeca(${p.id})" class="flex-[2] py-3 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100">PRODUZIR</button>
                <button onclick="excluirPeca(${p.id})" class="flex-1 py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-all">Excluir</button>
            </div>
        </div>
    `).join('');
}

async function produzirPeca(id) {
    const peca = pecasCatalogo.find(p => p.id === id);
    const qtdProduzir = parseInt(prompt(`Quantas unidades de "${peca.nome}" você produziu?`, "1")) || 0;
    if (qtdProduzir <= 0) return;

    const { data: composicao, error } = await supabaseClient
        .from('composicao_peca')
        .select('material_id, quantidade_usada')
        .eq('peca_id', id);

    if (error || !composicao || composicao.length === 0) {
        return alert("Esta peça não tem materiais cadastrados na composição.");
    }

    for (const item of composicao) {
        const material = materiais.find(m => m.id === item.material_id);
        const totalNecessario = item.quantidade_usada * qtdProduzir;
        if (!material || material.quantidade < totalNecessario) {
            return alert(`Estoque insuficiente de "${material ? material.nome : 'Material desconhecido'}". Necessário: ${totalNecessario.toFixed(4)}, Disponível: ${material ? material.quantidade.toFixed(4) : 0}`);
        }
    }

    if (!confirm(`Confirmar a produção de ${qtdProduzir} unidades? Isso descontará os materiais do estoque.`)) return;

    try {
        for (const item of composicao) {
            const material = materiais.find(m => m.id === item.material_id);
            const novaQtd = material.quantidade - (item.quantidade_usada * qtdProduzir);
            const { error: updateError } = await supabaseClient
                .from('materiais')
                .update({ quantidade: novaQtd })
                .eq('id', item.material_id);
            if (updateError) throw updateError;
        }
        showToast(`Produção de ${qtdProduzir} peças registrada! Estoque atualizado.`);
        carregarMateriais();
    } catch (err) {
        console.error(err);
        showToast("Erro ao atualizar estoque durante a produção", "error");
    }
}

function abrirModalNovaPeca() {
    composicaoAtual = [];
    document.getElementById('peca-nome').value = '';
    document.getElementById('peca-tempo').value = '';
    document.getElementById('peca-margem').value = '100';
    renderizarComposicao();
    calcularPrecoPeca();
    document.getElementById('modal-peca').classList.remove('hidden');
}

function fecharModalPeca() { document.getElementById('modal-peca').classList.add('hidden'); }

function adicionarMaterialAPeca() {
    const select = document.getElementById('peca-material-select');
    const materialId = select.value;
    const qtd = parseFloat(document.getElementById('peca-material-qtd').value) || 0;
    if (!materialId || qtd <= 0) return alert("Selecione o material e a quantidade.");

    const material = materiais.find(m => m.id == materialId);
    composicaoAtual.push({ material_id: material.id, nome: material.nome, unidade: material.unidade, preco: material.preco_unitario, qtd });
    
    renderizarComposicao();
    calcularPrecoPeca();
    document.getElementById('peca-material-qtd').value = '';
}

function renderizarComposicao() {
    const container = document.getElementById('peca-composicao-lista');
    container.innerHTML = composicaoAtual.length === 0
        ? `<p class="text-xs text-slate-400 text-center py-4">Nenhum material adicionado ainda</p>`
        : composicaoAtual.map((item, idx) => `
        <div class="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div class="text-xs font-bold text-slate-800">${item.nome} (${item.qtd} ${item.unidade})</div>
            <div class="flex items-center gap-3">
                <span class="text-xs font-black text-indigo-600">${formatadorMoeda.format(item.qtd * item.preco)}</span>
                <button onclick="removerDaComposicao(${idx})" class="text-red-400"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

function removerDaComposicao(idx) {
    composicaoAtual.splice(idx, 1);
    renderizarComposicao();
    calcularPrecoPeca();
}

function calcularPrecoPeca() {
    const custoMateriais = composicaoAtual.reduce((acc, item) => acc + (item.qtd * item.preco), 0);
    const tempo = parseFloat(document.getElementById('peca-tempo').value) || 0;
    const custoMaoDeObra = tempo * (configFinanceira.custoMinuto || 0);
    const custoTotal = custoMateriais + custoMaoDeObra;
    const margem = parseFloat(document.getElementById('peca-margem').value) || 0;
    const precoVenda = custoTotal * (1 + (margem / 100));

    document.getElementById('peca-res-materiais').innerText = formatadorMoeda.format(custoMateriais);
    document.getElementById('peca-res-maodeobra').innerText = formatadorMoeda.format(custoMaoDeObra);
    document.getElementById('peca-res-venda').innerText = formatadorMoeda.format(precoVenda);
    return { custoMateriais, custoMaoDeObra, precoVenda };
}

async function salvarPecaCompleta() {
    const nome = document.getElementById('peca-nome').value;
    const tempo = parseFloat(document.getElementById('peca-tempo').value) || 0;
    const { precoVenda, custoMaoDeObra } = calcularPrecoPeca();

    if (!nome || composicaoAtual.length === 0) return alert("Preencha o nome e adicione materiais.");

    const { data: peca, error: pecaError } = await supabaseClient.from('pecas').insert([{
        user_id: currentUser.id, nome, tempo_producao: tempo, mao_de_obra: custoMaoDeObra, preco_venda: precoVenda
    }]).select().single();

    if (pecaError) {
        console.error(pecaError);
        return showToast("Erro ao salvar peça", "error");
    }

    const composicao = composicaoAtual.map(c => ({ peca_id: peca.id, material_id: c.material_id, quantidade_usada: c.qtd }));
    const { error: compError } = await supabaseClient.from('composicao_peca').insert(composicao);

    if (compError) {
        console.error(compError);
        showToast("Erro ao salvar composição", "error");
    } else { 
        showToast("Peça salva no catálogo!"); 
        fecharModalPeca(); 
        carregarCatalogo(); 
    }
}

async function excluirPeca(id) {
    if (!confirm("Excluir peça do catálogo?")) return;
    await supabaseClient.from('composicao_peca').delete().eq('peca_id', id);
    const { error } = await supabaseClient.from('pecas').delete().eq('id', id);
    if (error) showToast("Erro ao excluir", "error"); else carregarCatalogo();
}

// ====================== MINI CALCULADORA DE ÁREA ======================

function abrirCalculadoraArea() {
    document.getElementById('mini-largura').value = '';
    document.getElementById('mini-altura').value = '';
    document.getElementById('mini-resultado').innerText = '0,0000 m²';
    document.getElementById('modal-calc-area').classList.remove('hidden');
    
    const calc = () => {
        const l = parseFloat(document.getElementById('mini-largura').value) || 0;
        const a = parseFloat(document.getElementById('mini-altura').value) || 0;
        document.getElementById('mini-resultado').innerText = ((l * a) / 10000).toFixed(4) + ' m²';
    };
    document.getElementById('mini-largura').oninput = calc;
    document.getElementById('mini-altura').oninput = calc;
}

function fecharCalculadoraArea() { document.getElementById('modal-calc-area').classList.add('hidden'); }

function aplicarResultadoArea() {
    const l = parseFloat(document.getElementById('mini-largura').value) || 0;
    const a = parseFloat(document.getElementById('mini-altura').value) || 0;
    document.getElementById('peca-material-qtd').value = ((l * a) / 10000).toFixed(4);
    fecharCalculadoraArea();
}

// ====================== CONFIGURAÇÕES FINANCEIRAS ======================

function calcularCustoMinuto() {
    const valorHora = parseFloat(document.getElementById('cfg-valor-hora').value) || 0;
    const custosFixos = parseFloat(document.getElementById('cfg-custos-fixos').value) || 0;
    const horasMes = parseFloat(document.getElementById('cfg-horas-mes').value) || 160;
    const custoMinuto = (custosFixos / (horasMes * 60)) + (valorHora / 60);
    document.getElementById('cfg-custo-minuto').innerText = formatadorMoeda.format(custoMinuto);
}

function salvarConfigFinanceira() {
    const valorHora = parseFloat(document.getElementById('cfg-valor-hora').value) || 0;
    const custosFixos = parseFloat(document.getElementById('cfg-custos-fixos').value) || 0;
    const horasMes = parseFloat(document.getElementById('cfg-horas-mes').value) || 160;
    const custoMinuto = (custosFixos / (horasMes * 60)) + (valorHora / 60);

    configFinanceira = { valorHora, custosFixos, horasMes, custoMinuto };
    localStorage.setItem('configFinanceiraAtelie', JSON.stringify(configFinanceira));
    document.getElementById('cfg-custo-minuto').innerText = formatadorMoeda.format(custoMinuto);
    showToast("Configurações salvas!");
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

// ====================== SISTEMA BASE ======================

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
        document.getElementById('auth-container').classList.remove('hidden');
        document.getElementById('app-container').classList.add('hidden');
    }
}

async function handleLogin() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
        document.getElementById('auth-error').innerText = error.message;
        document.getElementById('auth-error').classList.remove('hidden');
    } else checkUser();
}

async function handleSignUp() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const { error } = await supabaseClient.auth.signUp({ email, password });
    if (error) alert(error.message); else alert("Cadastro realizado! Tente logar.");
}

async function handleLogout() { await supabaseClient.auth.signOut(); location.reload(); }

function switchTab(tab) {
    const views = ['view-gerador', 'view-catalogo', 'view-estoque', 'view-historico', 'view-config'];
    const tabs = ['tab-gerador', 'tab-catalogo', 'tab-estoque', 'tab-historico', 'tab-config'];
    views.forEach(v => document.getElementById(v).classList.add('hidden'));
    tabs.forEach(t => {
        const el = document.getElementById(t);
        el.classList.remove('bg-white', 'text-indigo-600', 'shadow-sm');
        el.classList.add('text-slate-500', 'hover:bg-white/50');
    });
    document.getElementById(`view-${tab}`).classList.remove('hidden');
    const active = document.getElementById(`tab-${tab}`);
    active.classList.remove('text-slate-500', 'hover:bg-white/50');
    active.classList.add('bg-white', 'text-indigo-600', 'shadow-sm');
    
    if (tab === 'historico') carregarHistorico();
    if (tab === 'estoque') carregarMateriais();
    if (tab === 'catalogo') carregarCatalogo();
}

// --- ORÇAMENTO ---

function adicionarPeca() {
    const select = document.getElementById('servico');
    const option = select.options[select.selectedIndex];
    if (!option.value) return alert("Selecione um serviço.");
    const precoBase = parseFloat(option.dataset.preco);
    const isUrgente = document.getElementById('urgencia').checked;
    let precoFinal = Math.ceil(precoBase * complexidadeAtual * (isUrgente ? 1.3 : 1));
    itensOrcamento.push({ id: Date.now(), nome: option.text.split(' - ')[0], complexidadeNome, precoUnitario: precoFinal });
    renderizarLista();
    calcularTotal();
}

function renderizarLista() {
    const container = document.getElementById('lista-pecas');
    if (itensOrcamento.length === 0) {
        container.innerHTML = '';
        return;
    }
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
        </div>`).join('');
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

async function gerarPDF() {
    if (itensOrcamento.length === 0) return alert("Adicione itens ao orçamento.");
    const totais = calcularTotal();
    const observacoes = document.getElementById('observacoes').value.trim();
    const dados = {
        cliente: document.getElementById('cliente').value || "Consumidor",
        whatsapp: document.getElementById('whatsapp').value || "-",
        itens: itensOrcamento,
        subtotal: totais.subtotal,
        desconto: totais.desconto,
        total: totais.total,
        observacoes
    };
    
    await supabaseClient.from('orcamentos').insert([{
        ...dados,
        status: 'Aguardando Aprovação',
        user_id: currentUser.id
    }]);
    
    document.getElementById('pdf-header-nome').innerText = document.getElementById('atelie-nome').value;
    document.getElementById('pdf-header-contato').innerText = `WhatsApp: ${document.getElementById('atelie-fone').value} | ${document.getElementById('atelie-extra').value}`;
    document.getElementById('pdf-cliente-nome').innerText = dados.cliente;
    document.getElementById('pdf-cliente-fone').innerText = dados.whatsapp;
    document.getElementById('pdf-data').innerText = new Date().toLocaleDateString('pt-BR');
    document.getElementById('pdf-numero').innerText = '#' + Date.now().toString().slice(-6);
    document.getElementById('pdf-tabela-corpo').innerHTML = dados.itens.map(i => `
        <tr class="border-b border-slate-100">
            <td class="py-3 px-2">1</td>
            <td class="py-3 px-2">${i.nome}</td>
            <td class="py-3 px-2">${i.complexidadeNome}</td>
            <td class="py-3 px-2 text-right">${formatadorMoeda.format(i.precoUnitario)}</td>
        </tr>`).join('');
    document.getElementById('pdf-subtotal').innerText = formatadorMoeda.format(dados.subtotal);
    document.getElementById('pdf-desconto').innerText = `- ${formatadorMoeda.format(dados.desconto)}`;
    document.getElementById('pdf-total').innerText = formatadorMoeda.format(dados.total);

    // Observações no PDF
    const obsBloco = document.getElementById('pdf-obs-bloco');
    if (observacoes) {
        document.getElementById('pdf-obs-texto').innerText = observacoes;
        obsBloco.classList.remove('hidden');
    } else {
        obsBloco.classList.add('hidden');
    }

    document.getElementById('modal-pdf').classList.remove('hidden');
}

function enviarWhatsApp() {
    const totais = calcularTotal();
    const cliente = document.getElementById('cliente').value || "Cliente";
    const fone = document.getElementById('whatsapp').value.replace(/\D/g, '');
    const obs = document.getElementById('observacoes').value.trim();
    let msg = `*ORÇAMENTO - ${document.getElementById('atelie-nome').value}*\nOlá, ${cliente}!\n\n`;
    itensOrcamento.forEach((i, idx) => msg += `${idx+1}. ${i.nome} - *${formatadorMoeda.format(i.precoUnitario)}*\n`);
    msg += `\n*TOTAL: ${formatadorMoeda.format(totais.total)}*`;
    if (obs) msg += `\n\n_Obs: ${obs}_`;
    window.open(`https://api.whatsapp.com/send?phone=55${fone}&text=${encodeURIComponent(msg)}`, '_blank');
}

// --- DASHBOARD ---

// Mapeamento de cores por status
const STATUS_CONFIG = {
    'Aguardando Aprovação': { bg: 'bg-amber-100',    text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-400'   },
    'Pendente':             { bg: 'bg-orange-100',   text: 'text-orange-700',  border: 'border-orange-200',  dot: 'bg-orange-400'  },
    'Em Produção':          { bg: 'bg-blue-100',     text: 'text-blue-700',    border: 'border-blue-200',    dot: 'bg-blue-500'    },
    'Pronto':               { bg: 'bg-emerald-100',  text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    'Entregue':             { bg: 'bg-slate-100',    text: 'text-slate-600',   border: 'border-slate-200',   dot: 'bg-slate-400'   },
};

function getStatusClasses(status) {
    return STATUS_CONFIG[status] || { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' };
}

async function carregarHistorico() {
    if (!currentUser) return;
    const { data, error } = await supabaseClient
        .from('orcamentos')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
    if (error) return;
    atualizarDashboard(data);
    renderizarHistorico(data);
}

function renderizarHistorico(data) {
    const container = document.getElementById('lista-historico');
    if (!container) return;

    if (!data || data.length === 0) {
        container.innerHTML = `<div class="col-span-2 text-center py-12 text-slate-400 font-bold">Nenhum orçamento registrado ainda.</div>`;
        return;
    }

    container.innerHTML = data.map(orc => {
        const sc = getStatusClasses(orc.status);
        return `
        <div class="p-5 bg-white border border-slate-100 rounded-3xl shadow-sm space-y-4">
            <div class="flex justify-between items-start">
                <div>
                    <p class="font-black text-slate-800 text-lg">${orc.cliente || 'Consumidor'}</p>
                    <p class="text-[10px] text-slate-400 uppercase font-bold">${new Date(orc.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
                <div class="flex items-center gap-2">
                    <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase border flex items-center gap-1 ${sc.bg} ${sc.text} ${sc.border}">
                        <span class="w-1.5 h-1.5 rounded-full ${sc.dot} inline-block"></span>
                        ${orc.status}
                    </span>
                    <button onclick="excluirOrcamento(${orc.id})" class="p-2 text-slate-300 hover:text-red-500">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
            <div class="flex justify-between items-center pt-2 border-t border-slate-50">
                <div class="text-indigo-600 font-black text-xl">${formatadorMoeda.format(orc.total)}</div>
                <select onchange="atualizarStatus(${orc.id}, this.value)" class="text-[10px] font-bold bg-slate-50 border border-slate-200 rounded-lg p-1 outline-none cursor-pointer hover:border-indigo-400 transition-all">
                    <option value="" disabled selected>Alterar Status</option>
                    <option value="Aguardando Aprovação">Aguardando Aprovação</option>
                    <option value="Pendente">Pendente</option>
                    <option value="Em Produção">Em Produção</option>
                    <option value="Pronto">Pronto</option>
                    <option value="Entregue">Entregue</option>
                </select>
            </div>
        </div>`;
    }).join('');
    lucide.createIcons();
}

async function atualizarStatus(id, novoStatus) {
    const { error } = await supabaseClient
        .from('orcamentos')
        .update({ status: novoStatus })
        .eq('id', id);

    if (error) {
        showToast("Erro ao atualizar status.", "error");
    } else {
        showToast(`Status atualizado para "${novoStatus}"!`);
        carregarHistorico(); // Recarrega para refletir a nova cor
    }
}

async function excluirOrcamento(id) {
    if (!confirm("Excluir este orçamento?")) return;
    const { error } = await supabaseClient.from('orcamentos').delete().eq('id', id);
    if (error) showToast("Erro ao excluir", "error"); else carregarHistorico();
}

function atualizarDashboard(data) {
    if (!data) return;

    // Total geral
    const totalGeral = data.reduce((acc, o) => acc + (parseFloat(o.total) || 0), 0);
    document.getElementById('dash-total').innerText = formatadorMoeda.format(totalGeral);

    // Faturamento do mês atual (status "Entregue" no mês corrente)
    const agora = new Date();
    const mesAtual = agora.getMonth();
    const anoAtual = agora.getFullYear();
    const faturamentoMes = data
        .filter(o => {
            const d = new Date(o.created_at);
            return o.status === 'Entregue' && d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
        })
        .reduce((acc, o) => acc + (parseFloat(o.total) || 0), 0);
    document.getElementById('dash-mes').innerText = formatadorMoeda.format(faturamentoMes);

    // A receber: status Pendente, Aguardando Aprovação ou Em Produção
    const aReceber = data
        .filter(o => ['Pendente', 'Aguardando Aprovação', 'Em Produção'].includes(o.status))
        .reduce((acc, o) => acc + (parseFloat(o.total) || 0), 0);
    document.getElementById('dash-receber').innerText = formatadorMoeda.format(aReceber);

    // Gráfico de status
    const contagem = {};
    data.forEach(o => { contagem[o.status] = (contagem[o.status] || 0) + 1; });
    const labels = Object.keys(contagem);
    const valores = Object.values(contagem);
    const coresGrafico = labels.map(l => {
        const map = {
            'Aguardando Aprovação': '#f59e0b',
            'Pendente':             '#f97316',
            'Em Produção':          '#3b82f6',
            'Pronto':               '#10b981',
            'Entregue':             '#94a3b8',
        };
        return map[l] || '#cbd5e1';
    });

    const ctx = document.getElementById('statusChart');
    if (!ctx) return;

    if (statusChart) statusChart.destroy();

    if (labels.length === 0) {
        ctx.parentElement.innerHTML = `<p class="text-slate-400 text-sm font-bold text-center">Nenhum dado ainda</p>`;
        return;
    }

    statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: valores,
                backgroundColor: coresGrafico,
                borderWidth: 0,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { size: 10, weight: 'bold' },
                        padding: 12,
                        boxWidth: 10,
                        boxHeight: 10,
                    }
                }
            }
        }
    });
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

function showToast(msg, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`;
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

function salvarConfig() {
    const config = {
        nome: document.getElementById('atelie-nome').value,
        fone: document.getElementById('atelie-fone').value,
        extra: document.getElementById('atelie-extra').value
    };
    localStorage.setItem('configAtelieViva', JSON.stringify(config));
    showToast("Dados salvos!");
}

function carregarConfig() {
    const config = JSON.parse(localStorage.getItem('configAtelieViva'));
    if (config) {
        document.getElementById('atelie-nome').value = config.nome;
        document.getElementById('atelie-fone').value = config.fone;
        document.getElementById('atelie-extra').value = config.extra;
    }
}

function fecharModalPDF() { document.getElementById('modal-pdf').classList.add('hidden'); }
function imprimirPDF() { window.print(); }

checkUser();
