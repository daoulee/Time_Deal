import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/app_haptics.dart';

enum TermsType {
  service,
  privacy,
  location,
}

// [Antigravity | 2026-08-23] 수정범위: TermsDetailScreen — 상용 런칭 기준 서비스 이용약관, 개인정보 처리방침, 위치기반 서비스 이용약관 전문 리더기
class TermsDetailScreen extends StatelessWidget {
  final TermsType type;

  const TermsDetailScreen({super.key, required this.type});

  String get _title {
    switch (type) {
      case TermsType.service:
        return '서비스 이용약관';
      case TermsType.privacy:
        return '개인정보 처리방침';
      case TermsType.location:
        return '위치기반 서비스 이용약관';
    }
  }

  String get _lastUpdated {
    switch (type) {
      case TermsType.service:
        return '시행일자: 2026년 8월 23일 (v1.2)';
      case TermsType.privacy:
        return '시행일자: 2026년 8월 23일 (v1.2)';
      case TermsType.location:
        return '시행일자: 2026년 8월 23일 (v1.2)';
    }
  }

  List<_TermsSection> get _sections {
    switch (type) {
      case TermsType.service:
        return _serviceTerms;
      case TermsType.privacy:
        return _privacyTerms;
      case TermsType.location:
        return _locationTerms;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF121316) : const Color(0xFFF8F9FA),
      appBar: AppBar(
        backgroundColor: isDark ? const Color(0xFF121316) : Colors.white,
        elevation: 0,
        title: Text(
          _title,
          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17),
        ),
        centerTitle: true,
        leading: IconButton(
          icon: Icon(LucideIcons.arrowLeft, size: 20),
          onPressed: () {
            AppHaptics.selection();
            Navigator.pop(context);
          },
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 48),
        children: [
          // 상단 메타 정보 카드
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1B1C22) : Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isDark
                    ? Colors.white.withValues(alpha: 0.08)
                    : Colors.black.withValues(alpha: 0.05),
              ),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    type == TermsType.location
                        ? LucideIcons.mapPin
                        : (type == TermsType.privacy
                            ? LucideIcons.shieldCheck
                            : LucideIcons.fileText),
                    size: 20,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _title,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: isDark ? Colors.white : const Color(0xFF212529),
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        _lastUpdated,
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? Colors.grey[400] : Colors.grey[500],
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // 약관 본문 섹션들
          ..._sections.map((sec) => Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1B1C22) : Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.08)
                        : Colors.black.withValues(alpha: 0.05),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      sec.title,
                      style: TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w800,
                        color: isDark ? Colors.white : const Color(0xFF212529),
                        letterSpacing: -0.2,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      sec.content,
                      style: TextStyle(
                        fontSize: 13,
                        height: 1.6,
                        color: isDark ? Colors.grey[300] : const Color(0xFF495057),
                      ),
                    ),
                  ],
                ),
              )),
        ],
      ),
    );
  }
}

class _TermsSection {
  final String title;
  final String content;

