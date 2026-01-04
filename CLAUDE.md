# Temper - Swing Rhythm Trainer

## Project Overview

Temper is a modern React + TypeScript web application for practicing swing rhythm patterns. It provides an interactive beat trainer with customizable patterns, visual feedback, sophisticated audio synthesis using Tone.js, and a quiz mode for self-assessment.

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

### Deploy to GitHub Pages
```bash
npm run deploy
```
Builds and deploys the application to GitHub Pages

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
- **Deployment:** gh-pages 6.3.0

## Project Structure

```
/Users/nick/Projects/temper/
├── src/
│   ├── App.tsx              # Main application component with RhythmTrainer
│   ├── main.tsx             # React entry point with router setup
│   ├── App.css              # Component styles
│   ├── index.css            # Global styles
│   ├── types/
│   │   └── quiz.ts          # Quiz mode type definitions
│   ├── utils/
│   │   ├── audioDetection.ts    # Microphone & clap detection (Web Audio API)
│   │   ├── quizEvaluation.ts    # Quiz scoring logic
│   │   ├── quizStorage.ts       # LocalStorage for quiz history
│   │   ├── beatGeneration.ts    # Random rhythm generators
│   │   └── sequenceBuilder.ts   # Tone.js sequence builders
│   └── assets/              # Static assets (images, icons)
├── public/                  # Public static assets
├── index.html               # HTML entry point
├── vite.config.ts          # Vite configuration (base: /temper/)
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
   - Quiz Mode: Self-assessment with microphone detection

---

## Musical Notation System

### Beat Subdivisions: **1 e & a**

Temper uses standard Western music notation for subdividing beats into sixteenth notes:

```
One Quarter Note (一拍) = Four Sixteenth Notes (四個十六分音符)

Position:  1    e    &    a
           ↓    ↓    ↓    ↓
