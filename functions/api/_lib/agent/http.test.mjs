import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchResilient } from "./http.js";

test("fetchResilient repete em 429 e depois devolve o sucesso", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return { status: calls < 3 ? 429 : 200, ok: calls >= 3, text: async () => "{}" };
  };
  const res = await fetchResilient("http://x", {}, { retries: 3, backoffMs: 1, fetchImpl });
  assert.equal(res.status, 200);
  assert.equal(res.text, "{}");
  assert.equal(calls, 3);
});

test("fetchResilient desiste depois das tentativas e devolve a ultima resposta", async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; return { status: 503, ok: false, text: async () => "erro" }; };
  const res = await fetchResilient("http://x", {}, { retries: 2, backoffMs: 1, fetchImpl });
  assert.equal(res.status, 503);
  assert.equal(calls, 3); // 1 tentativa + 2 retries
});

test("fetchResilient propaga o erro de rede depois de esgotar as tentativas", async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; throw new Error("network down"); };
  await assert.rejects(
    fetchResilient("http://x", {}, { retries: 1, backoffMs: 1, fetchImpl }),
    /network down/
  );
  assert.equal(calls, 2);
});

test("fetchResilient aborta quando excede o timeout", async () => {
  const fetchImpl = (url, opts) => new Promise((_, reject) => {
    opts.signal.addEventListener("abort", () => reject(new Error("aborted")));
  });
  await assert.rejects(
    fetchResilient("http://x", {}, { retries: 0, timeoutMs: 20, fetchImpl }),
    /aborted/
  );
});
