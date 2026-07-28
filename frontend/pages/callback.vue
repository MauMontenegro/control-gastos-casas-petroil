<script setup lang="ts">
import { useAuth0 } from '@auth0/auth0-vue'

const { isLoading, isAuthenticated, error } = useAuth0()

watch(
  [isLoading, isAuthenticated],
  ([loading, authenticated]) => {
    if (!loading && authenticated) {
      const target = (history.state?.target as string) || '/'
      navigateTo(target, { replace: true })
    }
  },
  { immediate: true },
)
</script>

<template>
  <v-container class="d-flex flex-column align-center justify-center" style="min-height: 100vh">
    <v-progress-circular v-if="!error" indeterminate color="primary" size="48" />
    <v-alert v-else type="error" class="mt-4" :text="error.message" />
  </v-container>
</template>
