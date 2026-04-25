# MODULE 7: IMPLEMENTATION TRACK
**Best Ball Draft Value Analyzer - Phased Build**

**Addendum to:** MODULE_7_BEST_BALL_SPEC.md
**Approach:** Give builder ONE task at a time, validate, then proceed

---

## ⚠️ CRITICAL FIX: PERCENTILE DIFFERENCE VALUE RATING

**Problem Identified:** Original value_ratio calculation used raw ADP (pick number) as denominator, which made early picks (low numbers) appear as better value than late picks.

**First Attempted Fix (Normalized Cost Division):** Created division-by-small-number problem where late picks dominated due to tiny denominators (elite_value / 0.02 = extreme outliers).

**Final Fix (Percentile Difference):** Calculate percentile ranks for both schedule quality and draft cost, then use subtraction instead of division.

**Formula:**
```
value_percentile = percentileRank(player.elite_game_value)  // 0-100
cost_percentile = percentileRank(player.adp)                // Low ADP = high %ile
value_rating = value_percentile - cost_percentile           // -100 to +100
```

**Example:**
- **Stafford:** 80th %ile schedule, 50th %ile cost = **+30** (strong value)
- **Bijan:** 60th %ile schedule, 99th %ile cost = **-39** (expensive for schedule)
- **Late player with bad schedule:** 20th %ile schedule, 10th %ile cost = **+10** (fair)

**Thresholds:**
- \>40: EXTREME VALUE (schedule WAY better than cost)
- 20-40: STRONG VALUE
- -20 to 20: FAIR VALUE (schedule matches cost)
- -40 to -20: SLIGHT REACH
- <-40: AVOID (paying too much for schedule quality)

**Impact:** Clean, interpretable metric with no division-by-zero issues. Late picks with elite schedules correctly identified as value targets.

**Affects:** Tasks 3B, 3C, 4A, 5A - all downstream tasks using value calculations

---

## PLAYER SCOPE

- **QB:** Top 32 (all viable starters)
- **RB:** Top 64 (RB1/RB2 range)
- **WR:** Top 100 (WR1/WR2/WR3 range)
- **TE:** Top 32 (all viable starters)
- **Total:** ~228 players analyzed

---

## IMPLEMENTATION PHASES

### PHASE 1: Foundation (Data Access)
**Goal:** Read existing data, verify structure
**Time:** 20-30 minutes
**Tasks:** 1A

### PHASE 2: Team Schedule Aggregation
**Goal:** Extract and count position-specific games per team
**Time:** 45-60 minutes
**Tasks:** 2A, 2B

### PHASE 3: Player Value Analysis
**Goal:** Map ADP to schedule quality, rank players
**Time:** 60-90 minutes
**Tasks:** 3A, 3B, 3C

### PHASE 4: Stack Intelligence
**Goal:** Identify elite game stacks
**Time:** 30-45 minutes
**Tasks:** 4A

### PHASE 5: Strategy Output
**Goal:** Create draft guidance and final validation
**Time:** 30-45 minutes
**Tasks:** 5A, 5B

**Total estimated time:** 3-4 hours across 8 discrete tasks

---

# TASK 1A: DATA ACCESS AND VALIDATION

**File:** `module_7_bestball.gs`
**Time:** 20-30 minutes
**Dependencies:** None (uses existing Module 6 output)

---

## Objective

Create foundation functions to read Schedule_Enriched and Best_Ball_ADP sheets, validate structure, and prepare for analysis.

---

## Implementation

### Function 1: Read Schedule Data

```javascript
/**
 * Read Schedule_Enriched sheet
 * @returns {Array} 272 games with all 47 columns
 */
function getScheduleData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Schedule_Enriched");

  if (!sheet) {
    throw new Error("Schedule_Enriched sheet not found. Run Module 6 first.");
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);

  // Convert to array of objects
  return rows.map(row => {
    const game = {};
    headers.forEach((header, i) => {
      game[header] = row[i];
    });
    return game;
  });
}
```

---

### Function 2: Read ADP Data

```javascript
/**
 * Read Best_Ball_ADP sheet
 * @returns {Array} Player ADP data
 */
function getADPData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Best_Ball_ADP");

  if (!sheet) {
    throw new Error("Best_Ball_ADP sheet not found. Please import ADP data.");
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);

  // Convert to array of objects
  return rows.map(row => {
    const player = {};
    headers.forEach((header, i) => {
      player[header] = row[i];
    });
    return player;
  }).filter(p => p.player_name && p.adp); // Remove blank rows
}
```

---

### Function 3: Validate Data

```javascript
/**
 * Validate that required data exists and is structured correctly
 */
function validateModuleData() {
  const scheduleData = getScheduleData();
  const adpData = getADPData();

  // Validate Schedule_Enriched
  if (scheduleData.length !== 272) {
    throw new Error(`Expected 272 games, found ${scheduleData.length}`);
  }

  // Check for required position grade columns
  const requiredColumns = ['qb_grade', 'rb_grade', 'wr_grade', 'te_grade'];
  const firstGame = scheduleData[0];

  requiredColumns.forEach(col => {
    if (!(col in firstGame)) {
      throw new Error(`Missing required column: ${col}`);
    }
  });

  // Validate ADP data
  const requiredADPColumns = ['player_name', 'team', 'position', 'adp'];
  const firstPlayer = adpData[0];

  requiredADPColumns.forEach(col => {
    if (!(col in firstPlayer)) {
      throw new Error(`Missing required ADP column: ${col}`);
    }
  });

  // Count players by position
  const positionCounts = {
    QB: adpData.filter(p => p.position === 'QB').length,
    RB: adpData.filter(p => p.position === 'RB').length,
    WR: adpData.filter(p => p.position === 'WR').length,
    TE: adpData.filter(p => p.position === 'TE').length
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
```

---

### Function 4: Test Runner

```javascript
/**
 * Test function - run this to validate Task 1A
 */
function testTask1A() {
  try {
    const data = validateModuleData();

    // Show sample schedule game
    Logger.log("Sample game:");
    Logger.log(JSON.stringify(data.scheduleData[0], null, 2));

    // Show sample player
    Logger.log("Sample player:");
    Logger.log(JSON.stringify(data.adpData[0], null, 2));

    SpreadsheetApp.getUi().alert(
      "Task 1A Complete!\n\n" +
      `Schedule: ${data.scheduleData.length} games\n` +
      `Players: ${data.adpData.length}\n` +
      `QB: ${data.positionCounts.QB}\n` +
      `RB: ${data.positionCounts.RB}\n` +
      `WR: ${data.positionCounts.WR}\n` +
      `TE: ${data.positionCounts.TE}`
    );

  } catch (error) {
    SpreadsheetApp.getUi().alert("Error: " + error.message);
    Logger.log(error);
  }
}
```

---

## Acceptance Criteria

Task 1A is complete when:

