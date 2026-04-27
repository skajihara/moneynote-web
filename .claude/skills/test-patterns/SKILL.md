---
name: test-patterns
description: テストコードを書く時・実装後にテストを追加する時に使用する
---

# テストパターン集

## バックエンド（JUnit5 + MockMvc + Testcontainers）

### クラスレベルのアノテーション（全 Controller テスト共通）

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@Testcontainers
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@SuppressWarnings("null")
class XxxControllerTest {
```

### Testcontainers コンテナ定義（全テスト共通）

```java
@SuppressWarnings("resource")
@Container
static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
        .withDatabaseName("moneynote_test")
        .withUsername("test")
        .withPassword("test");

@SuppressWarnings("resource")
@Container
static GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine")
        .withExposedPorts(6379);

@DynamicPropertySource
static void configureProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", postgres::getJdbcUrl);
    registry.add("spring.datasource.username", postgres::getUsername);
    registry.add("spring.datasource.password", postgres::getPassword);
    registry.add("spring.data.redis.host", redis::getHost);
    registry.add("spring.data.redis.port", () -> redis.getMappedPort(6379));
}
```

### フィールド定義と setUp（全テスト共通）

```java
@MockBean
JavaMailSender mailSender;  // メール送信を無効化。これがないと起動エラー

@Autowired MockMvc mockMvc;
@Autowired ObjectMapper objectMapper;
@Autowired UserRepository userRepository;
@Autowired PasswordEncoder passwordEncoder;
@Autowired JwtTokenProvider jwtTokenProvider;
@Autowired JdbcTemplate jdbcTemplate;

private String token1;  // オーナーユーザーのトークン
private String token2;  // 別ユーザーのトークン（アクセス制御テスト用）

@BeforeEach
void setUp() {
    jdbcTemplate.execute("TRUNCATE TABLE users CASCADE");
    createUser("user1", "user1@example.com");
    createUser("user2", "user2@example.com");
    token1 = jwtTokenProvider.generateAccessToken("user1");
    token2 = jwtTokenProvider.generateAccessToken("user2");
}

private void createUser(String userId, String email) {
    userRepository.save(User.builder()
            .userId(userId)
            .userName("テストユーザー")
            .email(email)
            .passwordHash(passwordEncoder.encode("Password1"))
            .build());
}
```

### MockMvc リクエストパターン

```java
// GET
mockMvc.perform(get("/api/v1/ledgers/{ledgerId}/xxx", ledgerId)
                .header("Authorization", "Bearer " + token1))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data").isArray());

// POST
mockMvc.perform(post("/api/v1/ledgers/{ledgerId}/xxx", ledgerId)
                .header("Authorization", "Bearer " + token1)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(requestMap)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.data.fieldName").value("期待値"));

// PUT
mockMvc.perform(put("/api/v1/ledgers/{ledgerId}/xxx/{id}", ledgerId, id)
                .header("Authorization", "Bearer " + token1)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(requestMap)))
        .andExpect(status().isOk());

// DELETE
mockMvc.perform(delete("/api/v1/ledgers/{ledgerId}/xxx/{id}", ledgerId, id)
                .header("Authorization", "Bearer " + token1))
        .andExpect(status().isOk());
```

### 帳簿アクセス制御テスト（必須）

```java
@Test
void getXxx_otherUser_returns403() throws Exception {
    // user1 のリソースに user2 がアクセス → 403
    mockMvc.perform(get("/api/v1/ledgers/{ledgerId}/xxx", ledgerId)
                    .header("Authorization", "Bearer " + token2))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error.code").value("E403"));
}

@Test
void getXxx_unauthenticated_returns401() throws Exception {
    mockMvc.perform(get("/api/v1/ledgers/{ledgerId}/xxx", ledgerId))
            .andExpect(status().isUnauthorized());
}
```

### バリデーションエラーテスト

```java
@Test
void createXxx_missingRequired_returns400() throws Exception {
    mockMvc.perform(post("/api/v1/ledgers/{ledgerId}/xxx", ledgerId)
                    .header("Authorization", "Bearer " + token1)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("E400"));
}

