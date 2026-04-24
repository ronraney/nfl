# CLAUDE CODE IMPLEMENTATION SPECIFICATION
**Google Apps Script for NFL Schedule Analysis System**

**Version:** 1.0  
**Date:** April 21, 2026  
**Target:** New Google Sheet: "NFL 2026 Schedule Planner"

---

## CRITICAL REQUIREMENTS

### 1. Column-Based Lookups (NOT Index-Based)
**ALWAYS find columns by header name, NEVER use hardcoded indices.**

**Good:**
```javascript
const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
const teamCol = headers.indexOf("team_name") + 1; // +1 for 1-based indexing
const value = data[row][headers.indexOf("team_name")];
```

**Bad:**
```javascript
const value = data[row][7]; // NEVER DO THIS - brittle if columns move
```

### 2. QA Test Sheet Required
Every function must populate a "QA_Test" sheet showing sample transformations for validation.

---

## WORKBOOK STRUCTURE

### Reference Sheets (Already Created)
1. **Teams** - 32 rows
   - Columns: team_abbr, bigdataball_abbr, team_name, team_short, team_nick, stadium, venue_type, division, conference

2. **Environment_Rates** - 8 rows
   - Columns: venue_type, home_away, is_division, ceiling_rate, notes

3. **Best_Ball_ADP** - ~500 rows
   - Columns: Rank, Player, Team, Bye, POS, BB10, RTSports, Underdog, Drafters, DraftKings, AVG

### Data Sheet (Placeholder - To Be Processed)
4. **Schedule** - 272 rows (2025 placeholder, will be 2026 when available)
   - Columns: Week, Day, Date, Time, Winner/tie, [blank], Loser/tie, [stats columns...]

### Output Sheets (To Be Created)
5. **Schedule_Enriched** - Processed schedule with all 27 columns
6. **QA_Test** - Validation data for spot-checking

---

## MODULE 6: SCHEDULE PROCESSING

### File: `module_6_schedule.gs`

---

## FUNCTION 1: processSchedule()

### Purpose
Master function that orchestrates the entire schedule processing pipeline.

### Workflow
```
1. Read Schedule sheet (PFR format)
2. Parse home/away from @ symbol
3. Map team names to abbreviations
4. Add venue data from Teams sheet
5. Flag primetime games
6. Flag division games
7. Assign week tiers
8. Calculate environment scores
9. Rank and assign game tiers
10. Write to Schedule_Enriched
11. Generate QA_Test data
```

### Implementation

