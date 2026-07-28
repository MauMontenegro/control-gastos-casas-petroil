const enterpriseFilters = {
  branch: document.getElementById('branchFilter'),
  service: document.getElementById('serviceFilter'),
  status: document.getElementById('statusFilter'),
  period: document.getElementById('periodFilter'),
};

const formalIcons = {
  home:
    '<svg viewBox="0 0 24 24" fill="none"><path d="M4.5 10.5 12 4l7.5 6.5v8.25a1.25 1.25 0 0 1-1.25 1.25h-12A1.25 1.25 0 0 1 5 18.75V10.5Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.5 20v-6h5v6" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  calendar:
    '<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="5.5" width="16" height="14.5" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M8 3.5v4M16 3.5v4M4 10h16M8 13.5h2M14 13.5h2M8 17h2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  schedule:
    '<svg viewBox="0 0 24 24" fill="none"><path d="M7 4h10a2 2 0 0 1 2 2v14H5V6a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="1.6"/><path d="M9 3v3M15 3v3M8 10h8M8 14h5M8 17h3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  money:
    '<svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="6" width="17" height="12" rx="2.5" stroke="currentColor" stroke-width="1.8"/><path d="M7 12h10M12 9v6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  clock:
    '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.8"/><path d="M12 7.5v5l3 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  alert:
    '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3.5 21 19H3L12 3.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 9v4M12 16.5h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  budget:
    '<svg viewBox="0 0 24 24" fill="none"><path d="M5 7.5h14v10H5z" stroke="currentColor" stroke-width="1.8"/><path d="M8 7.5V5h8v2.5M8.5 12.5l2.2 2.2 4.8-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  request:
    '<svg viewBox="0 0 24 24" fill="none"><path d="M6 3.5h9l3 3V20H6V3.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M14.5 3.5V7H18M9 11h6M9 15h3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="15.5" cy="15.5" r="2.5" stroke="currentColor" stroke-width="1.4"/></svg>',
  cleaning:
    '<svg viewBox="0 0 24 24" fill="none"><path d="m14.5 3-4 11M8.5 13.5l7 2.5M7.5 13l-2 5.5c3.5 2 7.3 2.1 11.5.5l-1-3.5-8.5-2.5Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 17.5c2.2 1 4.5 1.1 7 .2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  approvals:
    '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3.5 19 6v5.5c0 4.2-2.7 7.3-7 9-4.3-1.7-7-4.8-7-9V6l7-2.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="m8.7 12 2.1 2.1 4.5-4.6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  reports:
    '<svg viewBox="0 0 24 24" fill="none"><path d="M5 20V9M10 20V13M15 20V5M20 20V10M3.5 20h18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  branches:
    '<svg viewBox="0 0 24 24" fill="none"><path d="M5 20V8l7-4 7 4v12M3.5 20h17" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 10h2M14 10h2M8 14h2M14 14h2M10 20v-3h4v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
};

const brandMark = document.querySelector('.brand-mark');
if (brandMark) brandMark.innerHTML = '<span>CC</span>';

[
  ['.nav-item[data-view="inicio"] .nav-icon', formalIcons.home],
  ['.nav-item[data-view="calendario"] .nav-icon', formalIcons.calendar],
  ['.nav-item[data-view="programacion"] .nav-icon', formalIcons.schedule],
  ['.nav-item[data-view="solicitudes"] .nav-icon', formalIcons.request],
  ['.nav-item[data-view="limpieza"] .nav-icon', formalIcons.cleaning],
  ['.nav-item[data-view="aprobaciones"] .nav-icon', formalIcons.request],
  ['.nav-item[data-view="reportes"] .nav-icon', formalIcons.reports],
  ['.nav-item[data-view="sucursales"] .nav-icon', formalIcons.branches],
  ['.kpi-card.blue .kpi-icon', formalIcons.money],
  ['.kpi-card.orange .kpi-icon', formalIcons.clock],
  ['.kpi-card.red .kpi-icon', formalIcons.alert],
  ['.kpi-card.green .kpi-icon', formalIcons.budget],
].forEach(([selector, icon]) => {
  const target = document.querySelector(selector);
  if (target) target.innerHTML = icon;
});

const filterResult = document.getElementById('filterResult');
const filtersPanel = document.querySelector('.enterprise-filters');
const newPaymentButton = document.getElementById('newPaymentBtn');
const approvedRequestSelect = document.getElementById('approvedRequestSelect');
let pendingPaymentIndex = null;

document.getElementById('paymentsTable')?.addEventListener('click', (event) => {
  const button = event.target.closest('.pay-row-btn');
  if (!button || button.disabled) return;
  pendingPaymentIndex = Number(button.dataset.index);
  const payment = payments[pendingPaymentIndex];
  const form = document.getElementById('paymentForm');
  const selects = form.querySelectorAll('select');
  const inputs = form.querySelectorAll('input');
  const [service, branch] = payment.name.split('·').map((value) => value.trim());
  if (![...approvedRequestSelect.options].some((option) => option.value === payment.request)) {
    approvedRequestSelect.add(new Option(`${payment.request} · Autorizada`, payment.request));
  }
  selects[0].value = payment.request;
  selects[1].value = service;
  selects[2].value = branch;
  inputs[0].value = payment.amount;
  newPaymentButton.click();
});

function updateContextChrome() {
  const activeView = document.querySelector('.view.active')?.id || 'programacion';
  const hasOwnFilters =
    activeView === 'inicio' ||
    activeView === 'calendario' ||
    activeView === 'reportes' ||
    activeView === 'aprobaciones';
  filtersPanel.hidden = hasOwnFilters;
  filtersPanel.style.display = hasOwnFilters ? 'none' : '';
  filterEmptyState?.classList.remove('show');
  newPaymentButton.hidden = activeView !== 'programacion';
}

document.querySelectorAll('[data-quick-go]').forEach((button) => {
  button.addEventListener('click', () => showView(button.dataset.quickGo));
});

function updateNavigationState() {
  document.querySelectorAll('.nav-item').forEach((item) => {
    if (item.classList.contains('active')) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  });
}

document.querySelectorAll('.nav-item, [data-go], [data-quick-go]').forEach((control) => {
  control.addEventListener('click', () =>
    requestAnimationFrame(() => {
      updateNavigationState();
      updateContextChrome();
    }),
  );
});
updateNavigationState();

const attentionItems = [...document.querySelectorAll('#attentionList .attention-item')];
const attentionToggle = [...document.querySelectorAll('#inicio .panel-header .link-btn')].find(
  (button) => button.textContent.trim().toLocaleLowerCase('es-MX') === 'ver todas',
);

