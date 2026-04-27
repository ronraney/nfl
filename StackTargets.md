# STACK_TARGETS SPECIFICATION

**Purpose:** Identify complete QB+2PC stacks ranked by shared elite game overlap and ADP efficiency

---

## DEFINITION

**Stack = QB + 2 Pass Catchers (WR/TE) from same team**

**Core principle:**
- QB is anchor (required)
- 2 pass catchers minimum (WR+WR or WR+TE)
- Optional 4th piece if value exists

---

## DATA SOURCE

**Input:** Position_Value_Rankings enhanced with:
- elite_games_count (# of games in top 50 by environment quality)
- Team assignment
- Position

**Process:**
1. Group players by team
2. Find QB + top 2 pass catchers by value_score
3. Calculate shared elite games
4. Calculate stack efficiency

---

## OUTPUT STRUCTURE

### Stack_Targets Sheet

**Columns:**
1. rank - Overall stack ranking
2. team - Team abbreviation
3. qb_name - QB name
4. qb_adp - QB ADP
5. pc1_name - Pass catcher 1 name
6. pc1_position - WR or TE
7. pc1_adp - Pass catcher 1 ADP
8. pc2_name - Pass catcher 2 name
9. pc2_position - WR or TE
10. pc2_adp - Pass catcher 2 ADP
11. total_stack_cost - Sum of 3 ADPs
12. shared_elite_games - # of elite games all 3 share
13. stack_efficiency - shared_elite_games / total_stack_cost
14. stack_grade - A+/A/B/C/D based on efficiency
15. draft_strategy - Text guidance

**Sort by:** stack_efficiency descending (best value stacks first)

---

## EXAMPLE ROWS

```
Rank 1: LAR Stack (A+)
├─ QB: Matthew Stafford (100.8)
├─ WR: Puka Nacua (5.4)
├─ WR: Davante Adams (45.6)
├─ Total Cost: 152 ADP
├─ Shared Elite Games: 10
├─ Efficiency: 0.066 (10 games / 152 cost)
├─ Grade: A+
└─ Strategy: "Anchor with Nacua R1, add Stafford R8-9, Adams R4-5"

Rank 2: MIN Stack (A)
├─ QB: Kyler Murray (105.6)
├─ WR: Justin Jefferson (10.2)
├─ TE: T.J. Hockenson (85)
├─ Total Cost: 201 ADP
├─ Shared Elite Games: 8
├─ Efficiency: 0.040
├─ Grade: A
└─ Strategy: "Anchor with Jefferson R1, complete mid-rounds"

Rank 3: DAL Stack (A)
├─ QB: Dak Prescott (79.2)
├─ WR: CeeDee Lamb (9.6)
├─ WR: Brandin Cooks (122)
├─ Total Cost: 211 ADP
├─ Shared Elite Games: 7
├─ Efficiency: 0.033
├─ Grade: A
└─ Strategy: "Lamb R1, Dak R7, complete late"
```

---

## GRADING SCALE

**Stack Efficiency Thresholds:**
- A+: ≥ 0.050 (elite value)
- A: 0.035-0.049 (strong value)
- B: 0.025-0.034 (good value)
- C: 0.015-0.024 (fair value)
- D: < 0.015 (poor value)

---

## ELITE GAMES DEFINITION

**Top 50 games by environment quality:**
- Use environment_rate from Schedule_Enriched
- Sort all 272 games descending
- Top 50 = "elite games"
- Count how many elite games each player participates in

**Example:**
- LAR has 3 games in top 50 (Weeks 5, 9, 12)
- Stafford plays in all 3 → elite_games_count = 3
- Nacua plays in all 3 → elite_games_count = 3
- Adams plays in all 3 → elite_games_count = 3
- Shared elite games = 3 (all 3 players in same 3 games)

---

## COVERAGE

**Show top 20-25 stacks** (not all 32 teams)

**Why limit:**
- Some teams have poor schedules (no elite games)
- Some teams lack 3 draftable players
- Focus on actionable stacks

**Minimum criteria to include:**
- QB in top 32 by ADP (draftable)
- At least 2 pass catchers in top 100 by ADP
- At least 2 shared elite games

---

## DRAFT STRATEGY RULES

**By Stack Grade:**

**A+ Stacks (efficiency ≥ 0.050):**
- "Priority target - build entire draft around this"
- "Anchor early, complete mid-rounds"

**A Stacks (0.035-0.049):**
- "Strong target - complete if pieces available"
- "Flexible - can pivot if better value emerges"

**B Stacks (0.025-0.034):**
- "Opportunistic - take if falls to value"
- "Don't force - need discount"

**C/D Stacks:**
- "Avoid - poor shared game overlap"
- "Take for talent only, not stack potential"

---

## OPTIONAL 4TH PIECE

**If a team has strong 4th option, note it:**

```
LAR Stack (Extended)
├─ Core 3: Stafford + Nacua + Adams (152 ADP)
├─ Optional RB: Blake Corum (126.8)
└─ Full Stack: 279 ADP total, 10 shared games
```

**Show in separate column:**
- optional_4th_name
- optional_4th_position
- optional_4th_adp

---

## USAGE WORKFLOW

**Pre-Draft:**
1. Review Stack_Targets
2. Identify 2-3 target stacks (A+ or A grade)
3. Note anchor players (early picks)

**During Draft:**
1. Take anchor (usually WR1) early
2. Monitor availability of QB and WR2
3. Complete stack when value appears
4. Pivot to backup stack if pieces unavailable

**Example:**
- Target: LAR Stack (A+)
- Round 1: Nacua available → TAKE (anchor)
- Round 8: Stafford available → TAKE (QB)
- Round 5: Adams available → TAKE (complete stack)
- Result: 3-piece stack for 152 ADP with 10 shared elite games

---

## RELATIONSHIP TO OTHER OUTPUTS

**Stack_Targets = Strategic planning tool**
- Pre-draft: Choose which stacks to target
- Shows complete builds ranked by efficiency

**Position_Value_Rankings = Tactical execution tool**
- During draft: Individual player decisions
- Enhanced with stack_grade and stack_role columns

**Both needed:**
- Stack_Targets → "I want LAR Stack"
- Position_Value_Rankings → "Stafford available at R8, take?"

---

## IMPLEMENTATION NOTES

**Data requirements:**
1. Team_Schedule_Summary (already have)
2. Position_Value_Rankings with enhanced columns:
   - elite_games_count (NEW - needs calculation)
   - team (already have)
   - position (already have)
   - value_score (already have)

**Calculation steps:**
1. Define top 50 elite games (from Schedule_Enriched)
2. Count elite games per player
3. Group by team
4. For each team: QB + top 2 pass catchers by value_score
5. Calculate shared elite games (games all 3 appear in)
6. Calculate efficiency = shared / total_cost
7. Assign grade
8. Sort by efficiency
9. Take top 20-25

**No code - just logic specification**

---

**END OF SPECIFICATION**