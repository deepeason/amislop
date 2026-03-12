# 项目开发说明书：AmISlop.io (V1.0 MVP)

## 1. 项目概况

- **定位**：基于人类共识的 AI 垃圾内容（AI Slop）检测与社交标注平台。
- **口号**：*Your AI Slop Bores Me.*
- **核心目标**：建立"统计模型+人类审美投票"的双重壁垒，沉淀全球最大的 Slop 特征指纹库。
- **MVP 语言**：仅支持英文。

## 2. 核心业务流程

1. **输入阶段**：支持长文本粘贴、URL 爬取（Jina Reader）。
2. **混合检测阶段**：执行 L1（统计过滤）-> L3（语义特征分析）流水线。
3. **结果展示阶段**：输出 0-100 的 Slop 分数，左侧高亮"AI 典型话术"，右侧展示检测报告。
4. **社交反馈阶段**：用户通过"👍 Accurate / 👎 Inaccurate"对**检测结果准确性**投票。
5. **数据沉淀阶段**：高置信度文本向量化存储，为后续 L2 向量匹配积累指纹库（MVP 阶段仅存储，不查询）。

## 3. 技术实现方案 (Cloudflare Stack)

### 3.1 基础设施架构

| 层 | 服务 | 用途 |
|---|---|---|
| Frontend | Next.js @ **Cloudflare Pages** | SSR/SSG 前端 |
| API/Backend | **Cloudflare Workers** (Node.js compat) | 业务逻辑 |
| SQL DB | **Cloudflare D1** | 用户、检测记录、投票 |
| Vector DB | **Cloudflare Vectorize** | 768维文本嵌入指纹（MVP 仅写入） |
| AI Engine | **Cloudflare Workers AI** | LLM + Embedding |
| Cache | **Cloudflare KV** | 速率限制、动态词库 |

### 3.2 AI 模型

- **语义分析 (L3)**：`@cf/meta/llama-3.1-8b-instruct`
- **向量化嵌入**：`@cf/baai/bge-base-en-v1.5`（服务英文场景）

### 3.3 用户认证方案

**二阶段暂不实现**。MVP 阶段仅面向未登录的匿名用户开放检测即可，暂无注册/登录逻辑。

### 3.4 URL 爬取方案

采用 **Jina Reader API**，理由：
- 免费调用无需 API Key（`https://r.jina.ai/{url}`）
- 返回干净 Markdown 文本，无需额外清洗
- 支持大多数主流网页（Medium、博客、新闻等）
- 超时设置 10 秒，失败后显示错误提示让用户改用文本粘贴

### 3.5 文件上传

MVP 不支持，V1.1 考虑。

## 4. 核心检测算法

### 4.1 最终评分公式

**MVP 阶段（无 L2）**，L1/L3 权重等比放大：

```
S = (L1 * 0.33) + (L3 * 0.67)
```

**完整版（含 L2）** 权重分配：

```
S = (L1 * 0.2) + (L2 * 0.4) + (L3 * 0.4)
```

### 4.2 短文本优化策略

短文本 (< 50 词) 仅执行 L1，跳过 AI 调用以节省资源：

```
S_short = L1 * 1.0  (L1 分数即为最终分数)
```

### 4.3 L1: 统计过滤 (Heuristic)

两个子指标，归一化后等权合成：

```
L1 = (lexicon_score + burstiness_score) / 2
```

#### Lexicon Score (词汇密度)
- 计算 `density = slop_word_hits / total_words`
- 归一化：`lexicon_score = min(density / 0.05, 1.0) * 100`
  - 即 5% 以上的 Slop 词密度 → 满分 100
  - 线性映射：0% → 0 分, 2.5% → 50 分, 5%+ → 100 分

#### Burstiness Score (句子均匀度)
- 计算句子长度的 `std_dev`
- 归一化：`burstiness_score = max(0, (1 - std_dev / 15)) * 100`
  - 标准差越小（越均匀）→ AI 嫌疑越高 → 分数越高
  - std_dev = 0 → 100 分, std_dev ≥ 15 → 0 分

#### Slop Lexicon 词表（英文 MVP）

