mod importance;

use importance::{calculate_importance, ImportanceError};
use js_sys::Array;
use serde_wasm_bindgen::from_value;
use wasm_bindgen::prelude::*;

/// Calculates the fANOVA importance of each hyperparameter.
///
/// `features` is an array of parameters, each an array holding that parameter's
/// internal value for every trial; `targets` holds one objective value per
/// trial. Throws a JavaScript `Error` describing the offending index when the
/// input is malformed.
#[wasm_bindgen]
pub fn wasm_fanova_calculate(features: Array, targets: Array) -> Result<Vec<f64>, JsError> {
    let features_vec = features
        .iter()
        .enumerate()
        .map(|(feature, x)| {
            from_value::<Vec<f64>>(x)
                .map_err(|_| ImportanceError::FeatureNotNumberArray { feature })
        })
        .collect::<Result<Vec<_>, _>>()?;
    let targets_vec = targets
        .iter()
        .enumerate()
        .map(|(trial, x)| x.as_f64().ok_or(ImportanceError::TargetNotNumber { trial }))
        .collect::<Result<Vec<_>, _>>()?;

    Ok(calculate_importance(&features_vec, &targets_vec)?)
}