function updateAttentionList(expanded = false) {
  attentionItems.forEach((item, index) => {
    item.classList.toggle('attention-summary-hidden', !expanded && index > 2);
  });
  if (attentionToggle) {
    attentionToggle.textContent = expanded ? 'Ver prioridades' : `Ver todas (${attentionItems.length})`;
    attentionToggle.setAttribute('aria-expanded', String(expanded));
  }
}

if (attentionToggle) {
  attentionToggle.addEventListener('click', () => {
    updateAttentionList(attentionToggle.getAttribute('aria-expanded') !== 'true');
  });
  updateAttentionList();
}

const filterEmptyState = document.createElement('div');
filterEmptyState.className = 'filter-empty-state';
filterEmptyState.innerHTML =
  '<strong>Sin coincidencias para estos filtros.</strong> Ajusta los criterios o selecciona “Limpiar”.';
document.querySelector('.enterprise-filters').insertAdjacentElement('afterend', filterEmptyState);
const filterableSelector =
  '.view.active .attention-item, .view.active tbody tr, .view.active .branch-card, .view.active .approval-card, .view.active .calendar-event, .view.active .operation-row';

function normalizeFilterText(value) {
  return value
    .toLocaleLowerCase('es-MX')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function applyEnterpriseFilters() {
  const activeValues = [enterpriseFilters.branch.value, enterpriseFilters.service.value, enterpriseFilters.status.value]
    .filter(Boolean)
    .map(normalizeFilterText);
  const elements = [...document.querySelectorAll(filterableSelector)];
  let visible = 0;

  elements.forEach((element) => {
    const content = normalizeFilterText(element.textContent);
    const matches = activeValues.every((value) => content.includes(value));
    element.classList.toggle('enterprise-filtered-out', !matches);
    if (matches) visible += 1;
  });

  const selectedPeriod = enterpriseFilters.period.options[enterpriseFilters.period.selectedIndex].text;
  filterResult.textContent = activeValues.length
    ? `${visible} coincidencias · ${selectedPeriod}`
    : `Vista general · ${selectedPeriod}`;
  filterEmptyState.classList.toggle('show', activeValues.length > 0 && elements.length > 0 && visible === 0);
}

Object.values(enterpriseFilters).forEach((control) => {
  control.addEventListener('change', applyEnterpriseFilters);
});

document.getElementById('clearFilters').addEventListener('click', () => {
  enterpriseFilters.branch.value = '';
  enterpriseFilters.service.value = '';
  enterpriseFilters.status.value = '';
  enterpriseFilters.period.value = 'julio 2026';
  applyEnterpriseFilters();
});

document.querySelectorAll('.nav-item, [data-go]').forEach((control) => {
  control.addEventListener('click', () => requestAnimationFrame(applyEnterpriseFilters));
});

applyEnterpriseFilters();
updateContextChrome();

function enterpriseNotify(message) {
  const toastElement = document.getElementById('toast');
  toastElement.textContent = message;
  toastElement.classList.add('show');
  window.setTimeout(() => toastElement.classList.remove('show'), 2800);
}

const drawerBackdrop = document.createElement('div');
drawerBackdrop.className = 'action-drawer-backdrop';
drawerBackdrop.innerHTML = `
  <aside class="action-drawer" role="dialog" aria-modal="true" aria-labelledby="drawerTitle">
    <header>
      <div><span>DETALLE OPERATIVO</span><h2 id="drawerTitle"></h2></div>
      <button class="drawer-close" type="button" aria-label="Cerrar">×</button>
    </header>
    <p class="drawer-description"></p>
    <div class="drawer-content"></div>
    <footer>
      <button class="secondary-btn drawer-cancel" type="button">Cerrar</button>
      <button class="primary-btn drawer-primary" type="button">Continuar</button>
    </footer>
  </aside>`;
document.body.append(drawerBackdrop);

const actionDrawer = drawerBackdrop.querySelector('.action-drawer');
const drawerTitle = drawerBackdrop.querySelector('#drawerTitle');
const drawerDescription = drawerBackdrop.querySelector('.drawer-description');
const drawerContent = drawerBackdrop.querySelector('.drawer-content');
const drawerPrimary = drawerBackdrop.querySelector('.drawer-primary');
const receiptFiles = new Map();

function closeActionDrawer() {
  drawerBackdrop.classList.remove('show');
  drawerBackdrop.classList.remove('is-centered');
}

function openActionDrawer({
  title,
  description,
  details = [],
  primaryLabel = 'Continuar',
  onPrimary,
  receiptKey = '',
  centered = false,
  contentHtml = '',
}) {
  drawerBackdrop.classList.toggle('is-centered', centered);
  drawerTitle.textContent = title;
  drawerDescription.textContent = description;
  drawerContent.innerHTML = details
    .map(
      ({ label, value }) =>
        `<div class="drawer-detail"><span>${label}</span><strong>${value}</strong></div>`,
    )
    .join('');
  if (contentHtml) drawerContent.insertAdjacentHTML('beforeend', contentHtml);
  if (receiptKey) {
    const savedReceipt = receiptFiles.get(receiptKey);
    drawerContent.insertAdjacentHTML(
      'beforeend',
      `<section class="drawer-receipt">
        <div class="receipt-heading">
          <span class="receipt-icon" aria-hidden="true">▣</span>
          <div><strong>Comprobante o recibo</strong><small class="receipt-status">${savedReceipt ? savedReceipt.name : 'Sin archivo adjunto'}</small></div>
        </div>
        <div class="receipt-actions">
          <input class="receipt-input" type="file" accept="image/*,.pdf" hidden>
          <button class="secondary-btn receipt-upload" type="button">${savedReceipt ? 'Cambiar archivo' : 'Adjuntar archivo'}</button>
          <button class="primary-btn receipt-view" type="button" ${savedReceipt ? '' : 'disabled'}>Ver comprobante</button>
        </div>
      </section>`,
    );
    const receiptInput = drawerContent.querySelector('.receipt-input');
    const receiptStatus = drawerContent.querySelector('.receipt-status');
    const receiptUpload = drawerContent.querySelector('.receipt-upload');
    const receiptView = drawerContent.querySelector('.receipt-view');
    receiptUpload.addEventListener('click', () => receiptInput.click());
    receiptInput.addEventListener('change', () => {
      const file = receiptInput.files?.[0];
      if (!file) return;
      const previous = receiptFiles.get(receiptKey);
      if (previous?.url) URL.revokeObjectURL(previous.url);
      const saved = { name: file.name, url: URL.createObjectURL(file) };
      receiptFiles.set(receiptKey, saved);
      receiptStatus.textContent = saved.name;
      receiptUpload.textContent = 'Cambiar archivo';
      receiptView.disabled = false;
      enterpriseNotify('Comprobante adjuntado correctamente');
    });
    receiptView.addEventListener('click', () => {
      const receipt = receiptFiles.get(receiptKey);
      if (receipt?.url) window.open(receipt.url, '_blank', 'noopener');
    });
  }
  drawerPrimary.textContent = primaryLabel;
  drawerPrimary.style.display = onPrimary ? '' : 'none';
  drawerPrimary.onclick = () => {
    const shouldClose = onPrimary?.();
    if (shouldClose === false) return;
    closeActionDrawer();
  };
  drawerBackdrop.classList.add('show');
}

drawerBackdrop.querySelector('.drawer-close').addEventListener('click', closeActionDrawer);
drawerBackdrop.querySelector('.drawer-cancel').addEventListener('click', closeActionDrawer);
drawerBackdrop.addEventListener('click', (event) => {
  if (event.target === drawerBackdrop) closeActionDrawer();
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  closeActionDrawer();
  document.getElementById('modalBackdrop')?.classList.remove('show');
  document.getElementById('sidebar')?.classList.remove('open');
});

function findButton(label) {
  const normalizedLabel = normalizeFilterText(label);
  return [...document.querySelectorAll('button')].find(
    (button) => normalizeFilterText(button.textContent.trim()) === normalizedLabel,
  );
}

findButton('+ Agregar obligación')?.addEventListener('click', () => {
  document.getElementById('newPaymentBtn').click();
});

document.getElementById('paymentForm').addEventListener(
  'submit',
  () => {
    const form = document.getElementById('paymentForm');
    const selects = form.querySelectorAll('select');
    const inputs = form.querySelectorAll('input');
    const amount = Number(inputs[0].value || 0);
    const rawDate = inputs[1].value;
    const formattedDate = rawDate
      ? new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(
          new Date(`${rawDate}T12:00:00`),
        )
      : 'Sin fecha';
    const existingPayment = pendingPaymentIndex === null ? null : payments[pendingPaymentIndex];
    if (existingPayment) {
      existingPayment.date = formattedDate;
      existingPayment.amount = amount;
      existingPayment.status = 'Pagado';
    } else {
      payments.push({
        request: selects[0].value,
        name: `${selects[1].value} · ${selects[2].value}`,
        date: formattedDate,
        amount,
        var: 'Nuevo',
        status: 'Pagado',
      });
    }
    const approvedFolio = selects[0].value;
    if (approvedFolio) {
      updateRequestStatus(approvedFolio, 'Pagada');
      const paymentName = `${selects[1].value} · ${selects[2].value}`;
      const proofRow = document.createElement('tr');
      const proofFile = [...form.querySelectorAll('input[type="file"]')][0]?.files?.[0];
      const receiptKey = `${approvedFolio}-${paymentName}`;
      if (proofFile) {
        receiptFiles.set(receiptKey, { name: proofFile.name, url: URL.createObjectURL(proofFile) });
      }
      proofRow.innerHTML = `<td><strong>${approvedFolio}</strong></td><td>${paymentName}</td><td>${formattedDate}</td><td><strong>${formatRequestAmount(amount)}</strong></td><td><span class="status waiting">${proofFile ? 'Por archivar' : 'Pendiente'}</span></td><td><button class="proof-action-btn pending" type="button">${proofFile ? 'Revisar' : 'Adjuntar'}</button></td><td><button class="more-btn" type="button">•••</button></td>`;
      document.getElementById('proofTable').prepend(proofRow);
      updateProofMetrics();
      proofRow.querySelector('.more-btn').addEventListener('click', () => {
        openActionDrawer({
          title: paymentName,
          description: 'Expediente del pago realizado y su documentación comprobatoria.',
          details: [
            { label: 'Solicitud', value: approvedFolio },
            { label: 'Fecha de pago', value: formattedDate },
            { label: 'Importe', value: formatRequestAmount(amount) },
            { label: 'Comprobante', value: proofFile?.name || 'Pendiente' },
            { label: 'Expediente', value: 'Por archivar' },
          ],
          primaryLabel: 'Archivar expediente',
          onPrimary: () => {
            const badge = proofRow.querySelector('.status');
            badge.className = 'status approved';
            badge.textContent = 'Completo';
            const action = proofRow.querySelector('.proof-action-btn');
            action.className = 'proof-action-btn complete';
            action.textContent = 'Ver comprobante';
            updateProofMetrics();
            enterpriseNotify('Expediente archivado correctamente');
          },
          receiptKey,
        });
      });
      const hasPendingItems = payments.some(
        (payment) => payment.request === approvedFolio && payment.status !== 'Pagado',
      );
      if (!hasPendingItems) {
        const usedOption = [...selects[0].options].find((option) => option.value === approvedFolio);
        usedOption?.remove();
      }
      approvedRequestSelect.value = '';
    }
    renderPayments();
    pendingPaymentIndex = null;
  },
  true,
);

const requestWorkflow = new Map([
  ['SF-2026-0184', { status: 'En revisión externa', amount: 76430 }],
  ['SF-2026-0185', { status: 'En revisión externa', amount: 31200 }],
  ['SF-2026-0183', { status: 'Autorizada', amount: 128640 }],
  ['SF-2026-0182', { status: 'Corrección', amount: 19820 }],
]);
let nextRequestNumber = 186;

function formatRequestAmount(value) {
  return `$${Number(value || 0).toLocaleString('es-MX')}`;
}

function updateRequestMetrics() {
  const requests = [...requestWorkflow.values()];
  const pending = requests.filter((request) => ['En revisión', 'En revisión externa'].includes(request.status));
  const approved = requests.filter((request) => request.status === 'Autorizada');
  const rejected = requests.filter((request) => ['Corrección', 'Rechazada'].includes(request.status));
  document.getElementById('requestPendingCount').textContent = pending.length;
  document.getElementById('requestReviewCount').textContent = pending.length;
  document.getElementById('requestApprovedCount').textContent = approved.length;
  document.getElementById('requestRejectedCount').textContent = rejected.length;
  document.getElementById('requestPendingAmount').textContent =
    formatRequestAmount(pending.reduce((sum, request) => sum + Number(request.amount || 0), 0));
  document.getElementById('requestApprovedAmount').textContent =
    formatRequestAmount(approved.reduce((sum, request) => sum + Number(request.amount || 0), 0));
}

function addApprovedRequestOption(folio, amount) {
  const select = document.getElementById('approvedRequestSelect');
  if ([...select.options].some((option) => option.value === folio)) return;
  select.add(new Option(`${folio} · ${formatRequestAmount(amount)} · Autorizada`, folio));
}

updateRequestMetrics();

findButton('+ Nueva solicitud')?.addEventListener('click', () => {
  openActionDrawer({
    title: 'Nueva solicitud de fondos',
    description: 'Captura la información principal. El folio se asignará automáticamente.',
    centered: true,
    contentHtml: `
      <div class="request-form-grid">
        <label class="request-field request-full"><span>Concepto de la solicitud</span><select id="requestConcept" required><option value="">Selecciona un concepto...</option><option>Pago de energía eléctrica</option><option>Pago de agua</option><option>Servicio de internet y telefonía</option><option>Servicio de limpieza</option><option>Mantenimiento preventivo</option><option>Mantenimiento correctivo</option><option>Arrendamiento</option><option>Compra de insumos</option><option>Servicio de seguridad</option></select></label>
        <label class="request-field"><span>Importe estimado</span><input id="requestAmount" type="number" min="1" placeholder="$0.00" required></label>
        <label class="request-field"><span>Fecha requerida</span><input id="requestDate" type="date" required></label>
        <label class="request-field"><span>Sucursal</span><select id="requestBranch"><option>Chihuahua</option><option>Juárez</option><option>Parral</option><option>Delicias</option><option>Varias sucursales</option></select></label>
        <label class="request-field"><span>Prioridad</span><select id="requestPriority"><option>Normal</option><option>Alta</option><option>Urgente</option></select></label>
        <label class="request-field"><span>Tipo de gasto</span><select id="requestCategory"><option>Servicio recurrente</option><option>Mantenimiento</option><option>Compra extraordinaria</option><option>Arrendamiento</option></select></label>
        <label class="request-field"><span>Centro de costo</span><select id="requestCostCenter" required><option value="">Selecciona...</option><option>CC-CHIH-01 · Chihuahua</option><option>CC-JRZ-01 · Juárez</option><option>CC-PAR-01 · Parral</option><option>CC-DEL-01 · Delicias</option><option>CC-CORP-01 · Corporativo</option></select></label>
        <label class="request-field request-full"><span>Proveedor o beneficiario</span><select id="requestSupplier" required><option value="">Selecciona un proveedor...</option><option>CFE Suministrador de Servicios Básicos</option><option>Junta Municipal de Agua</option><option>Telmex</option><option>Totalplay Empresarial</option><option>Servicios de Limpieza del Norte</option><option>Mantenimiento Integral Petroil</option><option>Proveedor autorizado de insumos</option></select></label>
        <label class="request-field request-full"><span>Justificación</span><select id="requestNotes" required><option value="">Selecciona una justificación...</option><option>Pago recurrente conforme a contrato</option><option>Evitar suspensión del servicio</option><option>Atender mantenimiento programado</option><option>Corregir una falla operativa</option><option>Reponer insumos indispensables</option><option>Cumplir compromiso contractual</option></select></label>
        <label class="request-field request-full"><span>Soporte: cotización, factura o recibo</span><input id="requestSupport" type="file" accept="image/*,.pdf,.xlsx,.xls" required></label>
      </div>`,
    primaryLabel: 'Crear solicitud',
    onPrimary: () => {
      const concept = document.getElementById('requestConcept').value.trim();
      const amount = Number(document.getElementById('requestAmount').value);
      const date = document.getElementById('requestDate').value;
      const branch = document.getElementById('requestBranch').value;
      const supplier = document.getElementById('requestSupplier').value.trim();
      const costCenter = document.getElementById('requestCostCenter').value.trim();
      const notes = document.getElementById('requestNotes').value.trim();
      const support = document.getElementById('requestSupport').files?.[0];
      if (!concept || !amount || !date || !supplier || !costCenter || !notes || !support) {
        enterpriseNotify('Completa todos los campos y adjunta el soporte');
        return false;
      }
      const folio = `SF-2026-${String(nextRequestNumber++).padStart(4, '0')}`;
      requestWorkflow.set(folio, {
        status: 'En revisión externa',
        amount,
        concept,
        date,
        branch,
        supplier,
        costCenter,
        notes,
        supportName: support.name,
      });
      const formattedDate = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
        .format(new Date(`${date}T12:00:00`));
      const row = document.createElement('tr');
      row.dataset.folio = folio;
      row.innerHTML = `<td><strong>${folio}</strong></td><td>${formattedDate}</td><td>${concept}</td><td>${branch}</td><td><strong>${formatRequestAmount(amount)}</strong></td><td><span class="status waiting">En revisión externa</span></td><td><button class="more-btn" type="button">•••</button></td>`;
      document.getElementById('requestsTable').prepend(row);
      row.querySelector('.more-btn').addEventListener('click', () => {
        openActionDrawer({
          title: folio,
          description: 'Datos editables de la solicitud antes de su aprobación.',
          details: [
            { label: 'Concepto', value: concept },
            { label: 'Proveedor', value: supplier },
            { label: 'Sucursal', value: branch },
            { label: 'Centro de costo', value: costCenter },
            { label: 'Fecha requerida', value: formattedDate },
            { label: 'Importe', value: formatRequestAmount(amount) },
            { label: 'Documento', value: support.name },
            { label: 'Estado', value: 'En revisión externa' },
          ],
          primaryLabel: 'Cerrar detalle',
          onPrimary: () => true,
        });
      });
      updateRequestMetrics();
      enterpriseNotify(`${folio} enviada al proceso externo de aprobación`);
      return true;
    },
  });
});

findButton('Confirmar semana')?.addEventListener('click', () => {
  enterpriseNotify('Semana confirmada e integrada a la programación');
  showView('programacion');
});

findButton('Configurar plan')?.addEventListener('click', () => {
  openActionDrawer({
    title: 'Configuración del plan de limpieza',
    description: 'Revisa las condiciones vigentes antes de actualizar el servicio.',
    details: [
      { label: 'Frecuencia', value: 'Lunes a viernes' },
      { label: 'Tarifa diaria', value: '$650' },
      { label: 'Sucursales activas', value: '6' },
    ],
    primaryLabel: 'Guardar configuración',
    onPrimary: () => enterpriseNotify('Configuración del plan actualizada'),
  });
});

findButton('+ Nueva sucursal')?.addEventListener('click', () => {
  openActionDrawer({
    title: 'Alta de nueva sucursal',
    description: 'El expediente se agregará al catálogo administrativo.',
    details: [
      { label: 'Información requerida', value: 'Nombre, región y centro de costo' },
      { label: 'Responsable', value: 'Pendiente de asignar' },
      { label: 'Estado inicial', value: 'En configuración' },
    ],
    primaryLabel: 'Iniciar registro',
    onPrimary: () => enterpriseNotify('Registro de sucursal iniciado'),
  });
});

document.querySelectorAll('.branch-card .secondary-btn').forEach((button) => {
  button.addEventListener('click', () => {
    const card = button.closest('.branch-card');
    openActionDrawer({
      title: card.querySelector('h3').textContent,
      description: card.querySelector('p').textContent,
      details: [...card.querySelectorAll('.branch-stats div')].map((item) => ({
        label: item.querySelector('span').textContent,
        value: item.querySelector('strong').textContent,
      })),
      primaryLabel: 'Abrir expediente',
      onPrimary: () => enterpriseNotify('Expediente abierto en modo prototipo'),
    });
  });
});

document.querySelectorAll('.more-btn').forEach((button) => {
  button.addEventListener('click', () => {
    const row = button.closest('tr');
    const cells = [...row.cells].map((cell) => cell.textContent.trim()).filter(Boolean);
    const isPayment = row.closest('#paymentsTable');
    const isProof = row.closest('#proofTable');
    const labels = isPayment
      ? ['Solicitud autorizada', 'Vencimiento', 'Importe', 'Variación', 'Estado']
      : isProof
        ? ['Solicitud', 'Fecha de pago', 'Importe', 'Expediente']
        : ['Fecha requerida', 'Concepto', 'Sucursal', 'Importe', 'Estado'];
    const detailValues = isPayment
      ? [cells[0], ...cells.slice(2, 6)]
      : isProof
        ? [cells[0], ...cells.slice(2, 5)]
        : cells.slice(1, 6);
    openActionDrawer({
      title: (isPayment || isProof ? cells[1] : cells[0]) || 'Detalle del registro',
      description: isProof
        ? 'Expediente del pago realizado y su documentación comprobatoria.'
        : 'Información relacionada con este movimiento.',
      details: detailValues.map((value, index) => ({
        label: labels[index] || 'Dato',
        value,
      })),
      primaryLabel: isProof ? 'Archivar expediente' : 'Revisar registro',
      onPrimary: () => {
        if (isProof) {
          const badge = row.querySelector('.status');
          if (badge) {
            badge.className = 'status approved';
            badge.textContent = 'Completo';
          }
          enterpriseNotify('Expediente archivado correctamente');
        } else {
          enterpriseNotify('Registro marcado para revisión');
        }
      },
      receiptKey: `${cells[0] || row.rowIndex}-${cells[1] || ''}`,
    });
  });
});

const importInput = document.createElement('input');
importInput.type = 'file';
importInput.accept = '.xlsx,.xls,.csv';
importInput.hidden = true;
document.body.append(importInput);
findButton('Importar Excel')?.addEventListener('click', () => importInput.click());
importInput.addEventListener('change', () => {
  const file = importInput.files?.[0];
  if (file) enterpriseNotify(`Archivo listo para importar: ${file.name}`);
  importInput.value = '';
});

findButton('Exportar Excel')?.addEventListener('click', () => {
  const rows = [
    ['Indicador', 'Resultado', 'Detalle'],
    ['Gasto mensual', '$898,700', '+4.8% vs junio'],
    ['Recargos evitados', '$18,450', '12 alertas atendidas'],
    ['Expedientes completos', '96%', 'Meta 100%'],
    ['Tiempo de aprobación', '7.4 h', '-31% vs mes anterior'],
  ];
  const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'reporte-centro-de-control-julio-2026.csv';
  link.click();
  URL.revokeObjectURL(url);
  enterpriseNotify('Reporte exportado correctamente');
});

document.querySelectorAll('#programacion .filter-chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    document
      .querySelectorAll('#programacion .filter-chip')
      .forEach((item) => item.classList.toggle('active', item === chip));
    const selectedCriterion = normalizeFilterText(chip.textContent);
    const criterion =
      selectedCriterion === 'listos'
        ? 'listo'
        : selectedCriterion === 'con variacion'
          ? 'variacion'
          : selectedCriterion;
    document.querySelectorAll('#paymentsTable tr').forEach((row) => {
      const show = criterion === 'todos' || normalizeFilterText(row.textContent).includes(criterion);
      row.classList.toggle('workflow-hidden', !show);
    });
  });
});

