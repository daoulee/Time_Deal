import 'deal.dart';
import '../utils/formatters.dart';

class Reservation {
  final String id;
  final String userId;
  final Deal deal;
  final DateTime reservedAt;
  String status; // '진행중' | '픽업완료' | '취소'

  Reservation({
    required this.id,
    required this.userId,
    required this.deal,
    required this.reservedAt,
    this.status = '진행중',
  });

  factory Reservation.fromJson(Map<String, dynamic> json) => Reservation(
        id: json['id'] as String,
        userId: json['user_id'] as String? ?? '',
        deal: json['deals'] != null
            ? Deal.fromJson(json['deals'] as Map<String, dynamic>)
            : Deal.placeholder(),
        reservedAt: DateTime.parse(json['reserved_at'] as String).toLocal(),
        status: json['status'] as String,
      );

  String get formattedPrice => Formatters.price(deal.discountedPrice);

  String get formattedDate {
    final diff = DateTime.now().difference(reservedAt);
    if (diff.inMinutes < 1) return '방금 예약';
    if (diff.inHours < 1) return '${diff.inMinutes}분 전 예약';
    if (diff.inDays < 1) return '${diff.inHours}시간 전 예약';
    final d = reservedAt;
    return '${d.month}.${d.day.toString().padLeft(2, '0')} 예약';
  }
}
