INSERT OR REPLACE INTO posts (
            id, channel_id, author_id, author_role, title, content, flair,
            merit_votes, user_voted, reply_count, boost_count,
            attachment_json, video_json, images_json, poll_id, quoted_post_json,
            status, created_at, is_expanded
        ) VALUES (
            'p-seo-n100-homelab',
            'vault-guides',
            '4e198a00b215',
            'MEMBER',
            'Am trecut la Proxmox pe Mini PC Intel N100: 6W consum la priză, 14 containere LXC și TrueNAS pe ZFS. Ghid complet de setup ⚡🖥️',
            'După 4 ani de rulat un server masiv cu Xeon v4 care îmi umfla factura de curent la 180 lei/lună doar pentru idle, am decis să fac pasul către un mini PC fanless cu **Intel N100 (4 cores / 4 threads, Alder Lake-N)**.

Iată concluziile mele reale după 30 de zile de rulare neîntreruptă:

### 1. Hardware & Costuri
- **Mini PC**: Celeron N100, 16GB DDR5 4800MHz (suportă neoficial și 32GB!), 1TB NVMe PCIe 3.0 x4.
- **Porturi de rețea**: 2x Intel i226-V 2.5GbE (esențial pentru separarea rețelei de management de traficul de storage).
- **Consum măsurat la priză (Sonoff POWR3)**:
  - Idle (cu C-States C10 activate în BIOS): **5.8 Watt**
  - Load mediu (Plex transcoding + download torrents): **11.2 Watt**
  - Full load (compilare Docker container): **18.4 Watt**

### 2. Ce rulează acum pe el (14 LXC + 1 VM):
- **TrueNAS Core** (VM cu passthrough la un DAS extern cu 2x Seagate IronWolf 8TB în mirror ZFS)
- **Pi-hole + Unbound** (LXC Debian minimal, consumă 45MB RAM)
- **Home Assistant OS** (LXC cu passthrough la dongle-ul Zigbee Sonoff P)
- **Jellyfin** cu hardware transcoding QuickSync activat (LXC unprivileged, transcodează 4K HDR HEVC -> 1080p cu 4% CPU)
- **Tailscale Subnet Router** (acces de la distanță la toată casa fără niciun port deschis în router)
- **Uptime Kuma & Vaultwarden**

### 3. Sfat critic pentru Proxmox 8 pe N100:
Dacă folosiți plăcile de rețea Intel i226-V, asigurați-vă că instalați kernel-ul PVE `6.8+` și dezactivați EEE (Energy Efficient Ethernet) în `/etc/network/interfaces`, altfel veți avea deconectări aleatorii de 2 secunde la transferuri mari.

Merită 100% dacă vreți un homelab silențios, rece și prietenos cu factura la energie!',
            'HOMELAB & SERVER',
            348,
            0,
            4,
            28,
            NULL, NULL, NULL, NULL, NULL,
            'published',
            1789726800000,
            0
        );
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-n100-homelab', 'homelab', 1789726800000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-n100-homelab', 'proxmox', 1789726800000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-n100-homelab', 'n100', 1789726800000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-n100-homelab', 'truenas', 1789726800000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-n100-homelab', 'zfs', 1789726800000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-n100-homelab', 'selfhosted', 1789726800000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-n100-homelab', 'lowpower', 1789726800000);
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-n100-1',
                'p-seo-n100-homelab',
                NULL,
                '7f8a910c2b44',
                'MEMBER',
                'Super setup! Cum stai cu temperaturile pe NVMe într-o carcasă atât de mică? Eu am testat un Beelink similar și în full write ajungea NVMe-ul la 72°C până i-am lipit un radiator de cupru de 3mm pe el.',
                42,
                1789727700000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-n100-1-78a014-0',
                    'comment',
                    'c-n100-1',
                    '78a014fb9c99',
                    'like',
                    '❤️',
                    1789727730000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-n100-1-22c88f-1',
                    'comment',
                    'c-n100-1',
                    '22c88f01a9df',
                    'reaction',
                    '👍',
                    1789727760000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-n100-1-44df90-2',
                    'comment',
                    'c-n100-1',
                    '44df9012a8bc',
                    'like',
                    '👍',
                    1789727790000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-n100-1-15e092-3',
                    'comment',
                    'c-n100-1',
                    '15e0921ab4c8',
                    'like',
                    '🔥',
                    1789727820000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-n100-1-1c490a-4',
                    'comment',
                    'c-n100-1',
                    '1c490a21fd88',
                    'reaction',
                    '👍',
                    1789727850000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-n100-1-42c90a-5',
                    'comment',
                    'c-n100-1',
                    '42c90a18eb77',
                    'like',
                    '🚀',
                    1789727880000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-n100-1-99df01-6',
                    'comment',
                    'c-n100-1',
                    '99df012aa4c3',
                    'reaction',
                    '❤️',
                    1789727910000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-n100-2',
                'p-seo-n100-homelab',
                'c-n100-1',
                '4e198a00b215',
                'MEMBER',
                '@ArchChad Exact aceeași problemă am avut-o în primele 2 zile! SSD-ul din fabrică era un no-name fierbinte. L-am schimbat cu un Samsung 980 (fără Pro) care stă rece și i-am pus un pad termic Thermalright care face contact direct cu șasiul de aluminiu. Acum stă la 41°C în idle și max 54°C în load prelungit.',
                35,
                1789728600000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-n100-2-66a019-0',
                    'comment',
                    'c-n100-2',
                    '66a0194ebd21',
                    'reaction',
                    '🧠',
                    1789728630000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-n100-2-4b109a-1',
                    'comment',
                    'c-n100-2',
                    '4b109af38c01',
                    'like',
                    '❤️',
                    1789728660000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-n100-2-a89104-2',
                    'comment',
                    'c-n100-2',
                    'a89104fa2211',
                    'like',
                    '👍',
                    1789728690000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-n100-2-3c91a4-3',
                    'comment',
                    'c-n100-2',
                    '3c91a4e082aa',
                    'reaction',
                    '👍',
                    1789728720000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-n100-2-f40019-4',
                    'comment',
                    'c-n100-2',
                    'f40019bc88a2',
                    'reaction',
                    '🚀',
                    1789728750000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-n100-3',
                'p-seo-n100-homelab',
                NULL,
                '29c40ea18df2',
                'MEMBER',
                'Confirm faza cu 32GB RAM! Am pus un modul Crucial DDR5 4800MHz 32GB single-rank și l-a recunoscut instant. Pe ZFS am setat `zfs_arc_max=12884901888` (12GB) și caching-ul e impecabil, ARC hit rate de 94%. N100 e cel mai bun silicon de homelab buget din ultimii 5 ani.',
                68,
                1789729800000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-n100-3-91c24f-0',
                    'comment',
                    'c-n100-3',
                    '91c24fa0e891',
                    'reaction',
                    '🔥',
                    1789729830000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-n100-3-8a31b4-1',
                    'comment',
                    'c-n100-3',
                    '8a31b402ef19',
                    'reaction',
                    '👍',
                    1789729860000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-n100-3-36b014-2',
                    'comment',
                    'c-n100-3',
                    '36b014eaef90',
                    'reaction',
                    '👍',
                    1789729890000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-n100-3-a89104-3',
                    'comment',
                    'c-n100-3',
                    'a89104fa2211',
                    'like',
                    '🚀',
                    1789729920000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-n100-3-8d104f-4',
                    'comment',
                    'c-n100-3',
                    '8d104fb2a901',
                    'reaction',
                    '🔥',
                    1789729950000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-n100-3-aa0194-5',
                    'comment',
                    'c-n100-3',
                    'aa0194f2cd01',
                    'like',
                    '👍',
                    1789729980000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-n100-3-62df09-6',
                    'comment',
                    'c-n100-3',
                    '62df09a14c33',
                    'like',
                    '🧠',
                    1789730010000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-n100-3-c3dc28-7',
                    'comment',
                    'c-n100-3',
                    'c3dc28cb705e',
                    'like',
                    '🔥',
                    1789730040000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-n100-4',
                'p-seo-n100-homelab',
                NULL,
                '62df09a14c33',
                'MEMBER',
                'Foarte bun pontul cu dezactivarea EEE la i226-V! Am pierdut o noapte întreagă anul trecut crezând că am mufat prost un cablu Cat6a pe un switch MikroTik. Era fix negocierea de power saving din driverul igc.',
                29,
                1789731000000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-n100-4-5b2041-0',
                    'comment',
                    'c-n100-4',
                    '5b2041e8d902',
                    'reaction',
                    '❤️',
                    1789731030000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-n100-4-87a01f-1',
                    'comment',
                    'c-n100-4',
                    '87a01fa29cb5',
                    'reaction',
                    '❤️',
                    1789731060000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-n100-4-1c490a-2',
                    'comment',
                    'c-n100-4',
                    '1c490a21fd88',
                    'reaction',
                    '🧠',
                    1789731090000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-n100-4-b2901a-3',
                    'comment',
                    'c-n100-4',
                    'b2901a4fc883',
                    'like',
                    '🔥',
                    1789731120000
                );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-n100-homelab-94df02-0',
                'post',
                'p-seo-n100-homelab',
                '94df0218ab44',
                'bookmark',
                '🔥',
                1789726860000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-n100-homelab-94df02',
                'post',
                'p-seo-n100-homelab',
                '94df0218ab44',
                1,
                1789726860000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-n100-homelab-3db014-1',
                'post',
                'p-seo-n100-homelab',
                '3db014ea9e12',
                'bookmark',
                '🛡️',
                1789726920000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-n100-homelab-3db014',
                'post',
                'p-seo-n100-homelab',
                '3db014ea9e12',
                1,
                1789726920000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-n100-homelab-21f09a-2',
                'post',
                'p-seo-n100-homelab',
                '21f09ab8c401',
                'bookmark',
                '🔥',
                1789726980000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-n100-homelab-21f09a',
                'post',
                'p-seo-n100-homelab',
                '21f09ab8c401',
                1,
                1789726980000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-n100-homelab-44df90-3',
                'post',
                'p-seo-n100-homelab',
                '44df9012a8bc',
                'bookmark',
                '🔥',
                1789727040000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-n100-homelab-44df90',
                'post',
                'p-seo-n100-homelab',
                '44df9012a8bc',
                1,
                1789727040000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-n100-homelab-15e092-4',
                'post',
                'p-seo-n100-homelab',
                '15e0921ab4c8',
                'like',
                '💡',
                1789727100000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-n100-homelab-15e092',
                'post',
                'p-seo-n100-homelab',
                '15e0921ab4c8',
                1,
                1789727100000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-n100-homelab-1c490a-5',
                'post',
                'p-seo-n100-homelab',
                '1c490a21fd88',
                'like',
                '🛡️',
                1789727160000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-n100-homelab-1c490a',
                'post',
                'p-seo-n100-homelab',
                '1c490a21fd88',
                1,
                1789727160000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-n100-homelab-60c801-6',
                'post',
                'p-seo-n100-homelab',
                '60c8012acd78',
                'bookmark',
                '❤️',
                1789727220000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-n100-homelab-60c801',
                'post',
                'p-seo-n100-homelab',
                '60c8012acd78',
                1,
                1789727220000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-n100-homelab-17df89-7',
                'post',
                'p-seo-n100-homelab',
                '17df8902ab55',
                'reaction',
                '❤️',
                1789727280000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-n100-homelab-17df89',
                'post',
                'p-seo-n100-homelab',
                '17df8902ab55',
                1,
                1789727280000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-n100-homelab-35df90-8',
                'post',
                'p-seo-n100-homelab',
                '35df9012a888',
                'bookmark',
                '🧠',
                1789727340000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-n100-homelab-35df90',
                'post',
                'p-seo-n100-homelab',
                '35df9012a888',
                1,
                1789727340000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-n100-homelab-29c40e-9',
                'post',
                'p-seo-n100-homelab',
                '29c40ea18df2',
                'bookmark',
                '👍',
                1789727400000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-n100-homelab-29c40e',
                'post',
                'p-seo-n100-homelab',
                '29c40ea18df2',
                1,
                1789727400000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-n100-homelab-3e901a-10',
                'post',
                'p-seo-n100-homelab',
                '3e901a88fb22',
                'reaction',
                '🚀',
                1789727460000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-n100-homelab-3e901a',
                'post',
                'p-seo-n100-homelab',
                '3e901a88fb22',
                1,
                1789727460000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-n100-homelab-a50091-11',
                'post',
                'p-seo-n100-homelab',
                'a500912fa8cc',
                'like',
                '🧠',
                1789727520000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-n100-homelab-a50091',
                'post',
                'p-seo-n100-homelab',
                'a500912fa8cc',
                1,
                1789727520000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-n100-homelab-6f1084-12',
                'post',
                'p-seo-n100-homelab',
                '6f1084ea2b99',
                'like',
                '👍',
                1789727580000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-n100-homelab-6f1084',
                'post',
                'p-seo-n100-homelab',
                '6f1084ea2b99',
                1,
                1789727580000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-n100-homelab-3a4092-13',
                'post',
                'p-seo-n100-homelab',
                '3a4092bbf102',
                'bookmark',
                '🔥',
                1789727640000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-n100-homelab-3a4092',
                'post',
                'p-seo-n100-homelab',
                '3a4092bbf102',
                1,
                1789727640000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-n100-homelab-c3dc28-14',
                'post',
                'p-seo-n100-homelab',
                'c3dc28cb705e',
                'like',
                '🔥',
                1789727700000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-n100-homelab-c3dc28',
                'post',
                'p-seo-n100-homelab',
                'c3dc28cb705e',
                1,
                1789727700000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-n100-homelab-52e091-15',
                'post',
                'p-seo-n100-homelab',
                '52e091bfa331',
                'reaction',
                '👍',
                1789727760000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-n100-homelab-52e091',
                'post',
                'p-seo-n100-homelab',
                '52e091bfa331',
                1,
                1789727760000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-n100-homelab-83d201-16',
                'post',
                'p-seo-n100-homelab',
                '83d2019fab66',
                'bookmark',
                '🚀',
                1789727820000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-n100-homelab-83d201',
                'post',
                'p-seo-n100-homelab',
                '83d2019fab66',
                1,
                1789727820000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-n100-homelab-7b33a9-17',
                'post',
                'p-seo-n100-homelab',
                '7b33a901ff42',
                'reaction',
                '🛡️',
                1789727880000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-n100-homelab-7b33a9',
                'post',
                'p-seo-n100-homelab',
                '7b33a901ff42',
                1,
                1789727880000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-n100-homelab-92c401-18',
                'post',
                'p-seo-n100-homelab',
                '92c4018fba77',
                'reaction',
                '❤️',
                1789727940000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-n100-homelab-92c401',
                'post',
                'p-seo-n100-homelab',
                '92c4018fba77',
                1,
                1789727940000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-n100-homelab-a30194-19',
                'post',
                'p-seo-n100-homelab',
                'a30194f2de89',
                'bookmark',
                '🧠',
                1789728000000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-n100-homelab-a30194',
                'post',
                'p-seo-n100-homelab',
                'a30194f2de89',
                1,
                1789728000000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-n100-homelab-38df02-20',
                'post',
                'p-seo-n100-homelab',
                '38df02ba91c0',
                'bookmark',
                '🧠',
                1789728060000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-n100-homelab-38df02',
                'post',
                'p-seo-n100-homelab',
                '38df02ba91c0',
                1,
                1789728060000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-n100-homelab-5e019a-21',
                'post',
                'p-seo-n100-homelab',
                '5e019ab28c66',
                'reaction',
                '💡',
                1789728120000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-n100-homelab-5e019a',
                'post',
                'p-seo-n100-homelab',
                '5e019ab28c66',
                1,
                1789728120000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-n100-homelab-19a408-22',
                'post',
                'p-seo-n100-homelab',
                '19a408ebc220',
                'bookmark',
                '🚀',
                1789728180000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-n100-homelab-19a408',
                'post',
                'p-seo-n100-homelab',
                '19a408ebc220',
                1,
                1789728180000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-n100-homelab-5ec401-23',
                'post',
                'p-seo-n100-homelab',
                '5ec4018fba67',
                'bookmark',
                '🚀',
                1789728240000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-n100-homelab-5ec401',
                'post',
                'p-seo-n100-homelab',
                '5ec4018fba67',
                1,
                1789728240000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-n100-homelab-67c801-24',
                'post',
                'p-seo-n100-homelab',
                '67c8012afb90',
                'reaction',
                '🧠',
                1789728300000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-n100-homelab-67c801',
                'post',
                'p-seo-n100-homelab',
                '67c8012afb90',
                1,
                1789728300000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-n100-homelab-56c401-25',
                'post',
                'p-seo-n100-homelab',
                '56c4018ffa45',
                'reaction',
                '🧠',
                1789728360000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-n100-homelab-56c401',
                'post',
                'p-seo-n100-homelab',
                '56c4018ffa45',
                1,
                1789728360000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-n100-homelab-88b401-26',
                'post',
                'p-seo-n100-homelab',
                '88b4012ce9fa',
                'bookmark',
                '🛡️',
                1789728420000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-n100-homelab-88b401',
                'post',
                'p-seo-n100-homelab',
                '88b4012ce9fa',
                1,
                1789728420000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-n100-homelab-b1409e-27',
                'post',
                'p-seo-n100-homelab',
                'b1409ea28c99',
                'bookmark',
                '🚀',
                1789728480000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-n100-homelab-b1409e',
                'post',
                'p-seo-n100-homelab',
                'b1409ea28c99',
                1,
                1789728480000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-n100-homelab-88f019-28',
                'post',
                'p-seo-n100-homelab',
                '88f019ab4c21',
                'bookmark',
                '🛡️',
                1789728540000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-n100-homelab-88f019',
                'post',
                'p-seo-n100-homelab',
                '88f019ab4c21',
                1,
                1789728540000
            );
