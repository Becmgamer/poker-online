# Card Arena — multiplayer

Jogo de cartas multiplayer com salas de 2 a 8 jogadores e pontuação virtual, sem apostas.

## Rodar localmente

Requer Node.js. O projeto usa Node para o servidor HTTP e WebSocket; a documentação oficial descreve Node como runtime adequado para aplicações de rede escaláveis e inclui suporte a WebSocket. 

```bash
npm install
npm start
```

Abra `http://localhost:3000`.

## Publicar

Use um serviço de hospedagem que execute Node.js e exponha a porta definida por `PORT`. O processo de inicialização é `npm start`.

O frontend e o servidor estão no mesmo projeto para facilitar o deploy.

## Estrutura

- `server.js` — servidor HTTP + WebSocket, salas, jogadores e estado da partida.
- `public/index.html` — interface do jogo.
- `package.json` — dependência e comando de inicialização.

## Observação

A pontuação é apenas recreativa e não representa dinheiro, créditos ou qualquer valor monetário.
