# Pump 藥物速算

麻醉常用 pump 藥物劑量換算工具（劑量 → ml/hr），為新進麻醉護理師教學設計：**除了給答案，也把算式一步一步列出來**。

🔗 線上版：https://periop-tools.github.io/pump-calc/

## 功能

- **肌肉鬆弛劑**（劑量單位 mg/kg/hr）：Esmeron（10 / 5 mg/ml）、Nimbex（2 / 1 mg/ml）— 選藥 + 輸入體重即得建議 ml/hr
- **升降壓 / 強心藥**：Levophed、Epinephrine、Dopamine、Dobutrex、Primacor、NTG、Isoket、Perdipine、Trandate — 先看建議劑量範圍，再輸入濃度、體重、目標劑量
- 濃度可**直接輸入**，或用**泡法換算**（藥量 mg ÷ 總體積 ml）
- 算式「一行版 + 可展開的逐步拆解」，附常見錯誤提醒
- 反算：pump 現在跑 ○○ ml/hr 等於多少劑量
- PWA：手機可「加入主畫面」當 App 用，離線也能開

## 核心公式（依藥物的劑量單位自動切換）

```
mcg/kg/min → ml/hr = 劑量 × 體重(kg) × 60 ÷ 濃度(mcg/ml)
mg/kg/hr   → ml/hr = 劑量 × 體重(kg) ÷ 濃度(mg/ml)        （肌肉鬆弛劑）
mg/hr      → ml/hr = 劑量 ÷ 濃度(mg/ml)                   （Isoket、Trandate，不看體重）
```

## 免責

僅供教學與快速核對，**不取代醫囑與雙人核對**。泡法與濃度各單位不同，用藥前務必核對藥袋標示。

## 開發

單一靜態網頁，無後端、不收集任何資料（連體重都不儲存）。

```bash
py -m http.server 8791     # 本地預覽 http://localhost:8791
```

改 `index.html` / `app.js` / `icons` 後，**務必把 `sw.js` 的 `CACHE` 版本號 +1** 再 push，否則手機會被舊快取蓋住。
