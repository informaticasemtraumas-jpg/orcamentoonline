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

const ESTOQUE_LIMITE_BAIXO = 5;
const ESTOQUE_LOTE_EXIBICAO = 20;
let estoqueItensVisiveis = ESTOQUE_LOTE_EXIBICAO;
let estoqueFiltroStatus = 'todos';
let estoqueOrdenacao = 'nome';

function estoqueEscapeHtml(valor) {
    return String(valor ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function estoqueNumero(valor) {
    return parseFloat(valor) || 0;
}

function estoqueQuantidadeFormatada(valor) {
    const numero = estoqueNumero(valor);
    return parseFloat(numero.toFixed(4)).toString();
}

function obterStatusEstoque(material) {
    const quantidade = estoqueNumero(material?.quantidade);
    if (quantidade <= 0) {
        return { chave: 'zerado', texto: 'Zerado', classe: 'bg-red-100 text-red-700 border-red-200' };
    }
    if (quantidade <= ESTOQUE_LIMITE_BAIXO) {
        return { chave: 'baixo', texto: 'Baixo estoque', classe: 'bg-amber-100 text-amber-700 border-amber-200' };
    }
    return { chave: 'normal', texto: 'Normal', classe: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
}

function obterMateriaisEstoqueFiltrados() {
    const termo = (document.getElementById('filtro-estoque')?.value || '').toLowerCase().trim();
    const status = document.getElementById('filtro-status-estoque')?.value || estoqueFiltroStatus;
    const ordenacao = document.getElementById('ordenacao-estoque')?.value || estoqueOrdenacao;

    estoqueFiltroStatus = status;
    estoqueOrdenacao = ordenacao;

    return materiais
        .filter(material => {
            const statusMaterial = obterStatusEstoque(material).chave;
            const textoBusca = `${material.nome || ''} ${material.descricao || ''} ${material.unidade || ''}`.toLowerCase();
            const passaBusca = !termo || textoBusca.includes(termo);
            const passaStatus = status === 'todos' || statusMaterial === status;
            return passaBusca && passaStatus;
        })
        .sort((a, b) => {
            const qtdA = estoqueNumero(a.quantidade);
            const qtdB = estoqueNumero(b.quantidade);
            const valorA = qtdA * estoqueNumero(a.preco_unitario);
            const valorB = qtdB * estoqueNumero(b.preco_unitario);

            if (ordenacao === 'menor-quantidade') return qtdA - qtdB;
            if (ordenacao === 'maior-quantidade') return qtdB - qtdA;
            if (ordenacao === 'maior-valor') return valorB - valorA;
            return String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR');
        });
}

function renderizarListaEstoque() {
    const container = document.getElementById('lista-estoque');
    const vazio = document.getElementById('estoque-vazio');
    if (!container) return;

    const lista = obterMateriaisEstoqueFiltrados();
    const itensPagina = lista.slice(0, estoqueItensVisiveis);

    if (lista.length === 0) {
        container.innerHTML = '';
        vazio?.classList.remove('hidden');
        renderizarControleVerMaisEstoque(0, 0);
        return;
    }

    vazio?.classList.add('hidden');
    container.innerHTML = itensPagina.map(item => {
        const preco = estoqueNumero(item.preco_unitario);
        const qtd = estoqueNumero(item.quantidade);
        const totalEstoque = qtd * preco;
        const status = obterStatusEstoque(item);

        return `
        <tr class="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-all">
            <td class="px-4 py-3 text-sm font-bold text-slate-800 min-w-[220px]">
                <div class="space-y-0.5">
                    <p class="font-black leading-tight">${estoqueEscapeHtml(item.nome)}</p>
                    ${item.descricao ? `<p class="text-[11px] text-slate-400 font-bold leading-tight line-clamp-1">${estoqueEscapeHtml(item.descricao)}</p>` : ''}
                </div>
            </td>
            <td class="px-4 py-3 text-right text-sm font-black text-slate-700 whitespace-nowrap">${estoqueQuantidadeFormatada(qtd)}</td>
            <td class="px-4 py-3 text-left text-xs font-bold text-slate-500 whitespace-nowrap">${estoqueEscapeHtml(item.unidade || '-')}</td>
            <td class="px-4 py-3 text-right text-sm font-bold text-slate-600 whitespace-nowrap">${formatadorMoeda.format(preco)}</td>
            <td class="px-4 py-3 text-right text-sm font-black text-emerald-600 whitespace-nowrap">${formatadorMoeda.format(totalEstoque)}</td>
            <td class="px-4 py-3 text-center whitespace-nowrap">
                <span class="inline-flex px-2.5 py-1 rounded-full border text-[10px] font-black uppercase ${status.classe}">${status.texto}</span>
            </td>
            <td class="px-4 py-3 text-center whitespace-nowrap">
                <div class="flex gap-1.5 justify-center">
                    <button onclick="abrirDetalhesMaterial(${item.id})" class="px-2.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg transition-all text-[10px] font-black" title="Ver detalhes">VER</button>
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

    renderizarControleVerMaisEstoque(itensPagina.length, lista.length);
    lucide.createIcons();
}

function renderizarControleVerMaisEstoque(exibidos, total) {
    const info = document.getElementById('info-paginacao-estoque');
    const botao = document.getElementById('btn-ver-mais-estoque');
    const controles = document.getElementById('paginacao-estoque');

    if (info) info.innerText = `Mostrando ${exibidos} de ${total} materiais`;
    if (botao) {
        botao.classList.toggle('hidden', exibidos >= total);
        botao.disabled = exibidos >= total;
    }
    if (controles) controles.classList.toggle('hidden', total === 0);
}

function verMaisEstoque() {
    estoqueItensVisiveis += ESTOQUE_LOTE_EXIBICAO;
    renderizarListaEstoque();
}

function filtrarEstoque() {
    estoqueItensVisiveis = ESTOQUE_LOTE_EXIBICAO;
    renderizarListaEstoque();
}

function mudarPaginaEstoque() {
    verMaisEstoque();
}

async function abrirDetalhesMaterial(id) {
    const material = materiais.find(m => String(m.id) === String(id));
    if (!material) return showToast('Material não encontrado.', 'error');

    const modal = document.getElementById('modal-detalhes-material');
    const conteudo = document.getElementById('detalhes-material-conteudo');
    if (!modal || !conteudo) return;

    const preco = estoqueNumero(material.preco_unitario);
    const qtd = estoqueNumero(material.quantidade);
    const total = qtd * preco;
    const status = obterStatusEstoque(material);

    modal.classList.remove('hidden');
    conteudo.innerHTML = '<div class="py-10 text-center text-slate-400 font-bold">Carregando detalhes...</div>';

    let pecasRelacionadas = [];
    let historicoCompras = [];

    try {
        const { data: composicoes, error: composicaoError } = await supabaseClient
            .from('composicao_peca')
            .select('peca_id, quantidade_usada')
            .eq('material_id', id);

        if (!composicaoError && composicoes?.length) {
            const idsPecas = [...new Set(composicoes.map(item => item.peca_id).filter(Boolean))];
            const pecasConhecidas = pecasCatalogo.filter(peca => idsPecas.includes(peca.id));
            let pecasBanco = [];

            const idsFaltantes = idsPecas.filter(pecaId => !pecasConhecidas.some(peca => peca.id === pecaId));
            if (idsFaltantes.length) {
                const { data } = await supabaseClient
                    .from('pecas')
                    .select('id, nome')
                    .in('id', idsFaltantes);
                pecasBanco = data || [];
            }

            const pecasMap = new Map([...pecasConhecidas, ...pecasBanco].map(peca => [peca.id, peca.nome]));
            pecasRelacionadas = composicoes.map(item => ({
                nome: pecasMap.get(item.peca_id) || `Peça #${item.peca_id}`,
                quantidade_usada: item.quantidade_usada,
            }));
        }
    } catch (err) {
        console.error('Erro ao carregar peças relacionadas ao material:', err);
    }

    try {
        const { data, error } = await supabaseClient
            .from('compras_itens')
            .select('quantidade, valor_unitario, valor_total')
            .eq('material_id', id)
            .order('id', { ascending: false })
            .limit(5);

        if (!error) historicoCompras = data || [];
    } catch (err) {
        console.error('Erro ao carregar histórico simples de compras do material:', err);
    }

    conteudo.innerHTML = `
        <div class="flex justify-between items-start gap-4 border-b border-slate-100 pb-4">
            <div>
                <p class="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Detalhes do material</p>
                <h3 class="text-2xl font-black text-slate-800">${estoqueEscapeHtml(material.nome)}</h3>
                <p class="text-sm text-slate-400 font-bold mt-1">${estoqueEscapeHtml(material.descricao || 'Sem descrição cadastrada.')}</p>
            </div>
            <button onclick="fecharDetalhesMaterial()" class="text-slate-400 hover:text-red-500"><i data-lucide="x" class="w-7 h-7"></i></button>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100"><p class="text-[10px] font-black text-slate-400 uppercase">Quantidade</p><p class="font-black text-slate-800">${estoqueQuantidadeFormatada(qtd)}</p></div>
            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100"><p class="text-[10px] font-black text-slate-400 uppercase">Unidade</p><p class="font-black text-slate-800">${estoqueEscapeHtml(material.unidade || '-')}</p></div>
            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100"><p class="text-[10px] font-black text-slate-400 uppercase">Preço unitário</p><p class="font-black text-slate-800">${formatadorMoeda.format(preco)}</p></div>
            <div class="p-4 bg-emerald-50 rounded-2xl border border-emerald-100"><p class="text-[10px] font-black text-emerald-600 uppercase">Valor estimado</p><p class="font-black text-emerald-700">${formatadorMoeda.format(total)}</p></div>
            <div class="p-4 bg-white rounded-2xl border border-slate-100"><p class="text-[10px] font-black text-slate-400 uppercase">Status</p><span class="inline-flex mt-1 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase ${status.classe}">${status.texto}</span></div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <h4 class="font-black text-slate-800 mb-3">Peças que usam este material</h4>
                <div class="space-y-2">
                    ${pecasRelacionadas.length ? pecasRelacionadas.map(item => `
                        <div class="flex justify-between gap-3 text-sm bg-white border border-slate-100 rounded-xl p-3">
                            <span class="font-bold text-slate-700">${estoqueEscapeHtml(item.nome)}</span>
                            <span class="font-black text-indigo-600">${estoqueQuantidadeFormatada(item.quantidade_usada)} ${estoqueEscapeHtml(material.unidade || '')}</span>
                        </div>
                    `).join('') : '<p class="text-sm text-slate-400 font-bold">Nenhuma peça relacionada encontrada.</p>'}
                </div>
            </div>
            <div class="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <h4 class="font-black text-slate-800 mb-3">Histórico simples de compras</h4>
                <div class="space-y-2">
                    ${historicoCompras.length ? historicoCompras.map(item => `
                        <div class="flex justify-between gap-3 text-sm bg-white border border-slate-100 rounded-xl p-3">
                            <span class="font-bold text-slate-700">${estoqueQuantidadeFormatada(item.quantidade)} ${estoqueEscapeHtml(material.unidade || '')}</span>
                            <span class="font-black text-red-500">${formatadorMoeda.format(item.valor_total || 0)}</span>
                        </div>
                    `).join('') : '<p class="text-sm text-slate-400 font-bold">Nenhum histórico disponível.</p>'}
                </div>
            </div>
        </div>
    `;

    lucide.createIcons();
}

function fecharDetalhesMaterial() {
    document.getElementById('modal-detalhes-material')?.classList.add('hidden');
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
