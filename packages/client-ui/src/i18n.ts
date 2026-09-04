/**
 * AETHERIS OMNI-SPHERE — INTERNATIONALIZATION & LOCALIZATION ENGINE (i18n)
 *
 * Enterprise-grade Sovereign i18n & L10n Engine supporting:
 * 1. Dynamic language switching without page reload (100% reactive).
 * 2. 7 Major World Languages:
 *    - English (en) - Default Sovereign Standard
 *    - French (fr) - Français
 *    - German (de) - Deutsch
 *    - Spanish (es) - Español
 *    - Romanian (ro) - Română
 *    - Japanese (ja) - 日本語
 *    - Arabic (ar) - العربية (Native Bidirectional RTL Layout `dir="rtl"`)
 * 3. Regional Formatting via `Intl.DateTimeFormat`, `Intl.NumberFormat`, `Intl.RelativeTimeFormat`, `Intl.ListFormat`.
 * 4. Automatic locale detection from browser `navigator.languages` with secure fallback and persistent storage.
 * 5. Strongly-typed dictionary with nested keys, parametric interpolation (`{name}`, `{count}`), and pluralization.
 * 6. DOM automated translator & Language Picker UI component.
 */

import { serviceRegistry, SERVICES } from './service-registry.js';

export type SupportedLocale = 'en' | 'fr' | 'de' | 'es' | 'ro' | 'ja' | 'ar';
export type TextDirection = 'ltr' | 'rtl';

export interface LanguageMeta {
  code: SupportedLocale;
  name: string;
  nativeName: string;
  direction: TextDirection;
  flag: string;
  region: string;
  dateFormat: string;
  tier: 'official' | 'beta';
}

export const SUPPORTED_LANGUAGES: Record<SupportedLocale, LanguageMeta> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English (Official - 100%)',
    direction: 'ltr',
    flag: '🌐',
    region: 'Global / US / UK',
    dateFormat: 'MM/DD/YYYY',
    tier: 'official',
  },
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français (Beta)',
    direction: 'ltr',
    flag: '🇫🇷',
    region: 'France / Europe',
    dateFormat: 'DD/MM/YYYY',
    tier: 'beta',
  },
  de: {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch (Beta)',
    direction: 'ltr',
    flag: '🇩🇪',
    region: 'Germany / DACH',
    dateFormat: 'DD.MM.YYYY',
    tier: 'beta',
  },
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español (Beta)',
    direction: 'ltr',
    flag: '🇪🇸',
    region: 'Spain / Latin America',
    dateFormat: 'DD/MM/YYYY',
    tier: 'beta',
  },
  ro: {
    code: 'ro',
    name: 'Romanian',
    nativeName: 'Română (Oficial - 100%)',
    direction: 'ltr',
    flag: '🇷🇴',
    region: 'Romania / Eastern Europe',
    dateFormat: 'DD.MM.YYYY',
    tier: 'official',
  },
  ja: {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語 (Beta)',
    direction: 'ltr',
    flag: '🇯🇵',
    region: 'Japan / Asia-Pacific',
    dateFormat: 'YYYY/MM/DD',
    tier: 'beta',
  },
  ar: {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية (Beta)',
    direction: 'rtl',
    flag: '🇦🇪',
    region: 'Middle East & North Africa (MENA)',
    dateFormat: 'DD/MM/YYYY',
    tier: 'beta',
  },
};

// ─── TRANSLATION DICTIONARIES (7 LANGUAGES) ──────────────────────────────────

export interface TranslationDictionary {
  common: {
    appName: string;
    tagline: string;
    loading: string;
    save: string;
    cancel: string;
    close: string;
    delete: string;
    edit: string;
    copy: string;
    copied: string;
    search: string;
    refresh: string;
    status: string;
    online: string;
    offline: string;
    syncing: string;
    verified: string;
    error: string;
    success: string;
    warning: string;
    anonymous: string;
    unknown: string;
    all: string;
    filter: string;
    details: string;
    back: string;
    next: string;
    confirm: string;
    submit: string;
  };
  nav: {
    relays: string;
    vault: string;
    pulse: string;
    defense: string;
    observatory: string;
    governance: string;
    wallet: string;
    settings: string;
    admin: string;
    theme: string;
    language: string;
    onboarding: string;
  };
  relays: {
    title: string;
    subtitle: string;
    channels: string;
    directMessages: string;
    voiceChannel: string;
    joinVoice: string;
    leaveVoice: string;
    muteMicrophone: string;
    unmuteMicrophone: string;
    screenShare: string;
    typeMessage: string;
    sendMessage: string;
    encryptedE2EE: string;
    treekemEpoch: string;
    spammerQuarantined: string;
    activePeers: string;
    noMessages: string;
  };
  vault: {
    title: string;
    subtitle: string;
    uploadBinary: string;
    nanopublications: string;
    merkleRoot: string;
    sha256Checksum: string;
    byteSize: string;
    entropy: string;
    verdict: string;
    cleanVerdict: string;
    maliciousVerdict: string;
    seederCount: string;
    downloadArtifact: string;
    inspectFile: string;
    dragDropPrompt: string;
    torrentMeshReady: string;
  };
  pulse: {
    title: string;
    subtitle: string;
    composerPlaceholder: string;
    publishPost: string;
    chronologicalFeed: string;
    meritVotes: string;
    replies: string;
    boost: string;
    share: string;
    quotePost: string;
    bookmark: string;
    award: string;
    viewThread: string;
    trendingTopics: string;
  };
  edge: {
    title: string;
    globalTopology: string;
    edgeLocations: string;
    anycastRouting: string;
    latency: string;
    d1Replicas: string;
    r2Storage: string;
    durableObjects: string;
    cacheHitRatio: string;
    sub15msTarget: string;
    activeRegion: string;
    failoverStatus: string;
    p2pMeshFallback: string;
  };
  security: {
    zeroTrust: string;
    dataSovereignty: string;
    gdprCompliant: string;
    clientSideEncryption: string;
    ed25519Identity: string;
    zkRlnProtection: string;
    cveMonitoring: string;
    auditStatus: string;
    webAuthnKey: string;
    paperBackup: string;
    shredIdentity: string;
  };
  crdt: {
    vectorClocks: string;
    lwwResolution: string;
    merkleSync: string;
    bufferedActions: string;
    syncNow: string;
    allSynced: string;
  };
  units: {
    byte: string;
    kilobyte: string;
    megabyte: string;
    gigabyte: string;
    terabyte: string;
    milliseconds: string;
    seconds: string;
    minutes: string;
    hours: string;
    days: string;
    ago: string;
    justNow: string;
  };
  uiMode?: {
    simple: string;
    sovereign: string;
    advancedTools: string;
    switchMode: string;
  };
  onboardingNarrative?: {
    step1Title: string;
    step1Subtitle: string;
    step1Body: string;
    step2Title: string;
    step2Subtitle: string;
    step2Body: string;
    step3Title: string;
    step3Subtitle: string;
    step3Body: string;
    step4Title: string;
    step4Subtitle: string;
    step4Body: string;
    step4Warning: string;
    step4SavedWords: string;
    step4DownloadBackup: string;
    skip: string;
    continue: string;
    back: string;
    finish: string;
    stepOf: string;
  };
}

