<script setup lang="ts">
import { useAuth0 } from '@auth0/auth0-vue'
import { calendarDateKey, calendarEventOccursOn } from '~/utils/calendarEventDates'

const auth0 = useAuth0()
const user = computed(() => auth0?.user.value)
const { t } = useI18n()
const route = useRoute()
const payments = usePaymentsStore()
const calendarEvents = useCalendarEventsStore()
const pendingOpen = ref(true)
const pendingPaymentsCount = computed(
  () => payments.items.filter((payment) => payment.status !== 'pagado').length,
)
const today = useNow({ interval: 60_000 })
const todayKey = computed(() => calendarDateKey(today.value))
const todayReminders = computed(() =>
  calendarEvents.items.filter((event) => calendarEventOccursOn(event, today.value)),
)
const pendingCount = computed(() => pendingPaymentsCount.value + todayReminders.value.length)

const navItems = [
  { key: 'solicitudes', to: '/solicitudes', icon: 'mdi-file-document-outline' },
  { key: 'pagos', to: '/pagos', icon: 'mdi-clipboard-text-outline' },
  { key: 'calendario', to: '/calendario', icon: 'mdi-calendar-month-outline' },
  { key: 'limpieza', to: '/limpieza', icon: 'mdi-broom' },
  { key: 'reportes', to: '/', icon: 'mdi-chart-bar' },
  { key: 'sucursales', to: '/sucursales', icon: 'mdi-home-city-outline' },
  { key: 'configuracionRpa', to: '/configuracion-rpa', icon: 'mdi-robot-outline' },
]

onMounted(() => {
  if (!payments.items.length) payments.fetchPayments()
  if (!calendarEvents.items.length) calendarEvents.fetchEvents()
})

function handleLogout() {
  if (auth0) {
    auth0.logout({ logoutParams: { returnTo: window.location.origin } })
  }
}
</script>

<template>
  <v-app>
    <v-app-bar class="top-navigation" flat height="126">
      <div class="top-navigation__inner">
        <div class="top-header">
          <NuxtLink to="/" class="top-brand" aria-label="Agenda de Gastos">
            <span class="top-brand__mark">P</span>
            <span class="top-brand__copy">
              <strong>Agenda de Gastos</strong>
              <small>Petroil</small>
            </span>
          </NuxtLink>

          <button
            type="button"
            class="pending-trigger"
            :class="{ 'pending-trigger--active': pendingOpen }"
            aria-label="Mostrar u ocultar pendientes de hoy"
            :aria-expanded="pendingOpen"
            @click="pendingOpen = !pendingOpen"
          >
            Pendientes de hoy
            <span>{{ pendingCount }}</span>
          </button>

          <div class="top-user">
            <span class="top-user__name">{{ user?.name ?? 'Usuario' }}</span>
            <v-avatar size="32" class="top-user__avatar">
              <span>{{ user?.name?.charAt(0) ?? 'U' }}</span>
            </v-avatar>
            <button type="button" aria-label="Cerrar sesión" title="Cerrar sesión" @click="handleLogout">
              <v-icon icon="mdi-logout" size="19" />
            </button>
          </div>
        </div>

        <div v-if="pendingOpen" class="pending-popover">
          <div class="pending-popover__heading">
            <span>Pendientes de hoy</span>
            <strong>
              {{ pendingPaymentsCount }} pagos y {{ todayReminders.length }} recordatorios
            </strong>
          </div>
          <button
            type="button"
            class="pending-popover__close"
            aria-label="Cerrar panel de pendientes"
            @click="pendingOpen = false"
          >
            ×
          </button>
          <div v-if="todayReminders.length" class="pending-reminders">
            <NuxtLink
              v-for="event in todayReminders"
              :key="event.id"
              :to="{ path: '/calendario', query: { fecha: todayKey, recordatorio: event.id } }"
              @click="pendingOpen = false"
            >
              <v-icon icon="mdi-bell-ring-outline" size="17" />
              <span>
                <strong>{{ event.tipoPago }} · {{ event.casaNombre }}</strong>
                <small>{{ event.nota || 'Recordatorio programado para hoy' }}</small>
              </span>
              <v-icon icon="mdi-chevron-right" size="17" />
            </NuxtLink>
          </div>
          <div class="pending-popover__actions">
            <NuxtLink to="/pagos" @click="pendingOpen = false">Revisar pagos</NuxtLink>
            <NuxtLink
              v-if="todayReminders.length"
              :to="{ path: '/calendario', query: { fecha: todayKey } }"
              @click="pendingOpen = false"
            >
              Ver calendario
            </NuxtLink>
          </div>
        </div>

        <nav class="top-tabs" aria-label="Navegación principal">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="top-tab"
            :class="{
              'top-tab--active':
                item.to === '/' ? route.path === '/' : route.path.startsWith(item.to),
            }"
          >
            <v-icon :icon="item.icon" size="19" />
            <span>{{ t(`nav.${item.key}`) }}</span>
          </NuxtLink>
        </nav>
      </div>
    </v-app-bar>

    <v-main class="bg-background">
      <v-container fluid class="pa-6">
        <div class="page-frame">
          <slot />
        </div>
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
.bg-background {
  background: #eaf5fa !important;
}

