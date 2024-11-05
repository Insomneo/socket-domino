var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);

app.use('/css', express.static(__dirname + '/css'));
app.use('/js', express.static(__dirname + '/js'));
app.use('/assets', express.static(__dirname + '/assets'));

app.get('/', function(_, res) {
    res.sendFile(__dirname + '/index.html');
});

server.lastPlayerID = 0;

server.listen(process.env.PORT || 8081, function() {
    console.log('Listening on ' + server.address().port);
});

class DominoMatch {
  constructor(io) {
    this.io = io;
    this.tableSeats = [null, null, null, null];
    
    // Start listening for new connections
    this.io.on('connection', (socket) => this.handleConnection(socket));
  }

  handleConnection(socket) {
    // When a new player joins
    socket.on('newPlayer', () => this.addNewPlayer(socket));

    // Handle player disconnection
    socket.on('disconnect', () => this.handleDisconnection(socket));
  }

  addNewPlayer(socket) {
    const playerId = server.lastPlayerID++;
    if (this.isFull()) {
        socket.emit('matchFull', { message: 'The match is currently full.' });
        return;
    }

    const playerSit = this.sitPlayer(playerId);

    // Seat the player
    if (playerSit) {
        socket.player = { playerId };
        socket.emit('playerId', { playerId, board: this.getAllSittingPlayers() });
        socket.broadcast.emit('boardUpdate', { board: this.getAllSittingPlayers() });
    }
  }

  handleDisconnection(socket) {
    if (socket.player) {
        this.removePlayer(socket.player.playerId);

        this.io.emit('remove', socket.player);
        this.io.emit('boardUpdate', { board: this.getAllSittingPlayers() });
    }
  }

  sitPlayer(playerId) {
    for (let i = 0; i < this.tableSeats.length; i++) {
      if (this.tableSeats[i] === null) {
        this.tableSeats[i] = playerId;
        return true; // Player was successfully seated
      }
    }

    return false; // No available seats
  }

  isFull() {
    return this.tableSeats.every((seat) => seat != null);
  }

  removePlayer(playerId) {
    const seatIndex = this.tableSeats.indexOf(playerId);

    if (seatIndex !== -1) {
      this.tableSeats[seatIndex] = null;
    }
  }

  getAllSittingPlayers() {
    // Return a list of player seats, including null for empty seats
    return this.tableSeats.map((playerId) => ({
      playerId: playerId
    }));
  }
}

// Initialize the DominoMatch instance with the socket.io instance
const match = new DominoMatch(io);