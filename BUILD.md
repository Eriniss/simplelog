# SimpleLog 빌드 가이드

## 🏗️ Docker 빌드 옵션

### 방법 1: 자동 빌드 (권장)

```bash
./deploy.sh
```

최신 안정 버전의 Go를 사용하여 자동으로 빌드 및 배포합니다.

---

### 방법 2: 특정 Go 버전 지정

#### docker-compose.yml 수정

```yaml
services:
  simplelog:
    build:
      context: .
      dockerfile: Dockerfile.versioned  # 버전 지정 가능한 Dockerfile 사용
      args:
        GO_VERSION: "1.23"  # 원하는 Go 버전
```

그 후 빌드:

```bash
docker-compose build --no-cache
docker-compose up -d
```

#### 직접 빌드

```bash
# Go 1.23 사용
docker build --build-arg GO_VERSION=1.23 -f Dockerfile.versioned -t simplelog .

# Go 1.22 사용
docker build --build-arg GO_VERSION=1.22 -f Dockerfile.versioned -t simplelog .

# 컨테이너 실행
docker run -d -p 3000:3000 --name simplelog simplelog
```

---

### 방법 3: 로컬 빌드 (Docker 없이)

Go가 로컬에 설치되어 있는 경우:

```bash
# 의존성 다운로드
go mod download

# 빌드
CGO_ENABLED=1 go build -o simplelog

# 실행
./simplelog
```

**주의**: SQLite를 사용하므로 CGO가 활성화되어야 합니다.

---

## 🔍 Go 버전 확인

### go.mod 확인

```bash
cat go.mod | grep "^go "
```

현재 프로젝트는 **Go 1.25.0**을 요구합니다.

### Docker 이미지의 Go 버전 확인

```bash
# 빌드된 이미지의 Go 버전 확인
docker run --rm simplelog go version

# 또는 빌더 스테이지 확인
docker build --target builder -t simplelog-builder .
docker run --rm simplelog-builder go version
```

---

## ⚙️ 빌드 최적화

### 캐시 활용

```bash
# 캐시 사용 (빠름)
docker-compose build

# 캐시 무시 (깨끗한 빌드)
docker-compose build --no-cache
```

### 멀티 플랫폼 빌드

```bash
# AMD64 + ARM64 빌드
docker buildx build --platform linux/amd64,linux/arm64 -t simplelog .
```

---

## 🐛 빌드 문제 해결

### Go 버전 불일치

**증상**: `go: module requires Go 1.25.0` 오류

**해결책**:
1. 최신 Dockerfile 사용 (`FROM golang:alpine`)
2. 또는 특정 버전 지정 (`Dockerfile.versioned` 사용)

```bash
docker build --build-arg GO_VERSION=1.25 -f Dockerfile.versioned .
```

### CGO 오류

**증상**: SQLite 관련 빌드 오류

**해결책**: gcc와 musl-dev가 설치되어 있는지 확인
```dockerfile
RUN apk add --no-cache gcc musl-dev sqlite-dev
```

### 모듈 다운로드 실패

**증상**: `go: module ... not found`

**해결책**:
```bash
# go.mod와 go.sum 정리
go mod tidy

# 모듈 재다운로드
go mod download
```

---

## 📊 빌드 결과 확인

### 이미지 크기

```bash
docker images simplelog
```

일반적으로 20-30MB 정도의 크기를 가집니다.

### 바이너리 정보

```bash
# 정적 링킹 확인
docker run --rm simplelog ldd ./simplelog
# 출력: "not a dynamic executable" (정적 링킹 성공)

# 바이너리 크기
docker run --rm simplelog ls -lh ./simplelog
```

---

## 🚀 빌드 성능 향상

### BuildKit 사용

```bash
# BuildKit 활성화
export DOCKER_BUILDKIT=1

# 빌드
docker-compose build
```

### 빌드 캐시 마운트

Dockerfile에 캐시 마운트 추가:
```dockerfile
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download
```

---

## 📝 Go 버전별 차이점

### Go 1.22
- 기본 루프 변수 동작 변경
- 향상된 성능

### Go 1.23
- 새로운 `iter` 패키지
- 표준 라이브러리 개선

### Go 1.25 (프로젝트 요구 버전)
- 최신 기능 및 최적화
- 보안 패치 포함

**권장**: 가능한 최신 버전 사용
