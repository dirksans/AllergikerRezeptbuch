# SicherKochen 3.0 – Anleitung

SicherKochen ist eine installierbare Web-App für deutsche Online-Rezeptsuche, personenabhängige Allergie- und Ernährungsprüfung, automatische Rezeptanpassung, Vorräte und Einkaufslisten.

## Was in Version 3.0 geändert wurde

- Der Fehler beim Speichern geänderter Personen und Rezepte ist behoben.
- Deutsche Suchbegriffe werden unterstützt.
- Englische TheMealDB-Rezepte werden beim Öffnen maschinell ins Deutsche übersetzt.
- Alle Allergien aller ausgewählten Personen werden geprüft – nicht nur Milch.
- Mehrere Personen lassen sich gleichzeitig über die Namensschaltflächen auswählen.
- Die automatische Anpassung berücksichtigt außerdem vegetarische und vegane Profile.
- Optional kann Spoonacular als zweite Rezeptquelle mit einem persönlichen API-Schlüssel aktiviert werden.
- Für Chefkoch gibt es eine externe Suche. Eine direkte Übernahme ist bewusst nicht eingebaut.
- Der App-Cache wurde umgestellt, damit neue Versionen zuverlässiger geladen werden.
- Unter `Mehr` gibt es die Schaltfläche `App aktualisieren`.

## Unterstützte Allergiegruppen

Die Regelprüfung kennt unter anderem:

- Milch und Milchprotein
- Laktose
- Ei
- Gluten und Weizen
- Erdnüsse
- Schalenfrüchte/Nüsse
- Soja
- Fisch
- Krebstiere
- Weichtiere
- Sellerie
- Senf
- Sesam
- Lupine
- Sulfite

Zusätzlich werden frei eingetragene Allergien als Suchbegriffe in den Zutaten geprüft. Ist für eine problematische Zutat kein verlässlicher Ersatz hinterlegt, wird das Rezept nicht automatisch als angepasst freigegeben.

## Sicherheitsstatus

- **Direkt geeignet:** kein Konflikt erkannt.
- **Anpassbar:** Konflikte erkannt und Ersatzvorschläge vorhanden.
- **Prüfen:** Angaben sind unvollständig oder Produkte müssen anhand der Verpackung kontrolliert werden.
- **Nicht zuverlässig anpassbar:** mindestens ein Konflikt kann nicht sicher automatisch ersetzt werden.

Maschinenübersetzungen, Onlinedaten und Ersatzprodukte können fehlerhaft oder unvollständig sein. Kontrolliere immer die Originalquelle, Zutatenlisten, hervorgehobene Allergene, Spurenhinweise und aktuelle Produktrezepturen. „Kein Konflikt erkannt“ ist keine medizinische Garantie.

# Bestehende GitHub-Pages-App aktualisieren

## 1. Zuerst eine Sicherung erstellen

Öffne deine bisherige App und wähle:

`Mehr` → `Daten exportieren`

Die Datenbank bleibt beim normalen Update unter derselben Internetadresse erhalten. Die Sicherung schützt zusätzlich vor Bedienfehlern oder gelöschten Safari-Daten.

## 2. Version 3.0 entpacken

Entpacke `sicherkochen-pwa-v3.zip` auf einem Computer. Im Ordner müssen direkt Dateien wie diese liegen:

```text
index.html
app.js
online-recipes.js
db.js
styles.css
sw.js
manifest.webmanifest
README.md
TESTBERICHT.md
icons/
```

## 3. Dateien im vorhandenen GitHub-Repository ersetzen

1. Öffne dein bisheriges Repository `sicherkochen`.
2. Wähle `Add file` → `Upload files`.
3. Ziehe den **Inhalt** des entpackten Ordners in das Upload-Fenster.
4. Bestätige, dass gleichnamige Dateien ersetzt werden.
5. Wähle unten `Commit changes`.
6. Verwende weiterhin dasselbe Repository und dieselbe GitHub-Pages-Adresse.

`index.html` muss direkt auf der obersten Ebene des Repositorys liegen, nicht in einem weiteren Unterordner.

## 4. Neue Version im Browser aktivieren

1. Öffne deine GitHub-Pages-Adresse in Safari.
2. Öffne `Mehr`.
3. Tippe auf `App aktualisieren`.
4. Die App lädt danach die neue Version neu.

Falls weiterhin die alte Oberfläche erscheint:

1. Öffne die normale Website-Adresse in Safari, nicht nur das Home-Bildschirm-Symbol.
2. Lade die Seite neu.
3. Öffne danach wieder `Mehr` → `App aktualisieren`.
4. Entferne das Home-Bildschirm-Symbol nur als letzten Schritt und füge dieselbe Website anschließend erneut hinzu. Lösche dabei nicht die Safari-Websitedaten.

# Neue Installation ohne bestehende App

## Veröffentlichung über GitHub Pages

1. Kostenloses GitHub-Konto erstellen oder anmelden.
2. Neues öffentliches Repository `sicherkochen` anlegen.
3. `Add file` → `Upload files` öffnen.
4. Alle Dateien und den Ordner `icons` aus dem entpackten Projekt hochladen.
5. `Commit changes` wählen.
6. `Settings` → `Pages` öffnen.
7. `Deploy from a branch` auswählen.
8. Branch `main` und Ordner `/(root)` einstellen.
9. Die angezeigte HTTPS-Adresse öffnen.

Die Adresse sieht normalerweise so aus:

```text
https://DEIN-NAME.github.io/sicherkochen/
```

## Auf dem iPhone installieren

1. Die veröffentlichte Adresse in Safari öffnen.
2. `Teilen` antippen.
3. `Zum Home-Bildschirm` auswählen.
4. Falls angezeigt, `Als Web-App öffnen` aktivieren.
5. `Hinzufügen` bestätigen.