Name:     正拍  "ee" "and" "ah"
Index:     0    1    2    3
```

**Example for 8 beats:**
```
Beat 1: 1  e  &  a  |  Beat 2: 2  e  &  a  |  ...  |  Beat 8: 8  e  &  a
```

**Pronunciation Guide:**
- **1, 2, 3...** - Quarter note positions (正拍)
- **e** - Pronounced "ee" (第一個十六分音符)
- **&** - Pronounced "and" (第二個十六分音符)
- **a** - Pronounced "ah" (第三個十六分音符)

This notation is used throughout the beat editor interface, making it easy to create complex syncopated rhythms.

---

### The Pickup Beat Mechanism

The **pickup beat** (also called **anacrusis** or **lead-in**) is a fundamental concept in swing music.

#### How It Works in Temper

When you enable **Beat 8's 'a'** (the last subdivision of the 8th beat), it serves a dual purpose:

**First Playthrough:**
```
Countdown 3-2-1 → [Pickup 'a' plays at 0:0:3] → Beat 1 starts → ... → Beat 8 → [8's 'a' plays at 0:8:3] → Loop
```

**Subsequent Loops:**
```
Beat 1 → ... → Beat 8 → [8's 'a' plays at 0:8:3] → Loop back to Beat 1
```

#### Technical Implementation

1. **Position 0:0:3** - Pickup plays ONLY on first iteration (using `Transport.scheduleOnce`)
2. **Position 0:8:3** - Beat 8's 'a' plays on ALL iterations (including first)
3. **Loop Range** - `0:1:0` to `0:9:0` (exactly 8 quarter notes)

This creates a natural lead-in before beat 1, which is essential for swing dancing and jazz rhythm.

**Why This Matters:**
- Gives dancers the "a" count before stepping on beat 1
- Creates a seamless 8-beat loop for practice
- Matches traditional swing music phrasing

---

## RhythmTrainer Features

### Practice Mode

**Controls:**
- **BPM Slider:** 60-200 BPM (beats per minute)
- **Loop Toggle:** Continuous practice mode
- **Volume Slider:** -30dB to 0dB
- **Time Flow Display:** Show/hide beat subdivisions during playback
- **Play/Stop Button:** With 3-second countdown (3 → 2 → 1)

**Beat Pattern Editor:**
- **32 beat points** = 8 beats × 4 sixteenth notes per beat
- Click any circle to toggle that beat on/off
- Visual indicators:
  - **Large circles:** Main beats (1, 2, 3...)
  - **Small circles:** Subdivisions (e, &, a)
  - **Blue/Light blue:** Enabled beats
  - **Gray:** Disabled beats
  - **Orange glow:** Currently playing beat
  - **Light blue glow:** Time flow indicator (if enabled)

**Loop Behavior:**
- Loop duration: **Exactly 8 quarter notes** (4 seconds at 120 BPM)
- Formula: `(8 × 60) ÷ BPM` seconds per loop
- Pickup 'a' plays before first iteration if Beat 8's 'a' is enabled

### Random Question Generator

Four difficulty levels for generating practice patterns:

#### **Easy (簡單)**
- Only quarter note positions (1, 2, 3, 4, 5, 6, 7, 8)
- 1-6 beats enabled randomly
- No pickup beat
- **Use case:** Beginners learning basic timing

#### **Medium (中等)**
- Quarter notes + 'a' beats
- 'a' beats always connected to quarter notes (never isolated)
- Includes rest beats
- No '&' beats (avoids syncopation)
- **Use case:** Intermediate practice with triple-step patterns

#### **Hard (困難)**
- Quarter notes + 'e' + 'a' positions
- Skips '&' beats
- More complex combinations
- **Use case:** Advanced syncopation practice

#### **Hell (地獄)**
- All four subdivisions (1, e, &, a)
- Extremely dense patterns
- Complex syncopation
- 90% chance of using all subdivisions
- **Use case:** Expert-level rhythm challenges

### Preset Management

**Built-in Presets:**
- Triple Step (×4)
- Step-Step (×4)
- Step-Hold (×4)
- Mixed: Triple + Step

**Custom Presets:**
- Save current pattern with custom name
- Load/delete saved presets
- Paginated list (5 presets per page)
- Stored in browser LocalStorage

---

## Quiz Mode

An interactive self-assessment tool that tests your ability to reproduce rhythm patterns.

### How Quiz Mode Works

1. **Enable Quiz Mode** - Toggle the "測驗模式" switch
2. **Set Up Pattern** - Choose a preset or create custom pattern
3. **Start Quiz** - Click "開始測驗"
4. **Countdown** - 3-second countdown with audio beeps (C5 → C5 → C6)
5. **Listen Phase (8 beats)** - The pattern plays while you listen
6. **Clap Phase (8 beats)** - Clap the pattern into your microphone
7. **Results** - Immediate feedback with detailed scoring

### Clap Detection System

**Technology:**
- **Web Audio API AnalyserNode** (modern, browser-compatible)
- **RMS Energy Calculation** (Root Mean Square)
- **Threshold:** 0.15 (adjustable for different environments)
- **Debounce:** 100ms minimum between claps

**Why Not Meyda/Aubio?**
- Previous versions used Meyda and Aubio.js
- Both relied on deprecated `createScriptProcessor` API
- Incompatible with Brave browser and other privacy-focused browsers
- Current AnalyserNode approach is:
  - Modern and future-proof
  - Works in all major browsers
  - Lower latency
  - Simpler implementation

### Scoring System

**Tolerance:** ±100ms (configurable in `audioDetection.ts`)

**Beat Evaluation:**
- ✅ **Correct** - Clapped when expected (green)
- ❌ **Missed** - Should have clapped but didn't (red)
- ⚠️ **Extra** - Clapped when not expected (yellow)
- ⭕ **Correct-silent** - Correctly did NOT clap (gray)

**Metrics:**
- **Accuracy:** Percentage of correct beats
- **Timing Error:** Average offset in milliseconds
- **Count Stats:** Correct / Missed / Extra

**Example Result:**
```
Accuracy: 87.5%
Correct: 7 beats
Missed: 1 beat
Extra: 0 beats
Avg Timing Error: +15ms (slightly late)
```

### Quiz History

- Automatically saved to LocalStorage
- Stores:
  - Pattern used
  - BPM setting
  - Full evaluation results
  - Timestamp
- Maximum 50 records (configurable)

---

## Audio System

### Sound Synthesis

**Clap Sound (NoiseSynth):**
- **Type:** Pink noise (more natural than white noise)
- **Filter:** BandPass at 1500 Hz, Q: 2
- **Envelope:**
  - Attack: 5ms
  - Decay: 80ms
  - Sustain: 0
  - Release: 80ms
- Creates realistic hand clap sound

**Countdown Beeps (Synth):**
- **Type:** Sine wave oscillator
- **Pitches:**
  - 3 & 2: C5 (523 Hz)
  - 1: C6 (1047 Hz) - higher pitch signals "start!"
- **Envelope:**
  - Attack: 5ms
  - Decay: 100ms
  - Duration: 100ms

**Volume Levels (relative to base volume):**
- **Main beats:** Base volume + 4dB
- **Sub-beats:** Base volume - 4dB
- **Base volume range:** -30dB to 0dB (user-adjustable slider)

### Playback Engine

**Tone.js Transport:**
- Global clock for precise timing
- BPM-synchronized scheduling
- Loop management

**Tone.Part:**
- Schedules individual beat events
- Handles looping with configurable start/end points
- Supports complex time signatures

**Swing Settings:**
- Currently set to 0 (straight sixteenth notes)
- Can be adjusted for swing feel if needed
- Subdivision: 16n (sixteenth notes)

---

## Data Structures

### SubBeat Type
```typescript
type SubBeat = {
  time: string        // Tone.js notation (e.g., "0:1:2" = measure 0, beat 1, subdivision 2)
  note: string        // "C2" (main), "C1" (sub-beat), "Rest" (silence)
  label: string       // Display label: "1", "e", "&", "a"
  isMain?: boolean    // True for quarter note positions
  isRest?: boolean    // True when disabled
  enabled?: boolean   // Active/inactive state
}
```

### Quiz Types

**QuizPhase:**
```typescript
type QuizPhase = 'idle' | 'playing' | 'recording' | 'evaluating' | 'result'
```

**BeatEvaluation:**
```typescript
type BeatEvaluation = {
  index: number               // 0-31 (or 32-63 for recording phase)
  expected: boolean           // Should this beat be played?
  detected: boolean           // Was a clap detected?
  status: 'correct' | 'missed' | 'extra' | 'correct-silent'
  timestamp?: number          // When clap was detected (seconds)
  timingError?: number        // Offset in milliseconds
}
```

**QuizEvaluation:**
```typescript
type QuizEvaluation = {
  beatEvaluations: BeatEvaluation[]
  accuracy: number            // 0-100
  correctCount: number
  missedCount: number
  extraCount: number
  averageTimingError: number  // in milliseconds
}
```

---

## Development Guidelines

### TypeScript Configuration
- **Strict mode enabled** - Catches errors at compile time
- No unused locals/parameters allowed
- No implicit any types
- Strict null checking
- All files type-checked before build

### Code Quality
- ESLint with TypeScript rules enforced
- React Hooks rules enabled
- React Refresh for fast HMR
- Consistent code formatting

### Build Output
- Vite generates optimized production bundle
- Base path: `/temper/` (for GitHub Pages deployment)
- Output directory: `dist/`
- All assets hashed for cache busting

### Performance Considerations
- **Audio Context** - Shared across components, suspended when idle
- **Beat Scheduling** - Uses Tone.js lookahead scheduling for precise timing
- **React Optimization** - Memoization used sparingly, mostly stateful components
- **Microphone** - Cleaned up properly to avoid resource leaks

---

## Deployment

### GitHub Pages Setup

The app is configured for GitHub Pages deployment:

1. **Build Configuration** (`vite.config.ts`):
   ```typescript
   base: '/temper/'  // Matches repository name
   ```

2. **Router Configuration**:
   - Uses `HashRouter` (no server-side routing needed)
   - Routes work correctly with GitHub Pages

3. **Deployment Command**:
   ```bash
   npm run deploy
   ```
   - Builds production bundle
   - Deploys to `gh-pages` branch
   - Accessible at: `https://bumble-tw.github.io/temper/`

### Manual Deployment
```bash
npm run build      # Creates dist/ folder
npm run preview    # Test locally
# Then upload dist/ to your hosting provider
```

---

## Troubleshooting

### Microphone Not Working

**Issue:** Quiz mode says "無法訪問麥克風"

**Solutions:**
1. Check browser permissions - allow microphone access
2. Use HTTPS (required for microphone on some browsers)
3. Try Chrome/Firefox/Safari (Brave and Edge also supported)
4. Check system microphone settings

### Clap Detection Too Sensitive/Not Sensitive

**Issue:** False positives or missed claps

**Solutions:**
1. Adjust `CLAP_DETECTION_CONFIG.energyThreshold` in `audioDetection.ts`
   - Default: 0.15 (range: 0-1)
   - Lower value = more sensitive
   - Higher value = less sensitive
2. Adjust `minTimeBetweenClaps` (default: 100ms)
3. Try clapping louder/closer to microphone

### Audio Timing Issues

**Issue:** Beats sound off-time or laggy

**Solutions:**
1. Close other audio applications
2. Try reducing browser audio latency (in browser settings)
3. Check CPU usage - high load can cause audio glitches
4. Ensure Transport.start() includes position reset

---

## Future Enhancements

### Planned Features
1. **Sensitivity Adjustment** - UI slider for clap detection threshold
2. **Latency Calibration** - Automatic audio delay compensation
3. **Difficulty Rating** - Score patterns by complexity
4. **Progress Dashboard** - Track improvement over time
5. **Pattern Library** - Community-shared rhythm patterns
6. **Audio Playback** - Record and playback your claps
7. **Mobile Optimization** - Touch-friendly beat editor
8. **Offline Mode** - PWA with service worker

### Technical Debt
1. **Testing** - Add Vitest/Jest for unit tests
2. **Component Split** - Extract large components from App.tsx
3. **State Management** - Consider Zustand for complex state
4. **Accessibility** - ARIA labels, keyboard navigation
5. **Error Boundaries** - Graceful error handling

### Known Issues
- **iOS Safari** - Microphone detection may have higher latency
- **Firefox** - Occasional audio context resume issues (workaround implemented)
- **Brave** - Previously used deprecated APIs, now fully compatible

---

## Contributing

### Code Style
- Use TypeScript strict mode
- Follow React best practices
- Keep components focused (Single Responsibility)
- Add JSDoc comments for complex functions
- Use descriptive variable names

### Git Workflow
- Feature branches for new features
- Descriptive commit messages
- Test before pushing
- Use `npm run lint` before committing

### Testing Checklist
- [ ] Practice mode works (play/stop/loop)
- [ ] Random question generators create valid patterns
- [ ] Preset save/load works
- [ ] Quiz mode countdown plays
- [ ] Clap detection responds to sound
- [ ] Quiz results calculate correctly
- [ ] All browser targets tested (Chrome, Firefox, Safari, Brave)

---

## License & Credits

**Author:** Bumble-TW
**Repository:** https://github.com/bumble-tw/temper
**Live Demo:** https://bumble-tw.github.io/temper/

Built with ❤️ for swing dancers and rhythm enthusiasts.
