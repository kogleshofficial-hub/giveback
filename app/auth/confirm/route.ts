import { type EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export async function GET(request:NextRequest){const url=request.nextUrl.clone();const token_hash=url.searchParams.get("token_hash");const type=url.searchParams.get("type") as EmailOtpType|null;const next=url.searchParams.get("next")||"/dashboard";url.pathname=next;url.search="";if(token_hash&&type){const {error}=await (await createClient()).auth.verifyOtp({type,token_hash});if(!error)return NextResponse.redirect(url)}url.pathname="/login";url.searchParams.set("error","email_confirmation_failed");return NextResponse.redirect(url)}


