"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Check, MoreHorizontal } from "lucide-react";

export type ActionMenuItem = {
  id: string;
  label: string;
  description?: string;
  /** Display only, for example ⌘K. The component does not bind it. */
  shortcut?: string;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  /** Shows a check mark for the current choice. */
  selected?: boolean;
  onSelect?: () => void;
};

export type ActionMenuGroup = {
  id: string;
  label?: string;
  items: ActionMenuItem[];
};

export type ActionMenuProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "onSelect" | "children"
> & {
  groups: ActionMenuGroup[];
  /** Accessible name for the trigger and menu. */
  label?: string;
  trigger?: ReactNode;
  align?: "start" | "end";
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSelect?: (item: ActionMenuItem) => void;
};

/**
 * A compact action menu. The trigger is a real menu button; arrow keys,
 * Home/End, Escape, and Tab follow the menu-button keyboard path, and focus
 * returns to the trigger on every close.
 */
export function ActionMenu({
  groups,
  label = "Actions",
  trigger,
  align = "start",
  open,
  defaultOpen = false,
  onOpenChange,
  onSelect,
  className = "",
  ...props
}: ActionMenuProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = open ?? internalOpen;
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const items = groups.flatMap((group) => group.items);
  const enabled = items.filter((item) => !item.disabled);

  function requestOpen(next: boolean) {
    if (open === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  }

  function openMenu() {
    requestOpen(true);
    requestAnimationFrame(() => {
      menuRef.current
        ?.querySelector<HTMLButtonElement>(
          '[role="menuitem"]:not([data-disabled]), [role="menuitemradio"]:not([data-disabled])',
        )
        ?.focus();
    });
  }

  function closeMenu(returnFocus = true) {
    requestOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  function select(item: ActionMenuItem) {
    if (item.disabled) return;
    item.onSelect?.();
    onSelect?.(item);
    closeMenu();
  }

  useEffect(() => {
    if (!isOpen) return;
    function close() {
      if (open === undefined) setInternalOpen(false);
      onOpenChange?.(false);
    }
    function onPointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        close();
      }
    }
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      close();
      triggerRef.current?.focus();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, open, onOpenChange]);

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      closeMenu();
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const focusable = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]:not([data-disabled]), [role="menuitemradio"]:not([data-disabled])',
      ) ?? [],
    );
    if (!focusable.length) return;
    const current = focusable.indexOf(
      document.activeElement as HTMLButtonElement,
    );
    let next = current;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = focusable.length - 1;
    else if (event.key === "ArrowDown") next = (current + 1) % focusable.length;
    else next = (current - 1 + focusable.length) % focusable.length;
    focusable[next]?.focus();
  }

  return (
    <div {...props} ref={rootRef} className={`action-menu ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        className="action-menu-trigger"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={`${id}-menu`}
        onClick={() => (isOpen ? closeMenu() : openMenu())}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown") return;
          event.preventDefault();
          openMenu();
        }}
      >
        {trigger ?? (
          <>
            <MoreHorizontal size={17} aria-hidden="true" />
            <span>{label}</span>
          </>
        )}
      </button>
      {isOpen && (
        <div
          ref={menuRef}
          id={`${id}-menu`}
          className="action-menu-panel"
          role="menu"
          aria-label={label}
          data-align={align}
          onKeyDown={onMenuKeyDown}
        >
          {groups.map((group, groupIndex) => (
            <div
              className="action-menu-group"
              role={group.label ? "group" : undefined}
              aria-labelledby={
                group.label ? `${id}-group-${group.id}` : undefined
              }
              key={group.id}
            >
              {group.label && (
                <div
                  className="action-menu-label"
                  id={`${id}-group-${group.id}`}
                >
                  {group.label}
                </div>
              )}
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role={
                    item.selected === undefined ? "menuitem" : "menuitemradio"
                  }
                  aria-checked={
                    item.selected === undefined
                      ? undefined
                      : Boolean(item.selected)
                  }
                  tabIndex={-1}
                  className="action-menu-item"
                  data-danger={item.danger || undefined}
                  data-disabled={item.disabled || undefined}
                  aria-disabled={item.disabled || undefined}
                  onClick={() => select(item)}
                >
                  {item.icon && (
                    <span className="action-menu-icon" aria-hidden="true">
                      {item.icon}
                    </span>
                  )}
                  <span className="action-menu-copy">
                    <span>{item.label}</span>
                    {item.description && <small>{item.description}</small>}
                  </span>
                  {item.selected && (
                    <Check
                      className="action-menu-check"
                      size={14}
                      aria-hidden="true"
                    />
                  )}
                  {item.shortcut && (
                    <kbd className="action-menu-shortcut">{item.shortcut}</kbd>
                  )}
                </button>
              ))}
              {groupIndex < groups.length - 1 && (
                <span className="action-menu-separator" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>
      )}
      <span className="action-menu-sr" aria-live="polite">
        {enabled.length} actions available
      </span>
    </div>
  );
}

