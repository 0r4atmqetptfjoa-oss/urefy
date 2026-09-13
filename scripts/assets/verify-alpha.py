#!/usr/bin/env python3
"""
verify-alpha.py - Programmatic Alpha Channel & Edge Integrity Verification

Checks:
1. Mode verification: Ensures image has a true alpha channel (RGBA / LA / PA).
2. Alpha distribution: Verifies alpha is not uniformly 255 (opaque) or 0 (empty).
3. Baked checkerboard detection: Computes 2D autocorrelation & frequency analysis
   to detect fake transparency checkerboard patterns (8x8, 16x16, 32x32 blocks).
4. Halo detection: Analyzes edge transition pixels to detect white, dark, or gray
   fringing/halos caused by imperfect background removal or color bleeding.

Exit codes:
  0: PASS (Valid genuine transparent asset)
  1: FAIL (Failed one or more integrity checks)
"""

import sys
import os
import argparse
import json
from dataclasses import dataclass, field, asdict
from typing import Dict, Any, List, Optional, Tuple

import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt


@dataclass
class CheckResult:
    name: str
    passed: bool
    severity: str  # 'error', 'warning', 'info'
    message: str
    details: Dict[str, Any] = field(default_factory=dict)


@dataclass
class VerificationReport:
    file_path: str
    passed: bool
    has_alpha_channel: bool
    mode: str
    dimensions: Tuple[int, int]
    alpha_stats: Dict[str, Any]
    checkerboard_detected: bool
    checkerboard_details: Dict[str, Any]
    halo_detected: bool
    halo_details: Dict[str, Any]
    checks: List[CheckResult] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    def format_summary(self) -> str:
        status_icon = "[PASS]" if self.passed else "[FAIL]"
        lines = [
            f"============================================================",
            f"Alpha Verification Report: {self.file_path}",
            f"Status: {status_icon} | Dimensions: {self.dimensions[0]}x{self.dimensions[1]} | Mode: {self.mode}",
            f"------------------------------------------------------------",
            f"Alpha Distribution:",
            f"  Min: {self.alpha_stats.get('min', 'N/A')}, Max: {self.alpha_stats.get('max', 'N/A')}, Mean: {self.alpha_stats.get('mean', 0):.1f}",
            f"  Transparent pixels (0): {self.alpha_stats.get('transparent_pct', 0):.2f}%",
            f"  Semi-transparent pixels (1-254): {self.alpha_stats.get('semi_pct', 0):.2f}%",
            f"  Opaque pixels (255): {self.alpha_stats.get('opaque_pct', 0):.2f}%",
            f"------------------------------------------------------------",
            f"Checkerboard Analysis:",
            f"  Detected: {'YES - FAKE CHECKERBOARD' if self.checkerboard_detected else 'No (Clean)'}",
        ]
        if self.checkerboard_detected:
            lines.append(f"  Details: {self.checkerboard_details.get('summary', '')}")
            lines.append(f"  Block size: {self.checkerboard_details.get('block_size')}px | Contrast: {self.checkerboard_details.get('contrast', 0):.1f}")
        
        lines.append(f"------------------------------------------------------------")
        lines.append(f"Edge / Halo Analysis:")
        lines.append(f"  Detected: {'YES - HALO DETECTED' if self.halo_detected else 'No (Clean edges)'}")
        if self.halo_details.get('edge_pixel_count', 0) > 0:
            lines.append(f"  Edge pixels analyzed: {self.halo_details.get('edge_pixel_count')}")
            lines.append(f"  White halo ratio: {self.halo_details.get('white_halo_ratio', 0)*100:.2f}% (thresh: {self.halo_details.get('white_threshold_pct', 15):.1f}%)")
            lines.append(f"  Dark halo ratio:  {self.halo_details.get('dark_halo_ratio', 0)*100:.2f}% (thresh: {self.halo_details.get('dark_threshold_pct', 15):.1f}%)")
            lines.append(f"  Gray halo ratio:  {self.halo_details.get('gray_halo_ratio', 0)*100:.2f}% (thresh: {self.halo_details.get('gray_threshold_pct', 15):.1f}%)")
        else:
            lines.append(f"  No semi-transparent edge pixels found (binary alpha or fully opaque).")

        if self.errors:
            lines.append(f"------------------------------------------------------------")
            lines.append("ERRORS:")
            for err in self.errors:
                lines.append(f"  [!] {err}")

        if self.warnings:
            lines.append(f"------------------------------------------------------------")
            lines.append("WARNINGS:")
            for warn in self.warnings:
                lines.append(f"  [*] {warn}")

        lines.append(f"============================================================")
        return "\n".join(lines)


