// ── Config: mismo proyecto Supabase que romina-portal-alumno ──
const CONFIG = {
  supabaseUrl: 'https://yreszdtnksnlxkzuakrs.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZXN6ZHRua3NubHhrenVha3JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3NDUzMjUsImV4cCI6MjEwNTMyMTMyNX0.19DjEYrhOLW6LjyRHJ1P1sZh7fiJYvpHaFmKwuHMaMk',
  whatsapp: '5492302354724',
};

const sb = supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);

const session = {
  get pass() { return localStorage.getItem('coach_pass'); },
  set pass(v) { localStorage.setItem('coach_pass', v); },
  clear() { localStorage.removeItem('coach_pass'); },
};

function requireSession() {
  if (!session.pass) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

async function adminRpc(fn, params = {}) {
  const { data, error } = await sb.rpc(fn, { p_admin_pass: session.pass, ...params });
  if (error && /autorizado/i.test(error.message || '')) {
    session.clear();
    window.location.href = 'index.html';
  }
  return { data, error };
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { toast.hidden = true; }, 3200);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

function money(n) {
  return n == null ? '—' : `$ ${Number(n).toLocaleString('es-AR')}`;
}

function dueLabel(status, dueDate) {
  if (!dueDate) return 'Sin fecha';
  const days = Math.round((new Date(dueDate) - new Date(new Date().toDateString())) / 86400000);
  if (status === 'late') return `Vencido hace ${Math.abs(days)} d`;
  if (status === 'soon') return `Vence en ${days} d`;
  return `en ${days} d`;
}

function statusTagLabel(status) {
  if (status === 'late') return 'Vencido';
  if (status === 'soon') return 'Por vencer';
  return 'Al día';
}
function statusTagClass(status) {
  if (status === 'late') return 'tag-accent';
  if (status === 'soon') return 'tag-outline';
  return 'tag-neutral';
}

function initials(name) {
  const letters = (name || '').match(/\p{L}+/gu) || [];
  return letters.slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
}

function relativeTime(iso) {
  const d = new Date(iso);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const day = new Date(d); day.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today - day) / 86400000);
  const hhmm = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 0) return hhmm;
  if (diffDays === 1) return 'Ayer';
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }).replace('.', '');
}

function formatLongDate(iso) {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
}

// ── Logout compartido ──
function wireLogout() {
  const btn = document.getElementById('btn-logout');
  if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); session.clear(); window.location.href = 'index.html'; });
}

// ── Login (index.html) ──
function initLogin() {
  if (session.pass) { window.location.href = 'hoy.html'; return; }
  const input = document.getElementById('pass');
  const btn = document.getElementById('btn-enter');
  const err = document.getElementById('pass-error');

  async function submit() {
    const val = input.value.trim();
    if (!val) return;
    btn.disabled = true;
    const { data, error } = await sb.rpc('admin_login', { p_admin_pass: val });
    btn.disabled = false;
    if (error || !data) {
      err.textContent = 'Contraseña incorrecta.';
      return;
    }
    session.pass = val;
    window.location.href = 'hoy.html';
  }

  btn.addEventListener('click', submit);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
}

