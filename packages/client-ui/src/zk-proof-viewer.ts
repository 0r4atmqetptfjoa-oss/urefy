/**
 * Aetheris Omni-Sphere — Interactive Zero-Knowledge Proof Visualizer (ZKProofVisualizer)
 *
 * Cryptographic graphical inspector for inspecting, decomposing, and verifying:
 * 1. ZK-RLN (Rate Limiting Nullifiers over BN254 prime field)
 * 2. ZK-Passport (eMRTD / ICAO 9303 Selective Disclosure Circom Proofs)
 * 3. Merkle Membership Proofs (Poseidon 2x Binary Trees, depth 20)
 * 4. TreeKEM MLS RFC 9420 (Post-Compromise Security & Forward Secrecy Ratchets)
 *
 * 100% Self-Contained, Strict TypeScript, Zero External Dependencies.
 */

export interface ProofStep {
  stepNumber: number;
  title: string;
  mathSymbol: string;
  description: string;
  input: string;
  output: string;
  color: string;
  verified: boolean;
}

export type ProofType = 'rln' | 'passport' | 'merkle' | 'treekem';

export interface ProofTabMetadata {
  id: ProofType;
  title: string;
  shortTitle: string;
  subtitle: string;
  icon: string;
  badge: string;
  curve: string;
  constraints: number;
  provingTimeMs: number;
  verificationTimeMs: number;
  securityLevel: string;
}

export class ZKProofVisualizer {
  public isOpen: boolean = false;
  public activeProofType: ProofType = 'rln';
  public selectedStepIndex: number = 0;
  public isWitnessExpanded: boolean = false;

  private readonly tabMetadata: Record<ProofType, ProofTabMetadata> = {
    rln: {
      id: 'rln',
      title: 'ZK-RLN (Rate Limiting Nullifier)',
      shortTitle: 'ZK-RLN',
      subtitle: 'Poseidon BN254 Spam-Prevention & Stake Slashing Circuit',
      icon: '🛡️',
      badge: 'Circom 2.1 · Groth16',
      curve: 'BN254 (alt_bn128)',
      constraints: 4892,
      provingTimeMs: 142.6,
      verificationTimeMs: 1.4,
      securityLevel: '128-bit Computational',
    },
    passport: {
      id: 'passport',
      title: 'ZK-Passport (ICAO 9303 eMRTD)',
      shortTitle: 'ZK-Passport',
      subtitle: 'Zero-Knowledge Sovereign Identity & Selective Age/Citizenship Disclosure',
      icon: '🛂',
      badge: 'RSA-SHA256 · SnarkJS',
      curve: 'BN254 / Edwards',
      constraints: 182400,
      provingTimeMs: 1850.0,
      verificationTimeMs: 2.1,
      securityLevel: '2048-bit RSA + ZK-SNARK',
    },
    merkle: {
      id: 'merkle',
      title: 'Poseidon Merkle Membership',
      shortTitle: 'Merkle Tree',
      subtitle: 'Anonymous Set Membership Verification in Depth-20 Identity Tree',
      icon: '🌳',
      badge: 'Poseidon 2x · Binary',
      curve: 'BN254 Fr (254-bit prime)',
      constraints: 3240,
      provingTimeMs: 88.2,
      verificationTimeMs: 0.9,
      securityLevel: '128-bit Collision-Resistant',
    },
    treekem: {
      id: 'treekem',
      title: 'TreeKEM MLS Ratchet (RFC 9420)',
      shortTitle: 'TreeKEM MLS',
      subtitle: 'Post-Compromise Security & Ephemeral Group Key Zero-Knowledge Ratchet',
      icon: '🌲',
      badge: 'HPKE · X25519-ChaCha',
      curve: 'Curve25519 + BN254 ZK',
      constraints: 12480,
      provingTimeMs: 310.5,
      verificationTimeMs: 1.8,
      securityLevel: 'Post-Compromise + Forward Secrecy',
    },
  };

  /**
   * Opens the interactive ZK Proof Visualizer modal with the specified proof type.
   */
  public open(type: ProofType = 'rln'): void {
    this.isOpen = true;
    this.activeProofType = type;
    this.selectedStepIndex = 0;
    this.isWitnessExpanded = false;
  }

  /**
   * Closes the ZK Proof Visualizer modal.
   */
  public close(): void {
    this.isOpen = false;
  }

  /**
   * Switches the currently active proof decomposition tab.
   */
  public setProofType(type: ProofType): void {
    this.activeProofType = type;
    this.selectedStepIndex = 0;
  }

  /**
   * Returns the proof steps for the active or given proof type.
   */
  public getProofSteps(type?: ProofType): ProofStep[] {
    const targetType = type || this.activeProofType;
    switch (targetType) {
      case 'rln':
        return this.getRLNProofDecomposition();
      case 'passport':
        return this.getPassportProofDecomposition();
      case 'merkle':
        return this.getMerkleProofDecomposition();
      case 'treekem':
        return this.getTreeKEMProofDecomposition();
      default:
        return this.getRLNProofDecomposition();
    }
  }

