/// Application configuration — environment-based settings.
class AppConfig {
  AppConfig._();

  static late final String baseUrl;
  static late final String environment;

  static Future<void> initialize() async {
    // In production, use flavor-based configuration.
    // For now, default to development.
    environment = const String.fromEnvironment(
      'ENV',
      defaultValue: 'development',
    );

    baseUrl = switch (environment) {
      'production' => 'https://api.tukangndeso.id/v1',
      'staging' => 'https://staging-api.tukangndeso.id/v1',
      _ => 'http://10.0.2.2:3000/v1', // Android emulator localhost
    };
  }

  static bool get isDevelopment => environment == 'development';
  static bool get isProduction => environment == 'production';
}
