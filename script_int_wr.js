// ======= 4×4 Food–Country Memory Game =======
window.addEventListener('DOMContentLoaded', () => {
  // ---------- Settings ----------
  const maxPlays = 2;
  const completionCode = '1289';

  const responseId =
    new URLSearchParams(window.location.search).get('responseId') || '';

  // ---------- Game state ----------
  let playCount = 0;
  let studentId = '';
  let flippedCards = [];
  let matchedPairs = 0;
  let moves = 0;
  let LOGS = [];
  let gameActive = false;
  let resolving = false;

  // ---------- DOM elements ----------
  const statusEl = document.getElementById('status');
  const uidPill = document.getElementById('uid-pill');
  const movesEl = document.getElementById('moves');
  const bar = document.getElementById('bar');
  const start = document.getElementById('start');
  const boardWrap = document.getElementById('board-wrap');
  const board = document.getElementById('game-board');
  const beginBtn = document.getElementById('begin');
  const idInput = document.getElementById('studentId');
  const summary = document.getElementById('summary');
  const end = document.getElementById('end');
  const playAgainBtn = document.getElementById('playAgain');
  const downloadBtn = document.getElementById('downloadBtn');
  const roundPill = document.getElementById('round-pill');

  // ---------- Food–country pairs ----------
  const PAIRS = [
    { food: 'img1.png', country: 'img9.png' },
    { food: 'img2.png', country: 'img10.png' },
    { food: 'img3.png', country: 'img11.png' },
    { food: 'img4.png', country: 'img12.png' },
    { food: 'img5.png', country: 'img13.png' },
    { food: 'img6.png', country: 'img14.png' },
    { food: 'img7.png', country: 'img15.png' },
    { food: 'img8.png', country: 'img16.png' }
  ];

  // ---------- Helpers ----------
  const nowISO = () => new Date().toISOString();

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function safeFilenamePart(value) {
    return String(value).replace(/[^a-zA-Z0-9_-]/g, '');
  }

  function memphisFilenameTime(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(date);

    const values = {};

    parts.forEach(part => {
      if (part.type !== 'literal') {
        values[part.type] = part.value;
      }
    });

    return [
      values.year,
      values.month,
      values.day,
      values.hour,
      values.minute,
      values.second
    ].join('-');
  }

  // ---------- Reset current round ----------
  function resetState() {
    flippedCards = [];
    matchedPairs = 0;
    moves = 0;
    LOGS = [];
    resolving = false;
    gameActive = false;

    if (statusEl) {
      statusEl.textContent = 'Find all eight food–country pairs.';
    }

    if (movesEl) movesEl.textContent = 'Moves: 0';
    if (bar) bar.style.width = '0%';
    if (downloadBtn) downloadBtn.disabled = true;
  }

  // ---------- CSV download ----------
  function downloadCSV() {
    if (!LOGS.length) {
      alert('No activity has been recorded for download yet.');
      return;
    }

    const headers = [
      'student_id',
      'response_id',
      'round',
      'move_index',
      'card1_id',
      'card1_value',
      'card2_id',
      'card2_value',
      'match',
      'timestamp_iso'
    ];

    const escapeCSV = value =>
      '"' +
      String(value == null ? '' : value).replaceAll('"', '""') +
      '"';

    const lines = [
      headers.join(','),
      ...LOGS.map(row =>
        headers.map(header => escapeCSV(row[header])).join(',')
      )
    ];

    const blob = new Blob(
      ['\uFEFF' + lines.join('\n')],
      { type: 'text/csv;charset=utf-8;' }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const filenameStudentId =
      safeFilenamePart(studentId) || 'unknown';

    const filenameResponseId =
      safeFilenamePart(responseId) || 'noResponseID';

    const roundNumber = LOGS[0].round;

    link.href = url;
    link.download =
      `memory_log_int_wr_${filenameStudentId}_` +
      `${filenameResponseId}_round${roundNumber}_` +
      `${memphisFilenameTime()}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ---------- Resolve two revealed cards ----------
  function handleResolve() {
    if (!gameActive || flippedCards.length !== 2) return;

    const [card1, card2] = flippedCards;

    const isMatch =
      card1.dataset.match === card2.dataset.match;

    moves++;

    if (movesEl) {
      movesEl.textContent = `Moves: ${moves}`;
    }

    LOGS.push({
      student_id: studentId,
      response_id: responseId,
      round: playCount + 1,
      move_index: moves,
      card1_id: card1.id,
      card1_value: card1.dataset.image,
      card2_id: card2.id,
      card2_value: card2.dataset.image,
      match: isMatch ? 'TRUE' : 'FALSE',
      timestamp_iso: nowISO()
    });

    if (isMatch) {
      // Keep the cards exactly as they appear when revealed.
      // Do not add the CSS class "matched".
      card1.dataset.matched = 'true';
      card2.dataset.matched = 'true';

      // Their "flipped" class and background images remain unchanged.
      matchedPairs++;

      if (bar) {
        bar.style.width =
          `${(matchedPairs / PAIRS.length) * 100}%`;
      }

      flippedCards = [];
      resolving = false;

      if (matchedPairs === PAIRS.length) {
        finishGame();
      }
    } else {
      // Only incorrect pairs return face down.
      setTimeout(() => {
        [card1, card2].forEach(card => {
          card.classList.remove('flipped');
          card.style.backgroundImage = "url('images/back.png')";
        });

        flippedCards = [];
        resolving = false;
      }, 800);
    }
  }

  // ---------- Card clicks ----------
  function onCardClick(card) {
    if (!gameActive || resolving) return;

    // Matched cards remain face up and cannot be selected again.
    if (card.dataset.matched === 'true') return;

    if (card.classList.contains('flipped')) return;

    card.classList.add('flipped');
    card.style.backgroundImage =
      `url('images/${card.dataset.image}')`;

    flippedCards.push(card);

    if (flippedCards.length === 2) {
      resolving = true;
      setTimeout(handleResolve, 550);
    }
  }

  // ---------- Create 16 shuffled cards ----------
  function setupBoard() {
    const configs = [];

    PAIRS.forEach((pair, index) => {
      configs.push({ image: pair.food, match: index });
      configs.push({ image: pair.country, match: index });
    });

    shuffle(configs);
    board.innerHTML = '';

    configs.forEach((config, index) => {
      const card = document.createElement('div');

      card.className = 'card';
      card.id = `card${index + 1}`;
      card.dataset.image = config.image;
      card.dataset.match = String(config.match);
      card.dataset.matched = 'false';
      card.style.backgroundImage = "url('images/back.png')";

      card.addEventListener('click', () => onCardClick(card));

      board.appendChild(card);
    });
  }

  // ---------- Start a round ----------
  function startRound() {
    if (gameActive || playCount >= maxPlays) return;

    if (!board || !boardWrap) {
      alert('The game board was not found. Please check the HTML file.');
      return;
    }

    resetState();
    setupBoard();

    if (start) start.style.display = 'none';
    if (end) end.style.display = 'none';

    boardWrap.style.display = 'block';

    if (roundPill) {
      roundPill.textContent =
        `Round: ${playCount + 1} of ${maxPlays}`;
    }

    if (playAgainBtn) {
      playAgainBtn.disabled = true;
    }

    gameActive = true;
  }

  // ---------- Finish a round ----------
  function finishGame() {
    gameActive = false;
    resolving = false;

    const completedRound = playCount + 1;
    playCount++;

    // Keep the completed board visible with all cards face up.
    if (end) end.style.display = 'block';

    if (downloadBtn) downloadBtn.disabled = false;

    if (playCount < maxPlays) {
      if (summary) {
        summary.textContent =
          `You completed round ${completedRound} in ${moves} moves. ` +
          'Please start the second round to complete this stage.';
      }

      if (statusEl) {
        statusEl.textContent = 'Round one completed.';
      }

      if (roundPill) {
        roundPill.textContent =
          `Round: ${completedRound} completed`;
      }

      if (playAgainBtn) {
        playAgainBtn.style.display = 'inline-block';
        playAgainBtn.disabled = false;
        playAgainBtn.textContent = 'Start Second Round';
      }
    } else {
      const completionMessage =
        `You completed the final round in ${moves} moves. ` +
        `This stage is complete. Your completion code is ${completionCode}. ` +
        'Return to the Qualtrics survey and enter this code to continue.';

      if (summary) {
        summary.textContent = completionMessage;
      }

      if (statusEl) {
        statusEl.textContent =
          `Stage completed. Completion code: ${completionCode}`;
      }

      if (roundPill) {
        roundPill.textContent = 'Round: Game Over';
      }

      if (playAgainBtn) {
        playAgainBtn.disabled = true;
        playAgainBtn.style.display = 'none';
      }

      if (beginBtn) {
        beginBtn.disabled = true;
      }
    }

    downloadCSV();
  }

  // ---------- Begin button ----------
  if (beginBtn) {
    beginBtn.addEventListener('click', () => {
      if (gameActive || playCount > 0) return;

      if (!idInput) {
        alert('Student ID was not found.');
        return;
      }

      const id = idInput.value.trim();

      if (!id) {
        idInput.focus();
        idInput.placeholder = 'Student ID is required';
        return;
      }

      studentId = id;

      if (uidPill) {
        uidPill.textContent = `ID: ${studentId}`;
      }

      startRound();
    });
  }

  // ---------- Second-round button ----------
  if (playAgainBtn) {
    playAgainBtn.addEventListener('click', () => {
      if (gameActive || playCount !== 1) return;
      startRound();
    });
  }

  // ---------- Manual download ----------
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      if (matchedPairs < PAIRS.length) {
        alert('Complete all eight pairs before downloading.');
        return;
      }

      downloadCSV();
    });
  }

  // ---------- Initial setup ----------
  resetState();

  if (end) end.style.display = 'none';
  if (boardWrap) boardWrap.style.display = 'none';
});
