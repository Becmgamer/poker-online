const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

let rooms = {};

io.on('connection', (socket) => {
    console.log('Usuário conectado:', socket.id);

    // Criar ou Entrar em uma Sala
    socket.on('joinRoom', ({ roomId, buyIn, useBots }) => {
        socket.join(roomId);
        
        if (!rooms[roomId]) {
            rooms[roomId] = {
                id: roomId,
                buyIn: parseInt(buyIn) || 100,
                players: [],
                deck: [],
                pot: 0
            };
            
            // Adiciona Bots se solicitado
            if (useBots) {
                for (let i = 1; i <= 3; i++) {
                    rooms[roomId].players.push({
                        id: `bot_${i}`,
                        name: `Bot ${i}`,
                        chips: rooms[roomId].buyIn,
                        isBot: true
                    });
                }
            }
        }

        // Adiciona o jogador real
        rooms[roomId].players.push({
            id: socket.id,
            name: `Jogador ${rooms[roomId].players.length + 1}`,
            chips: rooms[roomId].buyIn,
            isBot: false
        });

        io.to(roomId).emit('roomUpdate', rooms[roomId]);
    });

    socket.on('disconnect', () => {
        console.log('Usuário desconectado:', socket.id);
        // Lógica para remover jogador da sala pode ser adicionada aqui
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
