const express = require('express');
const https = require('https');
const fs = require('fs');
const socketIo = require('socket.io');


// 读取证书文件
const privateKey = fs.readFileSync('selfsigned.key', 'utf8');
const certificate = fs.readFileSync('selfsigned.crt', 'utf8');
const credentials = { key: privateKey, cert: certificate };


// 设置应用
const app = express();
const server = https.createServer(credentials,app);
const io = socketIo(server, {
    cors: {
        origin: "*", // 允许所有来源连接，实际生产环境请进行安全配置
        methods: ["GET", "POST"]
    }
});

const port = process.env.PORT || 3000;

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

const rooms = {};

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        const roomId = socket.roomId;
        if (rooms[roomId]) {
            rooms[roomId] = rooms[roomId].filter(client => client !== socket);

            // Notify others in the room
            rooms[roomId].forEach(client => {
                if (client) {
                    client.emit('user-disconnected', socket.id);
                }
            });

            if (rooms[roomId].length === 0) {
                delete rooms[roomId];
            }
        }
    });

    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        socket.roomId = roomId;
        if (!rooms[roomId]) {
            rooms[roomId] = [];
        }
        rooms[roomId].push(socket);

        console.log(`User ${socket.id} joined room ${roomId}`);

        // Notify others in the room
        rooms[roomId].forEach(client => {
            if (client !== socket) {
                client.emit('user-connected', socket.id);
            }
        });
    });

    socket.on('signal', (signal) => {
        console.log('Signal received:', signal);
        const { to } = signal;

        // Find the specific client to send the signal to
        const client = io.sockets.sockets.get(to);
        if (client) {
            client.emit('signal', { ...signal, from: socket.id });
        } else {
            console.error(`Client with ID ${to} not found`);
        }
    });
});

server.listen(port, '0.0.0.0', () => {
    console.log(`Server is listening on http://localhost:${port}`);
});