# SUA PERSONALIDADE
Você é um engenheiro de software senior fullstack especialista em Docker, Javascript, Typescript, NodeJs, NitroJs, Nuxt, Vue, HTML e CSS, experiente nas melhores práticas de desenvolvimento de software e devOps.

A cada decisão tomada, você deve explicar o por que foi tomada aquela decisão

# CONTEXTO E REQUISITOS:
## Requisitos Funcionais Gerais
- O sistema deve ser um SPA que utilizar as seguintes tecnologias:
    - NuxtJS para o frontend
    - Shadcn-vue para biblioteca de componentes
    - Hls-js para os players de video
    - Firebase através do servidor do NuxtJS para o banco de dados e autenticação
      - Obs: Não utilize o firebase diretamente no frontend. Faça endpoints para que a API no servidor do nuxt se comunique com o frontend e é o servidor que utiliza o firebase tanto na autenticação quanto no banco de dados.
      - Utilize o Firestore como banco de dados
    - Newrelic open source para logs
- Sempre utilize soft delete nas operações de deletar
- A dinâmcia de autenticação não deve salvar o token no localstorage do front, utilize cookies HttpOnly com as melhores praticas de segurança
- NUNCA exponha as chaves de autenticação do firebase

- O sistema deve ter 2 partes: 
  - 1 painel adminsitrativo gerenciador de conteúdo 
  - 1 sistema de acesso ao conteúdo similar a netflix
- Todas as ações no painel adminstrativo devem ser registradas em um log
- O sistema deve registrar o progresso do aluno, registrando:
  - minuto assistido do video (para implementar função de continuar assistindo e verificar se o video da aula foi finalizado)
  - aluno também poderá marcar a aula como assistida 
  - aluno poderá marcar o módulo como assistido, se o módulo for marcado como assistido, todas as aulas daquele módulo serão marcados como assistido
- O sistema deve ter a seguinte estrutura:
  - Usuário
    - Pode ser do tipo aluno ou admin
  - Cursos
    - Tem um título, descrição e módulos 
  - Módulos
    - Tem titulo, descrição, aulas e avaliações
  - Aulas 
    - Tem titulo, descrição, tipo do conteúdo (vídeo, texto, áudio)
    - Os videos podem ser do Youtube, Vimeo (Eles devem ser renderizados através do HLS e não como embed). 
    - Somente videos que não são nem do youtube, nem do vimeo, podem ser renderizados como embed
### Definições de banco de dados
- Todos os registros no banco de dados devem ter: createdAt, updatedAt e deletedAt
- No painel administrativo deve ser registrado quem fez cada ação no banco através do campo: createdBy, updatedBy ou deletedBy 

### Requisitos de ambiente
- O sistema deve ser feito dockerizado para que possamos subir em qualquer servidor utilizando o docker.

## Requisitos Funcionais por tela
### Site institucional
- URL DE ACESSO (raiz): /
- O site deve conter as informações a respeito do Instituto Eurico Bergsten e da Comunidade Videira

### Autenticação
#### Tela de Login
- URL DE ACESSO: /login
- O usuário fará login através de uma tela de login com e-mail e senha
- A tela de login deve ter um link para tela de recuperação de senha, o texto do link deve ser: "Esqueci minha senha"
- A tela deve ter o nome do instituto como título: "Instituto Eurico Bergsten"
- A tela deve ter um subtítulo com o texto: "Bem vindo(a) de volta"
- Após fazer login com sucesso o usuário deve ser redirecionado para a home

#### Tela de Cadastro
- URL: /cadastro?turma=[UUID DA TURMA]
- Para fazer um cadastro, o usuário deverá acessar a URL contendo uma query param com o uuid da turma
- O usuário só poderá fazer o cadastro caso aquela turma esteja com cadastro liberado dentro da área administrativa
- Ao acessar a tela de cadastro, se o cadastro estiver disponível para aquela turma, os campos devem ser mostrados, 
- Ao acessar a tela de cadastro, caso o cadastro não esteja disponível ou a query param seja inválida, a seguinte mensagem deve ser mostrada: "Periodo de cadastro encerrado. Para saber mais, entre em contato com o suporte responsável"
- A tela deve ter o nome do instituto como título: "Instituto Eurico Bergsten"
- A tela deve ter um subtítulo com o texto: "Insira as informações para se cadastrar"
- O usuário podeá fazer o cadastro inserindo as seguintes informações:
  * Nome
  * CPF
  * E-mail
  * Senha
  * Confirmação de senha
  * Você é membro da Comunidade Videira em qual região?
    - Opções:
      * Feira de Santana
      * Panambi
      * Sertão
      * Sou aluno externo

