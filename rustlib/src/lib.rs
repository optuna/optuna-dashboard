use js_sys::Array;
use serde_wasm_bindgen::from_value;
use fanova::{FanovaOptions, RandomForestOptions};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn wasm_fanova_calculate(features: Array, targets: Array) -> Vec<f64> {
    // TODO(c-bata): Fix error handling
    let features_vec: Vec<Vec<f64>> = features
        .iter()
        .map(|x| from_value::<Vec<f64>>(x).unwrap())
        .collect();
    let targets_vec: Vec<f64> = targets.iter().map(|x| x.as_f64().unwrap()).collect();

    let mut fanova = FanovaOptions::new()
        .random_forest(RandomForestOptions::new().seed(0))
        .fit(
            features_vec.iter().map(|x| x.as_slice()).collect(),
            &targets_vec,
        )
        .unwrap();
    let importances = (0..features_vec.len())
        .map(|i| fanova.quantify_importance(&[i]).mean)
        .collect::<Vec<_>>();
    return importances;
}
