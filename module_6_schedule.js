// Module 6: Schedule Processing - v2.0
// Position-specific grading, 24-scenario environment lookup, 47-column output
// onOpen is defined in module_7_bestball.gs to avoid duplicate function conflict

function openQATest() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("QA_Test");
  if (sheet) {
    ss.setActiveSheet(sheet);
  } else {
    SpreadsheetApp.getUi().alert("QA_Test sheet not found. Run 'Process Schedule' first.");
  }
}

function processSchedule() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const scheduleSheet    = ss.getSheetByName("Schedule");
  const teamsSheet       = ss.getSheetByName("Teams");
  const envCombSheet     = ss.getSheetByName("Environment_Combinations");
  const posMultSheet     = ss.getSheetByName("Position_Multipliers");

  if (!scheduleSheet)  throw new Error("Schedule sheet not found");
  if (!teamsSheet)     throw new Error("Teams sheet not found");
  if (!envCombSheet)   throw new Error("Environment_Combinations sheet not found — create it first");
  if (!posMultSheet)   throw new Error("Position_Multipliers sheet not found — create it first");

  const scheduleData  = getSheetData(scheduleSheet);
  const teamsData     = getSheetData(teamsSheet);
  const envCombData   = getSheetData(envCombSheet);
  const posMultData   = getSheetData(posMultSheet);

  const processedGames = [];

  for (let i = 0; i < scheduleData.length; i++) {
    const game = scheduleData[i];

    // Skip bye weeks, blank rows, and PFR separator rows
    const winner = String(game["Winner/tie"] || "").trim();
    const loser  = String(game["Loser/tie"]  || "").trim();
    if (!winner || !loser) continue;

    const homeAway  = parseHomeAway(game);
    const homeTeam  = lookupTeamAbbr(homeAway.home, teamsData, i + 2);
    const awayTeam  = lookupTeamAbbr(homeAway.away, teamsData, i + 2);
    const venue     = lookupVenue(homeTeam, teamsData);
    const primetime = flagPrimetime(game.Day, game.Time);
    const isDivision = flagDivision(homeTeam, awayTeam, teamsData);
    const weekTier  = assignWeekTier(game.Week);

    // Build 24-scenario environment key and lookup base rate
    const envKey  = buildEnvironmentKey(venue.venue_type, "Home", primetime.is_primetime, weekTier);
    const envData = lookupEnvironmentCombination(envKey, envCombData);

    // Division outdoor games take a ceiling penalty before position calculations
    const baseRate = (isDivision && venue.venue_type === "Outdoor")
      ? envData.rate * 0.92
      : envData.rate;

    // Position-specific rates, grades, and recommendations
    const posRates = calculatePositionRates(baseRate, venue.venue_type, primetime.is_primetime, posMultData);
    const positions = ['QB', 'RB', 'WR', 'TE', 'DST'];
    const posGrades = {}, posRecs = {};
    for (const pos of positions) {
      posGrades[pos] = assignPositionGrade(posRates[pos]);
      posRecs[pos]   = assignRecommendation(posRates[pos]);
    }

    // Stack analysis
    const stackReqs  = determineStackRequirements(envData.rate);
    const onslaught  = checkOnslaughtEligible(envData.rate, venue.venue_type, primetime.is_primetime);
    const corrNotes  = generateCorrelationNotes(envData.rate, venue.venue_type);

    // Game classification
    const gameType    = classifyGameType(posRates.QB, posRates.RB, posRates.DST);
    const overallTier = determineOverallTier(posGrades);
    const bbPriority  = (overallTier === "A+" || overallTier === "A") ? "High"
                      : (overallTier === "B") ? "Med" : "Low";

    processedGames.push({
      // Base schedule (8)
      week:         game.Week,
      game_date:    game.Date,
      game_time:    standardizeTime(game.Time),
      day_of_week:  game.Day,
      home_team:    homeTeam,
      away_team:    awayTeam,
      network:      determineNetwork(game.Day, game.Time),
      game_id:      `2026_W${String(game.Week).padStart(2, '0')}_${awayTeam}_${homeTeam}`,

      // Enrichment (6)
      venue_name:     venue.stadium,
      venue_type:     venue.venue_type,
      is_primetime:   primetime.is_primetime,
      primetime_slot: primetime.slot,
      is_division:    isDivision,
      week_tier:      weekTier,

      // Vegas (9) — blank until lines available
      total: "", spread: "", home_moneyline: "", away_moneyline: "",
      favorite_team: "", underdog_team: "", vegas_bucket: "",
      home_itt: "", away_itt: "",

      // Environment context (3)
      environment_key:  envKey,
      environment_rate: envData.rate,
      environment_rank: envData.rank,

      // Position grades (15)
      qb_grade:  posGrades.QB,  qb_ceiling_rate:  posRates.QB,  qb_recommendation:  posRecs.QB,
      rb_grade:  posGrades.RB,  rb_ceiling_rate:  posRates.RB,  rb_recommendation:  posRecs.RB,
      wr_grade:  posGrades.WR,  wr_ceiling_rate:  posRates.WR,  wr_recommendation:  posRecs.WR,
      te_grade:  posGrades.TE,  te_ceiling_rate:  posRates.TE,  te_recommendation:  posRecs.TE,
      dst_grade: posGrades.DST, dst_ceiling_rate: posRates.DST, dst_recommendation: posRecs.DST,

      // Stack analysis (3)
      stack_requirements: stackReqs,
      onslaught_eligible: onslaught,
      correlation_notes:  corrNotes,

      // Game classification (3)
      overall_tier: overallTier,
      game_type:    gameType,
      bb_priority:  bbPriority
    });
  }

  writeScheduleEnriched(ss, processedGames);
  generateQATest(ss, scheduleData, processedGames, teamsData);

  SpreadsheetApp.getUi().alert(
    "Schedule processing complete!\n\n" +
    `Processed ${processedGames.length} games\n` +
    "Check Schedule_Enriched (47 cols) and QA_Test (10 sections)"
  );
}

