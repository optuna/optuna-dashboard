import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
// import { App } from '@optuna/optuna-dashboard'
import { Ex } from '@optuna/optuna-dashboard'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* <App /> */}
    <Ex />
  </React.StrictMode>,
)
