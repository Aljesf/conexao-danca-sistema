"use client";

import { useState } from "react";

import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "shadcn/ui";

type NovaAvaliacaoDialogProps = {
  turmaId: number;
  onCreated?: () => void;
};

export function NovaAvaliacaoDialog({ turmaId, onCreated }: NovaAvaliacaoDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Nova avaliacao
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova avaliacao da turma</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          TODO: implementar formulario de criacao de avaliacao para a turma {turmaId}.
        </p>

        {onCreated && (
          <p className="text-[11px] text-muted-foreground">
            Callback onCreated disponivel para integrar apos a implementacao.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
