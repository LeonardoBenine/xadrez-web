const PIECE_GLYPHS = {
  white: {
    king: "\u2654",
    queen: "\u2655",
    rook: "\u2656",
    bishop: "\u2657",
    knight: "\u2658",
    pawn: "\u2659"
  },
  black: {
    king: "\u265A",
    queen: "\u265B",
    rook: "\u265C",
    bishop: "\u265D",
    knight: "\u265E",
    pawn: "\u265F"
  }
};

const boardElement = document.getElementById("board");
const turnLabel = document.getElementById("turn-label");
const statusMessage = document.getElementById("status-message");
const resetButton = document.getElementById("reset-button");
const undoButton = document.getElementById("undo-button");
const capturedBlackElement = document.getElementById("captured-black");
const capturedWhiteElement = document.getElementById("captured-white");

let boardState = [];
let currentTurn = "white";
let selectedSquare = null;
let validMoves = [];
let capturedPieces = { white: [], black: [] };
let moveHistory = [];
let lastMove = null;
let pendingAnimation = null;

function createInitialBoard() {
  return [
    [
      createPiece("black", "rook"),
      createPiece("black", "knight"),
      createPiece("black", "bishop"),
      createPiece("black", "queen"),
      createPiece("black", "king"),
      createPiece("black", "bishop"),
      createPiece("black", "knight"),
      createPiece("black", "rook")
    ],
    Array.from({ length: 8 }, () => createPiece("black", "pawn")),
    Array(8).fill(null),
    Array(8).fill(null),
    Array(8).fill(null),
    Array(8).fill(null),
    Array.from({ length: 8 }, () => createPiece("white", "pawn")),
    [
      createPiece("white", "rook"),
      createPiece("white", "knight"),
      createPiece("white", "bishop"),
      createPiece("white", "queen"),
      createPiece("white", "king"),
      createPiece("white", "bishop"),
      createPiece("white", "knight"),
      createPiece("white", "rook")
    ]
  ];
}

function createPiece(color, type) {
  return { color, type };
}

function cloneBoard(board) {
  return board.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
}

function cloneCaptured(captures) {
  return {
    white: captures.white.map((piece) => ({ ...piece })),
    black: captures.black.map((piece) => ({ ...piece }))
  };
}

function setStatus(message) {
  statusMessage.textContent = message;
}

function resetGame() {
  boardState = createInitialBoard();
  currentTurn = "white";
  selectedSquare = null;
  validMoves = [];
  capturedPieces = { white: [], black: [] };
  moveHistory = [];
  lastMove = null;
  pendingAnimation = null;
  setStatus("Selecione uma peca para comecar.");
  renderBoard();
}

function saveHistorySnapshot() {
  moveHistory.push({
    boardState: cloneBoard(boardState),
    currentTurn,
    selectedSquare: selectedSquare ? { ...selectedSquare } : null,
    validMoves: validMoves.map((move) => ({ ...move })),
    capturedPieces: cloneCaptured(capturedPieces),
    lastMove: lastMove
      ? {
          from: { ...lastMove.from },
          to: { ...lastMove.to },
          piece: { ...lastMove.piece },
          captured: lastMove.captured ? { ...lastMove.captured } : null
        }
      : null
  });
}

function undoMove() {
  const snapshot = moveHistory.pop();

  if (!snapshot) {
    setStatus("Nao ha lance para desfazer.");
    return;
  }

  boardState = snapshot.boardState;
  currentTurn = snapshot.currentTurn;
  selectedSquare = snapshot.selectedSquare;
  validMoves = snapshot.validMoves;
  capturedPieces = snapshot.capturedPieces;
  lastMove = snapshot.lastMove;
  setStatus("Ultimo lance desfeito.");
  renderBoard();
}