```javascript
function processSchedule() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Get sheets
  const scheduleSheet = ss.getSheetByName("Schedule");
  const teamsSheet = ss.getSheetByName("Teams");
  const envRatesSheet = ss.getSheetByName("Environment_Rates");
  
  // Validate sheets exist
  if (!scheduleSheet) throw new Error("Schedule sheet not found");
  if (!teamsSheet) throw new Error("Teams sheet not found");
  if (!envRatesSheet) throw new Error("Environment_Rates sheet not found");
  
  // Read data using column headers
  const scheduleData = getSheetData(scheduleSheet);
  const teamsData = getSheetData(teamsSheet);
  const envRatesData = getSheetData(envRatesSheet);
  
  // Process each game
  const processedGames = [];
  
  for (let i = 0; i < scheduleData.length; i++) {
    const game = scheduleData[i];
    
    // Parse home/away
    const homeAway = parseHomeAway(game);
    
    // Map team names to abbreviations
    const homeTeam = lookupTeamAbbr(homeAway.home, teamsData);
    const awayTeam = lookupTeamAbbr(homeAway.away, teamsData);
    
    // Get venue data
    const venue = lookupVenue(homeTeam, teamsData);
    
    // Flag primetime
    const primetime = flagPrimetime(game.Day, game.Time);
    
    // Flag division
    const division = flagDivision(homeTeam, awayTeam, teamsData);
    
    // Assign week tier
    const weekTier = assignWeekTier(game.Week);
    
    // Calculate environment score
    const envScore = calculateEnvironmentScore(
      venue.venue_type,
      "Home", // we'll do both perspectives
      division,
      primetime.is_primetime,
      weekTier,
      envRatesData
    );
    
    // Build enriched game object
    const enrichedGame = {
      // Base schedule (8 columns)
      week: game.Week,
      game_date: game.Date,
      game_time: standardizeTime(game.Time),
      day_of_week: game.Day,
      home_team: homeTeam,
      away_team: awayTeam,
      network: determineNetwork(game.Day, game.Time),
      game_id: `2026_W${String(game.Week).padStart(2, '0')}_${awayTeam}_${homeTeam}`,
      
      // Enrichment (6 columns)
      venue_name: venue.stadium,
      venue_type: venue.venue_type,
      is_primetime: primetime.is_primetime,
      primetime_slot: primetime.slot,
      is_division: division,
      week_tier: weekTier,
      
      // Vegas (9 columns) - blank for now
      total: "",
      spread: "",
      home_moneyline: "",
      away_moneyline: "",
      favorite_team: "",
      underdog_team: "",
      vegas_bucket: "",
      home_itt: "",
      away_itt: "",
      
      // Analysis (4 columns)
      environment_score: envScore,
      game_tier: "",  // assigned after ranking
      target_rank: "",  // assigned after ranking
      bb_priority: ""  // assigned after ranking
    };
    
    processedGames.push(enrichedGame);
  }
  
  // Rank games and assign tiers
  rankGames(processedGames);
  
  // Write to Schedule_Enriched
  writeScheduleEnriched(ss, processedGames);
  
  // Generate QA test data
  generateQATest(ss, scheduleData, processedGames, teamsData);
  
  SpreadsheetApp.getUi().alert(
    "Schedule processing complete!\n\n" +
    `Processed ${processedGames.length} games\n` +
    "Check Schedule_Enriched and QA_Test sheets"
  );
}
```

---

## HELPER FUNCTION: getSheetData()

### Purpose
Read sheet data into array of objects with column names as keys.

### Implementation

```javascript
/**
 * Read sheet data using column headers as keys
 * @param {Sheet} sheet - Google Sheets object
 * @returns {Array<Object>} Array of row objects with header keys
 */
function getSheetData(sheet) {
  const range = sheet.getDataRange();
  const values = range.getValues();
  
  if (values.length === 0) {
    throw new Error(`Sheet ${sheet.getName()} is empty`);
  }
  
  // First row is headers
  const headers = values[0];
  
  // Convert remaining rows to objects
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
```

---

## HELPER FUNCTION: parseHomeAway()

### Purpose
Determine home and away teams from PFR format using @ symbol.

### Logic
- If @ column is BLANK: Winner = Home, Loser = Away
- If @ column has value: Loser = Home, Winner = Away

### Implementation

```javascript
/**
 * Parse home/away teams from PFR schedule format
 * @param {Object} game - Row object from Schedule sheet
 * @returns {Object} {home: string, away: string}
 */
function parseHomeAway(game) {
  // Column name is blank in CSV, use position or alternate approach
  // PFR format: Winner/tie, [blank or @], Loser/tie
  
  const winner = game["Winner/tie"];
  const loser = game["Loser/tie"];
  const atSymbol = game[""]; // blank column header for @ position
  
  // If @ is blank, winner is home
  // If @ has value (@), loser is home
  if (!atSymbol || atSymbol === "") {
    return { home: winner, away: loser };
  } else {
    return { home: loser, away: winner };
  }
}
```

**Note:** If blank column header causes issues, use alternate detection:

```javascript
function parseHomeAway(game) {
  // Alternative: check all columns for @ symbol
  const keys = Object.keys(game);
  let atSymbol = "";
  
  for (let key of keys) {
    if (game[key] === "@") {
      atSymbol = "@";
      break;
    }
  }
  
  const winner = game["Winner/tie"];
  const loser = game["Loser/tie"];
  
  if (atSymbol === "") {
    return { home: winner, away: loser };
  } else {
    return { home: loser, away: winner };
  }
}
```

