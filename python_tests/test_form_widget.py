from __future__ import annotations

from typing import Any
from typing import cast
from typing import Dict
from unittest import TestCase

from optuna_dashboard import ChoiceWidget
from optuna_dashboard import dict_to_form_widget
from optuna_dashboard import ObjectiveUserAttrRef
from optuna_dashboard import SliderWidget
from optuna_dashboard import TextInputWidget
from optuna_dashboard._form_widget import ObjectiveFormWidget


class FormWidgetsTestCase(TestCase):
    def test_widget_to_dict_from_dict(self) -> None:
        widgets: list[ObjectiveFormWidget] = [
            ChoiceWidget(choices=["Good", "Bad"], values=[1, -1]),
            ChoiceWidget(
                choices=["Good", "Bad"],
                values=[1, -1],
                description="description",
                user_attr_key="key",
            ),
            SliderWidget(min=1, max=5),
            SliderWidget(
                min=1,
                max=5,
                step=1,
                labels=[(1, "Bad"), (5, "Good")],
                description="description",
                user_attr_key="key",
            ),
            TextInputWidget(),
            TextInputWidget(description="description", user_attr_key="key"),
            ObjectiveUserAttrRef(key="key"),
        ]

        for i, widget in enumerate(widgets):
            with self.subTest(f"{widget.__class__}-{i}"):
                d = cast(Dict[str, Any], widget.to_dict())
                restored = dict_to_form_widget(d)
                self.assertEqual(widget, restored)
