/*eslint no-console: 0*/
"use strict";

const WebSocketServer = require('ws').Server
//We will create the websocket server on the port given by Cloud Foundry --> Port 8080
const ws = new WebSocketServer({ port: process.env.PORT || 8080 });

ws.on('connection', function (socket) {
  socket.send('Hi, this is the Echo-Server');
  socket.on('message', function (message) {
    console.log('Received Message: ' +  message);
    socket.send('Echo: ' + message);
  });
}); 