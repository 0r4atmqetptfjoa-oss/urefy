/**
 * @file ui/primitives.ts
 * @package @aetheris/client-ui/ui
 * @description 2027 Sovereign UI Primitives — Spatial Glass Controls, Bento Cards,
 * Native CSS Anchor Popovers, and Ergonomic ≥44px Touch Targets.
 */

import { renderIcon, IconName } from './icons.js';
import { TYPOGRAPHY, SPATIAL_GLASS } from './tokens.js';

function escapeHtml(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
    id,
    label = '',
    icon,
    iconPosition = 'left',
    variant = 'primary',
    size = 'md',
    type = 'button',
    className = '',
    disabled = false,
    loading = false,
    ariaLabel,
    dataAction,
    dataId,
  } = props;

  const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
    sm: 'min-h-[36px] px-3 py-1.5 text-xs gap-1.5 rounded-lg',
    md: 'min-h-[44px] px-4 py-2 text-sm gap-2 rounded-xl',
    lg: 'min-h-[48px] px-5 py-2.5 text-base gap-2.5 rounded-2xl',
  };

  const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary:
      'bg-gradient-to-b from-cyan-400 to-cyan-500 text-slate-950 font-semibold shadow-[0_2px_16px_rgba(0,229,255,0.28),inset_0_1px_0_rgba(255,255,255,0.45)] hover:from-cyan-300 hover:to-cyan-400 active:scale-[0.98]',
    secondary:
      'bg-surface-raised/80 backdrop-blur-md text-slate-100 border border-white/10 hover:bg-white/10 hover:border-white/20 active:scale-[0.98]',
    ghost:
      'bg-transparent text-slate-300 hover:text-white hover:bg-white/[0.06] active:scale-[0.98]',
    danger:
      'bg-rose-500/15 text-rose-300 border border-rose-500/35 hover:bg-rose-500/25 hover:text-rose-200 active:scale-[0.98]',
    outline:
      'bg-transparent text-cyan-300 border border-cyan-400/40 hover:bg-cyan-400/10 hover:border-cyan-400/70 active:scale-[0.98]',
    accent:
      'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 active:scale-[0.98]',
  };

  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 18 : 16;
  const iconMarkup = loading
    ? `<span class="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true"></span>`
    : icon
    ? renderIcon(icon, { size: iconSize, ariaHidden: true })
    : '';

  const idAttr = id ? ` id="${escapeHtml(id)}"` : '';
  const ariaAttr = ariaLabel ? ` aria-label="${escapeHtml(ariaLabel)}"` : label ? ` aria-label="${escapeHtml(label)}"` : '';
  const actionAttr = dataAction ? ` data-action="${escapeHtml(dataAction)}"` : '';
  const dataIdAttr = dataId ? ` data-id="${escapeHtml(dataId)}"` : '';
  const disabledAttr = disabled || loading ? ' disabled aria-disabled="true"' : '';

  return `<button type="${type}"${idAttr}${ariaAttr}${actionAttr}${dataIdAttr}${disabledAttr} class="inline-flex items-center justify-center font-medium transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/80 disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none ${sizeClasses[size]} ${variantClasses[variant]} ${escapeHtml(className)}">${
    iconPosition === 'left' ? iconMarkup : ''
  }${label ? `<span>${escapeHtml(label)}</span>` : ''}${iconPosition === 'right' ? iconMarkup : ''}</button>`;
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
    id,
    icon,
    label,
    variant = 'ghost',
    size = 'md',
    className = '',
    disabled = false,
    dataAction,
    dataId,
  } = props;

  const sizeMap = {
    sm: 'w-9 h-9 min-h-[36px] min-w-[36px] rounded-lg',
    md: 'w-11 h-11 min-h-[44px] min-w-[44px] rounded-xl',
    lg: 'w-12 h-12 min-h-[48px] min-w-[48px] rounded-2xl',
  };

  const variantMap = {
    ghost: 'text-slate-400 hover:text-white hover:bg-white/[0.08]',
    secondary: 'bg-surface-raised/80 text-slate-200 border border-white/10 hover:bg-white/10',
    danger: 'text-rose-400 hover:text-rose-200 hover:bg-rose-500/20',
    primary: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/35 hover:bg-cyan-500/30',
  };

  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 20 : 18;
  const idAttr = id ? ` id="${escapeHtml(id)}"` : '';
  const actionAttr = dataAction ? ` data-action="${escapeHtml(dataAction)}"` : '';
  const dataIdAttr = dataId ? ` data-id="${escapeHtml(dataId)}"` : '';
  const disabledAttr = disabled ? ' disabled aria-disabled="true"' : '';

  return `<button type="button"${idAttr} aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}"${actionAttr}${dataIdAttr}${disabledAttr} class="inline-flex items-center justify-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/80 active:scale-95 disabled:opacity-40 cursor-pointer ${sizeMap[size]} ${variantMap[variant]} ${escapeHtml(className)}">${renderIcon(
    icon,
    { size: iconSize, ariaHidden: true }
  )}</button>`;
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
    label,
    placeholder = '',
    value = '',
    type = 'text',
    helperText,
    error,
    icon,
    className = '',
    required = false,
    autocomplete,
  } = props;

  const borderClass = error
    ? 'border-rose-500/60 focus:border-rose-400 focus:ring-rose-500/30'
    : 'border-white/10 focus:border-cyan-400/60 focus:ring-cyan-400/25';

  return `<div class="flex flex-col gap-1.5 ${escapeHtml(className)}">
    ${
      label
        ? `<label for="${escapeHtml(id)}" class="text-xs font-semibold text-slate-300 tracking-wide">${escapeHtml(label)}${
            required ? ' <span class="text-rose-400">*</span>' : ''
          }</label>`
        : ''
    }
    <div class="relative flex items-center">
      ${
        icon
          ? `<span class="absolute left-3.5 text-slate-400 pointer-events-none">${renderIcon(icon, {
              size: 16,
              ariaHidden: true,
            })}</span>`
          : ''
      }
      <input
        id="${escapeHtml(id)}"
        name="${escapeHtml(name)}"
        type="${type}"
        value="${escapeHtml(value)}"
        placeholder="${escapeHtml(placeholder)}"
        ${required ? 'required' : ''}
        ${autocomplete ? `autocomplete="${escapeHtml(autocomplete)}"` : ''}
        class="w-full min-h-[44px] ${
          icon ? 'pl-10' : 'pl-3.5'
        } pr-3.5 py-2 rounded-xl bg-surface-base/90 backdrop-blur-md text-sm text-white placeholder-slate-500 border ${borderClass} focus:outline-none focus:ring-2 transition-all"
      />
    </div>
    ${
      error
        ? `<p class="text-xs text-rose-400 font-medium" role="alert">${escapeHtml(error)}</p>`
        : helperText
        ? `<p class="text-xs text-slate-400">${escapeHtml(helperText)}</p>`
        : ''
    }
  </div>`;
}

