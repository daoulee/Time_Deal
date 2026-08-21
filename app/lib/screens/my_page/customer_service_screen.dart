// [Antigravity | 2026-08-21] 수정범위: CustomerServiceScreen — 고객센터 전용 풀스크린 (카카오 1:1 상담 / 전화 / 이메일 채널 및 FAQ 아코디언, 약관 보기)
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../core/theme/app_colors.dart';

class CustomerServiceScreen extends StatelessWidget {
  const CustomerServiceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF141417) : const Color(0xFFF8F9FA),
      appBar: AppBar(
        title: const Text('고객센터', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
        centerTitle: false,
        elevation: 0,
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // 상단 배너 카드
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFFFF6B35), Color(0xFFFF8E53)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFFFF6B35).withValues(alpha: 0.25),
                  blurRadius: 14,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(LucideIcons.headphones, size: 26, color: Colors.white),
                ),
                const SizedBox(width: 16),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '무엇을 도와드릴까요?',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        '평일 09:00 ~ 18:00 (주말·공휴일 휴무)',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.white70,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // 문의 채널 섹션
          const Text('문의 채널', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
          const SizedBox(height: 12),

          // 1. 카카오톡 채널
          _SupportChannelCard(
            badgeBg: const Color(0xFFFEE500),
            icon: SvgPicture.asset('assets/icons/kakao.svg', width: 22, height: 22),
            title: '카카오톡 1:1 상담톡',
            subtitle: '실시간 채팅으로 빠르고 편리하게 문의하세요',
            tag: '추천',
            tagColor: const Color(0xFFFEE500),
            tagTextColor: const Color(0xFF191919),
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('카카오톡 @우리동네타임딜 채널로 연결됩니다'),
                  behavior: SnackBarBehavior.floating,
                ),
              );
            },
          ),
          const SizedBox(height: 10),

          // 2. 전화 문의
          _SupportChannelCard(
            badgeBg: AppColors.primary.withValues(alpha: 0.12),
            icon: Icon(LucideIcons.phoneCall, size: 22, color: AppColors.primary),
            title: '전화 상담 (1588-0000)',
            subtitle: '전문 상담원과 유선 통화로 연결됩니다',
            onTap: () {
              showDialog(
                context: context,
                builder: (ctx) => AlertDialog(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  title: const Text('전화 상담 연결', style: TextStyle(fontWeight: FontWeight.w700)),
                  content: const Text('1588-0000 번호로 전화를 연결하시겠습니까?'),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('취소')),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                      onPressed: () {
                        Navigator.pop(ctx);
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('통화 기능이 실행되었습니다'), behavior: SnackBarBehavior.floating),
                        );
                      },
                      child: const Text('통화하기', style: TextStyle(color: Colors.white)),
                    ),
                  ],
                ),
              );
            },
          ),
          const SizedBox(height: 10),

          // 3. 이메일 문의
          _SupportChannelCard(
            badgeBg: const Color(0xFF3B82F6).withValues(alpha: 0.12),
            icon: Icon(LucideIcons.mail, size: 22, color: const Color(0xFF3B82F6)),
            title: '이메일 문의 접수',
            subtitle: 'support@townflashdeal.kr (24시간 접수)',
            onTap: () {
              Clipboard.setData(const ClipboardData(text: 'support@townflashdeal.kr'));
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('이메일 주소가 클립보드에 복사되었어요!'),
                  behavior: SnackBarBehavior.floating,
                ),
              );
            },
          ),
          const SizedBox(height: 28),

          // 자주 묻는 질문 (FAQ)
          const Text('자주 묻는 질문 (FAQ)', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
          const SizedBox(height: 12),
          _FaqAccordion(
            question: '예약한 타임딜을 취소하고 싶어요',
            answer: '내 정보 > 예약 내역에서 픽업 시간 전까지 직접 [예약 취소]를 진행하실 수 있습니다. 취소 시 잔여 재고는 즉시 복구됩니다.',
          ),
          _FaqAccordion(
            question: '픽업 시간이 지나면 어떻게 되나요?',
            answer: '마감 시간 이후에는 노쇼(No-show) 방지를 위해 자동으로 예약이 만료 처리될 수 있으니, 매장에 미리 연락 부탁드립니다.',
          ),
          _FaqAccordion(
            question: '동네 인증은 어떻게 하나요?',
            answer: '내 정보 > 프로필 영역의 [동네 인증하기] 버튼을 누르시면 현재 GPS 위치를 기반으로 즉시 동네 인증이 완료됩니다.',
          ),
          _FaqAccordion(
            question: '사장님으로 딜을 등록하려면 어떻게 하나요?',
            answer: '내 정보 > 기타 > [사장님으로 전환하기]를 통해 언제든지 사장님 모드로 전환하여 마감 임박 타임딜을 3초 만에 등록하실 수 있습니다.',
          ),
          const SizedBox(height: 24),

          // 약관 및 정책
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E1E22) : Colors.white,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Column(
              children: [
                _TermsRow(title: '서비스 이용약관', onTap: () {}),
                const Divider(height: 1),
                _TermsRow(title: '개인정보 처리방침', onTap: () {}),
                const Divider(height: 1),
                _TermsRow(title: '위치기반서비스 이용약관', onTap: () {}),
              ],
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}

class _SupportChannelCard extends StatelessWidget {
  final Color badgeBg;
  final Widget icon;
  final String title;
  final String subtitle;
  final String? tag;
  final Color? tagColor;
  final Color? tagTextColor;
  final VoidCallback onTap;

  const _SupportChannelCard({
    required this.badgeBg,
    required this.icon,
    required this.title,
    required this.subtitle,
    this.tag,
    this.tagColor,
    this.tagTextColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Theme.of(context).scaffoldBackgroundColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isDark ? Colors.white12 : Colors.grey.withValues(alpha: 0.15),
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: badgeBg,
                shape: BoxShape.circle,
              ),
              alignment: Alignment.center,
              child: icon,
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                      if (tag != null) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: tagColor ?? AppColors.primary,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            tag!,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              color: tagTextColor ?? Colors.white,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(subtitle, style: TextStyle(fontSize: 12, color: Colors.grey[500])),
                ],
              ),
            ),
            Icon(LucideIcons.chevronRight, size: 16, color: Colors.grey[400]),
          ],
        ),
      ),
    );
  }
}

class _FaqAccordion extends StatefulWidget {
  final String question;
  final String answer;

  const _FaqAccordion({required this.question, required this.answer});

  @override
  State<_FaqAccordion> createState() => _FaqAccordionState();
}

class _FaqAccordionState extends State<_FaqAccordion> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? Colors.white12 : Colors.grey.withValues(alpha: 0.12),
        ),
      ),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          initiallyExpanded: _expanded,
          onExpansionChanged: (v) => setState(() => _expanded = v),
          tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
          title: Text(
            widget.question,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
          ),
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E1E22) : const Color(0xFFF3F4F6),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  widget.answer,
                  style: TextStyle(fontSize: 13, color: Colors.grey[600], height: 1.4),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TermsRow extends StatelessWidget {
  final String title;
  final VoidCallback onTap;

  const _TermsRow({required this.title, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Row(
          children: [
            Text(title, style: TextStyle(fontSize: 13, color: Colors.grey[600])),
            const Spacer(),
            Icon(LucideIcons.chevronRight, size: 14, color: Colors.grey[400]),
          ],
        ),
      ),
    );
  }
}