- [ ] `getScheduleData()` returns 272 games
- [ ] `getADPData()` returns player data (target: 228 players)
- [ ] `validateModuleData()` runs without errors
- [ ] Position counts logged: ~32 QB, ~64 RB, ~100 WR, ~32 TE
- [ ] Sample game shows all position grade columns (qb_grade, rb_grade, etc.)
- [ ] Sample player shows required columns (player_name, team, position, adp)
- [ ] `testTask1A()` displays success alert

---

## Deliverables

- 4 new functions in module_7_bestball.gs
- Test results in execution log
- Success alert confirming data access

---

## What This Enables

- Foundation for all subsequent tasks
- Validates that Module 6 output is correct
- Verifies ADP data structure matches expectations
- Confirms player counts per position

---

**After completion:** Upload execution log and confirm task complete before proceeding to Task 2A.

---

# TASK 2A: EXTRACT TEAM SCHEDULES

**File:** `module_7_bestball.gs`
**Time:** 30 minutes
**Dependencies:** Task 1A complete

---

## Objective

For each of 32 NFL teams, extract their 17-game schedule with position-specific grades from the perspective of that team.

---

## Implementation

### Function 1: Get All NFL Teams

```javascript
/**
 * Get list of all 32 NFL teams
 * @returns {Array} Team abbreviations
 */
function getAllTeams() {
  return [
    'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE',
    'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAC', 'KC',
    'LV', 'LAC', 'LAR', 'MIA', 'MIN', 'NE', 'NO', 'NYG',
    'NYJ', 'PHI', 'PIT', 'SF', 'SEA', 'TB', 'TEN', 'WAS'
  ];
}
```

---

### Function 2: Extract Team Schedule

```javascript
/**
 * Extract 17-game schedule for a specific team
 * @param {string} team - Team abbreviation
 * @param {Array} scheduleData - Full schedule from getScheduleData()
 * @returns {Array} 17 games with position grades
 */
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

  // Sort by week
  teamGames.sort((a, b) => a.week - b.week);

  return teamGames;
}
```

---

### Function 3: Test Team Schedule Extraction

```javascript
/**
 * Test function - extract LAR schedule and validate
 */
function testTask2A() {
  try {
    const scheduleData = getScheduleData();
    const teams = getAllTeams();

    // Test with LAR (dome team with elite schedule)
    const larSchedule = extractTeamSchedule('LAR', scheduleData);

    if (larSchedule.length !== 17) {
      throw new Error(`Expected 17 games for LAR, got ${larSchedule.length}`);
    }

    // Log first 3 games
    Logger.log("LAR Schedule (first 3 games):");
    larSchedule.slice(0, 3).forEach(game => {
      Logger.log(`Week ${game.week}: vs ${game.opponent} (${game.location})`);
      Logger.log(`  QB: ${game.qb_grade}, WR: ${game.wr_grade}, RB: ${game.rb_grade}`);
    });

    // Count total games across all teams (should be 544 = 32 teams × 17 games)
    let totalGames = 0;
    teams.forEach(team => {
      const schedule = extractTeamSchedule(team, scheduleData);
      totalGames += schedule.length;
    });

    if (totalGames !== 544) {
      throw new Error(`Expected 544 total games, got ${totalGames}`);
    }

    SpreadsheetApp.getUi().alert(
      "Task 2A Complete!\n\n" +
      `LAR schedule: ${larSchedule.length} games\n` +
      `Total across all teams: ${totalGames} games\n` +
      `Check execution log for sample games`
    );

  } catch (error) {
    SpreadsheetApp.getUi().alert("Error: " + error.message);
    Logger.log(error);
  }
}
```

---

## Acceptance Criteria

Task 2A is complete when:

- [ ] `getAllTeams()` returns 32 teams
- [ ] `extractTeamSchedule('LAR', data)` returns 17 games
- [ ] Each game has all position grade fields
- [ ] Games sorted by week (1-18)
- [ ] Total games across all 32 teams = 544 (32 × 17)
- [ ] Sample LAR games show correct opponents and home/away
- [ ] `testTask2A()` displays success alert

---

## Deliverables

- 3 new functions
- Execution log showing LAR sample schedule
- Success confirmation

---

## What This Enables

- Foundation for position-specific aggregation (Task 2B)
- Ability to analyze any team's schedule
- Validation that all teams have complete schedules

---

**After completion:** Upload execution log before proceeding to Task 2B.

---

# TASK 2B: AGGREGATE POSITION STATISTICS

**File:** `module_7_bestball.gs`
**Time:** 45 minutes
**Dependencies:** Task 2A complete

---

## Objective

For each team × position combination, count grade distribution and calculate elite game value.

---

## Implementation

### Function 1: Count Position Grades

```javascript
/**
 * Count grade distribution for a specific position
 * @param {Array} teamSchedule - 17 games from extractTeamSchedule()
 * @param {string} position - 'QB', 'RB', 'WR', 'TE', 'DST'
 * @returns {Object} Grade counts
 */
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
```

---

### Function 2: Calculate Elite Game Value

```javascript
/**
 * Calculate weighted elite game value
 * @param {Object} gradeCounts - From countPositionGrades()
 * @returns {number} Weighted score
 */
function calculateEliteGameValue(gradeCounts) {
  return (
    (gradeCounts.a_plus * 1.0) +   // A+ = full value
    (gradeCounts.a * 0.6) +        // A = 60%
    (gradeCounts.b * 0.3) +        // B = 30%
    (gradeCounts.c * 0.1) +        // C = 10%
    (gradeCounts.d * 0.0)          // D = 0%
  );
}
```

---

### Function 3: Generate Team-Position Summary

```javascript
/**
 * Create complete position summary for one team
 * @param {string} team - Team abbreviation
 * @param {Array} teamSchedule - From extractTeamSchedule()
 * @returns {Array} 5 rows (one per position)
 */
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
      elite_game_value: Math.round(eliteValue * 10) / 10 // Round to 1 decimal
    });
  }

  return summary;
}
```

---

### Function 4: Build Complete Team Summary Sheet

```javascript
/**
 * Generate Team_Schedule_Summary for all 32 teams
 */
function buildTeamScheduleSummary() {
  const scheduleData = getScheduleData();
  const teams = getAllTeams();
  const allSummaries = [];

  // Process each team
  for (const team of teams) {
    const teamSchedule = extractTeamSchedule(team, scheduleData);
    const teamSummary = generateTeamPositionSummary(team, teamSchedule);
    allSummaries.push(...teamSummary); // Flatten array
  }

  // Write to new sheet
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Team_Schedule_Summary");

  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet("Team_Schedule_Summary");
  }

  // Headers
  const headers = [
    'team', 'position', 'total_games', 'a_plus_games', 'a_games',
    'b_games', 'c_games', 'd_games', 'elite_game_value'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');

  // Data rows
  const rows = allSummaries.map(s => [
    s.team, s.position, s.total_games, s.a_plus_games, s.a_games,
    s.b_games, s.c_games, s.d_games, s.elite_game_value
  ]);

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);

  // Format
  sheet.autoResizeColumns(1, headers.length);
  sheet.setFrozenRows(1);

  Logger.log(`Team_Schedule_Summary created: ${allSummaries.length} rows`);

  return allSummaries;
}
```

