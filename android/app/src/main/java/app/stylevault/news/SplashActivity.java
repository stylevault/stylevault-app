package app.stylevault.news;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.animation.Animation;
import android.view.animation.AnimationUtils;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

public class SplashActivity extends AppCompatActivity {

    private static final int SPLASH_DURATION_MS = 3500;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private boolean isNavigating = false;
    private Runnable navigateRunnable;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_splash);

        ImageView logo = findViewById(R.id.splash_logo);
        TextView title = findViewById(R.id.splash_title);
        TextView tagline = findViewById(R.id.splash_tagline);
        View root = findViewById(R.id.splash_content);

        // Load animations
        Animation logoAnim = AnimationUtils.loadAnimation(this, R.anim.logo_anim);
        Animation titleAnim = AnimationUtils.loadAnimation(this, R.anim.title_anim);
        Animation taglineAnim = AnimationUtils.loadAnimation(this, R.anim.tagline_anim);

        // Start animations
        if (logo != null) logo.startAnimation(logoAnim);
        if (title != null) title.startAnimation(titleAnim);
        if (tagline != null) tagline.startAnimation(taglineAnim);

        navigateRunnable = this::navigateToMain;

        // Schedule transition after leisurely readable duration
        handler.postDelayed(navigateRunnable, SPLASH_DURATION_MS);

        // Allow tapping to proceed immediately if user wishes
        if (root != null) {
            root.setOnClickListener(v -> navigateToMain());
        }
    }

    private void navigateToMain() {
        if (isNavigating) return;
        isNavigating = true;

        handler.removeCallbacks(navigateRunnable);

        Intent intent = new Intent(SplashActivity.this, MainActivity.class);
        startActivity(intent);
        overridePendingTransition(R.anim.fade_in, R.anim.fade_out);
        finish();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (navigateRunnable != null) {
            handler.removeCallbacks(navigateRunnable);
        }
    }
}

