// MODULE 7: BEST BALL DRAFT VALUE ANALYZER
// Task 1A: Data Access and Validation

function getScheduleData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Schedule_Enriched");

  if (!sheet) {
    throw new Error("Schedule_Enriched sheet not found. Run Module 6 first.");
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);

  return rows.map(row => {
    const game = {};
    headers.forEach((header, i) => {
      game[header] = row[i];
    });
    return game;
  });
}

function getADPData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Best_Ball_ADP");

  if (!sheet) {
    throw new Error("Best_Ball_ADP sheet not found. Please import ADP data.");
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);

  // Normalize raw headers to internal field names
  const headerMap = {
    'Player': 'player_name',
    'Team':   'team',
    'POS':    'position',
    'AVG':    'adp',
    'Rank':   'rank',
    'Bye':    'bye',
    'BB10':        'bb10',
    'RTSports':    'rtsports',
    'Underdog':    'underdog',
    'Drafters':    'drafters',
    'DraftKings':  'draftkings'
  };

  return rows.map(row => {
    const player = {};
    headers.forEach((header, i) => {
      const key = headerMap[header] || header;
      player[key] = row[i];
    });
    return player;
  }).filter(p => p.player_name && p.adp);
}

function validateModuleData() {
  const scheduleData = getScheduleData();
  const adpData = getADPData();

  if (scheduleData.length !== 272) {
    throw new Error(`Expected 272 games, found ${scheduleData.length}`);
  }

  const requiredColumns = ['qb_grade', 'rb_grade', 'wr_grade', 'te_grade'];
  const firstGame = scheduleData[0];

  requiredColumns.forEach(col => {
    if (!(col in firstGame)) {
      throw new Error(`Missing required column: ${col}`);
    }
  });

  if (adpData.length === 0) {
    throw new Error("Best_Ball_ADP sheet has no valid data. Please import ADP data (player_name, team, position, adp columns required).");
  }

  const requiredADPColumns = ['player_name', 'team', 'position', 'adp'];
  const firstPlayer = adpData[0];

  requiredADPColumns.forEach(col => {
    if (!(col in firstPlayer)) {
      throw new Error(`Missing required ADP column: ${col}`);
    }
  });

  const positionCounts = {
    QB: adpData.filter(p => p.position && p.position.startsWith('QB')).length,
    RB: adpData.filter(p => p.position && p.position.startsWith('RB')).length,
    WR: adpData.filter(p => p.position && p.position.startsWith('WR')).length,
    TE: adpData.filter(p => p.position && p.position.startsWith('TE')).length
  };

  Logger.log("Data validation successful!");
  Logger.log(`Games: ${scheduleData.length}`);
  Logger.log(`Players: ${adpData.length}`);
  Logger.log(`  QB: ${positionCounts.QB}`);
  Logger.log(`  RB: ${positionCounts.RB}`);
  Logger.log(`  WR: ${positionCounts.WR}`);
  Logger.log(`  TE: ${positionCounts.TE}`);

  return {
    scheduleData: scheduleData,
    adpData: adpData,
    positionCounts: positionCounts
  };
}

function testTask1A() {
  try {
    const data = validateModuleData();

    Logger.log("Sample game:");
    Logger.log(JSON.stringify(data.scheduleData[0], null, 2));

    Logger.log("Sample player:");
    Logger.log(JSON.stringify(data.adpData[0], null, 2));

    Logger.log(
      "Task 1A Complete!\n" +
      `Schedule: ${data.scheduleData.length} games\n` +
      `Players: ${data.adpData.length}\n` +
      `QB: ${data.positionCounts.QB}\n` +
      `RB: ${data.positionCounts.RB}\n` +
      `WR: ${data.positionCounts.WR}\n` +
      `TE: ${data.positionCounts.TE}`
    );

  } catch (error) {
    Logger.log("Error: " + error.message);
  }
}

// ============================================================
// TASK 4A: IDENTIFY STACKABLE GAMES
// ============================================================

