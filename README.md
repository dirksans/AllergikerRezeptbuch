# SicherKochen 3.5.0 – Küchenassistent

SicherKochen ist eine installierbare iPhone-PWA für Vorrat, Rezepte, Personenprofile, Allergieprüfung, Einkaufslisten, Kassenbon-Erfassung, Resteverwertung und Wochenplanung. Die App ist für GitHub Pages ausgelegt und funktioniert in den Kernbereichen ohne eigenes Backend.

## Sicherheitsprinzip

SicherKochen darf niemals als medizinische Sicherheitsgarantie verstanden werden. Die App bewertet nur hinterlegte Daten und lokale Regeln.

Verwendete Statuswerte:

- **Nach hinterlegten Daten unauffällig**
- **Möglicherweise ungeeignet**
- **Zutaten prüfen**
- **Unbekannt**

Unbekannte Zutaten werden nicht automatisch als unauffällig behandelt. Bei verarbeiteten oder mehrdeutigen Produkten wie Brühen, Soßen, Kochcremes und Gewürzmischungen ist eine Produktprüfung vorgesehen. Herstellerangaben, Zutatenlisten, Allergenkennzeichnung und Spurenhinweise haben Vorrang.

Laktosefreiheit ist keine Entwarnung bei Milchproteinallergie. Laktosefreie Milchprodukte werden deshalb nicht automatisch als milchproteinfreier Ersatz behandelt.

## Wichtigste Neuerungen gegenüber Version 3.0

- bestehende IndexedDB `sicherkochen-db` bleibt erhalten
- Datenbank wird versionsbasiert um neue Stores erweitert
- bestehende Profile, Vorräte, eigene Rezepte, Einkaufslisten und Einstellungen werden weiterverwendet
- alter persistierter Spoonacular-Schlüssel wird bei der Migration entfernt
- 122 Standardzutaten inklusive 32 Gewürzen
- 30 interne Basisrezepte
- deutsche Allergen- und Synonymbibliothek
- Ersatzproduktregeln
- Rezeptprüfung gegen mehrere Personen gleichzeitig
- Portionsfaktoren pro Person
- Mengen werden bei internen Rezepten auch in den Kochschritten skaliert
- Resteverwertung mit MHD-Priorisierung
- Kochhistorie, Bewertungen, Favoriten und „nicht mehr vorschlagen“
- Wochenplan Montag bis Sonntag
- automatische Wochenplanung
- Einkaufsliste aus dem Wochenplan unter Abzug vorhandener Bestände
- Kassenbon-Parser und optionale OCR
- lernende lokale Produktzuordnungen
- ungefähre Nährwerte, soweit lokale Daten vorhanden sind
- Dark Mode
- globale Suche
- verbesserter Service-Worker-Updateprozess
- Offline-Caching der lokalen App-Daten und App-Dateien
- vorbereitete KI-/Backend-Schnittstelle ohne geheimen Schlüssel im Frontend

## Projektstruktur

```text
/
├── index.html
├── manifest.webmanifest
├── service-worker.js
├── README.md
├── START-HIER.txt
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── db.js
│   ├── data.js
│   ├── allergyEngine.js
│   ├── nutrition.js
│   ├── receiptParser.js
│   ├── receiptOcr.js
│   ├── recipeEngine.js
│   ├── mealPlanner.js
│   ├── aiProvider.js
│   ├── online-recipes.js
│   └── recipeProviders/
│       ├── theMealDB.js
│       ├── spoonacular.js
│       └── customApi.js
├── data/
│   ├── ingredients.json
│   ├── recipes.json
│   ├── allergens.json
│   ├── substitutions.json
│   ├── seasonality.json
│   └── cuisines.json
├── assets/
│   └── icons/
└── tests/
    └── MANUELLE-TESTS.md
```

# Bestehende SicherKochen-App aktualisieren

## 1. Sicherung erstellen

Vor dem Update in der bisherigen App:

`Mehr → Daten exportieren`

Die JSON-Datei sicher aufbewahren.

