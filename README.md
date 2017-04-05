# Image Effects

This is mostly a playground to play around with WebGL fragment shaders using THREE.js. Currently there is only one effect to adjust (pixelation) but there may be more in the future.

```sh
$ git clone https://github.com/slammayjammay/image-effects.git
$ cd image-effects
$ npm install
```

Run the repo as an electron app:
```sh
$ npm run build && npm run electron
```

Or package it as a distributable app:
```sh
$ npm run bundle
```

## Note:
This relies on `ffmpeg`, which needs to be in your `$PATH` in order to work. If you're on a mac and have Homebrew installed, you can simply run:
```sh
$ brew install ffmpeg
```
