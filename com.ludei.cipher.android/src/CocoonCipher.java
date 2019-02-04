package com.ludei.cipher.android;

import android.webkit.WebView;

import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaWebViewEngine;
import org.apache.cordova.engine.SystemWebViewEngine;

import java.lang.reflect.Method;

public class CocoonCipher extends CordovaPlugin  {

    public static final String CANVASPLUS_CLASS = "com.ludei.canvasplus.CanvasPlusEngine";
    public static final String WEBVIEWPLUS_CLASS = "org.crosswalk.engine.XWalkWebViewEngine";
    public static final String SYSTEM_WEBVIEW_CLASS = "org.apache.cordova.engine.SystemWebViewEngine";

    @Override
    protected void pluginInitialize() {


        String key = "injected_from_hook";
        byte[] passwordBytes = key.getBytes();
        byte[] rawKey = new byte[16];
        for (int i = 0; i < rawKey.length; i++) rawKey[i] = 0;
        for (int i = 0; i < passwordBytes.length && i < rawKey.length; i++)
        {
            rawKey[i] = (byte)(0xFF & passwordBytes[i]);
        }

        // Intercept URL loading to load the correct cordova.js files
        try {
            CordovaWebViewEngine engine = this.webView.getEngine();
            if (engine.getClass().getCanonicalName().equalsIgnoreCase(WEBVIEWPLUS_CLASS)) {
                Class clazz = Class.forName("com.ludei.webviewplus.android.CocoonXWalk");
                Method m = clazz.getMethod("setCipherClient", CordovaWebViewEngine.class, byte[].class);
                m.invoke(null, engine, rawKey);

            }
            else if (engine.getClass().getCanonicalName().equalsIgnoreCase(SYSTEM_WEBVIEW_CLASS)) {
                WebView systemWebView = ((WebView) engine.getView());
                systemWebView.setWebViewClient(new CocoonCipherClient((SystemWebViewEngine)engine, rawKey));
            }
            else if (engine.getClass().getCanonicalName().equalsIgnoreCase(CANVASPLUS_CLASS)) {
                Method method = engine.getClass().getMethod("setDecipher", String.class);
                method.invoke(engine, key);
            }

            // Clean the webview cache before launching (Crosswalks doesn't do this internally and you never get the new content)
            engine.clearCache();

        } catch (Exception e) {
            e.printStackTrace();
        }

    }
}