var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

var MESSAGES_TYPE = {
    CHAT: "chat",
    CONNECTION: "connection_user",
    SELECT_ROOM: "select_room",
    DESCONECTAR:"desconectar"
};

var users = {};
var globalMessages = [];

var getUserConnected = function () {
    console.log(Object.keys(users));
    return Object.keys(users);
};

var getLastMessages = function (messages) {
    return messages;
};

io.on('connection', function (socket) {
    console.log("new connection");

    // Listen a chat message
    socket.on(MESSAGES_TYPE.CHAT, function (msg) {
        if (msg.destination !== "Global") {
            userOrigin = users[msg.origin];
            userDestination = users[msg.destination];
            if (!userOrigin.messages[userDestination.userName]) {
                userOrigin.messages[userDestination.userName] = [];
            }
            userOrigin.messages[userDestination.userName].push(msg);
            if (!userDestination.messages[userOrigin.userName]) {
                userDestination.messages[userOrigin.userName] = [];
            }
            userDestination.messages[userOrigin.userName].push(msg);
            userOrigin.socket.emit(MESSAGES_TYPE.CHAT, msg);
            userDestination.socket.emit(MESSAGES_TYPE.CHAT, msg);
        } else {
            globalMessages.push(msg);
            io.emit(MESSAGES_TYPE.CHAT, msg)
        }
    });

    // conexion usuario
    socket.on(MESSAGES_TYPE.CONNECTION, function (msg) {
        console.log("Nueva conexion: " + msg.userName);
        var un = msg.userName;
        users[un] = {socket: socket, userName: msg.userName, messages: {}};
        io.emit(MESSAGES_TYPE.CONNECTION, getUserConnected());
    });

    // Room change event
    socket.on(MESSAGES_TYPE.SELECT_ROOM, function (msg) {
        console.log(msg);
        console.log("Cambio de sala: " + msg.origin + "/" + msg.destination);
        if (msg.destination === "Global") {
            io.emit(MESSAGES_TYPE.SELECT_ROOM, getLastMessages(globalMessages));
        } else {
            var messagesRoom = users[msg.destination].messages[msg.origin];
            if (!messagesRoom || messagesRoom === undefined) {
                socket.emit(MESSAGES_TYPE.SELECT_ROOM, []);
            } else {
                socket.emit(MESSAGES_TYPE.SELECT_ROOM, getLastMessages(messagesRoom));
            }
        }
    });
    
    socket.on(MESSAGES_TYPE.DESCONECTAR, function (msg){
        console.log("desconectado:"+msg);
        delete users[msg];
        console.log(Object.keys(users));
        io.emit(MESSAGES_TYPE.CONNECTION, getUserConnected());
       
    });
    // escuchar los que se han desconectado.
    io.on('disconnect', function () {
        io.emit(MESSAGES_TYPE.CONECTION, users);
        console.log('desconectado');
    });

});

http.listen(3000, function () {
    console.log('listening on *:3000');
});
