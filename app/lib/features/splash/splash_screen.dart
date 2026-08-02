import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth_state.dart';
import '../../core/theme.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _navigate();
  }

  Future<void> _navigate() async {
    await Future<void>.delayed(const Duration(seconds: 1));
    if (!mounted) return;

    final isLoggedIn = ref.read(isLoggedInProvider);
    if (isLoggedIn) {
      context.go('/home');
    } else {
      context.go('/landing');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.primary,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.build_circle_outlined,
              size: 80,
              color: Colors.white,
            ),
            const SizedBox(height: AppSpacing.l),
            Text(
              'TukangNDeso',
              style: Theme.of(context).textTheme.displayLarge?.copyWith(
                    color: Colors.white,
                    fontSize: 36,
                  ),
            ),
            const SizedBox(height: AppSpacing.s),
            Text(
              'Jasa tukang terpercaya di Mojokerto',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.white70,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}