INSERT OR REPLACE INTO posts (
            id, channel_id, author_id, author_role, title, content, flair,
            merit_votes, user_voted, reply_count, boost_count,
            attachment_json, video_json, images_json, poll_id, quoted_post_json,
            status, created_at, is_expanded
        ) VALUES (
            'p-seo-notion-alternatives',
            'relays-general',
            '11f802ea9bc4',
            'MEMBER',
            'După 3 ani de Notion, am migrat 1.200 de notițe în AppFlowy + Obsidian cu sync P2P criptat. De ce centralizarea cloud nu mai are sens 📚🔒',
            'În 2023 credeam că Notion e paradisul productivității. În 2026 am realizat 3 lucruri dureroase:
1. **Latența**: Deschiderea unei baze de date pe mobil dura între 3 și 6 secunde cu ecran de loading alb.
2. **Proprietatea datelor**: Formatul lor intern este un JSON proprietar masiv. Dacă Notion își schimbă Termenii sau dă faliment, reconstrucția relațiilor e un coșmar.
3. **Confidențialitatea**: Notițele tale personale, ideile de business și jurnalele sunt stocate în plaintext pe serverele altcuiva.

### Ce am ales în schimb:
- **Obsidian pentru knowledge base personal**: Fișiere pure `.md` stocate local pe disc. Căutare instantanee (0ms) prin zeci de mii de fișiere datorită indexării locale.
- **AppFlowy (Self-hosted pe serverul propriu)** pentru tabele kanban și baze de date relaționale stil Notion, dar scrise în Rust + Flutter.
- **Sincronizare P2P**: Zero cloud centralizat. Folosesc protocolul nativ P2P din UREfy + Syncthing cu criptare la capete (E2EE) între desktop, laptop și telefon.

Când nu depinzi de o conexiune activă la internet ca să-ți notezi un gând, viteza mentală se schimbă complet. Cine a mai făcut tranziția spre local-first software?',
            'PRIVACY & PRODUCTIVITY',
            412,
            0,
            5,
            34,
            NULL, NULL, NULL, NULL, NULL,
            'published',
            1789730400000,
            0
        );
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-notion-alternatives', 'notion', 1789730400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-notion-alternatives', 'obsidian', 1789730400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-notion-alternatives', 'appflowy', 1789730400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-notion-alternatives', 'privacy', 1789730400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-notion-alternatives', 'localfirst', 1789730400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-notion-alternatives', 'markdown', 1789730400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-notion-alternatives', 'p2p', 1789730400000);
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-notion-1',
                'p-seo-notion-alternatives',
                NULL,
                '14e92a8819bb',
                'MEMBER',
                'Obsidian cu plugin-ul Dataview și Canvas a înlocuit complet Notion la mine. Am 4.000 de articole salvate și zbor prin ele cu fuzzy finder. Plus că graficul de conexiuni îți arată asocieri la care nu te-ai fi gândit niciodată.',
                51,
                1789731600000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-notion-1-59b04a-0',
                    'comment',
                    'c-notion-1',
                    '59b04a11ee32',
                    'like',
                    '🔥',
                    1789731630000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-notion-1-c0a184-1',
                    'comment',
                    'c-notion-1',
                    'c0a184e912fd',
                    'like',
                    '❤️',
                    1789731660000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-notion-1-19a408-2',
                    'comment',
                    'c-notion-1',
                    '19a408ebc220',
                    'like',
                    '🧠',
                    1789731690000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-notion-1-f40019-3',
                    'comment',
                    'c-notion-1',
                    'f40019bc88a2',
                    'like',
                    '❤️',
                    1789731720000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-notion-1-80c901-4',
                    'comment',
                    'c-notion-1',
                    '80c901afdf23',
                    'reaction',
                    '👍',
                    1789731750000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-notion-1-70a40f-5',
                    'comment',
                    'c-notion-1',
                    '70a40f91b2df',
                    'like',
                    '💡',
                    1789731780000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-notion-2',
                'p-seo-notion-alternatives',
                NULL,
                '3db014ea9e12',
                'MEMBER',
                'Cel mai mare avantaj la Obsidian e că dacă dispare aplicația mâine, ai un folder cu fișiere `.txt` / `.md` pe care le poți deschide cu orice text editor din lume. Asta înseamnă software suveran și durabil.',
                47,
                1789732800000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-notion-2-8a31b4-0',
                    'comment',
                    'c-notion-2',
                    '8a31b402ef19',
                    'like',
                    '🧠',
                    1789732830000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-notion-2-67c801-1',
                    'comment',
                    'c-notion-2',
                    '67c8012afb90',
                    'like',
                    '🧠',
                    1789732860000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-notion-2-59b04a-2',
                    'comment',
                    'c-notion-2',
                    '59b04a11ee32',
                    'like',
                    '🚀',
                    1789732890000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-notion-2-3c91a4-3',
                    'comment',
                    'c-notion-2',
                    '3c91a4e082aa',
                    'reaction',
                    '💡',
                    1789732920000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-notion-2-63c901-4',
                    'comment',
                    'c-notion-2',
                    '63c901afb844',
                    'like',
                    '🔥',
                    1789732950000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-notion-2-99df01-5',
                    'comment',
                    'c-notion-2',
                    '99df012aa4c3',
                    'like',
                    '❤️',
                    1789732980000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-notion-2-21f09a-6',
                    'comment',
                    'c-notion-2',
                    '21f09ab8c401',
                    'like',
                    '🚀',
                    1789733010000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-notion-2-39b014-7',
                    'comment',
                    'c-notion-2',
                    '39b014ea8d34',
                    'reaction',
                    '👍',
                    1789733040000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-notion-3',
                'p-seo-notion-alternatives',
                NULL,
                '52e091bfa331',
                'MEMBER',
                'Ai observat și cât consuma aplicația de desktop de la Notion? 700MB de RAM pentru un wrapper Electron de web. Obsidian consumă sub 150MB, iar un editor nativ de markdown sub 20MB. Nu mai vorbesc de miile de request-uri de telemetrie blocate de Pi-hole.',
                38,
                1789734000000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-notion-3-39b014-0',
                    'comment',
                    'c-notion-3',
                    '39b014ea8d34',
                    'reaction',
                    '🚀',
                    1789734030000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-notion-3-3db014-1',
                    'comment',
                    'c-notion-3',
                    '3db014ea9e12',
                    'like',
                    '🔥',
                    1789734060000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-notion-3-19a408-2',
                    'comment',
                    'c-notion-3',
                    '19a408ebc220',
                    'reaction',
                    '💡',
                    1789734090000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-notion-3-60c801-3',
                    'comment',
                    'c-notion-3',
                    '60c8012acd78',
                    'reaction',
                    '❤️',
                    1789734120000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-notion-3-7f8a91-4',
                    'comment',
                    'c-notion-3',
                    '7f8a910c2b44',
                    'like',
                    '👍',
                    1789734150000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-notion-4',
                'p-seo-notion-alternatives',
                'c-notion-1',
                '2d89b14c99a0',
                'MEMBER',
                'Cum ai rezolvat cu nested tables la export din Notion? Mie mi le-a exportat ca csv-uri separate într-un zip și a trebuit să scriu un script în Python să re-leg linkurile interne.',
                22,
                1789735200000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-notion-4-7b33a9-0',
                    'comment',
                    'c-notion-4',
                    '7b33a901ff42',
                    'like',
                    '🚀',
                    1789735230000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-notion-4-14e92a-1',
                    'comment',
                    'c-notion-4',
                    '14e92a8819bb',
                    'reaction',
                    '👍',
                    1789735260000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-notion-4-7f8a91-2',
                    'comment',
                    'c-notion-4',
                    '7f8a910c2b44',
                    'reaction',
                    '👍',
                    1789735290000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-notion-4-1c490a-3',
                    'comment',
                    'c-notion-4',
                    '1c490a21fd88',
                    'like',
                    '💡',
                    1789735320000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-notion-4-54b09e-4',
                    'comment',
                    'c-notion-4',
                    '54b09ef12a77',
                    'like',
                    '🧠',
                    1789735350000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-notion-5',
                'p-seo-notion-alternatives',
                'c-notion-4',
                '11f802ea9bc4',
                'MEMBER',
                '@NeonCat Am folosit tool-ul open-source `notion-to-obsidian` pe GitHub. Îți păstrează ierarhia de foldere, convertește tabelele în markdown tables curate și transformă `[[page mentions]]` în wikilinks valide automat!',
                61,
                1789736400000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-notion-5-82c901-0',
                    'comment',
                    'c-notion-5',
                    '82c901afcb45',
                    'reaction',
                    '🔥',
                    1789736430000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-notion-5-79c901-1',
                    'comment',
                    'c-notion-5',
                    '79c901affa01',
                    'like',
                    '🧠',
                    1789736460000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-notion-5-9f4a12-2',
                    'comment',
                    'c-notion-5',
                    '9f4a120c8b31',
                    'reaction',
                    '💡',
                    1789736490000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-notion-5-77e102-3',
                    'comment',
                    'c-notion-5',
                    '77e1029ba4c0',
                    'reaction',
                    '🧠',
                    1789736520000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-notion-5-a0914e-4',
                    'comment',
                    'c-notion-5',
                    'a0914e21fc88',
                    'reaction',
                    '👍',
                    1789736550000
                );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-notion-alternatives-4e198a-0',
                'post',
                'p-seo-notion-alternatives',
                '4e198a00b215',
                'bookmark',
                '🧠',
                1789730460000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-notion-alternatives-4e198a',
                'post',
                'p-seo-notion-alternatives',
                '4e198a00b215',
                1,
                1789730460000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-notion-alternatives-66a019-1',
                'post',
                'p-seo-notion-alternatives',
                '66a0194ebd21',
                'reaction',
                '👍',
                1789730520000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-notion-alternatives-66a019',
                'post',
                'p-seo-notion-alternatives',
                '66a0194ebd21',
                1,
                1789730520000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-notion-alternatives-91df90-2',
                'post',
                'p-seo-notion-alternatives',
                '91df9012cb78',
                'reaction',
                '🛡️',
                1789730580000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-notion-alternatives-91df90',
                'post',
                'p-seo-notion-alternatives',
                '91df9012cb78',
                1,
                1789730580000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-notion-alternatives-7c9102-3',
                'post',
                'p-seo-notion-alternatives',
                '7c9102ab84df',
                'reaction',
                '🛡️',
                1789730640000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-notion-alternatives-7c9102',
                'post',
                'p-seo-notion-alternatives',
                '7c9102ab84df',
                1,
                1789730640000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-notion-alternatives-44df90-4',
                'post',
                'p-seo-notion-alternatives',
                '44df9012a8bc',
                'bookmark',
                '👍',
                1789730700000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-notion-alternatives-44df90',
                'post',
                'p-seo-notion-alternatives',
                '44df9012a8bc',
                1,
                1789730700000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-notion-alternatives-54b09e-5',
                'post',
                'p-seo-notion-alternatives',
                '54b09ef12a77',
                'bookmark',
                '🛡️',
                1789730760000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-notion-alternatives-54b09e',
                'post',
                'p-seo-notion-alternatives',
                '54b09ef12a77',
                1,
                1789730760000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-notion-alternatives-82c901-6',
                'post',
                'p-seo-notion-alternatives',
                '82c901afcb45',
                'bookmark',
                '🚀',
                1789730820000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-notion-alternatives-82c901',
                'post',
                'p-seo-notion-alternatives',
                '82c901afcb45',
                1,
                1789730820000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-notion-alternatives-35df90-7',
                'post',
                'p-seo-notion-alternatives',
                '35df9012a888',
                'reaction',
                '👍',
                1789730880000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-notion-alternatives-35df90',
                'post',
                'p-seo-notion-alternatives',
                '35df9012a888',
                1,
                1789730880000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-notion-alternatives-21f09a-8',
                'post',
                'p-seo-notion-alternatives',
                '21f09ab8c401',
                'bookmark',
                '🚀',
                1789730940000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-notion-alternatives-21f09a',
                'post',
                'p-seo-notion-alternatives',
                '21f09ab8c401',
                1,
                1789730940000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-notion-alternatives-9ad090-9',
                'post',
                'p-seo-notion-alternatives',
                '9ad09012ab56',
                'like',
                '🚀',
                1789731000000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-notion-alternatives-9ad090',
                'post',
                'p-seo-notion-alternatives',
                '9ad09012ab56',
                1,
                1789731000000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-notion-alternatives-99df01-10',
                'post',
                'p-seo-notion-alternatives',
                '99df012aa4c3',
                'reaction',
                '🧠',
                1789731060000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-notion-alternatives-99df01',
                'post',
                'p-seo-notion-alternatives',
                '99df012aa4c3',
                1,
                1789731060000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-notion-alternatives-92c401-11',
                'post',
                'p-seo-notion-alternatives',
                '92c4018fba77',
                'like',
                '🛡️',
                1789731120000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-notion-alternatives-92c401',
                'post',
                'p-seo-notion-alternatives',
                '92c4018fba77',
                1,
                1789731120000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-notion-alternatives-78a014-12',
                'post',
                'p-seo-notion-alternatives',
                '78a014fb9c99',
                'like',
                '🛡️',
                1789731180000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-notion-alternatives-78a014',
                'post',
                'p-seo-notion-alternatives',
                '78a014fb9c99',
                1,
                1789731180000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-notion-alternatives-80c901-13',
                'post',
                'p-seo-notion-alternatives',
                '80c901afdf23',
                'reaction',
                '🚀',
                1789731240000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-notion-alternatives-80c901',
                'post',
                'p-seo-notion-alternatives',
                '80c901afdf23',
                1,
                1789731240000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-notion-alternatives-1cf089-14',
                'post',
                'p-seo-notion-alternatives',
                '1cf08912fa12',
                'bookmark',
                '🚀',
                1789731300000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-notion-alternatives-1cf089',
                'post',
                'p-seo-notion-alternatives',
                '1cf08912fa12',
                1,
                1789731300000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-notion-alternatives-3e901a-15',
                'post',
                'p-seo-notion-alternatives',
                '3e901a88fb22',
                'reaction',
                '🚀',
                1789731360000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-notion-alternatives-3e901a',
                'post',
                'p-seo-notion-alternatives',
                '3e901a88fb22',
                1,
                1789731360000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-notion-alternatives-6f1084-16',
                'post',
                'p-seo-notion-alternatives',
                '6f1084ea2b99',
                'bookmark',
                '🛡️',
                1789731420000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-notion-alternatives-6f1084',
                'post',
                'p-seo-notion-alternatives',
                '6f1084ea2b99',
                1,
                1789731420000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-notion-alternatives-b1409e-17',
                'post',
                'p-seo-notion-alternatives',
                'b1409ea28c99',
                'reaction',
                '🛡️',
                1789731480000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-notion-alternatives-b1409e',
                'post',
                'p-seo-notion-alternatives',
                'b1409ea28c99',
                1,
                1789731480000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-notion-alternatives-8a31b4-18',
                'post',
                'p-seo-notion-alternatives',
                '8a31b402ef19',
                'bookmark',
                '❤️',
                1789731540000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-notion-alternatives-8a31b4',
                'post',
                'p-seo-notion-alternatives',
                '8a31b402ef19',
                1,
                1789731540000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-notion-alternatives-4b109a-19',
                'post',
                'p-seo-notion-alternatives',
                '4b109af38c01',
                'bookmark',
                '🔥',
                1789731600000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-notion-alternatives-4b109a',
                'post',
                'p-seo-notion-alternatives',
                '4b109af38c01',
                1,
                1789731600000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-notion-alternatives-1bf089-20',
                'post',
                'p-seo-notion-alternatives',
                '1bf08912ea56',
                'bookmark',
                '🔥',
                1789731660000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-notion-alternatives-1bf089',
                'post',
                'p-seo-notion-alternatives',
                '1bf08912ea56',
                1,
                1789731660000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-notion-alternatives-77e102-21',
                'post',
                'p-seo-notion-alternatives',
                '77e1029ba4c0',
                'bookmark',
                '👍',
                1789731720000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-notion-alternatives-77e102',
                'post',
                'p-seo-notion-alternatives',
                '77e1029ba4c0',
                1,
                1789731720000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-notion-alternatives-64c801-22',
                'post',
                'p-seo-notion-alternatives',
                '64c8012fab12',
                'bookmark',
                '👍',
                1789731780000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-notion-alternatives-64c801',
                'post',
                'p-seo-notion-alternatives',
                '64c8012fab12',
                1,
                1789731780000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-notion-alternatives-14e92a-23',
                'post',
                'p-seo-notion-alternatives',
                '14e92a8819bb',
                'reaction',
                '🔥',
                1789731840000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-notion-alternatives-14e92a',
                'post',
                'p-seo-notion-alternatives',
                '14e92a8819bb',
                1,
                1789731840000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-notion-alternatives-63c901-24',
                'post',
                'p-seo-notion-alternatives',
                '63c901afb844',
                'bookmark',
                '🔥',
                1789731900000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-notion-alternatives-63c901',
                'post',
                'p-seo-notion-alternatives',
                '63c901afb844',
                1,
                1789731900000
            );
INSERT OR REPLACE INTO posts (
            id, channel_id, author_id, author_role, title, content, flair,
            merit_votes, user_voted, reply_count, boost_count,
            attachment_json, video_json, images_json, poll_id, quoted_post_json,
            status, created_at, is_expanded
        ) VALUES (
            'p-seo-gpu-benchmark-2026',
            'relays-general',
            '8a31b402ef19',
            'MEMBER',
            'Ce placă video chiar merită cumpărată în 2026? RTX 4070 Super vs RX 7800 XT vs piața second-hand după 1 an de teste reale 🎮🔥',
            'Primesc săptămânal întrebarea: *„Am un buget de 2.500 - 3.500 lei, ce placă video să iau pentru 1440p gaming și eventual niște AI local?”*

Am testat ambele tabere timp de 12 luni în condiții reale de gaming și lucru. Iată concluziile fără sponsorizări:

### 1. RTX 4070 Super (12GB VRAM)
- **Plusuri**: DLSS 3.7 Transformer este la ani lumină distanță de orice alt upscaler. În jocuri grele cu Path Tracing (Cyberpunk 2077, Alan Wake 2, Black Myth Wukong), NVIDIA domină clar. Consum excelent (max 220W). Suport nativ impecabil pentru CUDA / PyTorch / Ollama.
- **Minusuri**: Cei 12GB VRAM încep să fie la limită la texturi Ultra 1440p în jocurile din 2026. În Monster Hunter Wilds, alocarea de memorie video trece lejer de 11.5GB.

### 2. AMD Radeon RX 7800 XT (16GB VRAM)
- **Plusuri**: 16GB VRAM oferă liniște sufletească pentru următorii 4 ani. În raster pur (fără Ray Tracing), este adesea cu 5-10% mai rapidă decât 4070 Super și costă cu ~400-500 lei mai puțin. Drivere open-source pe Linux (Mesa) out of the box fără bătăi de cap cu proprietăți DKMS.
- **Minusuri**: FSR 3.1 are ghosting vizibil în mișcare rapidă comparat cu DLSS. Consumă mai mult la priză (~260W).

### 3. Alternativa Second-Hand: RTX 3080 10GB / 3090 24GB
Dacă găsiți un **RTX 3090 la 3.000 - 3.200 lei**, pentru oricine vrea să ruleze LLM-uri mari (70B quantizat sau 32B FP16) local, este **cea mai bună investiție posibilă**. Nimic în clasa nouă sub 6.000 lei nu vă oferă 24GB VRAM!

Voi ce ați alege azi pentru un build curat de 1440p?',
            'HARDWARE BENCHMARK',
            520,
            0,
            5,
            45,
            NULL, NULL, NULL, NULL, NULL,
            'published',
            1789734000000,
            0
        );
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-gpu-benchmark-2026', 'gpu', 1789734000000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-gpu-benchmark-2026', 'rtx4070', 1789734000000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-gpu-benchmark-2026', 'rx7800xt', 1789734000000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-gpu-benchmark-2026', 'gaming', 1789734000000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-gpu-benchmark-2026', 'benchmark', 1789734000000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-gpu-benchmark-2026', 'hardware', 1789734000000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-gpu-benchmark-2026', 'rtx3090', 1789734000000);
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-gpu-1',
                'p-seo-gpu-benchmark-2026',
                NULL,
                'b1409ea28c99',
                'GUARDIAN',
                'Ca om care rulează zilnic modele locale: dacă ai chiar și 1% intenție să folosești LLM-uri sau Stable Diffusion, 12GB VRAM este o fundătură. Cu 24GB pe 3090 poți rula Qwen 2.5 Coder 32B Q4 complet în VRAM la 45 tokens/secundă. Pe 12GB ești limitat la modele de 7B sau 14B foarte comprimate.',
                84,
                1789735200000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-gpu-1-8a31b4-0',
                    'comment',
                    'c-gpu-1',
                    '8a31b402ef19',
                    'like',
                    '❤️',
                    1789735230000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-gpu-1-1bf089-1',
                    'comment',
                    'c-gpu-1',
                    '1bf08912ea56',
                    'like',
                    '🚀',
                    1789735260000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-gpu-1-2a9104-2',
                    'comment',
                    'c-gpu-1',
                    '2a9104eb8c33',
                    'like',
                    '🚀',
                    1789735290000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-gpu-1-67c801-3',
                    'comment',
                    'c-gpu-1',
                    '67c8012afb90',
                    'like',
                    '👍',
                    1789735320000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-gpu-2',
                'p-seo-gpu-benchmark-2026',
                NULL,
                '7f8a910c2b44',
                'MEMBER',
                'Pe Linux, experiența cu AMD (Mesa / RADV) e ca o gură de aer proaspăt. Zero screen tearing pe Wayland, suspend/resume funcționează perfect pe kernel 6.10. La NVIDIA încă mai prinzi mici artefacte când ieși din standby pe anumite monitoare 240Hz.',
                49,
                1789736400000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-gpu-2-a410ef-0',
                    'comment',
                    'c-gpu-2',
                    'a410ef89b231',
                    'like',
                    '🧠',
                    1789736430000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-gpu-2-bf0194-1',
                    'comment',
                    'c-gpu-2',
                    'bf0194a28cc1',
                    'reaction',
                    '❤️',
                    1789736460000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-gpu-2-4d89a0-2',
                    'comment',
                    'c-gpu-2',
                    '4d89a01fbb23',
                    'like',
                    '👍',
                    1789736490000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-gpu-2-a30194-3',
                    'comment',
                    'c-gpu-2',
                    'a30194f2de89',
                    'reaction',
                    '💡',
                    1789736520000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-gpu-2-5ec401-4',
                    'comment',
                    'c-gpu-2',
                    '5ec4018fba67',
                    'reaction',
                    '🧠',
                    1789736550000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-gpu-2-1cf089-5',
                    'comment',
                    'c-gpu-2',
                    '1cf08912fa12',
                    'reaction',
                    '👍',
                    1789736580000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-gpu-2-79c901-6',
                    'comment',
                    'c-gpu-2',
                    '79c901affa01',
                    'reaction',
                    '👍',
                    1789736610000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-gpu-3',
                'p-seo-gpu-benchmark-2026',
                NULL,
                '54b09ef12a77',
                'MEMBER',
                'Pentru shooter-e competitive (CS2, Valorant, Quake) unde joci la 240Hz sau 360Hz, NVIDIA Reflex este încă imbatabil. Latency-ul total de sistem scade cu vreo 3-4ms comparat cu Anti-Lag de la Radeon. Pentru esports pur, 4070 Super e alegerea firească.',
                36,
                1789737600000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-gpu-3-78a014-0',
                    'comment',
                    'c-gpu-3',
                    '78a014fb9c99',
                    'reaction',
                    '🚀',
                    1789737630000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-gpu-3-9ad090-1',
                    'comment',
                    'c-gpu-3',
                    '9ad09012ab56',
                    'reaction',
                    '🧠',
                    1789737660000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-gpu-3-3db014-2',
                    'comment',
                    'c-gpu-3',
                    '3db014ea9e12',
                    'reaction',
                    '🚀',
                    1789737690000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-gpu-3-b2901a-3',
                    'comment',
                    'c-gpu-3',
                    'b2901a4fc883',
                    'like',
                    '🔥',
                    1789737720000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-gpu-3-31f90a-4',
                    'comment',
                    'c-gpu-3',
                    '31f90a44ec12',
                    'reaction',
                    '🔥',
                    1789737750000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-gpu-3-15e092-5',
                    'comment',
                    'c-gpu-3',
                    '15e0921ab4c8',
                    'reaction',
                    '💡',
                    1789737780000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-gpu-3-82c901-6',
                    'comment',
                    'c-gpu-3',
                    '82c901afcb45',
                    'reaction',
                    '💡',
                    1789737810000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-gpu-3-66a019-7',
                    'comment',
                    'c-gpu-3',
                    '66a0194ebd21',
                    'reaction',
                    '💡',
                    1789737840000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-gpu-4',
                'p-seo-gpu-benchmark-2026',
                'c-gpu-1',
                '15e0921ab4c8',
                'MEMBER',
                'Oricine își ia RTX 3090 second-hand: **schimbați obligatoriu thermal pad-urile pe VRAM-ul de pe spatele plăcii**. GDDR6X pe spatele PCB-ului atinge 105°C în 10 minute de stress test fără un backplate ventilat activ.',
                72,
                1789738800000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-gpu-4-5e019a-0',
                    'comment',
                    'c-gpu-4',
                    '5e019ab28c66',
                    'reaction',
                    '❤️',
                    1789738830000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-gpu-4-60c801-1',
                    'comment',
                    'c-gpu-4',
                    '60c8012acd78',
                    'like',
                    '🚀',
                    1789738860000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-gpu-4-62df09-2',
                    'comment',
                    'c-gpu-4',
                    '62df09a14c33',
                    'like',
                    '👍',
                    1789738890000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-gpu-4-1cf089-3',
                    'comment',
                    'c-gpu-4',
                    '1cf08912fa12',
                    'like',
                    '🔥',
                    1789738920000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-gpu-4-88f019-4',
                    'comment',
                    'c-gpu-4',
                    '88f019ab4c21',
                    'reaction',
                    '💡',
                    1789738950000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-gpu-5',
                'p-seo-gpu-benchmark-2026',
                'c-gpu-4',
                '8a31b402ef19',
                'MEMBER',
                '@VulkanWizard Aur curat sfatul ăsta! Gelid GP-Ultimate de 1.5mm pe backplate mi-au coborât temperaturile la memorie de la 102°C la 82°C pe un 3090 FE.',
                40,
                1789740000000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-gpu-5-6d88f1-0',
                    'comment',
                    'c-gpu-5',
                    '6d88f12a04cb',
                    'like',
                    '❤️',
                    1789740030000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-gpu-5-5ec401-1',
                    'comment',
                    'c-gpu-5',
                    '5ec4018fba67',
                    'reaction',
                    '🔥',
                    1789740060000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-gpu-5-88f019-2',
                    'comment',
                    'c-gpu-5',
                    '88f019ab4c21',
                    'like',
                    '❤️',
                    1789740090000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-gpu-5-4e198a-3',
                    'comment',
                    'c-gpu-5',
                    '4e198a00b215',
                    'reaction',
                    '🔥',
                    1789740120000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-gpu-5-b2901a-4',
                    'comment',
                    'c-gpu-5',
                    'b2901a4fc883',
                    'like',
                    '🚀',
                    1789740150000
                );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-gpu-benchmark-2026-29c40e-0',
                'post',
                'p-seo-gpu-benchmark-2026',
                '29c40ea18df2',
                'like',
                '🛡️',
                1789734060000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-gpu-benchmark-2026-29c40e',
                'post',
                'p-seo-gpu-benchmark-2026',
                '29c40ea18df2',
                1,
                1789734060000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-gpu-benchmark-2026-1bf089-2',
                'post',
                'p-seo-gpu-benchmark-2026',
                '1bf08912ea56',
                'like',
                '🔥',
                1789734180000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-gpu-benchmark-2026-1bf089',
                'post',
                'p-seo-gpu-benchmark-2026',
                '1bf08912ea56',
                1,
                1789734180000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-gpu-benchmark-2026-bf0194-3',
                'post',
                'p-seo-gpu-benchmark-2026',
                'bf0194a28cc1',
                'reaction',
                '💡',
                1789734240000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-gpu-benchmark-2026-bf0194',
                'post',
                'p-seo-gpu-benchmark-2026',
                'bf0194a28cc1',
                1,
                1789734240000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-gpu-benchmark-2026-4e198a-4',
                'post',
                'p-seo-gpu-benchmark-2026',
                '4e198a00b215',
                'bookmark',
                '🛡️',
                1789734300000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-gpu-benchmark-2026-4e198a',
                'post',
                'p-seo-gpu-benchmark-2026',
                '4e198a00b215',
                1,
                1789734300000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-gpu-benchmark-2026-64c801-5',
                'post',
                'p-seo-gpu-benchmark-2026',
                '64c8012fab12',
                'like',
                '🧠',
                1789734360000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-gpu-benchmark-2026-64c801',
                'post',
                'p-seo-gpu-benchmark-2026',
                '64c8012fab12',
                1,
                1789734360000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-gpu-benchmark-2026-87a01f-6',
                'post',
                'p-seo-gpu-benchmark-2026',
                '87a01fa29cb5',
                'bookmark',
                '🚀',
                1789734420000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-gpu-benchmark-2026-87a01f',
                'post',
                'p-seo-gpu-benchmark-2026',
                '87a01fa29cb5',
                1,
                1789734420000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-gpu-benchmark-2026-6d88f1-7',
                'post',
                'p-seo-gpu-benchmark-2026',
                '6d88f12a04cb',
                'bookmark',
                '💡',
                1789734480000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-gpu-benchmark-2026-6d88f1',
                'post',
                'p-seo-gpu-benchmark-2026',
                '6d88f12a04cb',
                1,
                1789734480000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-gpu-benchmark-2026-3e901a-8',
                'post',
                'p-seo-gpu-benchmark-2026',
                '3e901a88fb22',
                'like',
                '❤️',
                1789734540000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-gpu-benchmark-2026-3e901a',
                'post',
                'p-seo-gpu-benchmark-2026',
                '3e901a88fb22',
                1,
                1789734540000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-gpu-benchmark-2026-1cf089-9',
                'post',
                'p-seo-gpu-benchmark-2026',
                '1cf08912fa12',
                'bookmark',
                '💡',
                1789734600000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-gpu-benchmark-2026-1cf089',
                'post',
                'p-seo-gpu-benchmark-2026',
                '1cf08912fa12',
                1,
                1789734600000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-gpu-benchmark-2026-a30194-10',
                'post',
                'p-seo-gpu-benchmark-2026',
                'a30194f2de89',
                'bookmark',
                '🔥',
                1789734660000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-gpu-benchmark-2026-a30194',
                'post',
                'p-seo-gpu-benchmark-2026',
                'a30194f2de89',
                1,
                1789734660000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-gpu-benchmark-2026-3a4092-11',
                'post',
                'p-seo-gpu-benchmark-2026',
                '3a4092bbf102',
                'like',
                '❤️',
                1789734720000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-gpu-benchmark-2026-3a4092',
                'post',
                'p-seo-gpu-benchmark-2026',
                '3a4092bbf102',
                1,
                1789734720000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-gpu-benchmark-2026-67c801-12',
                'post',
                'p-seo-gpu-benchmark-2026',
                '67c8012afb90',
                'reaction',
                '💡',
                1789734780000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-gpu-benchmark-2026-67c801',
                'post',
                'p-seo-gpu-benchmark-2026',
                '67c8012afb90',
                1,
                1789734780000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-gpu-benchmark-2026-a0914e-13',
                'post',
                'p-seo-gpu-benchmark-2026',
                'a0914e21fc88',
                'reaction',
                '🧠',
                1789734840000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-gpu-benchmark-2026-a0914e',
                'post',
                'p-seo-gpu-benchmark-2026',
                'a0914e21fc88',
                1,
                1789734840000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-gpu-benchmark-2026-6f1084-14',
                'post',
                'p-seo-gpu-benchmark-2026',
                '6f1084ea2b99',
                'bookmark',
                '💡',
                1789734900000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-gpu-benchmark-2026-6f1084',
                'post',
                'p-seo-gpu-benchmark-2026',
                '6f1084ea2b99',
                1,
                1789734900000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-gpu-benchmark-2026-2da014-15',
                'post',
                'p-seo-gpu-benchmark-2026',
                '2da014f9bc67',
                'like',
                '🔥',
                1789734960000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-gpu-benchmark-2026-2da014',
                'post',
                'p-seo-gpu-benchmark-2026',
                '2da014f9bc67',
                1,
                1789734960000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-gpu-benchmark-2026-22c88f-16',
                'post',
                'p-seo-gpu-benchmark-2026',
                '22c88f01a9df',
                'like',
                '🧠',
                1789735020000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-gpu-benchmark-2026-22c88f',
                'post',
                'p-seo-gpu-benchmark-2026',
                '22c88f01a9df',
                1,
                1789735020000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-gpu-benchmark-2026-62df09-17',
                'post',
                'p-seo-gpu-benchmark-2026',
                '62df09a14c33',
                'reaction',
                '❤️',
                1789735080000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-gpu-benchmark-2026-62df09',
                'post',
                'p-seo-gpu-benchmark-2026',
                '62df09a14c33',
                1,
                1789735080000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-gpu-benchmark-2026-42c90a-18',
                'post',
                'p-seo-gpu-benchmark-2026',
                '42c90a18eb77',
                'reaction',
                '🚀',
                1789735140000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-gpu-benchmark-2026-42c90a',
                'post',
                'p-seo-gpu-benchmark-2026',
                '42c90a18eb77',
                1,
                1789735140000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-gpu-benchmark-2026-11f802-19',
                'post',
                'p-seo-gpu-benchmark-2026',
                '11f802ea9bc4',
                'like',
                '🔥',
                1789735200000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-gpu-benchmark-2026-11f802',
                'post',
                'p-seo-gpu-benchmark-2026',
                '11f802ea9bc4',
                1,
                1789735200000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-gpu-benchmark-2026-91c24f-20',
                'post',
                'p-seo-gpu-benchmark-2026',
                '91c24fa0e891',
                'reaction',
                '💡',
                1789735260000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-gpu-benchmark-2026-91c24f',
                'post',
                'p-seo-gpu-benchmark-2026',
                '91c24fa0e891',
                1,
                1789735260000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-gpu-benchmark-2026-44df90-21',
                'post',
                'p-seo-gpu-benchmark-2026',
                '44df9012a8bc',
                'bookmark',
                '🛡️',
                1789735320000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-gpu-benchmark-2026-44df90',
                'post',
                'p-seo-gpu-benchmark-2026',
                '44df9012a8bc',
                1,
                1789735320000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-gpu-benchmark-2026-15e092-22',
                'post',
                'p-seo-gpu-benchmark-2026',
                '15e0921ab4c8',
                'bookmark',
                '💡',
                1789735380000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-gpu-benchmark-2026-15e092',
                'post',
                'p-seo-gpu-benchmark-2026',
                '15e0921ab4c8',
                1,
                1789735380000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-gpu-benchmark-2026-82c901-23',
                'post',
                'p-seo-gpu-benchmark-2026',
                '82c901afcb45',
                'bookmark',
                '💡',
                1789735440000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-gpu-benchmark-2026-82c901',
                'post',
                'p-seo-gpu-benchmark-2026',
                '82c901afcb45',
                1,
                1789735440000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-gpu-benchmark-2026-66a019-24',
                'post',
                'p-seo-gpu-benchmark-2026',
                '66a0194ebd21',
                'bookmark',
                '🛡️',
                1789735500000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-gpu-benchmark-2026-66a019',
                'post',
                'p-seo-gpu-benchmark-2026',
                '66a0194ebd21',
                1,
                1789735500000
            );
