# Design System Web

Este projeto adota um design system inspirado na linguagem visual da Netflix: fundo cinematografico escuro, contraste alto, superficies em camadas e CTAs em vermelho. A referencia aqui e de clima e hierarquia visual, nao de copia literal de interface, marca ou assets.

## Direcao visual

- Fundo de tela: sempre escuro, com gradientes profundos, halo sutil vermelho e contraste forte.
- Superficies: paineis em carvao translcido com borda clara discreta, blur leve e sombra longa.
- Destaque primario: vermelho `#E50914`.
- Texto principal: quase branco.
- Texto secundario: cinza quente e dessaturado.
- Aparencia geral: premium, dramatica, limpa e focada em conteudo.

## Tokens oficiais

- `--ds-bg: #090909`
- `--ds-bg-elevated: #111111`
- `--ds-surface: rgba(20, 20, 20, 0.82)`
- `--ds-surface-strong: rgba(28, 28, 28, 0.92)`
- `--ds-border: rgba(255, 255, 255, 0.12)`
- `--ds-text: #F5F5F1`
- `--ds-muted: #B3B3B0`
- `--ds-accent: #E50914`
- `--ds-accent-strong: #FF2D2D`
- `--ds-success: #46D369`
- `--ds-danger: #FF6B6B`

## Tipografia

- Titulos e destaques: `Fraunces`.
- Texto corrido, labels e interface: `Manrope`.
- Titulo principal: grande, compacto e com tracking negativo.
- Eyebrow: caixa alta, tracking alto, pequeno e com ar editorial.

## Componentes obrigatorios

Sempre reutilizar estes componentes antes de criar variacoes novas:

- `UiPanel`: superficie padrao para cards, hero sections, sidebars e blocos.
- `UiButton`: CTA primario, secundario e ghost.
- `UiField`: wrapper oficial para label, hint e erro.
- `UiInput`: input padrao.
- `UiSelect`: select padrao.
- `UiTextarea`: textarea padrao.
- `UiSpinner`: indicador de carregamento reutilizavel para estados async.
- `UiDropdownMenu`: menu de conta e acoes contextuais acionado por avatar.
- `UiConfirmationModal`: modal global de confirmacao para acoes sensiveis.
- `CourseGrid`: grid editorial de cursos com cards clicaveis e capa destacada.
- `LessonVideoPlayer`: player reutilizavel para aulas em video com suporte a HLS.
- `AppFooter`, `SurfaceCard`, `PageIntro` e `BrandMark`: blocos base ja alinhados ao sistema.

## Marca e assets

- `BrandMark` e a assinatura oficial da experiencia web.
- A hierarquia da marca deve manter:
  - assinatura institucional `Instituto Eurico Bergsten`
  - wordmark principal `Comunidade Videira`
- O simbolo oficial usa um monograma `V` em vermelho sobre painel escuro.
- Assets publicos da marca ficam em:
  - `public/brand/mark.svg`
  - `public/brand/wordmark.svg`
  - `public/favicon.svg`
- Reutilizar esses arquivos antes de criar novas variacoes de logo ou favicon.

## Regras de uso para novas telas

- Toda nova tela deve partir de fundo escuro. Nao usar paginas claras como padrao.
- Toda acao principal deve usar `UiButton` com `variant="primary"`.
- Toda acao secundaria deve usar `UiButton` com `variant="secondary"` ou `ghost`.
- Todo campo de formulario deve usar `UiField` + `UiInput`, `UiSelect` ou `UiTextarea`.
- Todo agrupamento de conteudo deve usar `UiPanel` ou `SurfaceCard`.
- Estados de carregamento devem preferir `UiSpinner` antes de criar loaders ad hoc.
- Menus contextuais de conta ou acoes compactas devem preferir `UiDropdownMenu` antes de criar variacoes novas.
- Listagens principais de cursos na home ou vitrines semelhantes devem preferir `CourseGrid`.
- O rodape compartilhado do site e da plataforma deve preferir `AppFooter`.
- Evitar `button`, `input`, `select` e `textarea` crus quando houver componente equivalente.
- Evitar cores novas sem necessidade real. O vermelho oficial e a ancora visual do sistema.
- Preferir cantos arredondados amplos, profundidade por sombra e contraste por camadas, nao por excesso de bordas.
- Priorizar layouts com respiro horizontal, textos curtos e hierarquia muito clara.
- Em mobile, manter densidade reduzida e CTAs em largura cheia quando fizer sentido.

