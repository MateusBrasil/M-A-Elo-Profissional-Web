const byId = (id) => document.getElementById(id);
let currentFormDefinition = null;

function roleFromPath() {
  const params = new URLSearchParams(window.location.search);
  const queryRole = params.get('role');
  if (queryRole) return queryRole;
  const match = window.location.pathname.match(/\/apply\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : 'soldador';
}

// Map DB campo label → form-app field name (for candidatos table column mapping)
const _LABEL_TO_NAME = {
  'nome completo': 'full_name', 'nome': 'full_name',
  'telefone / whatsapp': 'phone', 'telefone': 'phone', 'telemóvel': 'phone',
  'email': 'email',
  'cidade / região atual': 'city', 'localização': 'city', 'cidade': 'city', 'região atual': 'city',
  'função principal': 'current_profession',
  'resumo da experiência': 'experience_summary',
  'anos de experiência nesta função': 'years_experience',
  'competências que domina': 'technical_skills',
  'para quais regiões/obras tem disponibilidade?': 'available_regions',
  'confirma que consegue deslocar-se para alguma dessas regiões?': 'travel_availability',
  'como pretende chegar até à obra?': 'transport_method',
  'a empresa não disponibiliza alojamento. confirma que consegue avançar mesmo assim?': 'can_work_without_housing',
  'tem autorização/documentos para trabalhar em portugal?': 'work_authorization',
  'anexar currículo': 'cv_files',
  'anexar certificado ou comprovativo (se existir)': 'certificate_files',
  'confirmo que as informações enviadas são verdadeiras': 'truth_confirmation',
  'autorizo guardar os meus dados para esta candidatura e oportunidades futuras': 'data_consent',
};
const _CANDIDATE_FIELDS = new Set(['full_name','phone','email','city','current_profession']);

function _buildFromDB(dbRow, campos, roleKey) {
  const roleLabels = { soldador:'Soldador', serralheiro:'Serralheiro', pintor:'Pintor Industrial', generic:'Candidatura Geral' };
  const label = roleLabels[roleKey] || dbRow.nome || 'Candidatura';
  const typeMap = { phone:'tel', 'checkbox-group':'checkbox_group', radio:'checkbox_group' };

  const webFormFields = campos.map((f, idx) => {
    const ll = (f.label || '').toLowerCase().trim();
    const name = _LABEL_TO_NAME[ll] || ll.replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'') || ('campo_' + idx);
    const type = typeMap[f.type] || f.type || 'text';
    return {
      section: f.section || 'Campos',
      name,
      label: f.label,
      type,
      required: f.required || false,
      target: _CANDIDATE_FIELDS.has(name) ? 'candidate' : 'answers',
      options: f.options || [],
      placeholder: f.placeholder || '',
      ...(f.helpText ? { helpText: f.helpText } : {}),
    };
  });

  return {
    roleKey,
    title: dbRow.nome || `Formulário de ${label}`,
    intro: dbRow.descricao || 'Preencha com calma. As respostas ajudam a equipa a avaliar se o seu perfil encaixa nas obras atuais.',
    mustHave: ['Experiência prática na função', 'Disponibilidade para deslocação', 'Dados corretos para contacto'],
    webFormFields,
  };
}

