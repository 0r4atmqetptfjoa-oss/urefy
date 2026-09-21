// ===========================================================================
// UREfy — PASS 9.1: COGNITIVE & INTERACTION TIMING MODEL
// Measures realistic human cognitive pacing and distinguishes:
//   - Automation Execution Time (wall-clock Playwright execution)
//   - Simulated Human Interaction / Decision Time (reading, deliberation, typing)
// Detects natural behavioral hesitation (backtracks, alternative evaluations)
// ===========================================================================

export class CognitiveModel {
  constructor(persona) {
    this.persona = persona;
    // Reading speed based on technical literacy
    const literacy = persona.technicalLiteracy;
    this.wordsPerMinute = literacy === 'very-low' ? 140 :
                          literacy === 'low' ? 180 :
                          literacy === 'medium' ? 220 : 280;
    this.visualGlanceSec = literacy === 'very-low' ? 4.5 :
                           literacy === 'low' ? 3.0 : 1.8;
    this.deliberationBaselineSec = literacy === 'very-low' ? 8.0 :
                                   literacy === 'low' ? 5.5 :
                                   literacy === 'medium' ? 3.5 : 2.0;

    this.interactionDecisionTimeSec = 0;
    this.hesitationEvents = [];
    this.backtrackCount = 0;
  }

  /**
   * Models the human time required to inspect and read a piece of UI copy
   */
  simulateReading(text) {
    if (!text || typeof text !== 'string') return 1.0;
    const words = text.trim().split(/\s+/).length;
    const readSeconds = Number(((words / this.wordsPerMinute) * 60).toFixed(1));
    const totalTime = Math.max(this.visualGlanceSec, readSeconds);
    this.interactionDecisionTimeSec += totalTime;
    return totalTime;
  }

  /**
   * Models human decision deliberation when choosing among alternative actions
   */
  simulateDeliberation(alternativeCount = 2, complexity = 'normal') {
    const multiplier = complexity === 'complex' ? 2.0 : complexity === 'simple' ? 0.6 : 1.0;
    const deliberationTime = Number((this.deliberationBaselineSec * Math.log2(alternativeCount + 1) * multiplier).toFixed(1));
    this.interactionDecisionTimeSec += deliberationTime;
    return deliberationTime;
  }

  /**
   * Models typing time based on character count
   */
  simulateTyping(text) {
    if (!text) return 0.5;
    const charCount = text.length;
    // 30 - 60 WPM => ~2.5 - 5 chars per second
    const charsPerSec = this.persona.technicalLiteracy === 'very-low' ? 2.0 :
                        this.persona.technicalLiteracy === 'low' ? 3.0 : 5.0;
    const typeTime = Number((charCount / charsPerSec).toFixed(1));
    this.interactionDecisionTimeSec += typeTime;
    return typeTime;
  }

  /**
   * Records a behavioral hesitation event
   */
  recordHesitation(screen, reason, alternativesTried = []) {
    const event = {
      screen,
      reason,
      alternativesTried,
      timestamp: Date.now(),
      hesitationTimeSec: this.simulateDeliberation(Math.max(2, alternativesTried.length), 'complex'),
    };
    this.hesitationEvents.push(event);
    return event;
  }

  /**
   * Records a user backtrack (e.g. Browser Back or Modal Dismiss)
   */
  recordBacktrack(fromScreen, toScreen, reason) {
    this.backtrackCount++;
    this.interactionDecisionTimeSec += 2.5;
    return {
      type: 'BACKTRACK',
      from: fromScreen,
      to: toScreen,
      reason,
      timestamp: Date.now(),
    };
  }

  getTotalInteractionTimeSec() {
    return Number(this.interactionDecisionTimeSec.toFixed(1));
  }
}
