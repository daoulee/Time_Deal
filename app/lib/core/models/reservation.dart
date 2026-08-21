import 'deal.dart';
import '../utils/formatters.dart';

class Reservation {
  final String id;
  final String userId;
  final Deal deal;
  final DateTime reservedAt;
  String status; // '진행중' | '픽업완료' | '취소' | '노쇼'
  String paymentStatus; // 'holding'(가결제 홀드) | 'released'(픽업완료/자동취소) | 'captured'(노쇼 위약금) | 'cancelled'(취소)
  final int depositAmount;
  final String paymentMethod; // '토스페이' | '카카오페이' | '신용/체크카드'

  Reservation({
    required this.id,
    required this.userId,
    required this.deal,
    required this.reservedAt,
    this.status = '진행중',
    this.paymentStatus = 'holding',
    int? depositAmount,
    this.paymentMethod = '신용/체크카드',
  }) : depositAmount = depositAmount ?? deal.discountedPrice;

  factory Reservation.fromJson(Map<String, dynamic> json) {
    final dealObj = json['deals'] != null
        ? Deal.fromJson(json['deals'] as Map<String, dynamic>)
        : Deal.placeholder();

    return Reservation(
      id: json['id'] as String,
      userId: json['user_id'] as String? ?? '',
      deal: dealObj,
      reservedAt: DateTime.parse(json['reserved_at'] as String).toLocal(),
      status: json['status'] as String? ?? '진행중',
      paymentStatus: json['payment_status'] as String? ?? 'holding',
      depositAmount: json['deposit_amount'] as int? ?? dealObj.discountedPrice,
      paymentMethod: json['payment_method'] as String? ?? '신용/체크카드',
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'user_id': userId,
        'deal_id': deal.id,
        'reserved_at': reservedAt.toUtc().toIso8601String(),
        'status': status,
        'payment_status': paymentStatus,
        'deposit_amount': depositAmount,
        'payment_method': paymentMethod,
      };

  String get formattedPrice => Formatters.price(deal.discountedPrice);
  String get formattedDeposit => Formatters.price(depositAmount);

  bool get isDepositHolding => paymentStatus == 'holding';
  bool get isDepositReleased => paymentStatus == 'released';

  String get paymentStatusLabel {
    switch (paymentStatus) {
      case 'holding':
        return '가결제 홀드중 (방문 시 즉시 취소)';
      case 'released':
        return '가결제 취소 완료 (0원 청구)';
      case 'captured':
        return '노쇼 위약금 청구됨';
      case 'cancelled':
        return '가결제 해제됨';
      default:
        return '가결제 홀드중';
    }
  }

  String get formattedDate {
    final diff = DateTime.now().difference(reservedAt);
    if (diff.inMinutes < 1) return '방금 예약';
    if (diff.inHours < 1) return '${diff.inMinutes}분 전 예약';
    if (diff.inDays < 1) return '${diff.inHours}시간 전 예약';
    final d = reservedAt;
    return '${d.month}.${d.day.toString().padLeft(2, '0')} 예약';
  }
}
