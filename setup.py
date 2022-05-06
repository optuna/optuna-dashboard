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
    def run(self) -> None:
        import numpy

        self.include_dirs.append(numpy.get_include())
        super().run()

    def finalize_options(self) -> None:
        # cythoinze() must be lazily called since Cython's build requires scikit-learn.
        if cythonize is not None:
            self.distribution.ext_modules = cythonize(self.distribution.ext_modules)
        super().finalize_options()


ext_modules = [
    Extension(
        "optuna_dashboard._fast_fanova.tree",
        sources=[os.path.join("optuna_dashboard", "_fast_fanova", "tree" + ext)],
        language="c",
    )
]


if __name__ == "__main__":
    setup(
        ext_modules=ext_modules,
        setup_requires=["numpy", "scikit-learn"],
        cmdclass={"build_ext": LazyImportBuildExtCmd},
    )
