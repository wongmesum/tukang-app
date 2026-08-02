import 'package:flutter/material.dart';

enum PremiumServiceIcon {
  ac,
  building,
  electric,
  plumbing,
  welding,
  carpentry,
  cleaning,
  painting,
  garden,
  generic,
}

PremiumServiceIcon premiumIconFromCategoryCode(String code) {
  switch (code.toUpperCase()) {
    case 'AC':
      return PremiumServiceIcon.ac;
    case 'BGN':
      return PremiumServiceIcon.building;
    case 'LST':
      return PremiumServiceIcon.electric;
    case 'PLB':
      return PremiumServiceIcon.plumbing;
    case 'LAS':
      return PremiumServiceIcon.welding;
    case 'TKY':
      return PremiumServiceIcon.carpentry;
    case 'CLN':
      return PremiumServiceIcon.cleaning;
    case 'CAT':
      return PremiumServiceIcon.painting;
    case 'TNM':
      return PremiumServiceIcon.garden;
    default:
      return PremiumServiceIcon.generic;
  }
}

class PremiumCategoryIcon extends StatelessWidget {
  final PremiumServiceIcon icon;
  final double size;
  final Color primaryColor;
  final Color secondaryColor;

  const PremiumCategoryIcon({
    super.key,
    required this.icon,
    this.size = 48,
    this.primaryColor = const Color(0xFFFF6B35),
    this.secondaryColor = const Color(0xFFC9552B),
  });

  factory PremiumCategoryIcon.fromCode({
    required String code,
    double size = 48,
  }) {
    return PremiumCategoryIcon(
      icon: premiumIconFromCategoryCode(code),
      size: size,
    );
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _PremiumIconPainter(
          icon: icon,
          primary: primaryColor,
          secondary: secondaryColor,
        ),
      ),
    );
  }
}

class _PremiumIconPainter extends CustomPainter {
  final PremiumServiceIcon icon;
  final Color primary;
  final Color secondary;

  _PremiumIconPainter({
    required this.icon,
    required this.primary,
    required this.secondary,
  });

  @override
  void paint(Canvas canvas, Size size) {
    // 1. Draw background rounded rect with gradient
    final Rect rect = Offset.zero & size;
    final RRect rrect = RRect.fromRectAndRadius(rect, Radius.circular(size.width * 0.25));

    final Paint bgPaint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [primary.withOpacity(0.15), primary.withOpacity(0.05)],
      ).createShader(rect)
      ..style = PaintingStyle.fill;

    canvas.drawRRect(rrect, bgPaint);

    final Paint borderPaint = Paint()
      ..color = primary.withOpacity(0.3)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;
    canvas.drawRRect(rrect, borderPaint);

    // 2. Draw inner glyph
    final Paint glyphPaint = Paint()
      ..color = primary
      ..style = PaintingStyle.stroke
      ..strokeWidth = size.width * 0.06
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final Paint fillPaint = Paint()
      ..color = secondary
      ..style = PaintingStyle.fill;

    canvas.save();
    // Center and scale glyph pad
    final double padding = size.width * 0.25;
    canvas.translate(padding, padding);
    final Size glyphSize = Size(size.width - padding * 2, size.height - padding * 2);

    switch (icon) {
      case PremiumServiceIcon.ac:
        _drawAC(canvas, glyphSize, glyphPaint, fillPaint);
        break;
      case PremiumServiceIcon.building:
        _drawBuilding(canvas, glyphSize, glyphPaint, fillPaint);
        break;
      case PremiumServiceIcon.electric:
        _drawElectric(canvas, glyphSize, glyphPaint, fillPaint);
        break;
      case PremiumServiceIcon.plumbing:
        _drawPlumbing(canvas, glyphSize, glyphPaint, fillPaint);
        break;
      case PremiumServiceIcon.welding:
        _drawWelding(canvas, glyphSize, glyphPaint, fillPaint);
        break;
      case PremiumServiceIcon.carpentry:
        _drawCarpentry(canvas, glyphSize, glyphPaint, fillPaint);
        break;
      case PremiumServiceIcon.cleaning:
        _drawCleaning(canvas, glyphSize, glyphPaint, fillPaint);
        break;
      case PremiumServiceIcon.painting:
        _drawPainting(canvas, glyphSize, glyphPaint, fillPaint);
        break;
      case PremiumServiceIcon.garden:
        _drawGarden(canvas, glyphSize, glyphPaint, fillPaint);
        break;
      case PremiumServiceIcon.generic:
        _drawGeneric(canvas, glyphSize, glyphPaint, fillPaint);
        break;
    }

