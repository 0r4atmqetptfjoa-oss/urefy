/**
 * @file ui/primitives.ts
 * @package @aetheris/client-ui
 * @description 2027 Sovereign Design System Primitives.
 * Strictly XSS-escaped, CSP-compliant (zero inline event handlers), WCAG 2.2 AA focus rings,
 * full interactive state matrix (default, hover, active, focus-visible, disabled, loading),
 * and tabular-nums alignment for data tables and metrics.
 */

import { renderIcon, IconName } from './icons.js';
import { TYPOGRAPHY } from './tokens.js';

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export interface ButtonProps {
  id?: string;
  label?: string;
  icon?: IconName;
  iconPosition?: 'left' | 'right';
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  ariaLabel?: string;
  dataAction?: string;
  dataId?: string;
}

export function renderButton(props: ButtonProps): string {
  const {
    id = '',
    label = '',
    icon,
    iconPosition = 'left',
    variant = 'secondary',
    size = 'md',
    type = 'button',
    className = '',
    disabled = false,
    loading = false,
    ariaLabel = label,
    dataAction = '',
    dataId = '',
  } = props;

  const isDisabled = disabled || loading;

  // Universal state matrix: default, hover, active, focus-visible (box-shadow ring), disabled, loading
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-150 cursor-pointer select-none active:translate-y-[1px] disabled:opacity-45 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--color-bg,#0b0f17),0_0_0_4px_var(--color-accent,#14b8a6)]';

  const sizeStyles = {
    sm: 'px-2.5 py-1 text-xs gap-1.5 min-h-[32px]',
    md: 'px-4 py-2 text-sm gap-2 min-h-[44px]',
    lg: 'px-5 py-2.5 text-base gap-2.5 min-h-[48px]',
  }[size];

  const variantStyles = {
    primary:
      'bg-[var(--color-accent,oklch(0.76_0.14_192))] hover:brightness-110 active:brightness-95 text-slate-950 font-semibold border border-transparent',
    secondary:
      'bg-surface-raised hover:bg-surface-overlay active:bg-surface-base text-slate-100 border border-white/10 hover:border-white/20',
    accent:
      'bg-[var(--color-accent,oklch(0.76_0.14_192))] hover:brightness-110 active:brightness-95 text-slate-950 font-semibold border border-transparent',
    ghost:
      'bg-transparent hover:bg-white/[0.06] active:bg-white/[0.1] text-slate-300 hover:text-white border border-transparent',
    danger:
      'bg-rose-500/12 hover:bg-rose-500/22 active:bg-rose-500/30 text-rose-300 border border-rose-500/30 hover:border-rose-400/50',
    outline:
      'bg-transparent border border-white/15 hover:border-white/35 active:bg-white/5 text-slate-200 hover:text-white',
  }[variant];

  const spinnerSvg = `<svg class="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"></circle><path class="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"></path></svg>`;
  const iconSvg = loading
    ? spinnerSvg
    : icon
    ? renderIcon(icon, { size: size === 'sm' ? 14 : size === 'lg' ? 20 : 16 })
    : '';

  const safeLabel = escapeHtml(label);
  const content =
    iconPosition === 'right'
      ? `<span>${safeLabel}</span>${iconSvg}`
      : `${iconSvg}<span>${safeLabel}</span>`;

  const idAttr = id ? `id="${escapeHtml(id)}"` : '';
  const actionAttr = dataAction ? `data-action="${escapeHtml(dataAction)}"` : '';
  const dataIdAttr = dataId ? `data-id="${escapeHtml(dataId)}"` : '';
  const disabledAttr = isDisabled ? 'disabled' : '';
  const busyAttr = loading ? 'aria-busy="true"' : '';

  return `<button type="${type}" ${idAttr} ${actionAttr} ${dataIdAttr} ${disabledAttr} ${busyAttr} aria-label="${escapeHtml(ariaLabel)}" class="${baseStyles} ${sizeStyles} ${variantStyles} ${className}">${content}</button>`;
}

