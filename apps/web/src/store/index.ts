import { createStore } from 'vuex'

export interface RootState {}

const store = createStore<RootState>({
  state() {
    return {}
  },
})

export default store
