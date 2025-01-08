/////////////////////  Socket functions   ///////////////////////

const socket = io();

socket.on('connect', () => {
    console.log('Connected to server:', socket.id);
});

socket.onAny((eventName, ...args) => {
    console.log(`Event received on client: ${eventName}`, args);
});

socket.on('testEvent', (data) => {
    console.log('Test event received:', data);
});



socket.on('roomCreated', ({ roomCode }) => {
    thisRoom = roomCode;
    roomCodeToDisplay.innerHTML = thisRoom;
    updatePlayerListDisplay([thisPlayer])
});

socket.on('joinSuccess', (data) => {
    console.log(`Joined room ${data.roomCode} as ${data.playerName}`);
    console.log(`Players in the room:`, data.playerList);

    thisPlayer = data.playerName;
    playerlist = data.playerList
    thisRoom = data.roomCode
    thisDeck = data.deck
    goToLobby()
    updatePlayerListDisplay(playerlist)
});

socket.on('joinError', ({ message }) => {
    console.error('Failed to join room:', message);
    sendAlert(message); // Display the error to the user
});

socket.on('playerJoined', (data) => {
    console.log('playerJoined event received:', data);
    playerlist = data.playerList
    updatePlayerListDisplay(playerlist);
    
});



// Listen for updates to the player list
socket.on('updatePlayerList', (playerList) => {
    if (playerList) {
        updatePlayerListDisplay(playerList); // Update the UI
        playerlist = playerList
        console.log('Player list received:', playerList);
    } else {
        console.error('Player list is undefined or empty!');
    }
});

// Listen for the 'deckChoice' event from the server
socket.on('deckChoice', (receivedDeck) => {
    thisDeck = receivedDeck;
    
});

// Listen for the game-start
socket.on('game-start',() => {
    game = true;
    lobby.style.display = "none";
    gamePage.style.display = "flex";
    footer.style.display = "none";
    endScreen.style.display = "none";
    switchGlobalTheme()
    createMiniCards();
    dealCards()
});

// Listen for messages
socket.on('send-message', (message) => {
    console.log(message);

    if (message.recipient.includes(thisPlayer)) {
        addMessage(message.content);
    }
});

// Listen for deployment of raw deck
socket.on('send-raw-deck', ( sendRawDeck ) => {
    console.log(sendRawDeck)
    playingDeck = sendRawDeck.rawDeck
    compare = sendRawDeck.comparisons
    categories = sendRawDeck.categories
});

// Listen for the 'send-game-state' event
socket.on('send-game-state', (gameState) => {
    dealtCards = gameState.dealtCards;
    currentPlayer = gameState.currentPlayer;
    
    /* updateCard() */
});


// Listen for the control event
socket.on('control', (payload) => {
    console.log(payload);

    if (payload.recipient.includes(thisPlayer)) {
        const controlActions = {
            loseCard: () => loseCard(),
            flipUnflipped: () => showCardFace(),
            loseGame: () => loseGame(),
            winGame: () => winGame(),
            loseAndFlipCard: () => loseAndFlipCard()
        };

        // Handle actions with numerical arguments dynamically
        if (/^flashCat\d+$/.test(payload.control)) {
            const index = parseInt(payload.control.replace('flashCat', ''), 10) - 3; // Adjust the index logic as needed
            if (index >= 0) flashCategoryButton(index);
        } else if (/^winHand\d+$/.test(payload.control)) {
            const handNumber = parseInt(payload.control.replace('winHand', ''), 10);
            winHand(handNumber);
        } else if (payload.control in controlActions) {
            controlActions[payload.control]();
        } else {
            console.warn("Unknown control:", payload.control);
        }
    }
});



////////////////// getElements ////////////////////////