INSERT OR REPLACE INTO posts (
            id, channel_id, author_id, author_role, title, content, flair,
            merit_votes, user_voted, reply_count, boost_count,
            attachment_json, video_json, images_json, poll_id, quoted_post_json,
            status, created_at, is_expanded
        ) VALUES (
            'p-seo-linux-hardening',
            'vault-guides',
            '9f4a120c8b31',
            'MODERATOR',
            'Checklist practic de securitate pentru un server Linux nou expus în internet: SSH pe hardware YubiKey, UFW, CrowdSec și audit Lynis 🛡️🐧',
            'Dacă ai un VPS pe Hetzner, DigitalOcean sau un IP public dedicat acasă, în primele 10 minute de la pornire vei vedea în `journalctl` sute de încercări de login pe portul 22 din botnet-uri automate.

Iată checklist-ul meu de producție pe care îl aplic pe orice server Debian/Ubuntu înainte să pun vreun serviciu live:

### 1. SSH Hardening Fără Parole (Zero Password Auth)
Renunțați complet la parole pentru SSH. Generați chei criptografice legate hardware (FIDO2 / U2F) dacă aveți un YubiKey:
```bash
ssh-keygen -t ed25519-sk -O resident -O verify-required -C "admin-hardware-key"
```
În `/etc/ssh/sshd_config.d/99-hardened.conf`:
```
PermitRootLogin prohibit-password
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
X11Forwarding no
MaxAuthTries 3
```

### 2. Înlocuiți Fail2Ban cu CrowdSec
Fail2Ban e ok, dar e reactiv și izolat. **CrowdSec** acționează ca un firewall colaborativ: când un IP încearcă exploit-uri pe mii de alte servere din lume, serverul tău îl blochează *înainte* să trimită primul pachet malițios la tine.
Instalare în 1 minut:
```bash
curl -s https://packagecloud.io/install/repositories/crowdsecurity/crowdsec/script.deb.sh | sudo bash
sudo apt install crowdsec crowdsec-firewall-bouncer-iptables
```

### 3. Kernel Sysctl Tweaks împotriva atacurilor de rețea
În `/etc/sysctl.d/99-security.conf`:
```
net.ipv4.tcp_syncookies = 1
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.all.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
```

### 4. Audit cu Lynis
Rulați `lynis audit system`. Dacă scorul de hardening e sub 75, aplicați recomandările afișate în raport.

Cine folosește deja port knocking sau WireGuard jump-hosts pentru management?',
            'CYBER SECURITY',
            485,
            0,
            4,
            39,
            NULL, NULL, NULL, NULL, NULL,
            'published',
            1789737600000,
            0
        );
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-linux-hardening', 'linux', 1789737600000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-linux-hardening', 'security', 1789737600000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-linux-hardening', 'ssh', 1789737600000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-linux-hardening', 'yubikey', 1789737600000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-linux-hardening', 'crowdsec', 1789737600000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-linux-hardening', 'sysadmin', 1789737600000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-linux-hardening', 'cybersec', 1789737600000);
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-sec-1',
                'p-seo-linux-hardening',
                NULL,
                '6d88f12a04cb',
                'MEMBER',
                'Recomand cu căldură și activarea modulului `auditd` pentru monitorizarea executabilelor din `/tmp` și `/dev/shm`. Mulți atacatori descarcă shell-uri ELF direct în `/tmp` crezând că sysadminul nu are montat `/tmp` cu opțiunea `noexec`.',
                58,
                1789738800000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-sec-1-c3dc28-0',
                    'comment',
                    'c-sec-1',
                    'c3dc28cb705e',
                    'like',
                    '💡',
                    1789738830000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-sec-1-3a4092-1',
                    'comment',
                    'c-sec-1',
                    '3a4092bbf102',
                    'like',
                    '🧠',
                    1789738860000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-sec-1-63c901-2',
                    'comment',
                    'c-sec-1',
                    '63c901afb844',
                    'reaction',
                    '🧠',
                    1789738890000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-sec-1-7b33a9-3',
                    'comment',
                    'c-sec-1',
                    '7b33a901ff42',
                    'like',
                    '👍',
                    1789738920000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-sec-1-1cf089-4',
                    'comment',
                    'c-sec-1',
                    '1cf08912fa12',
                    'reaction',
                    '🚀',
                    1789738950000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-sec-1-13f089-5',
                    'comment',
                    'c-sec-1',
                    '13f08912ef34',
                    'like',
                    '👍',
                    1789738980000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-sec-1-44df90-6',
                    'comment',
                    'c-sec-1',
                    '44df9012a8bc',
                    'like',
                    '🔥',
                    1789739010000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-sec-2',
                'p-seo-linux-hardening',
                NULL,
                '4e198a00b215',
                'MEMBER',
                'Atenție mare dacă folosiți Docker împreună cu UFW! Docker ocolește regulile normale de iptables și publică porturile direct în internet chiar dacă UFW zice `deny`. Trebuie neapărat adăugată directiva `"iptables": false` în `/etc/docker/daemon.json` sau folosit lanțul `DOCKER-USER`.',
                92,
                1789740000000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-sec-2-78a014-0',
                    'comment',
                    'c-sec-2',
                    '78a014fb9c99',
                    'reaction',
                    '👍',
                    1789740030000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-sec-2-3a4092-1',
                    'comment',
                    'c-sec-2',
                    '3a4092bbf102',
                    'reaction',
                    '❤️',
                    1789740060000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-sec-2-17df89-3',
                    'comment',
                    'c-sec-2',
                    '17df8902ab55',
                    'like',
                    '👍',
                    1789740120000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-sec-2-c0a184-4',
                    'comment',
                    'c-sec-2',
                    'c0a184e912fd',
                    'reaction',
                    '👍',
                    1789740150000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-sec-2-1cf089-5',
                    'comment',
                    'c-sec-2',
                    '1cf08912fa12',
                    'like',
                    '❤️',
                    1789740180000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-sec-2-59b04a-6',
                    'comment',
                    'c-sec-2',
                    '59b04a11ee32',
                    'reaction',
                    '👍',
                    1789740210000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-sec-2-64c801-7',
                    'comment',
                    'c-sec-2',
                    '64c8012fab12',
                    'reaction',
                    '🚀',
                    1789740240000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-sec-3',
                'p-seo-linux-hardening',
                'c-sec-2',
                '9f4a120c8b31',
                'MODERATOR',
                '@DockerNinja Fix din cauza asta am trecut la Podman pe toate nodurile de producție. Podman rootless nu atinge deloc iptables-ul sistemului și respectă firewall-ul nativ 100%.',
                44,
                1789741200000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-sec-3-70a40f-0',
                    'comment',
                    'c-sec-3',
                    '70a40f91b2df',
                    'reaction',
                    '🚀',
                    1789741230000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-sec-3-83d201-1',
                    'comment',
                    'c-sec-3',
                    '83d2019fab66',
                    'reaction',
                    '💡',
                    1789741260000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-sec-3-8d104f-2',
                    'comment',
                    'c-sec-3',
                    '8d104fb2a901',
                    'like',
                    '👍',
                    1789741290000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-sec-3-77e102-3',
                    'comment',
                    'c-sec-3',
                    '77e1029ba4c0',
                    'like',
                    '👍',
                    1789741320000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-sec-3-88f019-4',
                    'comment',
                    'c-sec-3',
                    '88f019ab4c21',
                    'like',
                    '🔥',
                    1789741350000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-sec-3-80c901-5',
                    'comment',
                    'c-sec-3',
                    '80c901afdf23',
                    'reaction',
                    '💡',
                    1789741380000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-sec-3-7f8a91-6',
                    'comment',
                    'c-sec-3',
                    '7f8a910c2b44',
                    'like',
                    '🚀',
                    1789741410000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-sec-4',
                'p-seo-linux-hardening',
                NULL,
                '3a4092bbf102',
                'MODERATOR',
                'La nivel de legislație europeană (NIS2), astfel de măsuri de bază (autentificare cu factor hardware pe SSH, jurnale imutabile, firewall restrictiv) devin obligatorii pentru orice entitate care gestionează infrastructuri esențiale.',
                37,
                1789742400000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-sec-4-42c90a-0',
                    'comment',
                    'c-sec-4',
                    '42c90a18eb77',
                    'like',
                    '💡',
                    1789742430000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-sec-4-a50091-1',
                    'comment',
                    'c-sec-4',
                    'a500912fa8cc',
                    'like',
                    '🔥',
                    1789742460000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-sec-4-5e019a-2',
                    'comment',
                    'c-sec-4',
                    '5e019ab28c66',
                    'like',
                    '🔥',
                    1789742490000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-sec-4-35df90-3',
                    'comment',
                    'c-sec-4',
                    '35df9012a888',
                    'like',
                    '💡',
                    1789742520000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-sec-4-94df02-4',
                    'comment',
                    'c-sec-4',
                    '94df0218ab44',
                    'reaction',
                    '❤️',
                    1789742550000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-sec-4-f40019-5',
                    'comment',
                    'c-sec-4',
                    'f40019bc88a2',
                    'like',
                    '❤️',
                    1789742580000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-sec-4-19a408-6',
                    'comment',
                    'c-sec-4',
                    '19a408ebc220',
                    'like',
                    '💡',
                    1789742610000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-sec-4-88b401-7',
                    'comment',
                    'c-sec-4',
                    '88b4012ce9fa',
                    'like',
                    '❤️',
                    1789742640000
                );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-linux-hardening-3db014-0',
                'post',
                'p-seo-linux-hardening',
                '3db014ea9e12',
                'reaction',
                '🧠',
                1789737660000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-linux-hardening-3db014',
                'post',
                'p-seo-linux-hardening',
                '3db014ea9e12',
                1,
                1789737660000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-linux-hardening-88b401-1',
                'post',
                'p-seo-linux-hardening',
                '88b4012ce9fa',
                'like',
                '🧠',
                1789737720000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-linux-hardening-88b401',
                'post',
                'p-seo-linux-hardening',
                '88b4012ce9fa',
                1,
                1789737720000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-linux-hardening-39b014-2',
                'post',
                'p-seo-linux-hardening',
                '39b014ea8d34',
                'like',
                '💡',
                1789737780000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-linux-hardening-39b014',
                'post',
                'p-seo-linux-hardening',
                '39b014ea8d34',
                1,
                1789737780000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-linux-hardening-3a4092-3',
                'post',
                'p-seo-linux-hardening',
                '3a4092bbf102',
                'reaction',
                '🧠',
                1789737840000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-linux-hardening-3a4092',
                'post',
                'p-seo-linux-hardening',
                '3a4092bbf102',
                1,
                1789737840000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-linux-hardening-9b22a0-4',
                'post',
                'p-seo-linux-hardening',
                '9b22a011cd44',
                'reaction',
                '🚀',
                1789737900000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-linux-hardening-9b22a0',
                'post',
                'p-seo-linux-hardening',
                '9b22a011cd44',
                1,
                1789737900000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-linux-hardening-3e901a-5',
                'post',
                'p-seo-linux-hardening',
                '3e901a88fb22',
                'reaction',
                '❤️',
                1789737960000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-linux-hardening-3e901a',
                'post',
                'p-seo-linux-hardening',
                '3e901a88fb22',
                1,
                1789737960000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-linux-hardening-92c401-6',
                'post',
                'p-seo-linux-hardening',
                '92c4018fba77',
                'bookmark',
                '🧠',
                1789738020000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-linux-hardening-92c401',
                'post',
                'p-seo-linux-hardening',
                '92c4018fba77',
                1,
                1789738020000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-linux-hardening-c0a184-7',
                'post',
                'p-seo-linux-hardening',
                'c0a184e912fd',
                'like',
                '🚀',
                1789738080000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-linux-hardening-c0a184',
                'post',
                'p-seo-linux-hardening',
                'c0a184e912fd',
                1,
                1789738080000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-linux-hardening-31f90a-8',
                'post',
                'p-seo-linux-hardening',
                '31f90a44ec12',
                'reaction',
                '🛡️',
                1789738140000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-linux-hardening-31f90a',
                'post',
                'p-seo-linux-hardening',
                '31f90a44ec12',
                1,
                1789738140000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-linux-hardening-22c88f-9',
                'post',
                'p-seo-linux-hardening',
                '22c88f01a9df',
                'like',
                '❤️',
                1789738200000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-linux-hardening-22c88f',
                'post',
                'p-seo-linux-hardening',
                '22c88f01a9df',
                1,
                1789738200000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-linux-hardening-6f1084-11',
                'post',
                'p-seo-linux-hardening',
                '6f1084ea2b99',
                'bookmark',
                '🛡️',
                1789738320000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-linux-hardening-6f1084',
                'post',
                'p-seo-linux-hardening',
                '6f1084ea2b99',
                1,
                1789738320000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-linux-hardening-82c901-12',
                'post',
                'p-seo-linux-hardening',
                '82c901afcb45',
                'like',
                '🧠',
                1789738380000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-linux-hardening-82c901',
                'post',
                'p-seo-linux-hardening',
                '82c901afcb45',
                1,
                1789738380000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-linux-hardening-7b33a9-13',
                'post',
                'p-seo-linux-hardening',
                '7b33a901ff42',
                'like',
                '🔥',
                1789738440000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-linux-hardening-7b33a9',
                'post',
                'p-seo-linux-hardening',
                '7b33a901ff42',
                1,
                1789738440000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-linux-hardening-19a408-14',
                'post',
                'p-seo-linux-hardening',
                '19a408ebc220',
                'like',
                '❤️',
                1789738500000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-linux-hardening-19a408',
                'post',
                'p-seo-linux-hardening',
                '19a408ebc220',
                1,
                1789738500000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-linux-hardening-77e102-15',
                'post',
                'p-seo-linux-hardening',
                '77e1029ba4c0',
                'reaction',
                '🧠',
                1789738560000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-linux-hardening-77e102',
                'post',
                'p-seo-linux-hardening',
                '77e1029ba4c0',
                1,
                1789738560000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-linux-hardening-99df01-16',
                'post',
                'p-seo-linux-hardening',
                '99df012aa4c3',
                'bookmark',
                '🚀',
                1789738620000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-linux-hardening-99df01',
                'post',
                'p-seo-linux-hardening',
                '99df012aa4c3',
                1,
                1789738620000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-linux-hardening-56c401-17',
                'post',
                'p-seo-linux-hardening',
                '56c4018ffa45',
                'bookmark',
                '🚀',
                1789738680000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-linux-hardening-56c401',
                'post',
                'p-seo-linux-hardening',
                '56c4018ffa45',
                1,
                1789738680000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-linux-hardening-1c490a-18',
                'post',
                'p-seo-linux-hardening',
                '1c490a21fd88',
                'bookmark',
                '💡',
                1789738740000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-linux-hardening-1c490a',
                'post',
                'p-seo-linux-hardening',
                '1c490a21fd88',
                1,
                1789738740000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-linux-hardening-91c24f-19',
                'post',
                'p-seo-linux-hardening',
                '91c24fa0e891',
                'bookmark',
                '💡',
                1789738800000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-linux-hardening-91c24f',
                'post',
                'p-seo-linux-hardening',
                '91c24fa0e891',
                1,
                1789738800000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-linux-hardening-14e92a-20',
                'post',
                'p-seo-linux-hardening',
                '14e92a8819bb',
                'reaction',
                '🔥',
                1789738860000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-linux-hardening-14e92a',
                'post',
                'p-seo-linux-hardening',
                '14e92a8819bb',
                1,
                1789738860000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-linux-hardening-4d89a0-21',
                'post',
                'p-seo-linux-hardening',
                '4d89a01fbb23',
                'bookmark',
                '👍',
                1789738920000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-linux-hardening-4d89a0',
                'post',
                'p-seo-linux-hardening',
                '4d89a01fbb23',
                1,
                1789738920000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-linux-hardening-52e091-22',
                'post',
                'p-seo-linux-hardening',
                '52e091bfa331',
                'like',
                '💡',
                1789738980000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-linux-hardening-52e091',
                'post',
                'p-seo-linux-hardening',
                '52e091bfa331',
                1,
                1789738980000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-linux-hardening-44df90-23',
                'post',
                'p-seo-linux-hardening',
                '44df9012a8bc',
                'bookmark',
                '❤️',
                1789739040000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-linux-hardening-44df90',
                'post',
                'p-seo-linux-hardening',
                '44df9012a8bc',
                1,
                1789739040000
            );
INSERT OR REPLACE INTO posts (
            id, channel_id, author_id, author_role, title, content, flair,
            merit_votes, user_voted, reply_count, boost_count,
            attachment_json, video_json, images_json, poll_id, quoted_post_json,
            status, created_at, is_expanded
        ) VALUES (
            'p-seo-qwen-coder-local',
            'relays-dev',
            'b1409ea28c99',
            'GUARDIAN',
            'Qwen 2.5 Coder 32B rulat local pe Ollama / vLLM: A ajuns la nivelul Claude 3.5 Sonnet pentru refactoring TypeScript & Rust? Test pe cod real 🧠💻',
            'În ultimele 3 săptămâni am rulat un experiment în orb: am trimis 50 de task-uri complexe de refactoring atât către **Claude 3.5 Sonnet**, cât și către modelul open-weights **Qwen 2.5 Coder 32B Instruct** (rulat local prin vLLM pe 2x RTX 3090, cuantizare Q4_K_M).

Rezultatele m-au șocat:

### 1. Unde Qwen 2.5 Coder 32B este la egalitate cu Claude:
- **Rust borrow checker & lifetimes**: A rezolvat probleme de referințe circulare în `tokio::sync::RwLock` fără nicio halucinație. Codul a compilat din prima încercare în 42 din 50 de cazuri.
- **Strict TypeScript Types**: A generat discriminative unions și mapped types pentru envelope-uri criptografice complexe fără `any` sau aserțiuni de tip forțate (`as unknown as X`).
- **Generare teste unitare**: A identificat edge-case-uri de rețea (timeout, jitter, out-of-order packets) extrem de rapid.

### 2. Unde Claude 3.5 Sonnet încă are avantaj:
- **Vedere de ansamblu pe codebase masiv**: Când contextul depășește 64.000 tokens, Claude își amintește mai bine detalii obscure din fișierele de configurare.
- **Eleganța documentației**: Comentariile generate de Claude au un ton mai fluent în limba engleză.

### 3. Setup recomandat pe Ollama:
```bash
ollama run qwen2.5-coder:32b
```
Parametri optimi în `Modelfile`:
```
PARAMETER temperature 0.2
PARAMETER top_p 0.95
PARAMETER num_ctx 32768
```
Dacă aveți cel puțin 24GB VRAM (sau un Mac Apple Silicon cu 36GB+ Unified Memory), vă recomand să încercați. Cost marginal pe interogare: $0.00. Zero date trimise în cloud.',
            'AI ENGINEERING',
            590,
            0,
            5,
            52,
            NULL, NULL, NULL, NULL, NULL,
            'published',
            1789741200000,
            0
        );
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-qwen-coder-local', 'ai', 1789741200000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-qwen-coder-local', 'ollama', 1789741200000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-qwen-coder-local', 'qwen', 1789741200000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-qwen-coder-local', 'claude', 1789741200000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-qwen-coder-local', 'programming', 1789741200000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-qwen-coder-local', 'typescript', 1789741200000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-qwen-coder-local', 'rust', 1789741200000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-qwen-coder-local', 'localai', 1789741200000);
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-ai-1',
                'p-seo-qwen-coder-local',
                NULL,
                'a410ef89b231',
                'MEMBER',
                'Îl folosesc legat la Neovim prin `avante.nvim` de vreo săptămână. Răspunde în 400ms la solicitări de inline completion. Să tastezi cod la 2 noaptea fără să aștepți request-ul de la un API comercial din SUA e o plăcere divină.',
                75,
                1789742400000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-1-29c40e-0',
                    'comment',
                    'c-ai-1',
                    '29c40ea18df2',
                    'reaction',
                    '🚀',
                    1789742430000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-1-1c490a-1',
                    'comment',
                    'c-ai-1',
                    '1c490a21fd88',
                    'reaction',
                    '👍',
                    1789742460000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-1-24a014-2',
                    'comment',
                    'c-ai-1',
                    '24a014f9ec89',
                    'reaction',
                    '❤️',
                    1789742490000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-1-5b2041-3',
                    'comment',
                    'c-ai-1',
                    '5b2041e8d902',
                    'reaction',
                    '🚀',
                    1789742520000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-1-80c901-4',
                    'comment',
                    'c-ai-1',
                    '80c901afdf23',
                    'like',
                    '💡',
                    1789742550000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-1-21f09a-6',
                    'comment',
                    'c-ai-1',
                    '21f09ab8c401',
                    'like',
                    '🚀',
                    1789742610000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-1-a30194-7',
                    'comment',
                    'c-ai-1',
                    'a30194f2de89',
                    'like',
                    '❤️',
                    1789742640000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-ai-2',
                'p-seo-qwen-coder-local',
                NULL,
                'b2901a4fc883',
                'MEMBER',
                'Confirm pe partea de Rust! I-am dat să convertească un wrapper FFI scris în C++ către idiomatic Rust cu `cxx` și a tratat pointerii raw cu maximă prudență, punând blocuri `unsafe` doar strict unde era necesar și adăugând comentarii explicative.',
                63,
                1789743600000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-2-91df90-0',
                    'comment',
                    'c-ai-2',
                    '91df9012cb78',
                    'reaction',
                    '🔥',
                    1789743630000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-2-9b22a0-1',
                    'comment',
                    'c-ai-2',
                    '9b22a011cd44',
                    'reaction',
                    '👍',
                    1789743660000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-2-64c801-2',
                    'comment',
                    'c-ai-2',
                    '64c8012fab12',
                    'like',
                    '🚀',
                    1789743690000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-2-2a9104-3',
                    'comment',
                    'c-ai-2',
                    '2a9104eb8c33',
                    'reaction',
                    '💡',
                    1789743720000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-ai-3',
                'p-seo-qwen-coder-local',
                NULL,
                '3c91a4e082aa',
                'MEMBER',
                'Merge impecabil și varianta mai mică de 7B pe un MacBook Air M2 de 16GB! Scoate vreo 48 tokens/secundă și pentru scripturi de C/C++ pe microcontrollere ESP32 este mai mult decât suficient.',
                46,
                1789744800000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-3-22c88f-0',
                    'comment',
                    'c-ai-3',
                    '22c88f01a9df',
                    'reaction',
                    '🚀',
                    1789744830000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-3-67c801-1',
                    'comment',
                    'c-ai-3',
                    '67c8012afb90',
                    'like',
                    '🧠',
                    1789744860000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-3-a50091-2',
                    'comment',
                    'c-ai-3',
                    'a500912fa8cc',
                    'like',
                    '🔥',
                    1789744890000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-3-66a019-3',
                    'comment',
                    'c-ai-3',
                    '66a0194ebd21',
                    'reaction',
                    '❤️',
                    1789744920000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-ai-4',
                'p-seo-qwen-coder-local',
                NULL,
                '3e901a88fb22',
                'MEMBER',
                'E incredibil cum acum 2 ani ne minunam de GPT-3.5 pe cloud de milioane de dolari, iar azi un model deschis de 32B pe care îl ții pe birou îl depășește la orice benchmark de programare.',
                53,
                1789746000000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-4-80c901-0',
                    'comment',
                    'c-ai-4',
                    '80c901afdf23',
                    'reaction',
                    '🔥',
                    1789746030000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-4-94df02-1',
                    'comment',
                    'c-ai-4',
                    '94df0218ab44',
                    'like',
                    '🚀',
                    1789746060000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-4-a410ef-2',
                    'comment',
                    'c-ai-4',
                    'a410ef89b231',
                    'reaction',
                    '🔥',
                    1789746090000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-4-4d89a0-3',
                    'comment',
                    'c-ai-4',
                    '4d89a01fbb23',
                    'reaction',
                    '🔥',
                    1789746120000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-4-1c490a-4',
                    'comment',
                    'c-ai-4',
                    '1c490a21fd88',
                    'reaction',
                    '❤️',
                    1789746150000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-4-19a408-5',
                    'comment',
                    'c-ai-4',
                    '19a408ebc220',
                    'reaction',
                    '🔥',
                    1789746180000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-4-3c91a4-6',
                    'comment',
                    'c-ai-4',
                    '3c91a4e082aa',
                    'reaction',
                    '🧠',
                    1789746210000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-ai-5',
                'p-seo-qwen-coder-local',
                'c-ai-4',
                'b1409ea28c99',
                'GUARDIAN',
                '@TinyModelHacker Exact! Iar secretul stă în calitatea datelor sintetice de antrenament și în tehnicile de test-time compute. Epoca monopolului cloud pe inteligență artificială se apropie vertiginos de sfârșit.',
                69,
                1789747200000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-5-87a01f-0',
                    'comment',
                    'c-ai-5',
                    '87a01fa29cb5',
                    'like',
                    '💡',
                    1789747230000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-5-62df09-1',
                    'comment',
                    'c-ai-5',
                    '62df09a14c33',
                    'reaction',
                    '💡',
                    1789747260000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-5-8d104f-2',
                    'comment',
                    'c-ai-5',
                    '8d104fb2a901',
                    'like',
                    '🔥',
                    1789747290000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-ai-5-1bf089-3',
                    'comment',
                    'c-ai-5',
                    '1bf08912ea56',
                    'like',
                    '💡',
                    1789747320000
                );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-qwen-coder-local-bf0194-0',
                'post',
                'p-seo-qwen-coder-local',
                'bf0194a28cc1',
                'reaction',
                '🛡️',
                1789741260000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-qwen-coder-local-bf0194',
                'post',
                'p-seo-qwen-coder-local',
                'bf0194a28cc1',
                1,
                1789741260000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-qwen-coder-local-da0194-1',
                'post',
                'p-seo-qwen-coder-local',
                'da0194f28bc1',
                'bookmark',
                '👍',
                1789741320000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-qwen-coder-local-da0194',
                'post',
                'p-seo-qwen-coder-local',
                'da0194f28bc1',
                1,
                1789741320000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-qwen-coder-local-39b014-2',
                'post',
                'p-seo-qwen-coder-local',
                '39b014ea8d34',
                'like',
                '🚀',
                1789741380000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-qwen-coder-local-39b014',
                'post',
                'p-seo-qwen-coder-local',
                '39b014ea8d34',
                1,
                1789741380000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-qwen-coder-local-c0a184-3',
                'post',
                'p-seo-qwen-coder-local',
                'c0a184e912fd',
                'reaction',
                '❤️',
                1789741440000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-qwen-coder-local-c0a184',
                'post',
                'p-seo-qwen-coder-local',
                'c0a184e912fd',
                1,
                1789741440000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-qwen-coder-local-f40019-4',
                'post',
                'p-seo-qwen-coder-local',
                'f40019bc88a2',
                'reaction',
                '🛡️',
                1789741500000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-qwen-coder-local-f40019',
                'post',
                'p-seo-qwen-coder-local',
                'f40019bc88a2',
                1,
                1789741500000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-qwen-coder-local-aa0194-5',
                'post',
                'p-seo-qwen-coder-local',
                'aa0194f2cd01',
                'reaction',
                '🔥',
                1789741560000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-qwen-coder-local-aa0194',
                'post',
                'p-seo-qwen-coder-local',
                'aa0194f2cd01',
                1,
                1789741560000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-qwen-coder-local-a30194-6',
                'post',
                'p-seo-qwen-coder-local',
                'a30194f2de89',
                'bookmark',
                '💡',
                1789741620000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-qwen-coder-local-a30194',
                'post',
                'p-seo-qwen-coder-local',
                'a30194f2de89',
                1,
                1789741620000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-qwen-coder-local-17df89-7',
                'post',
                'p-seo-qwen-coder-local',
                '17df8902ab55',
                'reaction',
                '👍',
                1789741680000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-qwen-coder-local-17df89',
                'post',
                'p-seo-qwen-coder-local',
                '17df8902ab55',
                1,
                1789741680000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-qwen-coder-local-67c801-8',
                'post',
                'p-seo-qwen-coder-local',
                '67c8012afb90',
                'reaction',
                '🧠',
                1789741740000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-qwen-coder-local-67c801',
                'post',
                'p-seo-qwen-coder-local',
                '67c8012afb90',
                1,
                1789741740000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-qwen-coder-local-11f802-9',
                'post',
                'p-seo-qwen-coder-local',
                '11f802ea9bc4',
                'bookmark',
                '❤️',
                1789741800000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-qwen-coder-local-11f802',
                'post',
                'p-seo-qwen-coder-local',
                '11f802ea9bc4',
                1,
                1789741800000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-qwen-coder-local-9ad090-10',
                'post',
                'p-seo-qwen-coder-local',
                '9ad09012ab56',
                'like',
                '🛡️',
                1789741860000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-qwen-coder-local-9ad090',
                'post',
                'p-seo-qwen-coder-local',
                '9ad09012ab56',
                1,
                1789741860000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-qwen-coder-local-31f90a-11',
                'post',
                'p-seo-qwen-coder-local',
                '31f90a44ec12',
                'like',
                '👍',
                1789741920000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-qwen-coder-local-31f90a',
                'post',
                'p-seo-qwen-coder-local',
                '31f90a44ec12',
                1,
                1789741920000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-qwen-coder-local-5b2041-12',
                'post',
                'p-seo-qwen-coder-local',
                '5b2041e8d902',
                'bookmark',
                '👍',
                1789741980000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-qwen-coder-local-5b2041',
                'post',
                'p-seo-qwen-coder-local',
                '5b2041e8d902',
                1,
                1789741980000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-qwen-coder-local-1c490a-13',
                'post',
                'p-seo-qwen-coder-local',
                '1c490a21fd88',
                'like',
                '👍',
                1789742040000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-qwen-coder-local-1c490a',
                'post',
                'p-seo-qwen-coder-local',
                '1c490a21fd88',
                1,
                1789742040000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-qwen-coder-local-8a31b4-14',
                'post',
                'p-seo-qwen-coder-local',
                '8a31b402ef19',
                'like',
                '🚀',
                1789742100000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-qwen-coder-local-8a31b4',
                'post',
                'p-seo-qwen-coder-local',
                '8a31b402ef19',
                1,
                1789742100000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-qwen-coder-local-87a01f-15',
                'post',
                'p-seo-qwen-coder-local',
                '87a01fa29cb5',
                'like',
                '🛡️',
                1789742160000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-qwen-coder-local-87a01f',
                'post',
                'p-seo-qwen-coder-local',
                '87a01fa29cb5',
                1,
                1789742160000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-qwen-coder-local-4d89a0-16',
                'post',
                'p-seo-qwen-coder-local',
                '4d89a01fbb23',
                'like',
                '🧠',
                1789742220000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-qwen-coder-local-4d89a0',
                'post',
                'p-seo-qwen-coder-local',
                '4d89a01fbb23',
                1,
                1789742220000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-qwen-coder-local-62df09-17',
                'post',
                'p-seo-qwen-coder-local',
                '62df09a14c33',
                'like',
                '🚀',
                1789742280000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-qwen-coder-local-62df09',
                'post',
                'p-seo-qwen-coder-local',
                '62df09a14c33',
                1,
                1789742280000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-qwen-coder-local-a410ef-18',
                'post',
                'p-seo-qwen-coder-local',
                'a410ef89b231',
                'reaction',
                '💡',
                1789742340000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-qwen-coder-local-a410ef',
                'post',
                'p-seo-qwen-coder-local',
                'a410ef89b231',
                1,
                1789742340000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-qwen-coder-local-a7df90-19',
                'post',
                'p-seo-qwen-coder-local',
                'a7df9012bc23',
                'bookmark',
                '💡',
                1789742400000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-qwen-coder-local-a7df90',
                'post',
                'p-seo-qwen-coder-local',
                'a7df9012bc23',
                1,
                1789742400000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-qwen-coder-local-29c40e-20',
                'post',
                'p-seo-qwen-coder-local',
                '29c40ea18df2',
                'reaction',
                '🚀',
                1789742460000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-qwen-coder-local-29c40e',
                'post',
                'p-seo-qwen-coder-local',
                '29c40ea18df2',
                1,
                1789742460000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-qwen-coder-local-3db014-21',
                'post',
                'p-seo-qwen-coder-local',
                '3db014ea9e12',
                'reaction',
                '🧠',
                1789742520000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-qwen-coder-local-3db014',
                'post',
                'p-seo-qwen-coder-local',
                '3db014ea9e12',
                1,
                1789742520000
            );
