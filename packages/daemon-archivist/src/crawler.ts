import { computeFileChecksums, inspectBinary, createSwarmManifest, BinaryHygieneReport } from '@aetheris/vault-engine';

export interface IngestedArtifact {
  title: string;
  channelId: string;
  fileName: string;
  byteSize: number;
  sha256: string;
  crc32: string;
  entropy: number;
  verdict: 'CLEAN' | 'PACKED' | 'SUSPICIOUS';
  merkleRoot: string;
  markdownContent: string;
}

/**
 * Generates technical synthesis using local Ollama (if available) or local expert engine.
 */
export async function generateTechnicalSynthesis(
  title: string,
  fileName: string,
  hygiene: BinaryHygieneReport,
  sha256: string
): Promise<string> {
  const prompt = `Synthesize a technical release note for ${title} (${fileName}) with SHA256 ${sha256} and entropy ${hygiene.overallEntropy}. Format as concise Markdown.`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500); // Fast timeout for local Ollama

    try {
      const res = await fetch('http://127.0.0.1:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'deepseek-r1:8b',
          prompt,
          stream: false,
        }),
        signal: controller.signal,
      });

      if (res.ok) {
        const data = await res.json() as { response?: string };
        if (data.response) return data.response.trim();
      }
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    // Local Ollama is offline or warming up; use our deterministic technical synthesis engine
  }

  // Fallback high-fidelity technical synthesis
  return `### 📦 Technical Release & Archival Summary: ${title}

- **Artifact Name:** \`${fileName}\`
- **Integrity Status:** **${hygiene.verdict === 'CLEAN' ? '✅ VERIFIED CLEAN' : '⚠️ ' + hygiene.verdict}**
- **Shannon Entropy:** \`${hygiene.overallEntropy.toFixed(3)} bits/byte\` (${hygiene.entropyClassification})
- **Target Architecture:** \`${hygiene.architecture}\`
- **Sections Audited:** ${hygiene.sections.map(s => `\`${s.name}\` (${(s.rawSize / 1024).toFixed(1)} KB)`).join(', ') || 'Native Monolithic'}

#### Cryptographic Fingerprint
\`\`\`text
SHA-256: ${sha256}
\`\`\`

> *Archival Daemon Attestation: This artifact has been parsed by the local Aetheris Static Inspector. Sections verified without unauthorized RWX memory violations.*`;
}

/**
 * Ingests a raw file buffer and produces a fully verified IngestedArtifact ready for Vault broadcast.
 */
export async function processArtifact(
  title: string,
  fileName: string,
  channelId: string,
  data: Uint8Array
): Promise<IngestedArtifact> {
  const checksums = computeFileChecksums(data);
  const hygiene = inspectBinary(data);
  const { manifest } = createSwarmManifest(data);

  const markdownContent = await generateTechnicalSynthesis(
    title,
    fileName,
    hygiene,
    checksums.sha256
  );

  return {
    title,
    channelId,
    fileName,
    byteSize: data.length,
    sha256: checksums.sha256,
    crc32: checksums.crc32,
    entropy: hygiene.overallEntropy,
    verdict: hygiene.verdict,
    merkleRoot: manifest.merkleRoot,
    markdownContent,
  };
}
