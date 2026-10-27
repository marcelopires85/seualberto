# Abrigo do Seu Alberto

> Uma rede social fechada para aproximar animais resgatados de novas famílias.

## Sobre o projeto

O Abrigo do Seu Alberto apresenta animais disponíveis para adoção em uma
experiência simples, acolhedora e responsiva. Visitantes podem conhecer cada
perfil, interagir com as publicações e demonstrar interesse em adotar.

## O que foi feito

- Página inicial com apresentação do abrigo e cards dinâmicos de animais.
- Perfis com foto, nome, idade, características físicas e personalidade.
- Curtidas, comentários e compartilhamentos persistidos pela API.
- Formulário de adoção com dados de contato do interessado.
- Área administrativa protegida por login.
- Cadastro, edição e exclusão de perfis, incluindo upload de imagens.
- Moderação de comentários e acompanhamento do status dos pedidos.
- Rodapé com atalhos configuráveis para Instagram, WhatsApp e e-mail.
- Integração com armazenamento persistente e envio de pedidos por e-mail.

## Tecnologias

`React` · `TypeScript` · `Vite` · `React Router` · `Vercel Functions` ·
`Upstash Redis` · `Vercel Blob` · `Nodemailer`

## Estrutura

```text
src/
├── components/     # Navbar, rodapé e seção de animais
├── pages/          # Home, login e painel administrativo
├── lib/            # Comunicação tipada com a API
└── img/            # Imagens da interface e dos animais
api/                # Funções serverless e regras de persistência
```

## Executar localmente

```bash
npm install
npm run dev
```

Para validar o projeto:

```bash
npm run lint
npm run build
```

As variáveis necessárias para contatos, autenticação, armazenamento e SMTP
estão descritas em [`/.env.example`](./.env.example). Em produção, configure
esses valores como secrets da plataforma de hospedagem.

## Próximos passos

- Configurar os contatos oficiais e o SMTP do abrigo.
- Publicar e validar as integrações de Redis e Blob.
- Adicionar edição de comentários pelo painel administrativo.

## Histórico

O projeto evoluiu de uma base inicial de componentes e rotas para uma
experiência completa de adoção, com páginas de Home e Login, cards de animais,
interações públicas, formulário de adoção e painel de administração.
