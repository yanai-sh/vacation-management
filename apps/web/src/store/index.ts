import { createStore } from 'vuex'
import { authModule, type AuthState } from './auth'
import { vacationsModule, type VacationsState } from './vacations'

export interface RootState {
  auth: AuthState
  vacations: VacationsState
}

const store = createStore<RootState>({
  modules: {
    auth: authModule,
    vacations: vacationsModule,
  },
})

export default store