function findStackableGames(scheduleData) {
  return scheduleData.filter(game => {
    const aPlusCount = [
      game.qb_grade,
      game.rb_grade,
      game.wr_grade,
      game.te_grade
    ].filter(g => g === 'A+').length;

    return aPlusCount >= 3;
  }).map(game => ({
    game_id: game.game_id,
    week: game.week,
    matchup: `${game.away_team} @ ${game.home_team}`,
    home_team: game.home_team,
    away_team: game.away_team,
    environment_key: game.environment_key,
    environment_rate: game.environment_rate,
    qb_grade: game.qb_grade,
    rb_grade: game.rb_grade,
    wr_grade: game.wr_grade,
    te_grade: game.te_grade,
    a_plus_count: [game.qb_grade, game.rb_grade, game.wr_grade, game.te_grade]
                    .filter(g => g === 'A+').length,
    game_type: game.game_type
  }));
}

function findBestPlayer(team, position, rankings) {
  const teamPlayers = (rankings[position] || []).filter(p => p.team === team);
  if (teamPlayers.length === 0) return null;
  teamPlayers.sort((a, b) => b.value_ratio - a.value_ratio);
  return teamPlayers[0];
}

function buildStackRecommendation(game, rankings) {
  const stack = {
    game_id: game.game_id,
    week: game.week,
    matchup: game.matchup,
    environment_rate: game.environment_rate || 0,
    a_plus_positions: game.a_plus_count,
    players: []
  };

  if (game.qb_grade === 'A+') {
    const qb = findBestPlayer(game.home_team, 'QB', rankings);
    if (qb) stack.players.push(qb);
  }

  if (game.wr_grade === 'A+') {
    const homeWRs = (rankings.WR || []).filter(p => p.team === game.home_team);
    homeWRs.sort((a, b) => b.value_ratio - a.value_ratio);
    stack.players.push(...homeWRs.slice(0, 2));
  }

  const awayWRs = (rankings.WR || []).filter(p => p.team === game.away_team);
  awayWRs.sort((a, b) => b.value_ratio - a.value_ratio);
  if (awayWRs.length > 0) stack.players.push(awayWRs[0]);

  stack.total_adp = stack.players.reduce((sum, p) => sum + p.adp, 0);
  stack.total_elite_value = stack.players.reduce((sum, p) => sum + p.elite_game_value, 0);
  stack.value_score = stack.players.length > 0 ? stack.total_elite_value / stack.total_adp : 0;

  return stack;
}

function generateStackBlueprint() {
  const scheduleData = getScheduleData();
  const rankings = buildPlayerValueRankings();
  const stackableGames = findStackableGames(scheduleData);

  Logger.log(`Stackable games found: ${stackableGames.length}`);

  const stacks = stackableGames.map(game => buildStackRecommendation(game, rankings));
  stacks.sort((a, b) => b.value_score - a.value_score);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Stack_Blueprint");

  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet("Stack_Blueprint");
  }

  sheet.getRange(1, 1).setValue('[ ELITE GAME STACKS ]').setFontWeight('bold');

  let currentRow = 3;

  stacks.forEach((stack, i) => {
    sheet.getRange(currentRow, 1)
      .setValue(`${i+1}. Week ${stack.week}: ${stack.matchup}`)
      .setFontWeight('bold');
    currentRow++;

    sheet.getRange(currentRow, 1)
      .setValue(`Environment: ${stack.environment_rate.toFixed ? stack.environment_rate.toFixed(3) : stack.environment_rate} | A+ Positions: ${stack.a_plus_positions}`);
    currentRow++;

    sheet.getRange(currentRow, 1, 1, 5)
      .setValues([['Player', 'Pos', 'Team', 'ADP', 'Value']])
      .setFontWeight('bold');
    currentRow++;

    stack.players.forEach(p => {
      sheet.getRange(currentRow, 1, 1, 5)
        .setValues([[p.player_name, p.position, p.team, p.adp, p.elite_game_value]]);
      currentRow++;
    });

    sheet.getRange(currentRow, 1, 1, 5)
      .setValues([['STACK TOTALS:', '', '', stack.total_adp, stack.total_elite_value.toFixed(1)]])
      .setFontWeight('bold')
      .setBackground('#efefef');
    currentRow++;

    sheet.getRange(currentRow, 1).setValue(`Value Score: ${stack.value_score.toFixed(3)}`);
    currentRow += 2;
  });

  sheet.autoResizeColumns(1, 5);

  Logger.log(`Stack_Blueprint created with ${stacks.length} stacks`);

  return stacks;
}