---

## HELPER FUNCTION: lookupTeamAbbr()

### Purpose
Map full team name to 3-letter abbreviation using Teams sheet.

### Implementation

```javascript
/**
 * Lookup team abbreviation from full name
 * @param {string} fullName - Full team name (e.g., "Kansas City Chiefs")
 * @param {Array<Object>} teamsData - Teams sheet data
 * @returns {string} 3-letter abbreviation (e.g., "KC")
 */
function lookupTeamAbbr(fullName, teamsData) {
  // Find matching team
  const team = teamsData.find(t => t.team_name === fullName);
  
  if (!team) {
    throw new Error(`Team not found: ${fullName}`);
  }
  
  return team.team_abbr;
}
```

---

## HELPER FUNCTION: lookupVenue()

### Purpose
Get stadium and venue type for a team.

### Implementation

```javascript
/**
 * Lookup venue data for a team
 * @param {string} teamAbbr - 3-letter team abbreviation
 * @param {Array<Object>} teamsData - Teams sheet data
 * @returns {Object} {stadium: string, venue_type: string}
 */
function lookupVenue(teamAbbr, teamsData) {
  const team = teamsData.find(t => t.team_abbr === teamAbbr);
  
  if (!team) {
    throw new Error(`Team not found: ${teamAbbr}`);
  }
  
  return {
    stadium: team.stadium,
    venue_type: team.venue_type
  };
}
```

---

## HELPER FUNCTION: flagPrimetime()

### Purpose
Determine if game is primetime and which slot.

### Logic
- Thursday 8:00-8:30 PM → TNF
- Sunday 8:00-8:30 PM → SNF
- Monday 8:00-8:30 PM → MNF
- All others → Not primetime

### Implementation

```javascript
/**
 * Flag primetime games
 * @param {string} day - Day of week (Thu, Sun, Mon)
 * @param {string} time - Time string (e.g., "8:20 PM")
 * @returns {Object} {is_primetime: boolean, slot: string}
 */
function flagPrimetime(day, time) {
  // Parse time to 24-hour format
  const hour = parseTimeHour(time);
  
  // Primetime is 8:00-8:30 PM (20:00-20:30)
  const isPrimetimeHour = (hour >= 20 && hour <= 20.5);
  
  if (day === "Thu" && isPrimetimeHour) {
    return { is_primetime: true, slot: "TNF" };
  } else if (day === "Sun" && isPrimetimeHour) {
    return { is_primetime: true, slot: "SNF" };
  } else if (day === "Mon" && isPrimetimeHour) {
    return { is_primetime: true, slot: "MNF" };
  } else {
    return { is_primetime: false, slot: "" };
  }
}

/**
 * Parse time string to hour in 24-hour format
 * @param {string} time - Time string (e.g., "8:20 PM", "1:00 PM")
 * @returns {number} Hour in 24-hour format (20.33 for 8:20 PM)
 */
function parseTimeHour(time) {
  const parts = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
  
  if (!parts) {
    throw new Error(`Invalid time format: ${time}`);
  }
  
  let hour = parseInt(parts[1]);
  const minute = parseInt(parts[2]);
  const meridiem = parts[3].toUpperCase();
  
  // Convert to 24-hour
  if (meridiem === "PM" && hour !== 12) {
    hour += 12;
  } else if (meridiem === "AM" && hour === 12) {
    hour = 0;
  }
  
  // Return as decimal (8:20 = 20.33)
  return hour + (minute / 60);
}
```

---

## HELPER FUNCTION: flagDivision()

### Purpose
Check if two teams are in the same division.

### Implementation

```javascript
/**
 * Check if game is a division matchup
 * @param {string} team1Abbr - First team abbreviation
 * @param {string} team2Abbr - Second team abbreviation
 * @param {Array<Object>} teamsData - Teams sheet data
 * @returns {boolean} True if same division
 */
function flagDivision(team1Abbr, team2Abbr, teamsData) {
  const team1 = teamsData.find(t => t.team_abbr === team1Abbr);
  const team2 = teamsData.find(t => t.team_abbr === team2Abbr);
  
  if (!team1 || !team2) {
    throw new Error(`Team not found: ${team1Abbr} or ${team2Abbr}`);
  }
  
  return team1.division === team2.division;
}
```

