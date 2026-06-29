// Formulário de contacto B2B (contacto.html).
// Fluxo: valida → abre WhatsApp do CEO pré-preenchido (síncrono, sem bloqueio de popup)
// → guarda no banco para o admin ver (best-effort, não bloqueia o utilizador).
(() => {
  const form = document.getElementById("contact-form");
  if (!form) return;

  const submitBtn = form.querySelector('button[type="submit"]');
  const statusEl = document.getElementById("contact-status");
  const WHATSAPP = "351937920005"; // CEO / B2B

  const val = (n) => {
    const el = form.elements[n];
    return el ? String(el.value || "").trim() : "";
  };

  const setStatus = (msg, type) => {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = "contact-form__status" + (type ? " is-" + type : "");
  };

  const buildWhatsappMessage = (d) => {
    return [
      "Olá! Vim pelo site da M&A Elo e gostaria de falar sobre um projecto.",
      "",
      "Nome: " + d.nome,
      "Empresa: " + d.empresa,
      d.cargo ? "Cargo: " + d.cargo : "",
      d.email ? "Email: " + d.email : "",
      d.telefone ? "Telefone: " + d.telefone : "",
      d.regiao ? "Região / local: " + d.regiao : "",
      d.prazo ? "Prazo previsto: " + d.prazo : "",
      "",
      "Necessidade / projecto:",
      d.projecto,
    ].filter((l) => l !== "").join("\n");
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // Honeypot anti-spam: bots preenchem o campo oculto "website"; humanos não o veem.
    if (form.website && form.website.value) {
      setStatus("Pedido enviado.", "success");
      return;
    }

    const d = {
      nome: val("nome"),
      empresa: val("empresa"),
      cargo: val("cargo"),
      email: val("email"),
      telefone: val("telefone"),
      regiao: val("regiao"),
      prazo: val("prazo"),
      projecto: val("projecto"),
    };
    const consent = form.elements["rgpd"] && form.elements["rgpd"].checked;

    const missing = [];
    if (!d.nome) missing.push("nome");
    if (!d.empresa) missing.push("empresa");
    if (!d.email) missing.push("email");
    if (!d.projecto) missing.push("descrição do projecto");
    if (!consent) missing.push("consentimento RGPD");
    if (missing.length) {
      setStatus("Por favor preencha: " + missing.join(", ") + ".", "error");
      return;
    }

    // 1. Abre o WhatsApp do CEO já preenchido — chamada síncrona dentro do clique,
    //    por isso o browser não bloqueia a nova aba.
    const waUrl = "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(buildWhatsappMessage(d));
    window.open(waUrl, "_blank", "noopener");

    // 2. Guarda no banco para o administrador ver a lista de quem contactou.
    //    Best-effort: se falhar, o contacto já seguiu pelo WhatsApp.
    if (typeof submitContact === "function") {
      submitContact(d).catch((err) => console.warn("[contacto] não guardou no painel:", err));
    }

    // 3. Feedback e bloqueio do botão.
    setStatus(
      "Pedido enviado. Abrimos o WhatsApp para falar diretamente com a equipa — se não abriu, contacte +351 937 920 005 ou clientes@maelo.pt.",
      "success"
    );
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Pedido enviado";
    }
  });
})();