document.querySelectorAll('#aprobaciones .filter-chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    document
      .querySelectorAll('#aprobaciones .filter-chip')
      .forEach((item) => item.classList.toggle('active', item === chip));
    const selected = normalizeFilterText(chip.textContent);
    document.querySelectorAll('#proofTable tr').forEach((row) => {
      const content = normalizeFilterText(row.textContent);
      const show =
        selected === 'todos' ||
        (selected === 'pendientes' && !content.includes('completo')) ||
        (selected === 'completos' && content.includes('completo'));
      row.classList.toggle('workflow-hidden', !show);
    });
  });
});

document.getElementById('proofTable')?.addEventListener('click', (event) => {
  const action = event.target.closest('.proof-action-btn');
  if (!action) return;
  action.closest('tr')?.querySelector('.more-btn')?.click();
});

document.getElementById('requestsTable')?.addEventListener('click', (event) => {
  const row = event.target.closest('tr');
  if (!row) return;
  document.querySelectorAll('#requestsTable tr').forEach((item) => item.classList.remove('is-selected'));
  row.classList.add('is-selected');
});

function updateProofMetrics() {
  const rows = [...document.querySelectorAll('#proofTable tr')];
  const paidAmount = rows.reduce((sum, row) => {
    const value = row.cells[3]?.textContent.replace(/[^\d.]/g, '') || '0';
    return sum + Number(value);
  }, 0);
  const completed = rows.filter((row) =>
    normalizeFilterText(row.cells[4]?.textContent || '').includes('completo'),
  ).length;
  const paymentCount = document.getElementById('proofPaymentCount');
  const paidTotal = document.getElementById('proofPaidAmount');
  const completeCount = document.getElementById('proofCompleteCount');
  const pendingCount = document.getElementById('proofPendingCount');
  if (paymentCount) paymentCount.textContent = rows.length;
  if (paidTotal) paidTotal.textContent = formatRequestAmount(paidAmount);
  if (completeCount) completeCount.textContent = completed;
  if (pendingCount) pendingCount.textContent = rows.length - completed;
}

