# REBUILD NFL_DASHBOARD FROM RAW DFS DATA

**Objective:** Calculate ceiling/volatility metrics for all players from game-by-game DFS performance data

---

## DATA SOURCE

**Sheet name:** `NFL-2025-DFS`

Contains game-by-game DFS data with columns:
- `PLAYER / DST` - Player name
- `TEAM` - Team abbreviation  
- Position column (e.g., "QB", "RB", "WR", "TE")
- `WEEK#` - Week number (1-18)
- `DRAFTKINGS` - DK salary (e.g., 7900 = $7,900)
- DK points column - Actual DK points scored

---

## PROCESSING LOGIC

### Step 1: Filter Data

**Exclude:**
- All DST rows (position = "D" or "DST")
- Players with < 4 games played (insufficient sample)

**Include:**
- All QB, RB, WR, TE performances
- 2025 regular season games only

### Step 2: Group by Player

For each unique player (by PLAYER / DST name):
- Collect all their game performances
- Store: team, position, games played, salary per game, points per game

### Step 3: Calculate Metrics Per Player

For each player with ≥4 games:

**A) Season 4x Rate (ceiling_rate)**
```
For each game:
  4x_threshold = (DK_salary × 4) / 1000
  hit_4x = TRUE if DK_points >= 4x_threshold

ceiling_rate = count(hit_4x = TRUE) / total_games
Result: 0-100% (e.g., 63.6% = hit ceiling in 7 of 11 games)
```

**B) Season 5x Rate**
```
5x_threshold = (DK_salary × 5) / 1000
season_5x = count(points >= 5x_threshold) / total_games
```

**C) Season 6x Rate**
```
6x_threshold = (DK_salary × 6) / 1000
season_6x = count(points >= 6x_threshold) / total_games
```

**D) Season CV% (volatility)**
```
mean_points = average(all DK points)
std_dev = standard deviation(all DK points)
season_cv = (std_dev / mean_points) × 100

Result: 20-120% typically (higher = more boom/bust)
```

**E) Last 6 Games 4x Rate (L6 4x)**
```
Filter to last 6 games by week number
l6_4x = count(hit 4x) / min(6, games_played)

If player has < 6 games, use all available games
```

**F) Last 6 Games CV% (L6 CV%)**
```
Using last 6 games only:
l6_cv = (std_dev_l6 / mean_l6) × 100
```

**G) 4x Reliable% (consistency metric)**
```
Count consecutive game stretches where player hit 4x
reliable% = (count of 2+ game streaks hitting 4x) / total_games

Example: Hit 4x in weeks 1,2,3,5,7,8 = 2 streaks (1-3, 7-8) = 5 reliable games / 11 total = 45.5%
```

### Step 4: Determine Position

Use the position from first game appearance (should be consistent).

If position changes during season (e.g., TE/WR hybrid), use most frequent position.

### Step 5: Calculate Position Baselines

For unmatched players in Position_Value_Rankings, we need baseline values:

```
For each position (QB, RB, WR, TE):
  baseline_ceiling_rate = median(ceiling_rate) for that position
  baseline_volatility = median(season_cv) for that position
```

These get written to the builder code as fallback values.

---

## OUTPUT STRUCTURE

### New Sheet: NFL_Dashboard

**Columns:**
1. `Player` - Player name (exact from NFL-2025-DFS)
2. `Position` - QB/RB/WR/TE
3. `Team` - Team abbreviation
4. `Games` - Total games played in 2025
5. `DK Ceiling` - Max DK points scored in any game
6. `Season 4x` - % of games hitting 4x salary
7. `Season 5x` - % of games hitting 5x salary
8. `Season 6x` - % of games hitting 6x salary
9. `Season CV%` - Volatility measure
10. `L6 4x` - Last 6 games 4x rate
11. `L6 CV%` - Last 6 games volatility
12. `4x Reliable%` - Consistency metric

**Sort order:** By position, then by Season 4x descending

**Expected rows:** ~300-400 players (all who played ≥4 games, excluding DST)

---

## EXAMPLE CALCULATIONS

**CeeDee Lamb (WR, DAL):**

Game 1: Salary $7,900, scored 21 points
- 4x threshold = 7900 × 4 / 1000 = 31.6 points
- Hit 4x? NO (21 < 31.6)

Game 2: Salary $8,200, scored 18.5 points
- 4x threshold = 32.8 points
- Hit 4x? NO

...continue for all games...

If played 17 games, hit 4x in 6 games:
- Season 4x = 6/17 = 35.3%

If points were: 21, 18.5, 35, 12, 40, 8, 28, ...
- Mean = 23.4
- Std Dev = 10.8
- CV% = (10.8 / 23.4) × 100 = 46.2%

---

## VALIDATION CHECKS

**After generation:**

1. **Player count:** Should be 300-400 rows (all non-DST with ≥4 games)
2. **No DST rows:** Verify no defense/special teams
3. **Ceiling rates reasonable:** Most players 10-40%, some elite 50%+
4. **CV% range:** 20-120% typical, flag any >150%
5. **Position distribution:** ~30 QB, ~100 RB, ~150 WR, ~50 TE
6. **Spot checks:**
   - Patrick Mahomes: Should have good 4x rate (elite QB)
   - Christian McCaffrey: High ceiling, moderate CV%
   - Boom/bust WR3s: High CV%, lower 4x rate

**Log summary:**
```
NFL_Dashboard created: 387 players
Position breakdown: QB 28, RB 112, WR 178, TE 69
Average ceiling rates: QB 25%, RB 18%, WR 22%, TE 15%
Average CV%: QB 45%, RB 52%, WR 48%, TE 51%
Position baselines: QB ceiling 25% / CV 45%, RB 18% / 52%, WR 22% / 48%, TE 15% / 51%
```

---

## IMPLEMENTATION STEPS

1. Load NFL-2025-DFS sheet
2. Filter out DST rows
3. Group performances by player name
4. For each player with ≥4 games:
   - Calculate all 7 metrics
   - Determine position
   - Calculate DK Ceiling (max score)
5. Calculate position baselines (median values)
6. Create NFL_Dashboard sheet
7. Write player rows sorted by position then Season 4x
8. Write position baseline summary to execution log
9. Validate player count and distributions

---

## ACCEPTANCE CRITERIA

- [ ] NFL_Dashboard sheet created
- [ ] 300-400 player rows (no DST)
- [ ] All metrics calculated (no null values)
- [ ] Position column populated correctly
- [ ] Season 4x rates range 0-100%
- [ ] CV% values reasonable (20-120% mostly)
- [ ] Position baselines logged
- [ ] Spot check: Patrick Mahomes has data
- [ ] Spot check: Christian McCaffrey has data
- [ ] No errors during generation

---

## DOWNSTREAM IMPACT

**After rebuilding NFL_Dashboard:**

Run the variance integration again:
- Match rate should be 80-90% (vs current 39%)
- Most veterans will have real data
- Rookies/injured players still use baseline
- Player type distribution should normalize

Then rebuild Module 7 outputs with better variance data.

---

**END OF NFL_DASHBOARD REBUILD SPEC**