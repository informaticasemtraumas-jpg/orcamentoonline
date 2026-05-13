// ====================== CAIXA ======================

function caixaHojeISO() {
    return new Date().toISOString().split('T')[0];
}

function caixaNumero(valor) {
    const numero = parseFloat(valor);
    return Number.isFinite(numero) ? numero : 0;
}

function caixaEscapeHtml(valor) {
    return String(valor ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function caixaEhUuid(valor) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(valor || '').trim());
}

function caixaEhIdNumerico(valor) {
    return /^\d+$/.test(String(valor ?? '').trim());
}

let comprasCaixaLimite = 10;
let pedidosVendaCaixaLimite = 10;
let itensPedidoVendaCaixa = [];
let salvandoPedidoVendaCaixa = false;

function iniciarCaixa() {
    if (!document.getElementById('caixa-data')) return;

    if (!document.getElementById('caixa-data').value) {
        document.getElementById('caixa-data').value = caixaHojeISO();
    }

    if (!Array.isArray(itensCompraCaixa) || itensCompraCaixa.length === 0) {
        novaCompraCaixa(false);
    } else {
        renderizarItensCompraCaixa();
    }

    if (typeof carregarMateriais === 'function') carregarMateriais();
    carregarHistoricoComprasCaixa();
    carregarHistoricoPedidosVendaCaixa();
}


function novaCompraCaixa(recarregar = true, abrirModal = false) {
    itensCompraCaixa = [];

    const campos = {
        'caixa-fornecedor': '',
        'caixa-numero-nota': '',
        'caixa-data': caixaHojeISO(),
        'caixa-forma-pagamento': 'Dinheiro',
        'caixa-desconto': '0',
        'caixa-observacoes': '',
    };

    Object.entries(campos).forEach(([id, valor]) => {
        const campo = document.getElementById(id);
        if (campo) campo.value = valor;
    });

    adicionarItemCompraCaixa(false);
    if (recarregar && typeof carregarMateriais === 'function') carregarMateriais();
    if (abrirModal) document.getElementById('modal-caixa-compra')?.classList.remove('hidden');
}

function abrirModalNovaCompraCaixa() { novaCompraCaixa(true, true); }
function fecharModalCompraCaixa() { document.getElementById('modal-caixa-compra')?.classList.add('hidden'); }
async function abrirNovoPedidoCaixa() {
    if (typeof carregarCatalogo === 'function') await carregarCatalogo();
    novoPedidoVendaCaixa(true);
}

function caixaAtualizarSelectsMateriais() {
    renderizarItensCompraCaixa();
}