function testTask4A() {
  try {
    const stacks = generateStackBlueprint();

    Logger.log("Top 3 stacks by value:");
    stacks.slice(0, 3).forEach((s, i) => {
      Logger.log(`${i+1}. Week ${s.week}: ${s.matchup} (${s.players.length} players, score ${s.value_score.toFixed(3)})`);
      s.players.forEach(p => {
        Logger.log(`   ${p.player_name} (${p.position}, ADP ${p.adp})`);
      });
    });

    Logger.log(
      "Task 4A Complete!\n" +
      `Stack_Blueprint created\n` +
      `Stackable games: ${stacks.length}`
    );

  } catch (error) {
    Logger.log("Error: " + error.message);
  }
}
// ============================================================
// TASK 3C: CREATE POSITION VALUE RANKINGS SHEET
// ============================================================

function writePositionValueRankings() {
  const rankings = buildPlayerValueRankings();

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Position_Value_Rankings");

  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet("Position_Value_Rankings");
  }

  const headers = [
    'rank', 'position', 'player_name', 'team', 'adp',
    'a_plus_games', 'a_games', 'b_games', 'elite_game_value',
    'value_ratio', 'games_per_round', 'value_class', 'recommendation'
  ];

  let currentRow = 1;
  const positions = ['QB', 'RB', 'WR', 'TE'];

  for (const position of positions) {
    sheet.getRange(currentRow, 1).setValue(`[ ${position} RANKINGS ]`).setFontWeight('bold');
    currentRow += 2;

    sheet.getRange(currentRow, 1, 1, headers.length)
      .setValues([headers])
      .setFontWeight('bold')
      .setBackground('#efefef');
    currentRow++;

    const players = rankings[position];
    const rows = players.map((p, i) => [
      i + 1,
      p.position,
      p.player_name,
      p.team,
      p.adp,
      p.a_plus_games,
      p.a_games,
      p.b_games,
      p.elite_game_value,
      Math.round(p.value_ratio * 1000) / 1000,
      Math.round(p.games_per_round * 10) / 10,
      p.value_class,
      p.recommendation
    ]);

    if (rows.length > 0) {
      sheet.getRange(currentRow, 1, rows.length, headers.length).setValues(rows);

      rows.forEach((row, i) => {
        const cell = sheet.getRange(currentRow + i, 12);
        if (row[11] === "EXTREME VALUE")     cell.setBackground('#00cc44');
        else if (row[11] === "STRONG VALUE") cell.setBackground('#90ee90');
        else if (row[11] === "AVOID")        cell.setBackground('#ffcccb');
      });

      currentRow += rows.length + 2;
    }
  }

  sheet.autoResizeColumns(1, headers.length);

  Logger.log("Position_Value_Rankings created with " + positions.length + " position sections");

  return true;
}

function testTask3C() {
  try {
    writePositionValueRankings();

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Position_Value_Rankings");

    if (!sheet) throw new Error("Position_Value_Rankings sheet not created");

    const numRows = sheet.getDataRange().getNumRows();

    Logger.log(
      "Task 3C Complete!\n" +
      `Position_Value_Rankings created\n` +
      `Total rows: ${numRows}\n` +
      `4 position sections (QB/RB/WR/TE), color-coded by value class`
    );

  } catch (error) {
    Logger.log("Error: " + error.message);
  }
}

// ============================================================
// TASK 3B: CALCULATE VALUE RATIOS
// ============================================================

function calculateValueRatio(player) {
  return {
    ...player,
    value_ratio: player.elite_game_value / player.adp,
    games_per_round: player.a_plus_games / (player.adp / 12)
  };
}

function classifyPlayerValue(valueRatio, position) {
  const thresholds = {
    QB: { extreme: 0.10, strong: 0.06, fair: 0.04, slight: 0.02 },
    RB: { extreme: 0.08, strong: 0.05, fair: 0.03, slight: 0.015 },
    WR: { extreme: 0.08, strong: 0.05, fair: 0.03, slight: 0.015 },
    TE: { extreme: 0.10, strong: 0.06, fair: 0.04, slight: 0.02 }
  };

  const t = thresholds[position];

  if (valueRatio >= t.extreme) return "EXTREME VALUE";
  if (valueRatio >= t.strong)  return "STRONG VALUE";
  if (valueRatio >= t.fair)    return "FAIR VALUE";
  if (valueRatio >= t.slight)  return "SLIGHT REACH";
  return "AVOID";
}

