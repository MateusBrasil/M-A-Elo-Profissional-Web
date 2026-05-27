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

  const validate = () => {
    let ok = true;
    if (!form.nome.value.trim()) { showError("nome", "Campo obrigatório."); ok = false; }
    if (!form.telefone.value.trim()) { showError("telefone", "Campo obrigatório."); ok = false; }
    if (!form.regiao.value.trim()) { showError("regiao", "Campo obrigatório."); ok = false; }
    if (!form.experiencia.value) { showError("experiencia", "Selecione uma opção."); ok = false; }
    if (!form.querySelector("[name=disponibilidade]:checked")) { showError("disponibilidade", "Selecione uma opção."); ok = false; }
    return ok;
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors();
    if (!validate()) return;

    submitBtn.disabled = true;
    submitBtn.textContent = "A enviar…";

    const tipo_trabalhos = Array.from(form.querySelectorAll("[name=tipo_trabalhos]:checked"))
      .map(el => el.value).join(", ") || null;
    const le_medidas_val = form.querySelector("[name=le_medidas]:checked")?.value || null;

    try {
      await neonQuery(NEON_FORM_CONN,
        "INSERT INTO candidatos (profissao, nome, telefone, email, regiao, experiencia, disponibilidade, tipo_trabalhos, le_medidas, mensagem) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
        [
          "serralheiro",
          form.nome.value.trim(),
          form.telefone.value.trim(),
          form.email.value.trim() || null,
          form.regiao.value.trim(),
          form.experiencia.value,
          form.querySelector("[name=disponibilidade]:checked")?.value === "sim",
          tipo_trabalhos,
          le_medidas_val === "sim",
          form.mensagem.value.trim() || null,
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
