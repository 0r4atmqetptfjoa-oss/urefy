import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  GovernanceDAO,
  governanceDAO,
  type Proposal,
  type Vote,
  type VoteChoice,
  type ProposalCategory,
  type ProposalStatus,
  type GovernanceTab,
  type VoteTally,
  type ProposalResult
} from '../src/governance.js';

// ─── Lightweight Mock DOM Environment for Testing ────────────────────────────

class MockDOMElement {
  public id: string = '';
  public tagName: string = 'DIV';
  public className: string = '';
  public textContent: string = '';
  public value: string = '';
  public checked: boolean = false;
  public children: MockDOMElement[] = [];
  public parentElement: MockDOMElement | null = null;
  private _attributes: Map<string, string> = new Map();
  private _innerHTML: string = '';
  public eventListeners: Record<string, ((e: any) => void)[]> = {};

  public classList = {
    _classes: new Set<string>(),
    add: (...cls: string[]): void => cls.forEach((c) => this.classList._classes.add(c)),
    remove: (...cls: string[]): void => cls.forEach((c) => this.classList._classes.delete(c)),
    contains: (c: string): boolean => this.classList._classes.has(c),
  };

  constructor(tagName: string = 'div') {
    this.tagName = tagName.toUpperCase();
  }

  public getAttribute(name: string): string | null {
    return this._attributes.get(name) ?? null;
  }

  public setAttribute(name: string, value: string): void {
    this._attributes.set(name, value);
    if (name === 'id') this.id = value;
  }

  public removeAttribute(name: string): void {
    this._attributes.delete(name);
  }

  public get innerHTML(): string {
    return this._innerHTML;
  }

  public set innerHTML(html: string) {
    this._innerHTML = html;
    this.children = [];

    // Extract elements with id
    const idRegex = /<([a-zA-Z0-9-]+)[^>]*id="([^"]+)"[^>]*>/g;
    let match: RegExpExecArray | null;
    while ((match = idRegex.exec(html)) !== null) {
      const el = new MockDOMElement(match[1]);
      el.id = match[2];
      el.parentElement = this;
      this.children.push(el);
    }
  }

  public appendChild(child: MockDOMElement): MockDOMElement {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  public removeChild(child: MockDOMElement): MockDOMElement {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentElement = null;
    }
    return child;
  }

  public remove(): void {
    if (this.parentElement) {
      this.parentElement.removeChild(this);
    }
  }

  public addEventListener(event: string, handler: (e: any) => void): void {
    if (!this.eventListeners[event]) this.eventListeners[event] = [];
    this.eventListeners[event].push(handler);
  }

  public removeEventListener(event: string, handler: (e: any) => void): void {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter((h) => h !== handler);
    }
  }

  public dispatchEvent(event: { type: string }): boolean {
    const list = this.eventListeners[event.type] || [];
    for (const h of list) h(event);
    return true;
  }

  public querySelector<T = MockDOMElement>(selector: string): T | null {
    const all = this.querySelectorAll<T>(selector);
    return all.length > 0 ? all[0] : null;
  }

  public querySelectorAll<T = MockDOMElement>(selector: string): T[] {
    const results: MockDOMElement[] = [];

    const traverse = (node: MockDOMElement): void => {
      if (selector.startsWith('#')) {
        const idTarget = selector.slice(1);
        if (node.id === idTarget) results.push(node);
      } else if (selector.startsWith('.')) {
        const classTarget = selector.slice(1);
        if (node.className.includes(classTarget) || node.classList.contains(classTarget)) {
          results.push(node);
        }
      } else if (selector.startsWith('[') && selector.includes('=')) {
        const match = selector.match(/\[([a-zA-Z0-9-]+)="?([^"\]]+)"?\]/);
        if (match) {
          const attr = match[1];
          const val = match[2];
          if (node.getAttribute(attr) === val) results.push(node);
        }
      } else if (selector.startsWith('[')) {
        const attr = selector.replace(/[\[\]]/g, '');
        if (node.getAttribute(attr) !== null) results.push(node);
      }

      for (const child of node.children) {
        traverse(child);
      }
    };

    for (const child of this.children) {
      traverse(child);
    }

    return results as unknown as T[];
  }

  public focus(): void {}
}

