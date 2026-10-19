import { createClient } from "npm:@supabase/supabase-js@2";

const EXPO_URL = "https://exp.host/--/api/v2/push/send";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

type Order = {
  id: string;
  student_id: string;
  order_number: number | null;
  status: string;
  total: number | string;
};
type Hook = { type: string; record: Order; old_record: Order | null };
type Note = {
  audience: "staff" | "student";
  title: string;
  body: string;
  screen: string;
};

const tag = (n: number | null) => (n ? `#${String(n).padStart(3, "0")}` : "Order");

function buildNote(h: Hook): Note | null {
  if (h.type !== "UPDATE" || !h.old_record) return null;
  const { record: o, old_record: old } = h;

  // place_order sets the total last, so this is "order fully created".
  if (Number(old.total) === 0 && Number(o.total) > 0 && o.status === "pending") {
    return {
      audience: "staff",
      title: `New order ${tag(o.order_number)}`,
      body: `₱${Number(o.total).toFixed(2)} · tap to review`,
      screen: "/(staff)/orders",
    };
  }

  if (old.status === o.status) return null;

  if (o.status === "preparing") {
    return {
      audience: "student",
      title: `Order ${tag(o.order_number)} is being prepared`,
      body: "We'll let you know when it's ready.",
      screen: "/(student)/orders",
    };
  }
  if (o.status === "ready") {
    return {
      audience: "student",
      title: `Order ${tag(o.order_number)} is ready!`,
      body: "Show your QR code at the counter within 10 minutes.",
      screen: "/(student)/orders",
    };
  }
  if (o.status === "cancelled" && old.status === "ready") {
    return {
      audience: "student",
      title: `Order ${tag(o.order_number)} expired`,
      body: "It wasn't picked up in time and was cancelled.",
      screen: "/(student)/orders",
    };
  }
  return null;
}

async function tokensFor(note: Note, studentId: string): Promise<string[]> {
  let userIds: string[];
  if (note.audience === "student") {
    userIds = [studentId];
  } else {
    const { data } = await supabase.from("profiles").select("id").eq("role", "staff");
    userIds = (data ?? []).map((r) => r.id);
  }
  if (userIds.length === 0) return [];

  const { data } = await supabase.from("push_tokens").select("token").in("user_id", userIds);
  return (data ?? []).map((r) => r.token);
}

Deno.serve(async (req) => {
  if (req.headers.get("x-webhook-secret") !== Deno.env.get("WEBHOOK_SECRET")) {
    return new Response("unauthorized", { status: 401 });
  }

  const hook = (await req.json()) as Hook;
  const note = buildNote(hook);
  if (!note) return new Response("skipped");

  const tokens = await tokensFor(note, hook.record.student_id);
  if (tokens.length === 0) return new Response("no tokens");

  // Expo accepts up to 100 messages per request -- plenty for a canteen's staff.
  const messages = tokens.slice(0, 100).map((to) => ({
    to,
    title: note.title,
    body: note.body,
    sound: "default",
    priority: "high",
    channelId: "orders",
    data: { screen: note.screen, orderId: hook.record.id },
  }));

  const res = await fetch(EXPO_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(messages),
  });
  const { data: tickets } = await res.json();

  // Prune tokens for uninstalled apps so they don't pile up.
  const dead: string[] = [];
  (tickets ?? []).forEach((t: any, i: number) => {
    if (t.status === "error" && t.details?.error === "DeviceNotRegistered") {
      dead.push(messages[i].to);
    }
  });
  if (dead.length) await supabase.from("push_tokens").delete().in("token", dead);

  return new Response(`sent ${messages.length}`);
});