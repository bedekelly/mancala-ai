import input from './input.mjs';

const captureEmptyPots = false;
const captureOwnPieces = false;
const aiMoveDepth = 8;
const initialBoard = {
  one: Array(6).fill(3),
  two: Array(6).fill(3),
  onePot: 0,
  twoPot: 0
}

/**
 * Board layout:
 *   2.5 2.4 2.3 2.2 2.1 2.0
 * 2                         1
 *   1.0 1.1 1.2 1.3 1.4 1.5
 */

function copyBoard(board) {
  return {
    onePot: board.onePot,
    twoPot: board.twoPot,
    one: [...board.one],
    two: [...board.two]
  }
}

const nextPlayer = {
  'one': 'two',
  'two': 'one'
}


const sum = arr => arr.reduce((a, b) => a+b, 0);

const canCapture = (player, boardSide) => {
  return captureOwnPieces || player === boardSide;
}


function updateBoard(board, move, player) {
  let number = board[player][move];
  let boardSide = player;
  const newBoard = copyBoard(board);
  newBoard[player][move] = 0;
  move++;
  let changePlayer;
  do {
    changePlayer = true;

    // Place a seed into each hollow in turn.
    for (; move < 6 && number > 0; move++, number--) {
      newBoard[boardSide][move]++;
    }

    // Placing a seed into each player's pot after their hollows.
    if (number > 0) {
      newBoard[`${boardSide}Pot`]++;
      number--;
      changePlayer = false;
    }

    // Capturing the other side's seeds.
    else if (newBoard[boardSide][move - 1] === 1 && canCapture(player, boardSide)) {
      const otherSidePot = 6 - move;
      const otherSide = nextPlayer[boardSide];
      const otherSidePotAmount = newBoard[otherSide][otherSidePot];
      if (captureEmptyPots || otherSidePotAmount > 0) {
        newBoard[otherSide][otherSidePot] = 0;
        newBoard[boardSide][move - 1] = 0;
        newBoard[`${boardSide}Pot`] += otherSidePotAmount + 1;
      }
    }
    boardSide = nextPlayer[boardSide];
    move -= 6;
  } while (number > 0);

  player = changePlayer ? nextPlayer[player] : player;
  return {newBoard, player};
}

function printBoard(board) {
  let lineOne = '  ';
  for (let i = 5; i >= 0; i--) {
    lineOne += board.two[i] + ' ';
  }
  let lineTwo = board.twoPot + ' '.repeat(12) + board.onePot;
  let lineThree = '  ';
  for (let pot of board.one) {
    lineThree += pot + ' ';
  }
  console.log(lineOne);
  console.log(lineTwo);
  console.log(lineThree);
}


function assert(b) {
  if (!b) throw new Error("Assertion failed");
  else console.log("✔");
}



function arrayEq(a1, a2) {
  return a1.length === a2.length && a1.every((a, i) => a2[i] === a);
}


function boardEq(board1, board2) {
  return (
    board1.onePot === board2.onePot &&
    board2.twoPot === board2.twoPot &&
    arrayEq(board1.one, board2.one) &&
    arrayEq(board1.two, board2.two)
  );
}

function getRandomMove(board, player) {
  while (true) {
    const random = Math.floor(Math.random() * 6);
    if (board[player][random] !== 0) return random;
  }
}

const range = n => Array(n).fill(null).map((_, i) => i);

function getMoves(board, player) {
  return range(6).filter(i => board[player][i] !== 0);
}


function score(board, player) {
  return board[`${player}Pot`] - board[`${nextPlayer[player]}Pot`];
}


function finalScore(board, player) {
  const playerHollows = sum(board[player]);
  const otherHollows = sum(board[nextPlayer[player]]);
  return score(board, player) + playerHollows - otherHollows;
}


/**
 * Maximise the minimum score possible by playing a move.
 */
