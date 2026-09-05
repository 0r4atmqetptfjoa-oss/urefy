import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SettingsView, settingsView, SETTINGS_SECTIONS } from '../src/settings-view.js';
import { serviceRegistry, SERVICES } from '../src/service-registry.js';
import { ProfileView } from '../src/profile-view.js';

describe('Unified Sovereign Settings Screen (SettingsView)', () => {
  let view: SettingsView;
  const originalWindow = globalThis.window;

  beforeEach(() => {
    globalThis.window = {
      dispatchEvent: () => true,
      clientStore: null,
      customThemeBuilder: { openModal: () => {} },
    } as any;
    view = new SettingsView();
    settingsView.registerGlobalWindow();
    view.close();
    view.activeTab = 'appearance';
  });

  afterEach(() => {
    view.close();
    globalThis.window = originalWindow;
  });

  it('1. should initialize with default closed state and appearance tab', () => {
    expect(view.isOpen).toBe(false);
    expect(view.activeTab).toBe('appearance');
    expect(settingsView).toBeInstanceOf(SettingsView);
  });

  it('2. should export SETTINGS_SECTIONS with all 5 sovereign sections', () => {
    expect(SETTINGS_SECTIONS).toHaveLength(5);

    const ids = SETTINGS_SECTIONS.map((s) => s.id);
    expect(ids).toEqual(['appearance', 'preferences', 'footprint', 'backup', 'telemetry']);

    const appearance = SETTINGS_SECTIONS.find((s) => s.id === 'appearance')!;
    expect(appearance.label).toBe('Appearance & Themes');
    expect(appearance.icon).toBe('🎨');
    expect(appearance.description).toBe('Color palettes, OLED mode, and typography');

    const preferences = SETTINGS_SECTIONS.find((s) => s.id === 'preferences')!;
    expect(preferences.label).toBe('Network & WoT Preferences');
    expect(preferences.icon).toBe('⚙️');
    expect(preferences.description).toBe('Web-of-Trust badges, merit thresholds, and AI assistant');

    const footprint = SETTINGS_SECTIONS.find((s) => s.id === 'footprint')!;
    expect(footprint.label).toBe('Storage & Footprint');
    expect(footprint.icon).toBe('📊');
    expect(footprint.description).toBe('Local storage audit, zero tracking, and efficiency');

    const backup = SETTINGS_SECTIONS.find((s) => s.id === 'backup')!;
    expect(backup.label).toBe('Backup & Account Export');
    expect(backup.icon).toBe('💾');
    expect(backup.description).toBe('Encrypted backups and cryptographic key restoration');

    const telemetry = SETTINGS_SECTIONS.find((s) => s.id === 'telemetry')!;
    expect(telemetry.label).toBe('Diagnostics & Privacy');
    expect(telemetry.icon).toBe('🛡️');
    expect(telemetry.description).toBe('Local error telemetry and zero-knowledge memory wipe');
  });

  it('3. should open, close, and toggle modal state correctly', () => {
    expect(view.isOpen).toBe(false);

    // Open default
    view.open();
    expect(view.isOpen).toBe(true);
    expect(view.activeTab).toBe('appearance');

    // Close
    view.close();
    expect(view.isOpen).toBe(false);

    // Open with initial tab
    view.open('preferences');
    expect(view.isOpen).toBe(true);
    expect(view.activeTab).toBe('preferences');

    // Toggle to close
    view.toggle();
    expect(view.isOpen).toBe(false);

    // Toggle to open with tab
    view.toggle('telemetry');
    expect(view.isOpen).toBe(true);
    expect(view.activeTab).toBe('telemetry');
  });

  it('4. should switch active tabs via setActiveTab', () => {
    view.setActiveTab('footprint');
    expect(view.activeTab).toBe('footprint');

    view.setActiveTab('backup');
    expect(view.activeTab).toBe('backup');

    view.setActiveTab('telemetry');
    expect(view.activeTab).toBe('telemetry');

    view.setActiveTab('appearance');
    expect(view.activeTab).toBe('appearance');

    // Invalid tab ignored
    view.setActiveTab('invalid-tab' as any);
    expect(view.activeTab).toBe('appearance');
  });

  it('5. should expose global window hooks for settings management', () => {
    expect(typeof (window as any).__aetheris_open_settings).toBe('function');
    expect(typeof (window as any).__aetheris_close_settings).toBe('function');
    expect((window as any).settingsView).toBeDefined();

    // Call open via window helper
    (window as any).__aetheris_open_settings('footprint');
    expect(settingsView.isOpen).toBe(true);
    expect(settingsView.activeTab).toBe('footprint');

    // Call close via window helper
    (window as any).__aetheris_close_settings();
    expect(settingsView.isOpen).toBe(false);
  });

  it('6. should render modal shell with backdrop, header, title, close button, and tab buttons', () => {
    const html = view.renderSettingsModal();

    expect(html).toContain('fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md');
    expect(html).toContain('id="unified-settings-modal"');
    expect(html).toContain('⚙️ Sovereign Settings');
    expect(html).toContain('id="btn-close-settings-modal"');
    expect(html).toContain('window.__aetheris_close_settings()');

    // Tab buttons
    expect(html).toContain('data-settings-tab="appearance"');
    expect(html).toContain('data-settings-tab="preferences"');
    expect(html).toContain('data-settings-tab="footprint"');
    expect(html).toContain('data-settings-tab="backup"');
    expect(html).toContain('data-settings-tab="telemetry"');
  });

  it('7. should render appearance tab with theme switcher, OLED toggle, font toggle, and Custom Theme Studio launcher', () => {
    view.setActiveTab('appearance');
    const html = view.renderSettingsModal();

    // Theme switcher
    expect(html).toContain('id="settings-theme-switcher"');
    expect(html).toContain('theme-card-obsidian-cyber');
    expect(html).toContain('theme-card-matrix-monolith');
    expect(html).toContain('theme-card-tokyo-neon');

    // OLED mode toggle
    expect(html).toContain('id="toggle-oled-mode"');

    // Font family controls
    expect(html).toContain('id="settings-font-family-controls"');
    expect(html).toContain('id="btn-font-sans"');
    expect(html).toContain('id="btn-font-mono"');

    // Custom Theme Studio launcher button
    expect(html).toContain('id="btn-settings-open-theme-builder"');
    expect(html).toContain('window.customThemeBuilder.openModal()');
  });

  it('8. should render preferences tab with WoT badges, demote low trust, merit threshold, proactive AI, and zen mode', () => {
    view.setActiveTab('preferences');
    const html = view.renderSettingsModal();

    // WoT badges toggle
    expect(html).toContain('id="toggle-wot-badges"');

    // Demote low trust toggle
    expect(html).toContain('id="toggle-demote-low-trust"');

    // Merit threshold slider and display
    expect(html).toContain('id="slider-merit-threshold"');
    expect(html).toContain('id="merit-threshold-value"');

    // Proactive AI toggle
    expect(html).toContain('id="toggle-proactive-ai"');

    // Zen mode toggle
    expect(html).toContain('id="toggle-zen-mode"');
  });

  it('9. should embed sovereignFootprint in footprint tab', () => {
    view.setActiveTab('footprint');
    const html = view.renderSettingsModal();

    expect(html).toContain('id="sovereign-footprint-section"');
    expect(html).toContain('0 TRACKERS · 100% PRIVATE');
    expect(html).toContain('Sovereign Footprint & Privacy Audit');
    expect(html).toContain('btn-export-footprint-audit');
  });

  it('10. should embed exportBackup in backup tab', () => {
    view.setActiveTab('backup');
    const html = view.renderSettingsModal();

    expect(html).toContain('id="aetheris-export-backup-container"');
    expect(html).toContain('btn-run-export');
    expect(html).toContain('aether-backup-dropzone');
    expect(html).toContain('chk-export-posts');
  });

  it('11. should embed localDiagnostics in telemetry tab', () => {
    view.setActiveTab('telemetry');
    const html = view.renderSettingsModal();

    expect(html).toContain('id="local-diagnostics-section"');
    expect(html).toContain('100% ON-DEVICE · 0 TRACKERS');
    expect(html).toContain('id="toggle-local-diagnostics"');
    expect(html).toContain('id="btn-export-diagnostics-report"');
  });

  it('12. should integrate with profile view action buttons via #btn-profile-settings', () => {
    const profile = new ProfileView();
    const html = profile.renderProfileView([], 'genesis-core');

    expect(html).toContain('id="btn-profile-settings"');
    expect(html).toContain('window.__aetheris_open_settings()');
    expect(html).toContain('Settings');
  });

  it('13. should be registered in serviceRegistry with SERVICES.SettingsView token', () => {
    const resolved = serviceRegistry.resolve(SERVICES.SettingsView);
    expect(resolved).toBeDefined();
    expect(resolved).toBe(settingsView);
  });
});
