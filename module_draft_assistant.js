function doGet() {
  return HtmlService.createHtmlOutputFromFile('DraftAssistant')
    .setTitle('NFL 2026 Best Ball Draft Assistant')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getDraftData() {
  return {
    players: getSheetAsJSON('Draft_Strategy_Tiers'),
    stacks:  getSheetAsJSON('Stack_Targets')
  };
}

function getSheetAsJSON(sheetName) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet not found: ' + sheetName);
  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  return data.slice(1)
    .filter(row => row.some(cell => cell !== ''))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    });
}

// ── DRAFT PERSISTENCE ─────────────────────────────────────────────────────
// Sheet: Draft_State
// Columns: session_id | timestamp | round | player_name | team | position | adp | value_score | pick_type

function getPicksSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Draft_State');
  if (!sheet) {
    sheet = ss.insertSheet('Draft_State');
    sheet.getRange(1, 1, 1, 9).setValues([[
      'session_id', 'timestamp', 'round', 'player_name', 'team', 'position', 'adp', 'value_score', 'pick_type'
    ]]);
    sheet.getRange(1, 1, 1, 9).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getDrafts() {
  const sheet = getPicksSheet();
  const data  = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  // col 0 = session_id, col 1 = timestamp
  const seen   = {};
  const counts = {};
  const first  = {};  // session_id → first timestamp (for naming)
  data.slice(1).forEach(row => {
    const id = String(row[0] || '').trim();
    if (!id) return;
    if (!seen[id]) {
      seen[id]   = true;
      counts[id] = 0;
      first[id]  = row[1] ? new Date(row[1]) : null;
    }
    if ((row[8] || 'pick') !== 'skip') counts[id]++;
  });

  return Object.keys(seen).map(id => {
    const d    = first[id];
    const name = d
      ? id.slice(0, 6) + ' — ' + (d.getMonth()+1) + '/' + d.getDate()
      : id.slice(0, 8);
    return { id, name, pickCount: counts[id] || 0 };
  });
}

function getDraftPicks(draftId) {
  const sheet = getPicksSheet();
  const data  = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  return data.slice(1)
    .filter(row => String(row[0]).trim() === draftId)
    .map(row => ({
      player_name: String(row[3]),
      round:       Number(row[2]),
      pick_type:   String(row[8] || 'pick')
    }));
}

function savePick(draftId, draftName, playerName, round, pickType, team, position, adp, valueScore) {
  const sheet = getPicksSheet();
  sheet.appendRow([draftId, new Date(), round, playerName, team || '', position || '', adp || '', valueScore || '', pickType || 'pick']);
}

function deleteDraft(draftId) {
  const sheet = getPicksSheet();
  const data  = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]).trim() === draftId) {
      sheet.deleteRow(i + 1);
    }
  }
}
