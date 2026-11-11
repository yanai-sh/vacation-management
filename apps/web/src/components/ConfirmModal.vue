<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    description: string
    confirmLabel?: string
    confirmColor?: 'error' | 'success' | 'primary' | 'neutral'
    loading?: boolean
    error?: string
  }>(),
  {
    confirmColor: 'error',
    error: '',
  },
)

const open = defineModel<boolean>('open', { required: true })

const emit = defineEmits<{
  confirm: []
}>()
</script>

<template>
  <UModal
    v-model:open="open"
    :title="title"
    :description="description"
    :dismissible="!loading"
    :ui="{ footer: 'justify-end gap-2' }"
  >
    <template v-if="error" #body>
      <UAlert color="error" variant="subtle" :title="error" />
    </template>
    <template #footer>
      <UButton
        label="Keep request"
        color="neutral"
        variant="outline"
        :disabled="loading"
        @click="open = false"
      />
      <UButton
        :label="confirmLabel ?? 'Confirm'"
        :color="confirmColor"
        :loading="loading"
        @click="emit('confirm')"
      />
    </template>
  </UModal>
</template>
