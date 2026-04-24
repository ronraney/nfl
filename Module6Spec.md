# MODULE 6: COMPLETE ANALYTICAL FRAMEWORK
**NFL Schedule Analysis - Full Implementation**

**Version:** 2.0 (Complete)
**Date:** April 23, 2026
**Replaces:** Simple environment-only ranking

---

## EXECUTIVE SUMMARY

Module 6 processes the 2026 NFL schedule using **complete findings from Modules 2-5** to create position-specific game grades, stack recommendations, and benchmark-aware analysis.

**Key Enhancement:** Instead of one "environment score" per game, we calculate:
- **5 position-specific grades** (QB, RB, WR, TE, DST)
- **Stack requirement flags** (QB+2PC, bring-back, onslaught)
- **Correlation insights** (which positions to pair)
- **Benchmark context** (percentile-aware grading)

---

## OUTPUT: SCHEDULE_ENRICHED SCHEMA

### Columns 1-14: Base + Enrichment (UNCHANGED)
```
week, game_date, game_time, day_of_week, home_team, away_team, network, game_id,
venue_name, venue_type, is_primetime, primetime_slot, is_division, week_tier
```

### Columns 15-23: Vegas Placeholders (UNCHANGED)
```
total, spread, home_moneyline, away_moneyline, favorite_team, underdog_team,
vegas_bucket, home_itt, away_itt
```

### Columns 24-43: ANALYSIS (NEW STRUCTURE)

**Environment Context (3 columns):**
```
24. environment_key        - "Dome_Home_Prime_Mid" (lookup key)
25. environment_rate       - 0.353 (from 24-scenario lookup)
26. environment_rank       - 2 (rank among 24 scenarios)
```

**Position-Specific Grades (15 columns):**
```
27. qb_grade              - "A+" (position-specific tier)
28. qb_ceiling_rate       - 0.450 (QB-specific rate for this environment)
29. qb_recommendation     - "ELITE" (ELITE/STRONG/PLAYABLE/WEAK/AVOID)

30. rb_grade              - "B"
31. rb_ceiling_rate       - 0.240
32. rb_recommendation     - "PLAYABLE"

33. wr_grade              - "A"
34. wr_ceiling_rate       - 0.380
35. wr_recommendation     - "STRONG"

36. te_grade              - "A"
37. te_ceiling_rate       - 0.350
38. te_recommendation     - "STRONG"

39. dst_grade             - "D"
40. dst_ceiling_rate      - 0.110
41. dst_recommendation    - "AVOID"
```

**Stack Flags (3 columns):**
```
42. stack_requirements    - "QB+2PC_REQUIRED,BRING_BACK_MANDATORY"
43. onslaught_eligible    - TRUE/FALSE (4+ same team viable)
44. correlation_notes     - "Dome_High_Total:Opposing_WR_130%"
```

**Game Classification (3 columns):**
```
45. overall_tier          - "A+" (best position average)
46. game_type             - "Shootout/Grind/Blowout/Competitive"
47. bb_priority           - "High/Med/Low" (Best Ball draft priority)
```

**TOTAL: 47 columns**

---

## DATA SOURCES

### 1. Environment_Combinations (24 scenarios)
**From:** ENVIRONMENT_INTERACTION_ANALYSIS.md

**Structure:**
```
environment_key, ceiling_rate, sample_size, rank
Dome_Away_Prime_Late, 0.387, 31, 1
Dome_Home_Prime_Mid, 0.353, 85, 2
Dome_Away_Prime_Early, 0.339, 56, 3
...
Dome_Away_Prime_Mid, 0.183, 93, 24
```

**24 scenarios =** Venue (Dome/Outdoor) × Home/Away × Primetime (Prime/Day) × Week Tier (Early/Mid/Late)

---

### 2. Position_Environment_Multipliers (NEW - Derived)
**From:** Module 3 position-specific analysis

**Structure:**
```
position, environment_factor, multiplier
QB, Primetime, 1.38
QB, Dome, 1.20
RB, Primetime, 0.99
RB, Dome, 1.00
WR, Primetime, 1.04
WR, Dome, 1.18
TE, Primetime, 1.06
TE, Dome, 1.19
DST, Primetime, 1.05
DST, Dome, 1.05
```

**Formula:**
```
Position_Rate = Base_Environment_Rate × Position_Multiplier
```

**Example:**
```
Game: Dome Home Prime Mid
Base rate: 0.353
QB rate: 0.353 × 1.38 × 1.20 = 0.584 (58.4% ceiling - ELITE!)
RB rate: 0.353 × 0.99 × 1.00 = 0.349 (34.9% ceiling - STRONG)
DST rate: 0.353 × 1.05 × 1.05 = 0.389 (38.9% ceiling - STRONG)
```