export interface IconButtonProps {
  id?: string;
  icon: IconName;
  label: string;
  variant?: 'ghost' | 'secondary' | 'danger' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  dataAction?: string;
  dataId?: string;
}

export function renderIconButton(props: IconButtonProps): string {
  const {
    id = '',
    icon,
    label,
    variant = 'ghost',
    size = 'md',
    className = '',
    disabled = false,
    dataAction = '',
    dataId = '',
  } = props;

  const sizeStyles = {
    sm: 'w-8 h-8 min-h-[32px] min-w-[32px] p-1 text-xs',
    md: 'w-11 h-11 min-h-[44px] min-w-[44px] p-2',
    lg: 'w-12 h-12 min-h-[48px] min-w-[48px] p-3',
  }[size];

  const variantStyles = {
    ghost: 'text-slate-400 hover:text-white hover:bg-white/[0.06] active:bg-white/10',
    secondary: 'bg-surface-raised text-slate-200 hover:text-white hover:bg-surface-overlay border border-white/10',
    danger: 'text-rose-400 hover:bg-rose-500/15 hover:text-rose-300',
    primary: 'bg-[var(--color-accent,oklch(0.76_0.14_192))] hover:brightness-110 text-slate-950 font-bold',
  }[variant];

  const idAttr = id ? `id="${escapeHtml(id)}"` : '';
  const actionAttr = dataAction ? `data-action="${escapeHtml(dataAction)}"` : '';
  const dataIdAttr = dataId ? `data-id="${escapeHtml(dataId)}"` : '';
  const disabledAttr = disabled ? 'disabled' : '';
  const safeLabel = escapeHtml(label);

  return `<button type="button" ${idAttr} ${actionAttr} ${dataIdAttr} ${disabledAttr} aria-label="${safeLabel}" title="${safeLabel}" class="inline-flex items-center justify-center rounded-lg transition-colors duration-150 cursor-pointer select-none active:translate-y-[1px] disabled:opacity-45 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--color-bg,#0b0f17),0_0_0_4px_var(--color-accent,#14b8a6)] ${sizeStyles} ${variantStyles} ${className}">
    ${renderIcon(icon, { size: size === 'sm' ? 14 : size === 'lg' ? 22 : 18 })}
  </button>`;
}

export interface InputProps {
  id: string;
  name?: string;
  label?: string;
  placeholder?: string;
  value?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'search' | 'url' | 'tel';
  helperText?: string;
  error?: string;
  icon?: IconName;
  className?: string;
  required?: boolean;
  autocomplete?: string;
}

export function renderInput(props: InputProps): string {
  const {
    id,
    name = id,
    label = '',
    placeholder = '',
    value = '',
    type = 'text',
    helperText = '',
    error = '',
    icon,
    className = '',
    required = false,
    autocomplete = 'off',
  } = props;

  const safeId = escapeHtml(id);
  const errorId = `${safeId}-error`;
  const helperId = `${safeId}-helper`;

  const iconSvg = icon
    ? `<div class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">${renderIcon(icon, { size: 16 })}</div>`
    : '';

  const paddingLeft = icon ? 'pl-10' : 'pl-3.5';
  const borderStyle = error
    ? 'border-rose-500 focus-visible:shadow-[0_0_0_2px_var(--color-bg,#0b0f17),0_0_0_4px_oklch(0.66_0.2_22)]'
    : 'border-white/12 focus-visible:border-[var(--color-accent,oklch(0.76_0.14_192))] focus-visible:shadow-[0_0_0_2px_var(--color-bg,#0b0f17),0_0_0_4px_var(--color-accent,oklch(0.76_0.14_192))]';

  const describedBy = error ? `aria-invalid="true" aria-describedby="${errorId}"` : helperText ? `aria-describedby="${helperId}"` : '';

  return `
    <div class="flex flex-col gap-1.5 w-full ${className}">
      ${label ? `<label for="${safeId}" class="${TYPOGRAPHY.label}">${escapeHtml(label)}${required ? ' <span class="text-rose-400" aria-hidden="true">*</span>' : ''}</label>` : ''}
      <div class="relative w-full">
        ${iconSvg}
        <input
          id="${safeId}"
          name="${escapeHtml(name)}"
          type="${type}"
          value="${escapeHtml(value)}"
          placeholder="${escapeHtml(placeholder)}"
          autocomplete="${escapeHtml(autocomplete)}"
          ${required ? 'required' : ''}
          ${describedBy}
          class="w-full ${paddingLeft} pr-3.5 py-2.5 min-h-[44px] bg-surface-base rounded-lg border ${borderStyle} text-slate-100 placeholder-slate-500 text-base sm:text-sm transition-shadow focus:outline-none"
        />
      </div>
      ${
        error
          ? `<p id="${errorId}" role="alert" class="text-xs text-rose-400 flex items-center gap-1.5">${renderIcon('alert', { size: 12 })}<span>${escapeHtml(error)}</span></p>`
          : helperText
          ? `<p id="${helperId}" class="${TYPOGRAPHY.caption}">${escapeHtml(helperText)}</p>`
          : ''
      }
    </div>
  `;
}

