#!/usr/bin/env python3
"""
apply-brand-concept.py - Brand Concept Switcher & Asset Deployer for UREfy

Switches the active UREfy brand identity between the concepts:
  - Concept A: 'The Sovereign Beacon' (Continuous loop and aperture with focal amber core)
  - Concept B: 'The Social Nexus' (Interlocking arcs carving negative space U)
"""

import sys
import os
import argparse
import subprocess

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..'))
PUBLIC_DIR = os.path.join(PROJECT_ROOT, 'packages', 'client-ui', 'public')

CONCEPTS = {
    'A': {
        'name': 'The Sovereign Beacon',
        'accent_color': '#F59E0B',
        'logo_mark': '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" role="img" aria-label="UREfy Sovereign Beacon Logo">
  <defs>
    <linearGradient id="gradA_beacon" x1="20" y1="18" x2="80" y2="86" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#38BDF8" />
      <stop offset="60%" stop-color="#2563EB" />
      <stop offset="100%" stop-color="#1D4ED8" />
    </linearGradient>
    <linearGradient id="gradA_core" x1="42" y1="36" x2="58" y2="52" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FDE047" />
      <stop offset="100%" stop-color="#F59E0B" />
    </linearGradient>
    <filter id="glowA" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2.5" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
  
  <!-- Continuous Beacon Aperture Manifold -->
  <path d="M 28 20 C 28 38, 22 58, 26 70 C 31 82, 40 86, 50 86 C 60 86, 69 82, 74 70 C 78 58, 72 38, 72 20 C 66 20, 63 27, 63 38 C 63 56, 58 73, 50 73 C 42 73, 37 56, 37 38 C 37 27, 34 20, 28 20 Z" fill="url(#gradA_beacon)" />
  
  <!-- Dynamic Aperture Horizon Ring -->
  <ellipse cx="50" cy="44" rx="20" ry="7" transform="rotate(-14 50 44)" fill="none" stroke="#38BDF8" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="28 14" opacity="0.9" />
  
  <!-- The Sovereign Core -->
  <circle cx="50" cy="44" r="7" fill="url(#gradA_core)" filter="url(#glowA)" />
</svg>''',
        'favicon': '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" role="img" aria-label="UREfy Favicon">
  <defs>
    <linearGradient id="favA_grad" x1="20" y1="18" x2="80" y2="86" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#38BDF8" />
      <stop offset="60%" stop-color="#2563EB" />
      <stop offset="100%" stop-color="#1D4ED8" />
    </linearGradient>
  </defs>
  <!-- Continuous Beacon Aperture Manifold -->
  <path d="M 28 20 C 28 38, 22 58, 26 70 C 31 82, 40 86, 50 86 C 60 86, 69 82, 74 70 C 78 58, 72 38, 72 20 C 66 20, 63 27, 63 38 C 63 56, 58 73, 50 73 C 42 73, 37 56, 37 38 C 37 27, 34 20, 28 20 Z" fill="url(#favA_grad)" />
  <!-- Dynamic Aperture Horizon Ring (Simplified for micro rendering) -->
  <ellipse cx="50" cy="44" rx="20" ry="7" transform="rotate(-14 50 44)" fill="none" stroke="#38BDF8" stroke-width="4.5" stroke-linecap="round" opacity="0.95" />
  <!-- Boosted Sovereign Core Dot -->
  <circle cx="50" cy="44" r="8.5" fill="#F59E0B" />
</svg>''',
        'logo': '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="100%" height="100%" role="img" aria-label="UREfy Master Emblem">
  <defs>
    <linearGradient id="urefy-bg-grad" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0E131F" />
      <stop offset="100%" stop-color="#07090E" />
    </linearGradient>
    <linearGradient id="urefy-stroke-grad" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#38BDF8" stop-opacity="0.3" />
      <stop offset="100%" stop-color="#2563EB" stop-opacity="0.15" />
    </linearGradient>
    <linearGradient id="gradA_beacon" x1="28" y1="20" x2="92" y2="90" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#38BDF8" />
      <stop offset="60%" stop-color="#2563EB" />
      <stop offset="100%" stop-color="#1D4ED8" />
    </linearGradient>
    <linearGradient id="gradA_core" x1="52" y1="46" x2="68" y2="62" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FDE047" />
      <stop offset="100%" stop-color="#F59E0B" />
    </linearGradient>
    <filter id="glowA" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2.5" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- Squircle Base Chassis -->
  <rect x="2" y="2" width="116" height="116" rx="32" fill="url(#urefy-bg-grad)" stroke="url(#urefy-stroke-grad)" stroke-width="1.5" />

  <!-- Continuous Beacon Manifold (Centered in 120x120) -->
  <g transform="translate(10, 10)">
    <path d="M 28 20 C 28 38, 22 58, 26 70 C 31 82, 40 86, 50 86 C 60 86, 69 82, 74 70 C 78 58, 72 38, 72 20 C 66 20, 63 27, 63 38 C 63 56, 58 73, 50 73 C 42 73, 37 56, 37 38 C 37 27, 34 20, 28 20 Z" fill="url(#gradA_beacon)" />
    <ellipse cx="50" cy="44" rx="20" ry="7" transform="rotate(-14 50 44)" fill="none" stroke="#38BDF8" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="28 14" opacity="0.9" />
    <circle cx="50" cy="44" r="7" fill="url(#gradA_core)" filter="url(#glowA)" />
  </g>
</svg>''',
        'wordmark': '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 76" width="100%" height="100%" role="img" aria-label="UREfy Master Wordmark">
  <defs>
    <linearGradient id="gradA_wm_beacon" x1="16" y1="14" x2="54" y2="60" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#38BDF8" />
      <stop offset="60%" stop-color="#2563EB" />
      <stop offset="100%" stop-color="#1D4ED8" />
    </linearGradient>
    <linearGradient id="gradA_wm_core" x1="30" y1="28" x2="40" y2="40" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FDE047" />
      <stop offset="100%" stop-color="#F59E0B" />
    </linearGradient>
  </defs>

  <!-- Scaled Beacon Symbol (Left) -->
  <g transform="translate(-2, -3) scale(0.72)">
    <path d="M 28 20 C 28 38, 22 58, 26 70 C 31 82, 40 86, 50 86 C 60 86, 69 82, 74 70 C 78 58, 72 38, 72 20 C 66 20, 63 27, 63 38 C 63 56, 58 73, 50 73 C 42 73, 37 56, 37 38 C 37 27, 34 20, 28 20 Z" fill="url(#gradA_wm_beacon)" />
    <ellipse cx="50" cy="44" rx="20" ry="7" transform="rotate(-14 50 44)" fill="none" stroke="#38BDF8" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="28 14" opacity="0.9" />
    <circle cx="50" cy="44" r="7" fill="url(#gradA_wm_core)" />
  </g>

  <!-- Typography: UREfy -->
  <text x="76" y="47" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="36" font-weight="800" fill="#FFFFFF" letter-spacing="0.03em">URE<tspan fill="#F59E0B" font-weight="600">fy</tspan></text>
  <!-- Tagline -->
  <text x="78" y="64" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="8.5" font-weight="700" fill="#94A3B8" letter-spacing="0.16em" text-transform="uppercase">THE SOCIAL NETWORK YOU ACTUALLY OWN</text>
</svg>''',
        'dark': '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" role="img" aria-label="UREfy Sovereign Beacon Dark">
  <path d="M 28 20 C 28 38, 22 58, 26 70 C 31 82, 40 86, 50 86 C 60 86, 69 82, 74 70 C 78 58, 72 38, 72 20 C 66 20, 63 27, 63 38 C 63 56, 58 73, 50 73 C 42 73, 37 56, 37 38 C 37 27, 34 20, 28 20 Z" fill="#0F172A" />
  <ellipse cx="50" cy="44" rx="20" ry="7" transform="rotate(-14 50 44)" fill="none" stroke="#0F172A" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="28 14" opacity="0.8" />
  <circle cx="50" cy="44" r="7" fill="#0F172A" />
</svg>''',
        'white': '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" role="img" aria-label="UREfy Sovereign Beacon White">
  <path d="M 28 20 C 28 38, 22 58, 26 70 C 31 82, 40 86, 50 86 C 60 86, 69 82, 74 70 C 78 58, 72 38, 72 20 C 66 20, 63 27, 63 38 C 63 56, 58 73, 50 73 C 42 73, 37 56, 37 38 C 37 27, 34 20, 28 20 Z" fill="#FFFFFF" />
  <ellipse cx="50" cy="44" rx="20" ry="7" transform="rotate(-14 50 44)" fill="none" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="28 14" opacity="0.85" />
  <circle cx="50" cy="44" r="7" fill="#FFFFFF" />
</svg>'''
    },
    'B': {
        'name': 'The Social Nexus',
        'accent_color': '#2DD4BF',
        'logo_mark': '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" role="img" aria-label="UREfy Social Nexus Logo">
  <defs>
    <linearGradient id="urefy-nexus-left" x1="24" y1="16" x2="56" y2="84" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#818CF8" />
      <stop offset="100%" stop-color="#4F46E5" />
    </linearGradient>
    <linearGradient id="urefy-nexus-right" x1="76" y1="16" x2="44" y2="84" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#2DD4BF" />
      <stop offset="100%" stop-color="#0D9488" />
    </linearGradient>
  </defs>
  
  <!-- Left Sovereign Peer Arc (Alpha) -->
  <path d="M 28 18 L 28 54 C 28 72, 38 82, 52 82 C 58 82, 63 79, 66 74" fill="none" stroke="url(#urefy-nexus-left)" stroke-width="11" stroke-linecap="round" />
  
  <!-- Right Sovereign Peer Arc (Beta) -->
  <path d="M 72 18 L 72 54 C 72 72, 62 82, 48 82 C 42 82, 37 79, 34 74" fill="none" stroke="url(#urefy-nexus-right)" stroke-width="11" stroke-linecap="round" opacity="0.96" />
  
  <!-- Peer Vertex Terminals -->
  <circle cx="28" cy="18" r="5.5" fill="#C7D2FE" />
  <circle cx="72" cy="18" r="5.5" fill="#99F6E4" />
</svg>''',
        'favicon': '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" role="img" aria-label="UREfy Favicon">
  <defs>
    <linearGradient id="fav-l" x1="26" y1="16" x2="56" y2="84" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#818CF8" />
      <stop offset="100%" stop-color="#4F46E5" />
    </linearGradient>
    <linearGradient id="fav-r" x1="74" y1="16" x2="44" y2="84" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#2DD4BF" />
      <stop offset="100%" stop-color="#0D9488" />
    </linearGradient>
  </defs>
  <!-- Left Sovereign Peer Arc -->
  <path d="M 28 18 L 28 52 C 28 70, 38 82, 52 82 C 58 82, 63 79, 66 74" fill="none" stroke="url(#fav-l)" stroke-width="13.5" stroke-linecap="round" />
  <!-- Right Sovereign Peer Arc -->
  <path d="M 72 18 L 72 52 C 72 70, 62 82, 48 82 C 42 82, 37 79, 34 74" fill="none" stroke="url(#fav-r)" stroke-width="13.5" stroke-linecap="round" />
  <!-- Vertex Terminals -->
  <circle cx="28" cy="18" r="6.75" fill="#C7D2FE" />
  <circle cx="72" cy="18" r="6.75" fill="#99F6E4" />
</svg>''',
        'logo': '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="100%" height="100%" role="img" aria-label="UREfy Master Emblem">
  <defs>
    <linearGradient id="urefy-bg-grad" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0E131F" />
      <stop offset="100%" stop-color="#07090E" />
    </linearGradient>
    <linearGradient id="urefy-stroke-grad" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#818CF8" stop-opacity="0.3" />
      <stop offset="100%" stop-color="#2DD4BF" stop-opacity="0.15" />
    </linearGradient>
    <linearGradient id="urefy-m-left" x1="32" y1="24" x2="68" y2="96" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#818CF8" />
      <stop offset="100%" stop-color="#4F46E5" />
    </linearGradient>
    <linearGradient id="urefy-m-right" x1="88" y1="24" x2="52" y2="96" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#2DD4BF" />
      <stop offset="100%" stop-color="#0D9488" />
    </linearGradient>
  </defs>

  <!-- Squircle Base Chassis -->
  <rect x="2" y="2" width="116" height="116" rx="32" fill="url(#urefy-bg-grad)" stroke="url(#urefy-stroke-grad)" stroke-width="1.5" />

  <!-- Left Sovereign Peer Arc (Alpha) -->
  <path d="M 38 28 L 38 64 C 38 82, 48 92, 62 92 C 68 92, 73 89, 76 84" fill="none" stroke="url(#urefy-m-left)" stroke-width="11" stroke-linecap="round" />

  <!-- Right Sovereign Peer Arc (Beta) -->
  <path d="M 82 28 L 82 64 C 82 82, 72 92, 58 92 C 52 92, 47 89, 44 84" fill="none" stroke="url(#urefy-m-right)" stroke-width="11" stroke-linecap="round" opacity="0.96" />

  <!-- Vertex Terminals -->
  <circle cx="38" cy="28" r="5.5" fill="#C7D2FE" />
  <circle cx="82" cy="28" r="5.5" fill="#99F6E4" />
</svg>''',
        'wordmark': '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 76" width="100%" height="100%" role="img" aria-label="UREfy Master Wordmark">
  <defs>
    <linearGradient id="urefy-wm-left" x1="16" y1="12" x2="38" y2="58" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#818CF8" />
      <stop offset="100%" stop-color="#4F46E5" />
    </linearGradient>
    <linearGradient id="urefy-wm-right" x1="56" y1="12" x2="34" y2="58" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#2DD4BF" />
      <stop offset="100%" stop-color="#0D9488" />
    </linearGradient>
  </defs>

  <!-- Left Sovereign Peer Arc -->
  <path d="M 21 14 L 21 40 C 21 53, 28 60, 38 60 C 42 60, 46 58, 48 54" fill="none" stroke="url(#urefy-wm-left)" stroke-width="8" stroke-linecap="round" />
  <!-- Right Sovereign Peer Arc -->
  <path d="M 53 14 L 53 40 C 53 53, 46 60, 36 60 C 32 60, 28 58, 26 54" fill="none" stroke="url(#urefy-wm-right)" stroke-width="8" stroke-linecap="round" opacity="0.96" />
  <!-- Peer Vertex Terminals -->
  <circle cx="21" cy="14" r="4" fill="#C7D2FE" />
  <circle cx="53" cy="14" r="4" fill="#99F6E4" />

  <!-- Typography: UREfy -->
  <text x="76" y="47" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="36" font-weight="800" fill="#FFFFFF" letter-spacing="0.03em">URE<tspan fill="#2DD4BF" font-weight="600">fy</tspan></text>
  <!-- Tagline -->
  <text x="78" y="64" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="8.5" font-weight="700" fill="#94A3B8" letter-spacing="0.16em" text-transform="uppercase">THE SOCIAL NETWORK YOU ACTUALLY OWN</text>
</svg>''',
        'dark': '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" role="img" aria-label="UREfy Logo Monochrome Dark">
  <path d="M 28 18 L 28 54 C 28 72, 38 82, 52 82 C 58 82, 63 79, 66 74" fill="none" stroke="#0F172A" stroke-width="11" stroke-linecap="round" />
  <path d="M 72 18 L 72 54 C 72 72, 62 82, 48 82 C 42 82, 37 79, 34 74" fill="none" stroke="#0F172A" stroke-width="11" stroke-linecap="round" opacity="0.85" />
  <circle cx="28" cy="18" r="5.5" fill="#0F172A" />
  <circle cx="72" cy="18" r="5.5" fill="#0F172A" opacity="0.85" />
</svg>''',
        'white': '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" role="img" aria-label="UREfy Logo Monochrome White">
  <path d="M 28 18 L 28 54 C 28 72, 38 82, 52 82 C 58 82, 63 79, 66 74" fill="none" stroke="#FFFFFF" stroke-width="11" stroke-linecap="round" />
  <path d="M 72 18 L 72 54 C 72 72, 62 82, 48 82 C 42 82, 37 79, 34 74" fill="none" stroke="#FFFFFF" stroke-width="11" stroke-linecap="round" opacity="0.85" />
  <circle cx="28" cy="18" r="5.5" fill="#FFFFFF" />
  <circle cx="72" cy="18" r="5.5" fill="#FFFFFF" opacity="0.85" />
</svg>'''
    },
    'F': {
        'name': 'The Geometric Keystone',
        'accent_color': '#F59E0B',
        'logo_mark': '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" role="img" aria-label="UREfy Geometric Keystone Logo">
  <defs>
    <linearGradient id="gradF_left" x1="20" y1="16" x2="42" y2="60" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#F8FAFC" />
      <stop offset="100%" stop-color="#94A3B8" />
    </linearGradient>
    <linearGradient id="gradF_right" x1="80" y1="16" x2="58" y2="60" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#CBD5E1" />
      <stop offset="100%" stop-color="#64748B" />
    </linearGradient>
    <linearGradient id="gradF_base" x1="20" y1="65" x2="80" y2="88" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#F59E0B" />
      <stop offset="100%" stop-color="#D97706" />
    </linearGradient>
  </defs>
  
  <!-- Left Pillar Facet (Rounded Precision Monolith) -->
  <path d="M 22 20 C 22 17.8, 23.8 16, 26 16 L 38 16 C 40.2 16, 42 17.8, 42 20 L 42 56 C 42 58.2, 40.2 60, 38 60 L 26 60 C 23.8 60, 22 58.2, 22 56 Z" fill="url(#gradF_left)" />
  
  <!-- Right Pillar Facet -->
  <path d="M 58 20 C 58 17.8, 59.8 16, 62 16 L 74 16 C 76.2 16, 78 17.8, 78 20 L 78 56 C 78 58.2, 76.2 60, 74 60 L 62 60 C 59.8 60, 58 58.2, 58 56 Z" fill="url(#gradF_right)" />
  
  <!-- Keystone Foundation Base Facet (4px Airgap Calibration) -->
  <path d="M 22 66 C 22 64.2, 23.6 63, 25.4 63.4 C 33.2 65, 41.5 66, 50 66 C 58.5 66, 66.8 65, 74.6 63.4 C 76.4 63, 78 64.2, 78 66 C 78 77, 66 86, 50 86 C 34 86, 22 77, 22 66 Z" fill="url(#gradF_base)" />
</svg>''',
        'favicon': '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" role="img" aria-label="UREfy Favicon">
  <defs>
    <linearGradient id="favF_left" x1="20" y1="16" x2="42" y2="60" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#F8FAFC" />
      <stop offset="100%" stop-color="#94A3B8" />
    </linearGradient>
    <linearGradient id="favF_right" x1="80" y1="16" x2="58" y2="60" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#CBD5E1" />
      <stop offset="100%" stop-color="#64748B" />
    </linearGradient>
    <linearGradient id="favF_base" x1="20" y1="65" x2="80" y2="88" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#F59E0B" />
      <stop offset="100%" stop-color="#D97706" />
    </linearGradient>
  </defs>
  <path d="M 22 20 C 22 17.8, 23.8 16, 26 16 L 38 16 C 40.2 16, 42 17.8, 42 20 L 42 56 C 42 58.2, 40.2 60, 38 60 L 26 60 C 23.8 60, 22 58.2, 22 56 Z" fill="url(#favF_left)" />
  <path d="M 58 20 C 58 17.8, 59.8 16, 62 16 L 74 16 C 76.2 16, 78 17.8, 78 20 L 78 56 C 78 58.2, 76.2 60, 74 60 L 62 60 C 59.8 60, 58 58.2, 58 56 Z" fill="url(#favF_right)" />
  <path d="M 22 66 C 22 64.2, 23.6 63, 25.4 63.4 C 33.2 65, 41.5 66, 50 66 C 58.5 66, 66.8 65, 74.6 63.4 C 76.4 63, 78 64.2, 78 66 C 78 77, 66 86, 50 86 C 34 86, 22 77, 22 66 Z" fill="url(#favF_base)" />
</svg>''',
        'logo': '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="100%" height="100%" role="img" aria-label="UREfy Master Emblem">
  <defs>
    <linearGradient id="urefy-bg-grad" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0E131F" />
      <stop offset="100%" stop-color="#07090E" />
    </linearGradient>
    <linearGradient id="urefy-stroke-grad" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#94A3B8" stop-opacity="0.3" />
      <stop offset="100%" stop-color="#F59E0B" stop-opacity="0.2" />
    </linearGradient>
    <linearGradient id="gradF_left" x1="20" y1="16" x2="42" y2="60" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#F8FAFC" />
      <stop offset="100%" stop-color="#94A3B8" />
    </linearGradient>
    <linearGradient id="gradF_right" x1="80" y1="16" x2="58" y2="60" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#CBD5E1" />
      <stop offset="100%" stop-color="#64748B" />
    </linearGradient>
    <linearGradient id="gradF_base" x1="20" y1="65" x2="80" y2="88" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#F59E0B" />
      <stop offset="100%" stop-color="#D97706" />
    </linearGradient>
  </defs>

  <!-- Squircle Base Chassis -->
  <rect x="2" y="2" width="116" height="116" rx="32" fill="url(#urefy-bg-grad)" stroke="url(#urefy-stroke-grad)" stroke-width="1.5" />

  <!-- Keystone Facets Centered -->
  <g transform="translate(10, 8)">
    <path d="M 22 20 C 22 17.8, 23.8 16, 26 16 L 38 16 C 40.2 16, 42 17.8, 42 20 L 42 56 C 42 58.2, 40.2 60, 38 60 L 26 60 C 23.8 60, 22 58.2, 22 56 Z" fill="url(#gradF_left)" />
    <path d="M 58 20 C 58 17.8, 59.8 16, 62 16 L 74 16 C 76.2 16, 78 17.8, 78 20 L 78 56 C 78 58.2, 76.2 60, 74 60 L 62 60 C 59.8 60, 58 58.2, 58 56 Z" fill="url(#gradF_right)" />
    <path d="M 22 66 C 22 64.2, 23.6 63, 25.4 63.4 C 33.2 65, 41.5 66, 50 66 C 58.5 66, 66.8 65, 74.6 63.4 C 76.4 63, 78 64.2, 78 66 C 78 77, 66 86, 50 86 C 34 86, 22 77, 22 66 Z" fill="url(#gradF_base)" />
  </g>
</svg>''',
        'wordmark': '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 76" width="100%" height="100%" role="img" aria-label="UREfy Master Wordmark">
  <defs>
    <linearGradient id="gradF_left_wm" x1="20" y1="16" x2="42" y2="60" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#F8FAFC" />
      <stop offset="100%" stop-color="#94A3B8" />
    </linearGradient>
    <linearGradient id="gradF_right_wm" x1="80" y1="16" x2="58" y2="60" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#CBD5E1" />
      <stop offset="100%" stop-color="#64748B" />
    </linearGradient>
    <linearGradient id="gradF_base_wm" x1="20" y1="65" x2="80" y2="88" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#F59E0B" />
      <stop offset="100%" stop-color="#D97706" />
    </linearGradient>
  </defs>

  <!-- Scaled Keystone Symbol (Left) -->
  <g transform="translate(4, 1) scale(0.68)">
    <path d="M 22 20 C 22 17.8, 23.8 16, 26 16 L 38 16 C 40.2 16, 42 17.8, 42 20 L 42 56 C 42 58.2, 40.2 60, 38 60 L 26 60 C 23.8 60, 22 58.2, 22 56 Z" fill="url(#gradF_left_wm)" />
    <path d="M 58 20 C 58 17.8, 59.8 16, 62 16 L 74 16 C 76.2 16, 78 17.8, 78 20 L 78 56 C 78 58.2, 76.2 60, 74 60 L 62 60 C 59.8 60, 58 58.2, 58 56 Z" fill="url(#gradF_right_wm)" />
    <path d="M 22 66 C 22 64.2, 23.6 63, 25.4 63.4 C 33.2 65, 41.5 66, 50 66 C 58.5 66, 66.8 65, 74.6 63.4 C 76.4 63, 78 64.2, 78 66 C 78 77, 66 86, 50 86 C 34 86, 22 77, 22 66 Z" fill="url(#gradF_base_wm)" />
  </g>

  <!-- Typography: UREfy -->
  <text x="76" y="47" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="36" font-weight="800" fill="#FFFFFF" letter-spacing="0.04em">URE<tspan fill="#F59E0B" font-weight="700">fy</tspan></text>
  <!-- Tagline -->
  <text x="78" y="64" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="8.5" font-weight="700" fill="#94A3B8" letter-spacing="0.16em" text-transform="uppercase">THE SOCIAL NETWORK YOU ACTUALLY OWN</text>
</svg>''',
        'dark': '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" role="img" aria-label="UREfy Keystone Dark">
  <path d="M 22 20 C 22 17.8, 23.8 16, 26 16 L 38 16 C 40.2 16, 42 17.8, 42 20 L 42 56 C 42 58.2, 40.2 60, 38 60 L 26 60 C 23.8 60, 22 58.2, 22 56 Z" fill="#0F172A" />
  <path d="M 58 20 C 58 17.8, 59.8 16, 62 16 L 74 16 C 76.2 16, 78 17.8, 78 20 L 78 56 C 78 58.2, 76.2 60, 74 60 L 62 60 C 59.8 60, 58 58.2, 58 56 Z" fill="#0F172A" />
  <path d="M 22 66 C 22 64.2, 23.6 63, 25.4 63.4 C 33.2 65, 41.5 66, 50 66 C 58.5 66, 66.8 65, 74.6 63.4 C 76.4 63, 78 64.2, 78 66 C 78 77, 66 86, 50 86 C 34 86, 22 77, 22 66 Z" fill="#0F172A" />
</svg>''',
        'white': '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" role="img" aria-label="UREfy Keystone White">
  <path d="M 22 20 C 22 17.8, 23.8 16, 26 16 L 38 16 C 40.2 16, 42 17.8, 42 20 L 42 56 C 42 58.2, 40.2 60, 38 60 L 26 60 C 23.8 60, 22 58.2, 22 56 Z" fill="#FFFFFF" />
  <path d="M 58 20 C 58 17.8, 59.8 16, 62 16 L 74 16 C 76.2 16, 78 17.8, 78 20 L 78 56 C 78 58.2, 76.2 60, 74 60 L 62 60 C 59.8 60, 58 58.2, 58 56 Z" fill="#FFFFFF" />
  <path d="M 22 66 C 22 64.2, 23.6 63, 25.4 63.4 C 33.2 65, 41.5 66, 50 66 C 58.5 66, 66.8 65, 74.6 63.4 C 76.4 63, 78 64.2, 78 66 C 78 77, 66 86, 50 86 C 34 86, 22 77, 22 66 Z" fill="#FFFFFF" />
</svg>'''
    }
}