## Imports explicitos dos componentes

- Sempre importar no `<script setup>` todo componente do design system usado na pagina, mesmo que o auto-import do Nuxt esteja habilitado.
- Esta regra vale para componentes em `app/components/ui`, `app/components/base` e shells visuais compartilhados como `AuthShellCard`.
- Use `app/pages/login.vue` como referencia de padrao para organizar esses imports.

## Dropdown de conta

- `UiDropdownMenu` e o padrao oficial para dropdown acionado por avatar do usuario.
- Quando houver `avatarUrl`, a imagem deve ser exibida no toggle.
- Quando nao houver `avatarUrl`, o fallback deve usar as duas primeiras iniciais do nome.
- Se o nome tiver apenas uma palavra, o fallback deve usar somente a primeira letra.
- O menu deve manter superficie escura elevada, foco visivel e estados de hover discretos com acento vermelho.

## Loading spinner

- `UiSpinner` e o padrao oficial para feedback visual de carregamento.
- O componente deve ser reutilizavel em listas, acoes assíncronas e telas intermediarias.
- O visual deve manter contraste alto com acento vermelho, sem fugir da linguagem dark cinematografica.
- Sempre manter rotulo acessivel via `aria-label`, com opcao de texto visivel ao lado quando fizer sentido.

## Modal de confirmacao

- `UiConfirmationModal` e o padrao oficial para confirmar exclusoes, saidas e outras acoes sensiveis.
- O componente deve ser montado uma unica vez no layout que precisa oferecer esse recurso.
- A abertura, o fechamento, o titulo, a mensagem e as acoes do modal devem ser controlados exclusivamente por `useConfirmationModal`.
- Paginas e componentes consumidores nao devem renderizar instancias extras do modal localmente.

## Grid de cursos

- `CourseGrid` e o padrao oficial para vitrines de cursos em formato de cards.
- Cada card deve exibir capa, titulo, descricao curta, slug e meta resumida do curso.
- O hover da capa deve ampliar somente a imagem interna, sem aumentar o tamanho externo do card.
- Quando `coverImageUrl` estiver ausente, usar o fallback `app/assets/img/logos/videira-logo.svg`.

## Player de aula

- `LessonVideoPlayer` e o padrao oficial para reproducao de aulas em video.
- O componente deve encapsular a integracao com `hls.js`, mantendo a pagina consumidora responsavel apenas por dados e eventos.
- O componente deve suportar links `m3u8`, YouTube e Vimeo usando `Plyr` como UI principal.
- Links de YouTube e Vimeo devem ser normalizados automaticamente quando chegarem fora do formato embed.
- O player deve aceitar um ponto inicial de reproducao para retomar o video de onde o aluno parou.
- Eventos de progresso devem permitir persistir o ponto atual e o estado de conclusao da aula.

## Footer compartilhado

- `AppFooter` e o padrao oficial de rodape para o site institucional e para a plataforma de conteudo.
- O footer deve exibir `BrandMark`, informacoes institucionais, redes sociais e contato de suporte.
- O ano deve ser resolvido em JavaScript no proprio componente.
- O contato de suporte deve usar link direto para WhatsApp.

## Regras para o Codex neste projeto

Quando eu pedir uma nova tela ou componente para `apps/web`, siga estas regras por padrao:

- Usar este design system como base visual.
- Reutilizar primeiro os componentes de `app/components/ui`.
- Manter a direcao visual dark cinematica com acento vermelho.
- Criar novas variacoes apenas quando o kit atual nao cobrir a necessidade.
- Se surgir um novo padrao recorrente, promovelo para componente reutilizavel em vez de repetir classes.

## O que evitar

- Fundos brancos ou beges como tema principal.
- Botoes com aparencia generica de dashboard SaaS.
- Inputs claros sem contraste com o fundo.
- Mistura de muitos acentos de cor.
- Cards sem profundidade visual.
- Interfaces com cara utilitaria quando a tela pede ambientacao institucional ou premium.