// ══════════════════════════════════════════════════════════
// Modal: Nuevo alumno (usado en hoy.html y alumnos.html)
// ══════════════════════════════════════════════════════════
function wireNewStudentModal(onCreated) {
  const modal = document.getElementById('modal-new-student');
  if (!modal) return;
  const openBtn = document.getElementById('btn-new-student');
  const closeBtn = document.getElementById('new-student-close');
  const form = document.getElementById('new-student-form');
  const done = document.getElementById('new-student-done');
  const planList = document.getElementById('new-student-plan-list');
  let selectedPlanId = null;

  async function loadPlans() {
    const { data } = await adminRpc('admin_plans_list');
    planList.innerHTML = '';
    const noneBtn = document.createElement('button');
    noneBtn.type = 'button';
    noneBtn.textContent = 'Sin plan por ahora';
    noneBtn.className = 'selected';
    noneBtn.addEventListener('click', () => selectPlan(null, noneBtn));
    planList.appendChild(noneBtn);
    (data || []).forEach((p) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = `${p.title} · ${p.level}`;
      b.addEventListener('click', () => selectPlan(p.id, b));
      planList.appendChild(b);
    });
    selectedPlanId = null;
  }

  function selectPlan(id, btnEl) {
    selectedPlanId = id;
    planList.querySelectorAll('button').forEach((b) => b.classList.remove('selected'));
    btnEl.classList.add('selected');
  }

  function open() {
    form.hidden = false;
    done.hidden = true;
    document.getElementById('new-student-name').value = '';
    document.getElementById('new-student-phone').value = '';
    document.getElementById('new-student-fee').value = '';
    loadPlans();
    modal.hidden = false;
  }
  function close() { modal.hidden = true; }

  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  document.getElementById('btn-create-student').addEventListener('click', async () => {
    const name = document.getElementById('new-student-name').value.trim();
    const phoneRaw = document.getElementById('new-student-phone').value.trim();
    const feeRaw = document.getElementById('new-student-fee').value.trim();
    if (!name || !phoneRaw) { showToast('Completá nombre y teléfono.'); return; }
    const phone = phoneRaw.replace(/\D/g, '');
    const fee = feeRaw ? Number(feeRaw.replace(/\D/g, '')) : null;

    const btn = document.getElementById('btn-create-student');
    btn.disabled = true;
    const { data, error } = await adminRpc('admin_create_student', {
      p_name: name, p_phone: phone, p_plan_id: selectedPlanId, p_fee: fee, p_due_date: null,
    });
    btn.disabled = false;
    if (error || !data || !data[0]) { showToast('No se pudo dar de alta. Revisá el teléfono (debe ser único).'); return; }

    const code = data[0].access_code;
    form.hidden = true;
    done.hidden = false;
    document.getElementById('new-student-code').textContent = code;
    document.getElementById('new-student-wa').href =
      `https://wa.me/${phone}?text=${encodeURIComponent(`Hola ${name}! Tu código de acceso al portal es ${code}. Entrá en https://app.rominagarino.com`)}`;
    if (onCreated) onCreated();
  });

  document.getElementById('new-student-close-done')?.addEventListener('click', close);
}

// ══════════════════════════════════════════════════════════
// Modal: Registrar pago (usado en ficha.html y cobros.html)
// ══════════════════════════════════════════════════════════
function wirePaymentModal(onConfirmed) {
  const modal = document.getElementById('modal-payment');
  if (!modal) return;
  const closeBtn = document.getElementById('payment-close');
  let method = 'transfer';
  let studentId = null;

  function openPaymentModal(student) {
    studentId = student.id;
    document.getElementById('payment-name').textContent = student.name;
    document.getElementById('payment-plan').textContent = `${student.plan_title || 'Sin plan'} · ${statusTagLabel(student.payment_status)}`;
    document.getElementById('payment-amount').value = student.fee || '';
    method = 'transfer';
    modal.querySelectorAll('#payment-method button').forEach((b) => b.classList.toggle('active', b.dataset.method === method));
    modal.hidden = false;
  }
  window.openPaymentModal = openPaymentModal;

  modal.querySelectorAll('#payment-method button').forEach((b) => {
    b.addEventListener('click', () => {
      method = b.dataset.method;
      modal.querySelectorAll('#payment-method button').forEach((x) => x.classList.toggle('active', x === b));
    });
  });

  closeBtn.addEventListener('click', () => { modal.hidden = true; });
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.hidden = true; });

  document.getElementById('btn-confirm-payment').addEventListener('click', async () => {
    const amount = Number(document.getElementById('payment-amount').value.replace(/\D/g, ''));
    if (!amount) { showToast('Ingresá un monto.'); return; }
    const btn = document.getElementById('btn-confirm-payment');
    btn.disabled = true;
    const { error } = await adminRpc('admin_register_payment', { p_student_id: studentId, p_amount: amount, p_method: method });
    btn.disabled = false;
    if (error) { showToast('No se pudo registrar el pago.'); return; }
    modal.hidden = true;
    showToast('Pago registrado.');
    if (onConfirmed) onConfirmed();
  });
}

