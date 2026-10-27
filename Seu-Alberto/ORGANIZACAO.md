# Organização do projeto — Abrigo do Seu Alberto

Este documento registra a análise do escopo e do estado atual da aplicação,
além das pendências e das informações que devem ser solicitadas antes da
configuração de produção.

## O que foi analisado

- A aplicação tem uma página inicial com perfis de animais, fotos, idade,
  características físicas e personalidade.
- As fotos dos animais são carregadas dos dados recebidos pela aplicação. A
  imagem decorativa da coleira é estática e aparece entre o texto de apresentação
  e o botão para ver os animais.
- O rodapé oferece atalhos para Instagram, WhatsApp e e-mail. Os endereços são
  configuráveis e os links ficam inativos enquanto não forem informados.
- A área administrativa tem login e permite cadastrar, editar e excluir perfis
  de animais, moderar comentários e acompanhar pedidos de adoção.
- Visitantes podem curtir, comentar e compartilhar perfis, além de enviar um
  formulário de interesse em adoção.
- Já existe uma API em TypeScript (Vercel Functions). Ela guarda os perfis, as interações e os pedidos de
  adoção em `api/storage/store.json`, e as imagens enviadas em
  `api/storage/uploads/`.
- O formulário de adoção é armazenado. O envio de e-mail é tentado pela função
  SMTP (nodemailer) e depende de um serviço de transporte de e-mail configurado
  no ambiente.

## Estado das etapas do escopo

### Etapa 1 — Criação

- **1.1 Analisar o que já foi criado:** análise realizada e resumida neste
  documento.
- **1.2 Listar componentes ou objetos ainda não criados:** pendências
  identificadas abaixo; a edição de comentários pelo painel administrativo ainda
  não está disponível.
- **1.3 Tornar componentes e imagens dinâmicos:** as fotos dos perfis são
  dinâmicas. A coleira e outras imagens decorativas permanecem estáticas, o que
  é apropriado para elementos de apresentação.

### Etapa 2 — Estruturação

- **2.1 Cards dos animais:** implementados com foto, nome, idade,
  características, personalidade e ações.
- **2.2 Links sociais no rodapé:** implementados; falta receber e configurar os
  endereços oficiais do abrigo.
- **2.3 Login da administração:** implementado com e-mail e senha; as
  credenciais administrativas precisam ser configuradas no ambiente do servidor.
- **2.4 Formulário de adoção:** implementado com nome, idade, cidade, bairro,
  e-mail e telefone.

### Etapa 3 — Integração

- **3.1 Integração entre login e administração dos perfis:** implementada por
  meio da API (Vercel Functions).
- **3.2 Persistência e moderação das interações:** curtidas, comentários e
  compartilhamentos são armazenados; comentários podem ser excluídos e as
  interações podem ser limpas pelo painel. **Ainda falta editar um comentário
  existente no painel administrativo.**
- **Armazenar pedidos e enviar e-mail:** o pedido é armazenado e o envio por
  e-mail está implementado, mas depende da configuração de e-mail no ambiente
  SMTP (variáveis `SMTP_*` e `MAIL_*`).

## Pendências

1. Implementar no painel administrativo a edição de comentários existentes,
   preservando a persistência e exibindo erros de gravação.
2. Receber e configurar os endereços oficiais do abrigo:
   - Instagram (`VITE_INSTAGRAM_URL`);
   - WhatsApp, de preferência com link completo para conversa
     (`VITE_WHATSAPP_URL`);
   - e-mail público de contato (`VITE_CONTACT_EMAIL`).
3. Configurar o envio de e-mail para adoções no ambiente de produção. Antes da
   publicação, solicitar ao responsável pelo abrigo:
   - endereço interno que receberá os pedidos (`MAIL_TO`);
   - endereço autorizado para envio (`MAIL_FROM`);
   - configuração e credenciais do serviço de e-mail, como host SMTP, porta,
     usuário e senha, ou a chave/API do provedor escolhido;
   - confirmação de que o serviço permite envio pela aplicação.
4. Definir e preparar o ambiente de produção: projeto na Vercel com Upstash Redis e Vercel Blob (ver `.env.example`),
   HTTPS, limite de upload de 4 MB por foto e
   backup periódico dos dados do Redis.
5. Quando o backend futuro/definitivo para perfis e comentários for criado ou
   contratado, solicitar ao responsável técnico, **antes de integrar**:
   - URL/base da API e documentação dos endpoints para animais, comentários e
     demais interações;
   - credenciais necessárias, como chave/API token, e o procedimento seguro de
     autenticação e renovação;
   - configuração dos ambientes de desenvolvimento e produção e permissões
     concedidas à aplicação.

   Hoje já existe um backend em Vercel Functions com Upstash Redis e Vercel Blob; esta
   pendência refere-se à futura substituição ou integração com o backend
   definitivo. Não presumir que ele usa uma chave antes de conhecer o serviço.

## Configuração segura

- Não inserir senhas, tokens, chaves de API ou credenciais de e-mail neste
  documento, no código-fonte ou em commits.
- Solicitar e fornecer segredos por um canal seguro e configurá-los como
  variáveis de ambiente/segredos do servidor ou da plataforma de hospedagem.
- Os nomes de variáveis de ambiente do frontend estão listados em
  `.env.example`; os requisitos atuais da API (Vercel Functions) estão descritos em
  `api/README.md`.
