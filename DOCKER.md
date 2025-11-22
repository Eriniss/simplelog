# SimpleLog Docker Deployment Guide

SimpleLog을 Docker로 배포하고 자동 시작되도록 설정하는 가이드입니다.

## 🚀 빠른 시작

### 1. 환경 변수 설정

`.env` 파일을 확인하고 필요한 값을 설정합니다:

```bash
cp .env.example .env
# .env 파일을 편집하여 Logto 설정 등을 업데이트
```

### 2. 배포 실행

```bash
chmod +x deploy.sh
./deploy.sh
```

배포 스크립트는 다음 작업을 자동으로 수행합니다:
- 기존 컨테이너 중지
- Docker 이미지 빌드
- 컨테이너 시작
- 서비스 상태 확인

### 3. 자동 시작 설정 (선택사항)

시스템 재부팅 시 자동으로 SimpleLog가 시작되도록 설정:

```bash
chmod +x setup-autostart.sh
sudo ./setup-autostart.sh
```

## 📦 Docker 구성

### Dockerfile

- **Multi-stage build**: 빌드 단계와 실행 단계 분리로 이미지 크기 최소화
- **최신 Go 버전**: `golang:alpine` 이미지로 항상 최신 안정 버전 사용
- **정적 링킹**: SQLite를 포함한 완전한 정적 바이너리 생성
- **환경 변수 내장**: `.env` 파일이 이미지에 포함되어 별도 관리 불필요
- **SQLite 내장**: 데이터베이스가 애플리케이션과 함께 패키징됨

### Go 버전 관리

#### 기본 방식 (권장)
`Dockerfile`은 최신 안정 버전의 Go를 자동으로 사용합니다:
```dockerfile
FROM golang:alpine AS builder
```

#### 특정 버전 지정
특정 Go 버전을 사용하려면 `Dockerfile.versioned`를 사용:
```bash
# Go 1.23 사용
docker build --build-arg GO_VERSION=1.23 -f Dockerfile.versioned -t simplelog .

# Go 1.22 사용
docker build --build-arg GO_VERSION=1.22 -f Dockerfile.versioned -t simplelog .

# 최신 버전 사용 (기본값)
docker build -f Dockerfile.versioned -t simplelog .
```

docker-compose.yml에서 사용하려면:
```yaml
services:
  simplelog:
    build:
      context: .
      dockerfile: Dockerfile.versioned
      args:
        GO_VERSION: "1.23"
```

### docker-compose.yml

```yaml
services:
  simplelog:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - simplelog_data:/root/data  # 데이터 영속성
    restart: always  # 자동 재시작
```

## 🔧 주요 명령어

### 기본 명령어

```bash
# 서비스 시작
docker-compose up -d

# 서비스 중지
docker-compose down

# 서비스 재시작
docker-compose restart

# 로그 확인
docker-compose logs -f

# 상태 확인
docker-compose ps
```

### 재빌드

환경 변수나 코드를 변경한 경우:

```bash
# 이미지 재빌드
docker-compose build --no-cache

# 재시작
docker-compose up -d
```

### 데이터 관리

```bash
# 데이터베이스 백업
docker-compose exec simplelog sqlite3 blog.db .dump > backup.sql

# 볼륨 확인
docker volume ls

# 볼륨 삭제 (주의: 모든 데이터 삭제됨)
docker-compose down -v
```

## 🌐 접속

서비스가 실행되면 다음 주소로 접속:

- **로컬**: http://localhost:3000
- **프로덕션**: 설정한 도메인 (예: https://blog.polipixel.link)

## 🔐 보안 고려사항

### 프로덕션 환경

1. **HTTPS 설정**: 리버스 프록시(nginx, Caddy 등) 사용 권장
2. **환경 변수**: `.env` 파일에 민감한 정보가 포함되므로 이미지 배포 시 주의
3. **방화벽**: 필요한 포트만 개방
4. **정기 백업**: 데이터베이스 정기 백업 설정

### .env 파일 보안

`.env` 파일이 이미지에 포함되므로:
- 이미지를 공개 레지스트리에 푸시하지 마세요
- 프라이빗 레지스트리 사용 권장
- 또는 런타임에 환경 변수 주입 방식 고려

## 📊 모니터링

### 로그 확인

```bash
# 실시간 로그
docker-compose logs -f simplelog

# 최근 100줄
docker-compose logs --tail=100 simplelog
```

### 헬스체크

Docker Compose에 헬스체크가 설정되어 있어 자동으로 서비스 상태를 모니터링합니다:

```bash
# 헬스 상태 확인
docker inspect simplelog | grep -A 10 Health
```

## 🐛 문제 해결

### 서비스가 시작되지 않는 경우

1. 로그 확인:
   ```bash
   docker-compose logs simplelog
   ```

2. 컨테이너 재시작:
   ```bash
   docker-compose restart
   ```

3. 완전 재빌드:
   ```bash
   docker-compose down
   docker-compose build --no-cache
   docker-compose up -d
   ```

### 데이터베이스 문제

```bash
# 컨테이너 내부 접속
docker-compose exec simplelog sh

# SQLite 데이터베이스 확인
sqlite3 blog.db
.tables
.schema posts
SELECT COUNT(*) FROM posts;
```

### 포트 충돌

다른 서비스가 3000번 포트를 사용 중인 경우:

```bash
# docker-compose.yml 수정
ports:
  - "3001:3000"  # 외부 포트를 3001로 변경
```

## 🔄 업데이트

코드나 설정 변경 후 업데이트:

```bash
# 1. 이미지 재빌드
docker-compose build

# 2. 서비스 재시작
docker-compose up -d

# 또는 deploy.sh 스크립트 사용
./deploy.sh
```

## 📝 자동 시작 관리

### macOS (launchd)

```bash
# 상태 확인
sudo launchctl list | grep simplelog

# 서비스 중지
sudo launchctl unload /Library/LaunchDaemons/com.simplelog.app.plist

# 서비스 시작
sudo launchctl load /Library/LaunchDaemons/com.simplelog.app.plist

# 로그 확인
tail -f /tmp/simplelog.*.log
```

### Linux (systemd)

```bash
# 상태 확인
sudo systemctl status simplelog

# 서비스 중지
sudo systemctl stop simplelog

# 서비스 시작
sudo systemctl start simplelog

# 로그 확인
sudo journalctl -u simplelog -f

# 자동 시작 비활성화
sudo systemctl disable simplelog
```

## 🎯 프로덕션 배포 체크리스트

- [ ] `.env` 파일의 모든 값이 프로덕션 환경에 맞게 설정됨
- [ ] HTTPS 설정 완료 (리버스 프록시)
- [ ] 방화벽 설정 확인
- [ ] 데이터베이스 백업 전략 수립
- [ ] 모니터링 설정
- [ ] 자동 시작 설정
- [ ] 로그 로테이션 설정
- [ ] 보안 헤더 설정 (nginx)
