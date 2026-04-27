# MODULE 7: BEST BALL DRAFT ANALYZER
**Single Source of Truth - Current State & Path Forward**

---

## WHAT WE'RE BUILDING

**Best Ball draft decision tool with two outputs:**

1. **Position_Value_Rankings** - Player dashboard with value scores and stack context
2. **Stack_Targets** - Complete QB+2PC stacks ranked by efficiency

**Goal:** Identify market inefficiencies where players cost less than their schedule quality justifies.

---

## VALUE CALCULATION (COMPLETED ✓)

**Percentile Difference Approach:**

```
value_percentile = percentileRank(elite_game_value, 0-100)
cost_percentile = percentileRank(ADP, 0-100, inverted)
value_score = value_percentile - cost_percentile

Result: -100 to +100
  +79 = Brissett (100th %ile schedule, 21st %ile cost) = EXTREME VALUE
  -48 = Josh Allen (52nd %ile schedule, 100th %ile cost) = AVOID
```

**Thresholds:**
- \>40: EXTREME VALUE
- 20-40: STRONG VALUE
- -20 to 20: FAIR VALUE
- -40 to -20: SLIGHT REACH
- <-40: AVOID

---

## POSITION_VALUE_RANKINGS (NEEDS FIX)

**Current columns (20):**
1-13: rank, position, player_name, team, adp, round, a_plus_games, a_games, b_games, elite_game_value, schedule_pct, cost_pct, value_score
14-18: elite_games_count, stack_grade, stack_role, best_stack_with, stack_strategy
19-20: value_class, recommendation

**What's working:**
- Value scores correct (percentile difference)
- Stack columns present
- Stack grades assigned (A+ to D)

**What needs fixing:**
- stack_strategy text doesn't match grade/role (wrong mapping)
- elite_games_count uses arbitrary "top 50" cutoff
- Missing schedule_quality column

---

## STACK_TARGETS (NEEDS REBUILD)

**Current output:**
- 23 stacks created
- Uses "top 50 elite games" arbitrary cutoff
- Result: 17/23 graded D ("Avoid - poor shared game overlap")
- Even best stack (LAR) only B grade

**Problem:**
- Arbitrary "top 50" creates low shared counts
- Most teams only have 2-4 games in top 50
- Doesn't reflect actual schedule quality

---

## THE FIX: GAME SCORING SYSTEM

**Replace "top 50" with continuous scoring:**

### Step 1: Score All 272 Games
Calculate game_score (0-100 percentile) based on environment_rate:
- Best game = 100
- Worst game = 0
- Middle game = 50

### Step 2: Player Schedule Quality
schedule_quality = sum of player's 17 game_scores
- Range: ~200 (bad schedule) to ~1100 (elite schedule)
- elite_games_count = count of games with score ≥ 70

### Step 3: Stack Efficiency
For QB + 2PC (same team):
- shared_schedule_quality = sum of team's 17 game_scores (all 3 share same games)
- stack_efficiency = shared_schedule_quality / total_stack_cost

**Example - LAR Stack:**
- LAR 17 games have scores: [95, 88, 82, 65, 62, 58, 54, 48, 45, 42, 38, 35, 28, 22, 18, 12, 8]
- shared_schedule_quality = 896
- Stafford (100.8) + Nacua (5.4) + Adams (45.6) = 151.8 total ADP
- stack_efficiency = 896 / 151.8 = 5.90
- Grade: A (4.5-5.9 range)

**New efficiency grading:**
- A+: ≥ 6.0
- A: 4.5-5.9
- B: 3.0-4.4
- C: 2.0-2.9
- D: < 2.0

---

## NEXT TASK: FIX STACK ANALYSIS

**What builder needs to do:**

1. Calculate game_score (0-100 percentile) for all 272 games
2. Fix stack_strategy text mapping (grade + role → correct text)
3. Update elite_games_count (games with score ≥ 70, not "top 50")
4. Add schedule_quality column (sum of 17 game_scores)
5. Rebuild Stack_Targets with shared_schedule_quality
6. Update efficiency thresholds (6.0+ for A+, not 0.050+)

**Expected results:**
- LAR stack: efficiency 5.90, grade A (not B)
- 10-15 stacks grade B or better (not just 2-3)
- 5-8 stacks grade D (not 17)
- stack_strategy text matches grade/role combos

---

## THEN: FINAL TASKS

**After stack fix:**

**Task 5A: Draft_Strategy_Tiers**
- Round-by-round guidance (Rounds 1-18)
- Value cluster identification
- Position timing recommendations
- New sheet: Draft_Strategy_Tiers

**Task 5B: Final Validation**
- QA all outputs
- Verify calculations
- Test with different scenarios
- Final acceptance

---

## DATA SOURCES

**Inputs:**
- Schedule_Enriched (272 games × 47 columns from Module 6)
- ADP data (200 players)
- Team assignments

**Outputs:**
- Position_Value_Rankings (200 players × 20 columns)
- Stack_Targets (20-25 stacks × 17 columns)
- Draft_Strategy_Tiers (18 rounds, TBD columns)

---

## SUCCESS CRITERIA

**System correctly identifies:**
- Late-round players with elite schedules as value targets
- Early-round players with poor schedules as avoid
- High-efficiency stacks (dome teams, good schedules, affordable)
- Low-efficiency stacks (outdoor teams, poor schedules, expensive)

**Example success:**
- Stafford (ADP 100.8, elite schedule) = STRONG VALUE (+28 score)
- Josh Allen (ADP 22.8, mediocre schedule) = AVOID (-48 score)
- LAR Stack (dome team) = A grade (5.90 efficiency)
- BUF Stack (outdoor team) = C/D grade (low efficiency)

---

**END OF MASTER PLAN**