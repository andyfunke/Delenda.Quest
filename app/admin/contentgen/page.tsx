import { notFound } from "next/navigation";
import { ContentgenLab } from "../../ContentgenLab";
import { requireAuthenticatedUser } from "../../auth";
import { isAdmin } from "../../../db/admin";

export const dynamic = "force-dynamic";

export default async function ContentgenLabRoute() {
  const user = await requireAuthenticatedUser("/admin/contentgen");
  if (!(await isAdmin(user))) notFound();
  return (
    <main className="admin-route contentgen-lab-route">
      <ContentgenLab />
    </main>
  );
}
