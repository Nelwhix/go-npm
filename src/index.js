#!/usr/bin/env node

"use strict"

const path = require('path'),
    tar = require('tar'),
    zlib = require('zlib'),
    mkdirp = require('mkdirp'),
    fs = require('fs'),
    exec = require('child_process').exec,
    fetch = require('node-fetch')
    

// Mapping from Node's `process.arch` to Golang's `$GOARCH`
const ARCH_MAPPING = {
    "ia32": "386",
    "x64": "amd64",
    "arm": "arm",
    "arm64": "arm64"
};

// Mapping between Node's `process.platform` to Golang's 
const PLATFORM_MAPPING = {
    "darwin": "darwin",
    "linux": "linux",
    "win32": "windows",
    "freebsd": "freebsd"
};

// to get the path where npm binaries are stored
function getInstallationPath(callback) {
    exec("npm --v", (err, stdout, stderr) => {
        const npmVersion = parseFloat(stdout.trim())
        
        // npm bin was deprecated after v9 https://github.blog/changelog/2022-10-24-npm-v9-0-0-released/
        if (npmVersion < 9) {
            exec("npm bin -g", (err, stdout, stderr) => {
                let dir =  null;
        
                if (err || stderr || !stdout || stdout.length === 0)  {
                  throw new Error('Could not get installation path')
                } else {
                    dir = stdout.trim();
                }
     
                mkdirp.sync(dir);
                callback(null, dir)
            });
        } else {
            exec("npm prefix -g", (err, stdout, stderr) => {
                let dir =  null;
        
                if (err || stderr || !stdout || stdout.length === 0)  {
                  throw new Error('Could not get installation path')
                } else {
                    dir = stdout.trim() + "/bin";
                }
     
                mkdirp.sync(dir);
                callback(null, dir)
            });
        }
    })
}

function verifyAndPlaceBinary(binName, binPath, callback) {
    if (!fs.existsSync(path.join(binPath, binName))) {
        throw new Error(`Downloaded binary does not contain the binary specified in configuration - ${binName}`);
    }

    getInstallationPath(function(err, installationPath) {
        if (err) { 
            throw new Error("Error getting binary installation path from `npm bin`");
        }

        // Move the binary file
        fs.renameSync(path.join(binPath, binName), path.join(installationPath, binName));
        callback();
    });
}

function validateConfiguration(packageJson) {
    if (!packageJson.version) {
        return "'version' property is required";
    }

    if (!packageJson.goBinary || typeof(packageJson.goBinary) !== "object") {
        return "'goBinary' property must be defined and be an object";
    }

    if (!packageJson.goBinary.name) {
        return "'name' property is required";
    }

    if (!packageJson.goBinary.path) {
        return "'path' property is required";
    }

    if (!packageJson.goBinary.url) {
        return "'url' property is required";
    }
}

function parsePackageJson() {
    if (!(process.arch in ARCH_MAPPING)) {
        console.error("Installation is not supported for this architecture: " + process.arch);
        return;
    }

    if (!(process.platform in PLATFORM_MAPPING)) {
        console.error("Installation is not supported for this platform: " + process.platform);
        return
    }

    const packageJsonPath = path.join(".", "package.json");
    if (!fs.existsSync(packageJsonPath)) {
        console.error("Unable to find package.json. " +
            "Please run this script at root of the package you want to be installed");
        return
    }

    let packageJson = JSON.parse(fs.readFileSync(packageJsonPath));
    let error = validateConfiguration(packageJson);
    if (error && error.length > 0) {
        console.error("Invalid package.json: " + error);
        return
    }

    let binName = packageJson.goBinary.name;
    let binPath = packageJson.goBinary.path;
    let url = packageJson.goBinary.url;
    let version = packageJson.version;
    if (version[0] === 'v') version = version.substr(1);

    if (process.platform === "win32") {
        binName += ".exe"
    }

    // Interpolate variables in URL, if necessary
    url = url.replace(/{{arch}}/g, ARCH_MAPPING[process.arch]);
    url = url.replace(/{{platform}}/g, PLATFORM_MAPPING[process.platform]);
    url = url.replace(/{{version}}/g, version);
    url = url.replace(/{{bin_name}}/g, binName);

    return {
        binName: binName,
        binPath: binPath,
        url: url,
        version: version
    }
}

/**
 * Reads the configuration from application's package.json,
 * validates properties, downloads the binary, untars, and stores at
 * ./bin in the package's root. NPM already has support to install binary files
 * specific locations when invoked with "npm install -g"
 *
 *  See: https://docs.npmjs.com/files/package.json#bin
 */
const INVALID_INPUT = "Invalid inputs";
function install(callback) {
    const options = parsePackageJson();
    if (!options) {
        throw new Error(INVALID_INPUT);
    }

    mkdirp.sync(options.binPath);
    const ungz = zlib.createGunzip();
    const untar = tar.x({cwd: options.binPath});


    // First we will Un-GZip, then we will untar. So once untar is completed,
    // binary is downloaded into `binPath`. Verify the binary and call it good
    untar.on('end', () => {
        verifyAndPlaceBinary(options.binName, options.binPath, callback)
    });

    console.log("Downloading from URL: " + options.url);

    fetch(options.url)
        .then((res) => {
            if (!res.ok) {
                throw new Error("Error downloading binary. HTTP Status Code: " + res.status);
            }

            res.body.pipe(ungz).pipe(untar)
        })
}

function uninstall(callback) {
    const options = parsePackageJson();

    getInstallationPath(function(err, installationPath) {
        if (err) {
            throw new Error("Error finding binary installation directory");
        }

        fs.unlinkSync(path.join(installationPath, options.binName));
        callback()
    });
}

const actions = {
    "install": install,
    "uninstall": uninstall
};

const argv = process.argv;
if (argv && argv.length > 2) {
    const cmd = process.argv[2];
    if (!actions[cmd]) {
        console.log("Invalid command to go-npm. `install` and `uninstall` are the only supported commands");
        process.exit(1);
    }

    try {
        actions[cmd](() => {
            process.exit(0);
        })
    } catch (err) {
        console.error(err);
        process.exit(1)
    }
}