---

## HELPER FUNCTION: assignWeekTier()

### Purpose
Categorize week into Early/Mid/Late tier.

### Logic
- Weeks 1-4: Early
- Weeks 5-12: Mid
- Weeks 13-18: Late

### Implementation

```javascript
/**
 * Assign week tier based on week number
 * @param {number} week - Week number (1-18)
 * @returns {string} "Early", "Mid", or "Late"
 */
function assignWeekTier(week) {
  if (week >= 1 && week <= 4) {
    return "Early";
  } else if (week >= 5 && week <= 12) {
    return "Mid";
  } else if (week >= 13 && week <= 18) {
    return "Late";
  } else {
    throw new Error(`Invalid week number: ${week}`);
  }
}
```

---

## HELPER FUNCTION: calculateEnvironmentScore()

### Purpose
Calculate environment score using Module 3 findings.

### Formula
```
1. Lookup base ceiling rate from Environment_Rates
2. Apply primetime modifier: ×1.065 if primetime
3. Apply week tier modifier: ×1.05 if Mid, ×1.00 otherwise
```

### Implementation

```javascript
/**
 * Calculate environment score
 * @param {string} venueType - "Dome" or "Outdoor"
 * @param {string} homeAway - "Home" or "Away"
 * @param {boolean} isDivision - Division game flag
 * @param {boolean} isPrimetime - Primetime flag
 * @param {string} weekTier - "Early", "Mid", or "Late"
 * @param {Array<Object>} envRatesData - Environment_Rates sheet data
 * @returns {number} Environment score (0-1 range)
 */
function calculateEnvironmentScore(venueType, homeAway, isDivision, isPrimetime, weekTier, envRatesData) {
  // Lookup base rate
  const baseRate = lookupEnvironmentRate(venueType, homeAway, isDivision, envRatesData);
  
  // Apply modifiers
  let score = baseRate;
  
  // Primetime modifier
  if (isPrimetime) {
    score *= 1.065;
  }
  
  // Week tier modifier
  if (weekTier === "Mid") {
    score *= 1.05;
  }
  
  return Math.round(score * 1000) / 1000; // Round to 3 decimals
}

/**
 * Lookup base ceiling rate from Environment_Rates
 * @param {string} venueType - "Dome" or "Outdoor"
 * @param {string} homeAway - "Home" or "Away"
 * @param {boolean} isDivision - Division game flag
 * @param {Array<Object>} envRatesData - Environment_Rates sheet data
 * @returns {number} Base ceiling rate
 */
function lookupEnvironmentRate(venueType, homeAway, isDivision, envRatesData) {
  // Find matching row
  const divisionStr = isDivision ? "Yes" : "No";
  
  const match = envRatesData.find(row => 
    row.venue_type === venueType &&
    row.home_away === homeAway &&
    row.is_division === divisionStr
  );
  
  if (!match) {
    throw new Error(`Environment rate not found: ${venueType}, ${homeAway}, Division=${isDivision}`);
  }
  
  return match.ceiling_rate;
}
```

---

## HELPER FUNCTION: rankGames()

### Purpose
Sort games by environment score and assign tiers.

### Tier Thresholds
- A+: score >= 0.32
- A: score >= 0.28
- B: score >= 0.24
- C: score >= 0.20
- D: score < 0.20

### Implementation

