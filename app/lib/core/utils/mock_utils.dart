const _mockCustomerNames = [
  '김동네', '이성수', '박뚝섬', '최서울', '정한강', '강마포', '윤뚝섬', '임성수',
];

String mockCustomerName(String id) {
  if (id.isEmpty) return '고객';
  final hash = id.codeUnits.fold(0, (a, b) => a + b);
  return _mockCustomerNames[hash % _mockCustomerNames.length];
}