INSERT OR REPLACE INTO posts (
            id, channel_id, author_id, author_role, title, content, flair,
            merit_votes, user_voted, reply_count, boost_count,
            attachment_json, video_json, images_json, poll_id, quoted_post_json,
            status, created_at, is_expanded
        ) VALUES (
            'p-seo-podman-vs-docker',
            'relays-dev',
            '64c8012fab12',
            'MEMBER',
            'De ce am migrat toate containerele de producție de pe Docker pe Podman: Rootless by default, fără daemon centralizat și compatibilitate 100% 🦭📦',
            'Când rulezi `dockerd`, ai un proces gigantic cu privilegii de `root` care rulează permanent în fundal. Dacă un atacator reușește un container breakout sau găsește un bug în socket-ul `/var/run/docker.sock`, are acces la întreg sistemul gazdă.

De la începutul anului am trecut 100% pe **Podman 5.0** și Quadlets.

### De ce Podman este superior structural:
1. **Fără Daemon (Daemonless)**: Fiecare container este un proces copil direct al utilizatorului tău, la fel ca orice alt binar Linux (`fork/exec`). Dacă se oprește comanda, se oprește containerul. Nu există un daemon care să crăpe și să-ți omoare toate containerele deodată.
2. **Rootless Real**: User namespaces mapează UID-ul tău non-root (ex: UID 1000) ca UID 0 *doar în interiorul containerului*. Chiar dacă cineva obține root în container, pe host este doar un utilizator obișnuit fără drepturi de scriere în `/etc` sau `/bin`.
3. **Integrare Nativă cu systemd (Quadlets)**:
În loc de fișiere `docker-compose.yml` fragile gestionate manual, pui un fișier `.container` în `~/.config/containers/systemd/my-app.container`:
```ini
[Unit]
Description=Sovereign Vault Service
After=network-online.target

[Container]
Image=ghcr.io/aetheris/vault-relay:latest
PublishPort=8080:8080
Volume=%h/data:/app/data:Z

[Service]
Restart=always

[Install]
WantedBy=default.target
```
Apoi: `systemctl --user daemon-reload && systemctl --user start my-app`.
Containerul pornește automat la boot-ul mașinii, are health-check automat de la systemd și jurnale native în `journalctl`!

Cine a mai experimentat cu Quadlets pe Fedora / Debian?',
            'DEVOPS & CONTAINERS',
            430,
            0,
            4,
            31,
            NULL, NULL, NULL, NULL, NULL,
            'published',
            1789744800000,
            0
        );
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-podman-vs-docker', 'docker', 1789744800000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-podman-vs-docker', 'podman', 1789744800000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-podman-vs-docker', 'containers', 1789744800000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-podman-vs-docker', 'devops', 1789744800000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-podman-vs-docker', 'rootless', 1789744800000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-podman-vs-docker', 'linux', 1789744800000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-podman-vs-docker', 'systemd', 1789744800000);
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-pod-1',
                'p-seo-podman-vs-docker',
                NULL,
                '4e198a00b215',
                'MEMBER',
                'Quadlets sunt absolut geniale! Cel mai mare hop la început a fost permisiunea pe portul 80 și 443 fiind utilizator normal. Pentru cine se lovește de asta: o singură linie în `/etc/sysctl.d/podman.conf`: `net.ipv4.ip_unprivileged_port_start=80` și poți expune porturi web fără niciun privilegiu root.',
                62,
                1789746000000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-pod-1-3e901a-0',
                    'comment',
                    'c-pod-1',
                    '3e901a88fb22',
                    'reaction',
                    '🔥',
                    1789746030000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-pod-1-c3dc28-1',
                    'comment',
                    'c-pod-1',
                    'c3dc28cb705e',
                    'reaction',
                    '❤️',
                    1789746060000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-pod-1-17df89-2',
                    'comment',
                    'c-pod-1',
                    '17df8902ab55',
                    'like',
                    '🚀',
                    1789746090000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-pod-1-5e019a-3',
                    'comment',
                    'c-pod-1',
                    '5e019ab28c66',
                    'reaction',
                    '❤️',
                    1789746120000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-pod-1-70a40f-4',
                    'comment',
                    'c-pod-1',
                    '70a40f91b2df',
                    'like',
                    '❤️',
                    1789746150000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-pod-1-2d89b1-5',
                    'comment',
                    'c-pod-1',
                    '2d89b14c99a0',
                    'like',
                    '💡',
                    1789746180000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-pod-1-83d201-6',
                    'comment',
                    'c-pod-1',
                    '83d2019fab66',
                    'reaction',
                    '🚀',
                    1789746210000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-pod-1-da0194-7',
                    'comment',
                    'c-pod-1',
                    'da0194f28bc1',
                    'like',
                    '💡',
                    1789746240000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-pod-2',
                'p-seo-podman-vs-docker',
                NULL,
                '19a408ebc220',
                'MEMBER',
                'Alt avantaj major: zero overhead de memorie când containerele sunt oprite. La Docker, doar daemonul îți mânca 120-200MB de RAM stând degeaba. La Podman, când nu ai niciun container activ, consumul e efectiv 0 bytes.',
                48,
                1789747200000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-pod-2-29c40e-0',
                    'comment',
                    'c-pod-2',
                    '29c40ea18df2',
                    'reaction',
                    '👍',
                    1789747230000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-pod-2-a30194-1',
                    'comment',
                    'c-pod-2',
                    'a30194f2de89',
                    'reaction',
                    '💡',
                    1789747260000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-pod-2-24a014-2',
                    'comment',
                    'c-pod-2',
                    '24a014f9ec89',
                    'like',
                    '👍',
                    1789747290000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-pod-2-70a40f-3',
                    'comment',
                    'c-pod-2',
                    '70a40f91b2df',
                    'reaction',
                    '🧠',
                    1789747320000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-pod-2-79c901-4',
                    'comment',
                    'c-pod-2',
                    '79c901affa01',
                    'like',
                    '🔥',
                    1789747350000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-pod-2-a0914e-5',
                    'comment',
                    'c-pod-2',
                    'a0914e21fc88',
                    'reaction',
                    '🧠',
                    1789747380000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-pod-3',
                'p-seo-podman-vs-docker',
                NULL,
                '88f019ab4c21',
                'MEMBER',
                'Și tracing-ul cu eBPF devine mult mai curat. Fiecare container are propriul cgroup v2 bine delimitat sub `user.slice`, așa că pot urmări apelurile de sistem pe container exact ca pe orice proces nativ Linux.',
                34,
                1789748400000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-pod-3-24a014-0',
                    'comment',
                    'c-pod-3',
                    '24a014f9ec89',
                    'reaction',
                    '💡',
                    1789748430000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-pod-3-aa0194-1',
                    'comment',
                    'c-pod-3',
                    'aa0194f2cd01',
                    'reaction',
                    '👍',
                    1789748460000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-pod-3-88b401-2',
                    'comment',
                    'c-pod-3',
                    '88b4012ce9fa',
                    'like',
                    '👍',
                    1789748490000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-pod-3-3e901a-3',
                    'comment',
                    'c-pod-3',
                    '3e901a88fb22',
                    'reaction',
                    '👍',
                    1789748520000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-pod-3-7b33a9-4',
                    'comment',
                    'c-pod-3',
                    '7b33a901ff42',
                    'like',
                    '🔥',
                    1789748550000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-pod-3-c3dc28-5',
                    'comment',
                    'c-pod-3',
                    'c3dc28cb705e',
                    'like',
                    '🚀',
                    1789748580000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-pod-4',
                'p-seo-podman-vs-docker',
                'c-pod-1',
                '64c8012fab12',
                'MEMBER',
                '@DockerNinja Fix acel sysctl îl am și eu peste tot. Iar pentru containere multiple cu baze de date, flag-ul `:Z` la volume pentru SELinux e sfânt ca să nu te trezești cu permission denied pe mount.',
                28,
                1789749600000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-pod-4-83d201-0',
                    'comment',
                    'c-pod-4',
                    '83d2019fab66',
                    'reaction',
                    '🚀',
                    1789749630000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-pod-4-70a40f-1',
                    'comment',
                    'c-pod-4',
                    '70a40f91b2df',
                    'reaction',
                    '❤️',
                    1789749660000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-pod-4-a50091-2',
                    'comment',
                    'c-pod-4',
                    'a500912fa8cc',
                    'like',
                    '❤️',
                    1789749690000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-pod-4-c3dc28-3',
                    'comment',
                    'c-pod-4',
                    'c3dc28cb705e',
                    'like',
                    '👍',
                    1789749720000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-pod-4-60c801-4',
                    'comment',
                    'c-pod-4',
                    '60c8012acd78',
                    'like',
                    '❤️',
                    1789749750000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-pod-4-21f09a-5',
                    'comment',
                    'c-pod-4',
                    '21f09ab8c401',
                    'like',
                    '💡',
                    1789749780000
                );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-podman-vs-docker-2da014-0',
                'post',
                'p-seo-podman-vs-docker',
                '2da014f9bc67',
                'like',
                '🔥',
                1789744860000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-podman-vs-docker-2da014',
                'post',
                'p-seo-podman-vs-docker',
                '2da014f9bc67',
                1,
                1789744860000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-podman-vs-docker-c3dc28-1',
                'post',
                'p-seo-podman-vs-docker',
                'c3dc28cb705e',
                'reaction',
                '👍',
                1789744920000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-podman-vs-docker-c3dc28',
                'post',
                'p-seo-podman-vs-docker',
                'c3dc28cb705e',
                1,
                1789744920000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-podman-vs-docker-3e901a-2',
                'post',
                'p-seo-podman-vs-docker',
                '3e901a88fb22',
                'reaction',
                '🚀',
                1789744980000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-podman-vs-docker-3e901a',
                'post',
                'p-seo-podman-vs-docker',
                '3e901a88fb22',
                1,
                1789744980000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-podman-vs-docker-77e102-3',
                'post',
                'p-seo-podman-vs-docker',
                '77e1029ba4c0',
                'reaction',
                '🛡️',
                1789745040000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-podman-vs-docker-77e102',
                'post',
                'p-seo-podman-vs-docker',
                '77e1029ba4c0',
                1,
                1789745040000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-podman-vs-docker-59b04a-4',
                'post',
                'p-seo-podman-vs-docker',
                '59b04a11ee32',
                'bookmark',
                '👍',
                1789745100000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-podman-vs-docker-59b04a',
                'post',
                'p-seo-podman-vs-docker',
                '59b04a11ee32',
                1,
                1789745100000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-podman-vs-docker-da0194-5',
                'post',
                'p-seo-podman-vs-docker',
                'da0194f28bc1',
                'reaction',
                '👍',
                1789745160000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-podman-vs-docker-da0194',
                'post',
                'p-seo-podman-vs-docker',
                'da0194f28bc1',
                1,
                1789745160000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-podman-vs-docker-6d88f1-6',
                'post',
                'p-seo-podman-vs-docker',
                '6d88f12a04cb',
                'like',
                '❤️',
                1789745220000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-podman-vs-docker-6d88f1',
                'post',
                'p-seo-podman-vs-docker',
                '6d88f12a04cb',
                1,
                1789745220000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-podman-vs-docker-70a40f-7',
                'post',
                'p-seo-podman-vs-docker',
                '70a40f91b2df',
                'bookmark',
                '💡',
                1789745280000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-podman-vs-docker-70a40f',
                'post',
                'p-seo-podman-vs-docker',
                '70a40f91b2df',
                1,
                1789745280000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-podman-vs-docker-88f019-9',
                'post',
                'p-seo-podman-vs-docker',
                '88f019ab4c21',
                'like',
                '👍',
                1789745400000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-podman-vs-docker-88f019',
                'post',
                'p-seo-podman-vs-docker',
                '88f019ab4c21',
                1,
                1789745400000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-podman-vs-docker-2a9104-10',
                'post',
                'p-seo-podman-vs-docker',
                '2a9104eb8c33',
                'bookmark',
                '🛡️',
                1789745460000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-podman-vs-docker-2a9104',
                'post',
                'p-seo-podman-vs-docker',
                '2a9104eb8c33',
                1,
                1789745460000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-podman-vs-docker-83d201-11',
                'post',
                'p-seo-podman-vs-docker',
                '83d2019fab66',
                'reaction',
                '🚀',
                1789745520000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-podman-vs-docker-83d201',
                'post',
                'p-seo-podman-vs-docker',
                '83d2019fab66',
                1,
                1789745520000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-podman-vs-docker-7c9102-12',
                'post',
                'p-seo-podman-vs-docker',
                '7c9102ab84df',
                'like',
                '❤️',
                1789745580000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-podman-vs-docker-7c9102',
                'post',
                'p-seo-podman-vs-docker',
                '7c9102ab84df',
                1,
                1789745580000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-podman-vs-docker-8d104f-13',
                'post',
                'p-seo-podman-vs-docker',
                '8d104fb2a901',
                'bookmark',
                '🔥',
                1789745640000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-podman-vs-docker-8d104f',
                'post',
                'p-seo-podman-vs-docker',
                '8d104fb2a901',
                1,
                1789745640000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-podman-vs-docker-5ec401-14',
                'post',
                'p-seo-podman-vs-docker',
                '5ec4018fba67',
                'like',
                '🔥',
                1789745700000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-podman-vs-docker-5ec401',
                'post',
                'p-seo-podman-vs-docker',
                '5ec4018fba67',
                1,
                1789745700000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-podman-vs-docker-f40019-15',
                'post',
                'p-seo-podman-vs-docker',
                'f40019bc88a2',
                'reaction',
                '🛡️',
                1789745760000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-podman-vs-docker-f40019',
                'post',
                'p-seo-podman-vs-docker',
                'f40019bc88a2',
                1,
                1789745760000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-podman-vs-docker-35df90-16',
                'post',
                'p-seo-podman-vs-docker',
                '35df9012a888',
                'bookmark',
                '🚀',
                1789745820000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-podman-vs-docker-35df90',
                'post',
                'p-seo-podman-vs-docker',
                '35df9012a888',
                1,
                1789745820000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-podman-vs-docker-42c90a-17',
                'post',
                'p-seo-podman-vs-docker',
                '42c90a18eb77',
                'like',
                '👍',
                1789745880000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-podman-vs-docker-42c90a',
                'post',
                'p-seo-podman-vs-docker',
                '42c90a18eb77',
                1,
                1789745880000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-podman-vs-docker-56c401-18',
                'post',
                'p-seo-podman-vs-docker',
                '56c4018ffa45',
                'bookmark',
                '🔥',
                1789745940000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-podman-vs-docker-56c401',
                'post',
                'p-seo-podman-vs-docker',
                '56c4018ffa45',
                1,
                1789745940000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-podman-vs-docker-3db014-19',
                'post',
                'p-seo-podman-vs-docker',
                '3db014ea9e12',
                'like',
                '❤️',
                1789746000000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-podman-vs-docker-3db014',
                'post',
                'p-seo-podman-vs-docker',
                '3db014ea9e12',
                1,
                1789746000000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-podman-vs-docker-c0a184-20',
                'post',
                'p-seo-podman-vs-docker',
                'c0a184e912fd',
                'like',
                '🚀',
                1789746060000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-podman-vs-docker-c0a184',
                'post',
                'p-seo-podman-vs-docker',
                'c0a184e912fd',
                1,
                1789746060000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-podman-vs-docker-60c801-21',
                'post',
                'p-seo-podman-vs-docker',
                '60c8012acd78',
                'reaction',
                '🚀',
                1789746120000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-podman-vs-docker-60c801',
                'post',
                'p-seo-podman-vs-docker',
                '60c8012acd78',
                1,
                1789746120000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-podman-vs-docker-bf0194-22',
                'post',
                'p-seo-podman-vs-docker',
                'bf0194a28cc1',
                'reaction',
                '👍',
                1789746180000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-podman-vs-docker-bf0194',
                'post',
                'p-seo-podman-vs-docker',
                'bf0194a28cc1',
                1,
                1789746180000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-podman-vs-docker-1c490a-23',
                'post',
                'p-seo-podman-vs-docker',
                '1c490a21fd88',
                'reaction',
                '🔥',
                1789746240000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-podman-vs-docker-1c490a',
                'post',
                'p-seo-podman-vs-docker',
                '1c490a21fd88',
                1,
                1789746240000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-podman-vs-docker-78a014-24',
                'post',
                'p-seo-podman-vs-docker',
                '78a014fb9c99',
                'bookmark',
                '💡',
                1789746300000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-podman-vs-docker-78a014',
                'post',
                'p-seo-podman-vs-docker',
                '78a014fb9c99',
                1,
                1789746300000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-podman-vs-docker-2d89b1-25',
                'post',
                'p-seo-podman-vs-docker',
                '2d89b14c99a0',
                'bookmark',
                '👍',
                1789746360000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-podman-vs-docker-2d89b1',
                'post',
                'p-seo-podman-vs-docker',
                '2d89b14c99a0',
                1,
                1789746360000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-podman-vs-docker-7b33a9-26',
                'post',
                'p-seo-podman-vs-docker',
                '7b33a901ff42',
                'reaction',
                '💡',
                1789746420000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-podman-vs-docker-7b33a9',
                'post',
                'p-seo-podman-vs-docker',
                '7b33a901ff42',
                1,
                1789746420000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-podman-vs-docker-aa0194-27',
                'post',
                'p-seo-podman-vs-docker',
                'aa0194f2cd01',
                'bookmark',
                '💡',
                1789746480000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-podman-vs-docker-aa0194',
                'post',
                'p-seo-podman-vs-docker',
                'aa0194f2cd01',
                1,
                1789746480000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-podman-vs-docker-92c401-28',
                'post',
                'p-seo-podman-vs-docker',
                '92c4018fba77',
                'bookmark',
                '👍',
                1789746540000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-podman-vs-docker-92c401',
                'post',
                'p-seo-podman-vs-docker',
                '92c4018fba77',
                1,
                1789746540000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-podman-vs-docker-17df89-29',
                'post',
                'p-seo-podman-vs-docker',
                '17df8902ab55',
                'bookmark',
                '🛡️',
                1789746600000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-podman-vs-docker-17df89',
                'post',
                'p-seo-podman-vs-docker',
                '17df8902ab55',
                1,
                1789746600000
            );
