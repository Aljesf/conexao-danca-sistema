import { redirect } from "next/navigation";

type PageProps = {
  params: { responseId: string };
};

export default function AdminFormsResponsesRedirectPage({ params }: PageProps) {
  redirect(`/admin/forms/submissions/${params.responseId}`);
}