const elementIds = [
    "landing", "startGame", "joinGame", "lobby", "gamePage", "dealCardsButton", "turnCardButton", "playerListDiv", "cardInPlayDiv", "statButton1", "statButton2", "statButton3", "statButton4", "statButton5", "cardFront","cardName", "cardImage","cardImagePath","cardNumber", "cardFlag", "cardBack", "infoDisplay", "myCards", "playButton", "playButtonDiv","cardContainer", "dealingCards", "playersDeck",  "oldskool", "minimal", "neon", "endScreen", "endScreenImg", "menuScreen", "roomCodeToDisplay", "hostName", "newPlayerName", "playerListDetail", "shareCode", "guestInstruction", "lobbyDeck", "lobbyDeckImg", "footer", "alertSpace", "alertContent", "canvasContainer"
];

const elements = {};

elementIds.forEach(id => {
    elements[id] = document.getElementById(id);
});

const classNames = [
    "statButtonClass", "backOfCard",  "killButton"
];

const classElements = {};

classNames.forEach(className => {
    classElements[className] = document.getElementsByClassName(className);
});



//////////////////// initial state and variables ///////////////

deckList = ['80sCars','Aeroplanes','Ships']
thisDeckIndex = 0
thisDeck = '80sCars'
thisPlayer = ''
host = false
game = false
cardsToDeal = [1,1,16,11,8,5,5,5,4]
dealtCards = [];
currentPlayer = null;
compare = []
categories = []
statButtons = [statButton1, statButton2, statButton3, statButton4, statButton5];
messageBuffer= []
isProcessing = false;
const root = document.documentElement;
const body = document.body;
thisSkin = 'oldskool'
thisTheme = 'default'
let thisRoom

//////////////////// rando functions /////////////////////

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}


function updateCardHeight() {
    // constantly gets the height of the card to proportionally style the card
    const cardHeight = cardContainer.offsetHeight;
    root.style.setProperty("--card-height", `${cardHeight}px`);
}


// Optionally, update on window resize for responsiveness
window.addEventListener("resize", updateCardHeight);


// Add a click event listener to toggle the card flip
cardBack.addEventListener('click', () => {   
    showCardFace();
    });



function toggleMenu() {
    menuScreen.classList.toggle('show');
    }


function myHand() {
    const result = dealtCards.find(player => player[0] === thisPlayer);
    return result ? result[1] : null; // Return the array or null if the name is not found
    }

function myHandLength() {
    return myHand().length
}

function myCardToPlay() {
    return myHand()[0]
}






///////////// sound effects  /////////////////


const soundFlip = new Audio('sounds/flip.wav')
const soundLosecard = new Audio('sounds/losecard.mp3')
const soundRedeck = new Audio('sounds/redeck.mp3')
const soundRiffle = new Audio('sounds/riffle.mp3')

soundFlip.load()
soundLosecard.load()
soundRedeck.load()
soundRiffle.load()

//////////// graphic functions ///////////////


function showCardFace() {
    updateCard()
    /* soundFlip.play().catch((error) => {
        console.error('Error playing sound:', error);
    });*/
    cardInPlayDiv.classList.add('is-flipped');
}


function loseCard() {
    if (cardContainer.classList.contains('flyOff')) return; // Prevent re-triggering

    // Reset transform state to ensure no backward animation plays
    cardContainer.style.transition = 'none'; // Disable any transition effects for immediate reset
    cardContainer.offsetHeight; // Force reflow (to reset styles)
    
    // Start the animation
    cardContainer.classList.add('flyOff');
    console.log('lose Card');
    

    // Reset transition to ensure it works for future changes
    setTimeout(() => {
        cardContainer.style.transition = ''; // Re-enable transitions
    }, 0);

    // Handle animation end to clean up
    cardContainer.addEventListener('animationend', function handleAnimationEnd(event) {
        if (event.animationName === 'flyOff') {
            // Reset state and clean up
            cardInPlayDiv.classList.remove('is-flipped');
            void cardInPlayDiv.offsetWidth; // Force reflow for clean reset

            // Remove the flyOff class to reset the animation
            cardContainer.classList.remove('flyOff');
            void cardContainer.offsetWidth; // Force reflow again if needed
            updateStack()
            // Remove the event listener for cleanup
            cardContainer.removeEventListener('animationend', handleAnimationEnd);
        }
    });
}


