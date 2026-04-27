// Module: NFL Dashboard Builder
// Reads NFL-2025-DFS sheet, calculates ceiling/volatility metrics, writes NFL_Dashboard

function buildNFLDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = ss.getSheetByName('NFL-2025-DFS');
  if (!sourceSheet) throw new Error('NFL-2025-DFS sheet not found');

  const raw     = sourceSheet.getDataRange().getValues();
  const headers = raw[0];
  const rows    = raw.slice(1);

  // Column indices (0-based).
  // Duplicate header names (DRAFTKINGS appears twice, FANDUEL appears twice)
  // require index-based access rather than header lookup.
  // Layout confirmed:
  //   0  BIGDATABALL DATASET
  //   1  GAME-ID
  //   2  DATE
  //   3  WEEK#
  //   4  START TIME (ET)
  //   5  PLAYER-ID
  //   6  PLAYER / DST
  //   7  TEAM
  //   8  OPPONENT
  //   9  VENUE (R/H)
  //  10  DRAFTKINGS  → DK position (QB/RB/WR/TE/DST)
  //  11  FANDUEL     → FD position (ignored)
  //  12  for DRAFTKINGS "Classic" Contests → DK salary
  //  13  for FANDUEL "Full Roster" Contests → FD salary (ignored)
  //  14  DRAFTKINGS  → DK points scored
  //  15  FANDUEL     → FD points scored (ignored)
  const COL_WEEK    = 3;
  const COL_PLAYER  = 6;
  const COL_TEAM    = 7;
  const COL_POS     = 10;
  const COL_SALARY  = 12;
  const COL_POINTS  = 14;

  // Validate we have enough columns
  if (headers.length < 15) {
    throw new Error(`NFL-2025-DFS: expected 16 columns, found ${headers.length}`);
  }

  // Group game performances by player
  const playerMap = {};

  for (const row of rows) {
    const player = String(row[COL_PLAYER] || '').trim();
    const pos    = String(row[COL_POS]    || '').trim().toUpperCase();
    const team   = String(row[COL_TEAM]   || '').trim();
    const week   = Number(row[COL_WEEK])  || 0;
    const salary = parseFloat(row[COL_SALARY]) || 0;
    const points = parseFloat(row[COL_POINTS]);

    if (!player || !pos) continue;
    if (pos === 'D' || pos === 'DST' || pos === 'DEF' || pos === 'D/ST') continue;
    if (salary <= 0 || isNaN(points)) continue;

    if (!playerMap[player]) {
      playerMap[player] = { team, positions: {}, games: [] };
    }
    playerMap[player].positions[pos] = (playerMap[player].positions[pos] || 0) + 1;
    playerMap[player].games.push({ week, salary, points });
  }

  // Calculate metrics per player, skip those with < 4 games
  const results = [];

  for (const [name, pdata] of Object.entries(playerMap)) {
    const games = pdata.games;
    if (games.length < 4) continue;

    // Most frequent position
    const pos = Object.entries(pdata.positions).sort((a, b) => b[1] - a[1])[0][0];

    // Sort chronologically for L6 slice
    games.sort((a, b) => a.week - b.week);

    const n      = games.length;
    const pts    = games.map(g => g.points);
    const maxPts = Math.max(...pts);

    // --- Season ceiling rates ---
    const hit4x = games.filter(g => g.points >= (g.salary * 4) / 1000).length;
    const hit5x = games.filter(g => g.points >= (g.salary * 5) / 1000).length;
    const hit6x = games.filter(g => g.points >= (g.salary * 6) / 1000).length;

    // --- Season CV% ---
    const mean    = pts.reduce((s, p) => s + p, 0) / n;
    const stdDev  = Math.sqrt(pts.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / n);
    const seasonCV = mean > 0 ? (stdDev / mean) * 100 : 0;

    // --- Last 6 games ---
    const l6     = games.slice(-6);
    const l6Pts  = l6.map(g => g.points);
    const l6Hit4x = l6.filter(g => g.points >= (g.salary * 4) / 1000).length;
    const l6Mean  = l6Pts.reduce((s, p) => s + p, 0) / l6Pts.length;
    const l6Std   = Math.sqrt(l6Pts.reduce((s, p) => s + Math.pow(p - l6Mean, 2), 0) / l6Pts.length);
    const l6CV    = l6Mean > 0 ? (l6Std / l6Mean) * 100 : 0;

    // --- 4x Reliable%: games inside streaks of 2+ consecutive 4x hits ---
    const flags = games.map(g => g.points >= (g.salary * 4) / 1000);
    let reliableGames = 0;
    let idx = 0;
    while (idx < flags.length) {
      if (flags[idx]) {
        const start = idx;
        while (idx < flags.length && flags[idx]) idx++;
        if (idx - start >= 2) reliableGames += (idx - start);
      } else {
        idx++;
      }
    }

    results.push({
      player:    name,
      position:  pos,
      team:      pdata.team,
      games:     n,
      dkCeiling: maxPts,
      season4x:  hit4x / n,
      season5x:  hit5x / n,
      season6x:  hit6x / n,
      seasonCV,
      l64x:      l6Hit4x / l6.length,
      l6CV,
      reliable4x: reliableGames / n
    });
  }

  // Sort by position group then Season 4x descending
  const POS_ORDER = { QB: 0, RB: 1, WR: 2, TE: 3 };
  results.sort((a, b) => {
    const pa = POS_ORDER[a.position] ?? 99;
    const pb = POS_ORDER[b.position] ?? 99;
    return pa !== pb ? pa - pb : b.season4x - a.season4x;
  });

  // Position baselines — median ceiling_rate and CV% per position
  const baselines = {};
  for (const pos of ['QB', 'RB', 'WR', 'TE']) {
    const grp = results.filter(r => r.position === pos);
    if (grp.length === 0) continue;
    const mid = Math.floor(grp.length / 2);
    baselines[pos] = {
      ceiling_rate: round1([...grp].sort((a, b) => a.season4x - b.season4x)[mid].season4x * 100),
      volatility:   round1([...grp].sort((a, b) => a.seasonCV - b.seasonCV)[mid].seasonCV)
    };
  }

  // Write NFL_Dashboard sheet
  let dash = ss.getSheetByName('NFL_Dashboard');
  if (dash) {
    dash.clear();
  } else {
    dash = ss.insertSheet('NFL_Dashboard');
  }

  const headerRow = [
    'Player', 'Position', 'Team', 'Games', 'DK Ceiling',
    'Season 4x', 'Season 5x', 'Season 6x', 'Season CV%',
    'L6 4x', 'L6 CV%', '4x Reliable%'
  ];

  const outputRows = results.map(r => [
    r.player,
    r.position,
    r.team,
    r.games,
    round1(r.dkCeiling),
    round1(r.season4x  * 100),
    round1(r.season5x  * 100),
    round1(r.season6x  * 100),
    round1(r.seasonCV),
    round1(r.l64x      * 100),
    round1(r.l6CV),
    round1(r.reliable4x * 100)
  ]);

  dash.getRange(1, 1, 1, headerRow.length).setValues([headerRow]);
  if (outputRows.length > 0) {
    dash.getRange(2, 1, outputRows.length, headerRow.length).setValues(outputRows);
  }

  // Validation log
  const byPos = {};
  for (const pos of ['QB', 'RB', 'WR', 'TE']) {
    byPos[pos] = results.filter(r => r.position === pos).length;
  }
  Logger.log(`NFL_Dashboard created: ${results.length} players`);
  Logger.log(`Position breakdown: QB ${byPos.QB}, RB ${byPos.RB}, WR ${byPos.WR}, TE ${byPos.TE}`);
  Logger.log('Position baselines (ceiling_rate% / CV%):');
  for (const [pos, b] of Object.entries(baselines)) {
    Logger.log(`  ${pos}: ceiling ${b.ceiling_rate}% / volatility ${b.volatility}%`);
  }

  ss.toast(`NFL_Dashboard built: ${results.length} players`, 'Dashboard', 5);
}

function round1(n) {
  return Math.round(n * 10) / 10;
}