export const enDict: TranslationDictionary = {
  common: {
    appName: 'Aetheris Omni-Sphere',
    tagline: 'Sovereign Zero-Knowledge Global Communication Matrix',
    loading: 'Loading cryptographic matrix...',
    save: 'Save Changes',
    cancel: 'Cancel',
    close: 'Close',
    delete: 'Delete',
    edit: 'Edit',
    copy: 'Copy to Clipboard',
    copied: 'Copied!',
    search: 'Search sovereign matrix...',
    refresh: 'Refresh',
    status: 'Status',
    online: 'Online',
    offline: 'Offline',
    syncing: 'Syncing',
    verified: 'Cryptographically Verified',
    error: 'Error',
    success: 'Success',
    warning: 'Warning',
    anonymous: 'Anonymous Peer',
    unknown: 'Unknown Node',
    all: 'All',
    filter: 'Filter',
    details: 'Details',
    back: 'Back',
    next: 'Next',
    confirm: 'Confirm',
    submit: 'Submit',
  },
  nav: {
    relays: 'Live Relays',
    vault: 'Binary Vault',
    pulse: 'Sovereign Pulse',
    defense: 'Cyber Defense',
    observatory: 'Network Observatory',
    governance: 'DAO Governance',
    wallet: 'Paper & Web3 Wallet',
    settings: 'Settings',
    admin: 'Node Admin',
    theme: 'Theme Engine',
    language: 'Language / RTL',
    onboarding: 'Sovereignty Guide',
  },
  relays: {
    title: 'E2EE Live Signaling & Voice Relays',
    subtitle: 'MLS TreeKEM Quantum-Ratcheted P2P Mesh over Cloudflare Edge',
    channels: 'Channels',
    directMessages: 'Sovereign Direct Messages',
    voiceChannel: 'Spatial Voice Room',
    joinVoice: 'Join Audio Mesh',
    leaveVoice: 'Disconnect Audio',
    muteMicrophone: 'Mute Microphone',
    unmuteMicrophone: 'Unmute Microphone',
    screenShare: 'Share Screen (120 FPS)',
    typeMessage: 'Type encrypted sovereign message...',
    sendMessage: 'Send Message',
    encryptedE2EE: 'AES-256-GCM / MLS Encrypted',
    treekemEpoch: 'TreeKEM Ratchet Epoch',
    spammerQuarantined: 'Spammer Quarantined via ZK-RLN Proof',
    activePeers: 'Active Mesh Peers',
    noMessages: 'No messages yet in this encrypted space.',
  },
  vault: {
    title: 'Verified Binary Vault & Artifact Registry',
    subtitle: 'Zero-Egress R2 Distribution with Merkle Tree Verification',
    uploadBinary: 'Publish Sovereign Binary',
    nanopublications: 'Nanopublications',
    merkleRoot: 'Merkle Tree Root',
    sha256Checksum: 'SHA-256 Hash',
    byteSize: 'Byte Size',
    entropy: 'Shannon Entropy',
    verdict: 'Cryptographic Verdict',
    cleanVerdict: 'VERIFIED CLEAN',
    maliciousVerdict: 'SUSPICIOUS ENTROPY',
    seederCount: 'Active BitTorrent Seeders',
    downloadArtifact: 'Download via Cloudflare R2',
    inspectFile: 'Inspect Binary Headers',
    dragDropPrompt: 'Drag & drop binary payload to verify and sign',
    torrentMeshReady: 'BitTorrent WebRTC Swarm Active',
  },
  pulse: {
    title: 'Sovereign Pulse Chronostream',
    subtitle: 'Uncensored Chronological Microblogging with ZK-RLN Anti-Spam',
    composerPlaceholder: 'Broadcast your sovereign thoughts to the global mesh...',
    publishPost: 'Broadcast Pulse',
    chronologicalFeed: 'Chronological Global Feed',
    meritVotes: 'Merit Upvotes',
    replies: 'Replies',
    boost: 'Boost Post',
    share: 'Share Cryptographic Link',
    quotePost: 'Quote Post',
    bookmark: 'Save to Vault',
    award: 'Award Merit Medal',
    viewThread: 'View Full Conversation',
    trendingTopics: 'Trending Topics & Hashtags',
  },
  edge: {
    title: 'Worldwide Anycast Edge Infrastructure',
    globalTopology: 'Cloudflare Global Edge (300+ Cities Anycast Routing)',
    edgeLocations: 'Multi-Region PoPs (WNAM, ENAM, WEUR, EEUR, APAC)',
    anycastRouting: 'BGP Anycast Sub-15ms Proximity Routing',
    latency: 'Real-time Global RTT Latency',
    d1Replicas: 'Cloudflare D1 Multi-Region Read Replicas (<5ms)',
    r2Storage: 'Cloudflare R2 Zero-Egress Global Storage',
    durableObjects: 'Durable Objects with WebSocket Hibernation',
    cacheHitRatio: 'Edge L1/L2 CDN Cache Hit Ratio',
    sub15msTarget: 'Sub-15ms Global Latency SLA',
    activeRegion: 'Connected Edge Region',
    failoverStatus: 'Failover Status: Active Anycast Route',
    p2pMeshFallback: 'WebRTC Direct Swarm Fallback Ready',
  },
  security: {
    zeroTrust: 'Zero-Trust Architecture',
    dataSovereignty: 'Zero-Knowledge Data Sovereignty',
    gdprCompliant: 'GDPR / CCPA Compliant by Design (Zero PII on Edge)',
    clientSideEncryption: 'Client-Side Ed25519 & AES-256-GCM Encryption',
    ed25519Identity: 'Sovereign Ed25519 Identity Keypair',
    zkRlnProtection: 'ZK-RLN Rate Limiting & Identity Slashing',
    cveMonitoring: 'Real-Time CVE & Zero-Day Vulnerability Feed',
    auditStatus: 'Formal Verification & Audit: PASSED',
    webAuthnKey: 'Hardware Security Key (FIDO2/WebAuthn)',
    paperBackup: 'Print Sovereign Paper Wallet',
    shredIdentity: 'Cryptographic Self-Destruct / Shred Key',
  },
  crdt: {
    vectorClocks: 'Distributed Vector Clocks',
    lwwResolution: 'Last-Write-Wins Conflict Resolution',
    merkleSync: 'Merkle Tree State Reconciliation',
    bufferedActions: 'Buffered Offline Actions',
    syncNow: 'Synchronize Mesh Now',
    allSynced: 'All Distributed Replicas Synchronized',
  },
  units: {
    byte: 'B',
    kilobyte: 'KB',
    megabyte: 'MB',
    gigabyte: 'GB',
    terabyte: 'TB',
    milliseconds: 'ms',
    seconds: 'sec',
    minutes: 'min',
    hours: 'hr',
    days: 'days',
    ago: 'ago',
    justNow: 'just now',
  },
  uiMode: {
    simple: 'Simple',
    sovereign: 'Sovereign',
    advancedTools: 'Advanced Tools',
    switchMode: 'Switch Interface Mode',
  },
  onboardingNarrative: {
    step1Title: 'Your Identity Belongs to You',
    step1Subtitle: 'Self-sovereignty from the very first second',
    step1Body: 'No central server owns your account. No email, no phone number, no passwords stored in vulnerable foreign databases. Your cryptographic keys exist exclusively on your device.',
    step2Title: 'Your Content is Fully Protected',
    step2Subtitle: 'End-to-end zero-knowledge security',
    step2Body: 'Everything you write or share is encrypted directly in your browser before ever touching the network. Only the recipients you explicitly authorize hold the keys to read it.',
    step3Title: 'The Network Belongs to Everyone',
    step3Subtitle: 'Decentralized peer-to-peer distribution',
    step3Body: 'Every participant helps relay and preserve knowledge across the mesh. Zero opaque algorithms designed to exploit attention, and zero centralized choke points for censorship.',
    step4Title: 'Save Your Recovery Key',
    step4Subtitle: 'Your 12-word master seed phrase',
    step4Body: 'Write down or back up these 12 secret words. They represent your complete sovereign identity and all your cryptographic credentials.',
    step4Warning: 'This 12-word phrase is the only way to recover your account. Aetheris never holds your keys.',
    step4SavedWords: 'I have safely saved my seed words',
    step4DownloadBackup: 'Download Encrypted Backup',
    skip: 'Skip',
    continue: 'Continue',
    back: 'Back',
    finish: 'Enter Sovereign Network',
    stepOf: 'Step {step} of 4',
  },
};

export const frDict: TranslationDictionary = {
  common: {
    appName: 'Aetheris Omni-Sphere',
    tagline: 'Matrice Mondiale de Communication Souveraine Zero-Knowledge',
    loading: 'Chargement de la matrice cryptographique...',
    save: 'Enregistrer',
    cancel: 'Annuler',
    close: 'Fermer',
    delete: 'Supprimer',
    edit: 'Modifier',
    copy: 'Copier dans le presse-papiers',
    copied: 'Copié !',
    search: 'Rechercher dans la matrice...',
    refresh: 'Actualiser',
    status: 'État',
    online: 'En ligne',
    offline: 'Hors ligne',
    syncing: 'Synchronisation',
    verified: 'Vérifié Cryptographiquement',
    error: 'Erreur',
    success: 'Succès',
    warning: 'Avertissement',
    anonymous: 'Pair Anonyme',
    unknown: 'Nœud Inconnu',
    all: 'Tous',
    filter: 'Filtrer',
    details: 'Détails',
    back: 'Retour',
    next: 'Suivant',
    confirm: 'Confirmer',
    submit: 'Soumettre',
  },
  nav: {
    relays: 'Relais en Direct',
    vault: 'Coffre Binaire',
    pulse: 'Pouls Souverain',
    defense: 'Cyberdéfense',
    observatory: 'Observatoire Réseau',
    governance: 'Gouvernance DAO',
    wallet: 'Portefeuille Papier & Web3',
    settings: 'Paramètres',
    admin: 'Administration',
    theme: 'Moteur de Thèmes',
    language: 'Langue / RTL',
    onboarding: 'Guide de Souveraineté',
  },
  relays: {
    title: 'Relais de Signalisation & Voix E2EE',
    subtitle: 'Réseau Maillé P2P MLS TreeKEM à Clés Quantiques sur Cloudflare Edge',
    channels: 'Canaux',
    directMessages: 'Messages Privés Souverains',
    voiceChannel: 'Salon Vocal Spatial',
    joinVoice: 'Rejoindre le Réseau Audio',
    leaveVoice: 'Déconnecter Audio',
    muteMicrophone: 'Couper le Micro',
    unmuteMicrophone: 'Activer le Micro',
    screenShare: 'Partage d\'Écran (120 FPS)',
    typeMessage: 'Écrire un message souverain chiffré...',
    sendMessage: 'Envoyer',
    encryptedE2EE: 'Chiffré AES-256-GCM / MLS',
    treekemEpoch: 'Époque du Cliquet TreeKEM',
    spammerQuarantined: 'Spammeur Mis en Quarantaine via Preuve ZK-RLN',
    activePeers: 'Pairs Actifs du Réseau',
    noMessages: 'Aucun message pour le moment dans cet espace chiffré.',
  },
  vault: {
    title: 'Coffre Binaire Vérifié & Registre d\'Artefacts',
    subtitle: 'Distribution R2 sans Frais d\'Egress avec Vérification par Arbre de Merkle',
    uploadBinary: 'Publier un Binaire Souverain',
    nanopublications: 'Nanopublications',
    merkleRoot: 'Racine de l\'Arbre de Merkle',
    sha256Checksum: 'Empreinte SHA-256',
    byteSize: 'Taille en Octets',
    entropy: 'Entropie de Shannon',
    verdict: 'Verdict Cryptographique',
    cleanVerdict: 'VÉRIFIÉ SAIN',
    maliciousVerdict: 'ENTROPIE SUSPECTE',
    seederCount: 'Sources BitTorrent Actives',
    downloadArtifact: 'Télécharger via Cloudflare R2',
    inspectFile: 'Inspecter les En-têtes',
    dragDropPrompt: 'Glissez-déposez le fichier binaire pour vérification et signature',
    torrentMeshReady: 'Essaim BitTorrent WebRTC Actif',
  },
  pulse: {
    title: 'Flux Chronologique Sovereign Pulse',
    subtitle: 'Microblogging Chronologique Non Censuré avec Protection ZK-RLN',
    composerPlaceholder: 'Diffusez vos pensées souveraines sur le réseau mondial...',
    publishPost: 'Publier le Pouls',
    chronologicalFeed: 'Flux Mondial Chronologique',
    meritVotes: 'Votes de Mérite',
    replies: 'Réponses',
    boost: 'Amplifier',
    share: 'Partager le Lien Cryptographique',
    quotePost: 'Citer le Message',
    bookmark: 'Sauvegarder dans le Coffre',
    award: 'Décerner une Médaille de Mérite',
    viewThread: 'Voir la Conversation Complète',
    trendingTopics: 'Sujets & Tendances',
  },
  edge: {
    title: 'Infrastructure Mondiale Anycast Edge',
    globalTopology: 'Cloudflare Global Edge (Routage Anycast dans 300+ Villes)',
    edgeLocations: 'PoPs Multi-Régions (WNAM, ENAM, WEUR, EEUR, APAC)',
    anycastRouting: 'Routage Anycast BGP à Proximité Immédiate (<15ms)',
    latency: 'Latence RTT Mondiale en Temps Réel',
    d1Replicas: 'Répliques de Lecture D1 Multi-Régions (<5ms)',
    r2Storage: 'Stockage Global Cloudflare R2 sans Frais de Sortie',
    durableObjects: 'Durable Objects avec Hibernation WebSocket',
    cacheHitRatio: 'Taux de Succès du Cache CDN Edge L1/L2',
    sub15msTarget: 'Objectif de Latence Mondiale <15ms',
    activeRegion: 'Région Edge Connectée',
    failoverStatus: 'État de Basculement : Route Anycast Active',
    p2pMeshFallback: 'Secours Maillé WebRTC Direct Prêt',
  },
  security: {
    zeroTrust: 'Architecture Zero-Trust',
    dataSovereignty: 'Souveraineté des Données Zero-Knowledge',
    gdprCompliant: 'Conforme RGPD / CCPA par Conception (Zéro PII sur l\'Edge)',
    clientSideEncryption: 'Chiffrement Côté Client Ed25519 & AES-256-GCM',
    ed25519Identity: 'Paire de Clés d\'Identité Souveraine Ed25519',
    zkRlnProtection: 'Limitation de Débit & Pénalisation ZK-RLN',
    cveMonitoring: 'Surveillance des Vulnérabilités & Zero-Day en Temps Réel',
    auditStatus: 'Vérification Formelle & Audit : VALIDÉ',
    webAuthnKey: 'Clé de Sécurité Matérielle (FIDO2/WebAuthn)',
    paperBackup: 'Imprimer le Portefeuille Papier Souverain',
    shredIdentity: 'Autodestruction Cryptographique / Destruction de Clé',
  },
  crdt: {
    vectorClocks: 'Horloges Vectorielles Distribuées',
    lwwResolution: 'Résolution de Conflits Last-Write-Wins',
    merkleSync: 'Réconciliation d\'État par Arbre de Merkle',
    bufferedActions: 'Actions Hors Ligne Mémorisées',
    syncNow: 'Synchroniser le Réseau Maintenant',
    allSynced: 'Toutes les Répliques Distribuées sont Synchronisées',
  },
  units: {
    byte: 'o',
    kilobyte: 'Ko',
    megabyte: 'Mo',
    gigabyte: 'Go',
    terabyte: 'To',
    milliseconds: 'ms',
    seconds: 'sec',
    minutes: 'min',
    hours: 'h',
    days: 'j',
    ago: 'il y a',
    justNow: 'à l\'instant',
  },
  uiMode: {
    simple: 'Simple',
    sovereign: 'Souverain',
    advancedTools: 'Outils Avancés',
    switchMode: "Changer le Mode d'Interface",
  },
  onboardingNarrative: {
    step1Title: 'Votre identité vous appartient',
    step1Subtitle: 'Auto-souveraineté dès la première seconde',
    step1Body: "Aucun serveur central ne possède votre compte. Pas d'e-mail, pas de numéro de téléphone, pas de mots de passe stockés sur des serveurs distants. Vos clés cryptographiques existent exclusivement sur votre appareil.",
    step2Title: 'Votre contenu est entièrement protégé',
    step2Subtitle: 'Sécurité zero-knowledge de bout en bout',
    step2Body: "Tout ce que vous rédigez ou partagez est chiffré directement dans votre navigateur avant d'atteindre le réseau. Seuls les destinataires que vous autorisez détiennent les clés de déchiffrement.",
    step3Title: 'Le réseau appartient à tous',
    step3Subtitle: 'Distribution décentralisée peer-to-peer',
    step3Body: 'Chaque participant contribue à relayer et préserver les données sur le maillage. Zéro algorithme opaque conçu pour capter votre attention, et zéro point de contrôle pour la censure.',
    step4Title: 'Sauvegardez votre clé de récupération',
    step4Subtitle: 'Votre phrase mnémonique de 12 mots',
    step4Body: "Notez ces 12 mots secrets. Ils représentent l'intégralité de votre identité souveraine et de vos identifiants cryptographiques.",
    step4Warning: 'Cette phrase de 12 mots est le seul moyen de récupérer votre compte. Aetheris ne stocke jamais vos clés.',
    step4SavedWords: "J'ai sauvegardé mes mots mnémoniques en sécurité",
    step4DownloadBackup: 'Télécharger la sauvegarde chiffrée',
    skip: 'Passer',
    continue: 'Continuer',
    back: 'Retour',
    finish: 'Entrer dans le Réseau Souverain',
    stepOf: 'Étape {step} sur 4',
  },
};

