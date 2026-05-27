import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = body.email;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required." },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("user_topic_preferences")
      .update({
        is_subscribed: false,
        updated_at: new Date().toISOString(),
      })
      .eq("email", email);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: "You have been unsubscribed.",
    });
  } catch (error) {
    console.error("Unsubscribe error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to unsubscribe.",
      },
      { status: 500 }
    );
  }
}