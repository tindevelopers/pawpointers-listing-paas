---
name: Add Telnyx skills
overview: Add official Telnyx skills from team-telnyx/telnyx-skills to the cursor-skills repo, choosing Python and JavaScript (full product sets) plus Twilio migration and WebRTC client skills, and update the README so they can be used the same way as abacus-ai.
todos: []
isProject: false
---

# Add Telnyx skills to cursor-skills repo

## Source and structure

- **Official repo:** [team-telnyx/telnyx-skills](https://github.com/team-telnyx/telnyx-skills) (main branch).
- Each language has a `telnyx-{lang}/skills/` directory with one folder per product (e.g. `telnyx-messaging-python/SKILL.md`, `telnyx-voice-javascript/SKILL.md`). Each product folder is a valid Cursor skill (single `SKILL.md`).
- Cursor expects skills at **one level** under `.cursor/skills/` (e.g. `.cursor/skills/telnyx-messaging-python/SKILL.md`). So we keep a **grouping** folder in the repo (e.g. `telnyx-python/`) and put product skill folders inside it; users copy `telnyx-python/`* (or individual folders) into their `.cursor/skills/` so each product becomes a top-level skill.

## Skills to add (chosen set)


| Set                         | Contents                                                                 | Rationale                                                                                    |
| --------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| **Telnyx Python**           | All product skills under `telnyx-python/skills/`                         | Backend/scripts; covers messaging, voice, numbers, AI, IoT, account, etc. (36 products).     |
| **Telnyx JavaScript**       | All product skills under `telnyx-javascript/skills/`                     | Node/Next.js/frontend; same 36 products.                                                     |
| **Telnyx Twilio migration** | `telnyx-twilio-migration/skills/telnyx-twilio-migration/`                | Single skill; high value for migrating from Twilio (TwiML→TeXML, SMS, WebRTC, Verify, etc.). |
| **Telnyx WebRTC client**    | `telnyx-webrtc-client/skills/` (JS, iOS, Android, Flutter, React Native) | Client-side calling apps; optional but useful if you build VoIP UIs.                         |


We do **not** add curl, Go, Java, or Ruby to keep the repo size and scope manageable; they can be added later using the same process.

## Implementation steps

### 1. Get Telnyx skill files into the workspace

- Clone [team-telnyx/telnyx-skills](https://github.com/team-telnyx/telnyx-skills) into a temporary directory (e.g. `/Users/foo/projects/cursor-skills/.tmp-telnyx` or a sibling `telnyx-skills-clone`), or use `git sparse-checkout` / shallow clone to fetch only:
  - `telnyx-python/skills/`
  - `telnyx-javascript/skills/`
  - `telnyx-twilio-migration/skills/`
  - `telnyx-webrtc-client/skills/`

### 2. Copy into cursor-skills (preserve layout)

- **Python:** Copy contents of `telnyx-skills/telnyx-python/skills/` into [cursor-skills/telnyx-python/](cursor-skills/telnyx-python/). Result: `cursor-skills/telnyx-python/telnyx-messaging-python/SKILL.md`, `cursor-skills/telnyx-python/telnyx-voice-python/SKILL.md`, etc.
- **JavaScript:** Copy contents of `telnyx-skills/telnyx-javascript/skills/` into `cursor-skills/telnyx-javascript/`. Result: `cursor-skills/telnyx-javascript/telnyx-messaging-javascript/SKILL.md`, etc.
- **Twilio migration:** Copy `telnyx-skills/telnyx-twilio-migration/skills/telnyx-twilio-migration/` to `cursor-skills/telnyx-twilio-migration/` (single top-level skill folder).
- **WebRTC client:** Copy contents of `telnyx-skills/telnyx-webrtc-client/skills/` into `cursor-skills/telnyx-webrtc-client/` (one folder per platform: e.g. `telnyx-webrtc-client-js/`, `telnyx-webrtc-client-ios/`, …).

### 3. Update README

- In [cursor-skills/README.md](cursor-skills/README.md):
  - Add a **Telnyx** row to the skills table: link to `telnyx-python/`, `telnyx-javascript/`, `telnyx-twilio-migration/`, `telnyx-webrtc-client/` and short descriptions (e.g. “Telnyx API (Python) – messaging, voice, numbers, AI, etc.”, “Migrate Twilio → Telnyx”, “WebRTC client SDKs (JS, iOS, Android, Flutter, React Native)”).
  - Add a **How to use Telnyx skills** subsection:
    - **All Python skills:** `cp -r telnyx-python/* ~/.cursor/skills/` (or into `your-project/.cursor/skills/`).
    - **All JavaScript skills:** `cp -r telnyx-javascript/* ~/.cursor/skills/`.
    - **Single product (e.g. messaging in Python):** `cp -r telnyx-python/telnyx-messaging-python ~/.cursor/skills/`.
    - **Twilio migration:** `cp -r telnyx-twilio-migration ~/.cursor/skills/`.
    - **WebRTC client (e.g. JS):** `cp -r telnyx-webrtc-client/telnyx-webrtc-client-js ~/.cursor/skills/`.
  - Add a **Credit** line: “Telnyx skills are from [team-telnyx/telnyx-skills](https://github.com/team-telnyx/telnyx-skills); see their README for full product list and Agent Skills spec.”

### 4. Commit and push

- From `cursor-skills`: `git add .`, `git commit -m "Add Telnyx skills (Python, JavaScript, Twilio migration, WebRTC client)"`, `git push origin main`.

## Resulting layout (conceptual)

```text
cursor-skills/
├── README.md              # Updated with Telnyx table and usage
├── abacus-ai/
│   ├── SKILL.md
│   └── reference.md
├── telnyx-python/
│   ├── telnyx-messaging-python/
│   │   └── SKILL.md
│   ├── telnyx-voice-python/
│   │   └── SKILL.md
│   └── ... (other products)
├── telnyx-javascript/
│   ├── telnyx-messaging-javascript/
│   │   └── SKILL.md
│   └── ...
├── telnyx-twilio-migration/
│   └── SKILL.md
└── telnyx-webrtc-client/
    ├── telnyx-webrtc-client-js/
    │   └── SKILL.md
    └── ...
```

## Optional follow-ups

- Add **telnyx-cli** the same way if you want CLI-focused skills.
- Omit **telnyx-webrtc-client** from the first pass if you want to add only server-side + Twilio migration and add WebRTC later.

