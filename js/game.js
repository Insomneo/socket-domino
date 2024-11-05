// Constants for seat positions on the board, [X, Y]
const SEAT_BOTTOM = [450, 550];
const SEAT_TOP = [450, 50];
const SEAT_LEFT = [50, 250];
const SEAT_RIGHT = [950, 250];
const SEAT_POSITIONS = [SEAT_BOTTOM, SEAT_LEFT, SEAT_TOP, SEAT_RIGHT];

// Class to manage individual seat states on the board
class Seat {
  seatedPlayer;
  sprite;

  constructor(scene, seatPosition, seatedPlayer = null) {
    this.scene = scene;
    this.seatedPlayer = seatedPlayer;
    const [x, y] = seatPosition;

    // Display text for seat representation
    this.sprite = this.scene.add.text(x, y, '...', { fontSize: '16px', fill: '#fff' });
    this.updateSeat(seatedPlayer);
  }

  // Get the currently seated player
  getSeatedPlayer() {
    return this.seatedPlayer;
  }

  // Make the seat empty and update the display
  leaveSeat() {
    this.sprite.setText('...');
    this.seatedPlayer = null;
  }

  // Set a player in the seat and update display with their ID
  updateSeat(player) {
    this.seatedPlayer = player;
    this.sprite.setText(player?.playerId ?? '...');
  }
}

// Class to manage the game client’s board and seat arrangement
class GameClient {
  board = [];

  constructor(myId, board, scene) {
    this.myId = myId;
    this.board = board;

    // Set up seats based on player’s perspective
    this.originalSeats = this.getPerspectiveSeats(this.board, this.myId)
      .map((playerId, index) => new Seat(scene, SEAT_POSITIONS[index], playerId));
  }

  // Get seats arranged from the perspective of the current player
  getPerspectiveSeats(board, perspectiveId) {
    const mySeatIndex = board.findIndex(({ playerId }) => playerId === perspectiveId);
    return Array.from({ length: board.length }, (_, i) => board[(mySeatIndex + i) % board.length]);
  }

  // Update the board and refresh the seats as needed
  setBoard(board, myId) {
    this.myId = myId ?? this.myId;
    this.board = board;
    this.refreshSeats(board);
  }

  // Update seat objects based on the current board state
  refreshSeats(board) {
    this.getPerspectiveSeats(board, this.myId).forEach((player, i) => {
      const currentPlayer = this.originalSeats[i].getSeatedPlayer();
      if (player.playerId !== currentPlayer?.playerId) {
        this.originalSeats[i].updateSeat(player);
      }
    });
  }
}

// Class to manage socket connections and communicate with the server
class ClientSocketManager {
  gameClient;

  constructor(scene) {
    this.scene = scene;
    this.socket = io.connect();

    // Set up event listeners for socket events
    this.socket.on('playerId', (data) => {
      const { playerId, board } = data;
      this.gameClient = new GameClient(playerId, board, this.scene);
    });

    this.socket.on('boardUpdate', (data) => {
      const { board } = data;
      this.gameClient.setBoard(board);
    });
  }

  // Emit event to request to join the game
  connect() {
    this.socket.emit('newPlayer');
  }
}

// Main game scene class to set up Phaser scene and client manager
class Game extends Phaser.Scene {
  clientSocketManager;

  constructor() {
    super({ key: 'Game' });
  }

  preload() {
    // Preload assets for the game
    this.load.spritesheet('dominoes', 'assets/domino-tileset.png', {
      frameWidth: 128,
      frameHeight: 64,
    });
  }

  create() {
    // Initialize socket manager and connect to the game
    this.clientSocketManager = new ClientSocketManager(this.scene.scene);
    this.clientSocketManager.connect();
  }
}

// Phaser game configuration and initialization
const config = {
  type: Phaser.AUTO,
  width: 1000,
  height: 600,
  scene: Game,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 200 },
    },
  },
};

const game = new Phaser.Game(config);