# TASK 4B: STACK ANALYSIS ENHANCEMENT

**Objective:** Expand stack analysis to show all viable combinations and add team rankings

---

## WHAT'S CHANGING

**Current Stack_Targets:** 25 rows (1 best stack per team)

**New Stack_Targets:** 200-400 rows (all viable 3-player combos)

**New outputs:**
- Team_Stack_Rankings sheet (32 teams ranked by stack quality)
- Game_Scores reference sheet (272 games with position scores)

---

## 1. ENHANCE STACK_TARGETS

### Generate All Combinations

For each team, create all 15 possible 3-player stack combinations:

**QB + 2 pass catchers:**
1. QB + WR1 + WR2
2. QB + WR1 + WR3
3. QB + WR1 + TE1
4. QB + WR2 + WR3
5. QB + WR2 + TE1
6. QB + WR3 + TE1

**QB + RB + pass catcher:**
7. QB + RB1 + WR1
8. QB + RB1 + WR2
9. QB + RB1 + WR3
10. QB + RB1 + TE1
11. QB + RB2 + WR1
12. QB + RB2 + WR2
13. QB + RB2 + WR3
14. QB + RB2 + TE1

**QB + 2 RBs:**
15. QB + RB1 + RB2

### Filter Rules

**Only include combinations where:**
- All 3 players have ADP < 200 (top 200 picks)
- QB exists and is draftable
- Both other players exist on team

**Skip combinations where:**
- Any player has ADP ≥ 200 (undraftable)
- Position doesn't exist on team (no RB2, no WR3, etc.)

### Calculation (Same as Current)

For each valid combination:
- shared_schedule_quality = (player1_schedule_quality + player2_schedule_quality + player3_schedule_quality) / 3
- total_stack_cost = player1_adp + player2_adp + player3_adp
- stack_efficiency = shared_schedule_quality / total_stack_cost
- stack_grade = assign grade based on efficiency (A+ ≥8.0, A 6.0-7.9, B 4.0-5.9, C 2.5-3.9, D <2.5)
- draft_strategy = assign text based on grade

### Sort Order

Sort all stacks by stack_efficiency descending (highest value first)

### Output

Same columns as current Stack_Targets:
- rank, team, qb_name, qb_adp, pc1_name, pc1_position, pc1_adp, pc2_name, pc2_position, pc2_adp, total_stack_cost, shared_schedule_quality, stack_efficiency, stack_grade, draft_strategy

**Expected result:** 200-400 rows instead of 25

---

## 2. CREATE TEAM_STACK_RANKINGS

### Purpose

Show which teams are best for stacking overall (not just best single stack)

### Calculation Per Team

For each team, across all their viable stacks (from enhanced Stack_Targets):

1. **best_stack_eff** = highest efficiency stack for this team
2. **avg_stack_eff** = average efficiency across all viable stacks
3. **viable_stacks** = count of stacks with all players ADP < 200
4. **a_plus_count** = count of stacks with efficiency ≥ 8.0
5. **a_count** = count of stacks with efficiency 6.0-7.9
6. **b_count** = count of stacks with efficiency 4.0-5.9

### Composite Score

```
composite_score = (best_stack_eff × 0.4) + (avg_stack_eff × 0.4) + (viable_stacks × 0.2)
```

Balances peak performance, average depth, and total options.

### Team Grading

Based on composite_score:
- A+: ≥ 6.0
- A: 4.5-5.9
- B: 3.0-4.4
- C: 2.0-2.9
- D: < 2.0

### Team Strategy Text

By team_grade:
- A+: "Elite stacking team - multiple A+ combinations available"
- A: "Strong stacking team - several high-quality options"
- B: "Viable stacking team - good combinations available"
- C: "Limited stacking team - fewer quality options"
- D: "Weak stacking team - avoid building around this team"

### Output Columns

New sheet: Team_Stack_Rankings

Columns:
1. rank - Overall team rank (1-32)
2. team - Team abbreviation
3. best_stack_eff - Highest efficiency stack
4. avg_stack_eff - Average across all stacks
5. viable_stacks - Count of stacks with ADP < 200
6. a_plus_count - Number of A+ stacks
7. a_count - Number of A stacks
8. b_count - Number of B stacks
9. composite_score - Calculated composite
10. team_grade - A+/A/B/C/D
11. recommendation - Strategy text

Sort by composite_score descending

**Expected result:** 32 rows (one per team)

---

## 3. CREATE GAME_SCORES REFERENCE

### Purpose

Show numeric scores for all 272 games across all positions (for reference/validation)

### Calculation

For each game in Schedule_Enriched:
- Convert qb_grade to qb_score (A+=100, A=80, B=60, C=40, D=20)
- Convert rb_grade to rb_score
- Convert wr_grade to wr_score
- Convert te_grade to te_score

### Output Columns

New sheet: Game_Scores

Columns:
1. game_id - Unique identifier
2. week - Week number
3. matchup - "LAR vs SF"
4. venue_type - Dome/Outdoor/Retractable
5. qb_score - 0-100
6. rb_score - 0-100
7. wr_score - 0-100
8. te_score - 0-100

Sort by week, then game_id

**Expected result:** 272 rows (one per game)

---

## IMPLEMENTATION STEPS

1. Update `buildStackTargets` to generate all 15 combo types per team
2. Add filtering logic for ADP < 200
3. Calculate composite scores for teams
4. Create `buildTeamStackRankings` function
5. Create `writeTeamStackRankings` function
6. Create `buildGameScores` function
7. Create `writeGameScores` function
8. Update menu to include new functions

---

## ACCEPTANCE CRITERIA

- [ ] Stack_Targets shows 200-400 stacks (not 25)
- [ ] All combinations include only players with ADP < 200
- [ ] CIN appears 8-12 times with different combos
- [ ] LAR appears 10-15 times with different combos
- [ ] Stacks sorted by efficiency (highest first)
- [ ] Team_Stack_Rankings sheet created (32 rows)
- [ ] Teams ranked by composite score
- [ ] CIN likely rank 1 or 2 (high best_stack + high avg)
- [ ] Game_Scores sheet created (272 rows)
- [ ] All position scores show 20-100 range
- [ ] No errors when running all three write functions

---

**END OF TASK 4B**