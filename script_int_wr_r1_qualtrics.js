// ======= 6×6 Food–Country Memory Game =======
window.addEventListener('DOMContentLoaded', () => {
  // ---------- Settings ----------
  const maxPlays = 1;
  const completionCode = '3454';

  const responseId =
    new URLSearchParams(window.location.search).get('responseId') || '';

  // ---------- Food–country pairs ----------
  const PAIRS = [
    // Original eight pairs: unchanged.
    { food: 'img1.png', country: 'img9.png' },
    { food: 'img2.png', country: 'img10.png' },
    { food: 'img3.png', country: 'img11.png' },
    { food: 'img4.png', country: 'img12.png' },
    { food: 'img5.png', country: 'img13.png' },
    { food: 'img6.png', country: 'img14.png' },
    { food: 'img7.png', country: 'img15.png' },
    { food: 'img8.png', country: 'img16.png' },

    // Ten new pairs.
    { food: 'img17.png', country: 'img27.png' },
    { food: 'img18.png', country: 'img28.png' },
    { food: 'img19.png', country: 'img29.png' },
    { food: 'img20.png', country: 'img30.png' },
    { food: 'img21.png', country: 'img31.png' },
    { food: 'img22.png', country: 'img32.png' },
    { food: 'img23.png', country: 'img33.png' },
    { food: 'img24.png', country: 'img34.png' },
    { food: 'img25.png', country: 'img35.png' },
    { food: 'img26.png', country: 'img36.png' }
  ];

  const totalPairs = PAIRS.length;
  const totalCards = totalPairs * 2;

  // ---------- Game state ----------
  let playCount = 0;
  let studentId = '';
  let flippedCards = [];
  let matchedPairs = 0;
  let moves = 0;
  let LOGS = [];
  let gameActive = false;
  let resolving = false;

  // ---------- Qualtrics connection ----------
  const sessionLogs = [];
  let startedAt = '';
  let completedAt = '';
  let bridgeOrigin = '';
  let bridgeToken = '';
  let revision = 0;

  // Separate completed games from the previous 4×4 version.
  const storageKey = responseId
    ? 'memory:int_wr_r1:6x6:' + responseId
    : '';

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

  // Set six columns. Other card styling remains in the CSS file.
  if (board) {
    board.style.display = 'grid';
    board.style.gridTemplateColumns = 'repeat(6, minmax(0, 1fr))';
  }

  // Only one play is permitted.
  if (playAgainBtn) {
    playAgainBtn.disabled = true;
    playAgainBtn.style.display = 'none';
  }

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

  // ---------- Save completed game ----------
  function saveCompletedGame() {
    if (!storageKey || !board || playCount !== maxPlays) return;

    const saved = {
      schemaVersion: 1,
      responseId,
      studentId,
      startedAt,
      completedAt,
      moves,
      logs: sessionLogs,
      cards: Array.from(board.children).map(card => ({
        id: card.id,
        image: card.dataset.image,
        match: card.dataset.match
      }))
    };

    try {
      window.sessionStorage.setItem(
        storageKey,
        JSON.stringify(saved)
      );
    } catch (error) {
      const feedback = document.getElementById('bridge-status');

      if (feedback) {
        feedback.textContent =
          'Please keep this page open. The browser could not preserve your completed game after a page reload.';
      }
    }
  }

  // ---------- Restore completed game ----------
  function restoreCompletedGame() {
    if (!storageKey || !board || !boardWrap) return false;

    let saved;

    try {
      saved = JSON.parse(
        window.sessionStorage.getItem(storageKey)
      );
    } catch (error) {
      return false;
    }

    if (
      !saved ||
      saved.schemaVersion !== 1 ||
      saved.responseId !== responseId ||
      !Array.isArray(saved.cards) ||
      saved.cards.length !== totalCards ||
      !Array.isArray(saved.logs) ||
      !Number.isInteger(saved.moves) ||
      saved.moves < totalPairs ||
      saved.moves !== saved.logs.length ||
      !saved.startedAt ||
      !saved.completedAt
    ) return false;

    const expectedImages = PAIRS.flatMap(pair => [
      pair.food,
      pair.country
    ]);

    if (
      !saved.cards.every(card =>
        card &&
        typeof card.id === 'string' &&
        typeof card.image === 'string' &&
        Number.isInteger(Number(card.match))
      )
    ) return false;

    const images = saved.cards.map(card => card.image);

    if (
      new Set(images).size !== totalCards ||
      !expectedImages.every(image => images.includes(image)) ||
      !saved.cards.every(card => {
        const pair = PAIRS[Number(card.match)];

        return pair && (
          pair.food === card.image ||
          pair.country === card.image
        );
      })
    ) return false;

    studentId = saved.studentId;
    startedAt = saved.startedAt;
    completedAt = saved.completedAt;
    moves = saved.moves;
    LOGS = saved.logs;
    sessionLogs.push(...saved.logs);

    matchedPairs = totalPairs;
    flippedCards = [];

    board.innerHTML = '';

    saved.cards.forEach(config => {
      const card = document.createElement('div');

      card.className = 'card flipped';
      card.id = config.id;
      card.dataset.image = config.image;
      card.dataset.match = config.match;
      card.dataset.matched = 'true';
      card.style.backgroundImage =
        `url('images/${config.image}')`;

      board.appendChild(card);
    });

    if (uidPill) {
      uidPill.textContent = `ID: ${studentId}`;
    }

    if (movesEl) {
      movesEl.textContent = `Moves: ${moves}`;
    }

    if (start) {
      start.style.display = 'none';
    }

    if (bar) {
      bar.style.width = '100%';
    }

    boardWrap.style.display = 'block';

    // Restore the completion display and resend the saved results.
    finishGame();

    return true;
  }

  // ---------- Send data to Qualtrics ----------
  function sendSnapshot() {
    if (!bridgeOrigin || !bridgeToken) return;

    window.parent.postMessage({
      type: 'MEMORY_DATA',
      token: bridgeToken,
      revision,
      payload: {
        schemaVersion: 1,
        responseId,
        studentId,
        condition: 'int_wr',
        round: 1,
        startedAt,
        completedAt,
        completed: playCount === maxPlays,
        completedRounds: playCount,
        maxPlays,
        moves: sessionLogs.length,
        currentRoundMoves: moves,
        matchedPairs,
        logs: sessionLogs.slice()
      }
    }, bridgeOrigin);
  }

  // ---------- Receive messages from Qualtrics ----------
  window.addEventListener('message', event => {
    const message = event.data;

    if (
      window.parent === window ||
      event.source !== window.parent ||
      !message
    ) return;

    if (message.type === 'MEMORY_INIT') {
      if (
        event.origin !== 'https://memphis.co1.qualtrics.com' ||
        typeof message.token !== 'string' ||
        message.token.length < 16 ||
        message.responseId !== responseId
      ) return;

      bridgeOrigin = event.origin;
      bridgeToken = message.token;
      sendSnapshot();
    } else if (
      event.origin === bridgeOrigin &&
      message.token === bridgeToken
    ) {
      const feedback = document.getElementById('bridge-status');

      if (
        message.type === 'MEMORY_ACK' &&
        message.revision === revision &&
        playCount === maxPlays &&
        feedback
      ) {
        feedback.textContent =
          'Results received by the survey page. Click Next below to submit your results.';
      } else if (
        message.type === 'MEMORY_ERROR' &&
        feedback
      ) {
        feedback.textContent =
          'The survey could not accept the data. Keep this page open and contact the researcher.';
      }
    }
  });

  const bridgeTimer = setInterval(sendSnapshot, 2000);

  window.addEventListener('pagehide', () => {
    clearInterval(bridgeTimer);
  });

  // ---------- Reset current round ----------
  function resetState() {
    flippedCards = [];
    matchedPairs = 0;
    moves = 0;
    LOGS = [];
    resolving = false;
    gameActive = false;

    if (statusEl) {
      statusEl.textContent =
        `Find all ${totalPairs} food–country pairs.`;
    }

    if (movesEl) {
      movesEl.textContent = 'Moves: 0';
    }

    if (bar) {
      bar.style.width = '0%';
    }

    if (downloadBtn) {
      downloadBtn.disabled = true;
    }
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
      `memory_log_int_wr_r1_${filenameStudentId}_` +
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

    sessionLogs.push(LOGS[LOGS.length - 1]);

    if (isMatch) {
      card1.dataset.matched = 'true';
      card2.dataset.matched = 'true';

      matchedPairs++;

      if (bar) {
        bar.style.width =
          `${(matchedPairs / totalPairs) * 100}%`;
      }

      flippedCards = [];
      resolving = false;

      if (matchedPairs === totalPairs) {
        finishGame();
      }
    } else {
      setTimeout(() => {
        [card1, card2].forEach(card => {
          card.classList.remove('flipped');
          card.style.backgroundImage = "url('images/back.png')";
        });

        flippedCards = [];
        resolving = false;
      }, 800);
    }

    revision++;
    sendSnapshot();
  }

  // ---------- Card clicks ----------
  function onCardClick(card) {
    if (!gameActive || resolving) return;
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

  // ---------- Create 36 shuffled cards ----------
  function setupBoard() {
    const configs = [];

    PAIRS.forEach((pair, index) => {
      configs.push({
        image: pair.food,
        match: index
      });

      configs.push({
        image: pair.country,
        match: index
      });
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

      card.addEventListener('click', () => {
        onCardClick(card);
      });

      board.appendChild(card);
    });
  }

  // ---------- Start a round ----------
  function startRound() {
    if (gameActive || playCount >= maxPlays) return;

    if (!board || !boardWrap) {
      alert(
        'The game board was not found. Please check the HTML file.'
      );
      return;
    }

    resetState();
    setupBoard();

    if (start) {
      start.style.display = 'none';
    }

    if (end) {
      end.style.display = 'none';
    }

    boardWrap.style.display = 'block';

    if (roundPill) {
      roundPill.textContent =
        `Round: ${playCount + 1} of ${maxPlays}`;
    }

    if (playAgainBtn) {
      playAgainBtn.disabled = true;
      playAgainBtn.style.display = 'none';
    }

    gameActive = true;

    if (!startedAt) {
      startedAt = nowISO();
    }

    revision++;
    sendSnapshot();
  }

  // ---------- Finish the game ----------
  function finishGame() {
    // Prevent a duplicate completion from increasing playCount.
    if (playCount >= maxPlays) return;

    gameActive = false;
    resolving = false;
    playCount = maxPlays;

    if (!completedAt) {
      completedAt = nowISO();
    }

    if (end) {
      end.style.display = 'block';
    }

    if (downloadBtn) {
      downloadBtn.disabled = false;
    }

    const completionMessage =
      `You completed the final round in ${moves} moves. ` +
      `This stage is complete. Your completion code is ${completionCode}. ` +
      'Enter this code in the survey box below, then click Next to continue.';

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

    saveCompletedGame();

    revision++;
    sendSnapshot();
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

  // ---------- Manual download ----------
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      if (matchedPairs < totalPairs) {
        alert(
          `Complete all ${totalPairs} pairs before downloading.`
        );
        return;
      }

      downloadCSV();
    });
  }

  // ---------- Initial setup ----------
  resetState();

  if (end) {
    end.style.display = 'none';
  }

  if (boardWrap) {
    boardWrap.style.display = 'none';
  }

  restoreCompletedGame();
});
