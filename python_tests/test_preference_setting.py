from __future__ import annotations
from unittest import TestCase

import optuna

from optuna_dashboard._preference_setting import (
    register_output_component,
    _SYSTEM_ATTR_FEEDBACK_ARTIFACT_KEY,
    _SYSTEM_ATTR_FEEDBACK_COMPONENT_TYPE,
)
from optuna_dashboard.preferential._study import PreferentialStudy


class FeedbackSettingTestCase(TestCase):
    def test_widget_to_dict_from_dict(self) -> None:
        study = PreferentialStudy(optuna.create_study())
        register_output_component(study, "Artifact", "image_key")
        system_attrs = study._study.system_attrs
        assert system_attrs.get(_SYSTEM_ATTR_FEEDBACK_COMPONENT_TYPE, "") == "Artifact"
        assert system_attrs.get(_SYSTEM_ATTR_FEEDBACK_ARTIFACT_KEY, "") == "image_key"
