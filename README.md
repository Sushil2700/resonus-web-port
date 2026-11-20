# Resonus Web

A community web port of [Resonus](https://github.com/juananzzz/resonus), packaged
as a Docker app. Desktop and mobile layouts, browser playback, lyrics, playlists,
local-folder import and offline downloads. Bring your own music server; this
container serves the player and proxies requests to an existing server.

## Quick start

---
You can use music.app.sushil.co.uk, and setup with your own login details.
---

Requires Docker Engine with the Compose plugin and an existing Navidrome or
OpenSubsonic server. Download/clone this repository, and run the docker compose:

Clone and navigate
```sh
git clone https://github.com/Sushil2700/resonus-web-port.git
cd resonus-web-port
```
```sh
cp .env.example .env
# Edit .env: set MUSIC_SERVER_URL to your music server's address.
docker compose up -d --build
```

Open **http://localhost:8080** on the Docker host. Add a profile, select your
server type and sign in with your music-server account. **Leave the prefilled
server address as the Resonus website address** to use the configured proxy.
No account credentials belong in `.env`.

`MUSIC_SERVER_URL` is resolved inside Docker: for example `http://192.168.1.20:4533`
or `https://navidrome.example.com`. The supplied `host.docker.internal` alias
reaches the Docker host; the backend must listen on an address reachable from
the container, not only host loopback. Use an origin with no trailing slash or
subpath. A Docker service name works if you attach both services to the same
network; no existing external network is required by this repository.

## On your server

Serve Resonus at the **root of an HTTPS domain**, using your existing reverse
proxy. A host-based Caddy example is in [deploy/Caddyfile.example](deploy/Caddyfile.example).
Keep the default localhost binding for a proxy on the host. If your proxy is
another container, attach both to a shared Docker network and proxy to
`resonus:8080`; container localhost does not reach the host.

HTTPS (or localhost for testing) is required for browser storage, offline audio
and the SQLite worker. Plain HTTP at a remote IP is insufficient. Preserve the
Cross-Origin-Opener-Policy and Cross-Origin-Embedder-Policy response headers.
For local testing from another machine, an SSH tunnel also works:

```sh
ssh -L 8080:127.0.0.1:8080 user@your-server
# Then open http://localhost:8080 on your own computer.
```

`PORT` changes the host port; `BIND_ADDRESS` controls the listening interface.
The container always listens on 8080. Configuration changes need no rebuild:
edit `.env` and run `docker compose up -d --force-recreate`.

## Downloads and sharing

Offline downloads and exporting audio files are available subject to your
server's permissions. Playlist sharing uses the server's own public links and
player. Navidrome profiles offer **Allow downloads** when creating a share.
Playlist visibility is controlled by **Edit playlist → Public playlist**, as
in upstream Resonus. The personal listen-only policy, domain rewriting, custom
guest player and “Save to my playlists” guest flow are removed.

For Navidrome sharing, enable `ND_ENABLESHARING=true` on **Navidrome** and set
`ND_SHAREURL` to your externally reachable **Navidrome origin**, for example
`https://navidrome.example.com` (include its base path if applicable). It must
serve Navidrome's own share pages; do not point it at this Resonus frontend.
See [Navidrome configuration](https://www.navidrome.org/docs/usage/configuration-options/).
The Resonus proxy exposes API routes, not Navidrome's public website.
Other Subsonic servers decide their own sharing capabilities; Jellyfin has no
equivalent share endpoint.

## Storage and updates

Profiles, credentials, settings and downloaded audio live in each browser's site
storage. Clearing site data removes them; changing the website origin starts a
new browser library. Music and server playlists stay on your music server. This
frontend needs no Docker data volume. Back up your music server separately.

After pulling a new release, run `docker compose up -d --build` again.
Use `docker compose ps` and `docker compose logs --tail=100` to inspect startup;
`docker compose down` stops this frontend. The health check checks the frontend,
not backend availability. A 502 on sign-in usually means `MUSIC_SERVER_URL`
cannot be reached from the container.

Additional profiles may connect directly to other server URLs, including Jellyfin
and Ampache, using upstream adapters. Those servers need HTTPS and appropriate
browser CORS support; the bundled proxy is for root-hosted Navidrome/OpenSubsonic.
Native features such as Android Auto, widgets, casting and the Android equalizer
are unavailable. Browser codec support, storage quotas and background playback
limits vary by browser; native gapless playback is not guaranteed.

## Development and validation

```sh
docker build --target test -t resonus-web-tests .
cd app
npm ci
npm run typecheck
npm test
npm run build:web
npx playwright install chromium
# With the container running at localhost:8080:
node web-tests/smoke.cjs
node web-tests/sharing.cjs
```

Local npm installation needs Node 24 and `patch`. Browser tests accept
`RESONUS_TEST_URL` and optional `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.
Tests use synthetic data and mocked accounts. The local-folder test additionally
requires a fixture music folder at `/tmp/resonus-fixture`.

## Publishing

To release this on GitHub, use this directory as a new repository's root.
The checks workflow builds and tests the app. Pushing a version tag such as
`v1.0.0` runs the image workflow, publishing amd64/arm64 images to
`ghcr.io/<owner>/<repository>:1.0.0` and `:latest`; a manual run publishes `:edge`.
Make the GitHub package public if you want anonymous pulls. Consumers can then
replace `build: .` and the local `image:` in Compose with that published image.
No image or repository has been published as part of preparing this folder.

## Credits and license

Based on Resonus `7005f0ddd4fc462a4795113acd3508017831bb96` (app version 0.8.7).
Original source, authorship and notices are preserved under `app/`.
This distribution adds the web adapters, desktop layout and Docker packaging;
it is not an official upstream release. GPL-3.0-or-later; see [LICENSE](LICENSE)
and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
Desktop styling was informed by [unslop by Damir Sokolovsky](https://github.com/heydamir/unslop)
(CC BY 4.0). Publish this whole directory as the repository root, including
source and license files. Build artifacts, local environment files, dependencies
and the original checkout's Git history are excluded.
