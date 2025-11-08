# SimpleLog

Logto와 연동된 간단한 블로그 프로젝트

## 주요 기능

- Logto OIDC 인증
- 블로그 글 CRUD (Create, Read, Update, Delete)
- 역할 기반 권한 관리 (admin/user)
- 마크다운 스타일 에디터 (제목, 볼드, 리스트 지원)
- 브랜드 컬러: #5bd15b

## 기술 스택

### 백엔드
- Go 1.25
- Fiber v3 (웹 프레임워크)
- GORM (ORM)
- SQLite3 (데이터베이스)

### 프론트엔드
- 바닐라 HTML/CSS/JavaScript

## 권한 관리

1. **admin**: 모든 API에 대한 접근 권한
2. **user**: 자신이 작성한 글에 대한 수정/삭제 권한
3. 모든 인증된 사용자는 글 작성 가능
4. 비인증 사용자는 로그인/회원가입 외 모든 API 접근 차단

## 설치 및 실행

### 환경 변수 설정

`.env` 파일이 이미 설정되어 있습니다:

```env
LOGTO_ENDPOINT=https://beh25r.logto.app/oidc
LOGTO_APP_ID=qp0w85gd4suutb5czlbzv
LOGTO_APP_SECRET=1jnuCZbOCYX6RmlSHCL7Rj3Jsd6VfuUj
LOGTO_REDIRECT_URI=http://localhost:3000/oidc/callback
LOGTO_POST_LOGOUT_REDIRECT_URI=http://localhost:3000
PORT=3000
```

### 실행 방법

```bash
# 의존성 설치 (이미 완료됨)
go mod download

# 빌드
go build -o simplelog

# 실행
./simplelog
```

또는 빌드 없이 바로 실행:

```bash
go run main.go
```

서버가 시작되면 http://localhost:3000 에서 접속할 수 있습니다.

## API 엔드포인트

### 인증 (Authentication)
- `GET /auth/login` - Logto 로그인 페이지로 리다이렉트
- `GET /oidc/callback` - OIDC 콜백 처리
- `GET /auth/logout` - 로그아웃

### 사용자 (User)
- `GET /api/me` - 현재 사용자 정보 조회

### 블로그 글 (Posts)
- `GET /api/posts` - 모든 글 목록 조회
- `GET /api/posts/:id` - 특정 글 조회
- `POST /api/posts` - 새 글 작성
- `PUT /api/posts/:id` - 글 수정 (작성자 또는 admin만 가능)
- `DELETE /api/posts/:id` - 글 삭제 (작성자 또는 admin만 가능)

## 프로젝트 구조

```
simplelog/
├── main.go                 # 메인 애플리케이션
├── .env                    # 환경 변수
├── models/
│   └── models.go          # 데이터 모델 (User, Post)
├── middleware/
│   ├── auth.go            # Logto 인증 미들웨어
│   └── permission.go      # 권한 관리 미들웨어
├── handlers/
│   ├── auth.go            # 인증 핸들러
│   └── blog.go            # 블로그 CRUD 핸들러
├── database/
│   └── db.go              # 데이터베이스 초기화
└── public/
    ├── index.html         # 프론트엔드 HTML
    ├── style.css          # 스타일시트
    └── app.js             # 프론트엔드 로직
```

## 에디터 기능

블로그 글 작성 시 다음 마크다운 스타일을 사용할 수 있습니다:

- `# 큰 제목` - H1 태그
- `## 중간 제목` - H2 태그
- `### 작은 제목` - H3 태그
- `**볼드체**` - 볼드 텍스트
- `- 리스트 항목` - 리스트

## Admin 계정 설정

기본적으로 모든 사용자는 'user' 역할로 생성됩니다. Admin 계정을 만들려면:

1. 데이터베이스에 직접 접근하여 사용자의 role을 'admin'으로 변경하거나
2. 코드 수정: `middleware/auth.go`에서 특정 이메일이나 조건으로 admin 역할 부여

예시 (SQLite CLI):
```bash
sqlite3 blog.db
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

## 주의사항

- 현재 Logto는 클라우드에서 실행 중
- 로그인은 Logto 테스트 사이트에서 진행
- 블로그 기능은 localhost:3000에서 테스트
- 프로덕션 환경에서는 HTTPS 사용 필요 (`handlers/auth.go`의 Cookie Secure 옵션 변경)