INSERT OR REPLACE INTO posts (
            id, channel_id, author_id, author_role, title, content, flair,
            merit_votes, user_voted, reply_count, boost_count,
            attachment_json, video_json, images_json, poll_id, quoted_post_json,
            status, created_at, is_expanded
        ) VALUES (
            'p-seo-wireguard-vs-tailscale',
            'vault-guides',
            '62df09a14c33',
            'MEMBER',
            'WireGuard direct în router vs Tailscale / Headscale: Cum îți conectezi securizat dispozitivele la homelab fără să deschizi porturi în firewall? 🌐🔐',
            'Conectarea în siguranță la serviciile de acasă (NAS, camere, Home Assistant, servere Proxmox) când ești în deplasare este piatra de temelie a oricărui pasionat de tehnologie.

Iată comparația obiectivă între cele 3 abordări principale din 2026:

### 1. WireGuard Pur (Configurat manual pe router)
- **Cum funcționează**: Generezi chei publice/private, deschizi un port UDP (ex: 51820) în routerul tău și folosești un Dynamic DNS dacă ai IP dinamic de la DIGI/Orange.
- **Avantaje**: Viteza maximă absolută posibilă (modul de kernel Linux la 950+ Mbps pe fibră), zero intermediari, control total.
- **Dezavantaje**: Trebuie să deschizi un port public în firewall. Dacă ești în spatele unui CGNAT (pe 4G/5G sau anumiți provideri), conexiunea directă e imposibilă fără un server VPS intermediar.

### 2. Tailscale (Mesh VPN bazat pe WireGuard)
- **Cum funcționează**: Folosește protocoale STUN/ICE și servere DERP pentru a realiza NAT traversal (traversarea routerelor) fără să deschizi vreun port.
- **Avantaje**: Funcționează instantaneu de pe orice conexiune (inclusiv WiFi-ul din cafenele sau date mobile). Suport MagicDNS (accesezi serverul prin `http://homelab/` în loc de IP-uri).
- **Dezavantaje**: Serverul de coordonare (control plane) este proprietar și găzduit în cloud-ul Tailscale Inc.

### 3. Headscale (Alternativa 100% Open-Source & Suverană)
- **Cum funcționează**: Înlocuiește serverul central Tailscale cu o instanță open-source pe care o găzduiești pe propriul server.
- **Clienții**: Folosești clienții oficiali Tailscale de pe Android, iOS, Windows, Mac și Linux, dar îi direcționezi către URL-ul tău Headscale (`tailscale up --login-server https://vpn.domeniul-tau.ro`).

Pentru 90% dintre oameni, Tailscale sau Headscale oferă securitate maximă fără riscul de a expune porturi pe internet. Voi ce soluție rulați?',
            'NETWORKING & HOMELAB',
            460,
            0,
            4,
            33,
            NULL, NULL, NULL, NULL, NULL,
            'published',
            1789748400000,
            0
        );
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-wireguard-vs-tailscale', 'wireguard', 1789748400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-wireguard-vs-tailscale', 'tailscale', 1789748400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-wireguard-vs-tailscale', 'headscale', 1789748400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-wireguard-vs-tailscale', 'vpn', 1789748400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-wireguard-vs-tailscale', 'homelab', 1789748400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-wireguard-vs-tailscale', 'networking', 1789748400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-wireguard-vs-tailscale', 'security', 1789748400000);
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-vpn-1',
                'p-seo-wireguard-vs-tailscale',
                NULL,
                '9f4a120c8b31',
                'MODERATOR',
                'Pe routerele MikroTik cu RouterOS 7, WireGuard-ul este integrat direct în hardware offloading. Pentru legătura site-to-site între două birouri sau între apartament și casa de la țară, nimic nu bate un tunel WireGuard direct cu MTU 1420.',
                55,
                1789749600000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-vpn-1-29c40e-0',
                    'comment',
                    'c-vpn-1',
                    '29c40ea18df2',
                    'like',
                    '👍',
                    1789749630000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-vpn-1-31f90a-1',
                    'comment',
                    'c-vpn-1',
                    '31f90a44ec12',
                    'like',
                    '🧠',
                    1789749660000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-vpn-1-a7df90-2',
                    'comment',
                    'c-vpn-1',
                    'a7df9012bc23',
                    'like',
                    '🔥',
                    1789749690000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-vpn-1-a89104-3',
                    'comment',
                    'c-vpn-1',
                    'a89104fa2211',
                    'reaction',
                    '🚀',
                    1789749720000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-vpn-2',
                'p-seo-wireguard-vs-tailscale',
                NULL,
                '29c40ea18df2',
                'MEMBER',
                'Tailscale Subnet Router a fost o salvare pentru TrueNAS. Am un mic container LXC în Proxmox cu `tailscale up --advertise-routes=192.168.1.0/24` și când sunt plecat cu laptopul accesez toate share-urile SMB și interfețele web exact ca și cum aș fi conectat prin cablu pe biroul de acasă.',
                64,
                1789750800000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-vpn-2-4d89a0-0',
                    'comment',
                    'c-vpn-2',
                    '4d89a01fbb23',
                    'reaction',
                    '🧠',
                    1789750830000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-vpn-2-7f8a91-1',
                    'comment',
                    'c-vpn-2',
                    '7f8a910c2b44',
                    'reaction',
                    '🚀',
                    1789750860000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-vpn-2-13f089-2',
                    'comment',
                    'c-vpn-2',
                    '13f08912ef34',
                    'like',
                    '👍',
                    1789750890000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-vpn-2-80c901-3',
                    'comment',
                    'c-vpn-2',
                    '80c901afdf23',
                    'reaction',
                    '👍',
                    1789750920000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-vpn-2-15e092-4',
                    'comment',
                    'c-vpn-2',
                    '15e0921ab4c8',
                    'like',
                    '🚀',
                    1789750950000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-vpn-2-36b014-5',
                    'comment',
                    'c-vpn-2',
                    '36b014eaef90',
                    'reaction',
                    '❤️',
                    1789750980000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-vpn-2-82c901-6',
                    'comment',
                    'c-vpn-2',
                    '82c901afcb45',
                    'reaction',
                    '🔥',
                    1789751010000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-vpn-2-99df01-7',
                    'comment',
                    'c-vpn-2',
                    '99df012aa4c3',
                    'like',
                    '👍',
                    1789751040000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-vpn-3',
                'p-seo-wireguard-vs-tailscale',
                NULL,
                '52e091bfa331',
                'MEMBER',
                'Rulați Headscale dacă vă pasă cu adevărat de autonomie. Are o imagine oficială de Docker extrem de ușoară (consumă sub 30MB RAM cu bază SQLite) și eliminați complet orice dependență de serverele unei companii din SUA.',
                48,
                1789752000000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-vpn-3-c0a184-0',
                    'comment',
                    'c-vpn-3',
                    'c0a184e912fd',
                    'reaction',
                    '🧠',
                    1789752030000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-vpn-3-3db014-1',
                    'comment',
                    'c-vpn-3',
                    '3db014ea9e12',
                    'like',
                    '🚀',
                    1789752060000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-vpn-3-66a019-2',
                    'comment',
                    'c-vpn-3',
                    '66a0194ebd21',
                    'like',
                    '🧠',
                    1789752090000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-vpn-3-19a408-3',
                    'comment',
                    'c-vpn-3',
                    '19a408ebc220',
                    'like',
                    '🧠',
                    1789752120000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-vpn-3-42c90a-4',
                    'comment',
                    'c-vpn-3',
                    '42c90a18eb77',
                    'like',
                    '👍',
                    1789752150000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-vpn-3-67c801-5',
                    'comment',
                    'c-vpn-3',
                    '67c8012afb90',
                    'reaction',
                    '🚀',
                    1789752180000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-vpn-3-99df01-6',
                    'comment',
                    'c-vpn-3',
                    '99df012aa4c3',
                    'like',
                    '❤️',
                    1789752210000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-vpn-3-4e198a-7',
                    'comment',
                    'c-vpn-3',
                    '4e198a00b215',
                    'like',
                    '💡',
                    1789752240000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-vpn-4',
                'p-seo-wireguard-vs-tailscale',
                'c-vpn-1',
                '62df09a14c33',
                'MEMBER',
                '@PacketStorm Foarte corect! La MTU pe conexiunile PPPoE din România (unde MTU-ul de bază e 1492), dacă pui WireGuard la 1420 nu mai ai nicio fragmentare TCP MSS și streaming-ul 4K zboară fără buffering.',
                41,
                1789753200000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-vpn-4-64c801-0',
                    'comment',
                    'c-vpn-4',
                    '64c8012fab12',
                    'reaction',
                    '👍',
                    1789753230000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-vpn-4-56c401-1',
                    'comment',
                    'c-vpn-4',
                    '56c4018ffa45',
                    'reaction',
                    '❤️',
                    1789753260000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-vpn-4-87a01f-2',
                    'comment',
                    'c-vpn-4',
                    '87a01fa29cb5',
                    'like',
                    '👍',
                    1789753290000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-vpn-4-42c90a-3',
                    'comment',
                    'c-vpn-4',
                    '42c90a18eb77',
                    'like',
                    '👍',
                    1789753320000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-vpn-4-b2901a-4',
                    'comment',
                    'c-vpn-4',
                    'b2901a4fc883',
                    'like',
                    '🔥',
                    1789753350000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-vpn-4-1c490a-5',
                    'comment',
                    'c-vpn-4',
                    '1c490a21fd88',
                    'like',
                    '🚀',
                    1789753380000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-vpn-4-6d88f1-6',
                    'comment',
                    'c-vpn-4',
                    '6d88f12a04cb',
                    'like',
                    '🧠',
                    1789753410000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-vpn-4-5ec401-7',
                    'comment',
                    'c-vpn-4',
                    '5ec4018fba67',
                    'like',
                    '🧠',
                    1789753440000
                );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-wireguard-vs-tailscale-56c401-0',
                'post',
                'p-seo-wireguard-vs-tailscale',
                '56c4018ffa45',
                'bookmark',
                '🧠',
                1789748460000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-wireguard-vs-tailscale-56c401',
                'post',
                'p-seo-wireguard-vs-tailscale',
                '56c4018ffa45',
                1,
                1789748460000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-wireguard-vs-tailscale-5e019a-1',
                'post',
                'p-seo-wireguard-vs-tailscale',
                '5e019ab28c66',
                'like',
                '👍',
                1789748520000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-wireguard-vs-tailscale-5e019a',
                'post',
                'p-seo-wireguard-vs-tailscale',
                '5e019ab28c66',
                1,
                1789748520000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-wireguard-vs-tailscale-2d89b1-2',
                'post',
                'p-seo-wireguard-vs-tailscale',
                '2d89b14c99a0',
                'reaction',
                '🚀',
                1789748580000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-wireguard-vs-tailscale-2d89b1',
                'post',
                'p-seo-wireguard-vs-tailscale',
                '2d89b14c99a0',
                1,
                1789748580000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-wireguard-vs-tailscale-19a408-3',
                'post',
                'p-seo-wireguard-vs-tailscale',
                '19a408ebc220',
                'reaction',
                '💡',
                1789748640000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-wireguard-vs-tailscale-19a408',
                'post',
                'p-seo-wireguard-vs-tailscale',
                '19a408ebc220',
                1,
                1789748640000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-wireguard-vs-tailscale-39b014-4',
                'post',
                'p-seo-wireguard-vs-tailscale',
                '39b014ea8d34',
                'bookmark',
                '❤️',
                1789748700000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-wireguard-vs-tailscale-39b014',
                'post',
                'p-seo-wireguard-vs-tailscale',
                '39b014ea8d34',
                1,
                1789748700000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-wireguard-vs-tailscale-59b04a-5',
                'post',
                'p-seo-wireguard-vs-tailscale',
                '59b04a11ee32',
                'like',
                '🔥',
                1789748760000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-wireguard-vs-tailscale-59b04a',
                'post',
                'p-seo-wireguard-vs-tailscale',
                '59b04a11ee32',
                1,
                1789748760000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-wireguard-vs-tailscale-52e091-6',
                'post',
                'p-seo-wireguard-vs-tailscale',
                '52e091bfa331',
                'like',
                '🔥',
                1789748820000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-wireguard-vs-tailscale-52e091',
                'post',
                'p-seo-wireguard-vs-tailscale',
                '52e091bfa331',
                1,
                1789748820000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-wireguard-vs-tailscale-24a014-7',
                'post',
                'p-seo-wireguard-vs-tailscale',
                '24a014f9ec89',
                'bookmark',
                '❤️',
                1789748880000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-wireguard-vs-tailscale-24a014',
                'post',
                'p-seo-wireguard-vs-tailscale',
                '24a014f9ec89',
                1,
                1789748880000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-wireguard-vs-tailscale-3e901a-8',
                'post',
                'p-seo-wireguard-vs-tailscale',
                '3e901a88fb22',
                'reaction',
                '🛡️',
                1789748940000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-wireguard-vs-tailscale-3e901a',
                'post',
                'p-seo-wireguard-vs-tailscale',
                '3e901a88fb22',
                1,
                1789748940000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-wireguard-vs-tailscale-91df90-9',
                'post',
                'p-seo-wireguard-vs-tailscale',
                '91df9012cb78',
                'like',
                '👍',
                1789749000000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-wireguard-vs-tailscale-91df90',
                'post',
                'p-seo-wireguard-vs-tailscale',
                '91df9012cb78',
                1,
                1789749000000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-wireguard-vs-tailscale-b1409e-10',
                'post',
                'p-seo-wireguard-vs-tailscale',
                'b1409ea28c99',
                'bookmark',
                '🛡️',
                1789749060000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-wireguard-vs-tailscale-b1409e',
                'post',
                'p-seo-wireguard-vs-tailscale',
                'b1409ea28c99',
                1,
                1789749060000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-wireguard-vs-tailscale-99df01-11',
                'post',
                'p-seo-wireguard-vs-tailscale',
                '99df012aa4c3',
                'like',
                '🚀',
                1789749120000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-wireguard-vs-tailscale-99df01',
                'post',
                'p-seo-wireguard-vs-tailscale',
                '99df012aa4c3',
                1,
                1789749120000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-wireguard-vs-tailscale-da0194-12',
                'post',
                'p-seo-wireguard-vs-tailscale',
                'da0194f28bc1',
                'reaction',
                '🔥',
                1789749180000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-wireguard-vs-tailscale-da0194',
                'post',
                'p-seo-wireguard-vs-tailscale',
                'da0194f28bc1',
                1,
                1789749180000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-wireguard-vs-tailscale-a0914e-13',
                'post',
                'p-seo-wireguard-vs-tailscale',
                'a0914e21fc88',
                'like',
                '🚀',
                1789749240000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-wireguard-vs-tailscale-a0914e',
                'post',
                'p-seo-wireguard-vs-tailscale',
                'a0914e21fc88',
                1,
                1789749240000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-wireguard-vs-tailscale-78a014-14',
                'post',
                'p-seo-wireguard-vs-tailscale',
                '78a014fb9c99',
                'like',
                '🔥',
                1789749300000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-wireguard-vs-tailscale-78a014',
                'post',
                'p-seo-wireguard-vs-tailscale',
                '78a014fb9c99',
                1,
                1789749300000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-wireguard-vs-tailscale-91c24f-15',
                'post',
                'p-seo-wireguard-vs-tailscale',
                '91c24fa0e891',
                'like',
                '🛡️',
                1789749360000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-wireguard-vs-tailscale-91c24f',
                'post',
                'p-seo-wireguard-vs-tailscale',
                '91c24fa0e891',
                1,
                1789749360000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-wireguard-vs-tailscale-7c9102-16',
                'post',
                'p-seo-wireguard-vs-tailscale',
                '7c9102ab84df',
                'bookmark',
                '🚀',
                1789749420000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-wireguard-vs-tailscale-7c9102',
                'post',
                'p-seo-wireguard-vs-tailscale',
                '7c9102ab84df',
                1,
                1789749420000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-wireguard-vs-tailscale-80c901-17',
                'post',
                'p-seo-wireguard-vs-tailscale',
                '80c901afdf23',
                'like',
                '👍',
                1789749480000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-wireguard-vs-tailscale-80c901',
                'post',
                'p-seo-wireguard-vs-tailscale',
                '80c901afdf23',
                1,
                1789749480000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-wireguard-vs-tailscale-b2901a-18',
                'post',
                'p-seo-wireguard-vs-tailscale',
                'b2901a4fc883',
                'reaction',
                '🔥',
                1789749540000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-wireguard-vs-tailscale-b2901a',
                'post',
                'p-seo-wireguard-vs-tailscale',
                'b2901a4fc883',
                1,
                1789749540000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-wireguard-vs-tailscale-1cf089-19',
                'post',
                'p-seo-wireguard-vs-tailscale',
                '1cf08912fa12',
                'bookmark',
                '👍',
                1789749600000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-wireguard-vs-tailscale-1cf089',
                'post',
                'p-seo-wireguard-vs-tailscale',
                '1cf08912fa12',
                1,
                1789749600000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-wireguard-vs-tailscale-83d201-20',
                'post',
                'p-seo-wireguard-vs-tailscale',
                '83d2019fab66',
                'reaction',
                '🚀',
                1789749660000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-wireguard-vs-tailscale-83d201',
                'post',
                'p-seo-wireguard-vs-tailscale',
                '83d2019fab66',
                1,
                1789749660000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-wireguard-vs-tailscale-54b09e-21',
                'post',
                'p-seo-wireguard-vs-tailscale',
                '54b09ef12a77',
                'bookmark',
                '❤️',
                1789749720000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-wireguard-vs-tailscale-54b09e',
                'post',
                'p-seo-wireguard-vs-tailscale',
                '54b09ef12a77',
                1,
                1789749720000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-wireguard-vs-tailscale-22c88f-22',
                'post',
                'p-seo-wireguard-vs-tailscale',
                '22c88f01a9df',
                'bookmark',
                '🔥',
                1789749780000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-wireguard-vs-tailscale-22c88f',
                'post',
                'p-seo-wireguard-vs-tailscale',
                '22c88f01a9df',
                1,
                1789749780000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-wireguard-vs-tailscale-87a01f-23',
                'post',
                'p-seo-wireguard-vs-tailscale',
                '87a01fa29cb5',
                'reaction',
                '🛡️',
                1789749840000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-wireguard-vs-tailscale-87a01f',
                'post',
                'p-seo-wireguard-vs-tailscale',
                '87a01fa29cb5',
                1,
                1789749840000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-wireguard-vs-tailscale-a50091-24',
                'post',
                'p-seo-wireguard-vs-tailscale',
                'a500912fa8cc',
                'like',
                '💡',
                1789749900000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-wireguard-vs-tailscale-a50091',
                'post',
                'p-seo-wireguard-vs-tailscale',
                'a500912fa8cc',
                1,
                1789749900000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-wireguard-vs-tailscale-94df02-25',
                'post',
                'p-seo-wireguard-vs-tailscale',
                '94df0218ab44',
                'like',
                '💡',
                1789749960000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-wireguard-vs-tailscale-94df02',
                'post',
                'p-seo-wireguard-vs-tailscale',
                '94df0218ab44',
                1,
                1789749960000
            );
