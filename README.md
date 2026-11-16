# Rádio GTAVI: The Album – front-end

Site da promoção da Warner Music. HTML, CSS e JavaScript puros (ES modules), sem build e sem dependências.
Responsivo (mobile first, com layout de duas colunas a partir de 960px) e pronto para ligar no backend.

## Rodar localmente

ES modules não funcionam abrindo o arquivo direto (`file://`). Sirva a pasta:

```bash
npx serve .          # ou: python3 -m http.server 8080
```

Por padrão o site usa dados simulados (`CONFIG.useMocks = true`). Para revisar telas e fases, abra com `?qa=1`
(ex.: `http://localhost:8080/?qa=1&fase=promo`). Fases: `pre`, `promo`, `encerrada`, `resultado`, `arquivo`.

CPFs de teste no modo mock: `529.982.247-25` (sucesso) e `111.444.777-35` (já participou, 409).

## Estrutura

```
index.html                 todas as telas (seções) e o markup acessível
assets/css/styles.css      tokens, layout responsivo e componentes
assets/js/config.js        URLs, datas, limites, features (editar por ambiente)
assets/js/app.js           roteador por hash, guards de fluxo e controladores das telas
assets/js/api.js           chamadas HTTP (timeout, erros padronizados, captcha opcional)
assets/js/mocks.js         respostas simuladas seguindo o mesmo contrato
assets/js/validation.js    máscaras e validações (CPF, data, telefone, e-mail)
assets/js/profanity.js     filtro de palavras proibidas no nome da rádio (lista Warner 03/11/2026)
assets/js/store.js         estado do fluxo em sessionStorage (sem dados pessoais)
assets/js/analytics.js     eventos para o GTM (window.dataLayer)
assets/data/tracks.json    as 34 faixas do álbum (ids do Spotify, títulos, status de lançamento)
assets/data/artists.json   os 17 artistas do álbum (ids do Spotify, nome, foto de perfil)
scripts/atualizar-faixas.mjs  preenche tracks.json e artists.json pela API do Spotify
assets/img/                key visual e imagem de compartilhamento (og-image)
```

## Para ir para produção

0. Domínio: o arquivo `CNAME` (www.radiogtavithealbum.com) precisa continuar na raiz do repositório do GitHub Pages.
1. Em `config.js`: `useMocks: false`, `apiBase` do backend (passo a passo no README do servidor `radio-gtavi-api`), links (Linktree, Política de Privacidade),
   `rulesEmbedUrl` do regulamento, `minAge` se o regulamento exigir e `features.prizePhoto` conforme a aprovação da foto do PS5.
2. Preencher `promoNumber` e trocar `links.landing` pelo domínio final.
3. Incluir o GTM no `<head>` (os eventos já são enviados para `dataLayer`).
4. Se usar reCAPTCHA v3, incluir o script do Google e preencher `CONFIG.captcha`.
5. Desligar o painel de QA (`features.qaPanel: false`) ou manter só em homologação.
6. Trocar `og:image` por URL absoluta.

## Textos que vêm do `config.js`

- Datas e horário do resultado (`dates.result`): aparecem como “11/12 às 19h” na home, na confirmação e na home pós-promo.
- Número da promoção no rodapé (`promoNumber`): enquanto for `null`, mostra “Número da promo”.
- Texto de compartilhamento da rádio: usa `links.landing`. **Trocar pelo domínio final quando estiver configurado.**
  Durante a promoção: “Escute [nome] FM, a minha rádio GTAVI: The Album [playlist] / Gostou? Crie a sua também e ainda
  concorra a um PS5 + GTAVI aqui! [landing]”. Depois do fim das participações, o convite para concorrer sai do texto.
- Política de Privacidade (`links.privacy`): https://privacy.wmg.com/wmi/privacy/por

## Imagens

`assets/img/pagina-*.jpg` são os topos de cada tela (com versão 640px para celular). O recorte no celular é ajustado
por tela no atributo `style="--pos-m: X% Y%"` da imagem. `premio-ps5-gtavi.jpg` é a foto do prêmio na home.

## Rotas do front

| Hash | Tela | Pré-condição |
|---|---|---|
| `#inicio` | Home conforme a fase | – |
| `#regulamento` | Home rolada até o regulamento embedado | – |
| `#musica` | Passo 1: salvar álbum e escolher faixa | fase `pre` ou `promo` (antes do início fica liberado para testes) |
| `#resposta` | Passo 2: por que essa faixa (até 500 caracteres) | faixa escolhida |
| `#cadastro` | Passo 3: dados e aceites | faixa + resposta |
| `#confirmado` | Participação confirmada (tela única) | participação criada |
| `#quiz` | Perguntas para montar a rádio | `promo` com participação, ou `encerrada`/`resultado` |
| `#personalizar` | Nome da rádio e capa | quiz respondido |
| `#radio` | Rádio gerada, compartilhar | rádio criada |