function loseAndFlipCard() {
    loseCard()
    setTimeout(() => {
        showCardFace(); 
    }, 500);
}


function loseGame() {
    if (cardContainer.classList.contains('flyOff')) return; // Prevent re-triggering

    // Reset transform state to ensure no backward animation plays
    cardContainer.style.transition = 'none'; // Disable any transition effects for immediate reset
    cardContainer.offsetHeight; // Force reflow (to reset styles)
    
    // Start the animation
    endScreenImg.src ="images/assets/loser.png"
    endScreen.style.display = "flex";
    cardContainer.classList.add('flyOff');
    console.log('lose Game');
    showMiniCards(0)

}


function winGame() {
    endScreenImg.src ="images/assets/winner.png"
    endScreen.style.display = "flex";
    console.log('win Game');
    showMiniCards(0)
}



function reDeckCard() {

    if (cardContainer.classList.contains('reDeck')) return; // Prevent re-triggering

    // Reset transform state to ensure no backward animation plays
    cardContainer.style.transition = 'none'; // Disable any transition effects for immediate reset
    cardContainer.offsetHeight; // Force reflow (to reset styles)
    
    // Start the animation
    cardContainer.classList.add('reDeck');
    console.log('reDeck Card');

    // Reset transition to ensure it works for future changes
    setTimeout(() => {
        cardContainer.style.transition = ''; // Re-enable transitions
    }, 0);

    // Handle animation end to clean up
    cardContainer.addEventListener('animationend', function handleAnimationEnd(event) {
        if (event.animationName === 'reDeck') {
  
            // Remove the flyOff class to reset the animation
            cardContainer.classList.remove('reDeck');
            void cardContainer.offsetWidth; // Force reflow again if needed
            cardInPlayDiv.classList.remove('is-flipped');
            void cardInPlayDiv.offsetWidth; // Force reflow for clean reset

            // Remove the event listener for cleanup
            cardContainer.removeEventListener('animationend', handleAnimationEnd);
            updateStack()
        }
    });
}

function winCards(numCards) {
    dealingCards.innerHTML = ""; // Clear previous cards
    dealingCards.classList.add("winning")
    const slideDuration = 0.5; // Duration of `slideDown` animation (in seconds)
    const staggerDelay = 0.2; // Time between each card's `slideDown` animation
    const totalAnimationTime = slideDuration + (numCards - 1) * staggerDelay; // Wait for the last card to finish sliding
    
    for (let i = 1; i <= numCards; i++) {
        const newDiv = document.createElement("div");
        newDiv.id = `dealingCard${i}`;        
        newDiv.classList.add("dealingCard", "winning", "backOfCard");
                
        // Add the animations
        newDiv.style.animation = `
            winCards ${slideDuration}s ease-in-out ${i * staggerDelay}s forwards 
        `;

        dealingCards.appendChild(newDiv);

    }

    // Make the dealingCards visible
    dealingCards.style.display = "flex";

    // Set a timeout to hide the dealingCards and trigger `startPlay`
    setTimeout(() => {
        dealingCards.style.display = "none"; // Hide the dealingCards
    }, totalAnimationTime * 1000); // Convert total animation time to milliseconds
}


function winHand(n){
    reDeckCard()
    winCards(n)
}


//////// minicards functions

function createMiniCards() {
    for (let i = 0; i < 35; i++) {
      const card = document.createElement("div");
      card.className = "miniCard";
      card.style.right = `${i * 15}px`; // Adjust overlap by changing 30
      card.style.zIndex = i; // Ensure cards overlap correctly
        card.style.transform = "translateY(100px)"
      myCards.appendChild(card);
    }
}

  
// Function to show the desired number of cards
function showMiniCards(count) {
    const allCards = document.querySelectorAll(".miniCard");
    allCards.forEach((card, index) => {
        if (index < count) {
        card.style.transform = "translateY(0)";
        } else {
        card.style.transform = "translateY(100px)"; // Optional animation effect
        }
    });
}
  
