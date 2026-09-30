#!/usr/bin/env python3
"""
scripts/generate_1000_personas.py
UREfy Social Network — Persona & Demographics Architect
Deterministic Generator for 1,000 Distinct Realistic Personas
Across 10 Diverse Tech/Gaming/FOSS Archetypes.

Output Schema:
    Tuple of:
    (user_id, display_name, handle, style, bio, location, role, status, trust_score, merit_score, badges)
"""

import hashlib
import random
import re
import json
import sys
from typing import List, Tuple, Dict, Any

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Avatar styles supported by UREfy DiceBear integration
AVATAR_STYLES = ['bottts', 'adventurer', 'lorelei', 'pixel-art', 'notionists', 'avataaars']

# Node locations (Romanian and Global Sovereign Mesh Nodes)
LOCATIONS = [
    'node // cluj 🇷🇴',
    'subnet // bucharest 🇷🇴',
    'node // timisoara 🇷🇴',
    'node // brasov 🇷🇴',
    'node // iasi 🇷🇴',
    'datacenter // frankfurt 🇩🇪',
    'mesh // tokyo 🇯🇵',
    'node // austin 🇺🇸',
    'peer // london 🇬🇧',
    'node // warsaw 🇵🇱',
    'node // seoul 🇰🇷'
]

# Roles distribution (realistic community ratios)
ROLES_DIST = ['MEMBER'] * 84 + ['MODERATOR'] * 8 + ['ARCHIVIST'] * 5 + ['GUARDIAN'] * 3

# Status distribution
STATUSES_DIST = ['online'] * 50 + ['idle'] * 25 + ['dnd'] * 15 + ['offline'] * 10

# Human Name Components for Display Name Variance
FIRST_NAMES_RO = [
    "Andrei", "Matei", "Bogdan", "Vlad", "Cristian", "Radu", "Alexandru", "Mihai", "Florin", "Sergiu",
    "Claudiu", "Cosmin", "Darius", "Silviu", "Valentin", "Tudor", "Horia", "Octavian", "Laurentiu", "Dragos",
    "Ioana", "Elena", "Diana", "Raluca", "Simona", "Mara", "Andreea", "Cristina", "Anca", "Alina"
]

LAST_NAMES_RO = [
    "Popescu", "Dumitrescu", "Ionescu", "Munteanu", "Radu", "Grigorescu", "Stan", "Teodorescu", "Popa", "Voinea",
    "Dragomir", "Constantinescu", "Petrescu", "Moraru", "Nistor", "Barbu", "Vasilescu", "Gheorghiu", "Pop", "Vancea",
    "Lazar", "Radulescu", "Luca", "Stanescu", "Enache", "Dobre", "Tanase", "Badea", "Vasile", "Ene"
]

FIRST_NAMES_INT = [
    "Alex", "Liam", "Marcus", "Chloe", "Sven", "Daisuke", "Felix", "Krzysztof", "Amara", "Kenji",
    "Lucas", "Jean-Luc", "Oliver", "Greta", "Tariq", "Eleni", "Connor", "Jordan", "Horst", "Connor",
    "Maya", "Nadia", "Viktor", "Zack", "Soren", "Maximilian", "Arthur", "Hidenori", "Amir", "Elena"
]

LAST_NAMES_INT = [
    "Rivera", "O'Connor", "Chen", "Bennett", "Lindholm", "Takahashi", "Zimmermann", "Kowalski", "Okafor", "Sato",
    "Lind", "Moreau", "Vance", "Holst", "Mansoor", "Papadaki", "O'Shea", "Bell", "Becker", "Miller",
    "Lin", "Lindqvist", "Rossi", "Novak", "Tanner", "Bauer", "Pendelton", "Yamashita", "Al-Mansoor", "Rostova"
]