export interface BadgeProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'accent' | 'mono';
  icon?: IconName;
  className?: string;
}

export function renderBadge(props: BadgeProps): string {
  const { label, variant = 'default', icon, className = '' } = props;
  const styles: Record<NonNullable<BadgeProps['variant']>, string> = {
    default: 'bg-white/[0.06] text-slate-300 border-white/10',
    success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    danger: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    accent: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    mono: 'bg-slate-900/90 text-cyan-300 border-cyan-500/25 font-mono',
  };

  return `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${styles[variant]} ${escapeHtml(
    className
  )}">${icon ? renderIcon(icon, { size: 12, ariaHidden: true }) : ''}<span>${escapeHtml(label)}</span></span>`;
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
  const { id, title, subtitle, content, footer, className = '', interactive = false } = props;
  const idAttr = id ? ` id="${escapeHtml(id)}"` : '';
  const interactiveClasses = interactive
    ? 'hover:border-cyan-400/35 hover:shadow-[0_12px_36px_rgba(0,0,0,0.42)] cursor-pointer transition-all duration-200'
    : '';

  return `<section${idAttr} class="rounded-2xl ${SPATIAL_GLASS.panelZ1} p-5 ${interactiveClasses} ${escapeHtml(className)}">
    ${
      title || subtitle
        ? `<header class="mb-3">
            ${title ? `<h3 class="${TYPOGRAPHY.h3} text-white">${escapeHtml(title)}</h3>` : ''}
            ${subtitle ? `<p class="text-xs text-slate-400 mt-0.5">${escapeHtml(subtitle)}</p>` : ''}
          </header>`
        : ''
    }
    <div class="${TYPOGRAPHY.body} text-slate-200">${content}</div>
    ${footer ? `<footer class="mt-4 pt-3 border-t border-white/[0.07]">${footer}</footer>` : ''}
  </section>`;
}

