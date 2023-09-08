#%%

import numpy as np
import matplotlib.pyplot as plt
import scipy.special as sp
def phi(x):
    return np.exp(-x**2 / 2) / np.sqrt(2 * np.pi)
def Phi(x):
    return (1 - 0.5 * sp.erfc(x / np.sqrt(2)))

# A = np.array([[2., 1.], [1., 1.]])

# H = np.array([[1., -1.], [1., 0.]])
A = np.array([[1., 0.999], [0.999, 1.]])
H = np.array([[1., -1.], ])
lb = np.array([0.])
# lb = np.array([0., 0.])


S = A.copy()
mu = np.array([0.0, 0.0])


scale=2

# def truncnorm_mean_var(mean0: float, var0: float, lower_bound: float) -> tuple[float, float, float]:
#     s = np.sqrt(var0)
#     alpha = (lower_bound - mean0) / s
#     z = 1 - Phi(alpha)
#     print(f"{lower_bound=} {mean0=} {var0=}")
#     print(f"{alpha=}")
#     r = phi(alpha) / z
#     mean1 = mean0 + r * s
#     var1 = var0 * (1 + r * (alpha - r))
#     return (mean1, var1, z)    

def truncnorm_mean_var_z(alpha: float) -> tuple[float, float, float]:
    z = 0.5 * sp.erfc(alpha / np.sqrt(2))
    mean = 1 / (np.sqrt(0.5 * np.pi) * sp.erfcx(alpha / np.sqrt(2)))
    var = 1 - mean * (mean - alpha)
    return (mean, var, z)

u = np.linspace(0, 2 * np.pi, 100)
z = np.array([np.cos(u), np.sin(u)]).T
xy = scale*(np.linalg.cholesky(S+ 1e-6 * np.eye(2)) @ z.T).T + mu
plt.plot(xy[:, 0], xy[:, 1], "--")

virtual_obs_a = np.zeros(len(H))
virtual_obs_b = np.zeros(len(H))
zs = np.zeros(len(H))

# 1/2 ax^2 + bx + const. = 1/2 (x-mu)^2 / S
# a = 1/S, b = -mu / S
# S = 1/a, mu = -b / a

def conv(b: float, a: float) -> tuple[float, float]:
    return (-b/a, 1/a)

for iter in range(5):
    for i in range(len(H)):
        h = H[i]
        
        obs_var = 0.01

        mean1 = h @ mu
        Sxy = S @ h.T
        var1 = h @ Sxy

        # b1, a1 = conv(mu_y, Syy) # can be inf
        # b0, a0 = b1 - virtual_obs_b[i], a1 - virtual_obs_a[i]

        # sigma0 = 1/(1/Syy - virtual_obs_a[i]) = Syy / (1 - Syy * virtual_obs_a[i])
        # mu0 = (mu_y / Syy + virtual_obs_b[i]) * sigma0 = (mu_y + Syy * virtual_obs_b[i]) / (1 - Syy * virtual_obs_a[i])

        var0 = var1 / (1 - var1 * virtual_obs_a[i])
        mean0 = (mean1 + var1 * virtual_obs_b[i]) / (1 - var1 * virtual_obs_a[i])
        sigma0 = np.sqrt(var0 + obs_var)
        alpha = (lb[i] - mean0) / max(1e-20, sigma0)
        print(var0)
        mean_norm, var_norm, z_obs = truncnorm_mean_var_z(alpha)

        kalman_factor = var0 / max(1e-20, var0 + obs_var) 
        mean2 = mean0 + sigma0 * mean_norm * kalman_factor
        var2 = kalman_factor * (obs_var + var_norm * var0)

        
        db = (mean1 * var2 - mean2 * var1) / max(1e-20, var1 * var2)
        da = (var1 - var2) / max(1e-20, var1 * var2)

        virtual_obs_b[i] += db
        virtual_obs_a[i] += da


        # -db / da = mu1
        # 1 / da = S1
        # 1 / (S0 + S1) = da / (S0 * da + 1)
        # (mu1 - mu0) = (-db / da - mu0)
        # (mu1 - mu0) / (S0 + S1) = da * (-db / da - mu0) / (S0 * da + 1) = (-db - mu0 * da) / (S0 * da + 1)
        
        mu = mu - Sxy * (db + mean1 * da) / (1 + var1 * da)
        S = S - (Sxy[:, None] * (da / (1 + var1 * da))) @ Sxy[None, :] 
        zs[i] = z_obs

        # # alpha = (lb[i] - mean0) / var0

        # # print(b0, a0)
        # # mu2, sigma2, z2 = truncnorm_mean_var(*conv(b0, a0), lb[i])
        # # mean2, var2, z2 = truncnorm_mean_var(mean0, var0 + obs_var, lb[i])


        # var2 * 


        # zs[i] = z2
        # # b2, a2 = conv(mu2, sigma2)
        # # print(b2, a2)
        # # virtual_obs_b[i], virtual_obs_a[i] = b2 - b0, a2 - a0

        # # a2 - a0 = 1/var2 - 1/var0 = (var0 - var2) / (var0 * var2)
        # # b2 - b0 = -mean2 / var2 + mean0 / var0 = (mean0 * var2 - mean2 * var0) / (var0 * var2)
        
        # db, da = b2 - b1, a2 - a1
        # Sxy = S @ h.T


        # # mu = mu + Sxy * (S0 + S1)^-1 * (mu1 - mu0)
        # # S = S - Sxy @ (S0 + S1)^-1 @ Syx
        # # 
        # # # L += log(1/sqrt(2π(S0 + S1))) - 1/2 * (mu1 - mu0) * (S0 + S1)^-1 * (mu1 - mu0)
        # # L -= 

        # mu = mu + Sxy * (-a1 * db + b1 * da) / (a1 + da)
        # S = S - (Sxy[:, None] * (da * a1 / (a1 + da))) @ Sxy[None, :] 


        u = np.linspace(0, 2 * np.pi, 100)
        z = np.array([np.cos(u), np.sin(u)]).T
        xy = scale*(np.linalg.cholesky(S + 1e-6 * np.eye(2)) @ z.T).T + mu
        plt.plot(xy[:, 0], xy[:, 1], "--")
        print(mu, S)

