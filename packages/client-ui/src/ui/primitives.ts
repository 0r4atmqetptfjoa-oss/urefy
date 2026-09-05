/**
 * @file ui/primitives.ts
 * @package @aetheris/client-ui
 * @description Unified Design System Primitives.
 * Provides accessible, semantic, and uniform UI building blocks.
 */

import { renderIcon, IconName } from './icons.js';
import { TYPOGRAPHY, TOUCH_TARGET_MIN } from './tokens.js';

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
    ariaLabel = label,
    dataAction = '',
    dataId = '',
  } = props;

  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-xl transition-all cursor-pointer select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400';

  const sizeStyles = {
    sm: 'px-2.5 py-1 text-xs gap-1.5 h-8',
    md: 'px-4 py-2 text-sm gap-2 min-h-[44px]',
    lg: 'px-5 py-2.5 text-base gap-2.5 min-h-[48px]',
  }[size];

  const variantStyles = {
    primary:
      'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold shadow-lg shadow-cyan-500/20',
    secondary:
      'bg-surface-raised/80 hover:bg-surface-overlay text-slate-200 border border-white/10 hover:border-white/20',
    accent:
      'bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-semibold shadow-md',
    ghost:
      'bg-transparent hover:bg-white/5 text-slate-300 hover:text-white',
    danger:
      'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:border-rose-500/50',
    outline:
      'bg-transparent border border-white/15 hover:border-cyan-400/50 text-slate-200 hover:text-cyan-300',
  }[variant];

  const iconSvg = icon ? renderIcon(icon, { size: size === 'sm' ? 14 : size === 'lg' ? 20 : 16 }) : '';
  const content =
    iconPosition === 'right'
      ? `<span>${label}</span>${iconSvg}`
      : `${iconSvg}<span>${label}</span>`;

  const idAttr = id ? `id="${id}"` : '';
  const actionAttr = dataAction ? `data-action="${dataAction}"` : '';
  const dataIdAttr = dataId ? `data-id="${dataId}"` : '';
  const disabledAttr = disabled ? 'disabled' : '';

  return `<button type="${type}" ${idAttr} ${actionAttr} ${dataIdAttr} ${disabledAttr} aria-label="${ariaLabel}" class="${baseStyles} ${sizeStyles} ${variantStyles} ${className}">${content}</button>`;
}

export interface IconButtonProps {
  id?: string;
  icon: IconName;
  label: string;
  variant?: 'ghost' | 'secondary' | 'danger' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
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
    dataAction = '',
    dataId = '',
  } = props;

  const sizeStyles = {
    sm: 'w-8 h-8 p-1 text-xs',
    md: 'w-10 h-10 min-h-[44px] min-w-[44px] p-2',
    lg: 'w-12 h-12 p-3',
  }[size];

  const variantStyles = {
    ghost: 'text-slate-400 hover:text-white hover:bg-white/5',
    secondary: 'bg-surface-raised/80 text-slate-300 hover:text-white hover:bg-surface-overlay border border-white/10',
    danger: 'text-rose-400 hover:bg-rose-500/10 hover:text-rose-300',
    primary: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold',
  }[variant];

  const idAttr = id ? `id="${id}"` : '';
  const actionAttr = dataAction ? `data-action="${dataAction}"` : '';
  const dataIdAttr = dataId ? `data-id="${dataId}"` : '';

  return `<button type="button" ${idAttr} ${actionAttr} ${dataIdAttr} aria-label="${label}" title="${label}" class="inline-flex items-center justify-center rounded-xl transition-all cursor-pointer select-none active:scale-[0.95] ${sizeStyles} ${variantStyles} ${className}">
    ${renderIcon(icon, { size: size === 'sm' ? 14 : size === 'lg' ? 22 : 18 })}
  </button>`;
}

