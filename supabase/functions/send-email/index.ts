import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

serve(async (req) => {
  if (req?.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  try {
    const { type, to, data } = await req?.json();
    const RESEND_API_KEY = Deno?.env?.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY no configurada");
    }

    let subject = "";
    let html = "";

    if (type === "reservation_confirmation") {
      subject = `Confirmación de Reservación - ${data?.restaurantName}`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px;">
          <div style="background: #1B3A6B; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: #f59e0b; margin: 0; font-size: 24px;">🍽️ ${data?.restaurantName}</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0;">Confirmación de Reservación</p>
          </div>
          <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1B3A6B; margin-top: 0;">¡Tu reservación está confirmada!</h2>
            <p style="color: #555;">Hola <strong>${data?.guestName}</strong>, tu reservación ha sido confirmada con los siguientes detalles:</p>
            <div style="background: #f0f4ff; border-left: 4px solid #1B3A6B; padding: 16px; border-radius: 4px; margin: 20px 0;">
              <p style="margin: 4px 0;"><strong>📅 Fecha:</strong> ${data?.date}</p>
              <p style="margin: 4px 0;"><strong>🕐 Hora:</strong> ${data?.time}</p>
              <p style="margin: 4px 0;"><strong>👥 Personas:</strong> ${data?.partySize}</p>
              ${data?.tableName ? `<p style="margin: 4px 0;"><strong>🪑 Mesa:</strong> ${data?.tableName}</p>` : ""}
              ${data?.notes ? `<p style="margin: 4px 0;"><strong>📝 Notas:</strong> ${data?.notes}</p>` : ""}
            </div>
            <p style="color: #555;">Si necesitas cancelar o modificar tu reservación, contáctanos al <strong>${data?.phone || "nuestro número"}</strong>.</p>
            <p style="color: #888; font-size: 13px; margin-top: 30px;">¡Te esperamos!</p>
          </div>
        </div>
      `;
    } else if (type === "demo_request") {
      subject = `Nueva Solicitud de Demo - ${data?.restaurantName}`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px;">
          <div style="background: #1B3A6B; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: #f59e0b; margin: 0; font-size: 24px;">🚀 SistemaRest</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0;">Nueva Solicitud de Demo</p>
          </div>
          <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1B3A6B; margin-top: 0;">Nuevo cliente interesado</h2>
            <div style="background: #f0f4ff; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin: 20px 0;">
              <p style="margin: 4px 0;"><strong>🏪 Restaurante:</strong> ${data?.restaurantName}</p>
              <p style="margin: 4px 0;"><strong>👤 Contacto:</strong> ${data?.contactName}</p>
              <p style="margin: 4px 0;"><strong>📧 Email:</strong> ${data?.email}</p>
              <p style="margin: 4px 0;"><strong>📱 Teléfono:</strong> ${data?.phone}</p>
              <p style="margin: 4px 0;"><strong>📦 Plan de interés:</strong> ${data?.plan}</p>
              ${data?.message ? `<p style="margin: 4px 0;"><strong>💬 Mensaje:</strong> ${data?.message}</p>` : ""}
            </div>
            <p style="color: #555;">Contacta a este prospecto a la brevedad posible.</p>
          </div>
        </div>
      `;
    } else if (type === "waitlist_notification") {
      subject = `Mesa disponible - ${data?.restaurantName}`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px;">
          <div style="background: #1B3A6B; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: #f59e0b; margin: 0; font-size: 24px;">🍽️ ${data?.restaurantName}</h1>
          </div>
          <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1B3A6B; margin-top: 0;">¡Hay una mesa disponible!</h2>
            <p style="color: #555;">Hola <strong>${data?.guestName}</strong>, tenemos buenas noticias. Se ha liberado una mesa para el horario que solicitaste.</p>
            <p style="color: #555;">Por favor contáctanos para confirmar tu lugar antes de que sea asignado a otro cliente.</p>
            <p style="color: #888; font-size: 13px; margin-top: 30px;">¡Te esperamos!</p>
          </div>
        </div>
      `;
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: [to],
        subject,
        html,
      }),
    });

    const result = await res?.json();

    if (!res?.ok) {
      throw new Error(result.message || "Error al enviar correo");
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
