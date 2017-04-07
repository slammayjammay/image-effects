# Image Effects
This is mostly a playground to play around with WebGL fragment shaders using `three.js`.

Available effects to adjust:
- Pixelation
- Grayscale

## Download
- [macOS](https://github.com/slammayjammay/image-effects/releases/download/v1.1.0/image-effects-darwin-x64.zip)
- [windows](https://github.com/slammayjammay/image-effects/releases/download/v1.1.0/image-effects-win32-x64.zip)

## Run locally

```sh
$ git clone https://github.com/slammayjammay/image-effects.git
$ cd image-effects
$ npm install
$ npm run electron
```

To package as a distributable using `electron-packager`:
```sh
$ npm run package:darwin # mac
$ npm run package:win32 # windows
```