def check_channel_mode(img: Image.Image) -> Tuple[bool, str, Dict[str, Any]]:
    """Verifies that the image has an explicit alpha channel."""
    has_alpha = "A" in img.getbands() or img.mode in ("RGBA", "LA", "PA")
    details = {
        "mode": img.mode,
        "bands": img.getbands(),
        "has_alpha": has_alpha
    }
    if not has_alpha:
        return False, f"Image lacks alpha channel. Mode is '{img.mode}', bands: {img.getbands()}.", details
    return True, f"Image has alpha channel (mode: '{img.mode}').", details


def check_alpha_distribution(alpha: np.ndarray, min_transparent_ratio: float = 0.0005) -> Tuple[bool, str, Dict[str, Any]]:
    """Verifies alpha channel is not uniformly 255 or 0."""
    total_pixels = int(alpha.size)
    min_val = int(alpha.min())
    max_val = int(alpha.max())
    mean_val = float(alpha.mean())
    std_val = float(alpha.std())

    opaque_count = int(np.sum(alpha == 255))
    transparent_count = int(np.sum(alpha == 0))
    semi_count = int(np.sum((alpha > 0) & (alpha < 255)))

    opaque_pct = (opaque_count / total_pixels) * 100.0
    transparent_pct = (transparent_count / total_pixels) * 100.0
    semi_pct = (semi_count / total_pixels) * 100.0

    details = {
        "min": min_val,
        "max": max_val,
        "mean": mean_val,
        "std": std_val,
        "total_pixels": total_pixels,
        "opaque_count": opaque_count,
        "transparent_count": transparent_count,
        "semi_count": semi_count,
        "opaque_pct": opaque_pct,
        "transparent_pct": transparent_pct,
        "semi_pct": semi_pct
    }

    if min_val == 255 and max_val == 255:
        return False, "Alpha channel is uniformly 255 (completely opaque; pseudo-alpha channel with zero transparency).", details

    if max_val == 0:
        return False, "Alpha channel is uniformly 0 (completely empty/transparent image).", details

    non_opaque_pct = transparent_pct + semi_pct
    if (non_opaque_pct / 100.0) < min_transparent_ratio:
        return False, f"Alpha channel has virtually no transparency ({non_opaque_pct:.4f}% < {min_transparent_ratio*100:.2f}%).", details

    return True, "Alpha channel exhibits genuine non-uniform transparency distribution.", details