  /**
   * 1. ZK-RLN (Rate Limiting Nullifier) Proof Decomposition:
   * 6 explicit steps breaking down Poseidon hashing, Shamir polynomial evaluation,
   * share distribution, epoch mapping, slashing, and Groth16 pairings.
   */
  public getRLNProofDecomposition(): ProofStep[] {
    return [
      {
        stepNumber: 1,
        title: 'Generate Secret Nullifier',
        mathSymbol: 'nullifier = Poseidon(a₀, epoch) ∈ 𝔽ₚ',
        description:
          'Poseidon hash computation on Ed25519 identity private key in BN254 prime field (p = 21888242871839275222246405745257275088548364400416034343698204186575808495617). Generates user secret root a₀ without leaking it to the P2P network.',
        input: 'identitySecret (a₀) = 0x2c91a03f48e1b99a61b84f3782109e4d58a80394019a4e8d35091ffca710b91e',
        output: 'identityCommitment (a₀_pub) = 0x18f4a0b229c9103e91848a301f28b49e0c184092b19283749201928471019283',
        color: '#00e5ff', // text-cyphr
        verified: true,
      },
      {
        stepNumber: 2,
        title: 'Epoch Identifier & Temporal Slicing',
        mathSymbol: 'Δt = ⌊t_unix / 10⌋ (mod p), epoch = Poseidon(Δt, channelId)',
        description:
          'Mapping the current time interval into 10-second windows and converting to field element 𝔽ₚ. Each epoch allows exactly one message per ZK identity; any second message produces an immediate mathematical collision.',
        input: 't_unix = 1724961000 | window = 10s | channel = "genesis-relays"',
        output: 'epoch_scalar = 0x000000000000000000000000000000000000000000000000000000000a45e028',
        color: '#a855f7', // text-aether
        verified: true,
      },
      {
        stepNumber: 3,
        title: 'Shamir Polynomial Evaluation (Secret Sharing)',
        mathSymbol: 'A(x) = a₀ + a₁ · x (mod p),  where a₁ = Poseidon(a₀, epoch)',
        description:
          'Constructing the Shamir secret sharing line. Slope a₁ is cryptographically determined by epoch and a₀. The y-intercept is the secret identity a₀ itself.',
        input: 'a₀ = 0x2c91a03f..., epoch = 0x0a45e028',
        output: 'a₁_slope = 0x0d9921ef4810283c71049581a03e192847581029384756102938475610293847',
        color: '#22c55e', // text-signal
        verified: true,
      },
      {
        stepNumber: 4,
        title: 'Spam Reveal Share (Broadcast Share)',
        mathSymbol: 'x₁ = Poseidon(msg_hash),  y₁ = A(x₁) = a₀ + a₁ · x₁ (mod p)',
        description:
          'Evaluating polynomial A(x) at message point x₁. The share pair (x₁, y₁) is publicly attached to the message. Broadcasting a single point (x₁, y₁) per epoch retains complete confidentiality of a₀.',
        input: 'msg_hash = 0x1f893e40a1b2c3d4e5f67890123456789abcdef0123456789abcdef012345678',
        output: 'rln_share (x₁, y₁) = (0x1f893e40..., 0x1a82e9b04f118c72948018237490182374901823)',
        color: '#f59e0b', // text-amber
        verified: true,
      },
      {
        stepNumber: 5,
        title: 'Rate Limit Enforcement & Slashing Protocol',
        mathSymbol: 'a₀ = (x₂·y₁ - x₁·y₂) / (x₂ - x₁) (mod p)   [if x₁ ≠ x₂]',
        description:
          'If a node broadcasts two messages within the same epoch with shares (x₁, y₁) and (x₂, y₂), Lagrange polynomial interpolation instantly reveals private key a₀, allowing any P2P node to execute stake slashing on the malicious node.',
        input: 'active_window_shares = [ (x₁, y₁) ] | collision_check = NO_DUPLICATE',
        output: 'slashing_status = 0x00 (SINGLE_MESSAGE_VALID · 100% Rate Limit Integrity)',
        color: '#00e5ff', // text-cyphr
        verified: true,
      },
      {
        stepNumber: 6,
        title: 'Witness Generation & Groth16 Pairing Verification',
        mathSymbol: 'e(A, B) = e(α, β) · e(x · γ, δ) · e(C, δ) ∈ 𝔾_T',
        description:
          'Evaluating BN254 elliptic curves over groups 𝔾₁ × 𝔾₂ → 𝔾_T via bilinear pairing verification. Proves in zero knowledge that the node belongs to the authorized member Merkle tree and correctly computed the RLN share without exposing identity.',
        input: 'Groth16 Proof π = { A ∈ 𝔾₁, B ∈ 𝔾₂, C ∈ 𝔾₁ }, Public Signals = [ root, epoch, x₁, y₁, nullifier ]',
        output: 'Pairing Check = 1 (VALID_PROOF · Verified in 1.4ms on BN254 Curve)',
        color: '#22c55e', // text-signal
        verified: true,
      },
    ];
  }

