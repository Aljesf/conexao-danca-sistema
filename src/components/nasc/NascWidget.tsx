"use client";

import * as React from "react";
import { NascFloatingButton } from "./NascFloatingButton";
import { NascDrawer } from "./NascDrawer";

export function NascWidget() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <NascFloatingButton onClick={() => setOpen(true)} />
      <NascDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
