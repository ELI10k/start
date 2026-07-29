import { redirect } from "next/navigation";
import ClientShell from "@/components/client/ClientShell";
import PageHeader from "@/components/client/PageHeader";
import PersistedCheckInForm from "@/components/client/PersistedCheckInForm";
import { getAuthContext } from "@/lib/data/product-repository";
export default async function CheckInPage(){const auth=await getAuthContext();if(!auth)redirect("/login");if(auth.role!=="client")redirect("/unauthorized");return <ClientShell><PageHeader eyebrow="עדכון שבועי" title="איך עבר עליך השבוע?" description="הצ׳ק-אין יישמר ויופיע למאמן." action={{href:"/check-in/history",label:"היסטוריה"}}/><PersistedCheckInForm/></ClientShell>}
