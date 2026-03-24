# souleya-app – Expo React Native App

**Framework:** Expo 54 · React Native 0.81 · **Port:** 8081 (Metro Bundler)
**Deployment:** App Store + Play Store via EAS Build

---

## Starten

```bash
cd Dev/souleya-app
expo start           # Metro Bundler
expo start --ios     # iOS Simulator
expo start --android # Android Emulator
```

## Env (`.env`)

```
EXPO_PUBLIC_SUPABASE_URL=https://qxrjauhayppumggwobmi.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_t10h88yMAHQ4rmQivLR9xg_2GYnb5HP
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_MAPBOX_TOKEN=<mapbox_public_token>
```

---

## Kernabhängigkeiten

- **Expo 54** + React Native 0.81 + React 19 + TypeScript 5
- **Expo Router 6** – File-based Navigation
- **Supabase JS** – Auth + Realtime
- **TanStack React Query** – Server State
- **Zustand** – Client State (auth, chat, theme, notifications in `store/`)
- **expo-image-picker**, **expo-location**, **expo-secure-store**, **expo-av**
- **react-native-webrtc** – Video/Audio-Calls (nur Dev-Build)
- **@rnmapbox/maps** – Mapbox (nur in Dev-Build, Platzhalter im Expo Go)

---

## App-Struktur

```
app/
├── (auth)/              # Login Screen (Magic Link OTP, Passwort, Apple Sign-In)
├── (tabs)/              # Haupt-Tab-Navigation
│   ├── pulse/           # Feed (FlatList, Pull-to-Refresh, Infinite Scroll)
│   ├── circles/         # Verbindungen, Anfragen
│   ├── chat/            # Channel-Liste (Unread-Badges)
│   ├── discover/        # 4 Segmente: Alle | Mitglieder | Events | Orte
│   └── more/            # Profil, Theme-Toggle, Logout (Flyout)
├── chat/[channelId]/    # Chat-Room Screen (Realtime)
├── places/[id]/         # Place-Detail Screen
├── challenges/[id]/     # Challenge-Detail Screen
└── studio/              # Studio (Dashboard, Kurse, Content, Kalender, F2F, Circle, Finanzen)

store/
├── auth.ts              # Zustand: User, Session, Login/Logout
├── chat.ts              # Zustand: Unread-Counts
├── notifications.ts     # Zustand: Notifications (Realtime + 30s Polling)
└── theme.ts             # Zustand: Light/Dark (SecureStore-persistent)

hooks/
├── useVoiceRecorder.ts  # Sprachaufnahme (expo-av + Supabase Storage)
├── useWebRTC.ts         # WebRTC Peer-to-Peer (Supabase Broadcast Signaling)
└── useRingtone.ts       # Vibration-basierte Klingeltöne

components/
├── call/                # CallProvider (global), VideoCallOverlay, IncomingCallOverlay
├── chat/                # ChatRoom, Polls, SeedsTransfer, GroupInfoSheet,
│                          VoicePlayer, MarkdownText, CreatePollModal
├── discover/            # TagFilter, NearbyUsers, EventCard, PlaceCard,
│                          CreatePlaceModal, EventReviewCard, EventReviewForm,
│                          NominationCard
├── notifications/       # NotificationBell (Badge, Dropdown-Panel)
├── profile/             # ProfileBanner, ProfileIdentity, ProfileBio,
│                          ProfileInterests, ProfileStats, ProfileStudioCard,
│                          EditProfilePanel, SettingsPanel, SoulProgressCard,
│                          LevelUpModal, VisitenkarteOverlay
├── challenges/          # ChallengeCard, CreateChallengeModal
└── shared/              # Avatar, EnsoRing, Badge, ImageGrid, Icon, ...

lib/
├── api.ts               # API-Client mit JWT Bearer Token
├── supabase.ts          # Supabase Client
├── chat.ts              # Chat API (Channels, Messages, Reactions, Read-Status,
│                          Mute, Search, Pin, Forward, Polls, Seeds)
├── notifications.ts     # Notification API (fetch, unread, mark-read, delete, push)
├── progression.ts       # Soul Level API (Progression, Level History, Onboarding,
│                          Event Reviews CRUD, Nominations/Voting)
├── pulse.ts             # Pulse Feed API
├── events.ts            # Events API
├── circles.ts           # Circle/Verbindungen API
├── users.ts             # Users API
├── profile.ts           # Profil API (update, avatar/banner upload, geocoding)
├── places.ts            # Places API
└── challenges.ts        # Challenges API
```

