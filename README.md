# DGNB ENV1.2 Einstufung – Deployment auf Vercel

## 1. Firebase (nur Anmeldung und verschlüsselte Ablage)
1. Projekt anlegen (Region EU, z. B. europe-west3). Web-App registrieren, Konfigurationswerte notieren.
2. Authentication → E-Mail/Passwort aktivieren. Einstellungen → Benutzeraktionen: **Selbstregistrierung deaktivieren**.
3. **Whitelist = Nutzerliste:** Nutzer unter Authentication → Nutzer manuell anlegen (E-Mail genügt). Die Person setzt ihr Passwort über „Passwort setzen oder zurücksetzen“ auf der Login-Seite. Wer nicht angelegt ist, kommt weder in die App noch an die KI-Funktion.
4. Firestore (Native) anlegen, Inhalt von `firestore.rules` unter „Regeln“ veröffentlichen.
5. Authentication → Einstellungen → Autorisierte Domains: Ihre Vercel-Domain eintragen.

## 2. Vercel
1. Ordner als Git-Repository bereitstellen, in Vercel importieren (Framework „Other“, Einstellungen kommen aus `vercel.json`).
2. Umgebungsvariablen (Production):
   - `ANTHROPIC_API_KEY` – Schlüssel aus der Anthropic-Konsole (nur serverseitig, nie im Browser)
   - `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_APP_ID` – Web-Konfiguration
   - optional `ALLOWED_EMAILS` – kommagetrennte Liste; ist sie gesetzt, darf nur diese Gruppe die KI nutzen (zusätzliche Sperre)
   - optional `ANTHROPIC_MODEL` – Standard `claude-sonnet-5-5`
3. Deploy. Der Build kopiert pdf.js (Version 4.10.38) nach `public/lib`.
4. Erster Nutzer legt beim Entsperren die Team-Passphrase fest (mind. 12 Zeichen, nicht wiederherstellbar).

## Schutz der Firmendaten
- Gespeicherte Bewertungen und Regelwerke: AES-GCM im Browser, Schlüssel aus der Team-Passphrase, wird nie übertragen. Firebase sieht nur Chiffretext und Metadaten.
- KI-Auswertung: Der im Textfeld sichtbare Text geht über TLS an die serverseitige Funktion und von dort an die Claude-API. Die App speichert und protokolliert ihn nicht. Kontaktdaten werden auf Wunsch vorher geschwärzt. Gescannte PDFs (max. 3 MB) gehen unverändert an die KI.
- API-Schlüssel nur auf dem Server. Sicherheits-Header und CSP stehen in `vercel.json`. Der Server baut die Prompts selbst (kein offener KI-Proxy).
- Vertragliche Seite (Auftragsverarbeitung, Datenaufbewahrung, Datenschutzfolgenabschätzung für Anthropic, Google/Firebase und Vercel) intern klären.