updateProofMetrics();

document.getElementById('downloadProofs')?.addEventListener('click', () => {
  const rows = [['Solicitud', 'Pago / proveedor', 'Fecha', 'Importe', 'Expediente']];
  document.querySelectorAll('#proofTable tr').forEach((row) => {
    rows.push([...row.cells].slice(0, 5).map((cell) => cell.textContent.trim()));
  });
  const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'relacion-comprobaciones-julio-2026.csv';
  link.click();
  URL.revokeObjectURL(url);
  enterpriseNotify('Relación de comprobaciones descargada');
});

const calendarOperations = [
  {
    id: 'op-internet',
    day: 21,
    service: 'Internet',
    branch: 'Juárez',
    amount: '$8,920',
    time: '09:30',
    status: 'Recibo pendiente',
    tone: 'warning',
    owner: 'Kevin Martínez',
    action: 'Adjuntar recibo',
  },
  {
    id: 'op-cfe',
    day: 22,
    service: 'CFE',
    branch: 'Chihuahua',
    amount: '$42,650',
    time: '12:00',
    status: 'Solicitud pendiente',
    tone: 'critical',
    owner: 'Laura Méndez',
    action: 'Preparar solicitud',
  },
  {
    id: 'op-agua',
    day: 23,
    service: 'Agua',
    branch: 'Parral',
    amount: '$5,480',
    time: '10:15',
    status: 'En revisión externa',
    tone: 'info',
    owner: 'Daniel Ruiz',
    action: 'Consultar solicitud',
  },
  {
    id: 'op-limpieza',
    day: 25,
    service: 'Limpieza',
    branch: '6 sucursales',
    amount: '$31,200',
    time: '16:00',
    status: 'Programado',
    tone: 'ready',
    owner: 'Kevin Martínez',
    action: 'Revisar programación',
  },
  {
    id: 'op-cfe-parral',
    day: 29,
    service: 'CFE',
    branch: 'Parral',
    amount: '$33,860',
    time: '11:00',
    status: 'Variación +12%',
    tone: 'warning',
    owner: 'María Torres',
    action: 'Revisar variación',
  },
];

