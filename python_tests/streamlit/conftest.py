collect_ignore_glob = []

try:
    import streamlit  # noqa: F401
except ImportError:
    collect_ignore_glob.append("*.py")
