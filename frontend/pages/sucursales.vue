<script setup lang="ts">
import type { Casa } from '~/types'

const store = useCasasStore()
const search = ref('')
const empresaFilter = ref('Todas')
const selectedCasa = ref<Casa | null>(null)
const detailsOpen = ref(false)

onMounted(() => store.fetchCasas())

const syncError = ref<string | null>(null)
const syncSuccessMessage = ref<string | null>(null)

async function handleSync() {
  syncError.value = null
  syncSuccessMessage.value = null
  try {
    await store.syncCasas()
    syncSuccessMessage.value = 'Casas sincronizadas correctamente.'
  } catch (e) {
    console.error('Error al sincronizar casas:', e)
    const fetchError = e as { data?: { message?: string }; message?: string }
    syncError.value = fetchError.data?.message || fetchError.message || 'No se pudo sincronizar.'
  }
}

const editingContact = ref(false)
const contactForm = reactive({ nombreEncargado: '', telefono: '', correo: '' })
const savingContact = ref(false)
const contactError = ref<string | null>(null)

function startEditContact() {
  if (!selectedCasa.value) return
  contactForm.nombreEncargado = selectedCasa.value.nombreEncargado || ''
  contactForm.telefono = selectedCasa.value.telefono || ''
  contactForm.correo = selectedCasa.value.correo || ''
  contactError.value = null
  editingContact.value = true
}

function cancelEditContact() {
  editingContact.value = false
  contactError.value = null
}

async function saveContact() {
  if (!selectedCasa.value) return
  savingContact.value = true
  contactError.value = null
  try {
    // El backend distingue null (limpiar el campo) de una clave ausente (no
    // tocarlo), y valida formato de correo cuando no es null — mandar '' lo
    // rechazaría como email inválido, por eso lo normalizamos a null.
    const updated = await store.updateContacto(selectedCasa.value.id, {
      nombreEncargado: contactForm.nombreEncargado.trim() || null,
      telefono: contactForm.telefono.trim() || null,
      correo: contactForm.correo.trim() || null,
    })
    selectedCasa.value = updated
    editingContact.value = false
  } catch (e) {
    console.error('Error al guardar el contacto de la casa:', e)
    const fetchError = e as { data?: { message?: string }; message?: string }
    contactError.value =
      fetchError.data?.message || fetchError.message || 'No se pudo guardar el contacto.'
  } finally {
    savingContact.value = false
  }
}

const empresas = computed(() => ['Todas', ...new Set(store.items.map((casa) => casa.empresa))])
const filteredCasas = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('es')
  return store.items.filter(
    (casa) =>
      (empresaFilter.value === 'Todas' || casa.empresa === empresaFilter.value) &&
      (!term ||
        `${casa.nombre} ${casa.sucursal} ${casa.empresa}`.toLocaleLowerCase('es').includes(term)),
  )
})

function initials(nombre: string) {
  return nombre.replace('Casa Petroil ', '').slice(0, 2).toUpperCase()
}

function occupied(casa: Casa) {
  return casa.ocupacionMaxima - casa.ocupacionDisponible
}

function occupancyPercentage(casa: Casa) {
  return casa.ocupacionMaxima > 0
    ? Math.min(Math.round((occupied(casa) / casa.ocupacionMaxima) * 100), 100)
    : 0
}

function openDetails(casa: Casa) {
  selectedCasa.value = casa
  detailsOpen.value = true
  editingContact.value = false
  contactError.value = null
}
</script>

