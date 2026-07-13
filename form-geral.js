(() => {
  const form = document.getElementById("candidatura-form");
  const submitBtn = document.getElementById("submit-btn");
  const globalError = document.getElementById("form-global-error");
  const successState = document.getElementById("success-state");

  const showError = (id, msg) => {
    const el = document.getElementById("err-" + id);
    const input = form.querySelector("[name=" + id + "], #" + id);
    if (el) { el.textContent = msg; el.classList.add("is-visible"); }
    if (input) input.classList.add("is-error");
  };

  const clearErrors = () => {
    form.querySelectorAll(".form-error-inline").forEach(el => el.classList.remove("is-visible"));
    form.querySelectorAll(".is-error").forEach(el => el.classList.remove("is-error"));
    globalError.classList.remove("is-visible");
  };

  const collectChecked = (name) => Array.from(form.querySelectorAll("[name=" + name + "]:checked")).map(el => el.value);

  const validate = () => {
    let ok = true;
    if (!form.nome.value.trim()) { showError("nome", "Campo obrigatório."); ok = false; }
    if (!form.telefone.value.trim()) { showError("telefone", "Campo obrigatório."); ok = false; }
    if (!form.funcao.value.trim()) { showError("funcao", "Campo obrigatório."); ok = false; }
    if (!form.consentimento.checked) { showError("consentimento", "Tem de aceitar para enviar a candidatura."); ok = false; }
    return ok;
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors();
    if (!validate()) return;
    // Honeypot anti-spam: bots preenchem o campo oculto "website"; humanos não o veem.
    if (form.website && form.website.value) { form.style.display = "none"; successState.classList.add("is-visible"); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = "A enviar…";

    const funcao = form.funcao.value.trim();
    const idiomas = collectChecked("idiomas").join(", ");
    const zonas = collectChecked("zonas").join(", ");
    const experienciaPratica = form.experiencia_pratica.value.trim();
    const mensagemBase = form.mensagem.value.trim();

    const mensagemExtra = [
      funcao ? "Função pretendida: " + funcao : "",
      idiomas ? "Idiomas: " + idiomas : "",
      zonas ? "Zonas: " + zonas : "",
      experienciaPratica ? "Experiência prática: " + experienciaPratica : "",
      mensagemBase ? "Mensagem: " + mensagemBase : ""
    ].filter(Boolean).join(" | ") || null;

    try {
      await neonQuery(NEON_FORM_CONN,
        "INSERT INTO candidatos (profissao, nome, telefone, email, regiao, experiencia, disponibilidade, processos, mensagem) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
        [
          "geral",
          form.nome.value.trim(),
          form.telefone.value.trim(),
          form.email.value.trim() || null,
          form.regiao.value.trim() || null,
          form.experiencia.value || null,
          zonas.length > 0,
          null,
          mensagemExtra,
        ]
      );
      form.style.display = "none";
      successState.classList.add("is-visible");
      successState.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      submitBtn.disabled = false;
      submitBtn.textContent = "Enviar candidatura";
      globalError.textContent = "Ocorreu um erro ao enviar. Verifique a ligação e tente novamente, ou contacte pelo WhatsApp.";
      globalError.classList.add("is-visible");
    }
  });
})();
