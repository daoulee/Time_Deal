import 'dart:io';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/data/mock_data.dart';
import '../../core/providers/deal_provider.dart';
import '../../core/providers/location_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/app_haptics.dart';
import '../../core/utils/app_logger.dart';
import '../../core/utils/id_gen.dart';

// 카테고리별 아이콘 & 기본 이미지 (800x800 고화질 정비율 1:1)
const _categoryIcons = {
  '베이커리': 'wheat',
  '음식': 'utensils',
  '카페': 'coffee',
  '마트': 'shoppingCart',
  '꽃집': 'flower2',
};

const _categoryImages = {
  '베이커리': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&h=800&fit=crop&q=85',
  '음식': 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&h=800&fit=crop&q=85',
  '카페': 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&h=800&fit=crop&q=85',
  '마트': 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=800&h=800&fit=crop&q=85',
  '꽃집': 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=800&h=800&fit=crop&q=85',
};

class PresetProductTemplate {
  final String label;
  final String category;
  final String imageUrl;
  final String iconName;
  final String defaultTitle;
  final int defaultOriginal;
  final int defaultDiscount;

  const PresetProductTemplate({
    required this.label,
    required this.category,
    required this.imageUrl,
    required this.iconName,
    required this.defaultTitle,
    required this.defaultOriginal,
    required this.defaultDiscount,
  });
}

const _presetTemplates = [
  PresetProductTemplate(
    label: '🥐 크루아상/빵',
    category: '베이커리',
    imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&h=800&fit=crop&q=85',
    iconName: 'wheat',
    defaultTitle: '오늘의 마감 크루아상 & 베이커리 세트',
    defaultOriginal: 12000,
    defaultDiscount: 5000,
  ),
  PresetProductTemplate(
    label: '🍣 모듬 초밥',
    category: '음식',
    imageUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&h=800&fit=crop&q=85',
    iconName: 'utensils',
    defaultTitle: '당일 마감 특선 모듬초밥 12P',
    defaultOriginal: 18000,
    defaultDiscount: 9000,
  ),
  PresetProductTemplate(
    label: '🍱 수제 도시락',
    category: '음식',
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=800&fit=crop&q=85',
    iconName: 'utensils',
    defaultTitle: '건강 가득 마감 영양 도시락',
    defaultOriginal: 10000,
    defaultDiscount: 4500,
  ),
  PresetProductTemplate(
    label: '☕ 아메리카노 세트',
    category: '카페',
    imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&h=800&fit=crop&q=85',
    iconName: 'coffee',
    defaultTitle: '스페셜티 아메리카노 2잔 + 조각케익',
    defaultOriginal: 14000,
    defaultDiscount: 6500,
  ),
  PresetProductTemplate(
    label: '🍓 생과일 팩',
    category: '마트',
    imageUrl: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=800&h=800&fit=crop&q=85',
    iconName: 'shoppingCart',
    defaultTitle: '당도 보장 제철 과일 모듬 팩',
    defaultOriginal: 15000,
    defaultDiscount: 7000,
  ),
  PresetProductTemplate(
    label: '🍗 바삭 옛날통닭',
    category: '음식',
    imageUrl: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&h=800&fit=crop&q=85',
    iconName: 'utensils',
    defaultTitle: '갓 튀긴 바삭 옛날통닭 1마리',
    defaultOriginal: 13000,
    defaultDiscount: 6900,
  ),
  PresetProductTemplate(
    label: '💐 생화 꽃다발',
    category: '꽃집',
    imageUrl: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=800&h=800&fit=crop&q=85',
    iconName: 'flower2',
    defaultTitle: '오늘의 신선 플라워 미니 꽃다발',
    defaultOriginal: 20000,
    defaultDiscount: 8900,
  ),
];

class DealCreateScreen extends StatefulWidget {
  const DealCreateScreen({super.key});

  @override
  State<DealCreateScreen> createState() => _DealCreateScreenState();
}

class _DealCreateScreenState extends State<DealCreateScreen> {
  final _storeNameCtrl = TextEditingController();
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _originalCtrl = TextEditingController();
  final _discountCtrl = TextEditingController();
  final _stockCtrl = TextEditingController();

