# St. Martin — site + agendamento + painel

## O que mudou nesta versão

- Visual novo, escuro, com a identidade da casa (monograma M, "ST MARTIN" espaçado, preto e branco). Fonte Geist.
- Agendamento real: nome e WhatsApp do cliente vão para o banco. Não precisa de conta para marcar.
- Login de cliente (e-mail e senha) em `/entrar`. Quem tem conta vê os horários em `/conta`, pode cancelar e recebe avisos no sino do topo.
- Painel em `/painel`, só para administradores logados. Abas: Hoje, Agenda, Serviços, Equipe, Horários, Galeria, Candidaturas, Acessos, Dados da casa.
- Candidaturas do "Trabalhe conosco" agora vão para o banco e aparecem no painel.
- Correção de segurança: as funções do painel antes não tinham proteção. Agora todas exigem login de administrador.

## Primeiro administrador

1. Crie uma conta normal no site (`/entrar` → Criar conta).
2. Abra `/painel` e digite o código de ativação.
   - Em produção o código é a variável de ambiente `ADMIN_SETUP_CODE` (mínimo 12 caracteres).
   - Rodando local, sem `DATABASE_URL`, o código de teste é `stmartin-local`.
3. Depois disso, libere outros barbeiros em Painel → Acessos (a pessoa precisa ter criado conta antes).

## Variáveis de ambiente

| Variável | Onde | Para quê |
| --- | --- | --- |
| `ADMIN_SETUP_CODE` | obrigatória em produção | código para ativar o primeiro admin |
| `DATABASE_URL` | Grok injeta sozinho; em Vercel próprio, use Neon/Supabase | banco Postgres |
| `BETTER_AUTH_SECRET` | Grok injeta; em Vercel próprio gere uma string aleatória longa | assinatura das sessões |
| `BETTER_AUTH_URL` | Vercel próprio | URL pública do site, ex. `https://stmartin.com.br` |

## Publicar no Railway

O projeto já vem com `railway.json` (build: `npm run build:railway`, start: `npm start`).

1. Suba o código num repositório do GitHub e, no Railway: **New Project → Deploy from GitHub repo**.
2. No mesmo projeto: **+ New → Database → PostgreSQL**.
3. No serviço do site, em **Variables**, adicione:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (referência ao banco)
   - `BETTER_AUTH_SECRET` = uma senha longa aleatória
   - `BETTER_AUTH_URL` = o domínio do serviço, ex. `https://stmartin-production.up.railway.app`
   - `ADMIN_SETUP_CODE` = código com 12+ caracteres
4. Em **Settings → Networking → Generate Domain** para ganhar o endereço público (use esse endereço no `BETTER_AUTH_URL`).
5. As tabelas são criadas sozinhas toda vez que o serviço inicia (`npm start` roda `db:migrate` antes de subir o servidor).

## Publicar na Vercel (projeto próprio)

As mensagens `Unknown env config "cache-dir"` e `recharts deprecated` são só avisos do npm. Elas não quebram o build.

O que quebra o site na Vercel é a falta de banco. Passo a passo:

1. No projeto `stmartin` na Vercel: **Storage → Create Database → Neon (Postgres)** → conectar ao projeto. Isso cria a variável `DATABASE_URL` sozinho.
2. Em **Settings → Environment Variables**, adicione:
   - `BETTER_AUTH_SECRET` = uma senha longa aleatória (ex.: gere em https://generate-secret.vercel.app/32)
   - `BETTER_AUTH_URL` = o endereço do site, ex. `https://stmartin-mu.vercel.app` (sem barra no final)
   - `ADMIN_SETUP_CODE` = código com 12+ caracteres para ativar o primeiro admin
3. **Deployments → ⋯ → Redeploy.** O build cria as tabelas no Neon sozinho (`npm run db:migrate`).
4. Se o site abrir com a mensagem "Banco de dados não configurado", o passo 1 não foi aplicado no deploy atual. Faça o redeploy de novo.

Se você trocar o domínio depois, atualize `BETTER_AUTH_URL` e faça redeploy, senão o login dá "Invalid origin".

## Antes de publicar

```
npm install
npm run dev        # gera src/routeTree.gen.ts com as rotas novas
npm run typecheck
npm run build
```

O `routeTree.gen.ts` deste zip ainda é o antigo. Ele é regenerado automaticamente no primeiro `npm run dev` ou `npm run build`.

## O que ainda falta (depende da casa)

- Preços reais (Painel → Serviços). Vazio aparece "Consulte".
- Nomes e fotos dos barbeiros (Painel → Equipe). Os perfis de exemplo não aparecem na seção "Quem atende".
- Endereço e Instagram (Painel → Dados da casa).
- Confirmar se o WhatsApp 18 98116-2669 (do anúncio de vagas) atende clientes.
- Recuperação de senha por e-mail não existe ainda (precisa de um serviço de envio de e-mail).
- Notificação por push no celular, e-mail ou WhatsApp não está ligada. Hoje os avisos aparecem dentro do site.