function createFormDefinition(roleKey) {
  const labels = {
    soldador: 'Soldador',
    serralheiro: 'Serralheiro',
    pintor: 'Pintor Industrial',
    generic: 'Candidatura Geral',
  };
  const label = labels[roleKey] || labels.generic;

  const requirementsByRole = {
    soldador: ['Experiência prática em soldadura', 'Disponibilidade para deslocação', 'Documentos válidos para trabalhar em Portugal'],
    serralheiro: ['Experiência em serralharia ou montagem metálica', 'Disponibilidade para deslocação', 'Documentos válidos para trabalhar em Portugal'],
    pintor: ['Experiência em pintura industrial ou construção', 'Disponibilidade para deslocação', 'Documentos válidos para trabalhar em Portugal'],
    generic: ['Experiência prática na função indicada', 'Disponibilidade para deslocação', 'Documentos válidos para trabalhar em Portugal'],
  };

  const skillsByRole = {
    soldador: ['MIG/MAG', 'TIG', 'Elétrico (MMA)', 'Oxiacetileno', 'Soldadura estrutural', 'Soldadura de tubagem'],
    serralheiro: ['Serralharia civil', 'Montagem metálica', 'Ferramentas manuais', 'Leitura de medidas', 'Soldadura ligeira', 'Estruturas metálicas'],
    pintor: ['Pintura industrial', 'Preparação de superfícies', 'Airless / pistola', 'Rolo e trincha', 'Primário e acabamento', 'Pintura de estruturas'],
    generic: ['Obra', 'Indústria', 'Montagem', 'Ferramentas manuais', 'Leitura de medidas', 'Outro'],
  };

  return {
    roleKey,
    title: `Formulário de ${label}`,
    intro: 'Preencha com calma. As respostas ajudam a equipa a avaliar se o seu perfil encaixa nas obras atuais.',
    mustHave: requirementsByRole[roleKey] || requirementsByRole.generic,
    webFormFields: [
      { section: 'Dados pessoais', name: 'full_name', label: 'Nome completo', type: 'text', required: true, target: 'candidate', placeholder: 'Escreva o nome igual aos documentos.' },
      { section: 'Dados pessoais', name: 'phone', label: 'Telefone / WhatsApp', type: 'tel', required: true, target: 'candidate', placeholder: '+351 9xx xxx xxx' },
      { section: 'Dados pessoais', name: 'email', label: 'Email', type: 'email', required: false, target: 'candidate', placeholder: 'nome@email.com' },
      { section: 'Dados pessoais', name: 'city', label: 'Cidade / Região atual', type: 'text', required: true, target: 'candidate', placeholder: 'Ex: Braga, Porto, Lisboa...' },
      { section: 'Documentação', name: 'work_authorization', label: 'Tem autorização/documentos para trabalhar em Portugal?', type: 'select', required: true, target: 'answers', options: ['Sim, tenho documentos para trabalhar em Portugal', 'Estou em processo de regularização', 'Não tenho autorização/documentos para trabalhar em Portugal', 'Prefiro explicar com a equipa'] },
      { section: 'Experiência', name: 'current_profession', label: 'Função principal', type: 'text', required: true, target: 'candidate', defaultValue: label },
      { section: 'Experiência', name: 'years_experience', label: 'Anos de experiência nesta função', type: 'select', required: true, target: 'answers', options: ['Menos de 1 ano', '1 a 2 anos', '3 a 5 anos', 'Mais de 5 anos'] },
      { section: 'Experiência', name: 'experience_summary', label: 'Resumo da experiência', type: 'textarea', required: true, target: 'answers', placeholder: 'Onde trabalhou, o que fazia e por quanto tempo.' },
      { section: 'Competências', name: 'technical_skills', label: 'Competências que domina', type: 'checkbox_group', required: true, target: 'answers', options: skillsByRole[roleKey] || skillsByRole.generic },
      { section: 'Logística', name: 'available_regions', label: 'Para quais regiões/obras tem disponibilidade?', type: 'checkbox_group', required: true, target: 'answers', options: ['Parque das Nações, Lisboa', 'Estarreja, Aveiro', 'Viana do Castelo', 'Qualquer região'] },
      { section: 'Logística', name: 'travel_availability', label: 'Confirma que consegue deslocar-se para alguma dessas regiões?', type: 'select', required: true, target: 'answers', options: ['Sim', 'Não'] },
      { section: 'Logística', name: 'transport_method', label: 'Como pretende chegar até à obra?', type: 'select', required: true, target: 'answers', options: ['Tenho transporte próprio', 'Vou de transporte público', 'Tenho boleia/solução combinada', 'Ainda preciso confirmar'] },
      { section: 'Logística', name: 'can_work_without_housing', label: 'A empresa não disponibiliza alojamento. Confirma que consegue avançar mesmo assim?', type: 'select', required: true, target: 'answers', options: ['Sim, consigo avançar sem alojamento da empresa', 'Não, preciso de alojamento'], helpText: 'Esta resposta ajuda a filtrar as obras atuais e guardar o perfil para oportunidades futuras.' },
      { section: 'Documentos', name: 'cv_files', label: 'Anexar currículo', type: 'file', required: false, target: 'answers', accept: '.pdf,.doc,.docx,.jpg,.jpeg,.png', multiple: true, helpText: 'PDF, Word ou imagem. Pode enviar a candidatura sem CV — pode enviá-lo depois pelo WhatsApp.' },
      { section: 'Documentos', name: 'certificate_files', label: 'Anexar certificado ou comprovativo (se existir)', type: 'file', required: false, target: 'answers', accept: '.pdf,.jpg,.jpeg,.png', multiple: true },
      { section: 'Confirmação', name: 'truth_confirmation', label: 'Confirmo que as informações enviadas são verdadeiras', type: 'checkbox', required: true, target: 'answers' },
      { section: 'Confirmação', name: 'data_consent', label: 'Autorizo guardar os meus dados para esta candidatura e oportunidades futuras', type: 'checkbox', required: true, target: 'answers' },
    ],
  };
}