```javascript
/**
 * Rank games and assign tiers (modifies games array in place)
 * @param {Array<Object>} games - Array of enriched game objects
 */
function rankGames(games) {
  // Sort by environment_score descending
  games.sort((a, b) => b.environment_score - a.environment_score);
  
  // Assign ranks and tiers
  for (let i = 0; i < games.length; i++) {
    games[i].target_rank = i + 1;
    games[i].game_tier = assignGameTier(games[i].environment_score);
    games[i].bb_priority = assignBBPriority(games[i].game_tier);
  }
}

/**
 * Assign game tier based on environment score
 * @param {number} score - Environment score
 * @returns {string} "A+", "A", "B", "C", or "D"
 */
function assignGameTier(score) {
  if (score >= 0.32) return "A+";
  if (score >= 0.28) return "A";
  if (score >= 0.24) return "B";
  if (score >= 0.20) return "C";
  return "D";
}

/**
 * Assign Best Ball priority based on game tier
 * @param {string} tier - Game tier
 * @returns {string} "High", "Med", or "Low"
 */
function assignBBPriority(tier) {
  if (tier === "A+" || tier === "A") return "High";
  if (tier === "B") return "Med";
  return "Low";
}
```

---

## HELPER FUNCTION: writeScheduleEnriched()

### Purpose
Write processed games to Schedule_Enriched sheet with all 27 columns.

### Implementation

```javascript
/**
 * Write enriched schedule data to sheet
 * @param {Spreadsheet} ss - Spreadsheet object
 * @param {Array<Object>} games - Array of enriched game objects
 */
function writeScheduleEnriched(ss, games) {
  // Get or create sheet
  let sheet = ss.getSheetByName("Schedule_Enriched");
  if (!sheet) {
    sheet = ss.insertSheet("Schedule_Enriched");
  } else {
    sheet.clear();
  }
  
  // Define column order (27 columns)
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
    
    // Analysis (4)
    "environment_score", "game_tier", "target_rank", "bb_priority"
  ];
  
  // Write headers
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  
  // Convert games to 2D array
  const rows = games.map(game => 
    headers.map(header => game[header])
  );
  
  // Write data
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
  
  // Freeze header row
  sheet.setFrozenRows(1);
  
  // Auto-resize columns
  sheet.autoResizeColumns(1, headers.length);
}
```

---

## HELPER FUNCTION: generateQATest()

### Purpose
Create QA_Test sheet with sample transformations for validation.

### What to Show
- First 10 games with all transformations
- Team name mappings (show full name → abbreviation)
- Venue lookups (show team → stadium → venue type)
- Division flag examples
- Primetime flag examples
- Environment score calculations with breakdown

### Implementation

