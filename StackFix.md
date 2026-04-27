# STACK ANALYSIS FIX - GAME GRADING APPROACH

**Problem:** Current implementation uses arbitrary "top 50" cutoff. Need grade-based system instead.

---

## WHAT'S WRONG

**Position_Value_Rankings:**
- `stack_strategy` text doesn't match grade/role combinations
- Example: A-grade QB Core says "Talent only, low stack value" (wrong)

**Stack_Targets:**
- Uses "top 50 elite games" arbitrary cutoff
- Creates artificially low shared_elite_games counts (2-4)
- Results in 17/23 stacks graded D ("Avoid")

---

## THE FIX: SUM POSITION-SPECIFIC GRADES (NOT "TOP 50")

**The builder's current data access is correct. Only the calculation method needs fixing.**

### Current (Wrong):
- Define "top 50 elite games" by environment_rate
- Count how many of player's 17 games are in top 50
- Result: Low counts (2-4 games), arbitrary cutoff

### Fixed (Right):
- Convert all position grades to numeric scores
- Sum the scores across player's 17 games
- No arbitrary cutoffs, uses all data

---

### Step 1: Convert Letter Grades to Scores

Map existing grades to 0-100 scale:
- A+: 100
- A: 80
- B: 60
- C: 40
- D: 20

Apply to all position grades: qb_grade, rb_grade, wr_grade, te_grade

### Step 2: Calculate schedule_quality Per Player

For each player's 17 games, sum the position-specific scores.

**Example - Stafford (LAR QB):**
- Week 1 (LAR @ DAL): qb_grade = B → qb_score = 60
- Week 2 (LAR vs SF, home dome): qb_grade = A+ → qb_score = 100
- Week 3 (LAR @ ARI): qb_grade = A → qb_score = 80
- ... (14 more games)
- schedule_quality = sum of 17 qb_scores = ~1100

**Example - Nacua (LAR WR):**
- Week 1 (LAR @ DAL): wr_grade = B → wr_score = 60
- Week 2 (LAR vs SF, home dome): wr_grade = A+ → wr_score = 100
- Week 3 (LAR @ ARI): wr_grade = A → wr_score = 80
- ... (14 more games)
- schedule_quality = sum of 17 wr_scores = ~1080

**Note:** Stafford and Nacua have different schedule_quality because QB and WR grades differ per game.

### Step 3: Calculate Stack Shared Schedule Quality

For QB + 2PC from same team:

Average the 3 players' schedule_quality values.

**LAR Stack:**
- Stafford (QB): 1100
- Nacua (WR): 1080
- Adams (WR): 1080 (same as Nacua, both WRs)
- shared_schedule_quality = (1100 + 1080 + 1080) / 3 = 1087

stack_efficiency = shared_schedule_quality / total_stack_cost
= 1087 / 151.8 = 7.16 (A+ grade)

---

## POSITION_VALUE_RANKINGS CHANGES

**Fix `stack_strategy` text generation:**

Map stack_grade + stack_role to correct strategy:

A+ grade, WR1 Anchor: "Draft early, build stack around"
A+ grade, QB Core: "Priority target if you have teammates"
A grade, QB Core: "Strong target if you have teammates"
A grade, WR2 Core: "Complete stack if anchor drafted"
B grade, QB Core: "Take if value, don't force"
B grade, any: "Opportunistic if completing stack"
C/D grade, any: "Talent only, low stack value"

**Update `elite_games_count` calculation:**

Count games where position-specific score ≥ 70.

For QB: Count games where qb_score ≥ 70
For WR: Count games where wr_score ≥ 70
For RB: Count games where rb_score ≥ 70
For TE: Count games where te_score ≥ 70

**Add `schedule_quality` column:**

Sum of 17 position-specific scores for player.

Range: ~400 (worst schedules, all D grades) to ~1700 (best schedules, all A+ grades)

---

## STACK_TARGETS CHANGES

**Update `shared_schedule_quality` calculation:**

Average the schedule_quality of QB + 2 pass catchers:

shared_schedule_quality = (qb_schedule_quality + pc1_schedule_quality + pc2_schedule_quality) / 3

**Update column names:**
- shared_elite_games → shared_schedule_quality
- stack_efficiency = shared_schedule_quality / total_stack_cost

**Update efficiency grading thresholds:**

New thresholds for score-sum system (range ~400-1700):
- A+: efficiency ≥ 8.0
- A: efficiency 6.0-7.9
- B: efficiency 4.0-5.9
- C: efficiency 2.5-3.9
- D: efficiency < 2.5

---

## EXPECTED RESULTS

**Position_Value_Rankings:**
- Stafford: schedule_quality = 1100 (sum of 17 qb_scores), elite_games_count = 9 (games where qb_score ≥70), stack_grade = A, stack_strategy = "Strong target if you have teammates"
- Nacua: schedule_quality = 1080 (sum of 17 wr_scores), slightly different from Stafford
- All LAR WRs have same schedule_quality (same wr_grades)
- Most QBs with schedule_quality 800-1100 get B/A grade with appropriate strategies

**Stack_Targets:**
- LAR: shared_schedule_quality = 1087 (average of 1100 + 1080 + 1080), efficiency = 7.16, grade A+
- 10-15 stacks grade B or better (not just 2-3)
- 5-8 stacks grade D (not 17)
- Dome teams with more home games rank higher (more A+ grades in schedule)

---

## IMPLEMENTATION STEPS

1. Convert letter grades to numeric scores (A+=100, A=80, B=60, C=40, D=20)
2. For each player, sum position-specific scores across 17 games
3. Calculate schedule_quality = sum of 17 scores
4. Fix `computeStackStrategy` function - map grade/role to correct text
5. Update elite_games_count - count games where position score ≥ 70
6. Rebuild Stack_Targets with averaged schedule_quality (QB + 2PC) / 3
7. Update Stack_Targets efficiency = shared_schedule_quality / total_cost
8. Update Stack_Targets grading with new thresholds (8.0+ for A+)
9. Re-run both outputs

---

## ACCEPTANCE CRITERIA

- [ ] Position_Value_Rankings stack_strategy text matches grade/role combinations
- [ ] All position grades converted to numeric scores (A+=100, A=80, B=60, C=40, D=20)
- [ ] elite_games_count based on position score ≥ 70, not "top 50"
- [ ] schedule_quality column added (sum of 17 position-specific scores)
- [ ] Stafford schedule_quality ≠ Nacua schedule_quality (QB grades ≠ WR grades)
- [ ] Stack_Targets uses averaged schedule_quality (QB+2PC)/3
- [ ] LAR stack shows A+ grade (efficiency ~7-8)
- [ ] Most stacks show B/C grades (not mostly D)
- [ ] No "top 50" or "top N" logic anywhere
- [ ] All calculations use qb_grade, rb_grade, wr_grade, te_grade from Schedule_Enriched

---

**END OF TASK**