# Docker 배포 가이드

## 개요

이 프로젝트는 3개의 Docker 컨테이너로 구성됩니다:
- **PostgreSQL**: 데이터베이스 (포트 5432)
- **Backend**: Go API 서버 (포트 3000)
- **Frontend**: React SPA (Nginx, 포트 8080)

## 빌드 및 실행

### 전체 스택 실행 (권장)

```bash
# 모든 컨테이너 빌드 및 실행
docker-compose -f docker-compose.prod.yml up -d --build

# 로그 확인
docker-compose -f docker-compose.prod.yml logs -f

# 중지
docker-compose -f docker-compose.prod.yml down

# 중지 및 볼륨 삭제 (데이터 완전 삭제)
docker-compose -f docker-compose.prod.yml down -v
```

### 개별 컨테이너 빌드

#### 백엔드만 빌드
```bash
docker build -f Dockerfile.backend -t simplelog-backend .
docker run -d \
  --name simplelog-backend \
  -p 3000:3000 \
  --network simplelog-network \
  -e DB_HOST=postgres \
  simplelog-backend
```

#### 프론트엔드만 빌드
```bash
cd frontend
docker build -t simplelog-frontend .
docker run -d \
  --name simplelog-frontend \
  -p 8080:80 \
  simplelog-frontend
```

## 접속 정보

### 개발 환경 (docker-compose.prod.yml)
- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:3000
- **PostgreSQL**: localhost:5432

### 외부 Nginx 리버스 프록시 설정 예시

```nginx
# /etc/nginx/sites-available/simplelog
server {
    listen 80;
    server_name your-domain.com;

    # Frontend (React SPA)
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Auth endpoints
    location /auth {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /oidc {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 환경 변수

### 백엔드 (.env 파일 포함됨)
프로젝트 루트의 `.env` 파일이 이미 Docker 이미지에 포함되어 있습니다.

추가로 환경 변수를 오버라이드하려면:
```bash
docker run -e DB_HOST=custom-host -e PORT=8000 simplelog-backend
```

### 프론트엔드
프로덕션 빌드 시 `frontend/.env.production` 파일이 사용됩니다.
`VITE_API_BASE_URL`이 비어있으면 동일 origin(nginx)을 사용합니다.

## 데이터 백업

### PostgreSQL 데이터 백업
```bash
# 백업
docker exec simplelog-postgres pg_dump -U simplelog simplelog > backup.sql

# 복원
docker exec -i simplelog-postgres psql -U simplelog simplelog < backup.sql
```

### 볼륨 백업
```bash
# 볼륨 위치 확인
docker volume inspect simplelog_postgres_data

# 볼륨 백업
docker run --rm -v simplelog_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz -C /data .

# 볼륨 복원
docker run --rm -v simplelog_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres_backup.tar.gz -C /data
```

## 트러블슈팅

### 컨테이너 상태 확인
```bash
docker-compose -f docker-compose.prod.yml ps
```

### 로그 확인
```bash
# 전체 로그
docker-compose -f docker-compose.prod.yml logs

# 특정 서비스 로그
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs frontend
docker-compose -f docker-compose.prod.yml logs postgres
```

### 데이터베이스 연결 확인
```bash
# PostgreSQL에 접속
docker exec -it simplelog-postgres psql -U simplelog -d simplelog

# 테이블 확인
\dt
SELECT * FROM posts;
```

### 컨테이너 재시작
```bash
# 전체 재시작
docker-compose -f docker-compose.prod.yml restart

# 특정 서비스만 재시작
docker-compose -f docker-compose.prod.yml restart backend
```

### 이미지 재빌드
```bash
# 캐시 없이 완전 재빌드
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```

## 업데이트

코드 변경 후 재배포:

```bash
# 1. 컨테이너 중지
docker-compose -f docker-compose.prod.yml down

# 2. 이미지 재빌드
docker-compose -f docker-compose.prod.yml build

# 3. 재시작
docker-compose -f docker-compose.prod.yml up -d
```

## 리소스 관리

### 사용 중인 리소스 확인
```bash
docker stats
```

### 미사용 리소스 정리
```bash
# 미사용 이미지 삭제
docker image prune -a

# 미사용 볼륨 삭제 (주의: 데이터 손실 가능)
docker volume prune

# 전체 정리
docker system prune -a
```

## 보안 고려사항

1. **.env 파일**: 개인 사용을 위해 이미지에 포함되어 있지만, 공개 저장소에 push하지 마세요
2. **PostgreSQL 비밀번호**: 프로덕션에서는 강력한 비밀번호 사용
3. **HTTPS**: 외부 Nginx에서 SSL/TLS 설정 권장
4. **방화벽**: 필요한 포트만 열기 (8080, 3000은 내부 네트워크만 접근)
