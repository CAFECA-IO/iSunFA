# iSunFA
歡迎來到 iSunFA 區塊鏈會計與人工智能審計技術的官方網站專案。iSunFA 陽光智能會計是一個融合區塊鏈技術和人工智能審計的先進會計解決方案，旨在提供更加透明、安全和高效的財務管理體驗。此份文件將說明如何完成 iSunFA 官方網站的環境準備與部署。
> 最後更新於 2024-01-16

## 部署流程
1. [環境準備](#環境準備)
2. [管理帳號設定](#管理帳號設定)
3. [SWAP 設定](#swap-設定)
4. [執行環境準備](#執行環境準備)
5. [原始碼下載與編譯](#原始碼下載與編譯)
6. [最終檢查](#最終檢查)

### 環境準備
請確保您的系統滿足以下最低要求：
- Ubuntu 22.04
- 1 Core CPU
- 2 GB Ram
- 20 GB Disk Space

### 管理帳號設定
```shell
# 建立 iSunFA 帳號
useradd -m -s /usr/bin/bash isunfa
```
```shell
# 設定 iSunFA 登入密碼
passwd isunfa
New password:
```
```shell
# 授權 iSunFA sudo 權限
sudo usermod -g sudo isunfa
```

### SWAP 設定
```shell
# 建立 swap 檔案
sudo fallocate -l 4G /swapfile
```
Enabling the Swap File
```shell
# 設定 swap 與開機啟動程序
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo "/swapfile none swap sw 0 0" | sudo tee -a /etc/fstab
```

### 執行環境準備
```shell
# 安裝必要函式庫
sudo apt-get update
sudo apt-get install openssl libtool autoconf automake uuid-dev build-essential gcc g++ software-properties-common unzip make git libcap2-bin -y
```

### Install Node
```shell
# 安裝 nodejs, pm2 並授予 80 443 port 權限
bash <(curl https://raw.githubusercontent.com/Luphia/SIMPLE/master/shell/install-env.sh -kL)
```

### 原始碼下載與編譯
```shell
# 資料夾建立與授權移轉
sudo mkdir /workspace
sudo chown isunfa /workspace -R

# 下載原始碼
cd /workspace
git clone https://github.com/CAFECA-IO/iSunFA

# 安裝函式庫
cd /workspace/iSunFA
npm install

# 編譯
npm run build

# 啟動專案
pm2 start npm --name iSunFA -- start
```

### 最終檢查

## 聯繫我們
如果您對 iSunFA 感興趣或有任何疑問，請隨時聯繫我們的客戶支持團隊。我們期待著與您一起開啟更加先進、高效的財務管理體驗，讓您的企業在數字時代更上一層樓。