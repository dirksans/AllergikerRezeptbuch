# SicherKochen – Startanleitung

SicherKochen ist eine installierbare Web-App für Online-Rezeptsuche, Allergieprüfung, Milch-Ersatzvorschläge, Vorräte und Einkaufslisten.

## Was diese Version kann

- Normale Rezepte online über TheMealDB suchen
- Rezepte erst **nach der Suche** gegen ausgewählte Personen prüfen
- Milch, Sahne, Butter, Joghurt und Käse in Zutaten erkennen
- Allgemein verfügbare milchfreie Alternativen vorschlagen
- Weitere eingetragene Allergien bei der Auswahl des Ersatzes berücksichtigen
- Mengen auf eine gewünschte Personenzahl umrechnen
- Angepasste Rezepte lokal speichern
- Konkrete Ersatzprodukte als „geprüft“ bestätigen
- Eigene Rezepte weiterhin manuell anlegen
- Vorräte, Einkaufsliste und Bestandsabzug verwalten
- Alle lokalen Daten exportieren und wieder importieren
- Nach dem ersten Laden weitgehend offline arbeiten

## Wichtige Grenze dieser Version

Die Prüfung ist aktuell **regelbasiert und nachvollziehbar**, aber noch keine generative KI. Eine echte KI-Anbindung benötigt einen geschützten Server und einen eigenen API-Zugang. Ein geheimer KI-Schlüssel darf nicht im öffentlich sichtbaren Browser-Code stehen.

Die Online-Rezeptquelle ist überwiegend englisch. Portionszahlen sind dort häufig nicht angegeben. Vor dem Speichern fragt die App deshalb, für wie viele Portionen die Originalmengen vermutlich gelten.

## Allergie-Sicherheit

Die App kann Fehler in Online-Daten, Produktrezepturen oder unvollständigen Zutatenangaben nicht ausschließen. Prüfe immer:

- Zutatenliste des konkreten Produkts
- hervorgehobene Allergene
- Spurenhinweise
- geänderte Herstellerrezepturen
- Kreuzkontamination in Küche und Geräten

„Kein Konflikt erkannt“ ist keine medizinische Garantie.

## Datenschutz

Personenprofile, Allergien, Vorräte und gespeicherte Rezepte bleiben in dieser Version lokal in der Browserdatenbank des jeweiligen Geräts. Bei einer Onlinesuche wird nur der eingegebene Suchbegriff an TheMealDB gesendet. Deine Personen- und Allergiedaten werden dort nicht hochgeladen; die Prüfung erfolgt im Browser.

## Wichtig vor dem Start

Du kannst die Datei `index.html` nicht einfach dauerhaft auf dem iPhone öffnen. Für Installation, Offline-Funktion und sichere Browserfunktionen muss der Ordner als HTTPS-Website veröffentlicht werden.

Der einfachste kostenlose Weg ohne Mac ist GitHub Pages. Alles lässt sich über einen normalen Browser einrichten.

# Veröffentlichung mit GitHub Pages

## 1. ZIP-Datei entpacken

1. Lade `sicherkochen-pwa-v2.zip` herunter.
2. Entpacke die ZIP-Datei auf einem Windows-PC, Chromebook oder einem anderen Computer.
3. Öffne den entpackten Ordner.
4. Darin müssen direkt Dateien wie `index.html`, `app.js`, `online-recipes.js` und `styles.css` liegen.

## 2. GitHub-Konto erstellen

1. Öffne GitHub im Browser.
2. Erstelle ein kostenloses Konto oder melde dich an.
3. Bestätige bei Bedarf deine E-Mail-Adresse.

## 3. Neues Repository anlegen

1. Klicke oben rechts auf das Pluszeichen.
2. Wähle `New repository`.
3. Trage als Namen beispielsweise `sicherkochen` ein.
4. Stelle das Repository auf `Public`.
5. Klicke auf `Create repository`.

Hinweis: Der Programmcode ist dann öffentlich sichtbar. Deine Allergien und Vorräte stehen **nicht** im Code und werden dadurch nicht veröffentlicht.