    canvas.restore();
  }

  void _drawAC(Canvas canvas, Size s, Paint stroke, Paint fill) {
    // Box
    final Rect box = Rect.fromLTWH(0, s.height * 0.2, s.width, s.height * 0.5);
    canvas.drawRRect(RRect.fromRectAndRadius(box, Radius.circular(s.width * 0.1)), stroke);
    // Lines inside box
    canvas.drawLine(Offset(s.width * 0.2, s.height * 0.45), Offset(s.width * 0.8, s.height * 0.45), stroke);
    // Wind/snow below
    canvas.drawLine(Offset(s.width * 0.3, s.height * 0.8), Offset(s.width * 0.3, s.height * 0.9), stroke..color = stroke.color.withOpacity(0.5));
    canvas.drawLine(Offset(s.width * 0.5, s.height * 0.85), Offset(s.width * 0.5, s.height * 1.0), stroke);
    canvas.drawLine(Offset(s.width * 0.7, s.height * 0.8), Offset(s.width * 0.7, s.height * 0.9), stroke);
  }

  void _drawBuilding(Canvas canvas, Size s, Paint stroke, Paint fill) {
    // Wall outline
    final Path path = Path()
      ..moveTo(s.width * 0.1, s.height)
      ..lineTo(s.width * 0.1, s.height * 0.3)
      ..lineTo(s.width * 0.5, 0)
      ..lineTo(s.width * 0.9, s.height * 0.3)
      ..lineTo(s.width * 0.9, s.height);
    canvas.drawPath(path, stroke);
    // Trowel / Hammer shape overlapping
    canvas.drawRect(Rect.fromLTWH(s.width * 0.35, s.height * 0.4, s.width * 0.3, s.height * 0.6), stroke);
    canvas.drawLine(Offset(s.width * 0.5, s.height * 0.4), Offset(s.width * 0.5, s.height), stroke..strokeWidth = s.width * 0.02);
  }

  void _drawElectric(Canvas canvas, Size s, Paint stroke, Paint fill) {
    // Lightning bolt
    final Path path = Path()
      ..moveTo(s.width * 0.6, 0)
      ..lineTo(s.width * 0.2, s.height * 0.5)
      ..lineTo(s.width * 0.5, s.height * 0.5)
      ..lineTo(s.width * 0.4, s.height)
      ..lineTo(s.width * 0.8, s.height * 0.4)
      ..lineTo(s.width * 0.5, s.height * 0.4)
      ..close();
    canvas.drawPath(path, stroke);
    canvas.drawPath(path, fill..color = fill.color.withOpacity(0.2));
  }

  void _drawPlumbing(Canvas canvas, Size s, Paint stroke, Paint fill) {
    // Wrench
    final Path path = Path()
      ..moveTo(s.width * 0.8, s.height * 0.2)
      ..arcToPoint(Offset(s.width * 0.5, s.height * 0.5), radius: Radius.circular(s.width * 0.3), clockwise: false)
      ..lineTo(s.width * 0.2, s.height * 0.8)
      ..arcToPoint(Offset(s.width * 0.3, s.height * 0.9), radius: Radius.circular(s.width * 0.1))
      ..lineTo(s.width * 0.6, s.height * 0.6)
      ..arcToPoint(Offset(s.width * 0.9, s.height * 0.3), radius: Radius.circular(s.width * 0.3), clockwise: false)
      ..close();
    canvas.drawPath(path, stroke);
    // Droplet
    final Path drop = Path()
      ..moveTo(s.width * 0.8, s.height * 0.7)
      ..quadraticBezierTo(s.width, s.height * 0.9, s.width * 0.8, s.height)
      ..quadraticBezierTo(s.width * 0.6, s.height * 0.9, s.width * 0.8, s.height * 0.7);
    canvas.drawPath(drop, fill);
  }

  void _drawWelding(Canvas canvas, Size s, Paint stroke, Paint fill) {
    // Mask
    final Path path = Path()
      ..moveTo(s.width * 0.2, s.height * 0.1)
      ..lineTo(s.width * 0.8, s.height * 0.1)
      ..lineTo(s.width * 0.9, s.height * 0.7)
      ..quadraticBezierTo(s.width * 0.5, s.height * 1.1, s.width * 0.1, s.height * 0.7)
      ..close();
    canvas.drawPath(path, stroke);
    // Eye slot
    canvas.drawRect(Rect.fromLTWH(s.width * 0.3, s.height * 0.3, s.width * 0.4, s.height * 0.15), fill);
    // Spark
    canvas.drawCircle(Offset(s.width * 0.8, s.height * 0.9), s.width * 0.08, fill..color = stroke.color);
  }

  void _drawCarpentry(Canvas canvas, Size s, Paint stroke, Paint fill) {
    // Hand saw
    final Path path = Path()
      ..moveTo(s.width * 0.1, s.height * 0.8)
      ..lineTo(s.width * 0.9, s.height * 0.2)
      ..lineTo(s.width * 0.8, s.height * 0.1)
      ..lineTo(s.width * 0.2, s.height * 0.5);
    // Teeth
    for (int i = 0; i < 5; i++) {
      path.lineTo(s.width * (0.2 + i * 0.12), s.height * (0.5 + i * 0.08));
      path.lineTo(s.width * (0.15 + i * 0.12), s.height * (0.55 + i * 0.08));
    }
    path.close();
    canvas.drawPath(path, stroke);
    // Handle
    canvas.drawRect(Rect.fromLTWH(s.width * 0.7, s.height * 0.05, s.width * 0.25, s.height * 0.3), stroke);
  }

  void _drawCleaning(Canvas canvas, Size s, Paint stroke, Paint fill) {
    // Broom/mop
    canvas.drawLine(Offset(s.width * 0.5, s.height * 0.1), Offset(s.width * 0.5, s.height * 0.7), stroke);
    final Rect base = Rect.fromLTWH(s.width * 0.2, s.height * 0.7, s.width * 0.6, s.height * 0.2);
    canvas.drawRRect(RRect.fromRectAndRadius(base, Radius.circular(s.width * 0.05)), stroke);
    // Sparkles
    _drawSparkle(canvas, Offset(s.width * 0.8, s.height * 0.3), s.width * 0.15, stroke);
    _drawSparkle(canvas, Offset(s.width * 0.2, s.height * 0.4), s.width * 0.1, stroke);
  }

  void _drawSparkle(Canvas canvas, Offset center, double size, Paint paint) {
    final Path path = Path()
      ..moveTo(center.dx, center.dy - size)
      ..quadraticBezierTo(center.dx, center.dy, center.dx + size, center.dy)
      ..quadraticBezierTo(center.dx, center.dy, center.dx, center.dy + size)
      ..quadraticBezierTo(center.dx, center.dy, center.dx - size, center.dy)
      ..quadraticBezierTo(center.dx, center.dy, center.dx, center.dy - size);
    canvas.drawPath(path, paint..style = PaintingStyle.fill);
    paint.style = PaintingStyle.stroke;
  }

  void _drawPainting(Canvas canvas, Size s, Paint stroke, Paint fill) {
    // Paint roller
    canvas.drawLine(Offset(s.width * 0.5, s.height * 0.9), Offset(s.width * 0.5, s.height * 0.5), stroke);
    canvas.drawLine(Offset(s.width * 0.5, s.height * 0.5), Offset(s.width * 0.8, s.height * 0.5), stroke);
    canvas.drawLine(Offset(s.width * 0.8, s.height * 0.5), Offset(s.width * 0.8, s.height * 0.2), stroke);

    final Rect roller = Rect.fromLTWH(s.width * 0.2, s.height * 0.1, s.width * 0.6, s.height * 0.3);
    canvas.drawRRect(RRect.fromRectAndRadius(roller, Radius.circular(s.width * 0.08)), stroke);

    // Paint drip
    canvas.drawCircle(Offset(s.width * 0.3, s.height * 0.5), s.width * 0.06, fill);
    canvas.drawCircle(Offset(s.width * 0.45, s.height * 0.45), s.width * 0.04, fill);
  }

  void _drawGarden(Canvas canvas, Size s, Paint stroke, Paint fill) {
    // Leaf shape
    final Path leaf1 = Path()
      ..moveTo(s.width * 0.5, s.height)
      ..quadraticBezierTo(s.width * 0.1, s.height * 0.6, s.width * 0.4, s.height * 0.1)
      ..quadraticBezierTo(s.width * 0.8, s.height * 0.4, s.width * 0.5, s.height);
    canvas.drawPath(leaf1, stroke);

    final Path leaf2 = Path()
      ..moveTo(s.width * 0.5, s.height * 0.8)
      ..quadraticBezierTo(s.width * 0.9, s.height * 0.6, s.width * 0.8, s.height * 0.3)
      ..quadraticBezierTo(s.width * 0.5, s.height * 0.4, s.width * 0.5, s.height * 0.8);
    canvas.drawPath(leaf2, fill..color = fill.color.withOpacity(0.5));
  }

  void _drawGeneric(Canvas canvas, Size s, Paint stroke, Paint fill) {
    // Wrench + Hammer crossed
    canvas.drawLine(Offset(s.width * 0.2, s.height * 0.8), Offset(s.width * 0.8, s.height * 0.2), stroke);
    canvas.drawLine(Offset(s.width * 0.2, s.height * 0.2), Offset(s.width * 0.8, s.height * 0.8), stroke);
    canvas.drawCircle(Offset(s.width * 0.5, s.height * 0.5), s.width * 0.1, fill);
  }

  @override
  bool shouldRepaint(covariant _PremiumIconPainter oldDelegate) {
    return oldDelegate.icon != icon ||
        oldDelegate.primary != primary ||
        oldDelegate.secondary != secondary;
  }
}
