import { createStore } from 'vuex'
import { authModule, type AuthState } from './auth'

export interface RootState {
  auth: AuthState
}

const store = createStore<RootState>({
  modules: {
    auth: authModule,
  },
})

export default store
