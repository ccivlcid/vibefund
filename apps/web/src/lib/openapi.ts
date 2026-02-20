// OpenAPI 3.0 Specification for VibeFund API
// Served at GET /api/v1/openapi.json

export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'VibeFund API',
    version: '1.0.0',
    description: '크라우드 펀딩 플랫폼 VibeFund의 REST API 명세서입니다.\n\n' +
      '## 인증\n' +
      'JWT 토큰을 HttpOnly 쿠키(`token`)에 저장합니다. ' +
      '로그인 후 자동으로 쿠키가 설정되며, 인증이 필요한 엔드포인트는 자동으로 쿠키를 읽습니다.\n\n' +
      '## 응답 형식\n' +
      '모든 응답은 `{ data }` 또는 `{ data, meta }` (페이지네이션) 형식으로 반환됩니다.\n' +
      '에러는 `{ error: { code, message } }` 형식입니다.',
  },
  servers: [{ url: '/api/v1', description: 'VibeFund API v1' }],
  tags: [
    { name: 'Auth',     description: '인증 (회원가입 / 로그인 / 로그아웃)' },
    { name: 'Projects', description: '프로젝트 CRUD' },
    { name: 'Funding',  description: '프로젝트 펀딩 정보' },
    { name: 'Rewards',  description: '리워드 관리' },
    { name: 'Pledges',  description: '후원(펀딩) 처리' },
    { name: 'Comments', description: '댓글' },
    { name: 'Updates',  description: '프로젝트 업데이트' },
    { name: 'Me',       description: '내 계정 / 마이페이지' },
    { name: 'Admin',    description: '관리자 전용' },
    { name: 'Health',   description: '서버 상태' },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'token',
        description: 'JWT 토큰 (HttpOnly 쿠키)',
      },
    },
    schemas: {
      // ─── Common ────────────────────────────────────────────────────────────
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code:    { type: 'string', example: 'UNAUTHORIZED' },
              message: { type: 'string', example: '인증 토큰이 없습니다.' },
            },
          },
        },
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page:        { type: 'integer', example: 1 },
          limit:       { type: 'integer', example: 20 },
          total:       { type: 'integer', example: 100 },
          total_pages: { type: 'integer', example: 5 },
        },
      },
      // ─── User ──────────────────────────────────────────────────────────────
      User: {
        type: 'object',
        properties: {
          id:         { type: 'string', format: 'uuid' },
          email:      { type: 'string', format: 'email' },
          name:       { type: 'string' },
          role:       { type: 'string', enum: ['user', 'admin'] },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      // ─── Project ───────────────────────────────────────────────────────────
      Project: {
        type: 'object',
        properties: {
          id:               { type: 'string', format: 'uuid' },
          user_id:          { type: 'string', format: 'uuid' },
          title:            { type: 'string' },
          description:      { type: 'string' },
          thumbnail_url:    { type: 'string', nullable: true },
          status:           { type: 'string', enum: ['draft', 'active', 'completed', 'cancelled'] },
          approval_status:  { type: 'string', enum: ['pending', 'approved', 'rejected', 'hidden'] },
          rejection_reason: { type: 'string', nullable: true },
          created_at:       { type: 'string', format: 'date-time' },
          updated_at:       { type: 'string', format: 'date-time' },
        },
      },
      Funding: {
        type: 'object',
        properties: {
          id:               { type: 'string', format: 'uuid' },
          project_id:       { type: 'string', format: 'uuid' },
          goal_amount:      { type: 'integer', example: 1000000 },
          current_amount:   { type: 'integer', example: 350000 },
          backer_count:     { type: 'integer', example: 42 },
          deadline:         { type: 'string', format: 'date-time' },
          progress_percent: { type: 'number', example: 35 },
          days_left:        { type: 'integer', example: 14 },
        },
      },
      Reward: {
        type: 'object',
        properties: {
          id:            { type: 'string', format: 'uuid' },
          project_id:    { type: 'string', format: 'uuid' },
          title:         { type: 'string' },
          description:   { type: 'string' },
          amount:        { type: 'integer', example: 50000 },
          reward_type:   { type: 'string', enum: ['digital', 'physical', 'experience'] },
          delivery_date: { type: 'string', format: 'date', nullable: true },
          created_at:    { type: 'string', format: 'date-time' },
        },
      },
      Pledge: {
        type: 'object',
        properties: {
          id:         { type: 'string', format: 'uuid' },
          project_id: { type: 'string', format: 'uuid' },
          user_id:    { type: 'string', format: 'uuid' },
          reward_id:  { type: 'string', format: 'uuid', nullable: true },
          amount:     { type: 'integer', example: 50000 },
          status:     { type: 'string', enum: ['pending', 'confirmed', 'cancelled', 'refunded'] },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      Comment: {
        type: 'object',
        properties: {
          id:         { type: 'string', format: 'uuid' },
          project_id: { type: 'string', format: 'uuid' },
          user_id:    { type: 'string', format: 'uuid' },
          content:    { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      Update: {
        type: 'object',
        properties: {
          id:         { type: 'string', format: 'uuid' },
          project_id: { type: 'string', format: 'uuid' },
          user_id:    { type: 'string', format: 'uuid' },
          title:      { type: 'string' },
          content:    { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    // ══════════════════════════════════════════════════════════════
    // Health
    // ══════════════════════════════════════════════════════════════
    '/health': {
      get: {
        tags: ['Health'],
        summary: '서버 상태 확인',
        operationId: 'getHealth',
        responses: {
          200: {
            description: '정상',
            content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'object', properties: { status: { type: 'string', example: 'ok' } } } } } } },
          },
        },
      },
    },
    // ══════════════════════════════════════════════════════════════
    // Auth
    // ══════════════════════════════════════════════════════════════
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: '회원가입',
        operationId: 'register',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name:     { type: 'string', example: '홍길동' },
                  email:    { type: 'string', format: 'email', example: 'user@example.com' },
                  password: { type: 'string', minLength: 8, example: 'password123' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: '회원가입 성공', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/User' } } } } } },
          409: { description: '이미 존재하는 이메일', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: '로그인 (JWT 쿠키 발급)',
        operationId: 'login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email:    { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: '로그인 성공. `token` HttpOnly 쿠키 설정됨.', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/User' } } } } } },
          401: { description: '이메일/비밀번호 불일치', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: '로그아웃 (쿠키 삭제)',
        operationId: 'logout',
        security: [{ cookieAuth: [] }],
        responses: {
          200: { description: '로그아웃 성공' },
        },
      },
    },
    // ══════════════════════════════════════════════════════════════
    // Projects
    // ══════════════════════════════════════════════════════════════
    '/projects': {
      get: {
        tags: ['Projects'],
        summary: '프로젝트 목록 조회 (승인된 항목만)',
        operationId: 'listProjects',
        parameters: [
          { name: 'page',   in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit',  in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['draft', 'active', 'completed', 'cancelled'] } },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: '제목 검색' },
          { name: 'sort',   in: 'query', schema: { type: 'string', enum: ['created_at', 'deadline'] }, description: '정렬 기준' },
        ],
        responses: {
          200: {
            description: '성공',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/Project' } },
                    meta: { $ref: '#/components/schemas/PaginationMeta' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Projects'],
        summary: '프로젝트 등록',
        operationId: 'createProject',
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'description'],
                properties: {
                  title:         { type: 'string' },
                  description:   { type: 'string' },
                  thumbnail_url: { type: 'string', nullable: true },
                  status:        { type: 'string', enum: ['draft', 'active'] },
                },
              },
            },
          },
        },
        responses: {
          201: { description: '생성 성공', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/Project' } } } } } },
          401: { description: '인증 필요', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/projects/{id}': {
      get: {
        tags: ['Projects'],
        summary: '프로젝트 상세 조회',
        operationId: 'getProject',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: '성공', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/Project' } } } } } },
          404: { description: '존재하지 않음', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      patch: {
        tags: ['Projects'],
        summary: '프로젝트 수정 (소유자/관리자)',
        operationId: 'updateProject',
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title:         { type: 'string' },
                  description:   { type: 'string' },
                  thumbnail_url: { type: 'string', nullable: true },
                  status:        { type: 'string', enum: ['draft', 'active', 'completed', 'cancelled'] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: '수정 성공' },
          403: { description: '권한 없음' },
          404: { description: '존재하지 않음' },
        },
      },
      delete: {
        tags: ['Projects'],
        summary: '프로젝트 삭제 (소프트 삭제, 소유자/관리자)',
        operationId: 'deleteProject',
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          204: { description: '삭제 성공 (No Content)' },
          403: { description: '권한 없음' },
          404: { description: '존재하지 않음' },
        },
      },
    },
    // ══════════════════════════════════════════════════════════════
    // Funding
    // ══════════════════════════════════════════════════════════════
    '/projects/{id}/funding': {
      get: {
        tags: ['Funding'],
        summary: '펀딩 정보 조회',
        operationId: 'getFunding',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: '성공', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/Funding' } } } } } },
        },
      },
      put: {
        tags: ['Funding'],
        summary: '펀딩 정보 등록/수정 (Upsert)',
        operationId: 'upsertFunding',
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['goal_amount', 'deadline'],
                properties: {
                  goal_amount: { type: 'integer', example: 1000000 },
                  deadline:    { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: '성공' },
          401: { description: '인증 필요' },
        },
      },
    },
    // ══════════════════════════════════════════════════════════════
    // Rewards
    // ══════════════════════════════════════════════════════════════
    '/projects/{id}/rewards': {
      get: {
        tags: ['Rewards'],
        summary: '리워드 목록 조회',
        operationId: 'listRewards',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: '성공', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Reward' } } } } } } },
        },
      },
      post: {
        tags: ['Rewards'],
        summary: '리워드 추가 (소유자/관리자)',
        operationId: 'createReward',
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'description', 'amount'],
                properties: {
                  title:         { type: 'string' },
                  description:   { type: 'string' },
                  amount:        { type: 'integer' },
                  reward_type:   { type: 'string', enum: ['digital', 'physical', 'experience'], default: 'physical' },
                  delivery_date: { type: 'string', format: 'date', nullable: true },
                },
              },
            },
          },
        },
        responses: { 201: { description: '생성 성공' }, 403: { description: '권한 없음' } },
      },
    },
    '/projects/{id}/rewards/{rewardId}': {
      patch: {
        tags: ['Rewards'],
        summary: '리워드 수정',
        operationId: 'updateReward',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'id',       in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'rewardId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, amount: { type: 'integer' } } } } } },
        responses: { 200: { description: '성공' }, 403: { description: '권한 없음' } },
      },
      delete: {
        tags: ['Rewards'],
        summary: '리워드 삭제',
        operationId: 'deleteReward',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'id',       in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'rewardId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { 204: { description: '삭제 성공' }, 403: { description: '권한 없음' } },
      },
    },
    // ══════════════════════════════════════════════════════════════
    // Comments
    // ══════════════════════════════════════════════════════════════
    '/projects/{id}/comments': {
      get: {
        tags: ['Comments'],
        summary: '댓글 목록 조회',
        operationId: 'listComments',
        parameters: [
          { name: 'id',    in: 'path',  required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'page',  in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: { 200: { description: '성공' } },
      },
      post: {
        tags: ['Comments'],
        summary: '댓글 작성',
        operationId: 'createComment',
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['content'], properties: { content: { type: 'string' } } } } } },
        responses: { 201: { description: '작성 성공' }, 401: { description: '인증 필요' } },
      },
    },
    '/comments/{id}': {
      patch: {
        tags: ['Comments'],
        summary: '댓글 수정 (작성자)',
        operationId: 'updateComment',
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['content'], properties: { content: { type: 'string' } } } } } },
        responses: { 200: { description: '수정 성공' }, 403: { description: '권한 없음' } },
      },
      delete: {
        tags: ['Comments'],
        summary: '댓글 삭제 (작성자/관리자)',
        operationId: 'deleteComment',
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 204: { description: '삭제 성공' }, 403: { description: '권한 없음' } },
      },
    },
    // ══════════════════════════════════════════════════════════════
    // Updates
    // ══════════════════════════════════════════════════════════════
    '/projects/{id}/updates': {
      get: {
        tags: ['Updates'],
        summary: '업데이트 목록 조회',
        operationId: 'listUpdates',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: '성공' } },
      },
      post: {
        tags: ['Updates'],
        summary: '업데이트 작성 (소유자)',
        operationId: 'createUpdate',
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['title', 'content'], properties: { title: { type: 'string' }, content: { type: 'string' } } } } } },
        responses: { 201: { description: '작성 성공' }, 403: { description: '권한 없음' } },
      },
    },
    '/updates/{id}': {
      patch: {
        tags: ['Updates'],
        summary: '업데이트 수정',
        operationId: 'updateUpdate',
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { title: { type: 'string' }, content: { type: 'string' } } } } } },
        responses: { 200: { description: '성공' } },
      },
      delete: {
        tags: ['Updates'],
        summary: '업데이트 삭제',
        operationId: 'deleteUpdate',
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 204: { description: '삭제 성공' } },
      },
    },
    // ══════════════════════════════════════════════════════════════
    // Me
    // ══════════════════════════════════════════════════════════════
    '/users/me': {
      get: {
        tags: ['Me'],
        summary: '내 프로필 조회',
        operationId: 'getMe',
        security: [{ cookieAuth: [] }],
        responses: { 200: { description: '성공', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/User' } } } } } }, 401: { description: '인증 필요' } },
      },
      patch: {
        tags: ['Me'],
        summary: '내 프로필 수정',
        operationId: 'updateMe',
        security: [{ cookieAuth: [] }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' } } } } } },
        responses: { 200: { description: '성공' } },
      },
    },
    '/users/me/projects': {
      get: {
        tags: ['Me'],
        summary: '내 프로젝트 목록',
        operationId: 'getMyProjects',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'page',   in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit',  in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: '성공' } },
      },
    },
    '/users/me/pledges': {
      get: {
        tags: ['Me'],
        summary: '내 후원 내역',
        operationId: 'getMyPledges',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'page',  in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: { 200: { description: '성공' } },
      },
    },
    '/users/me/comments': {
      get: {
        tags: ['Me'],
        summary: '내 댓글 목록',
        operationId: 'getMyComments',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'page',  in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: { 200: { description: '성공' } },
      },
    },
    // ══════════════════════════════════════════════════════════════
    // Admin
    // ══════════════════════════════════════════════════════════════
    '/admin/dashboard': {
      get: {
        tags: ['Admin'],
        summary: '대시보드 통계',
        operationId: 'adminDashboard',
        security: [{ cookieAuth: [] }],
        responses: {
          200: {
            description: '성공',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        total_users:           { type: 'integer' },
                        total_projects:        { type: 'integer' },
                        pending_approval:      { type: 'integer' },
                        new_users_this_week:   { type: 'integer' },
                        new_projects_this_week:{ type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
          403: { description: '관리자 권한 필요' },
        },
      },
    },
    '/admin/users': {
      get: {
        tags: ['Admin'],
        summary: '전체 사용자 목록',
        operationId: 'adminListUsers',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'page',  in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: { 200: { description: '성공' }, 403: { description: '관리자 권한 필요' } },
      },
    },
    '/admin/users/{id}': {
      patch: {
        tags: ['Admin'],
        summary: '사용자 역할 변경',
        operationId: 'adminUpdateUser',
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { role: { type: 'string', enum: ['user', 'admin'] } } } } } },
        responses: { 200: { description: '성공' }, 403: { description: '관리자 권한 필요' }, 404: { description: '사용자 없음' } },
      },
    },
    '/admin/projects': {
      get: {
        tags: ['Admin'],
        summary: '전체 프로젝트 목록 (관리자)',
        operationId: 'adminListProjects',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'page',            in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit',           in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'approval_status', in: 'query', schema: { type: 'string', enum: ['pending', 'approved', 'rejected', 'hidden'] } },
        ],
        responses: { 200: { description: '성공' }, 403: { description: '관리자 권한 필요' } },
      },
    },
    '/admin/projects/{id}/approval': {
      patch: {
        tags: ['Admin'],
        summary: '프로젝트 승인/반려/숨김 처리',
        operationId: 'adminApproveProject',
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['approval_status'],
                properties: {
                  approval_status: { type: 'string', enum: ['approved', 'rejected', 'hidden'] },
                  rejection_reason: { type: 'string', description: '반려 시 필수' },
                },
              },
            },
          },
        },
        responses: { 200: { description: '처리 성공' }, 403: { description: '관리자 권한 필요' }, 404: { description: '프로젝트 없음' } },
      },
    },
    '/admin/comments': {
      get: {
        tags: ['Admin'],
        summary: '전체 댓글 목록 (관리자)',
        operationId: 'adminListComments',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'page',  in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: { 200: { description: '성공' }, 403: { description: '관리자 권한 필요' } },
      },
    },
    '/admin/comments/{id}': {
      delete: {
        tags: ['Admin'],
        summary: '댓글 강제 삭제 (관리자)',
        operationId: 'adminDeleteComment',
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 204: { description: '삭제 성공' }, 403: { description: '관리자 권한 필요' } },
      },
    },
  },
}