function generateRecommendation(valueClass, aPlusGames) {
  if (valueClass === "EXTREME VALUE" && aPlusGames >= 6) return "PRIORITY TARGET - Must draft";
  if (valueClass === "EXTREME VALUE")                    return "STRONG TARGET - Great value";
  if (valueClass === "STRONG VALUE")                     return "GOOD VALUE - Solid pick";
  if (valueClass === "FAIR VALUE")                       return "FAIR - Market priced";
  if (valueClass === "SLIGHT REACH")                     return "REACH - Consider alternatives";
  return "AVOID - Poor value";
}

function buildPlayerValueRankings() {
  const mappedPlayers = buildPlayerScheduleMapping();

  const rankedPlayers = mappedPlayers.map(player => {
    const withRatio = calculateValueRatio(player);
    const valueClass = classifyPlayerValue(withRatio.value_ratio, player.position);
    const recommendation = generateRecommendation(valueClass, player.a_plus_games);

    return { ...withRatio, value_class: valueClass, recommendation: recommendation };
  });

  const byPosition = { QB: [], RB: [], WR: [], TE: [] };

  rankedPlayers.forEach(player => {
    if (byPosition[player.position]) {
      byPosition[player.position].push(player);
    }
  });

  for (const pos of Object.keys(byPosition)) {
    byPosition[pos].sort((a, b) => b.value_ratio - a.value_ratio);
  }

  return byPosition;
}

function testTask3B() {
  try {
    const rankings = buildPlayerValueRankings();

    Logger.log("Top 5 QBs by value ratio:");
    rankings.QB.slice(0, 5).forEach((p, i) => {
      Logger.log(`${i+1}. ${p.player_name} (ADP ${p.adp}): ${p.value_ratio.toFixed(3)} - ${p.value_class}`);
    });

    Logger.log("Top 5 WRs by value ratio:");
    rankings.WR.slice(0, 5).forEach((p, i) => {
      Logger.log(`${i+1}. ${p.player_name} (ADP ${p.adp}): ${p.value_ratio.toFixed(3)} - ${p.value_class}`);
    });

    const extremeCount = {
      QB: rankings.QB.filter(p => p.value_class === "EXTREME VALUE").length,
      RB: rankings.RB.filter(p => p.value_class === "EXTREME VALUE").length,
      WR: rankings.WR.filter(p => p.value_class === "EXTREME VALUE").length,
      TE: rankings.TE.filter(p => p.value_class === "EXTREME VALUE").length
    };

    Logger.log(
      "Task 3B Complete!\n" +
      `EXTREME VALUE — QB: ${extremeCount.QB}, RB: ${extremeCount.RB}, WR: ${extremeCount.WR}, TE: ${extremeCount.TE}`
    );

  } catch (error) {
    Logger.log("Error: " + error.message);
  }
}

// ============================================================
// TASK 3A: MAP PLAYERS TO TEAM DATA
// ============================================================

function getTeamSummaryData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Team_Schedule_Summary");

  if (!sheet) {
    throw new Error("Team_Schedule_Summary not found. Run Task 2B first.");
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);

  return rows.map(row => {
    const summary = {};
    headers.forEach((header, i) => {
      summary[header] = row[i];
    });
    return summary;
  });
}

function mapPlayerToSchedule(player, teamSummaries) {
  // Normalize position: strip suffix so QB1 -> QB, WR2 -> WR, etc.
  const basePosition = player.position ? player.position.replace(/\d+$/, '') : '';

  const match = teamSummaries.find(s =>
    s.team === player.team &&
    s.position === basePosition
  );

  if (!match) {
    Logger.log(`Warning: No schedule data for ${player.player_name} (${player.team} ${player.position})`);
    return null;
  }

  return {
    player_name: player.player_name,
    team: player.team,
    position: basePosition,
    adp: player.adp,
    total_games: match.total_games,
    a_plus_games: match.a_plus_games,
    a_games: match.a_games,
    b_games: match.b_games,
    elite_game_value: match.elite_game_value
  };
}

function filterTopPlayersByPosition(adpData) {
  const limits = { QB: 32, RB: 64, WR: 100, TE: 32 };

  const byPosition = { QB: [], RB: [], WR: [], TE: [] };

  adpData.forEach(player => {
    const base = player.position ? player.position.replace(/\d+$/, '') : '';
    if (byPosition[base]) {
      byPosition[base].push(player);
    }
  });

  for (const [pos, players] of Object.entries(byPosition)) {
    players.sort((a, b) => a.adp - b.adp);
    byPosition[pos] = players.slice(0, limits[pos]);
  }

  return byPosition;
}