// ---------------------------------------------------------------------------
// Data access

function getSheetData(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length === 0) throw new Error(`Sheet ${sheet.getName()} is empty`);
  const headers = values[0];
  const data = [];
  for (let i = 1; i < values.length; i++) {
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[i][j];
    }
    data.push(row);
  }
  return data;
}

// ---------------------------------------------------------------------------
// Parsing

function parseHomeAway(game) {
  const winner = game["Winner/tie"];
  const loser  = game["Loser/tie"];
  let hasAt = false;
  for (const key of Object.keys(game)) {
    if (game[key] === "@") { hasAt = true; break; }
  }
  return hasAt ? { home: loser, away: winner } : { home: winner, away: loser };
}

function parseTimeHour(time) {
  if (!time) return 0;
  // Google Sheets parses CSV time cells as Date objects
  if (time instanceof Date) return time.getHours() + time.getMinutes() / 60;
  const parts = String(time).match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!parts) return 0;
  let hour = parseInt(parts[1]);
  const minute = parseInt(parts[2]);
  const meridiem = parts[3].toUpperCase();
  if (meridiem === "PM" && hour !== 12) hour += 12;
  else if (meridiem === "AM" && hour === 12) hour = 0;
  return hour + minute / 60;
}

function standardizeTime(time) {
  if (!time) return "";
  // Google Sheets parses CSV time cells as Date objects
  if (time instanceof Date) {
    return `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
  }
  const parts = String(time).match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!parts) return String(time);
  let hour = parseInt(parts[1]);
  const minute = parts[2];
  const meridiem = parts[3].toUpperCase();
  if (meridiem === "PM" && hour !== 12) hour += 12;
  else if (meridiem === "AM" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${minute}`;
}

// ---------------------------------------------------------------------------
// Lookups

function lookupTeamAbbr(fullName, teamsData, rowNum) {
  const team = teamsData.find(t => t.team_name === fullName);
  if (!team) {
    const rowInfo = rowNum ? ` (Schedule row ${rowNum})` : "";
    throw new Error(`Team not found in Teams sheet: "${fullName}"${rowInfo}\nCheck that Teams.team_name matches the PFR spelling exactly.`);
  }
  return team.team_abbr;
}

function lookupVenue(teamAbbr, teamsData) {
  const team = teamsData.find(t => t.team_abbr === teamAbbr);
  if (!team) throw new Error(`Team not found: ${teamAbbr}`);
  return { stadium: team.stadium, venue_type: team.venue_type };
}

// ---------------------------------------------------------------------------
// Flags

function flagPrimetime(day, time) {
  const hour = parseTimeHour(time);
  const isPrimetimeHour = hour >= 20 && hour <= 20.5;
  if (day === "Thu" && isPrimetimeHour) return { is_primetime: true, slot: "TNF" };
  if (day === "Sun" && isPrimetimeHour) return { is_primetime: true, slot: "SNF" };
  if (day === "Mon" && isPrimetimeHour) return { is_primetime: true, slot: "MNF" };
  return { is_primetime: false, slot: "" };
}

function flagDivision(team1Abbr, team2Abbr, teamsData) {
  const team1 = teamsData.find(t => t.team_abbr === team1Abbr);
  const team2 = teamsData.find(t => t.team_abbr === team2Abbr);
  if (!team1 || !team2) throw new Error(`Team not found: ${team1Abbr} or ${team2Abbr}`);
  return team1.division === team2.division;
}

function assignWeekTier(week) {
  const w = parseInt(week);
  if (w >= 1  && w <= 4)  return "Early";
  if (w >= 5  && w <= 12) return "Mid";
  if (w >= 13 && w <= 18) return "Late";
  throw new Error(`Invalid week number: ${week}`);
}

function determineNetwork(day, time) {
  const hour = parseTimeHour(time);
  if (day === "Thu" && hour >= 20) return "Prime";
  if (day === "Sun" && hour >= 20) return "NBC";
  if (day === "Mon" && hour >= 20) return "ESPN";
  if (day === "Sun") return "CBS/FOX";
  return "";
}

// ---------------------------------------------------------------------------
// Environment

function buildEnvironmentKey(venue, homeAway, isPrimetime, weekTier) {
  return `${venue}_${homeAway}_${isPrimetime ? "Prime" : "Day"}_${weekTier}`;
}

function lookupEnvironmentCombination(envKey, envCombData) {
  const match = envCombData.find(row => row.environment_key === envKey);
  if (!match) throw new Error(`Environment combination not found: ${envKey}`);
  return {
    rate:   Number(match.ceiling_rate),
    rank:   Number(match.rank),
    sample: Number(match.sample_size)
  };
}

// ---------------------------------------------------------------------------
// Position rates and grading

function calculatePositionRates(baseRate, venue, isPrimetime, posMultData) {
  const positions = ['QB', 'RB', 'WR', 'TE', 'DST'];
  const rates = {};
  for (const pos of positions) {
    let rate = baseRate;
    if (venue === "Dome")  rate *= getMultiplier(pos, 'venue',     'Dome', posMultData);
    if (isPrimetime)       rate *= getMultiplier(pos, 'primetime', 'TRUE', posMultData);
    rates[pos] = Math.round(rate * 1000) / 1000;
  }
  return rates;
}

function getMultiplier(position, factor, value, posMultData) {
  const match = posMultData.find(row =>
    row.position === position &&
    row.factor   === factor   &&
    String(row.value) === String(value)
  );
  return match ? Number(match.multiplier) : 1.00;
}

function assignPositionGrade(rate) {
  if (rate >= 0.40) return "A+";
  if (rate >= 0.32) return "A";
  if (rate >= 0.24) return "B";
  if (rate >= 0.18) return "C";
  return "D";
}

function assignRecommendation(rate) {
  if (rate >= 0.40) return "ELITE";
  if (rate >= 0.32) return "STRONG";
  if (rate >= 0.24) return "PLAYABLE";
  if (rate >= 0.18) return "WEAK";
  return "AVOID";
}

// ---------------------------------------------------------------------------
// Stack analysis

function determineStackRequirements(envRate) {
  const reqs = ["QB+2PC_REQUIRED"];
  if (envRate >= 0.30)      reqs.push("BRING_BACK_MANDATORY");
  else if (envRate >= 0.24) reqs.push("BRING_BACK_RECOMMENDED");
  else                      reqs.push("BRING_BACK_OPTIONAL");
  return reqs.join(",");
}

function checkOnslaughtEligible(envRate, venue, isPrimetime) {
  return (envRate >= 0.28) && (venue === "Dome" || isPrimetime);
}

function generateCorrelationNotes(envRate, venue) {
  const notes = [];
  if (envRate >= 0.32) notes.push("Opposing_WR_130%");
  notes.push(venue === "Dome" ? "Dome_Pass_Heavy" : "Outdoor_QB+RB_73%");
  return notes.join(";");
}

// ---------------------------------------------------------------------------
// Game classification

function classifyGameType(qbRate, rbRate, dstRate) {
  if (qbRate >= 0.40 && dstRate < 0.20) return "Shootout";
  if (rbRate >= 0.28 && qbRate < 0.25)  return "Grind";
  if (dstRate >= 0.35)                   return "Blowout";
  return "Competitive";
}

function determineOverallTier(posGrades) {
  for (const tier of ["A+", "A", "B", "C", "D"]) {
    if (Object.values(posGrades).includes(tier)) return tier;
  }
  return "D";
}

// ---------------------------------------------------------------------------
// Output: Schedule_Enriched (47 columns)

function writeScheduleEnriched(ss, games) {
  let sheet = ss.getSheetByName("Schedule_Enriched");
  if (!sheet) {
    sheet = ss.insertSheet("Schedule_Enriched");
  } else {
    sheet.clear();
  }

  const headers = [
    // Base schedule (8)
    "week", "game_date", "game_time", "day_of_week",
    "home_team", "away_team", "network", "game_id",
    // Enrichment (6)
    "venue_name", "venue_type", "is_primetime",
    "primetime_slot", "is_division", "week_tier",
    // Vegas (9)
    "total", "spread", "home_moneyline", "away_moneyline",
    "favorite_team", "underdog_team", "vegas_bucket",
    "home_itt", "away_itt",
    // Environment context (3)
    "environment_key", "environment_rate", "environment_rank",
    // Position grades (15)
    "qb_grade",  "qb_ceiling_rate",  "qb_recommendation",
    "rb_grade",  "rb_ceiling_rate",  "rb_recommendation",
    "wr_grade",  "wr_ceiling_rate",  "wr_recommendation",
    "te_grade",  "te_ceiling_rate",  "te_recommendation",
    "dst_grade", "dst_ceiling_rate", "dst_recommendation",
    // Stack analysis (3)
    "stack_requirements", "onslaught_eligible", "correlation_notes",
    // Game classification (3)
    "overall_tier", "game_type", "bb_priority"
  ];
  // Total: 47 columns

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");

  if (games.length > 0) {
    const rows = games.map(game => headers.map(h => game[h]));
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}

// ---------------------------------------------------------------------------
// Output: QA_Test (10 sections)

function generateQATest(ss, originalData, processedGames, teamsData) {
  let sheet = ss.getSheetByName("QA_Test");
  if (!sheet) {
    sheet = ss.insertSheet("QA_Test");
  } else {
    sheet.clear();
  }

  // Pre-sort top 10 by environment rate — reused across sections 6, 8, 9, 10
  const top10 = processedGames.slice()
    .sort((a, b) => b.environment_rate - a.environment_rate)
    .slice(0, 10);

  let row = 1;

  // ── Section 1: Sample Game Transformations ─────────────────────────────
  sheet.getRange(row, 1).setValue("[ SAMPLE GAME TRANSFORMATIONS ]").setFontWeight("bold");
  row += 2;
  sheet.getRange(row, 1, 1, 7).setValues([[
    "Week", "Home Team", "Away Team", "Venue Type", "Is Division", "Env Key", "Overall Tier"
  ]]).setFontWeight("bold");
  row++;
  for (const game of processedGames.slice(0, 10)) {
    sheet.getRange(row, 1, 1, 7).setValues([[
      game.week, game.home_team, game.away_team,
      game.venue_type, game.is_division ? "YES" : "NO",
      game.environment_key, game.overall_tier
    ]]);
    row++;
  }
  row += 2;

  // ── Section 2: Team Name Mappings ─────────────────────────────────────
  sheet.getRange(row, 1).setValue("[ TEAM NAME MAPPINGS ]").setFontWeight("bold");
  row += 2;
  sheet.getRange(row, 1, 1, 3).setValues([["Full Name", "→ Abbreviation", "Stadium"]]).setFontWeight("bold");
  row++;
  for (const team of teamsData) {
    sheet.getRange(row, 1, 1, 3).setValues([[team.team_name, team.team_abbr, team.stadium]]);
    row++;
  }
  row += 2;

  // ── Section 3: Dome vs Outdoor ────────────────────────────────────────
  sheet.getRange(row, 1).setValue("[ DOME VS OUTDOOR TEAMS ]").setFontWeight("bold");
  row += 2;
  const domeTeams    = teamsData.filter(t => t.venue_type === "Dome");
  const outdoorTeams = teamsData.filter(t => t.venue_type === "Outdoor");
  sheet.getRange(row, 1).setValue(`Dome Teams (${domeTeams.length}):`).setFontWeight("bold");
  row++;
  sheet.getRange(row, 1).setValue(domeTeams.map(t => t.team_abbr).join(", "));
  row += 2;
  sheet.getRange(row, 1).setValue(`Outdoor Teams (${outdoorTeams.length}):`).setFontWeight("bold");
  row++;
  sheet.getRange(row, 1).setValue(outdoorTeams.map(t => t.team_abbr).join(", "));
  row += 2;

  // ── Section 4: Division Matchups ──────────────────────────────────────
  sheet.getRange(row, 1).setValue("[ SAMPLE DIVISION MATCHUPS ]").setFontWeight("bold");
  row += 2;
  sheet.getRange(row, 1, 1, 4).setValues([["Week", "Matchup", "Division", "Venue Type"]]).setFontWeight("bold");
  row++;
  for (const game of processedGames.filter(g => g.is_division).slice(0, 10)) {
    const homeTeamData = teamsData.find(t => t.team_abbr === game.home_team);
    sheet.getRange(row, 1, 1, 4).setValues([[
      game.week, `${game.away_team} @ ${game.home_team}`,
      homeTeamData ? homeTeamData.division : "", game.venue_type
    ]]);
    row++;
  }
  row += 2;

  // ── Section 5: Primetime Games ────────────────────────────────────────
  sheet.getRange(row, 1).setValue("[ PRIMETIME GAMES ]").setFontWeight("bold");
  row += 2;
  sheet.getRange(row, 1, 1, 5).setValues([["Week", "Day", "Time", "Matchup", "Slot"]]).setFontWeight("bold");
  row++;
  for (const game of processedGames.filter(g => g.is_primetime).slice(0, 10)) {
    sheet.getRange(row, 1, 1, 5).setValues([[
      game.week, game.day_of_week, game.game_time,
      `${game.away_team} @ ${game.home_team}`, game.primetime_slot
    ]]);
    row++;
  }
  row += 2;

  // ── Section 6: Top 10 by Environment Rate ─────────────────────────────
  sheet.getRange(row, 1).setValue("[ TOP 10 GAMES (Environment Rate) ]").setFontWeight("bold");
  row += 2;
  sheet.getRange(row, 1, 1, 6).setValues([[
    "Week", "Matchup", "Env Key", "Env Rate", "Env Rank", "Overall Tier"
  ]]).setFontWeight("bold");
  row++;
  for (const game of top10) {
    sheet.getRange(row, 1, 1, 6).setValues([[
      game.week, `${game.away_team} @ ${game.home_team}`,
      game.environment_key, game.environment_rate,
      game.environment_rank, game.overall_tier
    ]]);
    row++;
  }
  row += 2;

  // ── Section 7: Overall Tier Distribution ──────────────────────────────
  sheet.getRange(row, 1).setValue("[ OVERALL TIER DISTRIBUTION ]").setFontWeight("bold");
  row += 2;
  sheet.getRange(row, 1, 1, 2).setValues([["Tier", "Count"]]).setFontWeight("bold");
  row++;
  for (const tier of ["A+", "A", "B", "C", "D"]) {
    sheet.getRange(row, 1, 1, 2).setValues([[
      tier, processedGames.filter(g => g.overall_tier === tier).length
    ]]);
    row++;
  }
  row += 2;

  // ── Section 8: Position-Specific Grades (Top 10) ──────────────────────
  sheet.getRange(row, 1).setValue("[ POSITION-SPECIFIC GRADES (Top 10 by Env Rate) ]").setFontWeight("bold");
  row += 2;
  sheet.getRange(row, 1, 1, 8).setValues([[
    "Week", "Matchup", "Env Rate", "QB", "RB", "WR", "TE", "DST"
  ]]).setFontWeight("bold");
  row++;
  for (const game of top10) {
    sheet.getRange(row, 1, 1, 8).setValues([[
      game.week, `${game.away_team} @ ${game.home_team}`,
      game.environment_rate,
      game.qb_grade, game.rb_grade, game.wr_grade, game.te_grade, game.dst_grade
    ]]);
    row++;
  }
  row += 2;

  // ── Section 9: Stack Requirements (Top 10) ────────────────────────────
  sheet.getRange(row, 1).setValue("[ STACK REQUIREMENTS (Top 10 by Env Rate) ]").setFontWeight("bold");
  row += 2;
  sheet.getRange(row, 1, 1, 6).setValues([[
    "Week", "Matchup", "Env Rate", "Stack Requirements", "Onslaught", "Game Type"
  ]]).setFontWeight("bold");
  row++;
  for (const game of top10) {
    sheet.getRange(row, 1, 1, 6).setValues([[
      game.week, `${game.away_team} @ ${game.home_team}`,
      game.environment_rate, game.stack_requirements,
      game.onslaught_eligible ? "YES" : "NO", game.game_type
    ]]);
    row++;
  }
  row += 2;

  // ── Section 10: Correlation Insights (Top 10) ─────────────────────────
  sheet.getRange(row, 1).setValue("[ CORRELATION INSIGHTS (Top 10 by Env Rate) ]").setFontWeight("bold");
  row += 2;
  sheet.getRange(row, 1, 1, 5).setValues([[
    "Week", "Matchup", "Env Rate", "Correlation Notes", "BB Priority"
  ]]).setFontWeight("bold");
  row++;
  for (const game of top10) {
    sheet.getRange(row, 1, 1, 5).setValues([[
      game.week, `${game.away_team} @ ${game.home_team}`,
      game.environment_rate, game.correlation_notes, game.bb_priority
    ]]);
    row++;
  }

  sheet.autoResizeColumns(1, 8);
}

// ---------------------------------------------------------------------------
// MODULE 6 FIX: HOME/AWAY CEILING RATES
// Reads Vegas_Enhanced_Performances sheet (import the CSV as a sheet first)
// Adds 8 new columns to Schedule_Enriched with separate home/away rates.

function buildHomeAwayCeilingRates() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const perfSheet = ss.getSheetByName("Vegas_Enhanced_Performances");
  if (!perfSheet) {
    throw new Error(
      "Vegas_Enhanced_Performances sheet not found.\n" +
      "Please import the CSV file as a sheet in this spreadsheet first."
    );
  }

  const raw = perfSheet.getDataRange().getValues();
  if (raw.length < 2) throw new Error("Vegas_Enhanced_Performances sheet is empty.");

  const headers = raw[0].map(h => String(h).trim());
  const rows = raw.slice(1);

  const VALID_POS = ['QB', 'RB', 'WR', 'TE'];
  const MIN_SAMPLE = 5;
  const MAX_RATE   = 0.60;
  const clamp = r => Math.min(MAX_RATE, r);

  const posCol       = headers.indexOf('DK Pos');
  const venueTypeCol = headers.indexOf('Venue_Type');
  const homeAwayCol  = headers.indexOf('Home_Away');
  const primetimeCol = headers.indexOf('Primetime');
  const weekTierCol  = headers.indexOf('Week_Tier');
  const top5Col      = headers.indexOf('DK Top5 Pts');

  if ([posCol, venueTypeCol, homeAwayCol, primetimeCol, weekTierCol, top5Col].includes(-1)) {
    throw new Error(
      "Required columns not found in Vegas_Enhanced_Performances.\n" +
      "Expected: DK Pos, Venue_Type, Home_Away, Primetime, Week_Tier, DK Top5 Pts"
    );
  }

  // envPosStats: "VenueType_HomeAway_PrimetimeLabel_WeekTier|POS" -> {total, ceiling}
  const envPosStats     = {};
  // baseEnvPosStats: "VenueType_PrimetimeLabel_WeekTier|POS" -> {total, ceiling} (home+away combined)
  const baseEnvPosStats = {};
  // posStats: position -> {total, ceiling}
  const posStats        = {};

  rows.forEach(row => {
    const pos = String(row[posCol]).trim();
    if (!VALID_POS.includes(pos)) return;

    const venueType     = String(row[venueTypeCol]).trim();
    const homeAway      = String(row[homeAwayCol]).trim();
    const primetime     = String(row[primetimeCol]).trim();
    const weekTier      = String(row[weekTierCol]).trim();
    const isTop5        = String(row[top5Col]).trim().toUpperCase() === 'TRUE';
    const primetimeLabel = (primetime === 'Yes') ? 'Prime' : 'Day';

    const envKey     = `${venueType}_${homeAway}_${primetimeLabel}_${weekTier}`;
    const baseEnvKey = `${venueType}_${primetimeLabel}_${weekTier}`;
    const epKey      = `${envKey}|${pos}`;
    const bepKey     = `${baseEnvKey}|${pos}`;

    if (!envPosStats[epKey])     envPosStats[epKey]     = { total: 0, ceiling: 0 };
    if (!baseEnvPosStats[bepKey]) baseEnvPosStats[bepKey] = { total: 0, ceiling: 0 };
    if (!posStats[pos])          posStats[pos]           = { total: 0, ceiling: 0 };

    envPosStats[epKey].total++;
    baseEnvPosStats[bepKey].total++;
    posStats[pos].total++;

    if (isTop5) {
      envPosStats[epKey].ceiling++;
      baseEnvPosStats[bepKey].ceiling++;
      posStats[pos].ceiling++;
    }
  });

  // Position baselines (ultimate fallback)
  const posBaselines = {};
  VALID_POS.forEach(pos => {
    const s = posStats[pos];
    posBaselines[pos] = s ? clamp(s.ceiling / s.total) : 0.25;
  });

  // getRateForEnvPos: hard-cutoff fallback per spec.
  // Uses exact group rate if n >= MIN_SAMPLE, else combined home+away, else position baseline.
  // No minimum floor — preserves real low rates from the data.
  function getRateForEnvPos(envKey, pos) {
    const epKey = `${envKey}|${pos}`;
    const stats = envPosStats[epKey];

    if (stats && stats.total >= MIN_SAMPLE) {
      return clamp(Math.round((stats.ceiling / stats.total) * 1000) / 1000);
    }

    // Fallback 1: combined home+away for same base environment
    const parts  = envKey.split('_');
    const bepKey = `${parts[0]}_${parts[2]}_${parts[3]}|${pos}`;
    const combined = baseEnvPosStats[bepKey];

    if (combined && combined.total >= MIN_SAMPLE) {
      return clamp(Math.round((combined.ceiling / combined.total) * 1000) / 1000);
    }

    // Fallback 2: position baseline across all environments
    return clamp(posBaselines[pos]);
  }

  // Log sample summary
  const totalGroups = Object.keys(envPosStats).length;
  const smallSample = Object.values(envPosStats).filter(s => s.total < MIN_SAMPLE).length;
  Logger.log(`[buildHomeAwayCeilingRates] Groups: ${totalGroups}, small sample (<${MIN_SAMPLE}): ${smallSample}`);
  Logger.log(`[buildHomeAwayCeilingRates] Position baselines: ${JSON.stringify(posBaselines)}`);

  return { getRateForEnvPos, posBaselines, envPosStats };
}

function diagnoseCeilingRateMismatch() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Build the lookup and expose raw stats
  const { getRateForEnvPos, envPosStats } = buildHomeAwayCeilingRates();

  // ── First 5 Vegas environment keys created ──────────────────────────────
  // envPosStats keys look like "Dome_Home_Prime_Early|QB" — extract unique env keys
  const uniqueEnvKeys = [...new Set(
    Object.keys(envPosStats).map(k => k.split('|')[0])
  )].sort();

  Logger.log("First 5 Vegas keys created:");
  uniqueEnvKeys.slice(0, 5).forEach(envKey => {
    const qbRate = getRateForEnvPos(envKey, 'QB');
    Logger.log(`${envKey}: QB=${qbRate}`);
  });

  // ── First 5 QB ceiling rates (all env keys, QB position only) ──────────
  Logger.log("First 5 QB ceiling rates calculated:");
  const qbEntries = Object.entries(envPosStats)
    .filter(([k]) => k.endsWith('|QB'))
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 5);
  qbEntries.forEach(([key, stats]) => {
    const envKey = key.replace('|QB', '');
    const rate   = stats.total > 0
      ? (stats.ceiling / stats.total).toFixed(3)
      : 'no data';
    Logger.log(`${envKey}: QB=${rate} (${stats.ceiling}/${stats.total} ceiling hits)`);
  });

  // ── Schedule_Enriched sample keys for comparison ────────────────────────
  const schedSheet = ss.getSheetByName("Schedule_Enriched");
  if (schedSheet) {
    const schedData = schedSheet.getDataRange().getValues();
    const envIdx    = schedData[0].indexOf('environment_key');
    const schedKeys = new Set();
    for (let i = 1; i < Math.min(schedData.length, 10); i++) {
      if (envIdx !== -1) schedKeys.add(String(schedData[i][envIdx]).trim());
    }
    Logger.log("Schedule_Enriched sample env keys (first 5 unique):");
    [...schedKeys].slice(0, 5).forEach(k => Logger.log(`  ${k}`));
  }
}

