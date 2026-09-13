"""
verify_alpha.py - Python module alias for verify-alpha.py
Provides direct import access:
    from verify_alpha import verify_alpha_image, VerificationReport
"""

import sys
import os
import importlib.util

current_dir = os.path.dirname(os.path.abspath(__file__))
hyphen_script = os.path.join(current_dir, "verify-alpha.py")

spec = importlib.util.spec_from_file_location("verify_alpha_module", hyphen_script)
mod = importlib.util.module_from_spec(spec)
sys.modules["verify_alpha_module"] = mod
spec.loader.exec_module(mod)

verify_alpha_image = mod.verify_alpha_image
check_channel_mode = mod.check_channel_mode
check_alpha_distribution = mod.check_alpha_distribution
detect_baked_checkerboard = mod.detect_baked_checkerboard
detect_halos = mod.detect_halos
VerificationReport = mod.VerificationReport
CheckResult = mod.CheckResult

__all__ = [
    "verify_alpha_image",
    "check_channel_mode",
    "check_alpha_distribution",
    "detect_baked_checkerboard",
    "detect_halos",
    "VerificationReport",
    "CheckResult",
]