export interface BentoCardProps {
  id?: string;
  eyebrow?: string;
  title: string;
  metric?: string;
  description?: string;
  icon?: IconName;
  accentColor?: 'cyan' | 'emerald' | 'purple' | 'amber' | 'rose';
  colSpan?: 1 | 2 | 3;
  content?: string;
  dataAction?: string;
}

export function renderBentoCard(props: BentoCardProps): string {
  const {
    id,
    eyebrow,
    title,
    metric,
    description,
    icon,
    accentColor = 'cyan',
    colSpan = 1,
    content = '',
    dataAction,
  } = props;

  const spanMap = {
    1: 'col-span-1',
    2: 'col-span-1 md:col-span-2',
    3: 'col-span-1 md:col-span-3',
  };

  const glowMap = {
    cyan: 'from-cyan-500/15 to-transparent border-cyan-500/20 text-cyan-300',
    emerald: 'from-emerald-500/15 to-transparent border-emerald-500/20 text-emerald-300',
    purple: 'from-purple-500/15 to-transparent border-purple-500/20 text-purple-300',
    amber: 'from-amber-500/15 to-transparent border-amber-500/20 text-amber-300',
    rose: 'from-rose-500/15 to-transparent border-rose-500/20 text-rose-300',
  };

  const idAttr = id ? ` id="${escapeHtml(id)}"` : '';
  const actionAttr = dataAction ? ` data-action="${escapeHtml(dataAction)}"` : '';

  return `<article${idAttr}${actionAttr} class="relative overflow-hidden rounded-2xl ${SPATIAL_GLASS.bentoTile} bg-gradient-to-br ${glowMap[accentColor]} p-5 ${spanMap[colSpan]}">
    <div class="flex items-start justify-between gap-3">
      <div>
        ${eyebrow ? `<div class="text-[10px] font-mono uppercase tracking-widest opacity-80 mb-1">${escapeHtml(eyebrow)}</div>` : ''}
        <h4 class="text-sm font-bold text-white">${escapeHtml(title)}</h4>
      </div>
      ${
        icon
          ? `<div class="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center">${renderIcon(
              icon,
              { size: 18, ariaHidden: true }
            )}</div>`
          : ''
      }
    </div>
    ${metric ? `<div class="mt-3 text-2xl font-extrabold font-mono text-white tracking-tight">${escapeHtml(metric)}</div>` : ''}
    ${description ? `<p class="mt-1.5 text-xs text-slate-400 leading-relaxed">${escapeHtml(description)}</p>` : ''}
    ${content ? `<div class="mt-3">${content}</div>` : ''}
  </article>`;
}

export interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}

