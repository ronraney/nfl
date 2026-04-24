# NFL SCHEDULE SYSTEM - DATA DEVELOPMENT TRACK
**Version:** 1.0  
**Date:** April 21, 2026  
**Purpose:** Concrete data requirements and development tasks

---

## PROJECT SETUP

### New Workbook
**Name:** NFL 2026 Schedule Planner  
**Platform:** Google Sheets  
**Purpose:** Forward-looking game grading and fantasy format planning  

**Not using:** Existing NFL DFS Analysis workbook (research archive)

---

## DATA REQUIREMENTS

### Required Data (Minimum Viable System)

#### 1. SCHEDULE DATA
**Source:** Pro Football Reference CSV  
**Format:** 272 rows (regular season games only, no playoffs)  
**Columns from PFR:**
```
Week, Day, Date, Time, Winner/tie, @, Loser/tie, [stats columns we ignore]
```

**What we do with it:**
- Parse @ symbol to determine home/away
- Map full team names to abbreviations
- Extract primetime games (based on time + day)
- This is the foundation everything builds on

**Status:** Will upload when available

---

#### 2. TEAMS REFERENCE
**Purpose:** Map team names to metadata  
**Format:** 32 rows, one per team  
**Columns needed:**
```
team_abbr        # PHI, KC, BAL, etc.
team_name        # Philadelphia Eagles, Kansas City Chiefs, etc.
stadium          # Lincoln Financial Field, GEHA Field, etc.
venue_type       # Dome or Outdoor
division         # NFC East, AFC West, etc.
conference       # NFC or AFC
```

**Why we need it:**
- PFR uses full names ("Philadelphia Eagles")
- We need abbreviations (PHI) for compact display
- We need venue_type (Dome/Outdoor) for grading
- We need division for division game flagging

**Source:** Can create manually (32 teams) or extract from Module 3 existing data

**Validation:** All 32 teams present, all stadiums mapped

---

#### 3. ENVIRONMENT CEILING RATES
**Purpose:** The actual percentages from Module 3 findings  
**Format:** ~20-30 rows covering environment combinations  
**Columns needed:**
```
venue_type       # Dome or Outdoor
home_away        # Home or Away
division         # Yes or No (optional, for specific penalties)
primetime        # Yes or No (optional, for specific boosts)
week_tier        # Early, Mid, Late (optional)
ceiling_rate     # The percentage: 0.294, 0.248, 0.217, etc.
```

**Key values from Module 3:**
```
Dome + Home = 0.294 (29.4%)
Dome + Away = 0.249 (24.9%)
Outdoor + Away = 0.248 (24.8%)
Outdoor + Home = 0.235 (23.5%)
Division + Outdoor + Away = 0.217 (21.7%)
Baseline = 0.251 (25.1%)
```

**Modifiers:**
```
Primetime overall = +0.065 (+6.5%)
Primetime QB-specific = +0.38 (+38%)
Mid-season (Weeks 5-12) = +0.05 (+5%)
```

**Why we need it:**
- These are the numbers we multiply to grade games
- Without this, we can't calculate environment scores

**Source:** Extract from ENVIRONMENT_INTERACTION_ANALYSIS.md

**Validation:** All major environment combinations covered

---

### Optional Data (Enhancements)

#### 4. VEGAS MULTIPLIERS
**Purpose:** Position performance by Vegas bucket  
**Format:** ~45 rows (9 buckets × 5 positions)  
**Columns needed:**
```
vegas_bucket     # H_Close, M_Mid, L_Blowout, etc.
position         # QB, WR, RB, TE, DST
avg_points       # Average DK points
ceiling_rate     # Ceiling percentage
multiplier       # For game grading: 1.15, 1.00, 0.85, etc.
```

**Why we need it:**
- Refines grades when Vegas lines available
- Not needed for environment-only grading

**Source:** Extract from MODULE_5_QUICK_REFERENCE.md and Position_Vegas_Performance

**Status:** Create when Vegas integration needed

---

#### 5. STACKING RULES
**Purpose:** Correlation requirements from Module 4/5  
**Format:** ~10 rows of rules  
**Columns needed:**
```
vegas_bucket     # H_Close, M_Mid, etc. (or "All")
rule_type        # QB+2PC, Bring-back, etc.
requirement      # "Required", "Recommended", "Optional"
rate             # Percentage: 1.00 (100%), 0.87 (87%), etc.
notes            # Context
```