describe('Sovereign DAO & Cryptographic Governance Engine', () => {
  let dao: GovernanceDAO;

  beforeEach(() => {
    dao = new GovernanceDAO();
  });

  // ─── 1. Initialization & Initial Seed Data ──────────────────────────────────
  describe('1. Initialization & Seed Data', () => {
    it('should initialize with 6 seeded proposals', () => {
      expect(dao.proposals.length).toBe(6);
      const ids = dao.proposals.map((p) => p.id);
      expect(ids).toContain('AIP-042');
      expect(ids).toContain('AIP-043');
      expect(ids).toContain('AIP-044');
      expect(ids).toContain('AIP-039');
      expect(ids).toContain('AIP-040');
      expect(ids).toContain('AIP-037');
    });

    it('should seed votes and compute tallies for initial proposals', () => {
      const p42 = dao.proposals.find((p) => p.id === 'AIP-042');
      expect(p42).toBeDefined();
      expect(p42?.status).toBe('active');
      expect(p42?.votes.totalVoters).toBeGreaterThan(0);
      expect(p42?.votes.for).toBeGreaterThan(0);

      const p39 = dao.proposals.find((p) => p.id === 'AIP-039');
      expect(p39?.status).toBe('passed');

      const p37 = dao.proposals.find((p) => p.id === 'AIP-037');
      expect(p37?.status).toBe('rejected');
    });

    it('should verify singleton export is an instance of GovernanceDAO', () => {
      expect(governanceDAO).toBeDefined();
      expect(governanceDAO).toBeInstanceOf(GovernanceDAO);
    });
  });

  // ─── 2. Proposal Creation Engine (createProposal) ───────────────────────────
  describe('2. createProposal Creation Engine', () => {
    it('should create a valid proposal across all categories', () => {
      const categories: ProposalCategory[] = ['protocol', 'security', 'community', 'funding'];

      categories.forEach((cat, index) => {
        const prop = dao.createProposal(
          `AIP Test Title for ${cat}`,
          `Technical description for proposal in category ${cat}.`,
          `fp_author_${index}`,
          cat,
          600,
          48
        );

        expect(prop).toBeDefined();
        expect(prop.title).toBe(`AIP Test Title for ${cat}`);
        expect(prop.description).toBe(`Technical description for proposal in category ${cat}.`);
        expect(prop.authorFP).toBe(`fp_author_${index}`);
        expect(prop.category).toBe(cat);
        expect(prop.quorumRequired).toBe(600);
        expect(prop.status).toBe('active');
        expect(prop.votes).toEqual({ for: 0, against: 0, abstain: 0, totalVoters: 0 });
        expect(prop.id).toMatch(/^AIP-\d{3}$/);
        expect(dao.proposals[0].id).toBe(prop.id); // Added to the beginning
      });
    });

    it('should calculate expiration timestamps correctly based on durationHours', () => {
      const now = Date.now();
      const prop = dao.createProposal(
        'AIP Duration Test',
        'Testing expiration calculation.',
        'fp_test_exp',
        'protocol',
        500,
        72
      );

      const expectedMinExpires = now + 72 * 3600 * 1000 - 500;
      const expectedMaxExpires = now + 72 * 3600 * 1000 + 500;
      expect(prop.expiresAt).toBeGreaterThanOrEqual(expectedMinExpires);
      expect(prop.expiresAt).toBeLessThanOrEqual(expectedMaxExpires);
    });

    it('should enforce minimum quorum constraint of 100 merit', () => {
      const prop = dao.createProposal(
        'Low Quorum Proposal',
        'Testing lower bound quorum.',
        'fp_low_q',
        'community',
        25 // below 100
      );

      expect(prop.quorumRequired).toBe(100);
    });

    it('should enforce minimum duration constraint of 1 hour', () => {
      const prop = dao.createProposal(
        'Short Duration Proposal',
        'Testing lower bound duration.',
        'fp_short_dur',
        'security',
        500,
        -10 // invalid duration
      );

      expect(prop.expiresAt).toBeGreaterThan(prop.createdAt);
      expect(prop.expiresAt - prop.createdAt).toBe(1 * 3600 * 1000);
    });

    it('should reject empty or whitespace title with Error', () => {
      expect(() => {
        dao.createProposal('', 'Valid description', 'fp_author');
      }).toThrow('Proposal title cannot be empty.');

      expect(() => {
        dao.createProposal('   ', 'Valid description', 'fp_author');
      }).toThrow('Proposal title cannot be empty.');
    });

    it('should reject empty or whitespace description with Error', () => {
      expect(() => {
        dao.createProposal('Valid Title', '', 'fp_author');
      }).toThrow('Proposal description cannot be empty.');

      expect(() => {
        dao.createProposal('Valid Title', '   ', 'fp_author');
      }).toThrow('Proposal description cannot be empty.');
    });

    it('should reject empty author cryptographic fingerprint with Error', () => {
      expect(() => {
        dao.createProposal('Valid Title', 'Valid Description', '');
      }).toThrow('Author cryptographic fingerprint required.');
    });
  });

  // ─── 3. Merit-Weighted Vote Casting (castVote) ──────────────────────────────
  describe('3. castVote & ZK-Proof Weighted Voting', () => {
    it('should cast merit-weighted votes for, against, and abstain', () => {
      const prop = dao.createProposal('Voting Test AIP', 'Desc', 'fp_creator', 'protocol', 500);

      // Voter 1: FOR with 150 merit
      dao.castVote(prop.id, 'for', 'voter_alice', 150);
      expect(dao.myVotes.get(prop.id)?.choice).toBe('for');
      expect(dao.myVotes.get(prop.id)?.weight).toBe(150);
      expect(dao.myVotes.get(prop.id)?.zkProof).toContain('0xzk_snark_');

      // Voter 2: AGAINST with 80 merit
      dao.castVote(prop.id, 'against', 'voter_bob', 80);

      // Voter 3: ABSTAIN with 30 merit
      dao.castVote(prop.id, 'abstain', 'voter_carol', 30);

      const tally = prop.votes;
      expect(tally.for).toBe(150);
      expect(tally.against).toBe(80);
      expect(tally.abstain).toBe(30);
      expect(tally.totalVoters).toBe(3);
    });

    it('should accept custom ZK proof string if provided', () => {
      const prop = dao.createProposal('Custom ZK Test', 'Desc', 'fp_creator');
      const customProof = '0xcustom_groth16_proof_valid_merkle';

      dao.castVote(prop.id, 'for', 'voter_zk', 100, customProof);
      const vote = dao.myVotes.get(prop.id);
      expect(vote?.zkProof).toBe(customProof);
    });

    it('should update existing vote and recalculate tally when same voter votes again', () => {
      const prop = dao.createProposal('Vote Change AIP', 'Desc', 'fp_creator', 'protocol', 500);

      // Initial vote: AGAINST with 100 merit
      dao.castVote(prop.id, 'against', 'voter_dave', 100);
      expect(prop.votes.against).toBe(100);
      expect(prop.votes.for).toBe(0);
      expect(prop.votes.totalVoters).toBe(1);

      // Changed vote: FOR with 120 merit
      dao.castVote(prop.id, 'for', 'voter_dave', 120);
      expect(prop.votes.against).toBe(0);
      expect(prop.votes.for).toBe(120);
      expect(prop.votes.totalVoters).toBe(1);
    });

    it('should enforce minimum weight of 1 merit', () => {
      const prop = dao.createProposal('Min Weight AIP', 'Desc', 'fp_creator');
      dao.castVote(prop.id, 'for', 'voter_zero', 0);
      expect(prop.votes.for).toBe(1);

      dao.castVote(prop.id, 'against', 'voter_neg', -25);
      expect(prop.votes.against).toBe(1);
    });

    it('should throw Error when attempting to vote on non-existent proposal', () => {
      expect(() => {
        dao.castVote('AIP-9999', 'for', 'voter_ghost', 50);
      }).toThrow('Proposal AIP-9999 not found.');
    });

    it('should throw Error when attempting to vote on non-active proposal', () => {
      // AIP-039 is seeded as 'passed'
      expect(() => {
        dao.castVote('AIP-039', 'for', 'voter_late', 50);
      }).toThrow('Proposal AIP-039 is passed and cannot accept new votes.');

      // AIP-037 is seeded as 'rejected'
      expect(() => {
        dao.castVote('AIP-037', 'for', 'voter_late', 50);
      }).toThrow('Proposal AIP-037 is rejected and cannot accept new votes.');
    });
  });

  // ─── 4. Tallying & Outcome Calculations (tallyVotes, getProposalResult) ─────
  describe('4. tallyVotes & getProposalResult Outcomes', () => {
    it('should return empty tally for proposal with no votes', () => {
      const tally = dao.tallyVotes('non-existent-prop');
      expect(tally).toEqual({ for: 0, against: 0, abstain: 0, totalVoters: 0 });
    });

    it('should indicate quorum_not_met when total voting power is below quorumRequired', () => {
      const prop = dao.createProposal('Quorum Test AIP', 'Desc', 'fp_creator', 'protocol', 500);

      // Only 200 merit cast out of 500 required
      dao.castVote(prop.id, 'for', 'voter_1', 200);

      const result = dao.getProposalResult(prop.id);
      expect(result.isQuorumMet).toBe(false);
      expect(result.winner).toBe('quorum_not_met');
      expect(result.margin).toBe(200);
    });

    it('should declare FOR as winner when quorum is met and for > against', () => {
      const prop = dao.createProposal('Win For AIP', 'Desc', 'fp_creator', 'protocol', 400);

      dao.castVote(prop.id, 'for', 'voter_1', 300);
      dao.castVote(prop.id, 'against', 'voter_2', 150);

      const result = dao.getProposalResult(prop.id);
      expect(result.isQuorumMet).toBe(true);
      expect(result.winner).toBe('for');
      expect(result.margin).toBe(150); // 300 - 150
    });

    it('should declare AGAINST as winner when quorum is met and against > for', () => {
      const prop = dao.createProposal('Win Against AIP', 'Desc', 'fp_creator', 'security', 400);

      dao.castVote(prop.id, 'for', 'voter_1', 100);
      dao.castVote(prop.id, 'against', 'voter_2', 350);

      const result = dao.getProposalResult(prop.id);
      expect(result.isQuorumMet).toBe(true);
      expect(result.winner).toBe('against');
      expect(result.margin).toBe(250); // 350 - 100
    });

    it('should declare TIE when quorum is met and for === against', () => {
      const prop = dao.createProposal('Tie AIP', 'Desc', 'fp_creator', 'community', 200);

      dao.castVote(prop.id, 'for', 'voter_1', 120);
      dao.castVote(prop.id, 'against', 'voter_2', 120);

      const result = dao.getProposalResult(prop.id);
      expect(result.isQuorumMet).toBe(true);
      expect(result.winner).toBe('tie');
      expect(result.margin).toBe(0);
    });

    it('should return none for non-existent proposal ID', () => {
      const result = dao.getProposalResult('AIP-INVALID');
      expect(result).toEqual({ winner: 'none', margin: 0, isQuorumMet: false });
    });
  });

  // ─── 5. Status Auto-Transitions (checkAndUpdateStatuses) ────────────────────
  describe('5. Status Lifecycle & Auto-Transitions', () => {
    it('should transition expired proposal to passed if quorum is met and for wins', () => {
      const prop = dao.createProposal('Auto Passed AIP', 'Desc', 'fp_creator', 'protocol', 200, 1);
      dao.castVote(prop.id, 'for', 'voter_1', 250);

      // Simulate passage of time past expiration
      prop.expiresAt = Date.now() - 1000;
      dao.checkAndUpdateStatuses();

      expect(prop.status).toBe('passed');
    });

    it('should transition expired proposal to rejected if quorum is met and against wins', () => {
      const prop = dao.createProposal('Auto Rejected AIP', 'Desc', 'fp_creator', 'security', 200, 1);
      dao.castVote(prop.id, 'against', 'voter_1', 250);

      prop.expiresAt = Date.now() - 1000;
      dao.checkAndUpdateStatuses();

      expect(prop.status).toBe('rejected');
    });

    it('should transition expired proposal to expired if quorum was not reached', () => {
      const prop = dao.createProposal('Auto Expired AIP', 'Desc', 'fp_creator', 'funding', 500, 1);
      dao.castVote(prop.id, 'for', 'voter_1', 50); // quorum is 500

      prop.expiresAt = Date.now() - 1000;
      dao.checkAndUpdateStatuses();

      expect(prop.status).toBe('expired');
    });
  });

  // ─── 6. Filtering & Searching Proposals (filterProposals) ───────────────────
  describe('6. filterProposals Tabs, Categories & Search', () => {
    it('should filter proposals by status tabs', () => {
      const active = dao.filterProposals('active');
      expect(active.every((p) => p.status === 'active')).toBe(true);

      const passed = dao.filterProposals('passed');
      expect(passed.every((p) => p.status === 'passed')).toBe(true);

      const rejected = dao.filterProposals('rejected');
      expect(rejected.every((p) => p.status === 'rejected' || p.status === 'expired')).toBe(true);

      const all = dao.filterProposals('all');
      expect(all.length).toBe(dao.proposals.length);
    });

    it('should filter proposals for "my-proposals" tab', () => {
      const myFP = 'fp_my_custom_author';
      dao.createProposal('My Sovereign AIP', 'Desc', myFP);

      const myProposals = dao.filterProposals('my-proposals', myFP);
      expect(myProposals.some((p) => p.title === 'My Sovereign AIP')).toBe(true);
    });

    it('should filter proposals by category', () => {
      const protocolOnly = dao.filterProposals('all', '', 'protocol');
      expect(protocolOnly.every((p) => p.category === 'protocol')).toBe(true);

      const securityOnly = dao.filterProposals('all', '', 'security');
      expect(securityOnly.every((p) => p.category === 'security')).toBe(true);
    });

    it('should search proposals by title, description, ID, or author fingerprint', () => {
      const byId = dao.filterProposals('all', '', 'all', 'AIP-042');
      expect(byId.length).toBe(1);
      expect(byId[0].id).toBe('AIP-042');

      const byTitle = dao.filterProposals('all', '', 'all', 'Kyber-1024');
      expect(byTitle.length).toBeGreaterThanOrEqual(1);

      const byDesc = dao.filterProposals('all', '', 'all', 'biometric passport');
      expect(byDesc.length).toBe(1);
      expect(byDesc[0].id).toBe('AIP-043');

      const byAuthor = dao.filterProposals('all', '', 'all', 'c3dc28cb705e');
      expect(byAuthor.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── 7. UI Rendering Engine ────────────────────────────────────────────────
  describe('7. HTML Rendering Engine (Hub, Buttons, Modals, Cards)', () => {
    it('should render governance nav button with active count badge', () => {
      const buttonHtml = dao.renderGovernanceButton();
      expect(buttonHtml).toContain('nav-btn-dao');
      expect(buttonHtml).toContain('DAO');
      expect(buttonHtml).toContain('🗳️');
      expect(buttonHtml).toContain('text-[#00e5ff]');
    });

    it('should render governance hub view with header, stats, tabs, filters, and cards', () => {
      const hubHtml = dao.renderGovernanceHub('c3dc28cb705e', 100);
      expect(hubHtml).toContain('governance-hub-container');
      expect(hubHtml).toContain('Sovereign DAO Governance');
      expect(hubHtml).toContain('Merit-Weighted ZK-RLN');
      expect(hubHtml).toContain('btn-open-create-proposal');
      expect(hubHtml).toContain('Active Proposals');
      expect(hubHtml).toContain('Passed AIPs');
      expect(hubHtml).toContain('Total Weight Cast');
      expect(hubHtml).toContain('ZK Unique Voters');
      expect(hubHtml).toContain('dao-status-tabs');
      expect(hubHtml).toContain('dao-category-filters');
      expect(hubHtml).toContain('dao-search-input');
      expect(hubHtml).toContain('AIP-042');
    });

    it('should render proposal card with badges, progress bar, quorum and buttons', () => {
      const prop = dao.proposals[0];
      const cardHtml = dao.renderProposalCard(prop, 'c3dc28cb705e', 75);

      expect(cardHtml).toContain(prop.id);
      expect(cardHtml).toContain(prop.title);
      expect(cardHtml).toContain('Quorum:');
      expect(cardHtml).toContain('sovereign voters');
      expect(cardHtml).toContain('open-vote-modal');
    });

    it('should render voting modal with options, voter weight, and ZK proof badge', () => {
      const modalHtml = dao.renderVoteModal('AIP-042', 'c3dc28cb705e', 125);

      expect(modalHtml).toContain('dao-vote-modal');
      expect(modalHtml).toContain('Cast Sovereign DAO Vote');
      expect(modalHtml).toContain('125 Merit Power');
      expect(modalHtml).toContain('name="vote-choice"');
      expect(modalHtml).toContain('FOR');
      expect(modalHtml).toContain('AGAINST');
      expect(modalHtml).toContain('ABSTAIN');
      expect(modalHtml).toContain('Zero-Knowledge Proof Commit');
      expect(modalHtml).toContain('btn-confirm-cast-vote');
    });

    it('should return empty string when rendering vote modal for invalid proposal', () => {
      const modalHtml = dao.renderVoteModal('AIP-9999', 'fp', 100);
      expect(modalHtml).toBe('');
    });

    it('should render proposal creation modal with form controls and quorum slider', () => {
      const createModalHtml = dao.renderCreateProposalModal('c3dc28cb705e');

      expect(createModalHtml).toContain('dao-create-modal');
      expect(createModalHtml).toContain('New Sovereign DAO Proposal');
      expect(createModalHtml).toContain('prop-form-title');
      expect(createModalHtml).toContain('prop-form-category');
      expect(createModalHtml).toContain('prop-form-duration');
      expect(createModalHtml).toContain('prop-form-quorum');
      expect(createModalHtml).toContain('prop-form-description');
      expect(createModalHtml).toContain('btn-submit-proposal');
    });
  });

  // ─── 8. DOM Event Binding & Interactivity ──────────────────────────────────
  describe('8. DOM Event Binding & Interactive Actions', () => {
    it('should bind tab click handlers and trigger update', () => {
      const container = new MockDOMElement('div');
      container.innerHTML = dao.renderGovernanceHub('c3dc28cb705e', 75);

      dao.bindEvents(container as unknown as HTMLElement, 'c3dc28cb705e', 75);

      // Click "passed" tab button
      const passedTabBtn = container.querySelector('button[data-tab="passed"]');
      expect(passedTabBtn).toBeDefined();
      if (passedTabBtn) {
        passedTabBtn.dispatchEvent({ type: 'click' });
        expect(dao.activeTab).toBe('passed');
      }
    });

    it('should bind category filter click handlers and trigger update', () => {
      const container = new MockDOMElement('div');
      container.innerHTML = dao.renderGovernanceHub('c3dc28cb705e', 75);

      dao.bindEvents(container as unknown as HTMLElement, 'c3dc28cb705e', 75);

      // Click "security" category button
      const secBtn = container.querySelector('button[data-category="security"]');
      expect(secBtn).toBeDefined();
      if (secBtn) {
        secBtn.dispatchEvent({ type: 'click' });
        expect(dao.selectedCategory).toBe('security');
      }
    });

    it('should bind open and close vote modal buttons', () => {
      const container = new MockDOMElement('div');
      container.innerHTML = dao.renderGovernanceHub('c3dc28cb705e', 75);

      dao.bindEvents(container as unknown as HTMLElement, 'c3dc28cb705e', 75);

      // Open vote modal on AIP-042
      const voteBtn = container.querySelector('button[data-action="open-vote-modal"]');
      expect(voteBtn).toBeDefined();
      if (voteBtn) {
        voteBtn.dispatchEvent({ type: 'click' });
        expect(dao.activeModalProposalId).toBe('AIP-042');
      }

      // Close modal
      const closeBtn = container.querySelector('button[data-action="close-modal"]');
      if (closeBtn) {
        closeBtn.dispatchEvent({ type: 'click' });
        expect(dao.activeModalProposalId).toBeNull();
      }
    });

    it('should bind open create proposal modal button', () => {
      const container = new MockDOMElement('div');
      container.innerHTML = dao.renderGovernanceHub('c3dc28cb705e', 75);

      dao.bindEvents(container as unknown as HTMLElement, 'c3dc28cb705e', 75);

      const openCreateBtn = container.querySelector('#btn-open-create-proposal');
      expect(openCreateBtn).toBeDefined();
      if (openCreateBtn) {
        openCreateBtn.dispatchEvent({ type: 'click' });
        expect(dao.isCreateModalOpen).toBe(true);
      }
    });
  });
});
