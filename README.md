# BeautyBot — Guia de Publicação

## Estrutura de ficheiros
```
beautybot/
├── index.html          ← Landing page (beautybot.pt)
├── dashboard.html      ← Painel de configuração
├── chatbot.html        ← Chatbot do cliente
├── api/
│   └── chat.js         ← Proxy seguro para Claude API
├── vercel.json         ← Configuração do Vercel
└── *.html              ← Páginas de suporte
```

## Como publicar no Vercel

### 1. Criar conta no Vercel
- Vai a vercel.com → Sign Up → continuar com Google

### 2. Fazer o deploy
- Clica em "Add New Project"
- Clica em "Upload" e selecciona esta pasta completa
- Clica em "Deploy"
- Em ~2 minutos tens o site em: beautybot-xxx.vercel.app

### 3. Adicionar a API Key (OBRIGATÓRIO)
- No painel do Vercel → o teu projecto → Settings
- Clica em "Environment Variables"
- Adiciona:
  - Name: ANTHROPIC_API_KEY
  - Value: sk-ant-api03-... (a tua chave)
  - Environment: Production, Preview, Development
- Clica "Save"
- Vai a "Deployments" → clica nos 3 pontos → "Redeploy"

### 4. Ligar o domínio beautybot.pt
- No Vercel → Settings → Domains
- Escreve: beautybot.pt → Add
- Escreve: www.beautybot.pt → Add
- Copia os registos DNS mostrados pelo Vercel

### 5. Configurar DNS no dominios.pt
- Login em dominios.pt → beautybot.pt → Gestão DNS
- Apaga registos A existentes
- Adiciona:
  - Tipo: A | Nome: @ | Valor: 76.76.21.21
  - Tipo: CNAME | Nome: www | Valor: cname.vercel-dns.com
- Guarda → aguarda até 1 hora

## URLs finais
- https://beautybot.pt → Landing page
- https://beautybot.pt/dashboard.html → Painel
- https://beautybot.pt/chatbot.html → Chatbot

## Para cada cliente novo
1. Entra no dashboard com as credenciais do cliente
2. Configura identidade, serviços e protocolos
3. Clica "Guardar Configurações"
4. O chatbot já está configurado!