```javascript
/**
 * Generate QA test sheet for validation
 * @param {Spreadsheet} ss - Spreadsheet object
 * @param {Array<Object>} originalData - Original schedule data
 * @param {Array<Object>} processedGames - Processed enriched games
 * @param {Array<Object>} teamsData - Teams reference data
 */
function generateQATest(ss, originalData, processedGames, teamsData) {
  // Get or create sheet
  let sheet = ss.getSheetByName("QA_Test");
  if (!sheet) {
    sheet = ss.insertSheet("QA_Test");
  } else {
    sheet.clear();
  }
  
  let row = 1;
  
  // Section 1: Sample Game Transformations
  sheet.getRange(row, 1).setValue("=== SAMPLE GAME TRANSFORMATIONS ===").setFontWeight("bold");
  row += 2;
  
  sheet.getRange(row, 1, 1, 7).setValues([[
    "Original Winner", "@ Symbol", "Original Loser",
    "→ Home Team", "→ Away Team", "Venue Type", "Is Division"
  ]]).setFontWeight("bold");
  row++;
  
  // Show first 10 games
  for (let i = 0; i < Math.min(10, originalData.length); i++) {
    const orig = originalData[i];
    const processed = processedGames[i];
    
    sheet.getRange(row, 1, 1, 7).setValues([[
      orig["Winner/tie"],
      orig[""] || "(blank)",  // @ symbol
      orig["Loser/tie"],
      processed.home_team,
      processed.away_team,
      processed.venue_type,
      processed.is_division ? "YES" : "NO"
    ]]);
    row++;
  }
  
  row += 2;
  
  // Section 2: Team Name Mappings
  sheet.getRange(row, 1).setValue("=== TEAM NAME MAPPINGS ===").setFontWeight("bold");
  row += 2;
  
  sheet.getRange(row, 1, 1, 3).setValues([[
    "Full Name", "→ Abbreviation", "Stadium"
  ]]).setFontWeight("bold");
  row++;
  
  // Show all 32 teams
  for (const team of teamsData) {
    sheet.getRange(row, 1, 1, 3).setValues([[
      team.team_name,
      team.team_abbr,
      team.stadium
    ]]);
    row++;
  }
  
  row += 2;
  
  // Section 3: Dome vs Outdoor Breakdown
  sheet.getRange(row, 1).setValue("=== DOME VS OUTDOOR TEAMS ===").setFontWeight("bold");
  row += 2;
  
  const domeTeams = teamsData.filter(t => t.venue_type === "Dome");
  const outdoorTeams = teamsData.filter(t => t.venue_type === "Outdoor");
  
  sheet.getRange(row, 1).setValue(`Dome Teams (${domeTeams.length}):`).setFontWeight("bold");
  row++;
  sheet.getRange(row, 1).setValue(domeTeams.map(t => t.team_abbr).join(", "));
  row += 2;
  
  sheet.getRange(row, 1).setValue(`Outdoor Teams (${outdoorTeams.length}):`).setFontWeight("bold");
  row++;
  sheet.getRange(row, 1).setValue(outdoorTeams.map(t => t.team_abbr).join(", "));
  row += 2;
  
  // Section 4: Division Matchups
  sheet.getRange(row, 1).setValue("=== SAMPLE DIVISION MATCHUPS ===").setFontWeight("bold");
  row += 2;
  
  const divisionGames = processedGames.filter(g => g.is_division).slice(0, 10);
  
  sheet.getRange(row, 1, 1, 4).setValues([[
    "Week", "Matchup", "Division", "Venue Type"
  ]]).setFontWeight("bold");
  row++;
  
  for (const game of divisionGames) {
    const homeTeam = teamsData.find(t => t.team_abbr === game.home_team);
    
    sheet.getRange(row, 1, 1, 4).setValues([[
      game.week,
      `${game.away_team} @ ${game.home_team}`,
      homeTeam.division,
      game.venue_type
    ]]);
    row++;
  }
  
  row += 2;
  
  // Section 5: Primetime Games
  sheet.getRange(row, 1).setValue("=== PRIMETIME GAMES ===").setFontWeight("bold");
  row += 2;
  
  const primetimeGames = processedGames.filter(g => g.is_primetime).slice(0, 10);
  
  sheet.getRange(row, 1, 1, 5).setValues([[
    "Week", "Day", "Time", "Matchup", "Slot"
  ]]).setFontWeight("bold");
  row++;
  
  for (const game of primetimeGames) {
    sheet.getRange(row, 1, 1, 5).setValues([[
      game.week,
      game.day_of_week,
      game.game_time,
      `${game.away_team} @ ${game.home_team}`,
      game.primetime_slot
    ]]);
    row++;
  }
  
  row += 2;
  
  // Section 6: Top 10 Games by Environment Score
  sheet.getRange(row, 1).setValue("=== TOP 10 GAMES (Environment Score) ===").setFontWeight("bold");
  row += 2;
  
  sheet.getRange(row, 1, 1, 7).setValues([[
    "Rank", "Week", "Matchup", "Venue", "Primetime", "Env Score", "Tier"
  ]]).setFontWeight("bold");
  row++;
  
  const top10 = processedGames.slice(0, 10);
  
  for (const game of top10) {
    sheet.getRange(row, 1, 1, 7).setValues([[
      game.target_rank,
      game.week,
      `${game.away_team} @ ${game.home_team}`,
      game.venue_type,
      game.primetime_slot || "Day",
      game.environment_score,
      game.game_tier
    ]]);
    row++;
  }
  
  row += 2;
  
  // Section 7: Game Tier Distribution
  sheet.getRange(row, 1).setValue("=== GAME TIER DISTRIBUTION ===").setFontWeight("bold");
  row += 2;
  
  const tierCounts = {
    "A+": processedGames.filter(g => g.game_tier === "A+").length,
    "A": processedGames.filter(g => g.game_tier === "A").length,
    "B": processedGames.filter(g => g.game_tier === "B").length,
    "C": processedGames.filter(g => g.game_tier === "C").length,
    "D": processedGames.filter(g => g.game_tier === "D").length
  };
  
  sheet.getRange(row, 1, 1, 2).setValues([["Tier", "Count"]]).setFontWeight("bold");
  row++;
  
  for (const [tier, count] of Object.entries(tierCounts)) {
    sheet.getRange(row, 1, 1, 2).setValues([[tier, count]]);
    row++;
  }
  
  // Auto-resize
  sheet.autoResizeColumns(1, 7);
  sheet.setFrozenRows(1);
}
```

