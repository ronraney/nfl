# MODULE 6 v2.0 REBUILD - BUILDER TASK

**File:** `module_6_schedule.gs`
**Scope:** Major enhancement - position-specific grading

---

## OBJECTIVE

Transform single-score system into complete framework:
- Position-specific grades (QB/RB/WR/TE/DST)
- Stack requirement flags
- 24-scenario environment lookup
- 47-column output (up from 27)

---

## NEW REFERENCE SHEETS

User creates these first:

1. **Environment_Combinations** - 24 environment scenarios with ceiling rates
2. **Position_Multipliers** - Position-specific venue/primetime multipliers

---

## NEW OUTPUT SCHEMA (Columns 24-47)

Replace old 3-column analysis with new 24-column analysis:

**Environment (24-26):**
- environment_key, environment_rate, environment_rank

**Per Position (QB/RB/WR/TE/DST) - 5 × 3 = 15 columns (27-41):**
- {pos}_grade, {pos}_ceiling_rate, {pos}_recommendation

**Stack Analysis (42-44):**
- stack_requirements, onslaught_eligible, correlation_notes

**Classification (45-47):**
- overall_tier, game_type, bb_priority

---

## KEY NEW FUNCTIONS

### 1. buildEnvironmentKey()
```javascript
function buildEnvironmentKey(venue, homeAway, isPrimetime, weekTier) {
  const venueKey = venue; // "Dome" or "Outdoor"
  const locationKey = homeAway; // "Home" or "Away"
  const primetimeKey = isPrimetime ? "Prime" : "Day";
  const tierKey = weekTier; // "Early", "Mid", "Late"

  return `${venueKey}_${locationKey}_${primetimeKey}_${tierKey}`;
}
```

Returns: "Dome_Home_Prime_Mid", "Outdoor_Away_Day_Early", etc.

---

### 2. lookupEnvironmentRate() - REPLACE EXISTING
```javascript
function lookupEnvironmentRate(envKey, envCombinationsData) {
  const match = envCombinationsData.find(row => row.environment_key === envKey);

  if (!match) {
    throw new Error(`Environment key not found: ${envKey}`);
  }

  return {
    rate: match.ceiling_rate,
    rank: match.rank,
    sample: match.sample_size
  };
}
```

Lookup from 24-row table instead of 8-row.

---

### 3. calculatePositionRates() - NEW
```javascript
function calculatePositionRates(baseRate, venue, isPrimetime, multipliersData) {
  const positions = ['QB', 'RB', 'WR', 'TE', 'DST'];
  const rates = {};

  for (const pos of positions) {
    let rate = baseRate;

    // Apply venue multiplier if Dome
    if (venue === "Dome") {
      const venueMultiplier = getMultiplier(pos, 'venue', 'Dome', multipliersData);
      rate *= venueMultiplier;
    }

    // Apply primetime multiplier
    if (isPrimetime) {
      const primetimeMultiplier = getMultiplier(pos, 'primetime', 'TRUE', multipliersData);
      rate *= primetimeMultiplier;
    }

    rates[pos] = Math.round(rate * 1000) / 1000;
  }

  return rates; // {QB: 0.584, RB: 0.349, ...}
}

function getMultiplier(position, factor, value, multipliersData) {
  const match = multipliersData.find(row =>
    row.position === position &&
    row.factor === factor &&
    row.value === value
  );
  return match ? match.multiplier : 1.00;
}
```

---

### 4. Position Grading - NEW
```javascript
function assignPositionGrade(rate) {
  if (rate >= 0.40) return "A+";
  if (rate >= 0.32) return "A";
  if (rate >= 0.24) return "B";
  if (rate >= 0.18) return "C";
  return "D";
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

### 5. Stack Analysis - NEW
```javascript
function determineStackRequirements(envRate) {
  const requirements = [];
  requirements.push("QB+2PC_REQUIRED");

  if (envRate >= 0.30) {
    requirements.push("BRING_BACK_MANDATORY");
  } else if (envRate >= 0.24) {
    requirements.push("BRING_BACK_RECOMMENDED");
  } else {
    requirements.push("BRING_BACK_OPTIONAL");
  }

  return requirements.join(",");
}