function buildPlayerScheduleMapping() {
  const adpData = getADPData();
  const teamSummaries = getTeamSummaryData();
  const topPlayers = filterTopPlayersByPosition(adpData);

  const mappedPlayers = [];

  for (const [position, players] of Object.entries(topPlayers)) {
    for (const player of players) {
      const mapped = mapPlayerToSchedule(player, teamSummaries);
      if (mapped) {
        mappedPlayers.push(mapped);
      }
    }
  }

  Logger.log(`Mapped ${mappedPlayers.length} players to schedule data`);

  return mappedPlayers;
}

function testTask3A() {
  try {
    const mappedPlayers = buildPlayerScheduleMapping();

    const counts = {
      QB: mappedPlayers.filter(p => p.position === 'QB').length,
      RB: mappedPlayers.filter(p => p.position === 'RB').length,
      WR: mappedPlayers.filter(p => p.position === 'WR').length,
      TE: mappedPlayers.filter(p => p.position === 'TE').length
    };

    const larPlayers = mappedPlayers.filter(p => p.team === 'LAR');
    Logger.log("LAR Players with schedule data:");
    larPlayers.forEach(p => {
      Logger.log(`${p.player_name} (${p.position}, ADP ${p.adp}): ${p.a_plus_games} A+ games, value ${p.elite_game_value}`);
    });

    const sorted = [...mappedPlayers].sort((a, b) => b.a_plus_games - a.a_plus_games);
    Logger.log(`Most A+ games: ${sorted[0].player_name} (${sorted[0].position}, ${sorted[0].team}): ${sorted[0].a_plus_games}`);

    Logger.log(
      "Task 3A Complete!\n" +
      `Players mapped: ${mappedPlayers.length}\n` +
      `QB: ${counts.QB}, RB: ${counts.RB}, WR: ${counts.WR}, TE: ${counts.TE}`
    );

  } catch (error) {
    Logger.log("Error: " + error.message);
  }
}

// ============================================================
// TASK 2B: AGGREGATE POSITION STATISTICS
// ============================================================

function countPositionGrades(teamSchedule, position) {
  const gradeField = `${position.toLowerCase()}_grade`;
  const grades = teamSchedule.map(game => game[gradeField]);

  return {
    total_games: grades.length,
    a_plus: grades.filter(g => g === 'A+').length,
    a: grades.filter(g => g === 'A').length,
    b: grades.filter(g => g === 'B').length,
    c: grades.filter(g => g === 'C').length,
    d: grades.filter(g => g === 'D').length
  };
}

function calculateEliteGameValue(gradeCounts) {
  return (
    (gradeCounts.a_plus * 1.0) +
    (gradeCounts.a     * 0.6) +
    (gradeCounts.b     * 0.3) +
    (gradeCounts.c     * 0.1) +
    (gradeCounts.d     * 0.0)
  );
}

function generateTeamPositionSummary(team, teamSchedule) {
  const positions = ['QB', 'RB', 'WR', 'TE', 'DST'];
  const summary = [];

  for (const position of positions) {
    const gradeCounts = countPositionGrades(teamSchedule, position);
    const eliteValue = calculateEliteGameValue(gradeCounts);

    summary.push({
      team: team,
      position: position,
      total_games: gradeCounts.total_games,
      a_plus_games: gradeCounts.a_plus,
      a_games: gradeCounts.a,
      b_games: gradeCounts.b,
      c_games: gradeCounts.c,
      d_games: gradeCounts.d,
      elite_game_value: Math.round(eliteValue * 10) / 10
    });
  }

  return summary;
}

