use fanova::{FanovaOptions, RandomForestOptions};
use std::error::Error;
use std::fmt;

/// fANOVA needs at least two observations before the objective can have any
/// variance to attribute to the parameters.
const MIN_TRIALS: usize = 2;

/// Reason why hyperparameter importance could not be calculated.
///
/// Every variant carries the index it complains about, so the message that
/// reaches the browser says which parameter or trial is at fault.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ImportanceError {
    /// A feature column was not an array of numbers.
    FeatureNotNumberArray { feature: usize },

    /// A target value was not a number.
    TargetNotNumber { trial: usize },

    /// Feature columns disagree on how many trials there are.
    TrialCountMismatch {
        feature: usize,
        expected: usize,
        actual: usize,
    },

    /// The number of objective values does not match the number of trials.
    TargetCountMismatch { trials: usize, targets: usize },

    /// A parameter value was NaN or infinite.
    NonFiniteFeature { feature: usize, trial: usize },

    /// An objective value was NaN or infinite.
    NonFiniteTarget { trial: usize },

    /// The fANOVA model itself could not be built.
    Fit(String),
}

impl fmt::Display for ImportanceError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::FeatureNotNumberArray { feature } => write!(
                f,
                "features[{feature}] must be of type number[]; features must be of type number[][]"
            ),
            Self::TargetNotNumber { trial } => {
                write!(f, "targets[{trial}] must be a number")
            }
            Self::TrialCountMismatch {
                feature,
                expected,
                actual,
            } => write!(
                f,
                "features[{feature}] has {actual} values but features[0] has {expected}; \
                 every parameter must have one value per trial"
            ),
            Self::TargetCountMismatch { trials, targets } => write!(
                f,
                "got {targets} targets for {trials} trials; \
                 there must be one objective value per trial"
            ),
            Self::NonFiniteFeature { feature, trial } => write!(
                f,
                "features[{feature}][{trial}] is not a finite number"
            ),
            Self::NonFiniteTarget { trial } => {
                write!(f, "targets[{trial}] is not a finite number")
            }
            Self::Fit(reason) => write!(f, "failed to build fANOVA model: {reason}"),
        }
    }
}

impl Error for ImportanceError {}

/// Calculates the fANOVA importance of each parameter.
///
/// `features` is column-major: one entry per parameter, each holding that
/// parameter's value for every trial. `targets` holds one objective value per
/// trial. The returned vector always has one importance per parameter, in the
/// same order, so callers can zip it with their parameter list.
///
/// Malformed input is rejected with an [`ImportanceError`]. Well-formed but
/// degenerate input (no trials, no variance) yields zeros rather than an error:
/// there is simply nothing to attribute, and a study can legitimately look like
/// that early on.
pub fn calculate_importance(
    features: &[Vec<f64>],
    targets: &[f64],
) -> Result<Vec<f64>, ImportanceError> {
    if features.is_empty() {
        return Ok(Vec::new());
    }

    let trials = features[0].len();
    for (feature, column) in features.iter().enumerate() {
        if column.len() != trials {
            return Err(ImportanceError::TrialCountMismatch {
                feature,
                expected: trials,
                actual: column.len(),
            });
        }
        if let Some(trial) = column.iter().position(|v| !v.is_finite()) {
            return Err(ImportanceError::NonFiniteFeature { feature, trial });
        }
    }
    if targets.len() != trials {
        return Err(ImportanceError::TargetCountMismatch {
            trials,
            targets: targets.len(),
        });
    }
    if let Some(trial) = targets.iter().position(|v| !v.is_finite()) {
        return Err(ImportanceError::NonFiniteTarget { trial });
    }

    // fANOVA divides by the variance of the objective. With fewer than two
    // trials, or with every trial scoring the same, that variance is zero and
    // the division yields NaN, which then renders as a broken bar chart.
    // Nothing here is an error, so report "no parameter explains anything".
    if trials < MIN_TRIALS || is_constant(targets) {
        return Ok(vec![0.0; features.len()]);
    }

    // A parameter that took the same value in every trial spans a zero-width
    // range, and that width is one factor of the feature-space volume that
    // *every* importance is divided by. Leaving one in makes the whole result
    // NaN, so fit without them and report them as zero.
    let varying = (0..features.len())
        .filter(|&i| !is_constant(&features[i]))
        .collect::<Vec<_>>();
    if varying.is_empty() {
        return Ok(vec![0.0; features.len()]);
    }

    let columns = varying
        .iter()
        .map(|&i| features[i].as_slice())
        .collect::<Vec<_>>();
    let mut fanova = FanovaOptions::new()
        .random_forest(RandomForestOptions::new().seed(0))
        .fit(columns, targets)
        .map_err(|e| ImportanceError::Fit(e.to_string()))?;

    let mut importances = vec![0.0; features.len()];
    for (fitted, &original) in varying.iter().enumerate() {
        let mean = fanova.quantify_importance(&[fitted]).mean;
        // Last line of defence: the checks above cover the degenerate cases we
        // know of, but a stray NaN would poison the plot for every parameter,
        // and a zero bar is a far cheaper way to be wrong.
        importances[original] = if mean.is_finite() { mean } else { 0.0 };
    }
    Ok(importances)
}

