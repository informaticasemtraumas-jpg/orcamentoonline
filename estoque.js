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
    if (typeof caixaAtualizarSelectsMateriais === 'function') caixaAtualizarSelectsMateriais();
}

function atualizarSelectMateriais() {
    const select = document.getElementById('peca-material-select');
    if (!select) return;

    select.innerHTML = '<option value="" disabled selected>Selecione um material...</option>' + 
        materiais.map(m => `<option value="${m.id}">${m.nome} (${m.unidade}) - R$ ${parseFloat(m.preco_unitario).toFixed(2)}</option>`).join('');
}

function renderizarListaEstoque(listaFiltrada = null) {
    const container = document.getElementById('lista-estoque');
    const vazio = document.getElementById('estoque-vazio');
    if (!container) return;

    const lista = listaFiltrada || materiais;

    if (lista.length === 0) {
        container.innerHTML = '';
        vazio.classList.remove('hidden');
        return;
    }

    vazio.classList.add('hidden');
    container.innerHTML = lista.map(item => {
        const preco = parseFloat(item.preco_unitario) || 0;
        const qtd = parseFloat(item.quantidade) || 0;
        const totalEstoque = (qtd * preco).toFixed(2);
        const qtdFormatada = parseFloat(qtd.toFixed(4));
        
        // Cor de alerta se estoque baixo (menos de 5 unidades ou 1 metro)
        const alertaEstoque = qtd < 5 ? 'bg-orange-50' : '';
        
        return `
        <tr class="border-b border-slate-100 hover:bg-slate-50 transition-all ${alertaEstoque}">
            <td class="px-6 py-4 text-sm font-bold text-slate-800">
                <div>
                    <p class="font-black">${item.nome}</p>
                    ${item.descricao ? `<p class="text-xs text-slate-400 mt-1">${item.descricao}</p>` : ''}
                </div>
            </td>
            <td class="px-6 py-4 text-sm text-slate-600 font-bold">${item.unidade}</td>
            <td class="px-6 py-4 text-right">
                <span class="inline-block px-3 py-1 ${qtd < 5 ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'} font-bold rounded-lg text-sm">
                    ${qtdFormatada}
                </span>
            </td>
            <td class="px-6 py-4 text-right text-sm font-bold text-slate-700">R$ ${preco.toFixed(2)}</td>
            <td class="px-6 py-4 text-right text-sm font-black text-emerald-600">R$ ${totalEstoque}</td>
            <td class="px-6 py-4 text-center">
                <div class="flex gap-2 justify-center">
                    <button onclick="abrirModalEditarMaterial(${item.id})" class="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-all" title="Editar">
                        <i data-lucide="pencil" class="w-4 h-4"></i>
                    </button>
                    <button onclick="excluirMaterial(${item.id})" class="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all" title="Excluir">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </td>
        </tr>`;
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

async function produzirPeca(id) {
    const peca = pecasCatalogo.find(p => p.id === id);
    const qtdProduzir = parseInt(prompt(`Quantas unidades de "${peca.nome}" você produziu?`, "1")) || 0;
    if (qtdProduzir <= 0) return;

    const { data: composicao, error } = await supabaseClient
        .from('composicao_peca')
        .select('material_id, quantidade_usada')
        .eq('peca_id', id);

    if (error || !composicao || composicao.length === 0) {
        return showAlert("Esta peça não tem materiais cadastrados na composição.", "error");
    }

    for (const item of composicao) {
        const material = materiais.find(m => m.id === item.material_id);
        const totalNecessario = item.quantidade_usada * qtdProduzir;
        if (!material || material.quantidade < totalNecessario) {
            return showAlert(`Estoque insuficiente de "${material ? material.nome : 'Material desconhecido'}". Necessário: ${totalNecessario.toFixed(4)}, Disponível: ${material ? material.quantidade.toFixed(4) : 0}`, "error");
        }
    }

    if (!confirm(`Confirmar a produção de ${qtdProduzir} unidades? Isso descontará os materiais do estoque e aumentará o saldo de peças prontas.`)) return;

    try {
        // 1. Descontar materiais do estoque
        for (const item of composicao) {
            const material = materiais.find(m => m.id === item.material_id);
            const novaQtd = material.quantidade - (item.quantidade_usada * qtdProduzir);
            const { error: updateError } = await supabaseClient
                .from('materiais')
                .update({ quantidade: novaQtd })
                .eq('id', item.material_id);
            if (updateError) throw updateError;
        }

        // 2. Aumentar o saldo de peças prontas
        const novaQtdPeca = (parseInt(peca.quantidade) || 0) + qtdProduzir;
        const { error: pecaUpdateError } = await supabaseClient
            .from('pecas')
            .update({ quantidade: novaQtdPeca })
            .eq('id', id);
        
        if (pecaUpdateError) throw pecaUpdateError;

        showToast(`Produção de ${qtdProduzir} peças registrada! Estoque e catálogo atualizados.`);
        carregarMateriais();
        carregarCatalogo();
    } catch (err) {
        console.error(err);
        showToast("Erro ao processar produção", "error");
    }
}

async function baixarEstoquePecasOrcamento(orcamento) {
    // O campo 'itens' no banco é um JSON com [{nome, precoUnitario, ...}]
    const itens = orcamento.itens || [];
    
    for (const item of itens) {
        // Procurar a peça no catálogo pelo nome
        const peca = pecasCatalogo.find(p => p.nome === item.nome);
        if (peca) {
            const novaQtd = Math.max(0, (parseInt(peca.quantidade) || 0) - 1);
            await supabaseClient
                .from('pecas')
                .update({ quantidade: novaQtd })
                .eq('id', peca.id);
        }
    }
}

// --- COMPRA DE MATERIAIS ---
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

function fecharModalCompra() { document.getElementById('modal-compra').classList.add('hidden'); }

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
    const novaQtd = (parseFloat(material.quantidade) || 0) + qtdComprada;
    const novoPrecoUnitario = valorTotal / qtdComprada;
    const { error: matError } = await supabaseClient.from('materiais').update({ 
        quantidade: novaQtd,
        preco_unitario: novoPrecoUnitario,
        descricao: fornecedor ? `Última compra: ${fornecedor}` : material.descricao
    }).eq('id', materialId);
    if (matError) return showToast("Erro ao atualizar estoque.", "error");

    const { error: finError } = await supabaseClient
        .from('financeiro')
        .insert([{
            user_id: currentUser.id,
            tipo: 'SAIDA',
            valor: valorTotal,
            descricao: `Compra: ${material.nome}${fornecedor ? ' (' + fornecedor + ')' : ''}`,
            categoria: 'Compra de Materiais',
            data_movimentacao: new Date().toISOString().split('T')[0],
            referencia_id: materialId
        }]);

    if (finError) {
        console.error(finError);
        showToast("Estoque atualizado, mas erro no financeiro.", "error");
    } else {
        showToast("Compra registrada e estoque atualizado!");
    }
    fecharModalCompra();
    carregarMateriais();
    if (typeof carregarHistorico === 'function') carregarHistorico();
}