Die normale Aktualisierung unter derselben GitHub-Pages-Adresse löscht IndexedDB nicht. Die zusätzliche Sicherung schützt vor Bedienfehlern oder gelöschten Safari-Websitedaten.

## 2. ZIP entpacken

`SicherKochen-3.5.0.zip` entpacken.

Im entpackten Ordner muss direkt `index.html` liegen.

Richtig:

```text
SicherKochen-3.5.0/
├── index.html
├── service-worker.js
├── manifest.webmanifest
├── css/
├── js/
├── data/
└── assets/
```

## 3. GitHub Repository öffnen

Das bestehende Repository verwenden, über das die aktuelle SicherKochen-App veröffentlicht wird.

Nicht ein neues Repository verwenden, wenn die lokale iPhone-Datenbank unter derselben Webadresse erhalten bleiben soll.

## 4. Neue Dateien hochladen

1. Repository öffnen.
2. `Add file` wählen.
3. `Upload files` wählen.
4. Den **Inhalt** des entpackten Ordners hochladen.
5. Gleichnamige Dateien ersetzen lassen.
6. `Commit changes` wählen.

Wichtig: Nicht den kompletten äußeren Ordner als zusätzlichen Unterordner hochladen.

Falsch:

```text
repository/
└── SicherKochen-3.5.0/
    └── index.html
```

Richtig:

```text
repository/
├── index.html
├── service-worker.js
├── manifest.webmanifest
├── css/
├── js/
├── data/
└── assets/
```

## 5. Alte Version-3-Dateien entfernen

Nach dem erfolgreichen Upload können Dateien der alten Struktur entfernt werden, wenn sie nicht mehr von der neuen Version verwendet werden.

Insbesondere können nach Kontrolle entfernt werden:

```text
/app.js
/db.js
/online-recipes.js
/styles.css
/sw.js
/icons/
```

Die neue Version verwendet stattdessen:

```text
/js/...
/css/style.css
/service-worker.js
/assets/icons/...
```

`index.html` und `manifest.webmanifest` werden ersetzt, nicht zusätzlich behalten.

## 6. GitHub Pages kontrollieren

1. GitHub-Repository öffnen.
2. `Settings` öffnen.
3. `Pages` öffnen.
4. Unter Build and deployment `Deploy from a branch` verwenden.
5. Branch `main` auswählen.
6. Verzeichnis `/(root)` auswählen.
7. Speichern.
8. Auf die veröffentlichte HTTPS-Adresse warten und diese öffnen.

# Neue GitHub-Pages-Installation

1. GitHub-Konto öffnen.
2. Neues Repository erstellen.
3. Projektdateien hochladen.
4. `Commit changes` wählen.
5. `Settings` öffnen.
6. `Pages` öffnen.
7. `Deploy from a branch` auswählen.
8. Branch `main` auswählen.
9. `/(root)` auswählen.
10. Speichern.
11. Die angezeigte GitHub-Pages-Adresse öffnen.

Typische Adresse:

```text
https://DEIN-NAME.github.io/REPOSITORY-NAME/
```

Alle Pfade der App sind relativ, damit die Anwendung auch unter einem GitHub-Pages-Unterordner funktioniert.

# Installation auf dem iPhone

1. GitHub-Pages-Adresse in **Safari** öffnen.
2. Teilen-Schaltfläche antippen.
3. `Zum Home-Bildschirm` auswählen.
4. Falls angeboten `Als Web-App öffnen` aktiviert lassen.
5. Namen bestätigen.
6. `Hinzufügen` wählen.
7. SicherKochen anschließend über das Home-Bildschirm-Symbol öffnen.

Der normale Installations-Button einer PWA wird auf iOS nicht in jeder Safari-Version angeboten. Die Installation über das Teilen-Menü ist deshalb der verlässlichere Weg.

# App nach einem GitHub-Update aktualisieren

1. Zuerst dieselbe GitHub-Pages-Adresse in Safari öffnen.
2. SicherKochen öffnen.
3. Zahnrad oben rechts öffnen.
4. Unter Datenverwaltung `App aktualisieren` wählen.
5. App nach dem Reload kontrollieren.
6. Falls die Home-Bildschirm-App noch alten Code zeigt, App vollständig schließen und erneut öffnen.