// ══════════════════════════════════════════════════════════
// Hoy (hoy.html)
// ══════════════════════════════════════════════════════════
function initHoy() {
  if (!requireSession()) return;
  wireLogout();
  wireNewStudentModal(load);

  const kicker = document.getElementById('today-kicker');
  if (kicker) {
    kicker.textContent = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
  }

  async function load() {
    const { data, error } = await adminRpc('admin_list_students');
    if (error) { showToast('No pudimos cargar los datos.'); return; }
    const students = data || [];
    const todayStr = new Date().toISOString().slice(0, 10);

    document.getElementById('metric-activos').textContent = students.length;
    document.getElementById('metric-entrenaron').textContent = students.filter((s) => s.last_log_date === todayStr).length;
    const vencidos = students.filter((s) => s.payment_status === 'late');
    document.getElementById('metric-vencidos').textContent = vencidos.length;

    const attn = students
      .filter((s) => s.payment_status === 'late' || (s.plan_id && Number(s.sessions_30d) === 0))
      .slice(0, 4);
    const attnEl = document.getElementById('attn-list');
    if (attn.length === 0) {
      attnEl.innerHTML = '<p class="sub" style="padding:14px 18px;">Nada urgente por ahora.</p>';
    } else {
      attnEl.innerHTML = attn.map((s) => {
        const reason = s.payment_status === 'late'
          ? `${dueLabel(s.payment_status, s.due_date)} · ${money(s.fee)}`
          : 'Sin sesiones en 30 días';
        return `
        <div class="attn-row">
          <div>
            <div class="attn-name">${escapeHtml(s.name)}</div>
            <div class="attn-reason">${escapeHtml(reason)}</div>
          </div>
          <a class="btn-secondary btn-sm" href="ficha.html?id=${s.id}">Abrir</a>
        </div>`;
      }).join('');
    }

    const { data: activity } = await adminRpc('admin_recent_activity', { p_limit: 12 });
    const actEl = document.getElementById('activity-list');
    if (!activity || activity.length === 0) {
      actEl.innerHTML = '<p class="sub" style="padding:14px 18px;">Todavía no hay actividad.</p>';
    } else {
      actEl.innerHTML = activity.map((a) => `
        <div class="activity-row">
          <span class="activity-time">${relativeTime(a.happened_at)}</span>
          <span>${escapeHtml(a.student_name)} ${escapeHtml(a.detail)}</span>
        </div>`).join('');
    }
  }

  load();
}

// ══════════════════════════════════════════════════════════
// Alumnos (alumnos.html)
// ══════════════════════════════════════════════════════════
function initAlumnos() {
  if (!requireSession()) return;
  wireLogout();
  wireNewStudentModal(load);

  let all = [];
  let filter = 'todos';
  let query = '';

  function render() {
    let rows = all;
    if (filter === 'al-dia') rows = rows.filter((s) => s.payment_status !== 'late');
    if (filter === 'a-cobrar') rows = rows.filter((s) => s.payment_status === 'late' || s.payment_status === 'soon');
    if (query) rows = rows.filter((s) => s.name.toLowerCase().includes(query));

    const listEl = document.getElementById('students-list');
    listEl.innerHTML = rows.map((s) => `
      <a class="list-row" href="ficha.html?id=${s.id}">
        <div class="list-row-main">
          <div class="avatar-sq">${escapeHtml(initials(s.name))}</div>
          <div class="list-row-text">
            <div class="list-row-name">${escapeHtml(s.name)}</div>
            <div class="list-row-meta">${escapeHtml(s.plan_title || 'Sin plan')} · ${s.sessions_30d} sesiones</div>
          </div>
        </div>
        <div class="list-row-side">
          <span class="tag ${statusTagClass(s.payment_status)}">${statusTagLabel(s.payment_status)}</span>
          <span class="sub">${money(s.fee)}</span>
        </div>
      </a>`).join('');

    document.getElementById('students-foot').textContent = `${rows.length} de ${all.length} alumnas`;
  }

  async function load() {
    const { data, error } = await adminRpc('admin_list_students');
    if (error) { showToast('No pudimos cargar las alumnas.'); return; }
    all = data || [];
    render();
  }

  document.getElementById('search').addEventListener('input', (e) => {
    query = e.target.value.trim().toLowerCase();
    render();
  });
  document.querySelectorAll('#filter-seg button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#filter-seg button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      filter = btn.dataset.filter;
      render();
    });
  });

  load();
}