### Enso-Logo (Offizielle Spezifikation)

**Einzige autorisierte Quelle:** `Souleya/Mockups/Souleya_Logo_Final_Enso.html`

SVG: `viewBox="0 0 100 100"`, `<circle cx="50" cy="50" r="36">`, `fill="none"`, `stroke-linecap="round"`, `stroke-dasharray="196 30"`, `stroke-dashoffset="15"`, Gradient `#A8894E` → `#D4BC8B` (diagonal). stroke-width: `10` (≤20px), `9` (36-48px), `8` (56px+). Oeffnung immer zwischen 1 und 2 Uhr. Keine Abwandlungen.

### Enso-Ring im Profil (Offizielle Spezifikation)

**Einzige autorisierte Quelle:** `Souleya/Mockups/Souleya_EnsoRing_Levels.html`

Der Enso-Ring als Profil-Avatar-Rahmen (Soul Levels, First Light, Mentor-Kompassstern) darf **ausschliesslich** aus dieser Referenz-Datei reproduziert werden. Enthält: 5 Level-Stufen (`stroke-dasharray`), First Light-Lichtpunkt (`cx="82.8" cy="35.2"`), Mentor-Kompassstern (`cx="61.2" cy="15.8"`, nur Level 5), alle SVG-Parameter und Kombinationen. Keine Eigeninterpretationen.

---

## Implementierungsstatus

| Bereich | Status | Anmerkung |
|---|---|---|
| Auth (Magic Link + Passwort) | ✅ | Expo Router, Zustand Auth Store, Passwort-Setzen in Settings |
| Pulse Feed | ✅ | FlatList, Pull-to-Refresh, Infinite Scroll, FAB |
| Circles | ✅ | Feed, Verbindungen, Anfragen |
| Chat Kern | ✅ | Realtime, Polls, Seeds-Transfer, Bilder, Gruppen, Replies, Reactions |
| Chat Extras | ✅ | Tipp-Indikator (Presence), Lesebestaetigungen (✓/✓✓), Sprachnachrichten (expo-av), Light Markdown, Nachrichten-Suche, Anpinnen, Weiterleiten, Stummschalten |
| Discover | ✅ | 4 Segmente, Tag-Filter, User-Suche, Place-Cards |
| Profil | ✅ | Avatar-Upload, Banner-Upload, Interest-Tags Edit, GPS-Standort, Theme-Toggle, Stats |
| Theme (Light/Dark) | ✅ | Zustand + SecureStore-Persistenz |
| Benachrichtigungen | ✅ | NotificationBell, Zustand Store, Realtime + 30s Polling, Badge-Pulse |
| Soul Level | ✅ | SoulProgressCard (Level 2-4), LevelUpModal (Animation) |
| WebRTC Calls | ✅ | CallProvider (global), VideoCallOverlay, IncomingCallOverlay, Audio+Video |
| Event Reviews | ✅ | EventReviewForm (5 Sterne + Kommentar), EventReviewCard |
| Mentor-Voting | ✅ | NominationCard (Fortschrittsbalken, Ja/Nein Abstimmung) |
| Studio | ✅ | Dashboard, Kurse, Content, Kalender, F2F, Circle, Finanzen |
| Challenges | ✅ | ChallengeCard, CreateChallengeModal, Chat-Integration |
| Mapbox-Karte | ⏳ | Platzhalter (funktioniert nur in Dev-Build) |
| Event-Erstellung | ❌ | Fehlt (in Web vorhanden) |
| Event-Bookmarks | ❌ | Fehlt |

---

## Auth-Flow

```
Login → supabase.auth.signInWithOtp() → Magic Link
→ Expo Deep Link → store/auth.ts → Tab-Navigation
```

API-Calls: JWT Bearer aus Supabase Session → `lib/api.ts`

---

## Chat-Features