.top-navigation {
  right: 0 !important;
  left: 0 !important;
  width: 100% !important;
  border-bottom: 0 !important;
  background: #064f7d !important;
  color: #fff !important;
  font-family: Arial, Helvetica, sans-serif;
  box-shadow: 0 8px 24px rgb(8 60 78 / 22%) !important;
  overflow: visible !important;
}

.top-navigation::after {
  position: absolute;
  z-index: 10;
  right: 0;
  bottom: 0;
  left: 30px;
  height: 4px;
  border-radius: 99px 0 0 99px;
  background: linear-gradient(
    90deg,
    #ff791f 0%,
    #f5c126 38%,
    #65a66b 70%,
    #137a92 100%
  );
  content: '';
  pointer-events: none;
}

.top-navigation :deep(.v-toolbar__content) {
  width: 100%;
  overflow: visible;
}

.top-navigation__inner {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  padding: 0 20px;
}

.top-header {
  display: flex;
  min-height: 71px;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.top-brand {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 10px;
  color: #fff;
  text-decoration: none;
}

.top-brand__mark {
  display: grid;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  place-items: center;
  background: linear-gradient(135deg, #168fd5, #0b6fa5);
  box-shadow: 0 4px 12px rgb(0 40 67 / 22%);
  font-size: 1.1rem;
  font-weight: 800;
}

.top-brand__copy {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.top-brand__copy strong {
  font-size: 0.94rem;
}

.top-brand__copy small {
  margin-top: 3px;
  color: rgb(255 255 255 / 66%);
  font-size: 0.68rem;
}

.pending-summary {
  display: grid;
  width: min(31vw, 340px);
  min-height: 38px;
  margin-left: auto;
  grid-template-columns: minmax(115px, 1fr) 27px auto 24px;
  align-items: center;
  gap: 9px;
  padding: 4px 11px 4px 13px;
  border: 1px solid rgb(173 207 225 / 30%);
  border-left: 3px solid #f27a1a;
  border-radius: 9px;
  background: rgb(2 43 73 / 34%);
  color: #fff;
  font-family: 'Segoe UI', Arial, sans-serif;
  text-decoration: none;
  transition: background 0.16s ease, transform 0.16s ease;
}

.pending-summary:hover {
  transform: translateY(-1px);
  background: rgb(2 44 76 / 62%);
}

.pending-summary__copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.pending-summary__copy strong {
  overflow: hidden;
  color: rgb(255 255 255 / 90%);
  font-size: 0.7rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pending-summary__count {
  display: grid;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  place-items: center;
  background: #f27a1a;
  color: #fff;
  font-size: 0.68rem;
  font-weight: 700;
}

.pending-summary__action {
  padding-left: 10px;
  border-left: 1px solid rgb(255 255 255 / 14%);
  color: rgb(255 255 255 / 74%);
  font-size: 0.64rem;
  font-weight: 500;
  text-decoration: none;
  white-space: nowrap;
}

.pending-summary__close {
  display: grid;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  place-items: center;
  background: rgb(255 255 255 / 8%);
  color: rgb(255 255 255 / 65%);
  font: 400 1rem/1 'Segoe UI', Arial, sans-serif;
  cursor: pointer;
}

.pending-summary__close:hover {
  background: rgb(255 255 255 / 14%);
  color: #fff;
}

.pending-trigger {
  display: flex;
  min-height: 36px;
  margin-left: auto;
  align-items: center;
  gap: 9px;
  padding: 0 12px;
  border: 1px solid rgb(242 122 26 / 60%);
  border-radius: 8px;
  background: rgb(2 43 73 / 34%);
  color: rgb(255 255 255 / 88%);
  font: 500 0.68rem 'Segoe UI', Arial, sans-serif;
  cursor: pointer;
}

.pending-trigger span {
  display: grid;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  place-items: center;
  background: #f27a1a;
  color: #fff;
  font-weight: 700;
}

.pending-trigger--active {
  border-color: #f27a1a;
  background: rgb(2 38 65 / 58%);
}

.pending-popover {
  position: absolute;
  z-index: 100;
  top: 61px;
  right: 58px;
  display: flex;
  width: min(390px, calc(100vw - 32px));
  max-height: min(520px, calc(100vh - 150px));
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  padding: 13px 14px;
  border: 1px solid #cbdde7;
  border-top: 4px solid #f27a1a;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 14px 35px rgb(15 60 84 / 22%);
  color: #173d59;
  font-family: 'Segoe UI', Arial, sans-serif;
}

.pending-popover::before {
  position: absolute;
  top: -7px;
  right: 76px;
  width: 12px;
  height: 12px;
  border-top: 1px solid #cbdde7;
  border-left: 1px solid #cbdde7;
  background: #fff;
  content: '';
  transform: rotate(45deg);
}

.pending-popover__heading {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding-right: 30px;
}

.pending-popover__heading span {
  color: #6e8494;
  font-size: 0.64rem;
}

.pending-popover__heading strong {
  margin-top: 2px;
  font-size: 0.72rem;
  font-weight: 600;
}

.pending-popover__close {
  position: absolute;
  top: 10px;
  right: 10px;
  display: grid;
  width: 23px;
  height: 23px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  place-items: center;
  background: #edf3f6;
  color: #637b8c;
  font-size: 0.9rem;
  cursor: pointer;
}

.pending-reminders {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pending-reminders > a {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) 18px;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  border: 1px solid #e5d4c7;
  border-radius: 8px;
  background: #fff8f2;
  color: #173d59;
  text-decoration: none;
}

.pending-reminders > a:hover {
  border-color: #f27a1a;
  background: #fff2e8;
}

.pending-reminders > a > span {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.pending-reminders strong,
.pending-reminders small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pending-reminders strong {
  font-size: 0.7rem;
}

.pending-reminders small {
  margin-top: 2px;
  color: #6e8494;
  font-size: 0.62rem;
}

.pending-popover__actions {
  display: flex;
  justify-content: flex-end;
  gap: 7px;
  padding-top: 3px;
}

.pending-popover__actions > a {
  padding: 7px 9px;
  border-radius: 6px;
  background: #075b84;
  color: #fff;
  font-size: 0.65rem;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
}

.pending-popover__actions > a:last-child {
  background: #f27a1a;
}

.top-tabs {
  display: flex;
  min-width: 0;
  min-height: 55px;
  align-items: stretch;
  justify-content: flex-start;
  overflow-x: auto;
  margin: 0 -20px;
  padding: 4px 20px 0;
  border-top: 1px solid rgb(255 255 255 / 12%);
  background: #064f7d;
  scrollbar-width: none;
}

.top-tabs::-webkit-scrollbar {
  display: none;
}

.top-tab {
  position: relative;
  display: flex;
  min-width: max-content;
  align-items: center;
  gap: 8px;
  padding: 0 24px;
  margin: 2px 3px 0;
  border: 1px solid transparent;
  border-radius: 11px;
  color: rgb(255 255 255 / 78%);
  font-size: 0.78rem;
  font-weight: 700;
  text-decoration: none;
  transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.top-tab:hover {
  transform: translateY(-2px);
  background: rgb(255 255 255 / 11%);
  color: #fff;
}

.top-tab :deep(.v-icon) {
  width: 21px;
  height: 21px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: #b9d7e8;
  transition: color 0.18s ease, transform 0.18s ease;
}

.top-tab:hover :deep(.v-icon) {
  color: #fff;
  transform: translateY(-1px);
}

.top-tab--active {
  border-radius: 11px 11px 0 0;
  border-color: rgb(255 255 255 / 15%);
  border-bottom: 4px solid #ff791f;
  background: #21709a;
  box-shadow: 0 4px 10px rgb(0 37 62 / 22%);
  color: #fff;
}

.top-tab--active :deep(.v-icon) {
  color: #ff8a32;
}

.top-user {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 5px;
}

.top-user__name {
  max-width: 180px;
  overflow: hidden;
  color: rgb(255 255 255 / 82%);
  font-size: 0.7rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.top-user__avatar {
  border: 1px solid #eac14b;
  background: linear-gradient(135deg, #168bc0, #075481);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 800;
}

.top-user button {
  display: grid;
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 8px;
  place-items: center;
  background: transparent;
  color: rgb(255 255 255 / 76%);
  cursor: pointer;
}

.top-user button:hover {
  background: rgb(255 255 255 / 10%);
  color: #fff;
}

.page-frame {
  position: relative;
  min-height: 100%;
}

@media (max-width: 1050px) {
  .top-navigation__inner {
    padding: 0 12px;
  }

  .top-tab {
    padding: 0 18px;
  }

  .top-tabs {
    margin: 0 -12px;
    padding-right: 12px;
    padding-left: 12px;
  }

  .pending-summary {
    width: min(36vw, 280px);
    grid-template-columns: 1fr 28px 24px;
  }

  .pending-summary__action {
    display: none;
  }
}

@media (max-width: 700px) {
  .top-navigation__inner {
    padding: 0 8px;
  }

  .top-header {
    min-height: 69px;
  }

  .top-user__name {
    display: none;
  }

  .pending-summary {
    display: none;
  }

  .pending-trigger {
    display: none;
  }

  .pending-popover {
    display: none;
  }

  .top-tabs {
    margin: 0 -8px;
    padding-right: 8px;
    padding-left: 8px;
    justify-content: flex-start;
  }

  .top-tab {
    min-height: 53px;
    padding: 0 14px;
  }
}
</style>