samples = np.random.multivariate_normal(np.zeros(len(A)), A, size=10000)
samples = samples[np.all(H @ samples.T >= lb[:, None], axis=0)]
plt.plot(samples[:, 0], samples[:, 1], ".", alpha=0.1)
print(np.prod(zs))

# u = np.linspace(0, 2 * np.pi, 100)
# z = np.array([np.cos(u), np.sin(u)]).T
# xy = (np.linalg.cholesky(S) @ z.T).T + mu
# plt.plot(xy[:, 0], xy[:, 1], "--")

# %%


import numpy as np
import matplotlib.pyplot as plt
import scipy.special as sp

# A = np.array([[2, 1], [1, 1]])

# H = np.array([[1, -1], [-1, 2]])

# lb = np.array([0, 0])


# def truncnorm_mean_var(mean0: float, var0: float, lower_bound: float) -> tuple[float, float]:
#     s = np.sqrt(var0)
#     alpha = (lower_bound - mean0) / s
#     # r = phi(alpha) / Phic(alpha)
#     r = 1 / (np.sqrt(0.5 * np.pi) * sp.erfcx(x / np.sqrt(2)))
#     mean1 = mean0 + r * s
#     var1 = var0 * (1 + r * (alpha - r))
#     # k = 1/s / (1 + alpha/s - 1/s^2) = s / (s^2 + s * alpha - 1)
#     # a = k * s / var0 = k * s * a0
#     # b = -mean1 / var1 = -mean0 / var1 - r * sqrt(var0) / var1
#     # = -mean0 / var0 * k * s - k / sqrt(var0) 
#     # = b0 * k * s - k * sqrt(a0)
#     return (mean1, var1)    

def EP(mu0: np.ndarray, cov0: np.ndarray, H: np.ndarray, lb: np.ndarray, obs_var: float, cycles: int = 3):
    mu = mu0.copy()
    cov = cov0.copy()
        
    def truncnorm_mean_var_logz(alpha: float) -> tuple[float, float, float]:
        logz = sp.log_ndtr(alpha)
        mean = 1 / (np.sqrt(0.5 * np.pi) * sp.erfcx(alpha / np.sqrt(2)))
        var = 1 - mean * (mean - alpha)
        return (mean, var, logz)
    
    virtual_obs_a = np.zeros(len(H))
    virtual_obs_b = np.zeros(len(H))
    log_zs = np.zeros(len(H))

    for _ in range(cycles):
        for i in range(len(H)):
            h = H[i]

            mean1 = h @ mu
            Sxy = cov @ h.T
            var1 = h @ Sxy
            var0 = var1 / (1 - var1 * virtual_obs_a[i])
            mean0 = (mean1 + var1 * virtual_obs_b[i]) / (1 - var1 * virtual_obs_a[i])
            sigma0 = np.sqrt(var0 + obs_var)
            alpha = (lb[i] - mean0) / max(1e-20, sigma0)
            mean_norm, var_norm, logz = truncnorm_mean_var_logz(alpha)

            kalman_factor = var0 / max(1e-20, var0 + obs_var) 
            mean2 = mean0 + sigma0 * mean_norm * kalman_factor
            var2 = kalman_factor * (obs_var + var_norm * var0)

            db = (mean1 * var2 - mean2 * var1) / max(1e-20, var1 * var2)
            da = (var1 - var2) / max(1e-20, var1 * var2)
            virtual_obs_b[i] += db
            virtual_obs_a[i] += da

            mu -= Sxy * (db + mean1 * da) / (1 + var1 * da)
            cov -= (Sxy[:, None] * (da / (1 + var1 * da))) @ Sxy[None, :] 
            log_zs[i] = logz
    return (mu, cov, np.sum(log_zs))

