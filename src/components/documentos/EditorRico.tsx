"use client";

import React from "react";
import {
  RichTextEditor,
  type RichTextEditorHandle,
  type RteVariable,
} from "@/components/ui/RichTextEditor/RichTextEditor";

export type VariavelDoc = RteVariable;
export type EditorRicoHandle = RichTextEditorHandle;

type Props = {
  valueHtml: string;
  onChangeHtml: (next: string) => void;
  variaveis: VariavelDoc[];
};

export const EditorRico = React.forwardRef<EditorRicoHandle, Props>(function EditorRico(
  { valueHtml, onChangeHtml, variaveis }: Props,
  ref,
) {
  return (
    <RichTextEditor
      ref={ref}
      valueHtml={valueHtml}
      onChangeHtml={onChangeHtml}
      enableVariables
      variables={variaveis}
    />
  );
});