const dateRail = document.getElementById('dateRail');
const calendarAgenda = document.getElementById('calendarAgenda');
const operationDetail = document.getElementById('operationDetail');
const calendarMonthView = document.getElementById('calendarMonthView');
const calendarBranchFilter = document.getElementById('calendarBranchFilter');
const calendarServiceFilter = document.getElementById('calendarServiceFilter');
let selectedCalendarDay = null;

function renderOperationDetail(operation) {
  if (!operation) {
    operationDetail.innerHTML =
      '<div class="operation-empty"><strong>Sin compromisos</strong><p>No hay operaciones para los filtros seleccionados.</p></div>';
    return;
  }
  operationDetail.innerHTML = `
    <span class="operation-kicker">COMPROMISO SELECCIONADO</span>
    <div class="operation-detail-heading">
      <span class="operation-service-icon">${formalIcons.calendar}</span>
      <div><h2>${operation.service}</h2><p>${operation.branch} · ${operation.day} de julio, ${operation.time}</p></div>
    </div>
    <div class="operation-status operation-status-${operation.tone}">${operation.status}</div>
    <dl>
      <div><dt>Importe</dt><dd>${operation.amount}</dd></div>
      <div><dt>Responsable</dt><dd>${operation.owner}</dd></div>
      <div><dt>Fecha límite</dt><dd>${operation.day} julio 2026</dd></div>
      <div><dt>Flujo</dt><dd>${operation.action}</dd></div>
    </dl>
    <button class="primary-btn operation-primary" type="button">${operation.action}</button>
    <button class="secondary-btn operation-reviewed" type="button">Marcar como revisado</button>`;
  operationDetail.querySelector('.operation-primary').addEventListener('click', () => {
    if (operation.service === 'Limpieza') showView('limpieza');
    else if (operation.status.includes('revisión externa')) showView('solicitudes');
    else showView('programacion');
    enterpriseNotify(`Abriendo flujo: ${operation.action}`);
  });
  operationDetail.querySelector('.operation-reviewed').addEventListener('click', (event) => {
    event.currentTarget.textContent = 'Revisado ✓';
    event.currentTarget.disabled = true;
    enterpriseNotify('Compromiso marcado como revisado');
  });
}

