## Golang NPM
A package to publish go binaries via npm.

## Why NPM?
* **Cross-platform**: NPM is the only popular package manager that works cross-platform. 
* **Lower barier to entry**: Most developers have NPM installed already. 
* **Pain free publishing**: It just takes one command to publish - `npm publish`
* **Dead simple install & update story**: `npm install/update -g your-awesome-app`
* **Adds $PATH**: NPM will automatically add your binary location to $PATH and generate .cmd file for Windows. Your app just works after installation! 

## Motivation
This package is a fork of [go-npm](https://github.com/sanathkr/go-npm). This fork adds support for installation on arm64 architectures and removes all deprecated packages. Big thanks to the previous [author](https://github.com/sanathkr) and help save his [son](https://x.com/sanathkr_/status/1337227367102566403?s=20)

## Usage
NB: This package is for publishing global binaries. i.e. binaries installed with `-g` flag. 

Start by creating a package.json
```bash
  npm init
```
Follow the prompts and fill them with your own preferred fields. Mine looks like:

```json
  {
  "name": "@nelwhix/goserve",
  "version": "1.1.9",
  "description": "Golang CLI for starting blazing fast server for your local sites",
  "main": "index.js",
  "scripts": {
    "postinstall": "golang-npm install",
    "preuninstall": "golang-npm uninstall",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/Nelwhix/goserve.git"
  },
  "keywords": [
    "cli",
    "dev-server",
    "go"
  ],
  "author": "Nelson Isioma",
  "license": "MIT",
  "bugs": {
    "url": "https://github.com/Nelwhix/goserve/issues"
  },
  "homepage": "https://github.com/nelwhix/goserve#readme",
  "dependencies": {
    "golang-npm": "^0.0.5"
  },
    //   Specify details about your binary
  "goBinary": {
    //   Name of the binary file and what npm will alias as
    "name": "goserve",
    // Where to add the binary
    "path": "./bin",
    // Dynamic URL pointing to where the compressed binary exists based on version, platform, and the processor type (amd64, arm, and more)
    "url": "https://github.com/nelwhix/goserve/releases/download/v{{version}}/goserve_{{version}}_{{platform}}_{{arch}}.tar.gz"
  }
}

```

You would notice there are two commands in the scripts section
```json
  "scripts": {
    "postinstall": "golang-npm install",
    "preuninstall": "golang-npm uninstall",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
```

What postinstall does is that after installing the package it will pull the binary from where you saved it Github or Amazon S3,

preuninstall removes the binary from the bin directory before NPM uninstalls the package.

To confirm if everything is working properly up to this point. You run:

```bash
  npm i golang-npm
```

This will create a node_modules folder, add it to your .gitignore file, to avoid pushing it to Github.

For our CLI tool to work on all operating systems, we need to build a binary that works for each using Goreleaser

To install GoReleaser visit this [link](https://goreleaser.com/install/).

### Generating Binaries
Before we can build our OS-specific binaries we need the following:

- Github/Gitlab token(based on where you want your binary to reside)
- Initialize version control (git)
- Git basic commands

Creating our token

- Create your token [here](https://github.com/settings/tokens)
- Set the Github token as an environment variable

```bash
  export GITHUB_TOKEN=<YOUR GITHUB TOKEN>
```

**Tagging a release**

We need to create a tag and push it as GoReleaser will use the latest Git tag of your repo.

```bash
  git tag -a <version> <commit> -m <release label>
```


Define goreleaser config and define the arch and operating systems you want to build for.

```
In your .goreleaser.yml file

builds:
  - binary: <Your CLI name>
    goos:
      - windows
      - darwin
      - linux
    goarch:
      - amd64
      - arm64
```

Run goreleaser
```bash
  goreleaser release
```

The above command will publish your CLI to Github or Gitlab based on where your repo is hosted.


Next, this CLI needs to be published to npm.

Before you can do that ensure you have the following done:

- An account on npmjs.com
- Login to account using npm cli 
```bash 
  npm login 
```

And now let's publish

```bash
npm publish
```

You just got your package published~
Things you should note

- For package documentation, update your repo readme and update the version on your package.json for npm to pick-up.
- If you need to make any changes at all even a typo fix, you will have to update the npm version on package.json to update the package.