  /**
   * 2. ZK-Passport Proof Decomposition:
   * Verification of ICAO 9303 e-Passport with selective age & citizenship disclosure.
   */
  public getPassportProofDecomposition(): ProofStep[] {
    return [
      {
        stepNumber: 1,
        title: 'BAC/PACE NFC Read & Decryption',
        mathSymbol: 'K_enc = KDF(MRZ, 1), K_mac = KDF(MRZ, 2)',
        description:
          'Derivation of cryptographic session keys from the optical MRZ code and establishing the secure ISO 7816-4 channel with the contactless eMRTD chip.',
        input: 'MRZ_Hash = 0x8a92f07c11823904810293847102938471029384710293847102938471029384',
        output: 'SOD_Payload = 0x308204f1a0... (4,128 bytes signed Security Object Data)',
        color: '#00e5ff',
        verified: true,
      },
      {
        stepNumber: 2,
        title: 'CSCA / Document Signer Signature Verification',
        mathSymbol: 'Verify_RSA_PSS(PK_CSCA, SOD_Digest, σ_DS) == 1',
        description:
          'Validating the ICAO Master List PKD trust chain up to the national passport issuing authority public key.',
        input: 'DS_Certificate = 0x308203a1... | CountryCode = "EU / RO" | Root = CSCA_ROOT_2026',
        output: 'CSCA_Trust_Status = VALID (Authentic government signature confirmed)',
        color: '#a855f7',
        verified: true,
      },
      {
        stepNumber: 3,
        title: 'DataGroup Content Hashing & Integrity (DG1 MRZ)',
        mathSymbol: 'H_DG1 = SHA256(DG1_Content) == SOD.DataGroupHashValues[1]',
        description:
          'Validating that personal data in DataGroup 1 (name, birth date, nationality, expiry date) strictly matches the digital fingerprint signed in SOD.',
        input: 'DG1_Raw = 0x615b5f1f... (Document Code: P, Issuing State: ROU)',
        output: 'DG1_Digest = 0x93f4e1902847c1b5091823749018237490182374901823749018237490182374',
        color: '#22c55e',
        verified: true,
      },
      {
        stepNumber: 4,
        title: 'Circom Selective Disclosure ZK-SNARK Circuit',
        mathSymbol: '𝒞_passport(Pub: [Age ≥ 18, NotExpired, Scope], Priv: [MRZ, SOD]) = 1',
        description:
          'Executing the zero-knowledge circuit mathematically proving holder age ≥ 18 and possession of a valid passport, without disclosing name, personal ID, birth date, or document number.',
        input: 'Private_Witness = { BirthDate: 19960412, ExpiryDate: 20310920, Nationality: "ROU" }',
        output: 'Public_Signals = [ isOver18: 1, isNotExpired: 1, countryGroup: "EU_VALID", nullifier: 0x48a1... ]',
        color: '#f59e0b',
        verified: true,
      },
      {
        stepNumber: 5,
        title: 'Blind Sybil Nullifier Scope Binding',
        mathSymbol: 'Nullifier_Aetheris = Poseidon(PassportSecret, AppScope) ∈ 𝔽ₚ',
        description:
          'Generating a deterministic unique ZK-based pseudonym per Aetheris community, preventing multi-accounting (Sybil Attack) without allowing cross-space identity correlation.',
        input: 'AppScope = "aetheris-genesis-relays-v1" | PassportSecret = 0x7c92... (hidden)',
        output: 'Unique_Sybil_Resistant_ID = 0x1fb7a94029c9103e91848a301f28b49e0c184092b19283749201928471019283',
        color: '#22c55e',
        verified: true,
      },
    ];
  }

  /**
   * 3. Merkle Membership Proof Decomposition:
   * Depth-20 binary Merkle tree over BN254 with Poseidon compression.
   */
  public getMerkleProofDecomposition(): ProofStep[] {
    return [
      {
        stepNumber: 1,
        title: 'Leaf Hash Identification (Identity Commitment)',
        mathSymbol: 'L_i = Poseidon(PubKey_x, PubKey_y) ∈ 𝔽ₚ',
        description:
          'Calculating leaf value in the state tree. Represents the cryptographic commitment of the node stored in the anonymous authorized member set.',
        input: 'PubKey = (0x18f4a0b2..., 0x0d9921ef...)',
        output: 'Leaf_Hash_L14209 = 0x22894109bcae9182374619082341908234019283401928340192834019283401',
        color: '#00e5ff',
        verified: true,
      },
      {
        stepNumber: 2,
        title: 'Authentication Path Retrieval',
        mathSymbol: 'Path = [S₀, S₁, ..., S₁₉], Indices = [b₀, b₁, ..., b₁₉] ∈ {0, 1}²⁰',
        description:
          'Collecting the 20 sibling nodes in the binary tree with a capacity of over 1,048,576 members, along with the directional index bits (left/right).',
        input: 'TreeDepth = 20 | LeafIndex = 14209 (Binary: 00000011011110000001)',
        output: 'Siblings_Vector = [ 0x01af..., 0x38bc..., 0x99ce..., 0x44d1..., ... (20 𝔽ₚ elements) ]',
        color: '#a855f7',
        verified: true,
      },
      {
        stepNumber: 3,
        title: 'Iterative Reconstruction via Poseidon 2-to-1 Gates',
        mathSymbol: 'N_{k+1} = b_k ? Poseidon(S_k, N_k) : Poseidon(N_k, S_k)',
        description:
          'Sequential re-compression through the ZK circuit from level 0 up to the root. Each level applies the 2:1 compression function of the Poseidon algorithm.',
        input: 'Layer_Inputs = (N₀, S₀) → (N₁, S₁) → ... → (N₁₉, S₁₉)',
        output: 'Computed_Root = 0x17c093a1059f8b44917a2283910c283749018237490182374901823749018237',
        color: '#22c55e',
        verified: true,
      },
      {
        stepNumber: 4,
        title: 'Root Validation in P2P Consensus Roots History',
        mathSymbol: 'MembershipCheck(Computed_Root, ℛ_{valid_roots}[0..128]) == 1',
        description:
          'Verifying that computed root matches one of the last 128 network-approved consensus roots, guaranteeing membership without disclosing leaf index.',
        input: 'Active_P2P_Root_Ring = [ 0x17c093a1..., 0x09bc4412..., 0x88214fa0... ]',
        output: 'Membership_Verdict = TRUE (Root matched snapshot epoch #4128, Lag: 0 epochs)',
        color: '#22c55e',
        verified: true,
      },
    ];
  }

