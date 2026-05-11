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

async function salvarCompraCaixa() {
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

    if (compraError) {
        console.error('Erro ao salvar compra:', compraError);
        return showToast('Erro ao salvar compra.', 'error');
    }

    if (!caixaEhUuid(compra?.id)) {
        console.error('Compra salva sem UUID válido para compras_itens:', compra);
        return showToast('Compra salva, mas o ID retornado não é um UUID válido para salvar os itens.', 'error');
    }

    for (const item of itensValidos) {
        let materialId = item.materialExistente?.id;
        let materialNome = item.materialExistente?.nome || item.novoNome;

        if (item.materialExistente) {
            const novaQuantidade = (parseFloat(item.materialExistente.quantidade) || 0) + item.quantidade;
            const { error: materialError } = await supabaseClient
                .from('materiais')
                .update({
                    quantidade: novaQuantidade,
                    preco_unitario: item.valor_unitario,
                    descricao: fornecedor ? `Última compra: ${fornecedor}` : item.materialExistente.descricao,
                })
                .eq('id', materialId);

            if (materialError) {
                console.error('Erro ao atualizar material:', materialError);
                return showToast(`Compra criada, mas erro ao atualizar estoque de ${materialNome}.`, 'error');
            }
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

            if (novoMaterialError) {
                console.error('Erro ao criar material:', novoMaterialError);
                return showToast(`Compra criada, mas erro ao criar material ${item.novoNome}.`, 'error');
            }

            materialId = novoMaterial.id;
            materialNome = novoMaterial.nome;
        }

        if (materialId === null || materialId === undefined || materialId === '') {
            console.error('Material sem ID para compras_itens:', { materialId, materialNome, item });
            return showToast(`O material "${materialNome}" não possui ID válido para salvar o item da compra.`, 'error');
        }

        const { error: itemError } = await supabaseClient
            .from('compras_itens')
            .insert([{
                compra_id: compra.id,
                material_id: materialId,
                descricao: materialNome,
                quantidade: item.quantidade,
                valor_unitario: item.valor_unitario,
                valor_total: item.valor_total,
            }]);

        if (itemError) {
            console.error('Erro ao salvar item da compra:', itemError);
            return showToast(`Compra criada, mas erro ao salvar item ${materialNome}.`, 'error');
        }
    }

    const { error: finError } = await supabaseClient
        .from('financeiro')
        .insert([{
            user_id: currentUser.id,
            tipo: 'SAIDA',
            valor: totais.total,
            descricao: `Compra de materiais${fornecedor ? ' - ' + fornecedor : ''}`,
            categoria: 'Compra de Materiais',
            data_movimentacao: data_compra,
            referencia_id: compra.id,
        }]);

    if (finError) {
        console.error('Erro ao registrar financeiro:', finError);
        showToast('Compra e estoque salvos, mas houve erro ao registrar o financeiro.', 'error');
    } else {
        showToast('Compra registrada, estoque atualizado e saída lançada no financeiro!');
    }

    if (typeof carregarMateriais === 'function') await carregarMateriais();
    if (typeof carregarHistorico === 'function') await carregarHistorico();
    novaCompraCaixa(false);
}
