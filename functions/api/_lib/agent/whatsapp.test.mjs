import assert from "node:assert/strict";
import { test } from "node:test";
import { parseInbound, verifySignature } from "./whatsapp.js";

const textPayload = {
  object: "whatsapp_business_account",
  entry: [{
    id: "0",
    changes: [{
      field: "messages",
      value: {
        messaging_product: "whatsapp",
        metadata: { phone_number_id: "123" },
        contacts: [{ profile: { name: "João Silva" }, wa_id: "351911111111" }],
        messages: [{ from: "351911111111", id: "wamid.X", timestamp: "1", type: "text", text: { body: "olá, vi a vaga" } }],
      },
    }],
  }],
};

const statusPayload = {
  object: "whatsapp_business_account",
  entry: [{ id: "0", changes: [{ field: "messages", value: { messaging_product: "whatsapp", statuses: [{ id: "wamid.X", status: "delivered" }] } }] }],
};

const imagePayload = {
  object: "whatsapp_business_account",
  entry: [{ id: "0", changes: [{ field: "messages", value: { messages: [{ from: "351922222222", type: "image", image: { id: "media123" } }] } }] }],
};

test("parseInbound extrai remetente, texto e nome de uma mensagem de texto", () => {
  const m = parseInbound(textPayload);
  assert.equal(m.from, "351911111111");
  assert.equal(m.text, "olá, vi a vaga");
  assert.equal(m.name, "João Silva");
});

test("parseInbound ignora webhooks de status (devolve null)", () => {
  assert.equal(parseInbound(statusPayload), null);
});

test("parseInbound marca tipos nao suportados sem texto", () => {
  const m = parseInbound(imagePayload);
  assert.equal(m.from, "351922222222");
  assert.equal(m.text, "");
  assert.equal(m.unsupportedType, "image");
});

async function sign(secret, body) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return "sha256=" + [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

test("verifySignature aceita uma assinatura valida da Meta", async () => {
  const secret = "app-secret-123";
  const body = JSON.stringify(textPayload);
  const header = await sign(secret, body);
  assert.equal(await verifySignature(secret, body, header), true);
});

test("verifySignature rejeita assinatura errada ou em falta", async () => {
  const body = JSON.stringify(textPayload);
  assert.equal(await verifySignature("app-secret-123", body, "sha256=deadbeef"), false);
  assert.equal(await verifySignature("app-secret-123", body, null), false);
});

test("verifySignature nao bloqueia quando nao ha secret configurado (dev)", async () => {
  assert.equal(await verifySignature("", "qualquer corpo", null), true);
});