Se a pré-condição falha, o usuário volta para o passo mais adiantado que pode abrir.

## Contrato da API

Base: `CONFIG.apiBase` (padrão `/api`). JSON em UTF-8. Erros sempre no formato:

```json
{ "error": { "code": "validation_error", "message": "Texto para o usuário", "fields": { "cpf": "CPF inválido." } } }
```

Códigos esperados pelo front: `validation_error` (422, com `fields`), `already_participated` (409),
`promo_closed` (403), `rate_limited` (429). Qualquer 5xx mostra mensagem genérica.

### `GET /status`
Fonte de verdade da fase. Se falhar, o front calcula a fase pelas datas do `config.js`.
```json
{ "phase": "promo", "serverTime": "2026-11-20T15:00:00-03:00", "winner": null }
```
Em `resultado` e `arquivo`: `"winner": { "displayName": "Ana S." }`.
**Só o nome abreviado.** O front não exibe resposta, cidade nem música do vencedor, e o backend não deve enviá-los.

### Faixas (`assets/data/tracks.json` ou `GET /tracks`)
Por padrão o site lê `assets/data/tracks.json` (`CONFIG.tracksUrl`), que funciona em hospedagem estática.
Com `tracksUrl: null`, lê `GET /tracks` do backend, no mesmo formato:
```json
{
  "albumUrl": "https://open.spotify.com/album/5BYKG4MHfySZthe2W6r7n4",
  "tracks": [
    { "id": "t01", "spotifyId": "171rxWDjFvjPeFjSHF4WS5", "title": "…", "artist": "…",
      "coverUrl": "https://i.scdn.co/image/…", "released": true }
  ]
}
```
- A ordem do array é a ordem exibida. `id` é o identificador enviado em `POST /participations` (`trackId`).
- `released: false` mostra a faixa como “Em breve”, sem player e sem poder ser escolhida
  (`CONFIG.features.unreleasedSelectable` libera a escolha).
- `title` e `artist` aparecem só em “Sua faixa: …”, nas faixas “Em breve” e para leitores de tela.
  Se `title` estiver vazio, o site tenta o oEmbed público do Spotify; se não conseguir, usa “Faixa N”.

**Player:** cada faixa lançada aparece direto com o player compacto do Spotify (título, artista, capa e play),
carregado só quando a linha se aproxima da tela. A bolinha à esquerda escolhe a faixa. Quem está logado no Spotify
ouve a faixa completa; quem não está ouve a prévia de 30 segundos.

**Atualizar a lista automaticamente:** crie um app grátis em https://developer.spotify.com/dashboard e rode

```bash
SPOTIFY_CLIENT_ID=xxx SPOTIFY_CLIENT_SECRET=yyy node scripts/atualizar-faixas.mjs
```

O script preenche título, artistas, capa e `released` (tocável no Brasil) de cada faixa no `tracks.json`, e nome e foto de
perfil de cada artista no `artists.json`.
Rode de novo quando uma faixa nova sair e faça commit. A chave fica só na sua máquina.
Para travar uma faixa editada à mão, adicione `"lock": true` nela.

### `POST /participations`
```json
{
  "trackId": "t01",
  "answer": "até 500 caracteres",
  "name": "Ana Souza",
  "birthDate": "2000-02-01",
  "cpf": "52998224725",
  "email": "ana@email.com",
  "phone": "11987654321",
  "city": "São Paulo",
  "consents": {
    "rules":           { "accepted": true,  "at": "2026-11-20T18:00:00.000Z" },
    "privacy":         { "accepted": true,  "at": "2026-11-20T18:00:00.000Z" },
    "marketingWarner": { "accepted": false, "at": "2026-11-20T18:00:00.000Z" }
  },
  "ageConfirmed": { "accepted": true, "at": "2026-11-20T18:00:00.000Z" },
  "website": "",
  "utm": { "utm_source": "instagram" }
}
```
Resposta `201`: `{ "participationId": "p_abc123" }`.

