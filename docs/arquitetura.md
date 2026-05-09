# Arquitetura do Sistema Ateliê Viva Arte

## Visão geral

O **Sistema Ateliê Viva Arte** é uma aplicação web hospedável na Vercel, com frontend em HTML/CSS/JavaScript e backend em Supabase.

O objetivo de negócio é suportar duas trilhas operacionais distintas:

1. **Ajustes de costura (serviços)**.
2. **Produção e venda de peças (produto)**.

> Regra central: **ajustes são separados da venda de peças**.

---

## Stack tecnológica

- **Frontend:** HTML, CSS e JavaScript.
- **Backend/BaaS:** Supabase (Auth + Banco).
- **Deploy:** Vercel.

---

## Funcionalidades principais

- Login por e-mail.
- Controle de estoque de materiais.
- Produção de peças.
- Ajustes de costura.
- Orçamentos.
- Geração/impressão de PDF.
- Envio por WhatsApp.
- Dashboard financeiro.

---

## Regras de negócio importantes

1. **Ajustes e venda de peças são fluxos separados.**
2. **Produção baixa estoque automaticamente** (consumo de materiais).
3. **Venda reduz peças prontas** (saldo de produtos acabados).
4. **Autenticação via Supabase Auth.**
5. **Todas as tabelas usam RLS** (Row Level Security).

---

## Organização atual do repositório

```text
/
├─ index.html        # estrutura da interface (views, navegação, modais)
├─ style.css         # estilos gerais e impressão/PDF
├─ script.js         # regra de negócio e integrações Supabase
├─ script_full.js    # versão legada/alternativa
├─ funcs_new.txt     # referência auxiliar de funções
├─ funcs_old.txt     # referência auxiliar legada
└─ docs/
   └─ arquitetura.md
```

---

## Arquitetura lógica (estado atual)

### 1) Camada de apresentação
- UI em uma única página com abas e modais.
- Renderização dinâmica por JavaScript (sem framework).

### 2) Camada de aplicação
- Regras de cálculo de orçamento, estoque, produção, venda e dashboard.
- Estado em memória no cliente (arrays/objetos globais).

### 3) Camada de dados
- Supabase como fonte de verdade.
- Operações CRUD realizadas pelo frontend autenticado.

---

## Fluxos críticos

### Fluxo A — Ajustes de costura
1. Usuário monta orçamento de serviço.
2. Sistema calcula subtotal/complexidade/urgência/desconto/total.
3. Orçamento pode ser exportado (PDF) e enviado (WhatsApp).

### Fluxo B — Produção de peças
1. Usuário registra produção de peça.
2. Sistema consome materiais do estoque automaticamente.
3. Sistema aumenta quantidade de peças prontas.

### Fluxo C — Venda de peças prontas
1. Usuário registra venda.
2. Sistema reduz saldo de peças prontas.
3. Movimentação impacta visão financeira/dashboards.

---

## Segurança e acesso

- A autenticação é feita no Supabase Auth.
- O acesso aos dados deve depender de políticas RLS por usuário/tenant.
- O frontend usa chave pública (anon/publishable), portanto a proteção real está nas políticas de banco.

---

## Diretriz de evolução (objetivo atual)

**Objetivo atual:** refatorar gradualmente sem quebrar funcionalidades.

### Estratégia recomendada

1. **Congelar comportamento atual**
   - Mapear fluxos críticos e validar manualmente cenários-chave.

2. **Refatorar por módulos pequenos**
   - Separar arquivos por domínio (auth, estoque, produção, venda, orçamentos, financeiro, ui).

3. **Manter compatibilidade funcional**
   - Cada etapa deve preservar regras: separação ajustes/venda, baixa automática em produção e redução de prontas na venda.

4. **Adicionar rede de segurança**
   - Checklists de regressão por fluxo.
   - Testes incrementais para funções de cálculo e mutações de estoque/saldo.

5. **Só depois evoluir stack**
   - Quando estável, migrar para módulos ES/bundler sem alterar regras de negócio.

---

## Resumo executivo

A arquitetura atual é pragmática e funcional para operação diária do ateliê. A prioridade técnica é evoluir a organização interna do código em passos pequenos, mantendo intactos os fluxos de negócio e as garantias de segurança via Supabase Auth + RLS.
