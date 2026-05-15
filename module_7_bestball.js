// MODULE 7: BEST BALL DRAFT VALUE ANALYZER
// Task 1A: Data Access and Validation
// Threshold constants defined in module_6_schedule.js (shared global scope)

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
  const isElite = r => parseFloat(r) >= ELITE_THRESHOLD;
  return scheduleData.filter(game =>
    [game.qb_ceiling_rate, game.rb_ceiling_rate, game.wr_ceiling_rate, game.te_ceiling_rate]
      .filter(isElite).length >= 3
  ).map(game => ({
    game_id: game.game_id,
    week: game.week,
    matchup: `${game.away_team} @ ${game.home_team}`,
    home_team: game.home_team,
    away_team: game.away_team,
    environment_key: game.environment_key,
    environment_rate: game.environment_rate,
    qb_score: game.qb_score,
    rb_score: game.rb_score,
    wr_score: game.wr_score,
    te_score: game.te_score,
    a_plus_count: [game.qb_ceiling_rate, game.rb_ceiling_rate, game.wr_ceiling_rate, game.te_ceiling_rate]
                    .filter(isElite).length,
    game_type: game.game_type
  }));
}

function findBestPlayer(team, position, rankings) {
  const teamPlayers = (rankings[position] || []).filter(p => p.team === team);
  if (teamPlayers.length === 0) return null;
  teamPlayers.sort((a, b) => b.value_score - a.value_score);
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

  if (parseFloat(game.qb_ceiling_rate || game.qb_score / 100) >= ELITE_THRESHOLD) {
    const qb = findBestPlayer(game.home_team, 'QB', rankings);
    if (qb) stack.players.push(qb);
  }

  if (parseFloat(game.wr_ceiling_rate || game.wr_score / 100) >= ELITE_THRESHOLD) {
    const homeWRs = (rankings.WR || []).filter(p => p.team === game.home_team);
    homeWRs.sort((a, b) => b.value_score - a.value_score);
    stack.players.push(...homeWRs.slice(0, 2));
  }

  const awayWRs = (rankings.WR || []).filter(p => p.team === game.away_team);
  awayWRs.sort((a, b) => b.value_score - a.value_score);
  if (awayWRs.length > 0) stack.players.push(awayWRs[0]);

  stack.total_adp = stack.players.reduce((sum, p) => sum + p.adp, 0);
  stack.total_elite_value = stack.players.reduce((sum, p) => sum + p.elite_game_value, 0);
  // stack_efficiency is elite value per ADP dollar — a ratio for comparing stacks, not players
  stack.stack_efficiency = stack.players.length > 0 ? stack.total_elite_value / stack.total_adp : 0;

  return stack;
}

function generateStackBlueprint() {
  const scheduleData = getScheduleData();
  const rankings = buildPlayerValueRankings();
  const stackableGames = findStackableGames(scheduleData);

  Logger.log(`Stackable games found: ${stackableGames.length}`);

  const stacks = stackableGames.map(game => buildStackRecommendation(game, rankings));
  stacks.sort((a, b) => b.stack_efficiency - a.stack_efficiency);

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

    sheet.getRange(currentRow, 1).setValue(`Stack Efficiency: ${stack.stack_efficiency.toFixed(3)}`);
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
      Logger.log(`${i+1}. Week ${s.week}: ${s.matchup} (${s.players.length} players, efficiency ${s.stack_efficiency.toFixed(3)})`);
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
    'rank', 'position', 'player_name', 'team', 'adp', 'round',
    'elite_games', 'strong_games', 'playable_games', 'elite_game_value', 'elite_game_value_raw',
    'schedule_pct', 'cost_pct', 'value_score',
    'schedule_quality', 'schedule_quality_raw', 'elite_games_count', 'stack_role', 'best_stack_with',
    'ceiling_rate', 'volatility', 'ceiling_score', 'l6_ceiling',
    'playoff_score', 'playoff_score_raw'
  ];

  sheet.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight('bold')
    .setBackground('#efefef');

  const positions = ['QB', 'RB', 'WR', 'TE'];
  const allPlayers = [];
  for (const position of positions) {
    rankings[position].forEach(p => allPlayers.push(p));
  }
  allPlayers.sort((a, b) => b.value_score - a.value_score);

  const allRows = allPlayers.map((p, i) => [
    i + 1,
    p.position,
    p.player_name,
    p.team,
    p.adp,
    p.round,
    p.elite_games,
    p.strong_games,
    p.playable_games,
    p.elite_game_value,
    p.elite_game_value_raw  != null ? Math.round(p.elite_game_value_raw  * 10) / 10 : '',
    p.schedule_percentile,
    p.cost_percentile,
    p.value_score,
    p.schedule_quality,
    p.schedule_quality_raw  != null ? Math.round(p.schedule_quality_raw) : '',
    p.elite_games_count,
    p.stack_role,
    p.best_stack_with,
    p.ceiling_rate  != null ? Math.round(p.ceiling_rate  * 10) / 10 : '',
    p.volatility    != null ? Math.round(p.volatility    * 10) / 10 : '',
    p.ceiling_score != null ? p.ceiling_score : '',
    p.l6_ceiling    != null ? Math.round(p.l6_ceiling    * 10) / 10 : '',
    p.playoff_score     != null ? p.playoff_score : 0,
    p.playoff_score_raw != null ? Math.round(p.playoff_score_raw * 100) / 100 : 0
  ]);

  if (allRows.length > 0) {
    sheet.getRange(2, 1, allRows.length, headers.length).setValues(allRows);
  }

  sheet.autoResizeColumns(1, headers.length);

  Logger.log("Position_Value_Rankings created: " + allRows.length + " players across " + positions.length + " positions");

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
// STACK TARGETS
// ============================================================