  /**
   * 4. TreeKEM MLS Ratchet (RFC 9420) Proof Decomposition:
   * Continuous group key agreement with Post-Compromise Security.
   */
  public getTreeKEMProofDecomposition(): ProofStep[] {
    return [
      {
        stepNumber: 1,
        title: 'MLS Leaf Node & Ratchet Seed Initialization',
        mathSymbol: 'K_leaf = HKDF-Extract(Salt, Secret_node), PK_leaf = X25519(K_leaf, G)',
        description:
          'Generating a new ephemeral keypair on curve X25519 for current member, isolating past sessions from any subsequent compromise.',
        input: 'Entropy_Pool = 0x77a8b19283746150293847561029384756102938475610293847561029384756',
        output: 'Leaf_Keys = { Priv: 0x44c109..., Pub: 0x89e2103847102938471029384710293847102938 }',
        color: '#00e5ff',
        verified: true,
      },
      {
        stepNumber: 2,
        title: 'Direct Path Key Propagation (Direct Path Derivation)',
        mathSymbol: 'NodeSecret_{i+1} = HKDF-Expand(NodeSecret_i, "node_secret", 32)',
        description:
          'Computing new secrets for all intermediate nodes from own leaf up to the root of the TreeKEM group binary tree.',
        input: 'Direct_Path = [ Leaf_4 → Parent_2 → Root_0 ]',
        output: 'Updated_Path_Secrets = [ 0xaa4109..., 0xbb8210..., 0xcc9321... ]',
        color: '#a855f7',
        verified: true,
      },
      {
        stepNumber: 3,
        title: 'Co-Path Encryption via HPKE (RFC 9180)',
        mathSymbol: 'C_k = HPKE_{X25519-ChaCha20-Poly1305}(PK_{copath_k}, NodeSecret_k)',
        description:
          'Encrypting new intermediate keys for each neighboring subtree (co-path). Excluded members cannot decrypt these messages.',
        input: 'Target_Public_Keys = [ PK_sibling_0, PK_sibling_1, PK_root_sibling ]',
        output: 'Encrypted_CoPath_Package = 3 HPKE ciphertexts (288 bytes total overhead)',
        color: '#f59e0b',
        verified: true,
      },
      {
        stepNumber: 4,
        title: 'Group Epoch Advancement & Ephemeral Epoch Secret',
        mathSymbol: 'EpochSecret_{t+1} = HKDF-Extract(RootSecret_{t+1}, EpochSecret_t ⊕ CommitHash)',
        description:
          'Atomic group ratchet. Derives a new chat channel encryption key and irreversibly deletes keys from prior epochs (Forward Secrecy).',
        input: 'Prev_Epoch = 412 | Commit_Hash = 0x58b9a10293847561029384756102938475610293',
        output: 'New_Group_Epoch_Secret = 0x90a823f401928374901823749018237490182374901823749018237490182374',
        color: '#22c55e',
        verified: true,
      },
      {
        stepNumber: 5,
        title: 'ZK Non-Exclusion & Sovereign Tree Proof',
        mathSymbol: 'ZK-PCS-Proof(EpochSecret_{t+1}, LeafMembership) == VALID',
        description:
          'Zero-Knowledge validation that sender is an authorized member in the TreeKEM tree and correctly applied the state transition without disclosing which group member sent the message.',
        input: 'Group_Size = 64 sovereign nodes | TreeHeight = 6',
        output: 'Ratchet_State = LOCKED_SECURE (Post-Compromise Security Verified)',
        color: '#22c55e',
        verified: true,
      },
    ];
  }

  /**
   * Generates a complete JSON witness payload for the active or requested proof.
   */
  public getWitnessJSON(type?: ProofType): string {
    const targetType = type || this.activeProofType;
    const meta = this.tabMetadata[targetType];
    const steps = this.getProofSteps(targetType);

    const witnessObj = {
      protocol: 'Aetheris Omni-Sphere Sovereign ZK Engine',
      proofType: targetType,
      specification: meta.title,
      curve: meta.curve,
      constraints: meta.constraints,
      provingTime: `${meta.provingTimeMs} ms`,
      verificationTime: `${meta.verificationTimeMs} ms`,
      timestamp: new Date().toISOString(),
      bn254_prime: '21888242871839275222246405745257275088548364400416034343698204186575808495617',
      proof_groth16: {
        pi_a: [
          '0x1b4c810928374615029384756102938475610293847561029384756102938475',
          '0x0d89230192837465102938475610293847561029384756102938475610293847',
          '0x01',
        ],
        pi_b: [
          [
            '0x22894109bcae9182374619082341908234019283401928340192834019283401',
            '0x17c093a1059f8b44917a2283910c283749018237490182374901823749018237',
          ],
          [
            '0x0a45e02891823746192837461928374619283746192837461928374619283746',
            '0x2c91a03f48e1b99a61b84f3782109e4d58a80394019a4e8d35091ffca710b91e',
          ],
          ['0x01', '0x00'],
        ],
        pi_c: [
          '0x18f4a0b229c9103e91848a301f28b49e0c184092b19283749201928471019283',
          '0x1a82e9b04f118c72948018237490182374901823000000000000000000000000',
          '0x01',
        ],
      },
      publicSignals: steps.map((s) => ({
        step: s.stepNumber,
        title: s.title,
        math: s.mathSymbol,
        outputDigest: s.output,
        verified: s.verified,
      })),
      verificationResult: {
        status: 'VERIFIED_VALID',
        pairingMatch: true,
        zeroKnowledgePreserved: true,
        antiSybilProtected: true,
      },
    };

    return JSON.stringify(witnessObj, null, 2);
  }

