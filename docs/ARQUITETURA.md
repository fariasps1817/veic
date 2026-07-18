# Arquitetura e decisões

## Fluxo

1. Um funcionário autenticado cria uma solicitação.
2. Uma função do servidor gera 32 bytes aleatórios e armazena somente o hash SHA-256 do token.
3. O link permanece válido por uma hora.
4. O comprador abre o formulário, informa os dados e confirma a ciência da finalidade.
5. A submissão valida novamente todos os campos no servidor, invalida o token e grava uma versão dos dados.
6. A loja confere e aprova.
7. O PDF auxiliar pode ser gerado novamente a partir dos dados estruturados.

## Segurança

- Nenhuma tabela contendo dados pessoais é acessível anonimamente.
- Os endpoints públicos localizam a solicitação apenas pelo hash do token.
- Tokens são longos, aleatórios, temporários e de uso único.
- O frontend usa somente a chave pública `anon`.
- Operações administrativas sensíveis passam por funções autenticadas.
- RLS limita cada funcionário à loja à qual está vinculado.
- O PDF informa expressamente que não é uma emissão oficial.
- Cabeçalhos impedem enquadramento em iframe e vazamento do link por `Referer`.

## Dados pessoais

Antes do uso em produção, a loja deve definir e documentar:

- base legal e finalidade do tratamento;
- prazo de retenção e rotina de exclusão;
- funcionários que terão acesso;
- canal para correção ou exclusão quando cabível;
- procedimento de resposta a incidentes;
- contratos e localização dos operadores de nuvem.

## Fuso horário

O banco usa `timestamptz`/UTC. A apresentação e o PDF usam explicitamente `America/Fortaleza`, evitando diferenças causadas pela configuração do celular ou computador.
