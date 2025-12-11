import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import {
  buscarDadosBasicosPessoa,
  listarExperienciasArtisticas,
  listarFormacoesExternas,
  listarFormacoesInternas,
} from "@/lib/academico/curriculoServer";

export const runtime = "nodejs";

type RouteParams = {
  params: { pessoaId: string };
};

function getInitials(nome?: string | null) {
  if (!nome) return "CD";
  const parts = nome.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  const initials = `${first}${last}`.toUpperCase();
  return initials || "CD";
}

async function embedFoto(
  pdfDoc: PDFDocument,
  fotoUrl?: string | null
): Promise<{ imgRef: any; width: number; height: number } | null> {
  if (!fotoUrl) return null;
  try {
    const resp = await fetch(fotoUrl);
    if (!resp.ok) return null;
    const contentType = resp.headers.get("content-type") ?? "";
    const bytes = await resp.arrayBuffer();

    if (contentType.includes("png")) {
      const img = await pdfDoc.embedPng(bytes);
      return { imgRef: img, width: img.width, height: img.height };
    }
    const img = await pdfDoc.embedJpg(bytes);
    return { imgRef: img, width: img.width, height: img.height };
  } catch (e) {
    console.error("Erro ao carregar foto para o PDF:", e);
    return null;
  }
}

export async function GET(_req: Request, { params }: RouteParams) {
  const pessoaId = Number(params.pessoaId);
  if (!pessoaId || Number.isNaN(pessoaId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const pessoa = await buscarDadosBasicosPessoa(pessoaId);
  if (!pessoa) {
    return NextResponse.json({ error: "Pessoa não encontrada" }, { status: 404 });
  }

  const [formacoesInternas, formacoesExternas, experiencias] = await Promise.all([
    listarFormacoesInternas(pessoaId),
    listarFormacoesExternas(pessoaId),
    listarExperienciasArtisticas(pessoaId),
  ]);

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const fontTitle = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontText = await pdfDoc.embedFont(StandardFonts.Helvetica);

  let cursorY = height - 60;

  // Título
  page.drawText("Currículo — Conexão Dança", {
    x: 50,
    y: cursorY,
    size: 18,
    font: fontTitle,
    color: rgb(0.35, 0.16, 0.65),
  });
  cursorY -= 30;

  // Nome
  const nomePessoa = pessoa.nome ?? "Nome não informado";
  page.drawText(nomePessoa, {
    x: 50,
    y: cursorY,
    size: 16,
    font: fontTitle,
    color: rgb(0, 0, 0),
  });
  cursorY -= 20;

  // Contatos básicos
  const contatos = [pessoa.email, pessoa.telefone, pessoa.telefone_secundario].filter(Boolean).join(" • ");
  if (contatos) {
    page.drawText(contatos, {
      x: 50,
      y: cursorY,
      size: 10,
      font: fontText,
      color: rgb(0.2, 0.2, 0.2),
    });
    cursorY -= 18;
  }

  // Foto
  const foto = await embedFoto(pdfDoc, pessoa.foto_url);
  if (foto) {
    const scale = 100 / foto.height;
    const w = foto.width * scale;
    const h = foto.height * scale;
    page.drawImage(foto.imgRef, {
      x: width - w - 50,
      y: height - h - 60,
      width: w,
      height: h,
    });
  } else {
    page.drawText(getInitials(pessoa.nome), {
      x: width - 90,
      y: height - 110,
      size: 26,
      font: fontTitle,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  const drawSectionTitle = (title: string) => {
    cursorY -= 24;
    page.drawText(title, {
      x: 50,
      y: cursorY,
      size: 12,
      font: fontTitle,
      color: rgb(0.1, 0.1, 0.1),
    });
    cursorY -= 10;
  };

  const drawLine = (text: string) => {
    if (!text) return;
    if (cursorY < 60) {
      const newPage = pdfDoc.addPage([595.28, 841.89]);
      cursorY = newPage.getHeight() - 60;
    }
    const currentPage = pdfDoc.getPages()[pdfDoc.getPages().length - 1];
    currentPage.drawText(text, {
      x: 60,
      y: cursorY,
      size: 10,
      font: fontText,
      color: rgb(0, 0, 0),
    });
    cursorY -= 14;
  };

  // Formações internas
  if (formacoesInternas && formacoesInternas.length > 0) {
    drawSectionTitle("Formações internas");
    for (const f of formacoesInternas) {
      const linha = [
        f.curso ?? "",
        f.nivel ?? "",
        f.data_conclusao ?? f.data_fim ?? "",
      ]
        .filter(Boolean)
        .join(" — ");
      drawLine(linha.trim());
    }
  }

  // Formações externas
  if (formacoesExternas && formacoesExternas.length > 0) {
    drawSectionTitle("Formações externas");
    for (const f of formacoesExternas) {
      const linha = [
        f.nome_formacao ?? "",
        f.instituicao ?? "",
        f.cidade_pais ?? "",
        f.data_inicio && f.data_fim ? `${f.data_inicio} a ${f.data_fim}` : f.data_inicio ?? f.data_fim ?? "",
      ]
        .filter(Boolean)
        .join(" — ");
      drawLine(linha.trim());
    }
  }

  // Experiências artísticas
  if (experiencias && experiencias.length > 0) {
    drawSectionTitle("Experiências artísticas");
    for (const e of experiencias) {
      const linha = [
        e.nome_evento ?? "",
        e.papel ?? "",
        e.local ?? "",
        e.data_evento ?? "",
      ]
        .filter(Boolean)
        .join(" — ");
      drawLine(linha.trim());
    }
  }

  const pdfBytes = await pdfDoc.save();

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="curriculo_${pessoaId}.pdf"`,
    },
  });
}