INSERT OR REPLACE INTO posts (
            id, channel_id, author_id, author_role, title, content, flair,
            merit_votes, user_voted, reply_count, boost_count,
            attachment_json, video_json, images_json, poll_id, quoted_post_json,
            status, created_at, is_expanded
        ) VALUES (
            'p-seo-backup-321-restic-r2',
            'vault-guides',
            '29c40ea18df2',
            'MEMBER',
            'Strategia de backup 3-2-1 aplicată în practică: ZFS snapshots locale pe TrueNAS + Restic criptat offsite în Cloudflare R2 (cost lunar $0.00) 💾🛡️',
            'În IT există o vorbă cinică: *„Oamenii se împart în două categorii: cei care fac backup și cei care vor face backup după prima pierdere masivă de date.”*

Acum 2 ani un controller SATA defect mi-a corupt o întreagă matrice ext4. De atunci am implementat strict **regula 3-2-1 de backup**:
- **3 copii ale datelor**
- **2 medii diferite de stocare**
- **1 copie offsite (în afara casei)**

Iată cum arată arhitectura mea actuală, cu cost zero:

### Nivelul 1: Snapshots locale automate pe ZFS
Pe TrueNAS Scale am activat `Periodic Snapshot Tasks`:
- La fiecare 1 oră (păstrate 48 de ore)
- Zilnice (păstrate 30 de zile)
- Lunare (păstrate 1 an)
Dacă șterg accidental un fișier sau dacă un ransomware ar încerca să cripteze datele, dau rollback la snapshot-ul de acum 10 minute în 2 secunde.

### Nivelul 2: Replicare locală pe al doilea mediu
În fiecare duminică noaptea, TrueNAS sincronizează automat un dataset esențial către un al doilea disc rece (Cold HDD) conectat prin USB, care este apoi oprit din rotație (`hdparm -y`).

### Nivelul 3: Copia Offsite criptată în Cloudflare R2 cu Restic
Cloudflare R2 oferă **10 GB stocare gratuită** și cel mai important: **0 dolari taxe de egress (descărcare)** spre deosebire de AWS S3.
Folosesc utilitarul open-source **Restic**:
```bash
# Criptare client-side AES-256 înainte de a trimite orice bit pe net
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
export RESTIC_REPOSITORY="s3:https://<account-id>.r2.cloudflarestorage.com/my-backup-bucket"
export RESTIC_PASSWORD="cheia-mea-secreta-foarte-lunga"

restic backup /mnt/tank/documente_esentiale --tag cron-nightly
```
Restic face dedublicare pe blocuri de date și trimite doar diferențele incrementale. Un backup complet zilnic durează sub 40 de secunde.

Testați-vă backup-urile periodic! O copie de siguranță netestată este doar o iluzie.',
            'STORAGE & BACKUP',
            495,
            0,
            4,
            37,
            NULL, NULL, NULL, NULL, NULL,
            'published',
            1789751400000,
            0
        );
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-backup-321-restic-r2', 'backup', 1789751400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-backup-321-restic-r2', 'restic', 1789751400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-backup-321-restic-r2', 'truenas', 1789751400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-backup-321-restic-r2', 'zfs', 1789751400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-backup-321-restic-r2', 'cloudflare', 1789751400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-backup-321-restic-r2', 'r2', 1789751400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-backup-321-restic-r2', 'storage', 1789751400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-backup-321-restic-r2', 'security', 1789751400000);
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-bak-1',
                'p-seo-backup-321-restic-r2',
                NULL,
                '7f8a910c2b44',
                'MEMBER',
                'Exact așa trebuie făcut! Zero egress fees la R2 este un game-changer masiv comparat cu Amazon S3 unde plătești fiecare GB descărcat în caz că ai nevoie de un restore complet. Rulați și `restic check` lunar să verificați integritatea hash-urilor criptografice.',
                52,
                1789752600000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-bak-1-2d89b1-0',
                    'comment',
                    'c-bak-1',
                    '2d89b14c99a0',
                    'like',
                    '🚀',
                    1789752630000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-bak-1-60c801-1',
                    'comment',
                    'c-bak-1',
                    '60c8012acd78',
                    'reaction',
                    '🚀',
                    1789752660000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-bak-1-7b33a9-2',
                    'comment',
                    'c-bak-1',
                    '7b33a901ff42',
                    'reaction',
                    '🧠',
                    1789752690000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-bak-1-2a9104-3',
                    'comment',
                    'c-bak-1',
                    '2a9104eb8c33',
                    'reaction',
                    '❤️',
                    1789752720000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-bak-2',
                'p-seo-backup-321-restic-r2',
                NULL,
                '91c24fa0e891',
                'MEMBER',
                'Merge Restic și pe un Raspberry Pi 4 fără să îl înghețe? Am o colecție de poze RAW de vreo 350GB și mă gândeam să pun un Pi la casa părinților ca nod offsite.',
                31,
                1789753800000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-bak-2-aa0194-0',
                    'comment',
                    'c-bak-2',
                    'aa0194f2cd01',
                    'like',
                    '🚀',
                    1789753830000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-bak-2-6d88f1-1',
                    'comment',
                    'c-bak-2',
                    '6d88f12a04cb',
                    'like',
                    '👍',
                    1789753860000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-bak-2-63c901-2',
                    'comment',
                    'c-bak-2',
                    '63c901afb844',
                    'like',
                    '💡',
                    1789753890000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-bak-2-7b33a9-3',
                    'comment',
                    'c-bak-2',
                    '7b33a901ff42',
                    'reaction',
                    '🧠',
                    1789753920000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-bak-2-99df01-4',
                    'comment',
                    'c-bak-2',
                    '99df012aa4c3',
                    'like',
                    '💡',
                    1789753950000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-bak-2-2da014-5',
                    'comment',
                    'c-bak-2',
                    '2da014f9bc67',
                    'reaction',
                    '🔥',
                    1789753980000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-bak-3',
                'p-seo-backup-321-restic-r2',
                'c-bak-2',
                '29c40ea18df2',
                'MEMBER',
                '@PiHoarder Da, absolut! Procesorul de pe Pi 4 are instrucțiuni hardware de criptare AES (ARMv8 crypto extensions). Criptează la aproximativ 45-50 MB/s, deci o să meargă fără probleme pe conexiunea de net de acasă.',
                59,
                1789754400000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-bak-3-38df02-0',
                    'comment',
                    'c-bak-3',
                    '38df02ba91c0',
                    'like',
                    '🔥',
                    1789754430000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-bak-3-1c490a-1',
                    'comment',
                    'c-bak-3',
                    '1c490a21fd88',
                    'like',
                    '❤️',
                    1789754460000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-bak-3-79c901-2',
                    'comment',
                    'c-bak-3',
                    '79c901affa01',
                    'reaction',
                    '💡',
                    1789754490000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-bak-3-17df89-3',
                    'comment',
                    'c-bak-3',
                    '17df8902ab55',
                    'like',
                    '💡',
                    1789754520000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-bak-3-80c901-4',
                    'comment',
                    'c-bak-3',
                    '80c901afdf23',
                    'like',
                    '🔥',
                    1789754550000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-bak-3-66a019-5',
                    'comment',
                    'c-bak-3',
                    '66a0194ebd21',
                    'like',
                    '👍',
                    1789754580000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-bak-3-6d88f1-6',
                    'comment',
                    'c-bak-3',
                    '6d88f12a04cb',
                    'reaction',
                    '❤️',
                    1789754610000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-bak-4',
                'p-seo-backup-321-restic-r2',
                NULL,
                'c3dc28cb705e',
                'ARCHIVIST',
                'Excelent ghid! Criptarea pe partea de client înainte de upload este regula de aur a suveranității datelor. Furnizorul de cloud nu deține cheile, așadar chiar și în cazul unei breșe masive datele rămân un blob impenetrabil de zgomot matematic.',
                44,
                1789755000000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-bak-4-4b109a-0',
                    'comment',
                    'c-bak-4',
                    '4b109af38c01',
                    'like',
                    '🚀',
                    1789755030000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-bak-4-1c490a-1',
                    'comment',
                    'c-bak-4',
                    '1c490a21fd88',
                    'reaction',
                    '🚀',
                    1789755060000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-bak-4-79c901-2',
                    'comment',
                    'c-bak-4',
                    '79c901affa01',
                    'reaction',
                    '❤️',
                    1789755090000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-bak-4-3e901a-3',
                    'comment',
                    'c-bak-4',
                    '3e901a88fb22',
                    'like',
                    '👍',
                    1789755120000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-bak-4-92c401-4',
                    'comment',
                    'c-bak-4',
                    '92c4018fba77',
                    'reaction',
                    '👍',
                    1789755150000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-bak-4-17df89-5',
                    'comment',
                    'c-bak-4',
                    '17df8902ab55',
                    'like',
                    '🚀',
                    1789755180000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-bak-4-8d104f-6',
                    'comment',
                    'c-bak-4',
                    '8d104fb2a901',
                    'like',
                    '👍',
                    1789755210000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-bak-4-70a40f-7',
                    'comment',
                    'c-bak-4',
                    '70a40f91b2df',
                    'reaction',
                    '❤️',
                    1789755240000
                );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-backup-321-restic-r2-63c901-0',
                'post',
                'p-seo-backup-321-restic-r2',
                '63c901afb844',
                'reaction',
                '🔥',
                1789751460000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-backup-321-restic-r2-63c901',
                'post',
                'p-seo-backup-321-restic-r2',
                '63c901afb844',
                1,
                1789751460000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-backup-321-restic-r2-54b09e-1',
                'post',
                'p-seo-backup-321-restic-r2',
                '54b09ef12a77',
                'bookmark',
                '🔥',
                1789751520000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-backup-321-restic-r2-54b09e',
                'post',
                'p-seo-backup-321-restic-r2',
                '54b09ef12a77',
                1,
                1789751520000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-backup-321-restic-r2-4d89a0-2',
                'post',
                'p-seo-backup-321-restic-r2',
                '4d89a01fbb23',
                'reaction',
                '👍',
                1789751580000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-backup-321-restic-r2-4d89a0',
                'post',
                'p-seo-backup-321-restic-r2',
                '4d89a01fbb23',
                1,
                1789751580000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-backup-321-restic-r2-80c901-3',
                'post',
                'p-seo-backup-321-restic-r2',
                '80c901afdf23',
                'bookmark',
                '🧠',
                1789751640000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-backup-321-restic-r2-80c901',
                'post',
                'p-seo-backup-321-restic-r2',
                '80c901afdf23',
                1,
                1789751640000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-backup-321-restic-r2-f40019-4',
                'post',
                'p-seo-backup-321-restic-r2',
                'f40019bc88a2',
                'bookmark',
                '🚀',
                1789751700000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-backup-321-restic-r2-f40019',
                'post',
                'p-seo-backup-321-restic-r2',
                'f40019bc88a2',
                1,
                1789751700000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-backup-321-restic-r2-24a014-5',
                'post',
                'p-seo-backup-321-restic-r2',
                '24a014f9ec89',
                'like',
                '💡',
                1789751760000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-backup-321-restic-r2-24a014',
                'post',
                'p-seo-backup-321-restic-r2',
                '24a014f9ec89',
                1,
                1789751760000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-backup-321-restic-r2-5b2041-6',
                'post',
                'p-seo-backup-321-restic-r2',
                '5b2041e8d902',
                'bookmark',
                '❤️',
                1789751820000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-backup-321-restic-r2-5b2041',
                'post',
                'p-seo-backup-321-restic-r2',
                '5b2041e8d902',
                1,
                1789751820000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-backup-321-restic-r2-35df90-7',
                'post',
                'p-seo-backup-321-restic-r2',
                '35df9012a888',
                'reaction',
                '🔥',
                1789751880000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-backup-321-restic-r2-35df90',
                'post',
                'p-seo-backup-321-restic-r2',
                '35df9012a888',
                1,
                1789751880000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-backup-321-restic-r2-60c801-8',
                'post',
                'p-seo-backup-321-restic-r2',
                '60c8012acd78',
                'reaction',
                '👍',
                1789751940000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-backup-321-restic-r2-60c801',
                'post',
                'p-seo-backup-321-restic-r2',
                '60c8012acd78',
                1,
                1789751940000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-backup-321-restic-r2-44df90-9',
                'post',
                'p-seo-backup-321-restic-r2',
                '44df9012a8bc',
                'like',
                '🚀',
                1789752000000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-backup-321-restic-r2-44df90',
                'post',
                'p-seo-backup-321-restic-r2',
                '44df9012a8bc',
                1,
                1789752000000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-backup-321-restic-r2-64c801-10',
                'post',
                'p-seo-backup-321-restic-r2',
                '64c8012fab12',
                'bookmark',
                '🧠',
                1789752060000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-backup-321-restic-r2-64c801',
                'post',
                'p-seo-backup-321-restic-r2',
                '64c8012fab12',
                1,
                1789752060000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-backup-321-restic-r2-39b014-11',
                'post',
                'p-seo-backup-321-restic-r2',
                '39b014ea8d34',
                'reaction',
                '🔥',
                1789752120000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-backup-321-restic-r2-39b014',
                'post',
                'p-seo-backup-321-restic-r2',
                '39b014ea8d34',
                1,
                1789752120000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-backup-321-restic-r2-a50091-12',
                'post',
                'p-seo-backup-321-restic-r2',
                'a500912fa8cc',
                'bookmark',
                '👍',
                1789752180000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-backup-321-restic-r2-a50091',
                'post',
                'p-seo-backup-321-restic-r2',
                'a500912fa8cc',
                1,
                1789752180000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-backup-321-restic-r2-17df89-13',
                'post',
                'p-seo-backup-321-restic-r2',
                '17df8902ab55',
                'bookmark',
                '💡',
                1789752240000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-backup-321-restic-r2-17df89',
                'post',
                'p-seo-backup-321-restic-r2',
                '17df8902ab55',
                1,
                1789752240000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-backup-321-restic-r2-b2901a-14',
                'post',
                'p-seo-backup-321-restic-r2',
                'b2901a4fc883',
                'like',
                '🛡️',
                1789752300000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-backup-321-restic-r2-b2901a',
                'post',
                'p-seo-backup-321-restic-r2',
                'b2901a4fc883',
                1,
                1789752300000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-backup-321-restic-r2-7f8a91-15',
                'post',
                'p-seo-backup-321-restic-r2',
                '7f8a910c2b44',
                'like',
                '💡',
                1789752360000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-backup-321-restic-r2-7f8a91',
                'post',
                'p-seo-backup-321-restic-r2',
                '7f8a910c2b44',
                1,
                1789752360000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-backup-321-restic-r2-5ec401-16',
                'post',
                'p-seo-backup-321-restic-r2',
                '5ec4018fba67',
                'bookmark',
                '🛡️',
                1789752420000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-backup-321-restic-r2-5ec401',
                'post',
                'p-seo-backup-321-restic-r2',
                '5ec4018fba67',
                1,
                1789752420000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-backup-321-restic-r2-67c801-17',
                'post',
                'p-seo-backup-321-restic-r2',
                '67c8012afb90',
                'reaction',
                '👍',
                1789752480000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-backup-321-restic-r2-67c801',
                'post',
                'p-seo-backup-321-restic-r2',
                '67c8012afb90',
                1,
                1789752480000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-backup-321-restic-r2-22c88f-18',
                'post',
                'p-seo-backup-321-restic-r2',
                '22c88f01a9df',
                'bookmark',
                '🛡️',
                1789752540000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-backup-321-restic-r2-22c88f',
                'post',
                'p-seo-backup-321-restic-r2',
                '22c88f01a9df',
                1,
                1789752540000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-backup-321-restic-r2-42c90a-19',
                'post',
                'p-seo-backup-321-restic-r2',
                '42c90a18eb77',
                'like',
                '🧠',
                1789752600000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-backup-321-restic-r2-42c90a',
                'post',
                'p-seo-backup-321-restic-r2',
                '42c90a18eb77',
                1,
                1789752600000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-backup-321-restic-r2-8d104f-20',
                'post',
                'p-seo-backup-321-restic-r2',
                '8d104fb2a901',
                'bookmark',
                '🚀',
                1789752660000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-backup-321-restic-r2-8d104f',
                'post',
                'p-seo-backup-321-restic-r2',
                '8d104fb2a901',
                1,
                1789752660000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-backup-321-restic-r2-4e198a-21',
                'post',
                'p-seo-backup-321-restic-r2',
                '4e198a00b215',
                'bookmark',
                '🛡️',
                1789752720000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-backup-321-restic-r2-4e198a',
                'post',
                'p-seo-backup-321-restic-r2',
                '4e198a00b215',
                1,
                1789752720000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-backup-321-restic-r2-13f089-22',
                'post',
                'p-seo-backup-321-restic-r2',
                '13f08912ef34',
                'reaction',
                '💡',
                1789752780000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-backup-321-restic-r2-13f089',
                'post',
                'p-seo-backup-321-restic-r2',
                '13f08912ef34',
                1,
                1789752780000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-backup-321-restic-r2-c3dc28-23',
                'post',
                'p-seo-backup-321-restic-r2',
                'c3dc28cb705e',
                'bookmark',
                '💡',
                1789752840000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-backup-321-restic-r2-c3dc28',
                'post',
                'p-seo-backup-321-restic-r2',
                'c3dc28cb705e',
                1,
                1789752840000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-backup-321-restic-r2-91df90-24',
                'post',
                'p-seo-backup-321-restic-r2',
                '91df9012cb78',
                'like',
                '👍',
                1789752900000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-backup-321-restic-r2-91df90',
                'post',
                'p-seo-backup-321-restic-r2',
                '91df9012cb78',
                1,
                1789752900000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-backup-321-restic-r2-9f4a12-25',
                'post',
                'p-seo-backup-321-restic-r2',
                '9f4a120c8b31',
                'reaction',
                '👍',
                1789752960000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-backup-321-restic-r2-9f4a12',
                'post',
                'p-seo-backup-321-restic-r2',
                '9f4a120c8b31',
                1,
                1789752960000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-backup-321-restic-r2-82c901-26',
                'post',
                'p-seo-backup-321-restic-r2',
                '82c901afcb45',
                'like',
                '💡',
                1789753020000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-backup-321-restic-r2-82c901',
                'post',
                'p-seo-backup-321-restic-r2',
                '82c901afcb45',
                1,
                1789753020000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-backup-321-restic-r2-a30194-27',
                'post',
                'p-seo-backup-321-restic-r2',
                'a30194f2de89',
                'bookmark',
                '👍',
                1789753080000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-backup-321-restic-r2-a30194',
                'post',
                'p-seo-backup-321-restic-r2',
                'a30194f2de89',
                1,
                1789753080000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-backup-321-restic-r2-92c401-28',
                'post',
                'p-seo-backup-321-restic-r2',
                '92c4018fba77',
                'reaction',
                '🛡️',
                1789753140000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-backup-321-restic-r2-92c401',
                'post',
                'p-seo-backup-321-restic-r2',
                '92c4018fba77',
                1,
                1789753140000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-backup-321-restic-r2-2a9104-29',
                'post',
                'p-seo-backup-321-restic-r2',
                '2a9104eb8c33',
                'reaction',
                '🛡️',
                1789753200000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-backup-321-restic-r2-2a9104',
                'post',
                'p-seo-backup-321-restic-r2',
                '2a9104eb8c33',
                1,
                1789753200000
            );
INSERT OR REPLACE INTO posts (
            id, channel_id, author_id, author_role, title, content, flair,
            merit_votes, user_voted, reply_count, boost_count,
            attachment_json, video_json, images_json, poll_id, quoted_post_json,
            status, created_at, is_expanded
        ) VALUES (
            'p-seo-grapheneos-review',
            'relays-general',
            '52e091bfa331',
            'MEMBER',
            '6 luni cu GrapheneOS pe Google Pixel ca daily driver: Ce funcționează impecabil, ce bănci fac figuri și de ce autonomia bateriei s-a dublat 📱🔒',
            'În martie am cumpărat un Google Pixel 8 cu un singur scop: să șterg Android-ul stoc de la Google și să instalez **GrapheneOS**, sistemul de operare axat pe securitate și confidențialitate extremă.

După 6 luni de utilizare zilnică intensă ca telefon unic de muncă și viață personală, iată concluziile reale:

### 1. Funcționează aplicațiile bancare din România?
Surprinzător, **DA**:
- **Revolut**: Funcționează 100% (autentificare biometrică, plăți, carduri virtuale).
- **BT Pay (Banca Transilvania)**: Funcționează perfect după instalarea Sandboxed Google Play Services.
- **George România (BCR)**: Funcționează fără probleme.
- **ING Home''Bank**: Funcționează.
- *Excepție*: Unele funcționalități care depind de Google Pay NFC pentru plata contactless la POS necesită instalarea aplicației Google Wallet în sandbox-ul izolat.

### 2. Ce este Sandboxed Google Play și de ce este revoluționar?
Pe un telefon normal, Google Play are permisiuni de sistem absolute (root-level), citește ID-ul hardware, locația în fundal și contactele. Pe GrapheneOS, Google Play rulează ca **o aplicație obișnuită fără niciun privilegiu special**. Nu are acces la memoria telefonului sau la locație decât dacă îi permiți tu explicit!

### 3. Autonomia bateriei: O surpriză masivă
Pe Android-ul stoc trebuia să încarc telefonul la ora 19:00. Pe GrapheneOS ajung la ora 23:00 cu **45-50% baterie rămasă**! Motivul? Am scăpat de miile de conexiuni de telemetrie, ad-tracking și analize în fundal pe care serviciile Google le trimit non-stop.

### 4. Contact Scopes & Storage Scopes
Cea mai tare funcționalitate: Când WhatsApp sau altă aplicație îți cere „Acces la contacte”, GrapheneOS îți permite să îi dai acces doar la 3 persoane alese de tine, restul agendei rămânând complet invizibilă pentru aplicație!

Pentru cine vrea un telefon modern fără să fie urmărit la fiecare pas, GrapheneOS este cel mai matur proiect open-source din ecosistemul mobil.',
            'MOBILE PRIVACY',
            530,
            0,
            4,
            48,
            NULL, NULL, NULL, NULL, NULL,
            'published',
            1789753200000,
            0
        );
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-grapheneos-review', 'grapheneos', 1789753200000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-grapheneos-review', 'pixel', 1789753200000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-grapheneos-review', 'android', 1789753200000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-grapheneos-review', 'privacy', 1789753200000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-grapheneos-review', 'degoogled', 1789753200000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-grapheneos-review', 'mobileprivacy', 1789753200000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-grapheneos-review', 'security', 1789753200000);
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-grap-1',
                'p-seo-grapheneos-review',
                NULL,
                '3a4092bbf102',
                'MODERATOR',
                'Contact Scopes este exact genul de granularitate pe care Comisia Europeană și GDPR-ul ar fi trebuit să o impună ca standard la nivel de Android și iOS. Faptul că o aplicație de ride-sharing îți cere acces la toate contactele sau refuză să funcționeze este un abuz grav.',
                71,
                1789754400000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-grap-1-99df01-0',
                    'comment',
                    'c-grap-1',
                    '99df012aa4c3',
                    'reaction',
                    '🚀',
                    1789754430000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-grap-1-9ad090-1',
                    'comment',
                    'c-grap-1',
                    '9ad09012ab56',
                    'like',
                    '🚀',
                    1789754460000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-grap-1-66a019-2',
                    'comment',
                    'c-grap-1',
                    '66a0194ebd21',
                    'like',
                    '💡',
                    1789754490000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-grap-1-19a408-3',
                    'comment',
                    'c-grap-1',
                    '19a408ebc220',
                    'reaction',
                    '💡',
                    1789754520000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-grap-2',
                'p-seo-grapheneos-review',
                NULL,
                '22c88f01a9df',
                'MEMBER',
                'Cum stai cu notificările de la aplicații? Vin instant prin sandbox sau folosești UnifiedPush cu server ntfy?',
                33,
                1789755000000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-grap-2-39b014-0',
                    'comment',
                    'c-grap-2',
                    '39b014ea8d34',
                    'like',
                    '👍',
                    1789755030000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-grap-2-3c91a4-1',
                    'comment',
                    'c-grap-2',
                    '3c91a4e082aa',
                    'reaction',
                    '🧠',
                    1789755060000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-grap-2-70a40f-2',
                    'comment',
                    'c-grap-2',
                    '70a40f91b2df',
                    'like',
                    '🔥',
                    1789755090000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-grap-2-94df02-3',
                    'comment',
                    'c-grap-2',
                    '94df0218ab44',
                    'like',
                    '💡',
                    1789755120000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-grap-2-99df01-4',
                    'comment',
                    'c-grap-2',
                    '99df012aa4c3',
                    'like',
                    '❤️',
                    1789755150000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-grap-2-79c901-5',
                    'comment',
                    'c-grap-2',
                    '79c901affa01',
                    'like',
                    '🔥',
                    1789755180000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-grap-2-82c901-6',
                    'comment',
                    'c-grap-2',
                    '82c901afcb45',
                    'reaction',
                    '🔥',
                    1789755210000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-grap-3',
                'p-seo-grapheneos-review',
                'c-grap-2',
                '52e091bfa331',
                'MEMBER',
                '@CoffeeOverflow Pentru aplicațiile cu Signal și UREfy folosesc websockets native fără Google. Pentru aplicațiile uzuale care depind de Firebase Cloud Messaging (FCM), notificările vin instant prin Sandboxed Google Play fără să consume baterie sesizabilă.',
                48,
                1789755600000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-grap-3-91c24f-0',
                    'comment',
                    'c-grap-3',
                    '91c24fa0e891',
                    'reaction',
                    '👍',
                    1789755630000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-grap-3-5e019a-1',
                    'comment',
                    'c-grap-3',
                    '5e019ab28c66',
                    'reaction',
                    '💡',
                    1789755660000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-grap-3-66a019-2',
                    'comment',
                    'c-grap-3',
                    '66a0194ebd21',
                    'like',
                    '👍',
                    1789755690000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-grap-3-2d89b1-3',
                    'comment',
                    'c-grap-3',
                    '2d89b14c99a0',
                    'like',
                    '🧠',
                    1789755720000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-grap-3-aa0194-4',
                    'comment',
                    'c-grap-3',
                    'aa0194f2cd01',
                    'like',
                    '🧠',
                    1789755750000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-grap-3-a7df90-5',
                    'comment',
                    'c-grap-3',
                    'a7df9012bc23',
                    'like',
                    '🚀',
                    1789755780000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-grap-3-11f802-6',
                    'comment',
                    'c-grap-3',
                    '11f802ea9bc4',
                    'reaction',
                    '🧠',
                    1789755810000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-grap-4',
                'p-seo-grapheneos-review',
                NULL,
                '4b109af38c01',
                'MEMBER',
                'Merită menționat și că pe Pixel 8 / 9 ai suport hardware pentru MTE (Memory Tagging Extension). GrapheneOS activează MTE pe componentele critice de sistem, ceea ce elimină peste 70% din exploit-urile de memorie bazate pe buffer overflow și use-after-free.',
                62,
                1789756200000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-grap-4-5e019a-0',
                    'comment',
                    'c-grap-4',
                    '5e019ab28c66',
                    'like',
                    '🔥',
                    1789756230000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-grap-4-a0914e-1',
                    'comment',
                    'c-grap-4',
                    'a0914e21fc88',
                    'like',
                    '🧠',
                    1789756260000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-grap-4-91c24f-2',
                    'comment',
                    'c-grap-4',
                    '91c24fa0e891',
                    'like',
                    '🚀',
                    1789756290000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-grap-4-54b09e-3',
                    'comment',
                    'c-grap-4',
                    '54b09ef12a77',
                    'reaction',
                    '👍',
                    1789756320000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-grap-4-42c90a-4',
                    'comment',
                    'c-grap-4',
                    '42c90a18eb77',
                    'reaction',
                    '🧠',
                    1789756350000
                );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-grapheneos-review-a30194-0',
                'post',
                'p-seo-grapheneos-review',
                'a30194f2de89',
                'reaction',
                '❤️',
                1789753260000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-grapheneos-review-a30194',
                'post',
                'p-seo-grapheneos-review',
                'a30194f2de89',
                1,
                1789753260000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-grapheneos-review-2d89b1-2',
                'post',
                'p-seo-grapheneos-review',
                '2d89b14c99a0',
                'reaction',
                '🧠',
                1789753380000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-grapheneos-review-2d89b1',
                'post',
                'p-seo-grapheneos-review',
                '2d89b14c99a0',
                1,
                1789753380000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-grapheneos-review-64c801-3',
                'post',
                'p-seo-grapheneos-review',
                '64c8012fab12',
                'like',
                '🧠',
                1789753440000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-grapheneos-review-64c801',
                'post',
                'p-seo-grapheneos-review',
                '64c8012fab12',
                1,
                1789753440000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-grapheneos-review-a0914e-4',
                'post',
                'p-seo-grapheneos-review',
                'a0914e21fc88',
                'bookmark',
                '💡',
                1789753500000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-grapheneos-review-a0914e',
                'post',
                'p-seo-grapheneos-review',
                'a0914e21fc88',
                1,
                1789753500000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-grapheneos-review-67c801-5',
                'post',
                'p-seo-grapheneos-review',
                '67c8012afb90',
                'bookmark',
                '🚀',
                1789753560000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-grapheneos-review-67c801',
                'post',
                'p-seo-grapheneos-review',
                '67c8012afb90',
                1,
                1789753560000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-grapheneos-review-a410ef-6',
                'post',
                'p-seo-grapheneos-review',
                'a410ef89b231',
                'like',
                '🔥',
                1789753620000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-grapheneos-review-a410ef',
                'post',
                'p-seo-grapheneos-review',
                'a410ef89b231',
                1,
                1789753620000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-grapheneos-review-56c401-7',
                'post',
                'p-seo-grapheneos-review',
                '56c4018ffa45',
                'bookmark',
                '💡',
                1789753680000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-grapheneos-review-56c401',
                'post',
                'p-seo-grapheneos-review',
                '56c4018ffa45',
                1,
                1789753680000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-grapheneos-review-35df90-8',
                'post',
                'p-seo-grapheneos-review',
                '35df9012a888',
                'bookmark',
                '👍',
                1789753740000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-grapheneos-review-35df90',
                'post',
                'p-seo-grapheneos-review',
                '35df9012a888',
                1,
                1789753740000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-grapheneos-review-82c901-9',
                'post',
                'p-seo-grapheneos-review',
                '82c901afcb45',
                'reaction',
                '🧠',
                1789753800000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-grapheneos-review-82c901',
                'post',
                'p-seo-grapheneos-review',
                '82c901afcb45',
                1,
                1789753800000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-grapheneos-review-83d201-10',
                'post',
                'p-seo-grapheneos-review',
                '83d2019fab66',
                'like',
                '💡',
                1789753860000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-grapheneos-review-83d201',
                'post',
                'p-seo-grapheneos-review',
                '83d2019fab66',
                1,
                1789753860000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-grapheneos-review-31f90a-11',
                'post',
                'p-seo-grapheneos-review',
                '31f90a44ec12',
                'reaction',
                '🔥',
                1789753920000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-grapheneos-review-31f90a',
                'post',
                'p-seo-grapheneos-review',
                '31f90a44ec12',
                1,
                1789753920000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-grapheneos-review-77e102-12',
                'post',
                'p-seo-grapheneos-review',
                '77e1029ba4c0',
                'reaction',
                '🔥',
                1789753980000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-grapheneos-review-77e102',
                'post',
                'p-seo-grapheneos-review',
                '77e1029ba4c0',
                1,
                1789753980000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-grapheneos-review-54b09e-13',
                'post',
                'p-seo-grapheneos-review',
                '54b09ef12a77',
                'reaction',
                '🛡️',
                1789754040000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-grapheneos-review-54b09e',
                'post',
                'p-seo-grapheneos-review',
                '54b09ef12a77',
                1,
                1789754040000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-grapheneos-review-13f089-14',
                'post',
                'p-seo-grapheneos-review',
                '13f08912ef34',
                'reaction',
                '💡',
                1789754100000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-grapheneos-review-13f089',
                'post',
                'p-seo-grapheneos-review',
                '13f08912ef34',
                1,
                1789754100000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-grapheneos-review-1cf089-15',
                'post',
                'p-seo-grapheneos-review',
                '1cf08912fa12',
                'like',
                '💡',
                1789754160000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-grapheneos-review-1cf089',
                'post',
                'p-seo-grapheneos-review',
                '1cf08912fa12',
                1,
                1789754160000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-grapheneos-review-2a9104-16',
                'post',
                'p-seo-grapheneos-review',
                '2a9104eb8c33',
                'reaction',
                '🔥',
                1789754220000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-grapheneos-review-2a9104',
                'post',
                'p-seo-grapheneos-review',
                '2a9104eb8c33',
                1,
                1789754220000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-grapheneos-review-94df02-17',
                'post',
                'p-seo-grapheneos-review',
                '94df0218ab44',
                'reaction',
                '🔥',
                1789754280000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-grapheneos-review-94df02',
                'post',
                'p-seo-grapheneos-review',
                '94df0218ab44',
                1,
                1789754280000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-grapheneos-review-5e019a-18',
                'post',
                'p-seo-grapheneos-review',
                '5e019ab28c66',
                'like',
                '👍',
                1789754340000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-grapheneos-review-5e019a',
                'post',
                'p-seo-grapheneos-review',
                '5e019ab28c66',
                1,
                1789754340000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-grapheneos-review-80c901-19',
                'post',
                'p-seo-grapheneos-review',
                '80c901afdf23',
                'reaction',
                '❤️',
                1789754400000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-grapheneos-review-80c901',
                'post',
                'p-seo-grapheneos-review',
                '80c901afdf23',
                1,
                1789754400000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-grapheneos-review-38df02-20',
                'post',
                'p-seo-grapheneos-review',
                '38df02ba91c0',
                'like',
                '🧠',
                1789754460000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-grapheneos-review-38df02',
                'post',
                'p-seo-grapheneos-review',
                '38df02ba91c0',
                1,
                1789754460000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-grapheneos-review-b1409e-21',
                'post',
                'p-seo-grapheneos-review',
                'b1409ea28c99',
                'bookmark',
                '💡',
                1789754520000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-grapheneos-review-b1409e',
                'post',
                'p-seo-grapheneos-review',
                'b1409ea28c99',
                1,
                1789754520000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-grapheneos-review-60c801-22',
                'post',
                'p-seo-grapheneos-review',
                '60c8012acd78',
                'like',
                '👍',
                1789754580000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-grapheneos-review-60c801',
                'post',
                'p-seo-grapheneos-review',
                '60c8012acd78',
                1,
                1789754580000
            );
