# Edge Connection Priority

## Rule: Exit Right>Bottom, Entry Left>Top

**出方向 (Exit):** Right (exitX=1) > Bottom (exitY=1)
**入方向 (Entry):** Left (entryX=0) > Top (entryY=0)

This enforces natural left-to-right + top-to-bottom reading flow and eliminates visual backtracking.

## Arrow Direction Rules

**入箭头 (Entry arrow):** 必须顺阅读方向进入节点
- 左入 (entryX=0) → **箭头水平向右 →** 进入
- 上入 (entryY=0) → **箭头垂直向下 ↓** 进入

**出线段 (Exit segment):** 必须顺阅读方向离开节点
- 右出 (exitX=1) → **线段水平向右 →** 离开
- 下出 (exitY=1) → **线段垂直向下 ↓** 离开

**严禁:** 箭头指向左(←)或指向上(↑) — 逆阅读方向

## Forbidden Directions

| Direction | Reason |
|---|---|
| ❌ exitX=0 (左出) | 逆阅读方向，箭头指向左 |
| ❌ entryY=1 (底入) | 箭头指向上，逆自然下沉 |
| ❌ entryX=1 (右入) | 箭头指向左，视觉回溯 |
| ❌ exitY=0 (上出) | 线段向上，逆自然流向 |

Only acceptable when ALL other options are geometrically impossible.

## Priority Table

| Priority | Exit | Arrow | Entry | Arrow | When |
|---|---|---|---|---|---|
| ★★★ | exitX=1 右出 | **→** | entryX=0 左入 | **→** | Peer-to-peer, horizontal flow |
| ★★ | exitY=1 下出 | **↓** | entryY=0 上入 | **↓** | Top-down: service→DB |
| ★ Acceptable | exitX=1 右出 | **→** | entryY=0 上入 | **↓** | Diagonal: right→down→left |
| ❌ | exitX=0 左出 | ← | — | — | Never |
| ❌ | — | — | entryY=1 底入 | ↑ | Never |

## Multi-Edge Distribution

When N edges exit the same node's right side:

```
N=1 → right center (exitX=1, exitY=0.5)
N=2 → right (exitY: 0.3, 0.7)
N=3 → right (exitY: 0.2, 0.5, 0.8)
N=4 → right (exitY: 0.2, 0.4, 0.6, 0.8)
N≥5 → suggest splitting node or adding intermediate router
```

When combining right + bottom exits:
```
N=2 → right (0.5) + bottom (0.5)
N=3 → right-top (0.3) + right-bottom (0.7) + bottom (0.5)
```

## Architecture-specific Rules

| Connection | Exit | Entry | Reason |
|---|---|---|---|
| Client → App layer | Bottom | Top | Natural downward flow |
| App → Data layer | Bottom | Top | Natural downward flow |
| App → External service | Right | Left | Cross-layer peer comm |
| App → MQ/Event bus | Right | Left/Top | Horizontal peer comm |
| DB → App (callback) | Right | Left | Avoid reverse vertical |

## Lint Detection

- `exitX=0` → **error** "Left-side exit forbidden. Use right or bottom."
- `entryY=1` → **error** "Bottom entry forbidden. Use left or top."
- Multiple right exits with exitY gap < 0.2 → **warning** "Space exits evenly"
- Edge passes through unrelated node body → **error** "Add waypoints to route around"