**Key rules:**
```
All buckets: QB+2PC = 100% (required)
H_Close/H_Mid: Bring-back = 100% (required)
M_Mid: Bring-back = 97% (required)
WR is primary bring-back = 75-130%
```

**Why we need it:**
- For generating stack blueprints
- For Best Ball recommendations

**Source:** Extract from POSITION_CORRELATION_COMPLETE_ANALYSIS.md

**Status:** Create for Best Ball module

---

## SHEET STRUCTURE

### Reference Sheets (Static)
1. **Teams** - 32 rows
2. **Environment_Rates** - ~20 rows
3. **Vegas_Multipliers** - ~45 rows (later)
4. **Stacking_Rules** - ~10 rows (later)

### Data Sheets (Updated)
5. **Schedule** - 272 rows, all columns, progressively filled

### Output Sheets (Generated)
6. **BestBall_Targets**
7. **Redraft_Weekly**
8. **Dynasty_Schedule**
9. **Guillotine_Risk**
10. **DFS_MainSlate**
11. **DFS_Showdown**

---

## SCHEDULE SHEET SCHEMA

### All Columns (27 total)

**Base Schedule (8) - filled from PFR import:**
```
week                 # 1-18
game_date            # YYYY-MM-DD
game_time            # HH:MM (24hr)
day_of_week          # Thu, Sun, Mon
home_team            # 3-letter abbr
away_team            # 3-letter abbr
network              # Prime, NBC, CBS, FOX, ESPN
game_id              # Unique: "2026_W01_PHI_DAL"
```

**Enrichment (6) - calculated from Teams + logic:**
```
venue_name           # Stadium name
venue_type           # Dome or Outdoor
is_primetime         # TRUE or FALSE
primetime_slot       # TNF, SNF, MNF, or blank
is_division          # TRUE or FALSE
week_tier            # Early, Mid, Late
```

**Vegas (9) - filled when available, blank initially:**
```
total                # Game total
spread               # Point spread
home_moneyline       # ML odds
away_moneyline       # ML odds
favorite_team        # Team abbr
underdog_team        # Team abbr
vegas_bucket         # H_Close, M_Mid, etc.
home_itt             # Implied team total
away_itt             # Implied team total
```

**Analysis (4) - calculated from formulas:**
```
environment_score    # Composite score
game_tier            # A+, A, B, C, D
target_rank          # 1-272
bb_priority          # High, Med, Low (optional)
```

---

## DEVELOPMENT TASKS

### Task 1: Create Workbook & Reference Sheets
**Deliverable:** New Google Sheet with 3 reference tabs

**Sub-tasks:**
- [ ] Create new workbook: "NFL 2026 Schedule Planner"
- [ ] Create Teams sheet (32 rows)
  - Columns: team_abbr, team_name, stadium, venue_type, division, conference
  - Source: Manual entry or extract from Module 3
- [ ] Create Environment_Rates sheet (~20 rows)
  - Columns: venue_type, home_away, division, primetime, week_tier, ceiling_rate
  - Source: Extract from ENVIRONMENT_INTERACTION_ANALYSIS.md
  - Key values: Dome Home 0.294, Outdoor Home 0.235, Division Outdoor Away 0.217
- [ ] Validate: All 32 teams present, all environment combos covered

**Acceptance criteria:**
- Teams sheet has all 32 NFL teams
- Each team mapped to correct stadium and venue type
- Environment_Rates has all major combinations from Module 3
- Ceiling rates match Module 3 findings

---

### Task 2: Create Schedule Template
**Deliverable:** Schedule sheet with 15 sample games for testing

**Sub-tasks:**
- [ ] Create Schedule sheet with all 27 columns (schema above)
- [ ] Add 15 sample games covering:
  - Week 1: TNF (dome), early Sun (outdoor), SNF (outdoor), MNF (division)
  - Week 8: Mid-season games (various)
  - Week 17: Late-season games (various)
  - Mix of dome/outdoor, division/non-division, primetime/day
- [ ] Fill first 8 columns (base schedule) with realistic data
- [ ] Leave Vegas columns (9) blank
- [ ] Leave Analysis columns (4) blank
- [ ] Use PFR format: Full team names, @ symbol for away

**Sample data format:**
```
Week | Day | Date       | Time  | Winner/tie             | @ | Loser/tie           | ...
1    | Thu | 2026-09-04 | 20:20 | Kansas City Chiefs     |   | Baltimore Ravens    | ...
1    | Sun | 2026-09-08 | 13:00 | Philadelphia Eagles    |   | Green Bay Packers   | ...
1    | Sun | 2026-09-08 | 20:20 | Buffalo Bills          |   | Miami Dolphins      | ...
```

