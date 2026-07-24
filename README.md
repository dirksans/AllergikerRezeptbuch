# AllergikerRezeptbuch
SicherKochen – Startanleitung
SicherKochen ist eine installierbare Web-App für Online-Rezeptsuche, Allergieprüfung, Milch-Ersatzvorschläge, Vorräte und Einkaufslisten.
Was diese Version kann
Normale Rezepte online über TheMealDB suchen
Rezepte erst nach der Suche gegen ausgewählte Personen prüfen
Milch, Sahne, Butter, Joghurt und Käse in Zutaten erkennen
Allgemein verfügbare milchfreie Alternativen vorschlagen
Weitere eingetragene Allergien bei der Auswahl des Ersatzes berücksichtigen
Mengen auf eine gewünschte Personenzahl umrechnen
Angepasste Rezepte lokal speichern
Konkrete Ersatzprodukte als „geprüft“ bestätigen
Eigene Rezepte weiterhin manuell anlegen
Vorräte, Einkaufsliste und Bestandsabzug verwalten
Alle lokalen Daten exportieren und wieder importieren
Nach dem ersten Laden weitgehend offline arbeiten
Wichtige Grenze dieser Version
Die Prüfung ist aktuell regelbasiert und nachvollziehbar, aber noch keine generative KI. Eine echte KI-Anbindung benötigt einen geschützten Server und einen eigenen API-Zugang. Ein geheimer KI-Schlüssel darf nicht im öffentlich sichtbaren Browser-Code stehen.
Die Online-Rezeptquelle ist überwiegend englisch. Portionszahlen sind dort häufig nicht angegeben. Vor dem Speichern fragt die App deshalb, für wie viele Portionen die Originalmengen vermutlich gelten.
Allergie-Sicherheit
Die App kann Fehler in Online-Daten, Produktrezepturen oder unvollständigen Zutatenangaben nicht ausschließen. Prüfe immer:
Zutatenliste des konkreten Produkts
hervorgehobene Allergene
Spurenhinweise
geänderte Herstellerrezepturen
Kreuzkontamination in Küche und Geräten
„Kein Konflikt erkannt“ ist keine medizinische Garantie.
Datenschutz
Personenprofile, Allergien, Vorräte und gespeicherte Rezepte bleiben in dieser Version lokal in der Browserdatenbank des jeweiligen Geräts. Bei einer Onlinesuche wird nur der eingegebene Suchbegriff an TheMealDB gesendet. Deine Personen- und Allergiedaten werden dort nicht hochgeladen; die Prüfung erfolgt im Browser.
Wichtig vor dem Start
Du kannst die Datei `index.html` nicht einfach dauerhaft auf dem iPhone öffnen. Für Installation, Offline-Funktion und sichere Browserfunktionen muss der Ordner als HTTPS-Website veröffentlicht werden.
Der einfachste kostenlose Weg ohne Mac ist GitHub Pages. Alles lässt sich über einen normalen Browser einrichten.
Veröffentlichung mit GitHub Pages
1. ZIP-Datei entpacken
Lade `sicherkochen-pwa-v2.zip` herunter.
Entpacke die ZIP-Datei auf einem Windows-PC, Chromebook oder einem anderen Computer.
Öffne den entpackten Ordner.
Darin müssen direkt Dateien wie `index.html`, `app.js`, `online-recipes.js` und `styles.css` liegen.
2. GitHub-Konto erstellen
Öffne GitHub im Browser.
Erstelle ein kostenloses Konto oder melde dich an.
Bestätige bei Bedarf deine E-Mail-Adresse.
3. Neues Repository anlegen
Klicke oben rechts auf das Pluszeichen.
Wähle `New repository`.
Trage als Namen beispielsweise `sicherkochen` ein.
Stelle das Repository auf `Public`.
Klicke auf `Create repository`.
Hinweis: Der Programmcode ist dann öffentlich sichtbar. Deine Allergien und Vorräte stehen nicht im Code und werden dadurch nicht veröffentlicht.
4. App-Dateien hochladen
Öffne im neuen Repository `Add file`.
Wähle `Upload files`.
Ziehe den Inhalt des entpackten Ordners in das Browserfenster.
Achte darauf, dass `index.html` direkt auf der obersten Ebene landet und nicht in einem zusätzlichen Unterordner.
Klicke unten auf `Commit changes`.
5. GitHub Pages einschalten
Öffne im Repository `Settings`.
Wähle links unter `Code and automation` den Punkt `Pages`.
Wähle bei `Source` die Option `Deploy from a branch`.
Wähle den Branch `main`.
Wähle den Ordner `/(root)`.
Klicke auf `Save`.
Nach der Veröffentlichung erscheint dort die Adresse deiner App, gewöhnlich nach dem Muster:
```text
https://DEIN-NAME.github.io/sicherkochen/
```
6. Im normalen Browser testen
Öffne die veröffentlichte Adresse.
Gehe zu `Personen` und kontrolliere den Eintrag `Milch` bei Dirk.
Öffne `Rezepte`.
Suche beispielsweise nach `carbonara`, `chicken` oder `potato`.
Öffne ein Ergebnis mit `Untersuchen`.
Prüfe die erkannten Milchbestandteile und vorgeschlagenen Ersetzungen.
Trage die vermutete ursprüngliche und die gewünschte Portionszahl ein.
Wähle `Anpassen und speichern`.
7. Auf dem iPhone installieren
Öffne die veröffentlichte Adresse in Safari.
Tippe auf `Teilen`.
Wähle `Zum Home-Bildschirm`.
Aktiviere, falls angezeigt, `Als Web-App öffnen`.
Tippe auf `Hinzufügen`.
Danach erscheint SicherKochen wie eine App auf dem Home-Bildschirm.
Speicherung und Aktualisierungen
Daten werden automatisch lokal unter genau dieser Website-Adresse gespeichert.
Wenn du später neue Programmdateien im gleichen GitHub-Repository hochlädst, bleiben die lokalen Daten normalerweise erhalten.
Wenn sich die Website-Adresse ändert, betrachtet Safari sie als neue App mit einer neuen Datenbank.
Das Löschen von Safari-Websitedaten kann auch deine App-Daten löschen.
Erstelle deshalb regelmäßig unter `Mehr` → `Daten exportieren` eine Sicherung.
Eine neue Version hochladen
Vorher in der App `Daten exportieren` wählen.
Im GitHub-Repository `Add file` → `Upload files` öffnen.
Die neuen Dateien hochladen und vorhandene Dateien ersetzen.
`Commit changes` wählen.
Die App in Safari öffnen und einmal neu laden.
Fehlerbehebung
Die Onlinesuche findet nichts
Verwende zunächst englische Suchbegriffe.
Suche nach einem Gericht oder einer einzelnen Hauptzutat.
Prüfe die Internetverbindung.
Gespeicherte Rezepte, Vorräte und Einkaufsliste funktionieren weiterhin lokal.
Alte Version wird angezeigt
Safari vollständig schließen und erneut öffnen.
Die Webseite neu laden.
Bei einer installierten Web-App kurz die Website in Safari öffnen und aktualisieren.
Daten sind verschwunden
Prüfe, ob du dieselbe GitHub-Pages-Adresse verwendest.
Importiere die zuletzt exportierte JSON-Sicherungsdatei über `Mehr` → `Daten importieren`.
Dateien liegen in einem Unterordner
Wenn die veröffentlichte Seite leer bleibt, liegt `index.html` möglicherweise nicht im Wurzelordner des Repositorys. Verschiebe oder lade alle Dateien erneut direkt auf die oberste Ebene hoch.
