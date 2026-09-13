#!/usr/bin/env python3
"""
test-asset-pipeline.py - Comprehensive Test Suite for UREfy Asset Processing Toolkit

Tests:
1. verify-alpha.py:
   - Genuine transparent image (PASS)
   - Uniform alpha 255 pseudo-transparency (FAIL)
   - RGB image without alpha channel (FAIL)
   - Baked 8x8 checkerboard detection (FAIL)
   - Baked 16x16 checkerboard detection (FAIL)
   - Edge halo detection on contaminated fringe (HALO DETECTED)
2. process-transparency.py:
   - Background removal on white background with feathering & defringing
   - Protection of interior enclosed details (edge-connected flood fill)
   - De-fringing efficacy (eliminates white halos)
   - Bounding box crop & optical padding
   - Output passes verify-alpha
3. generate-icon-set.py:
   - Master PNG icon generation across all 16 standard sizes
   - Maskable icons generation with 10% safe-zone padding
   - Web convenience aliases & favicon.ico
   - Programmatic alpha verification for all generated outputs
   - Master SVG rasterization & icon generation via Sharp
"""

import sys
import os
import shutil
import tempfile
import json
import unittest

import numpy as np
from PIL import Image, ImageDraw

current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

import verify_alpha
import process_transparency
import generate_icon_set


