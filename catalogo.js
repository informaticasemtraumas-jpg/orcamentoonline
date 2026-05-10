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
