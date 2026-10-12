# Review: 10b (the logo)

Branch `10b-logo`, from main. Changes are limited to the page, the root README and `docs/brand/`: nothing under `packages/` or `cases/` changed. One commit.

## 1. The files, copied byte for byte

Every file is copied from `local/logo/assets/` with `cp -p`, and `cmp` finds each identical to its source. Nothing is optimized, re-exported or edited.

| File | Size | SHA-1 (`shasum`) |
|---|---:|---|
| `docs/brand/mark.svg` | 8,012 | `ec8c7310358cd1c27bda28e9e2b70a980ee7632e` |
| `docs/brand/lockup-light.svg` | 12,720 | `7b153ac073b2c94dee9047634ce42d4f4ff552b6` |
| `docs/brand/lockup-dark.svg` | 12,720 | `4559c29e92a894d1f7d2100fe0d87f60f3ec046b` |
| `docs/brand/wordmark-plain-navy.svg` | 12,536 | `a4bc571f95a82680c3bc29b47f9722b08926c528` |
| `docs/brand/wordmark-plain-white.svg` | 12,536 | `3adf3662bfc83507bdc478281432c290acdb5a0c` |
| `docs/brand/social-card.png` | 29,675 | `43fbdedd11eba78a8f15e15fe6a382b512f4ecf8` |
| `apps/dashboard/public/favicon.svg` | 8,070 | `8f16f827a667846b2ba5bc624a7267780ba0a252` |
| `apps/dashboard/public/favicon-32.png` | 6,117 | `62bf4e059eb65ae5f4aced919439542aa68f48cb` |

**How git stores them:** the repo has no `.gitattributes`, and `core.autocrlf` is unset. The SVGs have no carriage returns, so git stores them exactly as they are.

**Not copied, as you said:** the three `wordmark-spilled-*.svg` files and `avatar-512.png`. They stay in `local/logo/`.

**The content credentials are kept:**
- **Where:** each SVG has one `<metadata><c2pa:manifest>` block, and each PNG has a `caBX` chunk.
- **What they say:** they carry Anthropic's signing certificates and "Claude provided this file at the request of a user and may have created or modified the file contents".
- **No personal data:** I decoded the SVGs' credentials from base64, then searched them and the PNGs for your name, your email, and any email address at all. I found none.

**What's in the SVGs:**
- no scripts, and no links to other files; the only URLs are XML namespaces
- each has `role="img"` and `aria-label="spillpoint"`
- the colors are only `#1d3557`, `#2a9d8f` and `#ffffff`

## 2. `docs/brand/README.md`

**Your three rules, in your words:**
- the mark in color or on its navy tile, and the wordmark alone in one color
- which files are for light backgrounds and which for dark
- the colors and the font

**Also in it:**
- **A table of the files,** the page's two icons included, with what each is and what it's for.
- **A line saying the files are exactly as Claude Design exported them,** with their credentials. To change one, make it again rather than editing it.

## 3. The page

**`apps/dashboard/index.html`:** the empty icon and its comment are gone. In their place are two links, with a comment pointing to `docs/brand/README.md`:

```html
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
```

**The built page:** `pnpm build` writes them as `./favicon-32.png` and `./favicon.svg`, beside `index.html`. Both built files are byte for byte what's in `public/`.

**The built page in a browser:** I served the build with `vite preview` and opened it in the browser pane. Then I checked four things:
- **The links:** the page's two icon links resolve to `http://localhost:4173/favicon-32.png` and `/favicon.svg`, beside `index.html`.
- **The server:** it returns each with status 200 and the right type, `image/png` and `image/svg+xml`. Each is the same size as its file: 6,117 and 8,070 bytes.
- **Loading under the page's policy:** both load as images inside the page. The 32 × 32 PNG comes back 32 × 32.
- **The CSP blocks nothing:**
  - no `securitypolicyviolation` event fired
  - the console shows no errors
  - the policy's `img-src 'self'` covers both