/////// carousel functions ///////////

function carouselPress(side) {
    thisDeckIndex = (thisDeckIndex+side+deckList.length)%deckList.length
    thisDeck = deckList[thisDeckIndex]
    document.querySelector('#chosenDeck img').src = 'images/'+thisDeck+'/cover.png'
}


///////////////////////// game start functions /////////////////////////////

window.onload = function() {
    fetchPlayerList();
};

function preloadImages(folder) {
    const images=['A1','A2','A3','A4','B1','B2','B3','B4','C1','C2','C3','C4','D1','D2','D3','D4','E1','E2','E3','E4','F1','F2','F3','F4','G1','G2','G3','G4','H1','H2','H3','H4','I1','I2','I3','I4','J1','J2','J3','J4','K1','K2','K3','K4','L1','L2','L3','L4','M1','M2','M3','M4']
    const preloadedImages = [];
    
    images.forEach((imageName) => {
        const img = new Image();
        img.onerror = () => {
            // Silently handle missing images; no logging needed
            img.src = ""; // Optional: Set to an empty string to ensure no broken references
        };
        img.src = `images/${folder}/${imageName}.jpg`;
        preloadedImages.push(img);
    });
    
        return preloadedImages; // Optional: Access preloaded images later if needed
    }






function goToStartGame () {
    hostName.value = thisPlayer
    startGame.style.display = "block"
    shareCode.style.display = "block"
    landing.style.display = "none"
    window.scrollTo({ top: 0 });
}

function goToJoinGame (){
    fetchPlayerList();
    newPlayerName = thisPlayer
    joinGame.style.display = "block"
    landing.style.display = "none"
    window.scrollTo({ top: 0 });
}


// Function to update the player list display
function updatePlayerListDisplay(playerList) {
    playerListDiv.innerHTML = playerList.join(", "); 
    if (playerList.length > 1) {
        playerListDetail.innerHTML = (playerList.length+" players ready to play with the "+thisDeck+" deck.");
        if (host) {dealCardsButton.style.display = "inline-block";
        } else {
            lobbyDeckImg.src = 'images/'+thisDeck+'/cover.png'
            guestInstruction.style.display = "block"
        }
    }
}



function initGame() {
    // Host initialises the game
    const playerName = hostName.value;
    

    thisPlayer = playerName

    // Emit the init-game event with playerName and thisDeck

    socket.emit('createRoom', { playerName, thisDeck })

    //socket.emit('init-game', { playerName, thisDeck });

    // Hide the start game div and show the lobby
    startGame.style.display = "none";
    lobby.style.display = "block";
    host = true
    window.scrollTo({ top: 0 });
}


function joinNewGame() {
    const playerName = document.getElementById('newPlayerName').value;;
    const roomJoinCode = document.getElementById('gameId').value;
    socket.emit('joinRoom', { roomJoinCode, playerName });
}

function goToLobby() {
    joinGame.style.display = "none";
    lobby.style.display = "block";
    window.scrollTo({ top: 0 });
    preloadImages(thisDeck)
    
}


function fetchPlayerList() {
    socket.emit('getPlayerList'); // Request the player list
}


function gameOn() {
    socket.emit('game-on', thisRoom);
}


