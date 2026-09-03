/**
 * Unit Tests: Rich LaTeX Math & Mermaid Architecture Diagram Renderer
 * Tests KaTeX-grade math formatting, SVG flowchart generation, sequence diagrams,
 * and seamless markdown integration.
 */

import { describe, it, expect } from 'vitest';
import { diagramRenderer, DiagramRenderer } from '../src/diagram-renderer.js';
import { markdownRenderer } from '../src/markdown-renderer.js';
import { serviceRegistry, SERVICES } from '../src/service-registry.js';

describe('DiagramRenderer - Mathematical Formula Typesetting', () => {
  it('tests inline math rendering ($E = mc^2$)', () => {
    const rendered = diagramRenderer.renderInlineMath('E = mc^2');
    expect(rendered).toContain('aetheris-math-inline');
    expect(rendered).toContain('role="math"');
    expect(rendered).toContain('aria-label="E = mc^2"');
    expect(rendered).toContain('E');
    expect(rendered).toContain('=');
    expect(rendered).toContain('m');
    expect(rendered).toContain('c');
    expect(rendered).toContain('2');
    expect(rendered).toContain('katex-sup');
  });

  it('tests block math rendering ($$\\sum_{i=0}^n x_i$$)', () => {
    const rendered = diagramRenderer.renderBlockMath('\\sum_{i=0}^n x_i');
    expect(rendered).toContain('aetheris-math-block');
    expect(rendered).toContain('role="math"');
    expect(rendered).toContain('∑'); // Summation symbol
    expect(rendered).toContain('i');
    expect(rendered).toContain('0');
    expect(rendered).toContain('n');
    expect(rendered).toContain('x');
    expect(rendered).toContain('katex-sub');
    expect(rendered).toContain('katex-large-op');
  });

  it('renders fractions with numerator, denominator, and fraction bar', () => {
    const rendered = diagramRenderer.renderInlineMath('\\frac{a + b}{c - d}');
    expect(rendered).toContain('katex-fraction');
    expect(rendered).toContain('katex-num');
    expect(rendered).toContain('katex-den');
    expect(rendered).toContain('a');
    expect(rendered).toContain('b');
    expect(rendered).toContain('c');
    expect(rendered).toContain('d');
  });

  it('renders square roots with radical SVG symbol and overbar', () => {
    const sqrtBasic = diagramRenderer.renderInlineMath('\\sqrt{x + 1}');
    expect(sqrtBasic).toContain('katex-sqrt');
    expect(sqrtBasic).toContain('<svg');
    expect(sqrtBasic).toContain('x');

    const sqrtIndexed = diagramRenderer.renderInlineMath('\\sqrt[3]{8}');
    expect(sqrtIndexed).toContain('katex-sqrt');
    expect(sqrtIndexed).toContain('3');
    expect(sqrtIndexed).toContain('8');
  });

  it('renders Greek letters and mathematical operators', () => {
    const rendered = diagramRenderer.renderInlineMath('\\alpha + \\beta = \\gamma \\times \\lambda');
    expect(rendered).toContain('α');
    expect(rendered).toContain('β');
    expect(rendered).toContain('γ');
    expect(rendered).toContain('λ');
    expect(rendered).toContain('×');
  });

  it('renders products and integrals with limits', () => {
    const prod = diagramRenderer.renderBlockMath('\\prod_{k=1}^m k^2');
    expect(prod).toContain('∏');
    expect(prod).toContain('k');
    expect(prod).toContain('1');
    expect(prod).toContain('m');

    const integral = diagramRenderer.renderInlineMath('\\int_0^\\infty e^{-x} dx');
    expect(integral).toContain('∫');
    expect(integral).toContain('∞');
  });

  it('renders LaTeX matrices with parentheses and brackets', () => {
    const pmatrix = diagramRenderer.renderBlockMath(
      '\\begin{pmatrix} 1 & 0 \\\\ 0 & 1 \\end{pmatrix}'
    );
    expect(pmatrix).toContain('katex-matrix');
    expect(pmatrix).toContain('(');
    expect(pmatrix).toContain(')');
    expect(pmatrix).toContain('<table');
    expect(pmatrix).toContain('1');
    expect(pmatrix).toContain('0');

    const bmatrix = diagramRenderer.renderBlockMath(
      '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}'
    );
    expect(bmatrix).toContain('katex-matrix');
    expect(bmatrix).toContain('[');
    expect(bmatrix).toContain(']');
    expect(bmatrix).toContain('a');
    expect(bmatrix).toContain('b');
    expect(bmatrix).toContain('c');
    expect(bmatrix).toContain('d');
  });

  it('renders combined subscripts and superscripts properly', () => {
    const subsup = diagramRenderer.renderInlineMath('x_i^2');
    expect(subsup).toContain('katex-subsup');
    expect(subsup).toContain('i');
    expect(subsup).toContain('2');
  });
});

