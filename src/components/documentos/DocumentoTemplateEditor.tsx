"use client";

import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import { Button } from "@/components/ui/button";

type DocumentoVariavel = {
  id: number;
  codigo: string;
  descricao: string;
  origem: string;
  tipo: string;
  path_origem: string | null;
  formato: string | null;
  ativo: boolean;
};

type Props = {
  initialHtml: string;
  onChangeHtml: (html: string) => void;
};

export function DocumentoTemplateEditor(props: Props) {
  const [vars, setVars] = useState<DocumentoVariavel[]>([]);
  const [varsLoading, setVarsLoading] = useState(false);
  const [selectedVar, setSelectedVar] = useState<string>("");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image,
    ],
    content: props.initialHtml || "<p></p>",
    onUpdate: ({ editor }) => {
      props.onChangeHtml(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const html = props.initialHtml || "<p></p>";
    if (editor.getHTML() !== html) {
      editor.commands.setContent(html, false);
    }
  }, [editor, props.initialHtml]);

  useEffect(() => {
    let active = true;

    const carregarVariaveis = async () => {
      setVarsLoading(true);
      try {
        const res = await fetch("/api/documentos/variaveis");
        const json = (await res.json()) as { data?: DocumentoVariavel[] };
        if (active) {
          setVars((json.data ?? []).filter((v) => v.ativo));
        }
      } finally {
        if (active) setVarsLoading(false);
      }
    };

    void carregarVariaveis();
    return () => {
      active = false;
    };
  }, []);

  function inserirVariavel() {
    if (!editor) return;
    const codigo = selectedVar.trim();
    if (!codigo) return;
    editor.chain().focus().insertContent(`{{${codigo}}}`).run();
    setSelectedVar("");
  }

  function inserirImagemUrl() {
    if (!editor) return;
    const url = window.prompt("Cole a URL da imagem:");
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
  }

  const disabled = !editor;
  const toolbarBtn = "rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={toolbarBtn}
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          Negrito
        </button>
        <button
          type="button"
          className={toolbarBtn}
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          Italico
        </button>
        <button
          type="button"
          className={toolbarBtn}
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          Sublinhado
        </button>
        <button
          type="button"
          className={toolbarBtn}
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          Lista
        </button>
        <button
          type="button"
          className={toolbarBtn}
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          Numeracao
        </button>
        <button
          type="button"
          className={toolbarBtn}
          disabled={disabled}
          onClick={() => editor?.chain().focus().setTextAlign("left").run()}
        >
          Esquerda
        </button>
        <button
          type="button"
          className={toolbarBtn}
          disabled={disabled}
          onClick={() => editor?.chain().focus().setTextAlign("center").run()}
        >
          Centro
        </button>
        <button
          type="button"
          className={toolbarBtn}
          disabled={disabled}
          onClick={() => editor?.chain().focus().setTextAlign("right").run()}
        >
          Direita
        </button>

        <button type="button" className={toolbarBtn} disabled={disabled} onClick={inserirImagemUrl}>
          Imagem (URL)
        </button>

        <div className="ml-auto flex items-center gap-2">
          <select
            className="min-w-[260px] rounded-lg border px-3 py-2 text-sm"
            value={selectedVar}
            onChange={(e) => setSelectedVar(e.target.value)}
            disabled={varsLoading}
          >
            <option value="">{varsLoading ? "Carregando variaveis..." : "Inserir variavel..."}</option>
            {vars.map((v) => (
              <option key={v.id} value={v.codigo}>
                {v.codigo} - {v.descricao}
              </option>
            ))}
          </select>
          <Button type="button" variant="secondary" onClick={inserirVariavel} disabled={!selectedVar}>
            Inserir
          </Button>
        </div>
      </div>

      <div className="min-h-[380px] rounded-xl border bg-white p-3">
        <EditorContent editor={editor} />
      </div>

      <p className="text-xs opacity-70">
        Dica: placeholders sao inseridos como {"{{CODIGO}}"}.
      </p>
    </div>
  );
}