export interface BadgeProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'accent' | 'mono';
  icon?: IconName;
  className?: string;
}

export function renderBadge(props: BadgeProps): string {
  const { label, variant = 'default', icon, className = '' } = props;

  const variantStyles = {
    default: 'bg-white/[0.05] text-slate-300 border-white/10',
    success: 'bg-emerald-500/12 text-emerald-300 border-emerald-500/30',
    warning: 'bg-amber-500/12 text-amber-300 border-amber-500/30',
    danger: 'bg-rose-500/12 text-rose-300 border-rose-500/30',
    accent: 'bg-cyan-500/12 text-cyan-300 border-cyan-500/30',
    mono: 'bg-surface-raised text-slate-200 border-white/12 font-mono tabular-nums text-[10px]',
  }[variant];

  const iconSvg = icon ? renderIcon(icon, { size: 12 }) : '';

  return `<span class="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm border tabular-nums ${variantStyles} ${className}">
    ${iconSvg}<span>${escapeHtml(label)}</span>
  </span>`;
}

export interface CardProps {
  id?: string;
  title?: string;
  subtitle?: string;
  content: string;
  footer?: string;
  className?: string;
  interactive?: boolean;
}

export function renderCard(props: CardProps): string {
  const { id = '', title = '', subtitle = '', content, footer = '', className = '', interactive = false } = props;
  const hoverStyle = interactive ? 'hover:border-white/25 transition-colors cursor-pointer' : '';
  const idAttr = id ? `id="${escapeHtml(id)}"` : '';

  return `
    <div ${idAttr} class="rounded-xl border border-white/10 bg-surface-base p-5 ${hoverStyle} ${className}">
      ${
        title || subtitle
          ? `
        <div class="mb-4">
          ${title ? `<h3 class="${TYPOGRAPHY.sectionTitle}">${escapeHtml(title)}</h3>` : ''}
          ${subtitle ? `<p class="${TYPOGRAPHY.bodySecondary} mt-0.5">${escapeHtml(subtitle)}</p>` : ''}
        </div>
      `
          : ''
      }
      <div class="space-y-3">${content}</div>
      ${footer ? `<div class="mt-4 pt-4 border-t border-white/8 flex items-center justify-between text-xs text-slate-400 tabular-nums">${footer}</div>` : ''}
    </div>
  `;
}

export interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}

export function renderSkeleton(props: SkeletonProps = {}): string {
  const { width = 'w-full', height = 'h-4', className = '', rounded = 'md' } = props;
  const roundStyle = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  }[rounded];

  return `<div aria-hidden="true" class="animate-pulse bg-white/[0.06] ${width} ${height} ${roundStyle} ${className}"></div>`;
}

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description: string;
  actionLabel?: string;
  actionAction?: string;
  actionId?: string;
  className?: string;
}

