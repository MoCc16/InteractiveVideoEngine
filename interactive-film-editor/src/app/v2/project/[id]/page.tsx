import { redirect } from "@/i18n/navigation";

export default async function ProjectIndex({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/v2/project/${id}/graph`);
}