# ─────────────────────────────────────────────────────────────────────────────
# 10 ARCHETYPES SPECIFICATION
# ─────────────────────────────────────────────────────────────────────────────
ARCHETYPES_CONFIG = {
    1: {
        "slug": "hardcore_competitive",
        "name": "Hardcore Competitive Gamers",
        "description": "CS2, Valorant, Apex, League, Dota 2, R6 Siege players obsessed with tickrates, sub-tick netcode, eDPI and clutches.",
        "preferred_styles": ['adventurer', 'bottts', 'pixel-art'],
        "handles": [
            "vortex_peek", "ace_delaney", "clutch_godot", "subtick_kai", "s1mple_fanboy",
            "crosshair_placement", "radiant_jett", "dota_tinker_main", "r6_cav_main", "tap_strafe_god",
            "low_edpi_aimer", "dyac_purist", "raw_accel_nerd", "wooting_rapid", "smoke_lineup_pro",
            "faceit_grinder_ro", "invoker_vocalist", "defuse_kit_king", "mid_diff_only", "prefire_demon",
            "headshot_machine", "aimlab_top1", "subtick_truth", "reyna_insta", "shroud_mousepad",
            "clutch_minister", "pixel_peeker", "spinbot_hunter", "scrim_captain", "jett_knife_ace",
            "mirage_window_king", "inferno_banana_hold", "apex_pred_s19", "bhop_scriptless", "strafe_king_ro",
            "overpass_flank", "flashbang_dance", "tactical_crouch", "recoil_control_god", "valorant_immortal",
            "premier_25k", "kovaak_grinder", "faceit_eloking", "zero_delay_usb", "artisan_mousepad",
            "subtick_whiner", "clutch_or_kick_ro", "lineup_larry", "spray_transfer", "first_bullet_acc",
            "anti_cheat_skeptic", "tick_rate_truther", "cs_major_dreamer", "phantom_over_vandal", "awp_flick_god",
            "bind_jumpthrow", "anchor_b_site", "igl_shotcaller", "flash_assist_god", "entry_fragger_ro",
            "clutch_factor", "dry_peek_punisher", "subtick_desync", "superglide_macro", "r5_reloaded_grinder",
            "wraith_kunai_main", "pathfinder_grapple", "dota_rubick_steal", "dota_pos1_carry", "bkb_refuser",
            "r6_bandit_trick", "r6_mira_window", "r6_smoke_plant", "league_viego_reset", "lee_sin_insec",
            "baron_stealer", "wave_freeze_nerd", "jungle_diff_ceo", "mid_gap_dispenser", "top_lane_island",
            "tactical_reset", "peekers_advantage", "one_way_smoke", "silent_defuse", "trigger_bot_hater",
            "hall_effect_hall", "analog_switch_pro", "rapid_trigger_01", "mouse_skates_ptfe", "glass_pad_skater",
            "high_refresh_cult", "overclocked_polling", "low_latency_audio", "killcam_analyst", "demo_reviewer",
            "clutch_gene", "scrim_finder_eu", "challenger_peaker", "esports_analyst_ro", "ranked_grindset"
        ],
        "flairs": ["CS2 Premier", "Radiant #412", "Apex Predator", "Faceit 10", "Dota 8k MMR", "R6 Champion", "League Master"],
        "bio_templates": [
            "24.8k CS2 Premier. Wooting 60HE rapid trigger set to 0.1mm. If Valve doesn't fix sub-tick hitreg I'm going to valorant permanently 🎯💀",
            "Radiant peak #312 EU. Phantom > Vandal and I will die on this hill. Coaching silvers for free on weekends 👑🔥",
            "Apex Predator S17/S19. 1200 hours in R5Reloaded 1v1 servers. Tap-strafing until my scroll wheel breaks 🌪️🎮",
            "R6 Siege Champ. 4:3 stretched res, Holo A on everything. Drone economy wins matches, your aim is secondary 📹🎯",
            "Dota 2 7.8k MMR pos 2. Invoker / Storm Spirit spammer. BKB is mandatory stop skipping it you animals ⚡🧙‍♂️",
            "Faceit level 10 solo queue survivor. Cluj LAN finalist 2025. 800 eDPI, Artisan Zero Soft XL mousepad 🖱️🇷🇴",
            "League Master tier jungle main. Viego & Lee Sin. Counter-jungling at lvl 3 is free real estate 🌲⚔️",
            "Tracking aim specialist. 0.32 sens @ 1600 DPI. 240Hz Zowie XL2546K DyAc on premium. No motion blur allowed ⚡👀",
            "Competitive entry fragger. 1.34 HLTV rating in regional qualifiers. Prefiring every standard angle in Inferno 💥🎯",
            "Hall-effect switches, zero deadzone, 8000Hz polling rate. Looking for high Elo scrims in Eastern Europe 🕹️⚡"
        ],
        "badge_pool": [
            ["CS2 Premier 24k", "Faceit Level 10"],
            ["Radiant Peak", "Vandal Master"],
            ["Apex Predator", "Tap Strafe Pro"],
            ["Dota 8k MMR", "Invoker Specialist"],
            ["R6 Champion", "Drone Scout"],
            ["Wooting 60HE", "Sub-Tick Skeptic"],
            ["Artisan Mousepad", "Zowie 240Hz"],
            ["LAN Veteran", "Tournament Finalist"]
        ]
    },

    2: {
        "slug": "pc_hardware_overclockers",
        "name": "PC Hardware Elitists & Overclockers",
        "description": "Custom water loops, direct-die delidding, DDR5 primary & secondary sub-timings, Noctua vs 420mm AIO.",
        "preferred_styles": ['bottts', 'pixel-art', 'notionists'],
        "handles": [
            "delid_king", "mora_chiller", "ddr5_subtimings", "trefi_maximus", "shunt_modder",
            "noctua_cultist", "liquid_metal_ro", "cinebench_runner", "curve_optimizer", "silicon_lottery",
            "ekwb_hater", "b_die_veteran", "thermalright_chad", "optane_hoarder", "dpc_latency_zero",
            "copper_lap_god", "chiller_bench", "custom_loop_dan", "vrm_heatsink", "vcore_undervolt",
            "supercool_direct", "karhu_10000_pass", "memtest86_addict", "ln2_pot_polisher", "hpet_disabler",
            "pcie5_lane_hawk", "titanium_psu_only", "watercool_heatkiller", "noctua_a20_fan", "mdpc_x_sleeving",
            "epoxy_direct_die", "bclk_pusher", "monoblock_builder", "flow_meter_nerd", "thermal_putty_guru",
            "ptm7950_convert", "copper_shim_mod", "delid_tool_ro", "voltage_droop_fix", "llc_level7",
            "c_states_disabled", "hwi_sensors_open", "water_delta_sub2c", "dual_d5_pumps", "hardline_acrylic",
            "borosilicate_tubes", "quick_disconnect_qdc", "external_rad_cult", "case_labs_relic", "open_benchtable",
            "cold_plate_flatness", "micron_polishing_paste", "ddr5_8400_boot", "hynix_a_die", "cl30_low_latency",
            "trfc_tightened", "tfaw_16_gang", "cmd_2t_loser", "vdd_overvolt_safe", "pcb_layer_counter",
            "gold_plated_contacts", "seasonic_prime_1600", "atx3_native_12v", "transient_spike_guard", "inductor_whine_cure",
            "choke_padding", "backplate_active_cool", "vram_thermal_pads", "liquid_nitrogen_bencher", "hwbot_top50",
            "cinebench_r23_40k", "firestrike_halloffame", "time_spy_extreme", "undervolt_4090", "power_limit_133",
            "shunt_soldered", "solder_wick_master", "esd_mat_grounded", "fluke_multimeter_pro", "thermal_probe_k_type",
            "fan_curve_silent", "zero_rpm_fanatic", "positive_pressure_pc", "dust_filter_hater", "silverstone_case",
            "lian_li_o11_hater", "sff_custom_loop", "formd_t1_watercool", "sandwich_layout_sub10l", "dense_fin_stack",
            "noctua_brown_badge", "industrial_ppc_3000", "gentle_typhoon_fan", "phanteks_t30_owner", "alphacool_nexxxos"
        ],
        "flairs": ["Direct-Die Cooled", "DDR5-8200 CL34", "Mo-Ra3 420mm", "Liquid Metal", "Karhu 10,000%", "Silicon Lottery"],
        "bio_templates": [
            "14900KS delidded with Supercool direct-die block. DDR5-8200 CL34 100% Karhu stable 10,000%. Water delta 1.8°C at 700W load ❄️💧",
            "Mo-Ra3 420 external radiator with 4x Noctua NF-A20 fans. In-chassis radiators are thermal traps for cowards. Change my mind 🌬️🦾",
            "Ryzen 7800X3D at -35 curve optimizer all-core, BCLK 102.5. 5.15GHz flat in gaming at 48W. Air cooling > noisy pump AIOs any day 🦉🛠️",
            "Lapping copper heat spreaders to mirror finish with 3000 grit wet sandpaper. If your IHS isn't flat to 0.005mm don't ping me 🪞⚙️",
            "Thermalright Peerless Assassin 120 SE shaming 300 euro AIOs since day one. Best 35 bucks ever spent on silicon cooling 💸❄️",
            "Sub-timings tuned down to the register: tRFC 380, tREFI 65535, tFAW 16. Memtest86 is my screensaver at this point ⏱️🧪",
            "Seasonic Prime TX-1600W Titanium. Custom sleeved MDPC-X cables. Cable management in the back cleaner than your operating system ⚡🔌",
            "Dual Laing D5 pumps in serial on an open benchtable. PTM7950 phase-change pad on the GPU core. Zero pump whine allowed 💧🤫",
            "Shunt-modded RTX 4090 pulling 620W without breaking 46°C core temp. Watercooling is an engineering discipline, not RGB lighting 🔧⚡",
            "Hynix A-die subtimings squeezed dry. DPC latency flat at 0.015ms on hardened Windows LTSC with zero telemetry 📉🛡️"
        ],
        "badge_pool": [
            ["Direct-Die Cooled", "DDR5-8200 CL34"],
            ["Mo-Ra3 External", "Dual D5 Pumps"],
            ["Liquid Metal Vet", "Delidder"],
            ["Karhu 10000% Stable", "Sub-Timings Tuned"],
            ["Noctua Brown Loyalist", "Air Cooling Purist"],
            ["Shunt Modder", "HWBOT Bencher"],
            ["Silicon Lottery", "Curve Optimizer -35"],
            ["PTM7950 Converted", "Custom SFF Loop"]
        ]
    },

    3: {
        "slug": "console_loyalists",
        "name": "Console Loyalists & Platform Warriors",
        "description": "PlayStation trophy hunters, Xbox Game Pass defenders, and Nintendo Switch handheld purists.",
        "preferred_styles": ['lorelei', 'adventurer', 'avataaars'],
        "handles": [
            "plat_hunter_99", "gamepass_defender", "switch_oled_purist", "dual_sense_enjoyer", "bloodborne_copium",
            "halo_infinite_grinder", "zelda_glitcher", "disc_preserver", "ps5_pro_analyst", "trophy_guide_dan",
            "xbox_series_x_ro", "metroid_speedrun", "sony_first_party", "gamepass_value_king", "physical_edition_only",
            "spencer_disciple", "gran_turismo_fan", "nintendo_direct_leaks", "backlog_zero", "astros_playroom_speed",
            "psvr2_believer", "forza_horizon_drifter", "gears_of_war_vet", "quick_resume_god", "share_button_art",
            "naughty_dog_stan", "insomniac_swing", "smash_bros_offline", "xenoblade_lore_nerd", "fire_emblem_tactics",
            "mario_wonder_badge", "ps_plus_extra_scout", "remote_play_portal", "dualsense_edge_user", "back_paddles_only",
            "steelbook_collector", "limited_run_buyer", "day_one_patch_hater", "offline_campaigns", "sony_bravia_game_mode",
            "hdr_hgig_calibrated", "vrr_120hz_console", "spatial_audio_3d", "xbox_cloud_tester", "backward_compat_king",
            "ps3_cell_processor_fan", "halo_ce_purist", "sea_of_thieves_solo", "starfield_apologist", "avowed_waiter",
            "fable_reboot_watch", "banjo_kazooie_copium", "switch_pro_rumors", "joycon_drift_fixer", "hall_joystick_mod",
            "nitro_deck_enjoyer", "docked_mode_upscale", "amiibo_unboxed", "pokemon_shiny_hunter", "splatoon3_x_rank",
            "animal_crossing_island", "kirby_lore_master", "pikmin_dandori", "bayonetta_pure_plat", "devil_may_cry_combo",
            "final_fantasy_vii_plat", "god_of_war_givemegod", "spider_man_traversal", "horizon_forbidden_photo", "ghost_of_tsushima_lethal",
            "tlou_grounded_plus", "demon_souls_ps5", "returnal_biome6_clear", "death_stranding_porter", "hideo_kojima_disciple",
            "console_war_peacekeeper", "physical_media_crusader", "drm_license_critic", "cartridge_licker", "memory_card_nostalgia",
            "hdmi_21_tv_owner", "lg_c3_oled_gaming", "input_lag_tester_console", "save_data_cloud_sync", "trophy_sync_error_survivor",
            "100_percent_club", "speedrun_any_console", "controller_modder_ro", "custom_faceplates_ps5", "xbox_controller_lab",
            "dualsense_haptics_stan", "rumble_feedback_nerd", "playstation_stars_level4", "xbox_rewards_grinder", "switch_battery_saver"
        ],
        "flairs": ["Platinum Hunter (200+)", "Game Pass Ultimate", "Switch OLED Purist", "Physical Media Disc", "DualSense Haptics", "PS5 Pro PSSR"],
        "bio_templates": [
            "218 Platinum Trophies. Currently suffering through Crypt of the NecroDancer. PS5 Pro PSSR upscaling is actually insane on a 77' OLED 🏆✨",
            "Xbox Game Pass Ultimate subscriber since day 1. 400+ games beaten for the cost of 2 full price releases. Phil Spencer saved my wallet 🎮💚",
            "Handheld purist. Switch OLED + Nitro Deck + 1TB micro-SD loaded with physical backups. 720p native on OLED looks cleaner than 4K blown up 🍄✨",
            "Day 3,412 waiting for Bloodborne 60 FPS remaster on modern hardware. Every State of Play is another cycle of sovereign heartbreak 🩸😭",
            "Physical discs only! If you don't own the plastic disc with the data stamped on it, you're just renting temporary revocation licenses 📀🛡️",
            "Gran Turismo 7 in PSVR2 with Fanatec direct drive wheel. Flat screen racing is dead to me now 🏎️🥽",
            "Nintendo Direct live reactor. Tears of the Kingdom 100% map completion with zero guides. Waiting for the Switch 2 reveal trailer 🌿🗡️",
            "Quick Resume on Xbox Series X is the most underrated console innovation of the decade. Jumping between 4 RPGs seamlessly 🎮⚡",
            "Steelbook collector & physical media archivist. 450 PlayStation and Switch cases in climate-controlled shelving 📚💿",
            "DualSense adaptive triggers and haptic feedback ruined standard controllers for me. Astro Bot is pure video game joy 🤖🌟"
        ],
        "badge_pool": [
            ["Platinum Hunter (200+)", "Trophy Addict"],
            ["Game Pass Ultimate", "Day One Backlog"],
            ["Switch OLED Purist", "Zelda 100% Map"],
            ["Physical Media Archivist", "Disc Collector"],
            ["Bloodborne Remaster Copium", "Souls Vet"],
            ["PSVR2 Simulator", "Direct Drive Wheel"],
            ["DualSense Haptics", "Astro Bot 100%"],
            ["Quick Resume Fan", "Series X Power"]
        ]
    },

    4: {
        "slug": "retro_gamers_emulation",
        "name": "Retro Gamers & Emulation Hobbyists",
        "description": "Sony Trinitron CRT scanlines, 240p RGB SCART, MiSTer FPGA cycle-accuracy, Steam Deck OLED emuDeck shaders.",
        "preferred_styles": ['pixel-art', 'notionists', 'bottts'],
        "handles": [
            "mister_fpga_cluj", "trinitron_240p", "scanline_wizard", "rg35xx_tinkerer", "emudeck_guru",
            "bvm_hoarder", "scart_rgb_purist", "duckstation_enjoyer", "retroachieve_dan", "saturn_beetle",
            "gameboy_ips_mod", "crt_geometry_god", "chd_compressor", "dosbox_soundblaster", "pc_98_archivist",
            "neo_geo_aes", "turbografx_vault", "runahead_latency", "pico8_cart_collector", "analogue_pocket_ro",
            "open_fpga_cores", "snes_chav", "genesis_blast_proc", "ps1_pgxp_fix", "pcsx2_nightly",
            "flycast_dreamcast", "dolphin_ir_mod", "mupen64_glide", "retroarch_shader_lab", "crt_royale_kurozumi",
            "megabezel_reflect", "pvm_20m4u_owner", "rgb_mod_n64", "ultra_hdmi_n64", "gbi_gamecube",
            "swiss_boot_gc", "xstation_ode", "fenrir_saturn", "mode_optical_drive", "everdrive_collector",
            "krikzz_support", "sd2snes_pro", "gb_camera_photographer", "flasher_cart_usb", "cleanamp_gba",
            "boxypixel_aluminum", "slate_gba_mod", "miyoo_mini_onion", "garlic_os_dev", "trimui_brick_fan",
            "retroid_pocket_4pro", "odin2_portal_beast", "anbernic_collector", "batocera_x86", "recalbox_rpi",
            "hyperspin_curator", "launchbox_metadata", "redump_verifier", "no_intro_dat_checker", "tosec_curator",
            "akihabara_crate_digger", "super_famicom_boxed", "japanese_manual_scan", "romhack_translator", "mother3_english_patch",
            "chrono_trigger_msu1", "orchestral_audio_patch", "fastrom_snes_hack", "overclocked_megadrive", "yamaha_ym2612_synth",
            "fm_synth_adlib", "roland_mt32_midi", "sound_canvas_sc55", "gravis_ultrasound_cult", "opl3_purist",
            "dos_config_sys_tweaker", "himem_sys_optimizer", "autoexec_bat_god", "glide_wrapper_glide2x", "voodoo2_sli_nostalgia",
            "matrox_millennium_2d", "mitsubishi_diamondtron", "sony_gdm_fw900", "scanline_generator_vga", "retrotink_4k_owner"
        ],
        "flairs": ["Sony BVM 240p", "MiSTer FPGA Core", "CRT-Royale Shader", "RetroAchievements 100%", "Analogue Pocket", "IPS Modder"],
        "bio_templates": [
            "Sony BVM-20E1U calibrated with 240p Test Suite. 1000 TVL RGB scanlines through shielded SCART cables. Modern screens look like smudges 📺⚡",
            "MiSTer FPGA dual SDRAM enthusiast. Cycle-accurate SNES, Mega Drive, and PS1 cores running zero input lag on a 15kHz arcade monitor 🕹️✨",
            "Steam Deck OLED configured with custom CRT-Royale shaders and retroachievements. Beating Chrono Trigger for the 14th time in my hammock 🎮🌲",
            "Soldering IPS V5 backlights and USB-C clean power mods into original Game Boy Advances. Keeping 2000s silicon alive forever 🔋🛠️",
            "DuckStation with PGXP geometry correction + PCSX2 60fps widescreen patches. PS2 emulation on Linux is peak digital heritage 💾✨",
            "Converting full redump disc images to .CHD and scrubbing duplicate regional dumps. 18TB local offline retro vault on mirrored ZFS 💿🗄️",
            "Run-ahead 2 frames enabled on RetroArch. Lower input latency on emulator than original hardware on a consumer CRT. Mathematics wins 🧠🕹️",
            "RetroTINK-4K video processor feeding integer scaled 240p to a 4K OLED with custom scanline bloom mask. Vintage meets modern 🎛️📺",
            "Collecting boxed Super Famicom carts from Akihabara junk bins. Repairing leaky SMD capacitors with low-melt bismuth solder 🇯🇵🔧",
            "Roland MT-32 and SC-55 MIDI sound modules hooked to a 486 DX2 DOS rig. Monkey Island never sounded so magnificent 🎶💾"
        ],
        "badge_pool": [
            ["CRT 240p Purist", "BVM Calibrated"],
            ["MiSTer FPGA Cycle-Accurate", "Dual SDRAM"],
            ["RetroAchievements Master", "Hardcore Mode"],
            ["SteamDeck EmuDeck", "Shader Wizard"],
            ["IPS Screen Modder", "Soldering Iron Vet"],
            ["RetroTINK-4K", "Integer Scaling"],
            ["Redump Verified", "18TB Offline Vault"],
            ["Roland MIDI Synthesizer", "DOS SoundBlaster"]
        ]
    },

    5: {
        "slug": "modders_indie_3d",
        "name": "Modders, Indie Dev Hobbyists & 3D Artists",
        "description": "Blender geometry nodes, Godot 4 C# vs GDScript, Unreal Engine 5.5 Nanite & Lumen, Unity runtime fee refugees.",
        "preferred_styles": ['lorelei', 'adventurer', 'notionists', 'pixel-art'],
        "handles": [
            "godot_dev_dan", "blender_nodes_art", "unreal_nanite_fx", "unity_refugee_ro", "hlsl_shader_nerd",
            "procedural_dungeon", "lowpoly_vibe", "rigging_tears", "substance_baker", "itch_jam_survivor",
            "drawcall_reducer", "inverse_kinematics", "vulkan_renderer", "pixel_spriter", "gameplay_programmer",
            "quaternion_math", "ragdoll_physics_dev", "sdf_raymarcher", "level_designer_ro", "indie_crunch_survivor",
            "steam_next_fest_demo", "aseprite_animator", "normal_map_baker", "triplanar_mapping", "compute_shader_god",
            "wfc_map_gen", "navmesh_recalc", "state_machine_purist", "ecs_enthusiast", "bevy_engine_rust",
            "raylib_minimalist", "monogame_veteran", "pico8_cart_dev", "spine_2d_skeletal", "subsurface_scatter",
            "lumen_gi_bounce", "nanite_lod_zero", "chaos_physics_ue5", "blueprints_spaghetti", "csharp_godot_bind",
            "gdscript_static_typing", "asset_pack_cleaner", "sound_fx_sfxr", "chiptune_tracker_defle", "kenney_assets_fan",
            "gamedev_burnout_cure", "itch_free_tier", "indie_marketing_struggle", "steam_wishlist_copium", "early_access_roadmap",
            "game_loop_delta_time", "spatial_partitioning", "octree_culling", "frustum_culling_nerd", "billboard_impostors",
            "texture_compression_astc", "basis_universal_ktx2", "glb_draco_mesh", "gltf_export_trouble", "weight_painting_hell",
            "topology_retopology", "quad_mesh_only", "non_manifold_geometry", "uv_unwrapping_pain", "lightmap_baking_gpu",
            "hdrp_hater", "urp_shadergraph", "spirv_cross_compiler", "webgl_wasm_exporter", "canvas_renderer_js",
            "pixijs_hacker", "threejs_creative_coder", "r3f_fiber_react", "babylonjs_archviz", "game_design_doc_writer",
            "mechanic_prototyper", "juice_it_or_lose_it", "screen_shake_slider", "hitstop_frame_freeze", "coyote_time_coder",
            "jump_buffer_input", "gamepad_remapping_gui", "localization_i18n_game", "mod_db_uploader", "nexus_mods_creator",
            "thunderstore_modder", "steam_workshop_item", "reverse_engineer_assets", "bepindex_unity_patch", "fmodel_extractor"
        ],
        "flairs": ["Godot 4 Maintainer", "Blender Geometry Nodes", "UE5 Nanite Architect", "Technical Artist", "Steam Next Fest", "ShaderToy Wizard"],
        "bio_templates": [
            "Godot 4.3 C# solo dev. Rebuilding my roguelike engine after escaping Unity's runtime fee disaster. FOSS gamedev or bust 🤖🎮",
            "Blender procedural geometry nodes & non-photorealistic shaders. Baking 4K ambient occlusion maps while questioning my life choices 🍩🎨",
            "Unreal Engine 5.5 tech artist. Lumen bounce lighting, Nanite virtual geometry, and Niagara GPU particle systems. 24GB VRAM is barely enough 💻🔥",
            "Writing custom HLSL / GLSL compute shaders for water caustics and volumetric fog. Math is art, triangles are paintbrushes ✨📐",
            "Working on a cozy low-poly cyberpunk detective game for Steam Next Fest. Rigging human armatures without weight clipping is pure torment 💀🎨",
            "Draw call reduction & texture atlas packing fanatic. If your indie game stutters because of unbatched meshes, I will find your repository 📉🔍",
            "Procedural dungeon generation using Wave Function Collapse and Delaunay triangulation. Coding game mechanics at 2 AM with dark roast coffee ☕🎲",
            "Creating stylized hand-painted textures in Substance Painter and 3D modeling in Blender. Wishlist my game on Steam, link in bio 🎨🔗",
            "Bevy Rust ECS experimenter. Zero object-oriented bloat, pure data-oriented game design. Borrow checker keeps my game loop crash-free 🦀⚡",
            "2D pixel artist & animator in Aseprite. 12 frames of run cycle per character. Squeezing every byte out of palette restrictions 👾🖌️"
        ],
        "badge_pool": [
            ["Godot 4 Maintainer", "GDScript Static Typist"],
            ["Blender Geometry Nodes", "Procedural 3D"],
            ["UE5 Nanite Architect", "Lumen Lighting"],
            ["Unity Refugee", "FOSS Gamedev"],
            ["ShaderToy Wizard", "Compute Shaders"],
            ["Steam Next Fest Demo", "Wishlist Hunter"],
            ["Bevy Rust ECS", "Data Oriented"],
            ["Aseprite Pixel Artist", "16-Bit Animator"]
        ]
    },

    6: {
        "slug": "hackers_linux_homelab",
        "name": "Hackers, Linux Ricers & Homelabbers",
        "description": "Arch, Gentoo, NixOS declarative flakes, Proxmox VE clusters, ZFS raidz2, ThinkPad T480 libreboot.",
        "preferred_styles": ['bottts', 'pixel-art', 'notionists'],
        "handles": [
            "arch_btw_alex", "nixos_flake_purist", "proxmox_swarm", "zfs_scrubber", "thinkpad_coreboot",
            "hyprland_dotfiles", "gentoo_cflags", "opnsense_router", "wireguard_mesh", "sfp_10gbe_dan",
            "homelab_rack_ro", "neovim_keymaps", "selfhosted_immich", "pihole_adblock", "ecc_ram_crusader",
            "unraid_converter", "docker_compose_god", "true_nas_scale", "btrfs_snapshotter", "microtik_routeros",
            "tailscale_exit_node", "headscale_selfhost", "vaultwarden_sync", "jellyfin_quicksync", "homeassistant_zigbee",
            "k3s_baremetal", "argocd_gitops", "ansible_playbook_king", "terraform_homelab", "traefik_cert_magic",
            "caddy_reverse_proxy", "nginx_hardened", "fail2ban_jail", "crowdsec_bouncer", "wireguard_p2p_mesh",
            "alacritty_config", "kitty_terminal_rice", "tmux_session_master", "zsh_powerlevel10k", "starship_prompt_custom",
            "catppuccin_mocha_everything", "nord_theme_purist", "gruvbox_dark_cult", "i3wm_minimalist", "sway_wayland_fan",
            "waybar_custom_css", "rofi_wayland_menu", "pipewire_pro_audio", "alsa_latency_zero", "bcachefs_tester",
            "openzfs_arc_tuner", "nvme_mirror_pool", "sas3_hba_itmode", "lsi_broadcom_flasher", "supermicro_chassis_24bay",
            "dell_poweredge_r730", "hp_proliant_fan_mod", "noctua_mod_switch", "managed_switch_vlan", "lacp_bonding_8023ad",
            "fiber_optic_patch", "keystone_jack_puncher", "fluke_cable_tester", "ups_apc_nut_server", "cyberpower_usb_monitor",
            "pdu_switched_metered", "server_rack_42u", "soundproof_rack_diy", "patch_panel_clean", "zip_tie_banned_velcro",
            "thinkpad_x220_classic", "thinkpad_t14_amd", "framework_laptop_16", "coreboot_flasher_pomona", "ch341a_spi_programmer",
            "me_cleaner_intel", "disable_amt_vpro", "libreboot_purist", "gnu_linux_richard", "reproducible_builds_fan",
            "systemd_hater_openrc", "musl_libc_alpine", "void_linux_runit", "slackware_veteran", "freebsd_jail_keeper",
            "openbsd_pf_firewall", "hardened_kernel_patches", "selinux_enforcing", "apparmor_profile_dev", "ebpf_kernel_tracer",
            "wireshark_packet_ninja", "nmap_syn_scanner", "aircrack_ng_monitor", "radare2_reverser", "ghidra_decompiler_fan"
        ],
        "flairs": ["Arch Linux (btw)", "NixOS Flake Architect", "48TB ZFS Pool", "Proxmox Cluster Admin", "ThinkPad Corebooted", "Neovim Lua Rice"],
        "bio_templates": [
            "I use Arch btw. Hyprland Wayland compositor with custom Catppuccin mocha theme. Minimal status bar, zero bloated Electron apps allowed 🐧💅",
            "NixOS declarative flakes everywhere: desktop, framework laptop, and homelab servers. One git commit replicates my entire operating system ❄️⚡",
            "Proxmox VE 3-node cluster in my basement rack. 24 LXC containers, 10GbE SFP+ optical inter-connects, and TrueNAS Scale on mirrored NVMe 🗄️🔌",
            "ThinkPad T480 with Libreboot / Coreboot, 64GB RAM, and glass trackpad mod. Newer laptops with soldered RAM and soldered SSDs disgust me 💻🛡️",
            "ZFS RaidZ2 8x16TB IronWolf Pro. Weekly scrubs report 0 checksum errors. Backed up offsite via encrypted ZFS send/recv 🛡️💾",
            "Self-hosting Vaultwarden, Immich, Jellyfin, and Nextcloud behind OPNsense with WireGuard split-tunneling. Google Photos who? 🌐🔒",
            "Neovim configured in pure Lua. LSP, treesitter, telescope, harpoon. If I have to reach for the mouse while typing, my day is ruined ⌨️⚡",
            "MikroTik RouterOS 7 + 10G SFP+ switch routing sovereign traffic. Digi 10Gbps fiber squeezed down to 9.4 Gbps effective throughput 🌐⚡",
            "Home Assistant yellow coordinator with 80+ Zigbee devices. Zero cloud telemetry, local automations execute in 4ms 🏠⚡",
            "Gentoo Linux compiled with -O3 -march=native. My compile times keep my apartment warm during Eastern European winters ☕🔥"
        ],
        "badge_pool": [
            ["Arch Linux (btw)", "Hyprland Rice"],
            ["NixOS Flake Architect", "Reproducible System"],
            ["48TB ZFS Scrubbed", "TrueNAS Scale"],
            ["Proxmox Cluster Admin", "10GbE SFP+"],
            ["ThinkPad Corebooted", "Hardware Hacker"],
            ["OPNsense Firewall", "Self-Hosted Vault"],
            ["Neovim Lua Ninja", "Zero Mouse Usage"],
            ["Digi 10Gbps Fiber", "MikroTik RouterOS"]
        ]
    },

    7: {
        "slug": "trolls_shitposters",
        "name": "Trolls, Meme Lords & Shitposters",
        "description": "Always replying 'skill issue', 'who asked', 'skull emoji', ironic copypastas, ragebait and ratio dispenser.",
        "preferred_styles": ['bottts', 'pixel-art', 'avataaars'],
        "handles": [
            "skill_issue_ceo", "who_asked_bro", "skull_emoji_spam", "yap_master_9000", "ratio_merchant",
            "blud_cooked_nothing", "touch_grass_now", "copypasta_archive", "bait_master_ro", "clown_emoji_lord",
            "literally_unplayable", "downvote_collector", "unhinged_gamer", "brainrot_curator", "sarcastic_commenter",
            "edge_browser_chad", "touch_moss_instead", "certified_hater", "skill_diff_dispenser", "ratio_or_die",
            "blud_is_yapping", "delusional_take_king", "didnt_read_dont_care", "l_plus_ratio_drop", "bro_is_not_him",
            "skibidi_intellectual", "sigma_benchmark", "bait_used_to_be_believable", "chat_is_this_real", "fake_patch_notes",
            "nvidia_stock_pumper", "amd_fine_wine_copium", "intel_13th_gen_cooker", "thermal_paste_eating", "rgb_gives_20fps",
            "macbook_gaming_pro", "switch_runs_at_15fps", "bloodborne_pc_tomorrow", "gta6_delayed_to_2030", "half_life_3_confirmed_real",
            "gaben_my_father", "steam_sale_debt", "epic_games_launcher_fan", "denuvo_defender", "anti_anti_cheat",
            "lag_switch_accuser", "ping_999_enjoyer", "voice_chat_earrape", "toxic_teammate_finder", "ff_at_15_caller",
            "gg_ez_unranked", "mid_or_feed_2026", "report_my_jungler", "smurf_police_evader", "banned_on_4_subnets",
            "alt_account_number_12", "vpn_rotator_chad", "shadowbanned_hero", "mod_mail_spammer", "downvote_brigade_of_one",
            "certified_clown_license", "professional_ragebaiter", "hot_take_furnace", "gatekeep_gaslight_game", "i_aint_reading_allat",
            "happy_for_u_or_sorry", "yap_session_interrupter", "bro_wrote_an_essay", "source_trust_me_bro", "my_uncle_works_at_sony",
            "leaked_by_my_dreams", "placebo_overclocker", "fps_cap_at_24_cinematic", "human_eye_30fps", "screen_tearing_enjoyer",
            "v_sync_triple_buffer", "mouse_acceleration_fan", "inverted_y_axis_demon", "trackball_competitive", "steering_wheel_fps",
            "guitar_hero_controller_apex", "dance_pad_elden_ring", "blindfolded_no_hit_fraud", "speedrun_cheater_analyst", "splittesting_patience"
        ],
        "flairs": ["Skill Issue Dispenser", "Professional Ratioer", "Copypasta Archon", "Grass Toucher", "Certified Yapologist", "Banned 4x"],
        "bio_templates": [
            "Your entire opinion was rendered invalid the second you missed that smoke lineup. Major skill issue ngl 💀🧢",
            "Who asked? Nobody. Did you cook? Absolutely not. Ratio + L + touch grass + install Gentoo 🥱🌱",
            "Bro wrote a 6-paragraph thesis on mouse grip styles just to stay hardstuck Gold 2 in competitive lobbies 😭💀",
            "Unironically using Microsoft Edge with Bing rewards to fund my CS2 case unboxing gambling addiction. Respect the sovereign hustle 🤡💰",
            "Here strictly to comment 'skill issue' on hardware troubleshooting threads when someone bends an AM5 socket pin 📌💀",
            "Certified ragebait connoisseur. 1 downvote = 1 dopamine molecule. Block button is for people with low APM 📉🎭",
            "Wake up babe new GPU unboxing meltdown copypasta just dropped in my sovereign feed. Cinema at its finest 🍿🔥",
            "Human eye can only see 24 FPS anyway, why are you spending 2000 euros on a graphics card? Cry about it 📺🤡",
            "I ain't reading all that. I'm happy for you tho, or sorry that happened. Skill diff regardless 🤷‍♂️💀",
            "Source: it was revealed to me in an unpatched UEFI firmware exploit dream. Don't question the vision 🔮🧢"
        ],
        "badge_pool": [
            ["Certified Yapologist", "Skill Issue Dispenser"],
            ["Professional Ratioer", "Meme Lord"],
            ["Copypasta Archon", "Grass Toucher"],
            ["Bait Specialist", "Banned 4x"],
            ["Downvote Magnet", "Edge Browser Chad"],
            ["Ragebait Connoisseur", "Skull Emoji Spammer"],
            ["Cinematic 24FPS Stan", "Placebo Overclocker"],
            ["Unchecked Menace", "Sovereign Troll"]
        ]
    },

    8: {
        "slug": "tech_journalists_leakers",
        "name": "Tech Journalists, Whistleblowers & Leakers",
        "description": "Supply chain whisperers, TSMC packaging bottlenecks, thermal teardowns, benchmark graphs, NDA-free whistleblowers.",
        "preferred_styles": ['notionists', 'adventurer', 'lorelei'],
        "handles": [
            "tsmc_whisperer", "leaks_hardware_ro", "insider_benchmarks", "wafer_yield_analyst", "embargo_breaker",
            "right_to_repair_doc", "semi_insider_alex", "thermal_investigator", "gpu_roadmap_leaks", "supply_chain_intel",
            "ndas_are_fake", "silicon_leaker_dan", "die_shot_analyst", "firmware_whistleblower", "hardware_unboxed_fan",
            "board_partner_mole", "fab_capacity_watch", "spec_sheet_leaks", "component_teardown", "tech_expose_daily",
            "b200_yield_tracker", "intel_18a_watch", "n3e_allocation", "hbm3e_shortage", "cobalt_interconnect",
            "backside_power_delivery", "gaa_fet_transition", "euv_pellicle_inspect", "asml_high_na_scout", "packaging_cowos",
            "pcb_delamination_expose", "vrm_phase_counter", "fake_heatsink_buster", "thermal_paste_dried_test", "power_connector_melt_watch",
            "12v2x6_revision_audit", "atx_spec_watchdog", "warranty_void_sticker_scam", "consumer_rights_eu", "dmca_exemption_advocate",
            "reverse_engineered_schematic", "boardview_leaker", "bios_modding_haven", "microcode_exploit_watch", "intel_stability_gate",
            "degradation_voltage_chart", "silicon_wearout_data", "ssd_controller_swap_scam", "qic_nand_longevity", "tbw_fraud_investigator",
            "antivirus_telemetry_leak", "windows_recall_tracker", "hardware_telemetry_probe", "router_backdoor_scout", "firmware_binary_diff",
            "fcc_filing_scout", "eec_registration_bot", "patent_filing_decoder", "supply_chain_hsinchu", "shenzhen_market_scout",
            "foxconn_line_reports", "pegatron_insider", "displayport_21_uhbr20_test", "hdmi_forum_critic", "vesa_compliance_check",
            "oled_burnin_stresslab", "pixel_cleaning_cycle_audit", "monitors_unboxed_disciple", "gamers_nexus_field_agent", "der8auer_collab_fan",
            "igor_lab_thermal_sim", "anandtech_memorial", "semiwiki_curator", "chips_and_cheese_analyst", "geekerwan_phone_bencher",
            "l1techs_wendell_fan", "buildzoid_pcb_listener", "serve_the_home_scout", "phoronix_kernel_bench", "hacker_news_frontpage_hit"
        ],
        "flairs": ["TSMC Supply Chain", "Verified Journalist", "Right To Repair", "Thermal Lab Teardown", "Die Shot Analyst", "NDA-Free"],
        "bio_templates": [
            "Investigative hardware journalist. Tracking TSMC N3E packaging bottlenecks, wafer allocation, and Blackwell B200 yield rates. NDA free since 2019 🔬📊",
            "Independent thermal imaging teardowns and shunt resistor measurement. Exposing manufacturers who cook memory chips under fake heatsinks 🌡️📸",
            "Sources inside Taiwanese board partners confirm next-gen midrange GPUs are locked to 8 PCIe lanes again. We never learn 📉🔍",
            "Right to repair advocate & hardware whistleblower. If schematic PDFs and boardview files exist, they belong to the sovereign owner 🛠️📄",
            "Silicon die shot analysis and macro photography. Counting SRAM cache clusters under microscope illumination. Silicon doesn't lie 🔬✨",
            "Tracking enterprise cloud hardware decommissioning. Why perfectly good Xeon blades end up shredded instead of repurposed in homelabs 🔌♻️",
            "Embargo expires at 09:00 UTC. Leaked benchmarks already show 7% IPC gain instead of the promised 25%. Marketing vs reality 📊🚨",
            "Hardware safety investigator. Documenting 12V-2x6 melting incidents and copper trace thickness violations in tier-1 power supplies ⚡⚠️",
            "Reverse engineering closed UEFI microcode updates to prove vendor-imposed CPU undervolt locks. Transparency is non-negotiable 💻🔓",
            "Monitoring FCC registrations, EEC filings, and Eurasian customs manifests to predict component releases 6 months early 🛰️📦"
        ],
        "badge_pool": [
            ["TSMC Supply Chain", "Wafer Yield Tracker"],
            ["Verified Tech Journalist", "Press Credentials"],
            ["Hardware Whistleblower", "Right To Repair"],
            ["Thermal Benchmark Lab", "Shunt Resistor Tester"],
            ["Die Shot Analyst", "Silicon Macro Photo"],
            ["EEC Manifest Leaker", "Early Spec Scout"],
            ["Open Hardware Advocate", "Boardview Archivist"],
            ["Independent Tester", "Zero Sponsor Bias"]
        ]
    },

    9: {
        "slug": "solarpunk_iot_builders",
        "name": "Solarpunk, IoT & DIY Builders",
        "description": "RPi Zero clusters, ESP32 sensors, balcony solar microinverters, Meshtastic 868MHz LoRa offgrid relays.",
        "preferred_styles": ['adventurer', 'lorelei', 'notionists'],
        "handles": [
            "balcony_solar_dan", "meshtastic_868_ro", "esphome_tinkerer", "offgrid_relay_node", "battery_18650_welder",
            "rpi_zero_solar", "lora_mountain_mesh", "homeassistant_god", "victron_solar_nerd", "3dprint_enclosures",
            "permaculture_iot", "rainwater_telemetry", "zigbee_router_map", "solar_battery_diy", "lifepo4_builder",
            "packet_radio_op", "green_homelab_ro", "bms_monitor_esp", "microinverter_hack", "ambient_sensor_lab",
            "dc_coupled_power", "mppt_charge_tracker", "shunt_coulomb_counter", "overkill_solar_bms", "active_balancer_capacitive",
            "nickel_strip_pure", "spot_welder_kseq", "recycled_laptop_cells", "capacity_tester_zb2l3", "ir_meter_yr1035",
            "weatherproof_pg7_gland", "petg_outdoor_print", "abs_uv_resistant", "silicone_gasket_diy", "desiccant_breather_box",
            "co2_scd40_sensor", "pm25_plantower_pms", "bme280_pressure_temp", "soil_moisture_capacitive", "water_flow_hall_effect",
            "relay_solid_state_ssr", "optocoupler_isolated", "buck_converter_efficiency", "boost_converter_5v", "low_quiescent_ldo",
            "deep_sleep_esp32_15ua", "solar_cell_epoxy_pour", "monocrystalline_shingled", "bifacial_balcony_panel", "hoymiles_opendtu",
            "ahoy_dtu_nrf24", "inverter_zero_export", "smart_meter_p1_port", "ct_clamp_power_calc", "shelly_em_flasher",
            "tasmota_power_monitor", "esphome_ble_tracker", "esp_now_peer_sensor", "matter_thread_border", "zigbee2mqtt_coordinator",
            "sonoff_dongle_plus_p", "cc2652p_amplifier", "external_antenna_sma", "yagi_lora_directional", "collinear_omni_868",
            "mountain_repeater_cluj", "brasov_ridge_relay", "piatra_craului_lora", "carpathian_mesh_node", "bucegi_solar_packet",
            "emergency_mesh_radio", "aprs_ham_yo_call", "cw_morse_tinkerer", "sdr_rtl2832u_listener", "noaa_weather_satellite",
            "meteor_m2_hrpt", "qfh_antenna_coax", "adsb_flight_tracker", "dump1090_feeder", "flightradar24_sovereign",
            "radarcape_receiver", "geiger_counter_esp32", "background_radiation_map", "water_well_ultrasonic", "gravity_drip_irrigation"
        ],
        "flairs": ["Balcony Solar 800W", "Meshtastic 868MHz", "ESPHome Craftsman", "LiFePO4 Powerwall", "Carpathian LoRa Relay", "Open Hardware"],
        "bio_templates": [
            "Balcony solar 800W Hoymiles microinverter feeding my homelab. Net-zero computing during daylight hours. The sun runs my Docker containers ☀️⚡",
            "Meshtastic LoRa node operator on 868MHz. Solar powered relay mounted on Brasov mountain ridge. Sovereign off-grid comms across 40km 📡🏔️",
            "Custom ESP32 sensors in every room running ESPHome over Zigbee. Local-only Home Assistant automation with zero cloud dependencies 🪴🏠",
            "Spot welding 18650 and LiFePO4 cells with smart Daly BMS. Built my own 3.2kWh portable solar generator for weekend field hacking 🔋🛠️",
            "3D printing PETG waterproof solar enclosures for outdoor weather stations and air quality sensors. Open hardware or nothing 🖨️🌿",
            "Offgrid communications researcher. LoRaWAN packets bouncing over mountain repeaters. If the grid goes down, our mesh stays alive 📶🌲",
            "Harvesting 12V DC power straight from solar panels into buck converters. AC inverters waste 15% efficiency in idle, keep it DC native ⚡🔋",
            "OpenDTU monitoring my solar microinverters over 2.4GHz radio. Real-time generation graphs pushed to local Grafana dashboard 📊☀️",
            "Soil moisture, ambient LUX, and CO2 monitored across my permaculture garden via ESP-NOW mesh. Tech serving living soil 🥦🌱",
            "Building emergency solar radio communicators in ammo cans. Ham radio licensed (YO3), amateur packet radio enthusiast 📻⚡"
        ],
        "badge_pool": [
            ["Balcony Solar 800W", "Zero Grid Waste"],
            ["Meshtastic LoRa Op", "868MHz Mountain Mesh"],
            ["ESPHome Hardware Hacker", "Microcontroller Guru"],
            ["LiFePO4 Powerwall DIY", "Spot Welding Vet"],
            ["OpenDTU Solar Telemetry", "Hoymiles Hacker"],
            ["Permaculture IoT", "Soil Telemetry"],
            ["Carpathian Mesh Relay", "Offgrid Node"],
            ["Ham Radio Licensed", "Sovereign Comms"]
        ]
    },

    10: {
        "slug": "casual_gamers_lurkers",
        "name": "Casual Gamers & Cozy Lurkers",
        "description": "Stardew Valley 1.6 perfection, Balatro flush five runs, Hades II Melinoe torch, cozy Steam Deck in bed with hot tea.",
        "preferred_styles": ['lorelei', 'avataaars', 'notionists'],
        "handles": [
            "cozy_stardew_tea", "balatro_flush_five", "hades2_melinoe", "acnh_island_chill", "dave_the_diver_dan",
            "steamdeck_in_bed", "cozy_farm_sim", "wholesome_lurker_ro", "tea_and_roguelikes", "cat_on_my_keyboard",
            "unpacking_zen", "slay_the_spire_a20", "potion_craft_alchemist", "pixel_cafe_gamer", "chill_backlog_gamer",
            "lofi_gaming_vibes", "animal_crossing_fan", "cozy_blanket_player", "balatro_joker_vault", "hades_boon_builder",
            "junimo_hut_builder", "ancient_fruit_wine", "skull_cavern_miner", "krobus_roommate", "haunted_chocolatier_wait",
            "dorfromantik_peace", "roots_of_pacha_fan", "sun_haven_farmer", "field_of_mistria_hype", "coral_island_diver",
            "disney_dreamlight_chill", "slime_rancher_plorts", "short_hike_flyer", "alba_wildlife_adventure", "cozy_grove_spirit",
            "mutazione_gardener", "spiritfarer_tears", "gris_watercolor_fan", "night_in_the_woods_gregg", "coffee_talk_barista",
            "tavern_talk_listener", "va_11_hall_a_bartender", "citizen_sleeper_dice", "i_was_a_teenage_exocolonist", "pentiment_illuminator",
            "tinykin_collector", "carto_map_rotator", "chiccory_colorful_dog", "toem_photo_snapper", "haven_coop_love",
            "wildfrost_companion", "monster_train_covenant", "peglin_orbs_popper", "slice_and_dice_fan", "backpack_hero_packer",
            "cult_of_the_lamb_pastor", "brotato_one_handed", "vampire_survivors_garlic", "halls_of_torment_lord", "death_must_die_gods",
            "deep_rock_survivor_dwarf", "loop_hero_necromancer", "inscryption_stoat_card", "balatro_blueprint_brainstorm", "balatro_cavendish_banana",
            "balatro_ante_14_dream", "hades_sister_blades", "hades_apollo_light", "hades_hestia_fire", "hades_frog_petter",
            "hades_fishing_spot", "transistor_humming", "pyre_liberation_rite", "bastion_narrator_voice", "cozy_gaming_nook",
            "fairy_lights_desk", "mechanical_keyboard_thocky", "silent_switches_lubed", "fuzzy_socks_gaming", "matcha_latte_gamer",
            "cinnamon_roll_steam", "autumn_rain_soundscape", "ambient_gaming_playlist", "lofi_girl_studying", "cat_sleeping_on_mousepad",
            "purring_headset_rest", "slow_gaming_movement", "anti_fomo_gamer", "patient_gamers_sub", "beating_backlog_2026",
            "weekend_gaming_only", "zero_stress_gameplay", "easy_mode_apologist", "games_are_art_advocate", "wholesome_pixel_heart"
        ],
        "flairs": ["Stardew 100% Perfection", "Balatro Ante 12 Addict", "Cozy Steam Deck & Tea", "Melinoe Torch Main", "Wholesome Lurker", "Slay The Spire A20"],
        "bio_templates": [
            "Year 5 Stardew Valley 1.6 perfection farm. Herbal tea, warm blanket, and rain sounds while planting ancient fruit wine crops 🍓🧺",
            "Just one more run of Balatro... it is 3:45 AM and I need Blueprint + Brainstorm to hit Ante 13. My soul belongs to Jimbo the Joker 🃏✨",
            "Hades II Melinoe torch build enjoyer. Circe hexes and Poseidon splash boons. When not dying to Chronos, I'm petting the frog 🐸🔥",
            "Cozy gaming on Steam Deck in bed with my sleeping cat draped over my hands. 40 FPS cap for 6 hours of peaceful battery life 🐾🛌",
            "Animal Crossing New Horizons island redesign #7. Trying to build a quaint medieval marketplace with custom pathing codes 🏝️🌸",
            "Mostly lurking, upvoting cool homelab setups, and playing Dave the Diver or Slay the Spire A20 Heart attempts. Zero drama please ☕🌿",
            "Unpacking and A Short Hike are certified therapeutic masterpieces. Not every game needs to spike your cortisol with 240Hz flickshots 🍃🧘‍♀️",
            "Coffee Talk barista vibes. Listening to chill chiptunes and organizing my inventory in Roots of Pacha. Wholesome gaming is healing ☕✨",
            "Slay the Spire Ironclad corruption + dead branch enjoyer. Deckbuilder addict, cozy handheld wanderer, herbal tea brewer 🃏🫖",
            "Anti-FOMO gamer. Never buying games on day one, playing lovely indie gems from 2021 at 60 FPS on max battery saver settings 🌸🕯️"
        ],
        "badge_pool": [
            ["Stardew 100% Perfection", "Junimo Whisperer"],
            ["Balatro Ante 12 Addict", "Joker Hoarder"],
            ["Cozy Handheld Gamer", "Steam Deck in Bed"],
            ["Melinoe Torch Main", "Frog Petter"],
            ["Wholesome Lurker", "Anti-Drama Node"],
            ["Slay The Spire A20", "Dead Branch High"],
            ["Animal Crossing Designer", "5-Star Island"],
            ["Dave The Diver 100%", "Sushi Master"]
        ]
    }
}

