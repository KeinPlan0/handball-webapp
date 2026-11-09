# To-do

Open work for Spielzeit. Add new items here and check them off when they are complete.

## Eingaben

- [ ] Spieldauer-Eingaben in **Spiel** und **Wechseln** so behandeln, dass ein leeres Feld verständlich validiert wird und keine ungültige Dauer gespeichert wird.

## Torwartrotation

- [x] In **Wechseln** eine anklickbare Spielerliste ergänzen, über die ein oder mehrere Torwart-Kandidaten markiert werden können.
- [x] Torwart-Markierungen lokal speichern, nach dem Neuladen wiederherstellen und für Spieler entfernen, die aus dem Kader gelöscht wurden.
- [x] Den Wechselplan so erweitern, dass immer genau ein Torwart eingesetzt wird und sich die Torwart-Spielzeit gleich auf die markierten Kandidaten verteilt.
- [x] Gleichzeitig die gesamte Spielzeit (Torwart- plus Feldspielzeit) möglichst fair verteilen; markierte Torhüter erhalten Feldzeit nur außerhalb ihrer Torwart-Einsätze und gemäß ihrem fairen Gesamtspielzeit-Ziel.
- [x] Torwartwechsel auf das Limit von höchstens zwei Spielerwechseln pro Stopp anrechnen und die Torwart-Einsätze in Startaufstellung, Wechselplan und Einsatzzeitübersicht sichtbar kennzeichnen.
- [x] Beide Spielformen (**4+1** und **2×3 gegen 3**) sowie keinen, einen und mehrere markierte Torhüter und das Wechsel-Limit abdecken.
- [x] Als Schwellenwert für Feldzeit das aus Torwartpflicht und gleichmäßiger Gesamtspielzeit berechnete faire Ziel je Spieler verwenden.
- [ ] Spielern im Kader stabile IDs geben, damit Torwart-Markierungen auch bei gleichnamigen Spielern oder Änderungen der Namensreihenfolge sicher zugeordnet bleiben.
- [x] Wechsel seltener planen und lange zusammenhängende Spielphasen bevorzugen: höchstens 3 Minuten Unterschied zwischen kürzester und längster Gesamtspielzeit, soweit es die Torwartpflicht erlaubt; bis zu zwei Spielerpaare pro Stopp und gleich verteilte Torwartzeit.
- [ ] Wechselzahl bei großen Torwartgruppen weiter senken und enge Wechsel entzerren; beim geprüften Kader mit 8 Spielern und 4 Torhütern entstehen in 15 Minuten unter der 3-Minuten-Fairnessgrenze noch 30 Stopps.

## Dokumentation

- [x] Screenshot der Anwendung ergänzen, sobald eine aktuelle öffentliche Vorschau verfügbar ist.
- [x] Lizenz auswählen und eine passende `LICENSE`-Datei hinzufügen, bevor das Projekt unter einer Open-Source-Lizenz weitergegeben wird.
