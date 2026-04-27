# FIX: USE CEILING_RATE INSTEAD OF LETTER GRADES

**Problem:** All positions get same score per game (80, 80, 80, 80) because we're converting letter grades (A, A, A, A).

**Fix:** Use the actual ceiling_rate values from Schedule_Enriched, not the letter grades.

---

## What to Change

**Current (wrong):**
- Read qb_grade (letter A/B/C/D)
- Convert to score (A=80, B=60, etc.)
- Result: qb_score = 80

**New (correct):**
- Read qb_ceiling_rate (decimal like 0.395)
- Convert to percentile score (0-100)
- Result: qb_score = 95 (top percentile)

---

## Implementation

**Replace in all calculations:**

Old columns: qb_grade, rb_grade, wr_grade, te_grade
New columns: qb_ceiling_rate, rb_ceiling_rate, wr_ceiling_rate, te_ceiling_rate

**Convert ceiling_rate to 0-100 scale:**
```
For each position (QB, RB, WR, TE):
1. Collect all 272 ceiling_rate values for that position
2. Calculate percentile rank for each value
3. Score = percentile × 100 (0-100 range)
```

Example:
- qb_ceiling_rate 0.395 = 95th percentile = score 95
- qb_ceiling_rate 0.228 = 15th percentile = score 15

---

## Files to Update

**Game_Scores:**
- Use ceiling_rate percentiles instead of letter grade conversion
- Result: different scores per position (95, 72, 92, 93 instead of 80, 80, 80, 80)

**schedule_quality calculation:**
- Use ceiling_rate percentiles instead of letter grade scores
- Result: QB schedule_quality ≠ WR schedule_quality

**Rebuild:**
1. Game_Scores sheet
2. Position_Value_Rankings (schedule_quality column)
3. Stack_Targets (shared_schedule_quality)
4. Team_Stack_Rankings (composite scores)

---

**Result:** Position-specific scores that reflect actual performance rates, not simplified letter grades.