function gradeToScore(grade) {
  if (grade === 'A+') return 100;
  if (grade === 'A')  return 80;
  if (grade === 'B')  return 60;
  if (grade === 'C')  return 40;
  return 20;
}

function buildCeilingRatePercentiles(scheduleData) {
  const posFields = {
    QB: { home: 'home_qb_ceiling_rate', away: 'away_qb_ceiling_rate' },
    RB: { home: 'home_rb_ceiling_rate', away: 'away_rb_ceiling_rate' },
    WR: { home: 'home_wr_ceiling_rate', away: 'away_wr_ceiling_rate' },
    TE: { home: 'home_te_ceiling_rate', away: 'away_te_ceiling_rate' }
  };
  const n = scheduleData.length;
  const homePercentiles = {};
  const awayPercentiles = {};

  for (const [pos, fields] of Object.entries(posFields)) {
    // Rank all 272 home rates independently
    const homeSorted = scheduleData
      .map(g => ({ game_id: g.game_id, rate: parseFloat(g[fields.home]) || 0 }))
      .sort((a, b) => a.rate - b.rate);
    const homeMap = {};
    homeSorted.forEach((item, rank) => {
      homeMap[item.game_id] = n > 1 ? Math.round((rank / (n - 1)) * 100) : 50;
    });
    homePercentiles[pos] = homeMap;

    // Rank all 272 away rates independently
    const awaySorted = scheduleData
      .map(g => ({ game_id: g.game_id, rate: parseFloat(g[fields.away]) || 0 }))
      .sort((a, b) => a.rate - b.rate);
    const awayMap = {};
    awaySorted.forEach((item, rank) => {
      awayMap[item.game_id] = n > 1 ? Math.round((rank / (n - 1)) * 100) : 50;
    });
    awayPercentiles[pos] = awayMap;
  }

  return { homePercentiles, awayPercentiles };
}

function toPercentile(items, field) {
  const rawField = field + '_raw';
  const sorted = [...items].sort((a, b) => (a[field] || 0) - (b[field] || 0));
  const n = sorted.length;
  sorted.forEach((item, rank) => {
    item[rawField] = item[field] || 0;
    item[field]    = n > 1 ? Math.round((rank / (n - 1)) * 100) : 50;
  });
}

function computeStackEfficiencyGrade(efficiency) {
  if (efficiency >= 8.0) return 'A+';
  if (efficiency >= 6.0) return 'A';
  if (efficiency >= 4.0) return 'B';
  if (efficiency >= 2.5) return 'C';
  return 'D';
}


function computeStackDraftStrategy(grade) {
  if (grade === 'A+') return 'Priority target - build entire draft around this';
  if (grade === 'A')  return 'Strong target - complete if pieces available';
  if (grade === 'B')  return 'Opportunistic - take if falls to value';
  return 'Avoid - poor shared game overlap';
}

function buildStackTargets(byPosition) {
  const allPlayers = Object.values(byPosition).flat();

  const byTeam = {};
  allPlayers.forEach(p => {
    if (!byTeam[p.team]) byTeam[p.team] = { QB: [], RB: [], WR: [], TE: [] };
    if (byTeam[p.team][p.position]) byTeam[p.team][p.position].push(p);
  });

  for (const team of Object.keys(byTeam)) {
    for (const pos of ['QB', 'RB', 'WR', 'TE']) {
      byTeam[team][pos].sort((a, b) => b.value_score - a.value_score);
    }
  }

  function makeStack(team, qb, p1, p2) {
    if (!qb || !p1 || !p2) return null;
    if (qb.adp >= 200 || p1.adp >= 200 || p2.adp >= 200) return null;
    const sharedScheduleQuality = Math.round((qb.schedule_quality + p1.schedule_quality + p2.schedule_quality) / 3);
    const totalCost = qb.adp + p1.adp + p2.adp;
    const efficiency = Math.round((sharedScheduleQuality / totalCost) * 100) / 100;
    const grade = computeStackEfficiencyGrade(efficiency);
    return {
      team,
      qb_name: qb.player_name,
      qb_adp: qb.adp,
      pc1_name: p1.player_name,
      pc1_position: p1.position,
      pc1_adp: p1.adp,
      pc2_name: p2.player_name,
      pc2_position: p2.position,
      pc2_adp: p2.adp,
      total_stack_cost: Math.round(totalCost * 10) / 10,
      shared_schedule_quality: sharedScheduleQuality,
      stack_efficiency: efficiency,
      stack_grade: grade,
      draft_strategy: computeStackDraftStrategy(grade)
    };
  }

  const stacks = [];

  for (const [team, pos] of Object.entries(byTeam)) {
    const qb = pos.QB[0];
    if (!qb) continue;

    const wrs = pos.WR.slice(0, 3);
    const tes = pos.TE.slice(0, 1);
    const rbs = pos.RB.slice(0, 2);
    const passers = [...wrs, ...tes];

    // QB + 2 pass catchers (all pairs from WR1/WR2/WR3/TE1)
    for (let i = 0; i < passers.length; i++) {
      for (let j = i + 1; j < passers.length; j++) {
        const s = makeStack(team, qb, passers[i], passers[j]);
        if (s) stacks.push(s);
      }
    }

    // QB + RB + pass catcher
    for (const rb of rbs) {
      for (const pc of passers) {
        const s = makeStack(team, qb, rb, pc);
        if (s) stacks.push(s);
      }
    }

    // QB + RB1 + RB2
    if (rbs[0] && rbs[1]) {
      const s = makeStack(team, qb, rbs[0], rbs[1]);
      if (s) stacks.push(s);
    }
  }

  toPercentile(stacks, 'stack_efficiency');
  stacks.sort((a, b) => b.stack_efficiency - a.stack_efficiency);
  return stacks;
}