// ══════════════════════════════════════════════════════════
// Ficha (ficha.html?id=...)
// ══════════════════════════════════════════════════════════
function initFicha() {
  if (!requireSession()) return;
  wireLogout();

  const studentId = new URLSearchParams(window.location.search).get('id');
  if (!studentId) { window.location.href = 'alumnos.html'; return; }

  wirePaymentModal(load);
  wireChangePlanModal(load);

  async function load() {
    const { data, error } = await adminRpc('admin_list_students');
    if (error) { showToast('No pudimos cargar la ficha.'); return; }
    const student = (data || []).find((s) => s.id === studentId);
    if (!student) { showToast('No encontramos a esta alumna.'); return; }

    document.getElementById('ficha-name').textContent = student.name;
    document.getElementById('ficha-status').className = `tag ${statusTagClass(student.payment_status)}`;
    document.getElementById('ficha-status').textContent = statusTagLabel(student.payment_status);
    document.getElementById('ficha-level').textContent = student.level || 'Sin nivel';
    document.getElementById('ficha-since').textContent = `Desde ${formatLongDate(student.created_at)}`;

    document.getElementById('cell-cuota').textContent = money(student.fee);
    document.getElementById('cell-vence').textContent = student.due_date ? dueLabel(student.payment_status, student.due_date) : '—';
    document.getElementById('cell-asistencia').textContent = `${student.sessions_30d} sesiones`;
    document.getElementById('cell-telefono').textContent = student.phone;

    document.getElementById('btn-pay').onclick = () => window.openPaymentModal(student);
    document.getElementById('btn-change-plan').onclick = () => window.openChangePlanModal(student);
    const msgBtn = document.getElementById('btn-messages');
    msgBtn.textContent = `Mensajes${student.unread_count > 0 ? ` · ${student.unread_count}` : ''}`;

    // plan box
    const planBox = document.getElementById('plan-box');
    if (!student.plan_id) {
      planBox.innerHTML = '<p class="sub">Sin plan asignado todavía.</p>';
    } else {
      const { data: planData } = await sb.rpc('get_my_plan', { p_student_id: studentId });
      const plan = planData && planData[0];
      if (plan) {
        planBox.innerHTML = `
          <p class="kicker">${escapeHtml((plan.level || '').toUpperCase())} · ${plan.weeks} SEMANAS</p>
          <h3 class="plan-box-title">${escapeHtml(plan.title)}</h3>
          ${(plan.all_days || []).map((d, i) => `
            <div class="day-row${i === plan.day_index ? ' is-current' : ''}">
              <span>${escapeHtml(d.day_label)}</span>
              <span>${i === plan.day_index ? 'Próximo' : ''}</span>
            </div>`).join('')}
        `;
      }
    }

    loadThread();
  }

  async function loadThread() {
    const { data } = await adminRpc('admin_get_thread', { p_student_id: studentId });
    const msgs = data || [];
    const threadEl = document.getElementById('thread');
    if (msgs.length === 0) {
      threadEl.innerHTML = '<p class="sub" style="padding:0 0 12px;">Todavía no hay mensajes.</p>';
    } else {
      threadEl.innerHTML = msgs.map((m) => `
        <div class="bubble-row${m.sender === 'coach' ? ' is-own' : ''}">
          <div class="bubble">
            <p class="bubble-meta">${m.sender === 'coach' ? 'VOS' : 'ALUMNA'} · ${relativeTime(m.sent_at)}</p>
            <p class="bubble-text">${escapeHtml(m.body)}</p>
          </div>
        </div>`).join('');
    }
    await adminRpc('admin_mark_student_messages_read', { p_student_id: studentId });
  }

  async function send() {
    const input = document.getElementById('msg-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    const { error } = await adminRpc('admin_send_message', { p_student_id: studentId, p_body: text });
    if (error) { showToast('No se pudo enviar.'); return; }
    loadThread();
  }
  document.getElementById('btn-send-msg').addEventListener('click', send);
  document.getElementById('msg-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });

  load();
}

function wireChangePlanModal(onChanged) {
  const modal = document.getElementById('modal-change-plan');
  if (!modal) return;
  const closeBtn = document.getElementById('change-plan-close');
  const list = document.getElementById('change-plan-list');
  let phone = null;
  let selectedTitle = null;

  async function openChangePlanModal(student) {
    phone = student.phone;
    selectedTitle = null;
    const { data } = await adminRpc('admin_plans_list');
    list.innerHTML = (data || []).map((p) => `<button type="button" data-title="${escapeHtml(p.title)}">${escapeHtml(p.title)} · ${escapeHtml(p.level)} · ${p.weeks} sem.</button>`).join('');
    list.querySelectorAll('button').forEach((b) => {
      b.addEventListener('click', () => {
        selectedTitle = b.dataset.title;
        list.querySelectorAll('button').forEach((x) => x.classList.remove('selected'));
        b.classList.add('selected');
      });
    });
    modal.hidden = false;
  }
  window.openChangePlanModal = openChangePlanModal;

  closeBtn.addEventListener('click', () => { modal.hidden = true; });
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.hidden = true; });

  document.getElementById('btn-assign-plan').addEventListener('click', async () => {
    if (!selectedTitle) { showToast('Elegí un plan.'); return; }
    const { error } = await adminRpc('admin_assign_plan', { p_phone: phone, p_title: selectedTitle });
    if (error) { showToast('No se pudo asignar el plan.'); return; }
    modal.hidden = true;
    showToast('Plan asignado.');
    if (onChanged) onChanged();
  });
}

