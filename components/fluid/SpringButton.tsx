"use client";

import { springs } from "@usefluid/motion";
import { useSpring } from "@usefluid/motion/react";
import { type ButtonHTMLAttributes, useRef, useState } from "react";
import styles from "./SpringButton.module.css";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "solid" | "quiet";
  pressed?: boolean;
};

export function SpringButton({ variant = "solid", pressed, className, ...props }: Props) {
  const el = useRef<HTMLButtonElement>(null);
  const [hover, setHover] = useState(false);
  const [down, setDown] = useState(false);
  const isDown = pressed ?? down;

  useSpring(
    { s: isDown ? 0.93 : hover ? 1.025 : 1 },
    ({ s }, velocity) => {
      if (!el.current) return;
      const stretch = Math.max(-0.05, Math.min(0.05, velocity.s * 0.03));
      el.current.style.transform = `scale(${s - stretch}, ${s + stretch})`;
    },
    springs.bouncy,
  );

  return (
    <button
      {...props}
      ref={el}
      className={[styles.button, className].filter(Boolean).join(" ")}
      data-variant={variant}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setHover(true);
        props.onPointerEnter?.(e);
      }}
      onPointerLeave={(e) => {
        setHover(false);
        setDown(false);
        props.onPointerLeave?.(e);
      }}
      onPointerDown={(e) => {
        setDown(true);
        props.onPointerDown?.(e);
      }}
      onPointerUp={(e) => {
        setDown(false);
        props.onPointerUp?.(e);
      }}
      onPointerCancel={(e) => {
        setDown(false);
        props.onPointerCancel?.(e);
      }}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") setDown(true);
        props.onKeyDown?.(e);
      }}
      onKeyUp={(e) => {
        setDown(false);
        props.onKeyUp?.(e);
      }}
      onBlur={(e) => {
        setDown(false);
        props.onBlur?.(e);
      }}
    />
  );
}