export const deDict: TranslationDictionary = {
  common: {
    appName: 'Aetheris Omni-Sphere',
    tagline: 'Souveräne Zero-Knowledge Globale Kommunikationsmatrix',
    loading: 'Kryptografische Matrix wird geladen...',
    save: 'Speichern',
    cancel: 'Abbrechen',
    close: 'Schließen',
    delete: 'Löschen',
    edit: 'Bearbeiten',
    copy: 'In Zwischenablage kopieren',
    copied: 'Kopiert!',
    search: 'Souveräne Matrix durchsuchen...',
    refresh: 'Aktualisieren',
    status: 'Status',
    online: 'Online',
    offline: 'Offline',
    syncing: 'Synchronisiere',
    verified: 'Kryptografisch Verifiziert',
    error: 'Fehler',
    success: 'Erfolg',
    warning: 'Warnung',
    anonymous: 'Anonymer Peer',
    unknown: 'Unbekannter Knoten',
    all: 'Alle',
    filter: 'Filtern',
    details: 'Details',
    back: 'Zurück',
    next: 'Weiter',
    confirm: 'Bestätigen',
    submit: 'Absenden',
  },
  nav: {
    relays: 'Live-Relais',
    vault: 'Binär-Tresor',
    pulse: 'Souveräner Puls',
    defense: 'Cyberabwehr',
    observatory: 'Netzwerk-Observatorium',
    governance: 'DAO-Governance',
    wallet: 'Papier & Web3 Wallet',
    settings: 'Einstellungen',
    admin: 'Knoten-Admin',
    theme: 'Theme-Engine',
    language: 'Sprache / RTL',
    onboarding: 'Souveränitäts-Leitfaden',
  },
  relays: {
    title: 'E2EE Live-Signalisierung & Sprach-Relais',
    subtitle: 'MLS TreeKEM Post-Quanten-Mesh über Cloudflare Edge',
    channels: 'Kanäle',
    directMessages: 'Souveräne Direktnachrichten',
    voiceChannel: 'Räumlicher Sprachraum',
    joinVoice: 'Audio-Mesh beitreten',
    leaveVoice: 'Audio trennen',
    muteMicrophone: 'Mikrofon stummschalten',
    unmuteMicrophone: 'Mikrofon aktivieren',
    screenShare: 'Bildschirm teilen (120 FPS)',
    typeMessage: 'Verschlüsselte Nachricht eingeben...',
    sendMessage: 'Nachricht Senden',
    encryptedE2EE: 'AES-256-GCM / MLS Verschlüsselt',
    treekemEpoch: 'TreeKEM Ratchet Epoche',
    spammerQuarantined: 'Spammer über ZK-RLN Beweis isoliert',
    activePeers: 'Aktive Mesh-Peers',
    noMessages: 'Noch keine Nachrichten in diesem verschlüsselten Raum.',
  },
  vault: {
    title: 'Verifizierter Binär-Tresor & Artefakt-Register',
    subtitle: 'Gebührenfreie R2-Verteilung mit Merkle-Baum-Verifikation',
    uploadBinary: 'Souveräne Binärdatei Veröffentlichen',
    nanopublications: 'Nanopublikationen',
    merkleRoot: 'Merkle-Baum-Wurzel',
    sha256Checksum: 'SHA-256 Hash',
    byteSize: 'Dateigröße (Bytes)',
    entropy: 'Shannon-Entropie',
    verdict: 'Kryptografisches Urteil',
    cleanVerdict: 'VERIFIZIERT SAUBER',
    maliciousVerdict: 'VERDÄCHTIGE ENTROPIE',
    seederCount: 'Aktive BitTorrent-Seeder',
    downloadArtifact: 'Über Cloudflare R2 Herunterladen',
    inspectFile: 'Dateikopf Inspizieren',
    dragDropPrompt: 'Binärdatei zum Signieren & Verifizieren hier ablegen',
    torrentMeshReady: 'BitTorrent WebRTC Schwarm Aktiv',
  },
  pulse: {
    title: 'Sovereign Pulse Chronostream',
    subtitle: 'Unzensiertes chronologisches Microblogging mit ZK-RLN Spam-Schutz',
    composerPlaceholder: 'Teilen Sie Ihre souveränen Gedanken im globalen Mesh...',
    publishPost: 'Puls Senden',
    chronologicalFeed: 'Globaler Chronologischer Feed',
    meritVotes: 'Verdienst-Stimmen',
    replies: 'Antworten',
    boost: 'Verstärken',
    share: 'Kryptografischen Link Teilen',
    quotePost: 'Beitrag Zitieren',
    bookmark: 'Im Tresor Speichern',
    award: 'Verdienst-Medaille Verleihen',
    viewThread: 'Vollständige Konversation Anzeigen',
    trendingTopics: 'Trendthemen & Hashtags',
  },
  edge: {
    title: 'Weltweite Anycast Edge-Infrastruktur',
    globalTopology: 'Cloudflare Global Edge (300+ Städte Anycast-Routing)',
    edgeLocations: 'Multi-Region PoPs (WNAM, ENAM, WEUR, EEUR, APAC)',
    anycastRouting: 'BGP Anycast Sub-15ms Latenz-Routing',
    latency: 'Echtzeit Globale RTT-Latenz',
    d1Replicas: 'Cloudflare D1 Multi-Region Lese-Replikate (<5ms)',
    r2Storage: 'Cloudflare R2 Globaler Speicher ohne Egress-Kosten',
    durableObjects: 'Durable Objects mit WebSocket-Ruhezustand',
    cacheHitRatio: 'Edge L1/L2 CDN Cache-Trefferquote',
    sub15msTarget: 'Sub-15ms Globale Latenz-Garantie',
    activeRegion: 'Verbundene Edge-Region',
    failoverStatus: 'Ausfallsicherheits-Status: Aktive Anycast-Route',
    p2pMeshFallback: 'WebRTC Direct Swarm Fallback Bereit',
  },
  security: {
    zeroTrust: 'Zero-Trust Architektur',
    dataSovereignty: 'Zero-Knowledge Datensouveränität',
    gdprCompliant: 'DSGVO / CCPA Konform durch Design (Keine PII auf Edge)',
    clientSideEncryption: 'Client-Seitige Ed25519 & AES-256-GCM Verschlüsselung',
    ed25519Identity: 'Souveränes Ed25519 Schlüsselpaar',
    zkRlnProtection: 'ZK-RLN Ratenbegrenzung & Identitäts-Slashing',
    cveMonitoring: 'Echtzeit CVE & Zero-Day Schwachstellen-Überwachung',
    auditStatus: 'Formale Verifikation & Sicherheits-Audit: BESTANDEN',
    webAuthnKey: 'Hardware-Sicherheitsschlüssel (FIDO2/WebAuthn)',
    paperBackup: 'Souveränes Papier-Wallet Drucken',
    shredIdentity: 'Kryptografische Selbstzerstörung / Schlüssel Vernichten',
  },
  crdt: {
    vectorClocks: 'Verteilte Vektoruhren',
    lwwResolution: 'Last-Write-Wins Konfliktauflösung',
    merkleSync: 'Zustandsabgleich über Merkle-Bäume',
    bufferedActions: 'Gepufferte Offline-Aktionen',
    syncNow: 'Jetzt mit Mesh Synchronisieren',
    allSynced: 'Alle Verteilten Replikate Vollständig Synchronisiert',
  },
  units: {
    byte: 'B',
    kilobyte: 'KB',
    megabyte: 'MB',
    gigabyte: 'GB',
    terabyte: 'TB',
    milliseconds: 'ms',
    seconds: 'Sek',
    minutes: 'Min',
    hours: 'Std',
    days: 'Tage',
    ago: 'vor',
    justNow: 'gerade eben',
  },
  uiMode: {
    simple: 'Einfach',
    sovereign: 'Souverän',
    advancedTools: 'Erweiterte Werkzeuge',
    switchMode: 'Schnittstellenmodus wechseln',
  },
  onboardingNarrative: {
    step1Title: 'Ihre Identität gehört Ihnen',
    step1Subtitle: 'Selbstbestimmung von der ersten Sekunde an',
    step1Body: 'Kein zentraler Server besitzt Ihr Konto. Keine E-Mail, keine Telefonnummer, keine Passwörter auf externen Servern. Ihre kryptografischen Schlüssel existieren ausschließlich auf Ihrem Gerät.',
    step2Title: 'Ihre Inhalte sind vollständig geschützt',
    step2Subtitle: 'Durchgehende Zero-Knowledge-Sicherheit',
    step2Body: 'Alles, was Sie verfassen oder teilen, wird direkt in Ihrem Browser verschlüsselt, bevor es das Netzwerk berührt. Nur autorisierte Empfänger besitzen die Schlüssel zum Entschlüsseln.',
    step3Title: 'Das Netzwerk gehört allen',
    step3Subtitle: 'Dezentrale Peer-to-Peer-Verteilung',
    step3Body: 'Jeder Teilnehmer hilft beim Weiterleiten und Bewahren von Wissen im Mesh-Netzwerk. Keine manipulativen Algorithmen und keine zentralen Zensur-Schwachstellen.',
    step4Title: 'Wiederherstellungsschlüssel sichern',
    step4Subtitle: 'Ihre 12-Wörter-Master-Seed-Phrase',
    step4Body: 'Notieren Sie sich diese 12 geheimen Wörter. Sie stellen Ihre vollständige souveräne Identität und all Ihre Zugangsdaten dar.',
    step4Warning: 'Diese 12-Wörter-Phrase ist die einzige Möglichkeit, Ihr Konto wiederherzustellen. Aetheris speichert niemals Ihre Schlüssel.',
    step4SavedWords: 'Ich habe meine Seed-Wörter sicher aufbewahrt',
    step4DownloadBackup: 'Verschlüsseltes Backup herunterladen',
    skip: 'Überspringen',
    continue: 'Weiter',
    back: 'Zurück',
    finish: 'Dem souveränen Netzwerk beitreten',
    stepOf: 'Schritt {step} von 4',
  },
};

