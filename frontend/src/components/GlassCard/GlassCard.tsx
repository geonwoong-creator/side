import React from "react";
import styles from "./GlassCard.module.css";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hoverable?: boolean;
}

export default function GlassCard({
  children,
  hoverable = false,
  className = "",
  ...props
}: GlassCardProps) {
  return (
    <div
      className={`${styles.card} ${hoverable ? styles.hoverable : ""} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
