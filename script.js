// Configuração do Supabase
const SUPABASE_URL = 'https://ifmqqaxherxadjsxljpv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_1acNQnNCChNAow0De54rbQ_R0GAafgK';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Configurações e Variáveis Globais
let materiais = [];
let pecasCatalogo = [];
let itensOrcamento = [];
let configFinanceira = { valorHora: 0, custosFixos: 0, horasMes: 160, custoMinuto: 0 };
let currentUser = null;
let statusChart = null;
let paginaAtualEstoque = 1;
let complexidadeAtual = 1.0;
let complexidadeNome = "Padrão";
const itensPorPaginaEstoque = 10;

const formatadorMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// ====================== GESTÃO DE ESTOQUE (MATERIAIS) ======================

async function carregarMateriais() {
    if (!currentUser) return;
    const { data, error } = await supabaseClient
        .from('materiais')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('nome', { ascending: true });
    if (error) return;
    materiais = data;
    renderizarTabelaEstoque();
}

function renderizarTabelaEstoque() {
    const container = document.getElementById('lista-estoque');
    const filtroInput = document.getElementById('filtro-estoque');
    if (!container || !filtroInput) return;
    const filtro = filtroInput.value.toLowerCase();
    
    let filtrados = materiais.filter(m => m.nome.toLowerCase().includes(filtro));
    
    // Paginação
    const totalPaginas = Math.ceil(filtrados.length / itensPorPaginaEstoque);
    if (paginaAtualEstoque > totalPaginas) paginaAtualEstoque = Math.max(1, totalPaginas);
    
    const inicio = (paginaAtualEstoque - 1) * itensPorPaginaEstoque;
    const fim = inicio + itensPorPaginaEstoque;
    const itensPagina = filtrados.slice(inicio, fim);

    container.innerHTML = itensPagina.map(m => `
        <tr class="border-b border-slate-50 hover:bg-slate-50/50 transition-all">
            <td class="py-4 px-2">
                <p class="font-black text-slate-800">${m.nome}</p>
                <p class="text-[10px] text-slate-400 font-bold uppercase">${m.descricao || 'Sem descrição'}</p>
            </td>
            <td class="py-4 px-2 font-bold text-slate-600">${m.quantidade} ${m.unidade}</td>
            <td class="py-4 px-2 font-black text-indigo-600">${formatadorMoeda.format(m.preco_unitario)}</td>
            <td class="py-4 px-2 text-right space-x-2">
                <button onclick="abrirModalMaterial(${m.id})" class="p-2 text-slate-300 hover:text-indigo-600 transition-all"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                <button onclick="excluirMaterial(${m.id})" class="p-2 text-slate-300 hover:text-red-500 transition-all"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </td>
        </tr>
    `).join('');

    renderizarPaginacaoEstoque(totalPaginas);
    lucide.createIcons();
}

function renderizarPaginacaoEstoque(total) {
    const container = document.getElementById('paginacao-estoque');
    if (!container) return;
    
    let html = '';
    for (let i = 1; i <= total; i++) {
        html += `
            <button onclick="mudarPaginaEstoque(${i})" 
                class="w-8 h-8 rounded-lg font-bold text-xs transition-all ${i === paginaAtualEstoque ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-400 hover:bg-slate-100'}">
                ${i}
            </button>
        `;
    }
    container.innerHTML = html;
}

function mudarPaginaEstoque(p) {
    paginaAtualEstoque = p;
    renderizarTabelaEstoque();
}

function filtrarEstoque() {
    paginaAtualEstoque = 1;
    renderizarTabelaEstoque();
}

function abrirModalNovoMaterial() {
    document.getElementById('modal-material-titulo').innerText = "Novo Material";
    document.getElementById('material-edit-id').value = "";
    document.getElementById('material-nome').value = "";
    document.getElementById('material-unidade').value = "unidades";
    document.getElementById('material-quantidade').value = "";
    document.getElementById('material-preco-total').value = "";
    document.getElementById('material-preco-unitario').innerText = "R$ 0,00";
    document.getElementById('material-descricao').value = "";
    document.getElementById('modal-material').classList.remove('hidden');
}

