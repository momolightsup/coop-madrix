# MADRIX Light Studio — Façade Animation Designer

**MADRIX Light Studio** is a patch-aware generative lighting animation designer built specifically for irregular architectural LED façades (such as the Letzipark Façade in Switzerland). It generates mathematically seamless looping MP4 animations strictly formatted and validated for playback through **MADRIX 5**.

---

## Key Features

1. **"The Patch is the Pixel Matrix"**:
   - Every effect is evaluated strictly at physical fixture coordinates.
   - Non-permitted pixels remain absolute black (`0, 0, 0`).
2. **Preloaded Letzipark Façade**:
   - Boots with all **7,090 fixtures** (`6,262 RG Light` and `828 RGBW Light`) mapped across the `2500 × 200` canvas.
3. **Flexible CSV Patch Manager**:
   - Auto-detects column names or provides an interactive column mapper for semicolon (`;`) or comma (`,`) files so future patches with custom formats work instantly.
4. **Smart Luminaire Masking & Exclusions**:
   - **Fixture Types**: One-click toggle (RG enabled, RGBW disabled by default).
   - **Vertical Line Concealment**: Geometric detector that identifies luminaires sharing vertical columns (mounting strips) and allows suppressing or dimming them with a slider.
   - **Isolated Dot Detection**: Automatically identifies 37 isolated dot fixtures and supports independent brightness/frequency boosting.
5. **Interactive 60 FPS Canvas Viewport**:
   - Smooth Pan & Zoom with *Fit to Screen* and *100% Reset*.
   - 4 Display Modes: *Animation Preview*, *Physical Layout* (color-coded by type), *Allowed Luminaires*, and *Activity Heatmap*.
   - Real-time hover inspection tooltip displaying Fixture ID, X/Y coordinates, Type, Universe, Channel, and classification badges.
6. **Curated Effect Library with Dynamic Controls**:
   - **Diamond Glints** (V13)
   - **Christmas Sparkles** (V10–V12 multi-tier clusters)
   - **Gentle Snowfall** (V35 tiny drift, upper concentration, strictly no halo blur)
   - **Organic Fire Sparkles** (V39–V41 bottom concentration, non-linear ember drift)
   - **Rising Hearts** (Parametric silhouettes, size vs. speed variation)
   - **Stationary Fading Hearts** (Clean silhouettes, fade-in/hold/fade-out, zero motion)
   - **Musical Sparkles** (Multi-voice call-and-response)
   - **Architectural Typography** (Rasterized font sampling across sparse fixtures)
   - **All Lights On** (Diagnostic constant brightness)
7. **Playback Transport & Dynamic Ranges**:
   - Speed multiplier (`0.25x`, `0.5x`, `1.0x`, `2.0x`).
   - Particle amount / density multiplier.
   - Granular Min/Max **Fade-In (Attack)** and **Fade-Out (Decay)** range sliders.
   - Min/Max Brightness intensity range.
   - Timeline scrubber with exact frame counter (e.g. Frame 450 / 1800).
8. **Direct FFmpeg MP4 Export & Automatic QC**:
   - Streams raw frames directly to FFmpeg (`libx264` High Profile, `yuv420p`, default 30 fps, 60s / 1800 frames).
   - Zero-leakage verification: checks that disabled fixtures have 0 intentional illumination.
   - Seamless loop continuity verification across the frame boundary.
   - One-click browser MP4 download.
9. **Preset Management**:
   - Save custom configurations with custom names.
   - Load, export to JSON, or import.

---

## Local Startup Instructions

The application is already running in background daemon tasks on your machine!

- **Web Studio Interface**: Open [http://localhost:5173](http://localhost:5173) in your browser.
- **Backend API**: Running on [http://localhost:3005](http://localhost:3005).

To restart or launch manually in the future:
```powershell
# In terminal 1 (Backend):
cd server
npm run dev

# In terminal 2 (Frontend Client):
cd client
npm run dev
```

---

## Technical Specifications
- **Canvas Resolution**: 2500 × 200 pixels (configurable)
- **Standard Duration**: 60 seconds (1,800 frames) or custom (10s, 30s, 120s)
- **Standard Frame Rate**: 30.00 FPS
- **Video Codec**: H.264 High Profile (`libx264`)
- **Pixel Format**: `yuv420p`, progressive, no audio
