import { atom } from "recoil"

export const studiesState = atom<Study[]>({
  key: "studies",
  default: [],
})