function buildTeamScheduleSummary() {
  const scheduleData = getScheduleData();
  const teams = getAllTeams();
  const allSummaries = [];

  for (const team of teams) {
    const teamSchedule = extractTeamSchedule(team, scheduleData);
    const teamSummary = generateTeamPositionSummary(team, teamSchedule);
    allSummaries.push(...teamSummary);
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Team_Schedule_Summary");

  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet("Team_Schedule_Summary");
  }

  const headers = [
    'team', 'position', 'total_games', 'a_plus_games', 'a_games',
    'b_games', 'c_games', 'd_games', 'elite_game_value'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');

  const rows = allSummaries.map(s => [
    s.team, s.position, s.total_games, s.a_plus_games, s.a_games,
    s.b_games, s.c_games, s.d_games, s.elite_game_value
  ]);

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.autoResizeColumns(1, headers.length);
  sheet.setFrozenRows(1);

  Logger.log(`Team_Schedule_Summary created: ${allSummaries.length} rows`);

  return allSummaries;
}

function testTask2B() {
  try {
    const summaries = buildTeamScheduleSummary();

    if (summaries.length !== 160) {
      throw new Error(`Expected 160 rows, got ${summaries.length}`);
    }

    const larSummaries = summaries.filter(s => s.team === 'LAR');
    Logger.log("LAR Position Summaries:");
    larSummaries.forEach(s => {
      Logger.log(`${s.position}: A+=${s.a_plus_games}, A=${s.a_games}, Value=${s.elite_game_value}`);
    });

    const qbSummaries = summaries.filter(s => s.position === 'QB');
    qbSummaries.sort((a, b) => b.a_plus_games - a.a_plus_games);
    Logger.log("Top 3 teams for QB A+ games:");
    qbSummaries.slice(0, 3).forEach(s => {
      Logger.log(`${s.team}: ${s.a_plus_games} A+ games`);
    });

    Logger.log(
      "Task 2B Complete!\n" +
      `Team_Schedule_Summary created\n` +
      `Rows: ${summaries.length} (32 teams × 5 positions)`
    );

  } catch (error) {
    Logger.log("Error: " + error.message);
  }
}

// ============================================================
// TASK 2A: EXTRACT TEAM SCHEDULES
// ============================================================

function getAllTeams() {
  return [
    'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE',
    'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAC', 'KC',
    'LV', 'LAC', 'LAR', 'MIA', 'MIN', 'NE', 'NO', 'NYG',
    'NYJ', 'PHI', 'PIT', 'SF', 'SEA', 'TB', 'TEN', 'WAS'
  ];
}

function extractTeamSchedule(team, scheduleData) {
  const teamGames = [];

  for (const game of scheduleData) {
    let isTeamInGame = false;
    let location = null;

    if (game.home_team === team) {
      isTeamInGame = true;
      location = 'HOME';
    } else if (game.away_team === team) {
      isTeamInGame = true;
      location = 'AWAY';
    }

    if (isTeamInGame) {
      teamGames.push({
        week: game.week,
        opponent: location === 'HOME' ? game.away_team : game.home_team,
        location: location,
        venue_type: game.venue_type,
        is_primetime: game.is_primetime,
        is_division: game.is_division,
        qb_grade: game.qb_grade,
        qb_ceiling_rate: game.qb_ceiling_rate,
        rb_grade: game.rb_grade,
        rb_ceiling_rate: game.rb_ceiling_rate,
        wr_grade: game.wr_grade,
        wr_ceiling_rate: game.wr_ceiling_rate,
        te_grade: game.te_grade,
        te_ceiling_rate: game.te_ceiling_rate,
        dst_grade: game.dst_grade,
        dst_ceiling_rate: game.dst_ceiling_rate,
        environment_key: game.environment_key,
        environment_rate: game.environment_rate,
        game_type: game.game_type
      });
    }
  }

  teamGames.sort((a, b) => a.week - b.week);

  return teamGames;
}

function testTask2A() {
  try {
    const scheduleData = getScheduleData();
    const teams = getAllTeams();

    Logger.log(`Teams loaded: ${teams.length}`);

    const larSchedule = extractTeamSchedule('LAR', scheduleData);

    if (larSchedule.length !== 17) {
      throw new Error(`Expected 17 games for LAR, got ${larSchedule.length}`);
    }

    Logger.log("LAR Schedule (first 3 games):");
    larSchedule.slice(0, 3).forEach(game => {
      Logger.log(`Week ${game.week}: vs ${game.opponent} (${game.location})`);
      Logger.log(`  QB: ${game.qb_grade}, WR: ${game.wr_grade}, RB: ${game.rb_grade}`);
    });

    let totalGames = 0;
    teams.forEach(team => {
      const schedule = extractTeamSchedule(team, scheduleData);
      totalGames += schedule.length;
    });

    if (totalGames !== 544) {
      throw new Error(`Expected 544 total games, got ${totalGames}`);
    }

    Logger.log(
      "Task 2A Complete!\n" +
      `LAR schedule: ${larSchedule.length} games\n` +
      `Total across all teams: ${totalGames} games`
    );

  } catch (error) {
    Logger.log("Error: " + error.message);
  }
}
