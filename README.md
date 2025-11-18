# SimpleLog

Logto와 연동된 간단한 블로그 프로젝트

## 주요 기능

- Logto OIDC 인증
- 블로그 글 CRUD (Create, Read, Update, Delete)
- 댓글 기능 (답글 지원)
- 역할 기반 권한 관리 (admin/user)
- 마크다운 스타일 에디터 (제목, 볼드, 리스트 지원)
- 브랜드 컬러: #5bd15b

## 기술 스택

### 백엔드
- Go 1.25
- Fiber v3 (웹 프레임워크)
- GORM (ORM)
- PostgreSQL 18 (데이터베이스)

### 프론트엔드
- React 18
- TypeScript
- Vite
- React Router
- Axios

## 권한 관리

1. **admin**: 모든 API에 대한 접근 권한
2. **user**: 자신이 작성한 글에 대한 수정/삭제 권한
3. 모든 인증된 사용자는 글 작성 가능
4. 비인증 사용자는 로그인/회원가입 외 모든 API 접근 차단

## 설치 및 실행

### 환경 변수 설정

`.env.example` 파일을 참고하여 `.env` 파일을 생성하세요:

```env
LOGTO_ENDPOINT=https://your-logto-endpoint.com/
LOGTO_APP_ID=your_app_id
LOGTO_APP_SECRET=your_app_secret
LOGTO_REDIRECT_URI=http://localhost:3000/oidc/callback
LOGTO_POST_LOGOUT_REDIRECT_URI=http://localhost:5173
PORT=3000

# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=simplelog
DB_PASSWORD=simplelog_password
DB_NAME=simplelog
```

### 실행 방법

#### 1. PostgreSQL 데이터베이스 시작

```bash
# Docker Compose로 PostgreSQL 시작
docker-compose up -d
```

#### 2. 백엔드 서버 실행

```bash
# Go 의존성 설치
go mod download

# 서버 실행
go run main.go
```

또는 빌드 후 실행:

```bash
# 빌드
go build -o simplelog

# 실행
./simplelog
```

백엔드 서버는 http://localhost:3000 에서 시작됩니다.

#### 3. 프론트엔드 개발 서버 실행

```bash
# 프론트엔드 디렉토리로 이동
cd frontend

# 의존성 설치 (최초 1회)
npm install

# 개발 서버 시작
npm run dev
```

프론트엔드는 http://localhost:5173 에서 접속할 수 있습니다.

#### 4. 프론트엔드 빌드 (프로덕션)

```bash
cd frontend
npm run build
```

빌드된 파일은 `frontend/dist` 폴더에 생성됩니다.

## API 엔드포인트

### 인증 (Authentication)
- `GET /auth/login` - Logto 로그인 페이지로 리다이렉트
- `GET /oidc/callback` - OIDC 콜백 처리
- `GET /auth/logout` - 로그아웃

### 사용자 (User)
- `GET /api/me` - 현재 사용자 정보 조회
- `GET /api/users/:id` - 특정 사용자 프로필 조회
- `PATCH /api/profile` - 프로필 업데이트

### 블로그 글 (Posts)
- `GET /api/posts` - 모든 글 목록 조회
- `GET /api/posts/:id` - 특정 글 조회
- `POST /api/posts` - 새 글 작성
- `PUT /api/posts/:id` - 글 수정 (작성자 또는 admin만 가능)
- `DELETE /api/posts/:id` - 글 삭제 (작성자 또는 admin만 가능)

### 댓글 (Comments)
- `GET /api/posts/:id/comments` - 특정 글의 댓글 목록 조회
- `POST /api/posts/:id/comments` - 댓글 작성
- `PUT /api/comments/:id` - 댓글 수정 (작성자 또는 admin만 가능)
- `DELETE /api/comments/:id` - 댓글 삭제 (작성자 또는 admin만 가능)

## 프로젝트 구조

```
simplelog/
├── main.go                     # 메인 애플리케이션
├── .env                        # 환경 변수
├── docker-compose.yml          # PostgreSQL Docker 설정
├── models/
│   └── models.go              # 데이터 모델 (Post, Comment)
├── middleware/
│   └── auth.go                # Logto 인증 미들웨어
├── handlers/
│   ├── auth.go                # 인증 핸들러
│   ├── blog.go                # 블로그 CRUD 핸들러
│   └── comment.go             # 댓글 CRUD 핸들러
├── database/
│   └── db.go                  # PostgreSQL 연결 및 초기화
└── frontend/                   # React 프론트엔드
    ├── src/
    │   ├── api/               # API 클라이언트
    │   ├── components/        # React 컴포넌트
    │   ├── hooks/             # 커스텀 훅
    │   ├── pages/             # 페이지 컴포넌트
    │   ├── types/             # TypeScript 타입 정의
    │   ├── utils/             # 유틸리티 함수
    │   ├── App.tsx            # 메인 앱 컴포넌트
    │   └── main.tsx           # 엔트리 포인트
    ├── public/                # 정적 파일
    ├── index.html
    ├── vite.config.ts         # Vite 설정
    └── package.json
```

## 에디터 기능

블로그 글 작성 시 다음 마크다운 스타일을 사용할 수 있습니다:

- `# 큰 제목` - H1 태그
- `## 중간 제목` - H2 태그
- `### 작은 제목` - H3 태그
- `**볼드체**` - 볼드 텍스트
- `- 리스트 항목` - 리스트

## Admin 계정 설정

사용자 역할은 Logto의 `customData`에서 관리됩니다. Admin 계정을 설정하려면:

1. Logto 콘솔에서 사용자의 `customData.role`을 `admin`으로 설정
2. 또는 `middleware/auth.go`에서 특정 조건으로 admin 역할 부여 로직 추가

## 아키텍처 특징

### 프론트엔드와 백엔드 분리
- **백엔드**: Go Fiber (포트 3000) - REST API 제공
- **프론트엔드**: React + Vite (포트 5173) - SPA
- **인증**: Logto OIDC를 통한 세션 기반 인증 (Cookie 사용)
- **데이터베이스**: PostgreSQL 18 (Docker로 실행)

### 사용자 데이터 관리
- 사용자 정보는 Logto에서 관리 (DB에 별도 User 테이블 없음)
- Post와 Comment에 작성자 정보 비정규화 저장 (AuthorUsername, AuthorAvatar)
- 모든 API 요청 시 Logto에서 최신 사용자 정보 동기화

## Docker 배포

Docker Compose를 사용하여 전체 스택을 한 번에 배포할 수 있습니다:

```bash
# 전체 스택 빌드 및 실행
docker-compose -f docker-compose.prod.yml up -d --build

# 로그 확인
docker-compose -f docker-compose.prod.yml logs -f

# 중지
docker-compose -f docker-compose.prod.yml down
```

**접속**:
- Frontend: http://localhost:8080
- Backend API: http://localhost:3000

자세한 내용은 [DOCKER.md](DOCKER.md) 참조

## 주의사항

- 개발 환경에서는 HTTP 사용 (쿠키 Secure 플래그 비활성화)
- 프로덕션 환경에서는 HTTPS 필수 (`handlers/auth.go`의 Cookie Secure 옵션 변경)
- Logto redirect URI는 환경에 맞게 설정 필요
- PostgreSQL은 Docker Compose로 관리하거나 별도 서버 사용 가능
- Docker 배포 시 .env 파일이 이미지에 포함됨 (개인 사용)