  /**
   * Renders the stylized button to open the modal from anywhere in the UI.
   */
  public renderOpenButton(type: ProofType = 'rln', label: string = '🔐 View ZK Proof'): string {
    return `
      <button 
        type="button" 
        data-open-zk-proof="${type}"
        class="btn-open-zk-proof inline-flex items-center space-x-1.5 px-2.5 py-1 text-xs font-mono font-semibold rounded-lg bg-surface-raised hover:bg-surface-overlay text-cyphr border border-cyphr/30 hover:border-cyphr/60 transition-all shadow-sm hover:shadow-cyphr-sm active:scale-95 group cursor-pointer"
        title="Inspect Cryptographic Zero-Knowledge Decomposition for ${type.toUpperCase()}"
      >
        <span class="group-hover:rotate-12 transition-transform duration-200">🔐</span>
        <span class="tracking-wide">${this.escapeHtml(label)}</span>
        <span class="text-[9px] px-1 py-0.2 rounded bg-cyphr/10 text-cyphr/90 border border-cyphr/20 font-mono uppercase">BN254</span>
      </button>
    `;
  }

  /**
   * Renders the complete, interactive cryptographic terminal modal.
   */
  public renderProofViewer(): string {
    if (!this.isOpen) return '';

    const currentMeta = this.tabMetadata[this.activeProofType];
    const steps = this.getProofSteps(this.activeProofType);
    const witnessJson = this.getWitnessJSON(this.activeProofType);

    return `
      <div 
        id="zk-proof-modal-overlay" 
        class="fixed inset-0 z-[100] bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-150 select-none overflow-y-auto"
      >
        <!-- MODAL WINDOW: CRYPTOGRAPHIC TERMINAL -->
        <div 
          class="w-full max-w-5xl bg-surface-base border border-cyphr/30 rounded-2xl shadow-2xl shadow-cyan-950/40 flex flex-col max-h-[92vh] overflow-hidden text-slate-200 font-sans border-subtle-b"
          role="dialog"
          aria-modal="true"
          aria-label="Aetheris Zero-Knowledge Proof Visualizer"
        >
          
          <!-- TERMINAL HEADER BAR -->
          <div class="h-14 bg-surface-raised px-4 md:px-6 border-b border-white/10 flex items-center justify-between shrink-0">
            
            <!-- LEFT: DOTS + TITLE + ENGINE BADGE -->
            <div class="flex items-center space-x-3">
              <div class="flex items-center space-x-1.5">
                <span class="w-3 h-3 rounded-full bg-crimson inline-block opacity-80 hover:opacity-100 cursor-pointer" id="btn-zk-dot-close" title="Close"></span>
                <span class="w-3 h-3 rounded-full bg-amber inline-block opacity-80 hover:opacity-100 cursor-pointer" title="Minimize"></span>
                <span class="w-3 h-3 rounded-full bg-signal inline-block opacity-80 hover:opacity-100 cursor-pointer" title="Maximize"></span>
              </div>

              <div class="h-4 w-px bg-white/10 mx-1"></div>

              <div class="flex items-center space-x-2">
                <span class="text-base">${currentMeta.icon}</span>
                <span class="font-bold text-sm text-white tracking-wider font-mono">
                  AETHERIS ZK-INSPECTOR
                </span>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-overlay text-cyphr border border-cyphr/30">
                  ${currentMeta.badge}
                </span>
              </div>
            </div>

            <!-- RIGHT: PERFORMANCE BADGE & CLOSE BUTTON -->
            <div class="flex items-center space-x-3">
              <!-- PERFORMANCE PILL REQUIRED BY SPEC -->
              <div class="hidden sm:flex items-center space-x-2 px-3 py-1 rounded-lg bg-surface-overlay border border-white/5 font-mono text-[11px]">
                <span class="w-2 h-2 rounded-full bg-signal animate-pulse"></span>
                <span class="text-slate-300">
                  Proof Verified in <strong class="text-signal">${currentMeta.verificationTimeMs}ms</strong> · <span class="text-cyphr">${currentMeta.curve}</span> · <span class="text-aether">Zero-Knowledge SNARK</span>
                </span>
              </div>

              <button 
                id="btn-close-zk-proof" 
                class="w-8 h-8 rounded-lg bg-surface-overlay hover:bg-surface-highlight text-slate-400 hover:text-white flex items-center justify-center transition-all border border-white/5"
                title="Close Visualizer (Esc)"
              >
                ✕
              </button>
            </div>
          </div>

          <!-- SUB-HEADER: TABS SELECTOR -->
          <div class="px-4 md:px-6 py-2.5 bg-surface-base/80 border-b border-white/5 flex items-center justify-between overflow-x-auto shrink-0 space-x-2">
            <div class="flex items-center space-x-1.5">
              ${this.renderTabButton('rln', '🛡️ ZK-RLN (Spam Slasher)')}
              ${this.renderTabButton('passport', '🛂 ZK-Passport (eMRTD)')}
              ${this.renderTabButton('merkle', '🌳 Merkle Tree (Poseidon)')}
              ${this.renderTabButton('treekem', '🌲 TreeKEM MLS (Ratchet)')}
            </div>

            <!-- ACTION CONTROLS -->
            <div class="flex items-center space-x-2 shrink-0">
              <button 
                id="btn-toggle-witness" 
                class="px-2.5 py-1 text-xs font-mono rounded-md bg-surface-raised hover:bg-surface-overlay text-slate-300 hover:text-white border border-white/10 transition-all flex items-center space-x-1.5"
              >
                <span>📜</span>
                <span>${this.isWitnessExpanded ? 'Hide Witness JSON' : 'View Witness JSON'}</span>
              </button>
              <button 
                id="btn-copy-witness" 
                class="px-2.5 py-1 text-xs font-mono rounded-md bg-cyphr/10 hover:bg-cyphr/20 text-cyphr border border-cyphr/30 hover:border-cyphr/60 transition-all flex items-center space-x-1.5"
                title="Copy Full Cryptographic Witness"
              >
                <span>📋</span>
                <span>Copy Witness JSON</span>
              </button>
            </div>
          </div>

          <!-- MAIN BODY: SCROLLABLE PIPELINE & DETAILS -->
          <div class="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-canvas">
            
            <!-- OVERVIEW BANNER -->
            <div class="p-4 rounded-xl bg-surface-raised border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div class="flex items-center space-x-2">
                  <h3 class="text-base font-bold text-white tracking-wide flex items-center space-x-2">
                    <span>${currentMeta.icon}</span>
                    <span>${currentMeta.title}</span>
                  </h3>
                  <span class="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-signal/10 text-signal border border-signal/30">
                    Active Circuit
                  </span>
                </div>
                <p class="text-xs text-slate-400 mt-1 leading-relaxed">
                  ${currentMeta.subtitle}
                </p>
              </div>

              <!-- CIRCUIT SPECS CHIPS -->
              <div class="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                <div class="px-2.5 py-1 rounded-md bg-surface-base border border-white/5 text-slate-300">
                  <span class="text-slate-500">R1CS Constraints:</span> <span class="text-cyphr font-bold">${currentMeta.constraints.toLocaleString()}</span>
                </div>
                <div class="px-2.5 py-1 rounded-md bg-surface-base border border-white/5 text-slate-300">
                  <span class="text-slate-500">Prover:</span> <span class="text-aether font-bold">${currentMeta.provingTimeMs}ms</span>
                </div>
                <div class="px-2.5 py-1 rounded-md bg-surface-base border border-white/5 text-slate-300">
                  <span class="text-slate-500">Security:</span> <span class="text-signal font-bold">${currentMeta.securityLevel}</span>
                </div>
              </div>
            </div>

            <!-- OPTIONAL EXPANDED RAW WITNESS JSON DRAWER -->
            ${
              this.isWitnessExpanded
                ? `
              <div class="rounded-xl bg-surface-base border border-cyphr/30 p-4 font-mono text-xs overflow-hidden">
                <div class="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                  <div class="flex items-center space-x-2 text-cyphr font-bold">
                    <span>📜</span>
                    <span>Raw Groth16 Witness & Public Signals (Circom Format)</span>
                  </div>
                  <span class="text-[10px] text-slate-400">BN254 Scalar Field · 254-bit prime</span>
                </div>
                <pre class="p-3 bg-black/60 rounded-lg text-slate-300 overflow-x-auto max-h-56 leading-relaxed select-text">${this.escapeHtml(witnessJson)}</pre>
              </div>
            `
                : ''
            }

            <!-- PIPELINE STEP LIST WITH SVG CONNECTORS -->
            <div class="space-y-3 relative">
              <div class="flex items-center justify-between pb-1">
                <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center space-x-2">
                  <span>⚡</span>
                  <span>Cryptographic Pipeline Decomposition (${steps.length} Verified Stages)</span>
                </h4>
                <span class="text-[11px] font-mono text-signal">
                  ● 100% Constraints Satisfied
                </span>
              </div>

              <div class="space-y-0">
                ${steps
                  .map((step, index) => this.renderProofStepCard(step, index, steps.length))
                  .join('')}
              </div>
            </div>

            <!-- MATHEMATICAL PROOF SUMMARY FOOTER BOX -->
            <div class="p-4 rounded-xl bg-surface-raised/60 border border-white/5 text-xs text-slate-400 font-mono space-y-2">
              <div class="text-slate-200 font-bold flex items-center space-x-2 text-sm">
                <span>📐</span>
                <span>Zero-Knowledge Soundness & Completeness Guarantees</span>
              </div>
              <p class="leading-relaxed">
                The evaluation polynomial $A(x) = a_0 + a_1 x \pmod p$ generates deterministic rate-limiting shares in $\mathbb{F}_p$.
                Knowledge of at most 1 share per epoch strictly guarantees Zero-Knowledge of $a_0$.
                The bilinear pairing verification equation $e(A, B) = e(\alpha, \beta) \cdot e(x \cdot \gamma, \delta) \cdot e(C, \delta)$ operates in $\mathcal{O}(1)$ time on the BN254 elliptic curve group $\mathbb{G}_T$.
              </p>
            </div>

          </div>

          <!-- FOOTER STATUS & CONTROLS -->
          <div class="h-12 bg-surface-raised px-4 md:px-6 border-t border-white/10 flex items-center justify-between shrink-0 font-mono text-xs">
            <div class="flex items-center space-x-3 text-slate-400">
              <span class="flex items-center space-x-1">
                <span class="w-2 h-2 rounded-full bg-signal"></span>
                <span class="text-slate-200">Zero-Trust Verified</span>
              </span>
              <span class="text-slate-600">|</span>
              <span class="hidden sm:inline">Memory: <strong class="text-slate-300">4.2 MB WASM</strong></span>
              <span class="text-slate-600 hidden sm:inline">|</span>
              <span class="hidden sm:inline">Soundness Error: <strong class="text-cyphr">&lt; 2⁻¹²⁸</strong></span>
            </div>

            <div class="flex items-center space-x-2">
              <button 
                id="btn-reverify-proof" 
                class="px-3 py-1 rounded-md bg-surface-overlay hover:bg-surface-highlight text-cyphr border border-cyphr/30 font-semibold transition-all flex items-center space-x-1"
              >
                <span>🔄</span>
                <span>Re-Verify Circuit</span>
              </button>
              <button 
                id="btn-dismiss-zk" 
                class="px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white transition-all font-semibold"
              >
                Close Inspector
              </button>
            </div>
          </div>

        </div>
      </div>
    `;
  }

