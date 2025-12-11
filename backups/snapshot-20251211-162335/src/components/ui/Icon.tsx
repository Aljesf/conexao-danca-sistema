"use client";

import type { IconProps as PhosphorIconProps } from "@phosphor-icons/react";

export type IconComponent = (props: PhosphorIconProps) => JSX.Element;

export type AppIconProps = {
  icon: IconComponent;
  size?: number;
  weight?: PhosphorIconProps["weight"];
  className?: string;
};

export function AppIcon({ icon: Icon, size = 20, weight = "regular", className }: AppIconProps) {
  return <Icon size={size} weight={weight} className={className} />;
}