---

### Function 5: Test Runner

```javascript
/**
 * Test Task 2B - generate team summaries
 */
function testTask2B() {
  try {
    const summaries = buildTeamScheduleSummary();

    if (summaries.length !== 160) { // 32 teams × 5 positions
      throw new Error(`Expected 160 rows, got ${summaries.length}`);
    }

    // Find LAR summaries
    const larSummaries = summaries.filter(s => s.team === 'LAR');

    Logger.log("LAR Position Summaries:");
    larSummaries.forEach(s => {
      Logger.log(`${s.position}: A+=${s.a_plus_games}, A=${s.a_games}, Value=${s.elite_game_value}`);
    });

    // Find team with most QB A+ games
    const qbSummaries = summaries.filter(s => s.position === 'QB');
    qbSummaries.sort((a, b) => b.a_plus_games - a.a_plus_games);

    Logger.log(`\nTop 3 teams for QB A+ games:`);
    qbSummaries.slice(0, 3).forEach(s => {
      Logger.log(`${s.team}: ${s.a_plus_games} A+ games`);
    });

    SpreadsheetApp.getUi().alert(
      "Task 2B Complete!\n\n" +
      `Team_Schedule_Summary created\n` +
      `Rows: ${summaries.length} (32 teams × 5 positions)\n` +
      `Check sheet for results`
    );

  } catch (error) {
    SpreadsheetApp.getUi().alert("Error: " + error.message);
    Logger.log(error);
  }
}
```

---

## Acceptance Criteria

Task 2B is complete when:

- [ ] Team_Schedule_Summary sheet created
- [ ] 160 rows (32 teams × 5 positions)
- [ ] All teams have 17 total_games
- [ ] LAR WRs show 10+ A+ games (dome advantage)
- [ ] Outdoor teams show fewer A+ games than dome teams
- [ ] Elite game values calculated correctly (weighted)
- [ ] Sheet formatted with frozen headers
- [ ] `testTask2B()` displays success alert

---

## Deliverables

- Team_Schedule_Summary sheet (160 rows × 9 columns)
- 5 new functions
- Execution log showing LAR data and top QB teams

---

## What This Enables

- Position-specific schedule quality by team
- Foundation for player value mapping (Task 3)
- Comparison of dome vs outdoor environments

---

**After completion:** Export Team_Schedule_Summary CSV and upload before Task 3A.

---

# TASK 3A: MAP PLAYERS TO TEAM DATA

**File:** `module_7_bestball.gs`
**Time:** 30 minutes
**Dependencies:** Task 2B complete

---

## Objective

Join ADP player data to Team_Schedule_Summary to attach elite game counts to each player.

---

## Implementation

### Function 1: Get Team Summary Data

```javascript
/**
 * Read Team_Schedule_Summary sheet as structured data
 * @returns {Array} 160 rows of team × position summaries
 */
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
```

---

### Function 2: Map Player to Schedule Quality

```javascript
/**
 * Join player ADP data to team schedule quality
 * @param {Object} player - From Best_Ball_ADP
 * @param {Array} teamSummaries - From getTeamSummaryData()
 * @returns {Object} Player with schedule data attached
 */
function mapPlayerToSchedule(player, teamSummaries) {
  const match = teamSummaries.find(s =>
    s.team === player.team &&
    s.position === player.position
  );

  if (!match) {
    Logger.log(`Warning: No schedule data for ${player.player_name} (${player.team} ${player.position})`);
    return null;
  }

  return {
    player_name: player.player_name,
    team: player.team,
    position: player.position,
    adp: player.adp,
    total_games: match.total_games,
    a_plus_games: match.a_plus_games,
    a_games: match.a_games,
    b_games: match.b_games,
    elite_game_value: match.elite_game_value
  };
}
```

---

### Function 3: Filter Top Players by Position

```javascript
/**
 * Filter ADP data to top N players per position
 * @param {Array} adpData - All players from Best_Ball_ADP
 * @returns {Object} {QB: [...], RB: [...], WR: [...], TE: [...]}
 */
function filterTopPlayersByPosition(adpData) {
  const limits = {
    QB: 32,
    RB: 64,
    WR: 100,
    TE: 32
  };

  const byPosition = {
    QB: [],
    RB: [],
    WR: [],
    TE: []
  };

  // Group by position
  adpData.forEach(player => {
    if (byPosition[player.position]) {
      byPosition[player.position].push(player);
    }
  });

  // Sort each position by ADP and take top N
  for (const [pos, players] of Object.entries(byPosition)) {
    players.sort((a, b) => a.adp - b.adp);
    byPosition[pos] = players.slice(0, limits[pos]);
  }

  return byPosition;
}
```

---

### Function 4: Build Player Schedule Mapping

```javascript
/**
 * Create complete player-schedule mapping
 * @returns {Array} All players with schedule data
 */
function buildPlayerScheduleMapping() {
  const adpData = getADPData();
  const teamSummaries = getTeamSummaryData();
  const topPlayers = filterTopPlayersByPosition(adpData);

  const mappedPlayers = [];

  // Process each position
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
```

---

### Function 5: Test Runner

```javascript
/**
 * Test Task 3A - player mapping
 */
function testTask3A() {
  try {
    const mappedPlayers = buildPlayerScheduleMapping();

    // Count by position
    const counts = {
      QB: mappedPlayers.filter(p => p.position === 'QB').length,
      RB: mappedPlayers.filter(p => p.position === 'RB').length,
      WR: mappedPlayers.filter(p => p.position === 'WR').length,
      TE: mappedPlayers.filter(p => p.position === 'TE').length
    };

    // Find LAR players
    const larPlayers = mappedPlayers.filter(p => p.team === 'LAR');

    Logger.log("LAR Players with schedule data:");
    larPlayers.forEach(p => {
      Logger.log(`${p.player_name} (${p.position}, ADP ${p.adp}): ${p.a_plus_games} A+ games, ${p.elite_game_value} value`);
    });

    // Find player with most A+ games
    const sorted = [...mappedPlayers].sort((a, b) => b.a_plus_games - a.a_plus_games);
    Logger.log(`\nMost A+ games: ${sorted[0].player_name} (${sorted[0].position}, ${sorted[0].team}): ${sorted[0].a_plus_games}`);

    SpreadsheetApp.getUi().alert(
      "Task 3A Complete!\n\n" +
      `Players mapped: ${mappedPlayers.length}\n` +
      `QB: ${counts.QB}\n` +
      `RB: ${counts.RB}\n` +
      `WR: ${counts.WR}\n` +
      `TE: ${counts.TE}\n\n` +
      `Check log for LAR players`
    );

  } catch (error) {
    SpreadsheetApp.getUi().alert("Error: " + error.message);
    Logger.log(error);
  }
}
```

---

## Acceptance Criteria

Task 3A is complete when:

- [ ] `buildPlayerScheduleMapping()` returns ~228 players
- [ ] Player counts: ~32 QB, ~64 RB, ~100 WR, ~32 TE
- [ ] LAR players show 10 A+ games for WR position
- [ ] All players have elite_game_value calculated
- [ ] No null/missing matches (all players mapped)
- [ ] Execution log shows sample players
- [ ] `testTask3A()` displays success alert