// ══════════════════════════════════════════════════════════
// Cobros (cobros.html)
// ══════════════════════════════════════════════════════════
function initCobros() {
  if (!requireSession()) return;
  wireLogout();
  wirePaymentModal(load);

  let all = [];
  let filter = 'todos';

  function render() {
    let rows = all;
    if (filter === 'vencidas') rows = rows.filter((s) => s.payment_status === 'late');
    if (filter === 'por-vencer') rows = rows.filter((s) => s.payment_status === 'soon');
    if (filter === 'al-dia') rows = rows.filter((s) => s.payment_status === 'ok');

    const listEl = document.getElementById('cobros-list');
    listEl.innerHTML = rows.map((s) => `
      <div class="list-row">
        <div class="list-row-text">
          <div class="list-row-name">${escapeHtml(s.name)}</div>
          <div class="list-row-meta">${statusTagLabel(s.payment_status)} · ${money(s.fee)}</div>
        </div>
        ${s.payment_status === 'ok'
          ? '<span class="tag tag-neutral">Al día</span>'
          : `<button class="btn-primary btn-sm" data-id="${s.id}">Cobrar</button>`}
      </div>`).join('');

    listEl.querySelectorAll('button[data-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const student = all.find((s) => s.id === btn.dataset.id);
        window.openPaymentModal(student);
      });
    });
  }

  async function load() {
    const [{ data: students, error }, { data: pending }] = await Promise.all([
      adminRpc('admin_list_students'),
      adminRpc('admin_pending_payments'),
    ]);
    if (error) { showToast('No pudimos cargar los cobros.'); return; }
    all = students || [];
    render();

    const pendEl = document.getElementById('pending-list');
    if (!pending || pending.length === 0) {
      pendEl.innerHTML = '<p class="sub" style="padding:0 0 12px;">No hay avisos pendientes.</p>';
    } else {
      pendEl.innerHTML = pending.map((p) => `
        <div class="list-row">
          <div class="list-row-text">
            <div class="list-row-name">${escapeHtml(p.student_name)}</div>
            <div class="list-row-meta">${escapeHtml(p.method)} · ${money(p.amount)}</div>
          </div>
          <button class="btn-primary btn-sm" data-confirm="${p.id}">Confirmar</button>
        </div>`).join('');
      pendEl.querySelectorAll('button[data-confirm]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          const { error } = await adminRpc('admin_confirm_payment', { p_payment_id: btn.dataset.confirm });
          if (error) { showToast('No se pudo confirmar.'); btn.disabled = false; return; }
          showToast('Pago confirmado.');
          load();
        });
      });
    }

    const totalFees = all.reduce((sum, s) => sum + (s.plan_id ? Number(s.fee || 0) : 0), 0);
    const collected = all.filter((s) => s.payment_status !== 'late').reduce((sum, s) => sum + (s.plan_id ? Number(s.fee || 0) : 0), 0);
    const pct = totalFees > 0 ? Math.round((collected / totalFees) * 100) : 0;
    document.getElementById('recaudado-amount').textContent = money(collected);
    document.getElementById('recaudado-total').textContent = `de ${money(totalFees)}`;
    document.getElementById('progress-fill').style.width = `${pct}%`;
    document.getElementById('progress-pct').textContent = `${pct}% cobrado`;
    document.getElementById('progress-remaining').textContent = `${money(totalFees - collected)} por cobrar`;
  }

  document.querySelectorAll('#cobros-filter button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#cobros-filter button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      filter = btn.dataset.filter;
      render();
    });
  });

  load();
}

// ══════════════════════════════════════════════════════════
// Planes (planes.html) — solo lectura
// ══════════════════════════════════════════════════════════
function initPlanes() {
  if (!requireSession()) return;
  wireLogout();

  async function load() {
    const { data, error } = await adminRpc('admin_plans_list');
    if (error) { showToast('No pudimos cargar los planes.'); return; }
    const listEl = document.getElementById('plans-list');
    listEl.innerHTML = (data || []).map((p) => `
      <div class="plan-lib-row">
        <p class="kicker">${escapeHtml((p.level || '').toUpperCase())} · ${p.weeks} SEMANAS</p>
        <h3 class="plan-lib-title">${escapeHtml(p.title)}</h3>
      </div>`).join('');
  }

  load();
}

// ── Bootstrap por página ──
if (document.getElementById('pass')) initLogin();
if (document.getElementById('attn-list')) initHoy();
if (document.getElementById('students-list')) initAlumnos();
if (document.getElementById('ficha-name')) initFicha();
if (document.getElementById('cobros-list')) initCobros();
if (document.getElementById('plans-list')) initPlanes();
