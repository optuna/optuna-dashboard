# cython: language_level=3
import itertools

import numpy as np

cimport cython
cimport numpy as cnp
from sklearn.tree._tree cimport Tree


cnp.import_array()


cdef extern from "math.h" nogil:
    bint isnan(double x)


cdef class FanovaTree:
    cdef:
        Tree _tree
        double[:] _tree_node_threshold
        long long[:] _tree_node_features
        long long[:] _tree_node_right_children
        long long[:] _tree_node_left_children
        double [:,:] _statistics, _search_spaces
        cnp.npy_bool[:,:] _subtree_active_features
        double _variance
        object _split_midpoints
        object _split_sizes

    def __cinit__(self, Tree tree, cnp.ndarray search_spaces):
        assert search_spaces.shape[0] == tree.n_features
        assert search_spaces.shape[1] == 2

        self._tree = tree
        tree_node_ndarray = tree._get_node_ndarray()
        self._tree_node_threshold = tree_node_ndarray['threshold']
        self._tree_node_features = tree_node_ndarray['feature']
        self._tree_node_right_children = tree_node_ndarray['right_child']
        self._tree_node_left_children = tree_node_ndarray['left_child']

        self._search_spaces = search_spaces
        self._statistics = self._precompute_statistics()

        split_midpoints, split_sizes = self._precompute_split_midpoints_and_sizes()
        subtree_active_features = self._precompute_subtree_active_features()
        self._split_midpoints = split_midpoints
        self._split_sizes = split_sizes
        self._subtree_active_features = subtree_active_features
        self._variance = -1.0  # Computed lazily and requires `self._statistics`.

    @property
    def variance(self) -> float:
        if self._variance == -1.0:
            leaf_node_indices = np.where(self._tree.feature < 0)[0]
            statistics = np.asarray(self._statistics, order='C')[leaf_node_indices]
            values = statistics[:, 0]
            weights = statistics[:, 1]
            average_values = np.average(values, weights=weights)
            variance = np.average((values - average_values) ** 2, weights=weights)

            self._variance = variance

        return self._variance

    def get_marginal_variance(self, features: np.ndarray) -> float:
        assert features.size > 0

        # For each midpoint along the given dimensions, traverse this tree to compute the
        # marginal predictions.
        midpoints = [self._split_midpoints[f] for f in features]
        sizes = [self._split_sizes[f] for f in features]

        product_midpoints = itertools.product(*midpoints)
        product_sizes = itertools.product(*sizes)

        sample = np.full(self._n_features(), fill_value=np.nan, dtype=np.float64)

        values = []
        weights = []

        for midpoints, sizes in zip(product_midpoints, product_sizes):
            sample[features] = np.array(midpoints)

            value, weight = self._get_marginalized_statistics(sample)
            weight *= float(np.prod(sizes))

            values = np.append(values, value)
            weights = np.append(weights, weight)

        weights = np.asarray(weights)
        values = np.asarray(values)
        average_values = np.average(values, weights=weights)
        variance = np.average((values - average_values) ** 2, weights=weights)

        assert variance >= 0.0
        return variance

    @cython.boundscheck(False)
    cdef inline bint _is_subtree_active(self, int node_index, cnp.npy_bool[:] active_features) nogil:
        cdef:
            int i
            cnp.npy_bool[:] subtree_active_feature = self._subtree_active_features[node_index]
        for i in range(active_features.shape[0]):
            if active_features[i] and subtree_active_feature[i]:
                return True
        return False

    cdef (double, double) _get_marginalized_statistics(self, double[:] feature_vector):
        cdef:
            cnp.ndarray next_subspace
            int[:] active_nodes
            double[:,:] buf
            double[:,:,:] active_search_spaces
            cnp.ndarray[cnp.npy_bool, cast=True, ndim=1] marginalized_features, active_features

            int i, node_index, next_node_index, feature, active_nodes_index
            double response

            double sum_weighted_value = 0, sum_weight = 0, tmp_weight, weighted_average

        assert feature_vector.size == self._n_features()

        # Start from the root and traverse towards the leafs.
        active_nodes_index = 0
        active_nodes = np.empty(shape=self._tree.node_count, dtype=np.int32)
        active_search_spaces = np.empty(shape=(self._tree.node_count, self._search_spaces.shape[0], 2), dtype=np.float64)

        active_nodes[active_nodes_index] = 0
        active_search_spaces[active_nodes_index, ...] = self._search_spaces

        active_features = np.zeros_like(np.asarray(feature_vector), dtype=np.bool_)

        for i in range(feature_vector.shape[0]):
            if isnan(feature_vector[i]):
                active_search_spaces[active_nodes_index, i, 0] = 0.0
                active_search_spaces[active_nodes_index, i, 1] = 1.0
            else:
                active_features[i] = True

        while active_nodes_index >= 0:
            node_index = active_nodes[active_nodes_index]
            search_spaces = active_search_spaces[active_nodes_index]
            active_nodes_index -= 1

            feature = self._get_node_split_feature(node_index)
            if feature >= 0:  # Not leaf. Avoid unnecessary call to `_is_node_leaf`.
                # If node splits on an active feature, push the child node that we end up in.
                response = feature_vector[feature]
                if not isnan(response):
                    active_nodes_index += 1
                    buf = active_search_spaces[active_nodes_index]
                    if response <= self._get_node_split_threshold(node_index):
                        next_node_index = self._get_node_left_child(node_index)
                        self._get_node_left_child_subspaces(
                            node_index, search_spaces, buf
                        )
                    else:
                        next_node_index = self._get_node_right_child(node_index)
                        self._get_node_right_child_subspaces(
                            node_index, search_spaces, buf
                        )
                    active_nodes[active_nodes_index] = next_node_index
                    continue

                # If subtree starting from node splits on an active feature, push both child nodes.
                if self._is_subtree_active(node_index, active_features) == 1:
                    active_nodes_index += 1
                    active_nodes[active_nodes_index] = self._get_node_left_child(node_index)
                    active_search_spaces[active_nodes_index] = search_spaces

                    active_nodes_index += 1
                    active_nodes[active_nodes_index] = self._get_node_right_child(node_index)
                    active_search_spaces[active_nodes_index] = search_spaces
                    continue

            # avg = sum(a * weights) / sum(weights)
            tmp_weight = self._statistics[node_index, 1] / _get_cardinality(search_spaces)
            sum_weighted_value += self._statistics[node_index, 0] * tmp_weight
            sum_weight += tmp_weight

        weighted_average = sum_weighted_value / sum_weight
        return weighted_average, sum_weight

    def _precompute_statistics(self) -> np.ndarray:
        cdef double[:,:] child_subspace

        n_nodes = self._tree.node_count

        # Holds for each node, its weighted average value and the sum of weights.
        statistics = np.empty((n_nodes, 2), dtype=np.float64)

        subspaces = np.array([None for _ in range(n_nodes)])
        subspaces[0] = np.asarray(self._search_spaces, dtype=np.float64)

        # Compute marginals for leaf nodes.
        for node_index in range(n_nodes):
            subspace = subspaces[node_index]

            if self._is_node_leaf(node_index):
                value = self._get_node_value(node_index)
                weight = _get_cardinality(subspace)
                statistics[node_index] = [value, weight]
            else:
                child_node_index = self._get_node_left_child(node_index)
                child_subspace = np.copy(subspace)
                self._get_node_left_child_subspaces(node_index, subspace, child_subspace)
                assert subspaces[child_node_index] is None
                subspaces[child_node_index] = child_subspace

                child_node_index = self._get_node_right_child(node_index)
                child_subspace = np.copy(subspace)
                self._get_node_right_child_subspaces(node_index, subspace, child_subspace)
                assert subspaces[child_node_index] is None
                subspaces[child_node_index] = child_subspace

        # Compute marginals for internal nodes.
        for node_index in reversed(range(n_nodes)):
            if not self._is_node_leaf(node_index):
                child_values = []
                child_weights = []

                child_node_index = self._get_node_left_child(node_index)
                child_values.append(statistics[child_node_index, 0])
                child_weights.append(statistics[child_node_index, 1])

                child_node_index = self._get_node_right_child(node_index)
                child_values.append(statistics[child_node_index, 0])
                child_weights.append(statistics[child_node_index, 1])

                value = np.average(child_values, weights=child_weights)
                weight = float(np.sum(child_weights))
                statistics[node_index] = [value, weight]
        return statistics

    def _precompute_split_midpoints_and_sizes(self):
        midpoints = []
        sizes = []

        search_spaces = self._search_spaces
        for feature, feature_split_values in enumerate(self._compute_features_split_values()):
            feature_split_values = np.concatenate(
                (
                    np.atleast_1d(search_spaces[feature, 0]),
                    feature_split_values,
                    np.atleast_1d(search_spaces[feature, 1]),
                )
            )
            midpoint = 0.5 * (feature_split_values[1:] + feature_split_values[:-1])
            size = feature_split_values[1:] - feature_split_values[:-1]

            midpoints.append(midpoint)
            sizes.append(size)

        return midpoints, sizes

    def _compute_features_split_values(self):
        all_split_values = [set() for _ in range(self._n_features())]

        cdef int node_index, feature

        for node_index in range(self._tree.node_count):
            feature = self._get_node_split_feature(node_index)
            if feature >= 0:  # Not leaf. Avoid unnecessary call to `_is_node_leaf`.
                threshold = self._get_node_split_threshold(node_index)
                all_split_values[feature].add(threshold)

        sorted_all_split_values = []

        for split_values in all_split_values:
            split_values_array = np.array(list(split_values), dtype=np.float64)
            split_values_array.sort()
            sorted_all_split_values.append(split_values_array)

        return sorted_all_split_values

    cdef cnp.npy_bool[:,:] _precompute_subtree_active_features(self):
        cdef:
            int node_index, child_node_index
            cnp.ndarray subtree_active_features = np.full((self._tree.node_count, self._n_features()), fill_value=False)

        for node_index in reversed(range(self._tree.node_count)):
            feature = self._get_node_split_feature(node_index)
            if feature >= 0:  # Not leaf. Avoid unnecessary call to `_is_node_leaf`.
                subtree_active_features[node_index, feature] = True
                subtree_active_features[node_index] |= subtree_active_features[self._get_node_left_child(node_index)]
                subtree_active_features[node_index] |= subtree_active_features[self._get_node_right_child(node_index)]

        return subtree_active_features

    cdef inline int _n_features(self):
        return self._search_spaces.shape[0]

    @cython.boundscheck(False)
    cdef inline bint _is_node_leaf(self, int node_index) nogil:
        return self._tree_node_features[node_index] < 0

    @cython.boundscheck(False)
    cdef inline int _get_node_left_child(self, int node_index) nogil:
        return self._tree_node_left_children[node_index]

    @cython.boundscheck(False)
    cdef inline int _get_node_right_child(self, int node_index) nogil:
        return self._tree_node_right_children[node_index]

    cdef inline double _get_node_value(self, int node_index):
        return self._tree.value[node_index]

    @cython.boundscheck(False)
    cdef inline double _get_node_split_threshold(self, int node_index) nogil:
        return self._tree_node_threshold[node_index]

    @cython.boundscheck(False)
    cdef inline int _get_node_split_feature(self, int node_index) nogil:
        return self._tree_node_features[node_index]

    cdef inline void _get_node_left_child_subspaces(
        self, int node_index, double[:,:] search_spaces, double[:,:] buf
    ) nogil:
        _get_subspaces(
            search_spaces,
            1,
            self._get_node_split_feature(node_index),
            self._get_node_split_threshold(node_index),
            buf,
        )

    cdef inline void _get_node_right_child_subspaces(
        self, int node_index, double[:,:] search_spaces, double[:,:] buf
    ) nogil:
        _get_subspaces(
            search_spaces,
            0,
            self._get_node_split_feature(node_index),
            self._get_node_split_threshold(node_index),
            buf,
        )


@cython.boundscheck(False)
cdef inline double _get_cardinality(double[:,:] search_spaces) nogil:
    cdef double result = 1
    for i in range(search_spaces.shape[0]):
        result *= search_spaces[i, 1] - search_spaces[i, 0]
    return result


@cython.boundscheck(False)
cdef inline void _get_subspaces(
    double[:,:] search_spaces, int search_spaces_column, int feature, double threshold, double[:,:] buf
) nogil:
    buf[...] = search_spaces
    buf[feature, search_spaces_column] = threshold
