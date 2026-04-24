# NFL SCHEDULE ANALYSIS SYSTEM - PROJECT SCOPE
**Version:** 1.0  
**Date:** February 2, 2026  
**Status:** Planning Complete → Ready for Implementation

---

## PROJECT OVERVIEW

### Purpose
Transform the 2026 NFL schedule into actionable game grades and player targets across six fantasy football formats, using insights from Modules 1-5 analysis.

### Core Concept
**Games are the unit of analysis.** Grade each of the 272 regular season games based on environment and Vegas factors, then use those grades to identify optimal player targets for different fantasy formats.

### Success Criteria
When the NFL schedule is released in April/May 2026, we can:
1. Import and enrich the schedule within 1 hour
2. Generate game grades when Vegas lines are available (June/July)
3. Produce format-specific targets for each fantasy type
4. Update weekly during the season as needed

---

## THE SIX FORMATS

### Pre-Season Formats (Draft-Based)
1. **Best Ball** - Pre-draft game stacking targets (Priority #1)
2. **Redraft** - Draft value + weekly matchup analysis
3. **Dynasty** - Long-term schedule strength evaluation
4. **Guillotine** - Risk-minimized weekly consistency

### In-Season Formats (Weekly)
5. **DFS - Main Slate** - Multi-game tournament lineups
6. **DFS - Showdown** - Single-game slate optimization

---

## TECHNOLOGY STACK

### Platform
- **Google Apps Script** + **Google Sheets**
- Extends existing NFL DFS Analysis workbook
- HTML side panels for interactive UI

### Why This Stack
- ✅ Already built Modules 1-5 in this environment
- ✅ All data in one place
- ✅ Visual analysis with conditional formatting
- ✅ Easy collaboration and sharing
- ✅ Mobile accessible

---

## DATA ARCHITECTURE

### The Core Data Flow

```
INPUTS                  PROCESSING              OUTPUTS
──────────────         ───────────────         ────────────────
Schedule (PFR CSV)  →  Import & Parse      →  Schedule_2026
Teams Reference     →  Enrich (venues,     →  Schedule_Enriched
Module 3 Lookups    →  divisions, etc.)    →
                                            
Vegas Lines (June)  →  Join & Calculate    →  Schedule_Vegas
Module 5 Lookups    →  Environment Scores  →  Schedule_Scored

                       Format Analysis     →  BestBall_Targets
                                          →  Redraft_Weekly
                                          →  Dynasty_Schedule
                                          →  Guillotine_Risk
                                          →  DFS_MainSlate
                                          →  DFS_Showdown
```

### Source Data Requirements

**1. Schedule Data (from Pro Football Reference)**
```
Columns: Week, Day, Date, Time, Winner/tie, @, Loser/tie, [stats columns]
Format: CSV
Notes: Team names will be full names, @ symbol indicates away team
Source: Pro Football Reference (downloads when schedule released)
Timing: April/May 2026
```

**2. Team Reference Data (we maintain)**
```
Columns: Team_Abbr, Team_Name, Stadium, Venue_Type, Division, Conference
Format: Google Sheet tab
Notes: Maps full team names to abbreviations, stadiums to dome/outdoor
Source: Module 3 existing data + manual maintenance
Timing: Create now, update as needed
```

**3. Vegas Lines (manual input or CSV import)**
```
Columns: Week, Home, Away, Total, Spread, Home_ML, Away_ML
Format: CSV or manual entry
Notes: Season totals become available June/July
Source: TBD (sportsbook, aggregator site)
Timing: June/July 2026
```

**4. Module 3 Environment Rates (export from existing work)**
```
Columns: Venue_Type, Home_Away, Primetime, Division, Week_Tier, Ceiling_Rate
Format: Google Sheet tab (lookup table)
Notes: Export from existing Module 3 Environment analysis
Source: Already calculated in workbook
Timing: Export now, static reference
```

**5. Module 5 Vegas Multipliers (export from existing work)**
```
Columns: Vegas_Bucket, Position, Avg_Points, Ceiling_Rate, Multiplier
Format: Google Sheet tab (lookup table)
Notes: Export from Position_Vegas_Performance sheet
Source: Already calculated in workbook
Timing: Export now, static reference
```

**6. Cost Data (format-specific, sourced later)**
```
Best Ball/Redraft/Dynasty: Player ADP by round
DFS: Player salary (weekly)
Format: CSV or API
Source: FantasyPros, Underdog, DraftKings, FanDuel
Timing: August for drafts, weekly for DFS
```

---

## THE GAME GRADING SYSTEM

### What We're Grading
Each of the 272 regular season games gets a **Ceiling Score** that represents expected fantasy upside potential.

### Grading Factors

**Environment Factors (from Module 3):**
- Venue Type: Dome (29.4% ceiling) vs Outdoor (23.5% ceiling)
- Home/Away: Relative to venue type
- Division Game: Yes/No (21.7% penalty for outdoor away division)
- Primetime: SNF/MNF/TNF (+6.5% boost overall, +38% for QB)
- Week Tier: Early (1-4), Mid (5-12, peak), Late (13-18)

**Vegas Factors (from Module 5):**
- Game Total: Low (<42), Mid (42-48), High (>48)
- Spread: Close (<3), Mid (3-7), Blowout (>7)
- Vegas Bucket: Combination of total + spread (9 buckets total)

### Scoring Formula (TBD in implementation)
```
Ceiling_Score = 
  Base_Ceiling_Rate (from venue/home-away) ×
  Vegas_Bucket_Multiplier (from Module 5) ×
  Primetime_Boost (if applicable) ×
  Week_Tier_Adjustment ×
  Division_Penalty (if applicable)
```

### Game Tiers
- **A+** (Top 10-15 games): Elite stacking targets, highest ceiling
- **A** (Next 20-30 games): Strong targets, very good ceiling
- **B** (Next 50 games): Viable targets, moderate ceiling
- **C** (Next 50 games): Situational, below-average ceiling
- **D** (Bottom 100+ games): Avoid, low ceiling

---

## FORMAT-SPECIFIC OUTPUTS

### 1. Best Ball (Priority #1)

**Purpose:** Pre-draft game environment targeting for August/September drafts

**Output Sheet:** BestBall_Targets
```
Columns:
- Rank (1-272)
- Week
- Game (e.g., "BUF @ KC")
- Ceiling_Score
- Game_Tier (A+ to D)
- Vegas_Total
- Vegas_Spread
- Vegas_Bucket
- Venue_Type
- Primetime
- Stack_Blueprint (QB + 2 WR/TE + Bring-back)
- Notes
```

**Key Features:**
- Top 30 games highlighted for stack targeting
- Stack recommendations use Module 4/5 correlation findings:
  - QB+2PC structure (87-100% required)
  - Bring-back recommendations (WR primary at 75-130%)
  - Position priorities by Vegas bucket

**Usage:**
- Review before draft
- Target 3-4 A+/A games per Best Ball team
- Draft game stacks (QB + 2 pass catchers + bring-back)
- Track which target games you've hit

**Timeline:** Build in July, use for Aug/Sep drafts

---

### 2. Redraft

**Purpose:** Draft preparation + weekly start/sit decisions

**Output Sheet:** Redraft_Weekly
```
Columns:
- Week
- Game
- Ceiling_Score
- Game_Tier
- Streaming_Targets (QB, TE, DST by matchup)
- Bust_Risks (players in bad matchups)
- Notes
```

**Key Features:**
- Initial draft targets (players with strong Week 1-4 schedules)
- Weekly streaming opportunities
- Matchup-based sit warnings

**Usage:**
- Pre-draft: Identify players with favorable early schedules
- Weekly: Stream QB/TE/DST from A/B games
- Weekly: Bench stars in D games

**Timeline:** Build in July for draft, update weekly during season

---

### 3. Dynasty

**Purpose:** Long-term schedule strength for trade evaluation and rookie drafts

**Output Sheet:** Dynasty_Schedule
```
Columns:
- Team
- Avg_Ceiling_Score (season)
- A+_Games_Count
- A_Games_Count
- D_Games_Count
- Strength_of_Schedule_Rank
- Best_Weeks (list)
- Worst_Weeks (list)
- Notes
```

**Key Features:**
- Team-level schedule aggregation
- Identifies teams with favorable vs difficult schedules
- Useful for trade windows and playoff planning

**Usage:**
- Rookie drafts: Target teams with strong schedules
- Trade evaluation: Buy low on talent with tough early schedules
- Playoff planning: Acquire players with strong Week 15-17

**Timeline:** Build in May after schedule released

---

### 4. Guillotine

**Purpose:** Weekly risk management to avoid elimination

**Output Sheet:** Guillotine_Risk
```
Columns:
- Week
- Team
- Ceiling_Score
- Floor_Score (future: variance/consistency rating)
- Elimination_Risk (High/Med/Low)
- Safe_Floor_Players
- Avoid_Players
- Notes
```

**Key Features:**
- Focuses on consistency over ceiling
- Identifies weeks where your team has risky matchups
- Recommends safe-floor plays

**Usage:**
- Pre-draft: Avoid players with multiple high-risk weeks
- Weekly: Identify which of your players are in dangerous spots
- Weekly: Stream safe-floor options

**Timeline:** Build in August, update weekly during season

**Note:** Floor scoring is OUT OF SCOPE for v1.0 (ceiling only). Add later if needed.

---

### 5. DFS - Main Slate

**Purpose:** Multi-game tournament lineup construction

**Output Sheet:** DFS_MainSlate
```
Columns:
- Week
- Slate_Date
- Games_in_Slate
- A+_Games (list)
- Core_Stacks (primary game stack recommendations)
- Bring_Back_Options
- Contrarian_Plays
- Notes
```

**Key Features:**
- Identifies A+ games on each slate
- Recommends primary game stack
- Suggests bring-back options from correlated games

**Usage:**
- Identify which 1-2 games to build around
- Follow stacking principles from Module 4/5
- (Future) Add weekly projections for leverage calculation

**Timeline:** Build framework in August, use weekly during season

**Note:** Weekly projections OUT OF SCOPE for v1.0. Add later.

---

### 6. DFS - Showdown

**Purpose:** Single-game slate optimization

**Output Sheet:** DFS_Showdown
```
Columns:
- Week
- Game
- Ceiling_Score
- Game_Tier
- Vegas_Total
- Vegas_Spread
- Vegas_Bucket
- Recommended_Side (Favorite/Underdog/Game_Stack)
- CPT_Priorities (position recommendations)
- Correlation_Notes (from existing Showdown analysis)
- Notes
```

**Key Features:**
- Prioritizes which Showdown slates to play (A+ games)
- Integrates Vegas bucket with existing Showdown correlation patterns
- Recommends Captain position based on game script

**Usage:**
- Identify which Showdown slates to enter
- Determine favorite vs underdog side
- Apply correlation rules from SHOWDOWN_PATTERN_ANALYSIS.md:
  - QB CPT: 100% need pass catchers, 86% include RB
  - WR CPT: 100% need own QB, 69% include opposing QB
  - RB CPT: 93% include QB, 53% include TE

**Timeline:** Build framework in August, use weekly during season

---

## SHEET STRUCTURE

### New Sheets in Existing Workbook

**Schedule Management:**
1. **Schedule_2026** - Raw schedule import (272 games)
2. **Schedule_Enriched** - After adding venues, divisions, primetime
3. **Schedule_Vegas** - After adding Vegas lines (June)
4. **Schedule_Scored** - After calculating environment scores

**Reference Data:**
5. **Teams_Reference** - Team → Stadium → Venue Type → Division
6. **Environment_Lookup** - Export from Module 3 (ceiling rates by environment)
7. **Vegas_Lookup** - Export from Module 5 (position performance by bucket)

**Format Outputs:**
8. **BestBall_Targets** - Game grades + stack blueprints
9. **Redraft_Weekly** - Matchup analysis
10. **Dynasty_Schedule** - Team schedule strength
11. **Guillotine_Risk** - Weekly risk ratings
12. **DFS_MainSlate** - Core game identification
13. **DFS_Showdown** - Single-game priorities

### Existing Sheets (Reference Only)
- Tagged_Performances (Module 1-2)
- Vegas_Enhanced_Performances (Module 5)
- Position_Vegas_Performance (Module 5)
- Stacking_By_Vegas (Module 5)
- BringBack_By_Vegas (Module 5)
- Environment crosstab sheets (Module 3)

---

## APPS SCRIPT MODULES

### New Modules to Build

**Module 6: Schedule Management**
```javascript
// module_6_schedule.gs

Functions:
- importSchedule() - Parse PFR CSV format
- enrichSchedule() - Add venue, division, primetime flags
- addVegasLines() - Join Vegas data when available
- calculateEnvironmentScores() - Apply Module 3 + 5 formulas
- rankGames() - Sort and assign A+ to D tiers
```

**Module 7: Best Ball**
```javascript
// module_7_bestball.gs

Functions:
- generateBestBallTargets() - Create ranked game list
- createStackBlueprints() - QB+2PC+Bring-back recommendations
- showBestBallPanel() - HTML side panel for draft assistant
```

**Module 8-12: Other Formats** (build as needed)
```javascript
// module_8_redraft.gs - Weekly matchup analysis
// module_9_dynasty.gs - Schedule strength calculation
// module_10_guillotine.gs - Risk rating system
// module_11_dfs_mainslate.gs - Multi-game slate analysis
// module_12_dfs_showdown.gs - Single-game recommendations
```

### Menu System
```javascript
function onOpen() {
  // Extend existing menu with:
  // - Schedule section (import, enrich, Vegas, score)
  // - Best Ball section (generate targets, draft assistant)
  // - Redraft section (weekly analysis)
  // - Dynasty section (schedule strength)
  // - Guillotine section (risk ratings)
  // - DFS section (main slate, showdown)
}
```

---

## KEY ANALYTICAL FINDINGS (Our North Star)

### From Module 3: Environment Analysis

**Dome Home = Elite**
- 29.4% ceiling rate (best environment)
- +17% vs baseline
- Dome advantage is HOME-specific (away teams don't benefit)

**Division + Outdoor Away = Avoid**
- 21.7% ceiling rate (worst environment)
- -14% vs baseline
- Defensive familiarity kills ceiling in outdoor division games

**Primetime Boost**
- +6.5% overall boost
- +38% for QB specifically
- SNF > MNF > TNF

**Mid-Season Peak**
- Weeks 5-12: 26.1% ceiling rate (highest)
- Also highest variance (89.8% CV)
- Peak performance + maximum boom/bust

---

### From Module 4: Correlation Patterns

**QB+2PC is Standard**
- 87-100% of QB ceiling performances include 2+ pass catchers
- Not optional, it's mandatory
- RB correlation varies (50-73% by game script)

**Bring-Back is Critical**
- 67-100% rate depending on game total
- High totals: 97-100% bring-back required
- WR is primary bring-back (75-130% rate)
- Can bring-back multiple WRs (130% = 1.3 per game)

**Naked QB is Impossible**
- 0-7% across all Vegas buckets
- Never a viable strategy

---

### From Module 5: Vegas Bucket Performance

**Position Performance by Total:**
- QB: H_Close (19.7 avg, 50% ceiling) >> L_Close (10.2 avg, 12.5% ceiling)
- DST: L_Close (10.1 avg, 55.6% ceiling) >> H_Close (2.0 avg, 6.7% ceiling)
- WR/RB: More balanced across buckets

**Vegas Buckets (9 total):**
```
              Close (<3)    Mid (3-7)    Blowout (>7)
Low (<42)     L_Close       L_Mid        L_Blowout
Mid (42-48)   M_Close       M_Mid        M_Blowout  
High (>48)    H_Close       H_Mid        H_Blowout
```

**Stacking Requirements by Bucket:**
- H_Close/H_Mid: QB+2PC = 100%, Bring-back = 100%
- M_Mid: QB+2PC = 95%, Bring-back = 97%
- L_Blowout: Alternative RB+DST stack (71% correlation)

---

### From Showdown Analysis

**Captain Correlations (Iron Rules):**
- QB CPT: 100% need pass catchers, 86% include RB
- WR CPT: 100% need own QB, 69% include opposing QB
- RB CPT: 93% include QB, 53% include TE

**Game Stacking Optimal:**
- 58% of lineups have 3+ opposing players
- 57% use both QBs
- High-total close games: Highest game stack rate

---

## IMPLEMENTATION TIMELINE

### Phase 1: Foundation (NOW - Feb 2026)
**Goal:** Set up structure and templates
- ✅ Create scope document (this file)
- ⏳ Create schedule template (15 sample games)
- ⏳ Create Teams_Reference sheet
- ⏳ Export Module 3 → Environment_Lookup
- ⏳ Export Module 5 → Vegas_Lookup
- ⏳ Build Module 6: Schedule Management functions

**Deliverable:** Ready to import real schedule when available

---

### Phase 2: Schedule Processing (April/May 2026)
**Goal:** Import and enrich 2026 schedule
- Import schedule from Pro Football Reference
- Run enrichSchedule() - add venues, divisions, primetime
- Validate output (all 272 games enriched correctly)

**Deliverable:** Schedule_Enriched sheet with all structural data

---

### Phase 3: Vegas Integration (June/July 2026)
**Goal:** Add Vegas lines and calculate game grades
- Source Vegas lines (CSV or manual entry)
- Run addVegasLines() - join to schedule
- Run calculateEnvironmentScores() - apply Module 3 + 5
- Run rankGames() - assign A+ to D tiers

**Deliverable:** Schedule_Scored sheet with game grades 1-272

---

### Phase 4: Best Ball (July 2026)
**Goal:** Generate draft targets for August
- Build Module 7: Best Ball functions
- Run generateBestBallTargets()
- Create stack blueprints for top 30 games
- Build HTML side panel for draft assistant

**Deliverable:** Best Ball draft preparation complete

---

### Phase 5: Other Formats (August 2026)
**Goal:** Add remaining format analyses
- Module 8: Redraft (draft prep + weekly)
- Module 9: Dynasty (schedule strength)
- Module 10: Guillotine (risk ratings)
- Module 11: DFS Main Slate
- Module 12: DFS Showdown

**Deliverable:** All six formats operational

---

### Phase 6: Season Operations (Sept-Dec 2026)
**Goal:** Weekly updates and maintenance
- Weekly: Update Redraft matchups
- Weekly: Update Guillotine risk
- Weekly: Update DFS recommendations
- Monitor: Vegas line movements
- Adjust: As needed based on injuries, etc.

**Deliverable:** Living system through season

---

## SCOPE BOUNDARIES

### IN SCOPE (v1.0 - Ceiling Focus)

**Data:**
- ✅ Schedule import and enrichment
- ✅ Vegas lines integration
- ✅ Environment ceiling rates (Module 3)
- ✅ Vegas bucket performance (Module 5)
- ✅ Stacking correlations (Module 4/5)
- ✅ Game grading system
- ✅ Format-specific outputs

**Formats:**
- ✅ Best Ball targets
- ✅ Redraft weekly matchups
- ✅ Dynasty schedule strength
- ✅ Guillotine risk ratings (ceiling-based only)
- ✅ DFS Main Slate core games
- ✅ DFS Showdown priorities

**Features:**
- ✅ Apps Script automation
- ✅ Custom menu system
- ✅ HTML side panels (Best Ball at minimum)
- ✅ Conditional formatting
- ✅ Export capabilities

---

### OUT OF SCOPE (Future Enhancements)

**Not Building Now:**
- ❌ Floor/consistency scoring (for Guillotine/Cash)
- ❌ Weekly player projections (for DFS)
- ❌ Ownership data integration
- ❌ Injury tracking
- ❌ Weather data integration
- ❌ Automated Vegas line fetching
- ❌ API integrations
- ❌ Mobile app
- ❌ Alerts/notifications

**Why:**
- Focus on core game grading system first
- Get Best Ball working for August priority
- Add complexity later as needed
- Ceiling analysis is the foundation

**Can Add Later:**
- Floor scoring when needed for Guillotine/Cash
- Projections when building weekly DFS tools
- Ownership when DFS leverage becomes priority

---

## SUCCESS METRICS

**We'll know we're successful when:**

1. **Schedule Import:** Can import and enrich full 2026 schedule in <1 hour
2. **Game Grading:** All 272 games have A+ to D grades with clear reasoning
3. **Best Ball:** Top 30 games identified with stack blueprints ready for drafts
4. **Format Coverage:** All six formats have their output sheets populated
5. **User Experience:** Can navigate and use system through custom menu
6. **Validation:** Game grades align with Module 3/5 findings (spot check)

---

## RISKS & MITIGATIONS

### Risk: Schedule Format Changes
**Mitigation:** Build parser flexibly, validate on import, manual fallback

### Risk: Vegas Lines Delayed
**Mitigation:** Partial grades without Vegas, update when available

### Risk: Module 3/5 Lookups Incomplete
**Mitigation:** Export and validate lookup tables before building pipeline

### Risk: Formula Complexity
**Mitigation:** Start simple, add complexity incrementally, document everything

### Risk: Performance (272 games × 6 formats)
**Mitigation:** Optimize calculations, use caching, batch processing

---

## NEXT STEPS

### Immediate Actions (This Week)
1. ✅ Finalize scope (this document)
2. Create schedule template with 15 sample games
3. Create Teams_Reference sheet
4. Export Environment_Lookup from Module 3
5. Export Vegas_Lookup from Module 5

### Next Week
6. Spec out game grading formula precisely
7. Build Module 6: Schedule Management
8. Test on template data
9. Validate output format

### When Schedule Drops (April)
10. Import real 2026 schedule
11. Run enrichment pipeline
12. Validate all 272 games

---

## DOCUMENT CONTROL

**Version History:**
- v1.0 (Feb 2, 2026): Initial scope - comprehensive project plan

**Approval:**
- [ ] Scope reviewed
- [ ] Technical approach validated
- [ ] Timeline confirmed
- [ ] Ready for implementation

**Next Review:** After Phase 1 completion (template + lookups created)

---

**END OF SCOPE DOCUMENT**