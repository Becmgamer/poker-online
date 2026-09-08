const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

let rooms = {};

// Função para gerar e embaralhar o baralho
function createDeck() {
    const suits = ['♠', '♥', '♦', '♣'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    let deck = [];
    for (let suit of suits) {
        for (let value of values) {
            deck.push({ value, suit });
        }
    }
    return deck.sort(() => Math.random() - 0.5);
}

function startNewHand(room) {
    room.deck = createDeck();
    room.communityCards = [];
    room.pot = 0;
    room.currentBet = 0;
    room.gameStage = 'preflop'; // preflop, flop, turn, river

    // Distribui 2 cartas para cada jogador
    room.players.forEach(p => {
        p.cards = [room.deck.pop(), room.deck.pop()];
        p.currentBet = 0;
        p.folded = false;
    });

    room.turnIndex = 0;
    while (room.players[room.turnIndex] && room.players[room.turnIndex].folded) {
        room.turnIndex = (room.turnIndex + 1) % room.players.length;
    }
}

function advanceStage(room, roomId) {
    if (room.gameStage === 'preflop') {
        room.gameStage = 'flop';
        room.communityCards.push(room.deck.pop(), room.deck.pop(), room.deck.pop());
    } else if (room.gameStage === 'flop') {
        room.gameStage = 'turn';
        room.communityCards.push(room.deck.pop());
    } else if (room.gameStage === 'turn') {
        room.gameStage = 'river';
        room.communityCards.push(room.deck.pop());
    } else {
        // Fim da mão - Reinicia
        startNewHand(room);
    }
    room.currentBet = 0;
    room.players.forEach(p => p.currentBet = 0);
    room.turnIndex = 0;
    io.to(roomId).emit('roomUpdate', room);
}

io.on('connection', (socket) => {
    socket.on('joinRoom', ({ roomId, buyIn, useBots }) => {
        socket.join(roomId);
        
        if (!rooms[roomId]) {
            rooms[roomId] = {
                id: roomId,
                buyIn: parseInt(buyIn) || 100,
                players: [],
                deck: [],
                communityCards: [],
                pot: 0,
                currentBet: 0,
                turnIndex: 0,
                gameStage: 'waiting'
            };
            
            if (useBots) {
                for (let i = 1; i <= 2; i++) {
                    rooms[roomId].players.push({
                        id: `bot_${i}`,
                        name: `MegaBot ${i}`,
                        chips: rooms[roomId].buyIn,
                        isBot: true,
                        cards: [],
                        currentBet: 0,
                        folded: false
                    });
                }
            }
        }

        rooms[roomId].players.push({
            id: socket.id,
            name: `Jogador ${rooms[roomId].players.filter(p => !p.isBot).length + 1}`,
            chips: rooms[roomId].buyIn,
            isBot: false,
            cards: [],
            currentBet: 0,
            folded: false
        });

        io.to(roomId).emit('roomUpdate', rooms[roomId]);
    });

    socket.on('startGame', (roomId) => {
        const room = rooms[roomId];
        if (room) {
            startNewHand(room);
            io.to(roomId).emit('roomUpdate', room);
        }
    });

    socket.on('playerAction', ({ roomId, action, amount }) => {
        const room = rooms[roomId];
        if (!room) return;

        const player = room.players[room.turnIndex];
        if (player.id !== socket.id) return; // Garante que é a vez do jogador correto

        if (action === 'fold') {
            player.folded = true;
        } else if (action === 'call') {
            const callAmount = room.currentBet - player.currentBet;
            player.chips -= callAmount;
            room.pot += callAmount;
            player.currentBet = room.currentBet;
        } else if (action === 'raise') {
            const totalRaise = parseInt(amount);
            const addedBet = totalRaise - player.currentBet;
            player.chips -= addedBet;
            room.pot += addedBet;
            player.currentBet = totalRaise;
            room.currentBet = totalRaise;
        }

        // Passa o turno para o próximo jogador que não correu (fold)
        let nextTurn = (room.turnIndex + 1) % room.players.length;
        let attempts = 0;
        while (room.players[nextTurn].folded && attempts < room.players.length) {
            nextTurn = (nextTurn + 1) % room.players.length;
            attempts++;
        }
        room.turnIndex = nextTurn;

        // Se o turno voltou para o começo ou todos deram check/call, avança a etapa da mesa
        if (room.turnIndex === 0) {
            advanceStage(room, roomId);
        } else {
            io.to(roomId).emit('roomUpdate', room);
        }
    });

    socket.on('disconnect', () => {
        // Limpeza simples ao desconectar
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor MegaJogos Poker na porta ${PORT}`));
