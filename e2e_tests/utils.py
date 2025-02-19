from playwright.sync_api import Page


def count_components(page: Page, component_name: str):
    component_count = page.evaluate(
        f"""() => {{
        const components = document.querySelectorAll('.{component_name}');
        return components.length;
    }}"""
    )
    return component_count
