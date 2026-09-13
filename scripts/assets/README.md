# UREfy Local Asset Processing Toolkit

Reproducible, high-precision asset processing tools located in `scripts/assets/`.

Designed for production web & PWA asset generation, transparency extraction, halo removal, and automated quality assurance.

---

## Environment & Dependencies

- **Python**: Python 3.14 with `pillow` (>= 12.3.0), `numpy` (>= 2.4.3), and `scipy` (>= 1.18.0)
- **Node.js**: Node.js v22 with `sharp` (bundled with `librsvg` and `libvips` in `node_modules/sharp`)

---

## Scripts & Tools

### 1. `verify-alpha.py`

Programmatically verifies if an image has a genuine alpha channel and is free of synthetic artifacts.

#### Checks Performed:
- **True Alpha Channel**: Validates that mode is `RGBA` (or `LA`/`PA`) and channel bands contain `'A'`.
- **Non-Uniform 255**: Verifies alpha is not uniformly 255 (opaque / pseudo-alpha) and not uniformly 0 (blank).
- **Fake Baked Checkerboard Detection**: Computes 2D autocorrelation using 2D FFT and block variance analysis to detect fake transparency checkerboard patterns (8x8, 16x16, 32x32 blocks).
- **Halo & Fringing Detection**: Analyzes semi-transparent edge pixels against their nearest interior opaque neighbors using Euclidean Distance Transforms (EDT) to detect white, dark, and gray halos.

#### Usage:
```bash
# Basic check
python scripts/assets/verify-alpha.py path/to/icon.png

# JSON output
python scripts/assets/verify-alpha.py path/to/icon.png --json

# Strict mode (fails on halo warnings)
python scripts/assets/verify-alpha.py path/to/icon.png --strict
```

#### Python API:
```python
from verify_alpha import verify_alpha_image

report = verify_alpha_image("logo.png")
if not report.passed:
    print("Errors:", report.errors)
```

---

### 2. `process-transparency.py`

Removes uniform or edge-connected background colors while preserving interior shapes, applying sub-pixel edge feathering, and eliminating white/dark halos.

#### Key Features:
- **Edge-Connected Flood Fill**: Auto-detects or accepts custom background colors (`#FFFFFF`, `#000000`, `auto`) and removes only background connected to the image boundaries, preserving enclosed white or dark elements (e.g., donut centers, text, inner stars).
- **Sub-pixel Feathering**: Applies signed distance transform and smoothstep S-curve interpolation to produce anti-aliased edges without jagged staircasing.
- **Color De-fringing & De-contamination**: Propagates pure interior foreground colors outward into semi-transparent edge pixels using distance transforms, completely eliminating white and dark halos.
- **Bounding Box Crop**: Crops to tight non-zero alpha bounding box.
- **Optical Padding & Square Canvas**: Centers the cropped asset on a square transparent canvas with controlled percentage optical padding (default 8%).
- **Automated QA**: Runs `verify-alpha` on the final output to guarantee 100% genuine alpha.

#### Usage:
```bash
# Auto-detect background, crop, pad 8%, square canvas
python scripts/assets/process-transparency.py input.png -o output-clean.png

# Specific background color and padding
python scripts/assets/process-transparency.py input.jpg -o output-clean.png --bg-color white --padding 0.10

# Global color removal (removes isolated background islands too)
python scripts/assets/process-transparency.py input.png -o output-clean.png --global-removal
```

#### Python API:
```python
from process_transparency import process_transparency

clean_img, stats = process_transparency(
    "logo_with_bg.png",
    output_path="logo_clean.png",
    bg_color="white",
    padding=0.08,
    square=True
)
```

---

### 3. `generate-icon-set.py`

Complete high-precision icon generator supporting SVG and PNG masters.

#### Outputs Generated:
- **16 Standard Square Icon Sizes**:
  `16x16`, `24x24`, `32x32`, `48x48`, `64x64`, `72x72`, `96x96`, `128x128`, `144x144`, `152x152`, `180x180`, `192x192`, `256x256`, `384x384`, `512x512`, `1024x1024`.
- **Maskable Icon Variants**:
  All sizes with 10% safe zone padding (inner 80% safe zone) and theme background (default: `#0B0E14` for UREfy dark theme).
- **Web Convenience Aliases**:
  `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png` (180x180), `apple-touch-icon-152x152.png`, `android-chrome-192x192.png`, `android-chrome-512x512.png`.
- **Multi-resolution Favicon**:
  `favicon.ico` containing 16x16, 32x32, and 48x48 mipmaps.
- **PWA Manifest Descriptor**:
  `icons-manifest.json` describing all icons with sizes, types, and purposes (`any` and `maskable`).
- **Programmatic QA**:
  Runs `verify-alpha` on each standard output icon.

#### Usage:
```bash
# From master SVG
python scripts/assets/generate-icon-set.py assets/logo.svg -o public/icons

# From master PNG with automatic transparency pre-cleaning
python scripts/assets/generate-icon-set.py assets/logo.png -o public/icons --clean-first

# Custom maskable background
python scripts/assets/generate-icon-set.py assets/logo.svg -o public/icons --maskable-bg "#0B0E14"
```

---

### 4. `render-svg.mjs`

Node.js helper utilizing `sharp` and `librsvg` for high-resolution vector rasterization.

```bash
node scripts/assets/render-svg.mjs input.svg output.png 1024 1024
```

---

### 5. `test-asset-pipeline.py`

Automated 11-test validation suite covering:
1. Genuine transparent PNG verification
2. Uniform 255 pseudo-transparency rejection
3. Non-alpha RGB rejection
4. 8x8 baked checkerboard detection
5. 16x16 baked checkerboard detection
6. Edge halo & white fringe detection
7. Background removal & inner-shape protection
8. Color de-fringing & halo elimination
9. PNG icon set generation (all 16 sizes + maskables + aliases + ico)
10. SVG icon set generation via Sharp
11. CLI executions, argument parsing, and exit codes

Run the test suite:
```bash
python scripts/assets/test-asset-pipeline.py
```
