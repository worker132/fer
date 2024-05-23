const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { createBot } = require('mineflayer');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let bots = {};

app.use(express.static('public'));
app.use(express.json());

app.post('/connect_bot', (req, res) => {
    const { ip, port, botId } = req.body;
    if (!bots[botId]) {
        const bot = createBot({
            host: ip,
            port: port,
            username: `bot${botId}`
        });

        bots[botId] = bot;
        bot.on('login', () => {
            console.log(`Bot ${botId} connected`);
            res.json({ status: 'connected' });
        });

        bot.on('chat', (username, message) => {
            io.emit('bot_response', { botId, type: 'chat', message: `${username}: ${message}` });
        });

        bot.on('health', () => {
            io.emit('bot_response', { botId, type: 'health', message: `Health: ${bot.health}` });
        });

        bot.on('death', () => {
            io.emit('bot_response', { botId, type: 'death', message: `Bot ${botId} has died` });
        });
    } else {
        res.json({ status: 'already connected' });
    }
});

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('control_bot', (data) => {
        const { botId, command } = data;
        const bot = bots[botId];
        if (bot) {
            handleBotCommand(bot, command);
            socket.emit('bot_response', { botId, status: 'command_executed' });
        }
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

function handleBotCommand(bot, command) {
    switch (command) {
        case 'forward':
            bot.setControlState('forward', true);
            break;
        case 'backward':
            bot.setControlState('back', true);
            break;
        case 'left':
            bot.setControlState('left', true);
            break;
        case 'right':
            bot.setControlState('right', true);
            break;
        case 'stop':
            bot.clearControlStates();
            break;
        case 'jump':
            bot.setControlState('jump', true);
            break;
        case 'sprint':
            bot.setControlState('sprint', true);
            break;
        case 'crouch':
            bot.setControlState('sneak', true);
            break;
        case 'interact':
            bot.activateItem();
            break;
        case 'chat':
            bot.chat(command.message);
            break;
        // Add other cases as necessary
        default:
            console.log('Unknown command: ', command);
    }
}

server.listen(3000, () => {
    console.log('listening on *:3000');
});