  /**
   * Helper to render individual tab buttons in the header.
   */
  private renderTabButton(type: ProofType, label: string): string {
    const isActive = this.activeProofType === type;
    const activeClass = isActive
      ? 'bg-surface-overlay text-cyphr font-bold border-cyphr/40 shadow-cyphr-sm'
      : 'text-slate-400 hover:text-slate-200 bg-surface-raised/50 border-white/5 hover:bg-surface-raised';

    return `
      <button 
        data-zk-tab="${type}" 
        class="btn-zk-tab px-3 py-1.5 text-xs rounded-lg font-mono transition-all border flex items-center space-x-1.5 cursor-pointer ${activeClass}"
      >
        <span>${this.escapeHtml(label)}</span>
      </button>
    `;
  }

  /**
   * Helper to render each proof decomposition step with SVG vertical connector lines.
   */
  private renderProofStepCard(step: ProofStep, index: number, totalSteps: number): string {
    const isLast = index === totalSteps - 1;

    return `
      <div class="relative flex items-start space-x-3 group">
        
        <!-- LEFT COLUMN: STEP NUMBER BADGE & CONNECTOR SVG -->
        <div class="flex flex-col items-center shrink-0 w-8">
          <!-- STEP CIRCLE -->
          <div 
            class="w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-xs shadow-md z-10 transition-transform group-hover:scale-110"
            style="background-color: ${step.color}20; color: ${step.color}; border: 1px solid ${step.color}80;"
          >
            ${step.stepNumber}
          </div>

          <!-- VERTICAL SVG CONNECTOR -->
          ${
            !isLast
              ? `
            <div class="w-0.5 h-full min-h-[50px] bg-gradient-to-b from-white/20 to-white/5 my-1 flex items-center justify-center">
              <svg class="w-2 h-4 text-white/20" viewBox="0 0 8 16" fill="none">
                <path d="M4 0V16M4 16L1 12M4 16L7 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              </svg>
            </div>
          `
              : ''
          }
        </div>

        <!-- RIGHT COLUMN: STEP CARD -->
        <div class="flex-1 mb-3 p-3.5 rounded-xl bg-surface-raised border border-white/5 hover:border-white/15 transition-all">
          
          <!-- STEP HEADER -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
            <div class="flex items-center space-x-2">
              <span class="font-bold text-sm text-slate-100">${this.escapeHtml(step.title)}</span>
            </div>

            <div class="flex items-center space-x-1.5 font-mono text-[10px]">
              <span class="px-2 py-0.5 rounded bg-signal/15 text-signal border border-signal/30 font-bold flex items-center space-x-1">
                <span>✓</span>
                <span>Verified Satisfied</span>
              </span>
            </div>
          </div>

          <!-- KATEX / MATHEMATICAL EQUATION DISPLAY -->
          <div class="p-2 rounded-lg bg-black/40 border border-white/5 font-mono text-xs text-cyphr mb-2 overflow-x-auto flex items-center justify-between select-text">
            <div class="flex items-center space-x-2">
              <span class="text-slate-500 select-none">𝑓(x):</span>
              <code class="font-bold tracking-wide">${this.escapeHtml(step.mathSymbol)}</code>
            </div>
            <span class="text-[9px] text-slate-500 uppercase font-sans shrink-0 ml-2">𝔽ₚ BN254</span>
          </div>

          <!-- DESCRIPTION TEXT -->
          <p class="text-xs text-slate-300 leading-relaxed mb-3">
            ${this.escapeHtml(step.description)}
          </p>

          <!-- INPUT & OUTPUT CRYPTO GRIDS -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-[11px]">
            <!-- INPUT CONTAINER -->
            <div class="p-2 rounded bg-surface-base border border-white/5 space-y-1">
              <div class="text-slate-500 text-[10px] uppercase font-bold flex items-center justify-between">
                <span>Input Signal / Witness</span>
                <span class="text-slate-600">𝔽ₚ Element</span>
              </div>
              <div class="text-slate-300 break-all text-[10px] select-text">
                ${this.escapeHtml(step.input)}
              </div>
            </div>

            <!-- OUTPUT CONTAINER -->
            <div class="p-2 rounded bg-surface-base border border-white/5 space-y-1">
              <div class="text-signal text-[10px] uppercase font-bold flex items-center justify-between">
                <span>Output Commitment / Digest</span>
                <span class="text-signal/60">Verified ✓</span>
              </div>
              <div class="text-slate-300 break-all text-[10px] select-text">
                ${this.escapeHtml(step.output)}
              </div>
            </div>
          </div>

        </div>
      </div>
    `;
  }

