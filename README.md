# 🚀 BeautyBot - Integração Stripe + Sistema de Vouchers

Guia completo para configurar pagamentos Stripe e sistema de vouchers no BeautyBot.

## 📋 O que foi implementado

✅ **Tabelas Supabase:**
- `subscriptions` - Armazena assinaturas dos usuários
- `vouchers` - Códigos de desconto configuráveis
- `voucher_uses` - Histórico de uso de vouchers

 
✅ **APIs Serverless (Vercel):**
- `/api/stripe-checkout` - Cria sessão de checkout
- `/api/stripe-webhook` - Processa eventos do Stripe
- `/api/vouchers` - CRUD completo de vouchers (admin)

✅ **Interface Admin:**
- `admin-vouchers.html` - Painel para criar e gerenciar vouchers
- Estatísticas em tempo real
- Ativar/desativar vouchers
- Controle de uso e validade

## 🎯 Planos de Assinatura

- **Essencial**: €97/mês
- **Premium**: €197/mês

## 🔧 Configuração Passo a Passo

### 1️⃣ Criar Conta Stripe

1. Acesse [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Cadastre-se com o email: **tishaprados@gmail.com**
3. Complete a verificação de conta
4. Ative o modo de teste para desenvolvimento

### 2️⃣ Obter Chaves da API Stripe

1. Vá para: [https://dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys)
2. Copie:
   - **Publishable key** (pk_test_...)
   - **Secret key** (sk_test_...)
3. Guarde estas chaves - você vai precisar delas!

### 3️⃣ Configurar Produtos no Stripe

Execute este script no **Stripe Dashboard → Developers → API Explorer**:

\`\`\`javascript
// Criar produto Essencial
const essential = await stripe.products.create({
  name: 'BeautyBot Essencial',
  description: 'Chatbot IA para clínicas de estética - Plano Essencial'
});

const essentialPrice = await stripe.prices.create({
  product: essential.id,
  unit_amount: 9700, // €97.00
  currency: 'eur',
  recurring: { interval: 'month' }
});

// Criar produto Premium
const premium = await stripe.products.create({
  name: 'BeautyBot Premium',
  description: 'Chatbot IA para clínicas de estética - Plano Premium'
});

const premiumPrice = await stripe.prices.create({
  product: premium.id,
  unit_amount: 19700, // €197.00
  currency: 'eur',
  recurring: { interval: 'month' }
});

console.log('Essential Price ID:', essentialPrice.id);
console.log('Premium Price ID:', premiumPrice.id);
\`\`\`

### 4️⃣ Configurar Webhook

1. Vá para: [https://dashboard.stripe.com/test/webhooks](https://dashboard.stripe.com/test/webhooks)
2. Clique em **"Add endpoint"**
3. Configure:
   - **URL**: `https://beautybot.pt/api/stripe-webhook`
   - **Events to send**:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
4. Copie o **Signing secret** (whsec_...)

### 5️⃣ Configurar Variáveis de Ambiente no Vercel

1. Acesse: [https://vercel.com/tishaprados-7241s-projects/tishaprados-lab-beautybot/settings/environment-variables](https://vercel.com/tishaprados-7241s-projects/tishaprados-lab-beautybot/settings/environment-variables)

2. Adicione estas variáveis:

\`\`\`env
# Stripe
STRIPE_SECRET_KEY=sk_test_... (sua chave secreta)
STRIPE_PUBLISHABLE_KEY=pk_test_... (sua chave pública)
STRIPE_WEBHOOK_SECRET=whsec_... (webhook signing secret)

# Supabase (já deve estar configurado)
NEXT_PUBLIC_SUPABASE_URL=https://cdhtcfvvxktouvusyosu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (secret!)

# App
NEXT_PUBLIC_APP_URL=https://beautybot.pt
\`\`\`

3. Clique em **"Save"**

### 6️⃣ Deploy dos Arquivos

1. **Copie os arquivos para o repositório:**

\`\`\`bash
# Na pasta do seu projeto BeautyBot
cp /caminho/dos/arquivos/api/*.js api/
cp /caminho/dos/arquivos/admin-vouchers.html .
\`\`\`

2. **Commit e push:**

\`\`\`bash
git add .
git commit -m "feat: adicionar integração Stripe + sistema de vouchers"
git push origin main
\`\`\`

3. Vercel vai fazer deploy automaticamente!

## 🎟️ Como Usar o Sistema de Vouchers

### Acessar Painel Admin

1. Vá para: `https://beautybot.pt/admin-vouchers.html`
2. Faça login com sua conta admin (tishaprados@gmail.com)

### Criar Voucher

1. Preencha o formulário:
   - **Código**: Ex: NATAL2024, LAUNCH50
   - **Tipo**: Percentual ou Valor Fixo
   - **Valor**: 20 (para 20%) ou 50 (para €50)
   - **Limite**: Deixe vazio para ilimitado
   - **Válido até**: Data de expiração (opcional)
   - **Planos**: Selecione quais planos podem usar

2. Clique em **"Criar Voucher"**

### Exemplos de Vouchers

**Black Friday - 30% OFF:**
- Código: `BLACKFRIDAY30`
- Tipo: Percentual
- Valor: 30
- Limite: 100 usos
- Válido até: 30/11/2024

**Lançamento - €50 OFF:**
- Código: `LAUNCH50`
- Tipo: Valor Fixo
- Valor: 50
- Limite: 50 usos
- Planos: Apenas Premium

**Trial Especial - 50% primeiro mês:**
- Código: `TRIAL50`
- Tipo: Percentual
- Valor: 50
- Limite: Ilimitado

## 🔍 Como Funciona o Checkout

1. Usuário escolhe um plano em `beautybot.pt`
2. (Opcional) Insere código de voucher
3. Sistema valida voucher e calcula desconto
4. Redireciona para Stripe Checkout
5. Após pagamento bem-sucedido:
   - Webhook do Stripe notifica sistema
   - Assinatura é criada no banco de dados
   - Voucher é marcado como usado
   - Usuário ganha acesso ao dashboard

## 🧪 Testar em Modo Test

Stripe fornece cartões de teste:

**Sucesso:**
- Número: `4242 4242 4242 4242`
- Validade: Qualquer data futura
- CVV: Qualquer 3 dígitos

**Falha:**
- Número: `4000 0000 0000 0002`

## 📊 Monitorar Webhooks

Veja eventos em tempo real:
[https://dashboard.stripe.com/test/webhooks](https://dashboard.stripe.com/test/webhooks)

## 🚨 Troubleshooting

### Webhook não está funcionando
1. Verifique se a URL está correta
2. Confirme que o STRIPE_WEBHOOK_SECRET está configurado
3. Veja logs em Vercel: [https://vercel.com/tishaprados-7241s-projects/tishaprados-lab-beautybot/logs](https://vercel.com/tishaprados-7241s-projects/tishaprados-lab-beautybot/logs)

### Voucher não está sendo aplicado
1. Verifique se está ativo
2. Confirme se não expirou
3. Veja se o plano é aplicável
4. Verifique se usuário já usou

### Erro ao criar voucher
1. Código já existe? Tente outro
2. Valor inválido? Percentual deve ser 1-100
3. Verifique se você é admin no Supabase

## 📝 Próximos Passos

- [ ] Configurar Stripe em modo **LIVE** (produção)
- [ ] Atualizar links em beautybot.pt para apontar para `/api/stripe-checkout`
- [ ] Configurar emails de confirmação (Stripe Customer Emails)
- [ ] Adicionar portal de gerenciamento de assinatura (Stripe Customer Portal)
- [ ] Implementar notificações por email quando voucher é usado

## 🎉 Pronto!

Agora você tem:
- ✅ Sistema de pagamentos recorrentes
- ✅ Vouchers customizáveis
- ✅ Painel administrativo completo
- ✅ Webhooks configurados
- ✅ Banco de dados sincronizado

**Dúvidas?** tishaprados@gmail.com
