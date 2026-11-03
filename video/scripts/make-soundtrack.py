"""Synthesise the 15 s soundtrack for the wrestling promo.

Everything is generated from scratch (no samples), so there are no rights issues.
Hits are placed on the same frame numbers the Remotion timeline uses (30 fps).

    python3 video/scripts/make-soundtrack.py video/public/soundtrack.wav
"""
import sys
import wave

import numpy as np

SR = 48000
FPS = 30
DUR = 15.0
N = int(SR * DUR)
rng = np.random.default_rng(7)


def t_of(frame):
    return frame / FPS


def one_pole_lp(x, cutoff):
    """Simple one-pole low-pass. cutoff may be a scalar or a per-sample array."""
    cutoff = np.broadcast_to(np.asarray(cutoff, dtype=float), x.shape)
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a[i]) * x[i] + a[i] * acc
        y[i] = acc
    return y


def add(buf, sig, start_s, gain=1.0, pan=0.0):
    s = int(start_s * SR)
    if s >= N:
        return
    e = min(N, s + len(sig))
    seg = sig[: e - s] * gain
    buf[0, s:e] += seg * (1 - max(0.0, pan))
    buf[1, s:e] += seg * (1 + min(0.0, pan))


def kick():
    t = np.arange(int(0.45 * SR)) / SR
    f = 45 + 110 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 7.5)
    click = rng.standard_normal(len(t)) * np.exp(-t * 400) * 0.25
    return np.tanh((body + click) * 1.8)


def hat(open_=False):
    n = int((0.18 if open_ else 0.05) * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    hp = noise - one_pole_lp(noise, 6000)
    return hp * np.exp(-t * (18 if open_ else 70))


def clap():
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    band = one_pole_lp(noise, 3500) - one_pole_lp(noise, 900)
    env = np.exp(-t * 22)
    return np.tanh(band * env * 4)


def impact(length=1.6):
    n = int(length * SR)
    t = np.arange(n) / SR
    f = 38 + 60 * np.exp(-t * 9)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.6)
    noise = rng.standard_normal(n)
    crack = one_pole_lp(noise, 2200) * np.exp(-t * 14) * 1.6
    tail = one_pole_lp(noise, 500) * np.exp(-t * 3.0) * 0.8
    return np.tanh((sub * 1.4 + crack + tail) * 1.3)


def whoosh(length=0.5):
    n = int(length * SR)
    t = np.arange(n) / SR
    x = t / length
    env = x ** 2.2 * (1 - np.clip((x - 0.92) / 0.08, 0, 1))
    cutoff = 300 + 7000 * x ** 2
    noise = rng.standard_normal(n)
    return one_pole_lp(noise, cutoff) * env * 2.2


def riser(length):
    n = int(length * SR)
    t = np.arange(n) / SR
    x = t / length
    f = 110 * 2 ** (x * 2.5)
    tone = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.25
    noise = one_pole_lp(rng.standard_normal(n), 400 + 6000 * x)
    return (tone * 0.35 + noise) * x ** 2.5


def drone():
    t = np.arange(N) / SR
    base = 55.0  # A1
    saw = sum(np.sin(2 * np.pi * base * k * t) / k for k in range(1, 9))
    saw += 0.6 * sum(np.sin(2 * np.pi * base * 1.006 * k * t) / k for k in range(1, 9))
    sig = one_pole_lp(saw * 0.25, 220)
    swell = np.clip(t / 1.2, 0, 1)
    return sig * swell


buf = np.zeros((2, N))

# --- bed -------------------------------------------------------------------
d = drone()
beat = 15  # frames per beat (120 BPM)
duck = np.ones(N)
for f in range(45, 345, beat):
    s = int(t_of(f) * SR)
    k = np.arange(int(0.3 * SR))
    e = min(N, s + len(k))
    duck[s:e] = np.minimum(duck[s:e], 1 - 0.7 * np.exp(-k[: e - s] / SR * 9))
buf += d * duck * 0.55

# --- groove: 1.5 s - 11.5 s --------------------------------------------------
K, HC, HO, CL = kick(), hat(), hat(True), clap()
for i, f in enumerate(range(45, 345, beat)):
    add(buf, K, t_of(f), 0.9)
    if i % 2 == 1:
        add(buf, CL, t_of(f), 0.45)
    add(buf, HC, t_of(f + beat / 2), 0.16, pan=0.3)
    if i % 4 == 3:
        add(buf, HO, t_of(f + beat / 2), 0.12, pan=-0.3)
# montage section: double-time kicks for energy
for f in range(255, 330, beat):
    add(buf, K, t_of(f + beat / 2), 0.55)
    add(buf, HC, t_of(f + beat / 4), 0.12, pan=-0.3)
    add(buf, HC, t_of(f + 3 * beat / 4), 0.12, pan=0.3)

# --- transitions -------------------------------------------------------------
for f in (45, 150, 255):
    add(buf, whoosh(0.5), t_of(f) - 0.5, 0.5)
add(buf, riser(1.4), t_of(345) - 1.4, 0.5)

# --- impacts -----------------------------------------------------------------
IMP = impact()
for f, g in ((10, 1.0), (45, 0.7), (150, 0.8), (255, 0.8), (345, 1.0), (378, 0.6), (408, 0.9)):
    add(buf, IMP, t_of(f), g)

# --- master ------------------------------------------------------------------
t = np.arange(N) / SR
fade = np.clip((DUR - t) / 0.6, 0, 1)
buf *= fade
buf = np.tanh(buf * 1.1)
buf /= np.max(np.abs(buf)) / 0.89

out = sys.argv[1] if len(sys.argv) > 1 else "soundtrack.wav"
pcm = (buf.T * 32767).astype("<i2")
with wave.open(out, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("wrote", out)