function dealCards() {
    numCards = cardsToDeal[playerlist.length]
    dealingCards.innerHTML = ""; // Clear previous cards
    playersDeck.style.display="none"
    const slideDuration = 0.5; // Duration of `slideDown` animation (in seconds)
    const staggerDelay = 0.1; // Time between each card's `slideDown` animation
    const convergeDuration = 0.55; // Duration of the `converge` animation
    const convergeDelay = slideDuration + (numCards - 1) * staggerDelay; // Wait for the last card to finish sliding
    const totalAnimationTime = convergeDelay + convergeDuration; // Total time for all animations

    for (let i = 1; i <= numCards; i++) {
        const newDiv = document.createElement("div");
        newDiv.id = `dealingCard${i}`;
        newDiv.classList.add("dealingCard");
        newDiv.classList.add("backOfCard");

        // Assign unique horizontal offset using CSS variable
        const xOffset = `${(i - Math.ceil(numCards / 2)) * 15}px`; // Space by 10px
        newDiv.style.setProperty("--x-offset", xOffset);

        // Add the animations
        newDiv.style.animation = `
            slideDown ${slideDuration}s ease-in-out ${i * staggerDelay}s forwards, 
            converge ${convergeDuration}s ease-in-out ${convergeDelay}s forwards
        `;

        dealingCards.appendChild(newDiv);
    }



    // Make the dealingCards visible
    dealingCards.style.display = "flex";

    // Set a timeout to hide the dealingCards and trigger `startPlay`
    setTimeout(() => {
        dealingCards.style.display = "none"; // Hide the dealingCards
        playersDeck.style.display="flex"
        updateStack()
        startPlay(); // Call the next function
    }, totalAnimationTime * 1000); // Convert total animation time to milliseconds
}



//////////////////////// gameplay functions //////////////////////


function startPlay() {
    /* updateCard() */
    cardContainer.style.display = "flex"
    updateCardHeight();    
}


function updateStack() {
    root.style.setProperty('--cardsInHand', myHandLength());
    if (myHandLength() <= 1){playersDeck.style.display="none"} else {playersDeck.style.display = "flex"}
    showMiniCards(myHandLength());
}


function updateCard() {
    const cardDeets = playingDeck[myCardToPlay()];
    cardNumber.textContent = cardDeets[0];
    cardImagePath.src = "images/" + thisDeck + "/" + cardDeets[0] + ".jpg";
    cardName.textContent = cardDeets[1];
    cardFlag.src = "images/flags/" + cardDeets[2] + ".svg";
    
    for (let i = 0; i < 5; i++) {
        // Check if the category includes 'year' or 'Year'
        let category = categories[i + 3];
        let value = Number(cardDeets[i + 3]);
        let formattedNumber = category.toLowerCase().includes('year') ? value : value.toLocaleString();
    
        statButtons[i].innerHTML = `<p class="tabbed-line">${category}: <span class="tab">${formattedNumber}</span></p>`;
    }
    

    console.log("updateCard: ",cardDeets);
}


function selectPlayChoice(categoryNumber) {
    if (thisPlayer === currentPlayer) {
        playButtonDiv.classList.add('show');
        
        // Change the background color of the button

        clearStatButtons()
        statButtons[categoryNumber - 3].style.backgroundColor = "var(--catBoxHiliteColour)";

        // Add a button dynamically with an onclick handler
        playButtonDiv.innerHTML = `<button id="playButton" onclick="submitPlayChoice(${categoryNumber})"></button>`;
    }
}


function clearStatButtons() {
    statButtons.forEach(button => {
        button.style.backgroundColor = "var(--catBoxColour)";
    });
}


function submitPlayChoice(categoryNumber) {
    playButtonDiv.classList.remove('show');
    clearStatButtons()
    socket.emit('submit-play', { thisRoom, categoryNumber });
}


function flashCategoryButton(n) {
    statButtons[n].classList.add("flashing");
    setTimeout(() => {
        statButtons[n].classList.remove("flashing");
    }, 2500); 
}


function quitGame() {
    socket.emit('player-quits', { thisRoom, thisPlayer });
    backToStart()
}




//////////////////// message functions  ///////////////////

// Function to process messages with a delay
function processMessages() {
    if (isProcessing) return; // Prevent multiple intervals
    isProcessing = true;
  
    // Display the first message immediately
    if (messageBuffer.length > 0) {
      const message = messageBuffer.shift();
      displayMessage(message);
    }
  
    const interval = setInterval(() => {
      if (messageBuffer.length === 0) {
        clearInterval(interval); // Stop when buffer is empty
        isProcessing = false; // Reset the flag
        return;
      }
  
      const message = messageBuffer.shift(); // Get the next message
      displayMessage(message); // Function to show the message
    }, 2000); // 2-second delay
  }
  
