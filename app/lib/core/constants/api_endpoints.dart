/// All API endpoint paths centralized.
class ApiEndpoints {
  ApiEndpoints._();

  // Auth
  static const String otpRequest = '/auth/otp/request';
  static const String otpVerify = '/auth/otp/verify';
  static const String register = '/auth/register';
  static const String refresh = '/auth/refresh';
  static const String logout = '/auth/logout';

  // User
  static const String me = '/me';
  static const String addresses = '/me/addresses';
  static String addressById(String id) => '/me/addresses/$id';

  // Services
  static const String categories = '/categories';
  static String servicesByCategory(String code) => '/categories/$code/services';
  static String serviceById(String id) => '/services/$id';

  // Pricing
  static const String pricingEstimate = '/pricing/estimate';

  // Orders (Customer)
  static const String orders = '/orders';
  static String orderById(String id) => '/orders/$id';
  static String cancelOrder(String id) => '/orders/$id/cancel';
  static String confirmOrder(String id) => '/orders/$id/confirm';
  static String payOrder(String id) => '/orders/$id/pay';
  static String reviewOrder(String id) => '/orders/$id/review';

  // Orders (Worker)
  static const String workerIncoming = '/worker/orders/incoming';
  static const String workerActive = '/worker/orders/active';
  static const String workerHistory = '/worker/orders/history';
  static String workerAccept(String id) => '/worker/orders/$id/accept';
  static String workerReject(String id) => '/worker/orders/$id/reject';
  static String workerEnroute(String id) => '/worker/orders/$id/enroute';
  static String workerArrive(String id) => '/worker/orders/$id/arrive';
  static String workerStart(String id) => '/worker/orders/$id/start';
  static String workerComplete(String id) => '/worker/orders/$id/complete';

  // Worker Profile
  static const String workerRegister = '/worker/register';
  static const String workerProfile = '/worker/profile';
  static const String workerAvailability = '/worker/availability';
  static const String workerWallet = '/worker/wallet';
  static const String workerWithdraw = '/worker/wallet/withdraw';

  // Payments
  static const String createQris = '/payments/qris/create';
  static String paymentStatus(String id) => '/payments/$id/status';

  // Upload
  static const String uploadImage = '/upload/image';
}
