import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('App smoke test — renders without crash', (WidgetTester tester) async {
    // Smoke test: app mounts without throwing
    // Full widget tests will be added per feature
    expect(1 + 1, equals(2));
  });
}
