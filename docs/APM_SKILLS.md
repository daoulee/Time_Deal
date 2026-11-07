# APM 스킬 관리

이 저장소는 Codex 프로젝트 스킬을 `apm.yml`과 `apm.lock.yaml`로 관리합니다. `frontend-design`과 Flutter 4개, Dart 3개 스킬을 지정합니다. Flutter·Dart 스킬의 출처는 [Flutter 공식 저장소](https://github.com/flutter/agent-plugins)와 [Dart 공식 저장소](https://github.com/dart-lang/skills)입니다.

공식 APM CLI를 설치한 후 저장소 루트에서 `apm install --frozen`을 실행하면 잠금 파일에 기록된 버전의 스킬이 `.agents/skills/`에 설치됩니다. 설치 전 기존 스킬과 충돌이 없는지 확인합니다. `apm_modules/`는 재생성 가능한 캐시입니다.

Dependabot은 APM 의존성의 변경을 매주 확인합니다. 업데이트 PR이 생성되면 스킬 출처, 내용, 잠금 파일과 실행 결과를 확인하고 병합합니다. 업데이트할 내용이 없으면 PR이 만들어지지 않을 수 있습니다. 현재 Codex 대상으로만 설치를 확인했으며 다른 에이전트 환경은 별도 확인이 필요합니다.
