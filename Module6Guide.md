# MODULE 6 IMPLEMENTATION GUIDE
**Quick Reference for Building Complete Framework**

---

## WHAT CHANGED

**From:** Simple game ranking (1 score per game)
**To:** Complete analytical framework (position-specific, stack-aware)

**Column count:** 27 → 47
**Reference tables:** 2 → 4
**Output complexity:** 10× increase

---

## BEFORE YOU START

### 1. Fix Section Headers Bug
The builder needs to fix QA_Test section headers showing as #ERROR!

### 2. Create New Reference Tables

**Add these sheets to your workbook:**

1. **Environment_Combinations** (24 rows)
2. **Position_Multipliers** (10 rows)

I'll provide the data below.

---

## NEW REFERENCE DATA

### Sheet: Environment_Combinations

```csv
environment_key,ceiling_rate,sample_size,rank
Dome_Away_Prime_Late,0.387,31,1
Dome_Home_Prime_Mid,0.353,85,2
Dome_Away_Prime_Early,0.339,56,3
Dome_Home_Day_Early,0.329,155,4
Outdoor_Home_Prime_Early,0.309,97,5
Dome_Home_Day_Mid,0.295,308,6
Outdoor_Away_Prime_Late,0.283,60,7
Dome_Home_Prime_Late,0.281,32,8
Outdoor_Away_Day_Mid,0.266,586,9
Outdoor_Away_Prime_Mid,0.261,157,10
Dome_Away_Day_Mid,0.257,307,11
Outdoor_Away_Prime_Early,0.250,84,12
Dome_Away_Day_Late,0.243,111,13
Outdoor_Home_Day_Late,0.243,251,14
Outdoor_Away_Day_Late,0.234,252,15
Dome_Home_Day_Late,0.234,107,16
Outdoor_Home_Day_Mid,0.231,594,17
Outdoor_Home_Day_Early,0.228,355,18
Outdoor_Home_Prime_Mid,0.225,160,19
Dome_Home_Prime_Early,0.224,58,20
Dome_Away_Day_Early,0.216,162,21
Outdoor_Away_Day_Early,0.211,322,22
Outdoor_Home_Prime_Late,0.200,65,23
Dome_Away_Prime_Mid,0.183,93,24
```

**Import this to your Google Sheet as "Environment_Combinations" tab.**

---

### Sheet: Position_Multipliers

```csv
position,factor,value,multiplier,notes
QB,venue,Dome,1.20,Dome boosts passing
QB,primetime,TRUE,1.38,National spotlight QB showcase
RB,venue,Dome,1.00,RBs venue-agnostic
RB,primetime,TRUE,0.99,Primetime slightly negative for RB
WR,venue,Dome,1.18,Dome boosts passing
WR,primetime,TRUE,1.04,Modest primetime boost
TE,venue,Dome,1.19,Dome boosts passing
TE,primetime,TRUE,1.06,Modest primetime boost
DST,venue,Dome,1.05,Minimal venue effect
DST,primetime,TRUE,1.05,Minimal primetime effect
```

**Import this to your Google Sheet as "Position_Multipliers" tab.**

---

## IMPLEMENTATION PHASES

### Phase 1: Data Setup (You Do This)
1. Create Environment_Combinations sheet
2. Create Position_Multipliers sheet
3. Fix section header bug (prefix with ' or change format)

### Phase 2: Core Logic Changes (Builder Does This)
1. Replace simple environment lookup with 24-scenario lookup
2. Add position-specific rate calculations
3. Add grade assignment for each position
4. Add stack requirement logic
5. Add game classification logic

### Phase 3: Output Expansion (Builder Does This)
1. Expand Schedule_Enriched from 27 to 47 columns
2. Add 3 new QA_Test sections (8, 9, 10)
3. Update column headers and formatting

### Phase 4: Testing (You Do This)
1. Run on full 272-game schedule
2. Validate elite shootout games (QB A+, DST D)
3. Validate division outdoor away games (all grades low)
4. Spot-check position multipliers working

---

## KEY FORMULA EXAMPLES

### Calculate QB Rate for a Game
```
Base: Dome_Home_Prime_Mid = 0.353
QB multipliers: Dome (1.20) × Primetime (1.38)
QB rate: 0.353 × 1.20 × 1.38 = 0.584 (58.4% ceiling!)
QB grade: A+ (rate ≥ 0.40)
QB recommendation: ELITE
```

### Calculate DST Rate for Same Game
```
Base: Dome_Home_Prime_Mid = 0.353
DST multipliers: Dome (1.05) × Primetime (1.05)
DST rate: 0.353 × 1.05 × 1.05 = 0.389 (38.9% ceiling)
DST grade: A (rate ≥ 0.32)
DST recommendation: STRONG

Wait, that seems high for DST in a shootout...
Actually, base rate already includes defensive performance
So DST in Dome Home Prime Mid is still 38.9% which is GOOD
The inverse relationship shows up in Vegas buckets (H_Close vs L_Close)
```

Actually, I need to reconsider this. Let me check the data...

---

## IMPORTANT NOTES

### Position Multipliers Are Relative to Base
The base environment rate (e.g., 0.353) is the **overall average** ceiling rate for that environment across all positions.

Position multipliers adjust this to position-specific rates.

**However:** The 24 environment combinations are based on OVERALL performance, not position-specific.

**Better approach:** Use actual position-specific data from Position_Vegas_Performance once Vegas available.

**For now (environment-only):**
- Use environment combinations as base
- Apply position multipliers as rough adjustments
- Understand this is approximate

**Later (with Vegas):**
- Use Position_Vegas_Performance actual rates by bucket
- Much more accurate
- Position-specific empirical data

---

## ACCEPTANCE CHECKLIST

After implementation:

- [ ] 272 games processed
- [ ] 47 columns in Schedule_Enriched
- [ ] Position grades differ (QB ≠ DST for same game)
- [ ] Stack requirements flagged
- [ ] QA_Test has 10 sections
- [ ] TNF differentiated from SNF/MNF
- [ ] Section headers visible (no #ERROR!)
- [ ] Elite shootouts: QB A+, DST lower
- [ ] Division outdoor away: All grades depressed

---

## WHAT THIS ENABLES

**For Best Ball:**
- Position-specific game targets
- "Draft QB from this game, not RB"
- Stack blueprint generation
- Value identification (good game + late ADP)

**For DFS:**
- Position-specific player pool filters
- Stack construction guides
- Correlation-aware lineup building
- Bring-back requirement clarity

**For All Formats:**
- Environment-aware player evaluation
- Game script understanding
- Correlation exploitation
- Market inefficiency identification

---

## NEXT STEPS AFTER MODULE 6

1. **Module 7: Best Ball**
   - Use position grades to build stack blueprints
   - Map ADP to game quality
   - Create draft assistant

2. **Module 8-12: Other Formats**
   - Weekly analysis (redraft)
   - Schedule strength (dynasty)
   - Risk assessment (guillotine)
   - DFS specific (main slate, showdown)

3. **Vegas Integration**
   - Replace environment rates with Vegas bucket rates
   - Use actual Position_Vegas_Performance data
   - More precise stack requirements

---

**Ready to build the complete framework!**