**Acceptance criteria:**
- 15 games in Schedule sheet
- Covers all test scenarios (primetime, division, venue types, week tiers)
- Format matches PFR structure
- Ready for function testing

---

### Task 3: Build module_6_schedule.gs - Import Function
**Deliverable:** importSchedule() function

**Function spec:**
```javascript
function importSchedule() {
  // Input: PFR CSV format in Schedule sheet
  // Processing:
  //   1. Parse each row
  //   2. Determine home/away from @ symbol
  //   3. Map full team names to abbreviations (lookup Teams sheet)
  //   4. Assign game_id: "2026_W{week}_{away}_{home}"
  //   5. Write to columns: week, game_date, game_time, day_of_week, 
  //                        home_team, away_team, network, game_id
  // Output: First 8 columns populated with clean data
}
```

**Logic details:**
- If @ column is BLANK: Winner = Home, Loser = Away
- If @ column has value: Loser = Home, Winner = Away
- Team name mapping: Use Teams sheet, column team_name → team_abbr
- game_id format: "2026_W01_DAL_PHI" (away first, home second)

**Acceptance criteria:**
- Runs on 15-game template without errors
- All team names correctly mapped to abbreviations
- Home/away correctly identified from @ symbol
- game_id format correct and unique

---

### Task 4: Build module_6_schedule.gs - Enrichment Function
**Deliverable:** enrichSchedule() function

**Function spec:**
```javascript
function enrichSchedule() {
  // Input: Schedule sheet with first 8 columns filled
  // Processing:
  //   1. Join to Teams sheet to get venue_name, venue_type
  //   2. Flag primetime (check time + day):
  //      - Thu 8:00-8:30pm = TNF
  //      - Sun 8:00-8:30pm = SNF
  //      - Mon 8:00-8:30pm = MNF
  //   3. Flag division (check if home and away in same division)
  //   4. Assign week_tier:
  //      - Weeks 1-4: Early
  //      - Weeks 5-12: Mid
  //      - Weeks 13-18: Late
  //   5. Write to columns: venue_name, venue_type, is_primetime,
  //                        primetime_slot, is_division, week_tier
  // Output: Columns 9-14 populated
}
```

**Logic details:**
- Venue lookup: home_team → Teams.team_abbr → Teams.stadium, Teams.venue_type
- Primetime check: 
  ```
  if (day == "Thu" && time >= "20:00" && time <= "20:30") → TNF
  if (day == "Sun" && time >= "20:00" && time <= "20:30") → SNF
  if (day == "Mon" && time >= "20:00" && time <= "20:30") → MNF
  ```
- Division check: 
  ```
  home_division = Teams.division where team_abbr = home_team
  away_division = Teams.division where team_abbr = away_team
  if (home_division == away_division) → TRUE
  ```
- Week tier: Simple numeric range check

**Acceptance criteria:**
- All 15 games have venue_type populated correctly
- Primetime games correctly flagged (TNF/SNF/MNF)
- Division games correctly identified
- Week tiers correct (Early/Mid/Late)

---

### Task 5: Build module_6_schedule.gs - Environment Scoring Function
**Deliverable:** calculateEnvironmentScores() function

**Function spec:**
```javascript
function calculateEnvironmentScores() {
  // Input: Schedule sheet with columns 1-14 filled
  // Processing:
  //   1. For each game, lookup base ceiling rate from Environment_Rates
  //   2. Apply modifiers:
  //      - Primetime: ×1.065 overall (×1.38 for QB-specific use)
  //      - Week tier Mid: ×1.05
  //      - Division + Outdoor + Away: Use specific 0.217 rate
  //   3. Calculate environment_score
  //   4. Assign game_tier based on score thresholds:
  //      - A+: score >= 0.32
  //      - A:  score >= 0.28
  //      - B:  score >= 0.24
  //      - C:  score >= 0.20
  //      - D:  score < 0.20
  //   5. Rank all games 1-272 by environment_score
  //   6. Write to columns: environment_score, game_tier, target_rank
  // Output: Columns 24-26 populated
}
```

**Scoring formula (environment-only, no Vegas):**
```
Base lookup:
- If division AND outdoor AND away: base_rate = 0.217
- Else: lookup Environment_Rates by venue_type + home_away

Modifiers:
- If primetime: multiply by 1.065
- If week_tier == "Mid": multiply by 1.05

Final score:
environment_score = base_rate × primetime_modifier × week_tier_modifier
```

