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
    'inline-flex items-center justify-center font-medium rounded-xl transition-all cursor-pointer select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]';

  const sizeStyles = {
    sm: 'px-2.5 py-1 text-xs gap-1.5 h-8',
    md: 'px-4 py-2 text-sm gap-2 min-h-[44px]',
    lg: 'px-5 py-2.5 text-base gap-2.5 min-h-[48px]',
  }[size];

  const variantStyles = {
    primary:
      'bg-[var(--color-accent,#e59b3c)] hover:opacity-90 text-slate-950 font-semibold shadow-sm',
    secondary:
      'bg-surface-raised hover:bg-surface-overlay text-slate-200 border border-white/10 hover:border-white/20',
    accent:
      'bg-[var(--color-accent,#e59b3c)] hover:opacity-90 text-slate-950 font-semibold shadow-sm',
    ghost:
      'bg-transparent hover:bg-white/5 text-slate-300 hover:text-white',
    danger:
      'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:border-rose-500/50',
    outline:
      'bg-transparent border border-white/15 hover:border-white/30 text-slate-200 hover:text-white',
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
    secondary: 'bg-surface-raised text-slate-300 hover:text-white hover:bg-surface-overlay border border-white/10',
    danger: 'text-rose-400 hover:bg-rose-500/10 hover:text-rose-300',
    primary: 'bg-[var(--color-accent,#e59b3c)] hover:opacity-90 text-slate-950 font-bold',
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
    : 'border-white/10 focus:border-[var(--color-accent,#e59b3c)] focus:ring-[var(--color-accent,#e59b3c)]/20';

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
          class="w-full ${paddingLeft} pr-3.5 py-2.5 min-h-[44px] bg-surface-base rounded-xl border ${borderStyle} text-slate-100 placeholder-slate-500 text-sm transition-all focus:outline-none focus:ring-1"
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
    accent: 'bg-[var(--color-accent,#e59b3c)]/15 text-[var(--color-accent,#e59b3c)] border-[var(--color-accent,#e59b3c)]/30',
    mono: 'bg-surface-raised text-slate-300 border-white/10 font-mono text-[10px]',
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

  const borderStyle = error
    ? 'border-rose-500 focus:ring-rose-500/30'
    : 'border-white/10 focus:border-[var(--color-accent,#e59b3c)] focus:ring-[var(--color-accent,#e59b3c)]/20';

  return `
    <div class="flex flex-col gap-1.5 w-full ${className}">
      ${label ? `<label for="${id}" class="${TYPOGRAPHY.label}">${label}${required ? ' <span class="text-rose-400">*</span>' : ''}</label>` : ''}
      <textarea
        id="${id}"
        name="${name}"
        rows="${rows}"
        placeholder="${placeholder}"
        ${required ? 'required' : ''}
        class="w-full px-3.5 py-2.5 bg-surface-base rounded-xl border ${borderStyle} text-slate-100 placeholder-slate-500 text-sm transition-all focus:outline-none focus:ring-1 resize-none"
      >${value}</textarea>
      ${error ? `<p class="text-xs text-rose-400 flex items-center gap-1">${renderIcon('alert', { size: 12 })}<span>${error}</span></p>` : helperText ? `<p class="${TYPOGRAPHY.caption}">${helperText}</p>` : ''}
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
  const actionAttr = dataAction ? `data-action="${dataAction}"` : '';

  return `
    <div class="flex flex-col gap-1.5 w-full ${className}">
      ${label ? `<label for="${id}" class="${TYPOGRAPHY.label}">${label}</label>` : ''}
      <select
        id="${id}"
        ${actionAttr}
        class="w-full px-3.5 py-2.5 min-h-[44px] bg-surface-base rounded-xl border border-white/10 text-slate-100 text-sm focus:outline-none focus:border-[var(--color-accent,#e59b3c)] transition-all cursor-pointer"
      >
        ${options.map(opt => `
          <option value="${opt.value}" ${opt.value === selectedValue ? 'selected' : ''}>
            ${opt.label}
          </option>
        `).join('')}
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
  const actionAttr = dataAction ? `data-action="${dataAction}"` : '';

  return `
    <label class="flex items-start justify-between gap-4 p-3 rounded-2xl bg-surface-base border border-white/5 hover:border-white/10 transition-colors cursor-pointer select-none ${className}">
      <div class="space-y-0.5">
        <div class="text-xs font-semibold text-slate-100">${label}</div>
        ${description ? `<p class="text-[11px] text-slate-400 leading-relaxed">${description}</p>` : ''}
      </div>
      <div class="relative inline-flex items-center shrink-0 min-h-[44px]">
        <input
          type="checkbox"
          id="${id}"
          ${actionAttr}
          ${checked ? 'checked' : ''}
          ${disabled ? 'disabled' : ''}
          class="sr-only peer"
        />
        <div class="w-11 h-6 bg-surface-raised peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[12px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-accent,#e59b3c)] border border-white/15"></div>
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
  const actionAttr = dataAction ? `data-action="${dataAction}"` : '';

  return `
    <label class="inline-flex items-center gap-2.5 min-h-[44px] cursor-pointer select-none text-xs text-slate-200 ${className}">
      <input
        type="checkbox"
        id="${id}"
        ${actionAttr}
        ${checked ? 'checked' : ''}
        ${disabled ? 'disabled' : ''}
        class="w-4 h-4 rounded bg-surface-raised border border-white/20 accent-[var(--color-accent,#e59b3c)] cursor-pointer"
      />
      <span>${label}</span>
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
    <div class="flex items-center space-x-1.5 overflow-x-auto pb-1.5 scrollbar-none border-b border-white/5 ${className}">
      ${tabs.map(tab => {
        const isActive = tab.id === activeTabId;
        return `
          <button
            type="button"
            data-action="${dataAction}"
            data-tab-id="${tab.id}"
            class="px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center space-x-2 cursor-pointer border ${
              isActive
                ? 'bg-[var(--color-accent,#e59b3c)]/15 text-white border-[var(--color-accent,#e59b3c)]/40 shadow-sm'
                : 'bg-surface-raised hover:bg-surface-overlay text-slate-400 hover:text-slate-200 border-white/5'
            }"
          >
            ${tab.icon ? `<span>${renderIcon(tab.icon, { size: 14 })}</span>` : ''}
            <span>${tab.label}</span>
            ${tab.badge !== undefined ? `<span class="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-white/10 text-white">${tab.badge}</span>` : ''}
          </button>
        `;
      }).join('')}
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

  const fallbackInitial = (name || 'U').charAt(0).toUpperCase();

  return `
    <div class="relative inline-block shrink-0 ${className}">
      <div class="${sizeStyles} rounded-full overflow-hidden bg-surface-raised border border-white/10 flex items-center justify-center font-bold text-slate-200">
        ${src ? `<img src="${src}" alt="${name}" class="w-full h-full object-cover" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" /><span style="display:none;">${fallbackInitial}</span>` : `<span>${fallbackInitial}</span>`}
      </div>
      ${status ? `<span class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-surface-base ${statusStyles}"></span>` : ''}
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

  return `
    <div
      id="${id}"
      class="fixed inset-0 z-50 ${isOpen ? 'flex' : 'hidden'} items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in ${className}"
      role="dialog"
      aria-modal="true"
    >
      <div class="w-full max-w-lg max-h-[90vh] bg-surface-base border border-white/15 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 overflow-y-auto space-y-4 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        <div class="flex items-center justify-between pb-3 border-b border-white/10">
          <h3 class="text-base font-bold text-white">${title}</h3>
          <button
            type="button"
            data-action="close-sheet"
            data-sheet-id="${id}"
            class="p-2 text-slate-400 hover:text-white rounded-xl bg-surface-raised cursor-pointer"
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
    <div class="flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-rose-500/20 bg-rose-950/20 my-4 space-y-3 ${className}">
      <div class="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center text-xl">
        ⚠️
      </div>
      <h3 class="text-sm font-bold text-rose-300">${title}</h3>
      <p class="text-xs text-rose-400/80 max-w-sm">${message}</p>
      ${retryLabel ? renderButton({ label: retryLabel, dataAction: retryAction, variant: 'danger', size: 'sm' }) : ''}
    </div>
  `;
}

