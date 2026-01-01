# Temper - Swing Rhythm Trainer

## Project Overview

Temper is a modern React + TypeScript web application for practicing swing rhythm patterns. It provides an interactive beat trainer with customizable patterns, visual feedback, and sophisticated audio synthesis using Tone.js.

## Quick Start Commands

### Development
```bash
npm run dev
```
Starts the Vite development server with hot module replacement (HMR) at http://localhost:5173

### Build
```bash
npm run build
```
Type-checks the codebase with TypeScript, then builds the production bundle to `dist/`

### Preview Production Build
```bash
npm run preview
```
Serves the production build locally for testing before deployment

### Linting
```bash
npm run lint
```
Runs ESLint to check code quality and catch potential issues

### Testing
**Note:** No test framework is currently configured. Consider adding Vitest or Jest for unit/integration testing.

## Technology Stack

### Core
- **Framework:** React 19.2.0
- **Language:** TypeScript 5.9.3 (strict mode)
- **Build Tool:** Vite 7.2.4
- **Module System:** ES Modules

### Key Dependencies
- **Audio:** Tone.js 15.1.22 (Web Audio API wrapper)
- **UI Components:** Mantine 8.3.10 (component library + hooks)
- **Routing:** React Router DOM 7.10.1 (HashRouter)

### Development Tools
- **Linting:** ESLint 9 with TypeScript rules
- **Type Checking:** Strict TypeScript configuration

## Project Structure

```
/Users/nick/Projects/temper/
├── src/
│   ├── App.tsx              # Main application component with RhythmTrainer
│   ├── main.tsx             # React entry point with router setup
│   ├── App.css              # Component styles
│   ├── index.css            # Global styles
│   └── assets/              # Static assets (images, icons)
├── public/                  # Public static assets
├── index.html               # HTML entry point
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript root config
├── tsconfig.app.json       # TypeScript app config (strict mode)
├── tsconfig.node.json      # TypeScript Node/build config
├── eslint.config.js        # ESLint configuration
└── package.json            # Dependencies and scripts
```

## Architecture

### Application Flow

1. **Entry Point** (`main.tsx`)
   - Initializes React app with HashRouter
   - Wraps app in MantineProvider for theming
   - Renders root route

2. **Routing** (HashRouter)
   - `/` - Home page with navigation
   - `/about` - About page
   - `/trainer` - Main rhythm trainer interface

3. **Main Component** (`App.tsx`)
   - RhythmTrainer: Core rhythm practice tool

### RhythmTrainer Component

The main feature of the application, providing:

**Controls:**
- BPM Slider (60-200 BPM)
- Loop Toggle (continuous practice mode)
- Play/Stop Button
- Beat Pattern Editor (32 beat points grid)

**Beat Pattern System:**
- 32 total beat points = 8 beats × 4 sixteenth notes per beat
- Each beat point can be toggled on/off
- Visual indicators with color coding:
  - Blue: Main beats (downbeats)
  - Light blue: Sub-beats
  - Red: Enabled rests
  - Gray: Disabled beats

**Data Structure:**
```typescript
type SubBeat = {
  time: string        // Tone.js time notation (e.g., "0:0:0")
  note: string        // C2 (main), C1 (sub-beat), Rest (silence)
  label: string       // Display label ("1", "&", ".")
  isMain?: boolean    // Downbeat indicator
  isRest?: boolean    // Rest indicator
  enabled?: boolean   // Active/inactive state
}
```

### Audio System (Tone.js)

**Sound Synthesis:**
- **NoiseSynth** with BandPass filter for clap-like sounds
- **Filter:** 1500 Hz center frequency, Q: 2
- **Envelope:** Attack 5ms, Decay 80ms, Release 80ms
- **Swing:** 20% swing on eighth-note subdivisions

**Volume Levels:**
- Main beats: -6dB
- Sub-beats: -10dB
- Rests: -14dB

**Playback:**
- Uses `Tone.Part` for scheduled beat playback
- Supports looping mode
- Transport control for start/stop

## Development Guidelines

### TypeScript Configuration
- Strict mode enabled
- No unused locals/parameters allowed
- No implicit any types
- Strict null checking

### Code Quality
- ESLint with TypeScript rules enforced
- React Hooks rules enabled
- React Refresh for fast HMR

### Build Output
- Vite generates optimized production bundle
- Base path set to `./` for flexible deployment
- Output directory: `dist/`

## Recent Development Focus

Based on git history:
- Custom beat pattern mode (now default)
- Step-hold mode support
- Clap sound effect optimization
- Tone.Part callback fixes for audio playback
- Initial Tone.js integration

## Deployment Notes

- Build output is optimized for static hosting
- Relative paths configured for easy deployment to subdirectories
- Uses HashRouter (no server-side routing required)
- All assets bundled via Vite

## Future Considerations

1. **Testing:** Add Vitest or Jest for unit/component testing
2. **State Management:** Consider Redux/Zustand if complexity grows
3. **PWA:** Could add service worker for offline functionality
4. **Audio Presets:** Save/load custom beat patterns
5. **Mobile Optimization:** Touch-friendly beat editor