**Example calculation:**
```
Game: Week 10, BUF @ KC, Arrowhead (outdoor), SNF, non-division
- Base: Outdoor + Away = 0.248
- Primetime: ×1.065
- Week: Mid = ×1.05
- Score: 0.248 × 1.065 × 1.05 = 0.277
- Tier: B (score between 0.24 and 0.28)
```

**Acceptance criteria:**
- All 15 games have environment_score calculated
- Scores align with Module 3 findings (dome > outdoor, home > away for domes)
- Game tiers correctly assigned (A+ through D)
- Games ranked 1-15 by score

---

### Task 6: Validation & Testing
**Deliverable:** Verified system on template data

**Test cases:**
1. **Dome home primetime game:**
   - Expected: Highest score (≥0.32, A+ tier)
   - Example: NO vs ATL, Week 10, SNF
   - Base: 0.294 × 1.065 × 1.05 = 0.328 → A+

2. **Division outdoor away game:**
   - Expected: Lowest score (≤0.22, D tier)
   - Example: PHI @ NYG, Week 1
   - Base: 0.217 × 1.00 × 1.00 = 0.217 → D

3. **Outdoor non-division SNF:**
   - Expected: Mid-high score (~0.27-0.28, B tier)
   - Example: BUF @ KC, Week 10
   - Base: 0.248 × 1.065 × 1.05 = 0.277 → B

**Validation checklist:**
- [ ] Import function processes PFR format correctly
- [ ] Team name mapping works for all 32 teams
- [ ] Home/away determination accurate
- [ ] Primetime flagging correct (TNF/SNF/MNF)
- [ ] Division game detection accurate
- [ ] Venue types match Teams reference
- [ ] Environment scores follow Module 3 patterns
- [ ] Game tiers distributed reasonably (not all A+)

---

## DATA EXTRACTION TASKS

### Extract Teams Reference
**Source:** Module 3 existing work or manual creation  
**Output:** 32-row CSV or direct sheet entry

**Columns needed:**
```
ARI, Arizona Cardinals, State Farm Stadium, Dome, NFC West, NFC
ATL, Atlanta Falcons, Mercedes-Benz Stadium, Dome, NFC South, NFC
BAL, Baltimore Ravens, M&T Bank Stadium, Outdoor, AFC North, AFC
...
```

**Validation:** All 32 teams, all stadiums correct, all dome/outdoor accurate

---

### Extract Environment Rates
**Source:** ENVIRONMENT_INTERACTION_ANALYSIS.md  
**Output:** ~20 row lookup table

**Key combinations to include:**
```
Dome, Home, No, No, Any, 0.294
Dome, Away, No, No, Any, 0.249
Outdoor, Away, No, No, Any, 0.248
Outdoor, Home, No, No, Any, 0.235
Outdoor, Away, Yes, No, Any, 0.217
```

**Additional combinations (if needed):**
- Primetime variants
- Week tier variants
- Division dome variants

**Validation:** Matches Module 3 findings exactly

---

## DEPENDENCIES

**Task 1 (Reference sheets) → enables → Task 2, 3, 4**  
**Task 2 (Template) → enables → Task 3, 4, 5, 6**  
**Task 3 (Import) → required for → Task 4, 5**  
**Task 4 (Enrichment) → required for → Task 5**  
**Task 5 (Scoring) → required for → Task 6**

**Critical path:** Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6

---

## SUCCESS CRITERIA

**System is ready when:**
1. ✅ Can import PFR schedule format
2. ✅ Can enrich with venue/division/primetime data
3. ✅ Can calculate environment scores
4. ✅ Can rank all games A+ to D
5. ✅ Results validate against Module 3 patterns
6. ✅ Template produces expected results

**Then ready for:**
- Real 2026 schedule import (when available)
- Best Ball target generation
- Format-specific analysis modules

---

## NOTES

**Column mapping:**
- All functions reference columns BY NAME, not index
- Schema is fixed (27 columns defined)
- Functions populate progressively (import → enrich → score)

**Data updates:**
- Reference sheets: Static (update rarely)
- Schedule sheet: Progressive (fill columns over time)
- Output sheets: Generated (recalculate as needed)

**Vegas integration (future):**
- Leave Vegas columns (15-23) blank initially
- Add Vegas module later when lines available
- Environment scoring works without Vegas

---

**END OF DATA TRACK DOCUMENT**