function writeStackTargets() {
  const rankings = buildPlayerValueRankings();
  const stacks   = buildStackTargets(rankings);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Stack_Targets');
  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet('Stack_Targets');
  }

  const headers = [
    'rank', 'team',
    'qb_name', 'qb_adp',
    'pc1_name', 'pc1_position', 'pc1_adp',
    'pc2_name', 'pc2_position', 'pc2_adp',
    'total_stack_cost', 'shared_schedule_quality', 'stack_efficiency', 'stack_efficiency_raw'
  ];

  sheet.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight('bold')
    .setBackground('#efefef');

  const rows = stacks.map((s, i) => [
    i + 1,
    s.team,
    s.qb_name, s.qb_adp,
    s.pc1_name, s.pc1_position, s.pc1_adp,
    s.pc2_name, s.pc2_position, s.pc2_adp,
    s.total_stack_cost, s.shared_schedule_quality, s.stack_efficiency, s.stack_efficiency_raw
  ]);

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  sheet.autoResizeColumns(1, headers.length);

  Logger.log(`Stack_Targets created: ${stacks.length} stacks`);
  return true;
}

function testStackTargets() {
  try {
    writeStackTargets();

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Stack_Targets');
    if (!sheet) throw new Error('Stack_Targets sheet not created');

    const data = sheet.getDataRange().getValues();
    const numStacks = data.length - 1;

    Logger.log(
      'Stack_Targets Complete!\n' +
      `${numStacks} stacks ranked by efficiency (expected 200-400)\n` +
      `Top stack: ${data[1][2]} (${data[1][1]}) + ${data[1][4]} + ${data[1][7]}\n` +
      `Efficiency: ${data[1][12]}, Grade: ${data[1][13]}`
    );

  } catch (error) {
    Logger.log('Error: ' + error.message);
  }
}

// ============================================================
// MENU
// ============================================================

function onOpen() {
  const ui = SpreadsheetApp.getUi();

  // Module 6: Schedule processing
  ui.createMenu('🏈 NFL Schedule')
    .addItem('Process Schedule', 'processSchedule')
    .addItem('Fix Home/Away Rates', 'updateScheduleWithHomeAwayCeilingRates')
    .addSeparator()
    .addItem('View QA Test', 'openQATest')
    .addToUi();

  // Module 7: Best Ball analysis
  ui.createMenu('Best Ball')
    .addItem('Build Team Summary', 'buildTeamScheduleSummary')
    .addSeparator()
    .addItem('Build All Sheets', 'runAllSheets')
    .addToUi();
}

function runAllSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.toast('Building stacking sheets...', 'Best Ball', -1);

  writePositionValueRankings(); // Position_Value_Rankings
  writeStackTargets();          // Stack_Targets
  writeTeamStackRankings();     // Team_Stack_Rankings
  writeGameScores();            // Game_Scores
  writeDraftStrategyTiers();    // Draft_Strategy_Tiers (flat by round)

  ss.toast('Done!', 'Best Ball', 5);
  Logger.log('runAllSheets complete');
}

// ============================================================
// TASK 3B: CALCULATE VALUE RATIOS
// ============================================================

function computeStackGrade(count, position) {
  if (position === 'RB') {
    if (count >= 6) return 'A+';
    if (count >= 4) return 'A';
    if (count === 3) return 'B';
    if (count === 2) return 'C';
    return 'D';
  } else {
    if (count >= 8) return 'A+';
    if (count >= 6) return 'A';
    if (count >= 4) return 'B';
    if (count >= 2) return 'C';
    return 'D';
  }
}

function computeStackStrategy(grade, role) {
  if (grade === 'A+' && role === 'WR1 Anchor') return 'Draft early, build stack around';
  if (grade === 'A+' && role === 'QB Core')    return 'Priority target if you have teammates';
  if (grade === 'A'  && role === 'QB Core')    return 'Strong target if you have teammates';
  if (grade === 'A'  && (role === 'WR2 Core' || role === 'TE Core')) return 'Complete stack if anchor drafted';
  if (grade === 'B'  && role === 'QB Core')    return "Take if value, don't force";
  if (grade === 'B')                           return 'Opportunistic if completing stack';
  return 'Talent only, low stack value';
}