@Test
void createXxx_fieldTooLong_returns400() throws Exception {
    String tooLong = "a".repeat(256);
    mockMvc.perform(post("/api/v1/ledgers/{ledgerId}/xxx", ledgerId)
                    .header("Authorization", "Bearer " + token1)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(Map.of("fieldName", tooLong))))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("E400"));
}
```

### レスポンス形式の検証パターン

```java
// 成功レスポンス: $.data に値、$.error は null
.andExpect(jsonPath("$.data").exists())
.andExpect(jsonPath("$.error").doesNotExist())  // または isNull()

// エラーレスポンス: $.data は null、$.error.code で識別
.andExpect(jsonPath("$.error.code").value("E400"))  // Bad Request
.andExpect(jsonPath("$.error.code").value("E401"))  // Unauthorized
.andExpect(jsonPath("$.error.code").value("E403"))  // Forbidden
.andExpect(jsonPath("$.error.code").value("E404"))  // Not Found

// リスト件数
.andExpect(jsonPath("$.data", hasSize(2)))
.andExpect(jsonPath("$.data[0].fieldName").value("期待値"))
```

### ヘルパーメソッド（テスト可読性向上）

```java
// 単一フィールドの JSON を素早く生成する
private String json(String... kvPairs) throws Exception {
    Map<String, String> map = new java.util.LinkedHashMap<>();
    for (int i = 0; i < kvPairs.length; i += 2) {
        map.put(kvPairs[i], kvPairs[i + 1]);
    }
    return objectMapper.writeValueAsString(map);
}

// 帳簿を作成して ledgerId を返す
private String createLedger(String token, String name) throws Exception {
    String body = mockMvc.perform(post("/api/v1/ledgers")
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(json("ledgerName", name)))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();
    return objectMapper.readTree(body).at("/data/ledgerId").asText();
}
```

---

## フロントエンド（Jest + React Testing Library）

### next/navigation のモック（App Router 使用ページで必須）

```typescript
const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useParams: () => ({ ledgerId: 'ldg_test01' }),
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => '/ledgers/ldg_test01/xxx',
  useSearchParams: () => mockSearchParams,
}));
```

### API モジュールのモック

```typescript
jest.mock('@/lib/api/xxx');
const mockGetXxx = jest.mocked(xxxApi.getXxx);
const mockCreateXxx = jest.mocked(xxxApi.createXxx);

// レスポンス形式（ApiResponse<T> に合わせる）
const mockResponse = {
  data: { /* 型に合わせたデータ */ },
  error: null,
  timestamp: '',
};

// beforeEach でリセット
beforeEach(() => {
  mockGetXxx.mockReset();
  mockGetXxx.mockResolvedValue(mockResponse);
});
```

### Zustand ストアのリセット

```typescript
beforeEach(() => {
  // テスト間でストア状態を初期化する
  useSubPanelStore.setState({ isOpen: false, content: null, contentKey: 0 });
  useLedgerStore.setState({ ledgers: [], selectedLedgerId: null });
  useAuthStore.setState({ userId: null, accessToken: null, isAuthenticated: false, userName: null });
});
```

### コンポーネントテストの基本構造

```typescript
describe('XxxComponent', () => {
  it('データが取得されたら表示される', async () => {
    render(<XxxComponent />);
    await waitFor(() => {
      expect(screen.getByText('期待するテキスト')).toBeInTheDocument();
    });
  });

  it('ボタンクリックでフォームが開く', async () => {
    const user = userEvent.setup();
    render(<XxxComponent />);
    await user.click(screen.getByRole('button', { name: '追加' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('API エラー時にエラーメッセージが表示される', async () => {
    mockGetXxx.mockRejectedValue(new Error('Network error'));
    render(<XxxComponent />);
    await waitFor(() => {
      expect(screen.getByText(/エラー/)).toBeInTheDocument();
    });
  });
});
```

### Zustand ストア単体テスト

```typescript
import { act } from 'react';
import { useXxxStore } from '../xxxStore';

beforeEach(() => {
  useXxxStore.setState({ /* 初期状態 */ });
});

describe('xxxStore', () => {
  it('action で状態が更新される', () => {
    act(() => {
      useXxxStore.getState().someAction('value');
    });
    const state = useXxxStore.getState();
    expect(state.someField).toBe('value');
  });
});
```