function renderCalendarOperations() {
  const branch = normalizeFilterText(calendarBranchFilter.value);
  const service = normalizeFilterText(calendarServiceFilter.value);
  const isCurrentMonth = calendarMonthIndex === 2;
  const visibleOperations = isCurrentMonth
    ? calendarOperations.filter(
        (operation) =>
          (!selectedCalendarDay || operation.day === selectedCalendarDay) &&
          (!branch || normalizeFilterText(operation.branch).includes(branch)) &&
          (!service || normalizeFilterText(operation.service).includes(service)),
      )
    : [];

  calendarAgenda.innerHTML = visibleOperations.length
    ? visibleOperations
        .map(
          (operation, index) => `
            <button class="operation-row operation-row-${operation.tone} ${index === 0 ? 'active' : ''}" data-operation="${operation.id}">
              <span class="operation-time"><strong>${operation.time}</strong><small>${operation.day} JUL</small></span>
              <span class="operation-line"><i></i></span>
              <span class="operation-copy"><strong>${operation.service} · ${operation.branch}</strong><small>${operation.status}</small></span>
              <span class="operation-amount">${operation.amount}</span>
              <span class="operation-arrow">›</span>
            </button>`,
        )
        .join('')
    : '<div class="agenda-empty"><strong>Sin compromisos para esta selección</strong><span>Prueba otro día, sucursal o servicio.</span></div>';

  calendarAgenda.querySelectorAll('.operation-row').forEach((row) => {
    row.addEventListener('click', () => {
      calendarAgenda.querySelectorAll('.operation-row').forEach((item) => item.classList.remove('active'));
      row.classList.add('active');
      renderOperationDetail(calendarOperations.find((item) => item.id === row.dataset.operation));
    });
  });
  renderOperationDetail(visibleOperations[0]);
}

function renderDateRail() {
  const days = [
    { day: null, weekday: 'Todos', label: '7 días' },
    { day: 21, weekday: 'Mar', label: '21' },
    { day: 22, weekday: 'Mié', label: '22' },
    { day: 23, weekday: 'Jue', label: '23' },
    { day: 24, weekday: 'Vie', label: '24' },
    { day: 25, weekday: 'Sáb', label: '25' },
    { day: 26, weekday: 'Dom', label: '26' },
  ];
  dateRail.innerHTML = days
    .map(({ day, weekday, label }) => {
      const count = day ? calendarOperations.filter((item) => item.day === day).length : calendarOperations.length;
      return `<button class="${selectedCalendarDay === day ? 'active' : ''}" data-day="${day ?? ''}">
        <small>${weekday}</small><strong>${label}</strong>${count ? `<em>${count}</em>` : ''}
      </button>`;
    })
    .join('');
  dateRail.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      selectedCalendarDay = button.dataset.day ? Number(button.dataset.day) : null;
      renderDateRail();
      renderCalendarOperations();
    });
  });
}