function abrirModalMaterial(id) {
    const m = materiais.find(mat => mat.id === id);
    if (!m) return;
    document.getElementById('modal-material-titulo').innerText = "Editar Material";
    document.getElementById('material-edit-id').value = m.id;
    document.getElementById('material-nome').value = m.nome;
    document.getElementById('material-unidade').value = m.unidade;
    document.getElementById('material-quantidade').value = m.quantidade;
    document.getElementById('material-preco-total').value = (m.quantidade * m.preco_unitario).toFixed(2);
    document.getElementById('material-preco-unitario').innerText = formatadorMoeda.format(m.preco_unitario);
    document.getElementById('material-descricao').value = m.descricao || "";
    document.getElementById('modal-material').classList.remove('hidden');
}

function fecharModalMaterial() { document.getElementById('modal-material').classList.add('hidden'); }

function calcularPrecoUnitarioMaterial() {
    const qtd = parseFloat(document.getElementById('material-quantidade').value) || 0;
    const total = parseFloat(document.getElementById('material-preco-total').value) || 0;
    const unit = qtd > 0 ? total / qtd : 0;
    document.getElementById('material-preco-unitario').innerText = formatadorMoeda.format(unit);
}

async function salvarMaterialModal() {
    const id = document.getElementById('material-edit-id').value;
    const qtd = parseFloat(document.getElementById('material-quantidade').value) || 0;
    const precoTotal = parseFloat(document.getElementById('material-preco-total').value) || 0;
    const precoUnitarioInput = parseFloat(document.getElementById('material-preco-unitario').value) || 0;
    
    // Se o usuário digitou o preço unitário diretamente, usamos ele. 
    // Caso contrário, calculamos a partir do total.
    const precoUnitario = precoUnitarioInput > 0 ? precoUnitarioInput : (qtd > 0 ? precoTotal / qtd : 0);

    const material = {
        user_id: currentUser.id,
        nome: document.getElementById('material-nome').value,
        unidade: document.getElementById('material-unidade').value,
        quantidade: qtd,
        preco_unitario: precoUnitario,
        descricao: document.getElementById('material-descricao').value
    };

    if (id) {
        const { error } = await supabaseClient.from('materiais').update(material).eq('id', id);
        if (error) showToast("Erro ao atualizar", "error"); 
        else { showToast("Material atualizado!"); fecharModalMaterial(); carregarMateriais(); }
    } else {
        const { error } = await supabaseClient.from('materiais').insert([material]);
        if (error) showToast("Erro ao cadastrar", "error"); 
        else { showToast("Material cadastrado!"); fecharModalMaterial(); carregarMateriais(); }
    }
}

function limparPrecoTotal() {
    document.getElementById('material-preco-total').value = "";
}

async function excluirMaterial(id) {
    if (!confirm("Tem certeza que deseja excluir este material?")) return;
    const { error } = await supabaseClient.from('materiais').delete().eq('id', id);
    if (error) showToast("Erro ao excluir", "error"); else { showToast("Material excluído."); carregarMateriais(); }
}

// ---- Registro de Compra ----

function abrirModalRegistrarCompra() {
    const select = document.getElementById('compra-material-id');
    if (!select) return;

    select.innerHTML = '<option value="" disabled selected>Selecione o material comprado...</option>' + 
        materiais.map(m => `<option value="${m.id}">${m.nome} (${m.unidade})</option>`).join('');

    document.getElementById('compra-quantidade').value = '';
    document.getElementById('compra-valor-total').value = '';
    document.getElementById('compra-fornecedor').value = '';
    document.getElementById('modal-compra').classList.remove('hidden');
}

function fecharModalCompra() {
    document.getElementById('modal-compra').classList.add('hidden');
}