---

### 3. Position_Benchmarks
**From:** Benchmarks_1.csv (already have)

**DraftKings thresholds:**
```
QB: P95=29.9, P75=22.1, P50=15.0
RB: P95=26.7, P75=13.2, P50=6.5
WR: P95=24.9, P75=12.7, P50=6.9
TE: P95=18.8, P75=10.0, P50=5.2
DST: P95=17.0, P75=9.8, P50=5.0
```

**Use for:** Grading tiers (ceiling rate × benchmark = expected points above threshold)

---

### 4. Stack_Requirements_By_Environment
**From:** BringBack_By_Vegas.csv + Stacking_By_Vegas.csv

**For environment-only (no Vegas), use HEURISTICS:**

**High-scoring environments (rate ≥ 0.30):**
```
qb_plus_2pc: REQUIRED (100%)
bring_back: MANDATORY (100%)
bring_back_targets: WR (110-130%), RB (60-85%), TE (65-80%)
onslaught_viable: TRUE
```

**Mid-scoring environments (rate 0.24-0.30):**
```
qb_plus_2pc: REQUIRED (95%)
bring_back: RECOMMENDED (97%)
bring_back_targets: WR (102%), RB (62%), TE (57%)
onslaught_viable: TRUE
```

**Low-scoring environments (rate < 0.24):**
```
qb_plus_2pc: REQUIRED (87%)
bring_back: OPTIONAL (67-87%)
bring_back_targets: Variable by game script
onslaught_viable: FALSE (prefer RB+DST)
```

---

### 5. Onslaught_Detection
**From:** Stack_Performance_6.csv

**Onslaught = 4+ players from same team in ceiling performance**

**Conditions:**
- Environment rate ≥ 0.28 (A tier or better)
- NOT a blowout scenario (when we add Vegas, spread < 7)
- Dome OR Primetime (high-correlation environments)

**When flagged:**
- Best Ball: Can draft 5-6 players from same game
- DFS: Team stacks viable (QB+RB+WR+WR or QB+RB+TE+WR)

---

### 6. Correlation_Notes
**From:** Module 4 asymmetric correlation findings

**Key patterns to flag:**

**DST→RB correlation (63%):**
```
If DST ceiling → 63% chance RB ceiling
If RB ceiling → 26% chance DST ceiling
Note: "DST_dominant_game_script_favors_RB"
```

**Opposing WR in high totals:**
```
High-rate environments: Bring-back WR 110-130% (often 2 WRs)
Note: "Shootout_multiple_opposing_WR_viable"
```

**QB+RB by environment:**
```
Dome: 50-62% QB+RB correlation
Outdoor: 60-73% QB+RB correlation (more run-heavy)
Note: "Outdoor_games_favor_QB_RB_stacks"
```

---

## CALCULATION LOGIC

### Step 1: Determine Environment Key

```javascript
function getEnvironmentKey(venue, homeAway, primetime, weekTier) {
  // Build key from components
  const venueKey = venue; // "Dome" or "Outdoor"
  const locationKey = homeAway; // "Home" or "Away"
  const primetimeKey = primetime ? "Prime" : "Day";
  const tierKey = weekTier; // "Early", "Mid", "Late"

  return `${venueKey}_${locationKey}_${primetimeKey}_${tierKey}`;
}
```

**Example:**
```
Dome, Home, TNF, Week 7 → "Dome_Home_Prime_Mid"
```

---

### Step 2: Lookup Base Environment Rate

```javascript
function lookupEnvironmentRate(envKey, envCombinationsData) {
  const match = envCombinationsData.find(row => row.environment_key === envKey);

  if (!match) {
    // Fallback to simplified lookup if exact combo not found
    return fallbackLookup(envKey);
  }

  return {
    rate: match.ceiling_rate,
    rank: match.rank,
    sample: match.sample_size
  };
}
```

---

### Step 3: Calculate Position-Specific Rates