---

## Deliverables

- 5 new functions
- Execution log showing LAR players and leaders
- Player mapping validation

---

## What This Enables

- Foundation for value ratio calculations (Task 3B)
- Player-level schedule quality analysis
- Position-specific elite game counts

---

**After completion:** Upload execution log before Task 3B.

---

# TASK 3B: CALCULATE VALUE RATIOS

**File:** `module_7_bestball.gs`
**Time:** 30 minutes
**Dependencies:** Task 3A complete

---

## Objective

Calculate games/ADP value ratios and classify players as EXTREME VALUE / STRONG / FAIR / AVOID.

**CRITICAL FIX:** Normalize ADP as COST (inverse scale) so early picks are expensive and late picks are cheap, like DFS salary structure.

---

## Implementation

### Function 1: Normalize ADP as Cost

```javascript
/**
 * Normalize ADP to cost scale (100 = most expensive, 0 = cheapest)
 * @param {Array} players - All mapped players
 * @returns {Array} Players with normalized_cost added
 */
function normalizeADPasCost(players) {
  // Find min and max ADP
  const adps = players.map(p => p.adp);
  const minADP = Math.min(...adps);
  const maxADP = Math.max(...adps);
  const range = maxADP - minADP;

  return players.map(player => ({
    ...player,
    normalized_cost: ((maxADP - player.adp) / range) * 100
  }));
}
```

**Example:**
- Pick 1 (ADP 1.4) → normalized_cost = 100 (most expensive)
- Pick 100 (ADP 100) → normalized_cost = ~52 (mid-range)
- Pick 210 (ADP 210) → normalized_cost = 0 (cheapest)

---

### Function 2: Calculate Value Ratio

```javascript
/**
 * Calculate value ratio using normalized cost
 * Formula: elite_game_value / normalized_cost (like DFS pts/salary)
 * @param {Object} player - From normalizeADPasCost()
 * @returns {Object} Player with value_ratio added
 */
function calculateValueRatio(player) {
  // Prevent division by zero for last pick
  const cost = player.normalized_cost || 0.1;

  return {
    ...player,
    value_ratio: player.elite_game_value / cost,
    games_per_round: player.a_plus_games / (player.adp / 12) // Assuming 12-team
  };
}
```

---

### Function 3: Classify Player Value

```javascript
/**
 * Classify player value based on ratio
 * NOTE: Thresholds adjusted for normalized cost system
 * @param {number} valueRatio - elite_value/normalized_cost ratio
 * @param {string} position - Player position
 * @returns {string} Value classification
 */
function classifyPlayerValue(valueRatio, position) {
  // UPDATED thresholds for normalized cost (0-100 scale)
  // Higher ratios = better value (late picks with good schedules)
  const thresholds = {
    QB: { extreme: 0.15, strong: 0.10, fair: 0.07, slight: 0.05 },
    RB: { extreme: 0.12, strong: 0.08, fair: 0.05, slight: 0.03 },
    WR: { extreme: 0.12, strong: 0.08, fair: 0.05, slight: 0.03 },
    TE: { extreme: 0.15, strong: 0.10, fair: 0.07, slight: 0.05 }
  };

  const t = thresholds[position];

  if (valueRatio >= t.extreme) return "EXTREME VALUE";
  if (valueRatio >= t.strong) return "STRONG VALUE";
  if (valueRatio >= t.fair) return "FAIR VALUE";
  if (valueRatio >= t.slight) return "SLIGHT REACH";
  return "AVOID";
}
```

---

### Function 3: Assign Draft Recommendation

```javascript
/**
 * Generate draft recommendation
 * @param {string} valueClass - From classifyPlayerValue()
 * @param {number} aPlusGames - Number of A+ games
 * @returns {string} Recommendation
 */
function generateRecommendation(valueClass, aPlusGames) {
  if (valueClass === "EXTREME VALUE" && aPlusGames >= 6) {
    return "PRIORITY TARGET - Must draft";
  } else if (valueClass === "EXTREME VALUE") {
    return "STRONG TARGET - Great value";
  } else if (valueClass === "STRONG VALUE") {
    return "GOOD VALUE - Solid pick";
  } else if (valueClass === "FAIR VALUE") {
    return "FAIR - Market priced";
  } else if (valueClass === "SLIGHT REACH") {
    return "REACH - Consider alternatives";
  } else {
    return "AVOID - Poor value";
  }
}
```

---

### Function 5: Build Complete Player Rankings

```javascript
/**
 * Add value calculations to all players and sort
 * UPDATED: Now normalizes ADP as cost before calculating ratios
 * @returns {Object} Rankings by position
 */
function buildPlayerValueRankings() {
  const mappedPlayers = buildPlayerScheduleMapping();

  // STEP 1: Normalize ADP as cost (100 = expensive, 0 = cheap)
  const normalizedPlayers = normalizeADPasCost(mappedPlayers);

  // STEP 2: Calculate value ratios using normalized cost
  const rankedPlayers = normalizedPlayers.map(player => {
    const withRatio = calculateValueRatio(player);
    const valueClass = classifyPlayerValue(withRatio.value_ratio, player.position);
    const recommendation = generateRecommendation(valueClass, player.a_plus_games);

    return {
      ...withRatio,
      value_class: valueClass,
      recommendation: recommendation
    };
  });

  // Group by position and sort by value_ratio
  const byPosition = {
    QB: [],
    RB: [],
    WR: [],
    TE: []
  };

  rankedPlayers.forEach(player => {
    byPosition[player.position].push(player);
  });

  // Sort each position by value_ratio descending
  for (const pos of Object.keys(byPosition)) {
    byPosition[pos].sort((a, b) => b.value_ratio - a.value_ratio);
  }

  return byPosition;
}
```

---

### Function 6: Test Runner

