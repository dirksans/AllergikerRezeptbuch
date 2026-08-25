# Manuelle Tests – SicherKochen 3.5.1

## Vor jedem Update

- [ ] In der alten App JSON-Backup exportieren.
- [ ] GitHub-Pages-Adresse notieren.
- [ ] Mindestens ein Profil, ein Vorratseintrag, ein eigenes Rezept und ein Einkaufslisteneintrag als Testdaten vorhanden lassen.

## Test 1 – Migration von Version 3

1. Version 3 mit vorhandenen Daten öffnen.
2. Version 3.5.1 unter derselben GitHub-Pages-Adresse deployen.
3. `App aktualisieren` ausführen.
4. Prüfen:
   - [ ] Personen sind vorhanden.
   - [ ] Allergien sind vorhanden.
   - [ ] Vorrat ist vorhanden.
   - [ ] eigene Rezepte sind vorhanden.
   - [ ] Einkaufslisten sind vorhanden.
   - [ ] App startet ohne Datenbankfehler.

## Test 2 – Vorrat und Rezeptvorschläge

Vorrat hinzufügen:

- Paprika
- Reis
- Kokosmilch
- Brokkoli

Prüfen:

- [ ] Dashboard zeigt vier Lebensmittel.
- [ ] „Was kann ich heute kochen?“ zeigt passende Vorschläge.
- [ ] Fehlende Zutaten werden nachvollziehbar angezeigt.

## Test 3 – Vegetarisches Profil

1. Vegetarisches Profil anlegen.
2. Nur dieses Profil auswählen.
3. Rezeptvorschläge öffnen.

Erwartung:

- [ ] Fleischgerichte werden nicht als konfliktfrei behandelt.
- [ ] Vegetarische/vegane Rezepte werden bevorzugt.

## Test 4 – Milchproteinallergie

1. Profil mit `Milcheiweiß` oder `Milch` anlegen.
2. Rezept mit Milch/Käse öffnen.

Erwartung:

- [ ] Status ist nicht „Nach hinterlegten Daten unauffällig“.
- [ ] Konflikt wird mit Person und Zutat genannt.
- [ ] Falls Ersatz vorhanden ist, wird er nur als Vorschlag dargestellt.
- [ ] Nach der Anpassung erfolgt eine erneute Prüfung.
- [ ] Es gibt keine Aussage „garantiert sicher“.

## Test 5 – Laktosefrei ist nicht milchproteinfrei

1. Profil mit Milchproteinallergie verwenden.
2. Eine Zutat `laktosefreie Milch` in einem Eigenrezept verwenden.

Erwartung:

- [ ] Milchkonflikt bleibt bestehen.

## Test 6 – Unbekannte Zutat

1. Eigenrezept mit `Super Spezial Creme XYZ` erstellen.

Erwartung:

- [ ] Zutat wird nicht automatisch als sicher eingestuft.
- [ ] Status „Unbekannt“ oder „Zutaten prüfen“ erscheint.

## Test 7 – Portionsfaktoren

1. Person A Faktor 1,0.
2. Person B Faktor 1,5.
3. Beide auswählen.
4. Internes Rezept öffnen.

Erwartung:

- [ ] Zielmenge beträgt ca. 2,5 Portionen.
- [ ] Zutaten werden skaliert.
- [ ] Mengen in den internen Kochschritten werden ebenfalls skaliert.

## Test 8 – Einkaufsliste

1. Produkt zur Einkaufsliste hinzufügen.
2. Als erledigt markieren.
3. App neu laden.

Erwartung:

- [ ] Status bleibt nach Reload erhalten.

Danach:

4. `Erledigtes zum Vorrat` wählen.

Erwartung:

- [ ] Produkt erscheint einmal im Vorrat.
- [ ] Einkaufslisteneintrag wird entfernt.
- [ ] erneutes Antippen erzeugt keine Dublette.

## Test 9 – MHD / Muss weg

1. Produkt mit MHD heute hinzufügen.
2. Produkt mit MHD in zwei Tagen hinzufügen.
3. Produkt mit Datum gestern hinzufügen.

Erwartung:

- [ ] korrekte Gruppen in „Muss weg“.
- [ ] abgelaufenes Produkt wird nicht automatisch als Verzehrempfehlung bevorzugt.

## Test 10 – Kassenbon Text

Bontext:

```text
DATTELTOMATEN 1,99
PAPRIKA ROT 2,49
KOKOSMILCH 0,99
```

