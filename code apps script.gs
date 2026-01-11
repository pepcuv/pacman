function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("HIGHSCORES");
    const data = JSON.parse(e.postData.contents);

    const speler = data.speler || "Onbekend";
    const score = Number(data.score) || 0;
    const lijsten = typeof data.lijsten === "string" ? data.lijsten : "";
    const vragenBeantwoord = Number(data.vragenBeantwoord) || 0;
    const vragenFout = Number(data.vragenFout) || 0;
    const eindLevel = Number(data.eindLevel) || 0;
    const speelduurSeconden = Number(data.speelduurSeconden) || 0;
    const tijd = new Date();

    // Voeg nieuwe rij toe
    sheet.appendRow([
      tijd,
      speler,
      score,
      lijsten,
      vragenBeantwoord,
      vragenFout,
      eindLevel,
      speelduurSeconden,
      false
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, message: "Score opgeslagen" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}


function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("HIGHSCORES");

  // Als query ?getHighscores=true aanwezig is
  if (e.parameter.getHighscores === "true") {
    const data = sheet.getDataRange().getValues();
    if (!data.length) {
      return ContentService
        .createTextOutput(JSON.stringify([]))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const headers = data[0];
    const rows = data.slice(1);

    const normalizeHeader = (value) =>
      String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

    const headerLookup = {};
    headers.forEach((header, idx) => {
      const key = normalizeHeader(header);
      if (key) headerLookup[key] = idx;
    });

    const resolveIndex = (candidates, fallback) => {
      for (let i = 0; i < candidates.length; i++) {
        const key = candidates[i];
        if (Object.prototype.hasOwnProperty.call(headerLookup, key)) {
          return headerLookup[key];
        }
      }
      return fallback;
    };

    const headerIndexes = {
      tijd: resolveIndex(["tijdstip", "tijd", "datum", "timestamp"], 0),
      speler: resolveIndex(["speler", "naam"], 1),
      score: resolveIndex(["score", "punten"], 2),
      lijsten: resolveIndex(["lijsten", "woordenlijsten"], null),
      vragenBeantwoord: resolveIndex(
        ["vragenbeantwoord", "vragen", "totaalvragen"],
        null
      ),
      vragenFout: resolveIndex(["vragenfout", "foutbeantwoord"], null),
      eindLevel: resolveIndex(["eindlevel", "level"], null),
      speelduurSeconden: resolveIndex(
        ["speelduurseconden", "speelduur"],
        null
      ),
      gepubliceerd: resolveIndex(["gepubliceerd", "published"], null),
    };

    const pickValue = (row, headerIdx, offsetFromEnd) => {
      let index =
        typeof headerIdx === "number" && headerIdx >= 0 ? headerIdx : null;
      if (
        index === null &&
        typeof offsetFromEnd === "number" &&
        row.length >= 9
      ) {
        const tentative = row.length + offsetFromEnd;
        if (tentative >= 0) index = tentative;
      }
      if (index === null || index < 0 || index >= row.length) return null;
      return row[index];
    };

    const results = rows
      .map((row) => {
        let publishedValue = pickValue(
          row,
          headerIndexes.gepubliceerd,
          -1
        );
        if (
          (publishedValue === null || typeof publishedValue === "undefined") &&
          row.length > 3 &&
          row.length < 9
        ) {
          publishedValue = row[3];
        }
        if (publishedValue !== true) return null;

        const tijdstip = pickValue(row, headerIndexes.tijd, null);
        const speler = pickValue(row, headerIndexes.speler, null) || "Onbekend";
        const rawScore = pickValue(row, headerIndexes.score, null);
        const score = Number(rawScore) || 0;
        const lijsten =
          pickValue(row, headerIndexes.lijsten, -6) ||
          "";
        const vragenBeantwoord = Number(
          pickValue(row, headerIndexes.vragenBeantwoord, -5)
        ) || 0;
        const vragenFout = Number(
          pickValue(row, headerIndexes.vragenFout, -4)
        ) || 0;
        const eindLevel =
          Number(pickValue(row, headerIndexes.eindLevel, -3)) || 0;
        const speelduurSeconden = Number(
          pickValue(row, headerIndexes.speelduurSeconden, -2)
        ) || 0;

        return {
          tijdstip,
          speler,
          score,
          lijsten,
          vragenBeantwoord,
          vragenFout,
          eindLevel,
          speelduurSeconden,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score); // hoogste eerst

    return ContentService
      .createTextOutput(JSON.stringify(results))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Default GET response
  return ContentService
    .createTextOutput("Gebruik ?getHighscores=true om gepubliceerde scores op te halen.")
    .setMimeType(ContentService.MimeType.TEXT);
}
