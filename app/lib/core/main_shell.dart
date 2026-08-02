import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'theme.dart';

class MainShell extends StatelessWidget {
  const MainShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  static const _customerTabs = [
    _NavTab(icon: Icons.home_outlined, activeIcon: Icons.home, label: 'Home'),
    _NavTab(icon: Icons.receipt_long_outlined, activeIcon: Icons.receipt_long, label: 'Order'),
    _NavTab(icon: Icons.person_outline, activeIcon: Icons.person, label: 'Profil'),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: navigationShell.currentIndex,
        onTap: (index) => navigationShell.goBranch(
          index,
          initialLocation: index == navigationShell.currentIndex,
        ),
        type: BottomNavigationBarType.fixed,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.textSecondary,
        selectedFontSize: 12,
        unselectedFontSize: 12,
        elevation: 8,
        items: _customerTabs
            .map((tab) => BottomNavigationBarItem(
                  icon: Icon(tab.icon),
                  activeIcon: Icon(tab.activeIcon),
                  label: tab.label,
                ))
            .toList(),
      ),
    );
  }
}

class _NavTab {
  const _NavTab({required this.icon, required this.activeIcon, required this.label});
  final IconData icon;
  final IconData activeIcon;
  final String label;
}
