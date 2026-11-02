"""Synthesizes the engine/truck/alarm sound effects (no CC0 recordings were
reachable from the build environment). Physically-inspired: firing pulses at
the engine's firing frequency, exhaust noise, rpm-dependent filtering."""
import numpy as np, wave, subprocess, sys, os

SR = 44100
rng = np.random.default_rng(7)

def lowpass(x, cutoff):
    # one-pole low-pass with a time-varying cutoff (Hz)
    cutoff = np.broadcast_to(cutoff, x.shape)
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.zeros_like(x); s = 0.0
    for i in range(len(x)):
        s = (1 - a[i]) * x[i] + a[i] * s
        y[i] = s
    return y

def engine(rpm, cylinders=4, throttle=None, bark=1.0, seed=1):
    r = np.random.default_rng(seed)
    n = len(rpm)
    fire = rpm / 60.0 * cylinders / 2.0              # firing events per second
    phase = np.cumsum(fire / SR)                     # in "firings"
    frac = phase % 1.0
    jitter = 1 + 0.08 * r.standard_normal(int(phase[-1]) + 2)
    amp = jitter[phase.astype(int)]
    pulse = np.exp(-frac * 9.0) * amp                # sharp combustion pulse, decaying
    crank = np.sin(2 * np.pi * np.cumsum(rpm / 60.0 / SR))  # half-order rumble
    noise = r.standard_normal(n)
    thr = throttle if throttle is not None else np.clip((rpm - rpm.min()) / (rpm.max() - rpm.min() + 1), 0, 1)
    raw = (pulse - pulse.mean()) * (0.8 + 0.6 * thr) * bark + 0.25 * crank + noise * (0.05 + 0.18 * thr) * pulse
    cutoff = 600 + rpm * 0.35 + 1200 * thr
    x = lowpass(raw, cutoff)
    x = np.tanh(x * 2.2)
    # tiny exhaust "room"
    d = int(0.018 * SR)
    x[d:] += 0.25 * x[:-d]
    return x

def env(n, a=0.02, r=0.15):
    e = np.ones(n)
    ai, ri = int(a * SR), int(r * SR)
    e[:ai] = np.linspace(0, 1, ai)
    e[-ri:] = np.linspace(1, 0, ri)
    return e

def seg(*parts):
    """parts: (seconds, rpm_from, rpm_to, curve) -> rpm array"""
    out = []
    for secs, a, b, k in parts:
        t = np.linspace(0, 1, int(secs * SR), endpoint=False)
        out.append(a + (b - a) * (t ** k))
    return np.concatenate(out)

def crackle(n, at, count, seed=3):
    r = np.random.default_rng(seed); x = np.zeros(n)
    for _ in range(count):
        p = int((at + r.random() * 0.6) * SR)
        if p + 600 < n:
            x[p:p + 600] += r.standard_normal(600) * np.exp(-np.linspace(0, 8, 600)) * 0.9
    return lowpass(x, 3000)

def save(name, x, gain=0.85):
    x = x / (np.max(np.abs(x)) + 1e-9) * gain
    path = f'/tmp/{name}.wav'
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())
    out = os.path.join(sys.argv[1], f'{name}.mp3')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', path, '-ac', '1', '-b:a', '96k', out], check=True)
    print('wrote', out)

# sport bike: idle, blip to redline, fall back with decel pops
rpm = seg((0.35, 1400, 1500, 1), (0.45, 1500, 12500, 0.6), (0.18, 12500, 12000, 1), (1.1, 12000, 1500, 0.45), (0.4, 1500, 1400, 1))
x = engine(rpm)
x += crackle(len(x), 1.0, 6)
save('engine-rev', x * env(len(x), 0.05, 0.3))

# sold! the buyer rides off: pull away through two gears, fading into the distance
rpm = seg((0.3, 1500, 1600, 1), (0.9, 1600, 10500, 0.8), (0.12, 10500, 7000, 1), (1.2, 7000, 11000, 0.8))
x = engine(rpm, seed=5)
fade = np.concatenate([np.ones(int(0.9 * SR)), np.linspace(1, 0.05, len(x) - int(0.9 * SR)) ** 1.5])
x = lowpass(x * fade, 7000 - 4000 * np.linspace(0, 1, len(x)))
save('ride-off', x * env(len(x), 0.05, 0.4))

# delivery truck: diesel six rolling up, then the air brake
rpm = seg((1.4, 1100, 750, 0.7), (0.9, 750, 700, 1))
x = engine(rpm, cylinders=6, throttle=np.linspace(0.6, 0.1, len(rpm)), bark=1.4, seed=9)
clatter = rng.standard_normal(len(x)) * (np.sin(2 * np.pi * np.cumsum(rpm / 60 * 3 / SR)) > 0.6) * 0.25
x = x + lowpass(clatter, 2500)
hiss = rng.standard_normal(int(0.8 * SR)) * np.exp(-np.linspace(0, 4, int(0.8 * SR)))
hiss = hiss - lowpass(hiss, 2500)
x = np.concatenate([x, hiss * 0.8])
save('truck', x * env(len(x), 0.3, 0.2))

# theft alarm: classic car-alarm whoops
t = np.arange(int(2.0 * SR)) / SR
f = 700 + 700 * (np.sin(2 * np.pi * 2.5 * t) * 0.5 + 0.5)
x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.6
x = lowpass(x, 4000)
save('alarm', x * env(len(x), 0.01, 0.2), 0.6)
