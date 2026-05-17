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
let vendaAtual = { peca_id: null, peca_nome: '', preco_unitario: 0 };
let complexidadeAtual = 1.0;
let complexidadeNome = "Padrão";
let currentUser = null;
let statusChart = null;
let materiais = [];
let itensCompraCaixa = [];
let precificacaoConfig = {
    id: null,
    valor_hora: 0,
    horas_produtivas_mes: 160,
    despesas_fixas_mes: 0,
    margem_padrao: 100,
    percentual_perda_padrao: 0,
    taxa_debito: 0,
    taxa_credito_1x: 0,
    taxa_credito_parcelado: 0,
    taxa_pix: 0,
    taxa_dinheiro: 0,
};

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
document.write('<script src="catalogo.js"></script>');
document.write('<script src="caixa.js"></script>');

// ====================== CALCULADORA DE CORTE ======================

const idsCalculadoraCorte = [
    'corte-tecido-largura',
    'corte-tecido-comprimento',
    'corte-preco',
    'corte-peca-largura',
    'corte-peca-comprimento',
    'corte-margem',
    'corte-espacamento',
    'corte-quantidade',
];

let modoCorteAtual = 'tenho';
let ultimoResumoCorte = '';

function numeroCorte(valor) {
    if (typeof valor === 'string') valor = valor.replace(',', '.');
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : 0;
}

function formatarCmCorte(valor) {
    return `${numeroCorte(valor).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} cm`;
}

function formatarMetroCorte(valor) {
    return `${numeroCorte(valor).toLocaleString('pt-BR', { maximumFractionDigits: 4 })} m`;
}

function formatarAreaCorte(valor) {
    return `${numeroCorte(valor).toLocaleString('pt-BR', { maximumFractionDigits: 4 })} m²`;
}

