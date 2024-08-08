import React from "react"

type ConstantsContextType = {
  environment: "jupyterlab" | "optuna-dashboard"
  url_prefix: string
}

export const ConstantsContext = React.createContext<ConstantsContextType>({
  environment: "optuna-dashboard",
  url_prefix: "",
})

export const useConstants = (): ConstantsContextType => {
  return React.useContext(ConstantsContext)
}