<template>
  <section class="casas-page">
    <header class="page-heading">
      <div>
        <h1>Casas Petroil</h1>
        <span>Ocupación y ubicación de cada casa, sincronizado desde Casas Petroil.</span>
      </div>
      <v-btn
        variant="outlined"
        color="secondary"
        prepend-icon="mdi-sync"
        :loading="store.syncing"
        @click="handleSync"
      >
        Sincronizar
      </v-btn>
    </header>

    <v-alert
      v-if="syncError"
      type="error"
      variant="tonal"
      density="comfortable"
      closable
      class="mb-4"
      @click:close="syncError = null"
    >
      {{ syncError }}
    </v-alert>
    <v-alert
      v-if="syncSuccessMessage"
      type="success"
      variant="tonal"
      density="comfortable"
      closable
      class="mb-4"
      @click:close="syncSuccessMessage = null"
    >
      {{ syncSuccessMessage }}
    </v-alert>

    <div class="toolbar">
      <label class="search-field">
        <input v-model="search" type="search" placeholder="Buscar casa, sucursal o empresa..." />
      </label>
      <label class="empresa-filter">
        <span>Empresa</span>
        <select v-model="empresaFilter">
          <option v-for="item in empresas" :key="item">{{ item }}</option>
        </select>
      </label>
      <span class="results">{{ filteredCasas.length }} casas</span>
    </div>

    <div v-if="store.loading" class="loading-state">
      <v-progress-circular indeterminate color="primary" />
      <span>Cargando casas...</span>
    </div>

    <div v-else-if="store.error" class="loading-state">
      <v-icon icon="mdi-alert-circle-outline" size="36" color="error" />
      <strong>No se pudo cargar el catálogo de casas</strong>
      <span>{{ store.error }}</span>
    </div>

    <div v-else-if="filteredCasas.length" class="casas-grid">
      <article v-for="casa in filteredCasas" :key="casa.id" class="casa-card">
        <div class="casa-card__top">
          <span class="casa-initials">{{ initials(casa.nombre) }}</span>
          <span class="status"><i /> Activa</span>
        </div>

        <div class="casa-card__title">
          <h2>{{ casa.nombre }}</h2>
          <p>{{ casa.empresa }} · {{ casa.sucursal }}</p>
        </div>

        <div class="casa-meta">
          <span><small>Ocupación máx.</small><strong>{{ casa.ocupacionMaxima }}</strong></span>
          <span><small>Disponible</small><strong>{{ casa.ocupacionDisponible }}</strong></span>
          <span><small>CP</small><strong>{{ casa.cp }}</strong></span>
        </div>

        <button type="button" class="details-button" @click="openDetails(casa)">
          Ver detalle
        </button>
      </article>
    </div>

    <div v-else class="empty-state">
      <v-icon icon="mdi-home-search-outline" size="36" />
      <strong>No encontramos casas</strong>
      <span>Prueba con otro nombre, sucursal o empresa.</span>
    </div>

    <v-dialog v-model="detailsOpen" max-width="680">
      <article v-if="selectedCasa" class="casa-dialog">
        <header>
          <div>
            <span>Detalle de casa</span>
            <h2>{{ selectedCasa.nombre }}</h2>
            <p>{{ selectedCasa.empresa }} · {{ selectedCasa.sucursal }}</p>
          </div>
          <button type="button" aria-label="Cerrar detalle" @click="detailsOpen = false">
            Cerrar
          </button>
        </header>

        <div class="dialog-status">
          <span><i /> Casa activa</span>
          <small>Sincronizado desde Casas Petroil</small>
        </div>

        <div class="dialog-grid">
          <div><span>Empresa</span><strong>{{ selectedCasa.empresa }}</strong></div>
          <div><span>Sucursal</span><strong>{{ selectedCasa.sucursal }}</strong></div>
          <div><span>Número exterior</span><strong>{{ selectedCasa.numeroExterior || '—' }}</strong></div>
          <div><span>CP</span><strong>{{ selectedCasa.cp }}</strong></div>
        </div>

        <div class="dialog-address">
          <span>Dirección</span>
          <strong>{{ selectedCasa.direccion }}</strong>
        </div>

        <section class="dialog-contact">
          <div class="dialog-contact__heading">
            <span>Contacto</span>
            <button v-if="!editingContact" type="button" @click="startEditContact">Editar</button>
          </div>

          <div v-if="!editingContact" class="dialog-grid dialog-grid--contact">
            <div><span>Encargado</span><strong>{{ selectedCasa.nombreEncargado || '—' }}</strong></div>
            <div><span>Teléfono</span><strong>{{ selectedCasa.telefono || '—' }}</strong></div>
            <div><span>Correo</span><strong>{{ selectedCasa.correo || '—' }}</strong></div>
          </div>

          <form v-else class="contact-form" @submit.prevent="saveContact">
            <v-text-field
              v-model="contactForm.nombreEncargado"
              label="Nombre del encargado"
              density="compact"
              hide-details="auto"
            />
            <v-text-field
              v-model="contactForm.telefono"
              label="Teléfono"
              density="compact"
              hide-details="auto"
            />
            <v-text-field
              v-model="contactForm.correo"
              label="Correo"
              type="email"
              density="compact"
              hide-details="auto"
            />
            <v-alert v-if="contactError" type="error" density="compact" variant="tonal">
              {{ contactError }}
            </v-alert>
            <div class="contact-form__actions">
              <v-btn variant="outlined" color="secondary" size="small" @click="cancelEditContact">
                Cancelar
              </v-btn>
              <v-btn color="primary" size="small" :loading="savingContact" type="submit">
                Guardar
              </v-btn>
            </div>
          </form>
        </section>

        <section class="dialog-occupancy">
          <div class="dialog-occupancy__heading">
            <div><span>Ocupación máxima</span><strong>{{ selectedCasa.ocupacionMaxima }}</strong></div>
            <div><span>Disponible</span><strong>{{ selectedCasa.ocupacionDisponible }}</strong></div>
          </div>
          <div class="dialog-occupancy__progress">
            <i :style="{ width: `${occupancyPercentage(selectedCasa)}%` }" />
          </div>
          <div class="dialog-occupancy__footer">
            <span>{{ occupied(selectedCasa) }} ocupados</span>
            <strong>{{ occupancyPercentage(selectedCasa) }}% utilizado</strong>
          </div>
        </section>

        <footer>
          <button type="button" @click="detailsOpen = false">Cerrar</button>
        </footer>
      </article>
    </v-dialog>
  </section>
