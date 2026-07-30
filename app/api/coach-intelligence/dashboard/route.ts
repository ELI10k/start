import { NextResponse } from "next/server";
import { coachIntelligenceEnabled } from "@/lib/coach-intelligence/feature";
import { getAuthContext } from "@/lib/data/product-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export async function GET(){if(!coachIntelligenceEnabled)return NextResponse.json({enabled:false},{status:404});const auth=await getAuthContext();if(!auth||auth.role!=="coach")return NextResponse.json({error:"not_authorized"},{status:401});const supabase=await createSupabaseServerClient();const{data,error}=await supabase.from("habit_analysis_reports").select("client_id,consistency_score,client_health_score,risk_score,retention_risk,week_end,profiles!habit_analysis_reports_client_id_fkey(full_name)").eq("coach_id",auth.id).order("week_end",{ascending:false});if(error)return NextResponse.json({error:"dashboard_unavailable"},{status:500});return NextResponse.json({enabled:true,clients:data??[]})}