export interface InputProps {
  id: string;
  name?: string;
  label?: string;
  placeholder?: string;
  value?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'search';
  helperText?: string;
  error?: string;
  icon?: IconName;
  className?: string;
  required?: boolean;
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
  } = props;

  const iconSvg = icon
    ? `<div class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">${renderIcon(icon, { size: 16 })}</div>`
    : '';

  const paddingLeft = icon ? 'pl-10' : 'pl-3.5';
  const borderStyle = error
    ? 'border-rose-500 focus:ring-rose-500/30'
    : 'border-white/10 focus:border-cyan-400 focus:ring-cyan-400/20';

  return `
    <div class="flex flex-col gap-1.5 w-full ${className}">
      ${label ? `<label for="${id}" class="${TYPOGRAPHY.label}">${label}${required ? ' <span class="text-rose-400">*</span>' : ''}</label>` : ''}
      <div class="relative w-full">
        ${iconSvg}
        <input
          id="${id}"
          name="${name}"
          type="${type}"
          value="${value}"
          placeholder="${placeholder}"
          ${required ? 'required' : ''}
          class="w-full ${paddingLeft} pr-3.5 py-2.5 min-h-[44px] bg-surface-base/80 rounded-xl border ${borderStyle} text-slate-100 placeholder-slate-500 text-sm transition-all focus:outline-none focus:ring-2"
        />
      </div>
      ${error ? `<p class="text-xs text-rose-400 flex items-center gap-1">${renderIcon('alert', { size: 12 })}<span>${error}</span></p>` : helperText ? `<p class="${TYPOGRAPHY.caption}">${helperText}</p>` : ''}
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
    default: 'bg-white/5 text-slate-300 border-white/10',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    danger: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    accent: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
    mono: 'bg-surface-raised text-cyan-300 border-white/10 font-mono text-[10px]',
  }[variant];

  const iconSvg = icon ? renderIcon(icon, { size: 12 }) : '';

  return `<span class="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${variantStyles} ${className}">
    ${iconSvg}<span>${label}</span>
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
  const hoverStyle = interactive ? 'hover:border-white/20 transition-all cursor-pointer' : '';
  const idAttr = id ? `id="${id}"` : '';

  return `
    <div ${idAttr} class="rounded-2xl border border-white/10 bg-surface-base/80 backdrop-blur-md p-5 ${hoverStyle} ${className}">
      ${title || subtitle ? `
        <div class="mb-4">
          ${title ? `<h3 class="${TYPOGRAPHY.sectionTitle}">${title}</h3>` : ''}
          ${subtitle ? `<p class="${TYPOGRAPHY.bodySecondary} mt-0.5">${subtitle}</p>` : ''}
        </div>
      ` : ''}
      <div class="space-y-3">${content}</div>
      ${footer ? `<div class="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">${footer}</div>` : ''}
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
    sm: 'rounded',
    md: 'rounded-lg',
    lg: 'rounded-xl',
    full: 'rounded-full',
  }[rounded];

  return `<div class="animate-pulse bg-white/5 ${width} ${height} ${roundStyle} ${className}"></div>`;
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
    <div class="flex flex-col items-center justify-center text-center p-8 md:p-12 rounded-2xl border border-dashed border-white/10 bg-surface-base/40 my-4 ${className}">
      <div class="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-slate-400 mb-4 border border-white/5">
        ${renderIcon(icon, { size: 28 })}
      </div>
      <h3 class="text-base font-semibold text-slate-100 mb-1.5">${title}</h3>
      <p class="text-xs text-slate-400 max-w-sm leading-relaxed mb-5">${description}</p>
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

  const ping = showPing && (status === 'online' || status === 'syncing')
    ? `<span class="animate-ping absolute inline-flex h-full w-full rounded-full ${colorMap} opacity-75"></span>`
    : '';

  return `
    <span class="inline-flex items-center gap-2">
      <span class="relative flex h-2.5 w-2.5">
        ${ping}
        <span class="relative inline-flex rounded-full h-2.5 w-2.5 ${colorMap}"></span>
      </span>
      ${label ? `<span class="text-xs text-slate-400">${label}</span>` : ''}
    </span>
  `;
}