export const esDict: TranslationDictionary = {
  common: {
    appName: 'Aetheris Omni-Sphere',
    tagline: 'Matriz Global Soberana de Comunicación Zero-Knowledge',
    loading: 'Cargando matriz criptográfica...',
    save: 'Guardar Cambios',
    cancel: 'Cancelar',
    close: 'Cerrar',
    delete: 'Eliminar',
    edit: 'Editar',
    copy: 'Copiar al portapapeles',
    copied: '¡Copiado!',
    search: 'Buscar en la matriz soberana...',
    refresh: 'Actualizar',
    status: 'Estado',
    online: 'En línea',
    offline: 'Desconectado',
    syncing: 'Sincronizando',
    verified: 'Verificado Criptográficamente',
    error: 'Error',
    success: 'Éxito',
    warning: 'Advertencia',
    anonymous: 'Par Anónimo',
    unknown: 'Nodo Desconocido',
    all: 'Todos',
    filter: 'Filtrar',
    details: 'Detalles',
    back: 'Atrás',
    next: 'Siguiente',
    confirm: 'Confirmar',
    submit: 'Enviar',
  },
  nav: {
    relays: 'Relés en Vivo',
    vault: 'Bóveda Binaria',
    pulse: 'Pulso Soberano',
    defense: 'Ciberdefensa',
    observatory: 'Observatorio de Red',
    governance: 'Gobernanza DAO',
    wallet: 'Billetera Papel & Web3',
    settings: 'Ajustes',
    admin: 'Administración',
    theme: 'Motor de Temas',
    language: 'Idioma / RTL',
    onboarding: 'Guía de Soberanía',
  },
  relays: {
    title: 'Relés de Señalización & Voz E2EE',
    subtitle: 'Malla P2P MLS TreeKEM con Cifrado Cuántico sobre Cloudflare Edge',
    channels: 'Canales',
    directMessages: 'Mensajes Directos Soberanos',
    voiceChannel: 'Sala de Voz Espacial',
    joinVoice: 'Unirse a la Malla de Audio',
    leaveVoice: 'Desconectar Audio',
    muteMicrophone: 'Silenciar Micrófono',
    unmuteMicrophone: 'Activar Micrófono',
    screenShare: 'Compartir Pantalla (120 FPS)',
    typeMessage: 'Escribir mensaje soberano cifrado...',
    sendMessage: 'Enviar Mensaje',
    encryptedE2EE: 'Cifrado AES-256-GCM / MLS',
    treekemEpoch: 'Época del Trinquete TreeKEM',
    spammerQuarantined: 'Spammer puesto en cuarentena mediante prueba ZK-RLN',
    activePeers: 'Pares Activos en la Malla',
    noMessages: 'Aún no hay mensajes en este espacio cifrado.',
  },
  vault: {
    title: 'Bóveda Binaria Verificada & Registro de Artefactos',
    subtitle: 'Distribución R2 sin Costes de Egress con Verificación de Árbol Merkle',
    uploadBinary: 'Publicar Binario Soberano',
    nanopublications: 'Nanopublicaciones',
    merkleRoot: 'Raíz del Árbol Merkle',
    sha256Checksum: 'Hash SHA-256',
    byteSize: 'Tamaño en Bytes',
    entropy: 'Entropía de Shannon',
    verdict: 'Veredicto Criptográfico',
    cleanVerdict: 'VERIFICADO LIMPIO',
    maliciousVerdict: 'ENTROPÍA SOSPECHOSA',
    seederCount: 'Semillas BitTorrent Activas',
    downloadArtifact: 'Descargar vía Cloudflare R2',
    inspectFile: 'Inspeccionar Cabeceras Binarias',
    dragDropPrompt: 'Arrastre y suelte el binario para verificar y firmar',
    torrentMeshReady: 'Enjambre BitTorrent WebRTC Activo',
  },
  pulse: {
    title: 'Flujo Cronológico Sovereign Pulse',
    subtitle: 'Microblogging Cronológico sin Censura con Protección ZK-RLN',
    composerPlaceholder: 'Transmita sus ideas soberanas a la malla global...',
    publishPost: 'Transmitir Pulso',
    chronologicalFeed: 'Flujo Global Cronológico',
    meritVotes: 'Votos de Mérito',
    replies: 'Respuestas',
    boost: 'Impulsar',
    share: 'Compartir Enlace Criptográfico',
    quotePost: 'Citar Publicación',
    bookmark: 'Guardar en la Bóveda',
    award: 'Otorgar Medalla de Mérito',
    viewThread: 'Ver Conversación Completa',
    trendingTopics: 'Temas Populares & Hashtags',
  },
  edge: {
    title: 'Infraestructura Global Anycast Edge',
    globalTopology: 'Cloudflare Global Edge (Enrutamiento Anycast en 300+ Ciudades)',
    edgeLocations: 'PoPs Multi-Región (WNAM, ENAM, WEUR, EEUR, APAC)',
    anycastRouting: 'Enrutamiento Anycast BGP con Latencia Sub-15ms',
    latency: 'Latencia RTT Global en Tiempo Real',
    d1Replicas: 'Réplicas de Lectura D1 Multi-Región (<5ms)',
    r2Storage: 'Almacenamiento Global Cloudflare R2 sin Tasas de Salida',
    durableObjects: 'Durable Objects con Hibernación WebSocket',
    cacheHitRatio: 'Tasa de Aciertos en Caché Edge L1/L2',
    sub15msTarget: 'Garantía de Latencia Global Sub-15ms',
    activeRegion: 'Región Edge Conectada',
    failoverStatus: 'Estado de Conmutación: Ruta Anycast Activa',
    p2pMeshFallback: 'Respaldo de Enjambre Directo WebRTC Listo',
  },
  security: {
    zeroTrust: 'Arquitectura Zero-Trust',
    dataSovereignty: 'Soberanía de Datos Zero-Knowledge',
    gdprCompliant: 'Cumplimiento RGPD / CCPA por Diseño (Cero PII en el Servidor)',
    clientSideEncryption: 'Cifrado en Cliente con Ed25519 & AES-256-GCM',
    ed25519Identity: 'Par de Claves de Identidad Soberana Ed25519',
    zkRlnProtection: 'Límite de Tasa ZK-RLN y Penalización de Identidad',
    cveMonitoring: 'Monitorización de Vulnerabilidades CVE y Día Cero',
    auditStatus: 'Verificación Formal y Auditoría: APROBADA',
    webAuthnKey: 'Llave de Seguridad Física (FIDO2/WebAuthn)',
    paperBackup: 'Imprimir Billetera de Papel Soberana',
    shredIdentity: 'Autodestrucción Criptográfica / Triturar Llave',
  },
  crdt: {
    vectorClocks: 'Relojes Vectoriales Distribuidos',
    lwwResolution: 'Resolución de Conflictos Last-Write-Wins',
    merkleSync: 'Reconciliación de Estado mediante Árbol Merkle',
    bufferedActions: 'Acciones Fuera de Línea en Búfer',
    syncNow: 'Sincronizar con la Malla Ahora',
    allSynced: 'Todas las Réplicas Distribuidas Sincronizadas',
  },
  units: {
    byte: 'B',
    kilobyte: 'KB',
    megabyte: 'MB',
    gigabyte: 'GB',
    terabyte: 'TB',
    milliseconds: 'ms',
    seconds: 'seg',
    minutes: 'min',
    hours: 'h',
    days: 'días',
    ago: 'hace',
    justNow: 'ahora mismo',
  },
  uiMode: {
    simple: 'Simple',
    sovereign: 'Soberano',
    advancedTools: 'Herramientas Avanzadas',
    switchMode: 'Cambiar Modo de Interfaz',
  },
  onboardingNarrative: {
    step1Title: 'Tu identidad te pertenece',
    step1Subtitle: 'Autosoberanía desde el primer segundo',
    step1Body: 'Ningún servidor central posee tu cuenta. Sin correo electrónico, sin número de teléfono, sin contraseñas en bases de datos externas. Tus claves criptográficas residen exclusivamente en tu dispositivo.',
    step2Title: 'Tu contenido está totalmente protegido',
    step2Subtitle: 'Seguridad zero-knowledge de extremo a extremo',
    step2Body: 'Todo lo que escribes o compartes se cifra directamente en tu navegador antes de transmitirse. Solo los destinatarios que autorices poseen las claves para descifrarlo.',
    step3Title: 'La red pertenece a todos',
    step3Subtitle: 'Distribución descentralizada peer-to-peer',
    step3Body: 'Cada participante ayuda a retransmitir y preservar el conocimiento en la malla. Cero algoritmos opacos de manipulación y cero puntos centrales de censura.',
    step4Title: 'Guarda tu clave de recuperación',
    step4Subtitle: 'Tu frase semilla maestra de 12 palabras',
    step4Body: 'Anota estas 12 palabras secretas. Representan tu identidad soberana completa y todas tus credenciales criptográficas.',
    step4Warning: 'Esta frase de 12 palabras es la única vía para recuperar tu cuenta. Aetheris nunca almacena tus claves.',
    step4SavedWords: 'He guardado mis palabras semilla de forma segura',
    step4DownloadBackup: 'Descargar copia de seguridad cifrada',
    skip: 'Omitir',
    continue: 'Continuar',
    back: 'Atrás',
    finish: 'Entrar a la Red Soberana',
    stepOf: 'Paso {step} de 4',
  },
};