</template>

<style scoped>
.casas-page { --blue:#075f99; --orange:#ff791f; position:relative; min-height:calc(100vh - 126px); overflow:hidden; margin:-24px; padding:16px 24px 24px; background:#eaf5fa; color:#0c2f4d; font-family:Arial,Helvetica,sans-serif; isolation:isolate; }
.casas-page::before,.casas-page::after { position:absolute; z-index:-1; border:1px solid rgb(255 255 255 / 9%); border-radius:50%; content:''; pointer-events:none; }
.casas-page::before { top:-150px; right:-70px; width:460px; height:460px; }
.casas-page::after { top:-70px; right:35px; width:270px; height:270px; background:rgb(255 255 255 / 4%); }
.page-heading { position:relative; display:flex; min-height:48px; align-items:center; justify-content:space-between; gap:20px; margin-bottom:16px; padding-left:18px; }
.page-heading::before { position:absolute; top:2px; bottom:2px; left:0; width:5px; border-radius:99px; background:linear-gradient(180deg,#ff963e,#ff6f1a); box-shadow:0 3px 9px rgb(255 111 26 / 22%); content:''; }
.page-heading h1 { margin:0; font-size:clamp(1.28rem,1.8vw,1.6rem); font-weight:600; letter-spacing:-.02em; line-height:1.2; }
.page-heading div > span { display:block; margin-top:5px; color:#6d8192; font-size:.8rem; }
.toolbar { display:flex; align-items:flex-end; gap:10px; padding:9px 11px; margin-bottom:12px; border-left:4px solid var(--orange); border-radius:11px; background:linear-gradient(110deg,#dcecf5,#eef6fa); }
.search-field { display:flex; align-items:center; min-height:37px; padding:0 14px; flex:1; border:1px solid #b9d1df; border-radius:8px; background:#fff; color:#668196; }
.search-field input { width:100%; border:0; outline:0; color:#173d59; font:inherit; font-size:11px; }
.empresa-filter { display:flex; align-items:center; gap:7px; min-height:37px; padding:0 10px; border:1px solid #b9d1df; border-radius:8px; background:#fff; }
.empresa-filter span { color:#738899; font-size:9px; font-weight:800; text-transform:uppercase; }
.empresa-filter select { min-width:130px; border:0; outline:0; background:transparent; color:#173d59; font-size:11px; font-weight:700; }
.results { padding:0 4px 9px; color:#617a8e; font-size:10px; white-space:nowrap; }
.casas-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; perspective:1200px; }
.casa-card { position:relative; display:flex; min-height:270px; overflow:hidden; padding:18px; flex-direction:column; border:0; border-radius:17px; background:linear-gradient(145deg,rgba(255,255,255,.97),rgba(228,242,248,.96)); box-shadow:0 10px 25px rgba(7,95,153,.12),0 0 18px rgba(74,157,195,.08); animation:casa-card-in .48s ease both; transition:transform .2s ease,box-shadow .2s ease,filter .2s ease; }
.casa-card:nth-child(2) { animation-delay:70ms; }
.casa-card:nth-child(3) { animation-delay:140ms; }
.casa-card:nth-child(4) { animation-delay:210ms; }
.casa-card:hover { transform:translateY(-5px) scale(1.008); box-shadow:0 17px 34px rgba(7,95,153,.2),0 0 22px rgba(255,121,31,.1); filter:saturate(1.08); }
.casa-card__top { display:flex; align-items:center; justify-content:space-between; gap:10px; }
.casa-initials { display:grid; width:42px; height:42px; border:1px solid #ffd5bc; border-radius:10px; place-items:center; background:#fff0e7; color:#075487; font-size:14px; font-weight:900; letter-spacing:.03em; transition:transform .2s ease,background .2s ease; }
.casa-card:hover .casa-initials { transform:translateY(-2px) rotate(-2deg); background:#ffe8da; }
.status { display:flex; align-items:center; gap:5px; padding:4px 8px; border-radius:99px; background:#e7f6ef; color:#25805f; font-size:9px; font-weight:800; }
.status i { width:6px; height:6px; border-radius:50%; background:#2aa776; animation:status-pulse 2s ease-in-out infinite; }
.casa-card__title { margin:17px 0 14px; }
.casa-card__title h2 { margin:0; font-size:1rem; font-weight:700; }
.casa-card__title p { margin:8px 0 0; color:#758a9a; font-size:.76rem; }
.casa-meta { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:15px; }
.casa-meta > span { display:flex; min-width:0; min-height:60px; padding:9px 10px; flex-direction:column; justify-content:center; border:1px solid rgba(167,203,219,.65); border-radius:10px; background:linear-gradient(145deg,rgba(236,247,251,.92),rgba(225,241,248,.82)); }
.casa-meta small { color:#7d909f; font-size:.7rem; }
.casa-meta strong { overflow:hidden; margin-top:2px; font-size:.8rem; text-overflow:ellipsis; white-space:nowrap; }
.details-button { position:relative; width:100%; min-height:39px; overflow:hidden; margin-top:auto; border:1px solid #064f80; border-radius:8px; background:linear-gradient(135deg,#086da7,#075487); color:#fff; font-size:.74rem; font-weight:700; letter-spacing:.01em; cursor:pointer; transition:transform .15s ease,box-shadow .15s ease,background .15s ease; }
.details-button:hover { transform:translateY(-1px); background:linear-gradient(135deg,#ff8a2b,#f26a18); border-color:#e96317; box-shadow:0 7px 15px rgba(242,106,24,.25); color:#fff; }
.details-button::after { position:absolute; top:-50%; left:-35%; width:25%; height:200%; background:rgb(255 255 255 / 28%); content:''; transform:rotate(20deg) translateX(-220%); transition:transform .45s ease; }
.details-button:hover::after { transform:rotate(20deg) translateX(620%); }
.loading-state,.empty-state { display:flex; min-height:250px; align-items:center; justify-content:center; flex-direction:column; gap:8px; color:#718697; text-align:center; }
.empty-state strong { color:#264b65; }
.casa-dialog { overflow:hidden; border-radius:16px; background:#fff; color:#123c56; font-family:Arial,Helvetica,sans-serif; box-shadow:0 24px 70px rgba(10,48,73,.24); }
.casa-dialog > header { display:flex; align-items:flex-start; justify-content:space-between; gap:20px; padding:22px 24px 18px; border-top:5px solid #075f99; border-bottom:1px solid #dce8ee; }
.casa-dialog > header span { color:#e56816; font-size:.7rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; }
.casa-dialog > header h2 { margin:4px 0 2px; font-size:1.35rem; }
.casa-dialog > header p { margin:0; color:#6c8292; font-size:.8rem; }
.casa-dialog > header button { padding:7px 10px; border:0; border-radius:6px; background:#edf4f7; color:#526d80; font-size:.7rem; font-weight:700; cursor:pointer; }
.dialog-status { display:flex; align-items:center; justify-content:space-between; gap:14px; padding:12px 24px; background:#f4f9fb; }
.dialog-status > span { display:flex; align-items:center; gap:7px; color:#207558; font-size:.8rem; font-weight:700; }
.dialog-status i { width:7px; height:7px; border-radius:50%; background:#2aa776; }
.dialog-status small { color:#728797; font-size:.7rem; }
.dialog-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:1px; margin:20px 24px; border:1px solid #dce7ed; border-radius:10px; background:#dce7ed; overflow:hidden; }
.dialog-grid > div { display:flex; min-height:70px; padding:14px 16px; flex-direction:column; justify-content:center; background:#fff; }
.dialog-grid span,.dialog-occupancy span,.dialog-address span { color:#758a9a; font-size:.7rem; }
.dialog-grid strong { margin-top:4px; font-size:.9rem; }
.dialog-address { display:flex; flex-direction:column; margin:0 24px 20px; padding:14px 16px; border-radius:10px; background:#f4f9fb; }
.dialog-address strong { margin-top:4px; font-size:.85rem; font-weight:600; }
.dialog-contact { margin:0 24px 20px; }
.dialog-contact__heading { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
.dialog-contact__heading span { color:#42586b; font-size:.72rem; font-weight:800; letter-spacing:.04em; text-transform:uppercase; }
.dialog-contact__heading button { padding:5px 12px; border:1px solid #b9d1df; border-radius:7px; background:#fff; color:#075f99; font-size:.7rem; font-weight:700; cursor:pointer; }
.dialog-contact__heading button:hover { background:#eaf5fa; }
.dialog-grid--contact { grid-template-columns:repeat(3,1fr); margin:0; }
.contact-form { display:flex; flex-direction:column; gap:10px; padding:14px 16px; border:1px solid #dce7ed; border-radius:10px; background:#f8fbfd; }
.contact-form__actions { display:flex; justify-content:flex-end; gap:8px; }
.dialog-occupancy { margin:0 24px 22px; padding:17px; border-radius:11px; background:#edf6fa; }
.dialog-occupancy__heading,.dialog-occupancy__footer { display:flex; align-items:flex-end; justify-content:space-between; gap:18px; }
.dialog-occupancy__heading > div { display:flex; flex-direction:column; }
.dialog-occupancy__heading > div:last-child { text-align:right; }
.dialog-occupancy__heading strong { margin-top:3px; font-size:1.1rem; }
.dialog-occupancy__progress { overflow:hidden; height:9px; margin:14px 0 7px; border-radius:99px; background:#d5e5ed; }
.dialog-occupancy__progress i { display:block; height:100%; border-radius:inherit; background:#0b83b8; }
.dialog-occupancy__footer { font-size:.72rem; }
.dialog-occupancy__footer strong { color:#075f99; }
.casa-dialog > footer { display:flex; justify-content:flex-end; padding:14px 24px; border-top:1px solid #dce8ee; }
.casa-dialog > footer button { min-height:37px; padding:0 18px; border:0; border-radius:7px; background:#075f99; color:#fff; font-size:.75rem; font-weight:700; cursor:pointer; }
@keyframes casa-card-in {
  from { opacity:0; transform:translateY(18px) scale(.985); }
  to { opacity:1; transform:translateY(0) scale(1); }
}
@keyframes status-pulse {
  0%,100% { box-shadow:0 0 0 0 rgb(42 167 118 / 0%); }
  50% { box-shadow:0 0 0 4px rgb(42 167 118 / 16%); }
}
@media (prefers-reduced-motion:reduce) {
  .casa-card,.status i { animation:none; }
  .casa-card,.casa-initials,.details-button { transition:none; }
}
@media (max-width:1100px) { .casas-grid { grid-template-columns:repeat(2,1fr); } }
@media (max-width:700px) {
  .page-heading { align-items:flex-start; flex-direction:column; }
  .casas-grid { grid-template-columns:1fr; }
  .toolbar { align-items:stretch; flex-direction:column; }
  .results { padding:0 2px; }
  .dialog-grid { grid-template-columns:1fr; }
}
</style>