describe('DiagramRenderer - Mermaid Architecture Diagrams', () => {
  it('tests Mermaid flowchart parsing and SVG node generation (graph TD\\nA-->B)', () => {
    const mermaidCode = `graph TD\nA-->B`;
    const rendered = diagramRenderer.renderMermaid(mermaidCode);

    expect(rendered).toContain('aetheris-mermaid-container');
    expect(rendered).toContain('<svg');
    expect(rendered).toContain('viewBox=');
    expect(rendered).toContain('aetheris-flow-node');
    expect(rendered).toContain('data-node-id="A"');
    expect(rendered).toContain('data-node-id="B"');
    expect(rendered).toContain('aetheris-edge');
    expect(rendered).toContain('marker-end=');
    expect(rendered).toContain('A');
    expect(rendered).toContain('B');
  });

  it('parses diverse node shapes: rect, rounded, database, decision, stadium, circle', () => {
    const code = `
      graph LR
      client[Client Node] --> auth(Auth Guard)
      auth --> db[(Encrypted Vault)]
      db --> check{Is Verified?}
      check --> p([Stadium Service])
      check --> c((P2P Peer))
    `;
    const rendered = diagramRenderer.renderMermaid(code);

    expect(rendered).toContain('<svg');
    expect(rendered).toContain('Client Node');
    expect(rendered).toContain('Auth Guard');
    expect(rendered).toContain('Encrypted Vault');
    expect(rendered).toContain('Is Verified?');
    expect(rendered).toContain('Stadium Service');
    expect(rendered).toContain('P2P Peer');

    // Verify SVG shapes are present
    expect(rendered).toContain('<polygon'); // Decision diamond
    expect(rendered).toContain('<ellipse'); // Database top
    expect(rendered).toContain('<circle');  // Circle node
  });

  it('parses arrows with text labels and different styles', () => {
    const code = `
      graph TD
      A -->|Secure TLS| B
      B ---|Open Wire| C
      C -.->|Telemetry| D
      D ==>|Zero-Knowledge Prover| E
    `;
    const rendered = diagramRenderer.renderMermaid(code);

    expect(rendered).toContain('Secure TLS');
    expect(rendered).toContain('Open Wire');
    expect(rendered).toContain('Telemetry');
    expect(rendered).toContain('Zero-Knowledge Prover');
    expect(rendered).toContain('stroke-dasharray="4 4"'); // Dotted
    expect(rendered).toContain('stroke-width="2.5"');       // Thick
  });

  it('supports subgraphs grouping nodes with styled titles', () => {
    const code = `
      graph TD
      subgraph Core Architecture
        A[Ingress] --> B[Verifier]
      end
      subgraph Storage Ring
        C[Local DB] --> D[IPFS Cluster]
      end
      B --> C
    `;
    const rendered = diagramRenderer.renderMermaid(code);

    expect(rendered).toContain('aetheris-subgraph');
    expect(rendered).toContain('CORE ARCHITECTURE');
    expect(rendered).toContain('STORAGE RING');
    expect(rendered).toContain('Ingress');
    expect(rendered).toContain('IPFS Cluster');
  });

  it('renders Mermaid sequence diagrams with actors, lifelines, and messages', () => {
    const sequenceCode = `
      sequenceDiagram
      participant Alice as Prover Client
      actor Bob as Edge Relayer
      Alice->>Bob: Initiate ZK Handshake
      Bob-->>Alice: Handshake Nonce Challenge
      Alice->>Bob: Submit Proof Payload
    `;
    const rendered = diagramRenderer.renderMermaid(sequenceCode);

    expect(rendered).toContain('aetheris-mermaid-container');
    expect(rendered).toContain('Mermaid Sequence Diagram');
    expect(rendered).toContain('Prover Client');
    expect(rendered).toContain('Edge Relayer');
    expect(rendered).toContain('Initiate ZK Handshake');
    expect(rendered).toContain('Handshake Nonce Challenge');
    expect(rendered).toContain('Submit Proof Payload');
    expect(rendered).toContain('stroke-dasharray="6 4"'); // Lifeline
  });

  it('tests fallback for malformed diagrams', () => {
    // Malformed: empty or unsupported header
    const malformed = `not_a_valid_mermaid_diagram_header\nfoo bar baz`;
    const rendered = diagramRenderer.renderMermaid(malformed);

    expect(rendered).toContain('aetheris-mermaid-fallback');
    expect(rendered).toContain('Mermaid Diagram Syntax Warning');
    expect(rendered).toContain('Unsupported diagram header');
    expect(rendered).toContain('not_a_valid_mermaid_diagram_header');
  });

  it('gracefully handles empty diagram without throwing', () => {
    const rendered = diagramRenderer.renderMermaid('');
    expect(rendered).toContain('aetheris-mermaid-fallback');
    expect(rendered).toContain('Empty diagram definition');
  });
});