export interface ProgressProps {
  value: number; // 0 to 100
  label?: string;
  variant?: 'cyan' | 'emerald' | 'amber' | 'rose';
  className?: string;
}

export function renderProgress(props: ProgressProps): string {
  const { value, label = '', variant = 'cyan', className = '' } = props;
  const boundedValue = Math.max(0, Math.min(100, value));

  const variantStyles = {
    cyan: 'bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.4)]',
    emerald: 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.4)]',
    amber: 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.4)]',
    rose: 'bg-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.4)]',
  }[variant];

  return `
    <div class="w-full space-y-1.5 ${className}">
      ${label ? `<div class="flex justify-between text-[11px] font-mono text-slate-400"><span>${label}</span><span>${boundedValue}%</span></div>` : ''}
      <div class="w-full h-2 bg-surface-raised rounded-full overflow-hidden border border-white/5">
        <div class="h-full rounded-full transition-all duration-300 ${variantStyles}" style="width: ${boundedValue}%;"></div>
      </div>
    </div>
  `;
}

export interface DataTableColumn<T> {
  header: string;
  render: (item: T) => string;
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
    <div class="w-full overflow-x-auto rounded-2xl border border-white/10 bg-surface-base/80 ${className}">
      <table class="w-full text-left text-xs border-collapse">
        <thead>
          <tr class="border-b border-white/10 bg-surface-raised/40 text-slate-400 font-mono">
            ${columns.map(col => `<th class="px-4 py-3 font-semibold ${col.className || ''}">${col.header}</th>`).join('')}
          </tr>
        </thead>
        <tbody class="divide-y divide-white/5 text-slate-200">
          ${data.map(item => `
            <tr class="hover:bg-white/5 transition-colors">
              ${columns.map(col => `<td class="px-4 py-3 ${col.className || ''}">${col.render(item)}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