function renderBoard() {
  boardElement.innerHTML = "";
  turnLabel.textContent = `Vez das ${currentTurn === "white" ? "brancas" : "pretas"}`;
  undoButton.disabled = moveHistory.length === 0;

  const boardWidth = boardElement.clientWidth || 640;
  const squareSize = boardWidth / 8;

  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const square = document.createElement("button");
      const piece = boardState[row][col];
      const isLight = (row + col) % 2 === 0;
      const isSelected = selectedSquare && selectedSquare.row === row && selectedSquare.col === col;
      const move = validMoves.find((candidate) => candidate.row === row && candidate.col === col);
      const isLastFrom = lastMove && lastMove.from.row === row && lastMove.from.col === col;
      const isLastTo = lastMove && lastMove.to.row === row && lastMove.to.col === col;

      square.type = "button";
      square.className = `square ${isLight ? "light" : "dark"}`;
      square.dataset.row = String(row);
      square.dataset.col = String(col);
      square.setAttribute("aria-label", `Casa ${toBoardLabel(row, col)}`);

      if (isSelected) square.classList.add("selected");
      if (isLastFrom) square.classList.add("last-from");
      if (isLastTo) square.classList.add("last-to");
      if (move) square.classList.add(move.capture ? "capture-move" : "valid-move");

      const label = document.createElement("span");
      label.className = "square-label";
      label.textContent = toBoardLabel(row, col);
      square.appendChild(label);

      if (piece) {
        const pieceElement = createPieceSvg(piece.color, piece.type);

        if (pendingAnimation && pendingAnimation.to.row === row && pendingAnimation.to.col === col) {
          const rowDelta = pendingAnimation.from.row - pendingAnimation.to.row;
          const colDelta = pendingAnimation.from.col - pendingAnimation.to.col;
          pieceElement.classList.add("piece-moving");
          pieceElement.style.setProperty("--move-start-x", `${colDelta * squareSize}px`);
          pieceElement.style.setProperty("--move-start-y", `${rowDelta * squareSize}px`);
        } else {
          pieceElement.classList.add("piece-pop");
        }

        square.appendChild(pieceElement);
      }

      square.addEventListener("click", () => handleSquareClick(row, col));
      boardElement.appendChild(square);
    }
  }

  renderCapturedPieces();
  pendingAnimation = null;
}

function renderCapturedPieces() {
  capturedBlackElement.innerHTML = "";
  capturedWhiteElement.innerHTML = "";

  for (const piece of capturedPieces.black) {
    capturedBlackElement.appendChild(createPieceSvg("black", piece.type));
  }

  for (const piece of capturedPieces.white) {
    capturedWhiteElement.appendChild(createPieceSvg("white", piece.type));
  }
}

function createPieceSvg(color, type) {
  const svgNamespace = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNamespace, "svg");
  const baseCircle = document.createElementNS(svgNamespace, "circle");
  const ringCircle = document.createElementNS(svgNamespace, "circle");
  const text = document.createElementNS(svgNamespace, "text");
  const isWhite = color === "white";

  svg.classList.add("piece-svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("aria-hidden", "true");

  baseCircle.setAttribute("cx", "50");
  baseCircle.setAttribute("cy", "50");
  baseCircle.setAttribute("r", "39");
  baseCircle.setAttribute("fill", isWhite ? "#f7f4ef" : "#2f221a");

  ringCircle.setAttribute("cx", "50");
  ringCircle.setAttribute("cy", "50");
  ringCircle.setAttribute("r", "39");
  ringCircle.setAttribute("fill", "none");
  ringCircle.setAttribute("stroke", isWhite ? "#d7c7ae" : "#b88d6d");
  ringCircle.setAttribute("stroke-width", "4");

  text.setAttribute("x", "50");
  text.setAttribute("y", "60");
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("font-size", type === "pawn" ? "48" : "44");
  text.setAttribute("fill", isWhite ? "#2f221a" : "#f1e7d8");
  text.textContent = PIECE_GLYPHS[color][type];

  svg.append(baseCircle, ringCircle, text);
  return svg;
}

function handleSquareClick(row, col) {
  const piece = boardState[row][col];
  const chosenMove = validMoves.find((move) => move.row === row && move.col === col);

  if (selectedSquare && chosenMove) {
    makeMove(selectedSquare, chosenMove);
    return;
  }

  if (piece && piece.color === currentTurn) {
    selectedSquare = { row, col };
    validMoves = getValidMoves(row, col);
    setStatus(`${pieceName(piece)} selecionada em ${toBoardLabel(row, col)}.`);
  } else if (piece && piece.color !== currentTurn) {
    selectedSquare = null;
    validMoves = [];
    setStatus("Essa peca e do outro jogador.");
  } else {
    selectedSquare = null;
    validMoves = [];
    setStatus("Selecione uma peca da sua cor.");
  }

  renderBoard();
}

function makeMove(from, to) {
  saveHistorySnapshot();

  const movingPiece = boardState[from.row][from.col];
  const capturedPiece = boardState[to.row][to.col];

  boardState[to.row][to.col] = movingPiece;
  boardState[from.row][from.col] = null;

  if (capturedPiece) {
    capturedPieces[capturedPiece.color].push(capturedPiece);
  }

  let finalPiece = boardState[to.row][to.col];
  if (movingPiece.type === "pawn" && (to.row === 0 || to.row === 7)) {
    finalPiece = createPiece(movingPiece.color, "queen");
    boardState[to.row][to.col] = finalPiece;
  }

  lastMove = {
    from: { ...from },
    to: { row: to.row, col: to.col },
    piece: { ...finalPiece },
    captured: capturedPiece ? { ...capturedPiece } : null
  };
  pendingAnimation = { from: { ...from }, to: { row: to.row, col: to.col } };

  if (movingPiece.type === "pawn" && (to.row === 0 || to.row === 7)) {
    setStatus(`Peao promovido para rainha em ${toBoardLabel(to.row, to.col)}.`);
  } else if (capturedPiece) {
    setStatus(`${pieceName(movingPiece)} capturou ${pieceName(capturedPiece)} em ${toBoardLabel(to.row, to.col)}.`);
  } else {
    setStatus(`${pieceName(movingPiece)} foi para ${toBoardLabel(to.row, to.col)}.`);
  }

  selectedSquare = null;
  validMoves = [];
  currentTurn = currentTurn === "white" ? "black" : "white";
  renderBoard();
}

