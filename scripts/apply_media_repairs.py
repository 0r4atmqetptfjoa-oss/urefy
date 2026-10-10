import json
import subprocess
import time
import uuid

def execute_sql(sql):
    # Escape quotes properly or write to temp file
    temp_file = "scripts/temp_exec.sql"
    with open(temp_file, "w", encoding="utf-8") as f:
        f.write(sql)
    
    cmd = [
        "npx.cmd", "wrangler", "d1", "execute", "aetheris-db", "--remote",
        f"--file={temp_file}"
    ]
    p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, encoding="utf-8", errors="replace", cwd="d:\\proiect site total")
    if p.returncode != 0:
        print("SQL execution error:", p.stderr)
        return False
    print("SQL executed successfully.")
    return True

def generate_id(prefix):
    return f"{prefix}-{uuid.uuid4().hex[:12]}"

def main():
    now_ms = int(time.time() * 1000)
    statements = []

    print("Building repairs for existing defective posts...")

    # 1. FIX DEFECTIVE VIDEOS ON EXISTING POSTS
    # post-video: 120 FPS Zero-Copy PipeWire & Streaming -> replace non-youtube mp4 with working Sunshine/Moonlight streaming setup
    statements.append("""
    UPDATE posts SET 
      video_json = '{"src": "https://www.youtube.com/watch?v=CbCO3NJjIWs", "poster": "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80"}'
    WHERE id = 'post-video';
    """)

    # p-tech-4: Neovim in 100 Seconds -> real working Fireship Neovim video
    statements.append("""
    UPDATE posts SET 
      video_json = '{"src": "https://www.youtube.com/watch?v=c4OyfL5o7DU", "poster": "https://images.unsplash.com/photo-1629654297299-c8506221ca97?auto=format&fit=crop&w=1200&q=80"}'
    WHERE id = 'p-tech-4';
    """)

    # p-hack-2: Computerphile How NOT to Store Passwords -> real working ID 8ZtInClXe1Q
    statements.append("""
    UPDATE posts SET 
      video_json = '{"src": "https://www.youtube.com/watch?v=8ZtInClXe1Q", "poster": "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?auto=format&fit=crop&w=1200&q=80"}'
    WHERE id = 'p-hack-2';
    """)

    # p-game-4: Cyberpunk 2077 Phantom Liberty -> real working official teaser PbVKBoDuhZ0
    statements.append("""
    UPDATE posts SET 
      video_json = '{"src": "https://www.youtube.com/watch?v=PbVKBoDuhZ0", "poster": "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80"}'
    WHERE id = 'p-game-4';
    """)

    # p-tech-8: MKBHD Vision Pro -> real working review video dtp6b76pMak
    statements.append("""
    UPDATE posts SET 
      video_json = '{"src": "https://www.youtube.com/watch?v=dtp6b76pMak", "poster": "https://images.unsplash.com/photo-1592840496694-26d035b52b48?auto=format&fit=crop&w=1200&q=80"}'
    WHERE id = 'p-tech-8';
    """)

    # post-gta6-console-30fps-controversy: Digital Foundry GTA 6 Tech Breakdown 9zVIy_La7nk
    statements.append("""
    UPDATE posts SET 
      video_json = '{"src": "https://www.youtube.com/watch?v=9zVIy_La7nk", "poster": "https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?auto=format&fit=crop&w=1200&q=80"}'
    WHERE id = 'post-gta6-console-30fps-controversy';
    """)

    # post-ps5-pro-price-outrage: Mark Cerny PS5 Pro Technical Presentation X24BzyzQQ-8
    statements.append("""
    UPDATE posts SET 
      video_json = '{"src": "https://www.youtube.com/watch?v=X24BzyzQQ-8", "poster": "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1200&q=80"}'
    WHERE id = 'post-ps5-pro-price-outrage';
    """)

    # post-ps5-pro-pssr-deep-dive: PS5 Pro Technical Presentation X24BzyzQQ-8
    statements.append("""
    UPDATE posts SET 
      video_json = '{"src": "https://www.youtube.com/watch?v=X24BzyzQQ-8", "poster": "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1200&q=80"}'
    WHERE id = 'post-ps5-pro-pssr-deep-dive';
    """)

    # post-12v-2x6-connector-melting-fear: Gamers Nexus 12VHPWR puFaUSTwiis
    statements.append("""
    UPDATE posts SET 
      video_json = '{"src": "https://www.youtube.com/watch?v=puFaUSTwiis", "poster": "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=1200&q=80"}'
    WHERE id = 'post-12v-2x6-connector-melting-fear';
    """)

    # post-blackwell-dlss4-neural-rendering: NVIDIA GTC Keynote Highlights kDd24YOeqQQ
    statements.append("""
    UPDATE posts SET 
      video_json = '{"src": "https://www.youtube.com/watch?v=kDd24YOeqQQ", "poster": "https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=1200&q=80"}'
    WHERE id = 'post-blackwell-dlss4-neural-rendering';
    """)

    # post-switch2-factory-specs-leak: Digital Foundry Switch 2 N0SW7R5H5wY + fix broken image
    statements.append("""
    UPDATE posts SET 
      video_json = '{"src": "https://www.youtube.com/watch?v=N0SW7R5H5wY", "poster": "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?auto=format&fit=crop&w=1200&q=80"}',
      images_json = '["https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80"]'
    WHERE id = 'post-switch2-factory-specs-leak';
    """)

    # post-silksong-switch2-launch-exclusive: fix broken image
    statements.append("""
    UPDATE posts SET 
      images_json = '["https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80"]'
    WHERE id = 'post-silksong-switch2-launch-exclusive';
    """)

    # post-switch2-dlss-docked-4k: Digital Foundry Switch 2 N0SW7R5H5wY
    statements.append("""
    UPDATE posts SET 
      video_json = '{"src": "https://www.youtube.com/watch?v=N0SW7R5H5wY", "poster": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80"}'
    WHERE id = 'post-switch2-dlss-docked-4k';
    """)

    # post-cs2-snap-tap-ban: Valve Banned It fzGVjagkXFc
    statements.append("""
    UPDATE posts SET 
      video_json = '{"src": "https://www.youtube.com/watch?v=fzGVjagkXFc", "poster": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=1200&q=80"}'
    WHERE id = 'post-cs2-snap-tap-ban';
    """)

    # post-deadlock-170k-concurrent: Deadlock Revealed 3ws0d6hCyMo
    statements.append("""
    UPDATE posts SET 
      video_json = '{"src": "https://www.youtube.com/watch?v=3ws0d6hCyMo", "poster": "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80"}'
    WHERE id = 'post-deadlock-170k-concurrent';
    """)

    # post-wukong-20-million-sales-wake-up: Black Myth Wukong Official Trailer uT6RZBz9ueM
    statements.append("""
    UPDATE posts SET 
      video_json = '{"src": "https://www.youtube.com/watch?v=uT6RZBz9ueM", "poster": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80"}'
    WHERE id = 'post-wukong-20-million-sales-wake-up';
    """)

    # post-wukong-vs-shadow-erdtree-combat: Elden Ring Shadow of Erdtree Trailer qLZenOn7WUo
    statements.append("""
    UPDATE posts SET 
      video_json = '{"src": "https://www.youtube.com/watch?v=qLZenOn7WUo", "poster": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80"}'
    WHERE id = 'post-wukong-vs-shadow-erdtree-combat';
    """)

    # post-sam-altman-local-ai-panic: Sam Altman Lex Fridman Podcast L_Guz73e6fw
    statements.append("""
    UPDATE posts SET 
      video_json = '{"src": "https://www.youtube.com/watch?v=L_Guz73e6fw", "poster": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80"}'
    WHERE id = 'post-sam-altman-local-ai-panic';
    """)

    # post-en-gears-of-war-eday-controversy: Gears of War E-Day Official Announce Trailer EC20gLfUHeA
    statements.append("""
    UPDATE posts SET 
      video_json = '{"src": "https://www.youtube.com/watch?v=EC20gLfUHeA", "poster": "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80"}'
    WHERE id = 'post-en-gears-of-war-eday-controversy';
    """)

    # post-en-ps5-jailbreak-etahen-guide: MODDED WARFARE PS5 9.60 Jailbreak _xsmYdW5x5o (replaces Bo Burnham!)
    statements.append("""
    UPDATE posts SET 
      video_json = '{"src": "https://www.youtube.com/watch?v=_xsmYdW5x5o", "poster": "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1200&q=80"}'
    WHERE id = 'post-en-ps5-jailbreak-etahen-guide';
    """)

    # post-gta6-100-dollar-price-tag: Replace Ryzen CPU review with GTA 6 Trailer 1 QdBZY2fkU-0
    statements.append("""
    UPDATE posts SET 
      video_json = '{"src": "https://www.youtube.com/watch?v=QdBZY2fkU-0", "poster": "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1200&q=80"}'
    WHERE id = 'post-gta6-100-dollar-price-tag';
    """)

    # post-rtx-5090-specs-600w-fear: Replace Ryzen CPU review with NVIDIA GTC Keynote Highlights kDd24YOeqQQ
    statements.append("""
    UPDATE posts SET 
      video_json = '{"src": "https://www.youtube.com/watch?v=kDd24YOeqQQ", "poster": "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=1200&q=80"}'
    WHERE id = 'post-rtx-5090-specs-600w-fear';
    """)

    # post-mhwilds-community-fix-guide: Replace Ryzen CPU review with Monster Hunter Wilds Official Reveal Trailer zyoBA0aCRNk
    statements.append("""
    UPDATE posts SET 
      video_json = '{"src": "https://www.youtube.com/watch?v=zyoBA0aCRNk", "poster": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80"}'
    WHERE id = 'post-mhwilds-community-fix-guide';
    """)

    # post-vacnet-3-match-cancellation: Replace Computerphile buffer overflow with Valve CS2 Official Trailer c80dVYcL69E
    statements.append("""
    UPDATE posts SET 
      video_json = '{"src": "https://www.youtube.com/watch?v=c80dVYcL69E", "poster": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80"}'
    WHERE id = 'post-vacnet-3-match-cancellation';
    """)

    # Remove mismatched videos from text/image posts
    statements.append("UPDATE posts SET video_json = NULL WHERE id IN ('post-denuvo-15percent-low-fps-proof', 'post-enterprise-prompt-leaks-cloud-ai', 'post-gog-drm-free-preservation-2026');")

    # 2. FIX ALL 17 TUT-* POSTS (SANITIZE IMAGES_JSON TO URL STRINGS ARRAY & ADD REAL TUTORIAL VIDEOS)
    statements.append("""
    UPDATE posts SET 
      video_json = '{"src": "https://www.youtube.com/watch?v=PHfqGgf-QjA", "poster": "https://images.unsplash.com/photo-1507457379470-08b800bebc67?auto=format&fit=crop&w=1200&q=80"}',
      images_json = '["https://images.unsplash.com/photo-1507457379470-08b800bebc67?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80"]'
    WHERE id = 'tut-ps4-1352-pppwn-goldhen';
    """)

    statements.append("""
    UPDATE posts SET 
      video_json = '{"src": "https://www.youtube.com/watch?v=40SMxe7iVKY", "poster": "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1200&q=80"}',
      images_json = '["https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80"]'
    WHERE id = 'tut-ps5-etahen-60fps-guide';
    """)

    statements.append("""
    UPDATE posts SET 
      video_json = NULL,
      images_json = '["https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?auto=format&fit=crop&w=1200&q=80"]'
    WHERE id = 'tut-switch-oled-picofly-guide';
    """)

    statements.append("""
    UPDATE posts SET 
      video_json = NULL,
      images_json = '["https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80"]'
    WHERE id = 'tut-shadps4-bloodborne-pc-setup';
    """)

    statements.append("""
    UPDATE posts SET 
      video_json = NULL,
      images_json = '["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80"]'
    WHERE id = 'tut-ios-sidestore-zero-revokes';
    """)

    statements.append("""
    UPDATE posts SET 
      video_json = NULL,
      images_json = '["https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80"]'
    WHERE id = 'tut-deepseek-r1-local-gpu';
    """)

    statements.append("""
    UPDATE posts SET 
      video_json = NULL,
      images_json = '["https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1200&q=80"]'
    WHERE id = 'tut-cs2-windows11-latency-tuning';
    """)

    statements.append("""
    UPDATE posts SET 
      video_json = NULL,
      images_json = '["https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?auto=format&fit=crop&w=1200&q=80"]'
    WHERE id = 'tut-bazzite-handheld-dualboot';
    """)

    statements.append("""
    UPDATE posts SET 
      video_json = NULL,
      images_json = '["https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80"]'
    WHERE id = 'tut-re-unity-unreal-games';
    """)

    statements.append("""
    UPDATE posts SET 
      video_json = NULL,
      images_json = '["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=80"]'
    WHERE id = 'tut-android-15-kernelsu-trickystore';
    """)

    statements.append("""
    UPDATE posts SET 
      video_json = NULL,
      images_json = '["https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80"]'
    WHERE id = 'tut-retroarch-crt-megabezel';
    """)

    statements.append("""
    UPDATE posts SET 
      video_json = NULL,
      images_json = '["https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80"]'
    WHERE id = 'tut-truenas-10g-nas-zfs';
    """)

    statements.append("""
    UPDATE posts SET 
      video_json = NULL,
      images_json = '["https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80"]'
    WHERE id = 'tut-rpi5-nvme-unbound-dns';
    """)

    statements.append("""
    UPDATE posts SET 
      video_json = NULL,
      images_json = '["https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80"]'
    WHERE id = 'tut-ddr5-ram-subtimings-oc';
    """)

    statements.append("""
    UPDATE posts SET 
      video_json = NULL,
      images_json = '["https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80"]'
    WHERE id = 'tut-proxmox-gpu-passthrough-sunshine';
    """)

    statements.append("""
    UPDATE posts SET 
      video_json = NULL,
      images_json = '["https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80"]'
    WHERE id = 'tut-ps4-1352-webkitty-deepdive';
    """)

    statements.append("""
    UPDATE posts SET 
      video_json = NULL,
      images_json = '["https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80"]'
    WHERE id = 'tut-esp32-zigbee-home-assistant';
    """)

    statements.append("""
    UPDATE posts SET 
      video_json = NULL,
      images_json = '["https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80"]'
    WHERE id = 'tut-nix-flakes-reproducible-dev';
    """)

    statements.append("""
    UPDATE posts SET 
      video_json = NULL,
      images_json = '["https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80"]'
    WHERE id = 'post-gemini-4-argon-launch-2026';
    """)

    all_repairs_sql = "\n".join(statements)
    print(f"Executing {len(statements)} repair statements...")
    if not execute_sql(all_repairs_sql):
        print("Failed to execute repairs!")
        return
    print("All repairs applied successfully!")

if __name__ == "__main__":
    main()