fn is_constant(values: &[f64]) -> bool {
    match values.first() {
        None => true,
        Some(&first) => values.iter().all(|&v| v == first),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn features(columns: &[&[f64]]) -> Vec<Vec<f64>> {
        columns.iter().map(|c| c.to_vec()).collect()
    }

    #[test]
    fn ranks_the_influential_parameter_higher() {
        // The objective follows x0 and ignores x1.
        let x0 = vec![0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0];
        let x1 = vec![3.0, 1.0, 4.0, 1.0, 5.0, 9.0, 2.0, 6.0];
        let targets = x0.iter().map(|v| v * 10.0).collect::<Vec<_>>();

        let importances = calculate_importance(&features(&[&x0, &x1]), &targets).unwrap();

        assert_eq!(importances.len(), 2);
        assert!(importances.iter().all(|v| v.is_finite()));
        assert!(importances[0] > importances[1]);
    }

    #[test]
    fn no_parameters_gives_no_importances() {
        assert_eq!(calculate_importance(&[], &[1.0, 2.0]).unwrap(), Vec::new());
    }

    #[test]
    fn constant_objective_gives_zeros_not_nan() {
        let x0 = vec![0.0, 1.0, 2.0, 3.0];
        let targets = vec![7.0; 4];

        let importances = calculate_importance(&features(&[&x0]), &targets).unwrap();

        assert_eq!(importances, vec![0.0]);
    }

    #[test]
    fn single_trial_gives_zeros_not_nan() {
        let importances = calculate_importance(&features(&[&[1.0], &[2.0]]), &[3.0]).unwrap();

        assert_eq!(importances, vec![0.0, 0.0]);
    }

    #[test]
    fn constant_parameter_does_not_poison_the_others() {
        let constant = vec![0.5; 8];
        let varying = vec![0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0];
        let targets = varying.iter().map(|v| v * 10.0).collect::<Vec<_>>();

        let importances =
            calculate_importance(&features(&[&constant, &varying]), &targets).unwrap();

        assert!(importances.iter().all(|v| v.is_finite()));
        assert_eq!(importances[0], 0.0);
        assert!(importances[1] > 0.0);
    }

    #[test]
    fn every_parameter_constant_gives_zeros() {
        let importances =
            calculate_importance(&features(&[&[1.0; 4], &[2.0; 4]]), &[1.0, 2.0, 3.0, 4.0])
                .unwrap();

        assert_eq!(importances, vec![0.0, 0.0]);
    }

    #[test]
    fn rejects_ragged_features() {
        let err = calculate_importance(&features(&[&[1.0, 2.0], &[1.0]]), &[1.0, 2.0]).unwrap_err();

        assert_eq!(
            err,
            ImportanceError::TrialCountMismatch {
                feature: 1,
                expected: 2,
                actual: 1,
            }
        );
    }

    #[test]
    fn rejects_target_count_mismatch() {
        let err = calculate_importance(&features(&[&[1.0, 2.0]]), &[1.0]).unwrap_err();

        assert_eq!(
            err,
            ImportanceError::TargetCountMismatch {
                trials: 2,
                targets: 1,
            }
        );
    }

    #[test]
    fn rejects_non_finite_values() {
        let nan_feature =
            calculate_importance(&features(&[&[1.0, f64::NAN]]), &[1.0, 2.0]).unwrap_err();
        assert_eq!(
            nan_feature,
            ImportanceError::NonFiniteFeature {
                feature: 0,
                trial: 1,
            }
        );

        let infinite_target =
            calculate_importance(&features(&[&[1.0, 2.0]]), &[1.0, f64::INFINITY]).unwrap_err();
        assert_eq!(infinite_target, ImportanceError::NonFiniteTarget { trial: 1 });
    }

    #[test]
    fn error_messages_name_the_offending_index() {
        let message = ImportanceError::NonFiniteFeature {
            feature: 2,
            trial: 7,
        }
        .to_string();

        assert!(message.contains("features[2][7]"), "{message}");
    }
}