```
delve, embark, landscape, commendable, meticulous, intricate,
noteworthy, versatile, notably, importantly, crucial, furthermore,
in conclusion, it's important to note, it's worth mentioning,
a testament to, navigating the, in today's digital age,
the power of, unlocking the, game-changer, deep dive
```

### 4.4 L3: 语义仲裁 (Semantic Analysis)

#### System Prompt

```
Role: You are an elitist internet curator who hates generic AI-generated content (Slop).
Task: Extract structure-based features of the provided text.
Checklist: 
1. Excessive hedging (e.g., "It's important to consider...").
2. Generic transitions and balanced paragraph structure.
3. Lack of spicy takes or human-like erratic punctuation.
Output: JSON {hedging_score: 0-10, structure_score: 0-10, roasted_comment: "A biting one-liner critique in English"}
```

#### L3 归一化

```
L3 = ((hedging_score + structure_score) / 20) * 100
```

## 5. 数据库设计 (D1 Schema) - **二阶段暂缓实现**

```sql
-- 用户表
CREATE TABLE users (
    id TEXT PRIMARY KEY,                -- UUID
    google_id TEXT UNIQUE NOT NULL,     -- Google OAuth sub
    email TEXT NOT NULL,
    name TEXT,
    avatar_url TEXT,
    tier TEXT DEFAULT 'free',           -- 'free' | 'pro'
    daily_usage INTEGER DEFAULT 0,     -- 当日已用检测次数
    usage_reset_date TEXT,              -- 上次重置日期 (YYYY-MM-DD)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 检测主表
CREATE TABLE detections (
    id TEXT PRIMARY KEY,                -- UUID
    user_id TEXT,                       -- NULL 表示未登录用户
    content_hash TEXT NOT NULL,         -- SHA-256 of normalized text
    text_preview TEXT,                  -- 前 200 字符，用于前端展示
    slop_score INTEGER NOT NULL,        -- 最终加权分 0-100
    l1_score INTEGER,                   -- L1 统计分
    l3_score INTEGER,                   -- L3 语义分
    features JSON,                      -- 详细指标: {lexicon_score, burstiness_score, hedging_score, structure_score, std_dev}
    roasted_comment TEXT,               -- L3 的毒舌点评
    highlights JSON,                    -- 高亮位置: [{start, end, type}]
    source_type TEXT NOT NULL,          -- 'text' | 'url'
    source_url TEXT,                    -- URL 爬取时记录原始地址
    vote_accurate INTEGER DEFAULT 0,   -- 认为检测结果准确的票数
    vote_inaccurate INTEGER DEFAULT 0, -- 认为检测结果不准确的票数
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_detections_hash ON detections(content_hash);
CREATE INDEX idx_detections_user ON detections(user_id);

-- 投票记录表 (防重复投票)
CREATE TABLE votes (
    id TEXT PRIMARY KEY,
    detection_id TEXT NOT NULL,
    user_id TEXT,                        -- 已登录用户 ID
    voter_fingerprint TEXT,              -- 未登录用户: IP hash
    vote_type TEXT NOT NULL,             -- 'accurate' | 'inaccurate'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (detection_id) REFERENCES detections(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(detection_id, user_id),
    UNIQUE(detection_id, voter_fingerprint)
);

-- 向量指纹表 (与 Vectorize ID 对应，MVP 仅写入)
CREATE TABLE slop_fingerprints (
    vector_id TEXT PRIMARY KEY,         -- Vectorize 中的 UUID
    detection_id TEXT NOT NULL,         -- 关联 detections.id
    confidence_score FLOAT,             -- 基于投票比例: accurate / (accurate + inaccurate)
    text_snippet TEXT,                  -- 前 100 字符, 快速查看
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (detection_id) REFERENCES detections(id)
);
```

## 6. 自动沉淀逻辑 (Feedback Loop) - **二阶段暂缓实现**

检测记录存储和向量化的逻辑推迟到 V1.1。MVP 阶段不做数据存储。

## 7. 速率限制方案

使用 **Cloudflare KV** 实现，仅针对未登录用户：

| 用户类型 | KV Key 格式 | 限制 |
|---------|-----------|------|
| 未登录 | `rate:anon:{ip_hash}:{date}` | 5 次/日 |