  const _TermsSection({required this.title, required this.content});
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. 서비스 이용약관 전문 데이터
// ─────────────────────────────────────────────────────────────────────────────
const List<_TermsSection> _serviceTerms = [
  _TermsSection(
    title: '제1조 (목적)',
    content:
        '본 약관은 "우리 동네 타임딜"(이하 "회사" 또는 "서비스")이 제공하는 하이퍼로컬 실시간 마감 할인 중개 및 픽업 예약 플랫폼의 이용과 관련하여 회사와 이용자(소비자 및 상인 회원) 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.',
  ),
  _TermsSection(
    title: '제2조 (용어의 정의)',
    content:
        '1. "타임딜"이란 상인 회원이 당일 소진이 필요한 잔여 재고 및 마감 임박 상품을 특정 시간 동안 할인된 가격에 등록하는 실시간 판매 상품을 의미합니다.\n'
        '2. "소비자 회원"이란 동네 인증을 완료하고 타임딜 상품을 예약 및 결제하여 매장에 방문 픽업하는 이용자를 말합니다.\n'
        '3. "상인 회원"이란 사업자등록을 필하고 매장의 타임딜을 등록 및 관리하며 픽업 서비스를 제공하는 이용자를 말합니다.\n'
        '4. "노쇼 방지 보증금"이란 소비자의 일방적인 미방문(No-Show)으로 인한 소상공인의 재고 폐기 손실을 방지하기 위해 예약 시 사전 결제 승인(Pre-authorization)되는 보증금을 의미합니다.',
  ),
  _TermsSection(
    title: '제3조 (타임딜 예약 및 노쇼 보증금 정책)',
    content:
        '1. 소비자가 타임딜 상품을 예약할 때 상품 금액에 해당하는 결제 승인(가결제)이 발생합니다.\n'
        '2. 소비자가 약정된 픽업 마감 시간 내에 매장을 방문하여 현장 수납 및 픽업을 완료한 경우, 사전 승인된 노쇼 보증금 가결제는 즉시 0원 청구로 자동 취소(승인 해제)됩니다.\n'
        '3. 소비자가 별도의 사전 취소 없이 마감 시간까지 매장에 내방하지 않은 경우(노쇼 확정), 사전 승인된 보증금은 소상공인의 손실 보전 위약금으로 정식 청구 및 결제 정산됩니다.',
  ),
  _TermsSection(
    title: '제4조 (예약 취소 및 환불 기준)',
    content:
        '1. 소비자는 매장 방문 전 픽업 마감 시간 30분 전까지 앱 내에서 자유롭게 예약을 취소할 수 있으며, 취소 시 가결제 승인은 즉시 전액 해제됩니다.\n'
        '2. 상인 회원의 사정으로 딜이 조기 마감되거나 상품 품절이 발생한 경우, 예약은 즉시 무효화되며 보증금 승인은 즉각 전액 취소됩니다.\n'
        '3. 단순 변심에 의한 마감 시간 임박 취소는 노쇼 정책에 따라 위약금이 발생할 수 있습니다.',
  ),
  _TermsSection(
    title: '제5조 (상인 회원의 준수사항 및 상품 품질 보증)',
    content:
        '1. 상인 회원은 등록하는 타임딜 상품의 원산지, 유통기한 및 위생 상태를 관계 법령에 따라 적법하게 관리하여야 합니다.\n'
        '2. 마감 할인 상품이라 하더라도 소비자의 섭취 및 사용에 안전상 문제가 없는 정상 상품만을 등록하여야 하며, 변질 또는 불량 상품 제공 시 상인 회원에게 교환 또는 환불 책임이 귀속됩니다.',
  ),
  _TermsSection(
    title: '제6조 (면책 조항)',
    content:
        '1. 회사는 통신판매중개자로서 거래 당사자가 아니며, 상인 회원이 등록한 상품의 정보 및 품질, 거래 행위에 대해 직접적인 책임을 부담하지 않습니다.\n'
        '2. 천재지변, 통신망 장애 등 불가항력적인 사유로 서비스가 일시 중단된 경우 회사는 이에 대한 책임을 면합니다.',
  ),
];

// ─────────────────────────────────────────────────────────────────────────────
// 2. 개인정보 처리방침 전문 데이터
// ─────────────────────────────────────────────────────────────────────────────
const List<_TermsSection> _privacyTerms = [
  _TermsSection(
    title: '제1조 (개인정보의 수집 및 이용 목적)',
    content:
        '"우리 동네 타임딜"은 다음의 목적을 위해 필요한 최소한의 개인정보를 수집 및 처리합니다.\n'
        '1. 회원 가입 의사 확인, 이용자 본인 식별 및 계정 관리\n'
        '2. GPS 기반 동네 인증 및 반경 1~10km 내 실시간 타임딜 맞춤 제공\n'
        '3. 타임딜 예약 접수, 노쇼 보증금 결제 승인 및 픽업 완료 확인\n'
        '4. 고객센터 1:1 상담, 부정 이용 방지 및 고충 처리',
  ),
  _TermsSection(
    title: '제2조 (수집하는 개인정보의 항목)',
    content:
        '1. 필수 수집 항목: 닉네임, 기기 고유 식별값(UUID), 위치정보(GPS 위경도 및 법정동 주소), 로그인 Auth 식별자\n'
        '2. 결제 및 예약 시: 예약자명, 결제 수단 정보, 예약 이력\n'
        '3. 서비스 이용 과정에서 자동 생성되는 정보: 접속 로그, IP 주소, 이용 시간, 쿠키 및 세션 정보',
  ),
  _TermsSection(
    title: '제3조 (개인정보의 보유 및 이용 기간)',
    content:
        '1. 회원의 개인정보는 원칙적으로 회원 탈퇴 시 지체 없이 파기합니다.\n'
        '2. 단, 관계 법령에 의해 보존할 필요가 있는 경우 다음과 같이 보관합니다:\n'
        ' - 계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)\n'
        ' - 대금결제 및 재화 등의 공급에 관한 기록: 5년\n'
        ' - 소비자의 불만 또는 분쟁처리에 관한 기록: 3년\n'
        ' - 웹사이트 접속 및 위치 기록: 3개월 (통신비밀보호법)',
  ),
  _TermsSection(
    title: '제4조 (개인정보의 제3자 제공)',
    content:
        '회사는 이용자의 사전 동의 없이 개인정보를 외부에 제공하지 않습니다. 단, 픽업 예약의 원활한 이행을 위해 상품을 판매하는 해당 매장의 상인 회원에게 예약자 닉네임, 주문 번호, 예약 상품 내역이 최소한으로 제공됩니다.',
  ),
  _TermsSection(
    title: '제5조 (개인정보의 파기 절차 및 방법)',
    content:
        '수집 및 이용 목적이 달성된 개인정보는 재생이 불가능한 기술적 방법을 사용하여 지체 없이 영구 삭제하며, 출력된 전자문서는 분쇄기로 파쇄 처리합니다.',
  ),
  _TermsSection(
    title: '제6조 (개인정보 보호책임자 및 상담 채널)',
    content:
        '개인정보 보호와 관련된 문의사항은 고객센터(1588-0000) 또는 이메일(privacy@townflashdeal.kr)로 연락 주시면 신속하게 처리해 드리겠습니다.',
  ),
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. 위치기반 서비스 이용약관 전문 데이터
// ─────────────────────────────────────────────────────────────────────────────
const List<_TermsSection> _locationTerms = [
  _TermsSection(
    title: '제1조 (목적)',
    content:
        '본 약관은 "우리 동네 타임딜"(이하 "회사")이 위치정보사업자로부터 제공받은 위치정보를 기반으로 서비스를 제공함에 있어 회사와 개인위치정보주체의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.',
  ),
  _TermsSection(
    title: '제2조 (위치기반 서비스의 내용 및 목적)',
    content:
        '1. 회사는 이용자의 현재 위치를 기반으로 다음의 서비스를 제공합니다:\n'
        ' - 실시간 현재 GPS 위치를 통한 동네 인증(법정동 매칭)\n'
        ' - 이용자 위치 기준 반경(1km, 3km, 5km, 10km) 내 타임딜 상품 탐색 및 지도 표시\n'
        ' - 매장과 이용자 간의 도보/이동 거리 실시간 계산 및 안내\n'
        '2. 이용자의 동네 위치와 실제 GPS 위치가 현저히 불일치할 경우, 안전한 로컬 거래를 위해 동네 재인증 절차를 요구할 수 있습니다.',
  ),
  _TermsSection(
    title: '제3조 (개인위치정보의 이용 또는 제공)',
    content:
        '1. 회사는 서비스 제공을 위해 필요한 최소한의 개인위치정보만을 일회성으로 조회 및 처리합니다.\n'
        '2. 회사는 타 사업자나 제3자에게 개인위치정보를 제공하지 않으며, 앱 내 지도 표시 및 거리 계산 목적 외에는 무단 저장하지 않습니다.',
  ),
  _TermsSection(
    title: '제4조 (개인위치정보주체의 권리)',
    content:
        '1. 이용자는 언제든지 위치정보 수집에 대한 동의의 전부 또는 일부를 철회할 수 있습니다.\n'
        '2. 단말기 OS 설정에서 위치 접근 권한을 거부할 수 있으며, 이 경우 위치 기반 딜 탐색 및 동네 인증 기능이 제한될 수 있습니다.',
  ),
  _TermsSection(
    title: '제5조 (위치정보 관리책임자)',
    content:
        '회사의 위치정보관리책임자는 다음과 같습니다:\n'
        ' - 성명: 위치정보보호책임관\n'
        ' - 연락처: 1588-0000 / location@townflashdeal.kr\n'
        ' - 고객 지원 운영시간: 평일 09:00 ~ 18:00',
  ),
];
