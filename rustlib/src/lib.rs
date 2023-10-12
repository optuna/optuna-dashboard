use fanova::{FanovaOptions, RandomForestOptions};
use js_sys::Array;
use serde_wasm_bindgen::from_value;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn wasm_fanova_calculate(features: Array, targets: Array) -> Result<Vec<f64>, JsError> {
    let features_vec: Vec<Vec<f64>> = features
        .iter()
        .map(|x| from_value::<Vec<f64>>(x))
        .collect::<Result<_, _>>()
        .map_err(|_| JsError::new("features must be of type number[][]"))?;
    let targets_vec: Vec<f64> = targets
        .iter()
        .map(|x| x.as_f64())
        .collect::<Option<_>>()
        .ok_or(JsError::new("targets must be of type number[]"))?;

    let mut fanova = FanovaOptions::new()
        .random_forest(RandomForestOptions::new().seed(0))
        .fit(
            features_vec.iter().map(|x| x.as_slice()).collect(),
            &targets_vec,
        )
        .map_err(|e| JsError::new(&format!("failed to build fANOVA model: {}", e)))?;
    let importances = (0..features_vec.len())
        .map(|i| fanova.quantify_importance(&[i]).mean)
        .collect::<Vec<_>>();

    Ok(importances)
}
