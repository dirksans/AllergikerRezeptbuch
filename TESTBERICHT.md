# SicherKochen 3.0 – Funktionskontrolle

## Behobene Hauptursache

In mehreren Formularen existierte ein Eingabefeld mit `name="id"`. Browser stellen benannte Formularelemente als Eigenschaften des Formulars bereit. Dadurch konnte `form.id` statt der Kennung des Formulars das Eingabefeld zurückgeben. Personen- und Rezeptformulare wurden deshalb beim Absenden nicht zuverlässig dem passenden Speicherablauf zugeordnet.

Die Formularerkennung verwendet jetzt ausdrücklich `getAttribute('id')`.

## Zusätzlich überarbeitet

- IndexedDB-Wrapper mit eindeutiger Fehlerbehandlung
- Datenbankversion aktualisiert
- lokaler Speichertest in den Einstellungen
- Formularfehler direkt unter dem Formular
- Cache von Cache-first auf Network-first umgestellt
- alte App-Caches werden beim Update entfernt
- Versionsparameter an JavaScript- und CSS-Dateien
- manuelle Schaltfläche `App aktualisieren`

## Automatisierte Prüfungen

### JavaScript-Syntax

Folgende Dateien wurden mit Node.js syntaktisch geprüft:

- `app.js`
- `db.js`
- `online-recipes.js`
- `sw.js`

Ergebnis: keine Syntaxfehler.

### Formular- und Oberflächentest

In einem automatisierten Browsertest wurden folgende Abläufe ausgeführt:

1. Besitzer `Dirk` in `Dirk Neu` umbenannt und gespeichert.
2. Profil `Anna` mit Allergien `Ei` und `Soja` angelegt.
3. Dirk und Anna gleichzeitig als mitessend ausgewählt.
4. Vorhandenes Rezept geöffnet, bearbeitet und gespeichert.
5. Neues Rezept angelegt und gespeichert.

Ergebnis: alle Änderungen waren anschließend im Datenspeicher vorhanden.

### Allergie- und Anpassungsregeln

Geprüfte Fälle:

- Milch und Sahne: Konflikt erkannt, Ersatz angeboten
- Ei: Konflikt erkannt, Ersatz angeboten
- Gluten/Weizen in Nudeln: Konflikt erkannt, Ersatz angeboten
- Erdnuss: Konflikt erkannt, Ersatz angeboten
- Schalenfrüchte/Mandeln: Konflikt erkannt, Ersatz angeboten
- Sojasoße: Konflikt erkannt, Ersatz angeboten
- Fisch als Hauptbestandteil: als nicht zuverlässig automatisch anpassbar markiert
- Garnelen: Konflikt erkannt, Ersatz angeboten
- Sellerie in Brühe: Konflikt erkannt, Ersatz angeboten
- Senf: Konflikt erkannt, Ersatz angeboten
- Sesam/Tahini: Konflikt erkannt, Ersatz angeboten
- Lupinenmehl: Konflikt erkannt, Ersatz angeboten
- Sulfite/Wein: Konflikt erkannt, Ersatz angeboten
- frei eingetragener Begriff `Koriander`: erkannt und ohne bekannte Regel blockiert
- veganes Profil mit Hähnchen: Ernährungskonflikt erkannt
- mehrere Personen mit Milch-, Ei- und Sojaallergie: alle drei Konflikte kombiniert
- Portionsskalierung von 2 auf 4 Portionen

### Fehlalarm-Prüfung für Milch

Folgende Begriffe werden nicht als Milchprodukt gewertet:

- Kokosmilch
- Erdnussbutter
- Kakaobutter
- Butterbohnen

## Manuell auf dem veröffentlichten iPhone zu prüfen

Ein Browserprojekt kann lokale Safari-Einstellungen, Netzfilter und die aktuelle GitHub-Pages-Auslieferung nicht vollständig automatisiert nachbilden. Nach dem Hochladen sollten deshalb zusätzlich diese Punkte direkt auf dem iPhone geprüft werden:

1. `Mehr` → `App aktualisieren`.
2. Profil ändern und speichern.
3. Neues Profil anlegen.
4. Zwei Profile gleichzeitig auswählen.
5. Gespeichertes Rezept ändern und speichern.
6. Deutsches Suchwort verwenden.
7. Übersetztes Rezept öffnen.
8. Allergiekonflikte für beide ausgewählten Personen kontrollieren.
9. Rezept anpassen und speichern.
10. App schließen, erneut öffnen und prüfen, ob die Daten weiterhin vorhanden sind.