O backend deve:
- revalidar tudo (CPF com dígitos verificadores, data, e-mail, telefone, tamanho da resposta) e exigir 18 anos ou mais, tanto pela data de nascimento quanto por `ageConfirmed`;
- rejeitar se `website` (honeypot) vier preenchido;
- garantir uma participação por CPF (409 `already_participated`) e recusar fora do período (403 `promo_closed`);
- registrar os aceites com data/hora e IP (LGPD);
- aplicar rate limit por IP.

Nos erros 422, as chaves de `fields` usam os nomes do payload (`name`, `birthDate`, `cpf`, `email`, `phone`, `city`, `consents`, `ageConfirmed`).

### `GET /quiz`
```json
{
  "questions": [
    { "id": "q1", "text": "Qual é o seu rolê em Leonida?", "definesCover": true,
      "options": [
        { "id": "q1a", "label": "Pôr do sol na praia", "icon": "🌅",
          "cover": { "id": "c-por-do-sol", "name": "Pôr do sol", "imageUrl": "https://…/capa-por-do-sol.jpg" } }
      ] },
    { "id": "q2", "text": "Quando a polícia aparece, você…",
      "options": [ { "id": "q2a", "label": "Pisa fundo e some no retrovisor", "icon": "💨" } ] }
  ]
}
```
As perguntas são provisórias e serão definidas com a curadoria das playlists. O front aceita qualquer número de
perguntas e opções. A pergunta com `definesCover: true` define a capa (4 capas fixas).

### `POST /radios`
```json
{ "participationId": "p_abc123", "answers": { "q1": "q1b", "q2": "q2a" }, "name": "Rádio Vice Nights" }
```
`participationId` é `null` quando a rádio é criada depois do fim da promoção.

Resposta `201`:
```json
{
  "radioId": "r_xyz",
  "name": "Rádio Vice Nights",
  "cover": { "id": "c-neon", "name": "Noite de neon", "imageUrl": "https://…" },
  "playlistUrl": "https://open.spotify.com/playlist/…",
  "shareUrl": "https://…",
  "featuredArtist": { "name": "Travis Scott", "photoUrl": "https://…" },
  "artists": [ { "name": "Travis Scott", "photoUrl": "https://…" } ]
}
```
`featuredArtist` é a foto em destaque na revelação da rádio; `artists` preenche "Quem toca na sua rádio"
(cada artista pode ter `spotifyId` ou `spotifyUrl`; o front linka cada foto ao perfil no Spotify).
Se faltar `name` ou `photoUrl`, o front tenta o oEmbed do Spotify; sem resultado, mostra um círculo sem foto.
No modo mock, a lista vem de `assets/data/artists.json`, com um artista em destaque sorteado.

O backend **deve** reaplicar o filtro de nomes (mesmas listas e regras de `assets/js/profanity.js`, que é JS puro
e pode ser reaproveitado no Node) e responder 422 com `fields.name` quando o nome for recusado.

## Filtro de nomes

`profanity.js` implementa a lista "versão inicial para aprovação da Warner – 03/11/2026":
- `BLOCK_ANYWHERE`: bloqueia também dentro de outras palavras;
- `BLOCK_WHOLE`: bloqueia só como palavra inteira (evita que "cu" bloqueie "música");
- `PENDING_REVIEW`: palavras a avaliar com a Warner, ainda **não** bloqueadas;
- `BLOCK_PHRASES`: expressões de mais de uma palavra ("som livre", "one rpm", "the orchard"), com ou sem espaço;
- `ALLOW`: nunca bloqueia ("golpe", resposta do quiz).

Também bloqueia nomes de outras gravadoras e distribuidoras: sony, universal, believe, altafonte, som livre, one rpm, the orchard.

Ignora acentos e maiúsculas, pontuação no meio ("f.u.c.k", "ai-5"), leetspeak ("f0d4") e letras repetidas ("fuuuck"),
sem gerar falso positivo em casos como "Níger" ou "Bobs".

## Eventos de analytics

`page_view_virtual`, `cta_participar`, `salvar_album`, `selecionar_faixa`, `ouvir_previa`, `resposta_preenchida`,
`participacao_enviada`, `participacao_erro`, `abrir_regulamento`, `quiz_resposta`, `radio_gerada`,
`ouvir_radio_spotify`, `compartilhar_radio`. Nenhum evento leva dados pessoais.

## Acessibilidade

Navegação por teclado, foco visível, foco movido para o título a cada troca de tela, campos com rótulo e erro
associados (`aria-describedby`), mensagens com `role="alert"`, modal com foco preso e Esc para fechar,
`prefers-reduced-motion` respeitado e áreas de toque de 44px ou mais.
