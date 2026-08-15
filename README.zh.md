# dsh-codex-side-outline

一个 Codex 风格的侧边大纲插件，用于 DeepSeek Harness 的聊天栏。它提取当前对话的大纲，以一条细轨的形式显示在中间栏（会话区）的左边缘、紧贴左侧边栏。

- **灰色短线** —— 每次对话一条短线，从上到下排列。悬停的那条最长，向上下两个方向逐级递减（共 5 档），整体像一个迷你地图。
- **悬停查看摘要** —— 弹出摘要卡片：
  - 第一行 = 用户提问（加粗 + 品牌色左边线）；
  - 后续行 = 仅 agent 的**最终**回复（排除思维链/思考内容，以及工具调用前的中间叙述）。
- **点击跳转** —— 点击某条短线，会话区滚动到该轮次的用户提问。
- **翻页** —— 对话过多时出现 ▲/▼ 按钮，可上下滚动轨道。
- **轨迹视图自动隐藏**，且**实时跟随侧栏**（拖拽/折叠侧栏时轨道同帧移动）。

## 包结构

这是一个可安装的 **bundle**（`dsh.bundle`），同时带有**浏览器（client）半**（`dsh.client`），遵循
[官方插件指南](https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/)。

| 文件 | 作用 |
| --- | --- |
| `package.json` | bundle + client 清单（`dsh.bundle.patch`、`dsh.client`）。 |
| `cordis.patch.yml` | 当某个 profile 引用此 bundle 时应用的补丁层。 |
| `index.js` | host 半 —— 空入口（纯浏览器插件）。 |
| `client.js` | 浏览器半 —— 大纲轨道 UI。 |

`src/conversation-outline.client.js` 是最初「进程内动态插件」的保留参考副本，仅供溯源，不随 npm 包发布。

## 安装

在包含本包的目录下，用 `dsh` CLI 安装到**默认的 `web` profile**：

```sh
dsh plugin --profile web add ./dsh-codex-side-outline
```

或者直接从 git 仓库安装：

```sh
dsh plugin --profile web add github:you/dsh-codex-side-outline
```

验证补丁层，然后启动：

```sh
dsh --profile web --dump-config   # 应显示 "# == dsh-codex-side-outline" 层
dsh web
```

> ⚠️ **必须重启才能生效。** Web 应用在启动时才会组装 client bundle 列表。执行
> `dsh plugin add`（或修改本插件代码）后，请停掉正在运行的 `dsh web` 进程并重新
> 启动。仅刷新页面**无法**让新增或更新过的 bundle 加载。

## 工作原理

- **槽位：** `shell.overlay`（窗口级浮动层），使轨道位于各列滚动容器之外。轨道的水平偏移通过 `ResizeObserver` 读取 frame 的内联 `grid-template-columns`，因此能零帧延迟地跟随侧栏拖拽/折叠/窗口缩放。
- **数据：** 从客户端 `sessions` 服务读取（不走 Host）：
  - `useSessions((s) => s.current)`（`shell.overlay` 的标准 prop）得到当前会话 id；
  - `sessions.binding(id).session` 暴露一个 `ObservableSnapshot`，其 `getSnapshot().nodes` 携带折叠后的 `ConversationNode[]`；
  - `user` 节点贡献提问文本（`content` 的 text 块），`assistant` 节点贡献回复文本（`blocks` 中 `kind: 'text'` 的块）；
  - 折叠/更早的历史会通过 `session.loadOlder()` 自动加载，因此轨道无需手动「加载更多」即可显示全部轮次。
- **跳转：** 每个轮次的 `seq` 通过 `snapshot.chat.nodes.values()`（`anchorSeq` → `key`）映射到聊天节点 key；点击后滚动 `[data-conversation-scroll]` 中带 `data-chat-anchor-key` 的行。
- **轨迹视图：** 当 DOM 中存在 `[data-trajectory-scroll]`（即轨迹视图为当前激活视图）时隐藏轨道。
- **样式：** 使用包内 `<style>` 标签 + 主题 CSS 变量（`--dsw-alias-*`），自动适配浅色/深色主题。
