#!/bin/bash

# =============================================================================
# DAILY_TRIAL_EXTENSION_JOB
# Description: 管理每日試用期延長的 cron 任務。
# =============================================================================


# Info: (20251107 - Tzuhan) 腳本目的是管理每日試用期延長的 cron 任務。
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)

# Info: (20251107 - Tzuhan) 獲取專案根目錄
PROJECT_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)

# Info: (20251107 - Tzuhan)  cron 任務 ID
CRON_JOB_ID="# DAILY_TRIAL_EXTENSION_JOB"

# Info: (20251107 - Tzuhan) cron 任務排程
CRON_SCHEDULE="0 3 * * *" # 每天凌晨 3 點執行

# Info: (20251107 - Tzuhan) 以下變數定義了執行 TypeScript 腳本所需的路徑。
TS_NODE_PATH="$PROJECT_ROOT/node_modules/.bin/ts-node"
TSCONFIG_PATHS_REGISTER="$PROJECT_ROOT/node_modules/tsconfig-paths/register"
SCRIPT_PATH="$PROJECT_ROOT/scripts/extend_daily_trials.ts" # 腳本路徑
LOG_PATH="$PROJECT_ROOT/private/logs/cron_extend_daily_trials.log" # 日誌路徑

# Info: (20251107 - Tzuhan) 完整的 cron 命令
CRON_CMD="$CRON_SCHEDULE cd $PROJECT_ROOT && $TS_NODE_PATH -r $TSCONFIG_PATHS_REGISTER $SCRIPT_PATH >> $LOG_PATH 2>&1 $CRON_JOB_ID"

start_job() {
    echo "Starting cron job..."
    echo "Project Root: $PROJECT_ROOT"
    
    # Info: (20251107 - Tzuhan) 檢查是否已存在相同的 cron 任務
    if crontab -l 2>/dev/null | grep -q "$CRON_JOB_ID"; then
        echo "Job already exists. No action taken."
        crontab -l | grep "$CRON_JOB_ID"
    else
        # Info: (20251107 - Tzuhan) 添加新的 cron 任務
        (crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -
        if [ $? -eq 0 ]; then
            echo "Successfully added job to crontab:"
            echo "$CRON_CMD"
        else
            echo "Error: Failed to add job to crontab." >&2
        fi
    fi
}

stop_job() {
    echo "Stopping cron job..."
    
    # Info: (20251107 - Tzuhan) 檢查並移除 cron 任務
    if crontab -l 2>/dev/null | grep -q "$CRON_JOB_ID"; then
        # Info: (20251107 - Tzuhan) 移除指定的 cron 任務
        crontab -l | grep -v "$CRON_JOB_ID" | crontab -
        if [ $? -eq 0 ]; then
            echo "Successfully removed job from crontab."
        else
            echo "Error: Failed to remove job from crontab." >&2
        fi
    else
        echo "Job not found. No action taken."
    fi
}

# 
case "$1" in
    start)
        start_job
        ;;
    stop)
        stop_job
        ;;
    *)
        echo "Usage: $0 {start|stop}" >&2
        exit 1
        ;;
esac

exit 0