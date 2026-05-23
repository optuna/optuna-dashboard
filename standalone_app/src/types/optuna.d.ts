declare module "optuna" {
  export function wasm_fanova_calculate(
    features: number[][],
    targets: number[]
  ): number[]

  export default function init(module_or_path?: unknown): Promise<unknown>
}
