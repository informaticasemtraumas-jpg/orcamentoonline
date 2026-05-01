// Inicialização dos ícones Lucide
lucide.createIcons();

// Estado Global da Aplicação
let itensOrcamento = [];
let complexidadeAtual = 1.0;
let complexidadeNome = "Padrão";

// Formatador de Moeda (BRL)
const formatadorMoeda = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
});

// Carregar dados salvos ao iniciar
window.onload = () => {
    const configSalva = localStorage.getItem('configAtelie');
    if (configSalva) {
        const config = JSON.parse(configSalva);
        
        // Se o nome salvo for o antigo, vamos forçar a atualização para o novo
        if (config.atelieNome === "Ateliê Pro Maceió" || !config.atelieNome) {
            config.atelieNome = "Ateliê Viva Arte";
            config.atelieFone = "(82) 98163-1996";
            config.atelieExtra = "@atelievivarte";
            localStorage.setItem('configAtelie', JSON.stringify(config));
        }

        document.getElementById('salario').value = config.salario;
        document.getElementById('horas-mes').value = config.horasMes;
        document.getElementById('base-fixo').value = config.baseFixo;
        document.getElementById('base-margem').value = config.baseMargem;
        document.getElementById('base-preparo').value = config.basePreparo;
        document.getElementById('atelie-nome').value = config.atelieNome;
        document.getElementById('atelie-fone').value = config.atelieFone;
        document.getElementById('atelie-extra').value = config.atelieExtra;
    } else {
        // Se não houver nada salvo, define os padrões
        document.getElementById('atelie-nome').value = "Ateliê Viva Arte";
        document.getElementById('atelie-fone').value = "(82) 98163-1996";
        document.getElementById('atelie-extra').value = "@atelievivarte";
    }
    recalcularValorHora();
};

