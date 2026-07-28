<script setup lang="ts">
import type { CreateFundRequestPayload } from '~/types'

interface RequestFormValues {
  concept: string
  amount: number
  requiredDate: string
  branch: string
  expenseType: string
  costCenter: string
  provider: string
  comment?: string
}

const open = defineModel<boolean>({ default: false })

const store = useRequestsStore()
const branchesStore = useBranchesStore()
const { t } = useI18n()

const conceptOptions = [
  'Servicios recurrentes',
  'Limpieza semanal',
  'Mantenimiento',
  'Nómina',
  'Otro',
]
const expenseTypeOptions = ['Servicio recurrente', 'Gasto único', 'Mantenimiento', 'Nómina', 'Otro']
const providerOptions = [
  'CFE',
  'Telmex',
  'Agua y Saneamiento',
  'Servicios de Limpieza del Norte',
  'Otro',
]

const branchOptions = computed(() =>
  branchesStore.items.map((b) => {
    const name = b.name.replace('Sucursal ', '')
    return { title: name, value: name }
  }),
)
const costCenterOptions = computed(() =>
  branchesStore.items.map((b) => ({
    title: `${b.costCenter} · ${b.name.replace('Sucursal ', '')}`,
    value: b.costCenter,
  })),
)

const { handleSubmit, defineField, errors, resetForm, setFieldValue, values } =
  useForm<RequestFormValues>({
    initialValues: {
      expenseType: expenseTypeOptions[0],
    },
    validationSchema: {
      concept: (value: string) => !!value || t('requests.modal.errors.concept'),
      amount: (value: number) => (Number(value) > 0 ? true : t('requests.modal.errors.amount')),
      requiredDate: (value: string) => !!value || t('requests.modal.errors.requiredDate'),
      branch: (value: string) => !!value || t('requests.modal.errors.branch'),
      expenseType: (value: string) => !!value || t('requests.modal.errors.expenseType'),
      costCenter: (value: string) => !!value || t('requests.modal.errors.costCenter'),
      provider: (value: string) => !!value || t('requests.modal.errors.provider'),
    },
  })

const [concept, conceptAttrs] = defineField('concept')
const [amount, amountAttrs] = defineField('amount')
const [requiredDate, requiredDateAttrs] = defineField('requiredDate')
const [branch, branchAttrs] = defineField('branch')
const [expenseType, expenseTypeAttrs] = defineField('expenseType')
const [costCenter, costCenterAttrs] = defineField('costCenter')
const [provider, providerAttrs] = defineField('provider')
const [comment, commentAttrs] = defineField('comment')

const submitting = ref(false)

watch(open, (isOpen) => {
  if (isOpen && branchesStore.items.length === 0) {
    branchesStore.fetchBranches()
  }
})

watch(
  () => branchesStore.items,
  (items) => {
    if (items.length && !values.branch) {
      setFieldValue('branch', items[0].name.replace('Sucursal ', ''))
    }
  },
  { immediate: true },
)

const onSubmit = handleSubmit(async (submittedValues) => {
  submitting.value = true
  try {
    const payload: CreateFundRequestPayload = {
      concept: submittedValues.concept,
      amount: Number(submittedValues.amount),
      requiredDate: submittedValues.requiredDate,
      branch: submittedValues.branch,
      expenseType: submittedValues.expenseType,
      costCenter: submittedValues.costCenter,
      provider: submittedValues.provider,
      comment: submittedValues.comment || undefined,
    }
    await store.createRequest(payload)
    resetForm()
    open.value = false
  } finally {
    submitting.value = false
  }
})

function handleCancel() {
  resetForm()
  open.value = false
}
</script>