```javascript
/**
 * Test Task 3B - value calculations with normalized cost
 */
function testTask3B() {
  try {
    const rankings = buildPlayerValueRankings();

    // Show top 5 QBs by value (should now favor late picks with good schedules)
    Logger.log("Top 5 QBs by value ratio (normalized cost):");
    rankings.QB.slice(0, 5).forEach((p, i) => {
      Logger.log(`${i+1}. ${p.player_name} (ADP ${p.adp}, Cost ${p.normalized_cost.toFixed(1)}): ${p.value_ratio.toFixed(3)} - ${p.value_class}`);
    });

    // Show Stafford specifically (should now be high value)
    const stafford = rankings.QB.find(p => p.player_name.includes('Stafford'));
    if (stafford) {
      Logger.log(`\nStafford check: ADP ${stafford.adp}, normalized_cost ${stafford.normalized_cost.toFixed(1)}, value_ratio ${stafford.value_ratio.toFixed(3)}`);
    }

    // Show top 5 WRs by value
    Logger.log("\nTop 5 WRs by value ratio (normalized cost):");
    rankings.WR.slice(0, 5).forEach((p, i) => {
      Logger.log(`${i+1}. ${p.player_name} (ADP ${p.adp}, Cost ${p.normalized_cost.toFixed(1)}): ${p.value_ratio.toFixed(3)} - ${p.value_class}`);
    });

    // Count EXTREME VALUE players
    const extremeCount = {
      QB: rankings.QB.filter(p => p.value_class === "EXTREME VALUE").length,
      RB: rankings.RB.filter(p => p.value_class === "EXTREME VALUE").length,
      WR: rankings.WR.filter(p => p.value_class === "EXTREME VALUE").length,
      TE: rankings.TE.filter(p => p.value_class === "EXTREME VALUE").length
    };

    SpreadsheetApp.getUi().alert(
      "Task 3B Complete!\n\n" +
      `EXTREME VALUE players (with normalized cost):\n` +
      `QB: ${extremeCount.QB}\n` +
      `RB: ${extremeCount.RB}\n` +
      `WR: ${extremeCount.WR}\n` +
      `TE: ${extremeCount.TE}\n\n` +
      `Check log for top 5 per position`
    );

  } catch (error) {
    SpreadsheetApp.getUi().alert("Error: " + error.message);
    Logger.log(error);
  }
}
```

---

## Acceptance Criteria

Task 3B is complete when:

- [ ] All players have normalized_cost calculated (100 = expensive, 0 = cheap)
- [ ] All players have value_ratio calculated using normalized cost
- [ ] Value classifications assigned (EXTREME/STRONG/FAIR/AVOID)
- [ ] Recommendations generated
- [ ] **CRITICAL:** Late-round players (high ADP, low cost) with elite schedules show EXTREME VALUE
- [ ] **CRITICAL:** Early-round players (low ADP, high cost) with poor schedules show AVOID
- [ ] Stafford (ADP ~100) with 6.8 elite value should rank HIGHER than early QBs with similar value
- [ ] Rankings sorted by value_ratio per position
- [ ] Execution log shows normalized_cost values
- [ ] `testTask3B()` displays success with extreme value counts

---

## Deliverables

- 6 new functions (including normalized cost calculation)
- Value ratio calculations for all players using normalized cost
- Execution log showing value leaders with cost breakdown

---

## What This Enables

- Draft priority identification
- Value vs trap classification
- Foundation for final output sheet (Task 3C)

---

**After completion:** Upload execution log before Task 3C.

---

# TASK 3C: CREATE POSITION VALUE RANKINGS SHEET

**File:** `module_7_bestball.gs`
**Time:** 30 minutes
**Dependencies:** Task 3B complete

---

## Objective

Write Position_Value_Rankings sheet with all players sorted by value within position.

---

## Implementation

### Function 1: Write Position Rankings Sheet

```javascript
/**
 * Generate Position_Value_Rankings output sheet
 */
function writePositionValueRankings() {
  const rankings = buildPlayerValueRankings();

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Position_Value_Rankings");

  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet("Position_Value_Rankings");
  }

  // Headers
  const headers = [
    'rank', 'position', 'player_name', 'team', 'adp', 'normalized_cost',
    'a_plus_games', 'a_games', 'b_games', 'elite_game_value',
    'value_ratio', 'games_per_round', 'value_class', 'recommendation'
  ];

  let currentRow = 1;

  // Write each position
  const positions = ['QB', 'RB', 'WR', 'TE'];

  for (const position of positions) {
    // Position header
    sheet.getRange(currentRow, 1).setValue(`[ ${position} RANKINGS ]`).setFontWeight('bold');
    currentRow += 2;

    // Column headers
    sheet.getRange(currentRow, 1, 1, headers.length)
      .setValues([headers])
      .setFontWeight('bold')
      .setBackground('#efefef');
    currentRow++;

    // Player data
    const players = rankings[position];
    const rows = players.map((p, i) => [
      i + 1, // rank
      p.position,
      p.player_name,
      p.team,
      p.adp,
      Math.round(p.normalized_cost * 10) / 10, // Round to 1 decimal
      p.a_plus_games,
      p.a_games,
      p.b_games,
      p.elite_game_value,
      Math.round(p.value_ratio * 1000) / 1000, // Round to 3 decimals
      Math.round(p.games_per_round * 10) / 10, // Round to 1 decimal
      p.value_class,
      p.recommendation
    ]);

    if (rows.length > 0) {
      sheet.getRange(currentRow, 1, rows.length, headers.length).setValues(rows);

      // Conditional formatting for value_class
      const valueClassRange = sheet.getRange(currentRow, 13, rows.length, 1);

      // Color code: EXTREME = green, STRONG = light green, AVOID = red
      rows.forEach((row, i) => {
        const cell = sheet.getRange(currentRow + i, 13);
        if (row[12] === "EXTREME VALUE") {
          cell.setBackground('#00ff00');
        } else if (row[12] === "STRONG VALUE") {
          cell.setBackground('#90ee90');
        } else if (row[12] === "AVOID") {
          cell.setBackground('#ffcccb');
        }
      });

      currentRow += rows.length + 2;
    }
  }

  // Format
  sheet.autoResizeColumns(1, headers.length);
  sheet.setFrozenRows(0);

  Logger.log(`Position_Value_Rankings created with ${positions.length} position sections`);

  return true;
}
```

---

### Function 2: Test Runner

```javascript
/**
 * Test Task 3C - generate rankings sheet
 */
function testTask3C() {
  try {
    writePositionValueRankings();

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Position_Value_Rankings");

    if (!sheet) {
      throw new Error("Position_Value_Rankings sheet not created");
    }

    const dataRange = sheet.getDataRange();
    const numRows = dataRange.getNumRows();

    SpreadsheetApp.getUi().alert(
      "Task 3C Complete!\n\n" +
      `Position_Value_Rankings created\n` +
      `Total rows: ${numRows}\n` +
      `4 position sections (QB/RB/WR/TE)\n` +
      `Color-coded by value class\n\n` +
      `Check sheet for results`
    );

  } catch (error) {
    SpreadsheetApp.getUi().alert("Error: " + error.message);
    Logger.log(error);
  }
}
```

---

## Acceptance Criteria

Task 3C is complete when:

- [ ] Position_Value_Rankings sheet created
- [ ] 4 position sections (QB/RB/WR/TE)
- [ ] Players sorted by value_ratio within position (highest first)
- [ ] **normalized_cost column present** (100 = expensive early picks, 0 = cheap late picks)
- [ ] EXTREME VALUE rows highlighted green
- [ ] AVOID rows highlighted red
- [ ] All columns populated correctly
- [ ] Late picks with good schedules ranking at top (high value_ratio)
- [ ] Sheet formatted and readable
- [ ] `testTask3C()` displays success alert

---

## Deliverables

- Position_Value_Rankings sheet
- 2 new functions
- Color-coded value classifications

---

## What This Enables

- Draft cheat sheet creation
- Visual identification of value targets
- Quick reference during drafts

---

**After completion:** Export Position_Value_Rankings CSV and upload before Task 4A.

---

# TASK 4A: IDENTIFY STACKABLE GAMES

