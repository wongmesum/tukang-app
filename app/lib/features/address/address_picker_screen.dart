import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Result returned when user picks an address
class PickedAddress {
  final double lat;
  final double lng;
  final String fullAddress;
  final String district;
  final String city;

  const PickedAddress({
    required this.lat,
    required this.lng,
    required this.fullAddress,
    required this.district,
    required this.city,
  });
}

/// Interactive map-based address picker.
/// Uses a crosshair pin in the center; user drags the map to position.
/// In production, replace the placeholder with Google Maps widget.
class AddressPickerScreen extends StatefulWidget {
  final double? initialLat;
  final double? initialLng;

  const AddressPickerScreen({super.key, this.initialLat, this.initialLng});

  @override
  State<AddressPickerScreen> createState() => _AddressPickerScreenState();
}

class _AddressPickerScreenState extends State<AddressPickerScreen> {
  late double _lat;
  late double _lng;
  String _address = 'Geser peta untuk memilih lokasi...';
  final TextEditingController _searchController = TextEditingController();
  bool _isSearching = false;

  // Mojokerto center default
  static const _defaultLat = -7.4724;
  static const _defaultLng = 112.4341;

  @override
  void initState() {
    super.initState();
    _lat = widget.initialLat ?? _defaultLat;
    _lng = widget.initialLng ?? _defaultLng;
    _reverseGeocode();
  }

  // Simulate reverse geocoding — in production use Google Geocoding API
  Future<void> _reverseGeocode() async {
    await Future.delayed(const Duration(milliseconds: 500));
    if (mounted) {
      setState(() {
        _address = 'Jl. Raya Mojosari, Kec. Mojosari, Kab. Mojokerto, Jawa Timur';
      });
    }
  }

  void _onMapTap(Offset position, Size size) {
    // Simulate map drag by offsetting coordinates slightly
    setState(() {
      _lat += (position.dy - size.height / 2) * 0.00001;
      _lng += (position.dx - size.width / 2) * 0.00001;
    });
    _reverseGeocode();
  }

  void _confirmLocation() {
    final result = PickedAddress(
      lat: _lat,
      lng: _lng,
      fullAddress: _address,
      district: 'Mojosari',
      city: 'Mojokerto',
    );
    context.pop(result);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Pilih Lokasi'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(56),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Cari alamat...',
                prefixIcon: const Icon(Icons.search, size: 20),
                suffixIcon: _isSearching
                    ? const SizedBox(width: 20, height: 20, child: Padding(padding: EdgeInsets.all(12), child: CircularProgressIndicator(strokeWidth: 2)))
                    : null,
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
              ),
              onSubmitted: (query) {
                // Simulate search
                setState(() => _isSearching = true);
                Future.delayed(const Duration(seconds: 1), () {
                  if (mounted) {
                    setState(() {
                      _isSearching = false;
                      _address = '$query, Mojokerto, Jawa Timur';
                    });
                  }
                });
              },
            ),
          ),
        ),
      ),
      body: Stack(
        children: [
          // Map placeholder
          GestureDetector(
            onTapUp: (details) => _onMapTap(details.localPosition, MediaQuery.of(context).size),
            child: Container(
              width: double.infinity,
              height: double.infinity,
              color: const Color(0xFFE8F0E8),
              child: Stack(
                children: [
                  // Grid lines to simulate map
                  CustomPaint(
                    size: Size.infinite,
                    painter: _MapGridPainter(),
                  ),
                  // Map label
                  Positioned(
                    top: 16,
                    left: 16,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(8),
                        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 4)],
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.map, size: 14, color: Colors.grey),
                          const SizedBox(width: 6),
                          Text(
                            'Google Maps (placeholder)',
                            style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                          ),
                        ],
                      ),
                    ),
                  ),
                  // Center coordinates display
                  Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(6),
                            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 4)],
                          ),
                          child: Text(
                            '${_lat.toStringAsFixed(4)}, ${_lng.toStringAsFixed(4)}',
                            style: const TextStyle(fontSize: 11, fontFamily: 'monospace'),
                          ),
                        ),
                        const SizedBox(height: 4),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Center pin (always in the middle)
          const Center(
            child: Padding(
              padding: EdgeInsets.only(bottom: 36),
              child: Icon(Icons.location_pin, size: 48, color: Color(0xFFFF6B35)),
            ),
          ),

          // GPS button
          Positioned(
            right: 16,
            bottom: 180,
            child: FloatingActionButton.small(
              heroTag: 'gps',
              onPressed: () {
                // Simulate getting current GPS location
                setState(() {
                  _lat = _defaultLat;
                  _lng = _defaultLng;
                });
                _reverseGeocode();
              },
              backgroundColor: Colors.white,
              child: const Icon(Icons.my_location, color: Color(0xFF2C3E50)),
            ),
          ),

          // Bottom card with address + confirm button
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 10, offset: const Offset(0, -2))],
              ),
              child: SafeArea(
                top: false,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.location_on, color: Color(0xFFFF6B35), size: 20),
                        const SizedBox(width: 8),
                        const Text('Lokasi Terpilih', style: TextStyle(fontWeight: FontWeight.w600)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _address,
                      style: TextStyle(color: Colors.grey[700], fontSize: 14, height: 1.4),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _confirmLocation,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFFF6B35),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: const Text('Konfirmasi Lokasi', style: TextStyle(fontWeight: FontWeight.w600)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MapGridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.green.withOpacity(0.15)
      ..strokeWidth = 0.5;

    // Draw grid
    for (double x = 0; x < size.width; x += 40) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (double y = 0; y < size.height; y += 40) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }

    // Draw some "roads"
    final roadPaint = Paint()
      ..color = Colors.white.withOpacity(0.8)
      ..strokeWidth = 3;
    canvas.drawLine(Offset(0, size.height * 0.4), Offset(size.width, size.height * 0.4), roadPaint);
    canvas.drawLine(Offset(size.width * 0.3, 0), Offset(size.width * 0.3, size.height), roadPaint);
    canvas.drawLine(Offset(size.width * 0.7, 0), Offset(size.width * 0.7, size.height), roadPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
