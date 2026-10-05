# UREfy — Publicare de producție, 5 octombrie 2026

## Versiunea publicată

- **Domeniu live**: https://urefy.com
- **Cloudflare Pages**: `aetheris-omni-sphere`, branch de producție `main`
- **Pages Deployment ID**: `ec2956f6` (https://ec2956f6.aetheris-omni-sphere.pages.dev)
- **Commit Git sincronizat**: `203f2b3` (pe `origin/main` https://github.com/0r4atmqetptfjoa-oss/urefy.git)

---

## Modificări Incluse

1. **Conținut Comunitate 100% în Limba Engleză**:
   - **20 Postări Tehnice & Gaming de Top**:
     - Canale: `c/technology`, `c/gaming`, `c/opensource`, `c/privacy-ai`, `c/digitalfreedom`, `pulse-global`.
     - Link-uri externe 100% funcționale și verificate (HTTP 200): HWiNFO, Blur Busters, Arch Linux, Unsloth AI, Pi-hole, WireGuard, Godot Engine, QMK Firmware, Traefik, SQLite, KeePassXC, Yubico, GrapheneOS, Beyerdynamic, Prometheus, Grafana, LazyVim, Podman.
     - Imagini Unsplash reale de înaltă rezoluție (toate verificate HTTP 200).
     - Autori asociați profilurilor reale din `user_profiles` (`FiberWizard`, `DanGaming`, `ArchChad`, `void_pointer`, `AntiTracker`, `GodotTinker`, `SynthDruid`, `RetroPixel`, `SimRigRacer`, `DockerNinja`, `BitFiddler`, `ZeroDay`, `NeovimCult`, `PixelWitch`).
   - **103 Comentarii Threaded în Engleză**:
     - Ierarhie completă părinte-copil, dezbateri detaliate, sfaturi tehnice și merit votes reale.
   - **70 Mesaje de Chat Live în Engleză**:
     - Canale: `pulse-global` (40 mesaje), `relays-general` (20 mesaje), `relays-dev` (10 mesaje).
     - Curățarea integrală a oricăror înregistrări temporare anterioare (`ro_* = 0`).

2. **Corecție Tehnică API Mesaje & Chat**:
   - În `packages/client-ui/functions/api/messages.ts`, la interogarea inițială (`since === null`), API-ul folosește acum un subquery ordonat descrescător cu limită și returnat în ordine cronologică:
     ```sql
     SELECT * FROM (SELECT * FROM messages WHERE ... ORDER BY created_at DESC LIMIT ?) sub ORDER BY created_at ASC
     ```
   - Aceasta rezolvă definitiv problema unde încărcarea inițială a canalului aducea cele mai vechi mesaje din istoric în loc de conversațiile recente active.
   - Test unitar dedicat adăugat în `packages/client-ui/test/messages-sqlite.test.ts`.

---

## Verificări Tehnice de Producție

- **Build de producție**: PASS (`Compiled Worker successfully`, 0 erori).
- **Audit de producție (23 porți)**: 23/23 PASS (`npm run audit:production`).
- **Suita de teste unitare**: 227/227 fișiere trecute, 2.614/2.614 teste trecute (100% green).
- **Rute live verificate**:
  - `https://urefy.com/` (HTTP 200)
  - `https://urefy.com/api/posts?limit=3` (HTTP 200)
  - `https://urefy.com/api/messages?channelId=pulse-global&limit=5` (HTTP 200, returnează cele mai recente mesaje în engleză)
  - `https://urefy.com/api/messages?channelId=relays-general&limit=5` (HTTP 200)
  - `https://ec2956f6.aetheris-omni-sphere.pages.dev/` (HTTP 200)
