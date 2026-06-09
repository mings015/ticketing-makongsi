import 'package:flutter/material.dart';

class AppTheme {
  static const _primaryColor = Color(0xFF2563EB); // blue-600
  static const _errorColor = Color(0xFFDC2626); // red-600

  static ThemeData get light => ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: _primaryColor,
          error: _errorColor,
        ),
        appBarTheme: const AppBarTheme(
          centerTitle: false,
          elevation: 0,
          scrolledUnderElevation: 1,
        ),
        cardTheme: CardThemeData(
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: BorderSide(color: Colors.grey.shade200),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.grey.shade50,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: BorderSide(color: Colors.grey.shade300),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: BorderSide(color: Colors.grey.shade300),
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        ),
        filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
            minimumSize: const Size.fromHeight(48),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        ),
        bottomNavigationBarTheme: const BottomNavigationBarThemeData(
          type: BottomNavigationBarType.fixed,
          selectedItemColor: _primaryColor,
        ),
      );
}

// Priority colors
class PriorityColors {
  static Color forPriority(String priority) => switch (priority.toLowerCase()) {
        'critical' => const Color(0xFFDC2626),
        'high' => const Color(0xFFF97316),
        'medium' => const Color(0xFFF59E0B),
        _ => const Color(0xFF6B7280),
      };
}

// Status colors
class StatusColors {
  static Color forStatus(String status) => switch (status.toLowerCase()) {
        'open' => const Color(0xFF3B82F6),
        'in_progress' => const Color(0xFFF59E0B),
        'pending' => const Color(0xFF9CA3AF),
        'resolved' => const Color(0xFF10B981),
        'closed' => const Color(0xFF6B7280),
        _ => const Color(0xFF9CA3AF),
      };

  static String label(String status) => switch (status.toLowerCase()) {
        'open' => 'Open',
        'in_progress' => 'In Progress',
        'pending' => 'Pending',
        'resolved' => 'Resolved',
        'closed' => 'Closed',
        _ => status,
      };
}
