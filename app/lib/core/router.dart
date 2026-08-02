import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'auth_state.dart';
import 'models.dart';
import '../features/splash/splash_screen.dart';
import '../features/landing/landing_screen.dart';
import '../features/auth/phone_input_screen.dart';
import '../features/auth/otp_verify_screen.dart';
import '../features/home/home_screen.dart';
import '../features/booking/service_list_screen.dart';
import '../features/booking/booking_form_screen.dart';
import '../features/booking/estimate_screen.dart';
import '../features/booking/searching_worker_screen.dart';
import '../features/booking/order_tracking_screen.dart';
import '../features/profile/profile_screen.dart';
import '../features/profile/order_history_screen.dart';
import '../features/payment/payment_qris_screen.dart';
import '../features/review/review_screen.dart';
import '../features/worker/worker_register_screen.dart';
import '../features/worker/worker_dashboard_screen.dart';
import '../features/worker/worker_wallet_screen.dart';
import '../features/worker/worker_active_order_screen.dart';
import '../features/worker/incoming_order_screen.dart';

import 'main_shell.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final isLoggedIn = ref.watch(isLoggedInProvider);

  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final onAuth = state.matchedLocation.startsWith('/auth');
      final onSplash = state.matchedLocation == '/';
      final onLanding = state.matchedLocation == '/landing';

      if (!isLoggedIn && !onAuth && !onSplash && !onLanding) {
        return '/landing';
      }
      if (isLoggedIn && (onAuth || onLanding)) return '/home';
      return null;
    },
    routes: [
      GoRoute(path: '/', builder: (context, state) => const SplashScreen()),
      GoRoute(
        path: '/landing',
        builder: (context, state) => const LandingScreen(),
      ),
      GoRoute(path: '/auth/phone', builder: (context, state) => const PhoneInputScreen()),
      GoRoute(
        path: '/auth/otp',
        builder: (context, state) => OtpVerifyScreen(phone: state.extra as String? ?? ''),
      ),

      // Customer Main Shell
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) => MainShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(path: '/home', builder: (context, state) => const HomeScreen()),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(path: '/profile/orders', builder: (context, state) => const OrderHistoryScreen()),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(path: '/profile', builder: (context, state) => const ProfileScreen()),
            ],
          ),
        ],
      ),

      // Booking flow (Outside shell so they can be full screen and push/pop naturally)
      GoRoute(
        path: '/services/:code',
        builder: (context, state) {
          final code = state.pathParameters['code'] ?? '';
          final name = state.uri.queryParameters['name'] ?? code;
          return ServiceListScreen(categoryCode: code, categoryName: name);
        },
      ),
      GoRoute(
        path: '/booking/form',
        builder: (context, state) => BookingFormScreen(service: state.extra as ServiceItem),
      ),
      GoRoute(
        path: '/booking/estimate',
        builder: (context, state) {
          final args = state.extra as Map<String, dynamic>;
          return EstimateScreen(
            estimate: args['estimate'] as PricingEstimate,
            service: args['service'] as ServiceItem,
            scheme: args['scheme'] as String,
            duration: args['duration'] as int,
            description: args['description'] as String,
          );
        },
      ),
      GoRoute(
        path: '/orders/:id/searching',
        builder: (context, state) => SearchingWorkerScreen(orderId: state.pathParameters['id'] ?? ''),
      ),
      GoRoute(
        path: '/orders/:id/tracking',
        builder: (context, state) => OrderTrackingScreen(orderId: state.pathParameters['id'] ?? ''),
      ),
      GoRoute(
        path: '/orders/:id/payment',
        builder: (context, state) => PaymentQrisScreen(orderId: state.pathParameters['id'] ?? ''),
      ),
      GoRoute(
        path: '/orders/:id/review',
        builder: (context, state) => ReviewScreen(orderId: state.pathParameters['id'] ?? ''),
      ),

      // Worker mode

      GoRoute(path: '/worker/register', builder: (context, state) => const WorkerRegisterScreen()),
      GoRoute(path: '/worker/dashboard', builder: (context, state) => const WorkerDashboardScreen()),
      GoRoute(path: '/worker/wallet', builder: (context, state) => const WorkerWalletScreen()),
      GoRoute(
        path: '/worker/incoming/:id',
        builder: (context, state) => IncomingOrderScreen(orderId: state.pathParameters['id'] ?? ''),
      ),
      GoRoute(
        path: '/worker/orders/:id',
        builder: (context, state) => WorkerActiveOrderScreen(orderId: state.pathParameters['id'] ?? ''),
      ),
    ],
  );
});
