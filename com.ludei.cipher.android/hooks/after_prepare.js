#!/usr/bin/env node
var path = require('path');
var fs = require('fs');
var os = require('os');
var cipherFilter = ['js', 'xml', 'json', 'jpg', 'png'];


function walk(currentDirPath, callback) {
    fs.readdirSync(currentDirPath).forEach(function(name) {
        var filePath = path.join(currentDirPath, name);
        var stat = fs.statSync(filePath);
        if (stat.isFile()) {
            callback(filePath, stat);
        }
        else if (stat.isDirectory()) {
            walk(filePath, callback);
        }
    });
}

function getPassword(context) {
    //Get PASSWORD from fetch.json file. Is there a better way to get a plugin parameter value from a hook?
    var jsonPath = path.join(context.opts.projectRoot, 'plugins', 'fetch.json');
    var json = require(jsonPath);
    var password = undefined;
    if (json['com.ludei.cipher.android'] && json['com.ludei.cipher.android'].variables)
        password = json['com.ludei.cipher.android'].variables['PASSWORD'];
    if (!password)
        password = json['com.ludei.cipher'].variables['PASSWORD'];

    return decodeURIComponent(password);
}

function removePasswordFromXML(context) {
    var config_xml_path = path.join(context.opts.projectRoot, 'platforms', 'android', 'res', 'xml', 'config.xml');

    var et = context.requireCordovaModule('elementtree');
    var data = fs.readFileSync(config_xml_path).toString();
    var etree = et.parse(data);
    var item = null;
    var root = etree.getroot();
    for (var i = 0; i < root.getchildren().length; i++) {
        item = root.getItem(i);
        if (item.get("name", null) === "com.ludei.cipher" ||
            item.get("name", null) === "com.ludei.cipher.android") {
            root.delItem(i);
        }
    }

    if (item !== null) {
        data = etree.write({ 'indent': 4 });
        fs.writeFileSync(config_xml_path, data);
    }
}

function cipher_www(context, cmd) {
    if (context.opts.cordova.platforms.indexOf('android') <= -1)
        return;

    var child_process = context.requireCordovaModule('child_process');

    var exec = null;
    switch (os.platform()) {
        case "darwin":
            exec = "LudeiFileCipher_osx"
            break;

        case "linux":
            exec = "LudeiFileCipher_lin"
            break;

        case "windows":
            exec = "LudeiFileCipher.exe"
            break;
        default:
            throw ('Platform not supported by cipherer');
    }

    var password = getPassword(context);
    var shell = context.requireCordovaModule('shelljs');
    var projectPath = context.opts.projectRoot;
    var wwwPath = path.join(projectPath, "platforms", "android", "assets", "www");
    walk(wwwPath, function(filePath) {
        var match = filePath.match(/\.([0-9a-z]+)$/i);
        if (match && cipherFilter.indexOf(match[1].toLowerCase()) >= 0) {
            console.log('Cipher ', filePath, '...');


            var command = path.join(context.opts.plugin.dir, "bin", exec) + ' "' + filePath + '" "' + filePath + '.cdf' + '"';
            if (password) {
                command += " '" + password + "'";
            }
            try {
                child_process.execSync(command);
                fs.unlinkSync(filePath);

            } catch (e) {
                console.error("Error encrypting file: " + filePath);
            }
        }
    });

    removePasswordFromXML(context);
}

module.exports = cipher_www;