export const roDict: TranslationDictionary = {
  common: {
    appName: 'Aetheris Omni-Sphere',
    tagline: 'Matrice Globală Suverană de Comunicații Zero-Knowledge',
    loading: 'Se încarcă matricea criptografică...',
    save: 'Salvează Modificările',
    cancel: 'Anulează',
    close: 'Închide',
    delete: 'Șterge',
    edit: 'Editează',
    copy: 'Copiază în Clipboard',
    copied: 'Copiat!',
    search: 'Caută în matricea suverană...',
    refresh: 'Reîmprospătează',
    status: 'Stare',
    online: 'Online',
    offline: 'Offline',
    syncing: 'Sincronizare',
    verified: 'Verificat Criptografic',
    error: 'Eroare',
    success: 'Succes',
    warning: 'Avertisment',
    anonymous: 'Nod Anonim',
    unknown: 'Nod Necunoscut',
    all: 'Toate',
    filter: 'Filtrează',
    details: 'Detalii',
    back: 'Înapoi',
    next: 'Următorul',
    confirm: 'Confirmă',
    submit: 'Trimite',
  },
  nav: {
    relays: 'Relee Live',
    vault: 'Seif Binar',
    pulse: 'Puls Suveran',
    defense: 'Cyber Defense',
    observatory: 'Observator Rețea',
    governance: 'Guvernanță DAO',
    wallet: 'Portofel Hârtie & Web3',
    settings: 'Setări',
    admin: 'Admin Nod',
    theme: 'Motor Teme',
    language: 'Limbă / RTL',
    onboarding: 'Ghid Suveranitate',
  },
  relays: {
    title: 'Relee Live E2EE de Semnalizare & Voce',
    subtitle: 'Rețea Mesh P2P cu Criptare Post-Cuantică MLS TreeKEM pe Cloudflare Edge',
    channels: 'Canale',
    directMessages: 'Mesaje Directe Suverane',
    voiceChannel: 'Cameră Voce Spațială',
    joinVoice: 'Conectează-te la Audio Mesh',
    leaveVoice: 'Deconectează Audio',
    muteMicrophone: 'Oprește Microfonul',
    unmuteMicrophone: 'Pornește Microfonul',
    screenShare: 'Partajare Ecran (120 FPS)',
    typeMessage: 'Scrie un mesaj suveran criptat...',
    sendMessage: 'Trimite Mesaj',
    encryptedE2EE: 'Criptat AES-256-GCM / MLS',
    treekemEpoch: 'Epocă Clichet TreeKEM',
    spammerQuarantined: 'Spammer Carantinat prin Dovadă ZK-RLN',
    activePeers: 'Noduri Active în Mesh',
    noMessages: 'Niciun mesaj încă în acest spațiu criptat.',
  },
  vault: {
    title: 'Seif Binar Verificat & Registru de Artefacte',
    subtitle: 'Distribuție R2 fără Taxe de Egress cu Verificare prin Arbore Merkle',
    uploadBinary: 'Publică Binar Suveran',
    nanopublications: 'Nanopublicații',
    merkleRoot: 'Rădăcină Arbore Merkle',
    sha256Checksum: 'Amprentă SHA-256',
    byteSize: 'Dimensiune în Octeți',
    entropy: 'Entropie Shannon',
    verdict: 'Verdict Criptografic',
    cleanVerdict: 'VERIFICAT CURAT',
    maliciousVerdict: 'ENTROPIE SUSPECTĂ',
    seederCount: 'Seederi BitTorrent Activi',
    downloadArtifact: 'Descarcă prin Cloudflare R2',
    inspectFile: 'Inspectează Antetele Fișierului',
    dragDropPrompt: 'Trage și plasează fișierul binar pentru verificare și semnare',
    torrentMeshReady: 'Swarm BitTorrent WebRTC Activ',
  },
  pulse: {
    title: 'Flux Cronologic Sovereign Pulse',
    subtitle: 'Microblogging Cronologic Necenzurat cu Protecție Anti-Spam ZK-RLN',
    composerPlaceholder: 'Transmite gândurile tale suverane către mesh-ul global...',
    publishPost: 'Publică Puls',
    chronologicalFeed: 'Flux Global Cronologic',
    meritVotes: 'Voturi de Merit',
    replies: 'Răspunsuri',
    boost: 'Propulsează',
    share: 'Distribuie Link Criptografic',
    quotePost: 'Citează Postarea',
    bookmark: 'Salvează în Seif',
    award: 'Acordă Medalie de Merit',
    viewThread: 'Vezi Conversația Completă',
    trendingTopics: 'Subiecte Populare & Hashtag-uri',
  },
  edge: {
    title: 'Infrastructură Globală Anycast Edge',
    globalTopology: 'Cloudflare Global Edge (Rutare Anycast în 300+ Orașe)',
    edgeLocations: 'PoP-uri Multi-Regiune (WNAM, ENAM, WEUR, EEUR, APAC)',
    anycastRouting: 'Rutare Anycast BGP cu Latență Sub-15ms',
    latency: 'Latență RTT Globală în Timp Real',
    d1Replicas: 'Replici de Citire Cloudflare D1 Multi-Regiune (<5ms)',
    r2Storage: 'Stocare Globală Cloudflare R2 cu Zero Taxe de Ieșire',
    durableObjects: 'Durable Objects cu Hibernare WebSocket',
    cacheHitRatio: 'Rată de Succes Cache CDN Edge L1/L2',
    sub15msTarget: 'Garanție SLA Latență Globală Sub-15ms',
    activeRegion: 'Regiune Edge Conectată',
    failoverStatus: 'Stare Failover: Rută Anycast Activă',
    p2pMeshFallback: 'Fallback Mesh WebRTC Direct Pregătit',
  },
  security: {
    zeroTrust: 'Arhitectură Zero-Trust',
    dataSovereignty: 'Suveranitate a Datelor Zero-Knowledge',
    gdprCompliant: 'Conformitate GDPR / CCPA prin Design (Zero PII pe Server)',
    clientSideEncryption: 'Criptare pe Client Ed25519 & AES-256-GCM',
    ed25519Identity: 'Pereche de Chei de Identitate Suverană Ed25519',
    zkRlnProtection: 'Limitare de Rată ZK-RLN & Sancționare Identitate',
    cveMonitoring: 'Monitorizare Vulnerabilități CVE & Zero-Day în Timp Real',
    auditStatus: 'Verificare Formală & Audit: PROBAT CU SUCCES',
    webAuthnKey: 'Cheie Fizică de Securitate (FIDO2/WebAuthn)',
    paperBackup: 'Tipărește Portofelul Suveran pe Hârtie',
    shredIdentity: 'Autodistrugere Criptografică / Distruge Cheia',
  },
  crdt: {
    vectorClocks: 'Ceasuri Vectoriale Distribuite',
    lwwResolution: 'Rezolvare Conflicte Last-Write-Wins',
    merkleSync: 'Reconciliere Stare prin Arbore Merkle',
    bufferedActions: 'Acțiuni Offline Păstrate în Buffer',
    syncNow: 'Sincronizează cu Mesh-ul Acum',
    allSynced: 'Toate Replicile Distribuite sunt Sincronizate',
  },
  units: {
    byte: 'B',
    kilobyte: 'KB',
    megabyte: 'MB',
    gigabyte: 'GB',
    terabyte: 'TB',
    milliseconds: 'ms',
    seconds: 'sec',
    minutes: 'min',
    hours: 'ore',
    days: 'zile',
    ago: 'în urmă',
    justNow: 'chiar acum',
  },
  uiMode: {
    simple: 'Simplu',
    sovereign: 'Suveran',
    advancedTools: 'Unelte avansate',
    switchMode: 'Comută modul interfeței',
  },
  onboardingNarrative: {
    step1Title: 'Identitatea ta îți aparține',
    step1Subtitle: 'Suveranitate din prima secundă',
    step1Body: 'Niciun server nu-ți deține contul. Fără email, fără număr de telefon, fără parole pe servere străine. Cheile tale criptografice există exclusiv pe dispozitivul tău.',
    step2Title: 'Conținutul tău e protejat',
    step2Subtitle: 'Securitate zero-knowledge de la cap la coadă',
    step2Body: 'Criptat direct în browserul tău înainte să plece oriunde. Doar cei cărora le permiți au cheia pentru a citi ce trimiți.',
    step3Title: 'Rețeaua e a tuturor',
    step3Subtitle: 'Distribuire descentralizată peer-to-peer',
    step3Body: 'Fiecare participant ajută la distribuirea conținutului. Fără algoritmi ascunși pentru a exploata atenția, fără cenzură centralizată.',
    step4Title: 'Salvează-ți cheia de salvare',
    step4Subtitle: 'Fraza ta secretă de 12 cuvinte',
    step4Body: 'Notează aceste 12 cuvinte secrete. Ele reprezintă întreaga ta identitate suverană și datele tale de acces.',
    step4Warning: 'Această frază este singura cale de recuperare a contului tău. Aetheris nu stochează chei pe servere.',
    step4SavedWords: 'Am salvat cuvintele în siguranță',
    step4DownloadBackup: 'Descarcă copie de siguranță',
    skip: 'Sari peste',
    continue: 'Continuă',
    back: 'Înapoi',
    finish: 'Gata, intră în rețea',
    stepOf: 'Pasul {step} din 4',
  },
};

