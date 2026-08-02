import 'package:flutter/material.dart';

/// Design system constants — see docs/05-app-screens.md
class AppColors {
  static const Color primary = Color(0xFFFF6B35);
  static const Color secondary = Color(0xFF2C3E50);
  static const Color success = Color(0xFF27AE60);
  static const Color warning = Color(0xFFF39C12);
  static const Color danger = Color(0xFFE74C3C);
  static const Color background = Color(0xFFF8F9FA);
  static const Color textPrimary = Color(0xFF2C3E50);
  static const Color textSecondary = Color(0xFF7F8C8D);
  static const Color line = Color(0xFFDFE8E1);

  const AppColors._();
}

class AppRadius {
  static const double small = 8;
  static const double medium = 12;
  static const double pill = 24;

  const AppRadius._();
}

class AppSpacing {
  static const double xs = 4;
  static const double s = 8;
  static const double m = 12;
  static const double l = 16;
  static const double xl = 24;
  static const double xxl = 32;

  const AppSpacing._();
}

ThemeData buildAppTheme() {
  return ThemeData(
    useMaterial3: true,
    scaffoldBackgroundColor: AppColors.background,
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.primary,
      primary: AppColors.primary,
      secondary: AppColors.secondary,
      error: AppColors.danger,
    ),
    textTheme: const TextTheme(
      displayLarge: TextStyle(
        fontWeight: FontWeight.w800,
        color: AppColors.textPrimary,
        letterSpacing: -0.5,
      ),
      titleLarge: TextStyle(
        fontWeight: FontWeight.w700,
        color: AppColors.textPrimary,
      ),
      bodyLarge: TextStyle(color: AppColors.textPrimary),
      bodyMedium: TextStyle(color: AppColors.textSecondary),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.xl,
          vertical: AppSpacing.m,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.pill),
        ),
        textStyle: const TextStyle(
          fontWeight: FontWeight.w700,
          fontSize: 15,
        ),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.l,
        vertical: AppSpacing.m,
      ),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.medium),
        borderSide: const BorderSide(color: AppColors.line),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.medium),
        borderSide: const BorderSide(color: AppColors.primary, width: 2),
      ),
    ),
    cardTheme: CardTheme(
      elevation: 0,
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.medium),
        side: const BorderSide(color: AppColors.line),
      ),
    ),
  );
}
