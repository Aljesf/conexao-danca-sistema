"use client";

import { useParams } from "next/navigation";
import EmitirDocumentosClient from "../EmitirDocumentosClient";

export default function EmitirDocumentosPage() {
  const params = useParams<{ id: string }>();
  const matriculaId = Number(params?.id);

  return <EmitirDocumentosClient matriculaId={matriculaId} />;
}
