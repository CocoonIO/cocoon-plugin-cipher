package com.ludei.cipher.android;

import android.net.Uri;
import android.util.Log;
import android.webkit.URLUtil;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import org.apache.cordova.CordovaResourceApi;
import org.apache.cordova.LOG;
import org.apache.cordova.engine.SystemWebViewClient;
import org.apache.cordova.engine.SystemWebViewEngine;

import java.io.ByteArrayInputStream;
import java.io.DataInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;

import javax.crypto.Cipher;
import javax.crypto.CipherInputStream;
import javax.crypto.CipherOutputStream;
import javax.crypto.spec.SecretKeySpec;

/**
 * This class overrides the default System Webview Client to intercept the cordova.js requests.
 * This should be kept up to date as cordova-android is updated.
 */
public class CocoonCipherClient extends SystemWebViewClient {


    private byte[] raw;
    public CocoonCipherClient(SystemWebViewEngine parentEngine, byte[] raw) {
        super(parentEngine);
        this.raw = raw;
    }
    /**
     * Our code here is the cordova interception section. The rest of the code has been copied
     * from the cordova-android SystemWebViewClient class.
     */
    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
        try {
            CordovaResourceApi resourceApi = parentEngine.getCordovaWebView().getResourceApi();
            Uri origUri = Uri.parse(url);
            // Allow plugins to intercept WebView requests.
            Uri remappedUri = resourceApi.remapUri(origUri);

            //Only try to decipher local files
            if (URLUtil.isNetworkUrl(remappedUri.toString())) {
                return super.shouldInterceptRequest(view, url);
            }

            //check if ciphered file exits
            Uri ciphered = Uri.parse(remappedUri.toString() + ".cdf");
            CordovaResourceApi.OpenForReadResult data = resourceApi.openForRead(ciphered, true);

            //Decipher
            SecretKeySpec skeySpec = new SecretKeySpec(raw, "AES");
            Cipher cipher = Cipher.getInstance("AES"); //"AES/ECB/PKCS7Padding");
            cipher.init(Cipher.DECRYPT_MODE, skeySpec);
            return new WebResourceResponse(null, null, new CipherInputStream(data.inputStream, cipher));
        }
        catch (FileNotFoundException e) {
            //Ciphered file doesn't exist
            return super.shouldInterceptRequest(view, url);
        }
        catch (Exception e) {
            LOG.e("Cocoon", "Error occurred while loading a file (returning a 404).", e);
            return super.shouldInterceptRequest(view, url);
        }
    }
}