---

## HELPER FUNCTION: determineNetwork()

### Purpose
Infer network from day and time.

### Implementation

```javascript
/**
 * Determine broadcast network from day and time
 * @param {string} day - Day of week
 * @param {string} time - Time string
 * @returns {string} Network abbreviation
 */
function determineNetwork(day, time) {
  const hour = parseTimeHour(time);
  
  if (day === "Thu" && hour >= 20) return "Prime";  // Prime Video TNF
  if (day === "Sun" && hour >= 20) return "NBC";    // NBC SNF
  if (day === "Mon" && hour >= 20) return "ESPN";   // ESPN MNF
  if (day === "Sun" && hour >= 16) return "CBS/FOX"; // Late afternoon
  if (day === "Sun") return "CBS/FOX";              // Early games
  
  return "";  // Other times
}
```

---

## HELPER FUNCTION: standardizeTime()

### Purpose
Convert time to 24-hour HH:MM format.

### Implementation

```javascript
/**
 * Standardize time to 24-hour format
 * @param {string} time - Time string (e.g., "8:20 PM")
 * @returns {string} 24-hour format (e.g., "20:20")
 */
function standardizeTime(time) {
  const parts = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
  
  if (!parts) return time; // Return as-is if can't parse
  
  let hour = parseInt(parts[1]);
  const minute = parts[2];
  const meridiem = parts[3].toUpperCase();
  
  if (meridiem === "PM" && hour !== 12) {
    hour += 12;
  } else if (meridiem === "AM" && hour === 12) {
    hour = 0;
  }
  
  return `${String(hour).padStart(2, '0')}:${minute}`;
}
```

---

## CUSTOM MENU

### Purpose
Add custom menu to run schedule processing.

### Implementation

```javascript
/**
 * Add custom menu when spreadsheet opens
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  
  ui.createMenu('🏈 NFL Schedule')
    .addItem('Process Schedule', 'processSchedule')
    .addSeparator()
    .addItem('View QA Test', 'openQATest')
    .addToUi();
}

/**
 * Open QA_Test sheet
 */
function openQATest() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("QA_Test");
  
  if (sheet) {
    ss.setActiveSheet(sheet);
  } else {
    SpreadsheetApp.getUi().alert("QA_Test sheet not found. Run 'Process Schedule' first.");
  }
}
```

---

## TESTING & VALIDATION

### Test Checklist

**Before Processing:**
- [ ] Schedule sheet has 272 rows (excluding header)
- [ ] Teams sheet has 32 rows
- [ ] Environment_Rates sheet has 8 rows
- [ ] All reference sheets have headers in row 1

**After Processing:**
- [ ] Schedule_Enriched sheet created with 272 rows
- [ ] All 27 columns populated (no blanks except Vegas columns)
- [ ] QA_Test sheet created with validation data
- [ ] Game_tier distribution looks reasonable (not all A+)
- [ ] Dome teams show higher environment scores than outdoor
- [ ] Division outdoor away games have lowest scores
- [ ] Primetime games have boosted scores

### Manual QA Steps

1. **Check Team Mappings:**
   - Open QA_Test sheet
   - Verify "Kansas City Chiefs" → "KC"
   - Verify "Green Bay Packers" → "GB" (not "GNB")