calendarBranchFilter.addEventListener('change', renderCalendarOperations);
calendarServiceFilter.addEventListener('change', renderCalendarOperations);

const monthNames = ['Mayo 2026', 'Junio 2026', 'Julio 2026'];
let calendarMonthIndex = 2;
const monthHeading = document.querySelector('.month-nav h2');
const monthButtons = document.querySelectorAll('.month-nav button');
monthButtons[0]?.addEventListener('click', () => {
  calendarMonthIndex = Math.max(0, calendarMonthIndex - 1);
  monthHeading.textContent = monthNames[calendarMonthIndex];
  enterpriseFilters.period.value = monthNames[calendarMonthIndex].toLocaleLowerCase('es-MX');
  applyEnterpriseFilters();
  renderCalendarOperations();
});
monthButtons[1]?.addEventListener('click', () => {
  calendarMonthIndex = Math.min(monthNames.length - 1, calendarMonthIndex + 1);
  monthHeading.textContent = monthNames[calendarMonthIndex];
  enterpriseFilters.period.value = monthNames[calendarMonthIndex].toLocaleLowerCase('es-MX');
  applyEnterpriseFilters();
  renderCalendarOperations();
});

enterpriseFilters.period.addEventListener('change', () => {
  monthHeading.textContent =
    enterpriseFilters.period.options[enterpriseFilters.period.selectedIndex].text;
  calendarMonthIndex = monthNames.indexOf(monthHeading.textContent);
  renderCalendarOperations();
});

const calendarViewButtons = [findButton('Agenda'), findButton('Mes')].filter(Boolean);
calendarViewButtons.forEach((button) => {
  button.addEventListener('click', () => {
    calendarViewButtons.forEach((item) => {
      item.classList.toggle('primary-btn', item === button);
      item.classList.toggle('secondary-btn', item !== button);
    });
    const showAgenda = normalizeFilterText(button.textContent) === 'agenda';
    calendarAgenda.style.display = showAgenda ? '' : 'none';
    dateRail.style.display = showAgenda ? '' : 'none';
    calendarMonthView.style.display = showAgenda ? 'none' : 'block';
    operationDetail.style.display = showAgenda ? '' : 'none';
    document.querySelector('.calendar-workspace').classList.toggle('month-active', !showAgenda);
  });
});

calendarMonthView.addEventListener('click', (event) => {
  const calendarEvent = event.target.closest('[data-calendar-day]');
  if (!calendarEvent) return;
  selectedCalendarDay = Number(calendarEvent.dataset.calendarDay);
  findButton('Agenda')?.click();
  renderDateRail();
  renderCalendarOperations();
});

renderDateRail();
renderCalendarOperations();

function updateRequestStatus(folio, status) {
  const request = requestWorkflow.get(folio) || {};
  request.status = status;
  requestWorkflow.set(folio, request);
  const row = [...document.querySelectorAll('#requestsTable tr')].find(
    (item) => item.querySelector('strong')?.textContent.trim() === folio,
  );
  const badge = row?.querySelector('.status');
  if (badge) {
    badge.className =
      status === 'Autorizada' || status === 'Pagada'
        ? 'status approved'
        : status === 'En revisión' || status === 'En revisión externa'
          ? 'status waiting'
          : 'status rejected';
    badge.textContent = status;
  }
  updateRequestMetrics();
}

const dashboardBranch = document.getElementById('dashboardBranch');
const dashboardPeriod = document.getElementById('dashboardPeriod');
const dashboardData = {
  julio: { label: 'Julio 2026', spend: 898700, savings: 18450, complete: 96, time: 7.4, trend: '↑ 4.8% vs junio' },
  junio: { label: 'Junio 2026', spend: 857540, savings: 16280, complete: 93, time: 8.1, trend: '↑ 2.3% vs mayo' },
  mayo: { label: 'Mayo 2026', spend: 838260, savings: 14920, complete: 91, time: 9.2, trend: '↓ 1.6% vs abril' },
};
const dashboardBranchFactors = {
  'Todas las sucursales': 1,
  Chihuahua: 0.28,
  Juárez: 0.26,
  Parral: 0.18,
  Delicias: 0.15,
};

function updateDashboard() {
  const period = dashboardData[dashboardPeriod.value];
  const branch = dashboardBranch.value;
  const factor = dashboardBranchFactors[branch];
  const dashboardContext = document.getElementById('dashboardContext');
  if (dashboardContext) dashboardContext.textContent = `${branch} · ${period.label}`;
  document.getElementById('dashSpend').textContent =
    `$${Math.round(period.spend * factor).toLocaleString('es-MX')}`;
  document.getElementById('dashSavings').textContent =
    `$${Math.round(period.savings * factor).toLocaleString('es-MX')}`;
  document.getElementById('dashComplete').textContent =
    `${Math.max(84, Math.round(period.complete - (1 - factor) * 2))}%`;
  document.getElementById('dashTime').textContent =
    `${(period.time + (1 - factor) * 0.6).toFixed(1)} h`;
  document.getElementById('dashSpendTrend').textContent = period.trend;
  document.querySelector('.service-donut span').textContent =
    `$${Math.round((period.spend * factor) / 1000).toLocaleString('es-MX')} mil`;
}

[dashboardBranch, dashboardPeriod].forEach((control) => {
  control?.addEventListener('change', () => {
    updateDashboard();
    document.querySelectorAll('#reportes .dashboard-card').forEach((card) => {
      card.classList.remove('dashboard-refresh');
      requestAnimationFrame(() => card.classList.add('dashboard-refresh'));
    });
  });
});

