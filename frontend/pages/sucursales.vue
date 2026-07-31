<script setup lang="ts">
import type { Branch } from '~/types'

const store = useBranchesStore()
const search = ref('')
const region = ref('Todas')
const selectedBranch = ref<Branch | null>(null)
const detailsOpen = ref(false)

onMounted(() => store.fetchBranches())

const regions = computed(() => ['Todas', ...new Set(store.items.map((branch) => branch.region))])
const filteredBranches = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('es')
  return store.items.filter(
    (branch) =>
      (region.value === 'Todas' || branch.region === region.value) &&
      (!term ||
        `${branch.name} ${branch.costCenter} ${branch.ownerName}`
          .toLocaleLowerCase('es')
          .includes(term)),
  )
})
function initials(name: string) {
  return name.replace('Sucursal ', '').slice(0, 2).toUpperCase()
}

function budgetPercentage(spent: number, budget: number) {
  return Math.min(Math.round((spent / budget) * 100), 100)
}

function openDetails(branch: Branch) {
  selectedBranch.value = branch
  detailsOpen.value = true
}
</script>

<template>
  <section class="branches-page">
    <header class="page-heading">
      <div>
        <h1>Sucursales y casas</h1>
        <span>Administra responsables, servicios y presupuesto de cada ubicación.</span>
      </div>
      <button type="button" class="new-branch">
        <span aria-hidden="true">+</span>
        Nueva sucursal
      </button>
    </header>

    <div class="toolbar">
      <label class="search-field">
        <input v-model="search" type="search" placeholder="Buscar sucursal, responsable o centro..." />
      </label>
      <label class="region-filter">
        <span>Región</span>
        <select v-model="region">
          <option v-for="item in regions" :key="item">{{ item }}</option>
        </select>
      </label>
      <span class="results">{{ filteredBranches.length }} ubicaciones</span>
    </div>

    <div v-if="store.loading" class="loading-state">
      <v-progress-circular indeterminate color="primary" />
      <span>Cargando sucursales...</span>
    </div>

    <div v-else-if="filteredBranches.length" class="branch-grid">
      <article v-for="branch in filteredBranches" :key="branch.id" class="branch-card">
        <div class="branch-card__top">
          <span class="branch-initials">{{ initials(branch.name) }}</span>
          <span class="status"><i /> {{ branch.status === 'activa' ? 'Activa' : 'Inactiva' }}</span>
        </div>

        <div class="branch-card__title">
          <h2>{{ branch.name }}</h2>
          <p>{{ branch.region }} · Centro de costo {{ branch.costCenter }}</p>
        </div>

        <div class="branch-meta">
          <span><small>Servicios</small><strong>{{ branch.servicesCount }}</strong></span>
          <span><small>Presupuesto</small><strong>{{ formatCurrency(branch.budget) }}</strong></span>
          <span><small>Responsable</small><strong>{{ branch.ownerName }}</strong></span>
        </div>

        <button type="button" class="details-button" @click="openDetails(branch)">
          Ver expediente
        </button>
      </article>
    </div>

    <div v-else class="empty-state">
      <v-icon icon="mdi-office-building-search-outline" size="36" />
      <strong>No encontramos sucursales</strong>
      <span>Prueba con otro nombre o región.</span>
    </div>

    <v-dialog v-model="detailsOpen" max-width="680">
      <article v-if="selectedBranch" class="branch-dialog">
        <header>
          <div>
            <span>Expediente de sucursal</span>
            <h2>{{ selectedBranch.name }}</h2>
            <p>{{ selectedBranch.region }} · {{ selectedBranch.costCenter }}</p>
          </div>
          <button type="button" aria-label="Cerrar expediente" @click="detailsOpen = false">
            Cerrar
          </button>
        </header>

        <div class="dialog-status">
          <span><i /> {{ selectedBranch.status === 'activa' ? 'Sucursal activa' : 'Sucursal inactiva' }}</span>
          <small>Información administrativa vigente</small>
        </div>

        <div class="dialog-grid">
          <div><span>Responsable</span><strong>{{ selectedBranch.ownerName }}</strong></div>
          <div><span>Centro de costo</span><strong>{{ selectedBranch.costCenter }}</strong></div>
          <div><span>Servicios registrados</span><strong>{{ selectedBranch.servicesCount }}</strong></div>
          <div><span>Región</span><strong>{{ selectedBranch.region }}</strong></div>
        </div>

        <section class="dialog-budget">
          <div class="dialog-budget__heading">
            <div><span>Presupuesto asignado</span><strong>{{ formatCurrency(selectedBranch.budget) }}</strong></div>
            <div><span>Saldo disponible</span><strong>{{ formatCurrency(selectedBranch.budget - selectedBranch.spent) }}</strong></div>
          </div>
          <div class="dialog-budget__progress">
            <i :style="{ width: `${budgetPercentage(selectedBranch.spent, selectedBranch.budget)}%` }" />
          </div>
          <div class="dialog-budget__footer">
            <span>{{ formatCurrency(selectedBranch.spent) }} ejercido</span>
            <strong>{{ budgetPercentage(selectedBranch.spent, selectedBranch.budget) }}% utilizado</strong>
          </div>
        </section>

        <footer>
          <button type="button" @click="detailsOpen = false">Cerrar expediente</button>
        </footer>
      </article>
    </v-dialog>
  </section>
