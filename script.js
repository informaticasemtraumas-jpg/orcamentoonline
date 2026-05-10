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

// ====================== ESTOQUE ======================
// As funções de estoque ficam em estoque.js e são carregadas sem alterar o HTML.
document.write('<script src="estoque.js"></script>');

// ====================== CATÁLOGO DE PEÇAS ======================

async function carregarCatalogo() {
    if (!currentUser) return;
    const { data, error } = await supabaseClient.from('pecas').select('*').eq('user_id', currentUser.id).order('nome', { ascending: true });
    if (error) console.error(error);
    else { pecasCatalogo = data || []; renderizarCatalogo(); }
}

function renderizarCatalogo() {
    const container = document.getElementById('lista-catalogo');
    const vazio = document.getElementById('catalogo-vazio');
    if (!container) return;
    
    if (pecasCatalogo.length === 0) {
        container.innerHTML = '';
        vazio.classList.remove('hidden');
        return;
    }

    vazio.classList.add('hidden');
    container.innerHTML = pecasCatalogo.map(p => {
        const qtdDisponivel = parseInt(p.quantidade) || 0;
        return `
        <tr class="border-b border-slate-100 hover:bg-slate-50 transition-all">
            <td class="px-6 py-4 text-sm font-black text-slate-800">${p.nome}</td>
            <td class="px-6 py-4 text-center text-sm font-bold text-slate-500">${p.tempo_producao} min</td>
            <td class="px-6 py-4 text-right">
                <span class="inline-block px-3 py-1 ${qtdDisponivel > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'} font-bold rounded-lg text-sm">
                    ${qtdDisponivel} unidades
                </span>
            </td>
            <td class="px-6 py-4 text-right text-sm font-black text-indigo-600">${formatadorMoeda.format(p.preco_venda)}</td>
            <td class="px-6 py-4 text-center">
                <div class="flex gap-2 justify-center">
                    <button onclick="produzirPeca(${p.id})" class="px-3 py-2 bg-emerald-600 text-white text-xs font-black rounded-lg hover:bg-emerald-700 transition-all shadow-sm flex items-center gap-1" title="Registrar produção">
                        <i data-lucide="plus" class="w-3 h-3"></i> PRODUZIR
                    </button>
                    <button onclick="venderPeca(${p.id})" class="px-3 py-2 bg-indigo-600 text-white text-xs font-black rounded-lg hover:bg-indigo-700 transition-all shadow-sm flex items-center gap-1" title="Vender peça pronta">
                        <i data-lucide="dollar-sign" class="w-3 h-3"></i> VENDER
                    </button>
                    <button onclick="ajustarSaldoPeca(${p.id})" class="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-all" title="Ajustar saldo manual">
                        <i data-lucide="edit" class="w-4 h-4"></i>
                    </button>
                    <button onclick="excluirPeca(${p.id})" class="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all" title="Excluir">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
    lucide.createIcons();
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
    if (!materialId || qtd <= 0) return showAlert("Selecione o material e a quantidade.", "error");

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

    if (!nome || composicaoAtual.length === 0) return showAlert("Preencha o nome e adicione materiais.", "error");

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

async function ajustarSaldoPeca(id) {
    const peca = pecasCatalogo.find(p => p.id === id);
    if (!peca) return;

    const saldoAtual = parseInt(peca.quantidade) || 0;
    const novoSaldo = parseInt(prompt(`Ajustar saldo de "${peca.nome}"\n\nSaldo atual: ${saldoAtual} unidades\n\nDigite o novo saldo:`, saldoAtual));
    
    if (novoSaldo === null || isNaN(novoSaldo)) return;
    if (novoSaldo < 0) return showToast("O saldo não pode ser negativo.", "error");

    const { error } = await supabaseClient
        .from('pecas')
        .update({ quantidade: novoSaldo })
        .eq('id', id);

    if (error) {
        showToast("Erro ao atualizar saldo.", "error");
    } else {
        showToast(`Saldo de "${peca.nome}" ajustado para ${novoSaldo} unidades!`);
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
    document.getElementById('calc-origem').value = 'peca';
    
    const calc = () => {
        const l = parseFloat(document.getElementById('mini-largura').value) || 0;
        const a = parseFloat(document.getElementById('mini-altura').value) || 0;
        document.getElementById('mini-resultado').innerText = ((l * a) / 10000).toFixed(4) + ' m²';
    };
    document.getElementById('mini-largura').oninput = calc;
    document.getElementById('mini-altura').oninput = calc;
}

function abrirCalculadoraAreaMaterial() {
    document.getElementById('mini-largura').value = '';
    document.getElementById('mini-altura').value = '';
    document.getElementById('mini-resultado').innerText = '0,0000 m²';
    document.getElementById('modal-calc-area').classList.remove('hidden');
    document.getElementById('calc-origem').value = 'material';
    
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
    const resultado = ((l * a) / 10000).toFixed(4);
    const origem = document.getElementById('calc-origem').value || 'peca';
    
    if (origem === 'material') {
        document.getElementById('material-quantidade').value = resultado;
        calcularPrecoUnitarioMaterial();
    } else {
        document.getElementById('peca-material-qtd').value = resultado;
    }
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
        calcularCustoMinuto();
    }
}

// ====================== NAVEGAÇÃO ======================

function switchTab(tab) {
    const views = ['view-gerador', 'view-catalogo', 'view-estoque', 'view-historico', 'view-config'];
    const tabs = ['tab-gerador', 'tab-catalogo', 'tab-estoque', 'tab-historico', 'tab-config'];
    
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
    if (tab === 'catalogo') carregarCatalogo();
}

// --- ORÇAMENTO ---

function adicionarPeca() {
    const select = document.getElementById('servico');
    const option = select.options[select.selectedIndex];
    if (!option.value) return showAlert("Selecione um serviço.", "error");
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
    if (itensOrcamento.length === 0) return showAlert("Adicione itens ao orçamento.", "error");
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
    
    const { error } = await supabaseClient.from('orcamentos').insert([{
        cliente: dados.cliente,
        whatsapp: dados.whatsapp,
        itens: dados.itens,
        total: dados.total,
        status: 'Aguardando Aprovação',
        user_id: currentUser.id
    }]);

    if (error) {
        console.error("Erro ao salvar orçamento:", error);
        return showToast("Erro ao salvar orçamento no banco de dados.", "error");
    }
    
    document.getElementById('pdf-header-nome').innerText = document.getElementById('atelie-nome').value;
    document.getElementById('pdf-header-contato').innerText = `WhatsApp: ${document.getElementById('atelie-fone').value} | ${document.getElementById('atelie-extra').value}`;
    document.getElementById('pdf-cliente-nome').innerText = dados.cliente;
    document.getElementById('pdf-cliente-fone').innerText = dados.whatsapp;
    document.getElementById('pdf-data').innerText = formatDate();
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
                    <p class="text-[10px] text-slate-400 uppercase font-bold">${formatDate(orc.created_at)}</p>
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
    // 1. Buscar dados do orçamento antes de atualizar
    const { data: orcamento, error: fetchError } = await supabaseClient
        .from('orcamentos')
        .select('*')
        .eq('id', id)
        .single();

    if (fetchError) return showToast("Erro ao buscar orçamento.", "error");

    // 2. Se o novo status for "Entregue", descontar peças do catálogo
    if (novoStatus === 'Entregue' && orcamento.status !== 'Entregue') {
        await baixarEstoquePecasOrcamento(orcamento);
        showToast("Orcamento entregue! Estoque atualizado.");
    }

    // 3. Atualizar o status no banco
    const { error } = await supabaseClient
        .from('orcamentos')
        .update({ status: novoStatus })
        .eq('id', id);

    if (error) {
        showToast("Erro ao atualizar status.", "error");
    } else {
        showToast(`Status atualizado para "${novoStatus}"!`);
        carregarHistorico();
        carregarCatalogo(); // Recarregar catálogo para ver as novas quantidades
    }
}

async function excluirOrcamento(id) {
    if (!confirm("Excluir este orçamento?")) return;
    const { error } = await supabaseClient.from('orcamentos').delete().eq('id', id);
    if (error) showToast("Erro ao excluir", "error"); else carregarHistorico();
}

function atualizarDashboard(data) {
    if (!data) return;

    const agora = new Date();
    const mesAtual = agora.getMonth();
    const anoAtual = agora.getFullYear();

    // 1. Receitas (Orçamentos com status "Entregue" no mês atual)
    const faturamentoMes = data
        .filter(o => {
            const d = new Date(o.created_at);
            return o.status === 'Entregue' && d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
        })
        .reduce((acc, o) => acc + (parseFloat(o.total) || 0), 0);
    
    const dashReceitas = document.getElementById('dash-receitas');
    if (dashReceitas) dashReceitas.innerText = formatadorMoeda.format(faturamentoMes);

    // 2. A Receber (Orçamentos que ainda não foram entregues)
    const aReceber = data
        .filter(o => ['Pendente', 'Aguardando Aprovação', 'Em Produção'].includes(o.status))
        .reduce((acc, o) => acc + (parseFloat(o.total) || 0), 0);
    
    const dashReceber = document.getElementById('dash-receber');
    if (dashReceber) dashReceber.innerText = formatadorMoeda.format(aReceber);

    // 3. Total Geral (Soma de todos os orçamentos entregues na história)
    const totalGeral = data
        .filter(o => o.status === 'Entregue')
        .reduce((acc, o) => acc + (parseFloat(o.total) || 0), 0);
    const dashTotal = document.getElementById('dash-total');
    if (dashTotal) dashTotal.innerText = formatadorMoeda.format(totalGeral);

    // 4. Gráfico de Status
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

    const canvas = document.getElementById('statusChart');
    if (!canvas) return;

    if (statusChart) statusChart.destroy();

    if (labels.length === 0) {
        // Se não houver dados, não tenta renderizar o gráfico
        return;
    }

    statusChart = new Chart(canvas, {
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

let vendaAtual = { peca_id: null, peca_nome: '', preco_unitario: 0 };

function abrirModalVenda(id) {
    const peca = pecasCatalogo.find(p => p.id === id);
    if (!peca) return;
    
    vendaAtual = { peca_id: id, peca_nome: peca.nome, preco_unitario: parseFloat(peca.preco_venda) };
    
    document.getElementById('venda-cliente').value = '';
    document.getElementById('venda-peca-nome').value = peca.nome;
    document.getElementById('venda-quantidade').value = '1';
    document.getElementById('venda-preco-unitario').value = peca.preco_venda.toFixed(2);
    document.getElementById('venda-desconto').value = '0';
    document.getElementById('venda-pagamento').value = 'Pix';
    
    calcularTotalVenda();
    document.getElementById('modal-venda').classList.remove('hidden');
}

function fecharModalVenda() {
    document.getElementById('modal-venda').classList.add('hidden');
}

function calcularTotalVenda() {
    const quantidade = parseFloat(document.getElementById('venda-quantidade').value) || 0;
    const precoUnitario = parseFloat(document.getElementById('venda-preco-unitario').value) || 0;
    const desconto = parseFloat(document.getElementById('venda-desconto').value) || 0;
    
    const subtotal = quantidade * precoUnitario;
    const total = Math.max(0, subtotal - desconto);
    
    document.getElementById('venda-subtotal').innerText = formatadorMoeda.format(subtotal);
    document.getElementById('venda-desconto-exibir').innerText = `- ${formatadorMoeda.format(desconto)}`;
    document.getElementById('venda-total').innerText = formatadorMoeda.format(total);
}

async function confirmarVenda() {
    const cliente = document.getElementById('venda-cliente').value.trim() || 'Cliente Sem Nome';
    const quantidade = parseInt(document.getElementById('venda-quantidade').value) || 0;
    const desconto = parseFloat(document.getElementById('venda-desconto').value) || 0;
    const pagamento = document.getElementById('venda-pagamento').value;
    const precoUnitario = parseFloat(document.getElementById('venda-preco-unitario').value) || 0;
    
    if (quantidade <= 0) return showToast("Quantidade inválida", "error");
    
    const peca = pecasCatalogo.find(p => p.id === vendaAtual.peca_id);
    const qtdDisponivel = parseInt(peca.quantidade) || 0;
    
    if (qtdDisponivel < quantidade) {
        return showToast(`Estoque insuficiente. Disponível: ${qtdDisponivel}`, "error");
    }
    
    const subtotal = quantidade * precoUnitario;
    const valorTotal = Math.max(0, subtotal - desconto);
    
    try {
        // 1. Descontar do estoque de peças prontas
        const novaQtd = qtdDisponivel - quantidade;
        const { error: updateError } = await supabaseClient
            .from('pecas')
            .update({ quantidade: novaQtd })
            .eq('id', vendaAtual.peca_id);
        
        if (updateError) throw updateError;
        
        showToast(`Venda de ${quantidade} peça(s) registrada! Total: ${formatadorMoeda.format(valorTotal)}`);
        fecharModalVenda();
        carregarCatalogo();
    } catch (err) {
        console.error(err);
        showToast("Erro ao processar venda", "error");
    }
}

async function venderPeca(id) {
    abrirModalVenda(id);
}

async function gerarRelatorioMensal() {
    const filtro = document.getElementById('filtro-mes-ano').value;
    if (!filtro) return showToast("Selecione um mês para gerar o relatório.", "error");

    const [anoFiltro, mesFiltro] = filtro.split('-');
    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    
    const { data: financeiro, error } = await supabaseClient
        .from('financeiro')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('data_movimentacao', { ascending: true });

    if (error) return showToast("Erro ao carregar dados para o relatório.", "error");

    const finMes = financeiro.filter(f => {
        const d = new Date(f.data_movimentacao + 'T12:00:00');
        return d.getFullYear() == anoFiltro && (d.getMonth() + 1) == mesFiltro;
    });

    if (finMes.length === 0) return showToast("Não há movimentações no mês selecionado.", "error");

    const receitas = finMes.filter(f => f.tipo === 'ENTRADA').reduce((acc, f) => acc + (parseFloat(f.valor) || 0), 0);
    const despesas = finMes.filter(f => f.tipo === 'SAIDA').reduce((acc, f) => acc + (parseFloat(f.valor) || 0), 0);
    const lucro = receitas - despesas;

    document.getElementById('rel-header-nome').innerText = document.getElementById('atelie-nome').value;
    document.getElementById('rel-periodo').innerText = `${meses[mesFiltro - 1]} / ${anoFiltro}`;
    document.getElementById('rel-data-emissao').innerText = formatDate();
    
    document.getElementById('rel-total-recebido').innerText = formatadorMoeda.format(receitas);
    document.getElementById('rel-total-gasto').innerText = formatadorMoeda.format(despesas);
    document.getElementById('rel-lucro-liquido').innerText = formatadorMoeda.format(lucro);

    document.getElementById('rel-tabela-corpo').innerHTML = finMes.map(f => `
        <tr class="border-b border-slate-100">
            <td class="py-3 px-2 text-xs font-bold text-slate-600">${formatDate(f.data_movimentacao + 'T12:00:00')}</td>
            <td class="py-3 px-2 text-xs font-black text-slate-800">${f.descricao}</td>
            <td class="py-3 px-2 text-[10px] font-bold text-slate-400 uppercase">${f.categoria}</td>
            <td class="py-3 px-2 text-xs font-black text-right ${f.tipo === 'ENTRADA' ? 'text-emerald-600' : 'text-red-500'}">
                ${f.tipo === 'ENTRADA' ? '+' : '-'} ${formatadorMoeda.format(f.valor)}
            </td>
        </tr>
    `).join('');

    document.getElementById('modal-relatorio').classList.remove('hidden');
}

function fecharModalRelatorio() { document.getElementById('modal-relatorio').classList.add('hidden'); }
function imprimirRelatorio() { window.print(); }
function gerarRelatorioPDF() { gerarRelatorioMensal(); }

// --- CALCULADORA DE ÁREA ---
function abrirCalculadoraAreaMaterial() {
    document.getElementById('calc-origem').value = 'material';
    document.getElementById('mini-largura').value = '';
    document.getElementById('mini-altura').value = '';
    document.getElementById('mini-resultado').innerText = '0.0000 m²';
    document.getElementById('modal-calc-area').classList.remove('hidden');
    const calc = () => {
        const l = parseFloat(document.getElementById('mini-largura').value) || 0;
        const a = parseFloat(document.getElementById('mini-altura').value) || 0;
        document.getElementById('mini-resultado').innerText = ((l * a) / 10000).toFixed(4) + ' m²';
    };
    document.getElementById('mini-largura').oninput = calc;
    document.getElementById('mini-altura').oninput = calc;
}

function abrirCalculadoraAreaCompra() {
    document.getElementById('calc-origem').value = 'compra';
    document.getElementById('mini-largura').value = '';
    document.getElementById('mini-altura').value = '';
    document.getElementById('mini-resultado').innerText = '0.0000 m²';
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
    const resultado = ((l * a) / 10000).toFixed(4);
    const origem = document.getElementById('calc-origem').value || 'peca';
    if (origem === 'material') {
        document.getElementById('material-quantidade').value = resultado;
        if (typeof calcularPrecoUnitarioMaterial === 'function') calcularPrecoUnitarioMaterial();
    } else if (origem === 'compra') {
        document.getElementById('compra-quantidade').value = resultado;
    }
    fecharCalculadoraArea();
}

