/// App-wide constants
class AppConstants {
  AppConstants._();

  static const String appName = 'TukangNDeso';
  static const String appTagline = 'Tukang Terdekat, Harga Transparan';

  // OTP
  static const int otpLength = 6;
  static const int otpResendSeconds = 60;

  // Pricing
  static const int hourlyRate = 30000;
  static const int dailyRate = 150000;
  static const int minHours = 2;
  static const int costPerKm = 1000;
  static const int maxServiceRadiusKm = 25;

  // Upload
  static const int maxImageSizeMB = 5;
  static const List<String> allowedImageTypes = ['jpg', 'jpeg', 'png', 'webp'];

  // Map
  static const double defaultLat = -7.47; // Mojokerto Kabupaten center
  static const double defaultLng = 112.55;
  static const double defaultZoom = 14;

  // Bounding Box (Mojokerto Kabupaten)
  static const double minLat = -7.60;
  static const double maxLat = -7.35;
  static const double minLng = 112.35;
  static const double maxLng = 112.75;

  // Matching
  static const int matchingTimeoutSeconds = 60;

  // Polling intervals
  static const int orderPollingMs = 5000; // 5 seconds
  static const int workerLocationPollingMs = 10000; // 10 seconds
}