  int _hours = 1;
  String _selectedCategory = '베이커리';
  String? _selectedPresetUrl;
  XFile? _imageFile;
  bool _isSubmitting = false;

  @override
  void dispose() {
    _storeNameCtrl.dispose();
    _titleCtrl.dispose();
    _descCtrl.dispose();
    _originalCtrl.dispose();
    _discountCtrl.dispose();
    _stockCtrl.dispose();
    super.dispose();
  }

  String get _fallbackImage =>
      _selectedPresetUrl ?? _categoryImages[_selectedCategory] ?? _categoryImages['베이커리']!;

  int _parsePrice(String text) =>
      int.tryParse(text.replaceAll(',', '')) ?? 0;

  Future<void> _pickImage() async {
    final picked = await ImagePicker().pickImage(
      source: ImageSource.gallery,
      imageQuality: 85,
      maxWidth: 1000,
      maxHeight: 1000,
    );
    if (picked != null) {
      setState(() {
        _imageFile = picked;
        _selectedPresetUrl = null;
      });
    }
  }

  Future<String> _uploadImage(String dealId) async {
    if (_imageFile == null) return _fallbackImage;
    try {
      final bytes = await _imageFile!.readAsBytes();
      final path = 'deals/$dealId.jpg';
      await Supabase.instance.client.storage
          .from('deal-images')
          .uploadBinary(path, bytes,
              fileOptions: const FileOptions(contentType: 'image/jpeg', upsert: true));
      return Supabase.instance.client.storage
          .from('deal-images')
          .getPublicUrl(path);
    } catch (e, st) {
      AppLogger.error('Failed to upload deal image', e, st);
      return _fallbackImage;
    }
  }

  Future<void> _submit() async {
    final title = _titleCtrl.text.trim();
    final desc = _descCtrl.text.trim();
    final original = _parsePrice(_originalCtrl.text);
    final discounted = _parsePrice(_discountCtrl.text);
    final stock = int.tryParse(_stockCtrl.text) ?? 1;

    if (title.isEmpty || original == 0 || discounted == 0 || stock <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('제목, 가격, 수량을 올바르게 입력해주세요'),
            behavior: SnackBarBehavior.floating),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    // deals.id는 Postgres uuid 컬럼이라 형식이 맞아야 insert가 실패하지 않음
    final dealId = generateUuidV4();
    final imageUrl = await _uploadImage(dealId);

    if (!mounted) return;

    final storeName = _storeNameCtrl.text.trim();
    final deal = DealProvider.createFromForm(
      id: dealId,
      title: title,
      description: desc.isEmpty ? '$title 특가 딜!' : desc,
      originalPrice: original,
      discountedPrice: discounted,
      stock: stock,
      hours: _hours,
      storeCategory: _selectedCategory,
      iconName: _categoryIcons[_selectedCategory] ?? 'store',
      imageUrl: imageUrl,
      storeName: storeName.isEmpty ? '우리 동네 가게' : storeName,
    );

    context.read<DealProvider>().addDeal(deal);
    AppHaptics.success();

    // ScaffoldMessenger를 pop 전에 캡처해야 대시보드에 SnackBar가 표시됨
    final messenger = ScaffoldMessenger.of(context);
    Navigator.pop(context);
    messenger.showSnackBar(
      const SnackBar(
          content: Text('딜이 등록됐어요! 소비자 홈에 바로 반영됩니다 🎉'),
          behavior: SnackBarBehavior.floating),
    );
    // [Claude | 2026-08-21] 수정범위: _submit() 딜 등록 완료 — 제출 시점 단일 햅틱을 성공 시점 AppHaptics.success() 더블 햅틱으로 교체
  }

