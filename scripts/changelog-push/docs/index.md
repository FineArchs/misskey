# changelog-push
環境変数`$CHANGELOG`にCHANGELOGの差分を入れておくと、CHANGELOGを自動で追記してくれます。

## 仕様

### 基本
#### 追加前
```md
## Unreleased
### General
- Feat: AAの機能を追加
- Feat: BBの機能を追加
- Fix: CCを修正
### Client
- Feat: DDの機能を追加

## 20XX.YY.ZZ
### General
- Feat: EEの機能を追加
```
#### NEW_CHANGELOGの値
```md
### General
- Feat: FFの機能を追加
```
#### 追加後
```md
## Unreleased
### General
- Feat: AAの機能を追加
- Feat: BBの機能を追加
- Feat: FFの機能を追加
- Fix: CCを修正
### Client
- Feat: DDの機能を追加

## 20XX.YY.ZZ
### General
- Feat: EEの機能を追加
```
