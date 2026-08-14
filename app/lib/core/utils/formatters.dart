import 'package:intl/intl.dart';

/// Number & date formatters for Indonesian locale
class Formatters {
  Formatters._();

  /// Format Rupiah: Rp 102.000
  static String rupiah(int amount) {
    final formatter = NumberFormat.currency(
      locale: 'id_ID',
      symbol: 'Rp ',
      decimalDigits: 0,
    );
    return formatter.format(amount);
  }

  /// Format distance: 12,4 km
  static String distance(double km) {
    if (km < 1) {
      return '${(km * 1000).round()} m';
    }
    return '${km.toStringAsFixed(1)} km';
  }

  /// Format date: 30 Jul 2026
  static String date(DateTime dateTime) {
    return DateFormat('d MMM yyyy', 'id_ID').format(dateTime);
  }

  /// Format time: 14:30
  static String time(DateTime dateTime) {
    return DateFormat('HH:mm', 'id_ID').format(dateTime);
  }

  /// Format datetime: 30 Jul 2026, 14:30
  static String dateTime(DateTime dateTime) {
    return DateFormat('d MMM yyyy, HH:mm', 'id_ID').format(dateTime);
  }

  /// Format phone: 0812-3456-7890
  static String phone(String raw) {
    final cleaned = raw.replaceAll(RegExp(r'[^\d]'), '');
    if (cleaned.length >= 12) {
      return '${cleaned.substring(0, 4)}-${cleaned.substring(4, 8)}-${cleaned.substring(8)}';
    }
    return raw;
  }

  /// Format duration: "3 jam" or "1 hari"
  static String duration(int value, String scheme) {
    if (scheme == 'daily') {
      return '$value hari';
    }
    return '$value jam';
  }

  /// Format rating: 4.5
  static String rating(double value) {
    return value.toStringAsFixed(1);
  }
}