**File:** `module_7_bestball.gs`
**Time:** 30-45 minutes
**Dependencies:** Task 3C complete

---

## Objective

Find games with 3+ A+ positions and create Stack_Blueprint showing recommended player combinations.

---

## Implementation

### Function 1: Find Stackable Games

```javascript
/**
 * Identify games suitable for stacking
 * @param {Array} scheduleData - From getScheduleData()
 * @returns {Array} Elite stackable games
 */
function findStackableGames(scheduleData) {
  return scheduleData.filter(game => {
    // Count A+ positions (excluding DST)
    const aPlusCount = [
      game.qb_grade,
      game.rb_grade,
      game.wr_grade,
      game.te_grade
    ].filter(g => g === 'A+').length;

    // Require 3+ A+ positions AND bring-back mandatory
    return aPlusCount >= 3 &&
           game.stack_requirements &&
           game.stack_requirements.includes('MANDATORY');
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
```

---

### Function 2: Map Players to Game

```javascript
/**
 * Find best value players from each team in a game
 * @param {string} team - Team abbreviation
 * @param {string} position - Position to find
 * @param {Object} rankings - From buildPlayerValueRankings()
 * @returns {Object} Best player or null
 */
function findBestPlayer(team, position, rankings) {
  const teamPlayers = rankings[position].filter(p => p.team === team);

  if (teamPlayers.length === 0) return null;

  // Sort by value_ratio descending
  teamPlayers.sort((a, b) => b.value_ratio - a.value_ratio);

  return teamPlayers[0]; // Return highest value player
}
```

---

### Function 3: Build Stack Recommendation

```javascript
/**
 * Create recommended stack for a game
 * @param {Object} game - From findStackableGames()
 * @param {Object} rankings - From buildPlayerValueRankings()
 * @returns {Object} Stack recommendation
 */
function buildStackRecommendation(game, rankings) {
  const stack = {
    game_id: game.game_id,
    week: game.week,
    matchup: game.matchup,
    environment_rate: game.environment_rate,
    a_plus_positions: game.a_plus_count,
    players: []
  };

  // Find QB from home team (if A+)
  if (game.qb_grade === 'A+') {
    const qb = findBestPlayer(game.home_team, 'QB', rankings);
    if (qb) stack.players.push(qb);
  }

  // Find WRs from home team (if A+)
  if (game.wr_grade === 'A+') {
    const homeWRs = rankings.WR.filter(p => p.team === game.home_team);
    homeWRs.sort((a, b) => b.value_ratio - a.value_ratio);

    // Take top 2 WRs
    stack.players.push(...homeWRs.slice(0, 2));
  }

  // Find bring-back WR from away team
  const awayWRs = rankings.WR.filter(p => p.team === game.away_team);
  awayWRs.sort((a, b) => b.value_ratio - a.value_ratio);
  if (awayWRs.length > 0) {
    stack.players.push(awayWRs[0]);
  }

  // Calculate stack metrics
  stack.total_adp = stack.players.reduce((sum, p) => sum + p.adp, 0);
  stack.total_elite_value = stack.players.reduce((sum, p) => sum + p.elite_game_value, 0);
  stack.value_score = stack.total_elite_value / stack.total_adp;

  return stack;
}
```

---

### Function 4: Generate Stack Blueprint

```javascript
/**
 * Create complete Stack_Blueprint
 */
function generateStackBlueprint() {
  const scheduleData = getScheduleData();
  const rankings = buildPlayerValueRankings();
  const stackableGames = findStackableGames(scheduleData);

  const stacks = stackableGames.map(game =>
    buildStackRecommendation(game, rankings)
  );

  // Sort by value_score descending
  stacks.sort((a, b) => b.value_score - a.value_score);

  // Write to sheet
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Stack_Blueprint");

  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet("Stack_Blueprint");
  }

  // Headers
  sheet.getRange(1, 1).setValue('[ ELITE GAME STACKS ]').setFontWeight('bold');

  let currentRow = 3;

  stacks.forEach((stack, i) => {
    // Stack header
    sheet.getRange(currentRow, 1)
      .setValue(`${i+1}. Week ${stack.week}: ${stack.matchup}`)
      .setFontWeight('bold');
    currentRow++;

    sheet.getRange(currentRow, 1).setValue(`Environment: ${stack.environment_rate.toFixed(3)} | A+ Positions: ${stack.a_plus_positions}`);
    currentRow++;

    // Players
    sheet.getRange(currentRow, 1).setValue('Player');
    sheet.getRange(currentRow, 2).setValue('Pos');
    sheet.getRange(currentRow, 3).setValue('Team');
    sheet.getRange(currentRow, 4).setValue('ADP');
    sheet.getRange(currentRow, 5).setValue('Value');
    sheet.getRange(currentRow, 1, 1, 5).setFontWeight('bold');
    currentRow++;

    stack.players.forEach(p => {
      sheet.getRange(currentRow, 1).setValue(p.player_name);
      sheet.getRange(currentRow, 2).setValue(p.position);
      sheet.getRange(currentRow, 3).setValue(p.team);
      sheet.getRange(currentRow, 4).setValue(p.adp);
      sheet.getRange(currentRow, 5).setValue(p.elite_game_value);
      currentRow++;
    });

    // Stack totals
    sheet.getRange(currentRow, 1).setValue('STACK TOTALS:');
    sheet.getRange(currentRow, 4).setValue(stack.total_adp);
    sheet.getRange(currentRow, 5).setValue(stack.total_elite_value.toFixed(1));
    sheet.getRange(currentRow, 1, 1, 5).setFontWeight('bold').setBackground('#efefef');
    currentRow++;

    sheet.getRange(currentRow, 1).setValue(`Value Score: ${stack.value_score.toFixed(3)}`);
    currentRow += 2;
  });

  sheet.autoResizeColumns(1, 5);

  Logger.log(`Stack_Blueprint created with ${stacks.length} stacks`);

  return stacks;
}
```

---

### Function 5: Test Runner

```javascript
/**
 * Test Task 4A - stack blueprint
 */
function testTask4A() {
  try {
    const stacks = generateStackBlueprint();

    Logger.log(`Top 3 stacks by value:`);
    stacks.slice(0, 3).forEach((s, i) => {
      Logger.log(`${i+1}. Week ${s.week}: ${s.matchup} (${s.players.length} players, value ${s.value_score.toFixed(3)})`);
      s.players.forEach(p => {
        Logger.log(`   ${p.player_name} (${p.position}, ADP ${p.adp})`);
      });
    });

    SpreadsheetApp.getUi().alert(
      "Task 4A Complete!\n\n" +
      `Stack_Blueprint created\n` +
      `Stackable games: ${stacks.length}\n` +
      `Check sheet for recommendations`
    );

  } catch (error) {
    SpreadsheetApp.getUi().alert("Error: " + error.message);
    Logger.log(error);
  }
}
```

---

## Acceptance Criteria

Task 4A is complete when:

- [ ] Stack_Blueprint sheet created
- [ ] 20-30 stackable games identified
- [ ] Each stack shows 3-4 recommended players
- [ ] Total ADP and value calculated per stack
- [ ] Stacks sorted by value_score
- [ ] Sheet formatted clearly
- [ ] Execution log shows top 3 stacks
- [ ] `testTask4A()` displays success alert

---

## Deliverables

- Stack_Blueprint sheet
- 5 new functions
- Execution log with top stacks

---

## What This Enables

- Game stack identification for drafts
- Multi-player combinations from elite games
- Cost-aware stack building

---

**After completion:** Export Stack_Blueprint and upload before Task 5A.

---

# TASK 5A: DRAFT STRATEGY TIERS

**File:** `module_7_bestball.gs`
**Time:** 30 minutes
**Dependencies:** Task 4A complete

---

## Objective

Create round-by-round draft strategy guide based on value availability.

---

## Implementation

### Function 1: Segment Players by Round

```javascript
/**
 * Group players by draft round (ADP / 12)
 * @param {Object} rankings - From buildPlayerValueRankings()
 * @returns {Object} Players grouped by round
 */
function segmentPlayersByRound(rankings) {
  const rounds = {};

  for (let round = 1; round <= 18; round++) {
    rounds[round] = {
      QB: [],
      RB: [],
      WR: [],
      TE: []
    };
  }

  // Assign players to rounds
  for (const [pos, players] of Object.entries(rankings)) {
    players.forEach(p => {
      const round = Math.ceil(p.adp / 12);
      if (round <= 18) {
        rounds[round][pos].push(p);
      }
    });
  }

  return rounds;
}
```

---

### Function 2: Analyze Round Value

```javascript
/**
 * Calculate value statistics for a round
 * @param {Object} roundPlayers - All players in this round
 * @returns {Object} Round analysis
 */
function analyzeRound(roundPlayers) {
  const allPlayers = [
    ...roundPlayers.QB,
    ...roundPlayers.RB,
    ...roundPlayers.WR,
    ...roundPlayers.TE
  ];

  if (allPlayers.length === 0) {
    return { extreme: 0, strong: 0, avg_value: 0 };
  }

  return {
    total_players: allPlayers.length,
    extreme_value: allPlayers.filter(p => p.value_class === 'EXTREME VALUE').length,
    strong_value: allPlayers.filter(p => p.value_class === 'STRONG VALUE').length,
    avg_value_ratio: allPlayers.reduce((sum, p) => sum + p.value_ratio, 0) / allPlayers.length,
    best_position: getBestPositionInRound(roundPlayers)
  };
}

function getBestPositionInRound(roundPlayers) {
  const posAvgs = {};

  for (const [pos, players] of Object.entries(roundPlayers)) {
    if (players.length > 0) {
      posAvgs[pos] = players.reduce((sum, p) => sum + p.value_ratio, 0) / players.length;
    }
  }

  return Object.entries(posAvgs).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
}
```

---

### Function 3: Generate Round Strategy

```javascript
/**
 * Create strategy recommendation for each round
 * @param {number} round - Round number
 * @param {Object} analysis - From analyzeRound()
 * @returns {string} Strategy text
 */
function generateRoundStrategy(round, analysis) {
  if (round <= 3) {
    return "ELITE ENVIRONMENTS ONLY - Target top players from dome teams and elite schedules. Prioritize talent + schedule combo.";
  } else if (round <= 8) {
    if (analysis.extreme_value >= 2) {
      return `VALUE HUNTING - ${analysis.extreme_value} extreme value players available. Focus on ${analysis.best_position} if possible.`;
    } else {
      return "VALUE HUNTING - Look for dome WRs and late QBs with elite schedules. Schedule quality > name value.";
    }
  } else if (round <= 12) {
    return "COMPLETE YOUR STACKS - Add bring-backs to your primary games. Target opposing WRs from your QB's best games.";
  } else {
    return "DART THROWS - Single elite games, handcuffs to your RBs, leverage picks with injury upside.";
  }
}
```

---

### Function 4: Write Strategy Sheet

```javascript
/**
 * Generate Draft_Strategy_Tiers sheet
 */
function writeDraftStrategyTiers() {
  const rankings = buildPlayerValueRankings();
  const byRound = segmentPlayersByRound(rankings);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Draft_Strategy_Tiers");

  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet("Draft_Strategy_Tiers");
  }

  // Headers
  sheet.getRange(1, 1).setValue('[ ROUND-BY-ROUND DRAFT STRATEGY ]').setFontWeight('bold');

  let currentRow = 3;

  for (let round = 1; round <= 18; round++) {
    const roundPlayers = byRound[round];
    const analysis = analyzeRound(roundPlayers);
    const strategy = generateRoundStrategy(round, analysis);

    // Round header
    sheet.getRange(currentRow, 1).setValue(`ROUND ${round} (Picks ${(round-1)*12 + 1}-${round*12})`).setFontWeight('bold');
    currentRow++;

    // Strategy
    sheet.getRange(currentRow, 1, 1, 3).merge().setValue(strategy).setWrap(true);
    currentRow++;

    // Stats
    sheet.getRange(currentRow, 1).setValue(`Players in round: ${analysis.total_players}`);
    sheet.getRange(currentRow, 2).setValue(`Extreme value: ${analysis.extreme_value}`);
    sheet.getRange(currentRow, 3).setValue(`Best position: ${analysis.best_position}`);
    currentRow++;

    // Top players
    if (analysis.extreme_value > 0) {
      sheet.getRange(currentRow, 1).setValue('Top value picks:');
      currentRow++;

      const allPlayers = [...roundPlayers.QB, ...roundPlayers.RB, ...roundPlayers.WR, ...roundPlayers.TE];
      const extremePlayers = allPlayers
        .filter(p => p.value_class === 'EXTREME VALUE')
        .sort((a, b) => b.value_ratio - a.value_ratio)
        .slice(0, 3);

      extremePlayers.forEach(p => {
        sheet.getRange(currentRow, 1).setValue(`  ${p.player_name} (${p.position}, ${p.team}) - ADP ${p.adp}`);
        currentRow++;
      });
    }

    currentRow += 2;
  }

  sheet.autoResizeColumns(1, 3);
  sheet.setColumnWidth(1, 500);

  Logger.log("Draft_Strategy_Tiers created");

  return true;
}
```

---

### Function 5: Test Runner

```javascript
/**
 * Test Task 5A - strategy tiers
 */
function testTask5A() {
  try {
    writeDraftStrategyTiers();

    SpreadsheetApp.getUi().alert(
      "Task 5A Complete!\n\n" +
      `Draft_Strategy_Tiers created\n` +
      `18 rounds of strategy\n` +
      `Check sheet for guidance`
    );

  } catch (error) {
    SpreadsheetApp.getUi().alert("Error: " + error.message);
    Logger.log(error);
  }
}
```

---

## Acceptance Criteria

Task 5A is complete when:

- [ ] Draft_Strategy_Tiers sheet created
- [ ] 18 rounds of strategy provided
- [ ] Each round shows player counts and value availability
- [ ] Extreme value players highlighted per round
- [ ] Best position recommendations by round
- [ ] Strategies appropriate for round ranges
- [ ] Sheet formatted clearly
- [ ] `testTask5A()` displays success alert