</template>

<style scoped>
.branches-page { --blue:#075f99; --orange:#ff791f; position:relative; min-height:calc(100vh - 126px); overflow:hidden; margin:-24px; padding:16px 24px 24px; background:#eaf5fa; color:#0c2f4d; font-family:Arial,Helvetica,sans-serif; isolation:isolate; }
.branches-page::before,.branches-page::after { position:absolute; z-index:-1; border:1px solid rgb(255 255 255 / 9%); border-radius:50%; content:''; pointer-events:none; }
.branches-page::before { top:-150px; right:-70px; width:460px; height:460px; }
.branches-page::after { top:-70px; right:35px; width:270px; height:270px; background:rgb(255 255 255 / 4%); }
.page-heading { position:relative; display:flex; min-height:48px; align-items:center; justify-content:space-between; gap:20px; margin-bottom:16px; padding-left:18px; }
.page-heading::before { position:absolute; top:2px; bottom:2px; left:0; width:5px; border-radius:99px; background:linear-gradient(180deg,#ff963e,#ff6f1a); box-shadow:0 3px 9px rgb(255 111 26 / 22%); content:''; }
.page-heading p { margin:0 0 3px; color:var(--orange); font-size:10px; font-weight:800; letter-spacing:.13em; text-transform:uppercase; }
.page-heading h1 { margin:0; font-size:clamp(1.28rem,1.8vw,1.6rem); font-weight:600; letter-spacing:-.02em; line-height:1.2; }
.page-heading div > span { display:block; margin-top:5px; color:#6d8192; font-size:.8rem; }
.new-branch { display:flex; min-height:40px; align-items:center; gap:8px; padding:0 22px; border:0; border-radius:8px; background:var(--orange); box-shadow:0 5px 12px rgba(255,121,31,.2); color:#fff; font-size:.75rem; font-weight:700; letter-spacing:.04em; text-transform:uppercase; cursor:pointer; transition:transform .18s ease,box-shadow .18s ease; }
.new-branch:hover { transform:translateY(-2px); box-shadow:0 9px 19px rgba(255,121,31,.3); }
.new-branch span { font-size:1.25rem; font-weight:400; line-height:1; }
.summary-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:12px; }
.summary-grid article { display:flex; align-items:center; min-height:64px; padding:11px 16px; border:1px solid #d2e2ea; border-left:3px solid #1683b8; border-radius:10px; background:rgba(255,255,255,.88); }
.summary-grid article > span { display:flex; min-width:0; flex-direction:column; }
.summary-grid small { color:#738798; font-size:.7rem; }
.summary-grid strong { overflow:hidden; margin-top:1px; font-size:1.05rem; text-overflow:ellipsis; white-space:nowrap; }
.toolbar { display:flex; align-items:flex-end; gap:10px; padding:9px 11px; margin-bottom:12px; border-left:4px solid var(--orange); border-radius:11px; background:linear-gradient(110deg,#dcecf5,#eef6fa); }
.search-field { display:flex; align-items:center; min-height:37px; padding:0 14px; flex:1; border:1px solid #b9d1df; border-radius:8px; background:#fff; color:#668196; }
.search-field input { width:100%; border:0; outline:0; color:#173d59; font:inherit; font-size:11px; }
.region-filter { display:flex; align-items:center; gap:7px; min-height:37px; padding:0 10px; border:1px solid #b9d1df; border-radius:8px; background:#fff; }
.region-filter span { color:#738899; font-size:9px; font-weight:800; text-transform:uppercase; }
.region-filter select { min-width:130px; border:0; outline:0; background:transparent; color:#173d59; font-size:11px; font-weight:700; }
.results { padding:0 4px 9px; color:#617a8e; font-size:10px; white-space:nowrap; }
.branch-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; perspective:1200px; }
.branch-card { position:relative; display:flex; min-height:270px; overflow:hidden; padding:18px; flex-direction:column; border:0; border-radius:17px; background:linear-gradient(145deg,rgba(255,255,255,.97),rgba(228,242,248,.96)); box-shadow:0 10px 25px rgba(7,95,153,.12),0 0 18px rgba(74,157,195,.08); animation:branch-card-in .48s ease both; transition:transform .2s ease,box-shadow .2s ease,filter .2s ease; }
.branch-card:nth-child(2) { animation-delay:70ms; }
.branch-card:nth-child(3) { animation-delay:140ms; }
.branch-card:nth-child(4) { animation-delay:210ms; }
.branch-card:hover { transform:translateY(-5px) scale(1.008); box-shadow:0 17px 34px rgba(7,95,153,.2),0 0 22px rgba(255,121,31,.1); filter:saturate(1.08); }
.branch-card__top,.budget-block > div:first-child,.budget-values { display:flex; align-items:center; justify-content:space-between; gap:10px; }
.branch-initials { display:grid; width:42px; height:42px; border:1px solid #ffd5bc; border-radius:10px; place-items:center; background:#fff0e7; color:#075487; font-size:14px; font-weight:900; letter-spacing:.03em; transition:transform .2s ease,background .2s ease; }
.branch-card:hover .branch-initials { transform:translateY(-2px) rotate(-2deg); background:#ffe8da; }
.status { display:flex; align-items:center; gap:5px; padding:4px 8px; border-radius:99px; background:#e7f6ef; color:#25805f; font-size:9px; font-weight:800; }
.status i { width:6px; height:6px; border-radius:50%; background:#2aa776; animation:status-pulse 2s ease-in-out infinite; }
.branch-card__title { margin:17px 0 14px; }
.branch-card__title h2 { margin:0; font-size:1rem; font-weight:700; }
.branch-card__title p { margin:8px 0 0; color:#758a9a; font-size:.76rem; }
.branch-meta { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:15px; }
.branch-meta > span { display:flex; min-width:0; min-height:60px; padding:9px 10px; flex-direction:column; justify-content:center; border:1px solid rgba(167,203,219,.65); border-radius:10px; background:linear-gradient(145deg,rgba(236,247,251,.92),rgba(225,241,248,.82)); }
.branch-meta small { color:#7d909f; font-size:.7rem; }
.branch-meta strong { overflow:hidden; margin-top:2px; font-size:.8rem; text-overflow:ellipsis; white-space:nowrap; }
.budget-block { padding:11px 0 10px; }
.budget-block > div:first-child { font-size:9px; }
.budget-block > div:first-child span { color:#6f8495; }
.budget-block > div:first-child strong { color:#176e9e; font-size:10px; }
.budget-progress { overflow:hidden; height:7px; margin:6px 0 4px; border-radius:99px; background:#e5eef3; }
.budget-progress i { display:block; height:100%; border-radius:inherit; background:linear-gradient(90deg,#1497bf,#0870a8); }
.budget-values { color:#7b8f9e; font-size:8px; }
.details-button { position:relative; width:100%; min-height:39px; overflow:hidden; margin-top:auto; border:1px solid #064f80; border-radius:8px; background:linear-gradient(135deg,#086da7,#075487); color:#fff; font-size:.74rem; font-weight:700; letter-spacing:.01em; cursor:pointer; transition:transform .15s ease,box-shadow .15s ease,background .15s ease; }
.details-button:hover { transform:translateY(-1px); background:linear-gradient(135deg,#ff8a2b,#f26a18); border-color:#e96317; box-shadow:0 7px 15px rgba(242,106,24,.25); color:#fff; }
.details-button::after { position:absolute; top:-50%; left:-35%; width:25%; height:200%; background:rgb(255 255 255 / 28%); content:''; transform:rotate(20deg) translateX(-220%); transition:transform .45s ease; }
.details-button:hover::after { transform:rotate(20deg) translateX(620%); }
.loading-state,.empty-state { display:flex; min-height:250px; align-items:center; justify-content:center; flex-direction:column; gap:8px; color:#718697; }
.empty-state strong { color:#264b65; }
.branch-dialog { overflow:hidden; border-radius:16px; background:#fff; color:#123c56; font-family:Arial,Helvetica,sans-serif; box-shadow:0 24px 70px rgba(10,48,73,.24); }
.branch-dialog > header { display:flex; align-items:flex-start; justify-content:space-between; gap:20px; padding:22px 24px 18px; border-top:5px solid #075f99; border-bottom:1px solid #dce8ee; }
.branch-dialog > header span { color:#e56816; font-size:.7rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; }
.branch-dialog > header h2 { margin:4px 0 2px; font-size:1.35rem; }
.branch-dialog > header p { margin:0; color:#6c8292; font-size:.8rem; }
.branch-dialog > header button { padding:7px 10px; border:0; border-radius:6px; background:#edf4f7; color:#526d80; font-size:.7rem; font-weight:700; cursor:pointer; }
.dialog-status { display:flex; align-items:center; justify-content:space-between; gap:14px; padding:12px 24px; background:#f4f9fb; }
.dialog-status > span { display:flex; align-items:center; gap:7px; color:#207558; font-size:.8rem; font-weight:700; }
.dialog-status i { width:7px; height:7px; border-radius:50%; background:#2aa776; }
.dialog-status small { color:#728797; font-size:.7rem; }
.dialog-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:1px; margin:20px 24px; border:1px solid #dce7ed; border-radius:10px; background:#dce7ed; overflow:hidden; }
.dialog-grid > div { display:flex; min-height:70px; padding:14px 16px; flex-direction:column; justify-content:center; background:#fff; }
.dialog-grid span,.dialog-budget span { color:#758a9a; font-size:.7rem; }
.dialog-grid strong { margin-top:4px; font-size:.9rem; }
.dialog-budget { margin:0 24px 22px; padding:17px; border-radius:11px; background:#edf6fa; }
.dialog-budget__heading,.dialog-budget__footer { display:flex; align-items:flex-end; justify-content:space-between; gap:18px; }
.dialog-budget__heading > div { display:flex; flex-direction:column; }
.dialog-budget__heading > div:last-child { text-align:right; }
.dialog-budget__heading strong { margin-top:3px; font-size:1.1rem; }
.dialog-budget__progress { overflow:hidden; height:9px; margin:14px 0 7px; border-radius:99px; background:#d5e5ed; }
.dialog-budget__progress i { display:block; height:100%; border-radius:inherit; background:#0b83b8; }
.dialog-budget__footer { font-size:.72rem; }
.dialog-budget__footer strong { color:#075f99; }
.branch-dialog > footer { display:flex; justify-content:flex-end; padding:14px 24px; border-top:1px solid #dce8ee; }
.branch-dialog > footer button { min-height:37px; padding:0 18px; border:0; border-radius:7px; background:#075f99; color:#fff; font-size:.75rem; font-weight:700; cursor:pointer; }
@keyframes branch-card-in {
  from { opacity:0; transform:translateY(18px) scale(.985); }
  to { opacity:1; transform:translateY(0) scale(1); }
}
@keyframes status-pulse {
  0%,100% { box-shadow:0 0 0 0 rgb(42 167 118 / 0%); }
  50% { box-shadow:0 0 0 4px rgb(42 167 118 / 16%); }
}
@media (prefers-reduced-motion:reduce) {
  .branch-card,.status i { animation:none; }
  .branch-card,.new-branch,.branch-initials,.details-button { transition:none; }
}
@media (max-width:1100px) { .summary-grid { grid-template-columns:repeat(2,1fr); } .branch-grid { grid-template-columns:repeat(2,1fr); } }
@media (max-width:700px) {
  .page-heading { align-items:flex-start; flex-direction:column; }
  .summary-grid,.branch-grid { grid-template-columns:1fr; }
  .toolbar { align-items:stretch; flex-direction:column; }
  .results { padding:0 2px; }
  .dialog-grid { grid-template-columns:1fr; }
}
</style>