function updateScheduleWithHomeAwayCeilingRates() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Schedule_Enriched");
  if (!sheet) throw new Error("Schedule_Enriched not found. Run Process Schedule first.");

  ss.toast("Building home/away ceiling rates from performance data…", "Module 6 Fix", -1);

  const { getRateForEnvPos } = buildHomeAwayCeilingRates();

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const envKeyIdx = headers.indexOf('environment_key');
  if (envKeyIdx === -1) throw new Error("environment_key column not found in Schedule_Enriched.");

  const NEW_COLS = [
    'home_qb_ceiling_rate', 'away_qb_ceiling_rate',
    'home_rb_ceiling_rate', 'away_rb_ceiling_rate',
    'home_wr_ceiling_rate', 'away_wr_ceiling_rate',
    'home_te_ceiling_rate', 'away_te_ceiling_rate'
  ];

  // Find or create columns; track 1-based column numbers
  const colNumbers = {};
  NEW_COLS.forEach(col => {
    const idx = headers.indexOf(col);
    if (idx !== -1) {
      colNumbers[col] = idx + 1;
    } else {
      const nextCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, nextCol).setValue(col);
      colNumbers[col] = nextCol;
      headers.push(col);
    }
  });

  // Build column data
  const numDataRows = data.length - 1;
  const colData = {};
  NEW_COLS.forEach(col => { colData[col] = []; });

  for (let i = 1; i < data.length; i++) {
    const homeEnvKey = String(data[i][envKeyIdx]).trim();
    const awayEnvKey = homeEnvKey.replace('_Home_', '_Away_');

    colData['home_qb_ceiling_rate'].push([getRateForEnvPos(homeEnvKey, 'QB')]);
    colData['away_qb_ceiling_rate'].push([getRateForEnvPos(awayEnvKey, 'QB')]);
    colData['home_rb_ceiling_rate'].push([getRateForEnvPos(homeEnvKey, 'RB')]);
    colData['away_rb_ceiling_rate'].push([getRateForEnvPos(awayEnvKey, 'RB')]);
    colData['home_wr_ceiling_rate'].push([getRateForEnvPos(homeEnvKey, 'WR')]);
    colData['away_wr_ceiling_rate'].push([getRateForEnvPos(awayEnvKey, 'WR')]);
    colData['home_te_ceiling_rate'].push([getRateForEnvPos(homeEnvKey, 'TE')]);
    colData['away_te_ceiling_rate'].push([getRateForEnvPos(awayEnvKey, 'TE')]);
  }

  // Write in batch
  NEW_COLS.forEach(col => {
    sheet.getRange(2, colNumbers[col], numDataRows, 1).setValues(colData[col]);
  });

  sheet.autoResizeColumns(1, sheet.getLastColumn());

  // Validation log: dome home vs away for a sample key
  const sampleHome = 'Dome_Home_Day_Mid';
  const sampleAway = 'Dome_Away_Day_Mid';
  ['QB', 'RB', 'WR', 'TE'].forEach(pos => {
    const h = getRateForEnvPos(sampleHome, pos);
    const a = getRateForEnvPos(sampleAway, pos);
    const diff = a > 0 ? ((h - a) / a * 100).toFixed(1) : 'N/A';
    Logger.log(`[Validation] ${pos}: Home=${h}, Away=${a}, Dome advantage=${diff}%`);
  });

  Logger.log(`[updateScheduleWithHomeAwayCeilingRates] ${numDataRows} games updated with 8 new columns.`);
  ss.toast("Done! Home/Away ceiling rates added to Schedule_Enriched.", "Module 6 Fix", 5);
}
