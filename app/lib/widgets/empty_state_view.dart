import 'package:flutter/material.dart';

class EmptyStateView extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;

  const EmptyStateView({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 52, color: Colors.grey[300]),
          const SizedBox(height: 14),
          Text(title,
              style: TextStyle(fontSize: 15, color: Colors.grey[400], fontWeight: FontWeight.w500)),
          if (subtitle != null) ...[
            const SizedBox(height: 6),
            Text(subtitle!,
                style: TextStyle(fontSize: 12, color: Colors.grey[300])),
          ],
        ],
      ),
    );
  }
}