export const jaDict: TranslationDictionary = {
  common: {
    appName: 'Aetheris Omni-Sphere',
    tagline: 'ゼロ知識・主権型グローバル分散通信マトリクス',
    loading: '暗号マトリクスを読み込み中...',
    save: '変更を保存',
    cancel: 'キャンセル',
    close: '閉じる',
    delete: '削除',
    edit: '編集',
    copy: 'クリップボードにコピー',
    copied: 'コピー完了！',
    search: '主権マトリクスを検索...',
    refresh: '更新',
    status: 'ステータス',
    online: 'オンライン',
    offline: 'オフライン',
    syncing: '同期中',
    verified: '暗号学的に検証済み',
    error: 'エラー',
    success: '成功',
    warning: '警告',
    anonymous: '匿名ピア',
    unknown: '不明なノード',
    all: 'すべて',
    filter: 'フィルター',
    details: '詳細',
    back: '戻る',
    next: '次へ',
    confirm: '確認',
    submit: '送信',
  },
  nav: {
    relays: 'ライブリレー',
    vault: 'バイナリ保管庫',
    pulse: 'ソブリン・パルス',
    defense: 'サイバー防衛',
    observatory: 'ネットワーク監視',
    governance: 'DAOガバナンス',
    wallet: 'ペーパー＆Web3ウォレット',
    settings: '設定',
    admin: 'ノード管理',
    theme: 'テーマエンジン',
    language: '言語 / RTL設定',
    onboarding: '主権ガイド',
  },
  relays: {
    title: 'E2EEライブシグナリング＆音声リレー',
    subtitle: 'Cloudflare Edge上のMLS TreeKEM耐量子P2Pメッシュ',
    channels: 'チャンネル',
    directMessages: '主権ダイレクトメッセージ',
    voiceChannel: '空間音声ルーム',
    joinVoice: 'オーディオメッシュに参加',
    leaveVoice: '切断',
    muteMicrophone: 'マイクをミュート',
    unmuteMicrophone: 'ミュート解除',
    screenShare: '画面共有 (120 FPS)',
    typeMessage: '暗号化された主権メッセージを入力...',
    sendMessage: '送信',
    encryptedE2EE: 'AES-256-GCM / MLS 暗号化',
    treekemEpoch: 'TreeKEMラチェット・エポック',
    spammerQuarantined: 'ZK-RLN証明によりスパマーを隔離しました',
    activePeers: 'アクティブなメッシュピア',
    noMessages: 'この暗号化空間にはまだメッセージがありません。',
  },
  vault: {
    title: '検証済みバイナリ保管庫＆成果物レジストリ',
    subtitle: 'エグレス料金無料のR2分散配信とマークルツリー検証',
    uploadBinary: '主権バイナリを発行',
    nanopublications: 'ナノパブリケーション',
    merkleRoot: 'マークルツリーのルート',
    sha256Checksum: 'SHA-256ハッシュ',
    byteSize: 'バイトサイズ',
    entropy: 'シャノン・エントロピー',
    verdict: '暗号学的判定',
    cleanVerdict: '検証済み：安全',
    maliciousVerdict: '不審なエントロピー検出',
    seederCount: 'アクティブなBitTorrentシーダー',
    downloadArtifact: 'Cloudflare R2経由でダウンロード',
    inspectFile: 'バイナリヘッダーを検査',
    dragDropPrompt: '検証および署名するバイナリをドラッグ＆ドロップ',
    torrentMeshReady: 'BitTorrent WebRTCスウォーム稼働中',
  },
  pulse: {
    title: 'Sovereign Pulse 時系列フィード',
    subtitle: 'ZK-RLNスパム耐性を備えた検閲耐性のあるマイクロブログ',
    composerPlaceholder: 'グローバルメッシュに向けて主権的なメッセージを発信...',
    publishPost: 'パルスを発信',
    chronologicalFeed: '時系列グローバルフィード',
    meritVotes: 'メリット賛成票',
    replies: '返信',
    boost: 'ブースト',
    share: '暗号リンクを共有',
    quotePost: '引用して投稿',
    bookmark: '保管庫に保存',
    award: 'メリットメダルを授与',
    viewThread: '会話全体を表示',
    trendingTopics: 'トレンドトピック＆ハッシュタグ',
  },
  edge: {
    title: '全世界Anycastエッジインフラストラクチャ',
    globalTopology: 'Cloudflare Global Edge（300以上の都市でAnycastルーティング）',
    edgeLocations: 'マルチリージョンPoP（WNAM, ENAM, WEUR, EEUR, APAC）',
    anycastRouting: 'BGP Anycastによる15ms未満の超低遅延ルーティング',
    latency: 'リアルタイム・グローバルRTT遅延',
    d1Replicas: 'Cloudflare D1マルチリージョン読み取りレプリカ（<5ms）',
    r2Storage: 'Cloudflare R2ゼロエグレス費用グローバルストレージ',
    durableObjects: 'WebSocketハイバネーション対応Durable Objects',
    cacheHitRatio: 'エッジL1/L2 CDNキャッシュヒット率',
    sub15msTarget: '全世界15ms未満レイテンシ保証',
    activeRegion: '接続中のエッジリージョン',
    failoverStatus: 'フェイルオーバー状態：Anycastルート稼働中',
    p2pMeshFallback: 'WebRTCダイレクトスウォーム待機完了',
  },
  security: {
    zeroTrust: 'ゼロトラスト・アーキテクチャ',
    dataSovereignty: 'ゼロ知識データ主権',
    gdprCompliant: '設計段階からのGDPR/CCPA完全準拠（サーバー側に平文個人情報ゼロ）',
    clientSideEncryption: 'クライアント側Ed25519およびAES-256-GCM暗号化',
    ed25519Identity: '主権型Ed25519身元鍵ペア',
    zkRlnProtection: 'ZK-RLNレート制限とスパマー身元スラッシング',
    cveMonitoring: 'リアルタイムCVE＆ゼロデイ脆弱性監視',
    auditStatus: '形式検証＆セキュリティ監査：合格',
    webAuthnKey: 'ハードウェアセキュリティキー (FIDO2/WebAuthn)',
    paperBackup: '主権ペーパーウォレットを印刷',
    shredIdentity: '暗号学的自己破壊 / 秘密鍵破棄',
  },
  crdt: {
    vectorClocks: '分散ベクトル時計',
    lwwResolution: 'Last-Write-Wins競合解消',
    merkleSync: 'マークルツリーによる状態調整',
    bufferedActions: 'オフライン蓄積アクション',
    syncNow: '今すぐメッシュと同期',
    allSynced: 'すべての分散レプリカが同期されました',
  },
  units: {
    byte: 'B',
    kilobyte: 'KB',
    megabyte: 'MB',
    gigabyte: 'GB',
    terabyte: 'TB',
    milliseconds: 'ms',
    seconds: '秒',
    minutes: '分',
    hours: '時間',
    days: '日',
    ago: '前',
    justNow: 'たった今',
  },
  uiMode: {
    simple: 'シンプル',
    sovereign: '主権モード',
    advancedTools: '高度なツール',
    switchMode: 'インターフェースモード切替',
  },
  onboardingNarrative: {
    step1Title: 'あなたの主権IDはあなたのもの',
    step1Subtitle: '最初の1秒から完全な自己主権を確立',
    step1Body: '中央サーバーがあなたのアカウントを管理することはありません。メールアドレス、電話番号、パスワードの外部保管は一切不要です。暗号鍵は端末内だけに安全に保管されます。',
    step2Title: 'あなたのコンテンツは完全に保護されます',
    step2Subtitle: 'エンドツーエンドのゼロ知識セキュリティ',
    step2Body: '投稿やメッセージは送信前にブラウザ上で直接暗号化されます。明示的に許可した受信者のみが復号鍵を保持します。',
    step3Title: 'ネットワークは全員の共有財産です',
    step3Subtitle: '分散型P2Pネットワークによる配信',
    step3Body: '各参加ノードがメッシュ上で知識のリレーと保持を担います。注意力を搾取する不透明なアルゴリズムや中央集権的検閲は存在しません。',
    step4Title: 'リカバリーキーを保存してください',
    step4Subtitle: '12単語のマスターシードフレーズ',
    step4Body: 'この12個のシード単語を書き留めて安全に保管してください。これがあなたの主権アイデンティティとすべての暗号資格情報の鍵となります。',
    step4Warning: 'この12単語のフレーズがアカウントを復元する唯一の手段です。Aetherisが鍵を預かることは決してありません。',
    step4SavedWords: 'シード単語を安全に保存しました',
    step4DownloadBackup: '暗号化バックアップをダウンロード',
    skip: 'スキップ',
    continue: '次へ',
    back: '戻る',
    finish: '主権ネットワークに参加',
    stepOf: 'ステップ {step} / 4',
  },
};

