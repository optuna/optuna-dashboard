import {
  APIClientProvider,
  App as AppOptunaDashboard,
  AxiosClient,
} from "@optuna/optuna-dashboard"

const axiosAPIClient = new AxiosClient()

function App() {
  return (
    <APIClientProvider apiClient={axiosAPIClient}>
      <AppOptunaDashboard />
    </APIClientProvider>
  )
}

export default App
