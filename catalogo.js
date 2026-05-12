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
                    <button onclick="abrirPrecificacaoPeca(${p.id})" class="px-3 py-2 bg-amber-500 text-white text-xs font-black rounded-lg hover:bg-amber-600 transition-all shadow-sm flex items-center gap-1" title="Precificar peça">
                        <i data-lucide="calculator" class="w-3 h-3"></i> PRECIFICAR
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
    document.getElementById('peca-edit-id').value = '';
    document.getElementById('peca-nome').value = '';
    document.getElementById('peca-nome').disabled = false;
    document.getElementById('peca-tempo').value = '';
    document.getElementById('peca-tempo').disabled = false;
    document.getElementById('peca-margem').value = '100';
    document.getElementById('peca-precificacao-bloco').classList.add('hidden');
    document.getElementById('btn-salvar-peca-catalogo').classList.remove('hidden');
    renderizarComposicao();
    calcularPrecoPeca();
    document.getElementById('modal-peca').classList.remove('hidden');
}

function fecharModalPeca() { document.getElementById('modal-peca').classList.add('hidden'); }

async function adicionarMaterialAPeca() {
    const select = document.getElementById('peca-material-select');
    const materialId = select.value;
    const qtd = parseFloat(document.getElementById('peca-material-qtd').value) || 0;
    if (!materialId || qtd <= 0) return showAlert("Selecione o material e a quantidade.", "error");

    const material = materiais.find(m => m.id == materialId);
    const custoMedio = await obterCustoMedioMaterialPrecificacao(material.id);
    composicaoAtual.push({ material_id: material.id, nome: material.nome, unidade: material.unidade, preco: custoMedio || material.preco_unitario, qtd, preco_atual: material.preco_unitario });
    
    renderizarComposicao();
    calcularPrecoPeca();
    if (typeof calcularPrecificacaoPecaAtual === 'function') calcularPrecificacaoPecaAtual();
    document.getElementById('peca-material-qtd').value = '';
}

