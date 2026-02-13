
export const JURY_DATA = {
    hook: {
        title: "20-Sekunden-Hook",
        content: "Taschengeldjobs sind der erste Schritt in die finanzielle Selbstständigkeit, doch der Weg dorthin ist oft unsicher und analog. JobBridge digitalisiert diesen Weg erstmals sicher, lokal und fair – damit Taschengeldjobs endlich im 21. Jahrhundert ankommen."
    },
    pitch: {
        title: "2-Minuten-Pitch",
        steps: [
            { title: "Problem", content: "Jugendliche wollen arbeiten, finden aber keine seriösen Angebote. Schwarze Bretter sind tot, Social Media ist unsicher." },
            { title: "Zielgruppe", content: "13-17 Jährige (Suchende) & Privathaushalte/lokale Unternehmen (Anbieter)." },
            { title: "Lösung", content: "Eine geschlossene Plattform, die Sicherheit durch moderne Technologie (Verifizierung, Moderation) garantiert." },
            { title: "Sicherheit", content: "Kein offenes Telefonbuch. Kontakt nur nach Bewerbung. TrustScore im Hintergrund." },
            { title: "MVP-Flow", content: "Job erstellen (Verifiziert) -> Bewerben (Jugendlicher) -> Chat & Abschluss." },
            { title: "Pilot", content: "Rheinbach als Testmarkt mit echten Nutzern." },
            { title: "Ausblick", content: "Skalierung über lokale Communities & Schulen." }
        ]
    },
    script: [
        {
            time: "0:00–1:30",
            title: "Einleitung & Der 'Hook'",
            points: [
                "Starten mit Stille (3 Sek). Blickkontakt zur Jury.",
                "Persönliche Frage: 'Erinnern Sie sich an Ihr erstes selbst verdientes Geld?'",
                "Story: 'Bei mir war es Rasenmähen für 10 Mark. Der Kontakt kam über meine Eltern zustande.'",
                "Realitäts-Check: 'Heute funktioniert das nicht mehr. Niemand lässt seine Kinder bei Fremden klingeln.'",
                "Problem: 'Wir haben eine Generation, die arbeiten will, aber in einer analogen Sackgasse steckt.'"
            ],
            keySentence: "Wir haben den ersten digitalen Marktplatz für Taschengeld-Jobs gebaut, der Sicherheit nicht nur verspricht, sondern garantiert."
        },
        {
            time: "1:30–3:00",
            title: "Das Problem: Die 'Wilder Westen' Lücke",
            points: [
                "Analyse bestehender Lösungen: eBay Kleinanzeigen ist ab 18 und voller Betrugsrisiken.",
                "Schwarze Bretter im Supermarkt? Erreichen keine Digital Natives.",
                "Social Media? Ein Albtraum für Datenschutz und Jugendschutz.",
                "Konsequenz: Jugendliche weichen auf unsichere Kanäle aus oder arbeiten gar nicht.",
                "Marktpotenzial allein in Deutschland: Millionen unbesetzte Minijobs in Privathaushalten."
            ],
            keySentence: "Es fehlt das digitale Bindeglied zwischen 'Ich brauche Hilfe' und 'Ich will helfen' – mit einem Sicherheitsgurt."
        },
        {
            time: "3:00–4:30",
            title: "Die Lösung: JobBridge",
            points: [
                "Einführung des Begriffs 'JobBridge': Die Brücke zwischen Generationen.",
                "Hyper-Lokalität: Wir matchen nicht deutschlandweit, sondern im Radius von 5km.",
                "Geschlossenes Ökosystem: Nur verifizierte Nutzer kommen rein.",
                "Psychologie: Gamification für Jugendliche (Badges, Level) trifft auf Seriosität für Anbieter.",
                "Technologie: Keine einfache Datenbank, sondern eine Realtime-Security-Plattform."
            ],
            keySentence: "JobBridge digitalisiert das Vertrauen, das früher in dörflichen Strukturen selbstverständlich war."
        },
        {
            time: "4:30–7:00",
            title: "Deep Dive: Sicherheits-Architektur",
            points: [
                "Überleitung: 'Sicherheit ist unser Produkt, Jobs sind nur das Feature.'",
                "Das 3-Säulen-Modell der Sicherheit erklären.",
                "Säule 1: Identität. Ausweis-Check (IDnow Integration geplant) für Anbieter.",
                "Säule 2: Daten-Minimalismus. Wir zeigen NIE die genaue Adresse vor dem Match.",
                "Säule 3: Der TrustScore. Ein unsichtbarer Algorithmus, der Verhalten analysiert.",
                "Beispiel Grooming: 'Wenn ein 50-Jähriger 20 Jugendliche anschreibt, schlägt der Algorithmus Alarm.'"
            ],
            keySentence: "Wir schützen die Daten unserer jugendlichen Nutzer aggressiver als eine Bank ihre Tresore."
        },
        {
            time: "7:00–9:30",
            title: "Recht & Compliance (Der Jury-Killer)",
            points: [
                "Vorwegnahme der 'Schwarzarbeit'-Frage: Wir vermitteln im Rahmen der Nachbarschaftshilfe.",
                "Jugendarbeitsschutzgesetz: Das System kennt das Alter. Ein 13-Jähriger sieht keine Jobs nach 18 Uhr.",
                "Versicherung: Aktuell über private Haftpflicht. In Phase 2: On-Top Versicherung pro Job für 50 Cent.",
                "DSGVO: Serverstandort Frankfurt. Löschkonzepte automatisiert. Recht auf Vergessenwerden per Klick."
            ],
            keySentence: "Wir bewegen uns nicht im Graubereich, sondern haben die Leitplanken des Gesetzes fest in den Code integriert."
        },
        {
            time: "9:30–12:00",
            title: "Live Demo & Tech Stack",
            points: [
                "Wechsel zum Demo-Screen (Taste 'D' oder Tab wechseln).",
                "Zeigen: Der 'Reverse-Marketplace'. Anbieter bewerben sich bei Jugendlichen.",
                "Zeigen: Der Bewerbungsprozess. Keine langen Texte, sondern Klick-Bewerbung.",
                "Zeigen: Der Chat. Warnhinweis bei Telefonnummer-Austausch.",
                "Tech-Stack erwähnen: Next.js für Speed, Supabase für Realtime, Edge Functions für Sicherheit."
            ],
            keySentence: "Das ist kein Mockup. Das ist Code, der heute schon in Rheinbach läuft."
        },
        {
            time: "12:00–13:30",
            title: "Geschäftsmodell & Skalierung",
            points: [
                "'Wie verdient ihr Geld?' - Aktuell gar nicht (Growth First).",
                "Zukunft: Freemium für Anbieter. 3 Jobs im Monat frei, danach Abo.",
                "Schul-Kooperationen: Schulen als Verifizierungs-Partner (Vertrauensanker).",
                "Go-to-Market: Start in Rheinbach, dann 'Ölfleck-Strategie' in Nachbarstädte.",
                "Kostenstruktur: Extrem schlank dank Serverless Architektur."
            ],
            keySentence: "Wir bauen kein Startup für den Exit, sondern Infrastruktur für die Gesellschaft."
        },
        {
            time: "13:30–15:00",
            title: "Appell & Vision",
            points: [
                "Zusammenfassung: Sicherheit, Einfachheit, Legalität.",
                "Vision: In 5 Jahren soll 'JobBridgen' ein Verb sein wie 'Googeln'.",
                "Emotionaler Close: 'Wir geben Jugendlichen nicht nur Geld, sondern Wertschätzung.'",
                "Aufforderung: 'Lassen Sie uns gemeinsam Brücken bauen.'",
                "Dank & Öffnung für Fragen."
            ],
            keySentence: "Vielen Dank. Wir sind bereit für Ihre härtesten Fragen."
        }
    ],
    demo: {
        pathA: {
            title: "Pfad A: Jugendliche/r sucht Job",
            steps: [
                { action: "Login als Jugendlicher", say: "Startseite zeigt relevante Jobs in der Nähe. Keine Anmeldung nötig zum Stöbern, aber für Details." },
                { action: "Klick auf Job-Details", say: "Details sind sichtbar, aber genaue Adresse ist geschützt (nur grober Radius)." },
                { action: "Klick auf 'Bewerben'", say: "Bewerbung ist einfach gehalten. Chat öffnet sich erst nach Bestätigung." },
                { action: "Chat öffnen", say: "Kommunikation findet sicher auf der Plattform statt. Keine Handynummer-Weitergabe nötig." }
            ]
        },
        pathB: {
            title: "Pfad B: Anbieter erstellt Job",
            steps: [
                { action: "Erstellen-Button", say: "Geführter Prozess. Wir fragen gezielt Informationen ab, um Qualität zu sichern." },
                { action: "Kategorie & Beschreibung", say: "KI-Unterstützung (geplant) hilft bei Formulierung. Bad Boys Filter (MVP) blockt Schimpfwörter." },
                { action: "Standort-Wahl", say: "Adresse wird verifiziert. Im Frontend wird nur ein verschleierter Punkt angezeigt." },
                { action: "Absenden", say: "Job geht nicht sofort live, sondern durchläuft Trust-Check (automatisch/manuell)." }
            ]
        },
        fallback: [
            "Screenshot 1: Feed-Ansicht (Zeigt lokale Relevanz).",
            "Screenshot 2: Job-Erstellen Maske (Zeigt Struktur).",
            "Screenshot 3: Chat mit Sicherheits-Hinweis."
        ]
    },
    security: {
        principles: [
            { title: "Datenminimierung", text: "Adressen und Nachnamen sind ausgeblendet, bis ein Match zustande kommt." },
            { title: "Stufenweise Freigabe", text: "Vom Groben (PLZ-Bereich) zum Detail (Adresse) erst bei Vertrauen." },
            { title: "Moderation", text: "Auffällige Jobs/Profile landen in der Human-Review Queue." }
        ],
        scenarios: [
            { scenario: "Kontakt/Adresse-Austausch", defense: "Warnung bei Austausch von Telefonnummern im Chat (Pattern Matching)." },
            { scenario: "Grooming", defense: "TrustScore sinkt bei auffälligem Chat-Verhalten. Meldefunktion." },
            { scenario: "Fake-Anbieter", defense: "Verifizierung via SMS/Ausweis (Roadmap). Analyse von IP/Device-Mustern." },
            { scenario: "Unzulässige Jobs", defense: "Blacklist für Keywords. Manuelle Freigabe bei neuen Accounts." },
            { scenario: "Treffen außerhalb", defense: "Safety-Checkliste vor dem ersten Treffen wird eingeblendet." },
            { scenario: "Spam", defense: "Rate-Limiting für Bewerbungen und Nachrichten." },
            { scenario: "Social Engineering", defense: "Keine Links im Chat erlaubt (außer Whitelist)." },
            { scenario: "Mehrfachaccounts", defense: "Device-Fingerprinting und Shadow-Banning." }
        ],
        trustScore: {
            definition: "Interner Risiko-Indikator, der Wahrscheinlichkeit für Missbrauch berechnet. Kein öffentliches Rating.",
            signals: ["Profilvollständigkeit", "Verifizierungsstatus", "Reaktionszeit", "Melde-Historie", "Text-Anomalien"],
            action: "Score < X -> Manuelle Prüfung. Score < Y -> Auto-Sperre."
        }
    },
    legal: {
        jugendschutz: {
            concept: "System kennt Alter des Nutzers. Jobs haben Altersfreigabe (z.B. Babysitting ab 14).",
            tech: "Hard-Block bei Bewerbung, wenn Alter < Anforderung."
        },
        dsgvo: {
            concept: "Privacy by Design. Daten nur zweckgebunden. Löschkonzept integriert.",
            detail: "Standortdaten werden verrauscht (Fuzzing) gespeichert/angezeigt, wenn nicht exakt nötig."
        },
        payment: {
            status: "MVP ist reine Vermittlung. Geldübergabe bar vor Ort (wie klassisch).",
            reason: "Vermeidet 'Schwarzarbeit'-Vorwurf durch Plattform & komplexe Finanzregulierung (BaFin) im ersten Schritt."
        }
    },
    tech: {
        overview: "Frontend: Next.js (React) für Performance/SEO. Backend: Supabase (PostgreSQL) für Echtzeit & Sicherheit. Auth: SSR-Auth.",
        webapp: "PWA (Progressive Web App). Keine Installation nötig, läuft auf jedem Schul-Handy. Updates sofort live.",
        roles: "RBAC (Role Based Access Control). Strikte Trennung von Seeker/Provider Daten auf Datenbank-Level (RLS)."
    },
    pilot: {
        location: "Rheinbach",
        phases: [
            "Phase 1: Recruiting (Schulen & Vereine)",
            "Phase 2: Betrieb (begleitete Matches)",
            "Phase 3: Auswertung & Interviews"
        ],
        metrics: [
            "Time-to-Match (Effizienz)",
            "Report-Rate (Sicherheit)",
            "Wiederkehrquote (Zufriedenheit)",
            "Verifizierungsquote (Vertrauen)"
        ]
    },
    qa: [
        // Sicherheit & Missbrauch (10)
        { category: "Sicherheit", q: "Wie verhindern Sie Pädophilie?", a: "100% Sicherheit gibt es nie, aber wir maximieren Hürden: ID-Check, Chat-Überwachung (Keywords), Meldesystem und Eltern-Info." },
        { category: "Sicherheit", q: "Was passiert, wenn sich zwei Nutzer privat treffen?", a: "Wir blenden 'Safe Meet' Tipps ein (öffentlicher Ort, Eltern Bescheid geben). Der Chat bleibt moderierbar." },
        { category: "Sicherheit", q: "Können Accounts gehackt werden?", a: "Wir nutzen Passwordless Logins (Magic Links), was Phishing fast unmöglich macht." },
        { category: "Sicherheit", q: "Was tun Sie gegen Fake-Profile?", a: "Mehrstufige Verifizierung: Email obligatorisch, SMS (geplant), Ausweis für hohe Trust-Level." },
        { category: "Sicherheit", q: "Wie erkennen Sie Grooming im Chat?", a: "Automatisierte Textanalyse auf Schlüsselwörter + Meldewesen. Verdächtige Chats werden eingefroren." },
        { category: "Sicherheit", q: "Kann ich als Anbieter einfach 100 Jugendliche anschreiben?", a: "Nein. Anbieter können nicht initiativ suchen ('Cold Call'), sondern müssen Jobs ausschreiben." },
        { category: "Sicherheit", q: "Werden Standortdaten live geteilt?", a: "Niemals. Wir zeigen nur ungefähre Radien an, bis ein 'Match' bestätigt ist." },
        { category: "Sicherheit", q: "Gibt es ein Bewertungssystem?", a: "Intern ja (TrustScore), öffentlich nein, um Mobbing und Rache-Bewertungen zu verhindern." },
        { category: "Sicherheit", q: "Was, wenn ein Job illegal ist?", a: "Jeder neue Job durchläuft einen automatisierten Filter und stichprobenartige manuelle Prüfung vor Freischaltung." },
        { category: "Sicherheit", q: "Können Eltern mitlesen?", a: "Wir planen ein Eltern-Dashboard ('Ghost Mode'), aber aktuell basieren wir auf Vertrauen zum Jugendlichen." },

        // Recht & Datenschutz (8)
        { category: "Recht", q: "Ist das Schwarzarbeit?", a: "Nein. Wir bewegen uns im Bereich der 'Geringfügigen Hilfeleistung' / Nachbarschaftshilfe. Keine Gewinnerzielungsabsicht der Plattform." },
        { category: "Recht", q: "Brauchen Sie eine Banklizenz (BaFin)?", a: "Nein, da wir keine Zahlungen abwickeln. Geld fließt bar zwischen den Parteien." },
        { category: "Recht", q: "Wie steht es um den Jugendarbeitsschutz?", a: "Wir klären auf und blockieren Jobs technisch, die für das Alter ungeeignet sind (z.B. Nachtarbeit)." },
        { category: "Recht", q: "Sind die Jugendlichen versichert?", a: "Aktuell greift die private Haftpflicht/Unfallversicherung. Eine Plattform-Versicherung ist für Phase 2 geplant." },
        { category: "Recht", q: "Wo liegen die Daten?", a: "Serverstandort Frankfurt (AWS via Supabase), DSGVO-konform verschlüsselt." },
        { category: "Recht", q: "Können Nutzer ihre Daten löschen?", a: "Ja, 'Recht auf Vergessenwerden' ist one-click implementiert." },
        { category: "Recht", q: "Was passiert bei einem Unfall?", a: "Wir sind nur Vermittler. Haftung liegt bei den Parteien/Erziehungsberechtigten. Disclaimer ist obligatorisch." },
        { category: "Recht", q: "Dürfen Lehrer die App empfehlen?", a: "Ja, da wir werbefrei und sicher sind. Wir streben offizielle Schulpartnerschaften an." },

        // Skalierung & Betrieb (6)
        { category: "Betrieb", q: "Wie verdienen Sie Geld?", a: "MVP kostenlos. Später: Premium-Listings für Anbieter oder Mikro-Provision bei Payment-Integration." },
        { category: "Betrieb", q: "Wie skalieren Sie die Moderation?", a: "Community-Moderatoren (vertrauenswürdige Eltern/Senioren) + KI-Vorfilterung zur Entlastung." },
        { category: "Betrieb", q: "Warum Rheinbach?", a: "Überschaubarer Sozialraum, gute Schulstruktur, hohe 'Nachbarschaftsdichte'. Ideales Testlabor." },
        { category: "Betrieb", q: "Was, wenn die Serverkosten explodieren?", a: "Serverless Architektur skaliert kosteneffizient. MVP läuft im Free Tier weit." },
        { category: "Betrieb", q: "Wie gewinnen Sie Nutzer (Henne-Ei)?", a: "Fokus auf Anbieter-Acquisition durch lokale Vereine/Presse zuerst. Jugendliche folgen dem Angebot." },
        { category: "Betrieb", q: "Gibt es Konkurrenz?", a: "Nebenan.de (zu generisch), eBay (zu unsicher), Schwarze Bretter (zu analog)." },

        // Produkt & UX (6)
        { category: "Produkt", q: "Warum keine native App (App Store)?", a: "Web-App ist barrierefrei, kein Download nötig, updates sofort. PWA fühlt sich aber an wie native App." },
        { category: "Produkt", q: "Was ist der Killer-Feature?", a: "Der 'Reverse-Marketplace': Anbieter bewerben ihren Job bei Jugendlichen, nicht umgekehrt. Hürde senken." },
        { category: "Produkt", q: "Warum kein öffentliches Profil der Jugendlichen?", a: "Datenschutz. Jugendliche sollen nicht 'im Schaufenster' stehen für Pädophile." },
        { category: "Produkt", q: "Wie stellen Sie Qualität sicher?", a: "Checklisten für Job-Erstellung. Wir 'zwingen' Anbieter zu klaren Beschreibungen." },
        { category: "Produkt", q: "Was unterscheidet euch von eBay Kleinanzeigen?", a: "Der Kontext. Wir sind 'Safe Space' vs. 'Wilder Westen'. Spezialisierte Features statt generische Texte." },
        { category: "Produkt", q: "Ist das Design nicht zu verspielt?", a: "Nein, es ist 'Dark Mode' Modern. Es muss die Sprache der Jugendlichen sprechen (Gaming/Social Style)." },

        // Technik (5)
        { category: "Technik", q: "Wie funktioniert der TrustScore technisch?", a: "Gewichtete Summe aus: Profil completeness, Verifications, Response Rate, Account Age. Anomalien geben Minuspunkte." },
        { category: "Technik", q: "Was passiert, wenn Supabase down ist?", a: "Die App geht in Read-Only Mode (Cache). Kritische Daten sind off-site gesichert." },
        { category: "Technik", q: "Wie performant ist die Geolocations-Suche?", a: "PostGIS Indexierung erlaubt Millionen von Einträgen in Millisekunden zu filtern." },
        { category: "Technik", q: "Warum TypeScript?", a: "Typsicherheit verhindert 30% der Bugs vor der Runtime. Essenziell für Stabilität." },
        { category: "Technik", q: "Ist der Code Open Source?", a: "Teile davon (UI Library), aber der Core-Code (Matching/Trust) bleibt proprietär (Security through obscurity teilw. nötig)." }
    ],
    dosAndDonts: {
        dos: ["'Wir minimieren Risiken...'", "'Wir geben Werkzeuge...'", "'Pilotphase läuft kontrolliert...'", "'Technologie unterstützt...'"],
        donts: ["'Die App ist 100% sicher'", "'Wir garantieren Bezahlung'", "'Wir ersetzen die Eltern'", "'Datenschutz ist uns egal'"]
    },
    roadmap: {
        shortTerm: ["SMS-Verifizierung", "Erweiterte Job-Kategorien", "Eltern-Dashboard (Lesezugriff)", "Push-Notifications", "Favoriten-Liste", "Bewertungen (intern)"],
        longTerm: ["In-App Payment", "Versicherungs-Integration", "Schul-API", "KI-Matching", "Gamification/Badges", "ID-Card Scan"]
    }
};
