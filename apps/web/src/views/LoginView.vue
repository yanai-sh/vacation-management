<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { useToast } from '@nuxt/ui/composables/useToast'
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { getErrorMessage } from '@/api/client'
import type { RootState } from '@/store'
import type { User } from '@/types'
import { validateLoginForm, type LoginFormState } from '@/utils/formValidation'

const store = useStore<RootState>()
const router = useRouter()
const route = useRoute()
const toast = useToast()

const state = reactive<LoginFormState>({
  email: 'alice@example.com',
  password: 'Password123!',
})
const showPassword = ref(false)
const serverError = ref('')
const loading = ref(false)

async function onSubmit(event: FormSubmitEvent<LoginFormState>) {
  serverError.value = ''
  loading.value = true
  try {
    const user = (await store.dispatch('auth/login', {
      email: event.data.email!.trim(),
      password: event.data.password!,
    })) as User

    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    if (redirect.startsWith('/') && !redirect.startsWith('//')) {
      await router.push(redirect)
    } else {
      await router.push({ name: 'home' })
    }
    toast.add({
      title: 'Signed in',
      description: `Welcome back, ${user.name}.`,
      color: 'success',
      icon: 'i-lucide-check',
    })
  } catch (err) {
    serverError.value = getErrorMessage(err, 'Login failed')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="relative flex min-h-screen items-center justify-center bg-muted px-4 py-10">
    <div class="absolute end-4 top-4">
      <UColorModeButton />
    </div>
    <UCard
      class="w-full max-w-md"
      :ui="{
        root: 'bg-elevated ring ring-default divide-y divide-default',
        body: 'space-y-6',
      }"
    >
      <template #header>
        <h1 class="text-2xl font-semibold tracking-tight text-highlighted">Vacation Management</h1>
      </template>

      <UForm
        :state="state"
        :validate="validateLoginForm"
        :disabled="loading"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Email" name="email">
          <UInput
            v-model="state.email"
            type="email"
            color="neutral"
            variant="outline"
            class="w-full"
            autocomplete="username"
          />
        </UFormField>
        <UFormField label="Password" name="password">
          <UInput
            v-model="state.password"
            color="neutral"
            variant="outline"
            class="w-full"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="current-password"
            :ui="{ trailing: 'pe-1' }"
          >
            <template #trailing>
              <UButton
                color="neutral"
                variant="link"
                size="sm"
                :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                @click="showPassword = !showPassword"
              />
            </template>
          </UInput>
        </UFormField>
        <UAlert v-if="serverError" color="error" variant="subtle" :title="serverError" />
        <UButton
          type="submit"
          block
          color="primary"
          :label="loading ? 'Signing in…' : 'Sign in'"
          :loading="loading"
        />
      </UForm>
    </UCard>
  </div>
</template>
