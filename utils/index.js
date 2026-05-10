// ====================== UTILITÁRIOS GERAIS ======================

const formatadorMoeda = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
});

function formatCurrency(value) {
    return formatadorMoeda.format(Number(value) || 0);
}

function formatDate(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return date.toLocaleDateString('pt-BR');
}

function showAlert(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`;
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function generateId(prefix = '') {
    const randomId = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return prefix ? `${prefix}-${randomId}` : randomId;
}

window.formatadorMoeda = formatadorMoeda;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
window.showAlert = showAlert;
window.showToast = showAlert;
window.generateId = generateId;