---

## Deliverables

- Draft_Strategy_Tiers sheet
- 5 new functions
- Round-by-round guidance

---

## What This Enables

- Draft preparation by round
- Value awareness throughout draft
- Position targeting by round

---

**After completion:** Export Draft_Strategy_Tiers and upload before Task 5B.

---

# TASK 5B: FINAL VALIDATION AND QA

**File:** `module_7_bestball.gs`
**Time:** 30 minutes
**Dependencies:** All previous tasks complete

---

## Objective

Create comprehensive validation tests and QA summary of all Module 7 outputs.

---

## Implementation

### Function 1: Master Validation

```javascript
/**
 * Run all validation tests
 */
function validateModule7Complete() {
  const results = {
    tests: [],
    passed: 0,
    failed: 0
  };

  // Test 1: Team_Schedule_Summary
  try {
    const teamSummary = getTeamSummaryData();
    results.tests.push({
      name: "Team_Schedule_Summary exists",
      passed: teamSummary.length === 160,
      details: `Rows: ${teamSummary.length} (expected 160)`
    });
    results.passed += teamSummary.length === 160 ? 1 : 0;
    results.failed += teamSummary.length !== 160 ? 1 : 0;
  } catch (e) {
    results.tests.push({
      name: "Team_Schedule_Summary exists",
      passed: false,
      details: e.message
    });
    results.failed++;
  }

  // Test 2: Position_Value_Rankings
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Position_Value_Rankings");
    const exists = sheet !== null;
    results.tests.push({
      name: "Position_Value_Rankings exists",
      passed: exists,
      details: exists ? "Sheet created" : "Sheet missing"
    });
    results.passed += exists ? 1 : 0;
    results.failed += !exists ? 1 : 0;
  } catch (e) {
    results.tests.push({
      name: "Position_Value_Rankings exists",
      passed: false,
      details: e.message
    });
    results.failed++;
  }

  // Test 3: Player counts
  try {
    const rankings = buildPlayerValueRankings();
    const counts = {
      QB: rankings.QB.length,
      RB: rankings.RB.length,
      WR: rankings.WR.length,
      TE: rankings.TE.length
    };

    const countsPassed =
      counts.QB >= 30 && counts.QB <= 35 &&
      counts.RB >= 60 && counts.RB <= 70 &&
      counts.WR >= 95 && counts.WR <= 105 &&
      counts.TE >= 30 && counts.TE <= 35;

    results.tests.push({
      name: "Player counts in range",
      passed: countsPassed,
      details: `QB:${counts.QB} RB:${counts.RB} WR:${counts.WR} TE:${counts.TE}`
    });
    results.passed += countsPassed ? 1 : 0;
    results.failed += !countsPassed ? 1 : 0;
  } catch (e) {
    results.tests.push({
      name: "Player counts in range",
      passed: false,
      details: e.message
    });
    results.failed++;
  }

  // Test 4: LAR WRs have elite games
  try {
    const rankings = buildPlayerValueRankings();
    const larWRs = rankings.WR.filter(p => p.team === 'LAR');
    const eliteGames = larWRs.length > 0 ? larWRs[0].a_plus_games : 0;
    const passed = eliteGames >= 8;

    results.tests.push({
      name: "LAR WRs have elite schedule",
      passed: passed,
      details: `A+ games: ${eliteGames} (expected >= 8)`
    });
    results.passed += passed ? 1 : 0;
    results.failed += !passed ? 1 : 0;
  } catch (e) {
    results.tests.push({
      name: "LAR WRs have elite schedule",
      passed: false,
      details: e.message
    });
    results.failed++;
  }

  // Test 5: Stack_Blueprint exists
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Stack_Blueprint");
    const exists = sheet !== null;
    results.tests.push({
      name: "Stack_Blueprint exists",
      passed: exists,
      details: exists ? "Sheet created" : "Sheet missing"
    });
    results.passed += exists ? 1 : 0;
    results.failed += !exists ? 1 : 0;
  } catch (e) {
    results.tests.push({
      name: "Stack_Blueprint exists",
      passed: false,
      details: e.message
    });
    results.failed++;
  }

  // Test 6: Draft_Strategy_Tiers exists
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Draft_Strategy_Tiers");
    const exists = sheet !== null;
    results.tests.push({
      name: "Draft_Strategy_Tiers exists",
      passed: exists,
      details: exists ? "Sheet created" : "Sheet missing"
    });
    results.passed += exists ? 1 : 0;
    results.failed += !exists ? 1 : 0;
  } catch (e) {
    results.tests.push({
      name: "Draft_Strategy_Tiers exists",
      passed: false,
      details: e.message
    });
    results.failed++;
  }

  return results;
}
```

---

### Function 2: Display Results

```javascript
/**
 * Test Task 5B and show validation summary
 */
function testTask5B() {
  const results = validateModule7Complete();

  let message = "MODULE 7 VALIDATION\n\n";
  message += `Tests passed: ${results.passed}\n`;
  message += `Tests failed: ${results.failed}\n\n`;

  message += "Details:\n";
  results.tests.forEach(test => {
    const status = test.passed ? "✓" : "✗";
    message += `${status} ${test.name}\n`;
    if (!test.passed) {
      message += `  ${test.details}\n`;
    }
  });

  Logger.log(message);

  if (results.failed === 0) {
    SpreadsheetApp.getUi().alert(
      "✅ MODULE 7 COMPLETE!\n\n" +
      `All ${results.passed} tests passed\n\n` +
      "Deliverables:\n" +
      "- Team_Schedule_Summary\n" +
      "- Position_Value_Rankings\n" +
      "- Stack_Blueprint\n" +
      "- Draft_Strategy_Tiers"
    );
  } else {
    SpreadsheetApp.getUi().alert(
      "⚠️ VALIDATION FAILED\n\n" +
      `${results.failed} test(s) failed\n\n` +
      "Check execution log for details"
    );
  }
}
```

---

## Acceptance Criteria

Module 7 is COMPLETE when:

- [ ] All 6 validation tests pass
- [ ] Team_Schedule_Summary: 160 rows
- [ ] Position_Value_Rankings: 4 position sections
- [ ] Player counts: ~32 QB, ~64 RB, ~100 WR, ~32 TE
- [ ] LAR WRs show 8+ A+ games
- [ ] Stack_Blueprint: 20+ stackable games
- [ ] Draft_Strategy_Tiers: 18 rounds of guidance
- [ ] `testTask5B()` shows all tests passed

---

## Final Deliverables

**Sheets created:**
1. Team_Schedule_Summary (160 rows)
2. Position_Value_Rankings (sorted by value)
3. Stack_Blueprint (elite game stacks)
4. Draft_Strategy_Tiers (18 rounds)

**Functions created:** ~30+ across all tasks

**Total development time:** 3-4 hours

---

**After completion:** Export all 4 sheets as CSV and confirm Module 7 is production-ready!

---

**END OF IMPLEMENTATION TRACK**