export function renderEmptyState(props: EmptyStateProps): string {
  const { icon = 'info', title, description, actionLabel = '', actionAction = '', actionId = '', className = '' } = props;

  return `
    <div class="flex flex-col items-center justify-center text-center p-8 md:p-12 rounded-xl border border-dashed border-white/12 bg-surface-base/50 my-4 ${className}">
      <div class="w-12 h-12 rounded-xl bg-surface-raised flex items-center justify-center text-slate-300 mb-4 border border-white/10">
        ${renderIcon(icon, { size: 24 })}
      </div>
      <h3 class="text-base font-semibold text-slate-100 mb-1.5">${escapeHtml(title)}</h3>
      <p class="text-xs text-slate-400 max-w-sm leading-relaxed mb-5">${escapeHtml(description)}</p>
      ${actionLabel ? renderButton({ label: actionLabel, dataAction: actionAction, id: actionId, variant: 'secondary', size: 'sm' }) : ''}
    </div>
  `;
}

export interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'idle' | 'dnd' | 'syncing';
  label?: string;
  showPing?: boolean;
}

export function renderStatusIndicator(props: StatusIndicatorProps): string {
  const { status, label, showPing = false } = props;

  const colorMap = {
    online: 'bg-emerald-400',
    offline: 'bg-slate-500',
    idle: 'bg-amber-400',
    dnd: 'bg-rose-400',
    syncing: 'bg-cyan-400',
  }[status];

  const ping =
    showPing && (status === 'online' || status === 'syncing')
      ? `<span class="animate-ping absolute inline-flex h-full w-full rounded-full ${colorMap} opacity-75"></span>`
      : '';

  return `
    <span class="inline-flex items-center gap-2">
      <span class="relative flex h-2.5 w-2.5" aria-hidden="true">
        ${ping}
        <span class="relative inline-flex rounded-full h-2.5 w-2.5 ${colorMap}"></span>
      </span>
      ${label ? `<span class="text-xs text-slate-300">${escapeHtml(label)}</span>` : `<span class="sr-only">${status}</span>`}
    </span>
  `;
}

export interface TextareaProps {
  id: string;
  name?: string;
  label?: string;
  placeholder?: string;
  value?: string;
  rows?: number;
  helperText?: string;
  error?: string;
  className?: string;
  required?: boolean;
}

export function renderTextarea(props: TextareaProps): string {
  const {
    id,
    name = id,
    label = '',
    placeholder = '',
    value = '',
    rows = 3,
    helperText = '',
    error = '',
    className = '',
    required = false,
  } = props;

  const safeId = escapeHtml(id);
  const borderStyle = error
    ? 'border-rose-500 focus-visible:shadow-[0_0_0_2px_var(--color-bg,#0b0f17),0_0_0_4px_oklch(0.66_0.2_22)]'
    : 'border-white/12 focus-visible:border-[var(--color-accent,oklch(0.76_0.14_192))] focus-visible:shadow-[0_0_0_2px_var(--color-bg,#0b0f17),0_0_0_4px_var(--color-accent,oklch(0.76_0.14_192))]';

  return `
    <div class="flex flex-col gap-1.5 w-full ${className}">
      ${label ? `<label for="${safeId}" class="${TYPOGRAPHY.label}">${escapeHtml(label)}${required ? ' <span class="text-rose-400" aria-hidden="true">*</span>' : ''}</label>` : ''}
      <textarea
        id="${safeId}"
        name="${escapeHtml(name)}"
        rows="${rows}"
        placeholder="${escapeHtml(placeholder)}"
        ${required ? 'required' : ''}
        class="w-full px-3.5 py-2.5 bg-surface-base rounded-lg border ${borderStyle} text-slate-100 placeholder-slate-500 text-base sm:text-sm transition-shadow focus:outline-none resize-none"
      >${escapeHtml(value)}</textarea>
      ${
        error
          ? `<p role="alert" class="text-xs text-rose-400 flex items-center gap-1.5">${renderIcon('alert', { size: 12 })}<span>${escapeHtml(error)}</span></p>`
          : helperText
          ? `<p class="${TYPOGRAPHY.caption}">${escapeHtml(helperText)}</p>`
          : ''
      }
    </div>
  `;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  id: string;
  label?: string;
  options: SelectOption[];
  selectedValue?: string;
  className?: string;
  dataAction?: string;
}

