import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:tukangndeso/core/config/app_config.dart';
import 'package:tukangndeso/core/theme/app_theme.dart';
import 'package:tukangndeso/core/config/router.dart';
import 'package:tukangndeso/services/push/push_notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await AppConfig.initialize();

  // Firebase must be ready before any messaging call. Wrapped because a
  // missing google-services.json / GoogleService-Info.plist would otherwise
  // stop the whole app from starting — push is not worth blocking launch for.
  try {
    await Firebase.initializeApp();
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
  } catch (error) {
    debugPrint('[Firebase] Initialization skipped: $error');
  }

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
