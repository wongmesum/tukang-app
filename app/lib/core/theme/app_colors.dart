import 'package:flutter/material.dart';

/// TukangNDeso Design System — Colors
/// Primary: oranye (energik, kerja lapangan)
/// Secondary: navy (profesional)
class AppColors {
  AppColors._();

  // Brand Colors
  static const Color primary = Color(0xFFFF6B35);
  static const Color primaryLight = Color(0xFFFF9A6C);
  static const Color primaryDark = Color(0xFFE05520);
  static const Color secondary = Color(0xFF2C3E50);
  static const Color secondaryLight = Color(0xFF3D5266);

  // Semantic Colors
  static const Color success = Color(0xFF27AE60);
  static const Color warning = Color(0xFFF39C12);
  static const Color danger = Color(0xFFE74C3C);
  static const Color info = Color(0xFF3498DB);

  // Neutral Colors
  static const Color background = Color(0xFFF8F9FA);
  static const Color surface = Colors.white;
  static const Color border = Color(0xFFE0E0E0);
  static const Color divider = Color(0xFFEEEEEE);

  // Text Colors
  static const Color textPrimary = Color(0xFF2C3E50);
  static const Color textSecondary = Color(0xFF7F8C8D);
  static const Color textHint = Color(0xFFBDC3C7);
  static const Color textOnPrimary = Colors.white;

  // Status Colors for Orders
  static const Color statusPending = Color(0xFFF39C12);
  static const Color statusMatched = Color(0xFF3498DB);
  static const Color statusAccepted = Color(0xFF2980B9);
  static const Color statusEnRoute = Color(0xFF8E44AD);
  static const Color statusArrived = Color(0xFF16A085);
  static const Color statusInProgress = Color(0xFF27AE60);
  static const Color statusCompleted = Color(0xFF27AE60);
  static const Color statusPaid = Color(0xFF2ECC71);
  static const Color statusCancelled = Color(0xFFE74C3C);
  static const Color statusDisputed = Color(0xFFC0392B);
}