  @override
  Widget build(BuildContext context) {
    final categories = dealCategories.where((c) => c != '전체').toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('딜 올리기', style: TextStyle(fontWeight: FontWeight.w800)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // 이미지 선택
          Row(
            children: [
              _Label('상품 사진'),
              const Spacer(),
              if (_imageFile != null || _selectedPresetUrl != null)
                GestureDetector(
                  onTap: () => setState(() {
                    _imageFile = null;
                    _selectedPresetUrl = null;
                  }),
                  child: const Text(
                    '초기화',
                    style: TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.w600),
                  ),
                ),
            ],
          ),
          GestureDetector(
            onTap: _pickImage,
            child: Container(
              height: 170,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                    color: AppColors.primary.withValues(alpha: 0.3),
                    style: BorderStyle.solid),
                color: AppColors.primary.withValues(alpha: 0.04),
              ),
              child: _imageFile != null
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(15),
                      child: Image.file(File(_imageFile!.path),
                          fit: BoxFit.cover, width: double.infinity),
                    )
                  : _selectedPresetUrl != null
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(15),
                          child: CachedNetworkImage(
                            imageUrl: _selectedPresetUrl!,
                            fit: BoxFit.cover,
                            width: double.infinity,
                          ),
                        )
                      : ClipRRect(
                          borderRadius: BorderRadius.circular(15),
                          child: Stack(
                            fit: StackFit.expand,
                            children: [
                              CachedNetworkImage(
                                imageUrl: _categoryImages[_selectedCategory]!,
                                fit: BoxFit.cover,
                              ),
                              Container(
                                color: Colors.black.withValues(alpha: 0.45),
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color: Colors.white.withValues(alpha: 0.2),
                                        shape: BoxShape.circle,
                                      ),
                                      child: Icon(LucideIcons.camera, size: 24, color: Colors.white),
                                    ),
                                    const SizedBox(height: 8),
                                    const Text(
                                      '앨범에서 사진 선택',
                                      style: TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w700,
                                          color: Colors.white),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      '$_selectedCategory 고화질 기본 이미지가 적용됩니다',
                                      style: const TextStyle(fontSize: 11, color: Colors.white70),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
            ),
          ),
          const SizedBox(height: 12),

          // 추천 상품 프리셋 (탭 시 고화질 사진 및 기본 정보 자동 입력)
          const Text(
            '⚡ 추천 상품 프리셋 (탭 시 고화질 사진 & 정보 자동완성)',
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.primary),
          ),
          const SizedBox(height: 8),
          SizedBox(
            height: 68,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: _presetTemplates.length,
              itemBuilder: (ctx, i) {
                final t = _presetTemplates[i];
                final isSel = _selectedPresetUrl == t.imageUrl;
                return GestureDetector(
                  onTap: () {
                    AppHaptics.light();
                    setState(() {
                      _selectedPresetUrl = t.imageUrl;
                      _imageFile = null;
                      _selectedCategory = t.category;
                      if (_titleCtrl.text.isEmpty) _titleCtrl.text = t.defaultTitle;
                      if (_originalCtrl.text.isEmpty) _originalCtrl.text = '${t.defaultOriginal}';
                      if (_discountCtrl.text.isEmpty) _discountCtrl.text = '${t.defaultDiscount}';
                    });
                  },
                  child: Container(
                    width: 145,
                    margin: const EdgeInsets.only(right: 8),
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: isSel
                          ? AppColors.primary.withValues(alpha: 0.08)
                          : Theme.of(context).cardTheme.color,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isSel ? AppColors.primary : Colors.grey.withValues(alpha: 0.2),
                        width: isSel ? 2 : 1,
                      ),
                    ),
                    child: Row(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: CachedNetworkImage(
                            imageUrl: t.imageUrl,
                            width: 48,
                            height: 48,
                            fit: BoxFit.cover,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            t.label,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: isSel ? FontWeight.w800 : FontWeight.w600,
                              color: isSel ? AppColors.primary : null,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 18),

          // 카테고리
          _Label('카테고리'),
          Wrap(
            spacing: 8,
            children: categories.map((cat) {
              final selected = cat == _selectedCategory;
              return GestureDetector(
                onTap: () => setState(() => _selectedCategory = cat),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 180),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: selected ? AppColors.primary : Colors.transparent,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: selected
                          ? AppColors.primary
                          : Colors.grey.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Text(
                    cat,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight:
                          selected ? FontWeight.w700 : FontWeight.w400,
                      color: selected ? Colors.white : Colors.grey[600],
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 16),

          // 가게 이름
          _Label('가게 이름'),
          _Field(
              controller: _storeNameCtrl,
              hint: '예: 성수 베이커리'),
          const SizedBox(height: 16),

          // 딜 제목
          _Label('딜 제목'),
          _Field(controller: _titleCtrl, hint: '예: 오늘의 마감 크루아상 세트'),
          const SizedBox(height: 16),

          // 딜 설명
          _Label('딜 설명'),
          _Field(
              controller: _descCtrl,
              hint: '상품 설명을 입력해주세요',
              maxLines: 3),
          const SizedBox(height: 16),

          // 가격
          Row(children: [
            Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _Label('원래 가격'),
                    _Field(
                        controller: _originalCtrl,
                        hint: '12,000',
                        isPrice: true,
                        suffix: '원'),
                  ]),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _Label('할인 가격'),
                    _Field(
                        controller: _discountCtrl,
                        hint: '5,000',
                        isPrice: true,
                        suffix: '원'),
                  ]),
            ),
          ]),
          const SizedBox(height: 16),

          // 수량
          _Label('판매 수량'),
          _Field(
              controller: _stockCtrl,
              hint: '10',
              isNumber: true,
              suffix: '개'),
          const SizedBox(height: 16),

          // 마감 시간
          _Label('마감 시간'),
          Row(
            children: List.generate(4, (i) {
              final h = i + 1;
              final selected = _hours == h;
              return GestureDetector(
                onTap: () => setState(() => _hours = h),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 180),
                  margin: const EdgeInsets.only(right: 10),
                  padding: const EdgeInsets.symmetric(
                      horizontal: 20, vertical: 10),
                  decoration: BoxDecoration(
                    color: selected ? AppColors.primary : Colors.transparent,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: selected
                          ? AppColors.primary
                          : Colors.grey.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Text('$h시간',
                      style: TextStyle(
                        fontWeight: selected
                            ? FontWeight.w700
                            : FontWeight.w400,
                        color:
                            selected ? Colors.white : Colors.grey[600],
                      )),
                ),
              );
            }),
          ),
          const SizedBox(height: 32),

          ElevatedButton(
            onPressed: _isSubmitting ? null : _submit,
            child: _isSubmitting
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white),
                  )
                : const Text('딜 등록하기',
                    style: TextStyle(
                        fontSize: 16, fontWeight: FontWeight.w700)),
          ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }
}