export function renderSkeleton(props: SkeletonProps = {}): string {
  const { width = 'w-full', height = 'h-4', className = '', rounded = 'md' } = props;
  const radiusMap = {
    sm: 'rounded',
    md: 'rounded-lg',
    lg: 'rounded-xl',
    full: 'rounded-full',
  };
  return `<div class="animate-pulse bg-white/[0.07] ${width} ${height} ${radiusMap[rounded]} ${escapeHtml(
    className
  )}" aria-hidden="true"></div>`;
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
  const {
    icon = 'sparkles',
    title,
    description,
    actionLabel,
    actionAction,
    actionId,
    className = '',
  } = props;

  return `<div class="flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-dashed border-white/10 bg-surface-base/40 backdrop-blur-md ${escapeHtml(
    className
  )}" role="status">
    <div class="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-300 mb-3">
      ${renderIcon(icon, { size: 22, ariaHidden: true })}
    </div>
    <h3 class="text-base font-bold text-white mb-1">${escapeHtml(title)}</h3>
    <p class="text-xs text-slate-400 max-w-md leading-relaxed mb-4">${escapeHtml(description)}</p>
    ${
      actionLabel
        ? renderButton({
            id: actionId,
            label: actionLabel,
            dataAction: actionAction,
            variant: 'primary',
            size: 'sm',
          })
        : ''
    }
  </div>`;
}

export interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'idle' | 'dnd' | 'syncing';
  label?: string;
  showPing?: boolean;
}

export function renderStatusIndicator(props: StatusIndicatorProps): string {
  const { status, label, showPing = true } = props;
  const colorMap: Record<StatusIndicatorProps['status'], string> = {
    online: 'bg-emerald-400',
    offline: 'bg-slate-500',
    idle: 'bg-amber-400',
    dnd: 'bg-rose-500',
    syncing: 'bg-cyan-400',
  };

  return `<span class="inline-flex items-center gap-2 text-xs font-medium text-slate-300">
    <span class="relative flex h-2.5 w-2.5">
      ${
        showPing && (status === 'online' || status === 'syncing')
          ? `<span class="animate-ping absolute inline-flex h-full w-full rounded-full ${colorMap[status]} opacity-75"></span>`
          : ''
      }
      <span class="relative inline-flex rounded-full h-2.5 w-2.5 ${colorMap[status]}"></span>
    </span>
    ${label ? `<span>${escapeHtml(label)}</span>` : ''}
  </span>`;
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
    label,
    placeholder = '',
    value = '',
    rows = 4,
    helperText,
    error,
    className = '',
    required = false,
  } = props;

  return `<div class="flex flex-col gap-1.5 ${escapeHtml(className)}">
    ${
      label
        ? `<label for="${escapeHtml(id)}" class="text-xs font-semibold text-slate-300">${escapeHtml(label)}${
            required ? ' <span class="text-rose-400">*</span>' : ''
          }</label>`
        : ''
    }
    <textarea
      id="${escapeHtml(id)}"
      name="${escapeHtml(name)}"
      rows="${rows}"
      placeholder="${escapeHtml(placeholder)}"
      ${required ? 'required' : ''}
      class="w-full p-3.5 rounded-xl bg-surface-base/90 backdrop-blur-md text-sm text-white placeholder-slate-500 border ${
        error ? 'border-rose-500/60' : 'border-white/10 focus:border-cyan-400/60'
      } focus:outline-none focus:ring-2 focus:ring-cyan-400/25 transition-all resize-y"
    >${escapeHtml(value)}</textarea>
    ${
      error
        ? `<p class="text-xs text-rose-400" role="alert">${escapeHtml(error)}</p>`
        : helperText
        ? `<p class="text-xs text-slate-400">${escapeHtml(helperText)}</p>`
        : ''
    }
  </div>`;
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
  const { id, label, options, selectedValue, className = '', dataAction } = props;
  const actionAttr = dataAction ? ` data-action="${escapeHtml(dataAction)}"` : '';

  return `<div class="flex flex-col gap-1.5 ${escapeHtml(className)}">
    ${label ? `<label for="${escapeHtml(id)}" class="text-xs font-semibold text-slate-300">${escapeHtml(label)}</label>` : ''}
    <select id="${escapeHtml(id)}"${actionAttr} class="min-h-[44px] px-3.5 py-2 rounded-xl bg-surface-base/90 text-sm text-white border border-white/10 focus:outline-none focus:border-cyan-400/60">
      ${options
        .map(
          (opt) =>
            `<option value="${escapeHtml(opt.value)}"${opt.value === selectedValue ? ' selected' : ''}>${escapeHtml(
              opt.label
            )}</option>`
        )
        .join('')}
    </select>
  </div>`;
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
  const { id, label, checked = false, description, disabled = false, className = '', dataAction } = props;
  const actionAttr = dataAction ? ` data-action="${escapeHtml(dataAction)}"` : '';

  return `<div class="flex items-center justify-between gap-4 py-2 ${escapeHtml(className)}">
    <div class="flex flex-col">
      <label for="${escapeHtml(id)}" class="text-sm font-medium text-white cursor-pointer">${escapeHtml(label)}</label>
      ${description ? `<span class="text-xs text-slate-400">${escapeHtml(description)}</span>` : ''}
    </div>
    <button
      type="button"
      id="${escapeHtml(id)}"
      role="switch"
      aria-checked="${checked ? 'true' : 'false'}"
      aria-label="${escapeHtml(label)}"
      ${disabled ? 'disabled' : ''}
      ${actionAttr}
      class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
        checked ? 'bg-cyan-500' : 'bg-slate-700'
      }"
    >
      <span class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }"></span>
    </button>
  </div>`;
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
  const { id, label, checked = false, disabled = false, className = '', dataAction } = props;
  const actionAttr = dataAction ? ` data-action="${escapeHtml(dataAction)}"` : '';

  return `<label for="${escapeHtml(id)}" class="inline-flex items-center gap-2.5 min-h-[44px] cursor-pointer select-none ${escapeHtml(
    className
  )}">
    <input
      id="${escapeHtml(id)}"
      type="checkbox"
      ${checked ? 'checked' : ''}
      ${disabled ? 'disabled' : ''}
      ${actionAttr}
      class="w-4 h-4 rounded border-white/20 bg-surface-base text-cyan-500 focus:ring-cyan-400/40"
    />
    <span class="text-sm text-slate-200">${escapeHtml(label)}</span>
  </label>`;
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
  const { tabs, activeTabId, dataAction = 'switch-tab', className = '' } = props;
  return `<div role="tablist" class="flex items-center gap-1 p-1 rounded-xl bg-surface-base/80 border border-white/[0.07] ${escapeHtml(
    className
  )}">
    ${tabs
      .map((tab) => {
        const isActive = tab.id === activeTabId;
        return `<button
          type="button"
          role="tab"
          aria-selected="${isActive ? 'true' : 'false'}"
          data-action="${escapeHtml(dataAction)}"
          data-tab-id="${escapeHtml(tab.id)}"
          class="inline-flex items-center gap-2 min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            isActive
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/35 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
          }"
        >
          ${tab.icon ? renderIcon(tab.icon, { size: 14, ariaHidden: true }) : ''}
          <span>${escapeHtml(tab.label)}</span>
          ${
            tab.badge !== undefined
              ? `<span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/10 text-slate-200">${escapeHtml(
                  String(tab.badge)
                )}</span>`
              : ''
          }
        </button>`;
      })
      .join('')}
  </div>`;
}