export function renderSelect(props: SelectProps): string {
  const { id, label = '', options, selectedValue = '', className = '', dataAction = '' } = props;
  const safeId = escapeHtml(id);
  const actionAttr = dataAction ? `data-action="${escapeHtml(dataAction)}"` : '';

  return `
    <div class="flex flex-col gap-1.5 w-full ${className}">
      ${label ? `<label for="${safeId}" class="${TYPOGRAPHY.label}">${escapeHtml(label)}</label>` : ''}
      <select
        id="${safeId}"
        ${actionAttr}
        class="w-full px-3.5 py-2.5 min-h-[44px] bg-surface-base rounded-lg border border-white/12 text-slate-100 text-sm focus-visible:outline-none focus-visible:border-[var(--color-accent,oklch(0.76_0.14_192))] transition-colors cursor-pointer"
      >
        ${options
          .map(
            (opt) => `
          <option value="${escapeHtml(opt.value)}" ${opt.value === selectedValue ? 'selected' : ''}>
            ${escapeHtml(opt.label)}
          </option>
        `
          )
          .join('')}
      </select>
    </div>
  `;
}

export interface ToggleProps {
  id: string;
  label: string;
  checked?: boolean;
  description?: string;
  disabled?: boolean;
  className?: string;
  dataAction?: string;
}

export function renderToggle(props: ToggleProps): string {
  const { id, label, checked = false, description = '', disabled = false, className = '', dataAction = '' } = props;
  const safeId = escapeHtml(id);
  const actionAttr = dataAction ? `data-action="${escapeHtml(dataAction)}"` : '';

  return `
    <label for="${safeId}" class="flex items-start justify-between gap-4 p-3 rounded-xl bg-surface-base border border-white/8 hover:border-white/15 transition-colors cursor-pointer select-none ${className}">
      <div class="space-y-0.5">
        <div class="text-xs font-semibold text-slate-100">${escapeHtml(label)}</div>
        ${description ? `<p class="text-[11px] text-slate-400 leading-relaxed">${escapeHtml(description)}</p>` : ''}
      </div>
      <div class="relative inline-flex items-center shrink-0 min-h-[44px]">
        <input
          type="checkbox"
          role="switch"
          id="${safeId}"
          aria-checked="${checked ? 'true' : 'false'}"
          ${actionAttr}
          ${checked ? 'checked' : ''}
          ${disabled ? 'disabled' : ''}
          class="sr-only peer"
        />
        <div class="w-11 h-6 bg-surface-raised peer-focus-visible:shadow-[0_0_0_2px_var(--color-bg,#0b0f17),0_0_0_4px_var(--color-accent,#14b8a6)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[12px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-transform peer-checked:bg-[var(--color-accent,oklch(0.76_0.14_192))] border border-white/15"></div>
      </div>
    </label>
  `;
}

export interface CheckboxProps {
  id: string;
  label: string;
  checked?: boolean;
  disabled?: boolean;
  className?: string;
  dataAction?: string;
}

export function renderCheckbox(props: CheckboxProps): string {
  const { id, label, checked = false, disabled = false, className = '', dataAction = '' } = props;
  const safeId = escapeHtml(id);
  const actionAttr = dataAction ? `data-action="${escapeHtml(dataAction)}"` : '';

  return `
    <label for="${safeId}" class="inline-flex items-center gap-2.5 min-h-[44px] cursor-pointer select-none text-xs text-slate-200 ${className}">
      <input
        type="checkbox"
        id="${safeId}"
        ${actionAttr}
        ${checked ? 'checked' : ''}
        ${disabled ? 'disabled' : ''}
        class="w-4 h-4 rounded-sm bg-surface-raised border border-white/25 accent-[var(--color-accent,oklch(0.76_0.14_192))] cursor-pointer"
      />
      <span>${escapeHtml(label)}</span>
    </label>
  `;
}

export interface TabItem {
  id: string;
  label: string;
  icon?: IconName;
  badge?: string | number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTabId: string;
  dataAction?: string;
  className?: string;
}