Nicht als ersten Schritt Safari-Websitedaten löschen. Dadurch können lokale IndexedDB-Daten verloren gehen.

# Lokale Datenspeicherung

IndexedDB-Datenbank:

```text
sicherkochen-db
```

Stores:

```text
profiles
pantry
recipes
shopping
settings
activity
weeklyPlan
history
mappings
receipts
```

Die Version-3-Stores bleiben erhalten und werden nur um neue Stores ergänzt.

## Backup

Unter:

`Zahnrad → Datenverwaltung → Daten exportieren`

wird eine JSON-Datei erzeugt.

Beim Import erstellt die App zuerst automatisch einen aktuellen Export, bevor die vorhandenen lokalen Daten ersetzt werden.

# Personenprofile

Pro Person können gespeichert werden:

- Name
- Ernährungsform
- Allergien
- Unverträglichkeiten
- Vorlieben
- Abneigungen
- Portionsfaktor

Mehrere Personen können gleichzeitig ausgewählt werden.

Beispiel:

```text
Person A: Faktor 1,0
Person B: Faktor 1,5
Gesamtbedarf: 2,5 Portionen
```

Interne Rezepte werden entsprechend skaliert.

# Vorrat

Jeder Eintrag kann enthalten:

- Lebensmittel
- Menge
- Einheit
- Lagerort
- Kaufdatum
- MHD/Datum
- geöffnet ja/nein
- Öffnungsdatum
- Notiz
- Quelle

Schnellaktionen:

- Menge reduzieren
- verbraucht
- nachkaufen
- einfrieren
- geöffnet
- abgelaufen markieren
- löschen

Typische Haltbarkeiten aus der Zutatenbibliothek werden nur als Orientierung verwendet.

# Kassenbon

`Start → Kassenbon`

Möglichkeiten:

- direkt ein Foto aufnehmen
- ein Bild aus der Mediathek auswählen
- Bontext manuell einfügen

OCR ist standardmäßig deaktiviert und muss unter dem Zahnrad aktiviert werden.

Beim ersten OCR-Einsatz wird Tesseract.js von einem CDN geladen. Das Bild wird dabei im Browser verarbeitet. Die OCR-Ergebnisse werden anschließend in einer Kontrollansicht angezeigt und erst nach Bestätigung in den Vorrat übernommen.

Unbekannte Produktnamen können korrigiert werden. Wenn die Korrektur einer bekannten Zutat entspricht, speichert SicherKochen diese Zuordnung lokal und kann sie beim nächsten ähnlichen Bon wiederverwenden.

# Rezeptbibliothek

Enthalten sind mindestens 30 interne Rezepte aus unterschiedlichen Kategorien, darunter:

- Pasta
- Reis
- Kartoffeln
- Bowls
- Suppen
- Currys
- Ofengerichte
- Airfryer
- Wraps/Tacos
- asiatische Gerichte
- mediterrane Gerichte
- orientalische Gerichte
- indische Gerichte
- mexikanische Gerichte
- deutsche Gerichte

Bei den internen Rezepten werden Mengen beim Skalieren auch direkt in den Arbeitsschritten aktualisiert.

Bei frei eingegebenen Alt- oder Eigenrezepten kann die App Mengen in frei formuliertem Fließtext nicht zuverlässig erkennen. Deshalb bleiben solche Schritte unverändert; die skalierte Zutatenliste wird weiterhin korrekt angezeigt. Bei neu erstellten Eigenrezepten sollten Mengen ebenfalls direkt im Schritt angegeben werden.

# Externe Rezepte

Aktuell unterstützt die Oberfläche TheMealDB.

Bei einer Suche wird der Suchbegriff an den Dienst übertragen. Für die Übersetzung können Rezepttexte außerdem an den bisher verwendeten Übersetzungsdienst gesendet werden. Personenprofile, Allergielisten und Vorratsdaten werden dabei nicht übertragen.