function renderizarComposicao() {
    const container = document.getElementById('peca-composicao-lista');
    container.innerHTML = composicaoAtual.length === 0
        ? `<p class="text-xs text-slate-400 text-center py-4">Nenhum material adicionado ainda</p>`
        : composicaoAtual.map((item, idx) => `
        <div class="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div class="space-y-1">
                <div class="text-xs font-bold text-slate-800">${item.nome} (${item.qtd} ${item.unidade})</div>
                <div class="text-[10px] text-slate-400 font-bold">Custo usado: ${formatadorMoeda.format(item.preco)} / ${item.unidade}</div>
            </div>
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
    if (typeof calcularPrecificacaoPecaAtual === 'function') calcularPrecificacaoPecaAtual();
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

async function registrarVendaDiretaFinanceiro(cliente, valorTotal) {
    return supabaseClient
        .from('financeiro')
        .insert([{
            user_id: currentUser.id,
            tipo: 'ENTRADA',
            valor: valorTotal,
            descricao: `Venda direta: ${vendaAtual.peca_nome} (${cliente})`,
            categoria: 'Venda Direta',
            data_movimentacao: new Date().toISOString().split('T')[0],
            referencia_id: vendaAtual.peca_id
        }]);
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

        const { error: finError } = await registrarVendaDiretaFinanceiro(cliente, valorTotal);

        if (finError) {
            console.error(finError);
            showToast("Estoque atualizado, mas erro ao registrar venda direta no financeiro.", "error");
        } else {
            showToast(`Venda de ${quantidade} peça(s) registrada! Total: ${formatadorMoeda.format(valorTotal)}`);
        }
        fecharModalVenda();
        carregarCatalogo();
        if (typeof carregarHistorico === 'function') carregarHistorico();
    } catch (err) {
        console.error(err);
        showToast("Erro ao processar venda", "error");
    }
}

async function venderPeca(id) {
    abrirModalVenda(id);
}


// ====================== PRECIFICAÇÃO DE PEÇAS ======================
let precificacaoAtual = null;

async function obterCustoMedioMaterialPrecificacao(materialId) {
    const { data, error } = await supabaseClient
        .from('compras_itens')
        .select('quantidade, valor_total')
        .eq('material_id', materialId);

    if (error) {
        console.error('Erro ao buscar custo médio do material:', error);
        return null;
    }

    const totais = (data || []).reduce((acc, item) => {
        const quantidade = parseFloat(item.quantidade) || 0;
        const valor = parseFloat(item.valor_total) || 0;
        if (quantidade > 0 && valor > 0) {
            acc.quantidade += quantidade;
            acc.valor += valor;
        }
        return acc;
    }, { quantidade: 0, valor: 0 });

    return totais.quantidade > 0 ? totais.valor / totais.quantidade : null;
}

async function aplicarCustosMediosComposicaoPrecificacao() {
    for (const item of composicaoAtual) {
        const material = materiais.find(m => String(m.id) === String(item.material_id)) || {};
        const custoMedio = await obterCustoMedioMaterialPrecificacao(item.material_id);
        item.preco_atual = parseFloat(material.preco_unitario) || item.preco || 0;
        item.preco = custoMedio || item.preco_atual;
        item.custo_medio_usado = Boolean(custoMedio);
    }
}

async function abrirPrecificacaoPeca(id) {
    const peca = pecasCatalogo.find(p => p.id === id);
    if (!peca) return showToast('Peça não encontrada.', 'error');

    document.getElementById('peca-edit-id').value = peca.id;
    document.getElementById('peca-nome').value = peca.nome;
    document.getElementById('peca-nome').disabled = true;
    document.getElementById('peca-tempo').value = peca.tempo_producao || 0;
    document.getElementById('peca-tempo').disabled = true;
    document.getElementById('peca-margem').value = precificacaoConfig.margem_padrao || 0;
    document.getElementById('prec-peca-tempo-horas').value = ((parseFloat(peca.tempo_producao) || 0) / 60).toFixed(2);
    document.getElementById('prec-peca-complexidade').value = 'Padrão';
    document.getElementById('prec-peca-perda').value = precificacaoConfig.percentual_perda_padrao || 0;
    document.getElementById('prec-peca-observacoes').value = '';

    const { data: composicao, error } = await supabaseClient
        .from('composicao_peca')
        .select('material_id, quantidade_usada')
        .eq('peca_id', id);

    if (error) {
        console.error('Erro ao carregar composição para precificação:', error);
        return showToast('Erro ao carregar composição da peça.', 'error');
    }

    composicaoAtual = (composicao || []).map(item => {
        const material = materiais.find(m => String(m.id) === String(item.material_id)) || {};
        return {
            material_id: item.material_id,
            nome: material.nome || 'Material',
            unidade: material.unidade || '-',
            preco: parseFloat(material.preco_unitario) || 0,
            preco_atual: parseFloat(material.preco_unitario) || 0,
            qtd: parseFloat(item.quantidade_usada) || 0,
        };
    });

    await aplicarCustosMediosComposicaoPrecificacao();
    renderizarComposicao();
    calcularPrecoPeca();
    document.getElementById('peca-precificacao-bloco').classList.remove('hidden');
    document.getElementById('btn-salvar-peca-catalogo').classList.add('hidden');
    document.getElementById('modal-peca').classList.remove('hidden');
    calcularPrecificacaoPecaAtual();
}

function calcularPrecificacaoPecaAtual() {
    const pecaId = document.getElementById('peca-edit-id')?.value;
    if (!pecaId) return null;

    const tempoHoras = parseFloat(document.getElementById('prec-peca-tempo-horas').value) || 0;
    const percentualPerda = parseFloat(document.getElementById('prec-peca-perda').value) || 0;
    const margemPadrao = parseFloat(precificacaoConfig.margem_padrao) || 0;
    const custoMaterialSemPerda = composicaoAtual.reduce((acc, item) => acc + ((parseFloat(item.qtd) || 0) * (parseFloat(item.preco) || 0)), 0);
    const custoMaterial = custoMaterialSemPerda * (1 + (percentualPerda / 100));
    const custoMaoObra = tempoHoras * (parseFloat(precificacaoConfig.valor_hora) || 0);
    const horasMes = parseFloat(precificacaoConfig.horas_produtivas_mes) || 160;
    const despesasFixasRateadas = ((parseFloat(precificacaoConfig.despesas_fixas_mes) || 0) / horasMes) * tempoHoras;
    const custoBase = custoMaterial + custoMaoObra + despesasFixasRateadas;
    const lucroPadrao = custoBase * (margemPadrao / 100);
    const precoMinimo = custoBase;
    const precoRecomendado = custoBase + lucroPadrao;

    const meios = [
        { meio_venda: 'Venda direta | dinheiro', taxa: parseFloat(precificacaoConfig.taxa_dinheiro) || 0 },
        { meio_venda: 'Venda direta | Pix', taxa: parseFloat(precificacaoConfig.taxa_pix) || 0 },
        { meio_venda: 'Venda direta | cartão débito', taxa: parseFloat(precificacaoConfig.taxa_debito) || 0 },
        { meio_venda: 'Venda direta | crédito 1x', taxa: parseFloat(precificacaoConfig.taxa_credito_1x) || 0 },
        { meio_venda: 'Venda direta | cartão parcelado', taxa: parseFloat(precificacaoConfig.taxa_credito_parcelado) || 0 },
    ];

    const resultados = meios.map(meio => {
        const despesasVariaveis = precoRecomendado * (meio.taxa / 100);
        const precoFinal = precoRecomendado + despesasVariaveis;
        const lucro = precoFinal - despesasVariaveis - custoBase;
        const margemReal = custoBase > 0 ? (lucro / custoBase) * 100 : 0;
        const prejuizo = precoFinal < custoBase || lucro < 0;
        const margemBaixa = !prejuizo && margemReal < margemPadrao;
        return {
            meio_venda: meio.meio_venda,
            despesas_variaveis: despesasVariaveis,
            custo_meio_venda: despesasVariaveis,
            lucro,
            preco_final: precoFinal,
            margem_real: margemReal,
            alerta: prejuizo ? 'Prejuízo' : (margemBaixa ? 'Margem baixa' : ''),
        };
    });

    document.getElementById('prec-res-material').innerText = formatadorMoeda.format(custoMaterial);
    document.getElementById('prec-res-mao-obra').innerText = formatadorMoeda.format(custoMaoObra);
    document.getElementById('prec-res-fixas').innerText = formatadorMoeda.format(despesasFixasRateadas);
    document.getElementById('prec-res-base').innerText = formatadorMoeda.format(custoBase);

    const minimoEl = document.getElementById('prec-res-minimo');
    const recomendadoEl = document.getElementById('prec-res-recomendado');
    if (minimoEl) minimoEl.innerText = formatadorMoeda.format(precoMinimo);
    if (recomendadoEl) recomendadoEl.innerText = formatadorMoeda.format(precoRecomendado);

    document.getElementById('prec-resultados-tabela').innerHTML = resultados.map(r => {
        const alertaClasse = r.alerta === 'Prejuízo' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700';
        return `
        <tr class="border-b border-slate-50 last:border-0">
            <td class="px-4 py-3 font-bold text-slate-700">
                <div>${r.meio_venda}</div>
                ${r.alerta ? `<span class="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${alertaClasse}">${r.alerta}</span>` : ''}
            </td>
            <td class="px-4 py-3 text-right font-bold text-red-500">${formatadorMoeda.format(r.despesas_variaveis)}</td>
            <td class="px-4 py-3 text-right font-bold text-red-500">${formatadorMoeda.format(r.custo_meio_venda)}</td>
            <td class="px-4 py-3 text-right font-bold ${r.lucro < 0 ? 'text-red-600' : 'text-emerald-600'}">${formatadorMoeda.format(r.lucro)}</td>
            <td class="px-4 py-3 text-right font-black ${r.alerta === 'Prejuízo' ? 'text-red-700' : 'text-emerald-700'}">${formatadorMoeda.format(r.preco_final)}</td>
        </tr>`;
    }).join('');

    precificacaoAtual = {
        peca_id: parseInt(pecaId),
        nome_peca: document.getElementById('peca-nome').value,
        tempo_producao_horas: tempoHoras,
        complexidade: document.getElementById('prec-peca-complexidade').value,
        percentual_perda: percentualPerda,
        custo_material: custoMaterial,
        custo_mao_obra: custoMaoObra,
        despesas_fixas_rateadas: despesasFixasRateadas,
        custo_base: custoBase,
        observacoes: document.getElementById('prec-peca-observacoes').value.trim(),
        itens: composicaoAtual.map(item => ({
            material_id: item.material_id,
            descricao: item.custo_medio_usado ? `${item.nome} (custo médio)` : item.nome,
            unidade: item.unidade,
            quantidade: item.qtd,
            valor_unitario: item.preco,
            valor_total: (parseFloat(item.qtd) || 0) * (parseFloat(item.preco) || 0),
        })),
        resultados,
        preco_minimo: precoMinimo,
        preco_recomendado: precoRecomendado,
    };

    if (window.lucide) lucide.createIcons();
    return precificacaoAtual;
}

async function salvarPrecificacaoPecaAtual() {
    const dados = calcularPrecificacaoPecaAtual();
    if (!dados || !currentUser) return showToast('Abra uma peça para precificar.', 'error');

    const { data: precificacao, error } = await supabaseClient
        .from('precificacoes')
        .insert([{
            user_id: currentUser.id,
            peca_id: dados.peca_id,
            nome_peca: dados.nome_peca,
            tempo_producao_horas: dados.tempo_producao_horas,
            complexidade: dados.complexidade,
            percentual_perda: dados.percentual_perda,
            custo_material: dados.custo_material,
            custo_mao_obra: dados.custo_mao_obra,
            despesas_fixas_rateadas: dados.despesas_fixas_rateadas,
            custo_base: dados.custo_base,
            observacoes: dados.observacoes || null,
        }])
        .select()
        .single();

    if (error) {
        console.error('Erro ao salvar precificação:', error);
        return showToast('Erro ao salvar precificação.', 'error');
    }

    const itens = dados.itens.map(item => ({ user_id: currentUser.id, precificacao_id: precificacao.id, ...item }));
    const resultados = dados.resultados.map(resultado => ({ user_id: currentUser.id, precificacao_id: precificacao.id, ...resultado }));

    const { error: itensError } = await supabaseClient.from('precificacao_itens').insert(itens);
    if (itensError) {
        console.error('Erro ao salvar itens da precificação:', itensError);
        return showToast('Precificação criada, mas erro ao salvar itens.', 'error');
    }

    const { error: resultadosError } = await supabaseClient.from('precificacao_resultados').insert(resultados);
    if (resultadosError) {
        console.error('Erro ao salvar resultados da precificação:', resultadosError);
        return showToast('Precificação criada, mas erro ao salvar resultados.', 'error');
    }

    showToast('Precificação salva com sucesso!');
}
