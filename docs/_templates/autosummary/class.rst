{% extends "!autosummary/class.rst" %}

{#
Ref: https://github.com/optuna/optuna/blob/41045cef7a8f5d0e5e4026bf0c5c649b269fc312/docs/source/_templates/autosummary/class.rst
An autosummary template to exclude the class constructor (__init__)
which doesn't contain any docstring in Optuna Dashboard.
#}

{% block methods %}
   {% set methods = methods | select("ne", "__init__") | list %}
   {% if methods %}
   .. rubric:: Methods

   .. autosummary::
   {% for item in methods %}
      ~{{ name }}.{{ item }}
   {%- endfor %}
   {% endif %}

{% endblock %}
