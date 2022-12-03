import React, { FC } from "react"
import { styled } from "@mui/system"
import { useRecoilState } from "recoil"
import { reloadIntervalState } from "../state"
import { MenuItem, TextField, alpha } from "@mui/material"
import { Cached } from "@mui/icons-material"

export const ReloadIntervalSelect: FC = () => {
  const [reloadInterval, updateReloadInterval] =
    useRecoilState<number>(reloadIntervalState)

  const Wrapper = styled("div")(({ theme }) => ({
    position: "relative",
    borderRadius: theme.shape.borderRadius,
    backgroundColor: alpha(theme.palette.common.white, 0.15),
    "&:hover": {
      backgroundColor: alpha(theme.palette.common.white, 0.25),
    },
    marginLeft: 0,
    width: "100%",
    [theme.breakpoints.up("sm")]: {
      marginLeft: theme.spacing(1),
      width: "auto",
    },
  }))

  const IconWrapper = styled("div")(({ theme }) => ({
    padding: theme.spacing(0, 2),
    height: "100%",
    position: "absolute",
    pointerEvents: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }))

  const Select = styled(TextField)(({ theme }) => ({
    color: "inherit",
    width: "14ch",
    "& .MuiInput-underline:after": {
      borderColor: "rgb(256,256,256,.1)",
    },
    "& .MuiOutlinedInput-root": {
      color: "inherit",
      "& fieldset": {
        borderColor: "rgb(256,256,256,.1)",
      },
      "& .MuiSelect-icon": {
        color: "white",
      },
      "&:hover fieldset": {
        borderColor: "rgb(256,256,256,.1)",
      },
      "&.Mui-focused fieldset": {
        borderColor: "rgb(256,256,256,.1)",
      },
    },
    "& .MuiInputBase-input": {
      // vertical padding + font size from searchIcon
      paddingLeft: `calc(1em + ${theme.spacing(4)})`,
      width: "100%",
    },
  }))

  return (
    <Wrapper>
      <IconWrapper>
        <Cached />
      </IconWrapper>
      <Select
        select
        value={reloadInterval}
        onChange={(e) => {
          updateReloadInterval(e.target.value as unknown as number)
        }}
      >
        <MenuItem value={-1}>stop</MenuItem>
        <MenuItem value={5}>5s</MenuItem>
        <MenuItem value={10}>10s</MenuItem>
        <MenuItem value={30}>30s</MenuItem>
        <MenuItem value={60}>60s</MenuItem>
      </Select>
    </Wrapper>
  )
}