Chefkoch wird ausschließlich als externe Suche geöffnet. Es werden keine Rezepte automatisch von Chefkoch kopiert.

## Spoonacular

Ein früher in Version 3 lokal gespeicherter Spoonacular-Schlüssel wird bei der Migration entfernt.

Die neue Architektur enthält einen Provider-Platzhalter, aktiviert Spoonacular aber nicht direkt im öffentlichen Frontend. Für eine produktive Nutzung mit geheimem API-Schlüssel ist ein Backend oder Serverless Proxy vorgesehen.

# KI

`js/aiProvider.js` enthält die Schnittstellen für eine spätere KI-Anbindung:

```text
generateRecipe(context)
analyzeReceipt(image)
adaptRecipe(recipe, profiles)
generateShoppingList(context)
```

Standardmäßig:

```text
AI_ENABLED = false
API_BASE_URL = ""
```

Es befindet sich kein geheimer KI-Schlüssel im Frontend.

# Offline-Funktion

Nach einem erfolgreichen Online-Start werden die Kern-App-Dateien und lokalen Datenbibliotheken durch den Service Worker gecacht.

Offline nutzbar sind insbesondere:

- Startseite
- Vorrat
- Personenprofile
- interne und gespeicherte Rezepte
- Einkaufslisten
- Wochenplan
- Resteverwertung
- lokale Rezeptlogik
- lokale Allergieprüfung

Nicht oder nur eingeschränkt offline verfügbar:

- TheMealDB-Suche
- erstmaliges Laden der OCR-Bibliothek
- externe Rezeptbilder, wenn sie nicht bereits im Browsercache liegen

# Nährwerte

Die interne Zutatenbibliothek enthält für viele Grundzutaten Näherungswerte pro 100 g.

Die App berechnet daraus, soweit möglich:

- kcal
- Eiweiß
- Kohlenhydrate
- Fett
- Ballaststoffe

Die Werte werden ausdrücklich als Näherungswerte dargestellt. Bei Zutaten ohne passende Gewichts-/Volumeneinheit oder ohne Nährwertdaten sinkt die angezeigte Datenabdeckung.

# Wochenplanung

Planbar sind für Montag bis Sonntag:

- Frühstück
- Mittagessen
- Abendessen
- Snack

Die automatische Planung berücksichtigt unter anderem:

- ausgewählte Personen
- Allergien
- Ernährungsformen
- maximale Kochzeit
- gewünschte Anzahl Fleisch/Fisch-Gerichte
- gewünschte Anzahl vegetarischer/veganer Gerichte
- Vorratsabdeckung
- MHD-Priorität
- bisherige Kochhistorie
- optionale leichte Nährwertpriorisierung

Ein belastbares Budgetlimit wird bewusst noch nicht vorgetäuscht, solange keine ausreichende lokale Preisbasis aus Kassenbons vorhanden ist.

# Einkauf aus Wochenplan

`Planung → Einkauf für diese Woche erstellen`

Die App:

1. sammelt alle geplanten Rezeptzutaten
2. skaliert die Mengen auf die geplanten Portionen
3. fasst gleiche Zutaten zusammen
4. zieht vorhandenen Vorrat ab
5. legt nur die fehlenden Mengen auf die Einkaufsliste

# Hinweise zur Datenbeständigkeit auf iOS

Lokale Browserdaten können verloren gehen, wenn:

- Safari-Websitedaten manuell gelöscht werden
- iOS/Safari Website-Daten bereinigt
- eine andere Domain verwendet wird
- GitHub-Pages-Adresse oder Repository-Pfad geändert wird

Deshalb regelmäßig `Daten exportieren` verwenden.

# Tests

Die vollständige manuelle Prüfliste befindet sich in:

```text
tests/MANUELLE-TESTS.md
```

Vor einem produktiven Update auf dem iPhone mindestens die Tests zu Datenmigration, Mehrpersonen-Allergieprüfung, Offline-Start, Service-Worker-Update und Backup/Import durchführen.