def detect_baked_checkerboard(
    img_rgba: np.ndarray,
    block_sizes: Tuple[int, ...] = (8, 16, 32, 4),
    patch_size: int = 64,
    min_patch_match_pct: float = 0.03
) -> Tuple[bool, Dict[str, Any]]:
    """
    Detects fake baked checkerboard patterns (e.g. alternating gray/white blocks)
    using patch-based 2D autocorrelation via 2D FFT and block variance analysis.
    """
    rgb = img_rgba[:, :, :3].astype(np.float64)
    # Compute luminance Y
    lum = 0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2]
    # Compute saturation (checkerboards are neutral gray/white)
    sat = np.max(rgb, axis=2) - np.min(rgb, axis=2)

    h, w = lum.shape
    if h < 32 or w < 32:
        patch_size = min(h, w)
        if patch_size < 16:
            return False, {"detected": False, "reason": "Image too small for checkerboard detection"}

    step = max(patch_size // 2, 16)
    total_tested_patches = 0
    matches_by_block: Dict[int, List[Dict[str, Any]]] = {b: [] for b in block_sizes}

    for r in range(0, h - patch_size + 1, step):
        for c in range(0, w - patch_size + 1, step):
            p_lum = lum[r:r + patch_size, c:c + patch_size]
            p_sat = sat[r:r + patch_size, c:c + patch_size]

            # Condition 1: Patch must be predominantly neutral (low saturation)
            neutral_ratio = np.mean(p_sat < 18.0)
            if neutral_ratio < 0.65:
                continue

            # Condition 2: Patch must have moderate luminance variance
            p_std = np.std(p_lum)
            if p_std < 8.0 or p_std > 65.0:
                continue

            total_tested_patches += 1

            # 2D Autocorrelation via FFT
            p_zero_mean = p_lum - np.mean(p_lum)
            f = np.fft.fft2(p_zero_mean)
            autocorr = np.real(np.fft.ifft2(f * np.conj(f)))
            norm_factor = autocorr[0, 0] + 1e-9
            autocorr /= norm_factor

            for B in block_sizes:
                if patch_size < 2 * B:
                    continue
                # For checkerboard with square size B:
                diag_corr = autocorr[B, B]
                h_corr = autocorr[B, 0]
                v_corr = autocorr[0, B]

                if diag_corr > 0.55 and h_corr < -0.22 and v_corr < -0.22:
                    # Verify block internal variance
                    num_blocks_y = patch_size // B
                    num_blocks_x = patch_size // B
                    blocks = p_lum[:num_blocks_y * B, :num_blocks_x * B].reshape(
                        num_blocks_y, B, num_blocks_x, B
                    ).swapaxes(1, 2)
                    block_vars = np.var(blocks, axis=(2, 3))
                    block_means = np.mean(blocks, axis=(2, 3))
                    
                    mean_internal_var = float(np.mean(block_vars))
                    contrast = float(np.max(block_means) - np.min(block_means))

                    # Synthetic checkerboards have very low internal variance (< 20) and contrast 15-85
                    if mean_internal_var < 20.0 and contrast >= 15.0:
                        matches_by_block[B].append({
                            "coord": (r, c),
                            "diag_corr": float(diag_corr),
                            "h_corr": float(h_corr),
                            "v_corr": float(v_corr),
                            "internal_var": mean_internal_var,
                            "contrast": contrast
                        })

    # Evaluate matches
    for B, matches in matches_by_block.items():
        if len(matches) > 0:
            match_pct = (len(matches) / max(total_tested_patches, 1))
            if len(matches) >= 2 or (total_tested_patches > 0 and match_pct >= min_patch_match_pct):
                avg_contrast = float(np.mean([m["contrast"] for m in matches]))
                details = {
                    "detected": True,
                    "block_size": B,
                    "matching_patches": len(matches),
                    "total_candidate_patches": total_tested_patches,
                    "match_percentage": match_pct * 100.0,
                    "contrast": avg_contrast,
                    "summary": f"Found {len(matches)} patches matching {B}x{B}px checkerboard pattern (contrast: {avg_contrast:.1f} levels)"
                }
                return True, details

    return False, {"detected": False, "tested_patches": total_tested_patches}


def detect_halos(
    img_rgba: np.ndarray,
    white_threshold_pct: float = 15.0,
    dark_threshold_pct: float = 15.0,
    gray_threshold_pct: float = 15.0
) -> Tuple[bool, Dict[str, Any]]:
    """
    Detects halos (white, dark, or gray fringing) along edge transition pixels.
    Compares edge transition pixels with their nearest interior opaque neighbors.
    """
    alpha = img_rgba[:, :, 3]
    rgb = img_rgba[:, :, :3].astype(np.float32)

    # Core interior: alpha >= 245
    opaque_mask = alpha >= 245
    # Semi-transparent edge pixels
    edge_mask = (alpha >= 10) & (alpha < 245)

    edge_count = int(np.sum(edge_mask))
    opaque_count = int(np.sum(opaque_mask))

    details = {
        "edge_pixel_count": edge_count,
        "opaque_pixel_count": opaque_count,
        "white_threshold_pct": white_threshold_pct,
        "dark_threshold_pct": dark_threshold_pct,
        "gray_threshold_pct": gray_threshold_pct,
        "white_halo_ratio": 0.0,
        "dark_halo_ratio": 0.0,
        "gray_halo_ratio": 0.0,
        "detected_types": []
    }

    if edge_count < 20 or opaque_count < 50:
        return False, details

    # Find nearest opaque interior pixel for each edge pixel using Euclidean Distance Transform
    _, indices = distance_transform_edt(~opaque_mask, return_indices=True)

    nr = indices[0][edge_mask]
    nc = indices[1][edge_mask]

    edge_rgb = rgb[edge_mask]
    interior_rgb = rgb[nr, nc]

    # Luminance
    edge_lum = 0.299 * edge_rgb[:, 0] + 0.587 * edge_rgb[:, 1] + 0.114 * edge_rgb[:, 2]
    interior_lum = 0.299 * interior_rgb[:, 0] + 0.587 * interior_rgb[:, 1] + 0.114 * interior_rgb[:, 2]
    delta_lum = edge_lum - interior_lum

    # Saturation
    edge_sat = np.max(edge_rgb, axis=1) - np.min(edge_rgb, axis=1)
    interior_sat = np.max(interior_rgb, axis=1) - np.min(interior_rgb, axis=1)

    # 1. White Halo: edge is substantially brighter than interior and washed out
    white_halo_pixels = (delta_lum > 25.0) & (interior_lum < 225.0)
    white_ratio = float(np.mean(white_halo_pixels))
    details["white_halo_ratio"] = white_ratio
    details["white_halo_avg_delta"] = float(np.mean(delta_lum[white_halo_pixels])) if np.any(white_halo_pixels) else 0.0

    # 2. Dark Halo: edge is substantially darker than interior
    dark_halo_pixels = (delta_lum < -30.0) & (interior_lum > 40.0)
    dark_ratio = float(np.mean(dark_halo_pixels))
    details["dark_halo_ratio"] = dark_ratio
    details["dark_halo_avg_delta"] = float(np.mean(delta_lum[dark_halo_pixels])) if np.any(dark_halo_pixels) else 0.0

    # 3. Gray Halo: edge drifts to neutral gray (approx 128) while interior was colored
    gray_halo_pixels = (np.abs(edge_lum - 128.0) < np.abs(interior_lum - 128.0) - 25.0) & (edge_sat < 15.0) & (interior_sat > 30.0)
    gray_ratio = float(np.mean(gray_halo_pixels))
    details["gray_halo_ratio"] = gray_ratio

    detected = False
    detected_types = []

    if white_ratio * 100.0 >= white_threshold_pct:
        detected = True
        detected_types.append(f"white halo ({white_ratio*100:.1f}%)")

    if dark_ratio * 100.0 >= dark_threshold_pct:
        detected = True
        detected_types.append(f"dark halo ({dark_ratio*100:.1f}%)")

    if gray_ratio * 100.0 >= gray_threshold_pct:
        detected = True
        detected_types.append(f"gray halo ({gray_ratio*100:.1f}%)")

    details["detected_types"] = detected_types
    return detected, details


def verify_alpha_image(
    image_input: Any,
    white_halo_thresh: float = 15.0,
    dark_halo_thresh: float = 15.0,
    gray_halo_thresh: float = 15.0,
    strict: bool = False
) -> VerificationReport:
    """
    Main programmatic entry point to verify alpha integrity of an image.
    Accepts a filepath (str/Path) or a PIL Image object.
    """
    if isinstance(image_input, (str, bytes, os.PathLike)):
        file_path = str(image_input)
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Image file not found: {file_path}")
        img = Image.open(file_path)
    elif isinstance(image_input, Image.Image):
        file_path = getattr(image_input, "filename", "<PIL.Image>")
        img = image_input
    else:
        raise TypeError(f"Unsupported image input type: {type(image_input)}")

    w, h = img.size
    mode = img.mode

    checks: List[CheckResult] = []
    errors: List[str] = []
    warnings: List[str] = []

    # Check 1: Mode verification
    mode_ok, mode_msg, mode_details = check_channel_mode(img)
    checks.append(CheckResult("Channel Mode", mode_ok, "error" if not mode_ok else "info", mode_msg, mode_details))
    if not mode_ok:
        errors.append(mode_msg)
        return VerificationReport(
            file_path=file_path,
            passed=False,
            has_alpha_channel=False,
            mode=mode,
            dimensions=(w, h),
            alpha_stats={},
            checkerboard_detected=False,
            checkerboard_details={},
            halo_detected=False,
            halo_details={},
            checks=checks,
            errors=errors,
            warnings=warnings
        )

    # Convert to standard RGBA array
    img_rgba = img.convert("RGBA")
    arr = np.array(img_rgba)
    alpha = arr[:, :, 3]

    # Check 2: Alpha distribution
    dist_ok, dist_msg, alpha_stats = check_alpha_distribution(alpha)
    checks.append(CheckResult("Alpha Distribution", dist_ok, "error" if not dist_ok else "info", dist_msg, alpha_stats))
    if not dist_ok:
        errors.append(dist_msg)

    # Check 3: Baked checkerboard detection
    cb_detected, cb_details = detect_baked_checkerboard(arr)
    cb_ok = not cb_detected
    cb_msg = "No baked checkerboard detected." if cb_ok else f"Fake baked checkerboard detected: {cb_details.get('summary')}"
    checks.append(CheckResult("Baked Checkerboard Detection", cb_ok, "error" if cb_detected else "info", cb_msg, cb_details))
    if cb_detected:
        errors.append(cb_msg)

    # Check 4: Halo detection
    halo_detected, halo_details = detect_halos(
        arr,
        white_threshold_pct=white_halo_thresh,
        dark_threshold_pct=dark_halo_thresh,
        gray_threshold_pct=gray_halo_thresh
    )
    halo_ok = not halo_detected
    halo_msg = "Clean edges (no halos detected)." if halo_ok else f"Halos detected: {', '.join(halo_details.get('detected_types', []))}"
    severity = "error" if (halo_detected and strict) else ("warning" if halo_detected else "info")
    checks.append(CheckResult("Halo & Edge Integrity", halo_ok, severity, halo_msg, halo_details))
    if halo_detected:
        if strict:
            errors.append(halo_msg)
        else:
            warnings.append(halo_msg)

    passed = (len(errors) == 0)

    return VerificationReport(
        file_path=file_path,
        passed=passed,
        has_alpha_channel=True,
        mode=mode,
        dimensions=(w, h),
        alpha_stats=alpha_stats,
        checkerboard_detected=cb_detected,
        checkerboard_details=cb_details,
        halo_detected=halo_detected,
        halo_details=halo_details,
        checks=checks,
        errors=errors,
        warnings=warnings
    )


def main():
    parser = argparse.ArgumentParser(
        description="verify-alpha.py - Programmatically verify image alpha channel and edge integrity"
    )
    parser.add_argument("image", help="Path to image file to verify")
    parser.add_argument("--json", action="store_true", help="Output machine-readable JSON report")
    parser.add_argument("--strict", action="store_true", help="Treat halo warnings as hard errors")
    parser.add_argument("--white-halo-thresh", type=float, default=15.0, help="White halo threshold pct (default: 15.0)")
    parser.add_argument("--dark-halo-thresh", type=float, default=15.0, help="Dark halo threshold pct (default: 15.0)")
    parser.add_argument("--gray-halo-thresh", type=float, default=15.0, help="Gray halo threshold pct (default: 15.0)")

    args = parser.parse_args()

    try:
        report = verify_alpha_image(
            args.image,
            white_halo_thresh=args.white_halo_thresh,
            dark_halo_thresh=args.dark_halo_thresh,
            gray_halo_thresh=args.gray_halo_thresh,
            strict=args.strict
        )
    except Exception as e:
        if args.json:
            print(json.dumps({"passed": False, "error": str(e)}))
        else:
            print(f"[ERROR] Failed to verify image: {e}", file=sys.stderr)
        sys.exit(1)

    if args.json:
        print(json.dumps(report.to_dict(), indent=2))
    else:
        print(report.format_summary())

    sys.exit(0 if report.passed else 1)


if __name__ == "__main__":
    main()
