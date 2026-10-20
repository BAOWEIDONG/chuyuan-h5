# 出院交通安排 · 用户端 H5 Demo

甲方 App 免登跳转 → 服务方下单 → 平台派单与全流程进度查看。

## 本地运行

```bash
npm install
npm run dev      # 开发
npm test         # 规则 + DOM 级自检（17 项）
npm run build    # 产物在 dist/
```

构建基路径默认 `/chuyuan-h5/`，可用 `BASE_PATH=/xxx/ npm run build` 覆盖；GitHub Actions 已按仓库名自动注入。

## 演示入口

- `/demo/entry`：模拟平安乐健康 App「用服务」页，点击「去预约」携带签名凭证跳转
- `/demo`：演示控制台，9 个场景预设 + 状态推进 + 异常分支（超时介入 / 无车 / 补材料 / 驳回 / 司机迟到）
- 未登录访问任意页面会回到入口页；hash 路由，刷新不 404

## 规则与实现对应

| 规则 | 位置 |
| --- | --- |
| 331 城市、医院等级与性质 | `src/rules/eligibility.js` `checkHospital` |
| 住院 ≥2 自然日、出院日+2 内出行 | `checkStay` / `allowedTravelDates` |
| 200 公里短途/长途分界 | `estimateDistance` / `tripTypeOf`（单程测算里程） |
| 同行人数、平躺医嘱 | `checkPassengers` / `checkLieFlat` |
| 12/24 工作小时时效 | `src/rules/time.js` `addWorkHours` |
| 9 个状态 + 4 个关闭原因 | `src/rules/status.js` |
| 演示免登签名与校验 | `src/rules/session.js`（HMAC-SHA256，仅演示） |

规则集中在这几个文件，页面只做调用和展示；改口径不需要动 UI。

## 说明

演示数据中的医院、服务商、司机、里程均为本地模拟，未接入真实调度与地图服务。登录签名密钥写在前端，仅用于演示流程，不可用于生产。
