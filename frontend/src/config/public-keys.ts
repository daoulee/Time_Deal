/**
 * 브라우저에 공개해도 되는 클라이언트 설정값만 읽고 정규화합니다.
 * Google 로그인 등 선택 기능이 공개 키를 사용할 때 소비하며 서버 비밀키는 취급하지 않습니다.
 * service role key 같은 서버 자격증명을 VITE 환경변수로 추가하면 안 됩니다.
 */
export const publicKeys = {
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "",
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? ""
};
