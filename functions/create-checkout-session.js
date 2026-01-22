export async function onRequestPost(context) {
    const { request, env } = context;
    const headers = { "content-type": "application/json" };

    if (!env.STRIPE_SECRET_KEY) {
        return new Response(JSON.stringify({ error: "Missing Stripe secret key." }), {
            status: 500,
            headers,
        });
    }

    let payload = {};
    try {
        payload = await request.json();
    } catch (error) {
        return new Response(JSON.stringify({ error: "Invalid request body." }), {
            status: 400,
            headers,
        });
    }

    const amount = Number(payload.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
        return new Response(JSON.stringify({ error: "Invalid donation amount." }), {
            status: 400,
            headers,
        });
    }

    const frequency = payload.frequency === "monthly" ? "monthly" : "one_time";
    const amountInCents = Math.round(amount * 100);
    const donorName = typeof payload.name === "string" ? payload.name.trim() : "";
    const donorEmail = typeof payload.email === "string" ? payload.email.trim() : "";

    const baseUrl = new URL(request.url).origin;
    const successUrl = `${baseUrl}/donate/?success=1`;
    const cancelUrl = `${baseUrl}/donate/?canceled=1`;

    const params = new URLSearchParams();
    params.set("mode", frequency === "monthly" ? "subscription" : "payment");
    params.set("success_url", successUrl);
    params.set("cancel_url", cancelUrl);
    params.append("payment_method_types[]", "card");
    params.set("line_items[0][quantity]", "1");
    params.set("line_items[0][price_data][currency]", "gbp");
    params.set("line_items[0][price_data][product_data][name]", "We Care For You Donation");
    params.set("line_items[0][price_data][unit_amount]", String(amountInCents));

    if (frequency === "monthly") {
        params.set("line_items[0][price_data][recurring][interval]", "month");
    }

    if (donorEmail) {
        params.set("customer_email", donorEmail);
    }

    if (donorName) {
        params.set("metadata[donor_name]", donorName);
    }

    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
    });

    const stripeData = await stripeResponse.json();

    if (!stripeResponse.ok) {
        return new Response(
            JSON.stringify({ error: stripeData.error?.message || "Stripe error." }),
            {
                status: 400,
                headers,
            }
        );
    }

    return new Response(JSON.stringify({ url: stripeData.url }), {
        status: 200,
        headers,
    });
}
