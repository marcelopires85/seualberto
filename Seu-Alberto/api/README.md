# API PHP

O backend usa PHP 8.1 ou superior e grava animais, interações e pedidos em
`api/storage/store.json`. Essa pasta é privada e não deve ser publicada nem
versionada. As fotos enviadas ficam em `api/storage/uploads/` e são servidas
pela API, sem acesso direto ao diretório.

## Desenvolvimento local

Em um terminal, na pasta `Seu-Alberto`, configure as variáveis e inicie o PHP:

```sh
ADMIN_EMAIL="admin@exemplo.com" \
ADMIN_PASSWORD_HASH="$(php -r 'echo password_hash("troque-esta-senha", PASSWORD_DEFAULT);')" \
MAIL_TO="abrigo@exemplo.com" \
MAIL_FROM="site@exemplo.com" \
npm run dev:api
```

Troque a senha de exemplo por uma senha forte. Em outro terminal, execute
`npm run dev`. O Vite encaminha `/api` ao servidor PHP local.

`MAIL_TO` é o endereço interno que receberá os formulários e `MAIL_FROM` deve
ser um remetente autorizado pelo servidor de e-mail. A função `mail()` do PHP
precisa de um agente de transporte de e-mail configurado no ambiente; sem ele,
o pedido ainda será persistido e o site informará que a mensagem não foi
enviada. Em produção, configure as quatro variáveis no ambiente do PHP e sirva
frontend e `/api` no mesmo domínio HTTPS.
Configure `upload_max_filesize` para pelo menos `6M` e `post_max_size` para
pelo menos `7M` no PHP de produção para permitir os arquivos de até 5 MB.

O arquivo `api/storage/.htaccess` bloqueia acesso direto aos dados em
servidores Apache. Em outros servidores, configure uma regra equivalente para
negar acesso a `/api/storage/`. Faça cópias de segurança de `store.json` e da
pasta `uploads/` fora do diretório público.