# ─────────────────────────────────────────────────────────────────────────────
# GENERATOR ALGORITHM
# ─────────────────────────────────────────────────────────────────────────────
def generate_personas(seed: int = 20260930) -> List[Tuple[str, str, str, str, str, str, str, str, int, int, List[str]]]:
    """
    Deterministically generates 1,000 unique personas (100 per archetype).
    
    Returns a list of 1,000 persona tuples:
        (user_id, display_name, handle, style, bio, location, role, status, trust_score, merit_score, badges)
    """
    rng = random.Random(seed)
    personas = []
    used_handles = set()
    used_user_ids = set()

    # Pre-shuffle locations and roles to ensure balanced distribution
    location_pool = list(LOCATIONS)
    rng.shuffle(location_pool)

    for arch_id in sorted(ARCHETYPES_CONFIG.keys()):
        arch = ARCHETYPES_CONFIG[arch_id]
        handles_list = arch["handles"]
        bio_templates = arch["bio_templates"]
        badge_pool = arch["badge_pool"]
        pref_styles = arch["preferred_styles"]
        flairs = arch["flairs"]

        # Exactly 100 personas per archetype
        for i in range(100):
            # 1. HANDLE GENERATION & UNIQUENESS
            if i < len(handles_list):
                base_handle = handles_list[i]
            else:
                base_handle = f"{arch['slug'][:8]}_{i}"

            # Clean and ensure strict alphanumeric + underscore
            clean_handle = re.sub(r'[^a-zA-Z0-9_]', '_', base_handle).lower()
            handle = clean_handle
            
            # Guarantee 100% handle uniqueness
            collision_counter = 1
            while handle in used_handles:
                handle = f"{clean_handle}_{collision_counter}"
                collision_counter += 1
            used_handles.add(handle)

            # 2. DETERMINISTIC USER ID (12-char hex string)
            # Hash derived from seed + arch_id + index + handle
            hash_input = f"urefy_persona_{seed}_{arch_id}_{i}_{handle}"
            user_id = hashlib.sha256(hash_input.encode('utf-8')).hexdigest()[:12]
            while user_id in used_user_ids:
                hash_input += "_alt"
                user_id = hashlib.sha256(hash_input.encode('utf-8')).hexdigest()[:12]
            used_user_ids.add(user_id)

            # 3. DISPLAY NAME VARIANCE (Human, Authentic, Diverse)
            # 40% Romanian names, 40% International names, 20% In-game/alias handles
            name_mode = (i + arch_id) % 5
            if name_mode == 0:
                # Romanian Full Name with optional handle tag
                first = FIRST_NAMES_RO[(i * 7 + arch_id) % len(FIRST_NAMES_RO)]
                last = LAST_NAMES_RO[(i * 11 + arch_id) % len(LAST_NAMES_RO)]
                if i % 3 == 0:
                    tag_candidate = handle.split('_')[0].capitalize()
                    display_name = f"{first} '{tag_candidate}' {last}"
                else:
                    display_name = f"{first} {last}"
            elif name_mode == 1:
                # International Full Name
                first = FIRST_NAMES_INT[(i * 5 + arch_id) % len(FIRST_NAMES_INT)]
                last = LAST_NAMES_INT[(i * 13 + arch_id) % len(LAST_NAMES_INT)]
                display_name = f"{first} {last}"
            elif name_mode == 2:
                # Technical / Tag Moniker with human first name
                first = (FIRST_NAMES_RO if i % 2 == 0 else FIRST_NAMES_INT)[(i * 3) % 30]
                flair = flairs[i % len(flairs)]
                display_name = f"{first} // {flair.split()[0]}"
            elif name_mode == 3:
                # In-Game Alias or Moniker with styled punctuation
                tag = ''.join(word.capitalize() for word in handle.split('_')[:2])
                if arch_id == 7: # Shitposter flair
                    tag += " 💀"
                elif arch_id == 10: # Cozy flair
                    tag += " 🍵" if i % 2 == 0 else " 🌸"
                elif arch_id == 1:
                    tag += f" [{flairs[i % len(flairs)].split()[-1]}]"
                display_name = tag
            else:
                # Academic / Professional / Title Format
                if arch_id in [6, 8]:
                    prefix = "Dr. " if i % 4 == 0 else ""
                else:
                    prefix = ""
                first = (FIRST_NAMES_INT if i % 2 == 0 else FIRST_NAMES_RO)[(i * 9) % 30]
                last = (LAST_NAMES_INT if i % 2 == 0 else LAST_NAMES_RO)[(i * 7) % 30]
                display_name = f"{prefix}{first} {last}"

            # 4. AVATAR STYLE
            # Pick from archetype preferred styles or general avatar styles
            style_idx = (i + arch_id * 3) % len(pref_styles)
            style = pref_styles[style_idx]

            # 5. BIO GENERATION
            bio_base = bio_templates[i % len(bio_templates)]
            # Add minor personal touches to prevent duplicate exact bios across the 100
            if i >= len(bio_templates):
                personal_quips = [
                    " Ping me for configs.", " DMs open.", " Zero telemetry advocate.",
                    " Building in public.", " Always testing new builds.", " ☕ running on dark roast.",
                    " Check pinned post for benchmarks.", " All opinions are my own.",
                    " Mesh node running 24/7.", " Offline first."
                ]
                bio = bio_base + personal_quips[i % len(personal_quips)]
            else:
                bio = bio_base

            # 6. LOCATION
            # 50% Romanian nodes, 50% Global nodes
            loc_idx = (i * 3 + arch_id) % len(LOCATIONS)
            location = LOCATIONS[loc_idx]

            # 7. ROLE
            role = ROLES_DIST[(i * 7 + arch_id * 11) % len(ROLES_DIST)]

            # 8. STATUS
            status = STATUSES_DIST[(i * 13 + arch_id * 5) % len(STATUSES_DIST)]

            # 9. TRUST SCORE (Deterministic 75 to 99)
            # Slightly higher trust for moderators/archivists/guardians
            trust_bonus = 3 if role in ['MODERATOR', 'ARCHIVIST'] else (5 if role == 'GUARDIAN' else 0)
            base_trust = 75 + ((i * 17 + arch_id * 23) % 22)
            trust_score = min(99, max(75, base_trust + trust_bonus))

            # 10. MERIT SCORE (Calculated based on trust, role, and activity level)
            if role == 'GUARDIAN':
                merit_score = 1000 + ((i * 31 + arch_id * 19) % 550) # 1000 - 1549 (GENESIS_GUARDIAN)
            elif role == 'ARCHIVIST':
                merit_score = 550 + ((i * 29 + arch_id * 17) % 400) # 550 - 949 (ARCHON)
            elif role == 'MODERATOR':
                merit_score = 300 + ((i * 23 + arch_id * 13) % 350) # 300 - 649 (SENTINEL / ARCHON)
            else:
                # Regular members distributed across CITIZEN, CONTRIBUTOR, SENTINEL
                tier_roll = (i + arch_id) % 10
                if tier_roll < 3: # Citizen
                    merit_score = 15 + ((i * 7 + arch_id) % 35) # 15 - 49
                elif tier_roll < 7: # Contributor
                    merit_score = 50 + ((i * 19 + arch_id * 7) % 145) # 50 - 194
                else: # Sentinel
                    merit_score = 200 + ((i * 29 + arch_id * 11) % 280) # 200 - 479

            # 11. BADGES
            chosen_badges = list(badge_pool[i % len(badge_pool)])
            # Add node / role flair if special
            if role == 'GUARDIAN':
                chosen_badges.append('Genesis Guardian')
            elif role == 'MODERATOR':
                chosen_badges.append('Sovereign Sentinel')
            elif role == 'ARCHIVIST':
                chosen_badges.append('Protocol Archon')
            
            personas.append((
                user_id,
                display_name,
                handle,
                style,
                bio,
                location,
                role,
                status,
                trust_score,
                merit_score,
                chosen_badges
            ))

    return personas