class _Label extends StatelessWidget {
  final String text;
  const _Label(this.text);

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(text,
            style: const TextStyle(
                fontSize: 14, fontWeight: FontWeight.w600)),
      );
}

class _Field extends StatelessWidget {
  final TextEditingController controller;
  final String hint;
  final int maxLines;
  final bool isNumber;
  final bool isPrice;
  final String? suffix;

  const _Field(
      {required this.controller,
      required this.hint,
      this.maxLines = 1,
      this.isNumber = false,
      this.isPrice = false,
      this.suffix});

  @override
  Widget build(BuildContext context) {
    List<TextInputFormatter>? formatters;
    if (isPrice) {
      formatters = [_ThousandsSeparatorFormatter()];
    } else if (isNumber) {
      formatters = [FilteringTextInputFormatter.digitsOnly];
    }

    return TextField(
      controller: controller,
      maxLines: maxLines,
      keyboardType:
          (isNumber || isPrice) ? TextInputType.number : TextInputType.text,
      inputFormatters: formatters,
      decoration: InputDecoration(
        hintText: hint,
        suffixText: suffix,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide:
              BorderSide(color: Colors.grey.withValues(alpha: 0.3)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide:
              BorderSide(color: Colors.grey.withValues(alpha: 0.2)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppColors.primary),
        ),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      ),
    );
  }
}

class _ThousandsSeparatorFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
      TextEditingValue oldValue, TextEditingValue newValue) {
    final digits = newValue.text.replaceAll(',', '');
    if (digits.isEmpty) return newValue.copyWith(text: '');
    final formatted = _addCommas(digits);
    return newValue.copyWith(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }

  String _addCommas(String digits) {
    final buf = StringBuffer();
    for (int i = 0; i < digits.length; i++) {
      if (i != 0 && (digits.length - i) % 3 == 0) buf.write(',');
      buf.write(digits[i]);
    }
    return buf.toString();
  }
}