export interface AvatarProps {
  src?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'idle' | 'dnd' | 'offline';
  className?: string;
}

export function renderAvatar(props: AvatarProps): string {
  const { src, name = 'Sovereign', size = 'md', status, className = '' } = props;
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };
  const initials = name.trim().slice(0, 2).toUpperCase();

  return `<div class="relative inline-flex items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/30 to-purple-500/30 border border-white/15 font-bold text-white shrink-0 ${sizeClasses[size]} ${escapeHtml(
    className
  )}">
    ${
      src
        ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(name)}" class="w-full h-full rounded-full object-cover" />`
        : `<span>${escapeHtml(initials)}</span>`
    }
    ${
      status
        ? `<span class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-[#090a0f] ${
            status === 'online'
              ? 'bg-emerald-400'
              : status === 'idle'
              ? 'bg-amber-400'
              : status === 'dnd'
              ? 'bg-rose-500'
              : 'bg-slate-500'
          }"></span>`
        : ''
    }
  </div>`;
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
  if (!isOpen) return '';
  return `<div id="${escapeHtml(id)}" role="dialog" aria-modal="true" aria-label="${escapeHtml(
    title
  )}" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-md p-0 sm:p-4">
    <div class="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl ${SPATIAL_GLASS.panelZ2} p-6 ${escapeHtml(className)}">
      <div class="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
        <h3 class="text-base font-bold text-white">${escapeHtml(title)}</h3>
        ${renderIconButton({ icon: 'x', label: 'Close modal', dataAction: 'close-sheet' })}
      </div>
      <div>${content}</div>
    </div>
  </div>`;
}

export interface ErrorStateProps {
  title?: string;
  message: string;
  retryAction?: string;
  retryLabel?: string;
  className?: string;
}

export function renderErrorState(props: ErrorStateProps): string {
  const {
    title = 'Unable to load state',
    message,
    retryAction,
    retryLabel = 'Try Again',
    className = '',
  } = props;

  return `<div class="flex flex-col items-center justify-center text-center p-6 rounded-2xl border border-rose-500/30 bg-rose-950/20 backdrop-blur-md ${escapeHtml(
    className
  )}" role="alert">
    <div class="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center mb-2.5">
      ${renderIcon('alert-triangle', { size: 20, ariaHidden: true })}
    </div>
    <h4 class="text-sm font-bold text-white mb-1">${escapeHtml(title)}</h4>
    <p class="text-xs text-rose-200/80 max-w-md mb-4">${escapeHtml(message)}</p>
    ${
      retryAction
        ? renderButton({
            label: retryLabel,
            dataAction: retryAction,
            variant: 'danger',
            size: 'sm',
          })
        : ''
    }
  </div>`;
}

export interface ProgressProps {
  value: number;
  label?: string;
  variant?: 'cyan' | 'emerald' | 'amber' | 'rose';
  className?: string;
}

export function renderProgress(props: ProgressProps): string {
  const { value, label, variant = 'cyan', className = '' } = props;
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const barColors = {
    cyan: 'from-cyan-500 to-sky-400',
    emerald: 'from-emerald-500 to-teal-400',
    amber: 'from-amber-500 to-yellow-400',
    rose: 'from-rose-500 to-pink-500',
  };

  return `<div class="w-full ${escapeHtml(className)}">
    ${
      label
        ? `<div class="flex justify-between text-xs mb-1 font-mono text-slate-300"><span>${escapeHtml(
            label
          )}</span><span>${clamped}%</span></div>`
        : ''
    }
    <div class="w-full h-2 rounded-full bg-white/10 overflow-hidden" role="progressbar" aria-valuenow="${clamped}" aria-valuemin="0" aria-valuemax="100">
      <div class="h-full bg-gradient-to-r ${barColors[variant]} transition-all duration-300" style="width: ${clamped}%"></div>
    </div>
  </div>`;
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
  const { columns, data, className = '', emptyMessage = 'No records available' } = props;
  if (!data.length) {
    return renderEmptyState({ title: emptyMessage, description: 'New records will appear here automatically.' });
  }

  return `<div class="overflow-x-auto rounded-2xl border border-white/10 bg-surface-base/75 backdrop-blur-xl ${escapeHtml(
    className
  )}">
    <table class="w-full text-left border-collapse text-xs">
      <thead>
        <tr class="border-b border-white/10 bg-white/[0.03] text-slate-400 font-mono uppercase text-[10px]">
          ${columns
            .map(
              (col) =>
                `<th class="py-3 px-4 ${col.align === 'right' || col.numeric ? 'text-right' : 'text-left'} ${escapeHtml(
                  col.className || ''
                )}">${escapeHtml(col.header)}</th>`
            )
            .join('')}
        </tr>
      </thead>
      <tbody class="divide-y divide-white/[0.05] text-slate-200">
        ${data
          .map(
            (row) => `<tr class="hover:bg-white/[0.03] transition-colors">
              ${columns
                .map(
                  (col) =>
                    `<td class="py-3 px-4 ${
                      col.align === 'right' || col.numeric ? 'text-right font-mono' : 'text-left'
                    }">${col.render(row)}</td>`
                )
                .join('')}
            </tr>`
          )
          .join('')}
      </tbody>
    </table>
  </div>`;
}