## 4. App-Dateien hochladen

1. Öffne im neuen Repository `Add file`.
2. Wähle `Upload files`.
3. Ziehe **den Inhalt des entpackten Ordners** in das Browserfenster.
4. Achte darauf, dass `index.html` direkt auf der obersten Ebene landet und nicht in einem zusätzlichen Unterordner.
5. Klicke unten auf `Commit changes`.

## 5. GitHub Pages einschalten

1. Öffne im Repository `Settings`.
2. Wähle links unter `Code and automation` den Punkt `Pages`.
3. Wähle bei `Source` die Option `Deploy from a branch`.
4. Wähle den Branch `main`.
5. Wähle den Ordner `/(root)`.
6. Klicke auf `Save`.
7. Nach der Veröffentlichung erscheint dort die Adresse deiner App, gewöhnlich nach dem Muster:

```text
https://DEIN-NAME.github.io/sicherkochen/
```

## 6. Im normalen Browser testen

1. Öffne die veröffentlichte Adresse.
2. Gehe zu `Personen` und kontrolliere den Eintrag `Milch` bei Dirk.
3. Öffne `Rezepte`.
4. Suche beispielsweise nach `carbonara`, `chicken` oder `potato`.
5. Öffne ein Ergebnis mit `Untersuchen`.
6. Prüfe die erkannten Milchbestandteile und vorgeschlagenen Ersetzungen.
7. Trage die vermutete ursprüngliche und die gewünschte Portionszahl ein.
8. Wähle `Anpassen und speichern`.

## 7. Auf dem iPhone installieren

1. Öffne die veröffentlichte Adresse in Safari.
2. Tippe auf `Teilen`.
3. Wähle `Zum Home-Bildschirm`.
4. Aktiviere, falls angezeigt, `Als Web-App öffnen`.
5. Tippe auf `Hinzufügen`.

Danach erscheint SicherKochen wie eine App auf dem Home-Bildschirm.

# Speicherung und Aktualisierungen

- Daten werden automatisch lokal unter genau dieser Website-Adresse gespeichert.
- Wenn du später neue Programmdateien im **gleichen GitHub-Repository** hochlädst, bleiben die lokalen Daten normalerweise erhalten.
- Wenn sich die Website-Adresse ändert, betrachtet Safari sie als neue App mit einer neuen Datenbank.
- Das Löschen von Safari-Websitedaten kann auch deine App-Daten löschen.
- Erstelle deshalb regelmäßig unter `Mehr` → `Daten exportieren` eine Sicherung.

## Eine neue Version hochladen

1. Vorher in der App `Daten exportieren` wählen.
2. Im GitHub-Repository `Add file` → `Upload files` öffnen.
3. Die neuen Dateien hochladen und vorhandene Dateien ersetzen.
4. `Commit changes` wählen.
5. Die App in Safari öffnen und einmal neu laden.

# Fehlerbehebung

## Die Onlinesuche findet nichts

- Verwende zunächst englische Suchbegriffe.
- Suche nach einem Gericht oder einer einzelnen Hauptzutat.
- Prüfe die Internetverbindung.
- Gespeicherte Rezepte, Vorräte und Einkaufsliste funktionieren weiterhin lokal.

## Alte Version wird angezeigt

- Safari vollständig schließen und erneut öffnen.
- Die Webseite neu laden.
- Bei einer installierten Web-App kurz die Website in Safari öffnen und aktualisieren.

## Daten sind verschwunden

- Prüfe, ob du dieselbe GitHub-Pages-Adresse verwendest.
- Importiere die zuletzt exportierte JSON-Sicherungsdatei über `Mehr` → `Daten importieren`.

## Dateien liegen in einem Unterordner

Wenn die veröffentlichte Seite leer bleibt, liegt `index.html` möglicherweise nicht im Wurzelordner des Repositorys. Verschiebe oder lade alle Dateien erneut direkt auf die oberste Ebene hoch.