2. **Check Home/Away:**
   - Find game with @ symbol in original
   - Verify loser became home team
   - Find game without @ symbol
   - Verify winner became home team

3. **Check Venue Types:**
   - Verify all dome teams: ARI, ATL, DAL, DET, HOU, IND, LAC, LAR, LV, MIN, NO
   - Verify NO (Saints) has venue_type = "Dome"
   - Verify GB (Packers) has venue_type = "Outdoor"

4. **Check Division Games:**
   - Find PHI @ DAL game
   - Verify is_division = TRUE (both NFC East)
   - Find KC @ BUF game
   - Verify is_division = FALSE (AFC West vs AFC East)

5. **Check Primetime:**
   - Find Thursday 8:20 PM game
   - Verify primetime_slot = "TNF"
   - Find Sunday 1:00 PM game
   - Verify is_primetime = FALSE

6. **Check Environment Scores:**
   - Find dome home primetime game
   - Verify environment_score ≥ 0.31 (should be highest)
   - Find division outdoor away game
   - Verify environment_score ≤ 0.23 (should be lowest)

7. **Check Tiers:**
   - Verify top 10-15 games are tier "A+"
   - Verify environment_score ≥ 0.32 for all A+ games
   - Verify no D-tier games have score > 0.24

---

## ERROR HANDLING

### Common Errors to Handle

```javascript
// Team not found
if (!team) {
  throw new Error(`Team not found in Teams sheet: ${fullName}`);
}

// Invalid week number
if (week < 1 || week > 18) {
  throw new Error(`Invalid week number: ${week}`);
}

// Missing required sheet
if (!scheduleSheet) {
  SpreadsheetApp.getUi().alert("Schedule sheet not found. Please create it first.");
  return;
}

// Environment rate not found
if (!match) {
  throw new Error(`No environment rate found for: ${venueType}, ${homeAway}, Division=${isDivision}`);
}
```

---

## ACCEPTANCE CRITERIA

### The implementation is complete when:

1. ✅ processSchedule() runs without errors on 272-game schedule
2. ✅ Schedule_Enriched sheet created with all 27 columns
3. ✅ All team name mappings work correctly (32 teams)
4. ✅ Home/away detection correct for both @ present and @ absent
5. ✅ Venue types match Teams reference (11 dome, 21 outdoor)
6. ✅ Primetime games correctly flagged (TNF/SNF/MNF)
7. ✅ Division games correctly identified
8. ✅ Environment scores calculated using column-based lookups
9. ✅ Games ranked 1-272 by environment score
10. ✅ Game tiers distributed reasonably (not all A+)
11. ✅ QA_Test sheet generated with validation data
12. ✅ Manual spot-checks pass for all sections
13. ✅ Custom menu appears and functions work
14. ✅ No hardcoded column indices anywhere in code

---

## DELIVERABLES

**File:** `module_6_schedule.gs` in Apps Script editor

**Functions:**
- processSchedule() - Main orchestrator
- getSheetData() - Column-based data reader
- parseHomeAway() - Home/away parser
- lookupTeamAbbr() - Team name mapper
- lookupVenue() - Venue data lookup
- flagPrimetime() - Primetime detector
- flagDivision() - Division checker
- assignWeekTier() - Week categorizer
- calculateEnvironmentScore() - Score calculator
- lookupEnvironmentRate() - Rate lookup
- rankGames() - Ranking and tier assignment
- assignGameTier() - Tier assigner
- assignBBPriority() - Priority assigner
- writeScheduleEnriched() - Output writer
- generateQATest() - QA sheet generator
- determineNetwork() - Network inferrer
- standardizeTime() - Time formatter
- parseTimeHour() - Time parser
- onOpen() - Menu creator
- openQATest() - QA viewer

**Output Sheets:**
- Schedule_Enriched (272 rows × 27 columns)
- QA_Test (validation data)

---

**END OF IMPLEMENTATION SPEC**

**Ready for Claude Code to implement!**