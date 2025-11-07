#!/bin/bash

# =============================================================================
# Info: (20251107 - Tzuhan)
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
SCRIPT_PATH="$PROJECT_ROOT/scripts/extend_daily_trials.ts"
LOG_DIR="$PROJECT_ROOT/private/logs"
LOG_PATH="$LOG_DIR/extend_daily_trials.log"

echo "Ensuring log directory exists: $LOG_DIR"
mkdir -p "$LOG_DIR"

# Info: (20251107 - Tzuhan) 完整的 cron 命令
SCRIPT_RUN_CMD="cd $PROJECT_ROOT && npx tsx $SCRIPT_PATH >> $LOG_PATH 2>&1"

# Info: (20251107 - Tzuhan) 完整的 cron 任務命令
CRON_CMD="$CRON_SCHEDULE $SCRIPT_RUN_CMD $CRON_JOB_ID"

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

            # Info: (20251107 - Tzuhan) 立即執行一次任務（背景執行）
            echo "Running the job immediately for the first time in the background..."
            # Info: (20251107 - Tzuhan) 使用 eval 執行命令
            (eval "$SCRIPT_RUN_CMD") &
            echo "Job started. Check logs for details: $LOG_PATH"
            # Info: (20251107 - Tzuhan) 提示用戶查看日誌
            
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