export function renderTabs(props: TabsProps): string {
  const { tabs, activeTabId, dataAction = 'select-tab', className = '' } = props;

  return `
    <div role="tablist" class="flex items-center space-x-1.5 overflow-x-auto pb-1.5 scrollbar-none border-b border-white/8 ${className}">
      ${tabs
        .map((tab) => {
          const isActive = tab.id === activeTabId;
          return `
          <button
            type="button"
            role="tab"
            aria-selected="${isActive ? 'true' : 'false'}"
            data-action="${escapeHtml(dataAction)}"
            data-tab-id="${escapeHtml(tab.id)}"
            class="px-3.5 py-2 min-h-[40px] rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center space-x-2 cursor-pointer border ${
              isActive
                ? 'bg-surface-overlay text-white border-[var(--color-accent,oklch(0.76_0.14_192))]/60'
                : 'bg-surface-raised/60 hover:bg-surface-overlay text-slate-400 hover:text-slate-200 border-white/5'
            }"
          >
            ${tab.icon ? `<span>${renderIcon(tab.icon, { size: 14 })}</span>` : ''}
            <span>${escapeHtml(tab.label)}</span>${tab.badge !== undefined ? `<span class="px-1.5 py-0.5 rounded-full text-[10px] font-mono tabular-nums bg-white/10 text-white">${escapeHtml(String(tab.badge))}</span>` : ''}
          </button>
        `;
        })
        .join('')}
    </div>
  `;
}

export interface AvatarProps {
  src?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'idle' | 'dnd' | 'offline';
  className?: string;
}

/**
 * CSP-compliant Avatar primitive: layers the fallback initial behind the image
 * so broken/offline images gracefully reveal the initial without inline `onerror` JS.
 */
