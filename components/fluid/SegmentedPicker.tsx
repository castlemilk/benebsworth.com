"use client";

import { useSpring } from "@usefluid/motion/react";
import { type KeyboardEvent, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import styles from "./SegmentedPicker.module.css";

const LEAD = { w: 34, z: 0.8 };
const TRAIL = { w: 17, z: 0.78 };

type Option<T> = { value: T; label: ReactNode; ariaLabel?: string };
type Props<T> = { label: string; value: T; onChange(value: NoInfer<T>): void; options: Option<NoInfer<T>>[] };

export function SegmentedPicker<T extends string>({ label, value, onChange, options }: Props<T>) {
  const root = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const [box, setBox] = useState({ left: 0, right: 0, ready: false });
  const placed = useRef({ ready: false, left: 0 });

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const measure = () => {
      const active = el.querySelector<HTMLElement>('[aria-checked="true"]');
      if (active) setBox({ left: active.offsetLeft, right: active.offsetLeft + active.offsetWidth, ready: true });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    for (const option of el.querySelectorAll('[role="radio"]')) observer.observe(option);
    return () => observer.disconnect();
  }, [value]);

  useEffect(() => {
    placed.current = { ready: box.ready, left: box.left };
  }, [box]);

  const movingRight = box.left >= placed.current.left;
  const immediate = !placed.current.ready;
  const edges = useRef({ left: 0, right: 0 });
  const paint = () => {
    if (!pill.current) return;
    pill.current.style.left = `${edges.current.left}px`;
    pill.current.style.width = `${Math.max(0, edges.current.right - edges.current.left)}px`;
  };
  useSpring(
    { v: box.left },
    ({ v }) => {
      edges.current.left = v;
      paint();
    },
    { ...(movingRight ? TRAIL : LEAD), immediate },
  );
  useSpring(
    { v: box.right },
    ({ v }) => {
      edges.current.right = v;
      paint();
    },
    { ...(movingRight ? LEAD : TRAIL), immediate },
  );

  const move = (e: KeyboardEvent, index: number) => {
    const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (index + delta + options.length) % options.length;
    onChange(options[next].value);
    root.current?.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus();
  };

  return (
    <div ref={root} role="radiogroup" aria-label={label} className={styles.root}>
      <span ref={pill} className={styles.pill} data-ready={box.ready} aria-hidden />
      {options.map((option, i) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          aria-label={option.ariaLabel}
          tabIndex={option.value === value ? 0 : -1}
          className={styles.option}
          onClick={() => onChange(option.value)}
          onKeyDown={(e) => move(e, i)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