<template>
  <v-dialog v-model="open" max-width="720" scrollable>
    <v-card>
      <v-card-item class="pa-6 pb-4">
        <div class="d-flex justify-space-between align-start">
          <div>
            <p class="text-caption font-weight-bold text-primary text-uppercase mb-1">
              {{ t('requests.modal.eyebrow') }}
            </p>
            <h2 class="text-h5 font-weight-bold text-secondary">
              {{ t('requests.modal.title') }}
            </h2>
          </div>
          <v-btn icon="mdi-close" variant="text" density="comfortable" @click="handleCancel" />
        </div>
      </v-card-item>

      <v-divider />

      <v-card-text class="pa-6">
        <p class="text-body-2 text-medium-emphasis mb-6">{{ t('requests.modal.subtitle') }}</p>

        <form @submit.prevent="onSubmit">
          <div class="d-flex flex-column ga-4">
            <div>
              <p class="text-caption font-weight-bold text-uppercase mb-1">
                {{ t('requests.modal.fields.concept') }}
              </p>
              <v-combobox
                v-model="concept"
                v-bind="conceptAttrs"
                :items="conceptOptions"
                :placeholder="t('requests.modal.fields.conceptPlaceholder')"
                hide-details="auto"
                :error-messages="errors.concept ? [errors.concept] : []"
              />
            </div>

            <v-row dense>
              <v-col cols="12" sm="6">
                <p class="text-caption font-weight-bold text-uppercase mb-1">
                  {{ t('requests.modal.fields.amount') }}
                </p>
                <v-text-field
                  v-model="amount"
                  v-bind="amountAttrs"
                  type="number"
                  prefix="$"
                  placeholder="0.00"
                  hide-details="auto"
                  :error-messages="errors.amount ? [errors.amount] : []"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <p class="text-caption font-weight-bold text-uppercase mb-1">
                  {{ t('requests.modal.fields.requiredDate') }}
                </p>
                <v-text-field
                  v-model="requiredDate"
                  v-bind="requiredDateAttrs"
                  type="date"
                  hide-details="auto"
                  :error-messages="errors.requiredDate ? [errors.requiredDate] : []"
                />
              </v-col>
            </v-row>

            <v-row dense>
              <v-col cols="12" sm="6">
                <p class="text-caption font-weight-bold text-uppercase mb-1">
                  {{ t('requests.modal.fields.branch') }}
                </p>
                <v-select
                  v-model="branch"
                  v-bind="branchAttrs"
                  :items="branchOptions"
                  hide-details="auto"
                  :error-messages="errors.branch ? [errors.branch] : []"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <p class="text-caption font-weight-bold text-uppercase mb-1">
                  {{ t('requests.modal.fields.expenseType') }}
                </p>
                <v-select
                  v-model="expenseType"
                  v-bind="expenseTypeAttrs"
                  :items="expenseTypeOptions"
                  hide-details="auto"
                  :error-messages="errors.expenseType ? [errors.expenseType] : []"
                />
              </v-col>
            </v-row>

            <div>
              <p class="text-caption font-weight-bold text-uppercase mb-1">
                {{ t('requests.modal.fields.costCenter') }}
              </p>
              <v-select
                v-model="costCenter"
                v-bind="costCenterAttrs"
                :items="costCenterOptions"
                :placeholder="t('requests.modal.fields.costCenterPlaceholder')"
                hide-details="auto"
                :error-messages="errors.costCenter ? [errors.costCenter] : []"
              />
            </div>

            <div>
              <p class="text-caption font-weight-bold text-uppercase mb-1">
                {{ t('requests.modal.fields.provider') }}
              </p>
              <v-combobox
                v-model="provider"
                v-bind="providerAttrs"
                :items="providerOptions"
                :placeholder="t('requests.modal.fields.providerPlaceholder')"
                hide-details="auto"
                :error-messages="errors.provider ? [errors.provider] : []"
              />
            </div>

            <div>
              <p class="text-caption font-weight-bold text-uppercase mb-1">
                {{ t('requests.modal.fields.comment') }}
              </p>
              <v-textarea
                v-model="comment"
                v-bind="commentAttrs"
                rows="3"
                :placeholder="t('requests.modal.fields.commentPlaceholder')"
                hide-details="auto"
              />
            </div>
          </div>
        </form>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="outlined" color="secondary" @click="handleCancel">
          {{ t('requests.modal.cancel') }}
        </v-btn>
        <v-btn color="primary" :loading="submitting" @click="onSubmit">
          {{ t('requests.modal.submit') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