```javascript
function calculatePositionRates(baseRate, primetime, venue, division) {
  const positions = ['QB', 'RB', 'WR', 'TE', 'DST'];
  const rates = {};

  for (const pos of positions) {
    let rate = baseRate;

    // Apply position-specific multipliers
    rate *= getPositionMultiplier(pos, 'venue', venue);
    rate *= getPositionMultiplier(pos, 'primetime', primetime);

    // Division penalty (position-neutral for now)
    if (division && venue === "Outdoor") {
      rate *= 0.92; // Division outdoor penalty
    }

    rates[pos] = Math.round(rate * 1000) / 1000;
  }

  return rates;
}

function getPositionMultiplier(position, factor, value) {
  const multipliers = {
    QB: { venue_Dome: 1.20, primetime: 1.38 },
    RB: { venue_Dome: 1.00, primetime: 0.99 },
    WR: { venue_Dome: 1.18, primetime: 1.04 },
    TE: { venue_Dome: 1.19, primetime: 1.06 },
    DST: { venue_Dome: 1.05, primetime: 1.05 }
  };

  if (factor === 'venue' && value === 'Dome') {
    return multipliers[position].venue_Dome;
  } else if (factor === 'primetime' && value) {
    return multipliers[position].primetime;
  }

  return 1.00; // Baseline
}
```

---

### Step 4: Assign Position Grades

```javascript
function assignPositionGrade(rate) {
  if (rate >= 0.40) return "A+";  // Elite (40%+ ceiling)
  if (rate >= 0.32) return "A";   // Strong (32-40%)
  if (rate >= 0.24) return "B";   // Playable (24-32%)
  if (rate >= 0.18) return "C";   // Weak (18-24%)
  return "D";                      // Avoid (<18%)
}

function assignRecommendation(rate) {
  if (rate >= 0.40) return "ELITE";
  if (rate >= 0.32) return "STRONG";
  if (rate >= 0.24) return "PLAYABLE";
  if (rate >= 0.18) return "WEAK";
  return "AVOID";
}
```

---

### Step 5: Determine Stack Requirements

```javascript
function determineStackRequirements(envRate, venue, primetime) {
  const requirements = [];

  // QB+2PC is always required (87-100% across all scenarios)
  requirements.push("QB+2PC_REQUIRED");

  // Bring-back mandatory in high-rate environments
  if (envRate >= 0.30) {
    requirements.push("BRING_BACK_MANDATORY");
  } else if (envRate >= 0.24) {
    requirements.push("BRING_BACK_RECOMMENDED");
  } else {
    requirements.push("BRING_BACK_OPTIONAL");
  }

  return requirements.join(",");
}

function checkOnslaughtEligible(envRate, venue, primetime) {
  // Onslaught viable in high-correlation environments
  return (envRate >= 0.28) && (venue === "Dome" || primetime);
}

function generateCorrelationNotes(envRate, venue, primetime) {
  const notes = [];

  // High-rate environments favor multiple opposing WR
  if (envRate >= 0.32) {
    notes.push("Opposing_WR_130%_Multi_Viable");
  }

  // Dome games favor passing stacks
  if (venue === "Dome") {
    notes.push("Dome_Pass_Heavy_Stack");
  }

  // Outdoor games favor QB+RB
  if (venue === "Outdoor") {
    notes.push("Outdoor_QB+RB_73%");
  }

  return notes.join(";");
}
```

---

### Step 6: Classify Game Type

```javascript
function classifyGameType(qbRate, rbRate, dstRate) {
  // Shootout: High QB, low DST
  if (qbRate >= 0.40 && dstRate < 0.20) {
    return "Shootout";
  }

  // Grind: High RB, low QB
  if (rbRate >= 0.28 && qbRate < 0.25) {
    return "Grind";
  }

  // Blowout indicator: DST high
  if (dstRate >= 0.35) {
    return "Blowout";
  }

  // Default: Competitive
  return "Competitive";
}
```

---

## IMPLEMENTATION TASKS

### Task 1: Create Environment_Combinations Lookup Table
**Extract from:** ENVIRONMENT_INTERACTION_ANALYSIS.md

**24 rows:**
```csv
environment_key,ceiling_rate,sample_size,rank
Dome_Away_Prime_Late,0.387,31,1
Dome_Home_Prime_Mid,0.353,85,2
...
Dome_Away_Prime_Mid,0.183,93,24
```

**Add to Google Sheet as reference tab.**

---

### Task 2: Create Position_Multipliers Table
**Derive from:** Module 3 analysis

**10 rows (5 positions × 2 factors):**
```csv
position,factor,value,multiplier
QB,venue,Dome,1.20
QB,primetime,Yes,1.38
RB,venue,Dome,1.00
RB,primetime,Yes,0.99
...
```

---

### Task 3: Update calculateEnvironmentScore()
**New function:** `calculatePositionScores()`

