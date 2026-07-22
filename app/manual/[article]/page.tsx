import { redirect } from "next/navigation";

export default async function ManualArticle({params}:{params:Promise<{article:string}>}){
  const {article}=await params;
  redirect(`/?wiki=${encodeURIComponent(article)}&standalone=1`);
}