function getValidMoves(row, col) {
  const piece = boardState[row][col];
  if (!piece) return [];

  switch (piece.type) {
    case "pawn":
      return getPawnMoves(row, col, piece.color);
    case "rook":
      return getSlidingMoves(row, col, piece.color, [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
      ]);
    case "bishop":
      return getSlidingMoves(row, col, piece.color, [
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1]
      ]);
    case "queen":
      return getSlidingMoves(row, col, piece.color, [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1]
      ]);
    case "king":
      return getKingMoves(row, col, piece.color);
    case "knight":
      return getKnightMoves(row, col, piece.color);
    default:
      return [];
  }
}

function getPawnMoves(row, col, color) {
  const moves = [];
  const direction = color === "white" ? -1 : 1;
  const startRow = color === "white" ? 6 : 1;
  const oneStepRow = row + direction;

  if (isInsideBoard(oneStepRow, col) && !boardState[oneStepRow][col]) {
    moves.push({ row: oneStepRow, col, capture: false });
    const twoStepRow = row + direction * 2;
    if (row === startRow && !boardState[twoStepRow][col]) {
      moves.push({ row: twoStepRow, col, capture: false });
    }
  }

  for (const deltaCol of [-1, 1]) {
    const targetRow = row + direction;
    const targetCol = col + deltaCol;
    if (!isInsideBoard(targetRow, targetCol)) continue;

    const targetPiece = boardState[targetRow][targetCol];
    if (targetPiece && targetPiece.color !== color) {
      moves.push({ row: targetRow, col: targetCol, capture: true });
    }
  }

  return moves;
}

function getSlidingMoves(row, col, color, directions) {
  const moves = [];

  for (const [deltaRow, deltaCol] of directions) {
    let currentRow = row + deltaRow;
    let currentCol = col + deltaCol;

    while (isInsideBoard(currentRow, currentCol)) {
      const targetPiece = boardState[currentRow][currentCol];

      if (!targetPiece) {
        moves.push({ row: currentRow, col: currentCol, capture: false });
      } else {
        if (targetPiece.color !== color) {
          moves.push({ row: currentRow, col: currentCol, capture: true });
        }
        break;
      }

      currentRow += deltaRow;
      currentCol += deltaCol;
    }
  }

  return moves;
}

function getKnightMoves(row, col, color) {
  const moves = [];
  const jumps = [
    [-2, -1],
    [-2, 1],
    [-1, -2],
    [-1, 2],
    [1, -2],
    [1, 2],
    [2, -1],
    [2, 1]
  ];

  for (const [deltaRow, deltaCol] of jumps) {
    const targetRow = row + deltaRow;
    const targetCol = col + deltaCol;
    if (!isInsideBoard(targetRow, targetCol)) continue;

    const targetPiece = boardState[targetRow][targetCol];
    if (!targetPiece) {
      moves.push({ row: targetRow, col: targetCol, capture: false });
    } else if (targetPiece.color !== color) {
      moves.push({ row: targetRow, col: targetCol, capture: true });
    }
  }

  return moves;
}

function getKingMoves(row, col, color) {
  const moves = [];

  for (let deltaRow = -1; deltaRow <= 1; deltaRow += 1) {
    for (let deltaCol = -1; deltaCol <= 1; deltaCol += 1) {
      if (deltaRow === 0 && deltaCol === 0) continue;
      const targetRow = row + deltaRow;
      const targetCol = col + deltaCol;
      if (!isInsideBoard(targetRow, targetCol)) continue;

      const targetPiece = boardState[targetRow][targetCol];
      if (!targetPiece) {
        moves.push({ row: targetRow, col: targetCol, capture: false });
      } else if (targetPiece.color !== color) {
        moves.push({ row: targetRow, col: targetCol, capture: true });
      }
    }
  }

  return moves;
}

function isInsideBoard(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function toBoardLabel(row, col) {
  const file = "abcdefgh"[col];
  const rank = 8 - row;
  return `${file}${rank}`;
}

function pieceName(piece) {
  const names = {
    king: "Rei",
    queen: "Rainha",
    rook: "Torre",
    bishop: "Bispo",
    knight: "Cavalo",
    pawn: "Peao"
  };
  return names[piece.type];
}

resetButton.addEventListener("click", resetGame);
undoButton.addEventListener("click", undoMove);

window.addEventListener("resize", renderBoard);

resetGame();