def apply_concept(concept_id: str):
    concept_id = concept_id.upper().strip()
    if concept_id not in CONCEPTS:
        print(f"[ERROR] Unknown concept '{concept_id}'. Available: {list(CONCEPTS.keys())}", file=sys.stderr)
        sys.exit(1)

    c = CONCEPTS[concept_id]
    print(f"============================================================")
    print(f"Applying UREfy Brand Concept {concept_id}: '{c['name']}'")
    print(f"Target Public Directory: {PUBLIC_DIR}")
    print(f"============================================================")

    # 1. Write vector assets
    files_to_write = {
        'logo-mark.svg': c['logo_mark'],
        'favicon.svg': c['favicon'],
        'logo.svg': c['logo'],
        'logo-wordmark.svg': c['wordmark'],
        'logo-dark.svg': c['dark'],
        'logo-white.svg': c['white']
    }

    for fname, content in files_to_write.items():
        out_path = os.path.join(PUBLIC_DIR, fname)
        with open(out_path, 'w', encoding='utf-8') as f:
            f.write(content.strip() + '\n')
        print(f"  -> Updated {fname}")

    # 2. Run generate-icon-set.py using logo-mark.svg as the master
    generator_script = os.path.join(SCRIPT_DIR, 'generate-icon-set.py')
    master_svg = os.path.join(PUBLIC_DIR, 'logo-mark.svg')

    print("\n[PIPELINE] Generating high-res icon set & PWA assets via generate-icon-set.py...")
    cmd = [
        sys.executable,
        generator_script,
        master_svg,
        '-o', PUBLIC_DIR,
        '--maskable-bg', '#090A0F'
    ]

    res = subprocess.run(cmd, cwd=PROJECT_ROOT, text=True, capture_output=True)
    print(res.stdout)
    if res.returncode != 0:
        print(f"[ERROR] Icon set generation failed: {res.stderr}", file=sys.stderr)
        sys.exit(1)

    print("============================================================")
    print(f"[SUCCESS] Brand Concept {concept_id} successfully applied and verified!")
    print("============================================================")


def main():
    parser = argparse.ArgumentParser(description="Apply a UREfy brand logo concept and rebuild all assets")
    parser.add_argument('concept', choices=['A', 'B', 'F'], default='F', nargs='?', help="Concept ID (A, B, or F)")
    args = parser.parse_args()
    apply_concept(args.concept)


if __name__ == '__main__':
    main()
