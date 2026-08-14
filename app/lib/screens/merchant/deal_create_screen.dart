import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/data/mock_data.dart';
import '../../core/providers/deal_provider.dart';
import '../../core/theme/app_colors.dart';

// 카테고리별 아이콘 & 기본 이미지
const _categoryIcons = {
  '베이커리': 'wheat',
  '음식': 'utensils',
  '카페': 'coffee',
  '마트': 'shoppingCart',
  '꽃집': 'flower2',
};

const _categoryImages = {
  '베이커리': 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&h=400&fit=crop&auto=format&q=80',
  '음식': 'https://images.unsplash.com/photo-1635363638580-c2809d049eee?w=400&h=400&fit=crop&auto=format&q=80',
  '카페': 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&h=400&fit=crop&auto=format&q=80',
  '마트': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=400&fit=crop&auto=format&q=80',
  '꽃집': 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=400&fit=crop&auto=format&q=80',
};

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

  int _parsePrice(String text) =>
      int.tryParse(text.replaceAll(',', '')) ?? 0;

  Future<void> _pickImage() async {
    final picked = await ImagePicker().pickImage(
      source: ImageSource.gallery,
      imageQuality: 80,
      maxWidth: 800,
      maxHeight: 800,
    );
    if (picked != null) setState(() => _imageFile = picked);
  }

  Future<String> _uploadImage(String dealId) async {
    if (_imageFile == null) {
      return _categoryImages[_selectedCategory] ??
          _categoryImages['베이커리']!;
    }
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
    } catch (_) {
      // Storage 버킷 없거나 업로드 실패 → 카테고리 기본 이미지 사용
      return _categoryImages[_selectedCategory] ?? _categoryImages['베이커리']!;
    }
  }

  Future<void> _submit() async {
    final title = _titleCtrl.text.trim();
    final desc = _descCtrl.text.trim();
    final original = _parsePrice(_originalCtrl.text);
    final discounted = _parsePrice(_discountCtrl.text);
    final stock = int.tryParse(_stockCtrl.text) ?? 1;

    if (title.isEmpty || original == 0 || discounted == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('제목과 가격을 입력해주세요'),
            behavior: SnackBarBehavior.floating),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    HapticFeedback.mediumImpact();

    final dealId = 'new_${DateTime.now().millisecondsSinceEpoch}';
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
      storeName: storeName.isEmpty ? '성수 베이커리' : storeName,
    );

    context.read<DealProvider>().addDeal(deal);

    // ScaffoldMessenger를 pop 전에 캡처해야 대시보드에 SnackBar가 표시됨
    final messenger = ScaffoldMessenger.of(context);
    Navigator.pop(context);
    messenger.showSnackBar(
      const SnackBar(
          content: Text('딜이 등록됐어요! 소비자 홈에 바로 반영됩니다 🎉'),
          behavior: SnackBarBehavior.floating),
    );
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
          _Label('상품 사진'),
          GestureDetector(
            onTap: _pickImage,
            child: Container(
              height: 160,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                    color: AppColors.primary.withValues(alpha: 0.3),
                    style: BorderStyle.solid),
                color: AppColors.primary.withValues(alpha: 0.04),
              ),
              child: _imageFile != null
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(11),
                      child: Image.file(File(_imageFile!.path),
                          fit: BoxFit.cover, width: double.infinity),
                    )
                  : Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(LucideIcons.imagePlus,
                            size: 36, color: AppColors.primary.withValues(alpha: 0.6)),
                        const SizedBox(height: 8),
                        Text('탭해서 사진 선택',
                            style: TextStyle(
                                fontSize: 13,
                                color: AppColors.primary.withValues(alpha: 0.7))),
                        const SizedBox(height: 4),
                        Text('선택 안 하면 카테고리 기본 이미지 사용',
                            style: TextStyle(fontSize: 11, color: Colors.grey[400])),
                      ],
                    ),
            ),
          ),
          const SizedBox(height: 16),

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
