import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface AuthHookPayload {
  user: {
    email: string;
  };
  email_data: {
    token: string;
    email_action_type: string;
  };
}

serve(async (req) => {
  try {
    // 1. Get the payload from Supabase Auth
    const payload: AuthHookPayload = await req.json()
    const { user, email_data } = payload

    // 2. We only want to intercept Password Recovery or Signup OTPs
    if (email_data.email_action_type !== 'recovery' && email_data.email_action_type !== 'signup') {
      return new Response(JSON.stringify({ message: "Not an OTP event, skipping." }), { status: 200 })
    }

    // 3. Prepare the EmailJS REST API Payload
    const emailJsPayload = {
      service_id: Deno.env.get("EMAILJS_SERVICE_ID"),
      template_id: Deno.env.get("EMAILJS_TEMPLATE_ID"),
      user_id: Deno.env.get("EMAILJS_PUBLIC_KEY"),
      accessToken: Deno.env.get("EMAILJS_PRIVATE_KEY"),
      template_params: {
        to_email: user.email,
        otp_code: email_data.token, // This is the 6-digit code Supabase generated
      }
    }

    // 4. Send the request to EmailJS
    const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailJsPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("EmailJS Error:", errorText);
      return new Response(JSON.stringify({ error: "Failed to send email" }), { status: 500 });
    }

    return new Response(
  JSON.stringify({ message: "Email sent successfully" }),
  { 
    status: 200, 
    headers: { "Content-Type": "application/json" } 
  }
)

  } catch (error) {
    console.error("Webhook Error:", error);
    return new Response(
  JSON.stringify({ error: error.message }),
  { 
    status: 500, 
    headers: { "Content-Type": "application/json" } 
  }
)
  }
})