"use client";

import { springs } from "@usefluid/motion";
import { useSpring } from "@usefluid/motion/react";
import { useRef } from "react";
import styles from "./SpringSwitch.module.css";

const TRAVEL = 20;

type Props = { checked: boolean; onChange(checked: boolean): void; label: string; className?: string };

export function SpringSwitch({ checked, onChange, label, className }: Props) {
  const thumb = useRef<HTMLSpanElement>(null);

  useSpring(
    { x: checked ? TRAVEL : 0 },
    ({ x }, velocity) => {
      if (!thumb.current) return;
      const stretch = Math.min(0.45, Math.abs(velocity.x) * 0.0016);
      thumb.current.style.transform = `translateX(${x}px) scale(${1 + stretch}, ${1 - stretch * 0.4})`;
    },
    springs.snappy,
  );

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={className ? `${styles.root} ${className}` : styles.root}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.label}>{label}</span>
      <span className={styles.track} data-on={checked}>
        <span ref={thumb} className={styles.thumb} />
      </span>
    </button>
  );
}
