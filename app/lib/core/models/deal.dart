import 'package:flutter/widgets.dart';
import 'package:lucide_icons/lucide_icons.dart';

class Deal {
  final String id;
  final String storeId;
  final String storeName;
  final String storeCategory;
  final String title;
  final String description;
  final int originalPrice;
  final int discountedPrice;
  final int totalStock;
  final int remainingStock;
  final DateTime expiresAt;
  final double distanceKm;
  final String iconName;
  final String imageUrl;

  Deal({
    required this.id,
    required this.storeId,
    required this.storeName,
    required this.storeCategory,
    required this.title,
    required this.description,
    required this.originalPrice,
    required this.discountedPrice,
    required this.totalStock,
    required this.remainingStock,
    required this.expiresAt,
    required this.distanceKm,
    required this.iconName,
    required this.imageUrl,
  });

  static final _iconMap = <String, IconData>{
    'wheat': LucideIcons.wheat,
    'utensils': LucideIcons.utensils,
    'coffee': LucideIcons.coffee,
    'shoppingCart': LucideIcons.shoppingCart,
    'flower2': LucideIcons.flower2,
    'store': LucideIcons.store,
  };

  IconData get icon => _iconMap[iconName] ?? LucideIcons.store;

  int get discountPercent => originalPrice == 0
      ? 0
      : ((originalPrice - discountedPrice) / originalPrice * 100).round();

  double get stockRatio => totalStock == 0 ? 0.0 : remainingStock / totalStock;

  bool get isExpired => expiresAt.isBefore(DateTime.now());

  bool get isUrgent =>
      !isExpired && expiresAt.difference(DateTime.now()).inMinutes < 30;

  Duration get remaining => expiresAt.difference(DateTime.now());

  factory Deal.fromJson(Map<String, dynamic> json) => Deal(
        id: json['id'] as String,
        storeId: json['store_id'] as String,
        storeName: json['store_name'] as String,
        storeCategory: json['store_category'] as String,
        title: json['title'] as String,
        description: json['description'] as String,
        originalPrice: json['original_price'] as int,
        discountedPrice: json['discounted_price'] as int,
        totalStock: json['total_stock'] as int,
        remainingStock: json['remaining_stock'] as int,
        expiresAt: DateTime.parse(json['expires_at'] as String).toLocal(),
        distanceKm: (json['distance_km'] as num?)?.toDouble() ?? 0.0,
        iconName: (json['icon_name'] as String?) ?? 'store',
        imageUrl: json['image_url'] as String,
      );

  factory Deal.placeholder() => Deal(
        id: '',
        storeId: '',
        storeName: '삭제된 가게',
        storeCategory: '',
        title: '삭제된 딜',
        description: '',
        originalPrice: 0,
        discountedPrice: 0,
        totalStock: 1,
        remainingStock: 0,
        expiresAt: DateTime(2000),
        distanceKm: 0,
        iconName: 'store',
        imageUrl: '',
      );

  Deal copyWith({
    String? id,
    String? storeId,
    String? storeName,
    String? storeCategory,
    String? title,
    String? description,
    int? originalPrice,
    int? discountedPrice,
    int? totalStock,
    int? remainingStock,
    DateTime? expiresAt,
    double? distanceKm,
    String? iconName,
    String? imageUrl,
  }) => Deal(
        id: id ?? this.id,
        storeId: storeId ?? this.storeId,
        storeName: storeName ?? this.storeName,
        storeCategory: storeCategory ?? this.storeCategory,
        title: title ?? this.title,
        description: description ?? this.description,
        originalPrice: originalPrice ?? this.originalPrice,
        discountedPrice: discountedPrice ?? this.discountedPrice,
        totalStock: totalStock ?? this.totalStock,
        remainingStock: remainingStock ?? this.remainingStock,
        expiresAt: expiresAt ?? this.expiresAt,
        distanceKm: distanceKm ?? this.distanceKm,
        iconName: iconName ?? this.iconName,
        imageUrl: imageUrl ?? this.imageUrl,
      );
  // [Kiro | 2026-08-21] copyWith() — distanceKm 단일 파라미터에서 전체 필드 지원으로 확장

  Map<String, dynamic> toJson() => {
        'store_id': storeId,
        'store_name': storeName,
        'store_category': storeCategory,
        'title': title,
        'description': description,
        'original_price': originalPrice,
        'discounted_price': discountedPrice,
        'total_stock': totalStock,
        'remaining_stock': remainingStock,
        'expires_at': expiresAt.toUtc().toIso8601String(),
        'icon_name': iconName,
        'image_url': imageUrl,
      };
}
