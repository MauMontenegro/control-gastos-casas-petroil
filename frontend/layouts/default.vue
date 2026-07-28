<script setup lang="ts">
import { useAuth0 } from '@auth0/auth0-vue'

const { logout, user } = useAuth0()
const preferences = usePreferencesStore()
const { t } = useI18n()

const navItems = [
  { key: 'solicitudes', to: '/solicitudes', icon: 'mdi-file-document-outline' },
  { key: 'pagos', to: '/pagos', icon: 'mdi-calendar-check-outline' },
  { key: 'comprobaciones', to: '/comprobaciones', icon: 'mdi-file-check-outline' },
  { key: 'calendario', to: '/calendario', icon: 'mdi-calendar-month-outline' },
  { key: 'reportes', to: '/reportes', icon: 'mdi-chart-bar' },
  { key: 'sucursales', to: '/sucursales', icon: 'mdi-office-building-outline' },
]

const search = ref('')
const drawerOpen = ref(true)

function handleLogout() {
  logout({ logoutParams: { returnTo: window.location.origin } })
}
</script>

<template>
  <v-app>
    <v-navigation-drawer
      v-model="drawerOpen"
      :rail="preferences.sidebarCollapsed"
      expand-on-hover
      theme="dark"
      width="255"
      class="app-sidebar"
    >
      <NuxtLink
        to="/"
        class="app-sidebar__brand d-flex align-center ga-3 pa-5 text-decoration-none"
      >
        <v-avatar color="primary" size="42">
          <span class="font-weight-bold">P</span>
        </v-avatar>
        <div>
          <div class="text-subtitle-2 font-weight-bold text-white">Agenda de Gastos</div>
          <div class="text-caption text-white" style="opacity: 0.75">Petroil</div>
        </div>
      </NuxtLink>

      <v-list nav class="pa-3">
        <v-list-item
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          :prepend-icon="item.icon"
          :title="t(`nav.${item.key}`)"
          class="app-sidebar__nav-item mb-1"
          active-class="app-sidebar__nav-item--active"
          rounded="lg"
        />
      </v-list>

      <template #append>
        <div class="pa-4">
          <v-btn
            block
            variant="tonal"
            color="white"
            prepend-icon="mdi-logout"
            @click="handleLogout"
          >
            {{ t('common.logout') }}
          </v-btn>
        </div>
      </template>
    </v-navigation-drawer>

    <v-app-bar flat border>
      <v-app-bar-nav-icon class="d-lg-none" @click="preferences.toggleSidebar" />
      <v-text-field
        v-model="search"
        density="compact"
        variant="outlined"
        hide-details
        rounded="lg"
        prepend-inner-icon="mdi-magnify"
        placeholder="Buscar..."
        class="mx-4"
        style="max-width: 420px"
      />
      <v-spacer />
      <v-btn icon="mdi-bell-outline" variant="text" />
      <v-avatar v-if="user" size="34" color="brand-blue-light" class="mr-2">
        <span class="text-brand-blue-dark text-caption font-weight-bold">
          {{ user.name?.charAt(0) ?? 'U' }}
        </span>
      </v-avatar>
    </v-app-bar>

    <v-main class="bg-background">
      <v-container fluid class="pa-6">
        <slot />
      </v-container>
    </v-main>
  </v-app>
</template>
