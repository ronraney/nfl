# POSITION_VALUE_RANKINGS ENHANCEMENT
**Add Stack Columns to Existing Player Dashboard**

---

## NEW COLUMNS TO ADD

### Column: elite_games_count
**Definition:** Number of games (out of 272) that rank in top 50 by environment_rate

**Calculation:**
1. Sort all 272 games by environment_rate descending
2. Top 50 = "elite games"
3. For each player: count how many of their 17 games are in top 50

**Example:**
- LAR plays Weeks 5, 9, 12 which rank #3, #8, #12 in environment_rate
- All 3 are in top 50
- Stafford elite_games_count = 3

---

### Column: stack_grade
**Definition:** Letter grade indicating stackability

**Thresholds (QB/WR/TE):**
- A+: 8+ elite games
- A: 6-7 elite games
- B: 4-5 elite games
- C: 2-3 elite games
- D: 0-1 elite games

**Thresholds (RB):**
- A+: 6+ elite games
- A: 4-5 elite games
- B: 3 elite games
- C: 2 elite games
- D: 0-1 elite games

**RBs have lower thresholds because stack potential matters less for RBs**

---

### Column: primary_stack
**Definition:** Team abbreviation of player's primary stack

**Value:** Same as team column (LAR, DAL, MIN, etc.)

---

### Column: stack_role
**Definition:** Player's role within their stack

**Values:**
- "QB Core" - The quarterback
- "WR1 Anchor" - Top WR by value_score on team
- "WR2 Core" - Second WR in core stack
- "TE Core" - Tight end in core stack
- "Flex Option" - 4th piece, draftable but not core
- "Not Stackable" - Player not part of viable stack

**Assignment logic:**
- QB with stack_grade ≥ B → "QB Core"
- Top WR by value_score on team → "WR1 Anchor"
- 2nd WR/TE in top 3 pass catchers → "WR2 Core" or "TE Core"
- 4th+ option with value_score > 0 → "Flex Option"
- Everyone else → "Not Stackable"

---

### Column: best_stack_with
**Definition:** Comma-separated list of 1-2 best teammates for stacking

**For QB:** Top 2 pass catchers by value_score
**For WR/TE:** QB + other top pass catcher
**For RB:** QB + top WR (if player has A/B stack grade)

**Example:**
- Stafford: "Nacua, Adams"
- Nacua: "Stafford, Adams"
- Corum: "Stafford, Nacua" (even though RB)

---

### Column: stack_strategy
**Definition:** Draft guidance based on stack role and grade

**By stack_grade + stack_role:**

**A+ stack_grade, WR1 Anchor:**
- "Draft early, build stack around"

**A+ stack_grade, QB Core:**
- "Priority target if you have teammates"

**A stack_grade, WR2 Core:**
- "Complete stack if anchor drafted"

**B stack_grade:**
- "Take if value, don't force"

**C/D stack_grade:**
- "Talent only, low stack value"

---

## UPDATED COLUMN ORDER

**Keep existing columns 1-13:**
1. rank
2. position
3. player_name
4. team
5. adp
6. round
7. a_plus_games
8. a_games
9. b_games
10. elite_game_value
11. schedule_pct
12. cost_pct
13. value_score

**Add new columns 14-19:**
14. elite_games_count (NEW)
15. stack_grade (NEW)
16. stack_role (NEW)
17. best_stack_with (NEW)
18. stack_strategy (NEW)
19. value_class (existing, moved from position 14)
20. recommendation (existing, moved from position 15)

**Total: 20 columns**

---

## EXAMPLE ENHANCED ROWS

### Matthew Stafford
```
rank: 10
position: QB
player_name: Matthew Stafford
team: LAR
adp: 100.8
round: 9
a_plus_games: 2
a_games: 5
b_games: 4
elite_game_value: 6.8
schedule_pct: 83
cost_pct: 55
value_score: 28
elite_games_count: 3 (NEW - Weeks 5, 9, 12 in top 50)
stack_grade: B (NEW - 3 elite games)
stack_role: QB Core (NEW)
best_stack_with: Nacua, Adams (NEW)
stack_strategy: Priority target if you have LAR WRs (NEW)
value_class: STRONG VALUE
recommendation: GOOD VALUE - Solid pick
```

### Puka Nacua
```
rank: 15
position: WR
player_name: Puka Nacua
team: LAR
adp: 5.4
round: 1
a_plus_games: 2
a_games: 5
b_games: 4
elite_game_value: 6.8
schedule_pct: 83
cost_pct: 100
value_score: -17
elite_games_count: 3 (NEW)
stack_grade: B (NEW)
stack_role: WR1 Anchor (NEW)
best_stack_with: Stafford, Adams (NEW)
stack_strategy: Draft early, build LAR stack around (NEW)
value_class: FAIR VALUE
recommendation: FAIR - Market priced
```

### Josh Allen
```
rank: 25
position: QB
player_name: Josh Allen
team: BUF
adp: 22.8
round: 2
a_plus_games: 1
a_games: 1
b_games: 6
elite_game_value: 4.3
schedule_pct: 52
cost_pct: 100
value_score: -48
elite_games_count: 1 (NEW - only 1 game in top 50)
stack_grade: D (NEW - low stackability)
stack_role: QB Core (NEW)
best_stack_with: Cook, Kincaid (NEW)
stack_strategy: Talent only, low stack value (NEW)
value_class: AVOID
recommendation: AVOID - Poor value
```

---

## USAGE DURING DRAFT

**Scenario 1: You have Puka Nacua**
- Filter Position_Value_Rankings to QB
- Look for stack_role = "QB Core" AND team = "LAR"
- Find Stafford: stack_strategy = "Priority target if you have LAR WRs"
- Decision: TAKE if available

**Scenario 2: Round 8, Stafford available**
- Check your roster: Do you have LAR pieces?
- NO → Check stack_strategy: still good value (+28 score)
- YES → stack_strategy says "Priority target" → SMASH

**Scenario 3: Evaluating multiple QBs**
- Compare stack_grade:
  - Stafford: B grade (3 elite games)
  - Allen: D grade (1 elite game)
- Stafford has 3x more stackable games

---

## RELATIONSHIP TO STACK_TARGETS

**Stack_Targets:**
- Strategic pre-draft planning
- "I want to target LAR Stack or DAL Stack"

**Position_Value_Rankings (Enhanced):**
- Tactical in-draft execution
- "Stafford available, I have Nacua, what do I do?"
- Answer: stack_strategy = "Priority target" → TAKE

**Both work together:**
1. Pre-draft: Review Stack_Targets → Choose LAR Stack
2. Round 1: Take Nacua (WR1 Anchor from Position_Value_Rankings)
3. Round 8: Filter to LAR QBs → Stafford shows "Priority target" → TAKE
4. Round 5: Filter to LAR WRs → Adams shows "Complete stack" → TAKE

---

**END OF SPECIFICATION**