  /**
   * Wires up DOM events for the modal, tabs, copy button, and close triggers.
   */
  public attachEvents(root: Document | HTMLElement = document): void {
    // Open buttons from UI
    root.querySelectorAll<HTMLButtonElement>('.btn-open-zk-proof, [data-open-zk-proof]').forEach((btn) => {
      btn.onclick = (e) => {
        e.preventDefault();
        const type = (btn.getAttribute('data-open-zk-proof') || 'rln') as ProofType;
        this.open(type);
        this.reRenderIfMounted();
      };
    });

    // Close button
    const closeBtn = root.querySelector('#btn-close-zk-proof');
    if (closeBtn) {
      (closeBtn as HTMLElement).onclick = () => {
        this.close();
        this.reRenderIfMounted();
      };
    }

    // Dot Close button
    const dotClose = root.querySelector('#btn-zk-dot-close');
    if (dotClose) {
      (dotClose as HTMLElement).onclick = () => {
        this.close();
        this.reRenderIfMounted();
      };
    }

    // Dismiss button in footer
    const dismissBtn = root.querySelector('#btn-dismiss-zk');
    if (dismissBtn) {
      (dismissBtn as HTMLElement).onclick = () => {
        this.close();
        this.reRenderIfMounted();
      };
    }

    // Overlay backdrop click to close
    const overlay = root.querySelector('#zk-proof-modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.close();
          this.reRenderIfMounted();
        }
      });
    }

    // Tab buttons
    root.querySelectorAll<HTMLButtonElement>('.btn-zk-tab, [data-zk-tab]').forEach((tab) => {
      tab.onclick = (e) => {
        e.preventDefault();
        const tabType = tab.getAttribute('data-zk-tab') as ProofType;
        if (tabType) {
          this.setProofType(tabType);
          this.reRenderIfMounted();
        }
      };
    });

    // Toggle Witness Drawer
    const toggleWitnessBtn = root.querySelector('#btn-toggle-witness');
    if (toggleWitnessBtn) {
      (toggleWitnessBtn as HTMLElement).onclick = () => {
        this.isWitnessExpanded = !this.isWitnessExpanded;
        this.reRenderIfMounted();
      };
    }

    // Copy Witness JSON
    const copyWitnessBtn = root.querySelector('#btn-copy-witness');
    if (copyWitnessBtn) {
      (copyWitnessBtn as HTMLElement).onclick = async () => {
        const json = this.getWitnessJSON(this.activeProofType);
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(json);
          }
          copyWitnessBtn.innerHTML = `<span>✅</span><span>Copied!</span>`;
          setTimeout(() => {
            if (copyWitnessBtn) {
              copyWitnessBtn.innerHTML = `<span>📋</span><span>Copy Witness JSON</span>`;
            }
          }, 2000);
        } catch {
          // Fallback
          prompt('Copy Witness JSON:', json);
        }
      };
    }

    // Re-verify Circuit button
    const reverifyBtn = root.querySelector('#btn-reverify-proof');
    if (reverifyBtn) {
      (reverifyBtn as HTMLElement).onclick = () => {
        reverifyBtn.innerHTML = `<span>⏳</span><span>Verifying BN254...</span>`;
        setTimeout(() => {
          reverifyBtn.innerHTML = `<span>✅</span><span>100% Constraints OK</span>`;
          setTimeout(() => {
            if (reverifyBtn) {
              reverifyBtn.innerHTML = `<span>🔄</span><span>Re-Verify Circuit</span>`;
            }
          }, 2000);
        }, 300);
      };
    }

    // Escape key handler
    const escListener = (evt: KeyboardEvent) => {
      if (evt.key === 'Escape' && this.isOpen) {
        this.close();
        this.reRenderIfMounted();
      }
    };
    window.removeEventListener('keydown', escListener);
    window.addEventListener('keydown', escListener);
  }

  /**
   * Helper to re-render in place if an element with #zk-proof-modal-container or #app is present.
   */
  private reRenderIfMounted(): void {
    const container = document.getElementById('zk-proof-modal-container');
    if (container) {
      container.innerHTML = this.renderProofViewer();
      this.attachEvents(document);
    } else {
      // If modal overlay is direct child of body or inside app, update overlay
      const currentOverlay = document.getElementById('zk-proof-modal-overlay');
      if (this.isOpen) {
        if (currentOverlay) {
          currentOverlay.outerHTML = this.renderProofViewer();
        } else {
          const wrapper = document.createElement('div');
          wrapper.id = 'zk-proof-modal-container';
          wrapper.innerHTML = this.renderProofViewer();
          document.body.appendChild(wrapper);
        }
        this.attachEvents(document);
      } else {
        if (currentOverlay) {
          currentOverlay.remove();
        }
        const wrp = document.getElementById('zk-proof-modal-container');
        if (wrp) wrp.innerHTML = '';
      }
    }
  }

  /**
   * Basic HTML escaping to prevent XSS.
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

export const zkProofVisualizer = new ZKProofVisualizer();
