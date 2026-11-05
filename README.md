# Spielzeit · Handball

**Einsatzzeiten im Blick. Wechsel fair planen. Beim Spiel bleiben.**

Spielzeit is a small, mobile-friendly web app for tracking handball player time and preparing substitutions. Set up a roster, run the match clock and individual player timers, or generate a rotation plan for your team.

> Die Benutzeroberfläche ist derzeit auf Deutsch verfügbar.

## Funktionen

- **Kader verwalten:** Spielernamen hinzufügen und für den nächsten Spieltag bereithalten.
- **Spielzeit messen:** Eine Spieluhr und einzelne Einsatz-Timer unabhängig voneinander starten und pausieren.
- **Wechsel planen:** Rotationen für die Spielformen **4+1** und **2×3 gegen 3** anhand der Kadergröße und Spieldauer erstellen.
- **Spielzeit verteilen:** Geplante Einsatzminuten pro Spieler vergleichen und die Startaufstellung neu auswürfeln.
- **Lokal speichern:** Kader, Timer und Einstellungen bleiben im lokalen Browser gespeichert. Es ist kein Benutzerkonto erforderlich.

## Lokal starten

### Voraussetzungen

- Node.js und npm

### Installation

```bash
git clone https://github.com/keinplan0/handball-webapp.git
cd handball-webapp
npm install
npm start
```

Die Entwicklungs-App öffnet sich üblicherweise unter [http://localhost:3000](http://localhost:3000). Änderungen am Quellcode werden während der Entwicklung automatisch neu geladen.

## Nutzung

1. Öffne **Spieler** und füge die Namen deines Teams hinzu.
2. Öffne **Wechseln**, wähle Spielform und Spieldauer und prüfe den vorgeschlagenen Plan.
3. Öffne **Spiel**, starte die Spieluhr und tippe auf die Spielerkarten, um ihre Einsatzzeiten zu starten oder zu pausieren.

Die Daten werden mit `localStorage` im verwendeten Browser gespeichert. Sie werden nicht zwischen Geräten synchronisiert. Mit **„Spiel & Spieler zurücksetzen“** werden die Spieluhr und Spielertimer zurückgesetzt; der Kader bleibt erhalten.

## Verfügbare Befehle

| Befehl | Beschreibung |
| --- | --- |
| `npm start` | Startet den lokalen Entwicklungsserver. |
| `npm run build` | Erstellt den Produktions-Build im Verzeichnis `build/`. |
| `npm test` | Startet die Testsuite im interaktiven Watch-Modus. |

## Technologie

- React 19 und TypeScript
- React Router
- Create React App (`react-scripts`)
- CSS ohne zusätzliches UI-Framework

## Projektstruktur

```text
src/
├── Components/   # Spieluhr, Spielertimer und Kaderliste
├── layout/       # Gemeinsames Layout und Navigation
└── pages/        # Startseite, Spieler, Spiel und Wechselplan
public/           # App-Symbole und statische Dateien
```

## Mitwirken

Fehlerberichte, Ideen und Pull Requests sind willkommen. Prüfe vor einem Pull Request bitte den offenen Arbeitsvorrat in [TODO.md](./TODO.md) und beschreibe kurz, was sich für Nutzerinnen und Nutzer ändert.

## Lizenz

Dieses Projekt steht unter der GNU Affero General Public License v3.0 (AGPL-3.0).

Du darfst die Software verwenden, verändern und weiterverbreiten. Wenn du eine veränderte Version veröffentlichst oder über ein Netzwerk (z. B. als Web-Anwendung) bereitstellst, musst du den dazugehörigen Quellcode ebenfalls unter derselben Lizenz verfügbar machen.

Weitere Informationen findest du in der Datei `LICENSE`.
