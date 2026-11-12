# GRIDBORN

Mobile-first Three.js + Rapier browser racing game foundation, configured for GitHub Pages.

## GitHub Pages deployment

This repository includes a GitHub Actions workflow at `.github/workflows/deploy-pages.yml`. After pushing the project to a GitHub repository on the `main` branch, the workflow installs dependencies, builds the Vite app, and deploys `dist/` to GitHub Pages.

### One-time GitHub setup

1. Create a new GitHub repository named `gridborn-racing` (public is simplest for Pages).
2. Upload the contents of this folder to the repository root.
3. Commit the files to the `main` branch.
4. Open **Settings → Pages**.
5. Under **Build and deployment**, select **GitHub Actions** if it is not already selected.
6. Open the repository's **Actions** tab and wait for **Deploy GRIDBORN to GitHub Pages** to finish successfully.
7. GitHub will show the live Pages URL in the workflow run and in **Settings → Pages**.

The site uses relative Vite/PWA URLs, so it works from a GitHub Pages project URL such as `https://USERNAME.github.io/gridborn-racing/`.

## Local development

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

For a production build:

```bash
npm run build
npm run preview
```

## Architecture

- `src/main.js`: render loop + 250 Hz fixed physics accumulator
- `src/vehicle.js`: rigid-body vehicle and wheel force application
- `src/tire.js`: thermal, wear and combined-slip tire model
- `src/input.js`: touch + iOS DeviceOrientation
- `src/assets.js`: GLB/GLTF loader and procedural fallback
- `src/track.js`: procedural circuit
- `src/hud.js`: telemetry UI
- `manifest.json`: PWA metadata
- `sw.js`: offline/runtime caching
- `.github/workflows/deploy-pages.yml`: automatic GitHub Pages deployment

## Physics note

The tire model is deliberately self-contained and tunable rather than claiming to reproduce proprietary tire data. The 250 Hz loop is the simulation target; actual mobile performance must be profiled on the target iPhone.

## Adding GLB assets

Put optimized `.glb` files under `public/assets/`, then load them with `AssetLoader.loadGLB("/assets/car.glb")`. Keep wheel meshes as separate nodes named `wheel_fl`, `wheel_fr`, `wheel_rl`, `wheel_rr` when possible.

## Production hardening

Before shipping a serious simulator build, add compressed KTX2/Basis textures, Draco/Meshopt geometry compression, asset version hashes, WebGL context-loss recovery, telemetry/crash reporting, track collision meshes, deterministic replay tests, and device-specific graphics tiers.


## GRIDBORN visual/handling update
This update separates wheel steering pivots from tyre spin pivots, adds a smoothed chase camera, a gradient sky/horizon with atmospheric fog, and a more detailed procedural open-wheel car model. The car remains a procedural model so the project does not depend on third-party copyrighted vehicle assets.