async function salvarCompraMaterial() {
    const materialId = document.getElementById('compra-material-id').value;
    const qtdComprada = parseFloat(document.getElementById('compra-quantidade').value) || 0;
    const valorTotal = parseFloat(document.getElementById('compra-valor-total').value) || 0;
    const fornecedor = document.getElementById('compra-fornecedor').value.trim();

    if (!materialId) return showToast("Selecione um material.", "error");
    if (qtdComprada <= 0) return showToast("Informe a quantidade.", "error");
    if (valorTotal <= 0) return showToast("Informe o valor total.", "error");

    const material = materiais.find(m => m.id == materialId);
    if (!material) return;

    // 1. Atualizar Estoque e Preço Unitário Médio
    const novaQtd = (parseFloat(material.quantidade) || 0) + qtdComprada;
    const novoPrecoUnitario = valorTotal / qtdComprada; // Preço desta compra específica

    const { error: matError } = await supabaseClient
        .from('materiais')
        .update({ 
            quantidade: novaQtd,
            preco_unitario: novoPrecoUnitario, // Atualiza para o preço da última compra
            descricao: fornecedor ? `Última compra: ${fornecedor}` : material.descricao
        })
        .eq('id', materialId);

    if (matError) return showToast("Erro ao atualizar estoque.", "error");

    // 2. Registrar Saída no Financeiro
    const { error: finError } = await supabaseClient
        .from('financeiro')
        .insert([{
            user_id: currentUser.id,
            tipo: 'saida',
            valor: valorTotal,
            descricao: `Compra: ${material.nome}${fornecedor ? ' (' + fornecedor + ')' : ''}`,
            categoria: 'Compra de Materiais',
            data_movimentacao: new Date().toISOString().split('T')[0],
            referencia_id: materialId
        }]);

    if (finError) {
        showToast("Estoque atualizado, mas erro no financeiro.", "error");
    } else {
        showToast("Compra registrada e estoque atualizado!");
        fecharModalCompra();
        carregarMateriais();
    }
}

// ====================== CATÁLOGO DE PEÇAS ======================

async function carregarCatalogo() {
    if (!currentUser) return;
    const { data, error } = await supabaseClient
        .from('pecas')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('nome', { ascending: true });
    if (error) return;
    pecasCatalogo = data;
    renderizarCatalogo();
}