Erwartung:

- [ ] drei Produkte erkannt.
- [ ] Tomaten/Paprika/Kokosmilch normalisiert.
- [ ] Kontrollansicht erscheint.
- [ ] Produkte erst nach Bestätigung im Vorrat.

## Test 11 – OCR

1. Zahnrad → OCR aktivieren.
2. Kassenbon-Foto auswählen.
3. OCR starten.

Erwartung:

- [ ] Fortschritt wird angezeigt.
- [ ] Text landet im Bontext-Feld.
- [ ] Nutzer muss Ergebnisse bestätigen.
- [ ] bei fehlendem Internet verständliche Fehlermeldung.

## Test 12 – Wochenplan

1. Automatische Planung öffnen.
2. Maximal 30 Minuten wählen.
3. Woche erzeugen.

Erwartung:

- [ ] Abendessen werden für mehrere Tage geplant.
- [ ] Allergiekonflikte werden nicht ungefiltert eingeplant.
- [ ] Ernährungsform wird berücksichtigt.
- [ ] Nährwerte werden als Näherungswerte angezeigt.

## Test 13 – Einkauf aus Wochenplan

1. Mehrere Rezepte einplanen.
2. Eine benötigte Zutat teilweise im Vorrat hinterlegen.
3. `Einkauf für diese Woche erstellen` wählen.

Erwartung:

- [ ] gleiche Zutaten werden zusammengefasst.
- [ ] vorhandener Bestand wird abgezogen.
- [ ] nur fehlende Menge wird eingetragen.

## Test 14 – Kochen

1. Rezept öffnen.
2. `Kochen starten`.
3. Schritte vor/zurück navigieren.
4. Optional Timer starten.
5. `Fertig` wählen.
6. Verbrauchsmengen prüfen und bestätigen.

Erwartung:

- [ ] Vorrat wird erst nach Bestätigung reduziert.
- [ ] Verlaufseintrag wird erstellt.
- [ ] Bewertung kann gespeichert werden.

## Test 15 – Offline

1. App online vollständig öffnen.
2. App schließen.
3. Flugmodus aktivieren.
4. App vom Home-Bildschirm starten.

Erwartung:

- [ ] Startseite öffnet.
- [ ] Vorrat funktioniert.
- [ ] Profile funktionieren.
- [ ] interne/gespeicherte Rezepte funktionieren.
- [ ] Einkauf funktioniert.
- [ ] Wochenplan funktioniert.
- [ ] Online-Rezeptsuche meldet nachvollziehbar fehlendes Internet.

## Test 16 – Backup und Import

1. Backup exportieren.
2. Testdaten ändern.
3. Backup importieren.

Erwartung:

- [ ] Vor Import wird ein aktuelles Backup erzeugt.
- [ ] importierte Daten werden wiederhergestellt.
- [ ] Version-3-Backup wird akzeptiert, sofern es das bekannte SicherKochen-Datenformat enthält.

## Test 17 – Service Worker Update

1. App mit Version 3.5.1 öffnen.
2. Eine Teständerung mit neuer Cache-Version deployen.
3. `App aktualisieren` verwenden.

Erwartung:

- [ ] neue Oberfläche erscheint.
- [ ] alte Caches werden entfernt.
- [ ] IndexedDB-Daten bleiben erhalten.

## Test 18 – iPhone Bedienung

- [ ] Bottom Navigation liegt oberhalb des Home-Indikators.
- [ ] Modale sind vollständig scrollbar.
- [ ] wichtige Buttons sind mindestens ungefähr 44 px hoch.
- [ ] Eingabefelder zoomen nicht unerwartet.
- [ ] Dark Mode bleibt lesbar.
- [ ] Kochmodus ist mit einer Hand bedienbar.


## Regression 3.5.1

1. Person mit Namen „Test“ anlegen → muss gespeichert werden.
2. Vorrat „Paprika“, Menge 2 anlegen → darf nicht „Lebensmittel fehlt“ melden.
3. Online-Rezeptsuche „Curry“ absenden → Suchbegriff muss verarbeitet werden.
4. Einkauf „Brokkoli 1 Stück“ anlegen, Auto-Vorrat aktivieren, abhaken → Vorrat enthält Brokkoli; Haken zurücksetzen → verbuchte Menge wird wieder entfernt.
5. Rezeptimport öffnen, Titel/Zutaten/Schritte eintragen und speichern → Rezept erscheint lokal in der Bibliothek.