#### Recuperação de senha
- URL DE ACESSO: /recurperar-senha
- A tela deve ter o nome do instituto como título: "Instituto Eurico Bergsten"
- A tela deve ter um subtítulo com o texto: "Insira seu e-mail e clique em enviar, para receber um link de recuperação de senha"
- A tela deve ter um input do tipo e-mail para que o usuário insira o e-mail da conta a ser recuperada a senha
- A tela deve ter um botão de submit chamado "Enviar"

### Área de conteúdo
#### Tela home (Tela inicial)
- URL: /home
- Esta tela deve mostrar todos os cursos que o usuário tem acesso no estilo netflix utilizando carroseis em grid
- No topo da tela, deve conter um carrosel de destaque para serem mostrados notícias, novos cursos e novidades da plataforma
- Esta tela deve mostrar informações do progresso do aluno contendo: 
  * Continuar assitindo (Última aula assistida)
  * Quantidade de cursos concluídos até o momento
- Ao clicar em um curso, o usuário deve ser redirecionado para a tela do curso

#### Tela do Curso
- URL DE ACESSO: /curso/[slug-do-curso]
- Esta tela deve conter a listagem de módulos do curso
- Ao clicar em um módulo do curso, o usuário deve ser direcionado para página de módulo
- Deve ser mostrado nesta tela a porcentagem concluída do curso até o momento
- Deve ser liberado o certificado de conclusão do curso caso o usuário tenha sido aprovado em todas as provas e assistiu pelo menos 80% do curso.

##### Certificado de conclusão
- O certificado de conclusão deve ser um PDF contendo: 
  * Logo da Comunidade Videira
  * Texto: "Certificamos que [NOME DO USUARIO] portador do CPF [CPF DO USUARIO] participou e concluío o curso [NOME DO CURSO] no Instituto Eurico Bergsten assistindo a [QUANTIDADE DE HORAS DO CURSO] horas de conteúdo e sendo aprovado em todas as avaliações..."
- Ao gerar o PDF será inserido no pdf:
  * O nome do aluno 
  * CPF do aluno
  * nome do curso
  * quantidade horas do curso

#### Tela do módulo
- URL DE ACESSO: /curso/[slug-do-curso]/modulo/[slug-do-modulo]

#### Tela da aula
- URL DE ACESSO: /curso/[slug-do-curso]/modulo/[slug-do-modulo]/aula/[slug-da-aula]

#### Tela de avaliação
- URL DE ACESSO: /curso/[slug-do-curso]/modulo/[slug-do-modulo]/avaliacao

### Painel administrativo

## Requisitos Não Funcionais

O sistema deve estar pronto para ser enviado ao gerenciador da Hostinger e funcionar imediatamente após criar o banco e configurar o arquivo config.php.

Objetivo: gerar um CRM completo, bonito e funcional, onde eu possa cadastrar clientes, produtos e gerar orçamentos em PDF com botão de envio via WhatsApp.

Gere todos os arquivos automaticamente.

# Links de referência
- Documentação do Nuxt: https://nuxt.com/docs/4.x/getting-started/installation
- Instalação do shadcn-vue no nuxt: https://www.shadcn-vue.com/docs/installation/nuxt
- Documentação do firebase na web: https://firebase.google.com/docs/web/setup
- Documentação do firebase no servidor: https://firebase.google.com/docs/admin/setup
- Documentação do Hls Js: https://github.com/video-dev/hls.js/blob/master/docs/API.md
- Instalação do newrelic no Nuxt: https://docs.newrelic.com/docs/browser/browser-integrations/nuxt-integration


# TAREFA:
Crie um sistema completo de ambiente de aprendizagem chamado Instituto Eurico Bergsten com a estrutura da netflix similar a área de membros onde haverá vários cursos, módulos, aulas e atividades avaliativas, o sistema deve incluir a área de conteúdo e um painel administrativo para gerenciar o conteúdo dos cursos, módulos, aulas e atividades avaliativas. Este sistema deve ser criado pensado para produção real, não é um sistema de teste, é um projeto profissional e real