function maxMinMove(board, player, depth, maxForPlayer) {
  // When we can't make any more moves, just calculate the "final score" of the board.
  if (depth === -1 || isGameOver(board, player)) {
    return [null, finalScore(board, maxForPlayer)];
  }

  // Get our list of possible moves and set a default we'll definitely beat.
  const moves = getMoves(board, player);
  const maximise = maxForPlayer === player;
  const worstScore = maximise ? -Infinity : Infinity;
  let bestMove = [moves[0], worstScore];

  for (let move of moves) {
    // Get the next board state with each move.
    const nextState = updateBoard(board, move, player);

    // Get the next min/max score for the board created by this move.
    const [_, score] = maxMinMove(nextState.newBoard, nextState.player, depth - 1, maxForPlayer);

    // If we're maximising, set the new max; if minimising likewise.
    const setNewMax = maximise && score >= bestMove[1];
    const setNewMin = (!maximise) && score <= bestMove[1];
    if (setNewMax || setNewMin) {
      bestMove = [move, score];
    }
  }

  return bestMove;
}


function getAIMove(board, player) {
  return maxMinMove(board, player, aiMoveDepth, player)[0];
}

function isGameOver(board, player) {
  const eqZero = x => x === 0;
  return board[player].every(eqZero);
}

async function game() {
  let player = 'one';
  let gameBoard = copyBoard(initialBoard);
  printBoard(gameBoard);

  while (!isGameOver(gameBoard, player)) {
    let move;
    console.log(`It's player ${player}'s turn`);
    if (player === 'one') {
      move = parseInt(await input("Move (0-5): "), 10);
    } else {
      move = getAIMove(gameBoard, player);
      console.log("AI move:", move);
    }
    const result = updateBoard(gameBoard, move, player);
    gameBoard = result.newBoard;
    player = result.player;
    printBoard(gameBoard);
  }

  console.log("Game over!");

  console.log("Player one: ", gameBoard.onePot + sum(gameBoard.one));
  console.log("Player two: ", gameBoard.twoPot + sum(gameBoard.two));

  process.exit();
}


function testSimpleMoves() {
  const board1 = copyBoard(initialBoard);
  assert(boardEq(board1, initialBoard));
  const board2 = updateBoard(board1, 0, 'one').newBoard;
  assert(boardEq(board2, {
    one: [0, 4, 4, 4, 3, 3],
    two: [3, 3, 3, 3, 3, 3],
    onePot: 0,
    twoPot: 0
  }));
  const board3 = updateBoard(board2, 4, 'one').newBoard;
  assert(boardEq(board3, {
    one: [0, 4, 4, 4, 0, 4],
    two: [4, 3, 3, 3, 3, 3],
    onePot: 1,
    twoPot: 0
  }));

  const board4 = updateBoard(board3, 5, 'two').newBoard;
  assert(boardEq(board4, {
    one: [1, 5, 4, 4, 0, 4],
    two: [4, 3, 3, 3, 3, 0],
    onePot: 1,
    twoPot: 1
  }));
  const board5 = updateBoard(board4, 0, 'two').newBoard;
  assert(boardEq(board5, {
    one: [1, 5, 4, 4, 0, 4],
    two: [0, 4, 4, 4, 4, 0],
    onePot: 1,
    twoPot: 1
  }));

  const board6 = updateBoard(board5, 1, 'two').newBoard;
  assert(boardEq(board6, {
    one: [0, 5, 4, 4, 0, 4],
    two: [0, 0, 5, 5, 5, 0],
    onePot: 1,
    twoPot: 3
  }));
}


function testFinalScore() {
  const board = {
    onePot: 1,
    twoPot: 2,
    one: [0, 0, 10, 11, 0, 0],
    two: [6, 5, 0, 0, 0, 0]
  }
  assert(finalScore(board, 'one') === 9);
  assert(finalScore(board, 'two') === 13-22);
}


function tests() {
  testSimpleMoves();
  testFinalScore();

  const mmBoard1 = copyBoard(initialBoard);
  let move, score;

  // No capture possible at 1 level deep.
  [move, score] = maxMinMove(mmBoard1, 'one', 0, 'one');
  assert(move === 3);
  assert(score === 0);

  // Two levels deep, including a capture.
  [move, score] = maxMinMove(mmBoard1, 'one', 2, 'one');
  assert(move === 3);
  assert(score === 6);

  process.exit();
}


// tests();
game();