class TestAssetProcessingToolkit(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.test_dir = tempfile.mkdtemp(prefix="urefy_asset_test_")
        print(f"\n[SETUP] Running tests in temporary scratch directory: {cls.test_dir}")

    @classmethod
    def tearDownClass(cls):
        if os.path.exists(cls.test_dir):
            shutil.rmtree(cls.test_dir, ignore_errors=True)
        print(f"[TEARDOWN] Cleaned up temporary test directory.")

    def create_synthetic_star_png(self, path: str, size: int = 256) -> str:
        """Creates a clean multi-colored graphic on transparent RGBA canvas."""
        img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)

        # Draw a clean circular badge with anti-aliasing
        center = size // 2
        radius = int(size * 0.38)
        bbox = [center - radius, center - radius, center + radius, center + radius]
        draw.ellipse(bbox, fill=(79, 70, 229, 255), outline=(99, 102, 241, 255), width=4)

        # Draw interior star
        inner_pts = [
            (center, center - radius + 15),
            (center + 20, center - 10),
            (center + radius - 20, center - 10),
            (center + 30, center + 15),
            (center + 50, center + radius - 25),
            (center, center + 35),
            (center - 50, center + radius - 25),
            (center - 30, center + 15),
            (center - radius + 20, center - 10),
            (center - 20, center - 10),
        ]
        draw.polygon(inner_pts, fill=(245, 158, 11, 255))
        img.save(path, format="PNG")
        return path

    def create_checkerboard_image(self, path: str, size: int = 256, block_size: int = 8) -> str:
        """Creates an image with a fake baked checkerboard in the background."""
        B = block_size
        x = np.arange(size)
        y = np.arange(size)
        xx, yy = np.meshgrid(x, y)
        checker = (((xx // B) + (yy // B)) % 2) * 51 + 204  # 204 (#CCCCCC) and 255 (#FFFFFF)

        img_arr = np.zeros((size, size, 4), dtype=np.uint8)
        img_arr[:, :, 0] = checker
        img_arr[:, :, 1] = checker
        img_arr[:, :, 2] = checker
        img_arr[:, :, 3] = 255  # Fully opaque baked checkerboard!

        # Draw a solid logo in the center
        center = size // 2
        dist = np.sqrt((xx - center)**2 + (yy - center)**2)
        logo_mask = dist < (size * 0.3)
        img_arr[logo_mask, 0] = 79
        img_arr[logo_mask, 1] = 70
        img_arr[logo_mask, 2] = 229

        img = Image.fromarray(img_arr, mode="RGBA")
        img.save(path, format="PNG")
        return path

    def create_halo_image(self, path: str, size: int = 128) -> str:
        """Creates an image with an intentional severe white halo along edge pixels."""
        img_arr = np.zeros((size, size, 4), dtype=np.uint8)
        y, x = np.ogrid[:size, :size]
        center = size // 2
        dist = np.sqrt((x - center)**2 + (y - center)**2)
        radius = size * 0.35

        # Anti-aliased alpha
        alpha = np.clip((radius + 1.0 - dist) * 128, 0, 255).astype(np.uint8)

        # Deep saturated purple
        img_arr[:, :, 0] = 60
        img_arr[:, :, 1] = 20
        img_arr[:, :, 2] = 180
        img_arr[:, :, 3] = alpha

        # Contaminate semi-transparent edges with white halo
        semi_mask = (alpha >= 10) & (alpha < 240)
        blend_factor = 1.0 - (alpha[semi_mask].astype(np.float32) / 255.0)
        for c in range(3):
            orig_c = img_arr[semi_mask, c].astype(np.float32)
            img_arr[semi_mask, c] = np.clip(orig_c * (1.0 - blend_factor) + 255.0 * blend_factor, 0, 255).astype(np.uint8)

        img = Image.fromarray(img_arr, mode="RGBA")
        img.save(path, format="PNG")
        return path

    def create_opaque_white_bg_image(self, path: str, size: int = 200) -> str:
        """Creates a logo on a solid white background with enclosed white donut hole."""
        img = Image.new("RGB", (size, size), (255, 255, 255))
        draw = ImageDraw.Draw(img)
        center = size // 2

        # Outer blue ring
        draw.ellipse([center - 60, center - 60, center + 60, center + 60], fill=(30, 64, 175))
        # Inner white hole (must be protected by edge-connected flood fill)
        draw.ellipse([center - 25, center - 25, center + 25, center + 25], fill=(255, 255, 255))

        img.save(path, format="PNG")
        return path

    def create_sample_svg(self, path: str) -> str:
        """Creates a valid master SVG file."""
        svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <rect width="200" height="200" rx="40" fill="#0B0E14" />
  <circle cx="100" cy="100" r="70" fill="#4F46E5" />
  <polygon points="100,50 140,135 60,135" fill="#F59E0B" />
  <circle cx="100" cy="115" r="15" fill="#FFFFFF" />
</svg>"""
        with open(path, "w", encoding="utf-8") as f:
            f.write(svg)
        return path

    # =========================================================================
    # 1. VERIFY-ALPHA TESTS
    # =========================================================================

    def test_01_verify_genuine_transparent(self):
        """Test verify-alpha passes on a clean genuine transparent PNG."""
        path = os.path.join(self.test_dir, "clean_star.png")
        self.create_synthetic_star_png(path)

        report = verify_alpha.verify_alpha_image(path)
        print(f"\n[TEST 1] Clean PNG verification: passed={report.passed}")
        self.assertTrue(report.passed, f"Expected clean image to pass: {report.errors}")
        self.assertTrue(report.has_alpha_channel)
        self.assertFalse(report.checkerboard_detected)
        self.assertFalse(report.halo_detected)
        self.assertGreater(report.alpha_stats["transparent_pct"], 10.0)

    def test_02_verify_uniform_alpha_fails(self):
        """Test verify-alpha rejects an image with uniformly 255 alpha."""
        path = os.path.join(self.test_dir, "uniform_opaque.png")
        img = Image.new("RGBA", (100, 100), (255, 0, 0, 255))
        img.save(path)

        report = verify_alpha.verify_alpha_image(path)
        print(f"[TEST 2] Uniform 255 verification: passed={report.passed} (expected False)")
        self.assertFalse(report.passed)
        self.assertTrue(any("uniformly 255" in err for err in report.errors))

    def test_03_verify_rgb_mode_fails(self):
        """Test verify-alpha rejects an image without alpha channel."""
        path = os.path.join(self.test_dir, "no_alpha.png")
        img = Image.new("RGB", (100, 100), (0, 255, 0))
        img.save(path)

        report = verify_alpha.verify_alpha_image(path)
        print(f"[TEST 3] RGB mode verification: passed={report.passed} (expected False)")
        self.assertFalse(report.passed)
        self.assertFalse(report.has_alpha_channel)

    def test_04_verify_detects_baked_checkerboard_8x8(self):
        """Test verify-alpha detects 8x8 baked checkerboard pattern."""
        path = os.path.join(self.test_dir, "checker_8x8.png")
        self.create_checkerboard_image(path, block_size=8)

        report = verify_alpha.verify_alpha_image(path)
        print(f"[TEST 4] 8x8 Baked checkerboard: detected={report.checkerboard_detected}")
        self.assertTrue(report.checkerboard_detected)
        self.assertEqual(report.checkerboard_details.get("block_size"), 8)
        self.assertFalse(report.passed)

    def test_05_verify_detects_baked_checkerboard_16x16(self):
        """Test verify-alpha detects 16x16 baked checkerboard pattern."""
        path = os.path.join(self.test_dir, "checker_16x16.png")
        self.create_checkerboard_image(path, block_size=16)

        report = verify_alpha.verify_alpha_image(path)
        print(f"[TEST 5] 16x16 Baked checkerboard: detected={report.checkerboard_detected}")
        self.assertTrue(report.checkerboard_detected)
        self.assertEqual(report.checkerboard_details.get("block_size"), 16)
        self.assertFalse(report.passed)

    def test_06_verify_detects_white_halo(self):
        """Test verify-alpha flags white fringing along edges."""
        path = os.path.join(self.test_dir, "white_halo.png")
        self.create_halo_image(path)

        report = verify_alpha.verify_alpha_image(path, strict=True)
        print(f"[TEST 6] Halo detection: halo_detected={report.halo_detected}, white_ratio={report.halo_details.get('white_halo_ratio')*100:.1f}%")
        self.assertTrue(report.halo_detected)
        self.assertGreater(report.halo_details.get("white_halo_ratio", 0), 0.20)
        self.assertFalse(report.passed)  # Strict mode turns halo into failure

    # =========================================================================
    # 2. PROCESS-TRANSPARENCY TESTS
    # =========================================================================

    def test_07_process_transparency_removes_white_background(self):
        """Test process-transparency removes edge-connected white bg and preserves inner hole."""
        input_path = os.path.join(self.test_dir, "donut_white_bg.png")
        output_path = os.path.join(self.test_dir, "donut_clean.png")
        self.create_opaque_white_bg_image(input_path)

        out_img, stats = process_transparency.process_transparency(
            input_path,
            output_path=output_path,
            bg_color="white",
            tolerance=25.0,
            edge_connected=True,
            feather_radius=1.0,
            defringe=True,
            crop=True,
            padding=0.08,
            square=True
        )

        print(f"\n[TEST 7] Process transparency on white bg:")
        print(f"  Cropped bbox: {stats['bbox']}")
        print(f"  Final dimensions: {stats['final_dimensions']}")
        print(f"  Defringed pixels: {stats['defringed_pixels']}")

        self.assertTrue(os.path.exists(output_path))
        # Ensure square
        self.assertEqual(stats['final_dimensions'][0], stats['final_dimensions'][1])
        # Verify output passes verify-alpha
        report = verify_alpha.verify_alpha_image(output_path)
        self.assertTrue(report.passed, f"Processed output must pass verify-alpha: {report.errors}")

        # Check that the center white hole was protected (inner circle has non-zero alpha)
        arr = np.array(out_img)
        center_y, center_x = arr.shape[0] // 2, arr.shape[1] // 2
        self.assertEqual(arr[center_y, center_x, 3], 255, "Enclosed center hole must be protected!")

    def test_08_process_transparency_defringes_halos(self):
        """Test process-transparency eliminates white halo from contaminated image."""
        input_path = os.path.join(self.test_dir, "halo_to_clean.png")
        output_path = os.path.join(self.test_dir, "halo_defringed.png")
        self.create_halo_image(input_path)

        # Before: verified to have halo
        before_rep = verify_alpha.verify_alpha_image(input_path, strict=True)
        self.assertTrue(before_rep.halo_detected)

        # Process with defringing
        process_transparency.process_transparency(
            input_path,
            output_path=output_path,
            bg_color="transparent",
            feather_radius=0.0,
            defringe=True,
            crop=False,
            padding=0.0,
            square=False
        )

        # After: verify halo is eliminated
        after_rep = verify_alpha.verify_alpha_image(output_path, strict=True)
        print(f"[TEST 8] Halo defringing: Before ratio={before_rep.halo_details.get('white_halo_ratio')*100:.1f}%, After ratio={after_rep.halo_details.get('white_halo_ratio')*100:.1f}%")
        self.assertFalse(after_rep.halo_detected)
        self.assertTrue(after_rep.passed)

    # =========================================================================
    # 3. GENERATE-ICON-SET TESTS
    # =========================================================================

    def test_09_generate_icon_set_from_png(self):
        """Test generate-icon-set produces all 16 square sizes, maskable icons, aliases, and ico from PNG."""
        master_png = os.path.join(self.test_dir, "master_logo.png")
        self.create_synthetic_star_png(master_png, size=512)
        icons_dir = os.path.join(self.test_dir, "icons_output_png")

        summary = generate_icon_set.generate_icon_set(
            master_input=master_png,
            output_dir=icons_dir,
            clean_transparency_first=True,
            maskable_bg="#0B0E14",
            generate_ico=True,
            generate_aliases=True
        )

        print(f"\n[TEST 9] PNG Master Icon Set Generation:")
        print(f"  Files created: {summary['total_files_created']}")
        print(f"  Verified icons: {summary['verification_summary']['passed']}/{summary['verification_summary']['total_tested']}")

        # 1. Verify all 16 sizes exist
        for s in generate_icon_set.STANDARD_SIZES:
            icon_file = os.path.join(icons_dir, f"icon-{s}x{s}.png")
            self.assertTrue(os.path.exists(icon_file), f"Missing icon-{s}x{s}.png")
            with Image.open(icon_file) as im:
                self.assertEqual(im.size, (s, s), f"icon-{s}x{s}.png has incorrect dimensions {im.size}")

            maskable_file = os.path.join(icons_dir, f"icon-maskable-{s}x{s}.png")
            self.assertTrue(os.path.exists(maskable_file), f"Missing icon-maskable-{s}x{s}.png")
            with Image.open(maskable_file) as im:
                self.assertEqual(im.size, (s, s))

        # 2. Verify convenience aliases exist
        for alias in ["favicon-16x16.png", "favicon-32x32.png", "apple-touch-icon.png", "android-chrome-192x192.png", "android-chrome-512x512.png", "favicon.ico", "icons-manifest.json"]:
            self.assertTrue(os.path.exists(os.path.join(icons_dir, alias)), f"Missing alias {alias}")

        # 3. Verify manifest contents
        manifest_path = os.path.join(icons_dir, "icons-manifest.json")
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest_data = json.load(f)
        self.assertIn("icons", manifest_data)
        self.assertEqual(len(manifest_data["icons"]), len(generate_icon_set.STANDARD_SIZES) * 2)

        # 4. Verify all standard icons passed alpha verification
        self.assertEqual(summary['verification_summary']['failed'], 0, "All standard icons must pass alpha verification!")

    def test_10_generate_icon_set_from_svg(self):
        """Test generate-icon-set renders SVG via Sharp and produces full icon set."""
        master_svg = os.path.join(self.test_dir, "master_vector.svg")
        self.create_sample_svg(master_svg)
        icons_dir = os.path.join(self.test_dir, "icons_output_svg")

        # Test with a subset of sizes for speed or full list
        summary = generate_icon_set.generate_icon_set(
            master_input=master_svg,
            output_dir=icons_dir,
            maskable_bg="#0B0E14",
            generate_ico=True,
            generate_aliases=True
        )

        print(f"\n[TEST 10] SVG Master Icon Set Generation:")
        print(f"  Files created: {summary['total_files_created']}")
        print(f"  Verified icons: {summary['verification_summary']['passed']}/{summary['verification_summary']['total_tested']}")

        self.assertEqual(summary['verification_summary']['failed'], 0)
        self.assertTrue(os.path.exists(os.path.join(icons_dir, "icon-512x512.png")))
        self.assertTrue(os.path.exists(os.path.join(icons_dir, "icon-1024x1024.png")))
        self.assertTrue(os.path.exists(os.path.join(icons_dir, "favicon.ico")))

    def test_11_cli_invocations(self):
        """Test CLI executions and return codes for all scripts."""
        import subprocess

        # 1. CLI verify-alpha
        pass_png = os.path.join(self.test_dir, "clean_star.png")
        cmd1 = [sys.executable, os.path.join(current_dir, "verify-alpha.py"), pass_png, "--json"]
        res1 = subprocess.run(cmd1, capture_output=True, text=True)
        self.assertEqual(res1.returncode, 0)
        data1 = json.loads(res1.stdout)
        self.assertTrue(data1["passed"])

        fail_png = os.path.join(self.test_dir, "checker_8x8.png")
        cmd2 = [sys.executable, os.path.join(current_dir, "verify-alpha.py"), fail_png, "--json"]
        res2 = subprocess.run(cmd2, capture_output=True, text=True)
        self.assertEqual(res2.returncode, 1)
        data2 = json.loads(res2.stdout)
        self.assertFalse(data2["passed"])
        self.assertTrue(data2["checkerboard_detected"])

        # 2. CLI process-transparency
        input_donut = os.path.join(self.test_dir, "donut_white_bg.png")
        output_clean = os.path.join(self.test_dir, "cli_donut_clean.png")
        cmd3 = [sys.executable, os.path.join(current_dir, "process-transparency.py"), input_donut, "-o", output_clean, "--bg-color", "white", "--json"]
        res3 = subprocess.run(cmd3, capture_output=True, text=True)
        self.assertEqual(res3.returncode, 0)
        data3 = json.loads(res3.stdout)
        self.assertTrue(data3["success"])
        self.assertTrue(os.path.exists(output_clean))

        # 3. CLI generate-icon-set
        cli_icons_dir = os.path.join(self.test_dir, "cli_icons")
        cmd4 = [sys.executable, os.path.join(current_dir, "generate-icon-set.py"), pass_png, "-o", cli_icons_dir, "--json"]
        res4 = subprocess.run(cmd4, capture_output=True, text=True)
        self.assertEqual(res4.returncode, 0)
        data4 = json.loads(res4.stdout)
        self.assertTrue(data4["success"])
        self.assertEqual(data4["verification_summary"]["failed"], 0)
        print(f"\n[TEST 11] CLI Invocations and JSON outputs: All passed with expected exit codes!")



def run_tests():
    suite = unittest.TestLoader().loadTestsFromTestCase(TestAssetProcessingToolkit)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)


if __name__ == "__main__":
    run_tests()