function groupBySection(fields) {
  return fields.reduce((groups, field) => {
    const section = field.section || 'Dados';
    groups[section] = groups[section] || [];
    groups[section].push(field);
    return groups;
  }, {});
}

function createField(field) {
  const wrapper = document.createElement('div');
  wrapper.className = field.type === 'textarea' ? 'field full' : 'field';
  if (field.type === 'checkbox') wrapper.className = 'field full check-row';
  if (field.type === 'checkbox_group') wrapper.className = 'field full';
  wrapper.dataset.field = field.name;

  const inputId = `field-${field.name}`;
  const errorId = `${inputId}-error`;
  const label = document.createElement('label');
  label.setAttribute('for', inputId);
  label.textContent = `${field.label}${field.required ? ' *' : ''}`;

  let control;
  if (field.type === 'textarea') {
    control = document.createElement('textarea');
  } else if (field.type === 'checkbox_group') {
    control = document.createElement('div');
    control.id = inputId;
    control.className = 'checkbox-group';
    control.setAttribute('role', 'group');
    control.setAttribute('aria-describedby', errorId);
    for (const optionValue of field.options || []) {
      const optionId = `${inputId}-${String(optionValue).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      const optionLabel = document.createElement('label');
      optionLabel.className = 'option-card';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = optionId;
      checkbox.name = field.name;
      checkbox.value = optionValue;
      checkbox.dataset.target = field.target || 'answers';
      checkbox.dataset.group = 'true';
      if (field.required) checkbox.dataset.requiredGroup = 'true';
      const span = document.createElement('span');
      span.textContent = optionValue;
      optionLabel.appendChild(checkbox);
      optionLabel.appendChild(span);
      control.appendChild(optionLabel);
    }
  } else if (field.type === 'select') {
    control = document.createElement('select');
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = 'Selecionar';
    control.appendChild(empty);
    for (const optionValue of field.options || []) {
      const option = document.createElement('option');
      option.value = optionValue;
      option.textContent = optionValue;
      control.appendChild(option);
    }
  } else {
    control = document.createElement('input');
    control.type = field.type || 'text';
  }

  if (field.type !== 'checkbox_group') {
    control.id = inputId;
    control.name = field.name;
    control.dataset.target = field.target || 'answers';
    control.setAttribute('aria-describedby', errorId);
    if (field.required) control.required = true;
    if (field.placeholder) control.placeholder = field.placeholder;
    if (field.accept) control.accept = field.accept;
    if (field.multiple) control.multiple = true;
    if (field.defaultValue) control.value = field.defaultValue;
    if (field.type === 'checkbox') control.value = 'sim';
  }

  if (field.type === 'checkbox') {
    wrapper.appendChild(control);
    wrapper.appendChild(label);
  } else {
    wrapper.appendChild(label);
    wrapper.appendChild(control);
  }

  if (field.helpText) {
    const help = document.createElement('p');
    help.className = 'help-text';
    help.textContent = field.helpText;
    wrapper.appendChild(help);
  }

  const error = document.createElement('p');
  error.id = errorId;
  error.className = 'field-error';
  error.setAttribute('aria-live', 'polite');
  wrapper.appendChild(error);

  return wrapper;
}

function getFieldValue(form, field) {
  if (field.type === 'checkbox_group') {
    return Array.from(form.querySelectorAll(`input[name="${field.name}"]:checked`)).map((input) => input.value);
  }
  const element = form.elements[field.name];
  if (!element) return '';
  if (field.type === 'file') return Array.from(element.files || []).map(f => f.name);
  const value = element.type === 'checkbox' ? (element.checked ? 'sim' : '') : element.value;
  return typeof value === 'string' ? value.trim() : value;
}

function isFieldComplete(form, field) {
  const value = getFieldValue(form, field);
  return Array.isArray(value) ? value.length > 0 : Boolean(value);
}

function setFieldError(form, field, message = '') {
  const wrapper = form.querySelector(`[data-field="${field.name}"]`);
  if (!wrapper) return;
  wrapper.classList.toggle('has-error', Boolean(message));
  const error = wrapper.querySelector('.field-error');
  if (error) error.textContent = message;
  if (field.type === 'checkbox_group') {
    const group = wrapper.querySelector('.checkbox-group');
    group?.setAttribute('aria-invalid', message ? 'true' : 'false');
    return;
  }
  const element = form.elements[field.name];
  element?.setAttribute('aria-invalid', message ? 'true' : 'false');
}

function updateProgress(form) {
  if (!currentFormDefinition) return;
  const requiredFields = (currentFormDefinition.webFormFields || []).filter((field) => field.required);
  const completed = requiredFields.filter((field) => isFieldComplete(form, field)).length;
  const percent = requiredFields.length ? Math.round((completed / requiredFields.length) * 100) : 0;
  const progressBar = byId('progress-bar');
  const progressLabel = byId('progress-label');
  const progressDetail = byId('progress-detail');
  if (progressBar) progressBar.style.width = `${percent}%`;
  if (progressLabel) progressLabel.textContent = `${percent}% completo`;
  if (progressDetail) {
    progressDetail.textContent = percent === 100
      ? 'Tudo preenchido. Pode enviar.'
      : `${completed} de ${requiredFields.length} campos obrigatórios completos`;
  }
}

async function loadForm() {
  const roleKey = roleFromPath();
  const form = byId('candidate-form');
  const fieldsRoot = byId('fields-root');
  const titleEl = byId('form-title');
  if (!roleKey || !form || !fieldsRoot) return;

  // Try DB first — slug matches role (generic → geral)
  let formDefinition = null;
  const dbSlug = roleKey === 'generic' ? 'geral' : roleKey;
  try {
    const r = await neonQuery(NEON_FORM_CONN,
      'SELECT * FROM formularios WHERE slug=$1 AND ativo=true LIMIT 1', [dbSlug]);
    const dbRow = r.rows?.[0];
    if (dbRow) {
      const campos = typeof dbRow.campos === 'string' ? JSON.parse(dbRow.campos) : (dbRow.campos || []);
      if (campos.length > 0) {
        formDefinition = _buildFromDB(dbRow, campos, roleKey);
      }
    }
  } catch (e) {
    console.warn('DB load failed, using fallback:', e);
  }
  if (!formDefinition) formDefinition = createFormDefinition(roleKey);
  currentFormDefinition = formDefinition;

  if (titleEl) titleEl.textContent = formDefinition.title;
  const intro = byId('form-intro');
  if (intro && formDefinition.intro) intro.textContent = formDefinition.intro;

  const requirements = byId('form-requirements');
  if (requirements) {
    requirements.innerHTML = '';
    for (const item of formDefinition.mustHave || []) {
      const li = document.createElement('li');
      li.textContent = item;
      requirements.appendChild(li);
    }
  }

  const grouped = groupBySection(formDefinition.webFormFields || []);
  fieldsRoot.innerHTML = '';
  for (const [sectionName, fields] of Object.entries(grouped)) {
    const section = document.createElement('section');
    section.className = 'section';
    const heading = document.createElement('h2');
    heading.textContent = sectionName;
    const grid = document.createElement('div');
    grid.className = 'field-grid';
    for (const field of fields) {
      grid.appendChild(createField(field));
    }
    section.appendChild(heading);
    section.appendChild(grid);
    fieldsRoot.appendChild(section);
  }

  form.addEventListener('input', () => updateProgress(form));
  form.addEventListener('change', () => updateProgress(form));
  updateProgress(form);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = byId('form-status');
    const submitButton = form.querySelector('button[type="submit"]');
    status.className = 'status';
    status.textContent = 'A enviar candidatura...';
    submitButton.disabled = true;

    const candidate = {};
    const answers = {};
    const missingFields = [];

    for (const field of currentFormDefinition.webFormFields || []) {
      const target = field.target || 'answers';
      const value = getFieldValue(form, field);
      setFieldError(form, field);
      if (field.required && !isFieldComplete(form, field)) {
        missingFields.push(field);
        continue;
      }
      if (target === 'candidate') candidate[field.name] = value;
      else answers[field.name] = value;
    }

    if (missingFields.length > 0) {
      for (const field of missingFields) setFieldError(form, field, 'Campo obrigatório.');
      status.className = 'status error';
      status.textContent = 'Complete os campos destacados antes de enviar.';
      form.querySelector(`[data-field="${missingFields[0].name}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      submitButton.disabled = false;
      return;
    }

    // Build Neon payload
    const roleMap = { soldador: 'soldador', serralheiro: 'serralheiro', pintor: 'pintor', generic: 'geral' };
    const profissao = roleMap[roleKey] || 'geral';

    const disponibilidade = (answers.travel_availability || '').toLowerCase().startsWith('sim');

    const regioes = Array.isArray(answers.available_regions)
      ? answers.available_regions.join(', ')
      : (answers.available_regions || '');
    const regiao = [candidate.city, regioes].filter(Boolean).join(' · ') || null;

    const processos = Array.isArray(answers.technical_skills)
      ? answers.technical_skills.join(', ')
      : null;

    const mensagemParts = [];
    if (answers.experience_summary) mensagemParts.push(answers.experience_summary);
    if (answers.work_authorization) mensagemParts.push('Autorização: ' + answers.work_authorization);
    if (answers.transport_method) mensagemParts.push('Transporte: ' + answers.transport_method);
    if (answers.can_work_without_housing) mensagemParts.push('Sem alojamento: ' + answers.can_work_without_housing);
    const cvNames = Array.isArray(answers.cv_files) && answers.cv_files.length
      ? 'CV anexado: ' + answers.cv_files.join(', ') + ' — enviar via WhatsApp +351 936 525 992'
      : null;
    const certNames = Array.isArray(answers.certificate_files) && answers.certificate_files.length
      ? 'Certificados: ' + answers.certificate_files.join(', ') + ' — enviar via WhatsApp +351 936 525 992'
      : null;
    if (cvNames) mensagemParts.push(cvNames);
    if (certNames) mensagemParts.push(certNames);

    try {
      await neonQuery(NEON_FORM_CONN,
        'INSERT INTO candidatos (profissao, nome, telefone, email, regiao, experiencia, disponibilidade, processos, mensagem) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [
          profissao,
          candidate.full_name,
          candidate.phone,
          candidate.email || null,
          regiao,
          answers.years_experience || null,
          disponibilidade,
          processos,
          mensagemParts.join('\n') || null,
        ]
      );
      form.reset();
      updateProgress(form);
      status.className = 'status success';
      status.textContent = 'Candidatura recebida com sucesso. A equipa vai analisar e entrar em contacto se houver seguimento.'
        + (cvNames || certNames ? ' Para enviar os ficheiros, use o WhatsApp: +351 936 525 992' : '');
    } catch (err) {
      status.className = 'status error';
      status.textContent = 'Erro ao enviar. Verifique a ligação e tente novamente, ou contacte pelo WhatsApp: +351 936 525 992';
      console.error(err);
    } finally {
      submitButton.disabled = false;
    }
  });
}

loadForm().catch((err) => {
  const status = byId('form-status');
  if (status) {
    status.className = 'status error';
    status.textContent = 'Erro ao carregar formulário: ' + err.message;
  }
  console.error(err);
});
