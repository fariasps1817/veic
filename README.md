# ATPV Fácil

Aplicação web progressiva, mobile-first e em português brasileiro para coleta e conferência dos dados usados em um **formulário auxiliar para ATPV**.

> Este sistema não emite ATPV-e oficial e não substitui os serviços da Senatran, Detran, CDT ou Renave.

## O que já está implementado

- Painel administrativo responsivo.
- Cadastro da loja e upload de logomarca.
- Solicitação com link temporário de uma hora.
- Formulário público em três etapas, pensado para celular.
- Validação de CPF, CNPJ numérico e CNPJ alfanumérico.
- Máscaras de CPF/CNPJ, CEP, telefone e moeda.
- Consulta de CEP pelo ViaCEP, com preenchimento manual como alternativa.
- Estados e municípios pela API do IBGE.
- Normalização de nomes e endereços em português brasileiro.
- Conferência e confirmação do comprador.
- Aprovação da loja.
- Geração, download, impressão e compartilhamento do PDF auxiliar.
- PWA instalável.
- Banco, autenticação, RLS e funções de servidor preparados para Supabase.
- Configuração de build e redirecionamentos preparada para Netlify.

Todos os horários são armazenados em UTC e exibidos em `America/Fortaleza`.

## Executar localmente

Requisitos: Node.js 20 ou mais recente e npm.

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`.

Sem as variáveis do Supabase, o aplicativo entra em **modo demonstração**. Nesse modo, os dados ficam somente no `localStorage` do navegador e servem para testar as telas e o fluxo.

## Qualidade

```bash
npm test
npm run build
npm run test:e2e
```

O teste completo cria uma solicitação, preenche o formulário em viewport de celular, consulta CEP/municípios com respostas controladas, aprova os dados e baixa o PDF.

## Conectar ao Supabase

1. Crie um projeto no Supabase.
2. Aplique a migração de `supabase/migrations`.
3. Crie o primeiro usuário em Authentication.
4. Cadastre a loja e vincule o usuário pela tabela `shop_members`.
5. Publique as funções presentes em `supabase/functions`.
6. Configure `ALLOWED_ORIGINS` nas funções com os endereços local e de produção.
7. Copie `.env.example` para `.env.local` e informe:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_SUA_CHAVE_PUBLICA
```

A chave `sb_secret_...` (ou a antiga `service_role`) nunca deve ser colocada no frontend, no Netlify ou em arquivos versionados. Ela é disponibilizada automaticamente dentro das Edge Functions do Supabase.

## Estrutura

```text
src/                  Aplicação React
src/lib/              Validações, APIs, dados e PDF
src/pages/            Telas administrativas e formulário público
supabase/migrations/  Banco e políticas RLS
supabase/functions/   Funções seguras para links e confirmações
scripts/              Teste do fluxo completo
docs/screenshots/     Evidências visuais do protótipo
netlify.toml           Build, SPA e cabeçalhos de segurança
```

## Publicação

O arquivo `netlify.toml` já contém o comando de build, diretório de publicação, redirecionamento da SPA e cabeçalhos básicos de segurança. A conexão do GitHub ao Netlify será feita de forma assistida quando o ambiente Supabase e os dados definitivos da loja estiverem prontos.
