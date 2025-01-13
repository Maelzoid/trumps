const express = require('express');
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');
const roomPlayers = {}; 

// Initialize Express
const app = express();

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Set up a basic route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Create an HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIo(server);


///// game variables


deckSize = [0,0,32,33,32,30,30,35,32]


/////////////////// general functions

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

function shuffleDeck(cards, deckSize) {

    const result = new Set(); // Use a Set to ensure uniqueness
    while (result.size < cards) {
        result.add(getRandomInt(deckSize));
    }
    return Array.from(result); // Convert the Set to an Array
}

function wait(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

function allBut(code, inputName) {
    const output = activePlayers(code).filter(player => player !== inputName);
    return output;
}

function activePlayers(code) {
    const room = rooms[code];
    output = []
    for (let i = 0; i < room.dealtCards.length; i += 1) {
        if (room.dealtCards[i][1].length > 0) {output.push(room.dealtCards[i][0])}}
    return output
}

function formatArray(results) {
    return results.map(entry => `${entry[0]}: ${entry[1]}`).join(', ');
  }


///////////////////// Serve static files

app.use(express.static('public'));

///////////////////// Handle Socket.IO connections

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Create Room Handler
    socket.on('createRoom', ({ playerName, thisDeck }) => {
        const roomCode = Math.floor(1000 + Math.random() * 9000).toString(); // Generate 4-digit room code
        socket.join(roomCode); // Host joins the room
    
        console.log(`Room ${roomCode} created by ${playerName}`);
        console.log(`Deck:`, thisDeck);
    
        // Initialize room-specific state
        if (!rooms[roomCode]) {
            rooms[roomCode] = {
                host: { id: socket.id, playerName },
                thisDeck: thisDeck || 'default', // Default if none provided
                game: false, // Game is not active yet
                rawDeck: [],
                playerList: [playerName], // Add host to player list
                socketList: [socket.id],
                currentPlayer: null,
                playerCount: 1, // Host is the first player
                prizeCards: [],
                dealtCards: [],
                freezeQuit: false,
            };
        }
    
        // Notify the host about the room creation
        socket.emit('roomCreated', { roomCode });
        io.in(roomCode).emit('testEvent', { message: 'Test message to all in the room' });
        importRawDeck(roomCode)
        console.log(rooms[roomCode])

    });
    

    // Join Room Handler (Inside)
    socket.on('joinRoom', ({ roomJoinCode, playerName }) => {
        const room = rooms[roomJoinCode]; // Retrieve the room object
        console.log(rooms)    
        // Check if the room exists
        if (!room) {
            socket.emit('joinError', { message: 'Room does not exist' });
            return;
        }
        
        // Check if the game has already started
        if (room.game) {
            socket.emit('joinError', { message: 'The game has already started. You cannot join now.' });
            return;
        }


        // Get the current size of the room
        const currentRoomSize = io.sockets.adapter.rooms.get(roomJoinCode)?.size || 0;

        // Check if the room is full
        if (currentRoomSize >= 8) {
            socket.emit('joinError', { message: 'Room is full.' });
            return;
        }

        // Check if the player name is already taken
        if (room.playerList.includes(playerName)) {
            socket.emit('joinError', { message: 'Player name already taken' });
            return;
        }
    
        // Join the room
        socket.join(roomJoinCode);
        console.log(`${playerName} joined room ${roomJoinCode}`);

    
        // Update room state
        room.playerList.push(playerName); // Add player to playerList
        room.socketList.push(socket.id)
        room.playerCount++; // Increment player count
    
        // Notify the player they joined successfully
        socket.emit('joinSuccess', {
            roomCode: roomJoinCode,
            playerName,
            playerList: room.playerList, 
            deck: room.thisDeck
        });
    
        // Notify all other players in the room about the new player
        console.log(`Emitting playerJoined event to room ${roomJoinCode}`);
        console.log(`Rooms for socket ${socket.id}:`, socket.rooms);
        socket.to(roomJoinCode).emit('playerJoined', {
            playerName,
            playerList: room.playerList,
        });

        // if 8 players have joined. Begin play...

        if (room.playerCount > 7) {gameOn(roomJoinCode)}
    });
    

    // Disconnect Handler (Inside)
    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        // check rooms to see if client is in
        for (const key in rooms) {
            if (rooms[key].socketList.includes(socket.id)){
                room = rooms[key]
                thisIndex = room.socketList.indexOf(socket.id)
                thisName = room.playerList[thisIndex]
                console.log(`${socket.id} ${thisName} leaves room ${key}.`);
                console.log(room.socketList)
                console.log(room.playerList)
                console.log(room.game)
                if (!room.game) {
                    // game not yet started
                    room.socketList.splice(thisIndex,1)
                    room.playerList.splice(thisIndex,1)
                    socket.to(key).emit('playerJoined', {
                        playerName: null,
                        playerList: room.playerList,
                    });

                } else {
                    // game underway
                    playerQuits(key, thisName)
                }
            }
        }
    });

    
    socket.on('init-game', (data) => {
        // Fallback values for undefined data

        playerName = [data.playerName];
        thisDeck = data.thisDeck;
    
        // Add player to playerList and set the deck
        playerList = [playerName[0]];
        
        io.emit('updatePlayerList', playerList);  // Broadcast updated playerList to all clients
        importRawDeck() 

    });

   
    // Listen for Game on signal
    socket.on('game-on', (code) => {
        gameOn(code)        
    });

    
    // Listen for submit play
    socket.on('submit-play', ({thisRoom, categoryNumber}) => {
        playRound(thisRoom, categoryNumber)
    });


    // Listen for player quitting
    socket.on('player-quits', ({ thisRoom, thisPlayer }) => {
        console.log(thisRoom, thisPlayer)
        playerQuits(thisRoom, thisPlayer)
    });




});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on PORT ${PORT}`));

//////////////// load card deck //////////////

function importRawDeck (code) {
    const room = rooms[code];
    const fs = require('fs');
    const csv = require('csv-parser');

    const deckPath = 'decks/'+room.thisDeck+'.csv'; // Specify the CSV file path
    room.rawDeck = []

    fs.createReadStream(deckPath)
    .pipe(csv({ headers: false })) // Disable headers to get rows as arrays
    .on('data', (row) => {
      room.rawDeck.push(Object.values(row)); // Ensure row is an array
    })
    .on('end', () => {
        console.log('Deck imported successfully: ', room.rawDeck);

    })
    .on('error', (err) => {
      console.error('Error reading the CSV file:', err);
    });
}

async function prepareDeck(code) {
    const room = rooms[code];
    room.comparisons = room.rawDeck[1]
    room.categories = room.rawDeck[2]
    room.rawDeck = room.rawDeck.slice(3)
    shuffleRange = shuffleDeck(deckSize[room.playerList.length], room.rawDeck.length)
    console.log(deckSize[room.playerList.length], room.rawDeck.length, shuffleRange)
    
    room.dealtCards = []
    hands = []

    for (let i = 0; i < shuffleRange.length; i += shuffleRange.length/room.playerList.length) {
        const chunk = shuffleRange.slice(i, i + shuffleRange.length/room.playerList.length);
        hands.push(chunk)
    }
    
    for (let i = 0; i < room.playerList.length; i += 1) {
        room.dealtCards.push([room.playerList[i],hands[i]])
    }
    
    console.log(room.dealtCards)
    io.in(code).emit('send-raw-deck', {rawDeck: room.rawDeck, comparisons: room.comparisons, categories: room.categories} );  // Broadcast updated playerList to all clients
    room.currentPlayer = room.playerList[getRandomInt(room.playerList.length)]
    await wait(1)
    nextHand(code)
   
} 

function gameOn(code) {

    const room = rooms[code];

    room.game = true
    room.playerCount = room.playerList.length
    room.prizeCards = []
    room.quittersList = []
    room.freezeQuit = false

    prepareDeck(code)

    io.in(code).emit('game-start');
    sendMessage(code,room.playerList,'Dealing cards...')
}



function sendMessage(code,recipient,content) {
    io.in(code).emit('send-message', { recipient, content });
}

function sendControl(code, recipient, control) {
    io.in(code).emit('control', { recipient, control });
}

function sendGameState(code) {
    const room = rooms[code];
    io.in(code).emit('send-game-state', { 
        dealtCards: room.dealtCards, 
        currentPlayer: room.currentPlayer 
    });
}

function dismantleRoom(io, roomCode) {
    io.in(roomCode).socketsLeave(roomCode);
    console.log(`Room ${roomCode} has been dismantled.`);
}

///////////////// gameplay   //////////////


function nextHand(code) {
    const room = rooms[code];
    endTimeout(code);
    sendGameState(code);
    sendMessage(code,[room.currentPlayer],'It\'s you to play')
    sendMessage(code,allBut(code,room.currentPlayer),room.currentPlayer+" to play")

    room.reminderTimeout = setTimeout(() => {
        console.log(`Reminder sent to ${room.currentPlayer} in room ${code}.`);
        sendMessage(code,[room.currentPlayer],"We're waiting... Make your move, "+room.currentPlayer+"!")
    }, 30000); // Reminder at 30 seconds

    room.timeout = setTimeout(() => {
        console.log(`Player ${room.currentPlayer} timed out in room ${code}.`);
        sendMessage(code,[room.currentPlayer],"You have taken too long to play!")
        sendMessage(code,allBut(code,room.currentPlayer),room.currentPlayer+" forfeits their turn!")
        timedOutPlayer = room.currentPlayer
        while (room.currentPlayer == timedOutPlayer){
        room.currentPlayer = room.dealtCards[getRandomInt(activePlayers(code).length)][0]}
        nextHand(code)
    }, 45000); // 45 seconds, adjust as needed
}






function findWinners(toCompare, comparisons) {

    if (!Array.isArray(toCompare) || (comparisons !== "max" && comparisons !== "min")) {
        throw new Error("Invalid input");
    }

    // Determine whether to find the maximum or minimum
    const isMax = comparisons === "max";
    let bestValue = isMax ? -Infinity : Infinity;
    let winners = [];

    // Iterate through the array to find the best value and corresponding names
    for (let [name, value] of toCompare) {
        if (typeof value !== "number" || typeof name !== "string") {
            throw new Error("Invalid data format in toCompare array");
        }

        if ((isMax && value > bestValue) || (!isMax && value < bestValue)) {
            bestValue = value;
            winners = [name]; // Reset the winners to only the current name
        } else if (value === bestValue) {
            winners.push(name); // Add to winners in case of a tie
        }
    }

    return winners;
}


function endTimeout(code){
    const room = rooms[code];

    console.log(room.timeout)
    console.log("endTimeout: "+code)


    if (room.timeout) {
        clearTimeout(room.timeout)
        room.timeout = null;
    }

    if (room.reminderTimeout) {
        clearTimeout(room.reminderTimeout)
        room.reminderTimeout = null;
    }


    console.log(room.timeout)
}


async function playRound(code, catNo) {
    const room = rooms[code];
    toCompare = []
    room.freezeQuit = true

    endTimeout(code)


    for (let i = 0; i < room.dealtCards.length; i += 1) {
        toCompareCard = []
        toCompareCard.push(room.dealtCards[i][0])
        toCompareCard.push(parseFloat(room.rawDeck[room.dealtCards[i][1][0]][catNo]))
        toCompare.push(toCompareCard)
    }
    
    console.log("to compare: ",toCompare)

    for (let i = 0; i < toCompare.length; i += 1) {
        if (room.currentPlayer == toCompare[i][0]) {declaredValue = toCompare[i][1]} }


    sendMessage(code, allBut(code,room.currentPlayer), room.currentPlayer+' calls '+room.categories[catNo]+': '+declaredValue)
    sendControl(code, allBut(code,room.currentPlayer),'flipUnflipped')
    sendControl(code, activePlayers(code), 'flashCat'+[catNo])

    winners = findWinners(toCompare,room.comparisons[catNo-3])

    room.freezeQuit = true
    await wait(5)


    //// remove losers cards ///

    for (let i = 0; i < room.dealtCards.length; i += 1) {
        player = room.dealtCards[i][0]
        if (!winners.includes(player)) {
            room.prizeCards.push(room.dealtCards[i][1].shift())
            if (room.dealtCards[i][1].length == 0) {
                knockOutPlayer(code, player)
            } else {
                sendControl(code, player, 'loseCard')
            }
        }}
    


    /// showdown! ////

    while (winners.length > 1) {

        if (winners.length == 2) {
        sendMessage(code, activePlayers(code),'It\'s a draw! Showdown between '+winners[0]+' and '+winners[1])}
        else {sendMessage(code, activePlayers(code),'It\'s a draw! Showdown between '+winners.length+' players')}
        
        // remove cards only for those who have more than one and assemble new compare list

        toCompare = []

        for (let i = 0; i < room.dealtCards.length; i += 1) {
            player = room.dealtCards[i][0]
            if (winners.includes(player)) {
                if (room.dealtCards[i][1].length > 1) {
                    room.prizeCards.push(room.dealtCards[i][1].shift())
                    sendGameState(code)
                    sendControl(code,player, 'loseAndFlipCard')
                }
                toCompareCard = []
                toCompareCard.push(player)
                toCompareCard.push(parseFloat(room.rawDeck[room.dealtCards[i][1][0]][catNo]))
                toCompare.push(toCompareCard)
            }}
        

        // run showdown with current first card

        finalists = winners
        winners = findWinners(toCompare,room.comparisons[catNo-3])
        
        console.log("showdown",winners,"dealtCards: ",room.dealtCards,"prize Crds: ", room.prizeCards)

        sendMessage(code,activePlayers(code), formatArray(toCompare))

        await wait (1)

        sendControl(code, activePlayers(code), 'flashCat'+[catNo])

        await wait(4)
        
        /////  eliminate losers

        for (let i = 0; i < room.dealtCards.length; i += 1) {
            player = room.dealtCards[i][0]
            if (!winners.includes(player) && finalists.includes(player)) {
                room.prizeCards.push(room.dealtCards[i][1].shift())
                if (room.dealtCards[i][1].length == 0) {
                    knockOutPlayer(code,player)
                } else {
                    sendControl(code, player, 'loseCard')
                }
            }}
    }
    
    ///// round winner found ///

    console.log('winner: ',winners[0],'   prize: ',room.prizeCards)
    
    room.currentPlayer = winners[0]

    sendMessage(code,[room.currentPlayer],'You\'ve won the hand!')
    sendMessage(code,allBut(code,room.currentPlayer),room.currentPlayer+' wins the hand!')
    sendControl(code,[room.currentPlayer],'winHand'+((room.prizeCards.length)))

    
    for (let i = 0; i < room.dealtCards.length; i += 1) {
        if (room.currentPlayer == room.dealtCards[i][0]) {
            room.prizeCards.push(room.dealtCards[i][1].shift());
            room.dealtCards[i][1] = room.dealtCards[i][1].concat(room.prizeCards)}
    }

    room.prizeCards = []

    ///////remove excluded players from dealtCards

    room.dealtCards = room.dealtCards.filter(([name, cards]) => cards.length > 0);

    
    room.freezeQuit = false
    checkforQuitters(code)
    checkForWinner(code)
    if (room.game) {nextHand(code)}
}



function checkForWinner(code) {
    room = rooms[code]
    if (room.dealtCards.length == 1) {
        endTimeout(code)
        room.game = false
        winner = room.dealtCards[0][0]
        sendControl(code, winner, "winGame" )
        sendMessage(code, winner, "Congratulations! You have won the game!")
        loserList = room.playerList.filter((player => player !== winner))
        sendMessage(code, loserList, winner+" has won the game!")
        dismantleRoom(io, code) 
    }
    }


function knockOutPlayer(code, player) {
    sendMessage(code, allBut(code,player),player+" has been knocked out!")
    sendMessage(code, player, "In! Your! Face! You've been knocked out!")
    sendControl(code, player, 'loseGame')
}


function playerQuits(code, quitterName) {    
    const room = rooms[code]
    console.log(quitterName, " has quit!")   
    if (room.freezeQuit) {room.quittersList.push(quitterName)}
    else {
        removePlayer(code, quitterName)}   
}

function removePlayer(code, removedName) {
    const room = rooms[code]
    for (let i = 0; i < room.dealtCards.length; i += 1) {
        if (removedName == room.dealtCards[i][0]) {
            room.prizeCards = room.prizeCards.concat(room.dealtCards[i][1])
        }}
    room.dealtCards = room.dealtCards.filter(([name, cards]) => name != removedName);
    sendMessage(code, activePlayers(code),removedName+" has left the game! All their cards into the middle!");
    sendControl(code, removedName, 'loseGame')
    checkForWinner(code)
    if (room.game){
        if (room.currentPlayer == removedName) {
            room.currentPlayer = room.dealtCards[getRandomInt(activePlayers(code).length)][0]
            nextHand(code)        
        }}      
}


function checkforQuitters(code) {
    room = rooms[code]
    while (room.quittersList.length > 0){
        removePlayer(code,room.quittersList[0])
        room.quittersList.shift()
    }
}







//////////////////// Socket Room functions /////////////////////////////

const rooms = {};