function enrichWithStackData(byPosition, scheduleData, percentiles) {
  const { homePercentiles, awayPercentiles } = percentiles;
  const allPlayers = Object.values(byPosition).flat();

  // schedule_quality and elite_games_count use the correct home/away score per game
  allPlayers.forEach(p => {
    const pos = p.position;
    const teamGames = scheduleData.filter(g => g.home_team === p.team || g.away_team === p.team);
    const scores = teamGames.map(g => {
      const isHome = g.home_team === p.team;
      return isHome
        ? (homePercentiles[pos][g.game_id] || 0)
        : (awayPercentiles[pos][g.game_id] || 0);
    });
    p.schedule_quality  = scores.reduce((sum, s) => sum + s, 0);
    p.elite_games_count = scores.filter(s => s >= 70).length;
    p.stack_grade = computeStackGrade(p.elite_games_count, p.position);
    p.stack_role  = 'Not Stackable';
  });

  // Stack roles and best_stack_with by team
  const byTeam = {};
  allPlayers.forEach(p => {
    if (!byTeam[p.team]) byTeam[p.team] = [];
    byTeam[p.team].push(p);
  });

  for (const players of Object.values(byTeam)) {
    const qbs = players.filter(p => p.position === 'QB').sort((a, b) => b.value_score - a.value_score);
    const wrs = players.filter(p => p.position === 'WR').sort((a, b) => b.value_score - a.value_score);
    const tes = players.filter(p => p.position === 'TE').sort((a, b) => b.value_score - a.value_score);
    const rbs = players.filter(p => p.position === 'RB').sort((a, b) => b.value_score - a.value_score);

    // QB role
    if (qbs[0] && ['A+', 'A', 'B'].includes(qbs[0].stack_grade)) {
      qbs[0].stack_role = 'QB Core';
    }

    // WR1 Anchor = top WR
    if (wrs[0]) wrs[0].stack_role = 'WR1 Anchor';

    // Remaining pass catchers: next 2 get WR2 Core / TE Core
    const remaining = [...wrs.slice(1), ...tes].sort((a, b) => b.value_score - a.value_score);
    remaining.forEach((p, i) => {
      if (i < 2) {
        p.stack_role = p.position === 'TE' ? 'TE Core' : 'WR2 Core';
      } else if (p.value_score > 0) {
        p.stack_role = 'Flex Option';
      }
    });

    // RBs with value and decent grade get Flex Option
    rbs.forEach(rb => {
      if (rb.value_score > 0 && ['A+', 'A', 'B'].includes(rb.stack_grade)) {
        rb.stack_role = 'Flex Option';
      }
    });

    // Helper: top N pass catchers by value_score, optionally excluding one player
    const topPassCatchers = (exclude, n) =>
      [...wrs, ...tes]
        .filter(p => p.player_name !== exclude)
        .sort((a, b) => b.value_score - a.value_score)
        .slice(0, n)
        .map(p => p.player_name);

    const qbName = qbs[0] ? qbs[0].player_name : null;

    players.forEach(p => {
      if (p.position === 'QB') {
        p.best_stack_with = topPassCatchers(null, 2).join(', ');
      } else if (p.position === 'WR' || p.position === 'TE') {
        const others = topPassCatchers(p.player_name, 1);
        p.best_stack_with = [qbName, ...others].filter(Boolean).join(', ');
      } else if (p.position === 'RB') {
        if (['A+', 'A', 'B'].includes(p.stack_grade)) {
          p.best_stack_with = [qbName, wrs[0] ? wrs[0].player_name : null].filter(Boolean).join(', ');
        } else {
          p.best_stack_with = '';
        }
      }
      p.stack_strategy = computeStackStrategy(p.stack_grade, p.stack_role);
    });
  }
}

function classifyPlayerValue(valueScore) {
  // valueScore = schedule (60%) + ceiling (40%), range 0-100
  if (valueScore > 70) return "EXTREME VALUE";
  if (valueScore > 55) return "STRONG VALUE";
  if (valueScore > 40) return "FAIR VALUE";
  if (valueScore > 25) return "SLIGHT REACH";
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
  const scheduleData  = getScheduleData();

  const byPosition = { QB: [], RB: [], WR: [], TE: [] };
  mappedPlayers.forEach(p => {
    if (byPosition[p.position]) byPosition[p.position].push({ ...p });
  });

  for (const [pos, players] of Object.entries(byPosition)) {
    const n = players.length;
    if (n === 0) continue;

    const bySchedule = [...players].sort((a, b) => b.elite_game_value - a.elite_game_value);
    const byCost     = [...players].sort((a, b) => a.adp - b.adp);

    players.forEach(player => {
      const schedRank = bySchedule.findIndex(p => p.player_name === player.player_name);
      const costRank  = byCost.findIndex(p => p.player_name === player.player_name);

      player.schedule_percentile = Math.round(((n - 1 - schedRank) / (n - 1)) * 100);
      player.cost_percentile     = Math.round(((n - 1 - costRank)  / (n - 1)) * 100);
      player.round               = Math.ceil(player.adp / 12);
    });
  }

  // Variance integration: ceiling_score enriches value_score formula
  const varianceData = loadVarianceData();
  applyVarianceMetrics(byPosition, varianceData);

  // Final sort and logging after variance recalculates value_score
  for (const [pos, players] of Object.entries(byPosition)) {
    if (players.length === 0) continue;
    players.sort((a, b) => b.value_score - a.value_score);
    Logger.log(`${pos}: ${players.length} players, value_score range ${players[players.length-1].value_score} to ${players[0].value_score}`);
  }

  const percentiles = buildCeilingRatePercentiles(scheduleData);
  enrichWithStackData(byPosition, scheduleData, percentiles);

  // Convert to percentile ranks within position; raw values preserved with _raw suffix
  for (const players of Object.values(byPosition)) {
    toPercentile(players, 'elite_game_value');
    toPercentile(players, 'schedule_quality');
    toPercentile(players, 'playoff_score');
  }

  return byPosition;
}