function renderizarCatalogo() {
    const container = document.getElementById('lista-catalogo');
    const filtroInput = document.getElementById('filtro-catalogo');
    if (!container) return;
    const filtro = filtroInput ? filtroInput.value.toLowerCase() : "";
    const filtrados = pecasCatalogo.filter(p => p.nome.toLowerCase().includes(filtro));

    if (filtrados.length === 0) {
        container.innerHTML = '<tr><td colspan="5" class="text-center py-12 text-slate-400 font-bold">Nenhuma peça encontrada</td></tr>';
        return;
    }

    container.innerHTML = filtrados.map(p => `
        <tr class="border-b border-slate-50 hover:bg-slate-50/50 transition-all">
            <td class="py-4 px-6">
                <p class="font-black text-slate-800">${p.nome}</p>
                <p class="text-[10px] text-slate-400 font-bold uppercase">Ficha Técnica</p>
            </td>
            <td class="py-4 px-6 text-center font-bold text-slate-600">${p.tempo_producao || 0} min</td>
            <td class="py-4 px-6 text-right font-bold text-slate-600">${p.quantidade || 0} un</td>
            <td class="py-4 px-6 text-right font-black text-indigo-600">${formatadorMoeda.format(p.preco_venda)}</td>
            <td class="py-4 px-6 text-center space-x-2">
                <button onclick="adicionarAoOrcamento(${p.id})" class="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Adicionar ao Orçamento"><i data-lucide="plus-circle" class="w-5 h-5"></i></button>
                <button onclick="abrirModalPeca(${p.id})" class="p-2 text-slate-300 hover:text-indigo-600 transition-all"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                <button onclick="excluirPeca(${p.id})" class="p-2 text-slate-300 hover:text-red-500 transition-all"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
}

let composicaoAtual = [];

function abrirModalNovaPeca() {
    document.getElementById('peca-edit-id').value = "";
    document.getElementById('peca-nome').value = "";
    document.getElementById('peca-tempo').value = "";
    document.getElementById('peca-margem').value = "100";
    composicaoAtual = [];
    atualizarListaComposicao();
    
    const select = document.getElementById('peca-material-select');
    select.innerHTML = '<option value="" disabled selected>Selecione um material...</option>' + 
        materiais.map(m => `<option value="${m.id}">${m.nome} (${m.unidade})</option>`).join('');
    
    document.getElementById('modal-peca').classList.remove('hidden');
}

async function abrirModalPeca(id) {
    const p = pecasCatalogo.find(peca => peca.id === id);
    if (!p) return;
    document.getElementById('peca-edit-id').value = p.id;
    document.getElementById('peca-nome').value = p.nome;
    document.getElementById('peca-tempo').value = p.tempo_producao;
    document.getElementById('peca-margem').value = p.margem_lucro || 100;
    
    // Carregar composição
    const { data, error } = await supabaseClient.from('composicao_peca').select('*').eq('peca_id', id);
    if (!error) {
        composicaoAtual = data.map(c => {
            const m = materiais.find(mat => mat.id === c.material_id);
            return {
                material_id: c.material_id,
                nome: m ? m.nome : 'Material Excluído',
                quantidade: c.quantidade,
                preco_unitario: m ? m.preco_unitario : 0,
                unidade: m ? m.unidade : ''
            };
        });
    }
    
    atualizarListaComposicao();
    abrirModalNovaPeca(); // Reutiliza o select de materiais
    document.getElementById('peca-edit-id').value = p.id;
    document.getElementById('peca-nome').value = p.nome;
    document.getElementById('peca-tempo').value = p.tempo_producao;
    document.getElementById('peca-margem').value = p.margem_lucro || 100;
}

function fecharModalPeca() { document.getElementById('modal-peca').classList.add('hidden'); }

function adicionarMaterialAPeca() {
    const select = document.getElementById('peca-material-select');
    const qtd = parseFloat(document.getElementById('peca-material-qtd').value) || 0;
    if (!select.value || qtd <= 0) return;
    
    const m = materiais.find(mat => mat.id == select.value);
    composicaoAtual.push({
        material_id: m.id,
        nome: m.nome,
        quantidade: qtd,
        preco_unitario: m.preco_unitario,
        unidade: m.unidade
    });
    
    document.getElementById('peca-material-qtd').value = "";
    atualizarListaComposicao();
}

function removerMaterialComposicao(index) {
    composicaoAtual.splice(index, 1);
    atualizarListaComposicao();
}

function atualizarListaComposicao() {
    const container = document.getElementById('peca-composicao-lista');
    container.innerHTML = composicaoAtual.map((c, idx) => `
        <div class="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100 group">
            <div>
                <p class="text-xs font-black text-slate-800">${c.nome}</p>
                <p class="text-[9px] text-slate-400 font-bold uppercase">${c.quantidade} ${c.unidade} x ${formatadorMoeda.format(c.preco_unitario)}</p>
            </div>
            <div class="flex items-center gap-3">
                <p class="text-xs font-black text-slate-600">${formatadorMoeda.format(c.quantidade * c.preco_unitario)}</p>
                <button onclick="removerMaterialComposicao(${idx})" class="text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><i data-lucide="x" class="w-4 h-4"></i></button>
            </div>
        </div>
    `).join('');
    calcularPrecoPeca();
    lucide.createIcons();
}

function calcularPrecoPeca() {
    const custoMateriais = composicaoAtual.reduce((acc, c) => acc + (c.quantidade * c.preco_unitario), 0);
    const tempo = parseFloat(document.getElementById('peca-tempo').value) || 0;
    const custoMaoDeObra = tempo * (configFinanceira.custoMinuto || 0);
    const margem = (parseFloat(document.getElementById('peca-margem').value) || 0) / 100;
    
    const custoTotal = custoMateriais + custoMaoDeObra;
    const precoVenda = custoTotal * (1 + margem);
    
    document.getElementById('peca-res-materiais').innerText = formatadorMoeda.format(custoMateriais);
    document.getElementById('peca-res-maodeobra').innerText = formatadorMoeda.format(custoMaoDeObra);
    document.getElementById('peca-res-venda').innerText = formatadorMoeda.format(precoVenda);
}

async function salvarPecaCompleta() {
    const id = document.getElementById('peca-edit-id').value;
    const custoMateriais = composicaoAtual.reduce((acc, c) => acc + (c.quantidade * c.preco_unitario), 0);
    const tempo = parseFloat(document.getElementById('peca-tempo').value) || 0;
    const margem = parseFloat(document.getElementById('peca-margem').value) || 0;
    const precoVenda = (custoMateriais + (tempo * configFinanceira.custoMinuto)) * (1 + (margem/100));

    const peca = {
        user_id: currentUser.id,
        nome: document.getElementById('peca-nome').value,
        tempo_producao: tempo,
        margem_lucro: margem,
        preco_venda: precoVenda
    };

    let pecaId = id;
    if (id) {
        await supabaseClient.from('pecas').update(peca).eq('id', id);
        await supabaseClient.from('composicao_peca').delete().eq('peca_id', id);
    } else {
        const { data, error } = await supabaseClient.from('pecas').insert([peca]).select();
        if (!error) pecaId = data[0].id;
    }

    if (pecaId) {
        const composicao = composicaoAtual.map(c => ({
            peca_id: pecaId,
            material_id: c.material_id,
            quantidade: c.quantidade
        }));
        await supabaseClient.from('composicao_peca').insert(composicao);
        showToast("Peça salva no catálogo!");
        fecharModalPeca();
        carregarCatalogo();
    }
}

async function excluirPeca(id) {
    if (!confirm("Excluir esta peça do catálogo?")) return;
    await supabaseClient.from('composicao_peca').delete().eq('peca_id', id);
    await supabaseClient.from('pecas').delete().eq('id', id);
    showToast("Peça excluída.");
    carregarCatalogo();
}

// ====================== GERADOR DE ORÇAMENTOS ======================

function adicionarAoOrcamento(id) {
    const p = pecasCatalogo.find(peca => peca.id === id);
    if (!p) return;
    itensOrcamento.push({ ...p });
    renderizarItensOrcamento();
    showToast(`${p.nome} adicionado!`);
}

function removerDoOrcamento(index) {
    itensOrcamento.splice(index, 1);
    renderizarItensOrcamento();
}

function renderizarItensOrcamento() {
    const container = document.getElementById('itens-orcamento');
    container.innerHTML = itensOrcamento.map((item, idx) => `
        <div class="flex justify-between items-center p-4 bg-white border border-slate-100 rounded-2xl shadow-sm group">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black text-xs">${idx + 1}</div>
                <div>
                    <p class="font-black text-slate-800">${item.nome}</p>
                    <p class="text-[10px] text-slate-400 font-bold uppercase">Preço Unitário: ${formatadorMoeda.format(item.preco_venda)}</p>
                </div>
            </div>
            <div class="flex items-center gap-6">
                <p class="font-black text-indigo-600">${formatadorMoeda.format(item.preco_venda)}</p>
                <button onclick="removerDoOrcamento(${idx})" class="p-2 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
        </div>
    `).join('');
    
    const totais = calcularTotal();
    document.getElementById('resumo-total').innerText = formatadorMoeda.format(totais.total);
    lucide.createIcons();
}

function calcularTotal() {
    const total = itensOrcamento.reduce((acc, item) => acc + item.preco_venda, 0);
    return { total };
}

async function salvarOrcamento() {
    if (itensOrcamento.length === 0) return showToast("Adicione itens ao orçamento.", "error");
    const cliente = document.getElementById('cliente').value;
    const totais = calcularTotal();
    
    const orcamento = {
        user_id: currentUser.id,
        cliente: cliente || "Consumidor",
        itens: itensOrcamento,
        total: totais.total,
        status: 'Aguardando Aprovação'
    };

    const { error } = await supabaseClient.from('orcamentos').insert([orcamento]);
    if (error) showToast("Erro ao salvar orçamento.", "error");
    else {
        showToast("Orçamento salvo com sucesso!");
        itensOrcamento = [];
        document.getElementById('cliente').value = "";
        renderizarItensOrcamento();
        carregarHistorico();
    }
}

// ====================== CALCULADORA DE ÁREA ======================

function abrirCalculadoraArea() {
    document.getElementById('calc-origem').value = 'peca';
    document.getElementById('mini-largura').value = '';
    document.getElementById('mini-altura').value = '';
    document.getElementById('mini-resultado').innerText = '0.0000 m²';
    document.getElementById('modal-calc-area').classList.remove('hidden');
    configurarInputsCalculadora();
}

function abrirCalculadoraAreaMaterial() {
    document.getElementById('calc-origem').value = 'material';
    document.getElementById('mini-largura').value = '';
    document.getElementById('mini-altura').value = '';
    document.getElementById('mini-resultado').innerText = '0.0000 m²';
    document.getElementById('modal-calc-area').classList.remove('hidden');
    configurarInputsCalculadora();
}

function abrirCalculadoraAreaCompra() {
    document.getElementById('calc-origem').value = 'compra';
    document.getElementById('mini-largura').value = '';
    document.getElementById('mini-altura').value = '';
    document.getElementById('mini-resultado').innerText = '0.0000 m²';
    document.getElementById('modal-calc-area').classList.remove('hidden');
    configurarInputsCalculadora();
}

function configurarInputsCalculadora() {
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
    } else if (origem === 'compra') {
        document.getElementById('compra-quantidade').value = resultado;
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
}

function enviarWhatsApp() {
    const totais = calcularTotal();
    const cliente = document.getElementById('cliente').value || "Cliente";
    const fone = document.getElementById('whatsapp').value.replace(/\D/g, '');
    const obs = document.getElementById('observacoes').value.trim();
    let msg = `*ORÇAMENTO - ${document.getElementById('atelie-nome').value}*\nOlá, ${cliente}!\n\n`;
    itensOrcamento.forEach((i, idx) => msg += `${idx+1}. ${i.nome} - *${formatadorMoeda.format(i.preco_venda)}*\n`);
    msg += `\n*TOTAL: ${formatadorMoeda.format(totais.total)}*`;
    if (obs) msg += `\n\n_Obs: ${obs}_`;
    window.open(`https://api.whatsapp.com/send?phone=55${fone}&text=${encodeURIComponent(msg)}`, '_blank');
}

// --- DASHBOARD ---

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
    
    // Carregar Orçamentos
    const { data: orcamentos, error: orcError } = await supabaseClient
        .from('orcamentos')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
    
    // Carregar Financeiro
    const { data: financeiro, error: finError } = await supabaseClient
        .from('financeiro')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('data_movimentacao', { ascending: false });

    if (orcError || finError) return;

    atualizarDashboard(orcamentos, financeiro);
    renderizarHistorico(orcamentos);
    renderizarFluxoFinanceiro(financeiro);
    atualizarFiltroMeses();
}