function caixaFormatarQuantidade(valor) {
    return parseFloat(valor || 0).toFixed(4).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

let itemCompraCaixaCalculadoraId = null;

function abrirCalculadoraAreaCaixaItem(id) {
    itemCompraCaixaCalculadoraId = id;

    if (typeof abrirCalculadoraAreaCompra === 'function') {
        abrirCalculadoraAreaCompra();
    } else if (typeof abrirCalculadoraAreaMaterial === 'function') {
        abrirCalculadoraAreaMaterial();
    }

    const origem = document.getElementById('calc-origem');
    if (origem) origem.value = 'caixa';
}

function aplicarResultadoAreaCaixaItem(resultado) {
    if (!itemCompraCaixaCalculadoraId) return;
    atualizarItemCompraCaixa(itemCompraCaixaCalculadoraId, 'quantidade', resultado);
    renderizarItensCompraCaixa();
    itemCompraCaixaCalculadoraId = null;
}

function criarItemCompraCaixa() {
    return {
        id: Date.now() + Math.floor(Math.random() * 1000),
        material_id: '',
        novo_material: '',
        unidade: 'unidades',
        quantidade: 1,
        valor_unitario: 0,
    };
}

function adicionarItemCompraCaixa(recalcular = true) {
    itensCompraCaixa.push(criarItemCompraCaixa());
    renderizarItensCompraCaixa();
    if (recalcular) calcularTotaisCaixa();
}

function removerItemCompraCaixa(id) {
    if (itensCompraCaixa.length === 1) {
        return showToast('A compra precisa ter pelo menos um item.', 'error');
    }

    itensCompraCaixa = itensCompraCaixa.filter(item => item.id !== id);
    renderizarItensCompraCaixa();
    calcularTotaisCaixa();
}

function atualizarItemCompraCaixa(id, campo, valor) {
    const item = itensCompraCaixa.find(i => i.id === id);
    if (!item) return;

    if (['quantidade', 'valor_unitario'].includes(campo)) {
        item[campo] = caixaNumero(valor);
    } else {
        item[campo] = valor;
    }

    const totalEl = document.getElementById(`caixa-item-total-${id}`);
    if (totalEl) totalEl.innerText = formatadorMoeda.format((item.quantidade || 0) * (item.valor_unitario || 0));

    calcularTotaisCaixa();
}

function renderizarItensCompraCaixa() {
    const container = document.getElementById('caixa-itens');
    if (!container) return;

    if (!Array.isArray(itensCompraCaixa)) itensCompraCaixa = [];
    if (itensCompraCaixa.length === 0) itensCompraCaixa.push(criarItemCompraCaixa());

    const opcoesMateriais = materiais.map(m => `
        <option value="${m.id}">${caixaEscapeHtml(m.nome)} (${caixaEscapeHtml(m.unidade || 'un')}) - ${formatadorMoeda.format(m.preco_unitario || 0)}</option>
    `).join('');

    container.innerHTML = itensCompraCaixa.map((item, index) => `
        <div class="p-5 space-y-4" data-caixa-item="${item.id}">
            <div class="flex items-center justify-between gap-3">
                <p class="text-xs font-black text-slate-400 uppercase tracking-widest">Item ${index + 1}</p>
                <button onclick="removerItemCompraCaixa(${item.id})" class="p-2 text-slate-300 hover:text-red-500 rounded-xl hover:bg-red-50 transition-all" title="Remover item">
                    <i data-lucide="trash-2" class="w-5 h-5"></i>
                </button>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                <div class="lg:col-span-4 space-y-1">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Material Existente</label>
                    <select onchange="atualizarItemCompraCaixa(${item.id}, 'material_id', this.value)" class="w-full p-3 bg-white border-2 border-slate-200 rounded-2xl outline-none focus:border-indigo-600 font-bold text-slate-700 text-sm">
                        <option value="">Novo material...</option>
                        ${opcoesMateriais}
                    </select>
                </div>
                <div class="lg:col-span-3 space-y-1">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ou digite novo material</label>
                    <input type="text" value="${caixaEscapeHtml(item.novo_material)}" oninput="atualizarItemCompraCaixa(${item.id}, 'novo_material', this.value)" class="w-full p-3 bg-white border-2 border-slate-200 rounded-2xl outline-none focus:border-indigo-600 font-bold text-slate-700 text-sm" placeholder="Ex: Linha branca">
                </div>
                <div class="lg:col-span-2 space-y-1">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unidade</label>
                    <select onchange="atualizarItemCompraCaixa(${item.id}, 'unidade', this.value)" class="w-full p-3 bg-white border-2 border-slate-200 rounded-2xl outline-none focus:border-indigo-600 font-bold text-slate-700 text-sm">
                        <option value="unidades" ${item.unidade === 'unidades' ? 'selected' : ''}>unidades</option>
                        <option value="metros" ${item.unidade === 'metros' ? 'selected' : ''}>metros</option>
                        <option value="m²" ${item.unidade === 'm²' ? 'selected' : ''}>m²</option>
                        <option value="kg" ${item.unidade === 'kg' ? 'selected' : ''}>kg</option>
                        <option value="litros" ${item.unidade === 'litros' ? 'selected' : ''}>litros</option>
                    </select>
                </div>
                <div class="lg:col-span-1 space-y-1">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Qtd</label>
                    <input type="number" min="0" step="0.0001" value="${item.quantidade}" oninput="atualizarItemCompraCaixa(${item.id}, 'quantidade', this.value)" class="w-full p-3 bg-white border-2 border-slate-200 rounded-2xl outline-none focus:border-indigo-600 font-bold text-slate-700 text-sm">
                    <button type="button" onclick="abrirCalculadoraAreaCaixaItem(${item.id})" class="w-full mt-2 px-2 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all text-[10px] font-black" title="Usar calculadora de área">CALCULAR</button>
                </div>
                <div class="lg:col-span-1 space-y-1">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit.</label>
                    <input type="number" min="0" step="0.01" value="${item.valor_unitario}" oninput="atualizarItemCompraCaixa(${item.id}, 'valor_unitario', this.value)" class="w-full p-3 bg-white border-2 border-slate-200 rounded-2xl outline-none focus:border-indigo-600 font-bold text-slate-700 text-sm">
                </div>
                <div class="lg:col-span-1 bg-slate-50 border border-slate-100 rounded-2xl p-3 text-right">
                    <p class="text-[10px] font-black text-slate-400 uppercase">Total</p>
                    <p id="caixa-item-total-${item.id}" class="font-black text-emerald-600 text-sm">${formatadorMoeda.format((item.quantidade || 0) * (item.valor_unitario || 0))}</p>
                </div>
            </div>
        </div>
    `).join('');

    itensCompraCaixa.forEach(item => {
        const select = container.querySelector(`[data-caixa-item="${item.id}"] select`);
        if (select) select.value = item.material_id || '';
    });

    if (window.lucide) lucide.createIcons();
    calcularTotaisCaixa();
}

function calcularTotaisCaixa() {
    const subtotal = (itensCompraCaixa || []).reduce((acc, item) => acc + ((item.quantidade || 0) * (item.valor_unitario || 0)), 0);
    const desconto = Math.min(caixaNumero(document.getElementById('caixa-desconto')?.value), subtotal);
    const total = Math.max(0, subtotal - desconto);

    const subtotalEl = document.getElementById('caixa-subtotal');
    const descontoEl = document.getElementById('caixa-desconto-exibir');
    const totalEl = document.getElementById('caixa-total');

    if (subtotalEl) subtotalEl.innerText = formatadorMoeda.format(subtotal);
    if (descontoEl) descontoEl.innerText = `- ${formatadorMoeda.format(desconto)}`;
    if (totalEl) totalEl.innerText = `- ${formatadorMoeda.format(total)}`;

    return { subtotal, desconto, total };
}

function obterMaterialCompraCaixa(item) {
    const materialExistente = materiais.find(m => String(m.id) === String(item.material_id));
    const novoNome = (item.novo_material || '').trim();
    return { materialExistente, novoNome };
}

let salvandoCompraCaixa = false;

function caixaDefinirSalvando(salvando) {
    salvandoCompraCaixa = salvando;
    const botao = document.getElementById('btn-salvar-compra-caixa');
    const texto = document.getElementById('btn-salvar-compra-caixa-texto');

    if (botao) botao.disabled = salvando;
    if (texto) texto.innerText = salvando ? 'SALVANDO...' : 'SALVAR COMPRA';
}

async function desfazerCompraCaixa({ compraId, financeiroId, materiaisOriginais = [], materiaisCriados = [] }) {
    if (financeiroId) {
        const { error } = await supabaseClient.from('financeiro').delete().eq('id', financeiroId);
        if (error) console.error('Erro ao remover financeiro no rollback do Caixa:', error);
    }

    if (compraId) {
        const { error: itensError } = await supabaseClient.from('compras_itens').delete().eq('compra_id', compraId);
        if (itensError) console.error('Erro ao remover itens no rollback do Caixa:', itensError);
    }

    for (const material of materiaisOriginais.reverse()) {
        const { error } = await supabaseClient
            .from('materiais')
            .update({
                quantidade: material.quantidade,
                preco_unitario: material.preco_unitario,
                descricao: material.descricao,
            })
            .eq('id', material.id);
        if (error) console.error('Erro ao restaurar material no rollback do Caixa:', error);
    }

    for (const materialId of materiaisCriados.reverse()) {
        const { error } = await supabaseClient.from('materiais').delete().eq('id', materialId);
        if (error) console.error('Erro ao remover material criado no rollback do Caixa:', error);
    }

    if (compraId) {
        const { error: compraError } = await supabaseClient.from('compras').delete().eq('id', compraId);
        if (compraError) console.error('Erro ao remover compra no rollback do Caixa:', compraError);
    }
}

async function salvarCompraCaixa() {
    if (salvandoCompraCaixa) return showToast('A compra já está sendo salva. Aguarde finalizar.', 'error');
    if (!currentUser) return showToast('Faça login para registrar compras.', 'error');

    const fornecedor = document.getElementById('caixa-fornecedor').value.trim();
    const numero_nota = document.getElementById('caixa-numero-nota').value.trim();
    const data_compra = document.getElementById('caixa-data').value || caixaHojeISO();
    const forma_pagamento = document.getElementById('caixa-forma-pagamento').value;
    const observacoes = document.getElementById('caixa-observacoes').value.trim();
    const totais = calcularTotaisCaixa();

    if (!fornecedor) return showToast('Informe o fornecedor.', 'error');
    if (!itensCompraCaixa || itensCompraCaixa.length === 0) return showToast('Adicione pelo menos um item.', 'error');
    if (totais.subtotal <= 0) return showToast('Informe os valores dos itens.', 'error');

    const itensValidos = [];
    for (const item of itensCompraCaixa) {
        const { materialExistente, novoNome } = obterMaterialCompraCaixa(item);
        if (!materialExistente && !novoNome) return showToast('Selecione um material existente ou digite um novo material em todos os itens.', 'error');
        if ((item.quantidade || 0) <= 0) return showToast('Informe quantidade maior que zero em todos os itens.', 'error');
        if ((item.valor_unitario || 0) <= 0) return showToast('Informe valor unitário maior que zero em todos os itens.', 'error');
        itensValidos.push({ ...item, materialExistente, novoNome, valor_total: item.quantidade * item.valor_unitario });
    }

    caixaDefinirSalvando(true);

    let compraId = null;
    let financeiroId = null;
    let referenciaFinanceiraId = null;
    const materiaisOriginais = [];
    const materiaisOriginaisIds = new Set();
    const materiaisCriados = [];

    try {
        const compraPayload = {
            user_id: currentUser.id,
            fornecedor,
            numero_nota: numero_nota || null,
            data_compra,
            forma_pagamento,
            desconto: totais.desconto,
            valor_total: totais.total,
            observacoes: observacoes || null,
        };

        const { data: compra, error: compraError } = await supabaseClient
            .from('compras')
            .insert([compraPayload])
            .select()
            .single();

        if (compraError) throw new Error('Erro ao salvar compra.');
        if (!caixaEhUuid(compra?.id)) throw new Error('Compra salva, mas o ID retornado não é um UUID válido para salvar os itens.');

        compraId = compra.id;

        for (const item of itensValidos) {
            let materialId = item.materialExistente?.id;
            let materialNome = item.materialExistente?.nome || item.novoNome;

            if (item.materialExistente) {
                if (!materiaisOriginaisIds.has(item.materialExistente.id)) {
                    materiaisOriginaisIds.add(item.materialExistente.id);
                    materiaisOriginais.push({
                        id: item.materialExistente.id,
                        quantidade: item.materialExistente.quantidade,
                        preco_unitario: item.materialExistente.preco_unitario,
                        descricao: item.materialExistente.descricao,
                    });
                }

                const novaQuantidade = (parseFloat(item.materialExistente.quantidade) || 0) + item.quantidade;
                const { error: materialError } = await supabaseClient
                    .from('materiais')
                    .update({
                        quantidade: novaQuantidade,
                        preco_unitario: item.valor_unitario,
                        descricao: fornecedor ? `Última compra: ${fornecedor}` : item.materialExistente.descricao,
                    })
                    .eq('id', materialId);

                if (materialError) throw new Error(`Erro ao atualizar estoque de ${materialNome}.`);

                item.materialExistente.quantidade = novaQuantidade;
                item.materialExistente.preco_unitario = item.valor_unitario;
                item.materialExistente.descricao = fornecedor ? `Última compra: ${fornecedor}` : item.materialExistente.descricao;
            } else {
                const { data: novoMaterial, error: novoMaterialError } = await supabaseClient
                    .from('materiais')
                    .insert([{
                        user_id: currentUser.id,
                        nome: item.novoNome,
                        descricao: fornecedor ? `Criado via Caixa. Última compra: ${fornecedor}` : 'Criado via Caixa',
                        quantidade: item.quantidade,
                        unidade: item.unidade || 'unidades',
                        preco_unitario: item.valor_unitario,
                    }])
                    .select()
                    .single();

                if (novoMaterialError) throw new Error(`Erro ao criar material ${item.novoNome}.`);

                materialId = novoMaterial.id;
                materialNome = novoMaterial.nome;
                materiaisCriados.push(materialId);
            }

            if (!caixaEhIdNumerico(materialId)) {
                console.error('Material sem ID numérico para compras_itens:', { materialId, materialNome, item });
                throw new Error(`O material "${materialNome}" não possui ID numérico válido para salvar o item da compra.`);
            }

            if (!referenciaFinanceiraId) referenciaFinanceiraId = materialId;

            const itemPayload = {
                compra_id: compraId,
                material_id: materialId,
                descricao: materialNome,
                quantidade: item.quantidade,
                valor_unitario: item.valor_unitario,
                valor_total: item.valor_total,
            };

            const { error: itemError } = await supabaseClient
                .from('compras_itens')
                .insert([itemPayload]);

            if (itemError) throw new Error(`Erro ao salvar item ${materialNome}.`);
        }

        const financeiroPayload = {
            user_id: currentUser.id,
            tipo: 'SAIDA',
            valor: totais.total,
            descricao: `Compra de materiais${fornecedor ? ' - ' + fornecedor : ''}`,
            categoria: 'Compra de Materiais',
            data_movimentacao: data_compra,
            referencia_id: referenciaFinanceiraId,
        };

        const { data: financeiro, error: finError } = await supabaseClient
            .from('financeiro')
            .insert([financeiroPayload])
            .select('id')
            .single();

        if (finError) throw new Error('Erro ao registrar saída no financeiro.');
        financeiroId = financeiro?.id || null;

        showToast('Compra registrada, estoque atualizado e saída lançada no financeiro!');
        fecharModalCompraCaixa();

        if (typeof carregarMateriais === 'function') await carregarMateriais();
        if (typeof carregarHistorico === 'function') await carregarHistorico();
        await carregarHistoricoComprasCaixa(true);
        novaCompraCaixa(false, false);
    } catch (err) {
        console.error('Erro ao salvar compra no Caixa:', err);
        await desfazerCompraCaixa({ compraId, financeiroId, materiaisOriginais, materiaisCriados });
        showToast(`${err.message || 'Erro ao salvar compra.'} A compra foi desfeita para evitar registros órfãos.`, 'error');
    } finally {
        caixaDefinirSalvando(false);
    }
}

async function carregarHistoricoComprasCaixa(resetar = false) {
    if (resetar) comprasCaixaLimite = 10;
    const container = document.getElementById('lista-compras-caixa');
    const detalhes = document.getElementById('caixa-detalhes-compra');
    if (!container || !currentUser) return;

    container.innerHTML = '<div class="p-6 text-center text-slate-400 font-bold">Carregando compras...</div>';
    if (detalhes) detalhes.innerHTML = '';

    const { data: compras, error } = await supabaseClient
        .from('compras')
        .select('id, fornecedor, data_compra, valor_total, forma_pagamento')
        .eq('user_id', currentUser.id)
        .order('data_compra', { ascending: false })
        .range(0, comprasCaixaLimite);

    if (error) {
        console.error('Erro ao carregar histórico de compras:', error);
        container.innerHTML = '<div class="p-6 text-center text-red-400 font-bold">Erro ao carregar histórico de compras.</div>';
        return;
    }

    if (!compras || compras.length === 0) {
        container.innerHTML = '<div class="p-6 text-center text-slate-400 font-bold">Nenhuma compra registrada ainda.</div>';
        document.getElementById('caixa-historico-acoes')?.classList.add('hidden');
        return;
    }

    const temMaisCompras = compras.length > comprasCaixaLimite;
    const comprasExibidas = temMaisCompras ? compras.slice(0, comprasCaixaLimite) : compras;
    const compraIds = comprasExibidas.map(compra => compra.id);
    const { data: itens, error: itensError } = await supabaseClient
        .from('compras_itens')
        .select('compra_id')
        .in('compra_id', compraIds);

    if (itensError) console.error('Erro ao contar itens das compras:', itensError);

    const contagemItens = (itens || []).reduce((acc, item) => {
        acc[item.compra_id] = (acc[item.compra_id] || 0) + 1;
        return acc;
    }, {});

    container.innerHTML = comprasExibidas.map(compra => `
        <div class="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50 transition-all">
            <div class="grid grid-cols-1 md:grid-cols-5 gap-4 flex-1">
                <div>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fornecedor</p>
                    <p class="font-black text-slate-800">${caixaEscapeHtml(compra.fornecedor || 'Sem fornecedor')}</p>
                </div>
                <div>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</p>
                    <p class="font-bold text-slate-600">${formatDate(compra.data_compra + 'T12:00:00')}</p>
                </div>
                <div>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saída</p>
                    <p class="font-black text-red-500">- ${formatadorMoeda.format(compra.valor_total || 0)}</p>
                </div>
                <div>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Itens</p>
                    <p class="font-bold text-slate-600">${contagemItens[compra.id] || 0}</p>
                </div>
                <div>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pagamento</p>
                    <p class="font-bold text-slate-600">${caixaEscapeHtml(compra.forma_pagamento || '-')}</p>
                </div>
            </div>
            <div class="flex flex-col sm:flex-row gap-2">
                <button onclick="abrirDetalhesCompraCaixa('${compra.id}')" class="px-5 py-3 bg-indigo-50 text-indigo-600 font-black rounded-2xl hover:bg-indigo-100 transition-all flex items-center justify-center gap-2">
                    <i data-lucide="eye" class="w-5 h-5"></i> VER DETALHES
                </button>
                <button onclick="excluirCompraCaixa('${compra.id}')" class="px-5 py-3 bg-red-50 text-red-600 font-black rounded-2xl hover:bg-red-100 transition-all flex items-center justify-center gap-2">
                    <i data-lucide="trash-2" class="w-5 h-5"></i> EXCLUIR
                </button>
            </div>
        </div>
    `).join('');

    const acoesHistorico = document.getElementById('caixa-historico-acoes');
    if (acoesHistorico) acoesHistorico.classList.toggle('hidden', !temMaisCompras);

    if (window.lucide) lucide.createIcons();
}

function verMaisComprasCaixa() {
    comprasCaixaLimite += 10;
    carregarHistoricoComprasCaixa();
}


async function excluirCompraCaixa(compraId) {
    if (!currentUser) return showToast('Faça login para excluir compras.', 'error');
    if (!confirm('Excluir esta compra? O estoque será revertido e o lançamento financeiro vinculado será removido.')) return;

    const { data: compra, error: compraError } = await supabaseClient
        .from('compras')
        .select('*')
        .eq('id', compraId)
        .eq('user_id', currentUser.id)
        .single();

    if (compraError || !compra) {
        console.error('Erro ao buscar compra para exclusão:', compraError);
        return showToast('Não foi possível localizar a compra para excluir.', 'error');
    }

    const { data: itens, error: itensError } = await supabaseClient
        .from('compras_itens')
        .select('*')
        .eq('compra_id', compraId);

    if (itensError) {
        console.error('Erro ao buscar itens da compra para exclusão:', itensError);
        return showToast('Não foi possível carregar os itens da compra para reverter o estoque.', 'error');
    }

    const descricaoFinanceira = `Compra de materiais${compra.fornecedor ? ' - ' + compra.fornecedor : ''}`;
    const referenciaFinanceiraId = (itens || []).find(item => caixaEhIdNumerico(item.material_id))?.material_id || null;
    let financeiroQuery = supabaseClient
        .from('financeiro')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('tipo', 'SAIDA')
        .eq('categoria', 'Compra de Materiais')
        .eq('descricao', descricaoFinanceira)
        .eq('valor', compra.valor_total)
        .eq('data_movimentacao', compra.data_compra);

    if (referenciaFinanceiraId !== null) financeiroQuery = financeiroQuery.eq('referencia_id', referenciaFinanceiraId);

    const { data: financeiros, error: financeiroBuscaError } = await financeiroQuery;
    if (financeiroBuscaError) {
        console.error('Erro ao buscar financeiro da compra:', financeiroBuscaError);
        return showToast('Não foi possível localizar o lançamento financeiro da compra.', 'error');
    }

    const materiaisOriginais = [];
    const itensExcluidos = itens || [];
    const financeirosExcluidos = financeiros || [];
    let estoqueRevertido = false;
    let itensRemovidos = false;
    let financeirosRemovidos = false;

    try {
        for (const item of itensExcluidos) {
            const { data: material, error: materialError } = await supabaseClient
                .from('materiais')
                .select('id, quantidade, preco_unitario, descricao')
                .eq('id', item.material_id)
                .single();

            if (materialError || !material) throw new Error(`Erro ao localizar material ${item.descricao || item.material_id}.`);

            materiaisOriginais.push(material);
            const quantidadeAtual = parseFloat(material.quantidade) || 0;
            const quantidadeCompra = parseFloat(item.quantidade) || 0;
            const novaQuantidade = Math.max(0, quantidadeAtual - quantidadeCompra);

            const { error: updateError } = await supabaseClient
                .from('materiais')
                .update({ quantidade: novaQuantidade })
                .eq('id', item.material_id);

            if (updateError) throw new Error(`Erro ao reverter estoque de ${item.descricao || 'material'}.`);
        }
        estoqueRevertido = true;

        const { error: deleteItensError } = await supabaseClient
            .from('compras_itens')
            .delete()
            .eq('compra_id', compraId);
        if (deleteItensError) throw new Error('Erro ao remover itens da compra.');
        itensRemovidos = true;

        for (const financeiro of financeirosExcluidos) {
            const { error: deleteFinError } = await supabaseClient
                .from('financeiro')
                .delete()
                .eq('id', financeiro.id);
            if (deleteFinError) throw new Error('Erro ao remover lançamento financeiro da compra.');
        }
        financeirosRemovidos = true;

        const { error: deleteCompraError } = await supabaseClient
            .from('compras')
            .delete()
            .eq('id', compraId)
            .eq('user_id', currentUser.id);
        if (deleteCompraError) throw new Error('Erro ao remover compra.');

        showToast('Compra excluída, estoque revertido e financeiro removido.');
        if (typeof carregarMateriais === 'function') await carregarMateriais();
        if (typeof carregarHistorico === 'function') await carregarHistorico();
        await carregarHistoricoComprasCaixa(true);
    } catch (err) {
        console.error('Erro ao excluir compra no Caixa:', err);

        if (estoqueRevertido) {
            for (const material of materiaisOriginais.reverse()) {
                await supabaseClient
                    .from('materiais')
                    .update({ quantidade: material.quantidade, preco_unitario: material.preco_unitario, descricao: material.descricao })
                    .eq('id', material.id);
            }
        }

        if (itensRemovidos && itensExcluidos.length > 0) await supabaseClient.from('compras_itens').insert(itensExcluidos);
        if (financeirosRemovidos && financeirosExcluidos.length > 0) await supabaseClient.from('financeiro').insert(financeirosExcluidos);

        showToast(`${err.message || 'Erro ao excluir compra.'} A exclusão foi revertida quando possível.`, 'error');
    }
}

function fecharDetalhesCompraCaixa() { document.getElementById('modal-caixa-detalhes')?.classList.add('hidden'); }

async function abrirDetalhesCompraCaixa(compraId) {
    const detalhes = document.getElementById('caixa-detalhes-compra');
    if (!detalhes) return;

    document.getElementById('modal-caixa-detalhes')?.classList.remove('hidden');
    detalhes.innerHTML = '<div class="text-center text-slate-400 font-bold">Carregando itens da compra...</div>';

    const { data: itens, error } = await supabaseClient
        .from('compras_itens')
        .select('descricao, quantidade, valor_unitario, valor_total')
        .eq('compra_id', compraId)
        .order('id', { ascending: true });

    if (error) {
        console.error('Erro ao carregar detalhes da compra:', error);
        detalhes.innerHTML = '<div class="text-center text-red-400 font-bold">Erro ao carregar itens da compra.</div>';
        return;
    }

    detalhes.innerHTML = `
        <div class="flex items-center justify-between gap-4 mb-4">
            <h4 class="text-lg font-black text-slate-800">Detalhes da Compra</h4>
            <button onclick="fecharDetalhesCompraCaixa()" class="p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-white transition-all">
                <i data-lucide="x" class="w-5 h-5"></i>
            </button>
        </div>
        <div class="overflow-x-auto bg-white border border-slate-100 rounded-2xl">
            <table class="w-full">
                <thead class="bg-slate-50 border-b border-slate-100">
                    <tr>
                        <th class="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Material</th>
                        <th class="px-4 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantidade</th>
                        <th class="px-4 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Unit.</th>
                        <th class="px-4 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${(itens || []).map(item => `
                        <tr class="border-b border-slate-50 last:border-0">
                            <td class="px-4 py-3 font-bold text-slate-700">${caixaEscapeHtml(item.descricao || '-')}</td>
                            <td class="px-4 py-3 text-right font-bold text-slate-600">${parseFloat(item.quantidade || 0).toFixed(4).replace(/\.0+$/, '')}</td>
                            <td class="px-4 py-3 text-right font-bold text-slate-600">${formatadorMoeda.format(item.valor_unitario || 0)}</td>
                            <td class="px-4 py-3 text-right font-black text-red-500">- ${formatadorMoeda.format(item.valor_total || 0)}</td>
                        </tr>
                    `).join('') || '<tr><td colspan="4" class="px-4 py-6 text-center text-slate-400 font-bold">Nenhum item encontrado.</td></tr>'}
                </tbody>
            </table>
        </div>
    `;

    if (window.lucide) lucide.createIcons();
}

// ====================== PEDIDOS DE VENDA NO CAIXA ======================

function criarItemPedidoVendaCaixa() {
    return {
        id: Date.now() + Math.floor(Math.random() * 1000),
        peca_id: '',
        descricao: '',
        quantidade: 1,
        valor_unitario: 0,
    };
}

function novoPedidoVendaCaixa(abrirModal = false) {
    itensPedidoVendaCaixa = [];

    const campos = {
        'pedido-cliente': '',
        'pedido-data': caixaHojeISO(),
        'pedido-forma-pagamento': 'Pix',
        'pedido-desconto': '0',
        'pedido-valor-pago': '0',
        'pedido-observacoes': '',
    };

    Object.entries(campos).forEach(([id, valor]) => {
        const campo = document.getElementById(id);
        if (campo) {
            campo.value = valor;
            if (id === 'pedido-valor-pago') delete campo.dataset.editado;
        }
    });

    adicionarItemPedidoVendaCaixa(false);
    if (abrirModal) document.getElementById('modal-caixa-pedido')?.classList.remove('hidden');
}

function fecharModalPedidoVendaCaixa() { document.getElementById('modal-caixa-pedido')?.classList.add('hidden'); }

function adicionarItemPedidoVendaCaixa(recalcular = true) {
    itensPedidoVendaCaixa.push(criarItemPedidoVendaCaixa());
    renderizarItensPedidoVendaCaixa();
    if (recalcular) calcularTotaisPedidoVendaCaixa();
}

function removerItemPedidoVendaCaixa(id) {
    if (itensPedidoVendaCaixa.length === 1) return showToast('O pedido precisa ter pelo menos um item.', 'error');
    itensPedidoVendaCaixa = itensPedidoVendaCaixa.filter(item => item.id !== id);
    renderizarItensPedidoVendaCaixa();
    calcularTotaisPedidoVendaCaixa();
}

async function obterPrecoPedidoVendaCaixa(peca, formaPagamento = '') {
    const precoAtual = caixaNumero(peca?.preco_venda);
    if (!currentUser || !peca?.id) return precoAtual;

    try {
        const { data: precificacao, error } = await supabaseClient
            .from('precificacoes')
            .select('id')
            .eq('user_id', currentUser.id)
            .eq('peca_id', peca.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error || !precificacao?.id) return precoAtual;

        const forma = String(formaPagamento || '').toLowerCase();
        const mapaForma = forma.includes('dinheiro') ? 'dinheiro'
            : forma.includes('pix') ? 'pix'
            : forma.includes('débito') || forma.includes('debito') ? 'débito'
            : forma.includes('crédito') || forma.includes('credito') ? 'crédito 1x'
            : '';

        let query = supabaseClient
            .from('precificacao_resultados')
            .select('meio_venda, preco_final')
            .eq('precificacao_id', precificacao.id)
            .order('preco_final', { ascending: true });

        const { data: resultados, error: resultadosError } = await query;
        if (resultadosError || !resultados?.length) return precoAtual;

        const recomendado = mapaForma
            ? resultados.find(r => String(r.meio_venda || '').toLowerCase().includes(mapaForma))
            : resultados[0];
        return caixaNumero((recomendado || resultados[0]).preco_final) || precoAtual;
    } catch (err) {
        console.error('Erro ao buscar preço recomendado da precificação:', err);
        return precoAtual;
    }
}

async function atualizarItemPedidoVendaCaixa(id, campo, valor) {
    const item = itensPedidoVendaCaixa.find(i => i.id === id);
    if (!item) return;

    if (campo === 'peca_id') {
        item.peca_id = valor;
        const peca = pecasCatalogo.find(p => String(p.id) === String(valor));
        item.descricao = peca?.nome || '';
        item.valor_unitario = peca ? await obterPrecoPedidoVendaCaixa(peca, document.getElementById('pedido-forma-pagamento')?.value) : 0;
        renderizarItensPedidoVendaCaixa();
        calcularTotaisPedidoVendaCaixa();
        return;
    }

    if (['quantidade', 'valor_unitario'].includes(campo)) item[campo] = caixaNumero(valor);
    else item[campo] = valor;

    const totalEl = document.getElementById(`pedido-item-total-${id}`);
    if (totalEl) totalEl.innerText = formatadorMoeda.format((item.quantidade || 0) * (item.valor_unitario || 0));
    calcularTotaisPedidoVendaCaixa();
}

async function atualizarPrecosItensPedidoVendaCaixa() {
    for (const item of itensPedidoVendaCaixa) {
        const peca = pecasCatalogo.find(p => String(p.id) === String(item.peca_id));
        if (peca) item.valor_unitario = await obterPrecoPedidoVendaCaixa(peca, document.getElementById('pedido-forma-pagamento')?.value);
    }
    renderizarItensPedidoVendaCaixa();
    calcularTotaisPedidoVendaCaixa();
}

function renderizarItensPedidoVendaCaixa() {
    const container = document.getElementById('pedido-itens');
    if (!container) return;

    if (!Array.isArray(itensPedidoVendaCaixa)) itensPedidoVendaCaixa = [];
    if (itensPedidoVendaCaixa.length === 0) itensPedidoVendaCaixa.push(criarItemPedidoVendaCaixa());

    const opcoesPecas = (pecasCatalogo || []).map(p => `
        <option value="${p.id}">${caixaEscapeHtml(p.nome)} (${parseInt(p.quantidade) || 0} disp.) - ${formatadorMoeda.format(p.preco_venda || 0)}</option>
    `).join('');

    container.innerHTML = itensPedidoVendaCaixa.map((item, index) => `
        <div class="p-5 space-y-4" data-pedido-item="${item.id}">
            <div class="flex items-center justify-between gap-3">
                <p class="text-xs font-black text-slate-400 uppercase tracking-widest">Item ${index + 1}</p>
                <button onclick="removerItemPedidoVendaCaixa(${item.id})" class="p-2 text-slate-300 hover:text-red-500 rounded-xl hover:bg-red-50 transition-all" title="Remover item">
                    <i data-lucide="trash-2" class="w-5 h-5"></i>
                </button>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                <div class="lg:col-span-5 space-y-1">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Peça</label>
                    <select onchange="atualizarItemPedidoVendaCaixa(${item.id}, 'peca_id', this.value)" class="w-full p-3 bg-white border-2 border-slate-200 rounded-2xl outline-none focus:border-indigo-600 font-bold text-slate-700 text-sm">
                        <option value="">Selecione uma peça...</option>
                        ${opcoesPecas}
                    </select>
                </div>
                <div class="lg:col-span-2 space-y-1">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Qtd</label>
                    <input type="number" min="1" step="1" value="${item.quantidade}" oninput="atualizarItemPedidoVendaCaixa(${item.id}, 'quantidade', this.value)" class="w-full p-3 bg-white border-2 border-slate-200 rounded-2xl outline-none focus:border-indigo-600 font-bold text-slate-700 text-sm">
                </div>
                <div class="lg:col-span-2 space-y-1">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit.</label>
                    <input type="number" min="0" step="0.01" value="${item.valor_unitario}" oninput="atualizarItemPedidoVendaCaixa(${item.id}, 'valor_unitario', this.value)" class="w-full p-3 bg-white border-2 border-slate-200 rounded-2xl outline-none focus:border-indigo-600 font-bold text-slate-700 text-sm">
                </div>
                <div class="lg:col-span-3 bg-emerald-50 border border-emerald-100 rounded-2xl p-3 text-right">
                    <p class="text-[10px] font-black text-emerald-600 uppercase">Total</p>
                    <p id="pedido-item-total-${item.id}" class="font-black text-emerald-700 text-sm">${formatadorMoeda.format((item.quantidade || 0) * (item.valor_unitario || 0))}</p>
                </div>
            </div>
        </div>
    `).join('');

    itensPedidoVendaCaixa.forEach(item => {
        const select = container.querySelector(`[data-pedido-item="${item.id}"] select`);
        if (select) select.value = item.peca_id || '';
    });

    if (window.lucide) lucide.createIcons();
    calcularTotaisPedidoVendaCaixa();
}

function calcularTotaisPedidoVendaCaixa() {
    const subtotal = (itensPedidoVendaCaixa || []).reduce((acc, item) => acc + ((item.quantidade || 0) * (item.valor_unitario || 0)), 0);
    const desconto = Math.min(caixaNumero(document.getElementById('pedido-desconto')?.value), subtotal);
    const total = Math.max(0, subtotal - desconto);
    const valorPagoInput = document.getElementById('pedido-valor-pago');
    if (valorPagoInput && (!valorPagoInput.dataset.editado || valorPagoInput.value === '0')) valorPagoInput.value = total.toFixed(2);
    const valorPago = Math.min(caixaNumero(valorPagoInput?.value), total);

    const subtotalEl = document.getElementById('pedido-subtotal');
    const descontoEl = document.getElementById('pedido-desconto-exibir');
    const totalEl = document.getElementById('pedido-total');
    const valorPagoEl = document.getElementById('pedido-valor-pago-exibir');

    if (subtotalEl) subtotalEl.innerText = formatadorMoeda.format(subtotal);
    if (descontoEl) descontoEl.innerText = `- ${formatadorMoeda.format(desconto)}`;
    if (totalEl) totalEl.innerText = formatadorMoeda.format(total);
    if (valorPagoEl) valorPagoEl.innerText = formatadorMoeda.format(valorPago);

    return { subtotal, desconto, total, valorPago };
}

function pedidoVendaCaixaDefinirSalvando(salvando) {
    salvandoPedidoVendaCaixa = salvando;
    const botao = document.getElementById('btn-salvar-pedido-caixa');
    const texto = document.getElementById('btn-salvar-pedido-caixa-texto');
    if (botao) botao.disabled = salvando;
    if (texto) texto.innerText = salvando ? 'SALVANDO...' : 'SALVAR PEDIDO';
}

async function desfazerPedidoVendaCaixa({ pedidoId, financeiroId, pecasOriginais = [] }) {
    if (financeiroId) await supabaseClient.from('financeiro').delete().eq('id', financeiroId);
    if (pedidoId) await supabaseClient.from('pedidos_venda_itens').delete().eq('pedido_id', pedidoId);

    for (const peca of pecasOriginais.reverse()) {
        const { error } = await supabaseClient.from('pecas').update({ quantidade: peca.quantidade }).eq('id', peca.id);
        if (error) console.error('Erro ao restaurar peça no rollback do pedido:', error);
    }

    if (pedidoId) await supabaseClient.from('pedidos_venda').delete().eq('id', pedidoId);
}

async function salvarPedidoVendaCaixa() {
    if (salvandoPedidoVendaCaixa) return showToast('O pedido já está sendo salvo. Aguarde finalizar.', 'error');
    if (!currentUser) return showToast('Faça login para registrar pedidos.', 'error');

    const cliente = document.getElementById('pedido-cliente').value.trim() || 'Cliente Sem Nome';
    const data_venda = document.getElementById('pedido-data').value || caixaHojeISO();
    const forma_pagamento = document.getElementById('pedido-forma-pagamento').value;
    const observacoes = document.getElementById('pedido-observacoes').value.trim();
    const totais = calcularTotaisPedidoVendaCaixa();

    if (!itensPedidoVendaCaixa || itensPedidoVendaCaixa.length === 0) return showToast('Adicione pelo menos um item ao pedido.', 'error');
    if (totais.subtotal <= 0) return showToast('Informe os valores dos itens.', 'error');

    const itensValidos = [];
    for (const item of itensPedidoVendaCaixa) {
        const pecaId = Number(item.peca_id);
        if (!Number.isFinite(pecaId) || !Number.isInteger(pecaId) || pecaId <= 0) return showToast('Selecione uma peça válida em todos os itens. O peca_id deve ser numérico.', 'error');
        const peca = pecasCatalogo.find(p => Number(p.id) === pecaId);
        if (!peca) return showToast('Selecione uma peça existente em todos os itens.', 'error');
        const quantidade = parseInt(item.quantidade) || 0;
        if (quantidade <= 0) return showToast('Informe quantidade maior que zero em todos os itens.', 'error');
        if ((item.valor_unitario || 0) <= 0) return showToast('Informe valor unitário maior que zero em todos os itens.', 'error');
        itensValidos.push({ ...item, peca_id: pecaId, peca, quantidade, valor_total: quantidade * item.valor_unitario });
    }

    const totaisPorPeca = itensValidos.reduce((acc, item) => {
        acc[item.peca_id] = (acc[item.peca_id] || 0) + item.quantidade;
        return acc;
    }, {});

    for (const [pecaId, quantidade] of Object.entries(totaisPorPeca)) {
        const peca = pecasCatalogo.find(p => String(p.id) === String(pecaId));
        const disponivel = parseInt(peca?.quantidade) || 0;
        if (disponivel < quantidade) return showToast(`Estoque insuficiente de "${peca?.nome || 'peça'}". Disponível: ${disponivel}.`, 'error');
    }

    pedidoVendaCaixaDefinirSalvando(true);

    let pedidoId = null;
    let financeiroId = null;
    const pecasOriginais = [];
    const pecasOriginaisIds = new Set();

    try {
        const pedidoPayload = {
            user_id: currentUser.id,
            cliente,
            data_venda,
            forma_pagamento,
            desconto: totais.desconto,
            valor_total: totais.total,
            valor_pago: totais.valorPago || totais.total,
            observacoes: observacoes || null,
        };

        const { data: pedidoCriado, error: pedidoError } = await supabaseClient
            .from('pedidos_venda')
            .insert([pedidoPayload])
            .select()
            .single();
        if (pedidoError) throw new Error('Erro ao salvar pedido de venda.');
        if (!caixaEhUuid(pedidoCriado?.id)) throw new Error('Pedido salvo, mas o ID retornado não é um UUID válido para salvar os itens.');
        pedidoId = pedidoCriado.id;

        for (const item of itensValidos) {
            if (!pecasOriginaisIds.has(item.peca.id)) {
                pecasOriginaisIds.add(item.peca.id);
                pecasOriginais.push({ id: item.peca.id, quantidade: item.peca.quantidade });
            }

            const pecaAtual = pecasCatalogo.find(p => Number(p.id) === item.peca_id);
            const novaQuantidade = (parseInt(pecaAtual.quantidade) || 0) - item.quantidade;
            const { error: pecaError } = await supabaseClient
                .from('pecas')
                .update({ quantidade: novaQuantidade })
                .eq('id', item.peca_id);
            if (pecaError) throw new Error(`Erro ao baixar estoque de ${item.peca.nome}.`);
            pecaAtual.quantidade = novaQuantidade;

            const descricao = item.peca.nome;
            const quantidade = item.quantidade;
            const valor_unitario = item.valor_unitario;
            const valor_total = item.valor_total;
            const payloadItemPedido = {
                pedido_id: pedidoCriado.id,
                peca_id: Number(item.peca_id || item.id),
                descricao,
                quantidade,
                valor_unitario,
                valor_total
            };
            if (!Number.isFinite(payloadItemPedido.peca_id) || !Number.isInteger(payloadItemPedido.peca_id) || payloadItemPedido.peca_id <= 0) {
                throw new Error(`Peça inválida no item ${descricao || 'sem descrição'}: peca_id deve ser um número válido.`);
            }

            const { error: itemError } = await supabaseClient
                .from('pedidos_venda_itens')
                .insert([payloadItemPedido]);

            if (itemError) {
                console.error('Erro ao salvar item do pedido:', {
                    item,
                    payloadItemPedido,
                    code: itemError?.code,
                    message: itemError?.message,
                    details: itemError?.details,
                    hint: itemError?.hint,
                    error: itemError,
                });

                throw new Error(
                    `Erro ao salvar item ${item.descricao || item.peca?.nome || 'sem descrição'}: ${itemError?.message || 'erro desconhecido'}`
                );
            }
        }

        const valorFinanceiro = totais.valorPago || totais.total;
        const descricaoFinanceira = `Pedido de venda - ${cliente}`;
        const { data: financeiro, error: finError } = await supabaseClient
            .from('financeiro')
            .insert([{
                user_id: currentUser.id,
                tipo: 'ENTRADA',
                categoria: 'Venda de Peça',
                descricao: descricaoFinanceira,
                valor: valorFinanceiro,
                data_movimentacao: data_venda,
            }])
            .select('id')
            .single();
        if (finError) {
            console.error('Erro ao registrar entrada financeira do pedido:', finError);
            throw new Error(`Erro ao registrar entrada no financeiro: ${finError?.message || 'erro desconhecido'}.`);
        }
        financeiroId = financeiro?.id || null;

        showToast('Pedido registrado, estoque baixado e entrada lançada no financeiro!');
        fecharModalPedidoVendaCaixa();
        if (typeof carregarCatalogo === 'function') await carregarCatalogo();
        if (typeof carregarHistorico === 'function') await carregarHistorico();
        await carregarHistoricoPedidosVendaCaixa(true);
        novoPedidoVendaCaixa(false);
    } catch (err) {
        console.error('Erro ao salvar pedido de venda no Caixa:', err);
        await desfazerPedidoVendaCaixa({ pedidoId, financeiroId, pecasOriginais });
        showToast(`${err.message || 'Erro ao salvar pedido.'} O pedido foi desfeito para evitar registros órfãos.`, 'error');
    } finally {
        pedidoVendaCaixaDefinirSalvando(false);
    }
}

async function carregarHistoricoPedidosVendaCaixa(resetar = false) {
    if (resetar) pedidosVendaCaixaLimite = 10;
    const container = document.getElementById('lista-pedidos-caixa');
    const detalhes = document.getElementById('caixa-detalhes-pedido');
    if (!container || !currentUser) return;

    container.innerHTML = '<div class="p-6 text-center text-slate-400 font-bold">Carregando pedidos...</div>';
    if (detalhes) detalhes.innerHTML = '';

    const { data: pedidos, error } = await supabaseClient
        .from('pedidos_venda')
        .select('id, cliente, data_venda, valor_total, valor_pago, forma_pagamento')
        .eq('user_id', currentUser.id)
        .order('data_venda', { ascending: false })
        .range(0, pedidosVendaCaixaLimite);

    if (error) {
        console.error('Erro ao carregar histórico de pedidos:', error);
        container.innerHTML = '<div class="p-6 text-center text-red-400 font-bold">Erro ao carregar histórico de pedidos.</div>';
        return;
    }

    if (!pedidos || pedidos.length === 0) {
        container.innerHTML = '<div class="p-6 text-center text-slate-400 font-bold">Nenhum pedido registrado ainda.</div>';
        document.getElementById('pedido-historico-acoes')?.classList.add('hidden');
        return;
    }

    const temMaisPedidos = pedidos.length > pedidosVendaCaixaLimite;
    const pedidosExibidos = temMaisPedidos ? pedidos.slice(0, pedidosVendaCaixaLimite) : pedidos;
    const pedidoIds = pedidosExibidos.map(pedido => pedido.id);
    const { data: itens, error: itensError } = await supabaseClient
        .from('pedidos_venda_itens')
        .select('pedido_id')
        .in('pedido_id', pedidoIds);

    if (itensError) console.error('Erro ao contar itens dos pedidos:', itensError);

    const contagemItens = (itens || []).reduce((acc, item) => {
        acc[item.pedido_id] = (acc[item.pedido_id] || 0) + 1;
        return acc;
    }, {});

    container.innerHTML = pedidosExibidos.map(pedido => `
        <div class="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50 transition-all">
            <div class="grid grid-cols-1 md:grid-cols-5 gap-4 flex-1">
                <div>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</p>
                    <p class="font-black text-slate-800">${caixaEscapeHtml(pedido.cliente || 'Cliente Sem Nome')}</p>
                </div>
                <div>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</p>
                    <p class="font-bold text-slate-600">${formatDate(pedido.data_venda + 'T12:00:00')}</p>
                </div>
                <div>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entrada</p>
                    <p class="font-black text-emerald-600">+ ${formatadorMoeda.format(pedido.valor_pago || pedido.valor_total || 0)}</p>
                </div>
                <div>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Itens</p>
                    <p class="font-bold text-slate-600">${contagemItens[pedido.id] || 0}</p>
                </div>
                <div>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pagamento</p>
                    <p class="font-bold text-slate-600">${caixaEscapeHtml(pedido.forma_pagamento || '-')}</p>
                </div>
            </div>
            <div class="flex flex-col sm:flex-row gap-2">
                <button onclick="abrirDetalhesPedidoVendaCaixa('${pedido.id}')" class="px-5 py-3 bg-indigo-50 text-indigo-600 font-black rounded-2xl hover:bg-indigo-100 transition-all flex items-center justify-center gap-2">
                    <i data-lucide="eye" class="w-5 h-5"></i> VER DETALHES
                </button>
                <button onclick="excluirPedidoVendaCaixa('${pedido.id}')" class="px-5 py-3 bg-red-50 text-red-600 font-black rounded-2xl hover:bg-red-100 transition-all flex items-center justify-center gap-2">
                    <i data-lucide="trash-2" class="w-5 h-5"></i> EXCLUIR
                </button>
            </div>
        </div>
    `).join('');

    const acoesHistorico = document.getElementById('pedido-historico-acoes');
    if (acoesHistorico) acoesHistorico.classList.toggle('hidden', !temMaisPedidos);
    if (window.lucide) lucide.createIcons();
}

function verMaisPedidosVendaCaixa() {
    pedidosVendaCaixaLimite += 10;
    carregarHistoricoPedidosVendaCaixa();
}

function fecharDetalhesPedidoVendaCaixa() { document.getElementById('modal-caixa-pedido-detalhes')?.classList.add('hidden'); }

async function abrirDetalhesPedidoVendaCaixa(pedidoId) {
    const detalhes = document.getElementById('caixa-detalhes-pedido');
    if (!detalhes) return;

    document.getElementById('modal-caixa-pedido-detalhes')?.classList.remove('hidden');
    detalhes.innerHTML = '<div class="text-center text-slate-400 font-bold">Carregando detalhes do pedido...</div>';

    const { data: pedido, error: pedidoError } = await supabaseClient
        .from('pedidos_venda')
        .select('*')
        .eq('id', pedidoId)
        .eq('user_id', currentUser.id)
        .single();

    const { data: itens, error: itensError } = await supabaseClient
        .from('pedidos_venda_itens')
        .select('descricao, quantidade, valor_unitario, valor_total')
        .eq('pedido_id', pedidoId)
        .order('id', { ascending: true });

    if (pedidoError || itensError) {
        console.error('Erro ao carregar detalhes do pedido:', pedidoError || itensError);
        detalhes.innerHTML = '<div class="text-center text-red-400 font-bold">Erro ao carregar detalhes do pedido.</div>';
        return;
    }

    detalhes.innerHTML = `
        <div class="flex items-center justify-between gap-4 mb-4">
            <div>
                <h4 class="text-lg font-black text-slate-800">Detalhes do Pedido</h4>
                <p class="text-xs text-slate-400 font-bold">${caixaEscapeHtml(pedido.cliente || 'Cliente Sem Nome')} • ${formatDate(pedido.data_venda + 'T12:00:00')}</p>
            </div>
            <button onclick="fecharDetalhesPedidoVendaCaixa()" class="p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-white transition-all">
                <i data-lucide="x" class="w-5 h-5"></i>
            </button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <div class="p-3 bg-slate-50 rounded-2xl"><p class="text-[10px] font-black text-slate-400 uppercase">Pagamento</p><p class="font-black text-slate-700">${caixaEscapeHtml(pedido.forma_pagamento || '-')}</p></div>
            <div class="p-3 bg-red-50 rounded-2xl"><p class="text-[10px] font-black text-red-400 uppercase">Desconto</p><p class="font-black text-red-600">- ${formatadorMoeda.format(pedido.desconto || 0)}</p></div>
            <div class="p-3 bg-emerald-50 rounded-2xl"><p class="text-[10px] font-black text-emerald-500 uppercase">Total</p><p class="font-black text-emerald-700">${formatadorMoeda.format(pedido.valor_total || 0)}</p></div>
            <div class="p-3 bg-emerald-50 rounded-2xl"><p class="text-[10px] font-black text-emerald-500 uppercase">Valor Pago</p><p class="font-black text-emerald-700">${formatadorMoeda.format(pedido.valor_pago || 0)}</p></div>
        </div>
        ${pedido.observacoes ? `<div class="mb-5 p-4 bg-slate-50 rounded-2xl text-sm font-bold text-slate-600"><span class="text-slate-400 uppercase text-[10px] font-black block mb-1">Observações</span>${caixaEscapeHtml(pedido.observacoes)}</div>` : ''}
        <div class="overflow-x-auto bg-white border border-slate-100 rounded-2xl">
            <table class="w-full">
                <thead class="bg-slate-50 border-b border-slate-100">
                    <tr>
                        <th class="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Peça</th>
                        <th class="px-4 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantidade</th>
                        <th class="px-4 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Unit.</th>
                        <th class="px-4 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${(itens || []).map(item => `
                        <tr class="border-b border-slate-50 last:border-0">
                            <td class="px-4 py-3 font-bold text-slate-700">${caixaEscapeHtml(item.descricao || '-')}</td>
                            <td class="px-4 py-3 text-right font-bold text-slate-600">${caixaFormatarQuantidade(item.quantidade)}</td>
                            <td class="px-4 py-3 text-right font-bold text-slate-600">${formatadorMoeda.format(item.valor_unitario || 0)}</td>
                            <td class="px-4 py-3 text-right font-black text-emerald-600">+ ${formatadorMoeda.format(item.valor_total || 0)}</td>
                        </tr>
                    `).join('') || '<tr><td colspan="4" class="px-4 py-6 text-center text-slate-400 font-bold">Nenhum item encontrado.</td></tr>'}
                </tbody>
            </table>
        </div>
    `;

    if (window.lucide) lucide.createIcons();
}

async function excluirPedidoVendaCaixa(pedidoId) {
    if (!currentUser) return showToast('Faça login para excluir pedidos.', 'error');
    if (!confirm('Excluir este pedido? O estoque será restaurado e a entrada financeira vinculada será removida.')) return;

    const { data: pedido, error: pedidoError } = await supabaseClient
        .from('pedidos_venda')
        .select('*')
        .eq('id', pedidoId)
        .eq('user_id', currentUser.id)
        .single();
    if (pedidoError || !pedido) return showToast('Não foi possível localizar o pedido para excluir.', 'error');

    const { data: itens, error: itensError } = await supabaseClient.from('pedidos_venda_itens').select('*').eq('pedido_id', pedidoId);
    if (itensError) return showToast('Não foi possível carregar os itens do pedido.', 'error');

    const descricaoFinanceira = `Pedido de venda - ${pedido.cliente || 'Cliente Sem Nome'}`;
    const valorFinanceiro = pedido.valor_pago || pedido.valor_total;
    const { data: financeiros, error: finBuscaError } = await supabaseClient
        .from('financeiro')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('tipo', 'ENTRADA')
        .eq('categoria', 'Venda de Peça')
        .eq('descricao', descricaoFinanceira)
        .eq('valor', valorFinanceiro)
        .eq('data_movimentacao', pedido.data_venda);
    if (finBuscaError) return showToast('Não foi possível localizar a entrada financeira do pedido.', 'error');

    const pecasOriginais = [];
    const pecasOriginaisIds = new Set();
    const itensExcluidos = itens || [];
    const financeirosExcluidos = financeiros || [];
    let estoqueRestaurado = false;
    let itensRemovidos = false;
    let financeirosRemovidos = false;

    try {
        for (const item of itensExcluidos) {
            const pecaId = Number(item.peca_id);
            if (!Number.isFinite(pecaId) || !Number.isInteger(pecaId) || pecaId <= 0) {
                throw new Error(`Peça inválida no item ${item.descricao || 'sem descrição'}: peca_id deve ser um número válido.`);
            }
            const { data: peca, error: pecaError } = await supabaseClient
                .from('pecas')
                .select('id, quantidade')
                .eq('id', pecaId)
                .single();
            if (pecaError || !peca) throw new Error(`Erro ao localizar peça ${item.descricao || pecaId}.`);

            if (!pecasOriginaisIds.has(peca.id)) {
                pecasOriginaisIds.add(peca.id);
                pecasOriginais.push({ id: peca.id, quantidade: peca.quantidade });
            }

            const novaQuantidade = (parseInt(peca.quantidade) || 0) + (parseInt(item.quantidade) || 0);
            const { error: updateError } = await supabaseClient.from('pecas').update({ quantidade: novaQuantidade }).eq('id', pecaId);
            if (updateError) throw new Error(`Erro ao restaurar estoque de ${item.descricao || 'peça'}.`);
        }
        estoqueRestaurado = true;

        const { error: deleteItensError } = await supabaseClient.from('pedidos_venda_itens').delete().eq('pedido_id', pedidoId);
        if (deleteItensError) throw new Error('Erro ao remover itens do pedido.');
        itensRemovidos = true;

        for (const financeiro of financeirosExcluidos) {
            const { error: deleteFinError } = await supabaseClient.from('financeiro').delete().eq('id', financeiro.id);
            if (deleteFinError) throw new Error('Erro ao remover entrada financeira do pedido.');
        }
        financeirosRemovidos = true;

        const { error: deletePedidoError } = await supabaseClient.from('pedidos_venda').delete().eq('id', pedidoId).eq('user_id', currentUser.id);
        if (deletePedidoError) throw new Error('Erro ao remover pedido.');

        showToast('Pedido excluído, estoque restaurado e financeiro removido.');
        if (typeof carregarCatalogo === 'function') await carregarCatalogo();
        if (typeof carregarHistorico === 'function') await carregarHistorico();
        await carregarHistoricoPedidosVendaCaixa(true);
    } catch (err) {
        console.error('Erro ao excluir pedido de venda no Caixa:', err);

        if (estoqueRestaurado) {
            for (const peca of pecasOriginais.reverse()) await supabaseClient.from('pecas').update({ quantidade: peca.quantidade }).eq('id', peca.id);
        }
        if (itensRemovidos && itensExcluidos.length > 0) await supabaseClient.from('pedidos_venda_itens').insert(itensExcluidos);
        if (financeirosRemovidos && financeirosExcluidos.length > 0) await supabaseClient.from('financeiro').insert(financeirosExcluidos);

        showToast(`${err.message || 'Erro ao excluir pedido.'} A exclusão foi revertida quando possível.`, 'error');
    }
}