- **Realtime:** Supabase Postgres Changes (messages, reactions, poll_votes)
- **Tipp-Indikator:** Supabase Presence Channel (`presence:{channelId}`)
- **Lesebestaetigungen:** `fetchReadStatus()` → ✓ gesendet, ✓✓ gelesen (Gold)
- **Sprachnachrichten:** `useVoiceRecorder` (expo-av Recording → Supabase Storage `chat-voice`) + `VoicePlayer` (Wiedergabe mit Fortschrittsbalken)
- **Light Markdown:** `MarkdownText` Komponente (**fett**, *kursiv*, `code`)
- **Nachrichten-Suche:** Volltext-Suche via API, Fullscreen-Modal mit Ergebnisliste
- **Anpinnen:** Pin/Unpin ueber Action Sheet
- **Weiterleiten:** Forward-Modal mit Kanal-Auswahl
- **Stummschalten:** Mute/Unmute Toggle im Header (Glocken-Icon)
- **Video/Audio-Calls:** WebRTC (Direct Chats), Anruf-Buttons im Header

## WebRTC Video/Audio-Telefonie

- `useWebRTC` Hook: react-native-webrtc, Supabase Broadcast Signaling, STUN, 30s Timeout
- `VideoCallOverlay`: Fullscreen mit RTCView, PiP, Avatar-Fallback, Timer
- `IncomingCallOverlay`: Pulsierender Ring, Accept/Reject, 30s Auto-Reject
- `CallProvider`: Globaler Context in `_layout.tsx`, `call-inbox:{userId}` Channel
- `useRingtone`: Vibration-Patterns (eingehend: Ring-Ring, ausgehend: Tut-Tut)

---

## EAS Build

```bash
eas build --platform ios --profile production
eas build --platform android --profile production
eas submit                    # Store-Einreichung
```

Config in `eas.json`. Bundle ID: `com.souleya.app`

---

## Fehlend gegenueber Web

- ❌ Discover: Event-Erstellung, Bookmarks, Share, Mapbox-Karte (nur Platzhalter)
- ❌ Chat: Link-Vorschau (OpenGraph), Full Emoji Picker (emoji-mart)
- ❌ Analytics (Platzhalter)

## Letzte Aenderungen (Maerz 2026)

- **NotificationBell Crash-Fix (v3):** Komponente mit **eigener Error Boundary** (`NotificationBellBoundary`) abgesichert — ein Crash in der Glocke blockiert nicht mehr die gesamte App. Inner Component (`NotificationBellInner`) mit defensiven try-catch Bloecken um jeden Hook (`useThemeStore`, `useNotificationStore`, `useRouter`). Fallback-Farben wenn Theme nicht geladen. Store-Zugriff ueber individuelle Selectors (nicht Destrukturierung).
- **TypeScript bereinigt:** Fehlende IconNames (`brand-apple`, `eye`, `eye-off`, `mail`, `bell-off`) ergaenzt. Fehlende ThemeColors (`text`, `cardBg`, `bgElevated`) ergaenzt. Chat-Types erweitert (`pinned_at`, `display_name` etc.). WebRTC-Hook auf property-basierte Event-Handler umgestellt (`ontrack` statt `addEventListener`). Entry-Point auf `expo-router/entry` korrigiert.
- **OnboardingWizard:** Fullscreen-Overlay in `(tabs)/_layout.tsx` integriert, zeigt automatisch bei Soul Level 1

---

## Tonalitaet (verbindlich fuer alle UI-Texte)

Souleya spricht **frisch, locker und liebevoll**. Kein Corporate-Deutsch, keine steifen Floskeln.

- **Duzen** – immer
- **Positiv formulieren** – statt „Fehler aufgetreten" → „Das hat leider nicht geklappt."
- **Empathisch bei Fehlern** – „Kein Problem", „Versuch es gerne nochmal."
- **Ellipsen** – „Einen Moment …" (echtes Auslassungszeichen, nicht „...")
- **Kein Tech-Jargon** – „Sitzung" statt „Session", „Postfach" statt „Inbox"
- **Keine Ausrufezeichen-Inflation**

> Vollstaendige Beispiele: siehe `Souleya/CLAUDE.md` → Abschnitt Tonalitaet

---

*Zuletzt aktualisiert: März 2026*