mu = np.array([0.0, 0.0])
cov = np.array([[2., 1.], [1., 1.]])
H = np.array([[1., -1.], ])
lb = np.array([1.])
obs_var = 0.01
print(EP(mu, cov, H, lb, obs_var, 5))


#%%
b0, a0, lb = np.random.rand(3)

def truncnorm_b_a(b0: float, a0: float, lower_bound: float) -> tuple[float, float]:
    sqrt_a0 = np.sqrt(a0)
    alpha = (lower_bound + b0 / a0) * sqrt_a0

    s = np.sqrt(0.5 * np.pi) * sp.erfcx(alpha / np.sqrt(2))
    k = s / (s ** 2 + s * alpha - 1)
    return ((b0 * s - sqrt_a0) * k, k * s * a0)

print(truncnorm_b_a(b0, a0, lb), conv(*truncnorm_mean_var(*conv(b0, a0), lb)))
# %%
import torch
import math
from torch import Tensor
def EP(cov0: Tensor, preferences: Tensor, noise_var: Tensor, cycles: int = 3) -> tuple[Tensor, Tensor, Tensor]:
    N = cov0.shape[0]
    M = preferences.shape[0]
    mu = torch.zeros(N, dtype=cov0.dtype)
    cov = cov0.clone()
        
    def truncnorm_mean_var_logz(alpha: Tensor) -> tuple[Tensor, Tensor, Tensor]:
        SQRT_HALF = math.sqrt(0.5)
        SQRT_HALF_PI = math.sqrt(0.5 * math.pi)
        logz = torch.special.log_ndtr(alpha)
        mean = 1 / (SQRT_HALF_PI * torch.special.erfcx(alpha * SQRT_HALF))
        var = 1 - mean * (mean - alpha)
        return (mean, var, logz)
    
    virtual_obs_a = torch.zeros(M, dtype=cov0.dtype)
    virtual_obs_b = torch.zeros(M, dtype=cov0.dtype)
    log_zs = torch.zeros(M, dtype=cov0.dtype)

    for _ in range(cycles):
        for i in range(M):
            pref_i = preferences[i, :]
            mean1 = mu[pref_i[0]] - mu[pref_i[1]]
            Sxy = cov[pref_i[0]] - cov[pref_i[1]]
            var1 = Sxy[pref_i[0]] - Sxy[pref_i[1]]

            r0 = 1 / (1 - var1 * virtual_obs_a[i])
            var0 = var1 * r0
            mean0 = (mean1 + var1 * virtual_obs_b[i]) * r0

            obs_var = var0 + noise_var
            obs_sigma = torch.sqrt(obs_var)
            alpha = -mean0 / torch.clamp(obs_sigma, min=1e-20)
            mean_norm, var_norm, logz = truncnorm_mean_var_logz(alpha)

            kalman_factor = var0 / torch.clamp(obs_var, min=1e-20) 
            mean2 = mean0 + obs_sigma * mean_norm * kalman_factor
            var2 = kalman_factor * (noise_var + var_norm * var0)

            var1_var2_inv = 1 / torch.clamp(var1 * var2, min=1e-20)
            db = (mean1 * var2 - mean2 * var1) * var1_var2_inv
            da = (var1 - var2) * var1_var2_inv
            virtual_obs_b[i] += db
            virtual_obs_a[i] += da

            dr = 1 / (1 + var1 * da)
            mu -= Sxy * ((db + mean1 * da) * dr)
            cov -= (Sxy[:, None] * (da * dr)) @ Sxy[None, :] 
            log_zs[i] = logz
    return (mu, cov, torch.sum(log_zs))

mu = torch.tensor([0.0, 0.0], dtype=torch.float64)
cov = torch.tensor([[3., 1.], [1., 2.]], dtype=torch.float64)
preferences = torch.tensor([[0, 1]], dtype=torch.int32)
lb = torch.tensor([0.], dtype=torch.float64)
noise_var = 0.01
print(EP(cov, preferences, noise_var, 5))

# %%
