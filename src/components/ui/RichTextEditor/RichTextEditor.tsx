"use client";

import React from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import FontFamily from "@tiptap/extension-font-family";
import Image from "@tiptap/extension-image";

import { FontSize } from "@/components/documentos/tiptap/FontSize";
import { ImagemPickerModal } from "@/components/documentos/ImagemPickerModal";

import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Undo2,
  Redo2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  Type,
  Image as ImageIcon,
} from "lucide-react";

export type RteVariable = { code: string; label: string };

export type RichTextEditorHandle = {
  insertPlaceholder: (code: string) => void;
  insertText: (text: string) => void;
};

export type RichTextEditorProps = {
  valueHtml: string;
  onChangeHtml: (html: string) => void;
  minHeightPx?: number;
  enableVariables?: boolean;
  variables?: RteVariable[];
  enableCollections?: boolean;
  enableImages?: boolean;
  className?: string;
};

type ToolbarButtonProps = {
  title: string;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
};

function ToolbarButton({ title, active, onClick, disabled, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={[
        "inline-flex items-center justify-center rounded-md border px-2 py-1",
        "text-slate-700 hover:bg-slate-100",
        "disabled:opacity-50 disabled:hover:bg-transparent",
        active ? "bg-slate-200 border-slate-300" : "bg-white border-slate-200",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function setFontSize(editor: Editor, fontSizePx: string) {
  editor.chain().focus().setMark("textStyle", { fontSize: fontSizePx }).run();
}

const FONTES = [
  { label: "Padrao", value: "" },
  { label: "Arial", value: "Arial" },
  { label: "Georgia", value: "Georgia" },
  { label: "Times New Roman", value: "Times New Roman" },
  { label: "Verdana", value: "Verdana" },
  { label: "Tahoma", value: "Tahoma" },
];

const TAMANHOS = ["10px", "12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px"];

export const RichTextEditor = React.forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  function RichTextEditor(
    {
      valueHtml,
      onChangeHtml,
      minHeightPx = 260,
      enableVariables = false,
      variables = [],
      enableCollections = false,
      enableImages = true,
      className,
    },
    ref,
  ) {
    const [pickerOpen, setPickerOpen] = React.useState(false);
    const [colecoes, setColecoes] = React.useState<
      Array<{ codigo: string; nome: string; colunas: Array<{ codigo: string }> }>
    >([]);
    const [colecoesLoading, setColecoesLoading] = React.useState(false);
    const editor = useEditor({
      immediatelyRender: false,
      extensions: [
        StarterKit,
        Underline,
        TextStyle,
        Color,
        Highlight,
        FontFamily.configure({ types: ["textStyle"] }),
        FontSize,
        TextAlign.configure({
          types: ["heading", "paragraph"],
          alignments: ["left", "center", "right", "justify"],
        }),
        ...(enableImages
          ? [
              Image.configure({
                inline: false,
                allowBase64: false,
              }),
            ]
          : []),
      ],
      content: valueHtml || "<p></p>",
      onUpdate: ({ editor }) => onChangeHtml(editor.getHTML()),
      editorProps: {
        attributes: {
          class: [
            "w-full rounded-md border border-slate-200 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-slate-300",
            className || "",
          ].join(" "),
          style: `min-height: ${minHeightPx}px;`,
        },
      },
    });

    React.useEffect(() => {
      if (!editor) return;
      const current = editor.getHTML();
      if (valueHtml && valueHtml !== current) {
        editor.commands.setContent(valueHtml, false);
      }
    }, [valueHtml, editor]);

    React.useImperativeHandle(
      ref,
      () => ({
        insertPlaceholder(code: string) {
          if (!editor) return;
          editor.chain().focus().insertContent(`{{${code}}}`).run();
        },
        insertText(text: string) {
          if (!editor) return;
          editor.chain().focus().insertContent(text).run();
        },
      }),
      [editor],
    );

    if (!editor) return null;

    const canUndo = editor.can().chain().focus().undo().run();
    const canRedo = editor.can().chain().focus().redo().run();

    function buildColecaoExample(codigo: string, colunas: Array<{ codigo: string }>): string {
      const cols = colunas.map((col) => `  <td>{{${col.codigo}}}</td>`).join("\n");
      return `{{#${codigo}}}\n<tr>\n${cols}\n</tr>\n{{/${codigo}}}`;
    }

    async function inserirBlocoColecao() {
      if (colecoesLoading) return;
      setColecoesLoading(true);
      try {
        let lista = colecoes;
        if (!lista.length) {
          const res = await fetch("/api/documentos/colecoes/catalogo", { cache: "no-store" });
          const json = (await res.json()) as {
            data?: Array<{ codigo?: string; nome?: string; colunas?: Array<{ codigo?: string }> }>;
          };
          if (!res.ok) throw new Error("Falha ao carregar catalogo.");
          lista = (json.data ?? [])
            .map((c) => ({
              codigo: String(c.codigo ?? "").trim().toUpperCase(),
              nome: String(c.nome ?? "").trim(),
              colunas: (c.colunas ?? [])
                .map((col) => ({ codigo: String(col.codigo ?? "").trim().toUpperCase() }))
                .filter((col) => col.codigo.length > 0),
            }))
            .filter((c) => c.codigo.length > 0);
          setColecoes(lista);
        }

        if (!lista.length) {
          window.alert("Nenhuma colecao encontrada.");
          return;
        }

        const options = lista
          .map((c, idx) => `${idx + 1}) ${c.codigo} - ${c.nome}`)
          .join("\n");
        const choiceRaw = window.prompt(`Escolha a colecao:\n${options}`);
        if (!choiceRaw) return;
        const choice = choiceRaw.trim().toUpperCase();
        const index = Number(choice);
        const selected = Number.isFinite(index) ? lista[index - 1] : lista.find((c) => c.codigo === choice);
        if (!selected) {
          window.alert("Colecao nao encontrada.");
          return;
        }

        const bloco = buildColecaoExample(selected.codigo, selected.colunas);
        editor.chain().focus().insertContent(bloco).run();
      } catch {
        window.alert("Falha ao carregar colecoes.");
      } finally {
        setColecoesLoading(false);
      }
    }

    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-2">
          <ToolbarButton title="Negrito" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
            <Bold size={16} />
          </ToolbarButton>
          <ToolbarButton title="Italico" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic size={16} />
          </ToolbarButton>
          <ToolbarButton title="Sublinhado" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
            <UnderlineIcon size={16} />
          </ToolbarButton>
          <ToolbarButton title="Riscado" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
            <Strikethrough size={16} />
          </ToolbarButton>

          <span className="mx-1 h-6 w-px bg-slate-200" />

          <div className="flex items-center gap-1">
            <span className="inline-flex items-center text-slate-500" title="Fonte">
              <Type size={16} />
            </span>
            <select
              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs"
              defaultValue=""
              onChange={(e) => {
                const val = e.target.value;
                if (val) editor.chain().focus().setFontFamily(val).run();
                else editor.chain().focus().unsetFontFamily().run();
                e.currentTarget.value = "";
              }}
            >
              {FONTES.map((f) => (
                <option key={f.label} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <select
            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs"
            defaultValue=""
            title="Tamanho da fonte"
            onChange={(e) => {
              const val = e.target.value;
              if (val) setFontSize(editor, val);
              e.currentTarget.value = "";
            }}
          >
            <option value="" disabled>
              Tamanho
            </option>
            {TAMANHOS.map((t) => (
              <option key={t} value={t}>
                {t.replace("px", "")}
              </option>
            ))}
          </select>

          <input
            type="color"
            className="h-8 w-10 cursor-pointer rounded-md border border-slate-200 bg-white"
            title="Cor do texto"
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          />

          <ToolbarButton title="Marca-texto" active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()}>
            <Highlighter size={16} />
          </ToolbarButton>

          <span className="mx-1 h-6 w-px bg-slate-200" />

          <ToolbarButton title="Alinhar a esquerda" onClick={() => editor.chain().focus().setTextAlign("left").run()}>
            <AlignLeft size={16} />
          </ToolbarButton>
          <ToolbarButton title="Centralizar" onClick={() => editor.chain().focus().setTextAlign("center").run()}>
            <AlignCenter size={16} />
          </ToolbarButton>
          <ToolbarButton title="Alinhar a direita" onClick={() => editor.chain().focus().setTextAlign("right").run()}>
            <AlignRight size={16} />
          </ToolbarButton>
          <ToolbarButton title="Justificar" onClick={() => editor.chain().focus().setTextAlign("justify").run()}>
            <AlignJustify size={16} />
          </ToolbarButton>

          <span className="mx-1 h-6 w-px bg-slate-200" />

          <ToolbarButton title="Lista com marcadores" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <List size={16} />
          </ToolbarButton>
          <ToolbarButton title="Lista numerada" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <ListOrdered size={16} />
          </ToolbarButton>

          <span className="mx-1 h-6 w-px bg-slate-200" />

          <ToolbarButton title="Desfazer" onClick={() => editor.chain().focus().undo().run()} disabled={!canUndo}>
            <Undo2 size={16} />
          </ToolbarButton>
          <ToolbarButton title="Refazer" onClick={() => editor.chain().focus().redo().run()} disabled={!canRedo}>
            <Redo2 size={16} />
          </ToolbarButton>

        {enableImages ? (
          <>
            <span className="mx-1 h-6 w-px bg-slate-200" />
            <ToolbarButton title="Inserir imagem" onClick={() => setPickerOpen(true)}>
              <ImageIcon size={16} />
            </ToolbarButton>
          </>
        ) : null}

          {enableVariables ? (
            <>
              <span className="mx-1 h-6 w-px bg-slate-200" />
              <select
                className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs"
                defaultValue=""
                title="Inserir variavel"
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) editor.chain().focus().insertContent(`{{${val}}}`).run();
                  e.currentTarget.value = "";
                }}
              >
                <option value="" disabled>
                  Variaveis
                </option>
                {variables.map((v) => (
                  <option key={v.code} value={v.code}>
                    {v.label} ({v.code})
                  </option>
                ))}
              </select>
            </>
          ) : null}

          {enableCollections ? (
            <>
              <span className="mx-1 h-6 w-px bg-slate-200" />
              <ToolbarButton
                title="Inserir bloco de colecao"
                onClick={inserirBlocoColecao}
                disabled={colecoesLoading}
              >
                <List size={16} />
              </ToolbarButton>
            </>
          ) : null}
        </div>

        <EditorContent editor={editor} />

        {enableImages ? (
          <ImagemPickerModal
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            onSelect={(url) => {
              editor.chain().focus().setImage({ src: url }).run();
            }}
          />
        ) : null}
      </div>
    );
  },
);