# ─────────────────────────────────────────────────────────────────────────────
# VALIDATION & VERIFICATION RUNNER
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    personas = generate_personas(20260930)
    
    print(f"================================================================")
    print(f" UREfy 1,000 PERSONAS GENERATION AUDIT & SPECIFICATION")
    print(f"================================================================")
    print(f"Total Personas Generated: {len(personas)}")
    
    # 1. Uniqueness Checks
    user_ids = [p[0] for p in personas]
    handles = [p[2] for p in personas]
    
    assert len(user_ids) == 1000, f"Expected 1000 user_ids, got {len(user_ids)}"
    assert len(set(user_ids)) == 1000, f"Found {1000 - len(set(user_ids))} duplicate user_ids!"
    assert len(set(handles)) == 1000, f"Found {1000 - len(set(handles))} duplicate handles!"
    
    # 2. Handle alphanumeric + underscore regex check
    handle_pattern = re.compile(r'^[a-zA-Z0-9_]+$')
    for h in handles:
        assert handle_pattern.match(h), f"Invalid handle format: {h}"
        
    # 3. Avatar style validation
    for p in personas:
        assert p[3] in AVATAR_STYLES, f"Invalid style {p[3]} in persona {p[2]}"
        
    # 4. Trust score range validation
    for p in personas:
        assert 75 <= p[8] <= 99, f"Trust score {p[8]} out of range [75, 99] for {p[2]}"
        
    # 5. Location validation
    for p in personas:
        assert p[5] in LOCATIONS, f"Unknown location: {p[5]}"

    print("✔ 100% Unique User IDs verified (12-char hex).")
    print("✔ 100% Unique Handles verified (strict alphanumeric + underscores).")
    print("✔ Avatar Styles strictly conform to ['bottts', 'adventurer', 'lorelei', 'pixel-art', 'notionists', 'avataaars'].")
    print("✔ Trust scores strictly within [75, 99].")
    print("✔ Locations conform to Romanian and Global sovereign nodes.")
    print("✔ 10 Archetypes represented (exactly 100 personas per archetype).")
    print("================================================================\n")

    # Archetype breakdown & sample display
    for arch_id, conf in ARCHETYPES_CONFIG.items():
        arch_personas = personas[(arch_id - 1) * 100 : arch_id * 100]
        sample = arch_personas[0]
        print(f"Archetype #{arch_id}: {conf['name']} ({len(arch_personas)} personas)")
        print(f"  Sample Persona:")
        print(f"    - User ID:      {sample[0]}")
        print(f"    - Display Name: {sample[1]}")
        print(f"    - Handle:       @{sample[2]}")
        print(f"    - Style:        {sample[3]}")
        print(f"    - Bio:          {sample[4]}")
        print(f"    - Location:     {sample[5]}")
        print(f"    - Role:         {sample[6]} | Status: {sample[7]}")
        print(f"    - Trust:        {sample[8]} / 99 | Merit: {sample[9]}")
        print(f"    - Badges:       {', '.join(sample[10])}")
        print()

    # Export complete dataset to JSON
    all_personas_data = [
        {
            "user_id": p[0],
            "display_name": p[1],
            "handle": p[2],
            "style": p[3],
            "avatar_url": f"https://api.dicebear.com/7.x/{p[3]}/svg?seed={p[2]}&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827",
            "bio": p[4],
            "location": p[5],
            "role": p[6],
            "status": p[7],
            "trust_score": p[8],
            "merit_score": p[9],
            "badges": p[10]
        }
        for p in personas
    ]
    with open("scripts/personas_1000_complete.json", "w", encoding="utf-8") as f:
        json.dump(all_personas_data, f, indent=2, ensure_ascii=False)
    print("Complete 1,000 personas exported to scripts/personas_1000_complete.json")

    # Generate SQL seed file for user_profiles
    sql_lines = [
        "-- ============================================================================",
        "-- UREfy — SEED 1,000 SOVEREIGN NICKNAMES & GAMING/FOSS PROFILES",
        "-- Target: Cloudflare D1 Database (aetheris-db) / SQLite",
        "-- ============================================================================",
        ""
    ]
    now_ms = 1789797194950
    for p in personas:
        uid, name, hdl, sty, bio, loc, role, st, trust, merit, bgs = p
        avatar = f"https://api.dicebear.com/7.x/{sty}/svg?seed={hdl}&backgroundColor=0f172a,1e1b4b,180a3e,0a192f,111827"
        banner = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80"
        website = f"https://urefy.com/@{hdl}"
        interests = json.dumps(bgs, ensure_ascii=False)
        safe_name = name.replace("'", "''")
        safe_bio = bio.replace("'", "''")
        safe_loc = loc.replace("'", "''")
        
        sql_lines.append(
            f"INSERT OR REPLACE INTO user_profiles ("
            f"user_id, display_name, handle, bio, avatar_url, banner_url, pinned_post_id, interests_json, website, location, created_at, updated_at"
            f") VALUES ("
            f"'{uid}', '{safe_name}', '{hdl}', '{safe_bio}', '{avatar}', '{banner}', NULL, '{interests}', '{website}', '{safe_loc}', {now_ms - 30 * 86400000}, {now_ms}"
            f");"
        )
    with open("scripts/seed_1000_personas.sql", "w", encoding="utf-8") as f:
        f.write("\n".join(sql_lines))
    print("SQL seed script exported to scripts/seed_1000_personas.sql")
