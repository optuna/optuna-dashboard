import React from "react"

type ConstantsContextType = {
  color_mode: "light" | "dark" | undefined
  environment: "jupyterlab" | "optuna-dashboard"
  url_prefix: string
}

export const ConstantsContext = React.createContext<ConstantsContextType>({
  color_mode: undefined,
  environment: "optuna-dashboard",
  url_prefix: "",
})

export const useConstants = (): ConstantsContextType => {
  return React.useContext(ConstantsContext)
}
