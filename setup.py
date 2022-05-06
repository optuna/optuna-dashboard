import os

from setuptools import setup, Extension
from setuptools.command.build_ext import build_ext


class LazyImportBuildExtCmd(build_ext):
    def run(self):
        import numpy
        self.include_dirs.append(numpy.get_include())

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
        language='c'
    )
]

if cythonize is not None:
    ext_modules = cythonize(ext_modules)


if __name__ == "__main__":
    setup(
        ext_modules=ext_modules,
    )
