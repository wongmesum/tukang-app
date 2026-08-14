import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tukangndeso/core/config/app_config.dart';
import 'package:tukangndeso/core/theme/app_theme.dart';
import 'package:tukangndeso/core/config/router.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize app configuration
  await AppConfig.initialize();

  runApp(
    const ProviderScope(
      child: TukangNDesoApp(),
    ),
  );
}

class TukangNDesoApp extends ConsumerWidget {
  const TukangNDesoApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'TukangNDeso',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      routerConfig: router,
      locale: const Locale('id', 'ID'),
    );
  }
}
