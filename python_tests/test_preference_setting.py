from __future__ import annotations

from unittest import TestCase

import optuna
from optuna_dashboard._preference_setting import _SYSTEM_ATTR_FEEDBACK_COMPONENT
from optuna_dashboard._preference_setting import register_preference_feedback_component_type
from optuna_dashboard.preferential._study import PreferentialStudy


class FeedbackSettingTestCase(TestCase):
    def test_widget_to_dict_from_dict(self) -> None:
        study = PreferentialStudy(optuna.create_study())
        register_preference_feedback_component_type(study, "artifact", "image_key")
        system_attrs = study._study.system_attrs
        feedback_type = system_attrs.get(_SYSTEM_ATTR_FEEDBACK_COMPONENT, {})
        assert "type" in feedback_type
        assert feedback_type["type"] == "artifact"
        assert "artifact_key" in feedback_type
        assert feedback_type["artifact_key"] == "image_key"
