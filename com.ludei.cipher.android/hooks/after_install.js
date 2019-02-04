#!/usr/bin/env node
var path = require('path');
var fs 	= require('fs');

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

function set_password(context, cmd) {
    if (context.opts.cordova.platforms.indexOf('android') <= -1)
        return;

    var projectPath = context.opts.projectRoot;
    var sourcePath = path.join(projectPath, "platforms", "android", "src", "com", "ludei", "cipher", "android", "CocoonCipher.java");
    var source = fs.readFileSync(sourcePath, "utf8");

    var password = getPassword(context);
    password = password.replace(/["]/g,'\\"');

    source = source.replace(/String key =\s+[""][^"]+["]/g,
        'String key = ' + '"' + password + '"');
    fs.writeFileSync(sourcePath, source, "utf8");
    console.log("Cipher Android hook completed successfully")
}

module.exports = set_password;