# Bedienung

## Mehrere Personen auswählen

Auf `Start`, `Rezepte` oder `Personen` werden die Profile als Schaltflächen angezeigt. Tippe mehrere Namen nacheinander an. Ausgewählte Personen haben ein Häkchen und bleiben gleichzeitig aktiviert. Ein weiterer Tipp entfernt eine Person wieder aus der Auswahl.

Die Prüfung kombiniert sämtliche Allergien, Unverträglichkeiten und Ernährungsformen der ausgewählten Personen.

## Personen bearbeiten

1. `Personen` öffnen.
2. Beim gewünschten Profil `Bearbeiten` wählen.
3. Allergien mit Kommas trennen, zum Beispiel:

```text
Milch, Ei, Soja
```

4. `Speichern` wählen.

## Deutsche Onlinesuche

1. `Rezepte` öffnen.
2. Eine oder mehrere Personen auswählen.
3. Bei `Online-Rezepte suchen` einen deutschen Begriff eingeben, zum Beispiel:

```text
Kartoffelsuppe
Hähnchen
Lasagne
Nudelauflauf
Curry
Pfannkuchen
```

4. `Suchen` wählen.
5. Ein Ergebnis mit `Untersuchen` öffnen.

TheMealDB enthält überwiegend englische Originaldaten. Die App übersetzt Titel, Zutaten und Kochschritte beim Öffnen. Vergleiche bei sicherheitsrelevanten Angaben immer die angezeigte Originalquelle.

## Rezept untersuchen und anpassen

Die Detailansicht zeigt:

- alle ausgewählten Personen
- erkannte Allergiekonflikte
- Konflikte mit vegetarischer oder veganer Ernährung
- vorgeschlagene Ersetzungen
- nicht automatisch lösbare Probleme
- neu berechnete Mengen
- angepasste Kochschritte

Wähle `Anpassen und speichern`, wenn die vorgeschlagenene Variante als eigener Rezeptentwurf gespeichert werden soll. Konkrete Ersatzprodukte müssen weiterhin auf der Verpackung geprüft werden.

## Gespeicherte Rezepte ändern

1. `Rezepte` öffnen.
2. Beim gespeicherten Rezept `Öffnen` wählen.
3. `Bearbeiten` wählen.
4. Änderungen vornehmen.
5. `Rezept speichern` wählen.

## Zweite Rezeptquelle: Spoonacular

1. Einen persönlichen Spoonacular-API-Schlüssel beim Anbieter erstellen.
2. In SicherKochen `Mehr` → `Rezeptquellen` öffnen.
3. Schlüssel eintragen.
4. Als Quelle `Spoonacular` oder `Beide Quellen` auswählen.
5. `Quellen speichern` wählen.

Spoonacular arbeitet laut eigener Dokumentation derzeit auf Englisch. Die App übersetzt deshalb auch dort den deutschen Suchbegriff für die Anfrage und die gefundenen Rezepttexte anschließend zurück ins Deutsche. Der Schlüssel wird lokal im Browser gespeichert. Er gehört trotzdem zu einem persönlichen Konto und sollte nicht in Screenshots, GitHub-Dateien oder Nachrichten veröffentlicht werden.

## Chefkoch

Unter der Onlinesuche öffnet `Zusätzlich bei Chefkoch suchen` eine Chefkoch-Suche im Browser. Das gefundene Rezept wird nicht automatisch kopiert oder geprüft. Eine direkte Integration ist in dieser Version nicht enthalten, weil dafür eine offiziell erlaubte, stabil dokumentierte Schnittstelle beziehungsweise eine passende Nutzungserlaubnis erforderlich wäre.

# Speicherung und Datenschutz

- Personen, Allergien, Vorräte, Einkaufslisten und gespeicherte Rezepte werden lokal in IndexedDB unter deiner App-Adresse gespeichert.
- Bei TheMealDB wird der Suchbegriff übertragen. Personenprofile und Allergien bleiben lokal.
- Bei der maschinellen Übersetzung werden die zu übersetzenden Rezepttexte an den Übersetzungsdienst gesendet, jedoch keine Personenprofile.
- Bei aktivierter Spoonacular-Suche werden Suchbegriffe an Spoonacular gesendet.
- Verwende regelmäßig `Mehr` → `Daten exportieren`.
- Das Löschen von Safari-Websitedaten kann lokale App-Daten löschen.
- Eine andere Domain oder GitHub-Pages-Adresse besitzt eine getrennte Browserdatenbank.

# Fehlerbehebung

## Speichern funktioniert weiterhin nicht

1. `Mehr` → `App aktualisieren` wählen.
2. Browserseite neu öffnen.
3. Unter `Mehr` den `Lokalen Speichertest` ausführen.
4. Die angezeigte Fehlermeldung notieren.
5. Vor weiteren Schritten eine vorhandene Sicherungsdatei aufbewahren.

## Deutsche Suche findet nichts

- Nutze zunächst ein konkretes Gericht oder eine Hauptzutat.
- Probiere Singularformen wie `Kartoffel`, `Hähnchen`, `Lachs` oder `Lasagne`.
- Prüfe die Internetverbindung.
- Aktiviere optional Spoonacular als zweite Quelle.

## Übersetzung ist ungenau

- Öffne die Originalquelle.
- Kontrolliere Zutaten und Mengen.
- Speichere erst danach die angepasste Variante.

## Daten fehlen nach einem Update

- Prüfe, ob exakt dieselbe GitHub-Pages-Adresse verwendet wird.
- Importiere die zuvor exportierte JSON-Sicherung unter `Mehr` → `Daten importieren`.
