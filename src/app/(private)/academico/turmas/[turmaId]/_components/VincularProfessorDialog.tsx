"use client";

import { useState } from "react";

import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "shadcn/ui";

type VincularProfessorDialogProps = {
  turmaId: number;
  onLinked?: () => void;
};

export function VincularProfessorDialog({ turmaId, onLinked }: VincularProfessorDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Vincular professor</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vincular professor a turma</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          TODO: implementar formulario para vincular professor na turma {turmaId}.
        </p>

        {onLinked && (
          <p className="text-[11px] text-muted-foreground">
            Callback onLinked disponivel para integrar apos a implementacao.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
