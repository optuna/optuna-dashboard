import os

from setuptools import Extension
from setuptools import setup
from setuptools.command.build_ext import build_ext


try:
    from Cython.Build import cythonize

    ext = ".pyx"
except ImportError:
    cythonize = None
    ext = ".c"


class LazyImportBuildExtCmd(build_ext):
    def run(self):
        import numpy

        self.include_dirs.append(numpy.get_include())
        super().run()


ext_modules = [
    Extension(
        "optuna_dashboard._fast_fanova.tree",
        sources=[os.path.join("optuna_dashboard", "_fast_fanova", "tree" + ext)],
        language="c",
    )
]

if cythonize is not None:
    ext_modules = cythonize(ext_modules)


if __name__ == "__main__":
    setup(
        ext_modules=ext_modules,
        cmdclass={"build_ext": LazyImportBuildExtCmd},
    )
