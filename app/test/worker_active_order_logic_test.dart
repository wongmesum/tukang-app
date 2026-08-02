import 'package:flutter_test/flutter_test.dart';
import 'package:tukangndeso/features/worker/worker_active_order_screen.dart';

void main() {
  group('nextActionFor', () {
    test('maps each active order status to the correct action', () {
      expect(nextActionFor('ACCEPTED'), (endpoint: 'enroute', label: 'Berangkat'));
      expect(nextActionFor('EN_ROUTE'), (endpoint: 'arrive', label: 'Saya Sudah Tiba'));
      expect(nextActionFor('ARRIVED'), (endpoint: 'start', label: 'Mulai Kerja'));
      expect(nextActionFor('IN_PROGRESS'), (endpoint: 'complete', label: 'Selesai'));
    });

    test('returns null for terminal and unsupported statuses', () {
      expect(nextActionFor('COMPLETED'), isNull);
      expect(nextActionFor('PAID'), isNull);
      expect(nextActionFor('UNKNOWN'), isNull);
    });
  });

  group('formatDuration', () {
    test('formats durations shorter than one hour as MM:SS', () {
      expect(formatDuration(const Duration(seconds: 65)), '01:05');
    });

    test('formats durations of at least one hour as HH:MM:SS', () {
      expect(formatDuration(const Duration(hours: 1, seconds: 5)), '01:00:05');
    });

    test('does not display negative durations', () {
      expect(formatDuration(const Duration(seconds: -1)), '00:00');
    });
  });

  test('mapsUrlFor builds a Google Maps directions URL', () {
    expect(
      mapsUrlFor(-7.47, 112.43),
      'https://www.google.com/maps/dir/?api=1&destination=-7.47,112.43',
    );
  });
}
