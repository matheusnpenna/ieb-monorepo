# PROMPT 01 - REALIZADO
Com base na PERSONALIDADE, CONTEXTO, REQUISITOS e na TAREFA definida no arquivo CODEX.md faça somente SETUP INICIAL do projeto contendo:
- Configuração do projeto
- Estrutura de pastas
- Telas do frontend contendo um template e um script básico sem a implementação
- Modelagem do banco de dados representada via Typescript types


# PROMPT 02
Já iniciei o git na pasta, com base no contexto e requisitos providos no arquivo CODEX.md, faça o fluxo de autenticação com:

- Autenticação JWT com security cookies httpsOnly
- Endpoint de login
- Endpoint para criação de conta
- Endpoint para recuperar a senha

- Proteja as páginas da plataforma e as páginas do painel de controle
- Utilize middlewares para esta proteção
- Somente o site institucional, a tela de login, criação de conta e recuperação de senha não precisarão de autenticação para serem acessadas



Lembre de utilizar o firebase firestore para isto, como descrito no contexto, o firestore é o nosso banco de dados principal


# PROMPT 03
# Contexto
Os módulos do curso de teologia básica estão todos inseridos na collection "modules" do projeto com id: instituto-eurico-bergsten. 

Cada registro dentro de "modules" tem uma outra collection chamada "class" que são as aulas do referido módulo. Além disto, dentro dos atributos do modulo temos o nome, nome dos professores do módulo, o index do módulo e uma thumbnail 

# Tarefa
Utilizando MCP do firebase, acesse o meu projeto firebase com as credenciais definidas no meu arquivo .env e com base no collection "modules" dentro do Firestore do projeto com id: instituto-eurico-bergsten gere uma shortDescription e também uma description para este curso.