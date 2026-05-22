# 幽港风角色技能卡生成器使用说明

这是一个纯静态网页工具，可以根据输入的 JSON 数据生成一张类似幽港迷城角色与技能卡风格的图片。  
不需要安装依赖，也不需要启动服务器。

## 怎么打开

直接用浏览器打开：

```text
index.html
```

页面左侧是 JSON 编辑区，右侧是生成预览。

## 基本使用

1. 在左侧编辑 JSON。
2. 点击「生成预览」。
3. 检查右侧画面。
4. 点击「导出 PNG」保存整张图片。
5. 如果写乱了，可以点击「恢复示例」回到默认数据。

## JSON 总结构

最外层必须是一个对象，推荐结构如下：

```json
{
  "character": {},
  "skills": []
}
```

也可以把 `skills` 写成 `cards`，但推荐统一使用 `skills`。

## character 字段

`character` 用来描述角色面板。

```json
{
  "character": {
    "name": "潮刃守卫",
    "title": "Harbor Warden",
    "level": 1,
    "handSize": 10,
    "initiative": 47,
    "stamina": 10,
    "element": "冰",
    "traits": ["近战压制", "护盾", "潮汐位移"],
    "notes": [
      "回合开始时可选择获得 1 点护盾或移动 1 格。",
      "若本轮消耗冰元素，下一次攻击附加推开 1。"
    ],
    "health": [10, 12, 14, 16, 18, 21, 24, 27, 30],
    "portrait": {
      "primary": "#c7a467",
      "secondary": "#24475a",
      "glow": "#8bf3ff",
      "sigil": "W"
    }
  }
}
```

字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `name` | 字符串 | 角色中文名 |
| `title` | 字符串 | 英文副标题或职业名 |
| `level` | 数字 | 角色等级，目前主要用于数据记录 |
| `handSize` | 数字 | 手牌数量，会显示在右上角徽章 |
| `initiative` | 数字或字符串 | 角色默认先攻说明 |
| `stamina` | 数字 | 备用字段，可不填 |
| `element` | 字符串 | 角色主题元素，可不填 |
| `traits` | 字符串数组 | 角色标签 |
| `notes` | 字符串数组 | 角色规则说明 |
| `health` | 数字数组 | 1 到 9 级生命值 |
| `portrait.primary` | 颜色字符串 | 角色插画主色 |
| `portrait.secondary` | 颜色字符串 | 角色插画背景色 |
| `portrait.glow` | 颜色字符串 | 角色发光色 |
| `portrait.sigil` | 字符串 | 角色徽记，建议 1 个字母或汉字 |

## skills 字段

`skills` 是技能卡数组。每一项会生成一张技能卡。

```json
{
  "skills": [
    {
      "name": "裂潮斩",
      "level": 1,
      "initiative": 32,
      "cardNo": "001",
      "top": {},
      "bottom": {}
    }
  ]
}
```

字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `name` | 字符串 | 技能卡名称 |
| `level` | 数字 | 技能等级 |
| `initiative` | 数字 | 技能卡先攻值 |
| `cardNo` | 字符串 | 卡牌编号 |
| `top` | 对象 | 上半行动 |
| `bottom` | 对象 | 下半行动 |

## 行动字段 top / bottom

`top` 和 `bottom` 的结构相同。

```json
{
  "type": "Attack",
  "value": 3,
  "range": 1,
  "target": 1,
  "effects": [
    "Push 1",
    "若目标相邻水域或陷阱，再造成 +1 伤害。"
  ],
  "xp": 1,
  "loss": false,
  "element": "冰",
  "area": [
    [0, 0, "red"],
    [1, 0, "red"],
    [0, 1, "gray"]
  ]
}
```