export function renderAvatar(props: AvatarProps): string {
  const { src = '', name = 'User', size = 'md', status, className = '' } = props;

  const sizeStyles = {
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-10 h-10 text-xs min-h-[40px]',
    lg: 'w-14 h-14 text-sm',
    xl: 'w-24 h-24 text-base',
  }[size];

  const statusStyles = status
    ? {
        online: 'bg-emerald-500',
        idle: 'bg-amber-500',
        dnd: 'bg-rose-500',
        offline: 'bg-slate-500',
      }[status]
    : '';

  const fallbackInitial = escapeHtml((name || 'U').trim().charAt(0).toUpperCase() || 'U');
  const safeName = escapeHtml(name);
  const safeSrc = escapeHtml(src);

  return `
    <div class="relative inline-block shrink-0 ${className}">
      <div class="${sizeStyles} relative rounded-full overflow-hidden bg-surface-raised border border-white/12 flex items-center justify-center font-bold text-slate-200 select-none">
        <span aria-hidden="true" class="z-0">${fallbackInitial}</span>
        ${src ? `<img src="${safeSrc}" alt="${safeName}" loading="lazy" decoding="async" class="absolute inset-0 w-full h-full object-cover z-10 bg-surface-raised" />` : ''}
      </div>
      ${status ? `<span class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-surface-base z-20 ${statusStyles}" title="Status: ${status}"></span>` : ''}
    </div>
  `;
}

export interface SheetProps {
  id: string;
  title: string;
  content: string;
  isOpen?: boolean;
  className?: string;
}

export function renderSheet(props: SheetProps): string {
  const { id, title, content, isOpen = false, className = '' } = props;
  const safeId = escapeHtml(id);
  const titleId = `${safeId}-title`;

  return `
    <div
      id="${safeId}"
      class="sovereign-modal-backdrop fixed inset-0 z-50 ${isOpen ? 'flex' : 'hidden'} items-end sm:items-center justify-center bg-black/75 backdrop-blur-md ${className}"
      role="dialog"
      aria-modal="true"
      aria-labelledby="${titleId}"
    >
      <div class="sovereign-glass-surface w-full max-w-lg max-h-[90vh] bg-surface-base border border-white/15 rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 overflow-y-auto space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-white/10">
          <h3 id="${titleId}" class="text-base font-bold text-white">${escapeHtml(title)}</h3>
          <button
            type="button"
            data-action="close-sheet"
            data-sheet-id="${safeId}"
            aria-label="Close modal"
            class="min-h-[44px] min-w-[44px] p-2 text-slate-400 hover:text-white rounded-lg bg-surface-raised cursor-pointer flex items-center justify-center"
          >
            ✕
          </button>
        </div>
        <div>${content}</div>
      </div>
    </div>
  `;
}

export interface ErrorStateProps {
  title?: string;
  message: string;
  retryAction?: string;
  retryLabel?: string;
  className?: string;
}

export function renderErrorState(props: ErrorStateProps): string {
  const { title = 'Something went wrong', message, retryAction = 'retry', retryLabel = 'Retry', className = '' } = props;

  return `
    <div role="alert" class="flex flex-col items-center justify-center text-center p-8 rounded-xl border border-rose-500/25 bg-rose-950/20 my-4 space-y-3 ${className}">
      <div class="w-11 h-11 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center">
        ${renderIcon('alert', { size: 22 })}
      </div>
      <h3 class="text-sm font-bold text-rose-200">${escapeHtml(title)}</h3>
      <p class="text-xs text-rose-300/85 max-w-sm">${escapeHtml(message)}</p>
      ${retryLabel ? renderButton({ label: retryLabel, dataAction: retryAction, variant: 'danger', size: 'sm' }) : ''}
    </div>
  `;
}

export interface ProgressProps {
  value: number;
  label?: string;
  variant?: 'cyan' | 'emerald' | 'amber' | 'rose';
  className?: string;
}

export function renderProgress(props: ProgressProps): string {
  const { value, label = '', variant = 'cyan', className = '' } = props;
  const boundedValue = Math.max(0, Math.min(100, value));

  const variantStyles = {
    cyan: 'bg-cyan-400',
    emerald: 'bg-emerald-400',
    amber: 'bg-amber-400',
    rose: 'bg-rose-400',
  }[variant];

  return `
    <div class="w-full space-y-1.5 ${className}">
      ${label ? `<div class="flex justify-between text-[11px] font-mono tabular-nums text-slate-300"><span>${escapeHtml(label)}</span><span>${boundedValue}%</span></div>` : ''}
      <div role="progressbar" aria-valuenow="${boundedValue}" aria-valuemin="0" aria-valuemax="100" class="w-full h-2 bg-surface-raised rounded-full overflow-hidden border border-white/8">
        <div class="h-full rounded-full transition-all duration-200 ${variantStyles}" style="width: ${boundedValue}%;"></div>
      </div>
    </div>
  `;
}

export interface DataTableColumn<T> {
  header: string;
  render: (item: T) => string;
  align?: 'left' | 'right';
  numeric?: boolean;
  className?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  className?: string;
  emptyMessage?: string;
}

export function renderDataTable<T>(props: DataTableProps<T>): string {
  const { columns, data, className = '', emptyMessage = 'No data available' } = props;

  if (data.length === 0) {
    return renderEmptyState({ title: 'Empty Table', description: emptyMessage });
  }

  return `
    <div class="w-full overflow-x-auto rounded-xl border border-white/10 bg-surface-base ${className}">
      <table class="w-full text-left text-xs border-collapse">
        <thead>
          <tr class="border-b border-white/10 bg-surface-raised/60 text-slate-300 font-mono">
            ${columns
              .map((col) => {
                const alignCls = col.numeric || col.align === 'right' ? 'text-right tabular-nums' : 'text-left';
                return `<th class="px-4 py-3 font-semibold ${alignCls} ${col.className || ''}">${escapeHtml(col.header)}</th>`;
              })
              .join('')}
          </tr>
        </thead>
        <tbody class="divide-y divide-white/[0.06] text-slate-200">
          ${data
            .map(
              (item) => `
            <tr class="hover:bg-white/[0.04] transition-colors">
              ${columns
                .map((col) => {
                  const alignCls = col.numeric || col.align === 'right' ? 'text-right font-mono tabular-nums' : 'text-left';
                  return `<td class="px-4 py-3 ${alignCls} ${col.className || ''}">${col.render(item)}</td>`;
                })
                .join('')}
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}