document.getElementById('exportDashboard')?.addEventListener('click', () => {
  const period = dashboardData[dashboardPeriod.value];
  const branch = dashboardBranch.value;
  const rows = [
    ['Dashboard', branch, period.label],
    ['Indicador', 'Resultado'],
    ['Gasto del periodo', document.getElementById('dashSpend').textContent],
    ['Ahorro generado', document.getElementById('dashSavings').textContent],
    ['Expedientes completos', document.getElementById('dashComplete').textContent],
    ['Tiempo de autorización externa', document.getElementById('dashTime').textContent],
  ];
  const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `dashboard-${normalizeFilterText(branch).replaceAll(' ', '-')}-${dashboardPeriod.value}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  enterpriseNotify(`Dashboard exportado: ${branch} · ${period.label}`);
});

updateDashboard();

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const interactiveSurfaces = document.querySelectorAll(
  '.panel, .kpi-card, .metric, .quick-action, .branch-card, .approval-card',
);

if (!reducedMotion) {
  interactiveSurfaces.forEach((surface) => {
    surface.addEventListener('pointermove', (event) => {
      const bounds = surface.getBoundingClientRect();
      surface.style.setProperty('--spot-x', `${event.clientX - bounds.left}px`);
      surface.style.setProperty('--spot-y', `${event.clientY - bounds.top}px`);
    });
  });

  document.querySelectorAll('.kpi-card strong, .metric strong').forEach((valueElement) => {
    const original = valueElement.textContent.trim();
    const numberText = original.match(/[\d,.]+/)?.[0];
    if (!numberText) return;
    const target = Number(numberText.replaceAll(',', ''));
    if (!Number.isFinite(target)) return;
    const prefix = original.slice(0, original.indexOf(numberText));
    const suffix = original.slice(original.indexOf(numberText) + numberText.length);
    const duration = 720;
    const startedAt = performance.now();

    function animateValue(now) {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(target * eased);
      valueElement.textContent = `${prefix}${current.toLocaleString('es-MX')}${suffix}`;
      if (progress < 1) requestAnimationFrame(animateValue);
      else valueElement.textContent = original;
    }

    requestAnimationFrame(animateValue);
  });
}

document
  .querySelectorAll('.primary-btn, .secondary-btn, .danger-btn, .quick-action, .nav-item')
  .forEach((button) => {
    button.addEventListener('pointerdown', (event) => {
      if (reducedMotion) return;
      const bounds = button.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'ui-ripple';
      ripple.style.left = `${event.clientX - bounds.left}px`;
      ripple.style.top = `${event.clientY - bounds.top}px`;
      button.append(ripple);
      ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    });
  });

const loginScreen = document.getElementById('loginScreen');
const loginForm = document.getElementById('loginForm');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const passwordToggle = document.getElementById('passwordToggle');
const emailError = document.getElementById('emailError');
const passwordError = document.getElementById('passwordError');

function setLoginError(input, errorElement, message) {
  errorElement.textContent = message;
  input.closest('.login-input-wrap').classList.toggle('has-error', Boolean(message));
  input.setAttribute('aria-invalid', String(Boolean(message)));
}

function openPetroilControl() {
  loginScreen.classList.add('is-hidden');
  loginScreen.setAttribute('aria-hidden', 'true');
  showView('solicitudes');
  updateContextChrome();
  window.setTimeout(() => document.getElementById('contenidoPrincipal').focus(), 460);
}

function showLogin() {
  loginScreen.classList.remove('is-hidden');
  loginScreen.removeAttribute('aria-hidden');
  loginPassword.value = '';
  document.getElementById('sidebar').classList.remove('open');
  window.setTimeout(() => loginEmail.focus(), 80);
}

passwordToggle.addEventListener('click', () => {
  const willShow = loginPassword.type === 'password';
  loginPassword.type = willShow ? 'text' : 'password';
  passwordToggle.textContent = willShow ? 'Ocultar' : 'Ver';
  passwordToggle.setAttribute('aria-label', willShow ? 'Ocultar contraseña' : 'Mostrar contraseña');
  loginPassword.focus();
});

document.getElementById('demoAccess').addEventListener('click', () => {
  loginEmail.value = 'kevin@petroil.com';
  loginPassword.value = '1234';
  setLoginError(loginEmail, emailError, '');
  setLoginError(loginPassword, passwordError, '');
  loginPassword.focus();
});

document.getElementById('forgotPassword').addEventListener('click', () => {
  setLoginError(
    loginPassword,
    passwordError,
    'Solicita al administrador el restablecimiento de tu contraseña.',
  );
});

[loginEmail, loginPassword].forEach((input) => {
  input.addEventListener('input', () => {
    if (input === loginEmail) setLoginError(loginEmail, emailError, '');
    else setLoginError(loginPassword, passwordError, '');
  });
});

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const email = loginEmail.value.trim().toLocaleLowerCase('es-MX');
  const password = loginPassword.value;
  const validEmail = email === 'kevin@petroil.com';
  const validPassword = password === '1234';

  setLoginError(
    loginEmail,
    emailError,
    email ? (validEmail ? '' : 'No encontramos este correo en Agenda de Gastos.') : 'Ingresa tu correo.',
  );
  setLoginError(
    loginPassword,
    passwordError,
    password ? (validPassword ? '' : 'La contraseña no es correcta.') : 'Ingresa tu contraseña.',
  );

  if (!validEmail || !validPassword) {
    (validEmail ? loginPassword : loginEmail).focus();
    loginForm.classList.remove('login-shake');
    requestAnimationFrame(() => loginForm.classList.add('login-shake'));
    return;
  }

  if (document.getElementById('rememberSession').checked) {
    localStorage.setItem('petroilControlSession', 'kevin');
  } else {
    sessionStorage.setItem('petroilControlSession', 'kevin');
  }
  openPetroilControl();
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('petroilControlSession');
  sessionStorage.removeItem('petroilControlSession');
  showLogin();
});

if (
  localStorage.getItem('petroilControlSession') === 'kevin' ||
  sessionStorage.getItem('petroilControlSession') === 'kevin'
) {
  openPetroilControl();
} else {
  window.setTimeout(() => loginEmail.focus(), 100);
}

// Contexto vivo para el centro de mando.
const dashboardTrends = [
  { label: '↓ 8% vs. semana anterior', tone: 'good' },
  { label: '3 requieren acción hoy', tone: 'warn' },
  { label: '↓ 1 desde ayer', tone: 'good' },
  { label: '↑ 6% este mes', tone: 'good' },
];

document.querySelectorAll('#inicio .kpi-card').forEach((card, index) => {
  if (card.querySelector('.kpi-trend')) return;
  const trend = document.createElement('span');
  trend.className = `kpi-trend ${dashboardTrends[index]?.tone === 'warn' ? 'warn' : ''}`;
  trend.textContent = dashboardTrends[index]?.label || 'Actualizado ahora';
  card.querySelector('div:last-child')?.append(trend);
});

const greeting = document.querySelector('#inicio .page-heading h1');
if (greeting) {
  const hour = new Date().getHours();
  const dayPart = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  greeting.textContent = `${dayPart}, Kevin`;
}

const centerEyebrow = document.querySelector('#inicio .eyebrow');
if (centerEyebrow) {
  centerEyebrow.textContent = 'OPERACIÓN EN VIVO';
}

// Vista directa para validación visual local; no crea una sesión persistente.
if (new URLSearchParams(window.location.search).get('demo') === '1') {
  const demoParams = new URLSearchParams(window.location.search);
  const demoView = demoParams.get('view') || 'solicitudes';
  openPetroilControl();
  showView(document.getElementById(demoView) ? demoView : 'solicitudes');
  updateContextChrome();
  if (demoParams.get('modal') === 'payment') newPaymentButton.click();
}
