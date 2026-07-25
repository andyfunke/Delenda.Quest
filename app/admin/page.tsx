import { notFound } from "next/navigation";
import { AdminPage } from "../AdminPage";
import { requireChatGPTUser } from "../chatgpt-auth";
import { isAdmin } from "../../db/admin";

export const dynamic="force-dynamic";

export default async function AdminRoute(){
  const user=await requireChatGPTUser("/admin");
  if(!await isAdmin(user))notFound();
  return <main className="admin-route"><AdminPage /></main>;
}
