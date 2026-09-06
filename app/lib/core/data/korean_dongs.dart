// [Antigravity | 2026-08-23] 수정범위: korean_dongs.dart — 수도권 및 주요 행정동 표준 위경도 데이터셋 및 반경 내 전체 동네(0km ~ Max Radius) 거리순 탐색 지원
import '../utils/geo_utils.dart';

class NearbyDong {
  final String name;
  final double distanceKm;
  final String district;

  const NearbyDong({
    required this.name,
    required this.distanceKm,
    required this.district,
  });
}

const Map<String, ({double lat, double lng, String district})> koreanDongDatabase = {
  // 시흥시
  '신천동': (lat: 37.4420, lng: 126.7860, district: '경기 시흥시'),
  '대야동': (lat: 37.4460, lng: 126.7930, district: '경기 시흥시'),
  '은행동': (lat: 37.4475, lng: 126.7904, district: '경기 시흥시'),
  '매화동': (lat: 37.4330, lng: 126.8200, district: '경기 시흥시'),
  '과림동': (lat: 37.4610, lng: 126.8320, district: '경기 시흥시'),
  '목감동': (lat: 37.3880, lng: 126.8620, district: '경기 시흥시'),
  '능곡동': (lat: 37.3680, lng: 126.8120, district: '경기 시흥시'),
  '장곡동': (lat: 37.3820, lng: 126.7850, district: '경기 시흥시'),
  '장현동': (lat: 37.3780, lng: 126.8010, district: '경기 시흥시'),
  '하중동': (lat: 37.4040, lng: 126.8050, district: '경기 시흥시'),
  '미산동': (lat: 37.4240, lng: 126.7970, district: '경기 시흥시'),
  '포동': (lat: 37.4110, lng: 126.7860, district: '경기 시흥시'),
  '방산동': (lat: 37.4300, lng: 126.7720, district: '경기 시흥시'),
  '월곶동': (lat: 37.3890, lng: 126.7410, district: '경기 시흥시'),
  '정왕동': (lat: 37.3480, lng: 126.7320, district: '경기 시흥시'),
  '배곧동': (lat: 37.3650, lng: 126.7280, district: '경기 시흥시'),
  '군자동': (lat: 37.3510, lng: 126.7890, district: '경기 시흥시'),
  '거모동': (lat: 37.3450, lng: 126.7980, district: '경기 시흥시'),

  // 부천시 (소사구/원미구/오정구)
  '소사본동': (lat: 37.4720, lng: 126.7940, district: '경기 부천시'),
  '심곡본동': (lat: 37.4810, lng: 126.7860, district: '경기 부천시'),
  '괴안동': (lat: 37.4820, lng: 126.8120, district: '경기 부천시'),
  '범박동': (lat: 37.4690, lng: 126.8160, district: '경기 부천시'),
  '옥길동': (lat: 37.4670, lng: 126.8280, district: '경기 부천시'),
  '송내동': (lat: 37.4850, lng: 126.7600, district: '경기 부천시'),
  '중동': (lat: 37.5020, lng: 126.7640, district: '경기 부천시'),
  '상동': (lat: 37.5050, lng: 126.7530, district: '경기 부천시'),
  '심곡동': (lat: 37.4880, lng: 126.7840, district: '경기 부천시'),
  '원미동': (lat: 37.4940, lng: 126.7930, district: '경기 부천시'),
  '역곡동': (lat: 37.4890, lng: 126.8110, district: '경기 부천시'),
  '춘의동': (lat: 37.5030, lng: 126.7920, district: '경기 부천시'),
  '도당동': (lat: 37.5140, lng: 126.7870, district: '경기 부천시'),
  '약대동': (lat: 37.5100, lng: 126.7720, district: '경기 부천시'),

  // 광명시
  '광명동': (lat: 37.4790, lng: 126.8620, district: '경기 광명시'),
  '철산동': (lat: 37.4780, lng: 126.8710, district: '경기 광명시'),
  '하안동': (lat: 37.4590, lng: 126.8740, district: '경기 광명시'),
  '소하동': (lat: 37.4440, lng: 126.8870, district: '경기 광명시'),
  '일직동': (lat: 37.4210, lng: 126.8850, district: '경기 광명시'),
  '노온사동': (lat: 37.4480, lng: 126.8450, district: '경기 광명시'),
  '옥길동(광명)': (lat: 37.4710, lng: 126.8380, district: '경기 광명시'),

  // 인천광역시 (남동구/부평구/연수구/미추홀구)
  '장수동': (lat: 37.4490, lng: 126.7580, district: '인천 남동구'),
  '서창동': (lat: 37.4330, lng: 126.7510, district: '인천 남동구'),
  '만수동': (lat: 37.4560, lng: 126.7320, district: '인천 남동구'),
  '구월동': (lat: 37.4510, lng: 126.7080, district: '인천 남동구'),
  '간석동': (lat: 37.4640, lng: 126.7060, district: '인천 남동구'),
  '논현동': (lat: 37.4040, lng: 126.7210, district: '인천 남동구'),
  '남촌동': (lat: 37.4280, lng: 126.7190, district: '인천 남동구'),
  '부평동': (lat: 37.4920, lng: 126.7240, district: '인천 부평구'),
  '일신동': (lat: 37.4810, lng: 126.7450, district: '인천 부평구'),
  '십정동': (lat: 37.4760, lng: 126.6970, district: '인천 부평구'),
  '주안동': (lat: 37.4620, lng: 126.6800, district: '인천 미추홀구'),
  '도화동': (lat: 37.4710, lng: 126.6660, district: '인천 미추홀구'),
  '연수동': (lat: 37.4170, lng: 126.6780, district: '인천 연수구'),
  '송도동': (lat: 37.3890, lng: 126.6520, district: '인천 연수구'),

  // 안양시 (만안구/동안구)
  '안양동': (lat: 37.3943, lng: 126.9248, district: '경기 안양시'),
  '석수동': (lat: 37.4280, lng: 126.9080, district: '경기 안양시'),
  '박달동': (lat: 37.4060, lng: 126.8970, district: '경기 안양시'),
  '비산동': (lat: 37.4025, lng: 126.9463, district: '경기 안양시'),
  '관양동': (lat: 37.4010, lng: 126.9630, district: '경기 안양시'),
  '평촌동': (lat: 37.3930, lng: 126.9650, district: '경기 안양시'),
  '호계동': (lat: 37.3780, lng: 126.9530, district: '경기 안양시'),

  // 안산시 (상록구/단원구)
  '고잔동': (lat: 37.3180, lng: 126.8320, district: '경기 안산시'),
  '원곡동': (lat: 37.3320, lng: 126.7980, district: '경기 안산시'),
  '선부동': (lat: 37.3460, lng: 126.8110, district: '경기 안산시'),
  '와동': (lat: 37.3390, lng: 126.8240, district: '경기 안산시'),
  '성포동': (lat: 37.3270, lng: 126.8480, district: '경기 안산시'),
  '월피동': (lat: 37.3370, lng: 126.8520, district: '경기 안산시'),
  '일동': (lat: 37.3120, lng: 126.8610, district: '경기 안산시'),
  '본오동': (lat: 37.3010, lng: 126.8680, district: '경기 안산시'),

  // 서울 서남권 (구로/금천/양천/영등포)
  '오류동': (lat: 37.4940, lng: 126.8450, district: '서울 구로구'),
  '천왕동': (lat: 37.4860, lng: 126.8410, district: '서울 구로구'),
  '항동': (lat: 37.4810, lng: 126.8280, district: '서울 구로구'),
  '온수동': (lat: 37.4960, lng: 126.8240, district: '서울 구로구'),
  '개봉동': (lat: 37.4950, lng: 126.8560, district: '서울 구로구'),
  '고척동': (lat: 37.5020, lng: 126.8610, district: '서울 구로구'),
  '구로동': (lat: 37.4920, lng: 126.8870, district: '서울 구로구'),
  '가산동': (lat: 37.4780, lng: 126.8890, district: '서울 금천구'),
  '독산동': (lat: 37.4680, lng: 126.8970, district: '서울 금천구'),
  '시흥동(서울)': (lat: 37.4520, lng: 126.9070, district: '서울 금천구'),
  '신월동': (lat: 37.5250, lng: 126.8370, district: '서울 양천구'),
  '신정동': (lat: 37.5180, lng: 126.8610, district: '서울 양천구'),
  '목동': (lat: 37.5320, lng: 126.8740, district: '서울 양천구'),
  '문래동': (lat: 37.5180, lng: 126.8970, district: '서울 영등포구'),
  '당산동': (lat: 37.5340, lng: 126.8990, district: '서울 영등포구'),
  '여의도동': (lat: 37.5210, lng: 126.9240, district: '서울 영등포구'),

  // 서울 중심 / 주요 지역
  '성수동1가': (lat: 37.5453, lng: 127.0554, district: '서울 성동구'),
  '성수동2가': (lat: 37.5444, lng: 127.0557, district: '서울 성동구'),
  '역삼동': (lat: 37.4990, lng: 127.0370, district: '서울 강남구'),
  '서초동': (lat: 37.4920, lng: 127.0120, district: '서울 서초구'),
  '마포동': (lat: 37.5390, lng: 126.9460, district: '서울 마포구'),
  '합정동': (lat: 37.5490, lng: 126.9140, district: '서울 마포구'),
  '연남동': (lat: 37.5660, lng: 126.9240, district: '서울 마포구'),
};

/// 기준 좌표에서 반경(maxRadiusKm) 이내의 모든 동네를 **가장 가까운 거리부터(0.0km ~ maxRadiusKm)** 정렬하여 반환
List<NearbyDong> getDongsWithinRadius(
  double centerLat,
  double centerLng,
  double maxRadiusKm,
) {
  final results = <NearbyDong>[];

  for (final entry in koreanDongDatabase.entries) {
    final dongName = entry.key;
    final info = entry.value;
    final distance = GeoUtils.haversine(centerLat, centerLng, info.lat, info.lng);

    if (distance <= maxRadiusKm) {
      results.add(
        NearbyDong(
          name: dongName,
          distanceKm: distance,
          district: info.district,
        ),
      );
    }
  }

  // 거리 기준 오름차순 (가장 가까운 동네부터 0.0km -> Max)
  results.sort((a, b) => a.distanceKm.compareTo(b.distanceKm));
  return results;
}