// Funções de Interface
function toggleConfig() {
    const content = document.getElementById('config-content');
    const icon = document.getElementById('config-icon');
    content.classList.toggle('config-hidden');
    icon.style.transform = content.classList.contains('config-hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
}

function setComplex(valor, btn) {
    complexidadeAtual = valor;
    complexidadeNome = btn.innerText;
    
    // UI Update
    document.querySelectorAll('.complex-btn').forEach(b => {
        b.classList.remove('border-indigo-600', 'bg-indigo-50', 'text-indigo-700');
        b.classList.add('border-slate-200', 'bg-white', 'text-slate-600');
    });
    btn.classList.remove('border-slate-200', 'bg-white', 'text-slate-600');
    btn.classList.add('border-indigo-600', 'bg-indigo-50', 'text-indigo-700');
}

// Lógica de Cálculos
function recalcularValorHora() {
    const salario = parseFloat(document.getElementById('salario').value) || 0;
    const horasMes = parseFloat(document.getElementById('horas-mes').value) || 1;
    const valorHora = salario / horasMes;
    
    document.getElementById('res-hora-base').innerText = formatadorMoeda.format(valorHora);
    document.getElementById('label-hora-atual').innerText = `${formatadorMoeda.format(valorHora)}/hora`;
    
    salvarConfig();
    calcularTotal();
}

function salvarConfig() {
    const config = {
        salario: document.getElementById('salario').value,
        horasMes: document.getElementById('horas-mes').value,
        baseFixo: document.getElementById('base-fixo').value,
        baseMargem: document.getElementById('base-margem').value,
        basePreparo: document.getElementById('base-preparo').value,
        atelieNome: document.getElementById('atelie-nome').value,
        atelieFone: document.getElementById('atelie-fone').value,
        atelieExtra: document.getElementById('atelie-extra').value
    };
    localStorage.setItem('configAtelie', JSON.stringify(config));
}

function calcularPrecoServico(tempoMin, custoMateriais) {
    const salario = parseFloat(document.getElementById('salario').value) || 0;
    const horasMes = parseFloat(document.getElementById('horas-mes').value) || 1;
    const valorMinuto = (salario / horasMes) / 60;
    
    const tempoPreparo = parseFloat(document.getElementById('base-preparo').value) || 0;
    const custoFixo = parseFloat(document.getElementById('base-fixo').value) || 0;
    const margemLucro = (parseFloat(document.getElementById('base-margem').value) || 0) / 100;
    const isUrgente = document.getElementById('urgencia').checked;

    // Cálculo Base: (Tempo de Costura + Tempo de Mesa) * Valor do Minuto
    let precoMaoDeObra = (tempoMin + tempoPreparo) * valorMinuto;
    
    // Aplica Complexidade
    precoMaoDeObra *= complexidadeAtual;

    // Soma Materiais e Custos Fixos
    let subtotal = precoMaoDeObra + custoMateriais + custoFixo;

    // Aplica Margem de Lucro
    let precoComMargem = subtotal / (1 - margemLucro);

    // Aplica Urgência se houver
    if (isUrgente) precoComMargem *= 1.30;

    return Math.ceil(precoComMargem);
}

function adicionarPeca() {
    const select = document.getElementById('servico');
    const option = select.options[select.selectedIndex];
    
    if (!option.value) {
        alert("Por favor, selecione um serviço.");
        return;
    }

    const tempo = parseFloat(option.dataset.tempo);
    const materiais = parseFloat(option.dataset.materiais);
    const precoFinal = calcularPrecoServico(tempo, materiais);

    const novaPeca = {
        id: Date.now(),
        nome: option.text,
        complexidadeNome: complexidadeNome,
        precoUnitario: precoFinal
    };

    itensOrcamento.push(novaPeca);
    renderizarLista();
    calcularTotal();
}

function removerPeca(id) {
    itensOrcamento = itensOrcamento.filter(item => item.id !== id);
    renderizarLista();
    calcularTotal();
}

function renderizarLista() {
    const container = document.getElementById('lista-pecas');
    container.innerHTML = '';

    itensOrcamento.forEach(item => {
        const div = document.createElement('div');
        div.className = "flex justify-between items-center p-4 bg-white border border-slate-100 rounded-xl shadow-sm animate-in fade-in slide-in-from-right-4";
        div.innerHTML = `
            <div>
                <p class="font-bold text-slate-800">${item.nome}</p>
                <p class="text-xs text-slate-400 uppercase font-bold">${item.complexidadeNome}</p>
            </div>
            <div class="flex items-center gap-4">
                <span class="font-mono font-bold text-indigo-600">${formatadorMoeda.format(item.precoUnitario)}</span>
                <button onclick="removerPeca(${item.id})" class="text-slate-300 hover:text-red-500 transition-colors">
                    <i data-lucide="trash-2" class="w-5 h-5"></i>
                </button>
            </div>
        `;
        container.appendChild(div);
    });
    lucide.createIcons();
}

function calcularTotal() {
    const subtotal = itensOrcamento.reduce((acc, item) => acc + item.precoUnitario, 0);
    const desconto = parseFloat(document.getElementById('desconto').value) || 0;
    const total = Math.max(0, subtotal - desconto);

    document.getElementById('res-subtotal').innerText = formatadorMoeda.format(subtotal);
    document.getElementById('res-desconto').innerText = `- ${formatadorMoeda.format(desconto)}`;
    document.getElementById('res-total').innerText = formatadorMoeda.format(total);

    return { subtotal, desconto, total };
}

// Funções de Saída (PDF e WhatsApp)
function enviarWhatsApp() {
    const cliente = document.getElementById('cliente').value || "Cliente";
    const whatsapp = document.getElementById('whatsapp').value.replace(/\D/g, '');
    const totais = calcularTotal();

    if (itensOrcamento.length === 0) {
        alert("Adicione pelo menos uma peça ao orçamento.");
        return;
    }

    let mensagem = `*ORÇAMENTO - ATELIÊ VIVA ARTE*\n`;
    mensagem += `Olá, ${cliente}! Segue o resumo do seu orçamento:\n\n`;

    itensOrcamento.forEach((item, index) => {
        mensagem += `${index + 1}. ${item.nome} (${item.complexidadeNome}) - *${formatadorMoeda.format(item.precoUnitario)}*\n`;
    });

    if (totais.desconto > 0) {
        mensagem += `\nSubtotal: ${formatadorMoeda.format(totais.subtotal)}`;
        mensagem += `\nDesconto: - ${formatadorMoeda.format(totais.desconto)}`;
    }

    mensagem += `\n\n*TOTAL: ${formatadorMoeda.format(totais.total)}*`;
    mensagem += `\n\n_Validade: 07 dias. Aguardamos sua aprovação!_`;

    const url = `https://api.whatsapp.com/send?phone=55${whatsapp}&text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
}

function gerarPDF() {
    const cliente = document.getElementById('cliente').value || "-";
    const whatsapp = document.getElementById('whatsapp').value || "-";
    const totaisCalculados = calcularTotal();

    if (itensOrcamento.length === 0) {
        alert("Adicione itens para gerar o PDF.");
        return;
    }

    // 1. Preenche Cabeçalho Dinâmico
    const nomeAtelie = document.getElementById('atelie-nome').value || "Ateliê Viva Arte";
    const foneAtelie = document.getElementById('atelie-fone').value || "";
    const extraAtelie = document.getElementById('atelie-extra').value || "";

    document.getElementById('pdf-header-nome').innerText = nomeAtelie;
    document.getElementById('pdf-header-contato').innerText = `WhatsApp: ${foneAtelie} | ${extraAtelie}`;

    // 2. Preenche Dados do Cliente e Data
    document.getElementById('pdf-cliente-nome').innerText = cliente;
    document.getElementById('pdf-cliente-fone').innerText = whatsapp;
    document.getElementById('pdf-data').innerText = new Date().toLocaleDateString('pt-BR');
    document.getElementById('pdf-numero').innerText = Date.now().toString().slice(-6);

    // 3. Preenche Tabela de Itens
    const tabelaCorpo = document.getElementById('pdf-tabela-corpo');
    tabelaCorpo.innerHTML = '';

    itensOrcamento.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = "border-b border-slate-100";
        
        const isUrgente = document.getElementById('urgencia').checked;
        const nomeDisplay = isUrgente ? `${item.nome} (Express)` : item.nome;

        tr.innerHTML = `
            <td class="py-3 px-2">1</td>
            <td class="py-3 px-2">${nomeDisplay}</td>
            <td class="py-3 px-2">${item.complexidadeNome}</td>
            <td class="py-3 px-2 text-right">${formatadorMoeda.format(item.precoUnitario)}</td>
        `;
        tabelaCorpo.appendChild(tr);
    });

    // 4. Preenche Valores Financeiros
    document.getElementById('pdf-subtotal').innerText = formatadorMoeda.format(totaisCalculados.subtotal);
    
    const linhaDesconto = document.getElementById('pdf-linha-desconto');
    if (totaisCalculados.desconto > 0) {
        linhaDesconto.style.display = 'flex';
        document.getElementById('pdf-desconto').innerText = `- ${formatadorMoeda.format(totaisCalculados.desconto)}`;
    } else {
        linhaDesconto.style.display = 'none';
    }
    
    document.getElementById('pdf-total').innerText = formatadorMoeda.format(totaisCalculados.total);

    // 5. Exibe o Modal
    document.getElementById('modal-pdf').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function fecharModalPDF() {
    document.getElementById('modal-pdf').classList.add('hidden');
    document.body.style.overflow = 'auto';
}

function imprimirPDF() {
    window.print();
}