**Returns object:**
```javascript
{
  environment_key: "Dome_Home_Prime_Mid",
  environment_rate: 0.353,
  environment_rank: 2,
  qb_rate: 0.584,
  qb_grade: "A+",
  qb_recommendation: "ELITE",
  rb_rate: 0.349,
  rb_grade: "A",
  rb_recommendation: "STRONG",
  // ... all positions
  stack_requirements: "QB+2PC_REQUIRED,BRING_BACK_MANDATORY",
  onslaught_eligible: true,
  correlation_notes: "Opposing_WR_130%_Multi_Viable;Dome_Pass_Heavy_Stack",
  overall_tier: "A+",
  game_type: "Shootout",
  bb_priority: "High"
}
```

---

### Task 4: Update writeScheduleEnriched()
**Column count:** 27 → 47 columns

**New columns:** 24-47 (see schema above)

---

### Task 5: Update generateQATest()
**Add new sections:**

**Section 8: Position-Specific Grading**
```
Game, QB Grade, RB Grade, WR Grade, TE Grade, DST Grade, Notes
Week 5 THU LAR vs SF, A+, B, A, A, D, "QB elite, DST avoid"
```

**Section 9: Stack Requirements**
```
Game, Env Rate, QB+2PC, Bring-Back, Onslaught, Type
Week 5 THU LAR vs SF, 0.337, REQUIRED, MANDATORY, TRUE, Shootout
```

**Section 10: Correlation Insights**
```
Game, Primary Stack, Bring-Back Targets, Notes
Week 5 THU LAR vs SF, QB+2WR+TE, Opposing WR×2, "130% multi-WR viable"
```

---

### Task 6: Update TNF Differentiation
**Already identified - implement:**

```javascript
if (primetime.slot === "TNF") {
  primetimeMultiplier = 1.05;  // 5% boost
} else if (primetime.slot === "SNF" || primetime.slot === "MNF") {
  primetimeMultiplier = 1.065; // 6.5% boost
}
```

---

## ACCEPTANCE CRITERIA

**Module 6 is complete when:**

1. ✅ All 272 games processed
2. ✅ All 47 columns populated
3. ✅ Position-specific grades for QB/RB/WR/TE/DST
4. ✅ Stack requirements flagged (QB+2PC, bring-back, onslaught)
5. ✅ Correlation notes provide actionable insights
6. ✅ TNF differentiated from SNF/MNF
7. ✅ Environment lookup uses 24 scenarios (not 8)
8. ✅ QA_Test includes new validation sections
9. ✅ Game classification working (Shootout/Grind/Blowout/Competitive)
10. ✅ Best Ball priority accurately reflects position grades

---

## VALIDATION TESTS

### Test 1: Elite Shootout Game
**Game:** Week 5 Thu, SF @ LAR (Dome Home Prime Mid)

**Expected:**
```
environment_rate: 0.353
qb_grade: A+
qb_rate: ~0.58 (elite)
dst_grade: D
dst_rate: ~0.15 (avoid)
stack_requirements: QB+2PC_REQUIRED,BRING_BACK_MANDATORY
onslaught_eligible: TRUE
game_type: Shootout
```

---

### Test 2: Division Outdoor Grind
**Game:** Week 1 Sun, DAL @ PHI (Outdoor Away Day Early Division)

**Expected:**
```
environment_rate: ~0.22 (division outdoor penalty)
qb_grade: C
rb_grade: B (outdoor favors RB)
stack_requirements: QB+2PC_REQUIRED,BRING_BACK_OPTIONAL
game_type: Competitive or Grind
```

---

### Test 3: Low-Scoring Defense Game
**Game:** Any L_Close equivalent (when Vegas added)

**Expected:**
```
qb_grade: D
dst_grade: A+ (DST loves low-scoring)
stack_requirements: BRING_BACK_OPTIONAL
game_type: Grind or Blowout
```

---

## DELIVERABLES

**Files:**
1. `module_6_complete.gs` - Full implementation
2. Environment_Combinations sheet - 24 scenarios
3. Position_Multipliers sheet - Position factors
4. Schedule_Enriched - 272 rows × 47 columns
5. QA_Test - 10 validation sections

**Documentation:**
- Module 6 complete specification (this file)
- Position grading methodology
- Stack requirement logic
- Correlation interpretation guide

---

## FUTURE ENHANCEMENTS (Post-Vegas)

**When Vegas lines available:**
1. Replace environment-only rates with Vegas bucket rates
2. Use Position_Vegas_Performance actual data
3. Apply BringBack_By_Vegas exact percentages
4. Classify games into 9 Vegas buckets
5. Update stack requirements to bucket-specific rules

**The framework supports this - just swap data sources!**

---

**END OF SPECIFICATION**

This is the complete Module 6 using ALL findings from Modules 2-5.