# SimpleLog 빠른 시작 가이드

## 🚀 1분 안에 시작하기

### 배포

```bash
./deploy.sh
```

### 자동 시작 설정

```bash
sudo ./setup-autostart.sh
```

### 접속

http://localhost:3000

---

## 주요 명령어

```bash
# 로그 확인
docker-compose logs -f

# 서비스 재시작
docker-compose restart

# 서비스 중지
docker-compose down

# 서비스 시작
docker-compose up -d
```

## 설정 변경

`.env` 파일 수정 후:

```bash
./deploy.sh
```

자세한 내용은 [DOCKER.md](DOCKER.md) 참조.