function renderizarFluxoFinanceiro(data) {
    const container = document.getElementById('lista-financeiro');
    if (!container) return;

    if (!data || data.length === 0) {
        container.innerHTML = '<p class="text-center py-4 text-slate-400 text-xs font-bold">Nenhuma movimentação este mês.</p>';
        return;
    }

    // Filtrar apenas o mês selecionado (ou atual por padrão)
    const filtro = document.getElementById('filtro-mes-ano').value;
    let lista = data;
    if (filtro) {
        const [ano, mes] = filtro.split('-');
        lista = data.filter(f => {
            const d = new Date(f.data_movimentacao + 'T12:00:00');
            return d.getFullYear() == ano && (d.getMonth() + 1) == mes;
        });
    }

    container.innerHTML = lista.map(f => `
        <div class="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full flex items-center justify-center ${f.tipo === 'entrada' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}">
                    <i data-lucide="${f.tipo === 'entrada' ? 'trending-up' : 'trending-down'}" class="w-4 h-4"></i>
                </div>
                <div>
                    <p class="text-xs font-black text-slate-800 leading-tight">${f.descricao}</p>
                    <p class="text-[9px] text-slate-400 font-bold uppercase">${new Date(f.data_movimentacao + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                </div>
            </div>
            <div class="text-right">
                <p class="text-xs font-black ${f.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-500'}">
                    ${f.tipo === 'entrada' ? '+' : '-'} ${formatadorMoeda.format(f.valor)}
                </p>
                <p class="text-[8px] text-slate-400 font-bold uppercase">${f.categoria}</p>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

function atualizarFiltroMeses() {
    const select = document.getElementById('filtro-mes-ano');
    if (!select || select.options.length > 0) return;

    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const agora = new Date();
    
    for (let i = 0; i < 6; i++) {
        const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
        const valor = `${d.getFullYear()}-${d.getMonth() + 1}`;
        const texto = `${meses[d.getMonth()]} / ${d.getFullYear()}`;
        const opt = new Option(texto, valor);
        if (i === 0) opt.selected = true;
        select.add(opt);
    }
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
    const { data: orcamento, error: fetchError } = await supabaseClient
        .from('orcamentos')
        .select('*')
        .eq('id', id)
        .single();

    if (fetchError) return showToast("Erro ao buscar orçamento.", "error");

    if (novoStatus === 'Entregue' && orcamento.status !== 'Entregue') {
        const itens = orcamento.itens || [];
        for (const item of itens) {
            const peca = pecasCatalogo.find(p => p.nome === item.nome);
            if (peca) {
                const novaQtd = Math.max(0, (parseInt(peca.quantidade) || 0) - 1);
                await supabaseClient
                    .from('pecas')
                    .update({ quantidade: novaQtd })
                    .eq('id', peca.id);
            }
        }

        const { error: finError } = await supabaseClient
            .from('financeiro')
            .insert([{
                user_id: currentUser.id,
                tipo: 'entrada',
                valor: orcamento.total,
                descricao: `Venda: ${orcamento.cliente || 'Consumidor'}`,
                categoria: 'Venda de Peças',
                data_movimentacao: new Date().toISOString().split('T')[0],
                referencia_id: orcamento.id
            }]);

        if (finError) {
            console.error("Erro ao registrar no financeiro:", finError);
            showToast("Estoque atualizado, mas erro ao registrar financeiro.", "error");
        } else {
            showToast("Venda registrada no financeiro e estoque atualizado!");
        }
    }

    const { error } = await supabaseClient
        .from('orcamentos')
        .update({ status: novoStatus })
        .eq('id', id);

    if (error) {
        showToast("Erro ao atualizar status.", "error");
    } else {
        showToast(`Status atualizado para "${novoStatus}"!`);
        carregarHistorico();
        carregarCatalogo();
    }
}

async function excluirOrcamento(id) {
    if (!confirm("Excluir este orçamento?")) return;
    const { error } = await supabaseClient.from('orcamentos').delete().eq('id', id);
    if (error) showToast("Erro ao excluir", "error"); else carregarHistorico();
}

function atualizarDashboard(orcamentos, financeiro) {
    if (!orcamentos || !financeiro) return;

    const filtro = document.getElementById('filtro-mes-ano').value;
    const [anoFiltro, mesFiltro] = filtro ? filtro.split('-') : [new Date().getFullYear(), new Date().getMonth() + 1];

    const finMes = financeiro.filter(f => {
        const d = new Date(f.data_movimentacao + 'T12:00:00');
        return d.getFullYear() == anoFiltro && (d.getMonth() + 1) == mesFiltro;
    });

    const receitas = finMes.filter(f => f.tipo === 'entrada').reduce((acc, f) => acc + (parseFloat(f.valor) || 0), 0);
    const despesas = finMes.filter(f => f.tipo === 'saida').reduce((acc, f) => acc + (parseFloat(f.valor) || 0), 0);
    const lucro = receitas - despesas;

    document.getElementById('dash-receitas').innerText = formatadorMoeda.format(receitas);
    document.getElementById('dash-despesas').innerText = formatadorMoeda.format(despesas);
    document.getElementById('dash-lucro').innerText = formatadorMoeda.format(lucro);

    const aReceber = orcamentos
        .filter(o => ['Pendente', 'Aguardando Aprovação', 'Em Produção'].includes(o.status))
        .reduce((acc, o) => acc + (parseFloat(o.total) || 0), 0);
    document.getElementById('dash-receber').innerText = formatadorMoeda.format(aReceber);

    const contagem = {};
    orcamentos.forEach(o => { contagem[o.status] = (contagem[o.status] || 0) + 1; });
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
                    labels: { font: { size: 9, weight: 'bold' }, padding: 8, boxWidth: 8 }
                }
            }
        }
    });
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

    const receitas = finMes.filter(f => f.tipo === 'entrada').reduce((acc, f) => acc + (parseFloat(f.valor) || 0), 0);
    const despesas = finMes.filter(f => f.tipo === 'saida').reduce((acc, f) => acc + (parseFloat(f.valor) || 0), 0);
    const lucro = receitas - despesas;

    document.getElementById('rel-header-nome').innerText = document.getElementById('atelie-nome').value;
    document.getElementById('rel-periodo').innerText = `${meses[mesFiltro - 1]} / ${anoFiltro}`;
    document.getElementById('rel-data-emissao').innerText = new Date().toLocaleDateString('pt-BR');
    
    document.getElementById('rel-total-recebido').innerText = formatadorMoeda.format(receitas);
    document.getElementById('rel-total-gasto').innerText = formatadorMoeda.format(despesas);
    document.getElementById('rel-lucro-liquido').innerText = formatadorMoeda.format(lucro);

    document.getElementById('rel-tabela-corpo').innerHTML = finMes.map(f => `
        <tr class="border-b border-slate-100">
            <td class="py-3 px-2 text-xs font-bold text-slate-600">${new Date(f.data_movimentacao + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
            <td class="py-3 px-2 text-xs font-black text-slate-800">${f.descricao}</td>
            <td class="py-3 px-2 text-[10px] font-bold text-slate-400 uppercase">${f.categoria}</td>
            <td class="py-3 px-2 text-xs font-black text-right ${f.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-500'}">
                ${f.tipo === 'entrada' ? '+' : '-'} ${formatadorMoeda.format(f.valor)}
            </td>
        </tr>
    `).join('');

    document.getElementById('modal-relatorio').classList.remove('hidden');
}

function fecharModalRelatorio() { document.getElementById('modal-relatorio').classList.add('hidden'); }
function imprimirRelatorio() { window.print(); }

function setComplex(valor, btn) {
    complexidadeAtual = valor;
    complexidadeNome = btn.innerText;
    document.querySelectorAll('.complex-btn').forEach(b => {
        b.classList.remove('border-indigo-600', 'bg-indigo-50', 'text-indigo-700');
        b.classList.add('border-slate-200', 'bg-white', 'text-slate-600');
    });
    btn.classList.remove('border-slate-200', 'bg-white', 'text-slate-600');
    btn.classList.add('border-indigo-600', 'bg-indigo-50', 'text-indigo-700');
    calcularTotal();
}

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
    if (!container) return;
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
    const descontoInput = document.getElementById('desconto');
    const desconto = descontoInput ? (parseFloat(descontoInput.value) || 0) : 0;
    const total = Math.max(0, subtotal - desconto);
    
    const resSubtotal = document.getElementById('res-subtotal');
    const resDesconto = document.getElementById('res-desconto');
    const resTotal = document.getElementById('res-total');
    
    if (resSubtotal) resSubtotal.innerText = formatadorMoeda.format(subtotal);
    if (resDesconto) resDesconto.innerText = `- ${formatadorMoeda.format(desconto)}`;
    if (resTotal) resTotal.innerText = formatadorMoeda.format(total);
    
    return { subtotal, desconto, total };
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

// ====================== CALCULADORA DE ÁREA ======================

function abrirCalculadoraArea() {
    document.getElementById('calc-origem').value = 'peca';
    document.getElementById('mini-largura').value = '';
    document.getElementById('mini-altura').value = '';
    document.getElementById('mini-resultado').innerText = '0.0000 m²';
    document.getElementById('modal-calc-area').classList.remove('hidden');
    configurarInputsCalculadora();
}

function abrirCalculadoraAreaMaterial() {
    document.getElementById('calc-origem').value = 'material';
    document.getElementById('mini-largura').value = '';
    document.getElementById('mini-altura').value = '';
    document.getElementById('mini-resultado').innerText = '0.0000 m²';
    document.getElementById('modal-calc-area').classList.remove('hidden');
    configurarInputsCalculadora();
}

function abrirCalculadoraAreaCompra() {
    document.getElementById('calc-origem').value = 'compra';
    document.getElementById('mini-largura').value = '';
    document.getElementById('mini-altura').value = '';
    document.getElementById('mini-resultado').innerText = '0.0000 m²';
    document.getElementById('modal-calc-area').classList.remove('hidden');
    configurarInputsCalculadora();
}

function configurarInputsCalculadora() {
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
    } else if (origem === 'compra') {
        document.getElementById('compra-quantidade').value = resultado;
    } else {
        document.getElementById('peca-material-qtd').value = resultado;
    }
    fecharCalculadoraArea();
}

checkUser();