function testTask3B() {
  try {
    const rankings = buildPlayerValueRankings();

    Logger.log("Top 5 QBs by value score:");
    rankings.QB.slice(0, 5).forEach((p, i) => {
      Logger.log(`${i+1}. ${p.player_name} (ADP ${p.adp}): score ${p.value_score} (sched ${p.schedule_percentile} - cost ${p.cost_percentile}) - ${p.value_class}`);
    });

    Logger.log("Top 5 WRs by value score:");
    rankings.WR.slice(0, 5).forEach((p, i) => {
      Logger.log(`${i+1}. ${p.player_name} (ADP ${p.adp}): score ${p.value_score} (sched ${p.schedule_percentile} - cost ${p.cost_percentile}) - ${p.value_class}`);
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
    elite_games: match.elite_games,
    strong_games: match.strong_games,
    playable_games: match.playable_games,
    elite_game_value: match.elite_game_value,
    playoff_score: match.playoff_score || 0
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
      Logger.log(`${p.player_name} (${p.position}, ADP ${p.adp}): ${p.elite_games} A+ games, value ${p.elite_game_value}`);
    });

    const sorted = [...mappedPlayers].sort((a, b) => b.elite_games - a.elite_games);
    Logger.log(`Most A+ games: ${sorted[0].player_name} (${sorted[0].position}, ${sorted[0].team}): ${sorted[0].elite_games}`);

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
  const rateField = `${position.toLowerCase()}_ceiling_rate`;
  const rates = teamSchedule.map(game => parseFloat(game[rateField]) || 0);

  return {
    total_games: rates.length,
    a_plus: rates.filter(r => r >= ELITE_THRESHOLD).length,
    a:      rates.filter(r => r >= STRONG_THRESHOLD   && r < ELITE_THRESHOLD).length,
    b:      rates.filter(r => r >= PLAYABLE_THRESHOLD && r < STRONG_THRESHOLD).length,
    c:      rates.filter(r => r >= WEAK_THRESHOLD     && r < PLAYABLE_THRESHOLD).length,
    d:      rates.filter(r => r < WEAK_THRESHOLD).length
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
  const playoffGames = teamSchedule.filter(g => {
    const w = parseInt(g.week);
    return w === 15 || w === 16 || w === 17;
  });

  for (const position of positions) {
    const gradeCounts   = countPositionGrades(teamSchedule, position);
    const eliteValue    = calculateEliteGameValue(gradeCounts);
    const playoffCounts = countPositionGrades(playoffGames, position);
    const playoffScore  = calculateEliteGameValue(playoffCounts);

    summary.push({
      team: team,
      position: position,
      total_games: gradeCounts.total_games,
      elite_games: gradeCounts.a_plus,
      strong_games: gradeCounts.a,
      playable_games: gradeCounts.b,
      c_games: gradeCounts.c,
      d_games: gradeCounts.d,
      elite_game_value: Math.round(eliteValue * 10) / 10,
      playoff_a_plus: playoffCounts.a_plus,
      playoff_a:      playoffCounts.a,
      playoff_score:  Math.round(playoffScore * 100) / 100
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
    'team', 'position', 'total_games', 'elite_games', 'strong_games',
    'playable_games', 'c_games', 'd_games', 'elite_game_value',
    'playoff_a_plus', 'playoff_a', 'playoff_score'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');

  const rows = allSummaries.map(s => [
    s.team, s.position, s.total_games, s.elite_games, s.strong_games,
    s.playable_games, s.c_games, s.d_games, s.elite_game_value,
    s.playoff_a_plus, s.playoff_a, s.playoff_score
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
      Logger.log(`${s.position}: A+=${s.elite_games}, A=${s.strong_games}, Value=${s.elite_game_value}`);
    });

    const qbSummaries = summaries.filter(s => s.position === 'QB');
    qbSummaries.sort((a, b) => b.elite_games - a.elite_games);
    Logger.log("Top 3 teams for QB A+ games:");
    qbSummaries.slice(0, 3).forEach(s => {
      Logger.log(`${s.team}: ${s.elite_games} A+ games`);
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
        qb_ceiling_rate: game.qb_ceiling_rate,
        rb_ceiling_rate: game.rb_ceiling_rate,
        wr_ceiling_rate: game.wr_ceiling_rate,
        te_ceiling_rate: game.te_ceiling_rate,
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

// ============================================================
// TASK 4B: TEAM STACK RANKINGS
// ============================================================

function buildTeamStackRankings(stacks) {
  const byTeam = {};
  getAllTeams().forEach(t => { byTeam[t] = []; });
  stacks.forEach(s => {
    if (!byTeam[s.team]) byTeam[s.team] = [];
    byTeam[s.team].push(s);
  });

  const rankings = [];

  for (const [team, teamStacks] of Object.entries(byTeam)) {
    const efficiencies = teamStacks.map(s => s.stack_efficiency);
    const best_stack_eff  = efficiencies.length > 0 ? Math.max(...efficiencies) : 0;
    const avg_stack_eff   = efficiencies.length > 0
      ? Math.round((efficiencies.reduce((sum, e) => sum + e, 0) / efficiencies.length) * 100) / 100
      : 0;
    const viable_stacks   = teamStacks.length;
    const elite_stack_count    = teamStacks.filter(s => s.stack_efficiency >= 80).length;
    const strong_stack_count   = teamStacks.filter(s => s.stack_efficiency >= 60 && s.stack_efficiency < 80).length;
    const playable_stack_count = teamStacks.filter(s => s.stack_efficiency >= 40 && s.stack_efficiency < 60).length;
    const composite_score = Math.round(((best_stack_eff * 0.4) + (avg_stack_eff * 0.4) + (Math.min(viable_stacks, 10) * 0.2)) * 100) / 100;

    let team_grade;
    if (composite_score >= 6.0)      team_grade = 'A+';
    else if (composite_score >= 4.5) team_grade = 'A';
    else if (composite_score >= 3.0) team_grade = 'B';
    else if (composite_score >= 2.0) team_grade = 'C';
    else                             team_grade = 'D';

    const recommendationMap = {
      'A+': 'Elite stacking team - multiple A+ combinations available',
      'A':  'Strong stacking team - several high-quality options',
      'B':  'Viable stacking team - good combinations available',
      'C':  'Limited stacking team - fewer quality options',
      'D':  'Weak stacking team - avoid building around this team'
    };

    rankings.push({
      team,
      best_stack_eff:  Math.round(best_stack_eff * 100) / 100,
      avg_stack_eff,
      viable_stacks,
      elite_stack_count,
      strong_stack_count,
      playable_stack_count,
      composite_score,
      team_grade,
      recommendation: recommendationMap[team_grade]
    });
  }

  toPercentile(rankings, 'composite_score');
  rankings.sort((a, b) => b.composite_score - a.composite_score);
  return rankings;
}

function writeTeamStackRankings() {
  const rankings = buildPlayerValueRankings();
  const stacks   = buildStackTargets(rankings);
  const teamRankings = buildTeamStackRankings(stacks);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Team_Stack_Rankings');
  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet('Team_Stack_Rankings');
  }

  const headers = [
    'rank', 'team', 'best_stack_eff', 'avg_stack_eff', 'viable_stacks',
    'elite_stack_count', 'strong_stack_count', 'playable_stack_count', 'composite_score', 'composite_score_raw'
  ];

  sheet.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight('bold')
    .setBackground('#efefef');

  const rows = teamRankings.map((t, i) => [
    i + 1,
    t.team,
    t.best_stack_eff,
    t.avg_stack_eff,
    t.viable_stacks,
    t.elite_stack_count,
    t.strong_stack_count,
    t.playable_stack_count,
    t.composite_score,
    t.composite_score_raw
  ]);

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  sheet.autoResizeColumns(1, headers.length);

  Logger.log(`Team_Stack_Rankings created: ${teamRankings.length} teams`);
  return true;
}

function testTeamStackRankings() {
  try {
    writeTeamStackRankings();

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Team_Stack_Rankings');
    if (!sheet) throw new Error('Team_Stack_Rankings sheet not created');

    const data = sheet.getDataRange().getValues();
    const numTeams = data.length - 1;

    Logger.log(
      'Team_Stack_Rankings Complete!\n' +
      `${numTeams} teams ranked (expected 32)\n` +
      `Top team: ${data[1][1]} (composite ${data[1][8]}, grade ${data[1][9]})\n` +
      `A+ stacks: ${data[1][5]}, viable stacks: ${data[1][4]}`
    );

  } catch (error) {
    Logger.log('Error: ' + error.message);
  }
}

// ============================================================
// TASK 4B: GAME SCORES REFERENCE
// ============================================================

function buildGameScores(scheduleData) {
  const { homePercentiles, awayPercentiles } = buildCeilingRatePercentiles(scheduleData);
  const rows = [];

  scheduleData.forEach(game => {
    const matchup = `${game.away_team} @ ${game.home_team}`;

    // Home team row
    rows.push({
      week:       game.week,
      game_id:    game.game_id,
      matchup:    matchup,
      team:       game.home_team,
      home_away:  'Home',
      venue_type: game.venue_type,
      qb_score:   homePercentiles.QB[game.game_id] || 0,
      rb_score:   homePercentiles.RB[game.game_id] || 0,
      wr_score:   homePercentiles.WR[game.game_id] || 0,
      te_score:   homePercentiles.TE[game.game_id] || 0
    });

    // Away team row
    rows.push({
      week:       game.week,
      game_id:    game.game_id,
      matchup:    matchup,
      team:       game.away_team,
      home_away:  'Away',
      venue_type: game.venue_type,
      qb_score:   awayPercentiles.QB[game.game_id] || 0,
      rb_score:   awayPercentiles.RB[game.game_id] || 0,
      wr_score:   awayPercentiles.WR[game.game_id] || 0,
      te_score:   awayPercentiles.TE[game.game_id] || 0
    });
  });

  return rows.sort((a, b) =>
    a.week !== b.week ? a.week - b.week : String(a.game_id).localeCompare(String(b.game_id))
  );
}

function writeGameScores() {
  const scheduleData = getScheduleData();
  const gameScores   = buildGameScores(scheduleData);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Game_Scores');
  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet('Game_Scores');
  }

  const headers = ['week', 'game_id', 'matchup', 'team', 'home_away', 'venue_type',
                   'qb_score', 'rb_score', 'wr_score', 'te_score'];

  sheet.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight('bold')
    .setBackground('#efefef');

  const rows = gameScores.map(g => [
    g.week, g.game_id, g.matchup, g.team, g.home_away, g.venue_type,
    g.qb_score, g.rb_score, g.wr_score, g.te_score
  ]);

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  sheet.autoResizeColumns(1, headers.length);
  sheet.setFrozenRows(1);

  Logger.log(`Game_Scores created: ${gameScores.length} games`);
  return true;
}

function testGameScores() {
  try {
    writeGameScores();

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Game_Scores');
    if (!sheet) throw new Error('Game_Scores sheet not created');

    const data = sheet.getDataRange().getValues();
    const numGames = data.length - 1;

    Logger.log(
      'Game_Scores Complete!\n' +
      `${numGames} rows (expected 544 = 272 games × 2 teams)\n` +
      `Sample: ${data[1][2]} ${data[1][3]} (${data[1][4]}) - QB ${data[1][6]}, RB ${data[1][7]}, WR ${data[1][8]}, TE ${data[1][9]}`
    );

  } catch (error) {
    Logger.log('Error: ' + error.message);
  }
}

// ============================================================
// TASK 5A: DRAFT STRATEGY TIERS
// ============================================================

function writeDraftStrategyTiers() {
  const rankings = buildPlayerValueRankings();

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Draft_Strategy_Tiers');
  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet('Draft_Strategy_Tiers');
  }

  const headers = [
    'round', 'position', 'player_name', 'team', 'adp',
    'value_score', 'schedule_quality', 'playoff_score', 'elite_games', 'best_stack_with'
  ];

  sheet.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight('bold')
    .setBackground('#efefef');

  const allPlayers = Object.values(rankings).flat();
  allPlayers.sort((a, b) => {
    if (a.round !== b.round) return a.round - b.round;
    return b.value_score - a.value_score;
  });

  const rows = allPlayers.map(p => [
    p.round,
    p.position,
    p.player_name,
    p.team,
    p.adp,
    p.value_score,
    p.schedule_quality,
    p.playoff_score != null ? p.playoff_score : 0,
    p.elite_games,
    p.best_stack_with || ''
  ]);

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);

  Logger.log(`Draft_Strategy_Tiers created: ${rows.length} players`);
  return true;
}

// ============================================================
// TASK 5B: FINAL VALIDATION AND QA
// ============================================================

function validateModule7Complete() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const results = { tests: [], passed: 0, failed: 0 };

  function check(name, fn) {
    try {
      const detail = fn();
      const passed = detail.passed;
      results.tests.push({ name, passed, details: detail.details });
      passed ? results.passed++ : results.failed++;
    } catch (e) {
      results.tests.push({ name, passed: false, details: e.message });
      results.failed++;
    }
  }

  // Test 1: Team_Schedule_Summary — 160 rows (32 teams × 5 positions)
  check('Team_Schedule_Summary: 160 rows', () => {
    const data = getTeamSummaryData();
    return { passed: data.length === 160, details: `Rows: ${data.length} (expected 160)` };
  });

  // Test 2: Position_Value_Rankings sheet exists
  check('Position_Value_Rankings exists', () => {
    const exists = ss.getSheetByName('Position_Value_Rankings') !== null;
    return { passed: exists, details: exists ? 'Sheet created' : 'Sheet missing' };
  });

  // Test 3: Player counts in expected ranges
  check('Player counts in range', () => {
    const r = buildPlayerValueRankings();
    const c = { QB: r.QB.length, RB: r.RB.length, WR: r.WR.length, TE: r.TE.length };
    const ok = c.QB >= 30 && c.QB <= 35 &&
               c.RB >= 60 && c.RB <= 70 &&
               c.WR >= 95 && c.WR <= 105 &&
               c.TE >= 30 && c.TE <= 35;
    return { passed: ok, details: `QB:${c.QB} RB:${c.RB} WR:${c.WR} TE:${c.TE}` };
  });

  // Test 4: LAR WRs have 8+ elite (A+) games
  check('LAR WRs have elite schedule (8+ A+ games)', () => {
    const summary = getTeamSummaryData();
    const larWR = summary.find(s => s.team === 'LAR' && s.position === 'WR');
    const count = larWR ? larWR.elite_games : 0;
    return { passed: count >= 8, details: `LAR WR A+ games: ${count} (expected >= 8)` };
  });

  // Test 5: Stack_Targets sheet exists and has rows
  check('Stack_Targets exists with stacks', () => {
    const sheet = ss.getSheetByName('Stack_Targets');
    if (!sheet) return { passed: false, details: 'Sheet missing' };
    const rows = sheet.getLastRow() - 1;
    return { passed: rows > 0, details: `${rows} stacks` };
  });

  // Test 6: Team_Stack_Rankings — 32 teams
  check('Team_Stack_Rankings: 32 teams', () => {
    const sheet = ss.getSheetByName('Team_Stack_Rankings');
    if (!sheet) return { passed: false, details: 'Sheet missing' };
    const rows = sheet.getLastRow() - 1;
    return { passed: rows === 32, details: `Rows: ${rows} (expected 32)` };
  });

  // Test 7: Game_Scores — 544 rows
  check('Game_Scores: 544 rows', () => {
    const sheet = ss.getSheetByName('Game_Scores');
    if (!sheet) return { passed: false, details: 'Sheet missing' };
    const rows = sheet.getLastRow() - 1;
    return { passed: rows === 544, details: `Rows: ${rows} (expected 544)` };
  });

  // Test 8: Draft_Strategy_Tiers exists
  check('Draft_Strategy_Tiers exists', () => {
    const exists = ss.getSheetByName('Draft_Strategy_Tiers') !== null;
    return { passed: exists, details: exists ? 'Sheet created' : 'Sheet missing' };
  });

  return results;
}

function testTask5B() {
  const results = validateModule7Complete();

  let message = 'MODULE 7 VALIDATION\n\n';
  message += `Tests passed: ${results.passed}\n`;
  message += `Tests failed: ${results.failed}\n\n`;
  message += 'Details:\n';

  results.tests.forEach(t => {
    const status = t.passed ? 'PASS' : 'FAIL';
    message += `[${status}] ${t.name}\n`;
    if (!t.passed) message += `      ${t.details}\n`;
  });

  Logger.log(message);

  if (results.failed === 0) {
    Logger.log(
      'MODULE 7 COMPLETE! All ' + results.passed + ' tests passed.\n' +
      'Sheets: Team_Schedule_Summary, Position_Value_Rankings, Stack_Targets,\n' +
      '        Team_Stack_Rankings, Game_Scores, Draft_Strategy_Tiers'
    );
  } else {
    Logger.log(`VALIDATION FAILED: ${results.failed} test(s) failed. Check details above.`);
  }
}

// ============================================================
// MODULE 7 ENHANCEMENT: VARIANCE INTEGRATION
// ============================================================

function loadVarianceData() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('NFL_Dashboard');

  if (!sheet) {
    Logger.log('NFL_Dashboard sheet not found — variance metrics will use position baselines');
    return [];
  }

  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows    = data.slice(1);

  return rows.map(row => {
    const record = {};
    headers.forEach((h, i) => { record[h] = row[i]; });
    return record;
  }).filter(r => r['Player'] && r['Position']);
}

function normalizePlayerName(name) {
  if (!name) return '';
  return String(name)
    .replace(/\b(Jr\.?|Sr\.?|II|III|IV|V)\b/gi, '')
    .replace(/['.,-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function matchVarianceRecord(player, varianceData) {
  const needle = normalizePlayerName(player.player_name);
  const pos    = player.position;

  // Exact normalized name + position match first
  let match = varianceData.find(r =>
    normalizePlayerName(r['Player']) === needle && r['Position'] === pos
  );
  if (match) return match;

  // Name-only fallback (handles position label differences)
  match = varianceData.find(r => normalizePlayerName(r['Player']) === needle);
  if (match) return match;

  // Log failed match with enough context to diagnose: normalized needle vs
  // the closest variance name (first token match) so we can spot truncations,
  // suffixes, or alternate spellings.
  const firstToken = needle.split(' ')[0];
  const candidates = varianceData
    .filter(r => normalizePlayerName(r['Player']).startsWith(firstToken))
    .map(r => `"${r['Player']}" (${r['Position']})`);
  Logger.log(
    `No variance match: "${player.player_name}" → normalized "${needle}" (${pos}, ${player.team})` +
    (candidates.length ? `  | first-name candidates: ${candidates.join(', ')}` : '  | no first-name candidates in variance data')
  );

  return null;
}

function classifyPlayerType(ceilingRate, volatility) {
  if (ceilingRate > 30 && volatility > 60)  return 'Boom/Bust';
  if (ceilingRate > 30 && volatility >= 40) return 'Ceiling Play';
  if (ceilingRate >= 20 && volatility < 40) return 'Stable';
  return 'Low Ceiling';
}

function applyVarianceMetrics(byPosition, varianceData) {
  // Position baselines used when no variance record found
  const posBaseline = {
    QB: { ceiling_rate: 25, volatility: 45, l6_ceiling: 25 },
    RB: { ceiling_rate: 18, volatility: 55, l6_ceiling: 18 },
    WR: { ceiling_rate: 20, volatility: 58, l6_ceiling: 20 },
    TE: { ceiling_rate: 15, volatility: 50, l6_ceiling: 15 }
  };

  for (const [pos, players] of Object.entries(byPosition)) {
    if (players.length === 0) continue;

    // Attach raw variance fields
    players.forEach(p => {
      const rec = matchVarianceRecord(p, varianceData);
      if (rec) {
        // Spreadsheet stores values as decimals (0-1) or percentages (0-100).
        // Normalize to percentage scale for ceiling_score formula.
        const toPercent = v => {
          const n = parseFloat(v) || 0;
          return n <= 1 ? n * 100 : n;
        };
        p.ceiling_rate = toPercent(rec['Season 4x']);
        p.volatility   = toPercent(rec['Season CV%']);
        p.l6_ceiling   = toPercent(rec['L6 4x']);
        p.variance_matched = true;
      } else {
        p.ceiling_rate = null;
        p.volatility   = null;
        p.l6_ceiling   = null;
        p.variance_matched = false;
      }
    });

    // ceiling_score: percentile rank of ceiling_rate among matched players only
    const matched = players.filter(p => p.variance_matched);
    const sortedMatched = [...matched].sort((a, b) => (a.ceiling_rate || 0) - (b.ceiling_rate || 0));
    const nm = sortedMatched.length;
    sortedMatched.forEach((p, rank) => {
      p.ceiling_score = nm > 1 ? Math.round((rank / (nm - 1)) * 100) : 50;
    });
    players.filter(p => !p.variance_matched).forEach(p => { p.ceiling_score = null; });

    // value_score: matched players use schedule 60% + ceiling 40%
    //              unmatched use schedule 100% (ceiling_score excluded to prevent ADP tiebreaking)
    players.forEach(p => {
      p.value_score = p.variance_matched
        ? Math.round((p.schedule_percentile * 0.6) + (p.ceiling_score * 0.4))
        : p.schedule_percentile;
      p.value_class    = classifyPlayerValue(p.value_score);
      p.recommendation = generateRecommendation(p.value_class, p.elite_games);
    });
  }

  const matched = Object.values(byPosition).flat().filter(p => p.variance_matched).length;
  const total   = Object.values(byPosition).flat().length;
  Logger.log(`Variance match rate: ${matched}/${total} players (${Math.round(matched/total*100)}%)`);
}

function testVarianceIntegration() {
  try {
    const varData  = loadVarianceData();
    const rankings = buildPlayerValueRankings();

    Logger.log(`NFL_Dashboard rows loaded: ${varData.length}`);

    const allPlayers = Object.values(rankings).flat();
    const matched    = allPlayers.filter(p => p.variance_matched).length;
    Logger.log(`Variance match rate: ${matched}/${allPlayers.length}`);

    // Spot-check top QB
    const qb1 = rankings.QB[0];
    Logger.log(`Top QB: ${qb1.player_name} — value_score ${qb1.value_score}, ceiling_rate ${qb1.ceiling_rate}%, ceiling_score ${qb1.ceiling_score}, type: ${qb1.player_type}`);

    // Show player type distribution
    const typeCounts = {};
    allPlayers.forEach(p => { typeCounts[p.player_type] = (typeCounts[p.player_type] || 0) + 1; });
    Logger.log('Player type distribution: ' + JSON.stringify(typeCounts));

    // EXTREME VALUE count by position
    const extreme = {};
    for (const [pos, players] of Object.entries(rankings)) {
      extreme[pos] = players.filter(p => p.value_class === 'EXTREME VALUE').length;
    }
    Logger.log('EXTREME VALUE counts: ' + JSON.stringify(extreme));

  } catch (error) {
    Logger.log('Error: ' + error.message);
  }
}