INSERT OR REPLACE INTO posts (
            id, channel_id, author_id, author_role, title, content, flair,
            merit_votes, user_voted, reply_count, boost_count,
            attachment_json, video_json, images_json, poll_id, quoted_post_json,
            status, created_at, is_expanded
        ) VALUES (
            'p-seo-tauri-vs-electron',
            'relays-dev',
            'da0194f28bc1',
            'MEMBER',
            'Benchmark real de performanță: Am rescris o aplicație din Electron în Tauri v2. Consum RAM redus de la 480 MB la 34 MB și executabil de 8 MB! 🚀⚡',
            'Să împachetezi un browser întreg Chromium și un runtime Node.js pentru o aplicație de chat sau productivitate a fost mereu o risipă uriașă de resurse.

Iată datele concrete după rescrierea completă a clientului nostru de desktop din **Electron 31** în **Tauri 2.0 (Rust backend + Svelte/TypeScript frontend)**:

### 1. Măsurători concrete (Testat pe Windows 11 & Fedora Linux):
- **Dimensiune kit de instalare (Installer)**:
  - Electron: **98.4 MB**
  - Tauri v2: **8.2 MB** (-91.6% mai mic!)
- **Consum RAM în Idle (la pornire)**:
  - Electron: **480 MB** (3 procese Chromium helper + GPU process + Node main)
  - Tauri v2: **34 MB** (folosește WebView2 pe Windows / WebKitGTK pe Linux)
- **Timp de pornire (Cold Start)**:
  - Electron: **1.85 secunde**
  - Tauri v2: **110 milisecunde** (instantaneu!)

### 2. Securitate prin Capability Files
În Electron, dacă ai o vulnerabilitate XSS în frontend, atacatorul poate chema `require(''child_process'').exec()` și obține Remote Code Execution (RCE) imediat pe mașina utilizatorului.
În Tauri v2, sistemul de **Capabilities** din Rust blochează totul implicit:
Frontend-ul nu poate citi niciun fișier de pe disc și nu poate executa nicio comandă decât dacă este declarată strict în `src-tauri/capabilities/default.json`.

Dacă începeți un proiect desktop nou în 2026, nu mai există niciun motiv tehnic valid să alegeți Electron.',
            'FRONTEND & BENCHMARK',
            470,
            0,
            4,
            36,
            NULL, NULL, NULL, NULL, NULL,
            'published',
            1789754400000,
            0
        );
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-tauri-vs-electron', 'tauri', 1789754400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-tauri-vs-electron', 'rust', 1789754400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-tauri-vs-electron', 'electron', 1789754400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-tauri-vs-electron', 'performance', 1789754400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-tauri-vs-electron', 'frontend', 1789754400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-tauri-vs-electron', 'benchmark', 1789754400000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-tauri-vs-electron', 'webdev', 1789754400000);
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-tau-1',
                'p-seo-tauri-vs-electron',
                NULL,
                '3c91a4e082aa',
                'MEMBER',
                'Și cel mai tare este suportul de mobile în Tauri 2.0! Cu același backend scris în Rust și același frontend Svelte/Tailwind poți compila nativ și pentru Android și iOS cu API-uri de biometrie și stocare securizată direct în Keychain / Keystore.',
                53,
                1789755600000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-tau-1-1c490a-0',
                    'comment',
                    'c-tau-1',
                    '1c490a21fd88',
                    'like',
                    '💡',
                    1789755630000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-tau-1-c0a184-1',
                    'comment',
                    'c-tau-1',
                    'c0a184e912fd',
                    'like',
                    '🧠',
                    1789755660000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-tau-1-36b014-2',
                    'comment',
                    'c-tau-1',
                    '36b014eaef90',
                    'like',
                    '💡',
                    1789755690000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-tau-1-3a4092-3',
                    'comment',
                    'c-tau-1',
                    '3a4092bbf102',
                    'reaction',
                    '🧠',
                    1789755720000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-tau-1-91df90-4',
                    'comment',
                    'c-tau-1',
                    '91df9012cb78',
                    'like',
                    '👍',
                    1789755750000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-tau-1-a0914e-5',
                    'comment',
                    'c-tau-1',
                    'a0914e21fc88',
                    'like',
                    '💡',
                    1789755780000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-tau-1-f40019-6',
                    'comment',
                    'c-tau-1',
                    'f40019bc88a2',
                    'reaction',
                    '🔥',
                    1789755810000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-tau-2',
                'p-seo-tauri-vs-electron',
                NULL,
                '2d89b14c99a0',
                'MEMBER',
                'Singura mică provocare pe care am întâlnit-o la Tauri pe Linux este diferența de randare CSS între WebKitGTK și Chromium (mai ales la blur-uri backdrop-filter complexe). Dar cu Tailwind v4 și variabile CSS moderne se rezolvă curat.',
                36,
                1789756200000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-tau-2-da0194-0',
                    'comment',
                    'c-tau-2',
                    'da0194f28bc1',
                    'like',
                    '🧠',
                    1789756230000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-tau-2-aa0194-1',
                    'comment',
                    'c-tau-2',
                    'aa0194f2cd01',
                    'reaction',
                    '👍',
                    1789756260000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-tau-2-88b401-2',
                    'comment',
                    'c-tau-2',
                    '88b4012ce9fa',
                    'like',
                    '👍',
                    1789756290000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-tau-2-c3dc28-3',
                    'comment',
                    'c-tau-2',
                    'c3dc28cb705e',
                    'like',
                    '💡',
                    1789756320000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-tau-2-a30194-4',
                    'comment',
                    'c-tau-2',
                    'a30194f2de89',
                    'like',
                    '🧠',
                    1789756350000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-tau-3',
                'p-seo-tauri-vs-electron',
                'c-tau-2',
                'da0194f28bc1',
                'MEMBER',
                '@NeonCat Așa e, WebKitGTK pe Linux necesită uneori `-webkit-backdrop-filter` explicit. Dar la viteza cu care pornește aplicația și faptul că nu-mi omoară bateria de la laptop merită cu vârf și îndesat.',
                41,
                1789756800000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-tau-3-1cf089-0',
                    'comment',
                    'c-tau-3',
                    '1cf08912fa12',
                    'reaction',
                    '💡',
                    1789756830000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-tau-3-91c24f-1',
                    'comment',
                    'c-tau-3',
                    '91c24fa0e891',
                    'reaction',
                    '💡',
                    1789756860000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-tau-3-22c88f-2',
                    'comment',
                    'c-tau-3',
                    '22c88f01a9df',
                    'like',
                    '🚀',
                    1789756890000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-tau-3-35df90-3',
                    'comment',
                    'c-tau-3',
                    '35df9012a888',
                    'like',
                    '🔥',
                    1789756920000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-tau-3-59b04a-4',
                    'comment',
                    'c-tau-3',
                    '59b04a11ee32',
                    'like',
                    '👍',
                    1789756950000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-tau-3-36b014-5',
                    'comment',
                    'c-tau-3',
                    '36b014eaef90',
                    'reaction',
                    '🧠',
                    1789756980000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-tau-3-f40019-6',
                    'comment',
                    'c-tau-3',
                    'f40019bc88a2',
                    'reaction',
                    '🧠',
                    1789757010000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-tau-4',
                'p-seo-tauri-vs-electron',
                NULL,
                '82c901afcb45',
                'MEMBER',
                'Și accesibilitatea este mult superioară! WebView2 pe Windows se leagă direct la UI Automation fără wrapper-ele stângace din Chromium, astfel că screen readerele ca NVDA sau JAWS navighează mult mai natural prin interfețe.',
                45,
                1789757400000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-tau-4-83d201-0',
                    'comment',
                    'c-tau-4',
                    '83d2019fab66',
                    'like',
                    '🔥',
                    1789757430000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-tau-4-bf0194-1',
                    'comment',
                    'c-tau-4',
                    'bf0194a28cc1',
                    'reaction',
                    '❤️',
                    1789757460000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-tau-4-c0a184-2',
                    'comment',
                    'c-tau-4',
                    'c0a184e912fd',
                    'like',
                    '👍',
                    1789757490000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-tau-4-15e092-3',
                    'comment',
                    'c-tau-4',
                    '15e0921ab4c8',
                    'reaction',
                    '🔥',
                    1789757520000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-tau-4-22c88f-4',
                    'comment',
                    'c-tau-4',
                    '22c88f01a9df',
                    'like',
                    '👍',
                    1789757550000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-tau-4-a7df90-5',
                    'comment',
                    'c-tau-4',
                    'a7df9012bc23',
                    'like',
                    '💡',
                    1789757580000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-tau-4-59b04a-6',
                    'comment',
                    'c-tau-4',
                    '59b04a11ee32',
                    'reaction',
                    '💡',
                    1789757610000
                );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-tauri-vs-electron-5ec401-0',
                'post',
                'p-seo-tauri-vs-electron',
                '5ec4018fba67',
                'bookmark',
                '🧠',
                1789754460000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-tauri-vs-electron-5ec401',
                'post',
                'p-seo-tauri-vs-electron',
                '5ec4018fba67',
                1,
                1789754460000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-tauri-vs-electron-a89104-1',
                'post',
                'p-seo-tauri-vs-electron',
                'a89104fa2211',
                'reaction',
                '🚀',
                1789754520000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-tauri-vs-electron-a89104',
                'post',
                'p-seo-tauri-vs-electron',
                'a89104fa2211',
                1,
                1789754520000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-tauri-vs-electron-80c901-2',
                'post',
                'p-seo-tauri-vs-electron',
                '80c901afdf23',
                'bookmark',
                '🚀',
                1789754580000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-tauri-vs-electron-80c901',
                'post',
                'p-seo-tauri-vs-electron',
                '80c901afdf23',
                1,
                1789754580000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-tauri-vs-electron-82c901-3',
                'post',
                'p-seo-tauri-vs-electron',
                '82c901afcb45',
                'like',
                '👍',
                1789754640000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-tauri-vs-electron-82c901',
                'post',
                'p-seo-tauri-vs-electron',
                '82c901afcb45',
                1,
                1789754640000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-tauri-vs-electron-79c901-4',
                'post',
                'p-seo-tauri-vs-electron',
                '79c901affa01',
                'reaction',
                '🔥',
                1789754700000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-tauri-vs-electron-79c901',
                'post',
                'p-seo-tauri-vs-electron',
                '79c901affa01',
                1,
                1789754700000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-tauri-vs-electron-c0a184-5',
                'post',
                'p-seo-tauri-vs-electron',
                'c0a184e912fd',
                'like',
                '❤️',
                1789754760000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-tauri-vs-electron-c0a184',
                'post',
                'p-seo-tauri-vs-electron',
                'c0a184e912fd',
                1,
                1789754760000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-tauri-vs-electron-38df02-6',
                'post',
                'p-seo-tauri-vs-electron',
                '38df02ba91c0',
                'bookmark',
                '🧠',
                1789754820000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-tauri-vs-electron-38df02',
                'post',
                'p-seo-tauri-vs-electron',
                '38df02ba91c0',
                1,
                1789754820000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-tauri-vs-electron-91c24f-7',
                'post',
                'p-seo-tauri-vs-electron',
                '91c24fa0e891',
                'bookmark',
                '❤️',
                1789754880000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-tauri-vs-electron-91c24f',
                'post',
                'p-seo-tauri-vs-electron',
                '91c24fa0e891',
                1,
                1789754880000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-tauri-vs-electron-2a9104-8',
                'post',
                'p-seo-tauri-vs-electron',
                '2a9104eb8c33',
                'reaction',
                '🚀',
                1789754940000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-tauri-vs-electron-2a9104',
                'post',
                'p-seo-tauri-vs-electron',
                '2a9104eb8c33',
                1,
                1789754940000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-tauri-vs-electron-70a40f-9',
                'post',
                'p-seo-tauri-vs-electron',
                '70a40f91b2df',
                'like',
                '🛡️',
                1789755000000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-tauri-vs-electron-70a40f',
                'post',
                'p-seo-tauri-vs-electron',
                '70a40f91b2df',
                1,
                1789755000000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-tauri-vs-electron-24a014-10',
                'post',
                'p-seo-tauri-vs-electron',
                '24a014f9ec89',
                'like',
                '👍',
                1789755060000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-tauri-vs-electron-24a014',
                'post',
                'p-seo-tauri-vs-electron',
                '24a014f9ec89',
                1,
                1789755060000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-tauri-vs-electron-54b09e-11',
                'post',
                'p-seo-tauri-vs-electron',
                '54b09ef12a77',
                'bookmark',
                '❤️',
                1789755120000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-tauri-vs-electron-54b09e',
                'post',
                'p-seo-tauri-vs-electron',
                '54b09ef12a77',
                1,
                1789755120000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-tauri-vs-electron-88f019-12',
                'post',
                'p-seo-tauri-vs-electron',
                '88f019ab4c21',
                'bookmark',
                '🔥',
                1789755180000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-tauri-vs-electron-88f019',
                'post',
                'p-seo-tauri-vs-electron',
                '88f019ab4c21',
                1,
                1789755180000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-tauri-vs-electron-59b04a-13',
                'post',
                'p-seo-tauri-vs-electron',
                '59b04a11ee32',
                'bookmark',
                '❤️',
                1789755240000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-tauri-vs-electron-59b04a',
                'post',
                'p-seo-tauri-vs-electron',
                '59b04a11ee32',
                1,
                1789755240000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-tauri-vs-electron-6f1084-14',
                'post',
                'p-seo-tauri-vs-electron',
                '6f1084ea2b99',
                'like',
                '👍',
                1789755300000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-tauri-vs-electron-6f1084',
                'post',
                'p-seo-tauri-vs-electron',
                '6f1084ea2b99',
                1,
                1789755300000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-tauri-vs-electron-a50091-15',
                'post',
                'p-seo-tauri-vs-electron',
                'a500912fa8cc',
                'like',
                '👍',
                1789755360000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-tauri-vs-electron-a50091',
                'post',
                'p-seo-tauri-vs-electron',
                'a500912fa8cc',
                1,
                1789755360000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-tauri-vs-electron-4b109a-16',
                'post',
                'p-seo-tauri-vs-electron',
                '4b109af38c01',
                'reaction',
                '💡',
                1789755420000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-tauri-vs-electron-4b109a',
                'post',
                'p-seo-tauri-vs-electron',
                '4b109af38c01',
                1,
                1789755420000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-tauri-vs-electron-14e92a-17',
                'post',
                'p-seo-tauri-vs-electron',
                '14e92a8819bb',
                'reaction',
                '💡',
                1789755480000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-tauri-vs-electron-14e92a',
                'post',
                'p-seo-tauri-vs-electron',
                '14e92a8819bb',
                1,
                1789755480000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-tauri-vs-electron-77e102-18',
                'post',
                'p-seo-tauri-vs-electron',
                '77e1029ba4c0',
                'reaction',
                '🧠',
                1789755540000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-tauri-vs-electron-77e102',
                'post',
                'p-seo-tauri-vs-electron',
                '77e1029ba4c0',
                1,
                1789755540000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-tauri-vs-electron-aa0194-20',
                'post',
                'p-seo-tauri-vs-electron',
                'aa0194f2cd01',
                'bookmark',
                '🔥',
                1789755660000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-tauri-vs-electron-aa0194',
                'post',
                'p-seo-tauri-vs-electron',
                'aa0194f2cd01',
                1,
                1789755660000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-tauri-vs-electron-7b33a9-21',
                'post',
                'p-seo-tauri-vs-electron',
                '7b33a901ff42',
                'bookmark',
                '💡',
                1789755720000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-tauri-vs-electron-7b33a9',
                'post',
                'p-seo-tauri-vs-electron',
                '7b33a901ff42',
                1,
                1789755720000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-tauri-vs-electron-a410ef-22',
                'post',
                'p-seo-tauri-vs-electron',
                'a410ef89b231',
                'bookmark',
                '🔥',
                1789755780000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-tauri-vs-electron-a410ef',
                'post',
                'p-seo-tauri-vs-electron',
                'a410ef89b231',
                1,
                1789755780000
            );
INSERT OR REPLACE INTO posts (
            id, channel_id, author_id, author_role, title, content, flair,
            merit_votes, user_voted, reply_count, boost_count,
            attachment_json, video_json, images_json, poll_id, quoted_post_json,
            status, created_at, is_expanded
        ) VALUES (
            'p-seo-mechanical-keyboards-guide',
            'relays-general',
            'a30194f2de89',
            'MEMBER',
            'Ghid complet de lubrifiere pentru switch-uri liniare: Cum aplici Krytox 205g0 fără să le suprasaturezi și de ce sunetul ''thock'' depinde de carcasă ⌨️✨',
            'Dacă ai o tastatură mecanică și sunetul tastelor ți se pare zgomotos, uscat sau zdrăngănitor (rattle pe spacebar), lubrifierea switch-urilor și a stabilizatoarelor este cel mai satisfăcător upgrade pe care îl poți face într-o duminică după-amiază.

Iată regulile de aur învățate după ce am lubrifiat peste 1.000 de switch-uri:

### 1. Materiale esențiale:
- **Krytox 205g0** (vaselină fluorurată originală Miller-Stephenson; atenție la fake-urile de pe AliExpress care se separă în ulei după 2 luni!)
- **Krytox GPL 105** (ulei fluid pentru arcuri)
- Pensulă fină mărimea 00 sau 0
- Switch opener mecanic (2-in-1 pentru carcase MX și Kailh)
- Pensetă de precizie și stem pick

### 2. Tehnica corectă pe switch-uri liniare:
- **Arcurile**: Metoda „bag lubing” cu GPL 105. Pui 70-80 de arcuri într-o punguță ziploc, adaugi 10-12 picături de ulei, sufli puțin aer și agiți energic 60 de secunde. Toate arcurile primesc o peliculă microscopică uniformă care elimină 100% zgomotul de scârțâit metalic (spring ping)!
- **Tija (Stem)**: Regula absolută este **„Less is more”**. Pensula trebuie să fie aproape uscată, doar cu o strălucire fină. Lubrifiezi cele două șine laterale și fața inferioară. Dacă albul vaselinei este opac pe plastic, ai pus prea mult și tasta va deveni lipicioasă și lentă la revenire!

### 3. De unde vine sunetul ''Thock'' vs ''Clack''?
Sunetul profund nu depinde doar de switch!
- **Placa de montaj**: Plăcile din **FR4 sau POM** absorb frecvențele înalte și dau un sunet cald și înfundat. Plăcile din Aluminiu dau un sunet ascuțit („clack”).
- **Deskmat-ul**: Un mousepad textil gros de 4mm sau 5mm pe birou schimbă acustica complet, acționând ca un izolator fonic.

Ce switch-uri folosiți zilnic la programare sau gaming? Liniar silențios sau tactil?',
            'MECHANICAL KEYBOARDS',
            380,
            0,
            4,
            29,
            NULL, NULL, NULL, NULL, NULL,
            'published',
            1789755600000,
            0
        );
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-mechanical-keyboards-guide', 'keyboards', 1789755600000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-mechanical-keyboards-guide', 'mechanicalkeyboards', 1789755600000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-mechanical-keyboards-guide', 'krytox', 1789755600000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-mechanical-keyboards-guide', 'modding', 1789755600000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-mechanical-keyboards-guide', 'thock', 1789755600000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-mechanical-keyboards-guide', 'desksetup', 1789755600000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-mechanical-keyboards-guide', 'hardware', 1789755600000);
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-kb-1',
                'p-seo-mechanical-keyboards-guide',
                NULL,
                '6f1084ea2b99',
                'MEMBER',
                'Bag lubing la arcuri salvează ore întregi din viață! Confirm faza cu vaselina pe stem: cel mai bun test e să te uiți sub o lampă – dacă plasticul lucește ca o unghie dată cu lac transparent, e cantitatea perfectă. Dacă vezi stropi sau pastă albă, curăță cu un șervețel.',
                49,
                1789756200000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-kb-1-3db014-0',
                    'comment',
                    'c-kb-1',
                    '3db014ea9e12',
                    'reaction',
                    '🚀',
                    1789756230000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-kb-1-21f09a-1',
                    'comment',
                    'c-kb-1',
                    '21f09ab8c401',
                    'reaction',
                    '🧠',
                    1789756260000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-kb-1-70a40f-2',
                    'comment',
                    'c-kb-1',
                    '70a40f91b2df',
                    'reaction',
                    '💡',
                    1789756290000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-kb-1-52e091-3',
                    'comment',
                    'c-kb-1',
                    '52e091bfa331',
                    'reaction',
                    '🚀',
                    1789756320000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-kb-1-79c901-4',
                    'comment',
                    'c-kb-1',
                    '79c901affa01',
                    'reaction',
                    '💡',
                    1789756350000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-kb-1-7b33a9-5',
                    'comment',
                    'c-kb-1',
                    '7b33a901ff42',
                    'like',
                    '🧠',
                    1789756380000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-kb-1-b1409e-6',
                    'comment',
                    'c-kb-1',
                    'b1409ea28c99',
                    'like',
                    '💡',
                    1789756410000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-kb-2',
                'p-seo-mechanical-keyboards-guide',
                NULL,
                'a0914e21fc88',
                'MEMBER',
                'Pentru tactile (gen Boba U4T sau Holy Panda) ce recomanzi? Am auzit că dacă pui 205g0 pe picioarele tactile ale tijei distrugi tot bump-ul tactil.',
                34,
                1789756800000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-kb-2-79c901-0',
                    'comment',
                    'c-kb-2',
                    '79c901affa01',
                    'like',
                    '🔥',
                    1789756830000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-kb-2-63c901-1',
                    'comment',
                    'c-kb-2',
                    '63c901afb844',
                    'like',
                    '🔥',
                    1789756860000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-kb-2-99df01-2',
                    'comment',
                    'c-kb-2',
                    '99df012aa4c3',
                    'like',
                    '🚀',
                    1789756890000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-kb-2-6f1084-3',
                    'comment',
                    'c-kb-2',
                    '6f1084ea2b99',
                    'like',
                    '🧠',
                    1789756920000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-kb-2-91df90-4',
                    'comment',
                    'c-kb-2',
                    '91df9012cb78',
                    'like',
                    '🧠',
                    1789756950000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-kb-3',
                'p-seo-mechanical-keyboards-guide',
                'c-kb-2',
                'a30194f2de89',
                'MEMBER',
                '@SimRigRacer Foarte adevărat! La tactile folosește **Tribosys 3203** (care e mai fluid) și **nu atinge niciodată cele două piciorușe mici ale tijei**. Dacă lubrifiezi picioarele tactile, switch-ul își pierde rezistența caracteristică și devine un liniar ciudat.',
                58,
                1789757400000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-kb-3-66a019-0',
                    'comment',
                    'c-kb-3',
                    '66a0194ebd21',
                    'like',
                    '🧠',
                    1789757430000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-kb-3-24a014-1',
                    'comment',
                    'c-kb-3',
                    '24a014f9ec89',
                    'like',
                    '🧠',
                    1789757460000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-kb-3-79c901-2',
                    'comment',
                    'c-kb-3',
                    '79c901affa01',
                    'reaction',
                    '👍',
                    1789757490000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-kb-3-4b109a-3',
                    'comment',
                    'c-kb-3',
                    '4b109af38c01',
                    'like',
                    '❤️',
                    1789757520000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-kb-3-7c9102-4',
                    'comment',
                    'c-kb-3',
                    '7c9102ab84df',
                    'like',
                    '❤️',
                    1789757550000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-kb-3-3a4092-5',
                    'comment',
                    'c-kb-3',
                    '3a4092bbf102',
                    'like',
                    '🧠',
                    1789757580000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-kb-4',
                'p-seo-mechanical-keyboards-guide',
                NULL,
                'a410ef89b231',
                'MEMBER',
                'Am trecut pe Gateron Oil Kings cu carcasă de aluminiu și plate FR4. După 6 ore de codat în Neovim, degetele nu mai obosesc deloc. E o investiție mică dar care îți schimbă toată ergonomia de lucru zilnic.',
                42,
                1789758000000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-kb-4-6f1084-0',
                    'comment',
                    'c-kb-4',
                    '6f1084ea2b99',
                    'like',
                    '👍',
                    1789758030000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-kb-4-63c901-1',
                    'comment',
                    'c-kb-4',
                    '63c901afb844',
                    'reaction',
                    '❤️',
                    1789758060000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-kb-4-bf0194-2',
                    'comment',
                    'c-kb-4',
                    'bf0194a28cc1',
                    'reaction',
                    '🔥',
                    1789758090000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-kb-4-5b2041-3',
                    'comment',
                    'c-kb-4',
                    '5b2041e8d902',
                    'like',
                    '🧠',
                    1789758120000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-kb-4-39b014-4',
                    'comment',
                    'c-kb-4',
                    '39b014ea8d34',
                    'reaction',
                    '💡',
                    1789758150000
                );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-mechanical-keyboards-guide-56c401-0',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '56c4018ffa45',
                'bookmark',
                '🧠',
                1789755660000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-mechanical-keyboards-guide-56c401',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '56c4018ffa45',
                1,
                1789755660000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-mechanical-keyboards-guide-6d88f1-1',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '6d88f12a04cb',
                'bookmark',
                '🚀',
                1789755720000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-mechanical-keyboards-guide-6d88f1',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '6d88f12a04cb',
                1,
                1789755720000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-mechanical-keyboards-guide-1c490a-2',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '1c490a21fd88',
                'bookmark',
                '👍',
                1789755780000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-mechanical-keyboards-guide-1c490a',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '1c490a21fd88',
                1,
                1789755780000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-mechanical-keyboards-guide-9f4a12-3',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '9f4a120c8b31',
                'like',
                '🛡️',
                1789755840000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-mechanical-keyboards-guide-9f4a12',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '9f4a120c8b31',
                1,
                1789755840000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-mechanical-keyboards-guide-54b09e-4',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '54b09ef12a77',
                'reaction',
                '🧠',
                1789755900000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-mechanical-keyboards-guide-54b09e',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '54b09ef12a77',
                1,
                1789755900000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-mechanical-keyboards-guide-2da014-5',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '2da014f9bc67',
                'like',
                '🔥',
                1789755960000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-mechanical-keyboards-guide-2da014',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '2da014f9bc67',
                1,
                1789755960000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-mechanical-keyboards-guide-4d89a0-6',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '4d89a01fbb23',
                'reaction',
                '🧠',
                1789756020000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-mechanical-keyboards-guide-4d89a0',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '4d89a01fbb23',
                1,
                1789756020000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-mechanical-keyboards-guide-3db014-7',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '3db014ea9e12',
                'reaction',
                '🔥',
                1789756080000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-mechanical-keyboards-guide-3db014',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '3db014ea9e12',
                1,
                1789756080000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-mechanical-keyboards-guide-bf0194-8',
                'post',
                'p-seo-mechanical-keyboards-guide',
                'bf0194a28cc1',
                'bookmark',
                '🛡️',
                1789756140000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-mechanical-keyboards-guide-bf0194',
                'post',
                'p-seo-mechanical-keyboards-guide',
                'bf0194a28cc1',
                1,
                1789756140000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-mechanical-keyboards-guide-79c901-9',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '79c901affa01',
                'reaction',
                '🧠',
                1789756200000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-mechanical-keyboards-guide-79c901',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '79c901affa01',
                1,
                1789756200000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-mechanical-keyboards-guide-1bf089-10',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '1bf08912ea56',
                'bookmark',
                '🛡️',
                1789756260000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-mechanical-keyboards-guide-1bf089',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '1bf08912ea56',
                1,
                1789756260000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-mechanical-keyboards-guide-7f8a91-11',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '7f8a910c2b44',
                'reaction',
                '🔥',
                1789756320000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-mechanical-keyboards-guide-7f8a91',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '7f8a910c2b44',
                1,
                1789756320000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-mechanical-keyboards-guide-44df90-12',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '44df9012a8bc',
                'like',
                '🛡️',
                1789756380000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-mechanical-keyboards-guide-44df90',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '44df9012a8bc',
                1,
                1789756380000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-mechanical-keyboards-guide-17df89-13',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '17df8902ab55',
                'bookmark',
                '🧠',
                1789756440000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-mechanical-keyboards-guide-17df89',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '17df8902ab55',
                1,
                1789756440000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-mechanical-keyboards-guide-63c901-14',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '63c901afb844',
                'like',
                '🛡️',
                1789756500000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-mechanical-keyboards-guide-63c901',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '63c901afb844',
                1,
                1789756500000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-mechanical-keyboards-guide-15e092-15',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '15e0921ab4c8',
                'bookmark',
                '🔥',
                1789756560000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-mechanical-keyboards-guide-15e092',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '15e0921ab4c8',
                1,
                1789756560000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-mechanical-keyboards-guide-a7df90-16',
                'post',
                'p-seo-mechanical-keyboards-guide',
                'a7df9012bc23',
                'reaction',
                '🔥',
                1789756620000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-mechanical-keyboards-guide-a7df90',
                'post',
                'p-seo-mechanical-keyboards-guide',
                'a7df9012bc23',
                1,
                1789756620000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-mechanical-keyboards-guide-5b2041-17',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '5b2041e8d902',
                'reaction',
                '🚀',
                1789756680000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-mechanical-keyboards-guide-5b2041',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '5b2041e8d902',
                1,
                1789756680000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-mechanical-keyboards-guide-a410ef-18',
                'post',
                'p-seo-mechanical-keyboards-guide',
                'a410ef89b231',
                'bookmark',
                '💡',
                1789756740000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-mechanical-keyboards-guide-a410ef',
                'post',
                'p-seo-mechanical-keyboards-guide',
                'a410ef89b231',
                1,
                1789756740000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-mechanical-keyboards-guide-7c9102-19',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '7c9102ab84df',
                'reaction',
                '🧠',
                1789756800000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-mechanical-keyboards-guide-7c9102',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '7c9102ab84df',
                1,
                1789756800000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-mechanical-keyboards-guide-91c24f-20',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '91c24fa0e891',
                'reaction',
                '👍',
                1789756860000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-mechanical-keyboards-guide-91c24f',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '91c24fa0e891',
                1,
                1789756860000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-mechanical-keyboards-guide-a0914e-21',
                'post',
                'p-seo-mechanical-keyboards-guide',
                'a0914e21fc88',
                'bookmark',
                '🧠',
                1789756920000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-mechanical-keyboards-guide-a0914e',
                'post',
                'p-seo-mechanical-keyboards-guide',
                'a0914e21fc88',
                1,
                1789756920000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-mechanical-keyboards-guide-5ec401-22',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '5ec4018fba67',
                'reaction',
                '🛡️',
                1789756980000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-mechanical-keyboards-guide-5ec401',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '5ec4018fba67',
                1,
                1789756980000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-mechanical-keyboards-guide-60c801-23',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '60c8012acd78',
                'reaction',
                '🔥',
                1789757040000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-mechanical-keyboards-guide-60c801',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '60c8012acd78',
                1,
                1789757040000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-mechanical-keyboards-guide-13f089-24',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '13f08912ef34',
                'like',
                '💡',
                1789757100000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-mechanical-keyboards-guide-13f089',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '13f08912ef34',
                1,
                1789757100000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-mechanical-keyboards-guide-21f09a-25',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '21f09ab8c401',
                'like',
                '🛡️',
                1789757160000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-mechanical-keyboards-guide-21f09a',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '21f09ab8c401',
                1,
                1789757160000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-mechanical-keyboards-guide-2d89b1-26',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '2d89b14c99a0',
                'bookmark',
                '💡',
                1789757220000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-mechanical-keyboards-guide-2d89b1',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '2d89b14c99a0',
                1,
                1789757220000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-mechanical-keyboards-guide-59b04a-27',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '59b04a11ee32',
                'reaction',
                '🔥',
                1789757280000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-mechanical-keyboards-guide-59b04a',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '59b04a11ee32',
                1,
                1789757280000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-mechanical-keyboards-guide-99df01-28',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '99df012aa4c3',
                'bookmark',
                '🔥',
                1789757340000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-mechanical-keyboards-guide-99df01',
                'post',
                'p-seo-mechanical-keyboards-guide',
                '99df012aa4c3',
                1,
                1789757340000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-mechanical-keyboards-guide-c3dc28-29',
                'post',
                'p-seo-mechanical-keyboards-guide',
                'c3dc28cb705e',
                'like',
                '❤️',
                1789757400000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-mechanical-keyboards-guide-c3dc28',
                'post',
                'p-seo-mechanical-keyboards-guide',
                'c3dc28cb705e',
                1,
                1789757400000
            );