- 计数周期：UTC 零点重置（Key 中包含 `YYYY-MM-DD`，自然过期）
- KV TTL：48 小时自动清理
- 返回 `429 Too Many Requests` 让前端拦截并弹窗提示。

## 8. 分享方案

基于数据库的短链接分享方案：

1. 检测完成后，通过写入 D1 数据库生成一个唯一的 `id` (如 UUID)。
2. 提供给用户一个可分享的结果页长/短链接：`amislop.io/r/{detection_id}`。
3. 点击“分享”按钮时：
   - 移动端：调用 `navigator.share()` API 直接贴入该链接和预设的文案。
   - 桌面端或不支持 Share API 时：降级为“一键复制 URL 到剪贴板”提示。
4. 被分享者点开该 `/r/[id]` 链接后，Next.js App Router 动态从 D1 提取对应检测的数据并直接渲染出只读的全幅结果页面，无须再次进行检测加载动画。

## 9. 前端交互设计

### 9.1 整体布局

**桌面端**：左侧文本区（约 2/3 宽）+ 右侧结果区（约 1/3 宽）
**移动端**：上下堆叠布局（文本区在上，结果区在下）

### 9.2 检测过程交互

```
[用户提交文本]
    ↓
[左侧] 文本灰显，逐步高亮检测到的 Slop 话术（不同颜色标注类型）
[右侧] 滚动展示实时检测状态：
    → "🔍 Running lexicon scan..."
    → "📊 Calculating burstiness..."
    → "🧠 AI semantic analysis in progress..."
    ↓
[检测完成]
[左侧] 所有高亮就位，hover 可查看具体标注说明
[右侧] 渐入展示：
    → 分数仪表盘 (0-100 + 等级评语)
    → roasted_comment 毒舌点评
    → 👍 Accurate / 👎 Inaccurate 投票按钮
    → 🔗 Share 分享按钮
```

### 9.3 响应式适配

- 断点：768px（移动端/桌面端切换）
- 移动端：输入框全宽，结果区推至下方全宽展示
- 投票和分享按钮在移动端固定底部

## 10. 成本预估 (1 万 DAU)

假设人均 1.5 次检测，其中 70% 为长文本（触发 L1+L3），30% 为短文本（仅 L1）：

| 服务 | 用量/月 | 免费额度 | 预估月费 |
|------|--------|---------|---------|
| Workers (请求) | ~45 万次 | 10 万次/日 (免费) | **$0** |
| Workers AI - LLM | ~31.5 万次 | 10K neurons/日 (Beta 免费) | **$0 ~ $3**¹ |
| Workers AI - Embedding | ~1.5 万次 (沉淀) | 含在 AI 额度内 | **$0** |
| D1 (读写) | ~90 万读 + 45 万写 | 500 万读 + 10 万写/日 | **$0** |
| KV (速率限制) | ~90 万读 + 45 万写 | 10 万读 + 1K 写/日 | **$5**² |
| Vectorize (仅写入) | ~数千条/月 | 500K 向量 (免费) | **$0** |
| Pages | 静态托管 | 免费 | **$0** |
| **合计** | | | **$5 ~ $8/月** |

> ¹ Workers AI Beta 期间大部分模型免费，GA 后按 neuron 计费，预估 $1-3/月。
> ² KV 写入量超免费额度，需 $5/月 Paid Workers 计划（含 1M KV 写入/月）。

## 11. 错误处理与降级

| 场景 | 策略 |
|------|------|
| Workers AI 不可用 | 仅返回 L1 分数，标记"AI 分析暂不可用" |
| Jina Reader 超时 (>10s) | 返回错误，提示用户手动粘贴文本 |
| D1 写入失败 | 仍返回检测结果给用户，后台重试记录 |
| Vectorize 写入失败 | 静默跳过，不影响用户体验 |

## 12. 开发路线图 (Roadmap)

1. **V1.0 (MVP)**：L1 + L3 检测流水线，Google 登录，投票，分享链接，URL 爬取。
2. **V1.1**：Canvas 证书生成，检测历史页面，Pro 订阅 (Stripe)。
3. **V1.2**：启用 L2 向量匹配查询，完善自动沉淀闭环。
4. **V2.0**：Chrome 插件发布，国际化 (中文等)。
5. **V3.0**：API 对外输出。