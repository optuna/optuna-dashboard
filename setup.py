import os

import numpy
from setuptools import setup, Extension

try:
    from Cython.Build import cythonize
    ext = ".pyx"
except ImportError:
    cythonize = None
    ext = ".c"

ext_modules = [
    Extension(
        "optuna_dashboard._fast_fanova.tree",
        sources=[os.path.join("optuna_dashboard", "_fast_fanova", "tree" + ext)],
        include_dirs=[numpy.get_include()],
        language='c'
    )
]

if cythonize is not None:
    ext_modules = cythonize(ext_modules)


if __name__ == "__main__":
    setup(
        ext_modules=ext_modules,
    )
