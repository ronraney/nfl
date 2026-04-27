# MODULE 6 FIX: HOME/AWAY CEILING RATES

**Problem:** Current Schedule_Enriched has one ceiling_rate per position per game, applied to both home and away teams. This is wrong - home team advantage exists and should be captured.

**Fix:** Recalculate ceiling rates separately for home and away teams from 2025 performance data.

---

## DATA SOURCES

**Input 1: Vegas_Enhanced_Performances**
- 4,489 player performances from 2025 season
- Columns needed:
  - DK Pos (position: QB, RB, WR, TE)
  - Home_Away (Home or Away)
  - Venue_Type (Dome or Outdoor)
  - Primetime (Yes or No)
  - Division_Game (Yes or No)
  - Week_Tier (Early, Mid, Late)
  - DK Top5 Pts (TRUE or FALSE) - ceiling indicator

**Input 2: Current Schedule_Enriched**
- 272 games from 2025 season
- Has environment_key for each game
- Will be updated with new ceiling rates

---

## CALCULATION METHOD

### Step 1: Build Environment Key

For each performance in Vegas_Enhanced_Performances, build environment key:

```
environment_key = Venue_Type + "_" + Home_Away + "_" + Primetime_Label + "_" + Week_Tier

Examples:
- Dome_Home_Prime_Early
- Dome_Away_Day_Mid
- Outdoor_Home_Prime_Late
- Outdoor_Away_Day_Early
```

Where:
- Primetime_Label = "Prime" if Primetime = "Yes", else "Day"

### Step 2: Group and Calculate Ceiling Rates

Group performances by environment_key + position.

For each group, calculate ceiling rate:

```
ceiling_rate = count(DK Top5 Pts = TRUE) / count(total performances in group)
```

**Example:**
- Dome_Home_Prime_Early + QB performances: 20 total, 8 hit ceiling
- home_qb_ceiling_rate = 8 / 20 = 0.40

- Dome_Away_Prime_Early + QB performances: 15 total, 4 hit ceiling
- away_qb_ceiling_rate = 4 / 15 = 0.267

**Result:** Separate ceiling rates for home vs away teams in same environment.

### Step 3: Handle Missing Data

Some environment + home/away + position combinations may have very small samples (<5 performances).

**Fallback logic:**
1. If sample size < 5, use the overall environment average (combine home + away)
2. If still < 5, use position baseline across all environments
3. Minimum ceiling_rate = 0.15, maximum = 0.50

---

## OUTPUT STRUCTURE

### Update Schedule_Enriched

**Remove 4 columns:**
- qb_ceiling_rate
- rb_ceiling_rate
- wr_ceiling_rate
- te_ceiling_rate

**Add 8 columns:**
- home_qb_ceiling_rate
- away_qb_ceiling_rate
- home_rb_ceiling_rate
- away_rb_ceiling_rate
- home_wr_ceiling_rate
- away_wr_ceiling_rate
- home_te_ceiling_rate
- away_te_ceiling_rate

### Mapping Logic

For each game in Schedule_Enriched:

1. Get environment_key (already exists in Schedule_Enriched)
2. Look up home ceiling rates: home_qb_ceiling_rate, home_rb_ceiling_rate, home_wr_ceiling_rate, home_te_ceiling_rate
3. Look up away ceiling rates: away_qb_ceiling_rate, away_rb_ceiling_rate, away_wr_ceiling_rate, away_te_ceiling_rate
4. Populate both sets of columns

**Example row:**

```
Week 1, KC @ LAC (SoFi Dome)
environment_key: Dome_Home_Day_Early

home_qb_ceiling_rate: 0.42 (LAC QB at home in dome)
away_qb_ceiling_rate: 0.28 (KC QB away at dome)
home_rb_ceiling_rate: 0.35
away_rb_ceiling_rate: 0.22
home_wr_ceiling_rate: 0.40
away_wr_ceiling_rate: 0.31
home_te_ceiling_rate: 0.38
away_te_ceiling_rate: 0.25
```

---

## VALIDATION

**Check 1: Dome home advantage**
- home_qb_ceiling_rate > away_qb_ceiling_rate for dome games
- Expected: ~40% higher for home team

**Check 2: Outdoor games less pronounced**
- home vs away gap smaller for outdoor games
- Expected: ~10-20% difference

**Check 3: Sample sizes reasonable**
- Log any environment combinations with <5 performances
- Should be <10% of total combinations

**Check 4: Rate ranges**
- All rates between 0.15 and 0.50
- No zeros, no values >0.50

---

## IMPLEMENTATION STEPS

1. Load Vegas_Enhanced_Performances data
2. Build environment_key for each performance
3. Group by environment_key + position + home/away
4. Calculate ceiling rates for each group
5. Create lookup table: environment_key → 8 ceiling rates
6. Load current Schedule_Enriched
7. For each game, look up and populate 8 ceiling rate columns
8. Write updated Schedule_Enriched
9. Run validation checks
10. Display summary stats (sample sizes, home vs away differences)

---

## EXPECTED RESULTS

**Summary table to display:**

```
Environment          | Home QB | Away QB | Diff  | Sample
---------------------|---------|---------|-------|-------
Dome_Home_Prime_Mid  | 0.42    | 0.28    | +50%  | 25
Dome_Home_Day_Early  | 0.39    | 0.27    | +44%  | 30
Outdoor_Home_Day_Mid | 0.25    | 0.22    | +14%  | 45
```

Should show:
- Dome home advantage ~40-50%
- Outdoor home advantage ~10-20%
- Reasonable sample sizes for major environments

---

## DOWNSTREAM IMPACT

Once Schedule_Enriched is updated:

**Module 7 needs updates:**
1. Game_Scores: show 2 rows per game (home team row, away team row)
2. schedule_quality: use home rates for home games, away rates for away games
3. All outputs rebuild with corrected data

**But Module 6 fix completes first, then tackle Module 7.**

---

**END OF MODULE 6 FIX SPEC**