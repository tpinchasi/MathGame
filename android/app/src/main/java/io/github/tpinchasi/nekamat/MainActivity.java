package io.github.tpinchasi.nekamat;

import android.app.Activity;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.window.OnBackInvokedDispatcher;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Collections;

/** Shows the game, which is bundled in the app's assets, in a full-window WebView. */
public class MainActivity extends Activity {
    // The assets are served to the WebView under this https address (reserved by Google for
    // exactly this use), so ES modules and localStorage behave as on a real site.
    private static final String HOST = "appassets.androidplatform.net";
    private static final int SPACE = 0xFF0B1030;

    private WebView web;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        web.setBackgroundColor(SPACE);

        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true); // progress is kept in localStorage
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setSupportZoom(false);
        settings.setTextZoom(100); // the layout is sized in the page; ignore the system font scale

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if (!HOST.equals(url.getHost())) return notFound();
                String path = url.getPath();
                if (path == null || path.isEmpty() || path.equals("/")) path = "/index.html";
                try {
                    InputStream in = getAssets().open(path.substring(1));
                    String type = mimeType(path);
                    return new WebResourceResponse(type, type.startsWith("text/") ? "utf-8" : null, in);
                } catch (IOException e) {
                    return notFound();
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !HOST.equals(request.getUrl().getHost()); // never leave the game
            }
        });

        // From Android 15 the window is drawn edge to edge. The game is kept clear of the
        // system bars and screen cutouts, and the space colour shows behind them.
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(SPACE);
        root.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            int[] p = Build.VERSION.SDK_INT >= 30 ? Api30.barInsets(insets) : new int[] {
                    insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom()};
            view.setPadding(p[0], p[1], p[2], p[3]);
            return insets;
        });
        setContentView(root);
        if (Build.VERSION.SDK_INT >= 33) Api33.handleBack(this);

        if (state == null) web.loadUrl("https://" + HOST + "/index.html");
        else web.restoreState(state);
    }

    private static WebResourceResponse notFound() {
        return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found",
                Collections.<String, String>emptyMap(), new ByteArrayInputStream(new byte[0]));
    }

    private static String mimeType(String path) {
        if (path.endsWith(".html")) return "text/html";
        if (path.endsWith(".js")) return "text/javascript";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".txt")) return "text/plain";
        if (path.endsWith(".svg")) return "image/svg+xml";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".woff2")) return "font/woff2";
        if (path.endsWith(".json")) return "application/json";
        return "application/octet-stream";
    }

    // The back button walks back through the game's screens before leaving the app.
    private void back() {
        if (web.canGoBack()) web.goBack();
        else finish();
    }

    // Android 12 and older; newer versions use the callback registered in Api33.
    @Override
    public void onBackPressed() {
        back();
    }

    // Newer platform classes are kept in their own holders so older devices never load them.
    private static final class Api30 {
        static int[] barInsets(WindowInsets insets) {
            android.graphics.Insets i = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
            return new int[] {i.left, i.top, i.right, i.bottom};
        }
    }

    private static final class Api33 {
        static void handleBack(MainActivity activity) {
            activity.getOnBackInvokedDispatcher().registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT, activity::back);
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onPause() {
        web.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }
}