function checkOnslaughtEligible(envRate, venue, isPrimetime) {
  return (envRate >= 0.28) && (venue === "Dome" || isPrimetime);
}

function generateCorrelationNotes(envRate, venue) {
  const notes = [];
  if (envRate >= 0.32) notes.push("Opposing_WR_130%");
  if (venue === "Dome") notes.push("Dome_Pass_Heavy");
  else notes.push("Outdoor_QB+RB_73%");
  return notes.join(";");
}
```

---

### 6. Game Classification - NEW
```javascript
function classifyGameType(qbRate, rbRate, dstRate) {
  if (qbRate >= 0.40 && dstRate < 0.20) return "Shootout";
  if (rbRate >= 0.28 && qbRate < 0.25) return "Grind";
  if (dstRate >= 0.35) return "Blowout";
  return "Competitive";
}

function determineOverallTier(positionGrades) {
  const tierOrder = ["A+", "A", "B", "C", "D"];
  for (const tier of tierOrder) {
    if (Object.values(positionGrades).includes(tier)) return tier;
  }
  return "D";
}
```

---

## MAIN CHANGES TO processSchedule()

**Read new sheets:**
```javascript
const envCombinationsData = getSheetData(ss.getSheetByName("Environment_Combinations"));
const positionMultipliersData = getSheetData(ss.getSheetByName("Position_Multipliers"));
```

**In game processing loop, replace environment scoring with:**
```javascript
// Build environment key
const envKey = buildEnvironmentKey(
  venue.venue_type,
  "Home",
  primetime.is_primetime,
  weekTier
);

// Lookup environment data
const envData = lookupEnvironmentRate(envKey, envCombinationsData);

// Calculate position-specific rates
const positionRates = calculatePositionRates(
  envData.rate,
  venue.venue_type,
  primetime.is_primetime,
  positionMultipliersData
);

// Assign grades for each position
const positionGrades = {
  QB: assignPositionGrade(positionRates.QB),
  RB: assignPositionGrade(positionRates.RB),
  WR: assignPositionGrade(positionRates.WR),
  TE: assignPositionGrade(positionRates.TE),
  DST: assignPositionGrade(positionRates.DST)
};

const positionRecs = {
  QB: assignRecommendation(positionRates.QB),
  RB: assignRecommendation(positionRates.RB),
  WR: assignRecommendation(positionRates.WR),
  TE: assignRecommendation(positionRates.TE),
  DST: assignRecommendation(positionRates.DST)
};

// Stack analysis
const stackReqs = determineStackRequirements(envData.rate);
const onslaughtEligible = checkOnslaughtEligible(envData.rate, venue.venue_type, primetime.is_primetime);
const correlationNotes = generateCorrelationNotes(envData.rate, venue.venue_type);

// Game classification
const gameType = classifyGameType(positionRates.QB, positionRates.RB, positionRates.DST);
const overallTier = determineOverallTier(positionGrades);
const bbPriority = (overallTier === "A+" || overallTier === "A") ? "High" :
                   (overallTier === "B") ? "Med" : "Low";

// Add all new fields to enrichedGame object (columns 24-47)
```

---

## UPDATE writeScheduleEnriched()

Change headers array to 47 columns (add 24 new column names).

---

## UPDATE generateQATest()

Add 3 new sections (8, 9, 10) after existing Section 7:

**Section 8: Position-Specific Grading**
- Show top 10 games with all 5 position grades
- Highlight where QB is A+ but DST is D

**Section 9: Stack Requirements**
- Show environment rate, stack requirements, onslaught flag, game type

**Section 10: Correlation Insights**
- Show correlation notes and recommendations

---

## TESTING

**Elite Shootout (Week 5 Thu SF @ LAR):**
- qb_grade = "A+" (rate ≥ 0.50)
- dst_grade = "D" or lower
- stack_requirements contains "MANDATORY"
- game_type = "Shootout"

**Division Outdoor:**
- All grades depressed
- rb_grade ≥ qb_grade

**Column count:**
- 47 total (was 27)

**QA_Test:**
- 10 sections (was 7)
- All headers visible

---

## ACCEPTANCE

Complete when:
1. 272 games processed
2. 47 columns populated
3. Position grades differ per game
4. Stack flags accurate
5. QA has 10 sections

---

**Estimated: 3-4 hours development**