export const arDict: TranslationDictionary = {
  common: {
    appName: 'أثيريس أومني-سفير (Aetheris)',
    tagline: 'مصفوفة الاتصالات السيادية العالمية عديمة المعرفة (Zero-Knowledge)',
    loading: 'جاري تحميل المصفوفة المشفرة...',
    save: 'حفظ التغييرات',
    cancel: 'إلغاء',
    close: 'إغلاق',
    delete: 'حذف',
    edit: 'تعديل',
    copy: 'نسخ إلى الحافظة',
    copied: 'تم النسخ!',
    search: 'البحث في المصفوفة السيادية...',
    refresh: 'تحديث',
    status: 'الحالة',
    online: 'متصل',
    offline: 'غير متصل',
    syncing: 'جاري المزامنة',
    verified: 'تم التحقق تشفيرياً',
    error: 'خطأ',
    success: 'نجاح',
    warning: 'تحذير',
    anonymous: 'عقدة مجهولة',
    unknown: 'عقدة غير معروفة',
    all: 'الكل',
    filter: 'تصفية',
    details: 'التفاصيل',
    back: 'رجوع',
    next: 'التالي',
    confirm: 'تأكيد',
    submit: 'إرسال',
  },
  nav: {
    relays: 'المرحلات الحية',
    vault: 'خزينة البرمجيات',
    pulse: 'النبض السيادي',
    defense: 'الدفاع السيبراني',
    observatory: 'مرصد الشبكة',
    governance: 'حوكمة DAO',
    wallet: 'محفظة ورقية وWeb3',
    settings: 'الإعدادات',
    admin: 'إدارة العقد',
    theme: 'محرك السمات',
    language: 'اللغة / الاتجاه RTL',
    onboarding: 'دليل السيادة',
  },
  relays: {
    title: 'مرحلات الإشارات والصوت المشفرة طرفاً لطرف (E2EE)',
    subtitle: 'شبكة MLS TreeKEM المقاومة للحوسبة الكمومية عبر حافة Cloudflare Edge',
    channels: 'القنوات',
    directMessages: 'الرسائل المباشرة السيادية',
    voiceChannel: 'غرفة الصوت ثلاثي الأبعاد',
    joinVoice: 'الانضمام لشبكة الصوت',
    leaveVoice: 'قطع الصوت',
    muteMicrophone: 'كتم الميكروفون',
    unmuteMicrophone: 'تشغيل الميكروفون',
    screenShare: 'مشاركة الشاشة (120 إطار)',
    typeMessage: 'اكتب رسالة سيادية مشفرة...',
    sendMessage: 'إرسال الرسالة',
    encryptedE2EE: 'مشفر بـ AES-256-GCM / MLS',
    treekemEpoch: 'حقبة سقاطة TreeKEM',
    spammerQuarantined: 'تم عزل المرسل المخالف عبر إثبات ZK-RLN',
    activePeers: 'العقد النشطة في الشبكة',
    noMessages: 'لا توجد رسائل بعد في هذه المساحة المشفرة.',
  },
  vault: {
    title: 'خزينة البرمجيات المحققة وسجل الأصول',
    subtitle: 'توزيع فوري عبر R2 بدون رسوم خروج مع تحقق شجرة ميركل',
    uploadBinary: 'نشر ملف ثنائي سيادي',
    nanopublications: 'المنشورات المصغرة (Nanopublications)',
    merkleRoot: 'جذر شجرة ميركل',
    sha256Checksum: 'بصمة SHA-256',
    byteSize: 'الحجم بالبايت',
    entropy: 'إنتروبيا شانون',
    verdict: 'الحكم التشفيري',
    cleanVerdict: 'تم التحقق: نظيف وآمن',
    maliciousVerdict: 'إنتروبيا مشبوهة',
    seederCount: 'ناشرو BitTorrent النشطون',
    downloadArtifact: 'تحميل عبر Cloudflare R2',
    inspectFile: 'فحص ترويسة الملف',
    dragDropPrompt: 'اسحب وأفلت الملف للتحقق والتوقيع التشفيري',
    torrentMeshReady: 'سرب BitTorrent WebRTC نشط',
  },
  pulse: {
    title: 'البث الزمني Sovereign Pulse',
    subtitle: 'تدوين مصغر زمني غير خاضع للرقابة محمي بنظام ZK-RLN ضد البريد المزعج',
    composerPlaceholder: 'انشر أفكارك السيادية إلى الشبكة العالمية...',
    publishPost: 'نشر النبض',
    chronologicalFeed: 'الخلاصة الزمنية العالمية',
    meritVotes: 'أصوات الاستحقاق',
    replies: 'الردود',
    boost: 'تعزيز المنشور',
    share: 'مشاركة الرابط المشفر',
    quotePost: 'اقتباس المنشور',
    bookmark: 'حفظ في الخزينة',
    award: 'منح وسام الاستحقاق',
    viewThread: 'عرض المحادثة كاملة',
    trendingTopics: 'الموضوعات والوسوم الشائعة',
  },
  edge: {
    title: 'البنية التحتية العالمية Anycast Edge',
    globalTopology: 'حافة Cloudflare العالمية (توجيه Anycast في أكثر من 300 مدينة)',
    edgeLocations: 'مواقع متعددة المناطق (WNAM, ENAM, WEUR, EEUR, APAC)',
    anycastRouting: 'توجيه Anycast BGP بزمن استجابة أقل من 15 مللي ثانية',
    latency: 'زمن انتقال الذهاب والعودة (RTT) المباشر',
    d1Replicas: 'نسخ قراءة Cloudflare D1 متعددة المناطق (<5 مللي ثانية)',
    r2Storage: 'تخزين Cloudflare R2 بدون رسوم نقل بيانات',
    durableObjects: 'Durable Objects مع إسبات WebSocket الموفر للطاقة',
    cacheHitRatio: 'نسبة إصابة ذاكرة التخزين المؤقت L1/L2',
    sub15msTarget: 'ضمان زمن استجابة عالمي أقل من 15 مللي ثانية',
    activeRegion: 'المنطقة المتصلة حالياً',
    failoverStatus: 'حالة التحويل التلقائي: مسار Anycast نشط',
    p2pMeshFallback: 'مسار الطوارئ المباشر WebRTC Swarm جاهز',
  },
  security: {
    zeroTrust: 'بنية الثقة المعدومة (Zero-Trust)',
    dataSovereignty: 'سيادة البيانات بالمعرفة الصفرية (Zero-Knowledge)',
    gdprCompliant: 'متوافق مع GDPR / CCPA افتراضياً (بدون بيانات شخصية على الخادم)',
    clientSideEncryption: 'تشفير كامل على جهاز المستخدم Ed25519 & AES-256-GCM',
    ed25519Identity: 'زوج مفاتيح الهوية السيادية Ed25519',
    zkRlnProtection: 'تحديد المعدل وعقوبة إسقاط الهوية عبر ZK-RLN',
    cveMonitoring: 'مراقبة الثغرات الأمنية والهجمات الصفرية (Zero-Day) في الوقت الفعلي',
    auditStatus: 'التحقق الرياضي والتدقيق الأمني: تم بنجاح',
    webAuthnKey: 'مفتاح أمان عتادي (FIDO2/WebAuthn)',
    paperBackup: 'طباعة المحفظة الورقية السيادية',
    shredIdentity: 'التدمير الذاتي التشفيري / إتلاف المفتاح',
  },
  crdt: {
    vectorClocks: 'ساعات المتجهات الموزعة (Vector Clocks)',
    lwwResolution: 'حل النزاعات بأحدث كتابة (Last-Write-Wins)',
    merkleSync: 'مطابقة الحالة عبر شجرة ميركل',
    bufferedActions: 'الإجراءات المؤقتة المخزنة محلياً',
    syncNow: 'مزامنة الشبكة الآن',
    allSynced: 'جميع النسخ الموزعة متزامنة بالكامل',
  },
  units: {
    byte: 'بايت',
    kilobyte: 'ك.بايت',
    megabyte: 'م.بايت',
    gigabyte: 'ج.بايت',
    terabyte: 'ت.بايت',
    milliseconds: 'مللي ثانية',
    seconds: 'ثوان',
    minutes: 'دقائق',
    hours: 'ساعات',
    days: 'أيام',
    ago: 'منذ',
    justNow: 'الآن',
  },
  uiMode: {
    simple: 'بسيط',
    sovereign: 'سيادي',
    advancedTools: 'أدوات متقدمة',
    switchMode: 'تبديل وضع الواجهة',
  },
  onboardingNarrative: {
    step1Title: 'هويتك ملك لك وحدك',
    step1Subtitle: 'سيادة ذاتية كاملة من اللحظة الأولى',
    step1Body: 'لا يوجد خادم مركزي يمتلك حسابك. لا بريد إلكتروني، لا رقم هاتف، ولا كلمات مرور مخزنة في قواعد بيانات خارجية. مفاتيحك المشفرة موجودة حصرياً على جهازك.',
    step2Title: 'محتواك محمي بالكامل',
    step2Subtitle: 'أمان تام بدون معرفة مسبقة من البداية للنهاية',
    step2Body: 'كل ما تكتبه أو تشاركه يتم تشفيره مباشرة في متصفحك قبل مغادرة جهازك. فقط المستلمون المصرح لهم يملكون مفاتيح فك التشفير.',
    step3Title: 'الشبكة ملك للجميع',
    step3Subtitle: 'توزيع لا مركزي من نظير لنظير',
    step3Body: 'يساعد كل مشارك في نقل المعرفة وحفظها عبر الشبكة المتداخلة. بدون خوارزميات لاستغلال الانتباه وبدون رقابة مركزية.',
    step4Title: 'احفظ مفتاح الاسترداد الخاص بك',
    step4Subtitle: 'عبارة الاسترداد الرئيسية المكونة من 12 كلمة',
    step4Body: 'دوّن هذه الكلمات السرية الـ 12. إنها تمثل هويتك السيادية الكاملة وكافة بيانات اعتمادك المشفرة.',
    step4Warning: 'هذه العبارة المكونة من 12 كلمة هي الطريقة الوحيدة لاستعادة حسابك. Aetheris لا يخزن مفاتيحك أبداً.',
    step4SavedWords: 'لقد حفظت كلمات الاسترداد بأمان',
    step4DownloadBackup: 'تحميل نسخة احتياطية مشفرة',
    skip: 'تخطي',
    continue: 'متابعة',
    back: 'رجوع',
    finish: 'الدخول إلى الشبكة السيادية',
    stepOf: 'الخطوة {step} من 4',
  },
};

export const DICTIONARIES: Record<SupportedLocale, TranslationDictionary> = {
  en: enDict,
  fr: frDict,
  de: deDict,
  es: esDict,
  ro: roDict,
  ja: jaDict,
  ar: arDict,
};

// ─── LOCAL STORAGE KEYS & EVENT DISPATCHER ───────────────────────────────────

const STORAGE_KEY = 'aetheris_locale_v1';

export type LanguageChangeListener = (locale: SupportedLocale, meta: LanguageMeta) => void;

// ─── i18n ENGINE CLASS IMPLEMENTATION ────────────────────────────────────────

export class I18nEngine {
  private currentLocale: SupportedLocale = 'en';
  private listeners: LanguageChangeListener[] = [];
  private numberFormatters: Map<string, Intl.NumberFormat> = new Map();
  private dateTimeFormatters: Map<string, Intl.DateTimeFormat> = new Map();
  private relativeTimeFormatters: Map<string, Intl.RelativeTimeFormat> = new Map();

  constructor() {
    this.initLocale();
  }

  /**
   * Initializes the engine detecting from storage, query param, or browser language.
   */
  private initLocale(): void {
    let initialLocale: SupportedLocale = 'en';

    // 1. Check URL search param (?lang=xx)
    if (typeof window !== 'undefined' && window.location?.search) {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlLang = params.get('lang') || params.get('locale');
        if (urlLang && this.isValidLocale(urlLang)) {
          initialLocale = this.normalizeLocale(urlLang);
        }
      } catch (_) {}
    }

    // 2. Check local persistence
    if (initialLocale === 'en') {
      const stored = this.getStoredLocale();
      if (stored && this.isValidLocale(stored)) {
        initialLocale = stored;
      } else {
        // 3. Detect from navigator.languages
        initialLocale = this.detectBrowserLocale();
      }
    }

