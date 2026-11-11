<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { reactive, watch } from 'vue'
import { validateRejectForm, type RejectFormState } from '@/utils/formValidation'

defineProps<{
  loading?: boolean
  description?: string
  error?: string
}>()

const open = defineModel<boolean>('open', { required: true })

const emit = defineEmits<{
  confirm: [comment: string]
}>()

const state = reactive<RejectFormState>({
  comment: '',
})

watch(open, (isOpen) => {
  if (isOpen) state.comment = ''
})

function onSubmit(event: FormSubmitEvent<RejectFormState>) {
  emit('confirm', event.data.comment!.trim())
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Reject this request?"
    :description="description"
    :dismissible="!loading"
    :ui="{ footer: 'justify-end gap-2' }"
  >
    <template #body>
      <UForm
        id="reject-request-form"
        :state="state"
        :validate="validateRejectForm"
        :disabled="loading"
        class="space-y-3"
        @submit="onSubmit"
      >
        <UAlert v-if="error" color="error" variant="subtle" :title="error" />
        <UFormField label="Comment" name="comment" required>
          <UTextarea
            v-model="state.comment"
            color="neutral"
            variant="outline"
            :rows="4"
            class="w-full"
            placeholder="Explain why this request is rejected"
            autofocus
          />
        </UFormField>
      </UForm>
    </template>
    <template #footer>
      <UButton
        label="Cancel"
        color="neutral"
        variant="outline"
        :disabled="loading"
        @click="open = false"
      />
      <UButton
        type="submit"
        form="reject-request-form"
        label="Reject"
        color="error"
        :loading="loading"
      />
    </template>
  </UModal>
</template>
