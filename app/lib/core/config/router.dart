import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:tukangndeso/features/auth/presentation/screens/splash_screen.dart';
import 'package:tukangndeso/features/auth/presentation/screens/phone_input_screen.dart';
import 'package:tukangndeso/features/auth/presentation/screens/otp_verify_screen.dart';
import 'package:tukangndeso/features/auth/presentation/screens/complete_profile_screen.dart';
import 'package:tukangndeso/features/home/presentation/screens/home_screen.dart';
import 'package:tukangndeso/features/home/presentation/screens/category_list_screen.dart';
import 'package:tukangndeso/features/home/presentation/screens/service_list_screen.dart';
import 'package:tukangndeso/features/booking/presentation/screens/booking_form_screen.dart';
import 'package:tukangndeso/features/booking/presentation/screens/price_estimate_screen.dart';
import 'package:tukangndeso/features/booking/presentation/screens/searching_worker_screen.dart';
import 'package:tukangndeso/features/orders/presentation/screens/order_tracking_screen.dart';
import 'package:tukangndeso/features/orders/presentation/screens/order_history_screen.dart';
import 'package:tukangndeso/features/orders/presentation/screens/order_detail_screen.dart';
import 'package:tukangndeso/features/payments/presentation/screens/payment_screen.dart';
import 'package:tukangndeso/features/reviews/presentation/screens/review_screen.dart';
import 'package:tukangndeso/features/chat/presentation/screens/chat_screen.dart';
import 'package:tukangndeso/features/profile/presentation/screens/profile_screen.dart';
import 'package:tukangndeso/features/profile/presentation/screens/address_list_screen.dart';
import 'package:tukangndeso/features/worker/presentation/screens/worker_home_screen.dart';
import 'package:tukangndeso/features/worker/presentation/screens/worker_register_screen.dart';
import 'package:tukangndeso/features/worker/presentation/screens/incoming_order_screen.dart';
import 'package:tukangndeso/features/worker/presentation/screens/active_order_screen.dart';
import 'package:tukangndeso/features/worker/presentation/screens/worker_wallet_screen.dart';
import 'package:tukangndeso/core/widgets/main_shell.dart';

/// Route names for type-safe navigation
class Routes {
  Routes._();

  static const String splash = '/';
  static const String phoneInput = '/auth/phone';
  static const String otpVerify = '/auth/otp';
  static const String completeProfile = '/auth/profile';

  // Customer
  static const String home = '/home';
  static const String categories = '/categories';
  static const String services = '/categories/:code/services';
  static const String bookingForm = '/booking';
  static const String priceEstimate = '/booking/estimate';
  static const String searchingWorker = '/booking/searching';
  static const String orderTracking = '/orders/:id/tracking';
  static const String orderHistory = '/orders';
  static const String orderDetail = '/orders/:id';
  static const String payment = '/orders/:id/pay';
  static const String review = '/orders/:id/review';
  static const String chat = '/orders/:id/chat';
  static const String profile = '/profile';
  static const String addresses = '/profile/addresses';

  // Worker
  static const String workerHome = '/worker';
  static const String workerRegister = '/worker/register';
  static const String workerIncoming = '/worker/incoming';
  static const String workerActive = '/worker/active/:id';
  static const String workerWallet = '/worker/wallet';
}

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: Routes.splash,
    debugLogDiagnostics: true,
    routes: [
      // Auth routes
      GoRoute(
        path: Routes.splash,
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: Routes.phoneInput,
        builder: (context, state) => const PhoneInputScreen(),
      ),
      GoRoute(
        path: Routes.otpVerify,
        builder: (context, state) {
          final phone = state.extra as String? ?? '';
          return OtpVerifyScreen(phone: phone);
        },
      ),
      GoRoute(
        path: Routes.completeProfile,
        builder: (context, state) => const CompleteProfileScreen(),
      ),

      // Customer shell (with bottom nav)
      ShellRoute(
        builder: (context, state, child) => MainShell(child: child),
        routes: [
          GoRoute(
            path: Routes.home,
            builder: (context, state) => const HomeScreen(),
          ),
          GoRoute(
            path: Routes.orderHistory,
            builder: (context, state) => const OrderHistoryScreen(),
          ),
          GoRoute(
            path: Routes.profile,
            builder: (context, state) => const ProfileScreen(),
          ),
        ],
      ),

      // Standalone customer routes
      GoRoute(
        path: Routes.categories,
        builder: (context, state) => const CategoryListScreen(),
      ),
      GoRoute(
        path: Routes.services,
        builder: (context, state) {
          final code = state.pathParameters['code'] ?? '';
          return ServiceListScreen(categoryCode: code);
        },
      ),
      GoRoute(
        path: Routes.bookingForm,
        builder: (context, state) {
          final serviceId = state.extra as String? ?? '';
          return BookingFormScreen(serviceId: serviceId);
        },
      ),
      GoRoute(
        path: Routes.priceEstimate,
        builder: (context, state) => const PriceEstimateScreen(),
      ),
      GoRoute(
        path: Routes.searchingWorker,
        builder: (context, state) => const SearchingWorkerScreen(),
      ),
      GoRoute(
        path: Routes.orderTracking,
        builder: (context, state) {
          final id = state.pathParameters['id'] ?? '';
          return OrderTrackingScreen(orderId: id);
        },
      ),
      GoRoute(
        path: Routes.orderDetail,
        builder: (context, state) {
          final id = state.pathParameters['id'] ?? '';
          return OrderDetailScreen(orderId: id);
        },
      ),
      GoRoute(
        path: Routes.payment,
        builder: (context, state) {
          final id = state.pathParameters['id'] ?? '';
          return PaymentScreen(orderId: id);
        },
      ),
      GoRoute(
        path: Routes.review,
        builder: (context, state) {
          final id = state.pathParameters['id'] ?? '';
          return ReviewScreen(orderId: id);
        },
      ),
      GoRoute(
        path: Routes.chat,
        builder: (context, state) {
          final id = state.pathParameters['id'] ?? '';
          // Counterpart name is passed through so the app bar can show who
          // you're talking to without an extra request.
          final name = state.extra as String?;
          return ChatScreen(orderId: id, counterpartName: name);
        },
      ),
      GoRoute(
        path: Routes.addresses,
        builder: (context, state) => const AddressListScreen(),
      ),

      // Worker routes
      GoRoute(
        path: Routes.workerHome,
        builder: (context, state) => const WorkerHomeScreen(),
      ),
      GoRoute(
        path: Routes.workerRegister,
        builder: (context, state) => const WorkerRegisterScreen(),
      ),
      GoRoute(
        path: Routes.workerIncoming,
        builder: (context, state) => const IncomingOrderScreen(),
      ),
      GoRoute(
        path: Routes.workerActive,
        builder: (context, state) {
          final id = state.pathParameters['id'] ?? '';
          return ActiveOrderScreen(orderId: id);
        },
      ),
      GoRoute(
        path: Routes.workerWallet,
        builder: (context, state) => const WorkerWalletScreen(),
      ),
    ],
  );
});
