// ping-pong-tracker-backend/src/config/socket.js
const { Server } = require('socket.io');

const initializeSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || "http://localhost:3000",
            methods: ["GET", "POST"]
        }
    } );

    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);
        
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });

    return io;
};

module.exports = { initializeSocket };
