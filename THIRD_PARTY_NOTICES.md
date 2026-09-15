# Third-party notices

Hearth uses the following client-side image libraries for Avatar editing:

- [`react-easy-crop`](https://github.com/ValentinH/react-easy-crop), MIT License.
- [`heic-to`](https://github.com/hoppergee/heic-to), GNU Lesser General Public
  License v3.0. It is loaded only when a User selects a HEIC/HEIF Avatar source.
  Its source and complete license are available in the linked repository and in
  the installed package at `web/node_modules/heic-to/LICENSE`.

Hearth does not modify either library.

Hearth uses [`sharp`](https://github.com/lovell/sharp), Apache License 2.0, on the
server to validate and normalize Avatar images to WebP. Its complete license is
available in the linked repository and at `web/node_modules/sharp/LICENSE`.
