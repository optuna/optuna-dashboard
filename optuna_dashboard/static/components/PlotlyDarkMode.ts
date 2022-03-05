import * as plotly from "plotly.js-dist"

export const plotlyDarkTemplate: Partial<plotly.Template> = {
    layout: {
        "font": {"color": "#f2f5fa"},
        "xaxis": {
            "gridcolor": "#283442",
            "linecolor": "#506784",
            "zerolinecolor": "#283442",
        },
        "yaxis": {
            "gridcolor": "#283442",
            "linecolor": "#506784",
            "zerolinecolor": "#283442",
        },
        "ternary": {
            "aaxis": {"ticks": "", "gridcolor": "#506784", "linecolor": "#506784"},
            "baxis": {"ticks": "", "gridcolor": "#506784", "linecolor": "#506784"},
            "caxis": {"ticks": "", "gridcolor": "#506784", "linecolor": "#506784"},
            "bgcolor": "rgb(17,17,17)"
        },
        "colorway": ["#636efa", "#EF553B", "#00cc96", "#ab63fa", "#19d3f3", "#e763fa", "#fecb52", "#ffa15a", "#ff6692", "#b6e880"],
        "plot_bgcolor": "#222222",
        "paper_bgcolor": "#222222",
    },
}