function moedaCorte(valor) {
    if (typeof formatadorMoeda !== 'undefined') return formatadorMoeda.format(numeroCorte(valor));
    return numeroCorte(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function obterValorCorte(id) {
    return numeroCorte(document.getElementById(id)?.value);
}

function definirTextoCorte(id, texto) {
    const el = document.getElementById(id);
    if (el) el.innerText = texto;
}

function mostrarAlertaCorte(mensagem, tipo = 'erro') {
    const alerta = document.getElementById('corte-alerta');
    if (!alerta) return;
    alerta.classList.remove('hidden', 'bg-red-50', 'border-red-100', 'text-red-600', 'bg-amber-50', 'border-amber-100', 'text-amber-700', 'bg-emerald-50', 'border-emerald-100', 'text-emerald-700');
    if (tipo === 'sucesso') {
        alerta.classList.add('bg-emerald-50', 'border-emerald-100', 'text-emerald-700');
    } else if (tipo === 'aviso') {
        alerta.classList.add('bg-amber-50', 'border-amber-100', 'text-amber-700');
    } else {
        alerta.classList.add('bg-red-50', 'border-red-100', 'text-red-600');
    }
    alerta.innerText = mensagem;
}

function ocultarAlertaCorte() {
    document.getElementById('corte-alerta')?.classList.add('hidden');
}

function aplicarPresetLarguraCorte(largura) {
    const campo = document.getElementById('corte-tecido-largura');
    if (campo) campo.value = largura;
}

function estilizarBotaoModoCorte(id, ativo) {
    const botao = document.getElementById(id);
    if (!botao) return;
    botao.classList.toggle('bg-white', ativo);
    botao.classList.toggle('text-indigo-700', ativo);
    botao.classList.toggle('shadow-sm', ativo);
    botao.classList.toggle('text-slate-500', !ativo);
}

function setModoCorte(modo) {
    modoCorteAtual = modo === 'compra' ? 'compra' : 'tenho';
    const modoCompra = modoCorteAtual === 'compra';

    estilizarBotaoModoCorte('corte-modo-tenho', !modoCompra);
    estilizarBotaoModoCorte('corte-modo-compra', modoCompra);

    definirTextoCorte('corte-texto-tecido', modoCompra
        ? 'Informe a largura do tecido; o comprimento disponível é opcional para conferência.'
        : 'Informe o tecido disponível para descobrir quantas peças cabem.');
    definirTextoCorte('corte-label-comprimento', modoCompra ? 'Comprimento disponível (opcional)' : 'Comprimento disponível (cm)');
    definirTextoCorte('corte-label-preco', modoCompra ? 'Preço por metro linear (opcional)' : 'Preço pago (opcional)');
    definirTextoCorte('corte-label-quantidade', modoCompra ? 'Quantidade desejada (obrigatório)' : 'Quantidade desejada (opcional)');
    definirTextoCorte('corte-total-label', modoCompra ? 'Comprimento necessário' : 'Peças que cabem');
    definirTextoCorte('corte-label-na-largura', modoCompra ? 'Peças por faixa/largura' : 'Peças por faixa/largura');
    definirTextoCorte('corte-label-no-comprimento', modoCompra ? 'Fileiras necessárias' : 'Peças no comprimento');
    definirTextoCorte('corte-label-comprimento-usado', modoCompra ? 'Comprimento necessário' : 'Comprimento usado');
    definirTextoCorte('corte-label-comprimento-restante', modoCompra ? 'Comprimento disponível' : 'Comprimento restante');
    definirTextoCorte('corte-label-sobra', modoCompra ? 'Diferença do disponível' : 'Sobra aproximada em comprimento');

    const quantidade = document.getElementById('corte-campo-quantidade');
    quantidade?.classList.toggle('ring-4', modoCompra);
    quantidade?.classList.toggle('ring-indigo-50', modoCompra);
    quantidade?.classList.toggle('rounded-2xl', modoCompra);

    limparResultadoCorte();
}

function calcularOrientacaoCorte(larguraTecido, comprimentoTecido, larguraFinal, comprimentoFinal, nome) {
    const pecasNaLargura = larguraFinal > 0 ? Math.floor(larguraTecido / larguraFinal) : 0;
    const pecasNoComprimento = comprimentoTecido > 0 && comprimentoFinal > 0 ? Math.floor(comprimentoTecido / comprimentoFinal) : 0;
    return {
        nome,
        larguraFinal,
        comprimentoFinal,
        pecasNaLargura,
        pecasNoComprimento,
        total: pecasNaLargura * pecasNoComprimento,
        comprimentoUsado: pecasNoComprimento * comprimentoFinal,
    };
}

function pontuarOrientacaoCorte(orientacao, usarComprimento) {
    if (usarComprimento) return orientacao.total;
    return orientacao.pecasNaLargura * 100000 - orientacao.comprimentoFinal;
}

function selecionarMelhorOrientacaoCorte(larguraTecido, comprimentoTecido, larguraFinal, comprimentoFinal, permitirGirar, usarComprimento = true) {
    const normal = calcularOrientacaoCorte(larguraTecido, comprimentoTecido, larguraFinal, comprimentoFinal, 'Sem girar');
    if (!permitirGirar) return normal;

    const girada = calcularOrientacaoCorte(larguraTecido, comprimentoTecido, comprimentoFinal, larguraFinal, 'Peça girada');
    return pontuarOrientacaoCorte(girada, usarComprimento) > pontuarOrientacaoCorte(normal, usarComprimento) ? girada : normal;
}

function comprimentoNecessarioOrientacaoCorte(orientacao, quantidade) {
    if (orientacao.pecasNaLargura <= 0) return Infinity;
    return Math.ceil(quantidade / orientacao.pecasNaLargura) * orientacao.comprimentoFinal;
}

function selecionarMelhorOrientacaoCompraCorte(larguraTecido, comprimentoTecido, larguraFinal, comprimentoFinal, permitirGirar, quantidade) {
    const normal = calcularOrientacaoCorte(larguraTecido, comprimentoTecido, larguraFinal, comprimentoFinal, 'Sem girar');
    if (!permitirGirar) return normal;

    const girada = calcularOrientacaoCorte(larguraTecido, comprimentoTecido, comprimentoFinal, larguraFinal, 'Peça girada');
    const comprimentoNormal = comprimentoNecessarioOrientacaoCorte(normal, quantidade);
    const comprimentoGirada = comprimentoNecessarioOrientacaoCorte(girada, quantidade);
    if (comprimentoGirada < comprimentoNormal) return girada;
    if (comprimentoGirada === comprimentoNormal && girada.pecasNaLargura > normal.pecasNaLargura) return girada;
    return normal;
}

function validarCalculadoraCorte(dados) {
    if (dados.larguraTecido <= 0) return 'Informe uma largura do tecido maior que zero.';
    if (dados.modo === 'tenho' && dados.comprimentoTecido <= 0) return 'Informe um comprimento disponível maior que zero.';
    if (dados.larguraPeca <= 0) return 'Informe uma largura da peça maior que zero.';
    if (dados.comprimentoPeca <= 0) return 'Informe um comprimento da peça maior que zero.';
    if (dados.modo === 'compra' && dados.quantidade <= 0) return 'Informe a quantidade desejada para calcular a compra.';
    return '';
}

function obterDadosCorte() {
    return {
        modo: modoCorteAtual,
        larguraTecido: obterValorCorte('corte-tecido-largura'),
        comprimentoTecido: obterValorCorte('corte-tecido-comprimento'),
        precoPago: obterValorCorte('corte-preco'),
        larguraPeca: obterValorCorte('corte-peca-largura'),
        comprimentoPeca: obterValorCorte('corte-peca-comprimento'),
        margem: obterValorCorte('corte-margem'),
        espacamento: obterValorCorte('corte-espacamento'),
        quantidade: Math.floor(obterValorCorte('corte-quantidade')),
        permitirGirar: document.getElementById('corte-girar')?.value === 'sim',
    };
}

function aplicarResultadoBaseCorte(melhor) {
    definirTextoCorte('corte-orientacao', `${melhor.nome}: peça final ${formatarCmCorte(melhor.larguraFinal)} × ${formatarCmCorte(melhor.comprimentoFinal)}.`);
    definirTextoCorte('corte-na-largura', String(melhor.pecasNaLargura));
}

function calcularCorteTenhoTecido(dados, melhor) {
    const comprimentoRestante = Math.max(dados.comprimentoTecido - melhor.comprimentoUsado, 0);
    const areaTotalM2 = (dados.larguraTecido * dados.comprimentoTecido) / 10000;
    const areaUsadaM2 = (melhor.total * melhor.larguraFinal * melhor.comprimentoFinal) / 10000;
    const comprimentoTecidoM = dados.comprimentoTecido / 100;
    const precoMetroLinear = dados.precoPago > 0 && comprimentoTecidoM > 0 ? dados.precoPago / comprimentoTecidoM : 0;
    const custoEstimadoPorPeca = precoMetroLinear > 0 && melhor.total > 0 ? dados.precoPago / melhor.total : 0;

    definirTextoCorte('corte-total', String(melhor.total));
    aplicarResultadoBaseCorte(melhor);
    definirTextoCorte('corte-no-comprimento', String(melhor.pecasNoComprimento));
    definirTextoCorte('corte-comprimento-usado', formatarCmCorte(melhor.comprimentoUsado));
    definirTextoCorte('corte-comprimento-restante', formatarCmCorte(comprimentoRestante));
    definirTextoCorte('corte-sobra', formatarCmCorte(comprimentoRestante));
    definirTextoCorte('corte-area-total', formatarAreaCorte(areaTotalM2));
    definirTextoCorte('corte-area-usada', formatarAreaCorte(areaUsadaM2));
    definirTextoCorte('corte-custo-metro', precoMetroLinear > 0 ? moedaCorte(precoMetroLinear) : '—');
    definirTextoCorte('corte-custo-peca', custoEstimadoPorPeca > 0 ? moedaCorte(custoEstimadoPorPeca) : '—');
    document.getElementById('corte-quantidade-resultado')?.classList.add('hidden');

    if (melhor.total === 0) mostrarAlertaCorte('Essa peça não cabe nas medidas informadas.', 'aviso');
    else ocultarAlertaCorte();

    ultimoResumoCorte = [
        'Calculadora de Corte - Tenho tecido',
        `Tecido: largura ${formatarCmCorte(dados.larguraTecido)} × comprimento disponível ${formatarCmCorte(dados.comprimentoTecido)}`,
        `Peça final: ${formatarCmCorte(melhor.larguraFinal)} × ${formatarCmCorte(melhor.comprimentoFinal)}`,
        `Orientação escolhida: ${melhor.nome}`,
        `Quantidade que cabe: ${melhor.total} peça(s)`,
        `Peças por faixa/largura: ${melhor.pecasNaLargura}`,
        `Peças no comprimento: ${melhor.pecasNoComprimento}`,
        `Comprimento usado: ${formatarCmCorte(melhor.comprimentoUsado)}`,
        `Comprimento restante: ${formatarCmCorte(comprimentoRestante)}`,
        precoMetroLinear > 0 ? `Custo por metro linear: ${moedaCorte(precoMetroLinear)}` : '',
        custoEstimadoPorPeca > 0 ? `Custo por peça: ${moedaCorte(custoEstimadoPorPeca)}` : '',
        `Área estimada apenas para referência: total ${formatarAreaCorte(areaTotalM2)} | usada ${formatarAreaCorte(areaUsadaM2)}`,
    ].filter(Boolean).join('\n');

    return { dados, melhor, precoMetroLinear, custoEstimadoPorPeca };
}

function calcularCorteCompra(dados, melhor) {
    const pecasPorFaixa = melhor.pecasNaLargura;
    const fileirasNecessarias = pecasPorFaixa > 0 ? Math.ceil(dados.quantidade / pecasPorFaixa) : 0;
    const comprimentoNecessarioCm = fileirasNecessarias * melhor.comprimentoFinal;
    const comprimentoNecessarioM = comprimentoNecessarioCm / 100;
    const comprimentoRestante = dados.comprimentoTecido > 0 ? dados.comprimentoTecido - comprimentoNecessarioCm : 0;
    const areaTotalM2 = dados.comprimentoTecido > 0 ? (dados.larguraTecido * dados.comprimentoTecido) / 10000 : 0;
    const areaNecessariaM2 = (dados.larguraTecido * comprimentoNecessarioCm) / 10000;
    const custoQuantidade = dados.precoPago > 0 ? dados.precoPago * comprimentoNecessarioM : 0;

    definirTextoCorte('corte-total', `${formatarCmCorte(comprimentoNecessarioCm)} / ${formatarMetroCorte(comprimentoNecessarioM)}`);
    aplicarResultadoBaseCorte(melhor);
    definirTextoCorte('corte-no-comprimento', String(fileirasNecessarias));
    definirTextoCorte('corte-comprimento-usado', `${formatarCmCorte(comprimentoNecessarioCm)} / ${formatarMetroCorte(comprimentoNecessarioM)}`);
    definirTextoCorte('corte-comprimento-restante', dados.comprimentoTecido > 0 ? formatarCmCorte(dados.comprimentoTecido) : 'Não informado');
    definirTextoCorte('corte-sobra', dados.comprimentoTecido > 0 ? formatarCmCorte(comprimentoRestante) : '—');
    definirTextoCorte('corte-area-total', dados.comprimentoTecido > 0 ? formatarAreaCorte(areaTotalM2) : '—');
    definirTextoCorte('corte-area-usada', formatarAreaCorte(areaNecessariaM2));
    definirTextoCorte('corte-custo-metro', dados.precoPago > 0 ? moedaCorte(dados.precoPago) : '—');
    definirTextoCorte('corte-custo-peca', custoQuantidade > 0 ? moedaCorte(custoQuantidade / dados.quantidade) : '—');

    const textoQuantidade = pecasPorFaixa > 0
        ? `Para produzir ${dados.quantidade} peças, você precisa de aproximadamente ${formatarCmCorte(comprimentoNecessarioCm)} / ${formatarMetroCorte(comprimentoNecessarioM)} de tecido.`
        : 'Essa peça não cabe na largura do tecido informada.';
    const resultadoQuantidade = document.getElementById('corte-quantidade-resultado');
    if (resultadoQuantidade) {
        resultadoQuantidade.innerText = pecasPorFaixa > 0
            ? `${textoQuantidade} Cabem ${pecasPorFaixa} peça(s) por faixa/largura, em ${fileirasNecessarias} fileira(s).${custoQuantidade > 0 ? ` Custo estimado: ${moedaCorte(custoQuantidade)}.` : ''}`
            : textoQuantidade;
        resultadoQuantidade.classList.remove('hidden');
    }

    if (pecasPorFaixa === 0) mostrarAlertaCorte('Essa peça não cabe nas medidas informadas.', 'aviso');
    else if (dados.comprimentoTecido > 0 && dados.comprimentoTecido < comprimentoNecessarioCm) {
        mostrarAlertaCorte(`Falta tecido: precisa de ${formatarCmCorte(comprimentoNecessarioCm)}, mas há ${formatarCmCorte(dados.comprimentoTecido)} disponíveis.`, 'aviso');
    } else {
        ocultarAlertaCorte();
    }

    ultimoResumoCorte = [
        'Calculadora de Corte - Quero calcular compra',
        `Quantidade desejada: ${dados.quantidade} peça(s)`,
        `Largura do tecido: ${formatarCmCorte(dados.larguraTecido)}`,
        dados.comprimentoTecido > 0 ? `Comprimento disponível informado: ${formatarCmCorte(dados.comprimentoTecido)}` : 'Comprimento disponível: não informado (não obrigatório neste modo)',
        `Peça final: ${formatarCmCorte(melhor.larguraFinal)} × ${formatarCmCorte(melhor.comprimentoFinal)}`,
        `Orientação escolhida: ${melhor.nome}`,
        `Peças por faixa/largura: ${pecasPorFaixa}`,
        `Fileiras necessárias: ${fileirasNecessarias}`,
        `Comprimento necessário: ${formatarCmCorte(comprimentoNecessarioCm)} / ${formatarMetroCorte(comprimentoNecessarioM)}`,
        textoQuantidade,
        custoQuantidade > 0 ? `Custo estimado da compra: ${moedaCorte(custoQuantidade)} | Custo por peça: ${moedaCorte(custoQuantidade / dados.quantidade)}` : '',
        `Área estimada apenas para referência: necessária ${formatarAreaCorte(areaNecessariaM2)}`,
    ].filter(Boolean).join('\n');

    return { dados, melhor, pecasPorFaixa, fileirasNecessarias, comprimentoNecessarioCm, comprimentoNecessarioM, custoQuantidade };
}

function calcularCorte() {
    const dados = obterDadosCorte();
    const erro = validarCalculadoraCorte(dados);
    if (erro) {
        mostrarAlertaCorte(erro);
        return null;
    }

    const larguraFinal = dados.larguraPeca + dados.margem + dados.espacamento;
    const comprimentoFinal = dados.comprimentoPeca + dados.margem + dados.espacamento;
    const melhor = dados.modo === 'compra'
        ? selecionarMelhorOrientacaoCompraCorte(
            dados.larguraTecido,
            dados.comprimentoTecido,
            larguraFinal,
            comprimentoFinal,
            dados.permitirGirar,
            dados.quantidade
        )
        : selecionarMelhorOrientacaoCorte(
            dados.larguraTecido,
            dados.comprimentoTecido,
            larguraFinal,
            comprimentoFinal,
            dados.permitirGirar,
            true
        );

    if (dados.modo === 'compra') return calcularCorteCompra(dados, melhor);
    return calcularCorteTenhoTecido(dados, melhor);
}

function limparResultadoCorte() {
    ocultarAlertaCorte();
    definirTextoCorte('corte-total', modoCorteAtual === 'compra' ? '0 cm / 0 m' : '0');
    definirTextoCorte('corte-orientacao', 'Preencha os dados e clique em calcular.');
    definirTextoCorte('corte-na-largura', '0');
    definirTextoCorte('corte-no-comprimento', '0');
    definirTextoCorte('corte-comprimento-usado', '0 cm');
    definirTextoCorte('corte-comprimento-restante', modoCorteAtual === 'compra' ? 'Não informado' : '0 cm');
    definirTextoCorte('corte-sobra', modoCorteAtual === 'compra' ? '—' : '0 cm');
    definirTextoCorte('corte-area-total', '0 m²');
    definirTextoCorte('corte-area-usada', '0 m²');
    definirTextoCorte('corte-custo-metro', '—');
    definirTextoCorte('corte-custo-peca', '—');
    document.getElementById('corte-quantidade-resultado')?.classList.add('hidden');
    ultimoResumoCorte = '';
}

function limparCalculadoraCorte() {
    idsCalculadoraCorte.forEach(id => {
        const campo = document.getElementById(id);
        if (campo) campo.value = '';
    });
    const girar = document.getElementById('corte-girar');
    if (girar) girar.value = 'nao';
    setModoCorte(modoCorteAtual);
}

async function copiarResumoCorte() {
    if (!ultimoResumoCorte) {
        const resultado = calcularCorte();
        if (!resultado) return;
    }

    if (!navigator.clipboard) {
        mostrarAlertaCorte('Não foi possível copiar automaticamente neste navegador. Selecione o resumo manualmente.', 'aviso');
        return;
    }

    await navigator.clipboard.writeText(ultimoResumoCorte);
    mostrarAlertaCorte('Resumo copiado para a área de transferência.', 'sucesso');
}

// ====================== MINI CALCULADORA DE ÁREA ======================

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
    } else if (origem === 'caixa' && typeof aplicarResultadoAreaCaixaItem === 'function') {
        aplicarResultadoAreaCaixaItem(resultado);
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


// ====================== CONFIGURAÇÕES DE PRECIFICAÇÃO ======================

function preencherCamposPrecificacaoConfig() {
    const campos = ['valor_hora', 'horas_produtivas_mes', 'despesas_fixas_mes', 'margem_padrao', 'percentual_perda_padrao', 'taxa_debito', 'taxa_credito_1x', 'taxa_credito_parcelado', 'taxa_pix', 'taxa_dinheiro'];
    campos.forEach(campo => {
        const el = document.getElementById(`prec-cfg-${campo}`);
        if (el) el.value = precificacaoConfig[campo] ?? 0;
    });
}

function lerCamposPrecificacaoConfig() {
    return {
        valor_hora: parseFloat(document.getElementById('prec-cfg-valor_hora')?.value) || 0,
        horas_produtivas_mes: parseFloat(document.getElementById('prec-cfg-horas_produtivas_mes')?.value) || 160,
        despesas_fixas_mes: parseFloat(document.getElementById('prec-cfg-despesas_fixas_mes')?.value) || 0,
        margem_padrao: parseFloat(document.getElementById('prec-cfg-margem_padrao')?.value) || 0,
        percentual_perda_padrao: parseFloat(document.getElementById('prec-cfg-percentual_perda_padrao')?.value) || 0,
        taxa_debito: parseFloat(document.getElementById('prec-cfg-taxa_debito')?.value) || 0,
        taxa_credito_1x: parseFloat(document.getElementById('prec-cfg-taxa_credito_1x')?.value) || 0,
        taxa_credito_parcelado: parseFloat(document.getElementById('prec-cfg-taxa_credito_parcelado')?.value) || 0,
        taxa_pix: parseFloat(document.getElementById('prec-cfg-taxa_pix')?.value) || 0,
        taxa_dinheiro: parseFloat(document.getElementById('prec-cfg-taxa_dinheiro')?.value) || 0,
    };
}

async function carregarPrecificacaoConfiguracoes() {
    if (!currentUser) return;
    const { data, error } = await supabaseClient
        .from('precificacao_configuracoes')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle();

    if (error) {
        console.error('Erro ao carregar configurações de precificação:', error);
        preencherCamposPrecificacaoConfig();
        return;
    }

    if (data) precificacaoConfig = { ...precificacaoConfig, ...data };
    preencherCamposPrecificacaoConfig();
}

async function salvarPrecificacaoConfiguracoes(silencioso = false) {
    if (!currentUser) return;
    const valores = lerCamposPrecificacaoConfig();
    const payload = { user_id: currentUser.id, ...valores, updated_at: new Date().toISOString() };

    const query = precificacaoConfig.id
        ? supabaseClient.from('precificacao_configuracoes').update(payload).eq('id', precificacaoConfig.id).select().single()
        : supabaseClient.from('precificacao_configuracoes').insert([payload]).select().single();

    const { data, error } = await query;
    if (error) {
        console.error('Erro ao salvar configurações de precificação:', error);
        if (!silencioso) showToast('Erro ao salvar precificação do ateliê.', 'error');
        return;
    }

    precificacaoConfig = { ...precificacaoConfig, ...data };
    preencherCamposPrecificacaoConfig();
    if (!silencioso) showToast('Configurações de precificação salvas!');
}

let precificacaoConfigTimer = null;
function salvarPrecificacaoConfiguracoesAuto() {
    precificacaoConfig = { ...precificacaoConfig, ...lerCamposPrecificacaoConfig() };
    if (typeof calcularPrecificacaoPecaAtual === 'function') calcularPrecificacaoPecaAtual();
    clearTimeout(precificacaoConfigTimer);
    precificacaoConfigTimer = setTimeout(() => salvarPrecificacaoConfiguracoes(true), 800);
}

// ====================== NAVEGAÇÃO ======================

function switchTab(tab) {
    const views = ['view-gerador', 'view-catalogo', 'view-estoque', 'view-caixa', 'view-corte', 'view-historico', 'view-config'];
    const tabs = ['tab-gerador', 'tab-catalogo', 'tab-estoque', 'tab-caixa', 'tab-corte', 'tab-historico', 'tab-config'];
    
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
    
    if (tab === 'historico') {
        carregarHistorico();
        carregarRelatoriosOperacionais();
    }
    if (tab === 'estoque') carregarMateriais();
    if (tab === 'catalogo') carregarCatalogo();
    if (tab === 'caixa' && typeof iniciarCaixa === 'function') iniciarCaixa();
}


// ====================== RELATÓRIOS OPERACIONAIS ======================

const RELATORIO_LIMITE_INICIAL = 20;
const relatoriosOperacionais = {
    carregado: false,
    pecas: { limite: RELATORIO_LIMITE_INICIAL, dados: [], temMais: false },
    materiais: { limite: RELATORIO_LIMITE_INICIAL, dados: [], temMais: false },
    compras: { limite: RELATORIO_LIMITE_INICIAL, dados: [], temMais: false },
    pedidos: { limite: RELATORIO_LIMITE_INICIAL, dados: [], temMais: false },
};

function relEscapeHtml(valor) {
    return String(valor ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function relNumero(valor) {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : 0;
}

function relQuantidade(valor) {
    const numero = relNumero(valor);
    return Number.isInteger(numero) ? String(numero) : String(parseFloat(numero.toFixed(4)));
}

function relPeriodoPadrao() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    return { inicial: `${ano}-${mes}-01`, final: `${ano}-${mes}-${dia}` };
}

function inicializarFiltrosRelatorios() {
    const inicialEl = document.getElementById('rel-data-inicial');
    const finalEl = document.getElementById('rel-data-final');
    if (!inicialEl || !finalEl) return;

    const padrao = relPeriodoPadrao();
    if (!inicialEl.value) inicialEl.value = padrao.inicial;
    if (!finalEl.value) finalEl.value = padrao.final;
}

function relObterPeriodo() {
    inicializarFiltrosRelatorios();
    return {
        inicial: document.getElementById('rel-data-inicial')?.value || null,
        final: document.getElementById('rel-data-final')?.value || null,
    };
}

function relBadgeStatus(qtd) {
    const quantidade = relNumero(qtd);
    if (quantidade <= 0) return '<span class="px-2 py-1 bg-red-50 text-red-600 rounded-lg text-[10px] font-black uppercase">Zerado</span>';
    if (quantidade < 5) return '<span class="px-2 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-black uppercase">Baixo</span>';
    return '<span class="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase">OK</span>';
}

function relSetLoading(id, colunas) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<tr><td colspan="${colunas}" class="px-3 py-6 text-center text-slate-400 font-bold">Carregando...</td></tr>`;
}

function relSetEmpty(id, colunas, mensagem) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<tr><td colspan="${colunas}" class="px-3 py-6 text-center text-slate-400 font-bold">${mensagem}</td></tr>`;
}

function relToggleVerMais(tipo) {
    const acoes = document.getElementById(`rel-${tipo}-acoes`);
    if (acoes) acoes.classList.toggle('hidden', !relatoriosOperacionais[tipo]?.temMais);
}

async function carregarRelatoriosOperacionais(forcar = false) {
    if (!currentUser) return;
    if (relatoriosOperacionais.carregado && !forcar) return;

    inicializarFiltrosRelatorios();
    await Promise.all([
        carregarResumoOperacional(),
        carregarRelatorioPecasProntas(forcar),
        carregarRelatorioMateriais(forcar),
        carregarRelatorioCompras(forcar),
        carregarRelatorioPedidos(forcar),
    ]);
    relatoriosOperacionais.carregado = true;
}

async function carregarRelatorioPecasProntas(resetar = false) {
    if (!currentUser) return;
    if (resetar) relatoriosOperacionais.pecas.limite = RELATORIO_LIMITE_INICIAL;
    relSetLoading('rel-pecas-corpo', 5);

    const limite = relatoriosOperacionais.pecas.limite;
    const { data, error } = await supabaseClient
        .from('pecas')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('nome', { ascending: true })
        .range(0, limite);

    if (error) {
        console.error('Erro no relatório de peças prontas:', error);
        relSetEmpty('rel-pecas-corpo', 5, 'Erro ao carregar peças prontas.');
        return;
    }

    const temMais = (data || []).length > limite;
    const exibidos = temMais ? data.slice(0, limite) : (data || []);
    relatoriosOperacionais.pecas.dados = exibidos;
    relatoriosOperacionais.pecas.temMais = temMais;

    const corpo = document.getElementById('rel-pecas-corpo');
    if (!corpo) return;
    if (exibidos.length === 0) {
        relSetEmpty('rel-pecas-corpo', 5, 'Nenhuma peça pronta cadastrada.');
    } else {
        corpo.innerHTML = exibidos.map(peca => `
            <tr class="border-b border-slate-100 hover:bg-slate-50">
                <td class="px-3 py-2 text-xs font-black text-slate-800">${relEscapeHtml(peca.nome || '-')}</td>
                <td class="px-3 py-2 text-xs font-bold text-slate-600 text-right">${relQuantidade(peca.quantidade)}</td>
                <td class="px-3 py-2 text-xs font-black text-indigo-600 text-right">${formatadorMoeda.format(relNumero(peca.preco_venda))}</td>
                <td class="px-3 py-2 text-xs font-bold text-slate-500">${relEscapeHtml(peca.categoria || '-')}</td>
                <td class="px-3 py-2">${relBadgeStatus(peca.quantidade)}</td>
            </tr>
        `).join('');
    }
    relToggleVerMais('pecas');
}

async function carregarRelatorioMateriais(resetar = false) {
    if (!currentUser) return;
    if (resetar) relatoriosOperacionais.materiais.limite = RELATORIO_LIMITE_INICIAL;
    relSetLoading('rel-materiais-corpo', 7);

    const limite = relatoriosOperacionais.materiais.limite;
    const { data, error } = await supabaseClient
        .from('materiais')
        .select('id, nome, descricao, quantidade, unidade, preco_unitario')
        .eq('user_id', currentUser.id)
        .order('nome', { ascending: true })
        .range(0, limite);

    if (error) {
        console.error('Erro no relatório de materiais:', error);
        relSetEmpty('rel-materiais-corpo', 7, 'Erro ao carregar materiais.');
        return;
    }

    const temMais = (data || []).length > limite;
    const exibidos = temMais ? data.slice(0, limite) : (data || []);
    relatoriosOperacionais.materiais.dados = exibidos;
    relatoriosOperacionais.materiais.temMais = temMais;

    const corpo = document.getElementById('rel-materiais-corpo');
    if (!corpo) return;
    if (exibidos.length === 0) {
        relSetEmpty('rel-materiais-corpo', 7, 'Nenhum material cadastrado.');
    } else {
        corpo.innerHTML = exibidos.map(material => {
            const quantidade = relNumero(material.quantidade);
            const precoUnitario = relNumero(material.preco_unitario);
            return `
                <tr class="border-b border-slate-100 hover:bg-slate-50">
                    <td class="px-3 py-2 text-xs font-black text-slate-800">${relEscapeHtml(material.nome || '-')}</td>
                    <td class="px-3 py-2 text-xs font-bold text-slate-500">${relEscapeHtml(material.descricao || '-')}</td>
                    <td class="px-3 py-2 text-xs font-bold text-slate-600 text-right">${relQuantidade(quantidade)}</td>
                    <td class="px-3 py-2 text-xs font-bold text-slate-500">${relEscapeHtml(material.unidade || '-')}</td>
                    <td class="px-3 py-2 text-xs font-bold text-slate-600 text-right">${formatadorMoeda.format(precoUnitario)}</td>
                    <td class="px-3 py-2 text-xs font-black text-indigo-600 text-right">${formatadorMoeda.format(quantidade * precoUnitario)}</td>
                    <td class="px-3 py-2">${relBadgeStatus(quantidade)}</td>
                </tr>
            `;
        }).join('');
    }
    relToggleVerMais('materiais');
}

async function carregarRelatorioCompras(resetar = false) {
    if (!currentUser) return;
    if (resetar) relatoriosOperacionais.compras.limite = RELATORIO_LIMITE_INICIAL;
    relSetLoading('rel-compras-corpo', 5);

    const limite = relatoriosOperacionais.compras.limite;
    const { inicial, final } = relObterPeriodo();
    const fornecedor = document.getElementById('rel-filtro-fornecedor')?.value.trim();
    let query = supabaseClient
        .from('compras')
        .select('id, fornecedor, data_compra, forma_pagamento, valor_total')
        .eq('user_id', currentUser.id)
        .order('data_compra', { ascending: false })
        .range(0, limite);

    if (inicial) query = query.gte('data_compra', inicial);
    if (final) query = query.lte('data_compra', final);
    if (fornecedor) query = query.ilike('fornecedor', `%${fornecedor}%`);

    const { data, error } = await query;
    if (error) {
        console.error('Erro no relatório de compras:', error);
        relSetEmpty('rel-compras-corpo', 5, 'Erro ao carregar compras.');
        return;
    }

    const temMais = (data || []).length > limite;
    const exibidos = temMais ? data.slice(0, limite) : (data || []);
    const contagemItens = await relContarItens('compras_itens', 'compra_id', exibidos.map(compra => compra.id));
    const dadosComItens = exibidos.map(compra => ({ ...compra, quantidade_itens: contagemItens[compra.id] || 0 }));
    relatoriosOperacionais.compras.dados = dadosComItens;
    relatoriosOperacionais.compras.temMais = temMais;

    const corpo = document.getElementById('rel-compras-corpo');
    if (!corpo) return;
    if (dadosComItens.length === 0) {
        relSetEmpty('rel-compras-corpo', 5, 'Nenhuma compra no período informado.');
    } else {
        corpo.innerHTML = dadosComItens.map(compra => `
            <tr class="border-b border-slate-100 hover:bg-slate-50">
                <td class="px-3 py-2 text-xs font-black text-slate-800">${relEscapeHtml(compra.fornecedor || 'Sem fornecedor')}</td>
                <td class="px-3 py-2 text-xs font-bold text-slate-600">${formatDate(compra.data_compra + 'T12:00:00')}</td>
                <td class="px-3 py-2 text-xs font-bold text-slate-500">${relEscapeHtml(compra.forma_pagamento || '-')}</td>
                <td class="px-3 py-2 text-xs font-black text-red-500 text-right">${formatadorMoeda.format(relNumero(compra.valor_total))}</td>
                <td class="px-3 py-2 text-xs font-bold text-slate-600 text-right">${compra.quantidade_itens}</td>
            </tr>
        `).join('');
    }
    relToggleVerMais('compras');
    await carregarResumoOperacional();
}

async function carregarRelatorioPedidos(resetar = false) {
    if (!currentUser) return;
    if (resetar) relatoriosOperacionais.pedidos.limite = RELATORIO_LIMITE_INICIAL;
    relSetLoading('rel-pedidos-corpo', 6);

    const limite = relatoriosOperacionais.pedidos.limite;
    const { inicial, final } = relObterPeriodo();
    const cliente = document.getElementById('rel-filtro-cliente')?.value.trim();
    let query = supabaseClient
        .from('pedidos_venda')
        .select('id, cliente, data_venda, forma_pagamento, valor_total, valor_pago')
        .eq('user_id', currentUser.id)
        .order('data_venda', { ascending: false })
        .range(0, limite);

    if (inicial) query = query.gte('data_venda', inicial);
    if (final) query = query.lte('data_venda', final);
    if (cliente) query = query.ilike('cliente', `%${cliente}%`);

    const { data, error } = await query;
    if (error) {
        console.error('Erro no relatório de pedidos:', error);
        relSetEmpty('rel-pedidos-corpo', 6, 'Erro ao carregar pedidos.');
        return;
    }

    const temMais = (data || []).length > limite;
    const exibidos = temMais ? data.slice(0, limite) : (data || []);
    const contagemItens = await relContarItens('pedidos_venda_itens', 'pedido_id', exibidos.map(pedido => pedido.id));
    const dadosComItens = exibidos.map(pedido => ({ ...pedido, quantidade_itens: contagemItens[pedido.id] || 0 }));
    relatoriosOperacionais.pedidos.dados = dadosComItens;
    relatoriosOperacionais.pedidos.temMais = temMais;

    const corpo = document.getElementById('rel-pedidos-corpo');
    if (!corpo) return;
    if (dadosComItens.length === 0) {
        relSetEmpty('rel-pedidos-corpo', 6, 'Nenhum pedido no período informado.');
    } else {
        corpo.innerHTML = dadosComItens.map(pedido => `
            <tr class="border-b border-slate-100 hover:bg-slate-50">
                <td class="px-3 py-2 text-xs font-black text-slate-800">${relEscapeHtml(pedido.cliente || 'Cliente Sem Nome')}</td>
                <td class="px-3 py-2 text-xs font-bold text-slate-600">${formatDate(pedido.data_venda + 'T12:00:00')}</td>
                <td class="px-3 py-2 text-xs font-bold text-slate-500">${relEscapeHtml(pedido.forma_pagamento || '-')}</td>
                <td class="px-3 py-2 text-xs font-black text-emerald-600 text-right">${formatadorMoeda.format(relNumero(pedido.valor_total))}</td>
                <td class="px-3 py-2 text-xs font-black text-emerald-700 text-right">${formatadorMoeda.format(relNumero(pedido.valor_pago))}</td>
                <td class="px-3 py-2 text-xs font-bold text-slate-600 text-right">${pedido.quantidade_itens}</td>
            </tr>
        `).join('');
    }
    relToggleVerMais('pedidos');
    await carregarResumoOperacional();
}

async function relContarItens(tabela, coluna, ids) {
    if (!ids || ids.length === 0) return {};
    const { data, error } = await supabaseClient
        .from(tabela)
        .select(coluna)
        .in(coluna, ids);

    if (error) {
        console.error(`Erro ao contar itens em ${tabela}:`, error);
        return {};
    }

    return (data || []).reduce((acc, item) => {
        acc[item[coluna]] = (acc[item[coluna]] || 0) + 1;
        return acc;
    }, {});
}

async function carregarResumoOperacional() {
    if (!currentUser) return;
    inicializarFiltrosRelatorios();
    const container = document.getElementById('rel-resumo-cards');
    if (!container) return;
    container.innerHTML = '<div class="col-span-full p-6 text-center text-slate-400 font-bold">Carregando resumo...</div>';

    const { inicial, final } = relObterPeriodo();
    const [pecasResp, materiaisResp, comprasResp, pedidosResp] = await Promise.all([
        supabaseClient.from('pecas').select('quantidade, preco_venda').eq('user_id', currentUser.id),
        supabaseClient.from('materiais').select('quantidade, preco_unitario').eq('user_id', currentUser.id),
        relQueryPeriodo('compras', 'data_compra', 'valor_total', inicial, final),
        relQueryPeriodo('pedidos_venda', 'data_venda', 'valor_total, valor_pago', inicial, final),
    ]);

    if (pecasResp.error || materiaisResp.error || comprasResp.error || pedidosResp.error) {
        console.error('Erro no resumo operacional:', pecasResp.error || materiaisResp.error || comprasResp.error || pedidosResp.error);
        container.innerHTML = '<div class="col-span-full p-6 text-center text-red-400 font-bold">Erro ao carregar resumo geral.</div>';
        return;
    }

    const totalPecas = (pecasResp.data || []).reduce((acc, peca) => acc + relNumero(peca.quantidade), 0);
    const valorPecas = (pecasResp.data || []).reduce((acc, peca) => acc + (relNumero(peca.quantidade) * relNumero(peca.preco_venda)), 0);
    const totalMateriais = (materiaisResp.data || []).reduce((acc, material) => acc + relNumero(material.quantidade), 0);
    const valorMateriais = (materiaisResp.data || []).reduce((acc, material) => acc + (relNumero(material.quantidade) * relNumero(material.preco_unitario)), 0);
    const comprasPeriodo = (comprasResp.data || []).reduce((acc, compra) => acc + relNumero(compra.valor_total), 0);
    const vendasPeriodo = (pedidosResp.data || []).reduce((acc, pedido) => acc + relNumero(pedido.valor_pago || pedido.valor_total), 0);
    const saldoPeriodo = vendasPeriodo - comprasPeriodo;

    const cards = [
        { label: 'Total em peças prontas', valor: relQuantidade(totalPecas), cor: 'text-slate-800' },
        { label: 'Valor estimado das peças', valor: formatadorMoeda.format(valorPecas), cor: 'text-indigo-600' },
        { label: 'Total em materiais', valor: relQuantidade(totalMateriais), cor: 'text-slate-800' },
        { label: 'Valor estimado do estoque', valor: formatadorMoeda.format(valorMateriais), cor: 'text-indigo-600' },
        { label: 'Compras no período', valor: formatadorMoeda.format(comprasPeriodo), cor: 'text-red-500' },
        { label: 'Vendas no período', valor: formatadorMoeda.format(vendasPeriodo), cor: 'text-emerald-600' },
        { label: 'Saldo do período', valor: formatadorMoeda.format(saldoPeriodo), cor: saldoPeriodo < 0 ? 'text-red-500' : 'text-emerald-600' },
    ];

    container.innerHTML = cards.map(card => `
        <div class="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">${card.label}</p>
            <p class="text-xl font-black ${card.cor}">${card.valor}</p>
        </div>
    `).join('');
}

function relQueryPeriodo(tabela, colunaData, colunas, inicial, final) {
    let query = supabaseClient
        .from(tabela)
        .select(colunas)
        .eq('user_id', currentUser.id);

    if (inicial) query = query.gte(colunaData, inicial);
    if (final) query = query.lte(colunaData, final);
    return query;
}

function verMaisRelatorio(tipo) {
    if (!relatoriosOperacionais[tipo]) return;
    relatoriosOperacionais[tipo].limite += RELATORIO_LIMITE_INICIAL;
    if (tipo === 'pecas') carregarRelatorioPecasProntas();
    if (tipo === 'materiais') carregarRelatorioMateriais();
    if (tipo === 'compras') carregarRelatorioCompras();
    if (tipo === 'pedidos') carregarRelatorioPedidos();
}

function exportarRelatorioCSV(tipo) {
    const dados = relatoriosOperacionais[tipo]?.dados || [];
    if (dados.length === 0) return showToast('Atualize o relatório antes de exportar.', 'error');

    const config = {
        pecas: {
            nome: 'relatorio-pecas-prontas.csv',
            cabecalho: ['Peça', 'Quantidade disponível', 'Preço de venda', 'Categoria', 'Status'],
            linhas: dados.map(p => [p.nome || '-', relNumero(p.quantidade), relNumero(p.preco_venda), p.categoria || '-', relNumero(p.quantidade) <= 0 ? 'Zerado' : relNumero(p.quantidade) < 5 ? 'Baixo' : 'OK']),
        },
        materiais: {
            nome: 'relatorio-estoque-materiais.csv',
            cabecalho: ['Material', 'Descrição', 'Quantidade', 'Unidade', 'Preço unitário', 'Valor estimado', 'Status'],
            linhas: dados.map(m => [m.nome || '-', m.descricao || '-', relNumero(m.quantidade), m.unidade || '-', relNumero(m.preco_unitario), relNumero(m.quantidade) * relNumero(m.preco_unitario), relNumero(m.quantidade) <= 0 ? 'Zerado' : relNumero(m.quantidade) < 5 ? 'Baixo' : 'OK']),
        },
        compras: {
            nome: 'relatorio-compras.csv',
            cabecalho: ['Fornecedor', 'Data', 'Forma de pagamento', 'Valor total', 'Quantidade de itens'],
            linhas: dados.map(c => [c.fornecedor || 'Sem fornecedor', c.data_compra || '-', c.forma_pagamento || '-', relNumero(c.valor_total), c.quantidade_itens || 0]),
        },
        pedidos: {
            nome: 'relatorio-pedidos-venda.csv',
            cabecalho: ['Cliente', 'Data', 'Forma de pagamento', 'Valor total', 'Valor pago', 'Quantidade de itens'],
            linhas: dados.map(p => [p.cliente || 'Cliente Sem Nome', p.data_venda || '-', p.forma_pagamento || '-', relNumero(p.valor_total), relNumero(p.valor_pago), p.quantidade_itens || 0]),
        },
    }[tipo];

    if (!config) return;
    const csv = [config.cabecalho, ...config.linhas]
        .map(linha => linha.map(relCsvValor).join(';'))
        .join('\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = config.nome;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function relCsvValor(valor) {
    return `"${String(valor ?? '').replace(/"/g, '""')}"`;
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
    
    const { data: orcamentos, error: orcError } = await supabaseClient
        .from('orcamentos')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

    const { data: financeiro, error: finError } = await supabaseClient
        .from('financeiro')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('data_movimentacao', { ascending: false });

    if (orcError || finError) return;
    
    atualizarDashboard(orcamentos || [], financeiro || []);
    renderizarHistorico(orcamentos || []);
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

function atualizarDashboard(orcamentos, financeiro = []) {
    if (!orcamentos) return;

    const filtro = document.getElementById('filtro-mes-ano')?.value;
    const [anoFiltro, mesFiltro] = filtro
        ? filtro.split('-')
        : [new Date().getFullYear(), new Date().getMonth() + 1];

    const estaNoPeriodo = (valorData) => {
        const d = new Date(`${valorData}${String(valorData).includes('T') ? '' : 'T12:00:00'}`);
        return d.getFullYear() == anoFiltro && (d.getMonth() + 1) == mesFiltro;
    };

    const financeiroMes = financeiro.filter(f => estaNoPeriodo(f.data_movimentacao));

    // 1. Ajustes/Orçamentos: orçamentos entregues no período selecionado.
    const ajustesOrcamentos = orcamentos
        .filter(o => o.status === 'Entregue' && estaNoPeriodo(o.created_at))
        .reduce((acc, o) => acc + (parseFloat(o.total) || 0), 0);

    // 2. Vendas Diretas: entradas financeiras gravadas pela venda direta de catálogo.
    const vendasDiretas = financeiroMes
        .filter(f => f.tipo === 'ENTRADA' && ['Venda Direta', 'Venda de Peça'].includes(f.categoria))
        .reduce((acc, f) => acc + (parseFloat(f.valor) || 0), 0);

    // 3. Receita Total: soma dos orçamentos entregues com as vendas diretas.
    const receitaTotal = ajustesOrcamentos + vendasDiretas;
    const despesas = financeiroMes
        .filter(f => f.tipo === 'SAIDA')
        .reduce((acc, f) => acc + (parseFloat(f.valor) || 0), 0);
    const lucro = receitaTotal - despesas;

    const setDashboardValue = (id, valor) => {
        const element = document.getElementById(id);
        if (element) element.innerText = formatadorMoeda.format(valor);
    };

    setDashboardValue('dash-ajustes', ajustesOrcamentos);
    setDashboardValue('dash-vendas-diretas', vendasDiretas);
    setDashboardValue('dash-receitas', receitaTotal);
    setDashboardValue('dash-despesas', despesas);
    setDashboardValue('dash-lucro', lucro);

    // 4. A Receber (Orçamentos que ainda não foram entregues)
    const aReceber = orcamentos
        .filter(o => ['Pendente', 'Aguardando Aprovação', 'Em Produção'].includes(o.status))
        .reduce((acc, o) => acc + (parseFloat(o.total) || 0), 0);
    setDashboardValue('dash-receber', aReceber);

    // 5. Total Geral (Soma de todos os orçamentos entregues + vendas diretas na história)
    const totalGeralOrcamentos = orcamentos
        .filter(o => o.status === 'Entregue')
        .reduce((acc, o) => acc + (parseFloat(o.total) || 0), 0);
    const totalGeralVendasDiretas = financeiro
        .filter(f => f.tipo === 'ENTRADA' && ['Venda Direta', 'Venda de Peça'].includes(f.categoria))
        .reduce((acc, f) => acc + (parseFloat(f.valor) || 0), 0);
    setDashboardValue('dash-total', totalGeralOrcamentos + totalGeralVendasDiretas);

    // 6. Gráfico de Status
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

    if (labels.length === 0) {
        // Se não houver dados, não tenta renderizar o gráfico
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

// --- CALCULADORA DE ÁREA / METRO LINEAR ---
let modoCalculadoraMedidas = 'area';
let ultimoResultadoCalculadora = { modo: 'area', valor: 0 };

function numeroCalculadora(valor) {
    return parseFloat(valor) || 0;
}

function formatarNumeroCalculadora(valor, casas = 4) {
    return parseFloat((numeroCalculadora(valor)).toFixed(casas)).toString().replace('.', ',');
}

function unidadeSugereMetroLinear(unidade) {
    return ['metros', 'metro', 'm', 'tecido'].includes(String(unidade || '').trim().toLowerCase());
}

function obterModoPadraoCalculadora(origem) {
    if (origem === 'material') {
        return unidadeSugereMetroLinear(document.getElementById('material-unidade')?.value) ? 'linear' : 'area';
    }

    if (origem === 'peca') {
        const materialId = document.getElementById('peca-material-select')?.value;
        const material = materiais.find(m => String(m.id) === String(materialId));
        return unidadeSugereMetroLinear(material?.unidade) ? 'linear' : 'area';
    }

    return 'area';
}

function limparCamposCalculadoraMedidas() {
    ['mini-largura', 'mini-altura', 'linear-largura-tecido', 'linear-comprimento', 'linear-preco-total', 'linear-uso'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const resultado = document.getElementById('mini-resultado');
    const detalhe = document.getElementById('mini-resultado-detalhe');
    if (resultado) resultado.innerText = modoCalculadoraMedidas === 'linear' ? 'R$ 0,00 por metro linear' : '0,0000 m²';
    if (detalhe) detalhe.innerText = '';
    ultimoResultadoCalculadora = { modo: modoCalculadoraMedidas, valor: 0 };
}

function configurarCalculadoraMedidas(origem, modo = null) {
    document.getElementById('calc-origem').value = origem;
    setModoCalculadoraMedidas(modo || obterModoPadraoCalculadora(origem), false);
    limparCamposCalculadoraMedidas();
    document.getElementById('modal-calc-area').classList.remove('hidden');
    calcularMedidaAtual();
}

function setModoCalculadoraMedidas(modo, recalcular = true) {
    modoCalculadoraMedidas = modo === 'linear' ? 'linear' : 'area';
    const areaAtivo = modoCalculadoraMedidas === 'area';

    document.getElementById('calc-bloco-area')?.classList.toggle('hidden', !areaAtivo);
    document.getElementById('calc-bloco-linear')?.classList.toggle('hidden', areaAtivo);

    const btnArea = document.getElementById('calc-modo-area');
    const btnLinear = document.getElementById('calc-modo-linear');
    btnArea?.classList.toggle('bg-white', areaAtivo);
    btnArea?.classList.toggle('text-indigo-600', areaAtivo);
    btnArea?.classList.toggle('shadow-sm', areaAtivo);
    btnArea?.classList.toggle('text-slate-500', !areaAtivo);
    btnLinear?.classList.toggle('bg-white', !areaAtivo);
    btnLinear?.classList.toggle('text-indigo-600', !areaAtivo);
    btnLinear?.classList.toggle('shadow-sm', !areaAtivo);
    btnLinear?.classList.toggle('text-slate-500', areaAtivo);

    const label = document.getElementById('mini-resultado-label');
    if (label) label.innerText = areaAtivo ? 'Resultado em m²' : 'Resultado em metro linear';

    if (recalcular) calcularMedidaAtual();
}

function calcularMedidaAtual() {
    if (modoCalculadoraMedidas === 'linear') return calcularMetroLinearAtual();
    return calcularAreaAtual();
}

function calcularAreaAtual() {
    const largura = numeroCalculadora(document.getElementById('mini-largura')?.value);
    const altura = numeroCalculadora(document.getElementById('mini-altura')?.value);
    const areaM2 = (largura * altura) / 10000;

    ultimoResultadoCalculadora = { modo: 'area', valor: areaM2 };
    const resultado = document.getElementById('mini-resultado');
    const detalhe = document.getElementById('mini-resultado-detalhe');
    if (resultado) resultado.innerText = `${areaM2.toFixed(4).replace('.', ',')} m²`;
    if (detalhe) detalhe.innerText = largura && altura ? `${formatarNumeroCalculadora(largura, 4)} cm × ${formatarNumeroCalculadora(altura, 4)} cm` : '';
    return ultimoResultadoCalculadora;
}

function calcularMetroLinearAtual() {
    const larguraTecidoCm = numeroCalculadora(document.getElementById('linear-largura-tecido')?.value);
    const comprimentoCm = numeroCalculadora(document.getElementById('linear-comprimento')?.value);
    const precoTotal = numeroCalculadora(document.getElementById('linear-preco-total')?.value);
    const usoCm = numeroCalculadora(document.getElementById('linear-uso')?.value);
    const comprimentoM = comprimentoCm / 100;
    const usoM = usoCm / 100;
    const precoMetroLinear = comprimentoM > 0 ? precoTotal / comprimentoM : 0;
    const custoUso = usoM * precoMetroLinear;

    ultimoResultadoCalculadora = {
        modo: 'linear',
        valor: usoM || comprimentoM,
        comprimentoM,
        usoM,
        precoMetroLinear,
        custoUso,
        larguraTecidoCm,
        precoTotal,
    };

    const resultado = document.getElementById('mini-resultado');
    const detalhe = document.getElementById('mini-resultado-detalhe');
    if (resultado) resultado.innerText = `${formatadorMoeda.format(precoMetroLinear)} por metro linear`;
    if (detalhe) {
        const partes = [];
        if (larguraTecidoCm) partes.push(`largura ${formatarNumeroCalculadora(larguraTecidoCm, 4)} cm`);
        if (comprimentoCm) partes.push(`comprado ${formatarNumeroCalculadora(comprimentoCm, 4)} cm (${formatarNumeroCalculadora(comprimentoM, 4)} m)`);
        if (usoCm) partes.push(`uso ${formatarNumeroCalculadora(usoCm, 4)} cm (${formatarNumeroCalculadora(usoM, 4)} m) = ${formatadorMoeda.format(custoUso)}`);
        detalhe.innerText = partes.join(' • ');
    }
    return ultimoResultadoCalculadora;
}

function abrirCalculadoraAreaMaterial() {
    configurarCalculadoraMedidas('material');
}

function abrirCalculadoraAreaCompra() {
    configurarCalculadoraMedidas('compra', 'area');
}

function fecharCalculadoraArea() { document.getElementById('modal-calc-area').classList.add('hidden'); }

function aplicarResultadoArea() {
    const resultado = calcularMedidaAtual();
    const origem = document.getElementById('calc-origem').value || 'peca';

    if (resultado.modo === 'linear') {
        if (origem === 'material') {
            const quantidade = resultado.comprimentoM || resultado.valor || 0;
            document.getElementById('material-quantidade').value = quantidade.toFixed(4);
            document.getElementById('material-preco-total').value = resultado.precoTotal ? resultado.precoTotal.toFixed(2) : '';
            document.getElementById('material-preco-unitario').value = resultado.precoMetroLinear ? resultado.precoMetroLinear.toFixed(2) : '';
            const texto = document.getElementById('material-calculo-texto');
            const bloco = document.getElementById('material-calculo-resultado');
            if (texto && bloco) {
                bloco.classList.remove('hidden');
                texto.innerText = `${formatadorMoeda.format(resultado.precoMetroLinear)} por metro linear • ${formatarNumeroCalculadora(quantidade, 4)} m comprados`;
            }
        } else if (origem === 'peca') {
            document.getElementById('peca-material-qtd').value = (resultado.usoM || resultado.valor || 0).toFixed(4);
        } else if (origem === 'compra') {
            document.getElementById('compra-quantidade').value = (resultado.comprimentoM || resultado.valor || 0).toFixed(4);
        }
    } else if (origem === 'material') {
        document.getElementById('material-quantidade').value = resultado.valor.toFixed(4);
        if (typeof calcularPrecoUnitarioMaterial === 'function') calcularPrecoUnitarioMaterial();
    } else if (origem === 'compra') {
        document.getElementById('compra-quantidade').value = resultado.valor.toFixed(4);
    } else if (origem === 'caixa' && typeof aplicarResultadoAreaCaixaItem === 'function') {
        aplicarResultadoAreaCaixaItem(resultado.valor.toFixed(4));
    } else {
        document.getElementById('peca-material-qtd').value = resultado.valor.toFixed(4);
    }

    if (origem === 'peca' && typeof atualizarPrecificacaoTempoReal === 'function') atualizarPrecificacaoTempoReal();
    fecharCalculadoraArea();
}
