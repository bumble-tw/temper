# trainer-visual-design Specification

## Purpose

TBD - created by archiving change 'redesign-trainer-ui'. Update Purpose after archive.

## Requirements

### Requirement: Centralized Mantine theme

The application SHALL define a single Mantine theme configuration (`src/theme.ts`) that sets `primaryColor`, heading/font-size scale, and spacing tokens, and the root `MantineProvider` SHALL apply this theme.

#### Scenario: Theme applied at app root

- **WHEN** the application renders any page
- **THEN** Mantine components SHALL resolve their color and spacing values from `src/theme.ts` rather than Mantine's unmodified defaults


<!-- @trace
source: redesign-trainer-ui
updated: 2026-06-27
code:
  - CLAUDE.md
  - src/main.tsx
  - .spectra.yaml
  - src/theme.ts
  - src/components/ControlPanel.tsx
  - src/components/QuizStatusPanel.tsx
  - src/components/TabControlsCard.tsx
  - src/pages/Trainer.tsx
  - src/components/BeatEditor.tsx
-->

---
### Requirement: Card-based section layout on the Trainer page

Each functional section within a Trainer page tab (status indicator, controls, beat editor, preset manager, random question generator) SHALL be visually grouped inside a bordered Mantine `Card` component, rather than a bare `Group`/`Stack`/`Divider` arrangement.

#### Scenario: Sections rendered as distinct cards

- **WHEN** a user opens any of the three Trainer tabs (測驗模式, 隨機考題, 自訂模式)
- **THEN** each functional section within that tab SHALL be rendered inside its own `Card` with a border, rounded corners, and a shadow


<!-- @trace
source: redesign-trainer-ui
updated: 2026-06-27
code:
  - CLAUDE.md
  - src/main.tsx
  - .spectra.yaml
  - src/theme.ts
  - src/components/ControlPanel.tsx
  - src/components/QuizStatusPanel.tsx
  - src/components/TabControlsCard.tsx
  - src/pages/Trainer.tsx
  - src/components/BeatEditor.tsx
-->

---
### Requirement: Shared control card across tabs

The BPM slider, sound type selector, and time-flow display checkboxes SHALL be implemented as a single shared component used by all three Trainer tabs, instead of being duplicated per tab.

#### Scenario: Consistent controls across tabs

- **WHEN** a user switches between the 測驗模式, 隨機考題, and 自訂模式 tabs
- **THEN** the BPM slider, sound type selector, and time-flow checkboxes SHALL render with identical layout, spacing, and labels in every tab

#### Scenario: Tab-specific control visibility

- **WHEN** a user is on the 自訂模式 or 隨機考題 tab
- **THEN** the loop and countdown switches SHALL be shown alongside the shared controls
- **WHEN** a user is on the 測驗模式 tab
- **THEN** the loop and countdown switches SHALL NOT be shown, since quiz mode always disables loop and always uses countdown


<!-- @trace
source: redesign-trainer-ui
updated: 2026-06-27
code:
  - CLAUDE.md
  - src/main.tsx
  - .spectra.yaml
  - src/theme.ts
  - src/components/ControlPanel.tsx
  - src/components/QuizStatusPanel.tsx
  - src/components/TabControlsCard.tsx
  - src/pages/Trainer.tsx
  - src/components/BeatEditor.tsx
-->

---
### Requirement: Visual changes preserve existing interaction behavior

The visual redesign SHALL NOT change any existing playback, quiz, preset, or beat-pattern interaction behavior.

#### Scenario: Playback and quiz flow unchanged

- **WHEN** a user performs any existing action (play/stop, BPM change, sound type change, toggling a time-flow position, starting a quiz, generating a random question, saving/loading/deleting a preset)
- **THEN** the resulting application state and audio behavior SHALL be identical to the behavior before the visual redesign


<!-- @trace
source: redesign-trainer-ui
updated: 2026-06-27
code:
  - CLAUDE.md
  - src/main.tsx
  - .spectra.yaml
  - src/theme.ts
  - src/components/ControlPanel.tsx
  - src/components/QuizStatusPanel.tsx
  - src/components/TabControlsCard.tsx
  - src/pages/Trainer.tsx
  - src/components/BeatEditor.tsx
-->

---
### Requirement: Removal of unused ControlPanel component

The `src/components/ControlPanel.tsx` component, which is not referenced by any page after the tab-based layout was introduced, SHALL be deleted from the codebase.

#### Scenario: No remaining references to ControlPanel

- **WHEN** a project-wide search for `ControlPanel` is performed after this change
- **THEN** no source file SHALL reference `ControlPanel` or import from `src/components/ControlPanel.tsx`

<!-- @trace
source: redesign-trainer-ui
updated: 2026-06-27
code:
  - CLAUDE.md
  - src/main.tsx
  - .spectra.yaml
  - src/theme.ts
  - src/components/ControlPanel.tsx
  - src/components/QuizStatusPanel.tsx
  - src/components/TabControlsCard.tsx
  - src/pages/Trainer.tsx
  - src/components/BeatEditor.tsx
-->