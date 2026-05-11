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
}

function novaCompraCaixa(recarregar = true) {
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
}

function caixaAtualizarSelectsMateriais() {
    renderizarItensCompraCaixa();
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
    if (totalEl) totalEl.innerText = formatadorMoeda.format(total);

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

        if (typeof carregarMateriais === 'function') await carregarMateriais();
        if (typeof carregarHistorico === 'function') await carregarHistorico();
        await carregarHistoricoComprasCaixa();
        novaCompraCaixa(false);
    } catch (err) {
        console.error('Erro ao salvar compra no Caixa:', err);
        await desfazerCompraCaixa({ compraId, financeiroId, materiaisOriginais, materiaisCriados });
        showToast(`${err.message || 'Erro ao salvar compra.'} A compra foi desfeita para evitar registros órfãos.`, 'error');
    } finally {
        caixaDefinirSalvando(false);
    }
}

async function carregarHistoricoComprasCaixa() {
    const container = document.getElementById('lista-compras-caixa');
    const detalhes = document.getElementById('caixa-detalhes-compra');
    if (!container || !currentUser) return;

    container.innerHTML = '<div class="p-6 text-center text-slate-400 font-bold">Carregando compras...</div>';
    if (detalhes) detalhes.classList.add('hidden');

    const { data: compras, error } = await supabaseClient
        .from('compras')
        .select('id, fornecedor, data_compra, valor_total, forma_pagamento')
        .eq('user_id', currentUser.id)
        .order('data_compra', { ascending: false });

    if (error) {
        console.error('Erro ao carregar histórico de compras:', error);
        container.innerHTML = '<div class="p-6 text-center text-red-400 font-bold">Erro ao carregar histórico de compras.</div>';
        return;
    }

    if (!compras || compras.length === 0) {
        container.innerHTML = '<div class="p-6 text-center text-slate-400 font-bold">Nenhuma compra registrada ainda.</div>';
        return;
    }

    const compraIds = compras.map(compra => compra.id);
    const { data: itens, error: itensError } = await supabaseClient
        .from('compras_itens')
        .select('compra_id')
        .in('compra_id', compraIds);

    if (itensError) console.error('Erro ao contar itens das compras:', itensError);

    const contagemItens = (itens || []).reduce((acc, item) => {
        acc[item.compra_id] = (acc[item.compra_id] || 0) + 1;
        return acc;
    }, {});

    container.innerHTML = compras.map(compra => `
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
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor</p>
                    <p class="font-black text-emerald-600">${formatadorMoeda.format(compra.valor_total || 0)}</p>
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
            <button onclick="abrirDetalhesCompraCaixa('${compra.id}')" class="px-5 py-3 bg-indigo-50 text-indigo-600 font-black rounded-2xl hover:bg-indigo-100 transition-all flex items-center justify-center gap-2">
                <i data-lucide="eye" class="w-5 h-5"></i> VER DETALHES
            </button>
        </div>
    `).join('');

    if (window.lucide) lucide.createIcons();
}

async function abrirDetalhesCompraCaixa(compraId) {
    const detalhes = document.getElementById('caixa-detalhes-compra');
    if (!detalhes) return;

    detalhes.classList.remove('hidden');
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
            <button onclick="document.getElementById('caixa-detalhes-compra').classList.add('hidden')" class="p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-white transition-all">
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
                            <td class="px-4 py-3 text-right font-black text-emerald-600">${formatadorMoeda.format(item.valor_total || 0)}</td>
                        </tr>
                    `).join('') || '<tr><td colspan="4" class="px-4 py-6 text-center text-slate-400 font-bold">Nenhum item encontrado.</td></tr>'}
                </tbody>
            </table>
        </div>
    `;

    if (window.lucide) lucide.createIcons();
}