INSERT OR REPLACE INTO posts (
            id, channel_id, author_id, author_role, title, content, flair,
            merit_votes, user_voted, reply_count, boost_count,
            attachment_json, video_json, images_json, poll_id, quoted_post_json,
            status, created_at, is_expanded
        ) VALUES (
            'p-seo-godot-vs-unity',
            'relays-dev',
            '5b2041e8d902',
            'MEMBER',
            'De ce tot mai mulți dezvoltatori indie aleg Godot 4.3 în 2026: Compilare în 2 secunde, executabil de 40 MB și libertate totală fără abonamente 🎮👾',
            'După controversa cu Runtime Fee de la Unity și concedierile repetate, migrația către **Godot Engine 4.3** a devenit una dintre cele mai frumoase povești din lumea open-source.

Lucrând la un joc 2D/3D hibrid cu estetică retro, iată de ce nu m-aș mai întoarce la Unity nici plătit:

### 1. Viteza de iterație este incredibilă:
- În Unity: deschizi proiectul, aștepți 45 de secunde re-importul de assets, modifici o linie de C#, aștepți 8 secunde compilarea domeniului.
- În Godot: apeși F5, jocul rulează **instantaneu în 1.2 secunde**. Modifici variabile în cod și le vezi actualizate în timp real (Live Reload) direct în instanța jocului care rulează!

### 2. Arhitectura pe Noduri și Scene
În loc de componente libere împrăștiate, în Godot **totul este o scenă**.
Un personaj este o scenă. O armă este o scenă. Un nivel întreg este o scenă compusă din alte scene. Acest mod ierarhic de compoziție este mult mai intuitiv și previne spaghetti code-ul specific proiectelor medii.

### 3. Text-based files & Git Friendly
Fișierele de scenă `.tscn` sunt fișiere text curate. Dacă lucrezi în echipă prin Git, rezolvarea unui merge conflict durează 10 secunde, spre deosebire de conflictele binare dezastruoase de prefabs din alte motoare.

### 4. Zero Taxe, Zero Telemetrie, Zero Conturi
Editorul Godot are **42 MB**. Nu are instalator, nu-ți cere cont de cloud, nu-ți pune splash screen forțat la pornirea jocului. Îl pui pe un stick USB și funcționează identic pe Linux, Windows, macOS și Steam Deck.

Cine a mai lansat sau testează prototipuri pe Godot anul acesta?',
            'GAMEDEV & CREATIVE',
            425,
            0,
            4,
            32,
            NULL, NULL, NULL, NULL, NULL,
            'published',
            1789756800000,
            0
        );
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-godot-vs-unity', 'godot', 1789756800000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-godot-vs-unity', 'gamedev', 1789756800000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-godot-vs-unity', 'unity', 1789756800000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-godot-vs-unity', 'indiedev', 1789756800000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-godot-vs-unity', 'vulkan', 1789756800000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-godot-vs-unity', 'opensource', 1789756800000);
INSERT OR REPLACE INTO post_tags (post_id, tag, created_at) VALUES ('p-seo-godot-vs-unity', 'gaming', 1789756800000);
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-god-1',
                'p-seo-godot-vs-unity',
                NULL,
                '91df9012cb78',
                'MEMBER',
                'Exportul din Blender prin glTF 2.0 direct în Godot funcționează perfect! Materialele PBR, animațiile pe schelet și coliziunile custom (`-col`) se importă fără nicio setare manuală suplimentară.',
                45,
                1789757400000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-god-1-aa0194-0',
                    'comment',
                    'c-god-1',
                    'aa0194f2cd01',
                    'like',
                    '🔥',
                    1789757430000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-god-1-35df90-1',
                    'comment',
                    'c-god-1',
                    '35df9012a888',
                    'like',
                    '🧠',
                    1789757460000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-god-1-24a014-2',
                    'comment',
                    'c-god-1',
                    '24a014f9ec89',
                    'like',
                    '💡',
                    1789757490000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-god-1-83d201-3',
                    'comment',
                    'c-god-1',
                    '83d2019fab66',
                    'reaction',
                    '🔥',
                    1789757520000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-god-1-67c801-4',
                    'comment',
                    'c-god-1',
                    '67c8012afb90',
                    'reaction',
                    '🚀',
                    1789757550000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-god-1-64c801-5',
                    'comment',
                    'c-god-1',
                    '64c8012fab12',
                    'reaction',
                    '👍',
                    1789757580000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-god-2',
                'p-seo-godot-vs-unity',
                'c-god-1',
                '5b2041e8d902',
                'MEMBER',
                '@LowPolyCrafter Iar în 4.3 poți pune direct fișierele native `.blend` în folderul proiectului și Godot le convertește automat în fundal prin CLI-ul de Blender. Este cel mai rapid pipeline de artă pe care l-am văzut vreodată.',
                51,
                1789757700000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-god-2-83d201-0',
                    'comment',
                    'c-god-2',
                    '83d2019fab66',
                    'like',
                    '🧠',
                    1789757730000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-god-2-6f1084-1',
                    'comment',
                    'c-god-2',
                    '6f1084ea2b99',
                    'reaction',
                    '🧠',
                    1789757760000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-god-2-39b014-2',
                    'comment',
                    'c-god-2',
                    '39b014ea8d34',
                    'like',
                    '🧠',
                    1789757790000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-god-2-2d89b1-3',
                    'comment',
                    'c-god-2',
                    '2d89b14c99a0',
                    'like',
                    '🚀',
                    1789757820000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-god-2-14e92a-4',
                    'comment',
                    'c-god-2',
                    '14e92a8819bb',
                    'like',
                    '🧠',
                    1789757850000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-god-3',
                'p-seo-godot-vs-unity',
                NULL,
                '4d89a01fbb23',
                'MEMBER',
                'Și codul sursă în C++ al motorului este incredibil de curat și bine structurat. Când ai nevoie de o funcție grafică custom în Vulkan sau un algoritm de fizică optimizat cu SIMD, scrii un modul GDExtension în C++ sau Rust și rulează la viteză nativă.',
                39,
                1789758000000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-god-3-78a014-0',
                    'comment',
                    'c-god-3',
                    '78a014fb9c99',
                    'like',
                    '❤️',
                    1789758030000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-god-3-a30194-1',
                    'comment',
                    'c-god-3',
                    'a30194f2de89',
                    'reaction',
                    '❤️',
                    1789758060000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-god-3-94df02-2',
                    'comment',
                    'c-god-3',
                    '94df0218ab44',
                    'like',
                    '👍',
                    1789758090000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-god-3-11f802-3',
                    'comment',
                    'c-god-3',
                    '11f802ea9bc4',
                    'like',
                    '💡',
                    1789758120000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-god-3-22c88f-4',
                    'comment',
                    'c-god-3',
                    '22c88f01a9df',
                    'reaction',
                    '🚀',
                    1789758150000
                );
INSERT OR REPLACE INTO comments (
                id, post_id, parent_id, author_id, author_role, content, merit_votes, created_at
            ) VALUES (
                'c-god-4',
                'p-seo-godot-vs-unity',
                NULL,
                '60c8012acd78',
                'MEMBER',
                'Iar exportul pentru Steam Deck e o bucurie. Compilezi binar nativ de Linux x86_64, îl testezi pe Deck și obții 60 FPS stabil cu un consum de doar 7W din baterie.',
                47,
                1789758300000
            );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-god-4-59b04a-0',
                    'comment',
                    'c-god-4',
                    '59b04a11ee32',
                    'like',
                    '❤️',
                    1789758330000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-god-4-24a014-1',
                    'comment',
                    'c-god-4',
                    '24a014f9ec89',
                    'like',
                    '🧠',
                    1789758360000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-god-4-1cf089-2',
                    'comment',
                    'c-god-4',
                    '1cf08912fa12',
                    'reaction',
                    '🧠',
                    1789758390000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-god-4-70a40f-3',
                    'comment',
                    'c-god-4',
                    '70a40f91b2df',
                    'reaction',
                    '🔥',
                    1789758420000
                );
INSERT OR REPLACE INTO interactions (
                    id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
                ) VALUES (
                    'int-c-c-god-4-a50091-4',
                    'comment',
                    'c-god-4',
                    'a500912fa8cc',
                    'reaction',
                    '👍',
                    1789758450000
                );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-godot-vs-unity-c3dc28-0',
                'post',
                'p-seo-godot-vs-unity',
                'c3dc28cb705e',
                'bookmark',
                '🛡️',
                1789756860000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-godot-vs-unity-c3dc28',
                'post',
                'p-seo-godot-vs-unity',
                'c3dc28cb705e',
                1,
                1789756860000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-godot-vs-unity-a50091-1',
                'post',
                'p-seo-godot-vs-unity',
                'a500912fa8cc',
                'reaction',
                '🚀',
                1789756920000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-godot-vs-unity-a50091',
                'post',
                'p-seo-godot-vs-unity',
                'a500912fa8cc',
                1,
                1789756920000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-godot-vs-unity-94df02-2',
                'post',
                'p-seo-godot-vs-unity',
                '94df0218ab44',
                'like',
                '🔥',
                1789756980000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-godot-vs-unity-94df02',
                'post',
                'p-seo-godot-vs-unity',
                '94df0218ab44',
                1,
                1789756980000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-godot-vs-unity-9ad090-3',
                'post',
                'p-seo-godot-vs-unity',
                '9ad09012ab56',
                'reaction',
                '🛡️',
                1789757040000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-godot-vs-unity-9ad090',
                'post',
                'p-seo-godot-vs-unity',
                '9ad09012ab56',
                1,
                1789757040000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-godot-vs-unity-f40019-4',
                'post',
                'p-seo-godot-vs-unity',
                'f40019bc88a2',
                'bookmark',
                '🧠',
                1789757100000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-godot-vs-unity-f40019',
                'post',
                'p-seo-godot-vs-unity',
                'f40019bc88a2',
                1,
                1789757100000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-godot-vs-unity-31f90a-5',
                'post',
                'p-seo-godot-vs-unity',
                '31f90a44ec12',
                'like',
                '👍',
                1789757160000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-godot-vs-unity-31f90a',
                'post',
                'p-seo-godot-vs-unity',
                '31f90a44ec12',
                1,
                1789757160000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-godot-vs-unity-66a019-6',
                'post',
                'p-seo-godot-vs-unity',
                '66a0194ebd21',
                'like',
                '🧠',
                1789757220000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-godot-vs-unity-66a019',
                'post',
                'p-seo-godot-vs-unity',
                '66a0194ebd21',
                1,
                1789757220000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-godot-vs-unity-a0914e-7',
                'post',
                'p-seo-godot-vs-unity',
                'a0914e21fc88',
                'bookmark',
                '💡',
                1789757280000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-godot-vs-unity-a0914e',
                'post',
                'p-seo-godot-vs-unity',
                'a0914e21fc88',
                1,
                1789757280000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-godot-vs-unity-88b401-8',
                'post',
                'p-seo-godot-vs-unity',
                '88b4012ce9fa',
                'bookmark',
                '🧠',
                1789757340000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-godot-vs-unity-88b401',
                'post',
                'p-seo-godot-vs-unity',
                '88b4012ce9fa',
                1,
                1789757340000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-godot-vs-unity-2d89b1-9',
                'post',
                'p-seo-godot-vs-unity',
                '2d89b14c99a0',
                'reaction',
                '💡',
                1789757400000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-godot-vs-unity-2d89b1',
                'post',
                'p-seo-godot-vs-unity',
                '2d89b14c99a0',
                1,
                1789757400000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-godot-vs-unity-67c801-10',
                'post',
                'p-seo-godot-vs-unity',
                '67c8012afb90',
                'like',
                '🧠',
                1789757460000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-godot-vs-unity-67c801',
                'post',
                'p-seo-godot-vs-unity',
                '67c8012afb90',
                1,
                1789757460000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-godot-vs-unity-b1409e-11',
                'post',
                'p-seo-godot-vs-unity',
                'b1409ea28c99',
                'reaction',
                '👍',
                1789757520000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-godot-vs-unity-b1409e',
                'post',
                'p-seo-godot-vs-unity',
                'b1409ea28c99',
                1,
                1789757520000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-godot-vs-unity-35df90-12',
                'post',
                'p-seo-godot-vs-unity',
                '35df9012a888',
                'reaction',
                '🛡️',
                1789757580000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-godot-vs-unity-35df90',
                'post',
                'p-seo-godot-vs-unity',
                '35df9012a888',
                1,
                1789757580000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-godot-vs-unity-9f4a12-13',
                'post',
                'p-seo-godot-vs-unity',
                '9f4a120c8b31',
                'like',
                '🧠',
                1789757640000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-godot-vs-unity-9f4a12',
                'post',
                'p-seo-godot-vs-unity',
                '9f4a120c8b31',
                1,
                1789757640000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-godot-vs-unity-8d104f-14',
                'post',
                'p-seo-godot-vs-unity',
                '8d104fb2a901',
                'reaction',
                '👍',
                1789757700000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-godot-vs-unity-8d104f',
                'post',
                'p-seo-godot-vs-unity',
                '8d104fb2a901',
                1,
                1789757700000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-godot-vs-unity-91c24f-15',
                'post',
                'p-seo-godot-vs-unity',
                '91c24fa0e891',
                'like',
                '💡',
                1789757760000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-godot-vs-unity-91c24f',
                'post',
                'p-seo-godot-vs-unity',
                '91c24fa0e891',
                1,
                1789757760000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-godot-vs-unity-5ec401-16',
                'post',
                'p-seo-godot-vs-unity',
                '5ec4018fba67',
                'bookmark',
                '💡',
                1789757820000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-godot-vs-unity-5ec401',
                'post',
                'p-seo-godot-vs-unity',
                '5ec4018fba67',
                1,
                1789757820000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-godot-vs-unity-42c90a-17',
                'post',
                'p-seo-godot-vs-unity',
                '42c90a18eb77',
                'like',
                '🛡️',
                1789757880000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-godot-vs-unity-42c90a',
                'post',
                'p-seo-godot-vs-unity',
                '42c90a18eb77',
                1,
                1789757880000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-godot-vs-unity-64c801-18',
                'post',
                'p-seo-godot-vs-unity',
                '64c8012fab12',
                'reaction',
                '👍',
                1789757940000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-godot-vs-unity-64c801',
                'post',
                'p-seo-godot-vs-unity',
                '64c8012fab12',
                1,
                1789757940000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-godot-vs-unity-15e092-19',
                'post',
                'p-seo-godot-vs-unity',
                '15e0921ab4c8',
                'reaction',
                '🚀',
                1789758000000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-godot-vs-unity-15e092',
                'post',
                'p-seo-godot-vs-unity',
                '15e0921ab4c8',
                1,
                1789758000000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-godot-vs-unity-62df09-20',
                'post',
                'p-seo-godot-vs-unity',
                '62df09a14c33',
                'bookmark',
                '🧠',
                1789758060000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-godot-vs-unity-62df09',
                'post',
                'p-seo-godot-vs-unity',
                '62df09a14c33',
                1,
                1789758060000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-godot-vs-unity-21f09a-21',
                'post',
                'p-seo-godot-vs-unity',
                '21f09ab8c401',
                'like',
                '🔥',
                1789758120000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-godot-vs-unity-21f09a',
                'post',
                'p-seo-godot-vs-unity',
                '21f09ab8c401',
                1,
                1789758120000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-godot-vs-unity-a7df90-22',
                'post',
                'p-seo-godot-vs-unity',
                'a7df9012bc23',
                'reaction',
                '🔥',
                1789758180000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-godot-vs-unity-a7df90',
                'post',
                'p-seo-godot-vs-unity',
                'a7df9012bc23',
                1,
                1789758180000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-godot-vs-unity-39b014-23',
                'post',
                'p-seo-godot-vs-unity',
                '39b014ea8d34',
                'like',
                '👍',
                1789758240000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-godot-vs-unity-39b014',
                'post',
                'p-seo-godot-vs-unity',
                '39b014ea8d34',
                1,
                1789758240000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-godot-vs-unity-4e198a-24',
                'post',
                'p-seo-godot-vs-unity',
                '4e198a00b215',
                'reaction',
                '👍',
                1789758300000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-godot-vs-unity-4e198a',
                'post',
                'p-seo-godot-vs-unity',
                '4e198a00b215',
                1,
                1789758300000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-godot-vs-unity-19a408-25',
                'post',
                'p-seo-godot-vs-unity',
                '19a408ebc220',
                'bookmark',
                '💡',
                1789758360000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-godot-vs-unity-19a408',
                'post',
                'p-seo-godot-vs-unity',
                '19a408ebc220',
                1,
                1789758360000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-godot-vs-unity-3e901a-26',
                'post',
                'p-seo-godot-vs-unity',
                '3e901a88fb22',
                'reaction',
                '🛡️',
                1789758420000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-godot-vs-unity-3e901a',
                'post',
                'p-seo-godot-vs-unity',
                '3e901a88fb22',
                1,
                1789758420000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-godot-vs-unity-7c9102-27',
                'post',
                'p-seo-godot-vs-unity',
                '7c9102ab84df',
                'like',
                '🧠',
                1789758480000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-godot-vs-unity-7c9102',
                'post',
                'p-seo-godot-vs-unity',
                '7c9102ab84df',
                1,
                1789758480000
            );
INSERT OR REPLACE INTO interactions (
                id, target_type, target_id, user_fingerprint, interaction_type, value, created_at
            ) VALUES (
                'int-p-p-seo-godot-vs-unity-da0194-28',
                'post',
                'p-seo-godot-vs-unity',
                'da0194f28bc1',
                'bookmark',
                '💡',
                1789758540000
            );
INSERT OR REPLACE INTO votes (
                id, target_type, target_id, user_fingerprint, direction, created_at
            ) VALUES (
                'v-p-p-seo-godot-vs-unity-da0194',
                'post',
                'p-seo-godot-vs-unity',
                'da0194f28bc1',
                1,
                1789758540000
            );