    this.setLanguage(initialLocale, false);
  }

  /**
   * Validates whether a string matches any supported locale code.
   */
  public isValidLocale(code: string): boolean {
    if (!code) return false;
    const clean = code.toLowerCase().split(/[-_]/)[0];
    return Object.keys(SUPPORTED_LANGUAGES).includes(clean);
  }

  /**
   * Normalizes locale string to one of SupportedLocale.
   */
  public normalizeLocale(code: string): SupportedLocale {
    if (!code) return 'en';
    const clean = code.toLowerCase().split(/[-_]/)[0] as SupportedLocale;
    return SUPPORTED_LANGUAGES[clean] ? clean : 'en';
  }

  /**
   * Detects the best matching locale from navigator.languages or navigator.language.
   */
  public detectBrowserLocale(): SupportedLocale {
    if (typeof navigator === 'undefined') return 'en';

    const preferredLanguages = navigator.languages || [navigator.language || 'en'];

    for (const raw of preferredLanguages) {
      if (!raw) continue;
      const normalized = this.normalizeLocale(raw);
      if (this.isValidLocale(raw)) {
        return normalized;
      }
    }

    return 'en';
  }

  /**
   * Reads stored locale from localStorage with fail-safe error handling.
   */
  private getStoredLocale(): SupportedLocale | null {
    try {
      if (typeof localStorage !== 'undefined') {
        const val = localStorage.getItem(STORAGE_KEY);
        if (val && this.isValidLocale(val)) {
          return this.normalizeLocale(val);
        }
      }
    } catch (_) {}
    return null;
  }

  /**
   * Persists locale to localStorage.
   */
  private persistLocale(locale: SupportedLocale): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, locale);
      }
    } catch (_) {}
  }

  /**
   * Get the active locale code.
   */
  public getLanguage(): SupportedLocale {
    return this.currentLocale;
  }

  /**
   * Get metadata for the active locale.
   */
  public getCurrentLanguageMeta(): LanguageMeta {
    return SUPPORTED_LANGUAGES[this.currentLocale];
  }

  /**
   * Get metadata for all supported languages.
   */
  public getSupportedLanguages(): LanguageMeta[] {
    return Object.values(SUPPORTED_LANGUAGES);
  }

  /**
   * Switches language dynamically without page reload.
   * Updates `html` `lang` and `dir` attributes, flushes formatters, and notifies subscribers.
   */
  public setLanguage(locale: string, persist = true): boolean {
    const nextLocale = this.normalizeLocale(locale);
    this.currentLocale = nextLocale;

    if (persist) {
      this.persistLocale(nextLocale);
    }

    // Flush cached formatters for new locale
    this.numberFormatters.clear();
    this.dateTimeFormatters.clear();
    this.relativeTimeFormatters.clear();

    const meta = SUPPORTED_LANGUAGES[nextLocale];

    // Update DOM documentElement attributes if in browser environment
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = nextLocale;
      document.documentElement.dir = meta.direction;

      if (meta.direction === 'rtl') {
        document.documentElement.classList.add('rtl-layout');
      } else {
        document.documentElement.classList.remove('rtl-layout');
      }
    }

    // Notify registered listeners
    this.notifyListeners(nextLocale, meta);
    return true;
  }

  /**
   * Register a subscriber callback for language changes.
   */
  public onLanguageChange(callback: LanguageChangeListener): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notifyListeners(locale: SupportedLocale, meta: LanguageMeta): void {
    for (const listener of this.listeners) {
      try {
        listener(locale, meta);
      } catch (err) {
        console.error('[i18n Listener Error]', err);
      }
    }
  }

  // ─── TRANSLATION METHODS ───────────────────────────────────────────────────

  /**
   * Translates a dot-notation key (e.g. 'common.appName', 'vault.merkleRoot').
   * Supports parametric interpolation: `t('common.hello', { name: 'Alice' })` -> "Hello, Alice!"
   */
  public t(key: string, params?: Record<string, string | number>, fallback?: string): string {
    if (!key) return fallback || '';

    const dict = DICTIONARIES[this.currentLocale] || DICTIONARIES.en;
    const enDictionary = DICTIONARIES.en;

    const resolved = this.resolveNestedKey(dict, key) ?? this.resolveNestedKey(enDictionary, key) ?? fallback ?? key;

    if (typeof resolved !== 'string') {
      return fallback || key;
    }

    if (!params || Object.keys(params).length === 0) {
      return resolved;
    }

    // Interpolate {paramName}
    return resolved.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, paramName) => {
      if (params[paramName] !== undefined) {
        return String(params[paramName]);
      }
      return match;
    });
  }

  /**
   * Helper to resolve nested object keys by dot notation.
   */
  private resolveNestedKey(obj: any, path: string): any {
    if (!obj || !path) return undefined;
    const parts = path.split('.');
    let curr = obj;
    for (const part of parts) {
      if (curr && typeof curr === 'object' && part in curr) {
        curr = curr[part];
      } else {
        return undefined;
      }
    }
    return curr;
  }

  /**
   * Plural-aware translation helper.
   */
  public tPlural(key: string, count: number, params?: Record<string, string | number>): string {
    const fullParams = { count, ...(params || {}) };
    if (count === 0) {
      const zeroKey = `${key}_zero`;
      const zeroVal = this.t(zeroKey, fullParams, '');
      if (zeroVal) return zeroVal;
    } else if (count === 1) {
      const oneKey = `${key}_one`;
      const oneVal = this.t(oneKey, fullParams, '');
      if (oneVal) return oneVal;
    }
    return this.t(key, fullParams);
  }

  // ─── REGIONAL INTL FORMATTING METHODS ──────────────────────────────────────

  /**
   * Format numbers according to active locale.
   */
  public formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    const cacheKey = JSON.stringify(options || {});
    let formatter = this.numberFormatters.get(cacheKey);
    if (!formatter) {
      try {
        formatter = new Intl.NumberFormat(this.currentLocale, options);
        this.numberFormatters.set(cacheKey, formatter);
      } catch (_) {
        return String(value);
      }
    }
    return formatter.format(value);
  }

  /**
   * Format currency values.
   */
  public formatCurrency(amount: number, currency = 'USD'): string {
    return this.formatNumber(amount, {
      style: 'currency',
      currency,
    });
  }

  /**
   * Format percentage values (e.g. 0.985 -> 98.5%).
   */
  public formatPercent(value: number, maximumFractionDigits = 1): string {
    return this.formatNumber(value, {
      style: 'percent',
      maximumFractionDigits,
    });
  }

  /**
   * Format byte sizes with localized units.
   */
  public formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return `0 ${this.t('units.byte')}`;
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = [
      this.t('units.byte'),
      this.t('units.kilobyte'),
      this.t('units.megabyte'),
      this.t('units.gigabyte'),
      this.t('units.terabyte'),
    ];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const index = Math.min(i, sizes.length - 1);
    const formattedNum = this.formatNumber(parseFloat((bytes / Math.pow(k, index)).toFixed(dm)));
    return `${formattedNum} ${sizes[index]}`;
  }

  /**
   * Format date according to active locale.
   */
  public formatDate(date: Date | number, options?: Intl.DateTimeFormatOptions): string {
    const d = typeof date === 'number' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';

    const defaultOptions: Intl.DateTimeFormatOptions = options || {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };

    const cacheKey = JSON.stringify(defaultOptions);
    let formatter = this.dateTimeFormatters.get(cacheKey);
    if (!formatter) {
      try {
        formatter = new Intl.DateTimeFormat(this.currentLocale, defaultOptions);
        this.dateTimeFormatters.set(cacheKey, formatter);
      } catch (_) {
        return d.toLocaleDateString();
      }
    }
    return formatter.format(d);
  }

  /**
   * Format time according to active locale.
   */
  public formatTime(date: Date | number, options?: Intl.DateTimeFormatOptions): string {
    const d = typeof date === 'number' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';

    const defaultOptions: Intl.DateTimeFormatOptions = options || {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    };

    return this.formatDate(d, defaultOptions);
  }

  /**
   * Format combined Date and Time.
   */
  public formatDateTime(date: Date | number): string {
    return this.formatDate(date, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Format relative time (e.g. "3 minutes ago", "in 2 hours", "just now").
   */
  public formatRelativeTime(date: Date | number, baseDate: Date | number = Date.now()): string {
    const targetMs = typeof date === 'number' ? date : date.getTime();
    const baseMs = typeof baseDate === 'number' ? baseDate : baseDate.getTime();
    const diffSec = Math.round((targetMs - baseMs) / 1000);

    if (Math.abs(diffSec) < 10) {
      return this.t('units.justNow');
    }

    try {
      let formatter = this.relativeTimeFormatters.get(this.currentLocale);
      if (!formatter) {
        formatter = new Intl.RelativeTimeFormat(this.currentLocale, { numeric: 'auto' });
        this.relativeTimeFormatters.set(this.currentLocale, formatter);
      }

      const intervals: Array<{ unit: Intl.RelativeTimeFormatUnit; seconds: number }> = [
        { unit: 'year', seconds: 31536000 },
        { unit: 'month', seconds: 2592000 },
        { unit: 'week', seconds: 604800 },
        { unit: 'day', seconds: 86400 },
        { unit: 'hour', seconds: 3600 },
        { unit: 'minute', seconds: 60 },
        { unit: 'second', seconds: 1 },
      ];

      for (const { unit, seconds } of intervals) {
        const count = Math.round(diffSec / seconds);
        if (Math.abs(diffSec) >= seconds || unit === 'second') {
          return formatter.format(count, unit);
        }
      }
    } catch (_) {
      // Fallback
      const absSec = Math.abs(diffSec);
      if (absSec < 60) return `${absSec} ${this.t('units.seconds')} ${this.t('units.ago')}`;
      if (absSec < 3600) return `${Math.floor(absSec / 60)} ${this.t('units.minutes')} ${this.t('units.ago')}`;
      if (absSec < 86400) return `${Math.floor(absSec / 3600)} ${this.t('units.hours')} ${this.t('units.ago')}`;
      return `${Math.floor(absSec / 86400)} ${this.t('units.days')} ${this.t('units.ago')}`;
    }

    return this.t('units.justNow');
  }

  // ─── UI COMPONENTS & SELECTOR HELPERS ──────────────────────────────────────

  /**
   * Generates HTML markup for the Sovereign Language Picker Dropdown / Selector.
   */
  public renderLanguagePicker(variant: 'dropdown' | 'inline' | 'compact' = 'dropdown'): string {
    const current = this.getCurrentLanguageMeta();
    const allLanguages = this.getSupportedLanguages();

    if (variant === 'compact') {
      return `
        <div class="relative inline-block text-left" id="aetheris-lang-picker-compact">
          <button
            type="button"
            id="btn-toggle-lang-menu"
            class="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-surface-raised hover:bg-surface-overlay border border-white/10 text-xs font-mono text-slate-200 transition-all cursor-pointer shadow-sm"
            title="Switch Language (${current.name})"
          >
            <span>${current.flag}</span>
            <span class="font-bold uppercase">${current.code}</span>
            <span class="text-[10px] text-slate-400">▼</span>
          </button>
        </div>
      `;
    }

    if (variant === 'inline') {
      return `
        <div class="flex flex-wrap gap-2 p-2 rounded-2xl bg-surface-raised border border-white/10" id="aetheris-lang-picker-inline">
          ${allLanguages
            .map(
              (lang) => `
            <button
              type="button"
              data-lang-code="${lang.code}"
              class="lang-select-btn flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                lang.code === this.currentLocale
                  ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30 border border-indigo-400'
                  : 'bg-surface-overlay/60 text-slate-300 hover:bg-surface-overlay hover:text-white border border-white/5'
              }"
            >
              <span>${lang.flag}</span>
              <span>${lang.nativeName}</span>
              ${lang.direction === 'rtl' ? '<span class="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">RTL</span>' : ''}
            </button>
          `
            )
            .join('')}
        </div>
      `;
    }

    // Default Dropdown Modal/Card
    return `
      <div class="p-4 rounded-2xl bg-surface-base border border-white/10 space-y-3 font-mono text-xs select-none shadow-xl max-w-sm">
        <div class="flex items-center justify-between pb-2 border-subtle-b">
          <div class="flex items-center space-x-2">
            <span class="text-base">🌐</span>
            <h4 class="font-bold text-white">${this.t('nav.language')}</h4>
          </div>
          <div class="flex items-center space-x-2">
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-bold">
              ${current.direction.toUpperCase()}
            </span>
            <button type="button" id="btn-close-lang" onclick="if(window.__aetheris_close_lang) window.__aetheris_close_lang();" class="text-slate-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-white/10 cursor-pointer" title="Close">✕</button>
          </div>
        </div>
        <p class="text-[11px] text-slate-400">
          Seamless zero-reload dynamic localization. Arabic natively activates bidirectional RTL layout.
        </p>
        <div class="grid grid-cols-1 gap-1.5">
          ${allLanguages
            .map(
              (lang) => `
            <button
              type="button"
              data-lang-code="${lang.code}"
              class="lang-select-btn w-full flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer ${
                lang.code === this.currentLocale
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/50 font-bold shadow-sm'
                  : 'bg-surface-raised hover:bg-surface-overlay text-slate-300 hover:text-white border border-white/5'
              }"
            >
              <div class="flex items-center space-x-2.5">
                <span class="text-base">${lang.flag}</span>
                <div class="text-left ${lang.direction === 'rtl' ? 'text-right' : ''}">
                  <div class="font-bold text-white">${lang.nativeName}</div>
                  <div class="text-[10px] text-slate-400">${lang.name} · ${lang.region}</div>
                </div>
              </div>
              <div class="flex items-center space-x-1.5">
                <span class="text-[9px] px-1.5 py-0.5 rounded font-mono ${lang.tier === 'official' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 border border-white/10'}">${lang.tier === 'official' ? '100%' : 'Beta'}</span>
                ${lang.direction === 'rtl' ? '<span class="text-[9px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/30">RTL</span>' : ''}
                ${lang.code === this.currentLocale ? '<span class="text-emerald-400 font-bold">✓</span>' : ''}
              </div>
            </button>
          `
            )
            .join('')}
        </div>
      </div>
    `;
  }
}

// ─── SINGLETON EXPORT & CONVENIENCE ALIASES ──────────────────────────────────

export const i18n = new I18nEngine();
serviceRegistry.registerInstance(SERVICES.I18nEngine, i18n);
export const t = (key: string, params?: Record<string, string | number>, fallback?: string) =>
  i18n.t(key, params, fallback);
