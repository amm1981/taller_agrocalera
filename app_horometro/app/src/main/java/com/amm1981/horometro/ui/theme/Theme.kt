package com.amm1981.horometro.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = Color(0xFF34D399),
    secondary = Color(0xFFA7F3D0),
    tertiary = Color(0xFFFBBF24),
    background = Color(0xFF07130F),
    surface = Color(0xFF0F1F1A),
    onPrimary = Color(0xFF052E16),
    onSecondary = Color(0xFF052E16),
    onTertiary = Color(0xFF422006),
    onBackground = Color(0xFFE5F4EC),
    onSurface = Color(0xFFE5F4EC),
)

private val LightColorScheme = lightColorScheme(
    primary = Color(0xFF087A3D),
    secondary = Color(0xFFDFF3E6),
    tertiary = Color(0xFFF59E0B),
    background = Color(0xFFF6F8F7),
    surface = Color.White,
    onPrimary = Color.White,
    onSecondary = Color(0xFF064E3B),
    onTertiary = Color.White,
    onBackground = Color(0xFF0F172A),
    onSurface = Color(0xFF0F172A),
)

@Composable
fun HorometroTheme(
    darkTheme: Boolean = false,
    // Dynamic color is available on Android 12+
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }

        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