字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `type` | 字符串 | 行动类型，例如 `Attack`、`Move`、`Heal`、`Shield`、`Retaliate` |
| `value` | 数字 | 行动数值 |
| `range` | 数字 | 射程，可不填 |
| `target` | 数字 | 目标数量，可不填 |
| `effects` | 字符串数组 | 行动附加效果 |
| `xp` | 数字 | 经验值，可不填 |
| `loss` | 布尔值 | 是否为损耗牌，可不填 |
| `element` | 字符串 | 生成或消耗的元素图标文字，可不填 |
| `area` | 数组 | 六边形范围图，可不填 |

## area 范围图规则

`area` 用来画右侧的小六边形攻击范围。

每个格子格式：

```json
[q, r, "red"]
```

说明：

| 位置 | 类型 | 说明 |
| --- | --- | --- |
| `q` | 数字 | 横向偏移 |
| `r` | 数字 | 纵向偏移 |
| 颜色 | 字符串 | `"red"` 表示攻击格，`"gray"` 表示自身或参考格 |

示例：

```json
"area": [
  [0, 0, "gray"],
  [1, 0, "red"],
  [0, 1, "red"]
]
```

## 给其他 AI 的生成提示词

如果你想让其他 AI 帮你生成新角色数据，可以直接复制下面这段：

```text
请帮我生成一个可用于“幽港风角色技能卡生成器”的 JSON 数据。

要求：
1. 只输出合法 JSON，不要输出 Markdown，不要解释。
2. 最外层结构必须是：
{
  "character": {},
  "skills": []
}
3. character 必须包含：
name、title、level、handSize、initiative、traits、notes、health、portrait。
4. health 必须是 9 个数字，表示 1 到 9 级生命值。
5. portrait 必须包含 primary、secondary、glow、sigil，其中颜色使用 #RRGGBB 格式。
6. skills 至少生成 6 张技能卡。
7. 每张技能卡必须包含：
name、level、initiative、cardNo、top、bottom。
8. top 和 bottom 都是行动对象，可以包含：
type、value、range、target、effects、xp、loss、element、area。
9. effects 必须是字符串数组，文字尽量简短，避免太长。
10. area 如果出现，必须是数组，每个格子格式为 [q, r, "red"] 或 [q, r, "gray"]。
11. 技能风格参考幽港迷城：上半多为攻击、控制、防御；下半多为移动、辅助、治疗或功能行动。
12. 数值保持桌游卡牌感，不要过度膨胀。1 级卡常见范围：
Attack 1-4，Move 2-5，Heal 2-4，Shield 1-2，Retaliate 1-2，initiative 10-90。

请生成一个主题为【这里填写你的角色主题】的角色，例如：雷霆机械师、血月刺客、沙海占卜师、寒鸦守门人。
```

## 完整最小示例

```json
{
  "character": {
    "name": "寒鸦守门人",
    "title": "Raven Gatekeeper",
    "level": 1,
    "handSize": 10,
    "initiative": 45,
    "traits": ["控制", "护盾", "位移"],
    "notes": ["每轮第一次使敌人无法移动时，获得 1 点护盾。"],
    "health": [9, 11, 13, 15, 17, 20, 23, 26, 29],
    "portrait": {
      "primary": "#b7b9c8",
      "secondary": "#26313d",
      "glow": "#8bf3ff",
      "sigil": "R"
    }
  },
  "skills": [
    {
      "name": "鸦影突刺",
      "level": 1,
      "initiative": 28,
      "cardNo": "001",
      "top": {
        "type": "Attack",
        "value": 3,
        "effects": ["若目标已被 Immobilize，获得 XP 1。"],
        "xp": 1
      },
      "bottom": {
        "type": "Move",
        "value": 3,
        "effects": ["Jump"]
      }
    }
  ]
}
```

## 写数据时的建议

- `effects` 不要写太长，否则卡面会显得拥挤。
- 每张卡最好有一个清晰主题，例如输出、控制、移动、防御、治疗。
- `initiative` 尽量分散，不要所有卡都集中在同一区间。
- `area` 只适合小范围图，建议 3 到 6 个格子。
- 中文和英文可以混写，例如 `Attack 3`、`Push 1`、`获得 Shield 1`。