// Function to handle incoming messages
function addMessage(newMessage) {
    const wasBufferEmpty = messageBuffer.length === 0; // Check if buffer is empty
    messageBuffer.push(newMessage);

    if (wasBufferEmpty) {
        processMessages(); // Start processing if buffer was empty
    }
    }
  

function displayMessage(message) {
    infoDisplay.textContent = message
    }

////////////////// theme and skins functions

function switchGlobalTheme() {
    if (thisDeck == '80sCars') {thisTheme = 'default'}
    if (thisDeck == 'Aeroplanes') {thisTheme = 'classic'}
    if (thisDeck == 'Ships') {thisTheme = 'nautical'}   
    switchSkin(thisSkin)
}

function switchSkin(skin) {
    thisSkin = skin
    body.classList.remove('oldskool-skin', 'minimal-skin','neon-skin','default-theme','classic-theme', 'nautical-theme');
    if (skin == 'oldskool') { body.classList.add(`${thisTheme}-theme`)}
    body.classList.add(`${skin}-skin`);
}

document.body.addEventListener('click', (event) => {
    if (event.target.closest('.skin-button')) {
        const button = event.target.closest('.skin-button');
        const skin = button.getAttribute('data-skin');

        // Remove 'selected' class globally
        document.querySelectorAll('.skin-button').forEach(btn => btn.classList.remove('selected'));

        // Add 'selected' class to matching buttons
        document.querySelectorAll(`.skin-button[data-skin="${skin}"]`).forEach(btn => btn.classList.add('selected'));
    }
});


/////// end game functions


function backToStart() {
    host = false;
    footer.style.display="block"
    alertSpace.style.display = "none"
    guestInstruction.style.display = "none"
    shareCode.style.display = "none"
    dealCardsButton.style.display = "none"
    endScreen.style.display = "none"
    gamePage.style.display = "none"    
    landing.style.display = "block"
    menuScreen.classList.remove('show');
    cardContainer.classList.remove('flyOff');
    cardInPlayDiv.classList.remove('is-flipped');
    playersDeck.style.display = "none" 
    cardContainer.style.display = "none" 
    dealingCards.style.display = "none"
    switchSkin('oldskool')   
}


////////////// alerts  /////////////////

function killAlert(){
    alertSpace.style.display = "none"
}

function sendAlert(message){
    alertContent.innerHTML = '<p class="alertText">'+message+'</p>'
    canvasContainer.style.display = 'none'
    alertSpace.style.display = "flex"

}

function quitGameWarning(){
    alertContent.innerHTML = '<p class="alertText">Are you sure you want to quit this game?</p><button class="goButton" onclick="quitGame()"><img src="images/assets/quitButton.png" alt="quit button"></button>'
    canvasContainer.style.display = 'none'
    alertSpace.style.display = "flex"
}


//////////////// QR functions //////////////////////


function displayQR(){
    generateQRCode("https://tuptromps.onrender.com/?room="+thisRoom)
    alertSpace.style.display = "flex"
    canvasContainer.style.display = "block"
}

function generateQRCode(link) {
    alertContent.innerHTML = '<p class="alertText">Friends can scan this QR code to join your game.</p>';
    canvasContainer.innerHTML = ''

    // Use QRCode.toCanvas to generate the QR code directly into a <canvas> element
    QRCode.toCanvas(link, {
        width: 600, // Set width
        color: {
            dark: "#404040", // Dark gray QR code dots
            light: "#F0F0F0" // Light gray background
        }
    }, (error, canvas) => {
        if (error) {
            console.error(error);
            return;
        }

        // Append the generated <canvas> to the container
        canvasContainer.appendChild(canvas);
        console.log('QR Code generated successfully!');
    });
}

// respond to QR code

window.addEventListener('load', async function() {
    const urlParams = new URLSearchParams(window.location.search);
    let roomToJoin = urlParams.get('room');

    if(roomToJoin){
        document.getElementById('gameId').value = roomToJoin
        goToJoinGame()
    }

});

