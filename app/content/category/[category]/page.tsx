import { redirect } from "next/navigation";
export default async function ContentCategoryPage({params}:{params:Promise<{category:string}>}){const{category}=await params;redirect(`/content?category=${encodeURIComponent(category)}`)}