**`apps/dashboard/test/privacy.test.ts`:**
- **"loads only its own files":** now allows the two icons beside `index.html`, as well as `./assets/` and `data:`. It allows those two exact names, nothing else outside `assets/`.
- **New, "ships its icons beside index.html, as they are in public/, and the policy lets it load them":** the built page links exactly `./favicon-32.png` as `image/png` and `./favicon.svg` as `image/svg+xml`. Both built files are byte-identical to `public/`, and the policy has `img-src 'self'`.

## 4. The root README

The first heading is now the lockup, in a `<picture>`:

```html
# <picture><source media="(prefers-color-scheme: dark)" srcset="docs/brand/lockup-dark.svg"><img src="docs/brand/lockup-light.svg" alt="spillpoint" height="48"></picture>
```

**Why the heading still reads "spillpoint":** the image's alt text is the heading's text, so a screen reader still hears "spillpoint".

**GitHub keeps all of it:** I checked with GitHub's own Markdown renderer. It keeps the `<h1>`, the `<picture>`, the dark `<source>`, the alt text and the height, wrapped in GitHub's own picture element that follows the color scheme.

**Unchanged:** `packages/engine/README.md`, which is what npm shows.

## How to check it by behavior

1. **Run what CI runs:**

   ```bash
   pnpm install && pnpm typecheck && pnpm build && pnpm test && pnpm test:reference
   ```

   I got:
   - all 3,115 engine tests, unchanged
   - 673 page tests: 672 before, plus the new privacy test
   - the reference's 73 unit tests
   - all 83 cases matching the reference

   **One timeout on my first run:** an engine test, "case 27's RSUs, with no strike, come in where common starts to be paid", took 7.3s against Vitest's 5s limit. The machine was busy at the time, with a load average of 14, and nothing under `packages/` had changed. It passed on the next run. See open question 1.
2. **The page's icon:**
   - **On the built page:** run `pnpm preview` and open `http://localhost:4173/`. The tab shows the mark on its navy tile.
   - **In the developer tools:**
     - the Network tab shows `favicon.svg` with status 200
     - the Console shows no Content Security Policy errors
   - **With `pnpm dev`:** the icon shows too.
3. **The README:** on this PR's branch on GitHub, the README opens with the lockup about 48px tall. Switch GitHub to a dark theme and it changes to the white-and-teal lockup.
4. **The files are the ones from Claude Design:**

   ```bash
   for f in mark.svg lockup-light.svg lockup-dark.svg wordmark-plain-navy.svg wordmark-plain-white.svg social-card.png; do cmp local/logo/assets/$f docs/brand/$f && echo "same $f"; done
   ```

   This prints "same" for all six. Do the same for `favicon.svg` and `favicon-32.png` against `apps/dashboard/public/`.
5. **Nothing else changed:** `git diff --stat main -- packages cases` prints nothing.

## Decisions for you to check

1. **The PNG link comes first, with `sizes="32x32"`, and the SVG link last.** Browsers that can show an SVG icon take the SVG. Browsers that can't take the PNG.
2. **The links are written `/favicon.svg` in the source, not `./favicon.svg`:**
   - **Why:** a path from the root is how Vite knows a file is in `public/`. Vite then writes it relative to the page, as `./favicon.svg`, so the built page still asks for it beside `index.html`.
   - **The other way:** written `./favicon.svg`, Vite would treat it as an asset, rename it with a hash and move it into `assets/`.
3. **The README's lockup sets only `height="48"`,** so the browser keeps its shape, about 245px wide.
4. **The social card is in `docs/brand/` but used nowhere yet.** GitHub's social preview is set in the repository's settings, which is yours to do if you want it.

## Assumptions added or changed

None. This step has no modeling choices.

## CI and permissions

- **No changes** to `.github/workflows/` or `.claude/` are committed.
- **`.claude/launch.json` was temporary:** it was a launch configuration for serving the built page in the browser pane. I made it for the browser check and deleted it afterwards, and it was never committed.
- **Nothing ran outside the sandbox.**

## Open questions

1. **The engine test that timed out under load,** case 27's RSUs, ran at 7.3s against a 5s limit while the machine was busy. If CI runners are ever as busy, it could fail there too. Raising its timeout would be a change under `packages/`, so it's not in this step.

## Next

I'm stopping here.
