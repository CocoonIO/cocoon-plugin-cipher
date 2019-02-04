#!/usr/bin/env node
var path = require('path');
var fs 	= require('fs');

function getPassword(context) {
    //Get PASSWORD from fetch.json file. Is there a better way to get a plugin parameter value from a hook?
    var jsonPath = path.join(context.opts.projectRoot, 'plugins', 'fetch.json');
    var json = require(jsonPath);
    var password = undefined;
    if (json['com.ludei.cipher.ios'] && json['com.ludei.cipher.ios'].variables)
        password = json['com.ludei.cipher.ios'].variables['PASSWORD'];
    if (!password)
        password = json['com.ludei.cipher'].variables['PASSWORD'];

    return decodeURIComponent(password);
}

function set_password(context, cmd) {
    if (context.opts.cordova.platforms.indexOf('ios') <= -1)
        return;

    var project_path = context.opts.projectRoot;
    var platform_path = path.join(project_path, "platforms", "ios");
    var folderContent = fs.readdirSync(platform_path);
    var xcodeproj_path = folderContent.filter(function(item){ return item.indexOf("xcodeproj") !== -1; })[0];
    var index = xcodeproj_path.lastIndexOf(".");
    var xcodeproj_name = xcodeproj_path.substring(0,index);

    if (!xcodeproj_path) {
        throw new Error("Cannot find a valid 'xcodeproj' inside " + platform_path);
    }

    var source_path = path.join(platform_path, xcodeproj_name, "plugins", "com.ludei.cipher.ios", "CocoonCipher.m");
    var source = fs.readFileSync(source_path, "utf8");

    var password = getPassword(context);
    password = password.replace(/["]/g,'\\"');

    source = source.replace(/#define CIPHER_PASSWORD\s+[""][^"]+["]/g,
        '#define CIPHER_PASSWORD ' + '"' + password + '"');
    fs.writeFileSync(source_path, source, "utf8");
    console.log("Cipher iOS hook completed successfully")
}

module.exports = set_password;
