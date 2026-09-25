# Changelog


## v1.0.1

[compare changes](https://github.com/wypratama/use-validation/compare/v1.0.0...v1.0.1)

### 🏡 Chore

- Add package lock ([2c8fa33](https://github.com/wypratama/use-validation/commit/2c8fa33))

### 🤖 CI

- Use npm ci with package lock ([f24d6ef](https://github.com/wypratama/use-validation/commit/f24d6ef))
- Use npm ci for releases ([5b8df4f](https://github.com/wypratama/use-validation/commit/5b8df4f))

### ❤️ Contributors

- Wicaksana Pratama <wicaksanapratama@gmail.com>

## v1.0.0

[compare changes](https://github.com/wypratama/use-validation/compare/v1.0.0-beta.0...v1.0.0)

### 🏡 Chore

- Prepare stable validation release ([dfeea9c](https://github.com/wypratama/use-validation/commit/dfeea9c))

### 🤖 CI

- Harden workflow security ([136e5e4](https://github.com/wypratama/use-validation/commit/136e5e4))

### ❤️ Contributors

- Wicaksana Pratama <wicaksanapratama@gmail.com>

## v1.0.0-beta.0


### 🚀 Enhancements

- Initial commit ([8c9f53e](https://github.com/wypratama/use-validation/commit/8c9f53e))
- Add publish config registry ([51529b3](https://github.com/wypratama/use-validation/commit/51529b3))
- Prototype reactive validation hook ([c1e69c1](https://github.com/wypratama/use-validation/commit/c1e69c1))
- Mirror nested validation errors to form shape ([35c17e9](https://github.com/wypratama/use-validation/commit/35c17e9))
- Let reset establish a loaded edit baseline ([785b96b](https://github.com/wypratama/use-validation/commit/785b96b))
- Validate native array values and items together ([e02f331](https://github.com/wypratama/use-validation/commit/e02f331))

### 🩹 Fixes

- Add strict JSDoc types to prototype ([be24c32](https://github.com/wypratama/use-validation/commit/be24c32))
- Simplify prototype error map typing ([7fae33f](https://github.com/wypratama/use-validation/commit/7fae33f))
- Correct state tuple JSDoc ([62abdda](https://github.com/wypratama/use-validation/commit/62abdda))
- Create scoped consumer directory ([1fb2b42](https://github.com/wypratama/use-validation/commit/1fb2b42))
- Preserve opaque reactive leaf values ([40cdebd](https://github.com/wypratama/use-validation/commit/40cdebd))
- Repair nested rule traversal ([9a367f4](https://github.com/wypratama/use-validation/commit/9a367f4))
- Keep nested traversal argument positional ([e94783e](https://github.com/wypratama/use-validation/commit/e94783e))
- Make async submit validation snapshot-safe ([8770cdb](https://github.com/wypratama/use-validation/commit/8770cdb))
- Keep validation callbacks live and count all error keys ([a7ceeca](https://github.com/wypratama/use-validation/commit/a7ceeca))
- Enforce Standard Schema V1 contract ([4aa33db](https://github.com/wypratama/use-validation/commit/4aa33db))
- Batch automatic validation and harden error paths ([d839542](https://github.com/wypratama/use-validation/commit/d839542))
- Prioritize explicit validation over queued revalidation ([10ef26b](https://github.com/wypratama/use-validation/commit/10ef26b))
- Resolve schema paths from own form data only ([622df06](https://github.com/wypratama/use-validation/commit/622df06))
- Keep own-path lookup JSDoc-safe ([e2b1405](https://github.com/wypratama/use-validation/commit/e2b1405))

### 💅 Refactors

- Replace tsdx with minimal esm tooling ([7d5aca8](https://github.com/wypratama/use-validation/commit/7d5aca8))
- Remove legacy tsdx source ([ad5cfe3](https://github.com/wypratama/use-validation/commit/ad5cfe3))
- Keep validation activation internal ([14829e0](https://github.com/wypratama/use-validation/commit/14829e0))

### 📖 Documentation

- Replace tsdx readme with prototype api ([2e41752](https://github.com/wypratama/use-validation/commit/2e41752))
- Document Zod and Yup schema interoperability ([feb856c](https://github.com/wypratama/use-validation/commit/feb856c))
- Keep activation state out of public API ([d6d8525](https://github.com/wypratama/use-validation/commit/d6d8525))
- Define 1.0 beta validation contract ([6087ccd](https://github.com/wypratama/use-validation/commit/6087ccd))
- Document async validation safety ([ec4d7fe](https://github.com/wypratama/use-validation/commit/ec4d7fe))
- Define schema interoperability boundaries ([15781a1](https://github.com/wypratama/use-validation/commit/15781a1))
- Define dormant edit and view-only lifecycle ([8e499ae](https://github.com/wypratama/use-validation/commit/8e499ae))
- Explain opinionated form lifecycle up front ([34c7712](https://github.com/wypratama/use-validation/commit/34c7712))
- Add dynamic form example and simplify language ([3f70389](https://github.com/wypratama/use-validation/commit/3f70389))
- Show native array and item validation together ([1520d05](https://github.com/wypratama/use-validation/commit/1520d05))

### 🌊 Types

- Define prototype public api ([787f9d7](https://github.com/wypratama/use-validation/commit/787f9d7))
- Infer inline validator field values ([a313754](https://github.com/wypratama/use-validation/commit/a313754))
- Keep nested native rules unambiguous ([ff3f521](https://github.com/wypratama/use-validation/commit/ff3f521))
- Expose structural error messages ([80a53cd](https://github.com/wypratama/use-validation/commit/80a53cd))
- Model nested objects and opaque leaves ([f33b47f](https://github.com/wypratama/use-validation/commit/f33b47f))
- Bind internal error bag to public tree ([e18fc37](https://github.com/wypratama/use-validation/commit/e18fc37))
- Type optional reset baseline ([0cc6752](https://github.com/wypratama/use-validation/commit/0cc6752))
- Attach reset JSDoc to callback ([e1263f4](https://github.com/wypratama/use-validation/commit/e1263f4))

### 🏡 Chore

- Typecheck jsdoc source ([3059938](https://github.com/wypratama/use-validation/commit/3059938))
- Generate declarations from jsdoc ([fce4712](https://github.com/wypratama/use-validation/commit/fce4712))
- Scope lint to modern source ([339ff73](https://github.com/wypratama/use-validation/commit/339ff73))
- Remove stale tsdx yarn lock ([cfc0216](https://github.com/wypratama/use-validation/commit/cfc0216))
- Sync generated declarations ([6289336](https://github.com/wypratama/use-validation/commit/6289336))
- Add package consumer verification ([8826600](https://github.com/wypratama/use-validation/commit/8826600))
- Align modern validation toolchain ([fa6025a](https://github.com/wypratama/use-validation/commit/fa6025a))
- Sync inferred validator declarations ([a7b09f2](https://github.com/wypratama/use-validation/commit/a7b09f2))
- Sync compact public API declarations ([d60d261](https://github.com/wypratama/use-validation/commit/d60d261))
- Target 1.0.0-beta.0 ([4135ad4](https://github.com/wypratama/use-validation/commit/4135ad4))
- Sync nested validation declarations ([0991760](https://github.com/wypratama/use-validation/commit/0991760))
- Match generated declaration formatting ([424336b](https://github.com/wypratama/use-validation/commit/424336b))
- Prepare automated beta versioning ([0fcf75b](https://github.com/wypratama/use-validation/commit/0fcf75b))
- Sync Standard Schema V1 declarations ([e9e9be4](https://github.com/wypratama/use-validation/commit/e9e9be4))
- Sync reset baseline declarations ([c48233f](https://github.com/wypratama/use-validation/commit/c48233f))
- Sync native array rule declarations ([624a231](https://github.com/wypratama/use-validation/commit/624a231))

### ✅ Tests

- Cover native and standard schema validation ([cdb3809](https://github.com/wypratama/use-validation/commit/cdb3809))
- Remove legacy tsdx placeholder ([b5274f5](https://github.com/wypratama/use-validation/commit/b5274f5))
- Stress reactive validation composition ([627455d](https://github.com/wypratama/use-validation/commit/627455d))
- Assert invalid schema rejection ([cc86290](https://github.com/wypratama/use-validation/commit/cc86290))
- Verify packed consumer entry ([3852c1d](https://github.com/wypratama/use-validation/commit/3852c1d))
- Add Yup Standard Schema integration ([99278ac](https://github.com/wypratama/use-validation/commit/99278ac))
- Verify Yup schema compatibility ([6ec8e82](https://github.com/wypratama/use-validation/commit/6ec8e82))
- Add public API type probes ([50d2457](https://github.com/wypratama/use-validation/commit/50d2457))
- Type-check consumer probes ([ed37bef](https://github.com/wypratama/use-validation/commit/ed37bef))
- Cover held references and SSR ([5847246](https://github.com/wypratama/use-validation/commit/5847246))
- Preserve Date and Map leaves ([3a93ddf](https://github.com/wypratama/use-validation/commit/3a93ddf))
- Stop exposing validation activation as dirty ([8208e99](https://github.com/wypratama/use-validation/commit/8208e99))
- Remove stale dirty assertion ([e977810](https://github.com/wypratama/use-validation/commit/e977810))
- Cover nested error tree and native rules ([2c0fa5f](https://github.com/wypratama/use-validation/commit/2c0fa5f))
- Probe nested validation type inference ([485729e](https://github.com/wypratama/use-validation/commit/485729e))
- Clarify nested and array validation scope ([d4fbaa3](https://github.com/wypratama/use-validation/commit/d4fbaa3))
- Use structural _errors for array-level rules ([28bedd9](https://github.com/wypratama/use-validation/commit/28bedd9))
- Type-check nested and structural errors ([f3e0749](https://github.com/wypratama/use-validation/commit/f3e0749))
- Block stale async submit authorization ([86def64](https://github.com/wypratama/use-validation/commit/86def64))
- Adversarial Standard Schema and live callback cases ([f485cd3](https://github.com/wypratama/use-validation/commit/f485cd3))
- Cover batched mutations and prototype-like paths ([aab8610](https://github.com/wypratama/use-validation/commit/aab8610))
- Keep unusual issue paths outside reactive state ([af77950](https://github.com/wypratama/use-validation/commit/af77950))
- Clarify unusual schema path coverage ([78b6a2a](https://github.com/wypratama/use-validation/commit/78b6a2a))
- Explicit validation wins over queued automatic pass ([686034e](https://github.com/wypratama/use-validation/commit/686034e))
- Guarantee dormant edit and view-only validation ([086d004](https://github.com/wypratama/use-validation/commit/086d004))
- Type-check reset edit baseline ([8244b97](https://github.com/wypratama/use-validation/commit/8244b97))
- Cover dynamic array growth and shrink ([8b8bf5b](https://github.com/wypratama/use-validation/commit/8b8bf5b))
- Cover native array self and item rules ([a7ac14c](https://github.com/wypratama/use-validation/commit/a7ac14c))
- Type native array self and each rules ([6a4b9e1](https://github.com/wypratama/use-validation/commit/6a4b9e1))
- Keep schema array and item errors together ([6c6fbb4](https://github.com/wypratama/use-validation/commit/6c6fbb4))

### 🤖 CI

- Replace legacy tsdx matrix ([686459b](https://github.com/wypratama/use-validation/commit/686459b))
- Remove legacy tsdx size workflow ([0baaa5e](https://github.com/wypratama/use-validation/commit/0baaa5e))
- Avoid duplicate branch runs and check declarations ([e3dab24](https://github.com/wypratama/use-validation/commit/e3dab24))
- Test React 18 and packed consumer ([4875225](https://github.com/wypratama/use-validation/commit/4875225))
- Cancel superseded runs ([28a448b](https://github.com/wypratama/use-validation/commit/28a448b))
- Rotate concurrency group for beta validation ([4a50ac8](https://github.com/wypratama/use-validation/commit/4a50ac8))
- Add trusted beta release workflow ([1b0c9e6](https://github.com/wypratama/use-validation/commit/1b0c9e6))

### ❤️ Contributors

- Wicaksana Pratama <wicaksanapratama@gmail.com>