describe('DiagramRenderer - renderRichContent & Markdown Integration', () => {
  it('seamlessly renders markdown with inline math, block math, and mermaid code blocks', () => {
    const content = `
# System Architecture

Here is the famous energy relation: $E = mc^2$.
The cost of this operation is $25.50 in compute.

$$
\\frac{1}{2\\pi} \\int_0^{2\\pi} \\cos^2(\\theta) d\\theta = \\frac{1}{2}
$$

Below is the ingress workflow:

\`\`\`mermaid
graph LR
A[User Browser] -->|Encrypted WebSocket| B[Edge Gateway]
B --> C[(Vault Storage)]
\`\`\`

All normal **markdown** and *styling* is strictly [preserved](https://example.com).
    `;

    const rendered = diagramRenderer.renderRichContent(content);

    // Math inline
    expect(rendered).toContain('aetheris-math-inline');
    expect(rendered).toContain('mc');

    // Currency should NOT be turned into math
    expect(rendered).toContain('$25.50');

    // Block math
    expect(rendered).toContain('aetheris-math-block');
    expect(rendered).toContain('katex-fraction');
    expect(rendered).toContain('π');

    // Mermaid SVG
    expect(rendered).toContain('aetheris-mermaid-container');
    expect(rendered).toContain('User Browser');
    expect(rendered).toContain('Edge Gateway');
    expect(rendered).toContain('Vault Storage');

    // Preserved markdown tags
    expect(rendered).toContain('# System Architecture');
    expect(rendered).toContain('**markdown**');
    expect(rendered).toContain('[preserved](https://example.com)');
  });

  it('integrates with markdownRenderer.renderMarkdown()', () => {
    const md = `
## Scientific Digest

According to relativity, $E = mc^2$ governs conversion.

\`\`\`mermaid
graph TD
NodeA --> NodeB
\`\`\`

Check this block equation:
$$
\\sum_{i=1}^n i = \\frac{n(n+1)}{2}
$$
    `;

    const html = markdownRenderer.renderMarkdown(md);

    // Heading rendered
    expect(html).toContain('<h2');
    expect(html).toContain('Scientific Digest');

    // Inline math rendered
    expect(html).toContain('aetheris-math-inline');

    // Mermaid rendered
    expect(html).toContain('aetheris-mermaid-container');
    expect(html).toContain('NodeA');
    expect(html).toContain('NodeB');

    // Block math rendered
    expect(html).toContain('aetheris-math-block');
    expect(html).toContain('∑');
    expect(html).toContain('katex-fraction');
  });

  it('preserves standard code copy buttons for non-mermaid code blocks', () => {
    const md = `
\`\`\`typescript
const greeting: string = "Hello World";
\`\`\`
    `;

    const html = markdownRenderer.renderMarkdown(md);
    expect(html).toContain('code-terminal-card');
    expect(html).toContain('btn-copy-code');
    expect(html).toContain('greeting');
  });

  it('registers in serviceRegistry properly', () => {
    const registered = serviceRegistry.resolve(SERVICES.DiagramRenderer);
    expect(registered).toBeDefined();
    expect(registered).toBe(diagramRenderer);
  });
});
